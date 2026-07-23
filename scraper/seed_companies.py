import os
import json
import psycopg2
from dotenv import load_dotenv

def main():
    json_path = 'company_tags.json'
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        print("Run company_tags_scraper.py first to generate the JSON data.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Load DB URL
    env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    load_dotenv(env_path)

    db_url = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')
    if not db_url:
        print("Error: Could not find DIRECT_URL or DATABASE_URL in backend/.env")
        return

    print("Connecting to Supabase PostgreSQL...")
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
    except Exception as e:
        print("Failed to connect to the database:", e)
        return

    updated_questions = 0
    not_found = 0

    print("Seeding company tags into the database...")

    for company_data in data:
        company_name = company_data.get('company')
        questions = company_data.get('questions', [])
        
        print(f"Processing {company_name} ({len(questions)} questions)...")
        
        for q in questions:
            title = q.get('title')
            
            # Use array_append safely, checking if it exists
            # We first check if the question exists
            cursor.execute('SELECT id, companies FROM "Question" WHERE title = %s', (title,))
            row = cursor.fetchone()
            
            if not row:
                not_found += 1
                continue
                
            existing_companies = row[1] or []
            if company_name not in existing_companies:
                try:
                    # Update by appending the company to the existing array
                    cursor.execute('''
                        UPDATE "Question" 
                        SET companies = array_append(companies, %s)
                        WHERE title = %s
                    ''', (company_name, title))
                    updated_questions += 1
                except Exception as e:
                    print(f"Error updating {title}: {e}")
                    conn.rollback()
                    continue

    conn.commit()
    cursor.close()
    conn.close()

    print(f"\nDone! Successfully updated {updated_questions} company tags.")
    print(f"Skipped {not_found} questions because they were not found in your database (you may need to run the LeetCode scraper for them).")

if __name__ == "__main__":
    main()

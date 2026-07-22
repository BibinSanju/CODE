import os
import uuid
import psycopg2
import json
from dotenv import load_dotenv
from leetcode_scraper import LeetCodeScraper

def main():
    # Load env variables from backend directory
    env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    load_dotenv(env_path)

    db_url = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')
    if not db_url:
        print("Error: Could not find DIRECT_URL or DATABASE_URL in backend/.env")
        exit(1)

    print("Connecting to Supabase PostgreSQL...")
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
    except Exception as e:
        print("Failed to connect to the database:", e)
        exit(1)

    scraper = LeetCodeScraper()
    print("Fetching 100 questions from LeetCode. This may take a couple of minutes to avoid rate limiting...")
    questions = scraper.fetch_questions(limit=100)
    print(f"Successfully fetched {len(questions)} questions from LeetCode.")

    inserted = 0
    skipped = 0

    for q in questions:
        title = q['title']
        
        # Check if exists to avoid duplicates
        cursor.execute('SELECT id FROM "Question" WHERE title = %s', (title,))
        if cursor.fetchone():
            skipped += 1
            continue
            
        # Map fields
        q_id = str(uuid.uuid4())
        category = "DSA"
        subtopic = q['tags'][0] if q.get('tags') else "General"
        difficulty = q['difficulty']
        description = q.get('html_content', '')
        test_cases = json.dumps([])
        
        try:
            cursor.execute('''
                INSERT INTO "Question" (id, category, subtopic, difficulty, title, description, "testCases")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (q_id, category, subtopic, difficulty, title, description, test_cases))
            inserted += 1
        except Exception as e:
            print(f"Error inserting {title}: {e}")
            conn.rollback()  # Rollback this transaction so the next one can proceed
            continue

    conn.commit()
    cursor.close()
    conn.close()

    print(f"Done! Successfully inserted: {inserted} questions.")
    print(f"Skipped {skipped} questions (already existed).")

if __name__ == "__main__":
    main()

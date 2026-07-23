import os
import time
import json
import uuid
import requests
from bs4 import BeautifulSoup
import psycopg2
from dotenv import load_dotenv

def get_cses_problems():
    url = "https://cses.fi/problemset/"
    response = requests.get(url)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    
    problems = []
    
    # Grab the first chapter (Introductory Problems) which is the second task-list
    task_lists = soup.find_all('ul', class_='task-list')
    if len(task_lists) < 2:
        print("Could not find problem task list")
        return []
        
    task_list = task_lists[1]
        
    for li in task_list.find_all('li', class_='task'):
        a_tag = li.find('a')
        if not a_tag:
            continue
        title = a_tag.text.strip()
        link = "https://cses.fi" + a_tag['href']
        
        print(f"Scraping: {title}...")
        prob_resp = requests.get(link)
        if prob_resp.status_code == 200:
            p_soup = BeautifulSoup(prob_resp.text, 'html.parser')
            # Extract the content of the problem
            # In CSES, the problem description is within a <div> with class "content" 
            # or in the <body> directly, but it usually uses a standard structure.
            content_div = p_soup.find('div', class_='skeleton')
            if content_div:
                # Get the content div specifically
                inner_content = content_div.find('div', class_='content')
                html_content = str(inner_content) if inner_content else str(content_div)
            else:
                html_content = "Content not found"
                
            problems.append({
                "title": title,
                "category": "CSES",
                "difficulty": "Easy",
                "tags": ["Introductory"],
                "html_content": html_content
            })
        time.sleep(0.5) 
        
    return problems

def main():
    print("Scraping CSES problems...")
    problems = get_cses_problems()
    
    print(f"Saving {len(problems)} problems to cses_problems.json")
    with open('cses_problems.json', 'w', encoding='utf-8') as f:
        json.dump(problems, f, indent=2, ensure_ascii=False)
        
    # Inject into database
    env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    load_dotenv(env_path)

    db_url = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')
    if not db_url:
        print("Warning: No database URL found in backend/.env. Skipping database injection.")
        return

    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
    except Exception as e:
        print("Failed to connect to the database:", e)
        return
        
    print("Injecting into Database...")
    inserted = 0
    skipped = 0
    
    for q in problems:
        title = q['title']
        cursor.execute('SELECT id FROM "Question" WHERE title = %s', (title,))
        if cursor.fetchone():
            skipped += 1
            continue
            
        q_id = str(uuid.uuid4())
        test_cases = json.dumps([]) 
        
        try:
            cursor.execute('''
                INSERT INTO "Question" (id, category, subtopic, difficulty, title, description, "testCases")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (q_id, "CSES", "Introductory", "Medium", title, q['html_content'], test_cases))
            inserted += 1
        except Exception as e:
            print(f"Error inserting {title}: {e}")
            conn.rollback()
            continue

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Done! Inserted: {inserted}. Skipped: {skipped}.")

if __name__ == "__main__":
    main()

import os
import uuid
import psycopg2
import json
import time
from dotenv import load_dotenv
from groq import Groq
from leetcode_scraper import LeetCodeScraper
from bs4 import BeautifulSoup

def clean_html(html):
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text()

def generate_test_cases(client, title, html_description):
    text_desc = clean_html(html_description)
    prompt = f"""You are an expert programming test case generator.
Analyze the following LeetCode problem description and generate exactly 2 valid test cases for it.
Your output MUST be ONLY valid JSON matching this exact structure (an array of objects).
Do not include any explanation, intro, or markdown formatting (no ```json or ``` blocks, just raw JSON).

CRITICAL INSTRUCTION: The `input` and `expectedOutput` values MUST be formatted as single raw strings for Standard Input (stdin) and Standard Output (stdout), exactly like Codeforces or HackerRank test cases. Do NOT output a JSON object or array for the input/expectedOutput fields. They must be raw text strings with newline characters (\\n) separating variables.

Example JSON structure:
[
  {{
    "input": "4\\n2 7 11 15\\n9\\n",
    "expectedOutput": "0 1\\n"
  }},
  {{
    "input": "3\\n3 2 4\\n6\\n",
    "expectedOutput": "1 2\\n"
  }}
]

Here is the problem:
Title: {title}
Description:
{text_desc[:1500]} 
"""
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
        )
        response_text = chat_completion.choices[0].message.content.strip()
        # Clean up any potential markdown if the LLM ignores instructions
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        test_cases = json.loads(response_text.strip())
        return json.dumps(test_cases)
    except Exception as e:
        print(f"Error generating test cases for {title}: {e}")
        return json.dumps([])

def main():
    # Load env variables from backend directory
    env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    load_dotenv(env_path)

    db_url = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')
    groq_api_key = os.getenv('GROQ_API_KEY')
    
    if not db_url:
        print("Error: Could not find DIRECT_URL or DATABASE_URL in backend/.env")
        exit(1)
    if not groq_api_key:
        print("Error: Could not find GROQ_API_KEY in backend/.env")
        exit(1)

    print("Initializing Groq Client...")
    groq_client = Groq(api_key=groq_api_key)

    print("Connecting to Supabase PostgreSQL...")
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
    except Exception as e:
        print("Failed to connect to the database:", e)
        exit(1)

    scraper = LeetCodeScraper()
    print("Fetching 100 questions from LeetCode...")
    questions = scraper.fetch_questions(limit=100)
    print(f"Successfully fetched {len(questions)} questions from LeetCode.")

    inserted = 0
    skipped = 0

    for q in questions:
        title = q['title']
        
        cursor.execute('SELECT id FROM "Question" WHERE title = %s', (title,))
        if cursor.fetchone():
            skipped += 1
            print(f"Skipping {title}, already exists.")
            continue
            
        print(f"Generating test cases for: {title}...")
        description = q.get('html_content', '')
        test_cases_json = generate_test_cases(groq_client, title, description)
        
        q_id = str(uuid.uuid4())
        category = "DSA"
        subtopic = q['tags'][0] if q.get('tags') else "General"
        difficulty = q['difficulty']
        
        try:
            cursor.execute('''
                INSERT INTO "Question" (id, category, subtopic, difficulty, title, description, "testCases")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (q_id, category, subtopic, difficulty, title, description, test_cases_json))
            inserted += 1
            # Commit per row to ensure we don't lose data if script stops
            conn.commit() 
            print(f"Inserted: {title}")
        except Exception as e:
            print(f"Error inserting {title}: {e}")
            conn.rollback()
            continue
            
        # Add a slight delay to respect Groq rate limits
        time.sleep(2)

    cursor.close()
    conn.close()

    print(f"Done! Successfully inserted: {inserted} questions with test cases.")
    print(f"Skipped {skipped} questions.")

if __name__ == "__main__":
    main()

import psycopg2, os, json
from dotenv import load_dotenv
load_dotenv('../backend/.env')
conn = psycopg2.connect(os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('SELECT title, "testCases" FROM "Question"')
rows = cur.fetchall()
empty = 0
for r in rows:
    tc = r[1]
    if tc == '[]' or tc == [] or not tc:
        empty += 1
filled = len(rows) - empty
print(f"Total: {len(rows)}, Filled: {filled}, Empty: {empty}")

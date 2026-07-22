import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('../backend/.env')
conn = psycopg2.connect(os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('SELECT "testCases" FROM "Question" WHERE "testCases" IS NOT NULL LIMIT 1')
print(cur.fetchone()[0])
cur.close()
conn.close()

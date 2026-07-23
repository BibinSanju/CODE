import psycopg2, os
from dotenv import load_dotenv
load_dotenv('../backend/.env')
conn = psycopg2.connect(os.getenv('DIRECT_URL'))
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='Question'")
print([row[0] for row in cur.fetchall()])

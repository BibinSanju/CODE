import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('../backend/.env')
conn = psycopg2.connect(os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('DELETE FROM "Submission"')
cur.execute('DELETE FROM "Question"')
conn.commit()
print('Wiped!')
cur.close()
conn.close()

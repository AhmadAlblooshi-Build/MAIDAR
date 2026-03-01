"""Check actual database schema."""

import psycopg

DATABASE_URL = "postgresql://postgres:LvMBTXoNieUMpDBlscSIvWaIyMWgPwDV@shinkansen.proxy.rlwy.net:57496/railway"

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

print("Checking users table columns...")
cur.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
""")

for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} (nullable={row[2]}, default={row[3]})")

cur.close()
conn.close()

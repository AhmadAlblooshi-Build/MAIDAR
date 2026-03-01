"""Check all table schemas to find missing columns."""

import psycopg

DATABASE_URL = "postgresql://postgres:LvMBTXoNieUMpDBlscSIvWaIyMWgPwDV@shinkansen.proxy.rlwy.net:57496/railway"

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

tables = ['employees', 'tenants', 'users', 'simulations', 'scenarios', 'risk_scores']

for table in tables:
    print(f"\n{'='*60}")
    print(f"Table: {table}")
    print(f"{'='*60}")

    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position
    """, (table,))

    columns = cur.fetchall()
    if columns:
        for col in columns:
            print(f"  {col[0]:<30} {col[1]:<20} nullable={col[2]:<3} default={col[3]}")
    else:
        print(f"  Table '{table}' does not exist!")

cur.close()
conn.close()

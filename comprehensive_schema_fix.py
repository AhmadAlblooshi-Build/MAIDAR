"""Comprehensive schema comparison and fix generator."""

import psycopg
from sqlalchemy import inspect, create_engine
from sqlalchemy.orm import sessionmaker
import sys

sys.path.insert(0, 'C:/Users/User/OneDrive/Desktop/MAIDAR/backend')

from app.models.base import Base
from app.models import *

DATABASE_URL = "postgresql://postgres:LvMBTXoNieUMpDBlscSIvWaIyMWgPwDV@shinkansen.proxy.rlwy.net:57496/railway"

print("="*80)
print("COMPREHENSIVE SCHEMA COMPARISON")
print("="*80)

# Connect to database
conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

# Get all tables from database
cur.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
""")
db_tables = [row[0] for row in cur.fetchall()]

print(f"\nDatabase has {len(db_tables)} tables:")
for table in db_tables:
    print(f"  - {table}")

# Get all models from SQLAlchemy
model_tables = {}
for mapper in Base.registry.mappers:
    table_name = mapper.class_.__tablename__
    model_tables[table_name] = mapper.class_

print(f"\nModels define {len(model_tables)} tables:")
for table in sorted(model_tables.keys()):
    print(f"  - {table}")

# Compare each model with database
print("\n" + "="*80)
print("DETAILED COMPARISON")
print("="*80)

mismatches = []

for table_name, model_class in sorted(model_tables.items()):
    print(f"\n{'='*80}")
    print(f"Table: {table_name}")
    print(f"{'='*80}")

    # Get database columns
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position
    """, (table_name,))

    db_columns = {row[0]: {'type': row[1], 'nullable': row[2], 'default': row[3]}
                  for row in cur.fetchall()}

    # Get model columns
    model_columns = {}
    for column in model_class.__table__.columns:
        model_columns[column.name] = {
            'type': str(column.type),
            'nullable': column.nullable,
            'default': column.default
        }

    # Find missing columns (in model but not in DB)
    missing_in_db = set(model_columns.keys()) - set(db_columns.keys())

    # Find extra columns (in DB but not in model)
    extra_in_db = set(db_columns.keys()) - set(model_columns.keys())

    if missing_in_db:
        print(f"\n[X] MISSING IN DATABASE ({len(missing_in_db)} columns):")
        for col in sorted(missing_in_db):
            print(f"   {col:<30} {model_columns[col]['type']:<30} nullable={model_columns[col]['nullable']}")
            mismatches.append({
                'table': table_name,
                'column': col,
                'type': 'missing_in_db',
                'details': model_columns[col]
            })

    if extra_in_db:
        print(f"\n[!] EXTRA IN DATABASE ({len(extra_in_db)} columns):")
        for col in sorted(extra_in_db):
            print(f"   {col:<30} {db_columns[col]['type']:<30}")
            mismatches.append({
                'table': table_name,
                'column': col,
                'type': 'extra_in_db',
                'details': db_columns[col]
            })

    if not missing_in_db and not extra_in_db:
        print(f"\n[OK] Schema matches perfectly!")

cur.close()
conn.close()

# Summary
print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"\nTotal mismatches found: {len(mismatches)}")
print(f"Tables with issues: {len(set(m['table'] for m in mismatches))}")

if mismatches:
    print("\n[FIX] MIGRATION NEEDED!")
    print("\nMissing columns to add:")
    for m in mismatches:
        if m['type'] == 'missing_in_db':
            print(f"  {m['table']}.{m['column']}")
else:
    print("\n[OK] ALL SCHEMAS MATCH!")

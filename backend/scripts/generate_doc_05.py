import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from app.db.base import Base
import app.models  # Ensure all models are loaded

def generate_schema_doc():
    doc = ["# 05 - Data Model and Infrastructure\n"]
    doc.append("## Database Schema\n")
    
    tables = Base.metadata.tables
    doc.append(f"Total Models/Tables: {len(tables)}\n")
    
    for table_name, table in tables.items():
        doc.append(f"### Table: `{table_name}`\n")
        doc.append("| Column | Type | Nullable | Primary Key | Foreign Key |")
        doc.append("|---|---|---|---|---|")
        for col in table.columns:
            fk = ", ".join([f.target_fullname for f in col.foreign_keys]) if col.foreign_keys else ""
            doc.append(f"| {col.name} | {col.type} | {col.nullable} | {col.primary_key} | {fk} |")
        doc.append("\n")
        
    doc_path = Path("d:/intern/creo/docs/05-Data-Model-and-Infrastructure.md")
    doc_path.parent.mkdir(parents=True, exist_ok=True)
    with open(doc_path, "w", encoding="utf-8") as f:
        f.write("\n".join(doc))
    
    print(f"Generated {doc_path} with {len(tables)} tables.")

if __name__ == "__main__":
    generate_schema_doc()

import csv
from pymongo import MongoClient
from datetime import datetime, timezone

# ================= CONFIG =================
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "dynamic_pricing_engine_db"

CSV_PATH = "data/products.csv"

# ================= DB =================
client = MongoClient(MONGO_URL)
db = client[DB_NAME]
products_collection = db["products"]

def import_products():
    inserted = 0
    updated = 0

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            result = products_collection.update_one(
                {"product_name": row["product_name"]},  # UNIQUE
                {"$set": {
                    "category": row["category"],
                    "cost_price": float(row["cost_price"]),
                    "current_price": float(row["current_price"]),
                    "updated_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )

            if result.matched_count:
                updated += 1
            else:
                inserted += 1

    print(f"✅ Products imported | Inserted: {inserted}, Updated: {updated}")

if __name__ == "__main__":
    import_products()

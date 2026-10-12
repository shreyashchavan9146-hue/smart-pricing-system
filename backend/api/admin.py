import subprocess
import csv
import io
import os
import sys
import threading
from pathlib import Path
from datetime import datetime, timezone
from fastapi import UploadFile

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.db.mongo import (
    products_collection,
    competitor_prices_collection,
    recommendations_collection,
    price_history_collection
)
from backend.api.alerts import create_price_drop_alerts
from backend.ml.pricing_model import recommend_price

# Import scraper function directly
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from serpapi_scraper import run_scraper


# ---------- CSV UPLOAD ----------
def upload_products_csv(file: UploadFile):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    inserted, updated = 0, 0

    for row in reader:
        result = products_collection.update_one(
            {"product_name": row["product_name"]},
            {
                "$set": {
                    "category": row.get("category", ""),
                    "cost_price": float(row["cost_price"]),
                    "updated_at": datetime.now(timezone.utc)
                },
                "$setOnInsert": {
                    "created_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )

        if result.matched_count:
            updated += 1
        else:
            inserted += 1

    return {"inserted": inserted, "updated": updated}


# ---------- SCRAPER ----------
def run_scraper_job():
    try:
        import asyncio
        asyncio.run(run_scraper())   # run_scraper must be async
        alerts = create_price_drop_alerts()
        return {"status": "Scraper completed", "alerts": alerts}
    except Exception as e:
        return {"status": "Error", "message": str(e)}
# ---------- ML ----------
def generate_recommendations():
    for product in products_collection.find():
        competitor = competitor_prices_collection.find_one(
            {"product_id": product["_id"]}
        )
        if not competitor:
            continue

        price = recommend_price(
            product["cost_price"],
            competitor["market_avg_price"]
        )

        recommendations_collection.update_one(
            {"product_id": product["_id"]},
            {"$set": {
                "product_name": product["product_name"],
                "cost_price": product["cost_price"],
                "market_price": competitor["market_avg_price"],
                "market_sources": competitor.get("market_sources", []),
                "market_links": competitor.get("market_links", []),
                "recommended_price": price,
                "updated_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )

        # HISTORY
        price_history_collection.insert_one({
            "product_id": product["_id"],
            "product_name": product["product_name"],
            "market_price": competitor["market_avg_price"],
            "recommended_price": price,
            "recorded_at": datetime.now(timezone.utc)
        })

    return {"status": "Recommendations generated"}

import asyncio
import aiohttp
from pymongo import MongoClient
from datetime import datetime, timezone

SERPAPI_API_KEY = "7ab72112ccce0a0a5f3a9043ff909770b042836f0e1d4bb64ae20d7b6390f0c9"
SERPAPI_URL = "https://serpapi.com/search.json"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "dynamic_pricing_engine_db"
SCRAPE_LIMIT = 10

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

products = db["products"]
competitor_prices = db["competitor_prices"]
price_history = db["price_history"]


ALLOWED_SOURCES = {
    "Amazon",
    "Flipkart",
    "Meesho",
    "Croma",
    "Snapdeal",
    "Ajio",
    "Myntra"
}


async def fetch_prices(session, name):
    params = {
        "engine": "google_shopping",
        "q": name,
        "gl": "in",
        "hl": "en",
        "api_key": SERPAPI_API_KEY
    }

    async with session.get(SERPAPI_URL, params=params, timeout=15) as r:
        data = await r.json()

    prices, sources = [], {}

    for item in data.get("shopping_results", [])[:10]:

        source = item.get("source")

        # ✅ Skip unknown sellers
        if source not in ALLOWED_SOURCES:
            continue

        try:
            price = float(item["price"].replace("₹", "").replace(",", ""))
            prices.append(price)
            sources[source] = price
        except:
            pass

    return prices, sources

async def process_product(session, p):
    prices, sources = await fetch_prices(session, p["product_name"])
    if not prices:
        return

    avg_price = round(sum(prices) / len(prices), 2)

    competitor_prices.update_one(
        {"product_id": p["_id"]},
        {"$set": {
            "product_name": p["product_name"],
            "market_avg_price": avg_price,
            "sources": sources,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

    price_history.insert_one({
        "product_id": p["_id"],
        "product_name": p["product_name"],
        "market_price": avg_price,
        "recorded_at": datetime.now(timezone.utc)
    })


async def run_scraper():
    product_list = list(products.find().limit(SCRAPE_LIMIT))

    async with aiohttp.ClientSession() as session:
        tasks = [process_product(session, p) for p in product_list]
        await asyncio.gather(*tasks)   # 🔥 Parallel API calls


if __name__ == "__main__":
    asyncio.run(run_scraper())
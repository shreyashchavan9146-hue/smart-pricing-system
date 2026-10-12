
import asyncio
import aiohttp
import re
from pymongo import MongoClient
from datetime import datetime, timezone

# ================= CONFIG ================= #

SERPAPI_API_KEY = "646b65c6aade36ffd224570e41ecd6576408f4949ffa6b934f809e7a0f34f52b"
SERPAPI_URL = "https://serpapi.com/search.json"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "dynamic_pricing_engine_db"

SCRAPE_LIMIT = 10

ALLOWED_SOURCES = [
    "amazon",
    "flipkart",
    "meesho",
    "croma",
    "snapdeal"
]

# ================= DB SETUP ================= #

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

products = db["products"]
competitor_prices_collection = db["competitor_prices"]
recommendations_collection = db["recommendations"]
price_history = db["price_history"]

# ================= UTIL FUNCTIONS ================= #

def extract_price(text):
    match = re.search(r"[\d,]+\.?\d*", text)
    if not match:
        return None
    return float(match.group().replace(",", ""))

def is_valid_source(source):
    return any(s in source.lower() for s in ALLOWED_SOURCES)

# ================= CORE SCRAPER ================= #

async def fetch_prices(session, name):

    print(f"\n🔍 Searching: {name}")

    params = {
        "engine": "google_shopping",
        "q": f"{name} price India Amazon Flipkart",
        "gl": "in",
        "hl": "en",
        "api_key": SERPAPI_API_KEY
    }

    try:
        async with session.get(SERPAPI_URL, params=params, timeout=15) as r:
            data = await r.json()
    except Exception as e:
        print(f"❌ API Error for {name}: {e}")
        return []

    price_entries = []

    for item in data.get("shopping_results", []):
        source = item.get("source", "").lower()

        if not is_valid_source(source):
            continue

        price = extract_price(item.get("price", ""))

        # filter invalid values
        if price and price > 1000:
            price_entries.append({
                "price": price,
                "source": source,
                "link": item.get("link", item.get("product_link", ""))
            })
            print(f"✔ {name} | ₹{price} | {source} | Link: {item.get('link', item.get('product_link', 'N/A'))}")

    return price_entries

# ================= SMART PRICING LOGIC ================= #

def calculate_smart_price(cost_price, avg_price):

    profit_margin = 0.08  # 8%

    if cost_price < avg_price:
        # competitive pricing (slightly below market)
        return round(avg_price * (1 - profit_margin), 2)
    else:
        # avoid loss
        return round(cost_price * (1 + profit_margin), 2)

# ================= PROCESS PRODUCT ================= #

async def process_product(session, p):

    name = p.get("product_name")
    cost_price = p.get("cost_price", 0)
    product_id = str(p["_id"])

    prices = await fetch_prices(session, name)

    if not prices:
        print(f"⚠ No valid prices for: {name}")
        return

    market_prices = [entry["price"] for entry in prices]
    market_sources = [entry["source"] for entry in prices]
    market_links = [entry["link"] for entry in prices]

    avg_price = round(sum(market_prices) / len(market_prices), 2)

    # 🔥 SMART PRICING APPLIED HERE
    recommended_price = calculate_smart_price(cost_price, avg_price)

    difference = round(recommended_price - avg_price, 2)

    # ✅ SAVE COMPETITOR PRICES (for dashboard + ML source)
    competitor_prices_collection.update_one(
        {"product_id": product_id},
        {
            "$set": {
                "product_id": product_id,
                "product_name": name,
                "market_avg_price": avg_price,
                "market_prices": market_prices,
                "market_sources": market_sources,
                "market_links": market_links,
                "updated_at": datetime.now(timezone.utc)
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    # ✅ SAVE TO DB
    recommendations_collection.update_one(
        {"product_id": product_id},
        {
            "$set": {
                "product_id": product_id,
                "product_name": name,
                "cost_price": cost_price,
                "market_price": avg_price,
                "market_sources": market_sources,
                "market_links": market_links,
                "recommended_price": recommended_price,
                "difference": difference,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    # ✅ SAVE HISTORY
    price_history.insert_one({
        "product_id": product_id,
        "product_name": name,
        "market_price": avg_price,
        "recommended_price": recommended_price,
        "market_sources": market_sources,
        "recorded_at": datetime.now(timezone.utc)
    })

    print(f"✅ {name} → Market: ₹{avg_price} → Recommended: ₹{recommended_price}")

# ================= RUN SCRAPER ================= #

async def run_scraper():

    product_list = list(products.find().limit(SCRAPE_LIMIT))

    if not product_list:
        print("⚠ No products found")
        return {"status": "no products"}

    async with aiohttp.ClientSession() as session:
        tasks = [process_product(session, p) for p in product_list]
        await asyncio.gather(*tasks)

    return {"status": "scraper completed"}

# ================= ENTRY POINT ================= #

if __name__ == "__main__":
    print("🚀 Starting Smart Pricing Scraper...")
    asyncio.run(run_scraper())
    print("✅ Done!")



# import asyncio
# import aiohttp
# import re
# from pymongo import MongoClient
# from datetime import datetime, timezone

# # ================= CONFIG ================= #

# SERPAPI_API_KEY = "646b65c6aade36ffd224570e41ecd6576408f4949ffa6b934f809e7a0f34f52b"
# SERPAPI_URL = "https://serpapi.com/search.json"

# MONGO_URL = "mongodb://localhost:27017"
# DB_NAME = "dynamic_pricing_engine_db"

# SCRAPE_LIMIT = 10

# ALLOWED_SOURCES = {
#     "amazon",
#     "flipkart",
#     "meesho",
#     "croma",
#     "snapdeal",
#     "ajio",
#     "myntra"
# }

# UNWANTED_WORDS = {"pro", "plus", "max", "ultra"}

# # ================= DB SETUP ================= #

# client = MongoClient(MONGO_URL)
# db = client[DB_NAME]

# products = db["products"]
# competitor_prices = db["competitor_prices"]
# price_history = db["price_history"]

# # ================= UTIL FUNCTIONS ================= #

# def normalize(text):
#     return re.sub(r'[^a-z0-9 ]', '', text.lower())

# def is_relevant(product_name, title):
#     product_words = set(normalize(product_name).split())
#     title_words = set(normalize(title).split())

#     if not product_words:
#         return False

#     match_ratio = len(product_words & title_words) / len(product_words)
#     return match_ratio > 0.6   # adjustable threshold

# def has_unwanted_words(title, product_name):
#     title_words = set(normalize(title).split())
#     product_words = set(normalize(product_name).split())

#     return any(word in title_words and word not in product_words for word in UNWANTED_WORDS)

# def extract_price(raw_price):
#     match = re.search(r"[\d,]+\.?\d*", raw_price)
#     if not match:
#         return None
#     return float(match.group().replace(",", ""))

# # ================= CORE SCRAPER ================= #

# async def fetch_prices(session, name):
#     params = {
#         "engine": "google_shopping",
#         "q": f"{name} price India",
#         "gl": "in",
#         "hl": "en",
#         "api_key": SERPAPI_API_KEY
#     }

#     try:
#         async with session.get(SERPAPI_URL, params=params, timeout=15) as r:
#             data = await r.json()
#     except Exception as e:
#         print(f"❌ API Error for {name}: {e}")
#         return [], {}

#     prices = []
#     sources = {}

#     for item in data.get("shopping_results", [])[:15]:

#         title = item.get("title", "")
#         source = item.get("source", "").strip().lower()

#         # ✅ Source filter (case-insensitive)
#         if source not in ALLOWED_SOURCES:
#             continue

#         # ✅ Product relevance filter
#         if not is_relevant(name, title):
#             continue

#         # ✅ Remove unwanted variants (Pro, Plus, etc.)
#         if has_unwanted_words(title, name):
#             continue

#         raw_price = item.get("price", "")
#         price = extract_price(raw_price)

#         if price is None:
#             continue

#         prices.append(price)
#         sources[source] = price

#         # Debug (optional)
#         print(f"✔ {title[:50]} | ₹{price} | {source}")

#     return prices, sources


# async def process_product(session, p):
#     name = p.get("product_name")

#     prices, sources = await fetch_prices(session, name)

#     if not prices:
#         print(f"⚠ No valid prices for: {name}")
#         return

#     # ✅ Remove outliers (simple method)
#     prices.sort()
#     if len(prices) > 4:
#         prices = prices[1:-1]  # remove lowest & highest

#     avg_price = round(sum(prices) / len(prices), 2)

#     # ✅ Store competitor prices
#     competitor_prices.update_one(
#         {"product_id": p["_id"]},
#         {"$set": {
#             "product_name": name,
#             "market_avg_price": avg_price,
#             "sources": sources,
#             "updated_at": datetime.now(timezone.utc)
#         }},
#         upsert=True
#     )

#     # ✅ Store history
#     price_history.insert_one({
#         "product_id": p["_id"],
#         "product_name": name,
#         "market_price": avg_price,
#         "recorded_at": datetime.now(timezone.utc)
#     })

#     print(f"✅ Updated: {name} | Avg Price: ₹{avg_price}")


# async def run_scraper():
#     product_list = list(products.find().limit(SCRAPE_LIMIT))

#     if not product_list:
#         print("⚠ No products found in DB")
#         return

#     async with aiohttp.ClientSession() as session:
#         tasks = [process_product(session, p) for p in product_list]
#         await asyncio.gather(*tasks)

# # ================= ENTRY POINT ================= #

# if __name__ == "__main__":
#     print("🚀 Starting Smart Pricing Scraper...")
#     asyncio.run(run_scraper())
#     print("✅ Scraping Completed!")
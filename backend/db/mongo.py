from pymongo import MongoClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "dynamic_pricing_engine_db"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

products_collection = db["products"]
competitor_prices_collection = db["competitor_prices"]
recommendations_collection = db["recommendations"]
price_history_collection = db["price_history"]
invoices_collection = db["invoices"]

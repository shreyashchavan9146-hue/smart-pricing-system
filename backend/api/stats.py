from backend.db.mongo import (
    products_collection,
    competitor_prices_collection,
    recommendations_collection
)

def dashboard_stats():
    return {
        "total_products": products_collection.count_documents({}),
        "market_prices": competitor_prices_collection.count_documents({}),
        "recommendations_ready": recommendations_collection.count_documents({})
    }

from backend.db.mongo import recommendations_collection, price_history_collection
from bson import ObjectId


def get_recommendations():
    data = []
    for r in recommendations_collection.find():
        data.append({
            "product_id": str(r["product_id"]),
            "product_name": r["product_name"],
            "cost_price": r["cost_price"],
            "market_price": r["market_price"],
            "recommended_price": r["recommended_price"]
        })
    return data


def get_price_history(product_id: str):
    history = []
    for h in price_history_collection.find(
        {"product_id": ObjectId(product_id)}
    ).sort("recorded_at", -1):
        history.append({
            "market_price": h.get("market_price"),
            "recommended_price": h.get("recommended_price"),
            "date": h["recorded_at"]
        })
    return history

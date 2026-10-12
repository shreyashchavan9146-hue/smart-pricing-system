from backend.api.analytics import get_overview
from backend.db.mongo import competitor_prices_collection, products_collection, recommendations_collection


def dashboard_stats():
    overview = get_overview()

    return {
        "total_products": overview["total_products"],
        "total_sales": overview["total_sales"],
        "total_profit": overview["total_profit"],
        "total_orders": overview["total_orders"],
        "competitor_products": overview["competitor_products"],
        "low_stock_products": overview["low_stock_products"],
        "recommendations": recommendations_collection.count_documents({
            "recommended_price": {"$gt": 0}
        }),
        "recommendations_ready": recommendations_collection.count_documents({
            "recommended_price": {"$gt": 0}
        }),
        "market_prices": competitor_prices_collection.count_documents({
            "market_avg_price": {"$gt": 0}
        }),
        "is_demo_data": overview["is_demo_data"],
    }


def total_sales():
    overview = get_overview()
    return {"total_sales": overview["total_sales"]}


def total_profit():
    overview = get_overview()
    return {"total_profit": overview["total_profit"]}


def total_orders():
    overview = get_overview()
    return {"total_orders": overview["total_orders"]}


def competitor_count():
    return {"competitor_products": competitor_prices_collection.count_documents({})}


def low_stock_count():
    return {"low_stock_products": products_collection.count_documents({
        "$or": [
            {"stock": {"$lte": 10}},
            {"quantity": {"$lte": 10}},
            {"inventory": {"$lte": 10}}
        ]
    })}

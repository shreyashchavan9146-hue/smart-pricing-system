from collections import defaultdict
from datetime import datetime, timedelta

from backend.db.mongo import (
    billing_collection,
    competitor_prices_collection,
    invoices_collection,
    products_collection,
)


DEMO_ANALYTICS_DATA = {
    "total_products": 18,
    "total_sales": 14590.0,
    "total_cost": 10390.0,
    "total_profit": 4200.0,
    "total_orders": 12,
    "competitor_products": 16,
    "low_stock_products": 3,
    "daily_profit": [
        {"date": "2026-04-22", "revenue": 1600.0, "cost": 1100.0, "profit": 500.0},
        {"date": "2026-04-23", "revenue": 1900.0, "cost": 1250.0, "profit": 650.0},
        {"date": "2026-04-24", "revenue": 1750.0, "cost": 1180.0, "profit": 570.0},
        {"date": "2026-04-25", "revenue": 2100.0, "cost": 1420.0, "profit": 680.0},
        {"date": "2026-04-26", "revenue": 2250.0, "cost": 1500.0, "profit": 750.0},
    ],
    "profit_forecast": [
        {"date": "2026-04-27", "predicted_profit": 760.0},
        {"date": "2026-04-28", "predicted_profit": 780.0},
        {"date": "2026-04-29", "predicted_profit": 790.0},
    ],
    "weekly_sales": [
        {"period": "2026-W15", "orders": 10, "revenue": 7200.0},
        {"period": "2026-W16", "orders": 12, "revenue": 8200.0},
    ],
    "monthly_revenue": [
        {"period": "2026-02", "revenue": 16700.0},
        {"period": "2026-03", "revenue": 19350.0},
        {"period": "2026-04", "revenue": 20500.0},
    ],
    "best_selling": [
        {"product_name": "Wireless Earbuds", "quantity": 28, "revenue": 8400.0, "profit": 2600.0},
        {"product_name": "Smartwatch", "quantity": 18, "revenue": 5400.0, "profit": 1700.0},
    ],
    "low_profit_products": [
        {"product_name": "USB-C Cable", "quantity": 12, "revenue": 720.0, "profit": 50.0, "margin": 7.0},
        {"product_name": "Budget Charger", "quantity": 9, "revenue": 630.0, "profit": 40.0, "margin": 6.0},
    ],
}


def _safe_float(value):
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _safe_int(value):
    try:
        return int(value or 0)
    except Exception:
        return 0


def _parse_datetime(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _group_by_key(items, key_func):
    grouped = defaultdict(lambda: {"revenue": 0.0, "cost": 0.0, "profit": 0.0, "quantity": 0, "orders": 0})
    for item in items:
        key = key_func(item)
        grouped[key]["revenue"] += item["revenue"]
        grouped[key]["cost"] += item["cost"]
        grouped[key]["profit"] += item["profit"]
        grouped[key]["quantity"] += item["quantity"]
        grouped[key]["orders"] += item.get("orders", 1)
    return grouped


def _invoice_identifier(document):
    return str(document.get("invoice_id") or document.get("_id") or "")


def _load_sales_documents():
    # Support both legacy `billing` records and newer `invoices` records.
    seen_ids = set()
    documents = []

    for collection in (invoices_collection, billing_collection):
        for document in collection.find():
            identifier = _invoice_identifier(document)
            if identifier and identifier in seen_ids:
                continue
            if identifier:
                seen_ids.add(identifier)
            documents.append(document)

    return documents


def _coerce_items(document):
    items = document.get("items")
    if isinstance(items, list) and items:
        return items

    product_name = document.get("product_name")
    if product_name:
        return [{
            "product_name": product_name,
            "qty": document.get("quantity", 1),
            "price": document.get("selling_price", document.get("price", document.get("total_amount", 0))),
            "cost_price": document.get("cost_price", document.get("price", 0)),
        }]

    return []


def _sales_summary(document):
    items = _coerce_items(document)
    revenue_from_items = 0.0
    cost_from_items = 0.0
    sold_items = []

    for item in items:
        qty = _safe_int(item.get("qty", item.get("quantity", 0)))
        price = _safe_float(item.get("price", item.get("selling_price", 0)))
        cost_price = _safe_float(item.get("cost_price", item.get("purchase_price", price)))

        item_revenue = price * qty
        item_cost = cost_price * qty

        revenue_from_items += item_revenue
        cost_from_items += item_cost
        sold_items.append({
            "product_name": item.get("product_name", "Unknown Product"),
            "qty": qty,
            "revenue": item_revenue,
            "cost": item_cost,
            "profit": item_revenue - item_cost,
        })

    revenue = _safe_float(
        document.get(
            "subtotal",
            document.get("grand_total", document.get("total_amount", revenue_from_items)),
        )
    )
    cost = _safe_float(document.get("total_cost", cost_from_items))
    profit = _safe_float(document.get("total_profit", revenue - cost))

    if revenue <= 0 and revenue_from_items > 0:
        revenue = revenue_from_items
    if cost <= 0 and cost_from_items > 0:
        cost = cost_from_items
    if sold_items and document.get("total_profit") is None:
        profit = revenue - cost

    quantity = sum(item["qty"] for item in sold_items)
    created_at = (
        document.get("purchase_date")
        or document.get("created_at")
        or document.get("updated_at")
        or datetime.utcnow()
    )

    parsed_created_at = _parse_datetime(created_at) or datetime.utcnow()

    return {
        "invoice_id": _invoice_identifier(document),
        "customer_name": document.get("customer_name", "Unknown"),
        "created_at": parsed_created_at,
        "revenue": round(revenue, 2),
        "cost": round(cost, 2),
        "profit": round(profit, 2),
        "quantity": quantity,
        "items": sold_items,
    }


def _forecast_profit(daily_profit, days=7):
    if not daily_profit or len(daily_profit) < 2:
        return []

    values = [item["profit"] for item in daily_profit]
    n = len(values)
    x = list(range(1, n + 1))
    mean_x = sum(x) / n
    mean_y = sum(values) / n
    numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, values))
    denominator = sum((xi - mean_x) ** 2 for xi in x)

    if denominator == 0:
        return []

    slope = numerator / denominator
    intercept = mean_y - slope * mean_x
    last_date = daily_profit[-1]["date"]

    try:
        last_dt = datetime.strptime(last_date, "%Y-%m-%d")
    except Exception:
        return []

    forecast = []
    for index in range(1, days + 1):
        next_date = last_dt + timedelta(days=index)
        predicted_profit = round(intercept + slope * (n + index), 2)
        forecast.append({
            "date": next_date.strftime("%Y-%m-%d"),
            "predicted_profit": predicted_profit,
        })

    return forecast


def _low_stock_count():
    return products_collection.count_documents({
        "$or": [
            {"stock": {"$lte": 10}},
            {"quantity": {"$lte": 10}},
            {"inventory": {"$lte": 10}},
        ]
    })


def _build_live_analytics():
    sales_documents = [_sales_summary(document) for document in _load_sales_documents()]
    product_agg = defaultdict(lambda: {"qty": 0, "revenue": 0.0, "cost": 0.0, "profit": 0.0})

    total_sales = sum(document["revenue"] for document in sales_documents)
    total_cost = sum(document["cost"] for document in sales_documents)
    total_profit = sum(document["profit"] for document in sales_documents)
    total_orders = len(sales_documents)
    total_products = products_collection.count_documents({})
    competitor_products = competitor_prices_collection.count_documents({})
    low_stock_products = _low_stock_count()

    timeline_items = []
    for document in sales_documents:
        timeline_items.append({
            "created_at": document["created_at"],
            "revenue": document["revenue"],
            "cost": document["cost"],
            "profit": document["profit"],
            "quantity": document["quantity"],
            "orders": 1,
        })

        for item in document["items"]:
            key = item["product_name"]
            product_agg[key]["qty"] += item["qty"]
            product_agg[key]["revenue"] += item["revenue"]
            product_agg[key]["cost"] += item["cost"]
            product_agg[key]["profit"] += item["profit"]

    daily = _group_by_key(timeline_items, lambda item: item["created_at"].strftime("%Y-%m-%d"))
    weekly = _group_by_key(timeline_items, lambda item: item["created_at"].strftime("%Y-W%W"))
    monthly = _group_by_key(timeline_items, lambda item: item["created_at"].strftime("%Y-%m"))

    daily_profit = [
        {
            "date": date,
            "revenue": round(data["revenue"], 2),
            "cost": round(data["cost"], 2),
            "profit": round(data["profit"], 2),
        }
        for date, data in sorted(daily.items())
    ]

    best_selling = sorted(
        [
            {
                "product_name": name,
                "quantity": data["qty"],
                "revenue": round(data["revenue"], 2),
                "profit": round(data["profit"], 2),
            }
            for name, data in product_agg.items()
        ],
        key=lambda item: item["quantity"],
        reverse=True,
    )[:6]

    low_profit = sorted(
        [
            {
                "product_name": name,
                "quantity": data["qty"],
                "revenue": round(data["revenue"], 2),
                "profit": round(data["profit"], 2),
                "margin": round((data["profit"] / data["revenue"] * 100) if data["revenue"] else 0.0, 2),
            }
            for name, data in product_agg.items()
        ],
        key=lambda item: item["margin"],
    )[:6]

    has_live_data = bool(total_orders or total_products or competitor_products)
    payload = {
        "total_products": total_products,
        "total_sales": round(total_sales, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": round(total_profit, 2),
        "total_orders": total_orders,
        "competitor_products": competitor_products,
        "low_stock_products": low_stock_products,
        "daily_profit": daily_profit,
        "profit_forecast": _forecast_profit(daily_profit),
        "weekly_sales": [
            {
                "period": period,
                "orders": data["orders"],
                "revenue": round(data["revenue"], 2),
            }
            for period, data in sorted(weekly.items())
        ],
        "monthly_revenue": [
            {"period": period, "revenue": round(data["revenue"], 2)}
            for period, data in sorted(monthly.items())
        ],
        "best_selling": best_selling,
        "low_profit_products": low_profit,
        "is_demo_data": not has_live_data,
    }

    if has_live_data:
        return payload

    demo_payload = dict(DEMO_ANALYTICS_DATA)
    demo_payload["is_demo_data"] = True
    return demo_payload


def get_overview():
    analytics = _build_live_analytics()
    return {
        "total_products": analytics["total_products"],
        "total_sales": analytics["total_sales"],
        "total_cost": analytics["total_cost"],
        "total_profit": analytics["total_profit"],
        "total_orders": analytics["total_orders"],
        "competitor_products": analytics["competitor_products"],
        "low_stock_products": analytics["low_stock_products"],
        "is_demo_data": analytics["is_demo_data"],
    }


def get_dashboard_data():
    analytics = _build_live_analytics()
    return {
        "total_products": analytics["total_products"],
        "total_sales": analytics["total_sales"],
        "total_cost": analytics["total_cost"],
        "total_profit": analytics["total_profit"],
        "total_orders": analytics["total_orders"],
        "competitor_products": analytics["competitor_products"],
        "low_stock_products": analytics["low_stock_products"],
        "daily_profit": analytics["daily_profit"],
        "profit_forecast": analytics["profit_forecast"],
        "weekly_sales": analytics["weekly_sales"],
        "monthly_revenue": analytics["monthly_revenue"],
        "best_selling": analytics["best_selling"],
        "low_profit_products": analytics["low_profit_products"],
        "is_demo_data": analytics["is_demo_data"],
    }


def get_sales_report():
    sales_documents = sorted(
        [_sales_summary(document) for document in _load_sales_documents()],
        key=lambda item: item["created_at"],
        reverse=True,
    )

    if not sales_documents:
        return [
            {
                "invoice_id": "DEMO-1001",
                "customer_name": "Demo Customer",
                "total": 2450.0,
                "cost": 1730.0,
                "profit": 720.0,
                "created_at": "2026-04-29T10:30:00",
                "items": [
                    {
                        "product_name": "Wireless Earbuds",
                        "qty": 2,
                        "price": 1225.0,
                        "cost_price": 865.0,
                    }
                ],
            }
        ]

    return [
        {
            "invoice_id": document["invoice_id"],
            "customer_name": document["customer_name"],
            "total": document["revenue"],
            "cost": document["cost"],
            "profit": document["profit"],
            "created_at": document["created_at"].isoformat(),
            "items": document["items"],
        }
        for document in sales_documents
    ]


def get_top_selling_products():
    return get_dashboard_data()["best_selling"]


def get_low_performing_products():
    return get_dashboard_data()["low_profit_products"]

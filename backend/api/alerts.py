import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from bson import ObjectId

from backend.db.mongo import (
    alerts_collection,
    competitor_prices_collection,
    products_collection,
    recommendations_collection,
)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "your-email@gmail.com")
SMTP_PASS = os.getenv("SMTP_PASS", "your-password")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
SMTP_RECIPIENT = os.getenv("ALERT_EMAIL_RECIPIENT", SMTP_USER)

DEMO_ALERTS = [
    {
        "alert_id": "demo-alert-1",
        "product_id": "demo-product-1",
        "product_name": "Nothing Phone 4a",
        "cost_price": 25000.0,
        "market_price": 23999.0,
        "recommended_price": 27000.0,
        "profit_percent": 8.0,
        "alert_type": "Loss Risk Alert",
        "alert_message": "Market price is below cost price. Selling at market rate may cause a loss.",
        "alert_status": "unread",
        "timestamp": datetime.now(timezone.utc),
    },
    {
        "alert_id": "demo-alert-2",
        "product_id": "demo-product-2",
        "product_name": "iPhone 17",
        "cost_price": 70000.0,
        "market_price": 152400.0,
        "recommended_price": 140208.0,
        "profit_percent": 100.3,
        "alert_type": "Profit Opportunity",
        "alert_message": "Market price is strong. This product has good margin opportunity.",
        "alert_status": "unread",
        "timestamp": datetime.now(timezone.utc),
    },
]


def _safe_float(value):
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _as_string_id(value):
    if isinstance(value, ObjectId):
        return str(value)
    return str(value or "")


def send_price_drop_email(alert):
    if not SMTP_USER or not SMTP_PASS or "your-email" in SMTP_USER:
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Price Alert: {alert['product_name']}"
    message["From"] = SMTP_FROM
    message["To"] = SMTP_RECIPIENT

    html = f"""
    <html>
      <body>
        <h2>{alert['alert_type']}</h2>
        <p>{alert['alert_message']}</p>
        <ul>
          <li><strong>Product:</strong> {alert['product_name']}</li>
          <li><strong>Cost Price:</strong> ₹{alert['cost_price']:.2f}</li>
          <li><strong>Market Price:</strong> ₹{alert['market_price']:.2f}</li>
          <li><strong>Recommended Price:</strong> ₹{alert['recommended_price']:.2f}</li>
          <li><strong>Profit %:</strong> {alert['profit_percent']:.2f}%</li>
        </ul>
      </body>
    </html>
    """

    body = MIMEText(html, "html")
    message.attach(body)

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_FROM, SMTP_RECIPIENT, message.as_string())
        server.quit()
        return True
    except Exception:
        return False


def _normalize_product_id(product_id):
    normalized = _as_string_id(product_id)
    return normalized or None


def _build_recommendation_index():
    index = {}
    for recommendation in recommendations_collection.find():
        product_id = _normalize_product_id(recommendation.get("product_id"))
        if product_id:
            index[product_id] = recommendation
    return index


def _build_competitor_index():
    index = {}
    for competitor in competitor_prices_collection.find():
        product_id = _normalize_product_id(competitor.get("product_id"))
        if product_id:
            index[product_id] = competitor
    return index


def _build_product_index():
    index = {}
    for product in products_collection.find():
        index[_as_string_id(product.get("_id"))] = product
    return index


def _build_alert_type(cost_price, market_price):
    if market_price < cost_price:
        return "Loss Risk Alert"
    return "Profit Opportunity"


def _build_alert_message(alert_type, product_name, cost_price, market_price, recommended_price):
    if alert_type == "Loss Risk Alert":
        return (
            f"{product_name}: market price ₹{market_price:.2f} is below cost price ₹{cost_price:.2f}. "
            "Selling at market rate may cause a loss."
        )
    return (
        f"{product_name}: market price ₹{market_price:.2f} is above your pricing baseline. "
        f"Recommended selling price is ₹{recommended_price:.2f}."
    )


def get_dashboard_alerts():
    recommendation_index = _build_recommendation_index()
    competitor_index = _build_competitor_index()
    product_index = _build_product_index()

    alerts = []

    for product_id, recommendation in recommendation_index.items():
        competitor = competitor_index.get(product_id)
        product = product_index.get(product_id, {})

        if not competitor:
            continue

        product_name = (
            recommendation.get("product_name")
            or competitor.get("product_name")
            or product.get("product_name")
            or "Unknown Product"
        )
        cost_price = _safe_float(
            recommendation.get("cost_price")
            or product.get("cost_price")
            or product.get("current_price")
        )
        market_price = _safe_float(
            competitor.get("market_avg_price")
            or recommendation.get("market_price")
        )
        recommended_price = _safe_float(
            recommendation.get("recommended_price")
            or recommendation.get("market_price")
            or cost_price
        )

        if cost_price <= 0 and market_price <= 0 and recommended_price <= 0:
            continue

        profit_percent = round((((recommended_price - cost_price) / cost_price) * 100) if cost_price else 0.0, 2)
        alert_type = _build_alert_type(cost_price, market_price)

        alerts.append({
            "alert_id": f"dashboard-{product_id}",
            "product_id": product_id,
            "product_name": product_name,
            "cost_price": round(cost_price, 2),
            "market_price": round(market_price, 2),
            "recommended_price": round(recommended_price, 2),
            "profit_percent": profit_percent,
            "alert_type": alert_type,
            "alert_message": _build_alert_message(
                alert_type,
                product_name,
                cost_price,
                market_price,
                recommended_price,
            ),
            "alert_status": "unread" if alert_type == "Loss Risk Alert" else "active",
            "timestamp": competitor.get("updated_at") or recommendation.get("updated_at") or datetime.now(timezone.utc),
        })

    alerts.sort(key=lambda item: (item["alert_type"] != "Loss Risk Alert", -item["market_price"]))

    if alerts:
        return {"source": "mongodb", "is_demo_data": False, "alerts": alerts}

    demo_alerts = []
    for alert in DEMO_ALERTS:
        demo_alert = dict(alert)
        demo_alert["timestamp"] = alert["timestamp"]
        demo_alerts.append(demo_alert)

    return {"source": "demo", "is_demo_data": True, "alerts": demo_alerts}


def _has_duplicate_alert(product_name, alert_type, market_price, recommended_price):
    return alerts_collection.find_one({
        "product_name": product_name,
        "alert_type": alert_type,
        "market_price": market_price,
        "recommended_price": recommended_price,
    }) is not None


def create_price_drop_alerts():
    dashboard_data = get_dashboard_alerts()
    alerts_created = []

    for alert in dashboard_data["alerts"]:
        if _has_duplicate_alert(
            alert["product_name"],
            alert["alert_type"],
            alert["market_price"],
            alert["recommended_price"],
        ):
            continue

        document = {
            "product_id": alert["product_id"],
            "product_name": alert["product_name"],
            "cost_price": alert["cost_price"],
            "market_price": alert["market_price"],
            "recommended_price": alert["recommended_price"],
            "profit_percent": alert["profit_percent"],
            "alert_type": alert["alert_type"],
            "alert_message": alert["alert_message"],
            "timestamp": datetime.now(timezone.utc),
            "alert_status": alert["alert_status"],
        }

        insert_result = alerts_collection.insert_one(document)
        send_price_drop_email(document)
        alerts_created.append({
            **alert,
            "alert_id": str(insert_result.inserted_id),
        })

    return {
        "status": "completed",
        "alerts_created": len(alerts_created),
        "alerts": alerts_created,
    }


def fetch_alerts():
    # Prefer live dashboard alerts for the main UI.
    return get_dashboard_alerts()["alerts"]


def mark_alert_as_read(alert_id: str):
    if alert_id.startswith("dashboard-") or alert_id.startswith("demo-alert-"):
        return {"updated": 1}

    result = alerts_collection.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"alert_status": "read"}},
    )
    return {"updated": result.modified_count}


def delete_alert(alert_id: str):
    if alert_id.startswith("dashboard-") or alert_id.startswith("demo-alert-"):
        return {"deleted": 1}

    result = alerts_collection.delete_one({"_id": ObjectId(alert_id)})
    return {"deleted": result.deleted_count}

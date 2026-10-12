import os
import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pymongo.errors import PyMongoError
from backend.api.billing import generate_invoice
from backend.db.mongo import products_collection
from backend.db.mongo import recommendations_collection
from backend.api.admin import (
    upload_products_csv,
    run_scraper_job,
    generate_recommendations
)
from backend.api.alerts import (
    create_price_drop_alerts,
    get_dashboard_alerts,
    fetch_alerts,
    mark_alert_as_read,
    delete_alert
)
from backend.api.analytics import (
    get_overview,
    get_dashboard_data,
    get_sales_report,
    get_top_selling_products,
    get_low_performing_products
)
from backend.api.purchase_history import (
    get_purchase_history,
    get_purchase_details,
    get_purchase_invoice_file
)
from backend.api.pricing import get_recommendations, get_price_history
from backend.api.stats import (
    dashboard_stats,
    total_sales,
    total_profit,
    total_orders,
    competitor_count,
    low_stock_count
)

app = FastAPI(title="Smart Pricing System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/stats")
def stats():
    return dashboard_stats()

@app.get("/stats/total-sales")
def stats_total_sales():
    return total_sales()

@app.get("/stats/total-profit")
def stats_total_profit():
    return total_profit()

@app.get("/stats/total-orders")
def stats_total_orders():
    return total_orders()

@app.get("/stats/competitor-count")
def stats_competitor_count():
    return competitor_count()

@app.get("/stats/low-stock-count")
def stats_low_stock_count():
    return low_stock_count()

@app.get("/recommendations")
def recommendations():
    return get_recommendations()

@app.get("/pricing/history/{product_id}")
def history(product_id: str):
    return get_price_history(product_id)

@app.post("/admin/upload-products")
def upload_products(file: UploadFile = File(...)):
    return upload_products_csv(file)

@app.get("/analytics/overview")
def analytics_overview():
    return get_overview()

@app.get("/analytics/dashboard")
def analytics_dashboard():
    return get_dashboard_data()

@app.get("/analytics/sales-report")
def analytics_sales_report():
    return get_sales_report()

@app.get("/analytics/top-products")
def analytics_top_products():
    return get_top_selling_products()

@app.get("/analytics/low-profit-products")
def analytics_low_profit_products():
    return get_low_performing_products()

@app.get("/purchase-history")
@app.get("/purchase_history")
def purchase_history(search: str = "", date: str = "", period: str = ""):
    try:
        return get_purchase_history(search=search, date=date, period=period)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database error while loading purchase history: {exc}")

@app.get("/purchase-history/{invoice_id}")
@app.get("/purchase_history/{invoice_id}")
def purchase_history_details(invoice_id: str):
    try:
        return get_purchase_details(invoice_id)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database error while loading purchase details: {exc}")

@app.get("/purchase-history/{invoice_id}/download")
@app.get("/purchase_history/{invoice_id}/download")
def purchase_history_download(invoice_id: str):
    return get_purchase_invoice_file(invoice_id)

@app.post("/alerts/generate")
def generate_alerts():
    return create_price_drop_alerts()

@app.get("/alerts")
def get_all_alerts():
    return fetch_alerts()

@app.get("/dashboard-alerts")
def dashboard_alerts():
    return get_dashboard_alerts()

@app.post("/alerts/{alert_id}/read")
def mark_alert_read_route(alert_id: str):
    return mark_alert_as_read(alert_id)

@app.delete("/alerts/{alert_id}")
def delete_alert_route(alert_id: str):
    return delete_alert(alert_id)

# @app.post("/admin/run-scraper")
# def run_scraper():
#     return run_scraper_job()

@app.post("/admin/run-scraper")
def run_scraper():
    result = run_scraper_job()
    print("Scraper Result:", result)
    return result

# @app.post("/admin/run-ml")
# def run_ml():
#     return generate_recommendations()
@app.post("/admin/run-ml")
def run_ml():
    data_count = recommendations_collection.count_documents({})

    if data_count == 0:
        return {"error": "No data available for ML. Run scraper first."}

    return generate_recommendations()

@app.get("/")
def root():
    return {"status": "Smart Pricing Backend Running"}

@app.get("/products")
def get_products():

    products = []

    for p in products_collection.find():

        products.append({
            "id": str(p["_id"]),
            "product_name": p["product_name"],
            # "price": p.get("current_price", p["cost_price"])
            "price": p.get("current_price") or p.get("cost_price") or 0
        })

    return products


# ==========================
# GET PRODUCTS FOR BILLING
# ==========================
@app.get("/billing/products")
def billing_products():

    products = list(
        recommendations_collection.find(
            {},
            {
                "_id": 0,
                "product_id": 1,
                "product_name": 1,
                "cost_price": 1,
                "market_avg_price": 1,
                "recommended_price": 1,
                "difference": 1,
                "updated_at": 1
            }
        )
    )

    return products


# ==========================
# GENERATE INVOICE PDF
# ==========================
@app.post("/billing/generate")
def generate_invoice_pdf(data: dict):
    try:
        filepath = generate_invoice(data)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Invoice generation failed")

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename="invoice.pdf"
    )

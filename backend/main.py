import os
import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from backend.api.billing import generate_invoice
from fastapi import Body
from backend.db.mongo import products_collection
from backend.db.mongo import recommendations_collection
from fastapi.responses import StreamingResponse
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
import io



from backend.api.admin import (
    upload_products_csv,
    run_scraper_job,
    generate_recommendations
)
from backend.api.pricing import get_recommendations, get_price_history
from backend.api.stats import dashboard_stats

app = FastAPI(title="Smart Pricing System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/stats")
def stats():
    return dashboard_stats()

@app.get("/recommendations")
def recommendations():
    return get_recommendations()

@app.get("/pricing/history/{product_id}")
def history(product_id: str):
    return get_price_history(product_id)

@app.post("/admin/upload-products")
def upload_products(file: UploadFile = File(...)):
    return upload_products_csv(file)

@app.post("/admin/run-scraper")
def run_scraper():
    return run_scraper_job()

@app.post("/admin/run-ml")
def run_ml():
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
            "price": p.get("current_price", p["cost_price"])
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
def generate_invoice(data: dict):

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()

    elements = []

    elements.append(
        Paragraph(f"RetailIQ Invoice — {data['customer_name']}",
                  styles['Title'])
    )

    table_data = [["Product", "Price", "Qty", "Total"]]

    grand_total = 0

    for item in data["items"]:
        total = item["price"] * item["qty"]
        grand_total += total

        table_data.append([
            item["product_name"],
            f"₹{item['price']}",
            item["qty"],
            f"₹{total:.2f}"
        ])

    table_data.append(["", "", "Grand Total", f"₹{grand_total:.2f}"])

    elements.append(Table(table_data))
    elements.append(Spacer(1, 20))

    doc.build(elements)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
            f"attachment; filename=invoice.pdf"
        }
    )

from fastapi.responses import FileResponse
from datetime import datetime, timezone
import os
from bson import ObjectId

from backend.db.mongo import invoices_collection, billing_collection


def _safe_float(value):
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _create_invoice_pdf(data, filename=None, save_to_db=False):
    try:
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    except ModuleNotFoundError:
        raise RuntimeError("The reportlab package is required to generate invoices. Please install it with 'pip install reportlab'.")

    # Register Unicode font (supports ₹)
    try:
        pdfmetrics.registerFont(UnicodeCIDFont("HYSMyeongJo-Medium"))
    except Exception:
        pass

    customer = data["customer_name"]
    items = data["items"]

    subtotal = sum(i["price"] * i["qty"] for i in items)
    total_cost = sum(_safe_float(i.get("cost_price", i.get("price", 0))) * i["qty"] for i in items)
    tax = 0.0
    grand_total = subtotal

    if not filename:
        filename = f"invoice_{customer}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = os.path.join("invoices", filename)

    os.makedirs("invoices", exist_ok=True)

    # ---------- PDF ----------
    doc = SimpleDocTemplate(filepath, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("SMART PRICING STORE", styles["Title"]))
    story.append(Paragraph(f"Customer: {customer}", styles["Normal"]))
    story.append(Paragraph(f"Date: {datetime.now().strftime('%d-%m-%Y %H:%M')}", styles["Normal"]))
    story.append(Spacer(1, 20))

    table_data = [["Product", "Qty", "Price (₹)", "Total (₹)"]]

    for i in items:
        table_data.append([
            i["product_name"],
            i["qty"],
            f"{i['price']:.2f}",
            f"{i['price'] * i['qty']:.2f}"
        ])

    table_data += [
        ["", "", "Subtotal", f"{subtotal:.2f}"],
        ["", "", "Grand Total", f"{grand_total:.2f}"],
    ]

    table = Table(table_data)
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("ALIGN", (-2, 1), (-1, -1), "RIGHT"),
    ]))

    story.append(table)
    doc.build(story)

    if save_to_db:
        invoices_collection.insert_one({
            "customer_name": customer,
            "items": items,
            "subtotal": subtotal,
            "tax": tax,
            "grand_total": grand_total,
            "total_cost": total_cost,
            "total_profit": subtotal - total_cost,
            "created_at": datetime.now(timezone.utc),
            "payment_status": data.get("payment_status", "Paid"),
            "pdf_file": filename
        })

    return filepath


def generate_invoice(data):
    filepath = _create_invoice_pdf(data, save_to_db=True)
    return filepath


def _invoice_collection():
    if invoices_collection.count_documents({}) > 0:
        return invoices_collection
    if billing_collection.count_documents({}) > 0:
        return billing_collection
    return invoices_collection


def get_invoice_file_path(invoice_id):
    collection = _invoice_collection()
    invoice = None

    try:
        invoice = collection.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        invoice = None

    if not invoice:
        invoice = collection.find_one({"invoice_id": invoice_id})

    if not invoice:
        raise FileNotFoundError("Invoice not found")

    pdf_file = invoice.get("pdf_file")
    if pdf_file:
        filepath = os.path.join("invoices", pdf_file)
        if os.path.exists(filepath):
            return filepath

    data = {
        "customer_name": invoice.get("customer_name", "Unknown"),
        "items": invoice.get("items", []),
        "payment_status": invoice.get("payment_status", "Paid")
    }
    return _create_invoice_pdf(data, filename=pdf_file or f"invoice_{invoice_id}.pdf", save_to_db=False)

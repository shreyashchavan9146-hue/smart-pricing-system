from fastapi.responses import FileResponse
from datetime import datetime, timezone
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
import os

from backend.db.mongo import invoices_collection

# Register Unicode font (supports ₹)
pdfmetrics.registerFont(UnicodeCIDFont("HYSMyeongJo-Medium"))


def generate_invoice(data):
    customer = data["customer_name"]
    items = data["items"]

    subtotal = sum(i["price"] * i["qty"] for i in items)
    tax = subtotal * 0.18   # 18% GST
    grand_total = subtotal + tax

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
        ["", "", "GST (18%)", f"{tax:.2f}"],
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

    # ---------- SAVE TO DB ----------
    invoices_collection.insert_one({
        "customer_name": customer,
        "items": items,
        "subtotal": subtotal,
        "tax": tax,
        "grand_total": grand_total,
        "created_at": datetime.now(timezone.utc),
        "pdf_file": filename
    })

    return filepath

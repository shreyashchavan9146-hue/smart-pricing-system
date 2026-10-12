import os
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException
from fastapi.responses import FileResponse

from backend.db.mongo import invoices_collection, billing_collection
from backend.api.billing import get_invoice_file_path


def _invoice_collection():
    if invoices_collection.count_documents({}) > 0:
        return invoices_collection
    if billing_collection.count_documents({}) > 0:
        return billing_collection
    return invoices_collection


def _safe_float(value):
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _normalize_payment_status(invoice):
    return invoice.get("payment_status") or invoice.get("status") or "Paid"


def _parse_datetime(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _format_datetime(value):
    parsed = _parse_datetime(value)
    if parsed:
        return parsed.strftime("%Y-%m-%d %H:%M")
    return str(value or "")


def _coerce_items(invoice):
    items = invoice.get("items")
    if isinstance(items, list) and items:
        return items

    product_name = invoice.get("product_name")
    if product_name:
        return [{
            "product_name": product_name,
            "qty": invoice.get("quantity", 1),
            "price": invoice.get("selling_price", invoice.get("price", invoice.get("total_amount", 0))),
            "cost_price": invoice.get("cost_price", invoice.get("price", 0))
        }]

    return []


def _build_history_record(invoice):
    items = _coerce_items(invoice)
    invoice_id = str(invoice.get("invoice_id") or invoice.get("_id"))
    created_at = invoice.get("purchase_date") or invoice.get("created_at")

    total_quantity = 0
    total_amount = 0.0
    product_names = []

    for item in items:
        qty = int(item.get("qty", item.get("quantity", 0)) or 0)
        price = _safe_float(item.get("price", item.get("selling_price", 0)))
        total_quantity += qty
        total_amount += qty * price

        product_name = item.get("product_name", "Unknown Product")
        if product_name not in product_names:
            product_names.append(product_name)

    if not total_amount:
        total_amount = _safe_float(
            invoice.get("subtotal", invoice.get("grand_total", invoice.get("total_amount", 0)))
        )

    return {
        "invoice_id": invoice_id,
        "customer_name": invoice.get("customer_name", "Unknown"),
        "product_name": ", ".join(product_names) if product_names else "Unknown Product",
        "quantity": total_quantity or int(invoice.get("quantity", 0) or 0),
        "item_count": len(items),
        "purchase_date": _format_datetime(created_at),
        "total_amount": round(total_amount, 2),
        "payment_status": _normalize_payment_status(invoice)
    }


def _find_invoice(invoice_id: str):
    collection = _invoice_collection()
    queries = []

    try:
        queries.append({"_id": ObjectId(invoice_id)})
    except Exception:
        pass

    queries.append({"invoice_id": invoice_id})

    for query in queries:
        invoice = collection.find_one(query)
        if invoice:
            return invoice

    return None


def get_purchase_history(search: str = "", date: str = "", period: str = ""):
    query = {}

    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"items.product_name": {"$regex": search, "$options": "i"}},
            {"product_name": {"$regex": search, "$options": "i"}}
        ]

    if period and period != 'all':
        now = datetime.utcnow()
        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query["created_at"] = {"$gte": start}
        elif period == "weekly":
            start = now - timedelta(days=7)
            query["created_at"] = {"$gte": start}
        elif period == "monthly":
            start = now - timedelta(days=30)
            query["created_at"] = {"$gte": start}
        elif period.isdigit():
            days = int(period)
            start = now - timedelta(days=days)
            query["created_at"] = {"$gte": start}

    if date:
        try:
            date_obj = datetime.fromisoformat(date)
            start = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
            query["created_at"] = {"$gte": start, "$lt": end}
        except ValueError:
            pass

    history = []
    for invoice in _invoice_collection().find(query).sort("created_at", -1):
        history.append(_build_history_record(invoice))

    return history


def get_purchase_details(invoice_id: str):
    invoice = _find_invoice(invoice_id)

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    items = []
    for item in _coerce_items(invoice):
        qty = int(item.get("qty", item.get("quantity", 0)) or 0)
        price = _safe_float(item.get("price", item.get("selling_price", 0)))
        cost_price = _safe_float(item.get("cost_price", item.get("price", 0)))
        items.append({
            "product_name": item.get("product_name", "Unknown Product"),
            "quantity": qty,
            "cost_price": cost_price,
            "selling_price": price,
            "total_amount": round(qty * price, 2)
        })

    subtotal = _safe_float(invoice.get("subtotal"))
    tax = _safe_float(invoice.get("tax"))
    grand_total = _safe_float(invoice.get("grand_total"))
    total_cost = _safe_float(invoice.get("total_cost"))
    payment_status = _normalize_payment_status(invoice)

    return {
        "invoice_id": str(invoice.get("invoice_id") or invoice.get("_id")),
        "customer_name": invoice.get("customer_name", "Unknown"),
        "purchase_date": _format_datetime(invoice.get("purchase_date") or invoice.get("created_at")),
        "payment_status": payment_status,
        "items": items,
        "subtotal": subtotal,
        "tax": tax,
        "grand_total": grand_total,
        "total_cost": total_cost,
        "total_profit": round(grand_total - total_cost, 2),
        "pdf_file": invoice.get("pdf_file")
    }


def get_purchase_invoice_file(invoice_id: str):
    try:
        file_path = get_invoice_file_path(invoice_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return FileResponse(path=file_path, media_type="application/pdf", filename=os.path.basename(file_path))

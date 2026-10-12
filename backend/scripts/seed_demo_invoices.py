from datetime import datetime, timedelta, timezone

from backend.db.mongo import invoices_collection, products_collection


DEMO_ORDERS = [
    {
        "invoice_id": "DEMO-20260429-001",
        "customer_name": "Rahul",
        "payment_status": "Paid",
        "created_at_offset_days": 4,
        "items": [
            {"product_name": "Samsung Galaxy S26 Ultra", "qty": 1, "markup": 18000},
            {"product_name": "iPhone 17", "qty": 1, "markup": 22000},
        ],
    },
    {
        "invoice_id": "DEMO-20260429-002",
        "customer_name": "Priya",
        "payment_status": "Paid",
        "created_at_offset_days": 3,
        "items": [
            {"product_name": "Nothing Phone 4a", "qty": 2, "markup": 6500},
            {"product_name": "iQOO 15R", "qty": 1, "markup": 9000},
        ],
    },
    {
        "invoice_id": "DEMO-20260429-003",
        "customer_name": "Arjun",
        "payment_status": "Paid",
        "created_at_offset_days": 2,
        "items": [
            {"product_name": "Samsung Galaxy S25", "qty": 1, "markup": 15000},
            {"product_name": "Samsung Galaxy A55", "qty": 1, "markup": 7000},
        ],
    },
    {
        "invoice_id": "DEMO-20260429-004",
        "customer_name": "Sneha",
        "payment_status": "Paid",
        "created_at_offset_days": 1,
        "items": [
            {"product_name": "Google Pixel 9a", "qty": 1, "markup": 11000},
            {"product_name": "Samsung Galaxy S26 Ultra", "qty": 1, "markup": 14000},
        ],
    },
]


def build_catalog():
    return {
        product["product_name"]: product
        for product in products_collection.find({}, {"product_name": 1, "cost_price": 1, "current_price": 1})
    }


def build_invoice(order, catalog):
    items = []

    for line in order["items"]:
        product = catalog.get(line["product_name"])
        if not product:
            continue

        cost_price = float(product.get("cost_price", 0) or 0)
        selling_price = float(product.get("current_price", 0) or 0)
        if selling_price <= 0:
            selling_price = cost_price + float(line["markup"])
        else:
            selling_price = max(selling_price, cost_price + float(line["markup"]))

        qty = int(line["qty"])
        items.append({
            "product_name": line["product_name"],
            "qty": qty,
            "price": round(selling_price, 2),
            "cost_price": round(cost_price, 2),
        })

    if not items:
        return None

    subtotal = round(sum(item["price"] * item["qty"] for item in items), 2)
    total_cost = round(sum(item["cost_price"] * item["qty"] for item in items), 2)
    tax = 0.0
    grand_total = round(subtotal, 2)
    created_at = datetime.now(timezone.utc) - timedelta(days=order["created_at_offset_days"])

    return {
        "invoice_id": order["invoice_id"],
        "customer_name": order["customer_name"],
        "items": items,
        "subtotal": subtotal,
        "tax": tax,
        "grand_total": grand_total,
        "total_cost": total_cost,
        "total_profit": round(grand_total - total_cost, 2),
        "created_at": created_at,
        "payment_status": order["payment_status"],
        "source": "direct_mongodb_seed",
    }


def seed_demo_invoices():
    catalog = build_catalog()
    if not catalog:
        raise RuntimeError("No products found in MongoDB. Add products before seeding invoices.")

    inserted = 0
    updated = 0

    for order in DEMO_ORDERS:
        invoice = build_invoice(order, catalog)
        if not invoice:
            continue

        result = invoices_collection.update_one(
            {"invoice_id": invoice["invoice_id"]},
            {"$set": invoice},
            upsert=True,
        )

        if result.matched_count:
            updated += 1
        else:
            inserted += 1

    return {"inserted": inserted, "updated": updated, "total_invoices": invoices_collection.count_documents({})}


if __name__ == "__main__":
    result = seed_demo_invoices()
    print(result)

import joblib
import os
import pandas as pd
import math

MODEL_PATH = os.path.join(os.path.dirname(__file__), "pricing_model.pkl")
model = joblib.load(MODEL_PATH)

def estimate_demand(cost_price, market_price):
    margin_ratio = (market_price - cost_price) / market_price
    demand = 1 / (1 + math.exp(-6 * (margin_ratio - 0.25)))
    return round(demand, 3)

def recommend_price(cost_price, market_price):
    demand = estimate_demand(cost_price, market_price)

    X = pd.DataFrame([{
        "cost_price": cost_price,
        "market_price": market_price,
        "demand": demand
    }])

    predicted_price = float(model.predict(X)[0])
    return round(predicted_price, 2)

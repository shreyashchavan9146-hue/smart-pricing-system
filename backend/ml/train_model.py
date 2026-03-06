import pandas as pd
import joblib
import os
from sklearn.linear_model import ElasticNet
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline



BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "..", "..", "data", "training_data.csv")
)
MODEL_PATH = os.path.join(BASE_DIR, "pricing_model.pkl")


print("📥 Loading training data...")
data = pd.read_csv(DATA_PATH)

X = data[["cost_price", "market_price", "demand"]]
y = data["final_price"]


X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)


print("🧠 Training ElasticNet pricing model...")

model = Pipeline([
    ("scaler", StandardScaler()),
    ("regressor", ElasticNet(
        alpha=0.01,      
        l1_ratio=0.5,   
        random_state=42
    ))
])

model.fit(X_train, y_train)


preds = model.predict(X_test)
mae = mean_absolute_error(y_test, preds)

print(f"📊 MAE: {mae:.2f}")


joblib.dump(model, MODEL_PATH)
print("✅ ElasticNet pricing model saved successfully")

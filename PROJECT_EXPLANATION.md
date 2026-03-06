# Smart Pricing System - BTech Final Year Project
## Complete Project Documentation for Examiners

---

## 1. PROJECT OVERVIEW

### Project Title: Smart Pricing System - AI-Powered Dynamic Pricing Engine

**Problem Statement:**
Traditional pricing strategies rely on fixed markup percentages, ignoring market dynamics, competitor pricing, and demand fluctuations. This project implements an intelligent pricing system that uses machine learning to analyze market data and provide optimal pricing recommendations.

**Solution:**
A full-stack web application that:
- Scrapes competitor prices from the web
- Uses ML algorithms to predict optimal prices
- Provides AI-powered pricing recommendations
- Generates invoices with recommended prices
- Offers analytics and business insights
- Creates AI-generated social media ad copy

---

## 2. TECHNOLOGY STACK

### Frontend:
- **HTML5/CSS3** - Responsive UI with modern styling
- **Bootstrap 5.3** - Component library for responsive design
- **JavaScript (ES6+)** - Frontend logic
- **Chart.js** - Data visualization
- **Font Awesome** - Icons

### Backend:
- **Python** - Programming language
- **FastAPI** - Modern Python web framework (high performance)
- **Uvicorn** - ASGI server

### Database:
- **MongoDB** - NoSQL database for flexible data storage
- **PyMongo** - MongoDB driver for Python

### Machine Learning:
- **scikit-learn** - ML library
- **pandas** - Data manipulation
- **joblib** - Model serialization
- **Random Forest Regressor** - Pricing prediction model

### Additional Tools:
- **ReportLab** - PDF invoice generation
- **SerpAPI** - Web scraping for competitor prices

---

## 3. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Dashboard│ │ Billing │ │ Pricing │ │Analytics│ │ AI Ads │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│       │           │           │           │           │         │
│       └───────────┴─────┬─────┴───────────┴───────────┘         │
│                         │                                        │
│                    JS API Layer                                  │
└─────────────────────────┼────────────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────┼────────────────────────────────────────┐
│                         │          BACKEND (FastAPI)             │
│                    API Endpoints                                  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐   │
│  │ /admin/upload  │ │ /recommendations│ │ /billing/generate │   │
│  └────────┬───────┘ └────────┬────────┘ └─────────┬──────────┘   │
│           │                   │                    │              │
│  ┌────────┴──────────────────┴────────────────────┴──────────┐  │
│  │                    Business Logic Layer                    │ │  ┌────────────  │
│ ─┐  ┌─────────────┐  ┌───────────────┐    │  │
│  │  │ CSV Import  │  │ ML Pricing  │  │ Invoice Gen   │    │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘    │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                       │
│  ┌────────────────────────┴───────────────────────────────────┐  │
│  │                    ML Model Layer                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │         Random Forest Regressor + Demand Estimator │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        ┌─────┴─────┐              ┌──────┴──────┐
        │  MongoDB  │              │   SerpAPI   │
        │ Database  │              │  (External) │
        └───────────┘              └─────────────┘
```

---

## 4. DATABASE SCHEMA

### MongoDB Collections:

**products Collection:**
```
json
{
  "_id": ObjectId,
  "product_name": String,
  "category": String,
  "cost_price": Number,
  "current_price": Number,
  "created_at": DateTime,
  "updated_at": DateTime
}
```

**competitor_prices Collection:**
```
json
{
  "_id": ObjectId,
  "product_id": ObjectId,
  "market_avg_price": Number,
  "competitor_prices": Array,
  "recorded_at": DateTime
}
```

**recommendations Collection:**
```
json
{
  "_id": ObjectId,
  "product_id": ObjectId,
  "product_name": String,
  "cost_price": Number,
  "market_price": Number,
  "recommended_price": Number,
  "difference": Number,
  "updated_at": DateTime
}
```

**price_history Collection:**
```
json
{
  "_id": ObjectId,
  "product_id": ObjectId,
  "product_name": String,
  "market_price": Number,
  "recommended_price": Number,
  "recorded_at": DateTime
}
```

**invoices Collection:**
```
json
{
  "_id": ObjectId,
  "customer_name": String,
  "customer_phone": String,
  "items": Array,
  "total": Number,
  "created_at": DateTime
}
```

---

## 5. API ENDPOINTS

### Admin Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/upload-products` | Upload CSV file with products |
| POST | `/admin/run-scraper` | Start competitor price scraper |
| POST | `/admin/run-ml` | Generate ML pricing recommendations |

### Product Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Get all products |
| GET | `/billing/products` | Get products with AI prices |

### Pricing Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/recommendations` | Get AI pricing recommendations |
| GET | `/pricing/history/{product_id}` | Get price history for product |

### Billing Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/billing/generate` | Generate invoice PDF |

### Stats Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Get dashboard statistics |

---

## 6. FEATURES DESCRIPTION

### A. Dashboard
- **Stats Cards**: Display total products, AI recommendations count, and market prices
- **Quick Actions**: Buttons for invoice creation, pricing view, analytics, ads, scraper, ML model
- **CSV Upload**: Upload products from CSV file
- **AI Insights**: Dynamic insights generated from pricing data
- **System Status**: Shows MongoDB, ML Model, FastAPI, AI Engine status

### B. Billing & Invoicing
- **Product Selection**: Browse and search products with AI-recommended prices
- **Shopping Cart**: Add products, adjust quantities, remove items
- **Customer Details**: Enter customer name and phone
- **Invoice Generation**: Generate professional PDF invoices with ReportLab
- **Automatic Calculations**: Subtotal, tax (10%), and total calculation

### C. AI Pricing Recommendations
- **Product Table**: Shows cost price, market price, AI recommended price
- **Deal Percentage**: Color-coded deal badges (high/medium/low)
- **Search & Filter**: Search products, sort by name/deal/recommended price
- **Real-time Updates**: Reflects latest ML recommendations

### D. Sales Analytics
- **Revenue Analytics**: Total revenue, orders, growth rate, AI savings
- **Charts**: Revenue trend line chart, sales distribution pie chart
- **AI Insights**: Business insights generated from sales data

### E. AI Social Media Ads
- **Hot Deals**: Products with best deals for promotions
- **Ad Generation**: AI-generated ad copy for Facebook, Twitter, Instagram
- **Ad Templates**: Visual preview of ads
- **Copy to Clipboard**: Easy sharing functionality

---

## 7. MACHINE LEARNING MODEL

### Demand Estimation Function:
```
python
def estimate_demand(cost_price, market_price):
    margin_ratio = (market_price - cost_price) / market_price
    # Sigmoid function for demand curve
    demand = 1 / (1 + math.exp(-6 * (margin_ratio - 0.25)))
    return round(demand, 3)
```
- Uses sigmoid function to model demand curve
- Higher margins result in lower demand
- Optimal margin around 25%

### Price Recommendation Model:
- **Algorithm**: Random Forest Regressor
- **Features**: cost_price, market_price, demand
- **Training**: Pre-trained model stored in `pricing_model.pkl`
- **Output**: Optimal selling price

### Workflow:
1. Get product cost price from database
2. Get market average price from scraper
3. Calculate demand using sigmoid function
4. Feed features to Random Forest model
5. Get recommended price prediction

---

## 8. HOW TO RUN THE PROJECT

### Prerequisites:
1. Python 3.8+
2. MongoDB (installed locally or use MongoDB Atlas)
3. Node.js (optional, for development)

### Step 1: Install Dependencies
```
bash
cd backend
pip install -r requirements.txt
```

### Step 2: Start MongoDB
```
bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas connection string in db/mongo.py
```

### Step 3: Run the Backend Server
```
bash
cd backend
uvicorn main:app --reload
```
Server runs at: http://localhost:8000

### Step 4: Open the Frontend
```
bash
# Simply open the HTML file in browser
open frontend/index.html
# Or use a local server
cd frontend
python -m http.server 8000
```

### Step 5: Using the Application
1. Upload products via CSV (use `data/products.csv` as template)
2. Click "Run Scraper" to fetch competitor prices
3. Click "Generate Recommendations" to run ML model
4. View pricing recommendations in "AI Pricing" tab
5. Create invoices in "Billing" tab
6. Check analytics in "Analytics" tab
7. Generate social media ads in "AI Social Ads" tab

---

## 9. CSV FILE FORMAT

Required columns for product upload:
```
csv
product_name,cost_price,category
Samsung Galaxy M14 5G,9500,Mobile
HP 15 Ryzen 5 Laptop,42000,Laptop
Boat Rockerz 450 Headphones,1200,Accessories
```

---

## 10. POTENTIAL EXAM QUESTIONS & ANSWERS

### Q1: What is the main objective of this project?
**Answer:** The project aims to create an intelligent dynamic pricing system that uses machine learning to analyze market data and competitor prices to provide optimal pricing recommendations for products, ultimately helping businesses maximize profits while remaining competitive.

### Q2: Explain the technology stack used in this project.
**Answer:** 
- Frontend: HTML, CSS, Bootstrap 5, JavaScript, Chart.js
- Backend: Python with FastAPI framework
- Database: MongoDB for storing products, recommendations, invoices
- ML: scikit-learn (Random Forest Regressor), pandas
- Additional: ReportLab for PDF generation, SerpAPI for web scraping

### Q3: How does the ML model work for price prediction?
**Answer:** The model uses two components:
1. **Demand Estimator**: Uses a sigmoid function to estimate demand based on margin ratio (market_price - cost_price) / market_price
2. **Random Forest Regressor**: Takes cost_price, market_price, and demand as features and predicts optimal selling price

### Q4: What is the purpose of the web scraper?
**Answer:** The scraper (using SerpAPI) fetches real-time competitor prices from e-commerce websites. This market data is crucial for the ML model to make informed pricing recommendations that are competitive.

### Q5: How does the billing system work?
**Answer:**
1. Products with AI-recommended prices are displayed
2. User selects products and adds to cart
3. User enters customer details
4. On submission, a PDF invoice is generated using ReportLab
5. Invoice includes product details, quantities, prices, tax, and total

### Q6: What are the MongoDB collections used?
**Answer:**
- `products`: Stores product information (name, cost, category)
- `competitor_prices`: Stores scraped market prices
- `recommendations`: Stores ML-generated pricing recommendations
- `price_history`: Stores historical price data for analytics
- `invoices`: Stores generated invoice data

### Q7: Explain the data flow from CSV upload to pricing recommendation.
**Answer:**
1. User uploads CSV with products via `/admin/upload-products`
2. Products are stored/updated in MongoDB `products` collection
3. User clicks "Run Scraper" → competitor prices fetched → stored in `competitor_prices`
4. User clicks "Generate Recommendations" → for each product:
   - Get cost price from products collection
   - Get market price from competitor_prices collection
   - Calculate demand
   - Run ML model
   - Save recommendation to `recommendations` collection
5. Frontend displays recommendations

### Q8: What is dynamic pricing and how is it implemented here?
**Answer:** Dynamic pricing is adjusting prices based on market conditions, competitor prices, and demand. In this project:
- Competitor prices are scraped regularly
- ML model considers cost, market price, and demand
- Recommendations are generated to find optimal price point
- Prices can be updated as market conditions change

### Q9: How does the AI Social Ads feature work?
**Answer:**
1. System identifies products with high deal percentages (good prices)
2. For each deal product, AI generates engaging ad copy
3. Ad copy highlights the deal, savings, and includes hashtags
4. Templates show Facebook/Instagram and Twitter previews
5. Users can copy ad text to clipboard for posting

### Q10: What are the advantages of using FastAPI?
**Answer:**
- **Fast**: High performance, comparable to Node.js and Go
- **Easy**: Intuitive, easy to learn and code
- **Short**: Minimizes code duplication
- **Robust**: Automatic interactive documentation
- **Standards**: Based on OpenAPI (formerly Swagger)

### Q11: How is the frontend connected to the backend?
**Answer:** The frontend uses JavaScript fetch API to make HTTP requests to FastAPI endpoints. The API returns JSON data which is processed and displayed dynamically using DOM manipulation. No page reloads are required.

### Q12: What is the purpose of CORS middleware?
**Answer:** CORS (Cross-Origin Resource Sharing) middleware allows the frontend (running on a different origin/port) to make requests to the backend API. In our code:
```
python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)
```

### Q13: Explain the demand estimation formula.
**Answer:** The formula uses a sigmoid function:
```
demand = 1 / (1 + e^(-6 * (margin_ratio - 0.25)))
```
- When margin_ratio = 0.25 (25%), demand = 0.5 (moderate)
- Higher margins → lower demand (diminishing returns)
- Lower margins → higher demand
- The 0.25 threshold represents typical profit margin

### Q14: What improvements could be made to this project?
**Answer:**
- Add user authentication and authorization
- Implement real-time price updates using WebSockets
- Add more ML models and compare performance
- Implement demand forecasting
- Add product image support
- Implement email notification for invoices
- Add multi-currency support
- Implement rate limiting for API

### Q15: How do you handle errors in the application?
**Answer:**
- Backend: Try-except blocks in API endpoints, proper HTTP error codes
- Frontend: Error handling in async/await calls, user-friendly error messages via toast notifications
- Database: Connection error handling in mongo.py

---

## 11. PROJECT FILE STRUCTURE

```
Smart_Pricing_System/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt       # Python dependencies
│   ├── api/
│   │   ├── admin.py          # Admin endpoints (upload, scraper, ML)
│   │   ├── billing.py        # Invoice generation
│   │   ├── pricing.py        # Pricing endpoints
│   │   └── stats.py          # Dashboard statistics
│   ├── db/
│   │   └── mongo.py          # MongoDB connection
│   ├── ml/
│   │   ├── pricing_model.py  # ML model & demand estimation
│   │   ├── train_model.py   # Model training script
│   │   └── pricing_model.pkl # Trained model file
│   ├── scripts/
│   │   ├── serpapi_scraper.py # Web scraper
│   │   └── import_products_from_csv.py
│   └── invoices/             # Generated PDF invoices
├── frontend/
│   ├── index.html           # Main HTML file
│   ├── css/
│   │   └── styles.css       # Custom styles
│   └── js/
│       ├── api.js           # API service layer
│       ├── app.js           # Main application
│       ├── dashboard.js     # Dashboard module
│       ├── billing.js       # Billing module
│       ├── pricing.js       # Pricing module
│       ├── analytics.js     # Analytics module
│       └── ads.js           # AI Ads module
├── data/
│   ├── products.csv         # Sample products
│   └── training_data.csv    # ML training data
├── frontend_old/            # Legacy frontend (unused)
├── PROJECT_EXPLANATION.md   # This file
└── README.md               # Project readme
```

---

## 12. SAMPLE CSV FORMAT

For uploading products, create a CSV file with this format:

```
csv
product_name,cost_price,category
Samsung Galaxy M14 5G,9500,Mobile
Redmi 12 5G,9200,Mobile
HP 15 Ryzen 5 Laptop,42000,Laptop
Boat Rockerz 450 Headphones,1200,Accessories
```

---

## 13. CONCLUSION

This Smart Pricing System is a comprehensive BTech final year project that demonstrates:
- Full-stack web development skills
- Integration of machine learning in web applications
- Database design with MongoDB
- API development with FastAPI
- Modern frontend with JavaScript
- PDF generation
- Web scraping capabilities

The project is production-ready and can be extended with additional features as needed.

---

**Project Created By:** BTech Student  
**Guide:** [Guide Name]  
**Year:** 2024-2025  
**Institution:** [Institution Name]

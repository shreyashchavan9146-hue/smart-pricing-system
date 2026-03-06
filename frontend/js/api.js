/**
 * API Service Layer for Smart Pricing System
 * Handles all communication with the backend FastAPI server
 */

const API_BASE_URL = 'http://localhost:8000';

// API Endpoints
const API = {
    // Dashboard Stats
    getStats: () => `${API_BASE_URL}/stats`,
    
    // Products
    getProducts: () => `${API_BASE_URL}/products`,
    
    // Billing
    getBillingProducts: () => `${API_BASE_URL}/billing/products`,
    generateInvoice: () => `${API_BASE_URL}/billing/generate`,
    
    // Pricing
    getRecommendations: () => `${API_BASE_URL}/recommendations`,
    getPriceHistory: (productId) => `${API_BASE_URL}/pricing/history/${productId}`,
    
    // Admin
    uploadProducts: () => `${API_BASE_URL}/admin/upload-products`,
    runScraper: () => `${API_BASE_URL}/admin/run-scraper`,
    runML: () => `${API_BASE_URL}/admin/run-ml`
};

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Dashboard API functions
 */
const DashboardAPI = {
    /**
     * Get dashboard statistics
     * @returns {Promise<Object>} Stats object with total_products, market_prices, recommendations_ready
     */
    async getStats() {
        return await fetchAPI(API.getStats());
    },
    
    /**
     * Get AI-generated pricing recommendations
     * @returns {Promise<Array>} Array of product recommendations
     */
    async getRecommendations() {
        return await fetchAPI(API.getRecommendations());
    }
};

/**
 * Billing API functions
 */
const BillingAPI = {
    /**
     * Get products for billing with AI-recommended prices
     * @returns {Promise<Array>} Array of products with pricing info
     */
    async getBillingProducts() {
        return await fetchAPI(API.getBillingProducts());
    },
    
    /**
     * Generate invoice PDF
     * @param {Object} invoiceData - Invoice data containing customer info and items
     * @returns {Promise<Blob>} PDF blob
     */
    async generateInvoice(invoiceData) {
        try {
            const response = await fetch(API.generateInvoice(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invoiceData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate invoice');
            }
            
            return await response.blob();
        } catch (error) {
            console.error('Invoice generation error:', error);
            throw error;
        }
    }
};

/**
 * Pricing API functions
 */
const PricingAPI = {
    /**
     * Get AI pricing recommendations
     * @returns {Promise<Array>} Array of pricing recommendations
     */
    async getRecommendations() {
        return await fetchAPI(API.getRecommendations());
    },
    
    /**
     * Get price history for a specific product
     * @param {string} productId - Product ID
     * @returns {Promise<Array>} Array of price history records
     */
    async getPriceHistory(productId) {
        return await fetchAPI(API.getPriceHistory(productId));
    }
};

/**
 * Products API functions
 */
const ProductsAPI = {
    /**
     * Get all products
     * @returns {Promise<Array>} Array of products
     */
    async getAll() {
        return await fetchAPI(API.getProducts());
    }
};

/**
 * Admin API functions
 */
const AdminAPI = {
    /**
     * Run the market scraper to fetch competitor prices
     * @returns {Promise<Object>} Status message
     */
    async runScraper() {
        try {
            const response = await fetch(API.runScraper(), {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Scraper error:', error);
            throw error;
        }
    },
    
    /**
     * Generate AI pricing recommendations using ML model
     * @returns {Promise<Object>} Status message
     */
    async runML() {
        try {
            const response = await fetch(API.runML(), {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('ML error:', error);
            throw error;
        }
    },
    
    /**
     * Upload products CSV
     * @param {File} file - CSV file
     * @returns {Promise<Object>} Upload result
     */
    async uploadProducts(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(API.uploadProducts(), {
                method: 'POST',
                body: formData
            });
            
            return await response.json();
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
};

/**
 * Utility function to download blob as file
 * @param {Blob} blob - File blob
 * @param {string} filename - Download filename
 */
function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

/**
 * Format currency in Indian Rupees
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Format date to readable format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Calculate percentage difference
 * @param {number} original - Original value
 * @param {number} current - Current value
 * @returns {number} Percentage difference
 */
function calculatePercentage(original, current) {
    if (original === 0) return 0;
    return ((current - original) / original) * 100;
}

// Export all API modules
window.API = API;
window.DashboardAPI = DashboardAPI;
window.BillingAPI = BillingAPI;
window.PricingAPI = PricingAPI;
window.ProductsAPI = ProductsAPI;
window.AdminAPI = AdminAPI;
window.fetchAPI = fetchAPI;
window.downloadBlob = downloadBlob;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.calculatePercentage = calculatePercentage;

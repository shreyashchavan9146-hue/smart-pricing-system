/**
 * Analytics Module for Smart Pricing System
 * Handles sales analytics and AI insights display
 */

// Chart instances
let revenueChart = null;
let salesChart = null;

/**
 * Load analytics data
 */
async function loadAnalyticsData() {
    console.log('Loading analytics data...');
    
    try {
        // Load stats and recommendations
        const stats = await DashboardAPI.getStats();
        const recommendations = await DashboardAPI.getRecommendations();
        
        // Update analytics cards
        updateAnalyticsCards(stats, recommendations);
        
        // Initialize charts
        initializeCharts(recommendations);
        
        // Load AI insights
        await loadAnalyticsAIInsights(recommendations);
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
        showToast('Failed to load analytics data', 'error');
    }
}

/**
 * Update analytics cards
 * @param {Object} stats - Stats object
 * @param {Array} recommendations - Recommendations array
 */
function updateAnalyticsCards(stats, recommendations) {
    // Revenue (simulated based on products)
    const revenue = document.getElementById('analyticsRevenue');
    if (revenue) {
        const totalRevenue = (stats.total_products || 0) * 15000; // Simulated
        revenue.textContent = formatCurrency(totalRevenue);
    }
    
    // Orders (simulated)
    const orders = document.getElementById('analyticsOrders');
    if (orders) {
        orders.textContent = (stats.recommendations_ready || 0) * 3; // Simulated
    }
    
    // Growth
    const growth = document.getElementById('analyticsGrowth');
    if (growth) {
        growth.textContent = '+12.5%';
    }
    
    // AI Savings
    const savings = document.getElementById('analyticsSavings');
    if (savings) {
        let totalSavings = 0;
        recommendations.forEach(rec => {
            if (rec.market_price && rec.recommended_price) {
                totalSavings += (rec.market_price - rec.recommended_price) * 10; // Simulated
            }
        });
        savings.textContent = formatCurrency(totalSavings);
    }
}

/**
 * Initialize charts
 * @param {Array} recommendations - Recommendations array
 */
function initializeCharts(recommendations) {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        if (revenueChart) revenueChart.destroy();
        
        // Generate mock data based on recommendations
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const revenueData = months.map(() => Math.floor(Math.random() * 50000) + 10000);
        
        revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Revenue',
                    data: revenueData,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Sales Distribution Chart
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        if (salesChart) salesChart.destroy();
        
        // Categorize products by deal percentage
        let highDeals = 0, mediumDeals = 0, lowDeals = 0;
        
        recommendations.forEach(rec => {
            const deal = calculateDealPercent(rec);
            if (deal >= 20) highDeals++;
            else if (deal >= 10) mediumDeals++;
            else lowDeals++;
        });
        
        salesChart = new Chart(salesCtx, {
            type: 'doughnut',
            data: {
                labels: ['High Deals (>20%)', 'Medium Deals (10-20%)', 'Low Deals (<10%)'],
                datasets: [{
                    data: [highDeals || 1, mediumDeals || 1, lowDeals || 1],
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

/**
 * Calculate deal percentage for a product
 * @param {Object} product - Product object
 * @returns {number} Deal percentage
 */
function calculateDealPercent(product) {
    const marketPrice = product.market_price || product.market_avg_price || 0;
    const recommendedPrice = product.recommended_price || 0;
    
    if (marketPrice === 0) return 0;
    
    return ((marketPrice - recommendedPrice) / marketPrice) * 100;
}

/**
 * Load AI insights for analytics page
 * @param {Array} recommendations - Recommendations array
 */
async function loadAnalyticsAIInsights(recommendations) {
    const insightsList = document.getElementById('aiInsightsList');
    if (!insightsList) return;
    
    if (!recommendations || recommendations.length === 0) {
        insightsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lightbulb"></i>
                <h5>No AI Insights</h5>
                <p>Run the ML model to generate insights</p>
            </div>
        `;
        return;
    }
    
    // Generate insights
    const insights = generateAnalyticsInsights(recommendations);
    
    insightsList.innerHTML = insights.map((insight, index) => `
        <div class="ai-insight-card ${insight.type}">
            <div class="d-flex align-items-center gap-3">
                <div class="insight-icon" style="background: ${insight.color}">
                    <i class="fas ${insight.icon}"></i>
                </div>
                <div>
                    <h6>${insight.title}</h6>
                    <p class="mb-0">${insight.description}</p>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Generate analytics insights
 * @param {Array} recommendations - Recommendations array
 * @returns {Array} Array of insight objects
 */
function generateAnalyticsInsights(recommendations) {
    const insights = [];
    
    // Calculate statistics
    let totalMarketValue = 0;
    let totalRecommendedValue = 0;
    let highValueProducts = [];
    
    recommendations.forEach(rec => {
        const marketPrice = rec.market_price || rec.market_avg_price || 0;
        const recPrice = rec.recommended_price || 0;
        
        totalMarketValue += marketPrice;
        totalRecommendedValue += recPrice;
        
        if (marketPrice > 0) {
            highValueProducts.push({
                name: rec.product_name,
                savings: marketPrice - recPrice
            });
        }
    });
    
    const totalSavings = totalMarketValue - totalRecommendedValue;
    const savingsPercent = totalMarketValue > 0 ? (totalSavings / totalMarketValue) * 100 : 0;
    
    // Insight 1: Total potential savings
    insights.push({
        icon: 'fa-piggy-bank',
        color: 'linear-gradient(135deg, #10b981, #34d399)',
        type: 'success',
        title: 'Customer Savings Potential',
        description: `Your AI pricing could save customers up to ${formatCurrency(totalSavings)} (${savingsPercent.toFixed(1)}% average discount)`
    });
    
    // Insight 2: Best selling opportunity
    highValueProducts.sort((a, b) => b.savings - a.savings);
    if (highValueProducts.length > 0) {
        const topProduct = highValueProducts[0];
        insights.push({
            icon: 'fa-star',
            color: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            type: 'warning',
            title: 'Top Savings Product',
            description: `"${topProduct.name}" offers the highest customer savings of ${formatCurrency(topProduct.savings)}`
        });
    }
    
    // Insight 3: Pricing strategy
    if (savingsPercent > 15) {
        insights.push({
            icon: 'fa-chart-line',
            color: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            type: 'info',
            title: 'Competitive Pricing Strategy',
            description: 'Your AI prices are significantly below market - great for attracting customers!'
        });
    } else if (savingsPercent < 5) {
        insights.push({
            icon: 'fa-exclamation-triangle',
            color: 'linear-gradient(135deg, #ef4444, #f87171)',
            type: 'warning',
            title: 'Pricing Optimization Needed',
            description: 'Consider reducing prices to stay more competitive in the market'
        });
    } else {
        insights.push({
            icon: 'fa-balance-scale',
            color: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            type: 'info',
            title: 'Balanced Pricing Strategy',
            description: 'Your prices are well-balanced between profit and competitiveness'
        });
    }
    
    // Insight 4: Product performance
    insights.push({
        icon: 'fa-boxes',
        color: 'linear-gradient(135deg, #ec4899, #f472b6)',
        type: 'info',
        title: 'Product Portfolio',
        description: `${recommendations.length} products analyzed with AI-powered pricing recommendations`
    });
    
    return insights;
}

// Export functions
window.loadAnalyticsData = loadAnalyticsData;

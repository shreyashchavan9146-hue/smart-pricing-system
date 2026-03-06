/**
 * Dashboard Module for Smart Pricing System
 * Handles dashboard data loading and display
 */

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    try {
        // Fetch stats from API
        const stats = await DashboardAPI.getStats();
        
        // Update stat cards
        updateStatCards(stats);
        
        // Load Smart insights
        await loadSmartInsights();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

/**
 * Update stat cards with data
 * @param {Object} stats - Stats object
 */
function updateStatCards(stats) {
    // Total Products
    const statProducts = document.getElementById('statProducts');
    if (statProducts) {
        statProducts.textContent = stats.total_products || 0;
    }
    
    // Smart Recommendations
    const statRecommendations = document.getElementById('statRecommendations');
    if (statRecommendations) {
        statRecommendations.textContent = stats.recommendations_ready || 0;
    }
    
    // Market Prices
    const statMarketPrices = document.getElementById('statMarketPrices');
    if (statMarketPrices) {
        statMarketPrices.textContent = stats.market_prices || 0;
    }
}

/**
 * Load Smart insights from recommendations
 */
async function loadSmartInsights() {
    const insightsContainer = document.getElementById('smartInsights');
    if (!insightsContainer) return;
    
    try {
        const recommendations = await DashboardAPI.getRecommendations();
        
        if (!recommendations || recommendations.length === 0) {
            insightsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-robot"></i>
                    <h5>No Smart Insights Available</h5>
                    <p>Run the ML model to generate pricing recommendations</p>
                </div>
            `;
            return;
        }
        
        // Generate Smart insights
        const insights = generateInsights(recommendations);
        
        // Render insights
        insightsContainer.innerHTML = insights.map((insight, index) => `
            <div class="insight-item" style="animation-delay: ${index * 0.1}s">
                <div class="insight-icon" style="background: ${insight.color}">
                    <i class="fas ${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <h6>${insight.title}</h6>
                    <p>${insight.description}</p>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading Smart insights:', error);
        insightsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Error Loading Insights</h5>
                <p>Could not load Smart insights. Please try again.</p>
            </div>
        `;
    }
}

/**
 * Generate Smart insights from recommendations
 * @param {Array} recommendations - Array of product recommendations
 * @returns {Array} Array of insight objects
 */
function generateInsights(recommendations) {
    const insights = [];
    
    // Calculate average deal percentage
    let totalDeal = 0;
    let highDeals = 0;
    let lowDeals = 0;
    
    recommendations.forEach(rec => {
        if (rec.recommended_price && rec.market_price) {
            const deal = ((rec.market_price - rec.recommended_price) / rec.market_price) * 100;
            totalDeal += deal;
            if (deal >= 20) highDeals++;
            if (deal < 5) lowDeals++;
        }
    });
    
    const avgDeal = totalDeal / recommendations.length;
    
    // Insight 1: Average deal percentage
    insights.push({
        icon: 'fa-percentage',
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        title: 'Average Deal: ' + avgDeal.toFixed(1) + '%',
        description: `Products are priced ${avgDeal.toFixed(1)}% below market average - great for competitiveness!`
    });
    
    // Insight 2: High deals count
    if (highDeals > 0) {
        insights.push({
            icon: 'fa-fire',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            title: `${highDeals} Hot Deals Found`,
            description: `${highDeals} products have deals above 20% - perfect for promotions!`
        });
    }
    
    // Insight 3: Pricing opportunity
    if (lowDeals > 0) {
        insights.push({
            icon: 'fa-chart-line',
            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            title: 'Pricing Optimization Opportunity',
            description: `${lowDeals} products have less than 5% deal margin - consider adjusting prices`
        });
    }
    
    // Insight 4: Best category
    const bestDeals = recommendations
        .filter(r => r.recommended_price && r.market_price)
        .sort((a, b) => {
            const dealA = ((a.market_price - a.recommended_price) / a.market_price) * 100;
            const dealB = ((b.market_price - b.recommended_price) / b.market_price) * 100;
            return dealB - dealA;
        })
        .slice(0, 3);
    
    if (bestDeals.length > 0) {
        insights.push({
            icon: 'fa-star',
            color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            title: 'Top Recommended Products',
            description: bestDeals.map(d => d.product_name).join(', ')
        });
    }
    
    // Insight 5: AI Recommendation Summary
    insights.push({
        icon: 'fa-robot',
        color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        title: 'Smart Model Status: Active',
        description: `${recommendations.length} products analyzed with ML-powered pricing recommendations`
    });
    
    return insights;
}

// Export functions
window.loadDashboardData = loadDashboardData;

/**
 * Run the market scraper to fetch competitor prices
 */
async function runScraper() {
    const scraperBtn = document.getElementById('runScraperBtn');
    if (!scraperBtn) return;
    
    // Show loading state
    const originalContent = scraperBtn.innerHTML;
    scraperBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Scraping...</span>';
    scraperBtn.disabled = true;
    
    try {
        const result = await AdminAPI.runScraper();
        showToast('Scraper started successfully! Market prices will be updated shortly.', 'success');
        
        // Reload dashboard data after a short delay to see updated stats
        setTimeout(() => {
            loadDashboardData();
        }, 2000);
        
    } catch (error) {
        console.error('Error running scraper:', error);
        showToast('Failed to run scraper. Please check if the backend is running.', 'error');
    } finally {
        // Reset button state
        scraperBtn.innerHTML = originalContent;
        scraperBtn.disabled = false;
    }
}

/**
 * Generate AI pricing recommendations using ML model
 */
async function generateRecommendations() {
    const recsBtn = document.getElementById('generateRecsBtn');
    if (!recsBtn) return;
    
    // Show loading state
    const originalContent = recsBtn.innerHTML;
    recsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Generating...</span>';
    recsBtn.disabled = true;
    
    try {
        const result = await AdminAPI.runML();
        showToast('Smart recommendations generated successfully!', 'success');
        
        // Reload dashboard data to see updated recommendations
        setTimeout(() => {
            loadDashboardData();
        }, 1000);
        
    } catch (error) {
        console.error('Error generating recommendations:', error);
        showToast('Failed to generate recommendations. Please check if the backend is running.', 'error');
    } finally {
        // Reset button state
        recsBtn.innerHTML = originalContent;
        recsBtn.disabled = false;
    }
}

// Export new functions
window.runScraper = runScraper;
window.generateRecommendations = generateRecommendations;

/**
 * Handle CSV file upload for products
 * @param {HTMLInputElement} input - File input element
 */
async function handleCsvUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
        showToast('Please select a CSV file', 'error');
        return;
    }
    
    const uploadBtn = document.getElementById('uploadCsvBtn');
    if (!uploadBtn) return;
    
    // Show loading state
    const originalContent = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Uploading...</span>';
    uploadBtn.disabled = true;
    
    try {
        const result = await AdminAPI.uploadProducts(file);
        
        if (result.inserted > 0 || result.updated > 0) {
            showToast(`Successfully uploaded ${result.inserted} new products and updated ${result.updated} existing products!`, 'success');
            // Reload dashboard data to reflect changes
            setTimeout(() => {
                loadDashboardData();
            }, 1000);
        } else {
            showToast('No products were uploaded. Please check the CSV format.', 'warning');
        }
        
    } catch (error) {
        console.error('Error uploading CSV:', error);
        showToast('Failed to upload CSV file. Please check if the backend is running.', 'error');
    } finally {
        // Reset button state
        uploadBtn.innerHTML = originalContent;
        uploadBtn.disabled = false;
        // Clear file input
        input.value = '';
    }
}

// Export the new function
window.handleCsvUpload = handleCsvUpload;

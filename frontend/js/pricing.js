/**
 * Pricing Module for Smart Pricing System
 * Handles AI pricing recommendations display
 */

/**
 * Load pricing data
 */
async function loadPricingData() {
    console.log('Loading pricing data...');
    
    const tableBody = document.getElementById('pricingTableBody');
    if (!tableBody) return;
    
    try {
        showLoading('pricingTableBody');
        
        const recommendations = await PricingAPI.getRecommendations();
        
        if (!recommendations || recommendations.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <i class="fas fa-tags"></i>
                            <h5>No Pricing Recommendations</h5>
                            <p>Run the ML model to generate pricing recommendations</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Store for filtering/sorting
        window.pricingProducts = recommendations;
        
        // Render pricing table
        renderPricingTable(recommendations);
        
    } catch (error) {
        console.error('Error loading pricing data:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h5>Error Loading Data</h5>
                        <p>Failed to load pricing recommendations</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * Render pricing table
 * @param {Array} products - Array of product recommendations
 */
function renderPricingTable(products) {
    const tableBody = document.getElementById('pricingTableBody');
    if (!tableBody) return;
    
    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h5>No Products Found</h5>
                        <p>No products match your search criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = products.map(product => {
        const dealPercent = calculateDealPercentage(product);
        const dealClass = getDealClass(dealPercent);
        
        return `
            <tr>
                <td>
                    <strong>${product.product_name || 'Unknown'}</strong>
                </td>
                <td>${formatCurrency(product.cost_price || 0)}</td>
                <td>${formatCurrency(product.market_price || product.market_avg_price || 0)}</td>
                <td>
                    <span class="text-success fw-bold">${formatCurrency(product.recommended_price || 0)}</span>
                </td>
                <td>
                    <span class="deal-badge ${dealClass}">${dealPercent.toFixed(1)}%</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="addToBilling('${product.product_id}')">
                        <i class="fas fa-cart-plus"></i> Add to Bill
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Calculate deal percentage
 * @param {Object} product - Product object
 * @returns {number} Deal percentage
 */
function calculateDealPercentage(product) {
    const marketPrice = product.market_price || product.market_avg_price || 0;
    const recommendedPrice = product.recommended_price || 0;
    
    if (marketPrice === 0) return 0;
    
    return ((marketPrice - recommendedPrice) / marketPrice) * 100;
}

/**
 * Get deal class based on percentage
 * @param {number} percent - Deal percentage
 * @returns {string} Deal class
 */
function getDealClass(percent) {
    if (percent >= 20) return 'high';
    if (percent >= 10) return 'medium';
    return 'low';
}

/**
 * Filter pricing products by search term
 * @param {string} searchTerm - Search term
 */
function filterPricingProducts(searchTerm) {
    if (!window.pricingProducts) return;
    
    const term = searchTerm.toLowerCase();
    const filtered = window.pricingProducts.filter(product => 
        (product.product_name || '').toLowerCase().includes(term)
    );
    
    renderPricingTable(filtered);
}

/**
 * Sort pricing products
 * @param {string} sortBy - Sort criteria
 */
function sortPricingProducts(sortBy) {
    if (!window.pricingProducts) return;
    
    let sorted = [...window.pricingProducts];
    
    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
            break;
        case 'difference':
            sorted.sort((a, b) => calculateDealPercentage(b) - calculateDealPercentage(a));
            break;
        case 'recommended':
            sorted.sort((a, b) => (b.recommended_price || 0) - (a.recommended_price || 0));
            break;
    }
    
    renderPricingTable(sorted);
}

/**
 * Add product to billing cart
 * @param {string} productId - Product ID
 */
function addToBilling(productId) {
    const product = window.pricingProducts?.find(p => p.product_id === productId);
    if (!product) return;
    
    // Check if already in cart
    let cartItem = AppState.cart.find(item => item.product_id === productId);
    
    if (cartItem) {
        cartItem.qty += 1;
        showToast('Quantity updated in cart', 'info');
    } else {
        AppState.cart.push({
            product_id: product.product_id,
            product_name: product.product_name,
            price: product.recommended_price || product.cost_price || 0,
            qty: 1
        });
        showToast('Product added to cart', 'success');
    }
    
    // Navigate to billing page
    navigateTo('billing');
}

// Export functions
window.loadPricingData = loadPricingData;
window.filterPricingProducts = filterPricingProducts;
window.sortPricingProducts = sortPricingProducts;
window.addToBilling = addToBilling;

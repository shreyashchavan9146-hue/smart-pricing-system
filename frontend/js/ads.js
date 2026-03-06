/**
 * AI Social Media Ads Module for Smart Pricing System
 * Generates AI-powered social media ads for products with great deals
 */

// Store generated ads
window.generatedAds = [];

/**
 * Load ads data (products with best deals)
 */
async function loadAdsData() {
    console.log('Loading ads data...');
    
    const tableBody = document.getElementById('dealsTableBody');
    if (!tableBody) return;
    
    try {
        showLoading('dealsTableBody');
        
        const recommendations = await PricingAPI.getRecommendations();
        
        if (!recommendations || recommendations.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <i class="fas fa-fire"></i>
                            <h5>No Products Available</h5>
                            <p>Add products and run the ML model to generate deals</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Calculate deal percentages and sort by best deals
        const productsWithDeals = recommendations
            .map(product => ({
                ...product,
                dealPercent: calculateAdDealPercent(product)
            }))
            .filter(product => product.dealPercent > 0)
            .sort((a, b) => b.dealPercent - a.dealPercent);
        
        // Store for generating ads
        window.dealProducts = productsWithDeals;
        
        // Render deals table
        renderDealsTable(productsWithDeals);
        
    } catch (error) {
        console.error('Error loading ads data:', error);
        showEmptyState('dealsTableBody', 'Failed to load products', 'fa-exclamation-triangle');
    }
}

/**
 * Calculate deal percentage for ads
 * @param {Object} product - Product object
 * @returns {number} Deal percentage
 */
function calculateAdDealPercent(product) {
    const marketPrice = product.market_price || product.market_avg_price || 0;
    const recommendedPrice = product.recommended_price || 0;
    
    if (marketPrice === 0) return 0;
    
    return ((marketPrice - recommendedPrice) / marketPrice) * 100;
}

/**
 * Render deals table
 * @param {Array} products - Array of products with deals
 */
function renderDealsTable(products) {
    const tableBody = document.getElementById('dealsTableBody');
    if (!tableBody) return;
    
    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <h5>No Deals Found</h5>
                        <p>All products are priced at market rate</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = products.map(product => {
        const dealClass = getAdDealClass(product.dealPercent);
        
        return `
            <tr>
                <td><strong>${product.product_name || 'Unknown'}</strong></td>
                <td>${formatCurrency(product.cost_price || 0)}</td>
                <td>${formatCurrency(product.market_price || product.market_avg_price || 0)}</td>
                <td><span class="text-success fw-bold">${formatCurrency(product.recommended_price || 0)}</span></td>
                <td><span class="deal-badge ${dealClass}">${product.dealPercent.toFixed(1)}% OFF</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="generateAdForProduct('${product.product_id}')">
                        <i class="fas fa-magic"></i> Generate Ad
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Get deal class for ads
 * @param {number} percent - Deal percentage
 * @returns {string} Deal class
 */
function getAdDealClass(percent) {
    if (percent >= 20) return 'high';
    if (percent >= 10) return 'medium';
    return 'low';
}

/**
 * Generate ad for a specific product
 * @param {string} productId - Product ID
 */
function generateAdForProduct(productId) {
    const product = window.dealProducts?.find(p => p.product_id === productId);
    if (!product) return;
    
    // Generate AI ad content
    const ad = generateAIAd(product);
    
    // Add to generated ads
    window.generatedAds.push(ad);
    
    // Show ads section
    document.getElementById('generatedAdsSection').style.display = 'block';
    
    // Render ads
    renderGeneratedAds();
    
    showToast('Ad generated successfully!', 'success');
}

/**
 * Generate AI ad content for a product
 * @param {Object} product - Product object
 * @returns {Object} Generated ad object
 */
function generateAIAd(product) {
    const dealPercent = product.dealPercent;
    const savings = (product.market_price || product.market_avg_price || 0) - (product.recommended_price || 0);
    
    // Generate AI-powered ad copy based on deal percentage
    let headline, body, hashtags;
    
    if (dealPercent >= 25) {
        // Hot deal
        headline = `🔥 HOT DEAL: ${product.product_name} - ${dealPercent.toFixed(0)}% OFF!`;
        body = `Don't miss out! Get ${product.product_name} at an amazing price. 

AI-Powered Pricing Alert: This deal is calculated to give you the best value in the market!

💰 Special Price: ${formatCurrency(product.recommended_price)}
💵 You Save: ${formatCurrency(savings)}

Hurry! Limited stock available at these prices. Shop now and save big!

#HotDeal #${product.product_name.replace(/\s+/g, '')} #Sale #Discount #SmartShopping #LimitedTimeOffer #GrabNow #BestPrice #AI #SmartPricing`;
        
        hashtags = '#HotDeal #Sale #Discount #LimitedTimeOffer #BestPrice';
    } else if (dealPercent >= 15) {
        // Great deal
        headline = `⭐ Great Deal: ${product.product_name} - ${dealPercent.toFixed(0)}% OFF!`;
        body = `Amazing offer on ${product.product_name}! 

Our AI pricing system found this great deal for you:
- Original Price: ${formatCurrency(product.market_price || product.market_avg_price)}
- Your Price: ${formatCurrency(product.recommended_price)}
- You Save: ${formatCurrency(savings)}

Smart shopping made easy! Trust AI to find you the best prices.

#GreatDeal #Sale #${product.product_name.replace(/\s+/g, '')} #SmartShopping #Discount #AI #SavingMoney #ShopNow #BestValue`;
        
        hashtags = '#GreatDeal #Sale #SmartShopping #Discount';
    } else {
        // Good deal
        headline = `✨ Special Offer: ${product.product_name}`;
        body = `Check out this special pricing on ${product.product_name}!

AI-Powered Deal: Our smart pricing system recommends this price to give you the best market value.

Current Price: ${formatCurrency(product.recommended_price)}

Shop smart with AI-powered pricing!

#SpecialOffer #${product.product_name.replace(/\s+/g, '')} #Deal #AI #SmartPricing #ShopNow`;
        
        hashtags = '#SpecialOffer #Deal #SmartPricing';
    }
    
    return {
        id: Date.now(),
        product: product,
        platform: 'multi',
        headline: headline,
        body: body,
        hashtags: hashtags,
        timestamp: new Date()
    };
}

/**
 * Generate all ads for products with best deals
 */
function generateAllAds() {
    if (!window.dealProducts || window.dealProducts.length === 0) {
        showToast('No products available to generate ads', 'warning');
        return;
    }
    
    // Generate ads for top 5 products with best deals
    const topDeals = window.dealProducts.slice(0, 5);
    
    topDeals.forEach(product => {
        const ad = generateAIAd(product);
        window.generatedAds.push(ad);
    });
    
    // Show ads section
    document.getElementById('generatedAdsSection').style.display = 'block';
    
    // Render ads
    renderGeneratedAds();
    
    showToast(`Generated ${topDeals.length} ads!`, 'success');
}

/**
 * Render generated ads
 */
function renderGeneratedAds() {
    const container = document.getElementById('adsContainer');
    if (!container) return;
    
    if (window.generatedAds.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-ad"></i>
                    <h5>No Ads Generated</h5>
                    <p>Click "Generate Ad" on products to create ads</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = window.generatedAds.map((ad, index) => `
        <div class="col-md-6">
            <div class="generated-ad fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="generated-ad-header">
                    <span class="generated-ad-product">${ad.product.product_name}</span>
                    <div class="generated-ad-platform">
                        <span class="platform-badge facebook"><i class="fab fa-facebook"></i> Facebook</span>
                        <span class="platform-badge twitter"><i class="fab fa-twitter"></i> Twitter</span>
                        <span class="platform-badge instagram"><i class="fab fa-instagram"></i> Instagram</span>
                    </div>
                </div>
                <div class="generated-ad-content">
                    <p><strong>${ad.headline}</strong></p>
                    <p>${ad.body}</p>
                    <small class="text-muted">${ad.hashtags}</small>
                </div>
                <div class="generated-ad-actions">
                    <button class="btn btn-outline-primary btn-sm" onclick="copyAdToClipboard(${ad.id})">
                        <i class="fas fa-copy"></i> Copy Text
                    </button>
                    <button class="btn btn-outline-success btn-sm" onclick="shareAd(${ad.id})">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Update preview templates with latest ad
    if (window.generatedAds.length > 0) {
        const latestAd = window.generatedAds[window.generatedAds.length - 1];
        updateAdPreviews(latestAd);
    }
}

/**
 * Update ad preview templates
 * @param {Object} ad - Ad object
 */
function updateAdPreviews(ad) {
    // Facebook/Instagram preview
    const fbContent = document.getElementById('fbAdContent');
    if (fbContent) {
        fbContent.innerHTML = `
            <h6>${ad.product.product_name}</h6>
            <p>${ad.body.substring(0, 100)}...</p>
        `;
    }
    
    // Twitter preview
    const twContent = document.getElementById('twAdContent');
    if (twContent) {
        twContent.innerHTML = `
            <p>${ad.headline}</p>
            <div class="ad-hashtags">${ad.hashtags}</div>
        `;
    }
}

/**
 * Copy ad to clipboard
 * @param {number} adId - Ad ID
 */
function copyAdToClipboard(adId) {
    const ad = window.generatedAds.find(a => a.id === adId);
    if (!ad) return;
    
    const textToCopy = `${ad.headline}\n\n${ad.body}\n\n${ad.hashtags}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Ad copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy ad', 'error');
    });
}

/**
 * Share ad (simulated - opens share dialog)
 * @param {number} adId - Ad ID
 */
function shareAd(adId) {
    const ad = window.generatedAds.find(a => a.id === adId);
    if (!ad) return;
    
    const shareText = `${ad.headline}\n\n${ad.body}\n\n${ad.hashtags}`;
    
    // Check if Web Share API is available
    if (navigator.share) {
        navigator.share({
            title: ad.product.product_name,
            text: shareText
        }).then(() => {
            showToast('Ad shared successfully!', 'success');
        }).catch(err => {
            console.error('Share failed:', err);
            // Fallback to clipboard
            copyAdToClipboard(adId);
        });
    } else {
        // Fallback to clipboard
        copyAdToClipboard(adId);
    }
}

/**
 * Clear all generated ads
 */
function clearAds() {
    window.generatedAds = [];
    
    // Hide ads section
    document.getElementById('generatedAdsSection').style.display = 'none';
    
    // Clear preview
    const fbContent = document.getElementById('fbAdContent');
    if (fbContent) {
        fbContent.innerHTML = `
            <h6>Product Name</h6>
            <p>Ad description will appear here...</p>
        `;
    }
    
    const twContent = document.getElementById('twAdContent');
    if (twContent) {
        twContent.innerHTML = `
            <p>Your ad tweet will appear here...</p>
            <div class="ad-hashtags">#Sale #Deal #SmartPricing</div>
        `;
    }
    
    showToast('All ads cleared', 'info');
}

// Export functions
window.loadAdsData = loadAdsData;
window.generateAdForProduct = generateAdForProduct;
window.generateAllAds = generateAllAds;
window.copyAdToClipboard = copyAdToClipboard;
window.shareAd = shareAd;
window.clearAds = clearAds;

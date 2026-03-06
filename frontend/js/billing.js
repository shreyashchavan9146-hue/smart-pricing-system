/**
 * Billing Module for Smart Pricing System
 * Handles billing, cart management, and invoice generation
 */

/**
 * Load billing data (products)
 * Uses the same API as pricing dashboard for consistency
 */
async function loadBillingData() {
    console.log('Loading billing data...');
    
    const productList = document.getElementById('billingProductList');
    if (!productList) return;
    
    try {
        showLoading('billingProductList');
        
        // Use Pricing API (same as pricing dashboard)
        const products = await PricingAPI.getRecommendations();
        
        if (!products || products.length === 0) {
            showEmptyState('billingProductList', 'No products available. Please add products first.', 'fa-box-open');
            return;
        }
        
        // Store products globally for filtering
        window.billingProducts = products;
        
        // Render products
        renderBillingProducts(products);
        
    } catch (error) {
        console.error('Error loading billing products:', error);
        showEmptyState('billingProductList', 'Failed to load products. Please check if the backend is running.', 'fa-exclamation-triangle');
    }
}

/**
 * Render billing products in the list
 * @param {Array} products - Array of products
 */
function renderBillingProducts(products) {
    const productList = document.getElementById('billingProductList');
    if (!productList) return;
    
    if (products.length === 0) {
        productList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h5>No Products Found</h5>
                <p>No products match your search criteria</p>
            </div>
        `;
        return;
    }
    
    productList.innerHTML = products.map(product => {
        const cartItem = AppState.cart.find(item => item.product_id === product.product_id);
        const quantity = cartItem ? cartItem.qty : 0;
        
        return `
            <div class="product-item" data-product-id="${product.product_id}">
                <div class="product-info">
                    <div class="product-name">${product.product_name || 'Unknown Product'}</div>
                    <div class="product-price">
                        Cost: ${formatCurrency(product.cost_price || 0)} | 
                        Market: ${formatCurrency(product.market_avg_price || 0)}
                        <span class="recommended">| AI: ${formatCurrency(product.recommended_price || 0)}</span>
                    </div>
                </div>
                <div class="product-actions">
                    <div class="quantity-control">
                        <button class="qty-btn" onclick="updateQuantity('${product.product_id}', -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="qty-value">${quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity('${product.product_id}', 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Update product quantity in cart
 * @param {string} productId - Product ID
 * @param {number} change - Quantity change (+1 or -1)
 */
function updateQuantity(productId, change) {
    const product = window.billingProducts?.find(p => p.product_id === productId);
    if (!product) return;
    
    // Find existing cart item
    let cartItem = AppState.cart.find(item => item.product_id === productId);
    
    if (change > 0) {
        // Adding item
        if (cartItem) {
            cartItem.qty += 1;
        } else {
            AppState.cart.push({
                product_id: product.product_id,
                product_name: product.product_name,
                price: product.recommended_price || product.cost_price || 0,
                qty: 1
            });
        }
    } else {
        // Removing item
        if (cartItem) {
            cartItem.qty -= 1;
            if (cartItem.qty <= 0) {
                AppState.cart = AppState.cart.filter(item => item.product_id !== productId);
            }
        }
    }
    
    // Re-render
    renderBillingProducts(window.billingProducts || []);
    updateCartDisplay();
}

/**
 * Filter products by search term
 * @param {string} searchTerm - Search term
 */
function filterProducts(searchTerm) {
    if (!window.billingProducts) return;
    
    const term = searchTerm.toLowerCase();
    const filtered = window.billingProducts.filter(product => 
        (product.product_name || '').toLowerCase().includes(term)
    );
    
    renderBillingProducts(filtered);
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartTax = document.getElementById('cartTax');
    const cartTotal = document.getElementById('cartTotal');
    
    if (!cartItems) return;
    
    if (AppState.cart.length === 0) {
        cartItems.innerHTML = '<p class="text-muted text-center">No items in cart</p>';
        if (cartSubtotal) cartSubtotal.textContent = '₹0.00';
        if (cartTax) cartTax.textContent = '₹0.00';
        if (cartTotal) cartTotal.textContent = '₹0.00';
        return;
    }
    
    // Render cart items
    cartItems.innerHTML = AppState.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product_name}</div>
                <div class="cart-item-price">${formatCurrency(item.price)} x ${item.qty}</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateQuantity('${item.product_id}', -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="qty-value">${item.qty}</span>
                <button class="qty-btn" onclick="updateQuantity('${item.product_id}', 1)">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="cart-item-total">
                ${formatCurrency(item.price * item.qty)}
            </div>
            <button class="remove-item" onclick="removeFromCart('${item.product_id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    // Calculate totals
    const subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * 0.10; // 10% tax
    const total = subtotal + tax;
    
    if (cartSubtotal) cartSubtotal.textContent = formatCurrency(subtotal);
    if (cartTax) cartTax.textContent = formatCurrency(tax);
    if (cartTotal) cartTotal.textContent = formatCurrency(total);
}

/**
 * Remove item from cart
 * @param {string} productId - Product ID
 */
function removeFromCart(productId) {
    AppState.cart = AppState.cart.filter(item => item.product_id !== productId);
    
    // Re-render
    renderBillingProducts(window.billingProducts || []);
    updateCartDisplay();
    
    showToast('Item removed from cart', 'info');
}

/**
 * Clear cart
 */
function clearCart() {
    AppState.cart = [];
    updateCartDisplay();
    renderBillingProducts(window.billingProducts || []);
    showToast('Cart cleared', 'info');
}

/**
 * Handle invoice form submission
 * @param {Event} e - Form submit event
 */
async function handleInvoiceSubmit(e) {
    e.preventDefault();
    
    // Validate cart
    if (AppState.cart.length === 0) {
        showToast('Please add items to cart first', 'warning');
        return;
    }
    
    // Get customer info
    const customerName = document.getElementById('customerName')?.value;
    const customerPhone = document.getElementById('customerPhone')?.value;
    
    if (!customerName) {
        showToast('Please enter customer name', 'warning');
        return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    submitBtn.disabled = true;
    
    try {
        // Prepare invoice data
        const invoiceData = {
            customer_name: customerName,
            customer_phone: customerPhone || '',
            items: AppState.cart.map(item => ({
                product_name: item.product_name,
                price: item.price,
                qty: item.qty
            }))
        };
        
        // Generate invoice
        const blob = await BillingAPI.generateInvoice(invoiceData);
        
        // Download PDF
        const timestamp = new Date().toISOString().replace(/[:.]/g, '_').slice(0, 19);
        const filename = `invoice_${customerName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
        downloadBlob(blob, filename);
        
        showToast('Invoice generated successfully!', 'success');
        
        // Clear cart after successful invoice
        clearCart();
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        
    } catch (error) {
        console.error('Error generating invoice:', error);
        showToast('Failed to generate invoice. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Export functions
window.loadBillingData = loadBillingData;
window.filterProducts = filterProducts;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.handleInvoiceSubmit = handleInvoiceSubmit;

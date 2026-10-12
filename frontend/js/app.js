
const AppState = {
    currentPage: 'dashboard',
    cart: [],
    products: [],
    recommendations: [],
    isLoading: false
};

// Page titles for header
const PageTitles = {
    dashboard: 'Dashboard',
    billing: 'Billing & Invoicing',
    pricing: 'Smart Pricing Recommendations',
    analytics: 'Sales Analytics',
    history: 'Purchase History',
    ads: 'Smart Social Media Ads'
};

/**
 * Initialize the application
 */
async function initApp() {
    console.log('Initializing Smart Pricing System...');
    
    // Update datetime display
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Set up navigation
    setupNavigation();
    
    // Set up form handlers
    setupFormHandlers();
    
    // Load initial data based on current page
    await loadPageData(AppState.currentPage);
    
    console.log('Application initialized successfully');
}

/**
 * Update datetime display
 */
function updateDateTime() {
    const now = new Date();
    const datetimeElement = document.getElementById('datetime');
    if (datetimeElement) {
        datetimeElement.textContent = now.toLocaleString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

/**
 * Set up navigation between pages
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            await navigateTo(page);
        });
    });
}

/**
 * Navigate to a specific page
 * @param {string} page - Page identifier
 */
async function navigateTo(page) {
    if (page === AppState.currentPage) return;
    
    // Update navigation state
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    
    // Hide current page
    const currentPageContent = document.getElementById(`page-${AppState.currentPage}`);
    if (currentPageContent) {
        currentPageContent.classList.remove('active');
    }
    
    // Show new page
    const newPageContent = document.getElementById(`page-${page}`);
    if (newPageContent) {
        newPageContent.classList.add('active');
    }
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = PageTitles[page] || 'Dashboard';
    }
    
    // Update state
    AppState.currentPage = page;
    
    // Load data for the page
    await loadPageData(page);
}

/**
 * Load data for a specific page
 * @param {string} page - Page identifier
 */
async function loadPageData(page) {
    switch (page) {
        case 'dashboard':
            if (typeof loadDashboardData === 'function') {
                await loadDashboardData();
            }
            break;
        case 'billing':
            if (typeof loadBillingData === 'function') {
                await loadBillingData();
            }
            break;
        case 'pricing':
            if (typeof loadPricingData === 'function') {
                await loadPricingData();
            }
            break;
        case 'analytics':
            if (typeof loadAnalyticsData === 'function') {
                await loadAnalyticsData();
            }
            break;
        case 'history':
            if (typeof loadPurchaseHistoryData === 'function') {
                await loadPurchaseHistoryData();
            }
            break;
        case 'ads':
            if (typeof loadAdsData === 'function') {
                await loadAdsData();
            }
            break;
    }
}

/**
 * Set up form handlers
 */
function setupFormHandlers() {
    // Invoice form
    const invoiceForm = document.getElementById('invoiceForm');
    if (invoiceForm) {
        invoiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (typeof handleInvoiceSubmit === 'function') {
                await handleInvoiceSubmit(e);
            }
        });
    }
    
    // Product search
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', (e) => {
            if (typeof filterProducts === 'function') {
                filterProducts(e.target.value);
            }
        });
    }
    
    // Pricing search
    const pricingSearch = document.getElementById('pricingSearch');
    if (pricingSearch) {
        pricingSearch.addEventListener('input', (e) => {
            if (typeof filterPricingProducts === 'function') {
                filterPricingProducts(e.target.value);
            }
        });
    }
    
    // Pricing sort
    const pricingSort = document.getElementById('pricingSort');
    if (pricingSort) {
        pricingSort.addEventListener('change', (e) => {
            if (typeof sortPricingProducts === 'function') {
                sortPricingProducts(e.target.value);
            }
        });
    }
}

/**
 * Toggle sidebar (mobile)
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

/**
 * Show loading spinner
 * @param {string} elementId - Element ID to show spinner in
 */
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p>Loading...</p>
        </div>
    `;
}

/**
 * Show empty state
 * @param {string} elementId - Element ID to show empty state in
 * @param {string} message - Message to display
 * @param {string} icon - Font Awesome icon class
 */
function showEmptyState(elementId, message, icon = 'fa-inbox') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = `
        <div class="empty-state">
            <i class="fas ${icon}"></i>
            <h5>No Data</h5>
            <p>${message}</p>
        </div>
    `;
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Export functions to global scope
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.showToast = showToast;
window.showLoading = showLoading;
window.showEmptyState = showEmptyState;

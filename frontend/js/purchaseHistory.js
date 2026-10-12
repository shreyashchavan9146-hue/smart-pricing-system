/**
 * Purchase History Module for Smart Pricing System
 * Handles purchase history loading, search, filter, and invoice actions
 */

async function loadPurchaseHistoryData() {
    const tableBody = document.getElementById('purchaseHistoryTableBody');
    if (!tableBody) return;

    const search = document.getElementById('historySearch')?.value.trim() || '';
    const date = document.getElementById('historyDate')?.value || '';
    const period = document.getElementById('historyPeriod')?.value || '';

    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading purchase history...</p>
                </div>
            </td>
        </tr>
    `;

    try {
        const response = await PurchaseAPI.getHistory({ search, date, period });
        const history = Array.isArray(response) ? response : (response?.records || []);
        renderPurchaseHistory(history);
    } catch (error) {
        console.error('Error loading purchase history:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    <strong>Unable to load purchase history.</strong><br>
                    ${error.message || 'Please check the backend connection and try again.'}
                </td>
            </tr>
        `;
    }
}

function renderPurchaseHistory(history) {
    const tableBody = document.getElementById('purchaseHistoryTableBody');
    if (!tableBody) return;

    if (!history || history.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    No purchase records found. Try a different search or reset filters.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = history.map(record => `
        <tr>
            <td>${record.invoice_id}</td>
            <td>${record.purchase_date}</td>
            <td>${record.customer_name}</td>
            <td>${formatCurrency(record.total_amount)}</td>
            <td title="${record.product_name || ''}">${record.item_count || record.quantity || 0}</td>
            <td>${record.payment_status}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="showPurchaseDetails('${record.invoice_id}')">View</button>
                <button class="btn btn-sm btn-outline-success" onclick="downloadPurchaseInvoice('${record.invoice_id}')">Download</button>
            </td>
        </tr>
    `).join('');
}

function handlePurchaseHistorySearch() {
    loadPurchaseHistoryData();
}

function handlePurchaseHistoryFilter() {
    loadPurchaseHistoryData();
}

function resetPurchaseHistoryFilters() {
    const searchInput = document.getElementById('historySearch');
    const dateInput = document.getElementById('historyDate');
    const filterSelect = document.getElementById('historyPeriod');

    if (searchInput) searchInput.value = '';
    if (dateInput) dateInput.value = '';
    if (filterSelect) filterSelect.value = 'all';

    loadPurchaseHistoryData();
}

async function showPurchaseDetails(invoiceId) {
    try {
        const details = await PurchaseAPI.getDetails(invoiceId);
        const modalBody = document.getElementById('purchaseDetailModalBody');
        const modalTitle = document.getElementById('purchaseDetailModalTitle');
        const modalFooter = document.getElementById('purchaseDetailModalFooter');

        if (!modalBody || !modalTitle || !modalFooter) return;

        modalTitle.textContent = `Invoice ${details.invoice_id}`;
        modalBody.innerHTML = `
            <p><strong>Customer:</strong> ${details.customer_name}</p>
            <p><strong>Purchase Date:</strong> ${details.purchase_date}</p>
            <p><strong>Status:</strong> ${details.payment_status}</p>
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Cost Price</th>
                            <th>Selling Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${details.items.map(item => `
                            <tr>
                                <td>${item.product_name}</td>
                                <td>${item.quantity}</td>
                                <td>${formatCurrency(item.cost_price)}</td>
                                <td>${formatCurrency(item.selling_price)}</td>
                                <td>${formatCurrency(item.total_amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <p><strong>Subtotal:</strong> ${formatCurrency(details.subtotal)}</p>
                <p><strong>Total Amount:</strong> ${formatCurrency(details.grand_total)}</p>
                <p><strong>Total Profit:</strong> ${formatCurrency(details.total_profit)}</p>
            </div>
        `;
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-success" onclick="downloadPurchaseInvoice('${invoiceId}')">Download Invoice</button>
        `;

        const purchaseModal = new bootstrap.Modal(document.getElementById('purchaseDetailModal'));
        purchaseModal.show();
    } catch (error) {
        console.error('Error loading purchase details:', error);
        showToast('Unable to load purchase details', 'error');
    }
}

function downloadPurchaseInvoice(invoiceId) {
    PurchaseAPI.downloadInvoice(invoiceId);
}

function setupPurchaseHistoryHandlers() {
    const searchInput = document.getElementById('historySearch');
    const dateInput = document.getElementById('historyDate');
    const filterSelect = document.getElementById('historyPeriod');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => loadPurchaseHistoryData(), 300));
    }

    if (dateInput) {
        dateInput.addEventListener('change', () => loadPurchaseHistoryData());
    }

    if (filterSelect) {
        filterSelect.addEventListener('change', () => loadPurchaseHistoryData());
    }
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

window.loadPurchaseHistoryData = loadPurchaseHistoryData;
window.showPurchaseDetails = showPurchaseDetails;
window.downloadPurchaseInvoice = downloadPurchaseInvoice;
window.setupPurchaseHistoryHandlers = setupPurchaseHistoryHandlers;
window.handlePurchaseHistorySearch = handlePurchaseHistorySearch;
window.handlePurchaseHistoryFilter = handlePurchaseHistoryFilter;
window.resetPurchaseHistoryFilters = resetPurchaseHistoryFilters;

document.addEventListener('DOMContentLoaded', setupPurchaseHistoryHandlers);

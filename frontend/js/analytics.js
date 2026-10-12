/**
 * Analytics Module for Smart Pricing System
 * Loads analytics cards and charts from the FastAPI backend.
 */

let profitTrendChart = null;
let weeklySalesChart = null;
let monthlyRevenueChart = null;
let bestSellingChart = null;
let lowProfitChart = null;

const sampleAnalyticsData = {
    total_products: 18,
    total_sales: 14590,
    total_profit: 4200,
    total_orders: 12,
    competitor_products: 16,
    low_stock_products: 3,
    daily_profit: [
        { date: '2026-04-22', revenue: 1600, cost: 1100, profit: 500 },
        { date: '2026-04-23', revenue: 1900, cost: 1250, profit: 650 },
        { date: '2026-04-24', revenue: 1750, cost: 1180, profit: 570 },
        { date: '2026-04-25', revenue: 2100, cost: 1420, profit: 680 },
        { date: '2026-04-26', revenue: 2250, cost: 1500, profit: 750 }
    ],
    profit_forecast: [
        { date: '2026-04-27', predicted_profit: 760 },
        { date: '2026-04-28', predicted_profit: 780 },
        { date: '2026-04-29', predicted_profit: 790 }
    ],
    weekly_sales: [
        { period: '2026-W15', orders: 10, revenue: 7200 },
        { period: '2026-W16', orders: 12, revenue: 8200 }
    ],
    monthly_revenue: [
        { period: '2026-02', revenue: 16700 },
        { period: '2026-03', revenue: 19350 },
        { period: '2026-04', revenue: 20500 }
    ],
    best_selling: [
        { product_name: 'Wireless Earbuds', quantity: 28, revenue: 8400, profit: 2600 },
        { product_name: 'Smartwatch', quantity: 18, revenue: 5400, profit: 1700 }
    ],
    low_profit_products: [
        { product_name: 'USB-C Cable', quantity: 12, revenue: 720, profit: 50, margin: 7 },
        { product_name: 'Budget Charger', quantity: 9, revenue: 630, profit: 40, margin: 6 }
    ],
    is_demo_data: true
};

function hasRenderableAnalytics(data) {
    return Boolean(
        data &&
        Array.isArray(data.daily_profit) && data.daily_profit.length > 0 &&
        Array.isArray(data.weekly_sales) && data.weekly_sales.length > 0 &&
        Array.isArray(data.monthly_revenue) && data.monthly_revenue.length > 0
    );
}

function mergeAnalyticsData(overview, dashboard) {
    return {
        ...sampleAnalyticsData,
        ...(overview || {}),
        ...(dashboard || {})
    };
}

async function loadAnalyticsData() {
    console.log('Loading analytics data...');

    const [overviewResult, dashboardResult] = await Promise.allSettled([
        AnalyticsAPI.getOverview(),
        AnalyticsAPI.getDashboard()
    ]);

    const overview = overviewResult.status === 'fulfilled' ? overviewResult.value : null;
    const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;

    if (overviewResult.status === 'rejected') {
        console.warn('Overview API unavailable, using fallback data', overviewResult.reason);
    }

    if (dashboardResult.status === 'rejected') {
        console.warn('Dashboard API unavailable, using fallback data', dashboardResult.reason);
    }

    let analyticsData = mergeAnalyticsData(overview, dashboard);

    if (!hasRenderableAnalytics(analyticsData)) {
        analyticsData = sampleAnalyticsData;
    }

    updateAnalyticsCards(analyticsData);
    renderAnalyticsCharts(analyticsData);
    renderAnalyticsStatus(analyticsData);
}

function renderAnalyticsStatus(data) {
    if (!window.showToast || !data?.is_demo_data) return;
    showToast('Showing demo analytics data because the database has no billing records yet.', 'info');
}

function updateAnalyticsCards(data) {
    const totals = [
        { id: 'statAnalyticsProducts', value: data.total_products || 0 },
        { id: 'statSales', value: formatCurrency(data.total_sales || 0) },
        { id: 'statProfit', value: formatCurrency(data.total_profit || 0) },
        { id: 'statOrders', value: data.total_orders || 0 },
        { id: 'statCompetitorProducts', value: data.competitor_products || 0 },
        { id: 'statLowStockProducts', value: data.low_stock_products || 0 }
    ];

    totals.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = card.value;
        }
    });
}

function renderAnalyticsCharts(data) {
    renderProfitTrendChart(data.daily_profit || [], data.profit_forecast || []);
    renderWeeklySalesChart(data.weekly_sales || []);
    renderMonthlyRevenueChart(data.monthly_revenue || []);
    renderBestSellingChart(data.best_selling || []);
    renderLowProfitChart(data.low_profit_products || []);
}

function renderProfitTrendChart(dailyData, forecastData) {
    const ctx = document.getElementById('profitChart');
    if (!ctx) return;

    const labels = dailyData.map(item => item.date);
    const revenue = dailyData.map(item => item.revenue);
    const profit = dailyData.map(item => item.profit);
    const forecastLabels = forecastData.map(item => item.date);
    const forecastProfit = forecastData.map(item => item.predicted_profit);

    const allLabels = [...labels, ...forecastLabels];
    const forecastEmptyPadding = Array(labels.length).fill(null);

    if (profitTrendChart) profitTrendChart.destroy();

    profitTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: 'Revenue',
                    data: [...revenue, ...Array(forecastLabels.length).fill(null)],
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.15)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Profit',
                    data: [...profit, ...Array(forecastLabels.length).fill(null)],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Predicted Profit',
                    data: [...forecastEmptyPadding, ...forecastProfit],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderDash: [8, 4],
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '₹' + Number(value).toLocaleString('en-IN')
                    }
                }
            }
        }
    });
}

function renderWeeklySalesChart(weeklyData) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    const labels = weeklyData.map(item => item.period);
    const orders = weeklyData.map(item => item.orders);
    const revenue = weeklyData.map(item => item.revenue);

    if (weeklySalesChart) weeklySalesChart.destroy();

    weeklySalesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Orders',
                    data: orders,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Revenue',
                    data: revenue,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.15)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => Number(value).toLocaleString('en-IN')
                    }
                }
            }
        }
    });
}

function renderMonthlyRevenueChart(monthlyData) {
    const ctx = document.getElementById('monthlyRevenueChart');
    if (!ctx) return;

    const labels = monthlyData.map(item => item.period);
    const revenue = monthlyData.map(item => item.revenue);

    if (monthlyRevenueChart) monthlyRevenueChart.destroy();

    monthlyRevenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Monthly Revenue',
                    data: revenue,
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.15)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '₹' + Number(value).toLocaleString('en-IN')
                    }
                }
            }
        }
    });
}

function renderBestSellingChart(bestSelling) {
    const ctx = document.getElementById('bestSellingChart');
    if (!ctx) return;

    const labels = bestSelling.map(item => item.product_name);
    const quantities = bestSelling.map(item => item.quantity);

    if (bestSellingChart) bestSellingChart.destroy();

    bestSellingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Units Sold',
                    data: quantities,
                    backgroundColor: '#14b8a6'
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => Number(value).toLocaleString('en-IN')
                    }
                }
            }
        }
    });
}

function renderLowProfitChart(lowProfit) {
    const ctx = document.getElementById('lowProfitChart');
    if (!ctx) return;

    const labels = lowProfit.map(item => item.product_name);
    const margins = lowProfit.map(item => Number((item.margin || 0).toFixed(1)));

    if (lowProfitChart) lowProfitChart.destroy();

    lowProfitChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [
                {
                    label: 'Profit Margin (%)',
                    data: margins,
                    backgroundColor: ['#ef4444', '#fb7185', '#f97316', '#f59e0b', '#eab308', '#22c55e']
                }
            ]
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

window.loadAnalyticsData = loadAnalyticsData;

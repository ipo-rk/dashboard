// ====== GLOBAL CONFIG & CONSTANTS ======
window.PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22180%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22400%22 height=%22180%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
window.PLACEHOLDER_THUMBNAIL = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2260%22%3E%3Crect fill=%22%23e0e0e0%22 width=%2280%22 height=%2260%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2212%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo img%3C/text%3E%3C/svg%3E';

const STORAGE_KEY = 'ena_products_v1';
const SERVER_URL = 'http://localhost:5000/api';
const USER_SETTINGS_KEY = 'userSettings';
const NOTIF_SETTINGS_KEY = 'notificationSettings';
const USER_PASSWORD_KEY = 'userPassword';
const MESSAGE_REPLIES_KEY = 'messageReplies';

let useServer = false;

// ====== UTILITY FUNCTIONS ======
// Use shared helpers from app-core when available
async function checkServer() {
    if (window.checkServer) return window.checkServer();
    try {
        const res = await fetch(`${SERVER_URL}/health`, { method: 'GET' });
        return res.ok;
    } catch (e) {
        return false;
    }
}

function setActiveNavItem() {
    const currentPage = window.location.pathname;
    document.querySelectorAll('.w3-bar-item').forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        if ((currentPage.includes(href) && href !== 'index.html') ||
            (currentPage.endsWith('/') && href === 'index.html')) {
            item.classList.add('active');
        }
    });
}

// ====== DASHBOARD PAGE ======
async function initDashboard() {
    console.log('📊 Initializing Dashboard...');
    useServer = await checkServer();
    if (useServer) console.log('✓ Server detected');
    else console.log('⚠ Using localStorage');

    // load products via shared loader
    try {
        updateProductWidget();
    } catch (e) { console.warn(e); }
    initChart();
    setupQuickAddForm();
}

async function updateProductWidget() {
    const products = await loadProducts();
    const totalEl = document.getElementById('totalProducts');
    const valueEl = document.getElementById('totalValue');

    if (totalEl) totalEl.textContent = products.length;
    if (valueEl) {
        const totalVal = products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
        valueEl.textContent = '$' + totalVal.toFixed(2);
    }
}

function initChart() {
    const ctx = document.getElementById('myChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Sales ($)',
                data: [2100, 2400, 2210, 2290, 2500, 2210, 2290, 3000, 3500, 3200, 3800, 4200],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#667eea',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 12, weight: 'bold' },
                        padding: 15
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

function setupQuickAddForm() {
    const form = document.getElementById('quickAddForm');
    if (!form) return;

    // hide quick add for non-admin users
    try {
        const u = JSON.parse(localStorage.getItem('auth_user') || '{}');
        if (!u || u.role !== 'admin') {
            form.style.display = 'none';
            return;
        }
    } catch (e) { /* ignore */ }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('quickName').value.trim();
        const price = parseFloat(document.getElementById('quickPrice').value) || 0;

        if (!name || price <= 0) {
            alert('❌ Nama dan harga harus diisi');
            return;
        }

        if (useServer) {
            try {
                const res = await fetch(`${SERVER_URL}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, price, description: '' })
                });
                if (res.ok) {
                    alert('✓ Produk ditambahkan!');
                    form.reset();
                    updateProductWidget();
                    return;
                }
            } catch (e) {
                console.warn('⚠ Server add failed');
            }
        }

        // Fallback: localStorage
        const raw = localStorage.getItem(STORAGE_KEY);
        const products = raw ? JSON.parse(raw) : [];
        const newP = {
            id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            name: name,
            price: price,
            description: '',
            img: window.PLACEHOLDER_IMG
        };
        products.unshift(newP);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        alert('✓ Produk ditambahkan!');
        form.reset();
        updateProductWidget();
    });
}

// ====== CUSTOMERS PAGE ======
function initCustomers() {
    console.log('👥 Initializing Customers...');
    const customersData = [
        { id: 'C001', name: 'John Doe', email: 'john@example.com', phone: '555-0101', orders: 12, spent: 450 },
        { id: 'C002', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0102', orders: 8, spent: 320 },
        { id: 'C003', name: 'Mike Johnson', email: 'mike@example.com', phone: '555-0103', orders: 15, spent: 580 },
        { id: 'C004', name: 'Sarah Williams', email: 'sarah@example.com', phone: '555-0104', orders: 10, spent: 420 },
        { id: 'C005', name: 'Tom Brown', email: 'tom@example.com', phone: '555-0105', orders: 7, spent: 280 }
    ];

    document.querySelectorAll('.btn-info').forEach((btn, index) => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const customer = customersData[index];
            alert(`📋 DETAIL CUSTOMER
━━━━━━━━━━━━━━━━━
Nama: ${customer.name}
Email: ${customer.email}
Telp: ${customer.phone}
Total Order: ${customer.orders}
Total Belanja: $${customer.spent.toFixed(2)}`);
        });
    });

    console.log('✓ Customer Management initialized');
}

// ====== MESSAGES PAGE ======
function initMessages() {
    console.log('💬 Initializing Messages...');
    const messagesData = [
        { id: 1, sender: 'John Doe', message: 'Hi! I would like to place an order for 10 bags of your Espresso Blend. Can you provide a bulk discount?', time: '2 hours ago' },
        { id: 2, sender: 'Jane Smith', message: 'Your Latte Classic is amazing! I\'ve already recommended it to my friends. Keep up the great work!', time: '4 hours ago' },
        { id: 3, sender: 'Mike Johnson', message: 'I have a question about the shipping cost for my order #O1234. Can you help?', time: '6 hours ago' },
        { id: 4, sender: 'Sarah Williams', message: 'When will the new flavor be available? I\'m very excited to try it!', time: 'Yesterday' }
    ];

    let replies = JSON.parse(localStorage.getItem(MESSAGE_REPLIES_KEY)) || {};

    document.querySelectorAll('.btn-primary').forEach((btn, index) => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const msg = messagesData[index];
            const reply = prompt(`💬 Reply to ${msg.sender}:`);

            if (reply && reply.trim()) {
                if (!replies[msg.id]) replies[msg.id] = [];
                replies[msg.id].push({
                    text: reply,
                    timestamp: new Date().toLocaleString()
                });
                localStorage.setItem(MESSAGE_REPLIES_KEY, JSON.stringify(replies));

                const card = btn.closest('.card');
                if (card) {
                    card.classList.add('border-success');
                    const footer = card.querySelector('.card-footer');
                    if (footer && !footer.querySelector('.reply-badge')) {
                        const badge = document.createElement('div');
                        badge.className = 'reply-badge';
                        badge.innerHTML = '<small class="text-success">✓ Reply sent</small>';
                        footer.appendChild(badge);
                    }
                }
                alert(`✓ Balasan terkirim ke ${msg.sender}!`);
            }
        });
    });

    console.log('✓ Messages system initialized');
}

// ====== SETTINGS PAGE ======
function initSettings() {
    console.log('⚙️ Initializing Settings...');
    const forms = document.querySelectorAll('.card-body form');

    // Account Settings Form
    if (forms.length > 0) {
        forms[0].addEventListener('submit', function (e) {
            e.preventDefault();
            const settings = {
                fullname: document.getElementById('fullname').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value
            };
            localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
            alert('✓ Pengaturan akun berhasil disimpan!');
        });
    }

    // Password Settings Form
    if (forms.length > 1) {
        forms[1].addEventListener('submit', function (e) {
            e.preventDefault();
            const newPass = document.getElementById('new_password').value;
            const confirmPass = document.getElementById('confirm_password').value;

            if (newPass !== confirmPass) {
                alert('❌ Password tidak cocok!');
                return;
            }
            if (newPass.length < 6) {
                alert('❌ Password harus minimal 6 karakter!');
                return;
            }

            localStorage.setItem(USER_PASSWORD_KEY, newPass);
            alert('✓ Password berhasil diperbarui!');
            this.reset();
        });
    }

    // Notification Settings Form
    if (forms.length > 2) {
        forms[2].addEventListener('submit', function (e) {
            e.preventDefault();
            const notifSettings = {
                emailNotif: document.getElementById('emailNotif').checked,
                smsNotif: document.getElementById('smsNotif').checked,
                newsNotif: document.getElementById('newsNotif').checked
            };
            localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(notifSettings));
            alert('✓ Preferensi notifikasi berhasil disimpan!');
        });
    }

    // Delete Account Button
    const deleteBtn = document.querySelector('.btn-danger');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('⚠️ Tindakan ini tidak dapat diurungkan. Apakah Anda yakin ingin menghapus akun?')) {
                if (confirm('Ketik "HAPUS" untuk mengkonfirmasi penghapusan permanen:')) {
                    localStorage.clear();
                    alert('✓ Akun berhasil dihapus. Semua data telah dihapus.');
                    window.location.href = 'index.html';
                }
            }
        });
    }

    // Load saved settings
    const saved = localStorage.getItem(USER_SETTINGS_KEY);
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            const fnEl = document.getElementById('fullname');
            const emEl = document.getElementById('email');
            const phEl = document.getElementById('phone');
            if (fnEl) fnEl.value = settings.fullname || '';
            if (emEl) emEl.value = settings.email || '';
            if (phEl) phEl.value = settings.phone || '';
        } catch (e) {
            console.error('Error loading user settings:', e);
        }
    }

    // Load notification settings
    const savedNotif = localStorage.getItem(NOTIF_SETTINGS_KEY);
    if (savedNotif) {
        try {
            const notif = JSON.parse(savedNotif);
            const emailEl = document.getElementById('emailNotif');
            const smsEl = document.getElementById('smsNotif');
            const newsEl = document.getElementById('newsNotif');
            if (emailEl) emailEl.checked = notif.emailNotif;
            if (smsEl) smsEl.checked = notif.smsNotif;
            if (newsEl) newsEl.checked = notif.newsNotif;
        } catch (e) {
            console.error('Error loading notification settings:', e);
        }
    }

    console.log('✓ Settings initialized');
}

// ====== ANALYTICS PAGE ======
function initAnalytics() {
    console.log('📊 Initializing Analytics...');

    // Sales Trend Chart
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        new Chart(salesCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Sales ($)',
                    data: [2000, 2500, 2200, 3000, 3500, 3800],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // Product Distribution Chart
    const productCtx = document.getElementById('productChart');
    if (productCtx) {
        new Chart(productCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Espresso', 'Latte', 'Cappuccino', 'Other'],
                datasets: [{
                    data: [30, 25, 20, 25],
                    backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, position: 'bottom' }
                }
            }
        });
    }

    console.log('✓ Analytics initialized');
}

// ====== PAGE INITIALIZATION ======
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Dashboard Loading...');

    // Initialize server detection
    useServer = await checkServer();

    // Set active nav item
    setActiveNavItem();

    // Detect current page
    const currentPage = window.location.pathname;

    if (currentPage.includes('index.html') || currentPage.endsWith('/')) {
        initDashboard();
    } else if (currentPage.includes('customers.html')) {
        initCustomers();
    } else if (currentPage.includes('messages.html')) {
        initMessages();
    } else if (currentPage.includes('settings.html')) {
        initSettings();
    } else if (currentPage.includes('analytics.html')) {
        initAnalytics();
    } else if (currentPage.includes('products.html')) {
        console.log('📦 Products page loaded');
    }

    console.log('✓ Dashboard Ready!');
});

// Export functions globally
window.updateProductWidget = updateProductWidget;
window.checkServer = checkServer;
// Provide a local wrapper so older code can call `loadProducts()`.
async function loadProducts() {
    if (window.appCore && window.appCore.loadProducts) return window.appCore.loadProducts();
    // fallback: try to read localStorage
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

window.loadProducts = loadProducts;

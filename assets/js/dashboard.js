(function () {
    const API_BASE = 'http://localhost:5000/api';
    let products = [];
    let currentEditId = null;
    let currentUser = null;
    let currentPage = 1;
    const itemsPerPage = 9;
    let currentFilterType = 'all';

    window.addEventListener('load', async () => {
        if (!isAuthenticated()) {
            location.href = 'login.html';
            return;
        }
        currentUser = JSON.parse(localStorage.getItem('auth_user'));
        updateUserUI();
        await loadProducts();
        setupEventListeners();
        if (currentUser.role === 'admin') {
            const el = document.getElementById('adminSection');
            if (el) el.classList.add('show');
        }
    });

    function isAuthenticated() {
        return !!localStorage.getItem('auth_token');
    }

    function getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    function updateUserUI() {
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = currentUser.name || 'User';
        const userFullNameEl = document.getElementById('userFullName');
        if (userFullNameEl) userFullNameEl.textContent = currentUser.name || '-';
        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = currentUser.email || '-';
        const roleBadge = document.getElementById('roleBadge');
        const roleBadgeDisplay = document.getElementById('roleBadgeDisplay');
        const userRoleDisplay = document.getElementById('userRoleDisplay');
        if (roleBadge) roleBadge.textContent = currentUser.role === 'admin' ? 'ADMIN' : 'USER';
        if (roleBadgeDisplay) roleBadgeDisplay.textContent = currentUser.role === 'admin' ? 'ADMIN' : 'USER';
        if (userRoleDisplay) userRoleDisplay.textContent = (currentUser.role || 'user').toUpperCase();
        const userRole = document.getElementById('userRole');
        if (userRole) userRole.textContent = currentUser.role === 'admin' ? 'ADMIN' : 'USER';
    }

    // Use centralized loader from app-core when available
    async function loadProducts() {
        try {
            if (window.appCore && window.appCore.loadProducts) {
                products = await window.appCore.loadProducts();
            } else {
                const res = await fetch(`${API_BASE}/products`);
                if (!res.ok) throw new Error('Gagal memuat produk');
                products = await res.json();
            }
            updateStats();
            renderProducts(products);
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
            const productListEl = document.getElementById('productList');
            if (productListEl) productListEl.innerHTML = '<div class="empty">Gagal memuat produk</div>';
        }
    }

    function updateStats() {
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
        const activeProducts = products.length;
        const lowStockProducts = products.filter(p => (p.stock || 0) < 10).length;

        const totalEl = document.getElementById('totalProducts');
        if (totalEl) totalEl.textContent = totalProducts;
        const totalValueEl = document.getElementById('totalValue');
        if (totalValueEl) totalValueEl.textContent = 'Rp ' + totalValue.toLocaleString('id-ID');
        const activeEl = document.getElementById('activeProducts');
        if (activeEl) activeEl.textContent = activeProducts;
        const lowStockEl = document.getElementById('lowStockProducts');
        if (lowStockEl) lowStockEl.textContent = lowStockProducts;
        const notif = document.getElementById('notificationBadge');
        if (notif) notif.textContent = lowStockProducts > 0 ? lowStockProducts : '0';
    }

    function renderProducts(list) {
        let filteredList = list;
        if (currentFilterType === 'lowstock') {
            filteredList = list.filter(p => (p.stock || 0) < 10);
        }

        const container = document.getElementById('productList');
        if (!container) return;
        if (filteredList.length === 0) {
            container.innerHTML = '<div class="empty" style="grid-column: 1/-1;">📦 Tidak ada produk ditemukan</div>';
            const pag = document.getElementById('pagination');
            if (pag) pag.style.display = 'none';
            return;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginated = filteredList.slice(start, end);

        container.innerHTML = paginated.map(p => `
            <div class="product-card">
                <div class="product-img">${p.image ? `<img src="${p.image}" alt="${p.name}">` : '☕'}</div>
                <div class="product-body">
                    <h3>${p.name}</h3>
                    <div class="product-price">Rp ${parseFloat(p.price || 0).toLocaleString('id-ID')}</div>
                    <div class="product-desc">${p.description || 'Tidak ada deskripsi'}</div>
                    <div style="font-size: 12px; color: #999; margin-bottom: 8px;">
                        ${p.category ? `<strong>Kategori:</strong> ${p.category}<br>` : ''}
                        <strong>Stok:</strong> ${p.stock || 0}
                    </div>
                    <div class="product-actions">
                        ${currentUser && currentUser.role === 'admin' ? `
                            <button class="btn-edit" data-id="${p.id}">✏️ Edit</button>
                            <button class="btn-delete" data-id="${p.id}">🗑️ Hapus</button>
                        ` : `
                            <span style="color: #999; font-size: 13px; padding: 8px;">👁️ Tampilan saja</span>
                        `}
                    </div>
                </div>
            </div>
        `).join('');

        attachProductActionListeners();
        renderPagination(filteredList.length);
    }

    function attachProductActionListeners() {
        document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', (e) => openEditModal(e.currentTarget.dataset.id)));
        document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', (e) => handleDelete(e.currentTarget.dataset.id)));
    }

    function renderPagination(total) {
        const paginationDiv = document.getElementById('pagination');
        if (!paginationDiv) return;
        const pages = Math.ceil(total / itemsPerPage);
        if (pages <= 1) {
            paginationDiv.style.display = 'none';
            return;
        }
        paginationDiv.style.display = 'flex';
        // Build pagination buttons without inline onclicks
        paginationDiv.innerHTML = '';
        function makeBtn(text, page, cls) {
            const b = document.createElement('button');
            b.textContent = text;
            if (cls) b.className = cls;
            b.addEventListener('click', function () { goToPage(page); });
            return b;
        }

        if (currentPage > 1) {
            paginationDiv.appendChild(makeBtn('← Sebelumnya', currentPage - 1));
        }

        for (let i = 1; i <= pages; i++) {
            const btn = makeBtn(String(i), i, i === currentPage ? 'active' : '');
            paginationDiv.appendChild(btn);
        }

        if (currentPage < pages) {
            paginationDiv.appendChild(makeBtn('Selanjutnya →', currentPage + 1));
        }
    }

    function goToPage(page) {
        currentPage = page;
        renderProducts(products);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleSearch() {
        const input = document.getElementById('searchInput');
        if (!input) return;
        const query = input.value.toLowerCase();
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.description || '').toLowerCase().includes(query)
        );
        currentPage = 1;
        currentFilterType = 'all';
        renderProducts(filtered);
    }

    function applyFilter(btn, filterType) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        currentFilterType = filterType;
        currentPage = 1;
        renderProducts(products);
    }

    function toggleAddForm() {
        const el = document.getElementById('addForm');
        if (el) el.classList.toggle('show');
    }

    function openEditModal(id) {
        currentEditId = id;
        const product = products.find(p => p.id === id);
        if (!product) return;
        const editName = document.getElementById('editName'); if (editName) editName.value = product.name;
        const editPrice = document.getElementById('editPrice'); if (editPrice) editPrice.value = product.price;
        const editDesc = document.getElementById('editDesc'); if (editDesc) editDesc.value = product.description || '';
        const editCategory = document.getElementById('editCategory'); if (editCategory) editCategory.value = product.category || '';
        const editStock = document.getElementById('editStock'); if (editStock) editStock.value = product.stock || 0;
        const modal = document.getElementById('editModal'); if (modal) modal.classList.add('show');
    }

    function closeEditModal() {
        const modal = document.getElementById('editModal'); if (modal) modal.classList.remove('show');
        currentEditId = null;
    }

    async function handleAddProduct() {
        const nameEl = document.getElementById('productName');
        const priceEl = document.getElementById('productPrice');
        if (!nameEl || !priceEl) return showMessage('Form produk tidak ditemukan', 'error');
        const name = nameEl.value.trim();
        const price = priceEl.value;
        const desc = (document.getElementById('productDesc') || {}).value || '';
        const category = (document.getElementById('productCategory') || {}).value || '';
        const stock = (document.getElementById('productStock') || {}).value || '';
        const image = (document.getElementById('productImage') || {}).files && document.getElementById('productImage').files[0];

        if (!name || name.length < 2) { showMessage('Nama minimal 2 karakter', 'error'); return; }
        if (!price || parseFloat(price) <= 0) { showMessage('Harga harus > 0', 'error'); return; }

        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('description', desc);
            formData.append('category', category);
            formData.append('stock', stock);
            if (image) formData.append('image', image);

            const res = await fetch(`${API_BASE}/products`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
                body: formData
            });
            if (!res.ok) throw new Error('Gagal membuat produk');

            showMessage('Produk berhasil ditambahkan', 'success');
            try { const form = document.getElementById('productForm'); if (form) form.reset(); } catch (e) { }
            const addForm = document.getElementById('addForm'); if (addForm) addForm.classList.remove('show');
            // clear inputs if present
            ['productName', 'productPrice', 'productDesc', 'productCategory', 'productStock', 'productImage'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            await loadProducts();
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }
    }

    async function handleSaveEdit() {
        const name = (document.getElementById('editName') || {}).value || '';
        const price = (document.getElementById('editPrice') || {}).value || '';
        const desc = (document.getElementById('editDesc') || {}).value || '';
        const category = (document.getElementById('editCategory') || {}).value || '';
        const stock = (document.getElementById('editStock') || {}).value || '';
        const image = (document.getElementById('editImage') || {}).files && document.getElementById('editImage').files[0];

        if (!name || name.length < 2) { showMessage('Nama minimal 2 karakter', 'error'); return; }
        if (!price || parseFloat(price) <= 0) { showMessage('Harga harus > 0', 'error'); return; }

        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('description', desc);
            formData.append('category', category);
            formData.append('stock', stock);
            if (image) formData.append('image', image);

            const res = await fetch(`${API_BASE}/products/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
                body: formData
            });
            if (!res.ok) throw new Error('Gagal memperbarui produk');

            showMessage('Produk berhasil diperbarui', 'success');
            closeEditModal();
            await loadProducts();
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }
    }

    async function handleDelete(id) {
        if (!confirm('Yakin ingin menghapus produk ini?')) return;
        try {
            const res = await fetch(`${API_BASE}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (!res.ok) throw new Error('Gagal menghapus produk');
            showMessage('Produk berhasil dihapus', 'success');
            await loadProducts();
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }
    }

    function handleLogout() {
        if (confirm('Yakin ingin logout?')) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            location.href = 'login.html';
        }
    }

    function showMessage(msg, type) {
        const msgEl = document.getElementById('addMsg');
        if (!msgEl) return;
        msgEl.textContent = msg;
        msgEl.className = 'msg show ' + type;
        setTimeout(() => msgEl.classList.remove('show'), 5000);
    }

    function setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.addEventListener('input', handleSearch);
        const editModal = document.getElementById('editModal');
        if (editModal) editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditModal();
        });
        // logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        // also bind any .btn-logout (some pages don't set id)
        document.querySelectorAll('.btn-logout').forEach(b => b.addEventListener('click', handleLogout));

        // add product button (toggle form)
        const addBtn = document.querySelector('.btn-add');
        if (addBtn) addBtn.addEventListener('click', toggleAddForm);

        // add form actions
        const addFormSave = document.querySelector('#addForm .btn-save');
        if (addFormSave) addFormSave.addEventListener('click', function (e) { e.preventDefault(); handleAddProduct(); });
        const addFormCancel = document.querySelector('#addForm .btn-cancel');
        if (addFormCancel) addFormCancel.addEventListener('click', function (e) { e.preventDefault(); toggleAddForm(); });

        // edit modal actions
        const editSave = document.querySelector('#editModal .btn-save');
        if (editSave) editSave.addEventListener('click', function (e) { e.preventDefault(); handleSaveEdit(); });
        const editCancel = document.querySelector('#editModal .btn-cancel');
        if (editCancel) editCancel.addEventListener('click', function (e) { e.preventDefault(); closeEditModal(); });

        // filter buttons
        document.querySelectorAll('.filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                const type = btn.getAttribute('data-filter') || 'all';
                applyFilter(btn, type);
            });
        });
    }

    // expose only logout globally to preserve existing onclick handlers
    window.handleLogout = handleLogout;
    // expose these functions because many HTML files use inline onclick attributes
    window.toggleAddForm = toggleAddForm;
    window.applyFilter = applyFilter;
    window.handleAddProduct = handleAddProduct;
    window.handleSaveEdit = handleSaveEdit;
    window.goToPage = goToPage;

})();

// products.js — hybrid CRUD (Server API with localStorage fallback)
// Data model: {id, name, price, description, img}

// Placeholders are defined centrally in `assets/js/script.js` to avoid duplication across modules.

(function () {
    const STORAGE_KEY = 'ena_products_v1';
    const SERVER_URL = 'http://localhost:5000/api';
    const PLACEHOLDER_IMG = window.PLACEHOLDER_IMG;
    const PLACEHOLDER_THUMBNAIL = window.PLACEHOLDER_THUMBNAIL;
    const tableBody = document.getElementById('productsTableBody');
    const addBtn = document.getElementById('addProductBtn');
    const productForm = document.getElementById('productForm');
    const productModalTitle = document.getElementById('productModalTitle');
    const productImageInput = document.getElementById('productImage');
    const productImagePreview = document.getElementById('productImagePreview');
    let editingId = null;
    let useServer = false; // Will be detected on init
    const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const isAdmin = !!(currentUser && currentUser.role === 'admin');

    // Convert relative upload path to full server URL
    function getImageUrl(imgPath) {
        if (!imgPath) return PLACEHOLDER_IMG;
        // If it's a data URI or full URL, return as-is
        if (imgPath.startsWith('data:') || imgPath.startsWith('http')) {
            return imgPath;
        }
        // If it's a server upload path (/uploads/...), convert to full URL
        if (imgPath.startsWith('/uploads/')) {
            return SERVER_URL.replace('/api', '') + imgPath;
        }
        // Local asset path
        return imgPath;
    }

    // Check if server is available
    async function checkServer() {
        try {
            const res = await fetch(`${SERVER_URL}/health`, { method: 'GET' });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    // Load products from centralized appCore if available, otherwise fall back
    async function loadProducts() {
        try {
            if (window.appCore && window.appCore.loadProducts) {
                return await window.appCore.loadProducts();
            }
        } catch (e) {
            console.warn('appCore.loadProducts failed, falling back', e);
        }

        if (useServer) {
            try {
                const res = await fetch(`${SERVER_URL}/products`);
                if (res.ok) {
                    const products = await res.json();
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); // Cache locally
                    return products;
                }
            } catch (e) {
                console.warn('Server fetch failed, using localStorage', e);
                useServer = false; // Fallback
            }
        }

        // Fallback: use localStorage
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                const seed = [
                    { id: 'p_seed_1', name: 'Espresso', price: 10.99, description: 'Rich espresso', img: 'assets/img/product-img/espresso.png' },
                    { id: 'p_seed_2', name: 'Latte', price: 10.99, description: 'Smooth latte', img: 'assets/img/product-img/latte.png' },
                    { id: 'p_seed_3', name: 'Cappuccino', price: 11.99, description: 'Creamy cappuccino', img: 'assets/img/product-img/cappuccino.png' }
                ];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
                return seed;
            }
            return JSON.parse(raw);
        } catch (e) {
            console.error('loadProducts error:', e);
            return [];
        }
    }

    // Save products (use appCore if present)
    async function saveProducts(products) {
        if (window.appCore && window.appCore.saveProducts) {
            try { return window.appCore.saveProducts(products); } catch (e) { /* ignore */ }
        }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch (e) { console.error(e); }
    }

    function genId() {
        return 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }

    function render() {
        const products = loadProducts();
        Promise.resolve(products).then(prods => {
            tableBody.innerHTML = '';
                        prods.forEach(p => {
                                const tr = document.createElement('tr');
                                tr.innerHTML = `
                    <td><img src="${getImageUrl(p.img)}" class="product-img" style="height:60px;width:80px;object-fit:cover;" onerror="this.onerror=null;this.src=window.PLACEHOLDER_THUMBNAIL"/></td>
                    <td>${escapeHtml(p.name)}</td>
                    <td>$${Number(p.price).toFixed(2)}</td>
                    <td>${escapeHtml(p.description || '')}</td>
                    <td>
                        ${isAdmin ? `<button class="btn btn-sm btn-info btn-edit" data-id="${p.id}">Edit</button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${p.id}">Delete</button>` : `<span style="color:#999; font-size:13px;">👁️ Tampilan saja</span>`}
                    </td>
                `;
                                tableBody.appendChild(tr);
                        });
                        // attach listeners
                        if (isAdmin) {
                                document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', onEdit));
                                document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', onDelete));
                        }
        });
    }

    function onEdit(e) {
        const id = e.currentTarget.dataset.id;
        loadProducts().then(products => {
            const prod = products.find(x => x.id === id);
            if (!prod) return alert('Product not found');
            editingId = id;
            productModalTitle.textContent = 'Edit Product';
            productForm.elements['name'].value = prod.name;
            productForm.elements['price'].value = prod.price;
            productForm.elements['description'].value = prod.description;
            productImagePreview.src = getImageUrl(prod.img) || PLACEHOLDER_IMG;
            $('#productModal').modal('show');
        });
    }

    async function onDelete(e) {
        const id = e.currentTarget.dataset.id;
        if (!confirm('Hapus produk ini?')) return;

        if (useServer) {
            try {
                const res = await fetch(`${SERVER_URL}/products/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    render();
                    return;
                }
            } catch (e) {
                console.warn('Server delete failed, using localStorage', e);
            }
        }

        // Fallback: localStorage
        let products = await loadProducts();
        products = products.filter(x => x.id !== id);
        await saveProducts(products);
        render();
    }

    function resetForm() {
        editingId = null;
        productForm.reset();
        productImagePreview.src = PLACEHOLDER_IMG;
    }

    function onFormSubmit(ev) {
        ev.preventDefault();
        const form = productForm;
        const name = form.elements['name'].value.trim();
        const price = parseFloat(form.elements['price'].value) || 0;
        const desc = form.elements['description'].value.trim();
        const file = productImageInput.files && productImageInput.files[0];

        if (useServer && file) {
            // Use server for image upload
            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('description', desc);
            formData.append('image', file);

            const endpoint = editingId
                ? `${SERVER_URL}/products/${editingId}`
                : `${SERVER_URL}/products`;
            const method = editingId ? 'PUT' : 'POST';

            fetch(endpoint, { method, body: formData })
                .then(res => res.json())
                .then(data => {
                    $('#productModal').modal('hide');
                    resetForm();
                    render();
                })
                .catch(err => {
                    console.warn('Server save failed, using localStorage', err);
                    handleFormSubmitLocal(editingId, name, price, desc, file);
                });
        } else {
            // Use localStorage
            handleFormSubmitLocal(editingId, name, price, desc, file);
        }
    }

    function handleFormSubmitLocal(editingId, name, price, desc, file) {
        loadProducts().then(products => {
            function commitAndClose(imgData) {
                if (editingId) {
                    const idx = products.findIndex(x => x.id === editingId);
                    if (idx !== -1) {
                        products[idx].name = name;
                        products[idx].price = price;
                        products[idx].description = desc;
                        if (imgData) products[idx].img = imgData;
                        saveProducts(products);
                    }
                } else {
                    const newP = {
                        id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
                        name, price, description: desc,
                        img: imgData || PLACEHOLDER_IMG
                    };
                    products.unshift(newP);
                    saveProducts(products);
                }
                $('#productModal').modal('hide');
                resetForm();
                render();
            }

            if (file) {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    commitAndClose(ev.target.result);
                };
                reader.readAsDataURL(file);
            } else {
                if (editingId) {
                    commitAndClose(null);
                } else {
                    commitAndClose(PLACEHOLDER_IMG);
                }
            }
        });
    }

    function onImageChange() {
        const f = productImageInput.files && productImageInput.files[0];
        if (!f) { productImagePreview.src = PLACEHOLDER_IMG; return; }
        const reader = new FileReader();
        reader.onload = function (ev) { productImagePreview.src = ev.target.result; };
        reader.readAsDataURL(f);
    }

    // Export products as JSON file
    function exportProducts() {
        const products = loadProducts();
        const dataStr = JSON.stringify(products, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'products_backup_' + new Date().toISOString().slice(0, 10) + '.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    // Import products from JSON file
    function importProducts() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (ev) {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (!Array.isArray(imported)) throw new Error('Invalid format: expected array');
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
                    alert('Import berhasil! ' + imported.length + ' produk dimuat.');
                    render();
                } catch (err) {
                    alert('Import gagal: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // init
    document.addEventListener('DOMContentLoaded', async function () {
        if (!tableBody) { console.error('productsTableBody not found'); return; }

        // Detect server availability
        useServer = await checkServer();
        if (useServer) {
            console.log('✓ Server detected at ' + SERVER_URL);
        } else {
            console.log('⚠ Server unavailable, using localStorage');
        }

        // Hide add button if user is not admin
        if (addBtn && !isAdmin) {
            addBtn.style.display = 'none';
        }

        render();
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!isAdmin) { alert('Akses ditolak: hanya admin'); return; }
                editingId = null;
                productModalTitle.textContent = 'Add Product';
                resetForm();
                $('#productModal').modal('show');
            });
        }
        productForm.addEventListener('submit', onFormSubmit);
        productImageInput.addEventListener('change', onImageChange);

        // Export/Import buttons (jika ada di HTML)
        const exportBtn = document.getElementById('exportProductsBtn');
        const importBtn = document.getElementById('importProductsBtn');
        if (exportBtn) exportBtn.addEventListener('click', exportProducts);
        if (importBtn) importBtn.addEventListener('click', importProducts);
    });
})();

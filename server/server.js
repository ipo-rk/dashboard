const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
// Serve frontend static files from project root (one level up from server/)
app.use(express.static(path.join(__dirname, '..')));

// Setup storage directories
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer setup untuk file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '_' + Math.random().toString(36).substr(2, 9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Middleware: Verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
    if (!token) {
        return res.status(401).json({ error: 'Token diperlukan' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
        }
        req.user = user;
        next();
    });
}

// Utility: load products dari JSON file
function loadProducts() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('loadProducts error:', e);
    }
    return [];
}

// Utility: load users dari JSON file
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const raw = fs.readFileSync(USERS_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('loadUsers error:', e);
    }
    return [];
}

// Utility: save users ke JSON file
function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    } catch (e) {
        console.error('saveUsers error:', e);
    }
}

// Utility: save products ke JSON file
function saveProducts(products) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf-8');
    } catch (e) {
        console.error('saveProducts error:', e);
    }
}

// API: GET semua produk
app.get('/api/products', (req, res) => {
    const products = loadProducts();
    res.json(products);
});

// API: GET satu produk by ID
app.get('/api/products/:id', (req, res) => {
    const products = loadProducts();
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }
    res.json(product);
});

// API: POST produk baru (dengan atau tanpa gambar) - membutuhkan autentikasi
app.post('/api/products', authenticateToken, upload.single('image'), (req, res) => {
    const { name, price, description } = req.body;
    if (!name || !price) {
        return res.status(400).json({ error: 'Name dan price harus diisi' });
    }

    const products = loadProducts();
    const newProduct = {
        id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: name,
        price: parseFloat(price),
        description: description || '',
        img: req.file ? `/uploads/${req.file.filename}` : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22180%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22400%22 height=%22180%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E',
        createdAt: new Date().toISOString()
    };

    products.unshift(newProduct);
    saveProducts(products);
    res.status(201).json(newProduct);
});

// Auth: Register
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password harus diisi' });
    }

    const users = loadUsers();
    const exists = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (exists) {
        return res.status(409).json({ error: 'Email sudah terdaftar' });
    }

    const hashed = bcrypt.hashSync(password, 8);
    const newUser = {
        id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: name || '',
        email: email.toLowerCase(),
        password: hashed,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    const safeUser = Object.assign({}, newUser);
    delete safeUser.password;
    res.status(201).json(safeUser);
});

// JWT authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token dibutuhkan' });
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Format token salah' });
    const token = parts[1];
    jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change', (err, payload) => {
        if (err) return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
        req.user = payload;
        next();
    });
}

// Auth: Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password harus diisi' });
    }

    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user) {
        return res.status(401).json({ error: 'Email atau password salah' });
    }

    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) {
        return res.status(401).json({ error: 'Email atau password salah' });
    }

    const payload = { id: user.id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret_change', { expiresIn: '12h' });

    const safeUser = Object.assign({}, user);
    delete safeUser.password;
    res.json({ token, user: safeUser });
});

// API: PUT update produk - membutuhkan autentikasi
app.put('/api/products/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { name, price, description } = req.body;
    const products = loadProducts();
    const idx = products.findIndex(p => p.id === req.params.id);

    if (idx === -1) {
        return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    if (name) products[idx].name = name;
    if (price) products[idx].price = parseFloat(price);
    if (description !== undefined) products[idx].description = description;
    if (req.file) {
        // Delete old image if exists
        const oldImg = products[idx].img;
        if (oldImg && oldImg.startsWith('/uploads/')) {
            const oldPath = path.join(UPLOAD_DIR, path.basename(oldImg));
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        products[idx].img = `/uploads/${req.file.filename}`;
    }
    products[idx].updatedAt = new Date().toISOString();

    saveProducts(products);
    res.json(products[idx]);
});

// API: DELETE produk - membutuhkan autentikasi
app.delete('/api/products/:id', authenticateToken, (req, res) => {
    const products = loadProducts();
    const idx = products.findIndex(p => p.id === req.params.id);

    if (idx === -1) {
        return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    const product = products[idx];
    // Delete image file if exists
    if (product.img && product.img.startsWith('/uploads/')) {
        const imgPath = path.join(UPLOAD_DIR, path.basename(product.img));
        if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
        }
    }

    products.splice(idx, 1);
    saveProducts(products);
    res.json({ message: 'Produk dihapus', deletedProduct: product });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 API endpoints:`);
    console.log(`   GET    /api/products`);
    console.log(`   GET    /api/products/:id`);
    console.log(`   POST   /api/products (with image) [protected]`);
    console.log(`   PUT    /api/products/:id (with image) [protected]`);
    console.log(`   DELETE /api/products/:id [protected]`);
    console.log(`   GET    /api/health`);
});

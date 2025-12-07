# 🎉 EnaAuto Coffee Dashboard

Aplikasi dashboard admin profesional untuk manajemen produk kopi dengan interface modern, responsif, dan fitur lengkap.

## 🚀 Fitur Utama

### 📊 Dashboard Overview

- **Sales Trend Chart**: Visualisasi trend penjualan bulanan dengan Chart.js
- **Product Widget**: Total produk dan nilai inventory real-time
- **Quick Add Form**: Tambah produk langsung dari dashboard

### 📦 Product Management (CRUD)

- Create: Tambah produk dengan nama, harga, deskripsi, dan upload gambar
- Read: Tampilkan list produk dengan thumbnail dan detail
- Update: Edit produk dan upload gambar baru
- Delete: Hapus produk dari sistem
- **Import/Export**: Backup dan restore data produk dalam format JSON

### 👥 Customer Management

- Lihat daftar customer
- View detail customer (nama, email, telp, total order, total belanja)

### 💬 Messages Management

- Tampilkan pesan dari customer
- Reply message dengan storage di localStorage
- Status reply tracking

### 📈 Analytics Dashboard

- **Monthly Sales Trend**: Line chart trend penjualan
- **Product Distribution**: Doughnut chart distribusi produk
- Key metrics: Revenue, Orders, AOV, Satisfaction

### ⚙️ Settings Page

- **Account Settings**: Edit profil user
- **Password Management**: Ubah password dengan validasi
- **Notification Preferences**: Atur email, SMS, newsletter notifications
- **Danger Zone**: Delete account dengan konfirmasi

## 🛠️ Tech Stack

### Frontend

- **HTML5**: Semantic markup
- **CSS3**: Modern gradient design system dengan CSS variables
- **Bootstrap 4.5.2**: Responsive framework
- **jQuery 3.5.1**: DOM manipulation
- **Chart.js 3.9.1**: Data visualization
- **W3.CSS**: Utility classes
- **Font Awesome 6.4.0**: Icons

### Backend (Optional)

- **Node.js + Express 4.18.2**: REST API server
- **Multer**: Image file upload
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment configuration

### Storage

- **localStorage**: Client-side data persistence
- **JSON File**: Server-side data storage (server/data/products.json)
- **Hybrid Mode**: Auto-detect server, fallback ke localStorage

## 📁 Project Structure

```
dashboard/
├── index.html              # Dashboard homepage
├── products.html           # Product CRUD page
├── customers.html          # Customer management
├── messages.html           # Message management
├── analytics.html          # Analytics & reports
├── settings.html           # User settings
├── README.md               # This file
├── assets/
│   ├── css/
│   │   └── style.css       # Modern CSS design system
│   ├── js/
│   │   ├── script.js       # Centralized page functionality
│   │   └── products.js     # Product CRUD handler
│   └── img/
│       ├── logo.png
│       └── product-img/    # Product images
└── server/                 # Optional backend
    ├── server.js           # Express app
    ├── package.json        # Dependencies
    ├── .env                # Configuration
    ├── data/
    │   └── products.json   # Product database
    └── uploads/            # Uploaded images
```

## 🎨 Design System

### Color Palette

```css
--primary: #667eea       /* Purple */
--secondary: #764ba2     /* Dark Purple */
--accent: #f093fb        /* Pink */
--dark: #2d3561          /* Dark Blue */
--lighter: #f9fafb       /* Off-white */
```

### Modern Features

- Gradient backgrounds on header, sidebar, buttons, cards
- Smooth transitions (cubic-bezier timing)
- Enhanced shadows for depth
- Responsive design (1024px, 768px breakpoints)
- Keyframe animations (slideInLeft, fadeIn)

## 🚀 Getting Started

### 1. Setup Frontend

```bash
# Open dalam browser (gunakan Live Server)
# File: index.html
# URL: http://localhost:5500 (atau port Live Server Anda)
```

### 2. Setup Backend (Optional)

```bash
# Navigate ke folder server
cd server

# Install dependencies
npm install

# Buat .env file dengan:
PORT=5000
NODE_ENV=development

# Run server
npm start

# Server akan jalan di http://localhost:5000
```

## 📝 API Endpoints (Backend)

Jika server running, dashboard akan otomatis use API. Jika tidak, gunakan localStorage.

```
GET    /api/products           # Fetch all products
GET    /api/products/:id       # Fetch one product
POST   /api/products           # Create product (with image)
PUT    /api/products/:id       # Update product (with image)
DELETE /api/products/:id       # Delete product
GET    /api/health             # Server health check
```

## 💾 Data Storage

### localStorage Keys

- `ena_products_v1`: Product list (JSON)
- `userSettings`: User account settings
- `userPassword`: Hashed password
- `notificationSettings`: Notification preferences
- `messageReplies`: Customer message replies

### Server Storage

- `server/data/products.json`: Product database
- `server/uploads/`: Uploaded product images

## 🔧 Configuration

### In `assets/js/script.js`

```javascript
const STORAGE_KEY = "ena_products_v1";
const SERVER_URL = "http://localhost:5000/api";
```

### In `server/.env`

```
PORT=5000
NODE_ENV=development
```

## 🎯 Usage Guide

### Add Product

1. Dashboard: Gunakan Quick Add Form (nama + harga)
2. Products: Klik "Add Product" untuk detail lengkap (+ upload gambar)

### Edit Product

1. Buka Products page
2. Klik "Edit" pada produk yang ingin diubah
3. Ubah data dan gambar (jika ada)
4. Klik "Update"

### Delete Product

1. Buka Products page
2. Klik "Delete" pada produk
3. Konfirmasi penghapusan

### Export/Import Data

1. Buka Products page
2. **Export**: Klik "Export to JSON" → file akan terdownload
3. **Import**: Klik "Import from JSON" → pilih file JSON

### View Analytics

1. Buka Analytics page
2. Lihat sales trend dan product distribution
3. View key metrics (revenue, orders, AOV, satisfaction)

### Manage Settings

1. Buka Settings page
2. Update account info, password, atau notification preferences
3. Data akan tersimpan di localStorage

## 🔒 Security Notes

- Password tersimpan di localStorage (tidak di-hash untuk demo)
- Untuk production: gunakan proper hashing (bcrypt) di backend
- CORS enabled hanya untuk localhost
- Validasi input dilakukan di client dan server

## 🐛 Troubleshooting

### jQuery 404 Error

✓ Solved: jQuery loaded sebelum Bootstrap JS

### Image 404 Error

✓ Solved: SVG placeholder data URIs + fallback images

### Server Connection Error

✓ Handled: Auto-fallback ke localStorage

### Page Navigation Issue

✓ Solved: Active nav item detection based on pathname

## 📱 Responsive Design

- **Desktop** (1024px+): Full sidebar navigation
- **Tablet** (768px): Optimized layout
- **Mobile** (<768px): Responsive cards dan forms

## 🎓 Learning Outcomes

- Modern CSS design system dengan variables dan gradients
- Centralized JavaScript with page auto-detection
- REST API implementation dengan Express
- File upload handling dengan Multer
- Data persistence dengan localStorage + JSON
- Hybrid architecture (client + server)
- Chart.js data visualization
- Bootstrap responsive framework

## 📚 Technologies Learned

✅ HTML5 Semantic Markup
✅ CSS3 Gradients, Animations, Variables
✅ JavaScript ES6+ (async/await, fetch API)
✅ jQuery DOM Manipulation
✅ Bootstrap Framework
✅ Chart.js Charting Library
✅ Express.js Backend
✅ REST API Design
✅ File Upload (Multer)
✅ localStorage Data Persistence
✅ Responsive Web Design

## 📄 License

Educational project. Feel free to use for learning purposes.

## 👨‍💻 Author

**Devp Rick11** - Coffee Dashboard Developer

---

**Created**: 2024
**Last Updated**: 2024
**Version**: 2.0 (Modern CSS + Centralized Scripts)

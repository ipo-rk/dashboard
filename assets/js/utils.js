// Utility functions for Dashboard App

const API_BASE = 'http://localhost:5000/api';

// ========== VALIDATORS ==========

/**
 * Validate email format
 */
export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate password strength (min 6 chars, at least 1 number or special char)
 */
export function validatePassword(password) {
  if (password.length < 6) {
    return { valid: false, error: 'Password minimal 6 karakter' };
  }
  const hasNumberOrSpecial = /[0-9!@#$%^&*]/.test(password);
  if (!hasNumberOrSpecial) {
    return { valid: false, error: 'Password harus berisi angka atau karakter khusus' };
  }
  return { valid: true };
}

/**
 * Validate product name
 */
export function validateProductName(name) {
  if (!name || name.trim().length < 2) {
    return { valid: false, error: 'Nama produk minimal 2 karakter' };
  }
  return { valid: true };
}

/**
 * Validate product price
 */
export function validateProductPrice(price) {
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Harga harus berupa angka positif' };
  }
  return { valid: true };
}

// ========== AUTH HELPERS ==========

/**
 * Get auth token from localStorage
 */
export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

/**
 * Get auth user from localStorage
 */
export function getAuthUser() {
  const user = localStorage.getItem('auth_user');
  return user ? JSON.parse(user) : null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Check if user is admin
 */
export function isAdmin() {
  const user = getAuthUser();
  return user && user.role === 'admin';
}

/**
 * Logout user
 */
export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  window.location.href = 'login.html';
}

// ========== API CALLS ==========

/**
 * Generic fetch with error handling
 */
async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Register new user
 */
export async function register(name, email, password) {
  return apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/**
 * Login user
 */
export async function login(email, password) {
  const data = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // Store token and user
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('auth_user', JSON.stringify(data.user));

  return data;
}

/**
 * Get all products
 */
export async function getProducts() {
  return apiCall('/products', { method: 'GET' });
}

/**
 * Get single product
 */
export async function getProduct(id) {
  return apiCall(`/products/${id}`, { method: 'GET' });
}

/**
 * Create new product
 */
export async function createProduct(name, price, description, imageFile = null) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('price', price);
  formData.append('description', description);
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Gagal menambah produk');
  }

  return data;
}

/**
 * Update product
 */
export async function updateProduct(id, name, price, description, imageFile = null) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('price', price);
  formData.append('description', description);
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Gagal mengubah produk');
  }

  return data;
}

/**
 * Delete product
 */
export async function deleteProduct(id) {
  return apiCall(`/products/${id}`, { method: 'DELETE' });
}

/**
 * Format currency (IDR)
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Require authentication redirect
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Search/filter products by name or description
 */
export function searchProducts(products, query) {
  if (!query.trim()) return products;
  const q = query.toLowerCase();
  return products.filter(p => 
    p.name.toLowerCase().includes(q) || 
    p.description.toLowerCase().includes(q)
  );
}

/**
 * Show notification
 */
export function showNotification(message, type = 'info', duration = 3000) {
  const notif = document.createElement('div');
  notif.className = `notification notification-${type}`;
  notif.textContent = message;
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 4px;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
    ${type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
    ${type === 'info' ? 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;' : ''}
  `;

  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  }, duration);
}

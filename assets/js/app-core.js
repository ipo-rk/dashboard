// app-core.js — Shared runtime constants and lightweight helpers
(function () {
    // Define placeholders only if not already defined by another script
    if (!window.PLACEHOLDER_IMG) {
        window.PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22180%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22400%22 height=%22180%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
    }
    if (!window.PLACEHOLDER_THUMBNAIL) {
        window.PLACEHOLDER_THUMBNAIL = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2260%22%3E%3Crect fill=%22%23e0e0e0%22 width=%2280%22 height=%2260%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2212%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo img%3C/text%3E%3C/svg%3E';
    }

    // Default server url and storage key (do not override if present)
    window.SERVER_URL = window.SERVER_URL || 'http://localhost:5000/api';
    window.STORAGE_KEY = window.STORAGE_KEY || 'ena_products_v1';

    // Provide a safe checkServer if none exists yet
    if (!window.checkServer) {
        window.checkServer = async function () {
            try {
                const res = await fetch(`${window.SERVER_URL}/health`, { method: 'GET' });
                return res.ok;
            } catch (e) {
                return false;
            }
        };
    }

    // Small helper to resolve image paths to absolute URLs
    if (!window.getImageUrl) {
        window.getImageUrl = function (imgPath) {
            if (!imgPath) return window.PLACEHOLDER_IMG;
            if (imgPath.startsWith('data:') || imgPath.startsWith('http')) return imgPath;
            if (imgPath.startsWith('/uploads/')) return window.SERVER_URL.replace('/api', '') + imgPath;
            return imgPath;
        };
    }

    // Shared appCore namespace for common async operations
    if (!window.appCore) {
        window.appCore = {};
    }

    // loadProducts: try server, fallback to localStorage
    window.appCore.loadProducts = async function () {
        const STORAGE_KEY = window.STORAGE_KEY || 'ena_products_v1';
        const SERVER_URL = window.SERVER_URL || 'http://localhost:5000/api';
        let useServer = false;
        try {
            useServer = await window.checkServer();
        } catch (e) {
            useServer = false;
        }

        if (useServer) {
            try {
                const res = await fetch(`${SERVER_URL}/products`);
                if (res.ok) {
                    const products = await res.json();
                    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch (e) {}
                    return products;
                }
            } catch (e) {
                // fallback to localStorage
                try { console.warn('appCore.loadProducts: server fetch failed, fallback to localStorage'); } catch (e) {}
            }
        }

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            console.error('appCore.loadProducts parse error', e);
            return [];
        }
    };

    window.appCore.saveProducts = function (products) {
        try { localStorage.setItem(window.STORAGE_KEY || 'ena_products_v1', JSON.stringify(products)); } catch (e) {}
    };

})();

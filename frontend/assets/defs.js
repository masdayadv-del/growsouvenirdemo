
// === TAILWIND CONFIG ===
tailwind.config = {
    theme: {
        extend: {
            colors: { brand: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' } },
            fontFamily: { sans: ['"Plus Jakarta Sans"', 'sans-serif'] },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                'soft': '0 4px 20px -5px rgba(0,0,0,0.05)',
                'glow': '0 0 15px rgba(59, 130, 246, 0.3)'
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite'
            }
        }
    }
}


// === GLOBAL CONSTANTS ===
// IMPORTANT: This URL MUST be the "Web App URL" from your Google Apps Script Deployment
const API_URL = "https://script.google.com/macros/s/AKfycbw6PbD-s3wnVIob71eTqCPrMgLgOYJL93mLPqN9H6R_5RhaCvxeel46JUDzh7jwDPgP/exec";
const ENCRYPTION_KEY = "GROW_2026_SECRET_KEY_XYZ"; // Change this in production!

// === ENCRYPTION HELPERS ===
const SecureStorage = {
    encrypt(data) {
        if (!window.CryptoJS) return JSON.stringify(data);
        return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    },
    decrypt(encryptedData) {
        if (!encryptedData) return null;
        if (!window.CryptoJS) {
            try { return JSON.parse(encryptedData); } catch { return null; }
        }
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            return decrypted ? JSON.parse(decrypted) : null;
        } catch (e) {
            console.warn('Decryption failed, trying plain parse:', e);
            try { return JSON.parse(encryptedData); } catch { return null; }
        }
    },
    set(key, data) {
        const encrypted = this.encrypt(data);
        localStorage.setItem(key, encrypted);
    },
    get(key) {
        const encrypted = localStorage.getItem(key);
        return this.decrypt(encrypted);
    }
};

// === GLOBAL ERROR LOGGING (NEW) ===
window.onerror = function (message, source, lineno, colno, error) {
    console.error("Global Error:", message);
    // In the future, send this to API
    // fetch(API_URL + "?action=logError", { ... })
};

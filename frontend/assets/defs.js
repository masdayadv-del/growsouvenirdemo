// === GLOBAL CONSTANTS ===
// IMPORTANT: This URL MUST be the "Web App URL" from your Google Apps Script Deployment
const API_URL = "https://script.google.com/macros/s/AKfycbzV1crsJVD0kT7T6vtunmqINxWkJuf8rguX14iA5wv-ozuKS-vky6HFw0yLAG_nnjaB/exec";
const ENCRYPTION_KEY = "GROW_2026_SECRET_KEY_XYZ"; // Change this in production!

// === ENCRYPTION HELPERS ===
// XOR + Base64 ringan (0 KB library, Unicode-safe)
const SecureStorage = {
    _xor(str) {
        let out = '';
        for (let i = 0; i < str.length; i++) {
            out += String.fromCharCode(str.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
        }
        return out;
    },
    _toBase64(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
    },
    _fromBase64(b64) {
        return decodeURIComponent(Array.from(atob(b64), c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    },
    encrypt(data, keyName) {
        const json = JSON.stringify(data);
        if (keyName === 'grow_data_cache') return json;
        return this._toBase64(this._xor(json));
    },
    decrypt(raw, keyName) {
        if (!raw) return null;
        try {
            if (keyName === 'grow_data_cache') return JSON.parse(raw);
            // Deteksi format CryptoJS lama → fallback ke plain parse
            if (raw.startsWith('U2FsdGVkX1')) throw new Error('Legacy AES format');
            return JSON.parse(this._xor(this._fromBase64(raw)));
        } catch (e) {
            try { return JSON.parse(raw); } catch { return null; }
        }
    },
    set(key, data) { localStorage.setItem(key, this.encrypt(data, key)); },
    get(key) { return this.decrypt(localStorage.getItem(key), key); }
};


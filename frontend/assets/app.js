
function app() {
    return {
        currentUser: SecureStorage.get('grow_user') || null,
        loginForm: { u: '', p: '' },
        isLogoutOpen: false, isDetailOpen: false, loadingDetail: false, selectedDetail: null, detailItems: [],

        tab: 'home', initialLoading: true, bgProcess: false, loading: false, loadingPdf: false, notifications: [], isMasterOpen: false, isSetorOpen: false, isDeleteOpen: false, isDeleteDepositOpen: false, deleteId: null, deleteDate: null, deleteDepositIndex: null, isOffline: false, loadingData: true,
        isFixDBOpen: false, fixLogs: null, isFixResultOpen: false,
        isSensitiveHidden: localStorage.getItem('grow_privacy_mode') === 'true',
        // Server Search
        isSearchingServer: false, serverSearchResults: [], showServerResults: false,
        // Payment Tracking State (NEW)
        isPaymentModalOpen: false, paymentForm: { transactionId: '', transactionDate: '', nominal: '', keterangan: '', currentSisa: 0 }, paymentHistory: [], loadingPayment: false,
        allProducts: [], categories: [], history: [], expenses: [], deposits: [],
        customers: [], expenseDescriptions: [],
        stats: { omzet: 0, grossProfit: 0, netProfit: 0, totalExpense: 0, totalHPP: 0 },
        modalStats: { modalGantung: 0, totalHPP: 0, totalDisetor: 0 },
        historyKPI: { all: { count: 0, total: 0 }, lunas: { count: 0, total: 0 }, belum: { count: 0, total: 0 } },
        filterDate: '', isService: false, selectedCategory: "", filterStatus: '', productSearch: '', showProductList: false,
        searchQuery: '', filterStartDate: '', filterEndDate: '', quickFilter: '',

        // === OFFLINE QUEUE SYSTEM ===
        pendingQueue: SecureStorage.get('grow_pending_queue') || [],
        isOnline: navigator.onLine,
        syncInProgress: false,

        expFilterStart: '', expFilterEnd: '', expQuickFilter: '',
        form: { id: null, customer: '', productName: '', serviceName: '', qty: 1, sellPrice: '', costPrice: '', dp: 0, deadline: '' }, newProd: { category: '', name: '' }, setorForm: { amount: '', note: '', bank: 'Mandiri', editIndex: null, id: null }, expForm: { id: null, category: '', desc: '', amount: '' }, deleteType: 'transaction',
        cart: [], loadingText: 'MENGHUBUNGKAN...', loadingMessages: ['MENYAMBUNGKAN SERVER...', 'SINKRONISASI DATA...', '🔓 ENKRIPSI AKTIF...', 'MEMUAT DASHBOARD...', 'MENYIAPKAN TRANSAKSI...'], timeString: '', dateString: '',
        topProduct: { name: '-', qty: 0 },
        reportDate: { month: new Date().getMonth(), year: new Date().getFullYear() },

        // USER MGMT STATE
        users: [], showWelcome: false, isUserModalOpen: false, deleteUserItem: null,
        currUserForm: { username: '', password: '', role: 'Kasir', name: '', photo: '', isEdit: false },

        // LOGS STATE
        logs: [], loadingLogs: false, logFilterUser: '', logFilterAction: '',
        selectedLog: null, isLogDetailOpen: false,

        // EXPENSE DETAIL STATE
        selectedExpense: null, isExpenseDetailOpen: false,

        viewExpenseDetail(ex) {
            this.selectedExpense = ex;
            this.isExpenseDetailOpen = true;
            this.vibrate();
        },

        viewLogDetail(log) {
            this.selectedLog = { ...log };
            try {
                if (typeof log.details === 'string') {
                    this.selectedLog.parsedDetails = JSON.parse(log.details);
                } else {
                    this.selectedLog.parsedDetails = log.details;
                }
            } catch (e) {
                this.selectedLog.parsedDetails = { error: "Invalid JSON format", raw: log.details };
            }
            this.isLogDetailOpen = true;
            this.vibrate();
        },
        closeLogDetail() { this.isLogDetailOpen = false; setTimeout(() => this.selectedLog = null, 300); },

        init() {
            setInterval(() => this.updateTime(), 1000); this.updateTime();

            // === CONNECTION MONITORING ===
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.notify('🟢 Koneksi Kembali! Sinkronisasi...', 'success');
                this.processPendingQueue();
            });

            window.addEventListener('offline', () => {
                this.isOnline = false;
                this.notify('🔴 Mode Offline - Data disimpan lokal', 'error');
            });

            // Setup loading message animation
            let msgIndex = 0;
            const msgInterval = setInterval(() => {
                this.loadingText = this.loadingMessages[msgIndex];
                msgIndex = (msgIndex + 1) % this.loadingMessages.length;
            }, 800);

            // Setup cart watcher BEFORE restoring (to avoid race condition)
            this.$watch('cart', (val) => localStorage.setItem('grow_cart_backup', JSON.stringify(val)));
            this.$watch('isSensitiveHidden', (val) => localStorage.setItem('grow_privacy_mode', val));

            // Restore cart from backup (single source of truth)
            this.restoreCart();

            // Start app or show login (SINGLE call to startApp)
            if (this.currentUser) {
                this.startApp(msgInterval);
            } else {
                this.initialLoading = false;
                clearInterval(msgInterval);
            }
        },

        updateTime() { const now = new Date(); this.timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); this.dateString = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
        restoreCart() {
            const backup = localStorage.getItem('grow_cart_backup');
            if (backup) {
                try {
                    this.cart = JSON.parse(backup);
                } catch (e) {
                    console.error("Failed to restore cart", e);
                }
            }
        },
        get greeting() { const h = new Date().getHours(); if (h < 11) return 'Selamat Pagi'; if (h < 15) return 'Selamat Siang'; if (h < 18) return 'Selamat Sore'; return 'Selamat Malam'; },
        startApp(interval) { fetch(`${API_URL}?action=ping`, { mode: 'no-cors' }); this.fetch(true).then(() => { if (interval) clearInterval(interval); }); },
        vibrate() { if (navigator.vibrate) navigator.vibrate(15); },

        async login() {
            if (!this.loginForm.u || !this.loginForm.p) return this.notify("Isi Username & Password!", 'error');

            this.bgProcess = true;

            try {
                const response = await fetch(`${API_URL}?action=login`, {
                    method: 'POST',
                    redirect: "follow",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({ username: this.loginForm.u, password: this.loginForm.p })
                });

                const res = await response.json();

                if (res.success) {
                    this.currentUser = res.user;
                    SecureStorage.set('grow_user', res.user);
                    if (res.token) {
                        SecureStorage.set('grow_session_token', res.token);
                    }
                    this.loginForm = { u: '', p: '' };
                    this.initialLoading = true;
                    this.showWelcome = true; // Show Welcome
                    this.startApp();
                } else {
                    // Enhanced error message
                    const errorMsg = res.message || 'Username atau Password salah!';
                    this.notify(errorMsg, 'error');
                    this.bgProcess = false;

                    // Shake animation for login form
                    const loginCard = document.querySelector('.login-card');
                    if (loginCard) {
                        loginCard.classList.add('animate-shake');
                        setTimeout(() => loginCard.classList.remove('animate-shake'), 500);
                    }
                }
            } catch (e) {
                this.notify("Gagal Login: Cek Koneksi Internet", 'error');
                this.bgProcess = false;
            }
        },
        logout() {
            // Confirmation handled by modal UI
            this.currentUser = null;
            SecureStorage.set('grow_user', null);
            this.isLogoutOpen = false;
            this.tab = 'home';
            // Optional: clear cart on logout
            // this.cart = []; 
            // localStorage.removeItem('grow_cart_backup');
            this.notify('Berhasil Keluar', 'success');
        },

        // USER MANAGEMENT FUNCTIONS
        async fetchUsers() {
            this.loadingData = true;
            this.users = []; // Clear to show skeletons
            const res = await this.api('getUsers');
            if (res && res.success) { this.users = res.users; }
            this.loadingData = false;
        },
        openUserModal(u = null) {
            if (u) {
                this.currUserForm = { ...u, isEdit: true, password: '' };
            } else {
                this.currUserForm = { username: '', password: '', role: 'Kasir', name: '', photo: '', isEdit: false };
            }
            this.isUserModalOpen = true;
        },

        // === DATABASE MAINTENANCE ===
        confirmFixDB() {
            this.isFixDBOpen = true;
            this.vibrate();
        },

        executeFixDB() {
            this.isFixDBOpen = false;
            this.bgProcess = true;
            this.notify("Memulai perbaikan database...", "info");

            // API_TOKEN is not in scope here if in JS_Defs, but global consts are shared 
            // However, we removed API_TOKEN from JS_Defs in V27 update.
            // We should use SESSION TOKEN logic here (Code.gs was updated to check session)
            // The fixDatabaseSchema action might require session auth now.

            // Construct payload
            const payload = { action: "fixDatabaseSchema" };
            const token = SecureStorage.get('grow_session_token');
            if (token) payload.token = token;

            fetch(`${API_URL}?action=fixDatabaseSchema`, {
                method: 'POST',
                redirect: "follow",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            })
                .then(r => r.json())
                .then(data => {
                    this.bgProcess = false;
                    if (data.success) {
                        this.fixLogs = "Log Perbaikan:\n" + (data.logs ? data.logs.join("\n") : "No logs");
                        this.isFixResultOpen = true; // Show Result Modal
                        this.notify("✅ Database Berhasil Diperbaiki!", "success");
                    } else {
                        this.notify("Gagal: " + data.message, "error");
                    }
                })
                .catch(e => {
                    this.bgProcess = false;
                    this.notify("Error koneksi: " + e.message, "error");
                });
        },

        editUser(u) { this.openUserModal(u); },
        async saveUserSubmit() {
            // Validation
            if (!this.currUserForm.username?.trim()) {
                return this.notify("Username wajib diisi", 'error');
            }
            if (!this.currUserForm.password?.trim()) {
                return this.notify("Password wajib diisi", 'error');
            }
            if (!this.currUserForm.name?.trim()) {
                return this.notify("Nama lengkap wajib diisi", 'error');
            }

            this.bgProcess = true;
            try {
                const res = await this.api('saveUser', this.currUserForm);
                if (res && res.success) {
                    this.notify("Data karyawan tersimpan", 'success');
                    this.isUserModalOpen = false;
                    this.fetchUsers();
                } else {
                    this.notify(res?.message || "Gagal menyimpan (Cek Koneksi/Permission)", 'error');
                }
            } catch (e) {
                this.notify("Error: " + e.message, 'error');
            } finally {
                this.bgProcess = false;
            }
        },
        async fetchLogs() {
            this.loadingLogs = true;
            try {
                // Fix: Use generic api wrapper instead of fetch
                const res = await this.api('getLogs');
                if (res && res.success) {
                    this.logs = res.logs;
                }
            } catch (e) { console.error(e); } finally { this.loadingLogs = false; }
        },
        handlePhotoUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) return this.notify("Ukuran foto max 2MB", 'error');
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_SIZE = 128; // Reduced size to safe limit
                    let width = img.width, height = img.height;
                    if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
                    else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                    canvas.width = width; canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                    this.currUserForm.photo = dataUrl; // Lower quality
                    this.notify(`Foto Siap! Ukuran: ${Math.round(dataUrl.length / 1024)}KB`, "success");
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        },
        confirmDeleteUser(u) {
            this.deleteId = u.username;
            this.deleteType = 'user';
            this.isDeleteOpen = true;
            this.deleteUserItem = u;
        },
        notify(e, t = 'success') { const n = Date.now(); this.notifications.push({ id: n, message: e, type: t }); setTimeout(() => this.notifications = this.notifications.filter(e => e.id !== n), 1500); },


        async api(action, payload = null) {
            if (!navigator.onLine) { this.notify("Anda sedang Offline!", 'error'); return null; }

            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 30000); // 30s Timeout (GAS can be slow)

            const url = `${API_URL}?action=${action}`;
            const bodyData = payload || {};

            // Attach Session Token
            const sessionToken = SecureStorage.get('grow_session_token');
            if (sessionToken) bodyData.token = sessionToken;


            try {
                const response = await fetch(url, {
                    method: 'POST',
                    redirect: "follow",
                    signal: controller.signal,
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify(bodyData)
                });
                clearTimeout(id);

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                // Attempt to parse JSON
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    if (data && data.success === false) {
                        if (data.message.includes("Token") || data.message.includes("Sesi")) {
                            this.notify("Sesi Habis - Login Ulang", 'error');
                            this.logout(); // Auto logout on invalid token
                            return null;
                        }
                        // Conflict Detection (NEW)
                        if (data.message.includes("CONFLICT")) {
                            // Let caller handle or notify here
                            // We will throw error so save() can handle it
                            throw new Error("CONFLICT");
                        }
                    }
                    return data;
                } catch (e) {
                    if (e.message === "CONFLICT") throw e;
                    console.error("API Non-JSON Response:", text);
                    throw new Error("Respon Server Masalah (HTML/Auth)");
                }

            } catch (error) {
                // console.error("API Error:", error); // Reduce noise
                clearTimeout(id);
                if (error.message === "CONFLICT") throw error; // Re-throw conflict

                if (error.name === 'AbortError') {
                    this.notify("Koneksi Timeout (Lambat)", 'error');
                } else {
                    this.notify(error.message || "Koneksi Gagal", 'error');
                }
                return null;
            }
        },

        async fetch(isInitial = false) {
            this.loading = true;
            if (isInitial) {
                const cache = SecureStorage.get('grow_data_cache');
                if (cache) {
                    this.applyData(cache);
                }
            }
            const e = await this.api('getInitialData');
            if (e) {
                this.applyData(e);
                SecureStorage.set('grow_data_cache', e);
                this.loadingData = false;
                this.initialLoading = false;
            }
            this.loading = false;
        },

        async searchServer() {
            if (!this.searchQuery || this.searchQuery.length < 3) return this.notify("Ketik minimal 3 huruf", "info");

            this.isSearchingServer = true;
            this.showServerResults = true;
            this.serverSearchResults = []; // Clear

            try {
                const res = await this.api('searchTransactions', {
                    query: this.searchQuery,
                    startDate: this.filterStartDate,
                    endDate: this.filterEndDate
                });

                if (res && res.success) {
                    this.serverSearchResults = res.history;
                    if (res.history.length === 0) this.notify("Tidak ditemukan di server", "info");
                } else {
                    this.notify("Gagal mencari di server", "error");
                }
            } catch (e) {
                this.notify("Error koneksi", "error");
            } finally {
                this.isSearchingServer = false;
            }
        },

        // Pindahkan logika mapping data ke fungsi terpisah agar rapi
        applyData(e) {
            this.allProducts = e.products || [];
            this.categories = [...new Set(this.allProducts.map(p => p.category))];
            this.history = e.history || [];
            this.expenses = e.expenses || [];
            this.deposits = e.deposits || [];
            this.customers = e.customers || []; // New Customer List
            this.expenseDescriptions = e.expenseDescriptions || []; // New Expense Desc List
            this.modalStats = e.modalStats || { modalGantung: 0, totalHPP: 0, totalDisetor: 0 };
            this.stats = e.stats || { omzet: 0, grossProfit: 0, netProfit: 0, totalExpense: 0, totalHPP: 0 };
            this.historyKPI = e.historyKPI || { all: { count: 0, total: 0 }, lunas: { count: 0, total: 0 }, belum: { count: 0, total: 0 } };
            this.topProduct = e.topProduct || { name: '-', qty: 0 }; // Top Product Binding
            this.loadingData = false;
        },

        editCartItem(index) {
            const item = this.cart[index];
            if (!item) return;

            // Clear form first to prevent collision
            this.form.productName = '';
            this.form.serviceName = '';
            this.productSearch = '';
            this.form.qty = 1;
            this.form.sellPrice = '';
            this.form.costPrice = '';

            // Detect if service or product
            const isService = item.productName.startsWith('[JASA] ');
            this.isService = isService;

            if (isService) {
                this.form.serviceName = item.productName.replace('[JASA] ', '');
            } else {
                this.form.productName = item.productName;
                this.productSearch = item.productName;
            }

            this.form.qty = item.qty;
            this.form.sellPrice = item.sellPrice;
            this.form.costPrice = item.costPrice;

            // Remove from cart
            this.cart.splice(index, 1);
            this.vibrate();
            this.notify("Item dikembalikan ke form untuk diedit", 'info');

            // Scroll to form top if needed (optional)
            const formEl = document.getElementById('transactionForm');
            if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
        },

        get filteredProducts() {
            if (!this.productSearch) return [];
            const lower = this.productSearch.toLowerCase();
            return this.allProducts.filter(p => p.name.toLowerCase().includes(lower) || p.category.toLowerCase().includes(lower)).slice(0, 10);
        },
        get filteredHistory() {
            return this.history.filter(e => {
                // Search filter (customer, product, or ID) with null safety
                const searchLower = (this.searchQuery || '').toLowerCase();
                const customerMatch = (e.customer || '').toLowerCase().includes(searchLower);
                const productMatch = (e.product || '').toLowerCase().includes(searchLower);
                const idMatch = (e.id || '').toLowerCase().includes(searchLower);
                const matchSearch = !this.searchQuery || customerMatch || productMatch || idMatch;

                // Date range filter with validation
                let matchDate = true;
                let startDate = this.filterStartDate;
                let endDate = this.filterEndDate;

                // Auto-swap if dates are reversed
                if (startDate && endDate && endDate < startDate) {
                    [startDate, endDate] = [endDate, startDate];
                }

                if (startDate && e.isoDate < startDate) matchDate = false;
                if (endDate && e.isoDate > endDate) matchDate = false;

                // Status filter
                const matchStatus = this.filterStatus ? e.status === this.filterStatus : true;

                return matchSearch && matchDate && matchStatus;
            });
        },

        setQuickFilter(type) {
            this.quickFilter = type;
            this.showServerResults = false; // Reset server search on filter change
            const today = new Date();
            const formatDate = (d) => d.toISOString().split('T')[0];

            if (type === 'today') {
                this.filterStartDate = formatDate(today);
                this.filterEndDate = formatDate(today);
            } else if (type === 'week') {
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay()); // Sunday
                this.filterStartDate = formatDate(weekStart);
                this.filterEndDate = formatDate(today);
            } else if (type === 'month') {
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                this.filterStartDate = formatDate(monthStart);
                this.filterEndDate = formatDate(today);
            } else if (type === 'all') {
                this.filterStartDate = '';
                this.filterEndDate = '';
            } else if (type === 'custom') {
                // Don't set dates, let user choose
            } else {
                // Clear filter
                this.filterStartDate = '';
                this.filterEndDate = '';
                this.quickFilter = '';
            }
        },

        setExpenseQuickFilter(type) {
            this.expQuickFilter = type;
            const today = new Date();
            const formatDate = (d) => d.toISOString().split('T')[0];

            if (type === 'today') {
                this.expFilterStart = formatDate(today);
                this.expFilterEnd = formatDate(today);
            } else if (type === 'week') {
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay()); // Sunday
                this.expFilterStart = formatDate(weekStart);
                this.expFilterEnd = formatDate(today);
            } else if (type === 'month') {
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                this.expFilterStart = formatDate(monthStart);
                this.expFilterEnd = formatDate(today);
            } else if (type === 'all') {
                this.expFilterStart = '';
                this.expFilterEnd = '';
            } else if (type === 'custom') {
                // Let user choose
            }
        },
        get filteredExpenses() {
            return this.expenses.filter(e => {
                // Jika tidak ada filter, tampilkan semua
                if (!this.expFilterStart && !this.expFilterEnd) return true;

                // Jika expense tidak punya isoDate, tetap tampilkan (backward compatibility)
                if (!e.isoDate) return true;

                const expenseDate = e.isoDate; // Format: yyyy-MM-dd

                // Filter berdasarkan start date
                if (this.expFilterStart) {
                    if (expenseDate < this.expFilterStart) return false;
                }

                // Filter berdasarkan end date
                if (this.expFilterEnd) {
                    if (expenseDate > this.expFilterEnd) return false;
                }

                return true;
            });
        },
        get filteredExpenseTotal() {
            // Logic: Jika user sedang filter tanggal, hitung total dari yang tampil (filtered).
            // Jika tidak (default view), tampilkan "Total Keluar Bulan Ini" dari server (stats.totalExpense) agar sesuai UX sebelumnya.
            if (this.expFilterStart || this.expFilterEnd) {
                return this.filteredExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
            }
            return this.stats.totalExpense;
        },
        get expenseKPIs() {
            const filtered = this.filteredExpenses;
            const total = filtered.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
            const count = filtered.length;

            // Hitung kategori terboros
            const catMap = {};
            filtered.forEach(e => {
                const cat = e.cat || 'Lainnya';
                if (!catMap[cat]) catMap[cat] = 0;
                catMap[cat] += parseFloat(e.amount) || 0;
            });

            let topCat = '-';
            let maxAmount = 0;
            for (const cat in catMap) {
                if (catMap[cat] > maxAmount) {
                    maxAmount = catMap[cat];
                    topCat = cat;
                }
            }

            return { total, count, topCat };
        },
        get cartTotal() { return this.cart.reduce((acc, item) => acc + (item.qty * item.sellPrice), 0); },

        daysLeft(e) {
            if (!e) return null;

            // 1. Ambil Waktu Hari Ini (Jam dinolkan)
            const t = new Date();
            t.setHours(0, 0, 0, 0);

            // 2. Ambil Waktu Deadline
            const a = new Date(e);
            // FIX: Paksa deadline jadi jam 00:00 lokal juga, agar tidak ada sisa jam
            if (a.getHours() !== 0) a.setHours(0, 0, 0, 0);

            // 3. Hitung Selisih Hari
            const n = Math.ceil((a - t) / 864e5);

            if (n < 0) return { text: 'TERLEWAT', class: 'bg-red-500 animate-pulse-slow' };
            if (0 === n) return { text: 'HARI INI', class: 'bg-orange-500 animate-bounce-slow' };
            if (1 === n) return { text: 'BESOK', class: 'bg-brand-500' }; // Tambahan biar lebih natural
            if (n <= 3) return { text: `H-${n}`, class: 'bg-amber-400' };
            if (n <= 7) return { text: `H-${n}`, class: 'bg-blue-400' };
            return null;
        },
        addToCart() {
            const e = this.isService ? "[JASA] " + this.form.serviceName : this.form.productName; const t = this.isService ? 0 : this.form.costPrice;
            if (!e) { this.notify("Pilih Produk/Isi Nama Jasa", 'error'); return; } if (!this.isService && (!t || t <= 0)) { this.notify("Harga Modal Wajib Diisi!", 'error'); return; } if (!this.form.qty || this.form.qty <= 0) { this.notify("Qty minimal 1", 'error'); return; } if (!this.form.sellPrice) { this.notify("Harga Jual Wajib Diisi", 'error'); return; }
            this.cart.push({ productName: e, qty: parseFloat(this.form.qty), sellPrice: parseFloat(this.form.sellPrice), costPrice: parseFloat(t) });
            this.form.productName = ''; this.form.serviceName = ''; this.form.qty = 1; this.form.sellPrice = ''; this.form.costPrice = '';
            this.productSearch = '';
        },

        formatRupiah(value) {
            if (!value && value !== 0) return '';
            let number_string = value.toString().replace(/[^,\d]/g, '').toString(),
                split = number_string.split(','),
                sisa = split[0].length % 3,
                rupiah = split[0].substr(0, sisa),
                ribuan = split[0].substr(sisa).match(/\d{3}/gi);

            if (ribuan) {
                let separator = sisa ? '.' : '';
                rupiah += separator + ribuan.join('.');
            }

            rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
            return rupiah;
        },
        cleanRupiah(value) {
            if (!value) return '';
            return Number(value.toString().replace(/\./g, ''));
        },

        // Helper for view (fmt)
        fmt(val) {
            return 'Rp ' + this.formatRupiah(val);
        },

        async save() {
            if (this.bgProcess) return; // Prevent double submit
            this.vibrate();

            // Validations
            if (!this.form.customer || this.form.customer.trim() === '') {
                return this.notify("Nama pelanggan wajib diisi", 'error');
            }
            if (this.cart.length === 0) {
                return this.notify("Keranjang Kosong", 'error');
            }

            const items = this.cart;
            const grandTotal = items.reduce((acc, item) => acc + (parseFloat(item.qty || 1) * parseFloat(item.sellPrice || 0)), 0);
            const totalModal = items.reduce((acc, item) => acc + (parseFloat(item.qty || 1) * parseFloat(item.costPrice || 0)), 0);
            const totalDP = parseFloat(this.form.dp) || 0;
            const sisa = Math.round(grandTotal - totalDP);
            const status = sisa <= 0 ? "LUNAS" : "BELUM LUNAS";
            // Profit Logic (Cash Basis)
            const cashIn = (status === 'LUNAS') ? grandTotal : totalDP;
            const profit = cashIn - totalModal;

            // NEW ITEM SNAPSHOT (Optimistic)
            const isNew = !this.form.id;
            const tempId = this.form.id || this.generateUUID(); // Robust UUID
            const now = new Date();
            const newItem = {
                id: tempId,
                displayDate: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                isoDate: new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0], // Local Date ISO
                fullDate: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                timestamp: now.toISOString(), // Preserve exact time for local edits
                customer: this.form.customer,
                product: items.length > 1 ? `${items[0].productName} (+${items.length - 1} item)` : items[0].productName,
                total: grandTotal,
                hpp: totalModal,
                dp: totalDP,
                sisa: sisa,
                status: status,
                deadline: this.form.deadline,
                cashier: this.currentUser ? (this.currentUser.name || this.currentUser.username) : 'N/A',
                // Needed for offline sync
                username: this.currentUser?.name || this.currentUser?.username || 'System',
                role: this.currentUser?.role || 'System',
                action: 'saveTransaction',

                items: JSON.parse(JSON.stringify(items)) // STORE ITEMS FOR INSTANT EDIT
            };

            // Construct payload
            const payload = { ...newItem };
            // CRITICAL FIX: To detect conflict, we must send the ORIGINAL timestamp, not the new one
            if (!isNew && this.form.originalTimestamp) {
                payload.timestamp = this.form.originalTimestamp;
            }

            // Calculate recovered capital for modal stats (needed for both update and rollback)
            const cashRec = (status === 'LUNAS') ? grandTotal : totalDP;
            const recoveredCapital = Math.min(cashRec, totalModal);

            // --- APPLY TO LOCAL STATE (OPTIMISTIC) ---
            if (isNew) {
                // 1. Add to History
                this.history.unshift(newItem);

                // 2. Update KPI Cards
                this.historyKPI.all.count++;
                this.historyKPI.all.total += grandTotal;
                if (status === 'LUNAS') {
                    this.historyKPI.lunas.count++;
                    this.historyKPI.lunas.total += grandTotal;
                } else {
                    this.historyKPI.belum.count++;
                    this.historyKPI.belum.total += sisa;
                }

                // 3. Update Dashboard Stats
                this.stats.omzet += grandTotal;
                this.stats.totalHPP += totalModal;
                this.stats.grossProfit += profit;
                this.stats.netProfit = this.stats.grossProfit - this.stats.totalExpense;

                // 3b. Update Modal Stats (Saldo Laci / Modal Gantung)
                // Uses recoveredCapital calculated earlier
                if (this.modalStats) {
                    this.modalStats.modalGantung = (this.modalStats.modalGantung || 0) + recoveredCapital;
                    this.modalStats.totalHPP = (this.modalStats.totalHPP || 0) + totalModal;
                }

                // 4. Update Top Product (Simple check)
                if (items[0].qty > this.topProduct.qty) {
                    // Only update locally if it beats current top (simple heuristic)
                }
            } else {
                // Edit Mode: Apply Optimistic Update to existing item
                const existingItem = this.history.find(h => h.id === tempId);
                if (existingItem) {
                    // Save COMPLETE backup for rollback if API fails
                    var editBackup = JSON.parse(JSON.stringify(existingItem));

                    // Save old values for potential KPI adjustment
                    var oldTotal = existingItem.total || 0;
                    var oldStatus = existingItem.status;
                    var oldSisa = existingItem.sisa || 0;
                    var oldHpp = existingItem.hpp || 0;
                    var oldDp = existingItem.dp || 0;

                    // Update item in place
                    Object.assign(existingItem, newItem);

                    // Adjust Stats (Remove old, add new)
                    // This is complex. For simplicity in optimistic UI: 
                    // Just update totals. 
                    this.historyKPI.all.total = this.historyKPI.all.total - oldTotal + grandTotal;

                    if (oldStatus === 'LUNAS') {
                        this.historyKPI.lunas.total -= oldTotal;
                        this.historyKPI.lunas.count--;
                    } else {
                        this.historyKPI.belum.total -= oldSisa;
                        this.historyKPI.belum.count--;
                    }

                    if (status === 'LUNAS') {
                        this.historyKPI.lunas.total += grandTotal;
                        this.historyKPI.lunas.count++;
                    } else {
                        this.historyKPI.belum.total += sisa;
                        this.historyKPI.belum.count++;
                    }

                    if (status === 'LUNAS') {
                        this.historyKPI.lunas.total = this.historyKPI.lunas.total - oldTotal + grandTotal;
                    } else {
                        this.historyKPI.belum.total = this.historyKPI.belum.total - oldSisa + sisa;
                    }

                    if (this.modalStats) {
                        this.modalStats.modalGantung = (this.modalStats.modalGantung || 0) - recoveredCapital;
                        this.modalStats.totalHPP = (this.modalStats.totalHPP || 0) - totalModal;
                    }
                }
            }

            this.bgProcess = true;

            // 2. UI Updates Immediate
            this.resetForm();
            this.cart = [];
            localStorage.removeItem('grow_cart_backup');
            this.tab = 'home'; // Instant switch

            try {
                // 3. KIRIM KE SERVER DI BACKGROUND
                const res = await this.api('saveTransaction', payload);

                // 4. SYNC (Silent or Active)
                if (res && res.success) {
                    // Optimistic update confirmed.
                    if (res.id) {
                        const item = this.history.find(h => h.id === (isNew ? tempId : this.form.id) || h.id === res.id);
                        if (item) {
                            if (isNew) item.id = res.id;
                            // CRITICAL: Update local timestamp to match server's authoritative timestamp
                            if (res.timestamp) item.timestamp = res.timestamp;
                        }
                    }
                    // Update cache
                    SecureStorage.set('grow_data_cache', {
                        products: this.allProducts,
                        customers: this.customers,
                        expenseDescriptions: this.expenseDescriptions,
                        history: this.history,
                        expenses: this.expenses,
                        deposits: this.deposits,
                        stats: this.stats,
                        modalStats: this.modalStats,
                        historyKPI: this.historyKPI,
                        topProduct: this.topProduct
                    });
                    this.notify("Transaksi berhasil disimpan", 'success');
                } else {
                    // ROLLBACK optimistic update
                    throw new Error(res ? res.message : "Unknown Error");
                }
            } catch (e) {
                console.error(e);
                // ROLLBACK optimistic update (same logic)
                if (isNew) {
                    this.rollbackOptimisticTransaction(tempId, grandTotal, totalModal, profit, sisa, status, recoveredCapital);
                } else if (editBackup) {
                    try {
                        const itemToRestore = this.history.find(h => h.id === tempId);
                        if (itemToRestore) Object.assign(itemToRestore, editBackup);
                        // Refresh to be safe
                        setTimeout(() => this.fetch(true), 1000);
                    } catch (err) { }
                }

                if (e.message === "CONFLICT") {
                    this.notify("CONFLICT: Data telah diubah orang lain. Mohon refresh.", 'error');
                } else {
                    // OFFLINE SYNC QUEUE
                    if (!this.isOnline || e.message === "Failed to fetch") {
                        this.notify("Offline: Transaksi masuk antrian sync", 'info');
                        this.addToPendingQueue(payload);
                    } else {
                        this.notify("Gagal menyimpan server: " + e.message, 'error');
                    }
                }
            } finally {
                this.bgProcess = false;
            }
        },

        rollbackOptimisticTransaction(tempId, grandTotal, totalModal, profit, sisa, status, recoveredCapital) {
            // DELETE item locally
            this.history = this.history.filter(h => h.id !== tempId);

            // REVERT stats
            this.stats.omzet -= grandTotal;
            this.stats.totalHPP -= totalModal;
            this.stats.grossProfit -= profit;
            this.stats.netProfit = this.stats.grossProfit - this.stats.totalExpense;

            // Revert Modal Checks
            if (this.modalStats) {
                this.modalStats.modalGantung -= recoveredCapital;
                this.modalStats.totalHPP -= totalModal;
            }

            this.historyKPI.all.total -= grandTotal;
            this.historyKPI.all.count--;
            if (status === 'LUNAS') {
                this.historyKPI.lunas.count--;
                this.historyKPI.lunas.total -= grandTotal;
            } else {
                this.historyKPI.belum.count--;
                this.historyKPI.belum.total -= sisa;
            }
        },

        // --- OFFLINE SYNC ---
        addToPendingQueue(payload) {
            this.pendingQueue.push(payload);
            SecureStorage.set('grow_pending_queue', this.pendingQueue);
        },

        async processPendingQueue() {
            if (this.pendingQueue.length === 0 || this.syncInProgress) return;

            this.syncInProgress = true;
            const total = this.pendingQueue.length;
            this.notify(`Sinkronisasi ${total} data tertunda...`, 'info');

            let successCount = 0;
            // Process sequential
            const remaining = [];

            for (const item of this.pendingQueue) {
                try {
                    const res = await this.api(item.action, item); // Generic action
                    if (res && res.success) {
                        successCount++;
                    } else {
                        remaining.push(item); // Keep failed
                    }
                } catch (e) {
                    remaining.push(item);
                }
            }

            this.pendingQueue = remaining;
            SecureStorage.set('grow_pending_queue', this.pendingQueue);
            this.syncInProgress = false;

            if (successCount > 0) {
                this.notify(`✅ ${successCount} Data tersinkronisasi. ${remaining.length} sisa.`, 'success');
                this.fetch(); // Refresh data
            } else if (remaining.length > 0) {
                this.notify(`Gagal sinkronisasi (Server Sibuk/Error). Coba lagi nanti.`, 'error');
            }
        },

        generateUUID() { // Simple UUID generator
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        resetForm() {
            this.form.id = null;
            this.form.customer = '';
            this.form.deadline = '';
            this.form.originalDate = null; // Reset
            this.form.originalTimestamp = null; // Reset Conflict Token
            this.cart = [];
            this.form.productName = '';
            this.form.serviceName = '';
            this.form.qty = 1;
            this.form.sellPrice = '';
            this.form.costPrice = '';
            this.form.dp = 0;
        },

        requestDelete(id, date) {
            this.deleteId = id;
            this.deleteDate = date;
            this.deleteType = 'transaction';
            this.isDeleteOpen = true;
        },
        confirmDelete() {
            this.isDeleteOpen = false;
            this.bgProcess = true;

            if (this.deleteType === 'user') {
                // USER DELETE LOGIC
                this.api('deleteUser', { username: this.deleteId }).then(res => {
                    this.bgProcess = false;
                    if (res && res.success) {
                        this.notify("User dihapus", 'success');
                        this.fetchUsers();
                    } else {
                        this.notify(res?.message || "Gagal menghapus", 'error');
                    }
                });
                return;
            }

            // TRANSACTION DELETE LOGIC
            // Optimistic Delete
            const item = this.history.find(h => h.id === this.deleteId);
            const backupItem = item ? JSON.parse(JSON.stringify(item)) : null;

            if (item) {
                this.history = this.history.filter(h => h.id !== this.deleteId);
                // Adjust KPI
                this.historyKPI.all.count--;
                this.historyKPI.all.total -= item.total;
                if (item.status === 'LUNAS') {
                    this.historyKPI.lunas.count--;
                    this.historyKPI.lunas.total -= item.total;
                } else {
                    this.historyKPI.belum.count--;
                    this.historyKPI.belum.total -= item.sisa;
                }
                this.stats.omzet -= item.total;
                this.stats.totalHPP -= item.hpp;
                // Recalculate profit removal
                const cashIn = (item.status === 'LUNAS') ? item.total : item.dp;
                const profit = cashIn - item.hpp;
                this.stats.grossProfit -= profit;
                this.stats.netProfit = this.stats.grossProfit - this.stats.totalExpense;
            }

            this.api('deleteTransaction', { id: this.deleteId, date: this.deleteDate }).then(res => {
                this.bgProcess = false;
                if (res && res.success) {
                    this.notify("Data dihapus permanen", 'success');
                    // Update cache
                    SecureStorage.set('grow_data_cache', {
                        products: this.allProducts,
                        customers: this.customers,
                        expenseDescriptions: this.expenseDescriptions,
                        history: this.history,
                        expenses: this.expenses,
                        deposits: this.deposits,
                        stats: this.stats,
                        modalStats: this.modalStats,
                        historyKPI: this.historyKPI,
                        topProduct: this.topProduct
                    });
                } else {
                    // Rollback
                    if (backupItem) {
                        this.history.unshift(backupItem);
                        this.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        // Revert KPI (simplified, forcing refresh might be better)
                        this.fetch(true);
                    }
                    this.notify("Gagal menghapus (Server Error)", 'error');
                }
            });
        },

        viewDetail(t) {
            this.selectedDetail = t;
            this.loadingDetail = true;
            this.isDetailOpen = true;
            this.detailItems = [];
            // Use cached items if available (from optimistic save)
            if (t.items && t.items.length > 0) {
                this.detailItems = t.items;
                this.loadingDetail = false;
            } else {
                // Fetch for legacy data
                this.api('getTransactionDetail', { id: t.id, date: t.isoDate })
                    .then(data => {
                        if (data && data.success) {
                            this.detailItems = data.items;
                            // Cache it back to history object to avoid refetch
                            t.items = data.items;
                        }
                        this.loadingDetail = false;
                    })
                    .catch(() => { this.loadingDetail = false; });
            }
            this.vibrate();
        },
        closeDetail() {
            this.isDetailOpen = false;
            setTimeout(() => { this.selectedDetail = null; this.detailItems = []; }, 300);
        },

        // Edit Item: Load data back to form
        editItem(t) {
            this.form.id = t.id;
            this.form.customer = t.customer;
            this.form.deadline = t.deadline;

            // Keep track of original date to help backend find the file if it's old
            this.form.originalDate = t.isoDate;
            // Capture original timestamp for conflict detection
            this.form.originalTimestamp = t.timestamp;

            // Restore Cart
            // Ensure detail items are loaded
            if (this.detailItems.length > 0) {
                this.cart = JSON.parse(JSON.stringify(this.detailItems));
            } else {
                this.notify("Detail item belum dimuat, coba lagi.", 'error');
                return;
            }

            this.tab = 'add';
            this.notify("Mode Edit Diaktifkan", 'info');
        },

        // Functions from original that were omitted in quick view...
        // EXPENSE
        openExpense() { this.tab = 'expense'; if (this.expenses.length === 0) this.fetch(); },
        saveExpense() {
            if (!this.expForm.category || !this.expForm.desc || !this.expForm.amount) return this.notify("Lengkapi form pengeluaran", "error");
            this.bgProcess = true;

            // Needed for offline sync
            this.expForm.action = 'saveExpense'; // Tag action

            this.api('saveExpense', this.expForm).then(res => {
                this.bgProcess = false;
                if (res && res.success) {
                    this.notify("Pengeluaran disimpan", "success");
                    this.expForm = { id: null, category: '', desc: '', amount: '' };
                    this.fetch(); // Refresh data
                } else {
                    // OFFLINE SYNC
                    if (!this.isOnline) {
                        this.notify("Offline: Pengeluaran masuk antrian sync", 'info');
                        this.addToPendingQueue({ ...this.expForm, action: 'saveExpense' });
                        this.expForm = { id: null, category: '', desc: '', amount: '' };
                    } else {
                        this.notify(res?.message || "Gagal simpan", "error");
                    }
                }
            });
        },
        deleteExpense(id) {
            if (!confirm("Hapus pengeluaran ini?")) return;
            this.bgProcess = true;
            this.api('deleteExpense', { id: id }).then(res => {
                this.bgProcess = false;
                if (res && res.success) {
                    this.notify("Pengeluaran dihapus", "success");
                    this.fetch();
                } else {
                    this.notify("Gagal hapus", "error");
                }
            });
        },

        // SETOR MODAL & DEPOSIT
        openSetorModal() { this.isSetorOpen = true; },
        saveDeposit() {
            if (!this.setorForm.amount) return this.notify("Isi nominal", "error");
            this.bgProcess = true;
            this.api('saveDeposit', this.setorForm).then(res => {
                this.bgProcess = false;
                this.isSetorOpen = false;
                if (res && res.success) {
                    this.notify("Setor modal berhasil", "success");
                    this.setorForm = { amount: '', note: '', bank: 'Mandiri' };
                    this.fetch();
                } else {
                    this.notify("Gagal setor", "error");
                }
            });
        },
        // Edit Deposit Logic
        editDeposit(d, index) {
            this.setorForm = {
                amount: d.amount,
                note: d.note,
                bank: d.bank || 'Mandiri',
                editIndex: index,
                // We need a way to ID this row. Using date + amount as naive index or pass index
                // For V27, we might need a better unique ID for deposits, 
                // but assuming we pass the full object which the server can match
                oldDate: d.date, // Helper for server matching
                id: d.id // If we have IDs
            };
            this.isSetorOpen = true;
        },

        // Delete Deposit Logic
        confirmDeleteDeposit(d, index) {
            this.deleteDepositIndex = index;
            this.deleteType = 'deposit'; // Reuse delete confirm modal logic or new one
            // Simple confirm for now
            if (confirm("Hapus history setor modal ini?")) {
                this.bgProcess = true;
                this.api('deleteDeposit', { index: index, date: d.date }).then(res => {
                    this.bgProcess = false;
                    if (res && res.success) {
                        this.notify("Data dihapus", "success");
                        this.fetch();
                    } else {
                        this.notify("Gagal hapus", "error");
                    }
                });
            }
        },

        // MASTER DATA
        openMaster() { this.isMasterOpen = true; },
        addNewProduct() {
            if (!this.newProd.category || !this.newProd.name) return this.notify("Lengkapi data produk", "error");
            this.bgProcess = true;
            this.api('addNewProduct', this.newProd).then(res => {
                this.bgProcess = false;
                if (res && res.success) {
                    this.notify("Produk ditambah", "success");
                    this.newProd = { category: '', name: '' };
                    this.fetch();
                } else {
                    this.notify("Gagal tambah", "error");
                }
            });
        },


        // PDF GENERATION
        downloadPDF(t) {
            this.loadingPdf = true;
            this.notify("Membuat Invoice PDF...", "info");
            // Use POST to avoid URL length limit
            fetch(API_URL + "?action=generatePDFReport", {
                method: "POST",
                body: JSON.stringify({ id: t.id, date: t.isoDate, cacheBust: Date.now() })
            })
                .then(r => r.json())
                .then(res => {
                    this.loadingPdf = false;
                    if (res.success) {
                        // Open in new window
                        window.open(res.url, '_blank');
                    } else {
                        this.notify("Gagal buat PDF: " + res.message, "error");
                    }
                })
                .catch(() => { this.loadingPdf = false; this.notify("Error PDF", "error"); });
        },

        downloadAnnualReport() {
            this.loadingPdf = true;
            this.notify("Membuat Laporan Tahunan...", "info");
            fetch(API_URL + "?action=generateAnnualReport", {
                method: "POST",
                body: JSON.stringify({ year: this.reportDate.year })
            })
                .then(r => r.json())
                .then(res => {
                    this.loadingPdf = false;
                    if (res.success && res.url) {
                        window.open(res.url, '_blank');
                    } else {
                        this.notify("Gagal: " + (res.message || "Unknown"), "error");
                    }
                })
                .catch(() => { this.loadingPdf = false; this.notify("Error Network", "error"); });
        },

        downloadExpenseReport() {
            // ... (Expense report logic similar to above)
            this.loadingPdf = true;
            this.notify("Membuat Laporan Pengeluaran...", "info");
            fetch(API_URL + "?action=generateExpenseOnlyReport", {
                method: "POST",
                body: JSON.stringify({ year: this.reportDate.year, month: this.reportDate.month })
            })
                .then(r => r.json())
                .then(res => {
                    this.loadingPdf = false;
                    if (res.success && res.url) {
                        window.open(res.url, '_blank');
                    } else {
                        this.notify("Gagal: " + (res.message || "Unknown"), "error");
                    }
                })
                .catch(() => { this.loadingPdf = false; this.notify("Error Network", "error"); });
        }
    }
}

function app() {
    return {
        currentUser: SecureStorage.get('grow_user') || null,
        loginForm: { u: '', p: '' },
        isLogoutOpen: false, isDetailOpen: false, loadingDetail: false, selectedDetail: null, detailItems: [],

        tab: 'home', initialLoading: true, bgProcess: false, loading: false, loadingPdf: false, notifications: [], isMasterOpen: false, isSetorOpen: false, isDeleteOpen: false, isDeleteDepositOpen: false, deleteId: null, deleteDate: null, deleteDepositIndex: null, isOffline: false, loadingData: true,
        isFixDBOpen: false, fixLogs: null, isFixResultOpen: false,
        isSensitiveHidden: localStorage.getItem('grow_privacy_mode') === 'true',
        isDarkMode: localStorage.getItem('grow_dark_mode') === 'true',
        // Server Search
        isSearchingServer: false, serverSearchResults: [], showServerResults: false,
        allProducts: [], categories: [], history: [], expenses: [], deposits: [],
        customers: [], expenseDescriptions: [],
        stats: { omzet: 0, grossProfit: 0, netProfit: 0, totalExpense: 0, totalHPP: 0 },
        modalStats: { modalGantung: 0, totalHPP: 0, totalDisetor: 0 },
        historyKPI: { all: { count: 0, total: 0 }, lunas: { count: 0, total: 0 }, belum: { count: 0, total: 0 } },
        filterDate: '', isService: false, selectedCategory: "", filterStatus: '', productSearch: '', showProductList: false,
        searchQuery: '', filterStartDate: '', filterEndDate: '', quickFilter: 'month',
        historyLimit: 30, expenseLimit: 50,

        // Performance: Cache for memoized computed properties
        _cachedHistory: null,
        _userOmzetCache: null,
        _cachedHistoryForTransactions: null,
        _userTransactionsCache: null,

        // PULL TO REFRESH REMOVED
        // === OFFLINE QUEUE SYSTEM ===
        pendingQueue: (() => { const q = SecureStorage.get('grow_pending_queue'); return Array.isArray(q) ? q : []; })(),
        isOnline: navigator.onLine,
        syncInProgress: false,

        expFilterStart: '', expFilterEnd: '', expQuickFilter: 'month',
        form: { id: null, customer: '', productName: '', serviceName: '', qty: 1, sellPrice: '', transportFee: '', costPrice: '', dp: 0, deadline: '' }, newProd: { category: '', name: '' }, setorForm: { amount: '', note: '', bank: 'Mandiri', editIndex: null, id: null }, expForm: { id: null, category: '', desc: '', amount: '' }, deleteType: 'transaction',
        cart: [], loadingText: 'MENGHUBUNGKAN...', loadingMessages: ['MENYAMBUNGKAN SERVER...', 'SINKRONISASI DATA...', 'ENKRIPSI AKTIF...', 'MEMUAT DASHBOARD...', 'MENYIAPKAN TRANSAKSI...'], timeString: '', dateString: '',
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
            // Watcher for tab changes to reset scroll
            this.$watch('tab', () => {
                this.$nextTick(() => {
                    const mainEl = document.querySelector('main');
                    if (mainEl) mainEl.scrollTop = 0;
                });
            });



            // Timer runs for app lifetime (SPA design, no cleanup needed)
            setInterval(() => this.updateTime(), 1000); this.updateTime();

            // === POLLING FOR LOGS (LIVE) ===
            setInterval(() => {
                if (this.tab === 'monitor' && !this.loadingLogs) {
                    this.fetchLogs(true); // Silent fetch
                }
            }, 30000); // Poll every 30s

            // === CONNECTION MONITORING ===
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.notify('ðŸŸ¢ Koneksi Kembali! Sinkronisasi...', 'success');
                this.processPendingQueue();
            });

            window.addEventListener('offline', () => {
                this.isOnline = false;
                this.notify('ðŸ”´ Mode Offline - Data disimpan lokal', 'error');
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

            // === DARK MODE ===
            this.applyDarkMode(this.isDarkMode);
            this.$watch('isDarkMode', (val) => {
                localStorage.setItem('grow_dark_mode', val);
                this.applyDarkMode(val);
            });

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

        updateTime() {
            const now = new Date();
            this.timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const day = days[now.getDay()];
            const dd = now.getDate();
            const mon = months[now.getMonth()];
            const yyyy = now.getFullYear();
            this.dateString = `${day}, ${dd} ${mon} ${yyyy}`;
        },
        restoreCart() {
            const backup = localStorage.getItem('grow_cart_backup');
            if (backup) {
                try {
                    const restoredCart = JSON.parse(backup);
                    // Validate cart structure
                    if (Array.isArray(restoredCart)) {
                        // Validate and filter valid items only
                        this.cart = restoredCart.filter(item => {
                            return item &&
                                item.productName &&
                                typeof item.qty === 'number' && item.qty > 0 &&
                                typeof item.sellPrice === 'number' && item.sellPrice >= 0;
                        });
                        if (this.cart.length !== restoredCart.length) {
                            console.warn(`Cart restored: ${this.cart.length}/${restoredCart.length} valid items`);
                        }
                    } else {
                        console.error("Cart backup is not an array, resetting");
                        this.cart = [];
                        localStorage.removeItem('grow_cart_backup');
                    }
                } catch (e) {
                    console.error("Failed to restore cart, clearing corrupt data", e);
                    this.cart = [];
                    localStorage.removeItem('grow_cart_backup');
                }
            } else {
                this.cart = [];
            }
        },
        get greeting() { const h = new Date().getHours(); if (h < 11) return 'Selamat Pagi'; if (h < 15) return 'Selamat Siang'; if (h < 18) return 'Selamat Sore'; return 'Selamat Malam'; },
        startApp(interval) {
            fetch(`${API_URL}?action=ping`, { mode: 'no-cors' });
            this.fetch(true).then(() => {
                if (interval) clearInterval(interval);
                this.updateTime();
                this.setQuickFilter('month');
                this.setExpenseQuickFilter('month');
            });
        },
        vibrate() { if (navigator.vibrate) navigator.vibrate(15); },

        applyDarkMode(dark) {
            const html = document.documentElement;
            if (dark) {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
            // Update meta theme-color
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', dark ? '#0f172a' : '#4F46E5');
        },

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
                        this.notify("âœ… Database Berhasil Diperbaiki!", "success");
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
        async fetchLogs(silent = false) {
            if (!silent) this.loadingLogs = true;
            try {
                // Fix: Use generic api wrapper instead of fetch
                const res = await this.api('getLogs');
                if (res && res.success) {
                    this.logs = res.logs;
                }
            } catch (e) { console.error(e); } finally { if (!silent) this.loadingLogs = false; }
        },
        async triggerBackup() {
            this.bgProcess = true;
            try {
                const res = await this.api('triggerManualBackup');
                if (res && res.success) {
                    this.notify(res.message || "Backup Berhasil!", 'success');
                } else {
                    this.notify("Gagal Backup: " + (res?.message || 'Error'), 'error');
                }
            } catch (e) { this.notify("Error: " + e.message, 'error'); }
            finally { this.bgProcess = false; }
        },
        async enableAutoBackup() {
            this.bgProcess = true;
            try {
                const res = await this.api('enableAutoBackup');
                if (res && res.success) {
                    this.notify(res.message, 'success');
                } else {
                    this.notify("Gagal: " + (res?.message || 'Error'), 'error');
                }
            } catch (e) { this.notify("Error: " + e.message, 'error'); }
            finally { this.bgProcess = false; }
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
            if (!e || typeof e !== 'object') {
                console.warn("Invalid data received", e);
                return;
            }
            this.allProducts = Array.isArray(e.products) ? e.products : [];
            this.categories = [...new Set(this.allProducts.map(p => p.category))];
            this.history = Array.isArray(e.history) ? e.history : [];
            this.expenses = Array.isArray(e.expenses) ? e.expenses : [];
            this.deposits = Array.isArray(e.deposits) ? e.deposits : [];
            this.customers = Array.isArray(e.customers) ? e.customers : [];
            this.expenseDescriptions = Array.isArray(e.expenseDescriptions) ? e.expenseDescriptions : [];
            this.modalStats = e.modalStats || { modalGantung: 0, totalHPP: 0, totalDisetor: 0 };
            this.stats = e.stats || { omzet: 0, grossProfit: 0, netProfit: 0, totalExpense: 0, totalHPP: 0 };
            this.historyKPI = e.historyKPI || { all: { count: 0, total: 0 }, lunas: { count: 0, total: 0 }, belum: { count: 0, total: 0 } };
            this.topProduct = e.topProduct || { name: '-', qty: 0 };
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
            this.form.transportFee = item.transportFee || '';

            // Remove from cart
            this.cart.splice(index, 1);
            this.vibrate();
            // this.notify("Item dikembalikan ke form untuk diedit", 'info');

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
        get displayedHistory() {
            return this.filteredHistory.slice(0, this.historyLimit);
        },
        get filteredHistoryKPI() {
            const filtered = this.filteredHistory;
            const kpi = {
                all: { count: filtered.length, total: 0 },
                lunas: { count: 0, total: 0 },
                belum: { count: 0, total: 0 }
            };
            filtered.forEach(t => {
                kpi.all.total += t.total || 0;
                if (t.status === 'LUNAS') {
                    kpi.lunas.count++;
                    kpi.lunas.total += t.total || 0;
                } else {
                    kpi.belum.count++;
                    kpi.belum.total += t.sisa || 0;
                }
            });
            return kpi;
        },

        setQuickFilter(type) {
            this.quickFilter = type;
            this.showServerResults = false; // Reset server search on filter change
            this.historyLimit = 30; // Reset pagination
            const today = new Date();
            const formatDate = (d) => {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };

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
            }
        },

        setExpenseQuickFilter(type) {
            this.expQuickFilter = type;
            this.expenseLimit = 50; // Reset pagination
            const today = new Date();
            const formatDate = (d) => {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };

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
        get groupedExpenses() {
            const groups = {};
            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

            let itemsCount = 0;
            this.filteredExpenses.forEach(ex => {
                if (!ex.isoDate) return;
                const date = new Date(ex.isoDate);
                if (isNaN(date.getTime())) return;

                const month = months[date.getMonth()];
                const year = date.getFullYear();
                const key = `${month} ${year}`;

                if (!groups[key]) {
                    groups[key] = {
                        monthYear: key,
                        total: 0,
                        items: [],
                        sortKey: date.getFullYear() * 100 + date.getMonth()
                    };
                }
                if (itemsCount < this.expenseLimit) {
                    groups[key].items.push(ex);
                    itemsCount++;
                }
                groups[key].total += ex.amount;
            });

            // Convert to array and sort DESCENDING by date (Newest Month first)
            return Object.values(groups).sort((a, b) => b.sortKey - a.sortKey);
        },
        get filteredExpenseTotal() {
            return this.filteredExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
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

        // Performance: Memoized user omzet calculation
        get userOmzetMap() {
            // Only recompute when history changes
            if (this._cachedHistory === this.history) {
                return this._userOmzetCache || {};
            }

            const map = {};
            this.history.forEach(h => {
                // Support multiple field names for cashier
                const keys = [h.cashier, h.user, h.username].filter(Boolean);
                keys.forEach(key => {
                    if (!map[key]) map[key] = 0;
                    map[key] += parseFloat(h.total) || 0;
                });
            });

            this._cachedHistory = this.history;
            this._userOmzetCache = map;
            return map;
        },

        // Performance: Memoized user transactions map
        get userTransactionsMap() {
            // Only recompute when history changes
            if (this._cachedHistoryForTransactions === this.history) {
                return this._userTransactionsCache || {};
            }

            const map = {};
            this.history.forEach(h => {
                // Support multiple field names for cashier
                const keys = [h.cashier, h.user, h.username].filter(Boolean);
                keys.forEach(key => {
                    if (!map[key]) map[key] = [];
                    // Avoid duplicates (same transaction for multiple keys)
                    if (!map[key].some(t => t.id === h.id)) {
                        map[key].push(h);
                    }
                });
            });

            this._cachedHistoryForTransactions = this.history;
            this._userTransactionsCache = map;
            return map;
        },

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
            const tf = this.form.transportFee || 0;
            if (!e) { this.notify("Pilih Produk/Isi Nama Jasa", 'error'); return; } if (!this.isService && (!t || t <= 0)) { this.notify("Harga Modal Wajib Diisi!", 'error'); return; } if (!this.form.qty || this.form.qty <= 0) { this.notify("Qty minimal 1", 'error'); return; } if (!this.form.sellPrice) { this.notify("Harga Jual Wajib Diisi", 'error'); return; }
            this.cart.push({ productName: e, qty: parseFloat(this.form.qty), sellPrice: parseFloat(this.form.sellPrice), transportFee: parseFloat(tf), costPrice: parseFloat(t) });
            this.form.productName = ''; this.form.serviceName = ''; this.form.qty = 1; this.form.sellPrice = ''; this.form.costPrice = ''; this.form.transportFee = '';
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
            if (!val && val !== 0) return 'Rp 0';
            return 'Rp ' + this.formatRupiah(val);
        },

        // Helper: Format deadline ISO date to "Hari, D MMMM YYYY"
        fmtDeadline(dateStr) {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const day = days[d.getDay()];
            const mon = months[d.getMonth()];
            const dd = d.getDate();
            const yyyy = d.getFullYear();
            return `${day}, ${dd} ${mon} ${yyyy}`;
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
            const totalTransFee = items.reduce((acc, item) => acc + (parseFloat(item.transportFee || 0)), 0);
            const totalDP = parseFloat(this.form.dp) || 0;
            const sisa = Math.round(grandTotal - totalDP);
            const status = sisa <= 0 ? "LUNAS" : "BELUM LUNAS";
            // Profit Logic (Cash Basis)
            const cashIn = (status === 'LUNAS') ? grandTotal : totalDP;
            const profit = cashIn - totalModal - totalTransFee;

            // NEW ITEM SNAPSHOT (Optimistic)
            const isNew = !this.form.id;
            const tempId = this.form.id || this.generateUUID(); // Robust UUID
            const now = new Date();
            const newItem = {
                id: tempId,
                displayDate: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                isoDate: new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0], // Local Date ISO
                fullDate: (() => {
                    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                    const day = days[now.getDay()];
                    const dd = now.getDate();
                    const mon = months[now.getMonth()];
                    const yyyy = now.getFullYear();
                    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
                    return `${day}, ${dd} ${mon} ${yyyy}, ${time} WIB`;
                })(),
                timestamp: now.toISOString(), // Preserve exact time for local edits
                customer: this.form.customer,
                product: items.length > 1 ? `${items[0].productName} (+${items.length - 1} item)` : items[0].productName,
                total: grandTotal,
                hpp: totalModal,
                transportFee: totalTransFee,
                dp: totalDP,
                sisa: sisa,
                status: status,
                deadline: this.form.deadline,
                cashier: this.currentUser ? (this.currentUser.name || this.currentUser.username) : 'N/A',
                // Needed for offline sync
                username: this.currentUser?.name || this.currentUser?.username || 'System',
                role: this.currentUser?.role || 'System',
                action: 'saveTransaction',

                // Pre-calculated totals for instant view performance
                totalHppBarang: totalModal,
                totalTransport: totalTransFee,
                totalModal: totalModal + totalTransFee,
                labaBersih: grandTotal - (totalModal + totalTransFee),

                items: JSON.parse(JSON.stringify(items)) // STORE ITEMS FOR INSTANT EDIT
            };

            // Construct payload
            const payload = { ...newItem };
            // CRITICAL FIX: To detect conflict, we must send the ORIGINAL timestamp, not the new one
            if (!isNew && this.form.originalTimestamp) {
                payload.timestamp = this.form.originalTimestamp;
            }
            // CRITICAL FIX: Send originalDate so backend knows where to DELETE the old data
            if (!isNew && this.form.originalDate) {
                payload.originalDate = this.form.originalDate;
            }

            // Calculate recovered capital for maintenance stats
            const cashRec = (status === 'LUNAS') ? grandTotal : totalDP;
            const recoveredCapital = Math.min(cashRec, totalModal + totalTransFee);

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
                this.stats.totalHPP += (totalModal + totalTransFee);
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

                    if (this.modalStats) {
                        // Calculate OLD recovered capital from backup
                        const oldCashIn = (editBackup.status === 'LUNAS') ? editBackup.total : editBackup.dp;
                        const oldTrans = editBackup.items ? editBackup.items.reduce((a, c) => a + (c.transportFee || 0), 0) : 0;
                        const oldRecoveredCapital = Math.min(oldCashIn, (editBackup.hpp || 0) + oldTrans);

                        // Update stats: subtract old, add new
                        this.modalStats.modalGantung = (this.modalStats.modalGantung || 0) - oldRecoveredCapital + recoveredCapital;
                        this.modalStats.totalHPP = (this.modalStats.totalHPP || 0) - (oldHpp + oldTrans) + (totalModal + totalTransFee);
                        this.stats.totalHPP = this.stats.totalHPP - (oldHpp + oldTrans) + (totalModal + totalTransFee);
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
                    // Re-sync stats dari server agar Profit Bersih dll up-to-date
                    setTimeout(() => this.fetch(), 500);
                } else {
                    // ROLLBACK optimistic update
                    throw new Error(res ? res.message : "Unknown Error");
                }
            } catch (e) {
                console.error(e);
                // ROLLBACK optimistic update (same logic)
                if (isNew) {
                    this.rollbackOptimisticTransaction();
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

        rollbackOptimisticTransaction() {
            // Simplified Rollback: Just refresh data from server to ensure consistency
            // trying to manually revert stats is error prone.
            console.warn("Rolling back optimistic update due to error");
            this.fetch(true);
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
                this.notify(`âœ… ${successCount} Data tersinkronisasi. ${remaining.length} sisa.`, 'success');
                this.fetch(); // Refresh data
            } else if (remaining.length > 0) {
                this.notify(`Gagal sinkronisasi (Server Sibuk/Error). Coba lagi nanti.`, 'error');
            }
        },

        generateUUID() { // RFC4122 version 4 UUID generator
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, // 16 = hexadecimal range (0-F)
                    v = c == 'x' ? r : (r & 0x3 | 0x8);
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
            this.form.transportFee = '';
            this.form.costPrice = '';
            this.form.dp = 0;
        },

        requestDelete(id, date) {
            this.deleteId = id;
            this.deleteDate = date;
            this.deleteType = 'transaction';
            this.isDeleteOpen = true;
        },
        async confirmDelete() {
            this.isDeleteOpen = false;
            this.bgProcess = true;

            try {
                if (this.deleteType === 'user') {
                    // USER DELETE LOGIC
                    const res = await this.api('deleteUser', { username: this.deleteId });
                    if (res && res.success) {
                        this.notify("User dihapus", 'success');
                        this.fetchUsers();
                    } else {
                        this.notify(res?.message || "Gagal menghapus", 'error');
                    }
                    return;
                }

                if (this.deleteType === 'expense') {
                    // EXPENSE DELETE LOGIC
                    const res = await this.api('deleteExpense', { id: this.deleteId });
                    if (res && res.success) {
                        this.notify("Pengeluaran dihapus", 'success');
                        this.fetch();
                    } else {
                        this.notify(res?.message || "Gagal menghapus", 'error');
                    }
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

                const res = await this.api('deleteTransaction', { id: this.deleteId, date: this.deleteDate });
                if (res && res.success) {
                    this.notify("Data dihapus permanen", 'success');
                    // Re-sync stats dari server agar Profit Bersih dll up-to-date
                    this.fetch();
                } else {
                    // Rollback
                    if (backupItem) {
                        this.history.unshift(backupItem);
                        this.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        // Revert KPI (simplified, forcing refresh might be better)
                        this.fetch(true);
                    }
                    this.notify(res?.message || "Gagal menghapus (Server Error)", 'error');
                }
            } catch (e) {
                this.notify("Error: " + e.message, 'error');
            } finally {
                this.bgProcess = false;
            }
        },

        viewDetail(t) {
            this.selectedDetail = t;
            this.isDetailOpen = true;
            // OPTIMIZATION: Instant Load if items exist
            if (t.items && t.items.length > 0) {
                this.detailItems = t.items;
                this.loadingDetail = false; // Show immediately
            } else {
                this.detailItems = [];
                this.loadingDetail = true; // Show skeleton only if no data
            }

            // FETCH DETAILS ONLY
            const p1 = this.api('getTransactionDetail', { id: t.id, date: t.isoDate });

            p1.then((dRes) => {
                this.loadingDetail = false;
                // Handle Detail Items
                if (dRes && dRes.success) {
                    this.detailItems = dRes.items;
                    t.items = dRes.items; // Cache
                }
            }).catch((e) => {
                this.loadingDetail = false;
                this.notify("Gagal memuat detail: " + e.message, "error");
            });

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

            // Populate DP for display
            // LOGIC FIX: DP is trusted as the total amount paid
            this.form.dp = Number(t.dp) || 0;

            // Restore Cart
            // Ensure detail items are loaded
            if (this.detailItems.length > 0) {
                this.cart = JSON.parse(JSON.stringify(this.detailItems));
            } else {
                this.notify("Detail item belum dimuat, coba lagi.", 'error');
                return;
            }

            this.tab = 'add';
            this.isDetailOpen = false;
        },

        // Functions from original that were omitted in quick view...
        // EXPENSE
        openExpense() { this.tab = 'expense'; if (this.expenses.length === 0) this.fetch(); },
        async saveExpense() {
            if (!this.expForm.category || !this.expForm.desc || !this.expForm.amount) return this.notify("Lengkapi form pengeluaran", "error");
            this.bgProcess = true;

            // Needed for offline sync
            this.expForm.action = 'saveExpense';

            try {
                const res = await this.api('saveExpense', this.expForm);
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
            } catch (e) {
                this.notify("Error: " + e.message, 'error');
            } finally {
                this.bgProcess = false;
            }
        },
        requestDeleteExpense(id) {
            this.deleteId = id;
            this.deleteType = 'expense';
            this.isDeleteOpen = true;
        },
        resetExpForm() {
            this.expForm = { id: null, category: '', desc: '', amount: '' };
            this.vibrate();
        },

        // SETOR MODAL & DEPOSIT
        openSetorModal() {
            const autoAmount = this.modalStats ? (this.modalStats.modalGantung || 0) : 0;
            this.setorForm = { amount: autoAmount, note: '', bank: 'Mandiri' };
            this.isSetorOpen = true;
        },
        async submitSetor() {
            if (!this.setorForm.amount) return this.notify("Isi nominal", "error");
            this.bgProcess = true;
            try {
                const res = await this.api('saveDeposit', this.setorForm);
                if (res && res.success) {
                    this.notify("Setor modal berhasil", "success");
                    this.isSetorOpen = false; // Close strictly on success
                    this.setorForm = { amount: '', note: '', bank: 'Mandiri' };
                    this.fetch();
                } else {
                    this.notify("Gagal setor: " + (res?.message || 'Error'), "error");
                }
            } catch (e) {
                this.notify("Error: " + e.message, 'error');
            } finally {
                this.bgProcess = false;
            }
        },
        // Edit Deposit Logic
        editDeposit(d, index) {
            this.setorForm = {
                amount: d.amount,
                note: d.note,
                bank: d.bank || 'Mandiri',
                editIndex: d.index, // Use real sheet index
                // We need a way to ID this row. Using date + amount as naive index or pass index
                // For V27, we might need a better unique ID for deposits, 
                // but assuming we pass the full object which the server can match
                oldDate: d.date // Helper for server matching
            };
            this.isSetorOpen = true;
        },

        // Delete Deposit Logic
        // REQUEST DELETE DEPOSIT (Trigger Modal)
        requestDeleteDeposit(d, index) {
            this.deleteDepositIndex = d.index; // Use real sheet index
            this.deleteDepositDate = d.date; // Store date
            this.deleteType = 'deposit';
            this.isDeleteDepositOpen = true;
        },

        // EXECUTE DELETE DEPOSIT (Called from Modal)
        async executeDeleteDeposit() {
            this.bgProcess = true;

            try {
                const res = await this.api('deleteDeposit', { index: this.deleteDepositIndex, date: this.deleteDepositDate });
                if (res && res.success) {
                    this.notify("Data setor dihapus", "success");
                    this.isDeleteDepositOpen = false; // Close strictly on success
                    this.fetch();
                } else {
                    this.notify(res?.message || "Gagal hapus", "error");
                }
            } catch (e) {
                this.notify("Error: " + e.message, 'error');
            } finally {
                this.bgProcess = false;
            }
        },

        // MASTER DATA
        openMaster() { this.isMasterOpen = true; },
        async submitNewProd() {
            if (!this.newProd.category || !this.newProd.name) return this.notify("Lengkapi data produk", "error");
            this.bgProcess = true;
            try {
                const res = await this.api('addNewProduct', this.newProd);
                if (res && res.success) {
                    this.notify("Produk ditambah", "success");
                    this.isMasterOpen = false; // Close on success
                    this.newProd = { category: '', name: '' };
                    this.fetch();
                } else {
                    this.notify(res?.message || "Gagal tambah", "error");
                }
            } catch (e) {
                this.notify("Error: " + e.message, 'error');
            } finally {
                this.bgProcess = false;
            }
        },


        // =====================================================
        // PDF GENERATION - UNIFIED CLIENT-SIDE ARCHITECTURE
        // =====================================================

        // CSS loaded from external pdf-styles.js for easier maintenance
        getPdfCSS(docType) { return getPdfCSS(docType); },

        // Shared currency formatter
        fmtRp(n) { return new Intl.NumberFormat('id-ID').format(n); },

        // Shared fetch helper for PDF endpoints
        _fetchPdf(action, params, onSuccess) {
            this.loadingPdf = true;
            fetch(API_URL + '?action=' + action, {
                method: 'POST',
                body: JSON.stringify({ ...params, format: 'json', token: SecureStorage.get('grow_session_token'), username: this.currentUser?.username })
            })
                .then(r => r.json())
                .then(res => {
                    this.loadingPdf = false;
                    if (res.success) onSuccess(res);
                    else this.notify('Gagal: ' + (res.message || 'Unknown'), 'error');
                })
                .catch(() => { this.loadingPdf = false; this.notify('Error jaringan', 'error'); });
        },

        // SHARED: Build document header HTML
        getDocHeaderHTML(title, meta1, meta2) {
            return `
                <div class="header">
                    <div style="width: 55%;">
                        <div class="brand-name">Grow Souvenir and<br>Advertising</div>
                        <div class="brand-prop">NIB : 0402250003404</div>
                        <div class="brand-addr">Jl. Vetpur Raya III, Gg. Amat Salim, Kec. Percut Sei Tuan<br>0815 8899 407 / 0877 1126 4841</div>
                    </div>
                    <div style="width: 45%; text-align: right;">
                        <div class="doc-title">${title}</div>
                        ${meta1 ? `<div class="doc-meta">${meta1}</div>` : ''}
                        ${meta2 ? `<div class="doc-meta-lbl">${meta2}</div>` : ''}
                    </div>
                </div>`;
        },

        // SHARED: Open preview window with print bar
        openPrintPreview(html) {
            const popup = window.open('', '_blank');
            if (popup) { popup.document.write(html); popup.document.close(); }
            else this.notify('Popup diblokir! Izinkan popup di browser.', 'error');
        },

        // SHARED: Wrap full document HTML
        buildDocument(docType, fileName, bodyContent) {
            return `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${fileName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>${this.getPdfCSS(docType)}</style>
            </head>
            <body>
                <div class="noprint">
                    <span class="close-hint">Nama file PDF: <b>${fileName}.pdf</b></span>
                    <button class="btn-print" onclick="window.print()">&#128424; CETAK / SIMPAN PDF</button>
                </div>
                ${docType === 'invoice' ? '<div class="sheet">' : '<div style="padding: 20px 25px; max-width: 210mm; margin: 0 auto; background: white; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">'}
                    ${bodyContent}
                    <div class="footer">
                        Dokumen ini merupakan bukti transaksi yang sah dari Grow Souvenir and Advertising.<br>
                        Terima kasih atas kepercayaan Anda.
                    </div>
                </div>
            </body>
            </html>`;
        },

        // =====================================================
        // 1. INVOICE
        // =====================================================
        downloadPDF(t) {
            this._fetchPdf('generateInvoice', { id: t.id, date: t.isoDate }, res => this.printInvoiceClientSide(res));
        },

        printInvoiceClientSide(data) {
            const f = n => this.fmtRp(n);
            const items = data.items;
            const t = data.totals;
            const isLunas = t.isLunas;

            const safeInv = data.invNo.replace(/\//g, '-');
            const safeCustomer = (data.customer || 'Pelanggan').replace(/[^a-zA-Z0-9 ]/g, '');
            const fileName = `${safeCustomer}-${safeInv}`;

            // Status stamp
            const stampColor = isLunas ? '#16A34A' : '#DC2626';
            const stampText = isLunas ? 'LUNAS' : 'BELUM LUNAS';
            const stampHtml = `<div style="border: 3px solid ${stampColor}; color: ${stampColor}; padding: 12px 40px; font-weight: 800; font-size: 22px; text-transform: uppercase; border-radius: 12px; transform: rotate(-8deg); display: inline-block; letter-spacing: 2px;">${stampText}</div>`;

            const bodyContent = `
                ${this.getDocHeaderHTML('INVOICE', data.invNo, 'NOMOR INVOICE')}
                <div style="text-align: right; margin-top: -20px; margin-bottom: 30px;">
                    <div class="doc-meta">${data.date.replace(/,\s*(?:pukul\s*)?\d{1,2}:\d{2}\s*WIB/gi, '').trim()}</div>
                    <div class="doc-meta-lbl">TANGGAL TERBIT</div>
                </div>
                <div class="client-box">
                    <div>
                        <div class="client-label">Kepada Yth.</div>
                        <div class="client-val">${data.customer}</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="client-label">Jatuh Tempo</div>
                        <div class="client-val deadline-val">${data.deadline}</div>
                    </div>
                </div>
                <table>
                    <colgroup><col style="width:50%"><col style="width:10%"><col style="width:20%"><col style="width:20%"></colgroup>
                    <thead><tr><th>Produk / Layanan</th><th class="al-center">Qty</th><th class="al-right">Harga Satuan</th><th class="al-right">Total</th></tr></thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>
                                    <div class="t-item">${item.name}</div>
                                    ${item.desc ? `<div class="t-desc">${item.desc}</div>` : ''}
                                </td>
                                <td class="al-center"><b>${item.qty}</b></td>
                                <td class="al-right">Rp ${f(item.price)}</td>
                                <td class="al-right val">Rp ${f(item.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <table class="total-box">
                    <tr class="total-row"><td class="lbl">Total Tagihan</td><td class="al-right val">Rp ${f(t.grandTotal)}</td></tr>
                    <tr class="total-row"><td class="lbl">Pembayaran Awal (DP)</td><td class="al-right val">Rp ${f(t.dp)}</td></tr>
                    <tr class="total-row"><td class="grand-total font-bold">SISA TAGIHAN</td><td class="al-right grand-total font-bold" style="color: ${stampColor}">Rp ${f(t.sisa)}</td></tr>
                </table>
                <div class="stamp-wrapper">${stampHtml}</div>`;

            this.openPrintPreview(this.buildDocument('invoice', fileName, bodyContent));
        },

        printInvoice(t) { this.downloadPDF(t); },

        // =====================================================
        // 2. LAPORAN TAHUNAN (ANNUAL REPORT)
        // =====================================================
        downloadAnnualReport() {
            this.notify('Mengambil data laporan tahunan...', 'info');
            this._fetchPdf('generateAnnualReport', { year: this.reportDate.year }, res => this.printAnnualReportClientSide(res));
        },

        printAnnualReportClientSide(data) {
            const f = n => this.fmtRp(n);
            const sum = data.summary;
            const fileName = `Laporan Tahunan ${data.year}`;
            const bodyContent = `
                ${this.getDocHeaderHTML('LAPORAN TAHUNAN', 'Tahun ' + data.year, 'PERIODE')}
                <div class="summary-grid">
                    <div class="card" style="background:#eff6ff"><div class="card-lbl">Omzet</div><div class="card-val text-blue">Rp ${f(sum.omzet)}</div></div>
                    <div class="card" style="background:#fef2f2"><div class="card-lbl">Modal</div><div class="card-val text-red">(${f(sum.modal)})</div></div>
                    <div class="card" style="background:#fff7ed"><div class="card-lbl">Biaya</div><div class="card-val text-orange">(${f(sum.expense)})</div></div>
                    <div class="card" style="background:#f0fdf4"><div class="card-lbl">Profit</div><div class="card-val text-green">Rp ${f(sum.profit)}</div></div>
                </div>
                <div class="section-head">REKAPITULASI BULANAN</div>
                <table class="data-table">
                    <colgroup><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"></colgroup>
                    <thead><tr><th>BULAN</th><th class="al-right">OMZET</th><th class="al-right">MODAL</th><th class="al-right">BIAYA</th><th class="al-right">NET</th></tr></thead>
                    <tbody>
                        ${data.months.map(m => '<tr><td class="font-bold">' + m.month + '</td><td class="al-right text-blue">' + f(m.omzet) + '</td><td class="al-right text-red">(' + f(m.modal) + ')</td><td class="al-right text-orange">(' + f(m.expense) + ')</td><td class="al-right text-green font-bold">' + f(m.net) + '</td></tr>').join('')}
                    </tbody>
                    <tfoot><tr class="total-row"><td class="font-bold">TOTAL</td><td class="al-right text-blue font-bold">${f(sum.omzet)}</td><td class="al-right text-red">(${f(sum.modal)})</td><td class="al-right text-orange">(${f(sum.expense)})</td><td class="al-right text-green font-bold">${f(sum.profit)}</td></tr></tfoot>
                </table>`;
            this.openPrintPreview(this.buildDocument('report', fileName, bodyContent));
        },

        // =====================================================
        // 3. LAPORAN PENGELUARAN (EXPENSE REPORT)
        // =====================================================
        downloadExpenseReport() {
            this.notify('Mengambil data pengeluaran...', 'info');
            this._fetchPdf('generateExpenseOnlyReport', { year: this.reportDate.year, month: this.reportDate.month }, res => this.printExpenseReportClientSide(res));
        },

        printExpenseReportClientSide(data) {
            const f = n => this.fmtRp(n);
            const fileName = `Laporan Pengeluaran ${data.period}`;
            const bodyContent = `
                ${this.getDocHeaderHTML('LAPORAN PENGELUARAN', data.period, 'PERIODE')}
                <div class="summary-grid" style="grid-template-columns: 1fr;">
                    <div class="card" style="background:#fff7ed"><div class="card-lbl text-orange">TOTAL PENGELUARAN</div><div class="card-val text-orange">Rp ${f(data.summary.totalExpense)}</div></div>
                </div>
                <div class="section-head">RINCIAN DETAIL</div>
                <table class="data-table">
                    <colgroup><col style="width:18%"><col style="width:22%"><col style="width:40%"><col style="width:20%"></colgroup>
                    <thead><tr><th>TANGGAL</th><th>KATEGORI</th><th>KETERANGAN</th><th class="al-right">NOMINAL</th></tr></thead>
                    <tbody>
                        ${data.expenses.length ? data.expenses.map(r => '<tr><td>' + r.date + '</td><td>' + r.category + '</td><td>' + r.desc + '</td><td class="al-right text-orange">' + f(r.amount) + '</td></tr>').join('') : '<tr><td colspan="4" class="al-center">- Kosong -</td></tr>'}
                    </tbody>
                    <tfoot><tr class="total-row"><td colspan="3" class="al-right font-bold">TOTAL</td><td class="al-right text-orange font-bold">${f(data.summary.totalExpense)}</td></tr></tfoot>
                </table>`;
            this.openPrintPreview(this.buildDocument('report', fileName, bodyContent));
        },

        // =====================================================
        // 4. LAPORAN BULANAN (MONTHLY REPORT)
        // =====================================================
        printMonthly() {
            this.notify('Mengambil data laporan...', 'info');
            this._fetchPdf('generatePDFReport', { month: this.reportDate.month, year: this.reportDate.year }, res => this.printReportClientSide(res));
        },

        printReportClientSide(data) {
            const f = n => this.fmtRp(n);
            const sum = data.summary;
            const fileName = `Laporan ${data.period}`;
            const bodyContent = `
                ${this.getDocHeaderHTML('LAPORAN BULANAN', data.period, 'PERIODE')}
                <div class="summary-grid">
                    <div class="card" style="background:#eff6ff"><div class="card-lbl">Omzet</div><div class="card-val text-blue">Rp ${f(sum.omzet)}</div></div>
                    <div class="card" style="background:#fef2f2"><div class="card-lbl">Modal</div><div class="card-val text-red">(${f(sum.modal)})</div></div>
                    <div class="card" style="background:#fff7ed"><div class="card-lbl">Biaya</div><div class="card-val text-orange">(${f(sum.expense)})</div></div>
                    <div class="card" style="background:#f0fdf4"><div class="card-lbl">Profit</div><div class="card-val text-green">Rp ${f(sum.profit)}</div></div>
                </div>
                <div class="section-head">PENJUALAN</div>
                <table class="data-table">
                    <colgroup><col style="width:15%"><col style="width:27%"><col style="width:8%"><col style="width:16%"><col style="width:16%"><col style="width:18%"></colgroup>
                    <thead><tr><th>TGL</th><th>ITEM</th><th>QTY</th><th class="al-right">MODAL</th><th class="al-right">PROFIT</th><th class="al-right">TOTAL</th></tr></thead>
                    <tbody>
                        ${data.incomes.map(r => '<tr><td>' + r.date + '</td><td><b>' + r.item + '</b><br><small style="color:#9CA3AF">' + r.desc + '</small></td><td class="al-center">' + r.qty + '</td><td class="al-right text-red">' + f(r.modal) + '</td><td class="al-right text-green">' + f(r.profit) + '</td><td class="al-right text-blue font-bold">' + f(r.total) + '</td></tr>').join('')}
                    </tbody>
                </table>
                <div class="section-head">PENGELUARAN</div>
                <table class="data-table">
                    <colgroup><col style="width:18%"><col style="width:22%"><col style="width:40%"><col style="width:20%"></colgroup>
                    <thead><tr><th>TGL</th><th>KATEGORI</th><th>KET</th><th class="al-right">NOMINAL</th></tr></thead>
                    <tbody>
                        ${data.expenses.length ? data.expenses.map(r => '<tr><td>' + r.date + '</td><td>' + r.category + '</td><td>' + r.desc + '</td><td class="al-right text-orange">' + f(r.amount) + '</td></tr>').join('') : '<tr><td colspan="4" class="al-center">- Kosong -</td></tr>'}
                    </tbody>
                </table>`;
            this.openPrintPreview(this.buildDocument('report', fileName, bodyContent));
        },

        // =====================================================
        // 5. STRUK THERMAL
        // =====================================================
        printReceipt(t) {
            if (!t || !t.items) return this.notify('Data transaksi tidak valid', 'error');
            const f = n => this.fmtRp(n);
            const dateStr = t.fullDate || t.displayDate || new Date().toLocaleDateString('id-ID');
            const html = `<html>
                <head>
                    <meta charset="UTF-8">
                    <title>Struk - ${t.id}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; font-size: 12px; width: 58mm; margin: 0; padding: 5px; color: #000; }
                        .center { text-align: center; } .right { text-align: right; } .bold { font-weight: bold; }
                        .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                        table { width: 100%; border-collapse: collapse; } td { vertical-align: top; }
                    </style>
                </head>
                <body>
                    <div class="center bold">GROW SOUVENIR AND ADVERTISING</div>
                    <div class="center">Jl. Vetpur Raya III, Gg. Amat Salim</div>
                    <div class="center">WA: 0815 8899 407</div>
                    <div class="line"></div>
                    <div>No: ${String(t.id).substring(0, 8)}</div>
                    <div>Tgl: ${dateStr}</div>
                    <div>Pel: ${t.customer}</div>
                    <div>Kasir: ${t.cashier || '-'}</div>
                    <div class="line"></div>
                    <table>
                        ${t.items.map(item => '<tr><td colspan="2">' + item.productName + '</td></tr><tr><td>' + item.qty + ' x ' + f(item.sellPrice) + '</td><td class="right">' + f(item.qty * item.sellPrice) + '</td></tr>').join('')}
                    </table>
                    <div class="line"></div>
                    <table>
                        <tr><td>Total</td><td class="right bold">${f(t.total)}</td></tr>
                        <tr><td>DP</td><td class="right">${f(t.dp)}</td></tr>
                        <tr><td>Sisa</td><td class="right bold">${f(t.sisa)}</td></tr>
                    </table>
                    <div class="line"></div>
                    <div class="center">Terima Kasih!</div>
                    <div class="center" style="margin-top:20px;">.</div>
                </body>
                </html>`;
            const popup = window.open('', '_blank', 'width=300,height=600');
            if (popup) { popup.document.write(html); popup.document.close(); popup.focus(); setTimeout(() => { popup.print(); popup.close(); }, 500); }
            else this.notify('Popup diblokir browser. Izinkan popup untuk mencetak struk.', 'error');
        }
    }
}

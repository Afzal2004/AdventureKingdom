/* Authentication, payment gate & admin access */
const AUTH_CONFIG = {
  adminEmail: 'mohammedafzal1423@gmail.com',
  adminPassword: 'Kingdom@2026',
  price: 59,
  upiId: 'athikaneef@oksbi', // Author's phone-based Google Pay UPI ID
  upiName: 'Mohammed Afzal', // Registered name on UPI
  storageKeys: {
    users: 'ak_users',
    session: 'ak_session',
    payments: 'ak_payments',
    unlockCodes: 'ak_unlock_codes'
  }
};

const DEFAULT_UNLOCK_CODES = ['KINGDOM100', 'AFRICA2026'];

const Auth = {
  getUsers() {
    try { return JSON.parse(localStorage.getItem(AUTH_CONFIG.storageKeys.users)) || {}; }
    catch { return {}; }
  },

  saveUsers(users) {
    localStorage.setItem(AUTH_CONFIG.storageKeys.users, JSON.stringify(users));
  },

  getSession() {
    try { return JSON.parse(localStorage.getItem(AUTH_CONFIG.storageKeys.session)); }
    catch { return null; }
  },

  setSession(user) {
    localStorage.setItem(AUTH_CONFIG.storageKeys.session, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(AUTH_CONFIG.storageKeys.session);
  },

  normalizePhone(phone) {
    return phone.trim().replace(/[^0-9+]/g, '');
  },

  normalizeEmail(email) {
    return email.trim().toLowerCase();
  },

  getUpiLink() {
    return `upi://pay?pa=${AUTH_CONFIG.upiId}&pn=${encodeURIComponent(AUTH_CONFIG.upiName)}&am=${AUTH_CONFIG.price}&cu=INR&tn=${encodeURIComponent('Adventure Kingdom Novel')}`;
  },

  register(name, phone) {
    const normPhone = this.normalizePhone(phone);
    if (!name.trim() || !normPhone || normPhone.length < 10) {
      return { ok: false, message: 'Please enter your name and a valid 10-digit phone number.' };
    }
    const users = this.getUsers();
    if (users[normPhone]) return { ok: false, message: 'An account with this phone number already exists.' };

    users[normPhone] = {
      name: name.trim(),
      phone: normPhone,
      isAdmin: false,
      paid: false,
      paidAt: null,
      createdAt: Date.now()
    };
    this.saveUsers(users);
    this.setSession({ phone: normPhone, name: name.trim(), isAdmin: false, paid: false });
    return { ok: true, message: 'Account created! Opening Google Pay...' };
  },

  login(phone) {
    const normPhone = this.normalizePhone(phone);
    if (!normPhone) {
      return { ok: false, message: 'Please enter your registered phone number.' };
    }
    const users = this.getUsers();
    const user = users[normPhone];
    if (!user) {
      return { ok: false, message: 'Phone number not registered. Please register first.' };
    }
    this.setSession({ phone: normPhone, name: user.name, isAdmin: false, paid: user.paid });
    return { ok: true, message: user.paid ? 'Welcome back!' : 'Logged in. Complete payment to unlock all chapters.' };
  },

  adminLogin(email, password) {
    const norm = this.normalizeEmail(email);
    if (norm === AUTH_CONFIG.adminEmail && password === AUTH_CONFIG.adminPassword) {
      const users = this.getUsers();
      if (!users[norm]) {
        users[norm] = {
          name: 'Mohammed Afzal',
          email: norm,
          isAdmin: true,
          paid: true,
          paidAt: Date.now(),
          createdAt: Date.now()
        };
        this.saveUsers(users);
      } else {
        users[norm].isAdmin = true;
        users[norm].paid = true;
        this.saveUsers(users);
      }
      this.setSession({ email: norm, name: 'Mohammed Afzal', isAdmin: true, paid: true });
      return { ok: true, message: 'Welcome back, Admin! Dashboard unlocked.' };
    }
    return { ok: false, message: 'Invalid admin email or password.' };
  },

  logout() {
    this.clearSession();
  },

  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    const key = session.isAdmin ? session.email : session.phone;
    const user = this.getUsers()[key];
    if (!user) { this.clearSession(); return null; }
    return { ...user, ...session, paid: user.paid || user.isAdmin };
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  hasAccess() {
    const user = this.getCurrentUser();
    return user && (user.isAdmin || user.paid);
  },

  submitPayment(txnId) {
    const user = this.getCurrentUser();
    if (!user) return { ok: false, message: 'Please log in first.' };
    if (user.isAdmin || user.paid) return { ok: true, message: 'You already have access!' };

    const ref = txnId.trim().toUpperCase();
    if (ref.length < 8) return { ok: false, message: 'Enter a valid UPI Transaction ID (at least 8 characters).' };

    const users = this.getUsers();
    const userKey = user.phone;
    const used = Object.values(users).some(u => u.txnId === ref && u.phone !== user.phone);
    if (used) return { ok: false, message: 'This Transaction ID has already been used.' };

    users[userKey].txnId = ref;
    users[userKey].paid = true;
    users[userKey].paidAt = Date.now();
    this.saveUsers(users);
    this.setSession({ ...this.getSession(), paid: true });
    return { ok: true, message: 'Payment verified! All chapters are now unlocked. Enjoy the adventure! 👑' };
  },

  redeemCode(code) {
    const user = this.getCurrentUser();
    if (!user) return { ok: false, message: 'Please log in first.' };
    if (user.isAdmin || user.paid) return { ok: true, message: 'You already have access!' };

    const codes = this.getUnlockCodes();
    const normalized = code.trim().toUpperCase();
    if (!codes.includes(normalized)) {
      return { ok: false, message: 'Invalid unlock code. Contact the author after payment.' };
    }

    const users = this.getUsers();
    const userKey = user.phone;
    users[userKey].paid = true;
    users[userKey].paidAt = Date.now();
    users[userKey].unlockCode = normalized;
    this.saveUsers(users);
    this.setSession({ ...this.getSession(), paid: true });
    return { ok: true, message: 'Unlock code accepted! Happy reading! 📖' };
  },

  getUnlockCodes() {
    try {
      const stored = JSON.parse(localStorage.getItem(AUTH_CONFIG.storageKeys.unlockCodes));
      return stored && stored.length ? stored : DEFAULT_UNLOCK_CODES;
    } catch {
      return DEFAULT_UNLOCK_CODES;
    }
  },

  addUnlockCode(code) {
    const codes = this.getUnlockCodes();
    const normalized = code.trim().toUpperCase();
    if (!normalized || codes.includes(normalized)) return false;
    codes.push(normalized);
    localStorage.setItem(AUTH_CONFIG.storageKeys.unlockCodes, JSON.stringify(codes));
    return true;
  },

  getPendingPayments() {
    const users = this.getUsers();
    return Object.values(users).filter(u => u.txnId && !u.paid && !u.isAdmin);
  },

  getAllReaders() {
    return Object.values(this.getUsers()).filter(u => !u.isAdmin);
  },

  adminGrantAccess(phone) {
    const users = this.getUsers();
    if (!users[phone]) return { ok: false, message: 'User not found.' };
    users[phone].paid = true;
    users[phone].paidAt = Date.now();
    this.saveUsers(users);
    return { ok: true, message: `Access granted to ${users[phone].name}.` };
  }
};

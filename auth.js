/* Authentication, payment gate & admin access */
const AUTH_CONFIG = {
  adminEmail: 'mohammedafzal1423@gmail.com',
  adminPassword: 'Kingdom@2026',
  price: 59,
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

  normalizeEmail(email) {
    return email.trim().toLowerCase();
  },

  register(name, email, password) {
    const norm = this.normalizeEmail(email);
    if (!name.trim() || !norm || password.length < 6) {
      return { ok: false, message: 'Please fill all fields. Password must be at least 6 characters.' };
    }
    const users = this.getUsers();
    if (users[norm]) return { ok: false, message: 'An account with this email already exists.' };

    const isAdmin = false;
    users[norm] = {
      name: name.trim(),
      email: norm,
      password,
      isAdmin,
      paid: false,
      paidAt: null,
      createdAt: Date.now()
    };
    this.saveUsers(users);
    this.setSession({ email: norm, name: name.trim(), isAdmin: false, paid: false });
    return { ok: true, message: 'Account created! Please complete payment to read the novel.' };
  },

  login(email, password) {
    const norm = this.normalizeEmail(email);
    const users = this.getUsers();

    if (norm === AUTH_CONFIG.adminEmail && password === AUTH_CONFIG.adminPassword) {
      if (!users[norm]) {
        users[norm] = {
          name: 'Mohammed Afzal',
          email: norm,
          password: AUTH_CONFIG.adminPassword,
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
      return { ok: true, message: 'Welcome back! Enjoy unlimited reading.' };
    }

    const user = users[norm];
    if (!user || user.password !== password) {
      return { ok: false, message: 'Invalid email or password.' };
    }
    this.setSession({ email: norm, name: user.name, isAdmin: user.isAdmin, paid: user.paid });
    return { ok: true, message: user.paid ? 'Welcome back!' : 'Logged in. Complete payment to unlock all chapters.' };
  },

  logout() {
    this.clearSession();
  },

  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    const user = this.getUsers()[session.email];
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
    const used = Object.values(users).some(u => u.txnId === ref && u.email !== user.email);
    if (used) return { ok: false, message: 'This Transaction ID has already been used.' };

    users[user.email].txnId = ref;
    users[user.email].paid = true;
    users[user.email].paidAt = Date.now();
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
    users[user.email].paid = true;
    users[user.email].paidAt = Date.now();
    users[user.email].unlockCode = normalized;
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

  adminGrantAccess(email) {
    const norm = this.normalizeEmail(email);
    const users = this.getUsers();
    if (!users[norm]) return { ok: false, message: 'User not found.' };
    users[norm].paid = true;
    users[norm].paidAt = Date.now();
    this.saveUsers(users);
    return { ok: true, message: `Access granted to ${users[norm].name}.` };
  }
};


// ---- LOADER ----
window.addEventListener('load', () => {
  setTimeout(() => { document.getElementById('loader').classList.add('hidden'); }, 1900);
});

// ---- NAV SCROLL ----
const navbar = document.getElementById('navbar');
const backTop = document.getElementById('back-top');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  backTop.classList.toggle('visible', window.scrollY > 400);
});

// ---- HAMBURGER & MOBILE NAV ----
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

function closeMobileMenu() {
  navLinks.classList.remove('open');
  hamburger.classList.remove('active');
  document.body.classList.remove('menu-open');
}

function toggleMobileMenu() {
  const isOpen = navLinks.classList.toggle('open');
  hamburger.classList.toggle('active', isOpen);
  document.body.classList.toggle('menu-open', isOpen);
}

hamburger.addEventListener('click', toggleMobileMenu);

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', closeMobileMenu);
});

document.addEventListener('click', e => {
  if (!navLinks.classList.contains('open')) return;
  if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) closeMobileMenu();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeMobileMenu();
});

// ---- THEME ----
const themeBtn = document.getElementById('theme-btn');
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  themeBtn.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
});

// ---- REVEAL ON SCROLL ----
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
}, { threshold: 0.12 });
reveals.forEach(r => observer.observe(r));

// ---- CHAPTERS DATA (from novel) ----
const chapters = NOVEL.chapters.map(ch => ({
  num: ch.num,
  title: ch.title,
  preview: ch.preview
}));

const grid = document.getElementById('chapters-grid');
function renderChapterCards() {
  grid.innerHTML = '';
  const hasAccess = Auth.hasAccess();
  const price = AUTH_CONFIG.price;
  chapters.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'chapter-card' + (hasAccess ? '' : ' locked');
    card.dataset.title = ch.title.toLowerCase();
    card.dataset.num = ch.num;
    card.innerHTML = `
      <p class="ch-num">Chapter ${ch.num}</p>
      <h3 class="ch-title">${ch.title}</h3>
      <p class="ch-preview">${ch.preview}</p>
      <span class="ch-more">${hasAccess ? 'Read chapter →' : 'Unlock to read →'}</span>
      ${!hasAccess ? `<span class="ch-lock-badge">🔒 ₹${price} to unlock</span>` : ''}
    `;
    card.addEventListener('click', () => openReader(ch.num - 1));
    grid.appendChild(card);
  });
}
renderChapterCards();

document.getElementById('chapter-search').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  document.querySelectorAll('.chapter-card').forEach(card => {
    card.classList.toggle('hidden', !card.dataset.title.includes(q) && q.length > 0);
  });
});

// ---- QUOTES SLIDER ----
const slides = document.querySelectorAll('.quote-slide');
const dotsWrap = document.getElementById('quote-dots');
let current = 0;
slides.forEach((_, i) => {
  const d = document.createElement('button');
  d.className = 'q-dot' + (i === 0 ? ' active' : '');
  d.addEventListener('click', () => showQuote(i));
  dotsWrap.appendChild(d);
});
function showQuote(n) {
  slides[current].classList.remove('active');
  dotsWrap.children[current].classList.remove('active');
  current = n;
  slides[current].classList.add('active');
  dotsWrap.children[current].classList.add('active');
}
setInterval(() => showQuote((current + 1) % slides.length), 5000);

// ---- LIGHTBOX ----
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
});

// ---- NEWSLETTER ----
function subscribeNewsletter() {
  const email = document.getElementById('nl-email').value;
  if (!email.includes('@')) return;
  document.getElementById('newsletter-success').style.display = 'block';
  document.getElementById('nl-email').value = '';
}

// ---- SMOOTH NAV LINKS ----
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      closeMobileMenu();
    }
  });
});

// ============================================================
// AUTH, PAYMENT & READER
// ============================================================

let currentChapterIndex = 0;
let readerFontSize = 1.05;

function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (!document.getElementById('reader').classList.contains('hidden')) return;
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => hideModal(btn.dataset.close));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) hideModal(overlay.id);
  });
});

function showMessage(el, msg, type) {
  el.textContent = msg;
  el.className = 'form-message ' + (type || '');
}

function updateAuthUI() {
  const user = Auth.getCurrentUser();
  const loginBtn = document.getElementById('login-btn');
  const userMenu = document.getElementById('user-menu');
  const adminBtn = document.getElementById('admin-btn');
  const price = AUTH_CONFIG.price;

  document.querySelectorAll('[data-price]').forEach(el => {
    el.textContent = `₹${price}`;
  });

  const gpayBtn = document.getElementById('gpay-btn');
  if (gpayBtn) {
    gpayBtn.href = Auth.getUpiLink();
  }

  if (user) {
    loginBtn.classList.add('hidden');
    userMenu.classList.remove('hidden');
    document.getElementById('user-greeting').textContent = user.name.split(' ')[0];
    adminBtn.classList.toggle('show-admin', !!user.isAdmin);
    adminBtn.setAttribute('aria-hidden', user.isAdmin ? 'false' : 'true');
  } else {
    loginBtn.classList.remove('hidden');
    userMenu.classList.add('hidden');
    adminBtn.classList.remove('show-admin');
    adminBtn.setAttribute('aria-hidden', 'true');
  }
  renderChapterCards();
}

// Auth tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    document.getElementById('login-form').classList.toggle('hidden', !isLogin);
    document.getElementById('register-form').classList.toggle('hidden', isLogin);
    showMessage(document.getElementById('auth-message'), '');
  });
});

// Toggle Admin Login in Login Form
let isAdminLogin = false;
const toggleAdminBtn = document.getElementById('toggle-admin-login');
if (toggleAdminBtn) {
  toggleAdminBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isAdminLogin = !isAdminLogin;
    
    const readerFields = document.getElementById('reader-login-fields');
    const adminFields = document.getElementById('admin-login-fields');
    const phoneInput = document.getElementById('login-phone');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    
    if (isAdminLogin) {
      readerFields.classList.add('hidden');
      adminFields.classList.remove('hidden');
      phoneInput.removeAttribute('required');
      emailInput.setAttribute('required', '');
      passwordInput.setAttribute('required', '');
      toggleAdminBtn.textContent = 'Reader Login';
    } else {
      readerFields.classList.remove('hidden');
      adminFields.classList.add('hidden');
      phoneInput.setAttribute('required', '');
      emailInput.removeAttribute('required');
      passwordInput.removeAttribute('required');
      toggleAdminBtn.textContent = 'Admin Login';
    }
    showMessage(document.getElementById('auth-message'), '');
  });
}

document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  let result;
  if (isAdminLogin) {
    result = Auth.adminLogin(
      document.getElementById('login-email').value,
      document.getElementById('login-password').value
    );
  } else {
    result = Auth.login(
      document.getElementById('login-phone').value
    );
  }
  showMessage(document.getElementById('auth-message'), result.message, result.ok ? 'success' : 'error');
  if (result.ok) {
    updateAuthUI();
    setTimeout(() => hideModal('auth-modal'), 800);
  }
});

document.getElementById('register-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const phone = document.getElementById('register-phone').value;
  
  const result = Auth.register(name, phone);
  showMessage(document.getElementById('auth-message'), result.message, result.ok ? 'success' : 'error');
  if (result.ok) {
    updateAuthUI();
    
    // Set UPI link in GPay button
    const gpayBtn = document.getElementById('gpay-btn');
    if (gpayBtn) {
      gpayBtn.href = Auth.getUpiLink();
    }
    
    setTimeout(() => {
      hideModal('auth-modal');
      // Open payment modal
      showModal('payment-modal');
      
      // Auto-trigger GPay UPI link on mobile
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = Auth.getUpiLink();
      }
    }, 1000);
  }
});

document.getElementById('login-btn').addEventListener('click', () => showModal('auth-modal'));
document.getElementById('logout-btn').addEventListener('click', () => {
  Auth.logout();
  updateAuthUI();
  closeReader();
});

function tryRead() {
  if (!Auth.isLoggedIn()) {
    showModal('auth-modal');
    return;
  }
  if (!Auth.hasAccess()) {
    showModal('payment-modal');
    return;
  }
  openReader(0);
}

function tryDownload() {
  if (!Auth.isLoggedIn()) {
    showModal('auth-modal');
    return;
  }
  if (!Auth.hasAccess()) {
    showModal('payment-modal');
    return;
  }
  const link = document.createElement('a');
  link.href = 'images/Novel sheet.pdf';
  link.download = 'The Adventure of an African Kingdom.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.getElementById('read-btn').addEventListener('click', tryRead);
document.getElementById('hero-read-btn').addEventListener('click', tryRead);
document.getElementById('hero-download-btn').addEventListener('click', tryDownload);
document.getElementById('download-pdf-btn').addEventListener('click', tryDownload);
document.getElementById('download-read-btn').addEventListener('click', tryRead);
document.getElementById('preview-read-btn').addEventListener('click', tryRead);
document.getElementById('locked-login-btn').addEventListener('click', tryRead);

// Payment Verification (if elements exist)
const verifyBtn = document.getElementById('verify-payment-btn');
if (verifyBtn) {
  verifyBtn.addEventListener('click', () => {
    const txnInput = document.getElementById('txn-id');
    const result = Auth.submitPayment(txnInput ? txnInput.value : '');
    showMessage(document.getElementById('payment-message'), result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      updateAuthUI();
      setTimeout(() => {
        hideModal('payment-modal');
        openReader(0);
      }, 1000);
    }
  });
}

const redeemBtn = document.getElementById('redeem-code-btn');
if (redeemBtn) {
  redeemBtn.addEventListener('click', () => {
    const codeInput = document.getElementById('unlock-code');
    const result = Auth.redeemCode(codeInput ? codeInput.value : '');
    showMessage(document.getElementById('payment-message'), result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      updateAuthUI();
      setTimeout(() => {
        hideModal('payment-modal');
        openReader(0);
      }, 1000);
    }
  });
}

// Admin
document.getElementById('admin-btn').addEventListener('click', () => {
  const user = Auth.getCurrentUser();
  if (!user || !user.isAdmin) return;
  renderAdminPanel();
  showModal('admin-modal');
});

function renderAdminPanel() {
  const readers = Auth.getAllReaders();
  const paid = readers.filter(r => r.paid).length;
  document.getElementById('admin-total-readers').textContent = readers.length;
  document.getElementById('admin-paid-readers').textContent = paid;

  const list = document.getElementById('admin-readers-list');
  list.innerHTML = readers.length ? '' : '<p style="color:var(--gray);font-size:0.8rem;">No readers yet.</p>';
  readers.forEach(r => {
    const item = document.createElement('div');
    item.className = 'admin-reader-item';
    const txnInfo = r.txnId ? `<br><span style="color:var(--gold);font-size:0.72rem;font-weight:bold;">Txn ID: ${r.txnId}</span>` : '';
    item.innerHTML = `
      <div>
        <strong>${r.name}</strong><br>
        <span style="color:var(--gray);font-size:0.72rem;">${r.phone}</span>
        ${txnInfo}
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <span class="${r.paid ? 'status-paid' : 'status-unpaid'}">${r.paid ? '✓ Paid' : '✗ Unpaid'}</span>
        ${!r.paid ? `<button class="admin-grant-btn" data-phone="${r.phone}">Grant Access</button>` : ''}
      </div>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('.admin-grant-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const result = Auth.adminGrantAccess(btn.dataset.phone);
      showMessage(document.getElementById('admin-message'), result.message, result.ok ? 'success' : 'error');
      renderAdminPanel();
    });
  });
}

document.getElementById('add-code-btn').addEventListener('click', () => {
  const code = document.getElementById('new-unlock-code').value;
  if (Auth.addUnlockCode(code)) {
    showMessage(document.getElementById('admin-message'), 'Unlock code added!', 'success');
    document.getElementById('new-unlock-code').value = '';
  } else {
    showMessage(document.getElementById('admin-message'), 'Invalid or duplicate code.', 'error');
  }
});

// Reader
function buildReaderSidebar() {
  const list = document.getElementById('reader-chapter-list');
  list.innerHTML = '';
  NOVEL.chapters.forEach((ch, i) => {
    const li = document.createElement('li');
    li.textContent = `Ch. ${ch.num} — ${ch.title}`;
    li.dataset.index = i;
    if (i === currentChapterIndex) li.classList.add('active');
    li.addEventListener('click', () => {
      loadChapter(i);
      document.getElementById('reader-sidebar').classList.remove('open');
    });
    list.appendChild(li);
  });
}

function loadChapter(index) {
  currentChapterIndex = index;
  const ch = NOVEL.chapters[index];
  const label = ch.num === 13 ? 'Final Chapter' : `Chapter ${ch.num}`;

  document.getElementById('reader-chapter-label').textContent = label;
  document.getElementById('reader-chapter-title').textContent = ch.title;
  document.getElementById('reader-eyebrow').textContent = label;
  document.getElementById('reader-h1').textContent = ch.title;

  const textEl = document.getElementById('reader-text');
  textEl.innerHTML = ch.content.map(p => `<p>${p}</p>`).join('');
  textEl.style.fontSize = readerFontSize + 'rem';

  document.getElementById('reader-prev').style.visibility = index === 0 ? 'hidden' : 'visible';
  document.getElementById('reader-next').textContent = index === NOVEL.chapters.length - 1 ? 'Finish ✦' : 'Next Chapter →';

  document.querySelectorAll('#reader-chapter-list li').forEach((li, i) => {
    li.classList.toggle('active', i === index);
  });

  document.getElementById('reader-content').scrollTop = 0;
  updateReaderProgress();
}

function updateReaderProgress() {
  const content = document.getElementById('reader-content');
  const pct = content.scrollHeight <= content.clientHeight
    ? 100
    : (content.scrollTop / (content.scrollHeight - content.clientHeight)) * 100;
  document.getElementById('reader-progress').style.width = pct + '%';
}

function openReader(chapterIndex) {
  if (!Auth.isLoggedIn()) { showModal('auth-modal'); return; }
  if (!Auth.hasAccess()) { showModal('payment-modal'); return; }

  buildReaderSidebar();
  loadChapter(chapterIndex || 0);
  document.getElementById('reader').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeReader() {
  document.getElementById('reader').classList.add('hidden');
  document.body.style.overflow = '';
}

document.getElementById('reader-close').addEventListener('click', closeReader);
document.getElementById('reader-prev').addEventListener('click', () => {
  if (currentChapterIndex > 0) loadChapter(currentChapterIndex - 1);
});
document.getElementById('reader-next').addEventListener('click', () => {
  if (currentChapterIndex < NOVEL.chapters.length - 1) loadChapter(currentChapterIndex + 1);
  else closeReader();
});

document.getElementById('reader-content').addEventListener('scroll', updateReaderProgress);

document.getElementById('reader-font-up').addEventListener('click', () => {
  readerFontSize = Math.min(1.4, readerFontSize + 0.05);
  document.getElementById('reader-text').style.fontSize = readerFontSize + 'rem';
});
document.getElementById('reader-font-down').addEventListener('click', () => {
  readerFontSize = Math.max(0.85, readerFontSize - 0.05);
  document.getElementById('reader-text').style.fontSize = readerFontSize + 'rem';
});

document.getElementById('reader-theme').addEventListener('click', () => {
  document.getElementById('reader').classList.toggle('sepia');
});

document.getElementById('reader-sidebar-toggle').addEventListener('click', () => {
  document.getElementById('reader-sidebar').classList.toggle('open');
});

document.getElementById('reader-content').addEventListener('click', () => {
  document.getElementById('reader-sidebar').classList.remove('open');
});

document.addEventListener('keydown', e => {
  if (document.getElementById('reader').classList.contains('hidden')) return;
  if (e.key === 'Escape') closeReader();
  if (e.key === 'ArrowLeft' && currentChapterIndex > 0) loadChapter(currentChapterIndex - 1);
  if (e.key === 'ArrowRight' && currentChapterIndex < NOVEL.chapters.length - 1) loadChapter(currentChapterIndex + 1);
});

updateAuthUI();

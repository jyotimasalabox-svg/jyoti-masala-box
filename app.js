// Jyoti Masala Box - Master Application & Customization Controller
// Features: Full Admin Dashboard, Live Site Customization, Dynamic Data Persistence,
// Recipe/Masala/Tip CRUD, Interactive Modals, Spice Calculator, AI Chef Assistant, and Bookmarks.

(function () {
  "use strict";

  // Load Master Data from localStorage or fall back to defaults
  function loadMasterData() {
    const saved = localStorage.getItem("jyoti_master_store");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.tips && parsed.masalas && parsed.recipes && parsed.config) {
          parsed.config.adminUser = parsed.config.adminUser || "admin";
          parsed.config.adminPass = parsed.config.adminPass || "jyoti123";
          parsed.config.upiId = parsed.config.upiId || "jyotimasala@upi";
          parsed.config.upiName = parsed.config.upiName || "Jyoti Masala Box";
          parsed.config.qrCustomImage = parsed.config.qrCustomImage || "";
          parsed.config.qrTitle = parsed.config.qrTitle || "स्कैन करें और भुगतान करें (Scan & Pay)";
          parsed.config.qrSubtitle = parsed.config.qrSubtitle || "Google Pay, PhonePe, Paytm या किसी भी UPI ऐप से भुगतान करें";
          if (parsed.config.showFooterQr === undefined) parsed.config.showFooterQr = true;
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved master store", e);
      }
    }
    // Default clone
    const base = {
      config: JSON.parse(JSON.stringify(JYOTI_CONFIG)),
      tips: JSON.parse(JSON.stringify(TIPS_DATA)),
      masalas: JSON.parse(JSON.stringify(MASALAS_DATA)),
      recipes: JSON.parse(JSON.stringify(RECIPES_DATA)),
      quickSos: JSON.parse(JSON.stringify(QUICK_SOS_HACKS))
    };
    base.config.adminUser = "admin";
    base.config.adminPass = "jyoti123";
    base.config.upiId = base.config.upiId || "jyotimasala@upi";
    base.config.upiName = base.config.upiName || "Jyoti Masala Box";
    base.config.qrCustomImage = base.config.qrCustomImage || "";
    base.config.qrTitle = base.config.qrTitle || "स्कैन करें और भुगतान करें (Scan & Pay)";
    base.config.qrSubtitle = base.config.qrSubtitle || "Google Pay, PhonePe, Paytm या किसी भी UPI ऐप से भुगतान करें";
    base.config.showFooterQr = true;
    return base;
  }

  // Application State
  const state = {
    isAdminLoggedIn: sessionStorage.getItem("jyoti_admin_auth") === "true",
    currentTab: "dashboard",
    adminSubTab: "general", // 'general' | 'tips' | 'masalas' | 'recipes' | 'sos' | 'backup'
    tipFilter: "all",
    masalaFilter: "all",
    recipeFilter: "all",
    activeSearch: "",
    data: loadMasterData(),
    bookmarks: JSON.parse(localStorage.getItem("jyoti_bookmarks") || '{"recipes":[], "tips":[], "masalas":[]}'),
    selectedMasalaBatch: {},
    chatMessages: [
      {
        sender: "bot",
        text: "नमस्ते! 🙏 मैं ज्योति दीदी हूँ। रसोई में कोई परेशानी है? जैसे सब्जी में नमक या तेल ज्यादा हो गया, दाल जल गई या कोई मसाला बनाना हो, बेझिझक पूछिए!",
        time: getCurrentTimeString()
      }
    ],
    isChatOpen: false
  };

  function saveMasterData() {
    localStorage.setItem("jyoti_master_store", JSON.stringify(state.data));
    updateGlobalHeaderAndFooter();
  }

  function getCurrentTimeString() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getWhatsAppUrl(customMessage) {
    const phone = state.data.config.rawPhone || "919876543210";
    const msg = encodeURIComponent(customMessage || state.data.config.whatsappText || "नमस्ते ज्योति दीदी!");
    return `https://wa.me/${phone}?text=${msg}`;
  }

  function getTelUrl() {
    const phone = state.data.config.rawPhone || "919876543210";
    return `tel:+${phone}`;
  }

  function copyUpiId() {
    const upi = state.data.config.upiId || "jyotimasala@upi";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(upi).then(() => {
        showToast(`UPI ID कॉपी हो गई: ${upi} 📋`);
      }).catch(() => {
        prompt("UPI ID कॉपी करें:", upi);
      });
    } else {
      prompt("UPI ID कॉपी करें:", upi);
    }
  }

  function openQrPaymentModal(customAmt = "") {
    const conf = state.data.config;
    const upiId = conf.upiId || "jyotimasala@upi";
    const upiName = conf.upiName || "Jyoti Masala Box";
    
    let baseUpiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&cu=INR`;
    if (customAmt && parseFloat(customAmt) > 0) {
      baseUpiUrl += `&am=${encodeURIComponent(customAmt)}`;
    }

    const qrImageSrc = conf.qrCustomImage && conf.qrCustomImage.trim() !== "" && !customAmt
      ? conf.qrCustomImage
      : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(baseUpiUrl)}&margin=10`;

    const modal = document.getElementById("universal-modal");
    const container = document.getElementById("modal-dynamic-content");
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden max-w-md w-full mx-auto shadow-2xl modal-content-box border-2 border-amber-400 text-gray-800">
        <!-- Close Button -->
        <button onclick="window.app.closeModal()" class="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <!-- Header -->
        <div class="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white p-6 text-center border-b border-amber-500/30">
          <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center mb-2 shadow-inner">
            <i data-lucide="qr-code" class="w-6 h-6"></i>
          </div>
          <h3 class="text-xl font-bold font-rozha">डिजिटल UPI भुगतान (Scan & Pay)</h3>
          <p class="text-xs text-amber-200 mt-0.5">Google Pay, PhonePe, Paytm, BHIM या किसी भी बैंकिंग ऐप से स्कैन करें</p>
        </div>

        <div class="p-6 space-y-4 text-center">
          <!-- QR Code Display Box -->
          <div class="bg-amber-50/60 p-4 rounded-3xl border border-amber-200/80 inline-block shadow-inner">
            <div class="bg-white p-3 rounded-2xl shadow-md border border-amber-300 inline-block">
              <img id="payment-modal-qr-img" src="${qrImageSrc}" alt="UPI QR Code" class="w-52 h-52 object-contain mx-auto rounded-lg" />
            </div>
            ${customAmt ? `<div class="mt-2 text-sm font-bold text-amber-900">निर्धारित राशि: <span class="text-emerald-600 font-extrabold text-lg">₹${customAmt}</span></div>` : ''}
          </div>

          <!-- Quick Preset Amounts -->
          <div>
            <span class="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">त्वरित राशि चुनें (Quick Amount):</span>
            <div class="flex items-center justify-center gap-1.5 flex-wrap">
              <button onclick="window.app.setPaymentModalAmount('100')" class="px-3 py-1 rounded-xl text-xs font-bold ${customAmt === '100' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'} transition-all">₹100</button>
              <button onclick="window.app.setPaymentModalAmount('250')" class="px-3 py-1 rounded-xl text-xs font-bold ${customAmt === '250' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'} transition-all">₹250</button>
              <button onclick="window.app.setPaymentModalAmount('500')" class="px-3 py-1 rounded-xl text-xs font-bold ${customAmt === '500' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'} transition-all">₹500</button>
              <button onclick="window.app.setPaymentModalAmount('1000')" class="px-3 py-1 rounded-xl text-xs font-bold ${customAmt === '1000' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'} transition-all">₹1000</button>
              <button onclick="window.app.setPaymentModalAmount('')" class="px-3 py-1 rounded-xl text-xs font-bold ${!customAmt ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'} transition-all">खुली राशि</button>
            </div>
          </div>

          <!-- Payee & UPI ID Box -->
          <div class="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center justify-between text-left">
            <div>
              <div class="text-[10px] text-gray-500">खाता धारक (Payee)</div>
              <div class="font-bold text-gray-900 text-xs">${upiName}</div>
              <div class="text-xs font-mono font-bold text-emerald-700 mt-0.5">${upiId}</div>
            </div>
            <button onclick="window.app.copyUpiId()" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>कॉपी करें</span>
            </button>
          </div>

          <!-- Action buttons -->
          <div class="space-y-2 pt-1">
            <a href="${baseUpiUrl}" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
              <i data-lucide="smartphone" class="w-4 h-4"></i>
              <span>सीधे मोबाइल UPI ऐप में खोलें</span>
            </a>

            <a href="https://wa.me/${conf.rawPhone || '919876543210'}?text=${encodeURIComponent('नमस्ते ज्योति दीदी! मैंने UPI द्वारा भुगतान कर दिया है, कृपया चेक करें।')}" target="_blank" class="w-full bg-stone-100 hover:bg-emerald-50 text-emerald-800 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-emerald-200">
              <i data-lucide="message-circle" class="w-4 h-4 text-emerald-600"></i>
              <span>व्हाट्सएप पर पेमेंट स्क्रीनशॉट भेजें</span>
            </a>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    lucide.createIcons();
  }

  function setPaymentModalAmount(amount) {
    openQrPaymentModal(amount);
  }

  function updateGlobalHeaderAndFooter() {
    const conf = state.data.config;
    // Update Announcement Bar
    const topBar = document.querySelector("aside span");
    if (topBar && conf.announcementText) {
      topBar.textContent = conf.announcementText;
    }

    // Update Footer Contact display
    const footerPhone = document.getElementById("footer-call-phone");
    if (footerPhone && conf.phone) {
      footerPhone.textContent = conf.phone;
    }

    // Render / Update Footer QR Code Box
    const qrContainer = document.getElementById("footer-qr-container");
    if (qrContainer) {
      if (conf.showFooterQr === false) {
        qrContainer.innerHTML = "";
        qrContainer.classList.add("hidden");
      } else {
        qrContainer.classList.remove("hidden");
        const upiId = conf.upiId || "jyotimasala@upi";
        const upiName = conf.upiName || "Jyoti Masala Box";
        const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&cu=INR`;
        const qrImageSrc = conf.qrCustomImage && conf.qrCustomImage.trim() !== ""
          ? conf.qrCustomImage
          : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiPayUrl)}&margin=8`;

        qrContainer.innerHTML = `
          <div class="bg-gradient-to-b from-stone-800/95 via-stone-850 to-stone-900 border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col items-center text-center backdrop-blur-md">
            <!-- Glow subtle accent -->
            <div class="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/15 rounded-full blur-xl pointer-events-none"></div>

            <div class="flex items-center gap-1.5 mb-1.5">
              <span class="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-3 py-0.5 rounded-full shadow-xs">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>UPI पेमेंट (Scan & Pay)</span>
              </span>
            </div>

            <h4 class="text-white font-bold text-sm tracking-wide">${conf.qrTitle || 'स्कैन करें और भुगतान करें'}</h4>
            <p class="text-[11px] text-stone-400 mt-0.5 mb-3 line-clamp-1">${conf.qrSubtitle || 'GPay, PhonePe, Paytm या किसी भी UPI ऐप से भुगतान करें'}</p>

            <!-- QR Code Box in White Tile -->
            <div class="relative bg-white p-2.5 rounded-2xl shadow-xl border-2 border-amber-300/80 cursor-pointer group hover:scale-105 transition-all" onclick="window.app.openQrPaymentModal()" title="बड़ा देखने के लिए क्लिक करें">
              <img src="${qrImageSrc}" alt="UPI QR Code" class="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-lg" />
              <div class="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white text-xs font-bold gap-1 backdrop-blur-xs">
                <i data-lucide="maximize-2" class="w-5 h-5 text-amber-400"></i>
                <span class="text-[11px]">बड़ा देखने हेतु क्लिक करें</span>
              </div>
            </div>

            <!-- Payment Apps Supported Tags -->
            <div class="flex items-center justify-center gap-1.5 mt-3 flex-wrap text-[10px] font-bold text-stone-300">
              <span class="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">Google Pay</span>
              <span class="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">PhonePe</span>
              <span class="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">Paytm</span>
              <span class="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">BHIM</span>
            </div>

            <!-- Payee Name & UPI ID with Copy -->
            <div class="w-full bg-stone-950/80 border border-stone-700/80 rounded-2xl p-2.5 mt-3 flex items-center justify-between gap-2 shadow-inner">
              <div class="text-left min-w-0 flex-1">
                <div class="text-[9px] text-stone-400 uppercase tracking-wider font-semibold truncate">प्राप्तकर्ता: <span class="text-amber-400 font-bold">${upiName}</span></div>
                <div class="text-xs font-mono font-bold text-emerald-400 truncate">${upiId}</div>
              </div>
              <button onclick="window.app.copyUpiId()" class="shrink-0 bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95" title="UPI ID कॉपी करें">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                <span>कॉपी</span>
              </button>
            </div>

            <!-- Quick Action Buttons -->
            <div class="w-full grid grid-cols-2 gap-2 mt-3">
              <a href="${upiPayUrl}" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-md">
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                <span>ऐप में खोलें</span>
              </a>
              <button onclick="window.app.openQrPaymentModal()" class="bg-stone-700 hover:bg-stone-600 text-amber-200 text-[11px] font-bold py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm">
                <i data-lucide="scan" class="w-3.5 h-3.5 text-amber-400"></i>
                <span>फुल स्क्रीन QR</span>
              </button>
            </div>
          </div>
        `;
        lucide.createIcons();
      }
    }
  }

  function saveBookmarks() {
    localStorage.setItem("jyoti_bookmarks", JSON.stringify(state.bookmarks));
    updateBookmarkBadge();
  }

  function isBookmarked(type, id) {
    return state.bookmarks[type] && state.bookmarks[type].includes(id);
  }

  function toggleBookmark(type, id) {
    if (!state.bookmarks[type]) {
      state.bookmarks[type] = [];
    }
    const idx = state.bookmarks[type].indexOf(id);
    if (idx > -1) {
      state.bookmarks[type].splice(idx, 1);
      showToast("बुकमार्क से हटा दिया गया");
    } else {
      state.bookmarks[type].push(id);
      showToast("पसंदीदा में सुरक्षित कर लिया गया ❤️");
    }
    saveBookmarks();
    if (state.currentTab === "favorites") {
      renderFavorites();
    }
    refreshBookmarkButtons();
  }

  function showToast(msg) {
    const existing = document.getElementById("toast-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.className = "fixed bottom-20 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/95 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md text-xs sm:text-sm border border-amber-500/40 transition-all animate-bounce";
    toast.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-amber-400"></i> <span>${msg}</span>`;
    document.body.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      if (toast && toast.parentNode) toast.remove();
    }, 2800);
  }

  function updateBookmarkBadge() {
    const count = (state.bookmarks.recipes.length || 0) + (state.bookmarks.tips.length || 0) + (state.bookmarks.masalas.length || 0);
    const badges = document.querySelectorAll(".bookmark-count-badge");
    badges.forEach(b => {
      b.textContent = count;
      b.classList.toggle("hidden", count === 0);
    });
  }

  function refreshBookmarkButtons() {
    document.querySelectorAll("[data-bookmark-btn]").forEach(btn => {
      const type = btn.getAttribute("data-type");
      const id = btn.getAttribute("data-id");
      const bookmarked = isBookmarked(type, id);
      btn.innerHTML = bookmarked
        ? `<i data-lucide="bookmark-check" class="w-5 h-5 text-red-500 fill-red-500"></i>`
        : `<i data-lucide="bookmark" class="w-5 h-5 text-gray-400 hover:text-red-500"></i>`;
    });
    lucide.createIcons();
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) {
      alert("आपके ब्राउज़र में वॉइस सपोर्ट उपलब्ध नहीं है।");
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      showToast("ऑडियो बंद कर दिया गया");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes("hi") || v.name.toLowerCase().includes("hindi") || v.name.toLowerCase().includes("india"));
    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    showToast("ज्योति दीदी की आवाज़ सुन रहे हैं... 🔊");
    window.speechSynthesis.speak(utterance);
  }

  // Navigation Logic
  function switchTab(tabId, pushState = true) {
    if (tabId === "admin" && !state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    state.currentTab = tabId;
    if (pushState) {
      window.location.hash = tabId;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    // Update nav links styling
    document.querySelectorAll(".nav-link-btn").forEach(btn => {
      const target = btn.getAttribute("data-target");
      const active = target === tabId;
      if (target === "admin") {
        btn.classList.toggle("ring-2", active);
        btn.classList.toggle("ring-amber-400", active);
      } else {
        btn.classList.toggle("text-amber-600", active);
        btn.classList.toggle("border-b-2", active);
        btn.classList.toggle("border-amber-600", active);
        btn.classList.toggle("font-bold", active);
        btn.classList.toggle("text-gray-700", !active);
      }
    });

    // Mobile nav active states
    document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
      const active = btn.getAttribute("data-target") === tabId;
      btn.classList.toggle("text-amber-600", active);
      btn.classList.toggle("font-bold", active);
      btn.classList.toggle("text-gray-600", !active);
    });

    const tabs = ["dashboard", "tips", "masalas", "recipes", "favorites", "contact", "admin"];
    tabs.forEach(t => {
      const el = document.getElementById(`tab-content-${t}`);
      if (el) {
        el.classList.toggle("hidden", t !== tabId);
      }
    });

    closeMobileDrawer();

    if (tabId === "dashboard") renderDashboard();
    if (tabId === "tips") renderTips();
    if (tabId === "masalas") renderMasalas();
    if (tabId === "recipes") renderRecipes();
    if (tabId === "favorites") renderFavorites();
    if (tabId === "contact") renderContact();
    if (tabId === "admin") renderAdmin();

    lucide.createIcons();
  }

  function openMobileDrawer() {
    const drawer = document.getElementById("mobile-menu-drawer");
    if (drawer) drawer.classList.remove("translate-x-full");
  }

  function closeMobileDrawer() {
    const drawer = document.getElementById("mobile-menu-drawer");
    if (drawer) drawer.classList.add("translate-x-full");
  }

  // --- ADMIN AUTHENTICATION CONTROLS ---
  function openAdminLoginModal() {
    const modal = document.getElementById("admin-login-modal");
    if (!modal) return;
    const err = document.getElementById("admin-login-error");
    if (err) err.classList.add("hidden");
    const passInput = document.getElementById("admin-login-password");
    if (passInput) passInput.value = "";
    modal.classList.remove("hidden");
    if (passInput) passInput.focus();
    lucide.createIcons();
  }

  function closeAdminLoginModal() {
    const modal = document.getElementById("admin-login-modal");
    if (modal) modal.classList.add("hidden");
  }

  function handleAdminLogin(e) {
    e.preventDefault();
    const userInput = (document.getElementById("admin-login-username").value || "").trim();
    const passInput = (document.getElementById("admin-login-password").value || "").trim();

    const expectedUser = state.data.config.adminUser || "admin";
    const expectedPass = state.data.config.adminPass || "jyoti123";

    if (userInput.toLowerCase() === expectedUser.toLowerCase() && passInput === expectedPass) {
      state.isAdminLoggedIn = true;
      sessionStorage.setItem("jyoti_admin_auth", "true");
      closeAdminLoginModal();
      showToast("एडमिन लॉगिन सफल! आपका स्वागत है। 🔓");
      switchTab("admin");
      renderDashboard();
    } else {
      const err = document.getElementById("admin-login-error");
      if (err) {
        err.classList.remove("hidden");
      }
    }
  }

  function handleAdminLogout() {
    state.isAdminLoggedIn = false;
    sessionStorage.removeItem("jyoti_admin_auth");
    showToast("एडमिन लॉगआउट हो गया। 🔒");
    switchTab("dashboard");
    renderDashboard();
  }

  function togglePasswordVisibility(inputId) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.type = inp.type === "password" ? "text" : "password";
  }

  // --- RENDER DASHBOARD ---
  function renderDashboard() {
    const container = document.getElementById("tab-content-dashboard");
    if (!container) return;

    const conf = state.data.config;
    const tips = state.data.tips;
    const masalas = state.data.masalas;
    const recipes = state.data.recipes;
    const quickSos = state.data.quickSos;

    const dailyTip = tips[0] || {
      title: "सब्जी में तेल ज्यादा हो जाए तो बर्फ घुमाएं",
      badge: "इमरजेंसी हैक",
      image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
      shortDesc: "बर्फ का टुकड़ा डालकर अतिरिक्त तेल निकालें।",
      chefSecret: "ज्योति दीदी का नुस्खा: तरी वाली सब्जी में हमेशा तड़के के समय तेल थोड़ा कम डालें।",
      audioText: "सब्जी में ज्यादा तेल गिर जाए तो बर्फ का टुकड़ा तरी पर घुमाएं।"
    };
    const featuredMasalas = masalas.slice(0, 3);
    const popularRecipes = recipes.slice(0, 4);

    container.innerHTML = `
      <!-- Hero Banner -->
      <section class="relative overflow-hidden rounded-3xl shadow-xl border border-amber-200/60 gradient-warm-bg mb-10">
        <div class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl pointer-events-none"></div>
        <div class="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-red-400/15 blur-3xl pointer-events-none"></div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 md:p-12 relative z-10">
          <div class="lg:col-span-7 space-y-5">
            <div class="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-amber-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-md">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
              <span>100% शुद्ध घरेलू मसाले व जादुई कुकिंग हैक्स</span>
            </div>
            
            <h1 class="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              स्वाद ऐसा जो <span class="font-rozha text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-amber-600">घर की याद</span> दिला दे!
            </h1>
            
            <p class="text-gray-700 text-base sm:text-lg leading-relaxed">
              सब्जी में तेल-नमक ज्यादा हो गया? दाल जल गई? जलेबी या खमन नहीं फूल रहा? 
              चिंता छोड़िए! <strong>${conf.appName}</strong> में पाइए हर किचन समस्या का 2 मिनट में समाधान और दादी-नानी के सीक्रेट मसालों की प्रामाणिक विधियां।
            </p>

            <!-- Quick Action Buttons -->
            <div class="flex flex-wrap items-center gap-3 pt-2">
              <a href="${getWhatsAppUrl()}" target="_blank" class="inline-flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-emerald-600/30 transition-all card-hover-effect">
                <i data-lucide="message-circle" class="w-5 h-5"></i>
                <span>व्हाट्सएप पर पूछें</span>
              </a>
              
              <a href="${getTelUrl()}" class="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-red-600/30 transition-all card-hover-effect">
                <i data-lucide="phone-call" class="w-5 h-5"></i>
                <span>डायरेक्ट कॉल करें</span>
              </a>

              <button onclick="window.app.switchTab('tips')" class="inline-flex items-center gap-2 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 px-5 py-3 rounded-xl font-semibold shadow-sm transition-all">
                <i data-lucide="lightbulb" class="w-4 h-4 text-amber-600"></i>
                <span>किचन हैक्स देखें</span>
              </button>

              <button onclick="window.app.switchTab('admin')" class="inline-flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 px-4 py-3 rounded-xl font-bold text-xs shadow-sm transition-all">
                <i data-lucide="settings" class="w-4 h-4 text-amber-700"></i>
                <span>⚙️ कस्टमाइज़ डैशबोर्ड</span>
              </button>
            </div>
          </div>

          <div class="lg:col-span-5 relative">
            <div class="relative mx-auto max-w-sm rounded-2xl overflow-hidden shadow-2xl border-4 border-white card-hover-effect">
              <img src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80" alt="Indian Spices Box" class="w-full h-80 object-cover" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
                <span class="text-xs uppercase tracking-wider text-amber-300 font-semibold">असली खड़े मसालों का जादुई संतुलन</span>
                <h3 class="text-xl font-bold font-rozha mt-1">${conf.appName}</h3>
                <p class="text-xs text-gray-200 mt-1">${conf.tagline}</p>
              </div>
            </div>
            
            <!-- Floating Badge -->
            <div class="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur-md border border-amber-300 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold">
                <i data-lucide="award" class="w-6 h-6"></i>
              </div>
              <div>
                <div class="text-xs font-bold text-gray-900">${conf.experience}</div>
                <div class="text-[11px] text-gray-500">${conf.chefName}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Customizer Bar for instant access -->
      <section class="mb-12 bg-gradient-to-r from-amber-500 via-red-600 to-amber-600 p-0.5 rounded-3xl shadow-lg">
        <div class="bg-white rounded-[23px] p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-inner">
              <i data-lucide="settings-2" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-extrabold text-gray-900 text-base sm:text-lg">वेबसाइट कस्टमाइज़ेशन सेंटर</h3>
                <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">लाइव कंट्रोल</span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">नया मसाला, नई टिप, नई डिश जोड़ें या अपना फोन नंबर व नाम बदलें।</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button onclick="window.app.openAdminEditTip(null)" class="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>नई टिप</span>
            </button>
            <button onclick="window.app.openAdminEditMasala(null)" class="bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>नया मसाला</span>
            </button>
            <button onclick="window.app.openAdminEditRecipe(null)" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>नई रेसिपी</span>
            </button>
            <button onclick="window.app.switchTab('admin')" class="bg-gradient-to-r from-red-600 to-amber-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5">
              <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
              <span>कस्टमाइज़ डैशबोर्ड</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Kitchen SOS Emergency Fast Solver Bar -->
      <section class="mb-12">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-3 h-3 rounded-full bg-red-600 animate-ping"></div>
            <h2 class="text-2xl font-bold text-gray-900">किचन इमरजेंसी SOS (त्वरित समाधान)</h2>
          </div>
          <span class="text-xs text-gray-500 hidden sm:inline">क्लिक करके 1 सेकंड में समाधान पाएं</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${quickSos.map(sos => `
            <div onclick="window.app.openTipModal('${sos.linkId}')" class="bg-white border border-red-100 hover:border-red-400 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-start gap-3.5 group">
              <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <i data-lucide="${sos.icon || 'flame'}" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-gray-900 text-sm group-hover:text-red-700 transition-colors flex items-center gap-1.5">
                  ${sos.query}
                  <i data-lucide="chevron-right" class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </h3>
                <p class="text-xs text-gray-600 mt-1 line-clamp-2">${sos.answer}</p>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <!-- Key Stats Overview -->
      <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div class="bg-white p-5 rounded-2xl border border-amber-200/70 shadow-sm text-center">
          <div class="w-12 h-12 mx-auto rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <i data-lucide="lightbulb" class="w-6 h-6"></i>
          </div>
          <div class="text-2xl sm:text-3xl font-extrabold text-gray-900">${tips.length}+</div>
          <div class="text-xs sm:text-sm text-gray-600 mt-0.5">घरेलू कुकिंग हैक्स</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-red-200/70 shadow-sm text-center">
          <div class="w-12 h-12 mx-auto rounded-xl bg-red-100 text-red-700 flex items-center justify-center mb-3">
            <i data-lucide="sparkles" class="w-6 h-6"></i>
          </div>
          <div class="text-2xl sm:text-3xl font-extrabold text-gray-900">${masalas.length}+</div>
          <div class="text-xs sm:text-sm text-gray-600 mt-0.5">सीक्रेट होममेड मसाले</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-emerald-200/70 shadow-sm text-center">
          <div class="w-12 h-12 mx-auto rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <i data-lucide="utensils" class="w-6 h-6"></i>
          </div>
          <div class="text-2xl sm:text-3xl font-extrabold text-gray-900">${recipes.length}+</div>
          <div class="text-xs sm:text-sm text-gray-600 mt-0.5">परफेक्ट रेसिपीज़</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-blue-200/70 shadow-sm text-center">
          <div class="w-12 h-12 mx-auto rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
            <i data-lucide="message-circle" class="w-6 h-6"></i>
          </div>
          <div class="text-2xl sm:text-3xl font-extrabold text-gray-900">24/7</div>
          <div class="text-xs sm:text-sm text-gray-600 mt-0.5">व्हाट्सएप व कॉल सपोर्ट</div>
        </div>
      </section>

      <!-- Featured Daily Tip Card (With Audio Play) -->
      <section class="mb-12 bg-white rounded-3xl border border-amber-300/80 shadow-md p-6 sm:p-8 relative overflow-hidden">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="w-full md:w-1/3 shrink-0">
            <div class="relative rounded-2xl overflow-hidden shadow-lg h-56">
              <img src="${dailyTip.image}" alt="${dailyTip.title}" class="w-full h-full object-cover" />
              <span class="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                ${dailyTip.badge}
              </span>
            </div>
          </div>

          <div class="w-full md:w-2/3 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wider text-amber-600">🌟 आज की खास टिप (Featured Tip)</span>
              <button onclick="window.app.speakText('${dailyTip.audioText}')" class="inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-full font-semibold transition-colors">
                <i data-lucide="volume-2" class="w-4 h-4 text-amber-700"></i>
                <span>सुनें (Listen)</span>
              </button>
            </div>

            <h3 class="text-xl sm:text-2xl font-bold text-gray-900">${dailyTip.title}</h3>
            <p class="text-sm text-gray-600 leading-relaxed">${dailyTip.shortDesc}</p>
            
            <div class="bg-amber-50/70 border-l-4 border-amber-500 p-3 rounded-r-xl text-xs text-amber-950 font-medium">
              ${dailyTip.chefSecret}
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button onclick="window.app.openTipModal('${dailyTip.id}')" class="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition-all">
                पूरा उपाय विस्तार से पढ़ें
              </button>
              
              <button onclick="window.app.switchTab('tips')" class="text-gray-600 hover:text-gray-900 text-xs sm:text-sm font-medium underline">
                और भी ${tips.length}+ टिप्स देखें →
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Masala Shelf -->
      <section class="mb-12">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <i data-lucide="package" class="w-6 h-6 text-red-600"></i>
              सीक्रेट होममेड मसाले (Masala Shelf)
            </h2>
            <p class="text-xs sm:text-sm text-gray-500 mt-1">शुद्ध खड़े मसालों से घर पर बनाएं ढाबा और रेस्टोरेंट जैसी खुशबू</p>
          </div>
          <button onclick="window.app.switchTab('masalas')" class="text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-800">
            सभी मसाले देखें →
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${featuredMasalas.map(m => `
            <div class="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-xl transition-all card-hover-effect overflow-hidden flex flex-col justify-between">
              <div>
                <div class="relative h-44 overflow-hidden">
                  <img src="${m.image}" alt="${m.name}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  <span class="absolute top-3 left-3 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                    ${m.categoryLabel}
                  </span>
                  <div class="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <i data-lucide="star" class="w-3 h-3 text-amber-400 fill-amber-400"></i>
                    <span>${m.rating || 5.0} (${m.reviewsCount || 100})</span>
                  </div>
                </div>

                <div class="p-5 space-y-2">
                  <h3 class="font-bold text-gray-900 text-lg">${m.name}</h3>
                  <p class="text-xs text-amber-700 font-medium">${m.englishName}</p>
                  <p class="text-xs text-gray-600 line-clamp-2">${m.tagline}</p>
                  
                  <div class="pt-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100">
                    <span>⏱️ बनाने का समय: ${m.prepTime}</span>
                    <span>🌿 शेल्फ लाइफ: ${m.shelfLife}</span>
                  </div>
                </div>
              </div>

              <div class="p-5 pt-0">
                <button onclick="window.app.openMasalaModal('${m.id}')" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
                  <i data-lucide="book-open" class="w-4 h-4"></i>
                  <span>विधि व वजन अनुपात देखें</span>
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <!-- Trending Dishes -->
      <section class="mb-12">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <i data-lucide="chef-hat" class="w-6 h-6 text-amber-600"></i>
              ट्रेंडिंग स्वादिष्ट रेसिपीज (Popular Dishes)
            </h2>
            <p class="text-xs sm:text-sm text-gray-500 mt-1">सुपर क्रिस्पी जलेबी से लेकर ढाबा चिकन करी तक</p>
          </div>
          <button onclick="window.app.switchTab('recipes')" class="text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-800">
            पूरी रेसिपी लिस्ट →
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          ${popularRecipes.map(r => `
            <div class="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-xl transition-all card-hover-effect overflow-hidden flex flex-col justify-between">
              <div>
                <div class="relative h-44 overflow-hidden">
                  <img src="${r.image}" alt="${r.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  <span class="absolute top-3 left-3 ${r.isVeg ? 'bg-emerald-600' : 'bg-red-600'} text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-white"></span>
                    ${r.categoryLabel}
                  </span>
                  <button onclick="window.app.toggleBookmark('recipes', '${r.id}')" data-bookmark-btn data-type="recipes" data-id="${r.id}" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center">
                    ${isBookmarked('recipes', r.id) ? '<i data-lucide="bookmark-check" class="w-4 h-4 text-red-500 fill-red-500"></i>' : '<i data-lucide="bookmark" class="w-4 h-4 text-gray-500"></i>'}
                  </button>
                </div>

                <div class="p-4 space-y-2">
                  <h3 class="font-bold text-gray-900 text-base leading-snug">${r.title}</h3>
                  <p class="text-xs text-gray-500">${r.englishTitle}</p>
                  
                  <div class="flex items-center gap-3 text-[11px] text-gray-600 pt-1">
                    <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5 text-amber-600"></i> ${r.time}</span>
                    <span class="flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5 text-amber-600"></i> ${r.servings.split(' ')[0]} लोग</span>
                  </div>
                </div>
              </div>

              <div class="p-4 pt-0">
                <button onclick="window.app.openRecipeModal('${r.id}')" class="w-full bg-gray-900 hover:bg-amber-600 text-white font-semibold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                  <span>रेसिपी देखें</span>
                  <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <!-- Chef Profile & Direct Support Banner -->
      <section class="rounded-3xl bg-gradient-to-r from-stone-900 to-stone-800 text-white p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div class="md:col-span-8 space-y-4">
            <span class="text-amber-400 font-semibold text-xs tracking-wider uppercase">निःशुल्क व्यक्तिगत सहायता</span>
            <h2 class="text-2xl sm:text-3xl font-bold font-rozha">कुकिंग या मसालों को लेकर कोई भी सवाल है?</h2>
            <p class="text-sm text-gray-300 leading-relaxed max-w-xl">
              आप कभी भी ${conf.chefName} को सीधे व्हाट्सएप पर मैसेज भेज सकते हैं या डायरेक्ट कॉल कर सकते हैं। 
              शादी-पार्टी में ज्यादा मसालों के अनुपात से लेकर रोज की दाल-सब्जी को स्वादिष्ट बनाने तक, हर सवाल का स्वागत है।
            </p>
            <div class="flex flex-wrap items-center gap-4 pt-2">
              <a href="${getWhatsAppUrl()}" target="_blank" class="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all">
                <i data-lucide="message-circle" class="w-4 h-4"></i>
                <span>व्हाट्सएप पर चैट शुरू करें</span>
              </a>
              <a href="${getTelUrl()}" class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-semibold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all">
                <i data-lucide="phone" class="w-4 h-4 text-amber-400"></i>
                <span>कॉल करें (${conf.phone})</span>
              </a>
            </div>
          </div>
          <div class="md:col-span-4 text-center md:text-right">
            <div class="inline-block p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div class="text-3xl font-extrabold text-amber-400">10,000+</div>
              <div class="text-xs text-gray-300 mt-1">संतुष्ट गृहणियां व कुकिंग प्रेमी</div>
              <div class="mt-3 flex items-center justify-center md:justify-end gap-1 text-amber-400">
                <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
                <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
                <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
                <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
                <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
    lucide.createIcons();
  }

  // --- RENDER TIPS ---
  function renderTips() {
    const container = document.getElementById("tab-content-tips");
    if (!container) return;

    let filtered = state.data.tips;
    if (state.tipFilter !== "all") {
      filtered = filtered.filter(t => t.category === state.tipFilter);
    }
    if (state.activeSearch) {
      const q = state.activeSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.shortDesc.toLowerCase().includes(q) || 
        t.problem.toLowerCase().includes(q)
      );
    }

    const categories = [
      { id: "all", label: "सभी टिप्स (All)" },
      { id: "emergency", label: "🚨 इमरजेंसी सुधार (Oil, Salt, Burn)" },
      { id: "sweets", label: "🥨 मिठाई ट्रिक्स (Jalebi etc.)" },
      { id: "snacks", label: "🍰 नाश्ता ट्रिक्स (Khaman & Samosa)" },
      { id: "roti_chawal", label: "🌾 रोटी व चावल" },
      { id: "masala_storage", label: "🌿 मसाला सुरक्षा व भंडारण" }
    ];

    container.innerHTML = `
      <div class="mb-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-extrabold text-gray-900 flex items-center gap-2.5">
              <i data-lucide="lightbulb" class="w-8 h-8 text-amber-500"></i>
              घरेलू कुकिंग टिप्स और ट्रिक्स
            </h1>
            <p class="text-sm text-gray-600 mt-1">सब्जी में तेल-नमक सुधारने से लेकर हलवाई जैसी जलेबी और स्पंजी खमन बनाने के जादुई नुस्खे</p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.app.openAdminEditTip(null)" class="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>नई टिप जोड़ें</span>
            </button>
            <div class="hidden sm:inline-flex items-center gap-2 bg-amber-100/70 border border-amber-300 px-3 py-2 rounded-xl text-xs text-amber-900">
              <i data-lucide="headphones" class="w-4 h-4 text-amber-700"></i>
              <span>टिप्स को <strong>'सुनें'</strong> बटन दबाकर सुन भी सकते हैं!</span>
            </div>
          </div>
        </div>

        <!-- Category Pills -->
        <div class="flex flex-wrap items-center gap-2 mt-6">
          ${categories.map(c => `
            <button onclick="window.app.setTipFilter('${c.id}')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${state.tipFilter === c.id ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-amber-50'}">
              ${c.label}
            </button>
          `).join("")}
        </div>
      </div>

      <!-- Tips Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${filtered.map(t => `
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all card-hover-effect overflow-hidden flex flex-col justify-between">
            <div>
              <div class="relative h-48 overflow-hidden">
                <img src="${t.image}" alt="${t.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                <span class="absolute top-3 left-3 ${t.category === 'emergency' ? 'bg-red-600' : 'bg-amber-500'} text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                  ${t.badge}
                </span>

                <div class="absolute top-3 right-3 flex items-center gap-1.5">
                  <button onclick="window.app.speakText('${t.audioText || t.shortDesc}')" title="टिप सुनें (Listen Audio)" class="w-8 h-8 rounded-full bg-white/95 text-amber-700 backdrop-blur-md shadow-md flex items-center justify-center hover:bg-amber-50">
                    <i data-lucide="volume-2" class="w-4 h-4"></i>
                  </button>
                  <button onclick="window.app.toggleBookmark('tips', '${t.id}')" data-bookmark-btn data-type="tips" data-id="${t.id}" class="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center">
                    ${isBookmarked('tips', t.id) ? '<i data-lucide="bookmark-check" class="w-4 h-4 text-red-500 fill-red-500"></i>' : '<i data-lucide="bookmark" class="w-4 h-4 text-gray-500"></i>'}
                  </button>
                </div>
              </div>

              <div class="p-5 space-y-3">
                <h3 class="font-bold text-gray-900 text-lg leading-snug">${t.title}</h3>
                
                <div class="bg-red-50/60 border-l-2 border-red-500 px-3 py-1.5 rounded-r-lg text-xs text-red-950">
                  <span class="font-bold">समस्या:</span> ${t.problem}
                </div>

                <div class="bg-emerald-50 border-l-2 border-emerald-500 px-3 py-1.5 rounded-r-lg text-xs text-emerald-950">
                  <span class="font-bold">त्वरित उपाय:</span> ${t.quickAction}
                </div>
              </div>
            </div>

            <div class="p-5 pt-0 flex gap-2">
              <button onclick="window.app.openTipModal('${t.id}')" class="flex-1 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm border border-amber-300 transition-all flex items-center justify-center gap-2">
                <span>विस्तार से देखें</span>
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
              </button>
              <button onclick="window.app.openAdminEditTip('${t.id}')" title="एडिट करें" class="px-3 bg-gray-100 hover:bg-amber-100 text-gray-700 rounded-xl transition-colors">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `).join("")}
      </div>

      ${filtered.length === 0 ? `
        <div class="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
          <i data-lucide="search-x" class="w-12 h-12 text-gray-400 mx-auto mb-3"></i>
          <p class="text-gray-600 font-semibold">कोई टिप नहीं मिली।</p>
        </div>
      ` : ''}
    `;
    lucide.createIcons();
  }

  // --- RENDER MASALAS ---
  function renderMasalas() {
    const container = document.getElementById("tab-content-masalas");
    if (!container) return;

    let filtered = state.data.masalas;
    if (state.masalaFilter !== "all") {
      filtered = filtered.filter(m => m.category === state.masalaFilter);
    }
    if (state.activeSearch) {
      const q = state.activeSearch.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.englishName.toLowerCase().includes(q) || 
        m.description.toLowerCase().includes(q)
      );
    }

    const categories = [
      { id: "all", label: "सभी मसाले (All Blends)" },
      { id: "dal", label: "🥣 स्पेशल दाल मसाला" },
      { id: "non_veg", label: "🍗 चिकन व मटन मसाला" },
      { id: "daily", label: "👑 असली गरम मसाला" },
      { id: "special", label: "✨ चाट व चाय मसाला" }
    ];

    container.innerHTML = `
      <div class="mb-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-extrabold text-gray-900 flex items-center gap-2.5">
              <i data-lucide="package" class="w-8 h-8 text-red-600"></i>
              घरेलू मसाले बनाने की संपूर्ण विधि (Masala Formulations)
            </h1>
            <p class="text-sm text-gray-600 mt-1">दाल मसाला, चिकन मसाला, मटन मसाला व गरम मसाला का सटीक वजन अनुपात व भुनाई तकनीक</p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.app.openAdminEditMasala(null)" class="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>नया मसाला जोड़ें</span>
            </button>
            <div class="hidden sm:inline-flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-xl text-xs text-emerald-900 font-semibold">
              <i data-lucide="scale" class="w-4 h-4 text-emerald-600"></i>
              <span>ग्राम कैलकुलेटर (100g से 1kg)</span>
            </div>
          </div>
        </div>

        <!-- Filter Buttons -->
        <div class="flex flex-wrap items-center gap-2 mt-6">
          ${categories.map(c => `
            <button onclick="window.app.setMasalaFilter('${c.id}')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${state.masalaFilter === c.id ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-red-50'}">
              ${c.label}
            </button>
          `).join("")}
        </div>
      </div>

      <!-- Masalas Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${filtered.map(m => `
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all card-hover-effect overflow-hidden flex flex-col justify-between">
            <div>
              <div class="relative h-48 overflow-hidden">
                <img src="${m.image}" alt="${m.name}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                <span class="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                  ${m.categoryLabel}
                </span>

                <button onclick="window.app.toggleBookmark('masalas', '${m.id}')" data-bookmark-btn data-type="masalas" data-id="${m.id}" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center">
                  ${isBookmarked('masalas', m.id) ? '<i data-lucide="bookmark-check" class="w-4 h-4 text-red-500 fill-red-500"></i>' : '<i data-lucide="bookmark" class="w-4 h-4 text-gray-500"></i>'}
                </button>
              </div>

              <div class="p-5 space-y-3">
                <div>
                  <h3 class="font-bold text-gray-900 text-lg">${m.name}</h3>
                  <p class="text-xs text-amber-700 font-medium">${m.englishName}</p>
                </div>

                <p class="text-xs text-gray-600 line-clamp-2">${m.description}</p>
                
                <div class="bg-amber-50/80 p-3 rounded-xl space-y-1.5 text-xs text-gray-700">
                  <div class="flex justify-between">
                    <span class="text-gray-500">तीखापन:</span>
                    <span class="font-semibold text-red-700">${m.spiceLevel}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">शेल्फ लाइफ:</span>
                    <span class="font-semibold text-gray-800">${m.shelfLife}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">खड़े मसालों की संख्या:</span>
                    <span class="font-semibold text-emerald-700">${m.ingredients ? m.ingredients.length : 0} शुद्ध मसाले</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="p-5 pt-0 flex gap-2">
              <button onclick="window.app.openMasalaModal('${m.id}')" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
                <i data-lucide="scale" class="w-4 h-4"></i>
                <span>विधि व अनुपात देखें</span>
              </button>
              <button onclick="window.app.openAdminEditMasala('${m.id}')" title="एडिट करें" class="px-3 bg-gray-100 hover:bg-red-100 text-gray-700 rounded-xl transition-colors">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    lucide.createIcons();
  }

  // --- RENDER RECIPES ---
  function renderRecipes() {
    const container = document.getElementById("tab-content-recipes");
    if (!container) return;

    let filtered = state.data.recipes;
    if (state.recipeFilter !== "all") {
      filtered = filtered.filter(r => r.category === state.recipeFilter);
    }
    if (state.activeSearch) {
      const q = state.activeSearch.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(q) || 
        r.englishTitle.toLowerCase().includes(q) || 
        r.description.toLowerCase().includes(q)
      );
    }

    const categories = [
      { id: "all", label: "सभी रेसिपीज़ (All Recipes)" },
      { id: "veg", label: "🥗 शाकाहारी (Veg Special)" },
      { id: "nonveg", label: "🍗 मांसाहारी (Non-Veg Special)" },
      { id: "sweets", label: "🥨 मिठाई (Crispy Jalebi)" },
      { id: "snacks", label: "🍰 नाश्ता (Spongy Khaman)" }
    ];

    container.innerHTML = `
      <div class="mb-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-extrabold text-gray-900 flex items-center gap-2.5">
              <i data-lucide="utensils" class="w-8 h-8 text-amber-600"></i>
              स्वादिष्ट रेसिपीज़ सूची (Tried & Tested Recipes)
            </h1>
            <p class="text-sm text-gray-600 mt-1">खमन, कुरकुरी जलेबी, ढाबा दाल तड़का, चिकन करी और मटन कोरमा की हलवाई-स्टाइल विधियां</p>
          </div>

          <button onclick="window.app.openAdminEditRecipe(null)" class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>नई रेसिपी जोड़ें</span>
          </button>
        </div>

        <!-- Filter Buttons -->
        <div class="flex flex-wrap items-center gap-2 mt-6">
          ${categories.map(c => `
            <button onclick="window.app.setRecipeFilter('${c.id}')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${state.recipeFilter === c.id ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-amber-50'}">
              ${c.label}
            </button>
          `).join("")}
        </div>
      </div>

      <!-- Recipes Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${filtered.map(r => `
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all card-hover-effect overflow-hidden flex flex-col justify-between">
            <div>
              <div class="relative h-48 overflow-hidden">
                <img src="${r.image}" alt="${r.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                <span class="absolute top-3 left-3 ${r.isVeg ? 'bg-emerald-600' : 'bg-red-600'} text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-white"></span>
                  ${r.categoryLabel}
                </span>

                <button onclick="window.app.toggleBookmark('recipes', '${r.id}')" data-bookmark-btn data-type="recipes" data-id="${r.id}" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center">
                  ${isBookmarked('recipes', r.id) ? '<i data-lucide="bookmark-check" class="w-4 h-4 text-red-500 fill-red-500"></i>' : '<i data-lucide="bookmark" class="w-4 h-4 text-gray-500"></i>'}
                </button>
              </div>

              <div class="p-5 space-y-3">
                <div>
                  <h3 class="font-bold text-gray-900 text-lg">${r.title}</h3>
                  <p class="text-xs text-amber-700 font-medium">${r.englishTitle}</p>
                </div>

                <p class="text-xs text-gray-600 line-clamp-2">${r.description}</p>
                
                <div class="bg-amber-50/60 p-2.5 rounded-xl flex items-center justify-between text-xs text-gray-700">
                  <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5 text-amber-600"></i> ${r.time}</span>
                  <span class="flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5 text-amber-600"></i> ${r.servings.split(' ')[0]} सर्विंग्स</span>
                  <span class="flex items-center gap-1 text-emerald-700 font-semibold"><i data-lucide="activity" class="w-3.5 h-3.5"></i> ${r.difficulty}</span>
                </div>

                <div class="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg font-medium">
                  🌟 स्पेशल: ${r.specialMasalaUsed}
                </div>
              </div>
            </div>

            <div class="p-5 pt-0 flex gap-2">
              <button onclick="window.app.openRecipeModal('${r.id}')" class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
                <i data-lucide="book-open" class="w-4 h-4"></i>
                <span>सामग्री व विधि देखें</span>
              </button>
              <button onclick="window.app.openAdminEditRecipe('${r.id}')" title="एडिट करें" class="px-3 bg-gray-100 hover:bg-amber-100 text-gray-700 rounded-xl transition-colors">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    lucide.createIcons();
  }

  // --- RENDER FAVORITES ---
  function renderFavorites() {
    const container = document.getElementById("tab-content-favorites");
    if (!container) return;

    const savedRecipes = state.data.recipes.filter(r => isBookmarked('recipes', r.id));
    const savedTips = state.data.tips.filter(t => isBookmarked('tips', t.id));
    const savedMasalas = state.data.masalas.filter(m => isBookmarked('masalas', m.id));

    const totalCount = savedRecipes.length + savedTips.length + savedMasalas.length;

    container.innerHTML = `
      <div class="mb-8">
        <h1 class="text-3xl font-extrabold text-gray-900 flex items-center gap-2.5">
          <i data-lucide="heart" class="w-8 h-8 text-red-500 fill-red-500"></i>
          आपकी पसंदीदा लिस्ट (Saved Favorites)
        </h1>
        <p class="text-sm text-gray-600 mt-1">आपके द्वारा बुकमार्क की गई रेसिपीज़, घरेलू नुस्खे और मसाले</p>
      </div>

      ${totalCount === 0 ? `
        <div class="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300 max-w-lg mx-auto shadow-sm">
          <div class="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-4">
            <i data-lucide="bookmark" class="w-8 h-8"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900">अभी कोई आइटम सेव नहीं है</h3>
          <p class="text-xs sm:text-sm text-gray-500 mt-1 mb-6">किसी भी रेसिपी या टिप के ऊपर बुकमार्क आइकन दबाकर उसे यहाँ आसानी से सुरक्षित रखें।</p>
          <button onclick="window.app.switchTab('recipes')" class="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all">
            स्वादिष्ट रेसिपीज़ देखें
          </button>
        </div>
      ` : `
        <div class="space-y-10">
          ${savedTips.length > 0 ? `
            <div>
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i data-lucide="lightbulb" class="w-5 h-5 text-amber-500"></i>
                सेव किए गए कुकिंग टिप्स (${savedTips.length})
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${savedTips.map(t => `
                  <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 class="font-bold text-gray-900 text-sm mb-1">${t.title}</h4>
                      <p class="text-xs text-gray-500 line-clamp-2">${t.shortDesc}</p>
                    </div>
                    <div class="mt-4 flex items-center justify-between">
                      <button onclick="window.app.openTipModal('${t.id}')" class="text-xs text-amber-600 font-bold hover:underline">विस्तार से देखें →</button>
                      <button onclick="window.app.toggleBookmark('tips', '${t.id}')" class="text-xs text-red-500 hover:underline">हटाएं</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}

          ${savedMasalas.length > 0 ? `
            <div>
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i data-lucide="package" class="w-5 h-5 text-red-600"></i>
                सेव किए गए मसाले (${savedMasalas.length})
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${savedMasalas.map(m => `
                  <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 class="font-bold text-gray-900 text-sm mb-1">${m.name}</h4>
                      <p class="text-xs text-gray-500 line-clamp-2">${m.tagline}</p>
                    </div>
                    <div class="mt-4 flex items-center justify-between">
                      <button onclick="window.app.openMasalaModal('${m.id}')" class="text-xs text-red-600 font-bold hover:underline">अनुपात देखें →</button>
                      <button onclick="window.app.toggleBookmark('masalas', '${m.id}')" class="text-xs text-red-500 hover:underline">हटाएं</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}

          ${savedRecipes.length > 0 ? `
            <div>
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i data-lucide="utensils" class="w-5 h-5 text-amber-600"></i>
                सेव की गई रेसिपीज़ (${savedRecipes.length})
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${savedRecipes.map(r => `
                  <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 class="font-bold text-gray-900 text-sm mb-1">${r.title}</h4>
                      <p class="text-xs text-gray-500 line-clamp-2">${r.description}</p>
                    </div>
                    <div class="mt-4 flex items-center justify-between">
                      <button onclick="window.app.openRecipeModal('${r.id}')" class="text-xs text-amber-600 font-bold hover:underline">रेसिपी देखें →</button>
                      <button onclick="window.app.toggleBookmark('recipes', '${r.id}')" class="text-xs text-red-500 hover:underline">हटाएं</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}
        </div>
      `}
    `;
    lucide.createIcons();
  }

  // --- RENDER CONTACT ---
  function renderContact() {
    const container = document.getElementById("tab-content-contact");
    if (!container) return;

    const conf = state.data.config;

    container.innerHTML = `
      <div class="mb-10">
        <h1 class="text-3xl font-extrabold text-gray-900 flex items-center gap-2.5">
          <i data-lucide="phone-call" class="w-8 h-8 text-emerald-600"></i>
          संपर्क और सहायता (WhatsApp व Calling)
        </h1>
        <p class="text-sm text-gray-600 mt-1">${conf.chefName} से सीधे बात करें या अपनी कुकिंग समस्या का समाधान व्हाट्सएप पर पाएं</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-5 space-y-6">
          <div class="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden card-hover-effect">
            <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
              <i data-lucide="message-circle" class="w-8 h-8 text-white"></i>
            </div>
            <h3 class="text-2xl font-bold">व्हाट्सएप चैट (WhatsApp Support)</h3>
            <p class="text-emerald-100 text-xs sm:text-sm mt-1 mb-6">
              कुकिंग के दौरान कोई भी संशय हो, सीधे व्हाट्सएप पर पूछें।
            </p>
            <a href="${getWhatsAppUrl()}" target="_blank" class="w-full bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold py-3.5 rounded-2xl text-sm shadow-md transition-all flex items-center justify-center gap-2">
              <i data-lucide="send" class="w-4 h-4"></i>
              <span>व्हाट्सएप पर चैट करें (${conf.rawPhone})</span>
            </a>
          </div>

          <div class="bg-gradient-to-br from-red-600 to-amber-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden card-hover-effect">
            <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
              <i data-lucide="phone" class="w-8 h-8 text-white"></i>
            </div>
            <h3 class="text-2xl font-bold">डायरेक्ट कॉलिंग (Call Us)</h3>
            <p class="text-red-100 text-xs sm:text-sm mt-1 mb-6">
              मसाले का सटीक ऑर्डर या तुरंत सलाह लेने के लिए सीधे कॉल करें।
            </p>
            <a href="${getTelUrl()}" class="w-full bg-white hover:bg-red-50 text-red-800 font-extrabold py-3.5 rounded-2xl text-sm shadow-md transition-all flex items-center justify-center gap-2">
              <i data-lucide="phone-outgoing" class="w-4 h-4"></i>
              <span>अभी कॉल करें (${conf.phone})</span>
            </a>
          </div>

          <div class="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm text-center">
            <button onclick="window.app.switchTab('admin')" class="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2">
              <i data-lucide="settings" class="w-4 h-4 text-amber-700"></i>
              <span>⚙️ वेबसाइट व फोन नंबर कस्टमाइज़ करें</span>
            </button>
          </div>
        </div>

        <div class="lg:col-span-7">
          <div class="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-lg">
            <h3 class="text-2xl font-bold text-gray-900 mb-1">ज्योति दीदी से कोई भी सवाल पूछें</h3>
            <p class="text-xs sm:text-sm text-gray-500 mb-6">यह संदेश आप सीधे व्हाट्सएप पर भेज सकते हैं या हमारे पास दर्ज कर सकते हैं।</p>

            <form onsubmit="window.app.handleContactSubmit(event)" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">आपका शुभ नाम (Name)</label>
                <input type="text" id="contact-name" required placeholder="उदा. सुनीता शर्मा" class="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase mb-1">मोबाइल नंबर (Phone)</label>
                  <input type="tel" id="contact-phone" required placeholder="उदा. 98765 43210" class="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase mb-1">विषय (Query Topic)</label>
                  <select id="contact-topic" class="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all">
                    <option value="सब्जी/दाल में समस्या">सब्जी / दाल में समस्या (Emergency)</option>
                    <option value="मसाला बनाने में सहायता">मसाला बनाने में सहायता (Masalas)</option>
                    <option value="जलेबी या खमन नहीं बन रहा">जलेबी / खमन नहीं बन रहा (Hacks)</option>
                    <option value="अन्य कुकिंग सवाल">अन्य कुकिंग सवाल (General)</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">आपका सवाल विस्तार से लिखें</label>
                <textarea id="contact-msg" required rows="4" placeholder="उदा. मैंने दाल बनाई लेकिन जलने की बदबू आ रही है, मैं क्या करूँ?" class="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"></textarea>
              </div>

              <div class="pt-2 flex flex-col sm:flex-row gap-3">
                <button type="submit" class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2">
                  <i data-lucide="check" class="w-4 h-4"></i>
                  <span>मैसेज भेजें (Submit)</span>
                </button>

                <button type="button" onclick="window.app.sendQueryViaWhatsApp()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2">
                  <i data-lucide="message-circle" class="w-4 h-4"></i>
                  <span>सीधे व्हाट्सएप पर भेजें</span>
                </button>
              </div>
            </form>

            <div class="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
              <span class="flex items-center gap-1.5"><i data-lucide="clock" class="w-4 h-4 text-amber-600"></i> ${conf.workingHours}</span>
              <span class="flex items-center gap-1.5"><i data-lucide="map-pin" class="w-4 h-4 text-red-600"></i> ${conf.address}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
  }

  // --- RENDER ADMIN / CUSTOMIZATION DASHBOARD ---
  function renderAdmin() {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }
    const container = document.getElementById("tab-content-admin");
    if (!container) return;

    const conf = state.data.config;
    const tips = state.data.tips;
    const masalas = state.data.masalas;
    const recipes = state.data.recipes;
    const quickSos = state.data.quickSos;

    const subTabs = [
      { id: "general", label: "⚙️ सामान्य सेटिंग्स व फोन", icon: "settings" },
      { id: "tips", label: `💡 टिप्स मैनेजर (${tips.length})`, icon: "lightbulb" },
      { id: "masalas", label: `🌿 मसाला मैनेजर (${masalas.length})`, icon: "package" },
      { id: "recipes", label: `🍲 रेसिपी मैनेजर (${recipes.length})`, icon: "utensils" },
      { id: "sos", label: `🚨 SOS इमरजेंसी (${quickSos.length})`, icon: "flame" },
      { id: "backup", label: "💾 बैकअप व रीसेट", icon: "database" }
    ];

    container.innerHTML = `
      <div class="mb-8 bg-gradient-to-r from-stone-900 to-amber-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-amber-500/30">
        <div>
          <div class="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
            <span>कंट्रोल सेंटर (Admin Customizer)</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold font-rozha">कस्टमाइज़ेशन डैशबोर्ड (Customize Dashboard)</h1>
          <p class="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
            यहाँ से आप बिना कोड छुए वेबसाइट का नाम, मोबाइल व व्हाट्सएप नंबर, कुकिंग टिप्स, मसाले और नई रेसिपीज आसानी से बदल सकते हैं।
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button onclick="window.app.switchTab('dashboard')" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2">
            <i data-lucide="eye" class="w-4 h-4 text-amber-400"></i>
            <span>लाइव साइट देखें</span>
          </button>
          
          <button onclick="window.app.exportDataJSON()" class="bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span>बैकअप डाउनलोड</span>
          </button>

          <button onclick="window.app.handleAdminLogout()" class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2">
            <i data-lucide="log-out" class="w-4 h-4"></i>
            <span>लॉगआउट (Logout)</span>
          </button>
        </div>
      </div>

      <!-- Admin Sub Tabs Navigation -->
      <div class="flex flex-wrap items-center gap-2 mb-8 border-b border-gray-200 pb-3">
        ${subTabs.map(st => `
          <button onclick="window.app.setAdminSubTab('${st.id}')" class="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${state.adminSubTab === st.id ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-amber-50'}">
            <span>${st.label}</span>
          </button>
        `).join("")}
      </div>

      <!-- Dynamic Sub-Tab Content -->
      <div id="admin-subtab-container"></div>
    `;

    renderAdminSubTabContent();
    lucide.createIcons();
  }

  function setAdminSubTab(subTabId) {
    state.adminSubTab = subTabId;
    renderAdminSubTabContent();
    lucide.createIcons();
  }

  function renderAdminSubTabContent() {
    const container = document.getElementById("admin-subtab-container");
    if (!container) return;

    const conf = state.data.config;
    const tips = state.data.tips;
    const masalas = state.data.masalas;
    const recipes = state.data.recipes;
    const quickSos = state.data.quickSos;

    if (state.adminSubTab === "general") {
      container.innerHTML = `
        <div class="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <h2 class="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <i data-lucide="settings" class="w-5 h-5 text-amber-600"></i>
            ब्रांड, संपर्क व घोषणा सेटिंग्स
          </h2>
          <p class="text-xs text-gray-500 mb-6">यहाँ जानकारी बदलकर 'सुरक्षित करें' दबाएं, पूरी वेबसाइट तुरंत अपडेट हो जाएगी।</p>

          <form onsubmit="window.app.handleAdminSaveGeneral(event)" class="space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">वेबसाइट का नाम (English)</label>
                <input type="text" id="admin-appName" value="${conf.appName || 'Jyoti Masala Box'}" required class="w-full bg-gray-50 border border-gray-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm" />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">वेबसाइट का नाम (Hindi)</label>
                <input type="text" id="admin-hindiName" value="${conf.hindiName || 'ज्योति मसाला बॉक्स'}" required class="w-full bg-gray-50 border border-gray-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">टैगलाइन (Tagline)</label>
              <input type="text" id="admin-tagline" value="${conf.tagline || ''}" class="w-full bg-gray-50 border border-gray-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-emerald-800 uppercase mb-1">व्हाट्सएप नंबर (WhatsApp Phone - बिना + के)</label>
                <input type="text" id="admin-rawPhone" value="${conf.rawPhone || '919876543210'}" required placeholder="919876543210" class="w-full bg-emerald-50/50 border border-emerald-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm font-mono" />
                <span class="text-[10px] text-gray-500">उदा: 919876543210 (देश कोड 91 के साथ)</span>
              </div>

              <div>
                <label class="block text-xs font-bold text-red-800 uppercase mb-1">कॉलिंग नंबर (Display Call Phone)</label>
                <input type="text" id="admin-phone" value="${conf.phone || '+91 98765 43210'}" required class="w-full bg-red-50/50 border border-red-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">शेफ / संचालक का नाम</label>
                <input type="text" id="admin-chefName" value="${conf.chefName || 'ज्योति दीदी'}" class="w-full bg-gray-50 border border-gray-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm" />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">अनुभव विवरण</label>
                <input type="text" id="admin-experience" value="${conf.experience || '15+ वर्षों का अनुभव'}" class="w-full bg-gray-50 border border-gray-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">टॉप घोषणा पट्टी संदेश (Top Announcement Bar)</label>
              <input type="text" id="admin-announcement" value="${conf.announcementText || 'किचन इमरजेंसी? सब्जी में ज्यादा तेल या दाल जल गई? तुरंत समाधान के लिए नीचे दिए गए किचन SOS पर क्लिक करें!'}" class="w-full bg-amber-50 border border-amber-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">पता / लोकेशन</label>
                <input type="text" id="admin-address" value="${conf.address || 'भारत'}" class="w-full bg-gray-50 border border-gray-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm" />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">कार्य समय (Hours)</label>
                <input type="text" id="admin-workingHours" value="${conf.workingHours || 'सुबह 8:00 AM से रात 10:00 PM तक'}" class="w-full bg-gray-50 border border-gray-300 focus:bg-white rounded-xl px-4 py-2.5 text-sm" />
              </div>
            </div>

            <!-- UPI Payment & QR Code Customization Section -->
            <div class="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400/80 rounded-2xl space-y-4">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2 text-stone-900 font-extrabold text-sm">
                  <i data-lucide="qr-code" class="w-5 h-5 text-emerald-600"></i>
                  <span>💳 फूटर UPI पेमेंट व QR कोड सेटिंग्स (Footer QR Customizer)</span>
                </div>
                <label class="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-xl border border-emerald-300 shadow-xs">
                  <input type="checkbox" id="admin-showFooterQr" ${conf.showFooterQr !== false ? 'checked' : ''} class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600" />
                  <span class="text-xs font-bold text-gray-700">फूटर में QR कोड दिखाएं</span>
                </label>
              </div>
              <p class="text-xs text-stone-600">यहाँ अपनी UPI ID और नाम दर्ज करें ताकि ग्राहक फूटर में QR कोड स्कैन करके सीधे पैसे भेज सकें।</p>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label class="block text-xs font-bold text-emerald-900 uppercase mb-1">आपकी UPI ID (Google Pay / PhonePe / Paytm)</label>
                  <input type="text" id="admin-upiId" value="${conf.upiId || 'jyotimasala@upi'}" required placeholder="उदा: 9876543210@paytm या name@okaxis" class="w-full bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl px-4 py-2.5 text-sm font-mono shadow-xs" />
                  <span class="text-[10px] text-gray-500">इस ID से ऑटोमैटिक PhonePe/GPay QR कोड तैयार हो जाएगा।</span>
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase mb-1">खातेदार / प्राप्तकर्ता का नाम (Payee Name)</label>
                  <input type="text" id="admin-upiName" value="${conf.upiName || 'Jyoti Masala Box'}" required placeholder="उदा: ज्योति मसाला बॉक्स" class="w-full bg-white border border-gray-300 focus:border-emerald-600 rounded-xl px-4 py-2.5 text-sm shadow-xs" />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase mb-1">QR बॉक्स का मुख्य शीर्षक (Title)</label>
                  <input type="text" id="admin-qrTitle" value="${conf.qrTitle || 'स्कैन करें और भुगतान करें (Scan & Pay)'}" class="w-full bg-white border border-gray-300 focus:border-emerald-600 rounded-xl px-4 py-2.5 text-sm shadow-xs" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase mb-1">सबटाइटल / संदेश (Subtitle)</label>
                  <input type="text" id="admin-qrSubtitle" value="${conf.qrSubtitle || 'Google Pay, PhonePe, Paytm या किसी भी UPI ऐप से भुगतान करें'}" class="w-full bg-white border border-gray-300 focus:border-emerald-600 rounded-xl px-4 py-2.5 text-sm shadow-xs" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">वैकल्पिक: अपना कस्टम QR फोटो लिंक (Custom QR Image URL - यदि स्टैंडी QR लगाना चाहें)</label>
                <input type="url" id="admin-qrCustomImage" value="${conf.qrCustomImage || ''}" placeholder="खाली छोड़ें यदि ऊपर वाली UPI ID से ऑटो QR बनाना हो, या फोटो लिंक डालें" class="w-full bg-white border border-gray-300 focus:border-emerald-600 rounded-xl px-4 py-2.5 text-sm font-mono shadow-xs" />
                <span class="text-[10px] text-gray-500">यदि यह खाली रहेगा तो आपकी UPI ID से स्वतः क्लियर QR कोड बनेगा। यदि अपनी खुद की दुकान/QR स्टैंडी की फोटो लगाना चाहते हैं तो उसका लिंक यहाँ पेस्ट करें।</span>
              </div>
            </div>

            <!-- Admin Credentials Change Section -->
            <div class="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300/80 rounded-2xl space-y-3">
              <div class="flex items-center gap-2 text-stone-900 font-extrabold text-sm">
                <i data-lucide="shield-alert" class="w-4 h-4 text-amber-600"></i>
                <span>🔐 एडमिन लॉगिन सिक्योरिटी (Admin Login Credentials)</span>
              </div>
              <p class="text-xs text-stone-600">यहाँ से आप अपना गुप्त यूजरनेम और पासवर्ड बदल सकते हैं ताकि कोई दूसरा व्यक्ति कस्टमाइज़ न कर सके।</p>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase mb-1">एडमिन यूजरनेम (Admin Username)</label>
                  <input type="text" id="admin-adminUser" value="${conf.adminUser || 'admin'}" required class="w-full bg-white border border-gray-300 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-mono shadow-xs" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase mb-1">नया पासवर्ड (Admin Password)</label>
                  <div class="relative">
                    <input type="password" id="admin-adminPass" value="${conf.adminPass || 'jyoti123'}" required class="w-full bg-white border border-gray-300 focus:border-amber-500 rounded-xl pl-4 pr-10 py-2.5 text-sm font-mono shadow-xs" />
                    <button type="button" onclick="window.app.togglePasswordVisibility('admin-adminPass')" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                      <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button type="submit" class="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-8 py-3 rounded-xl text-sm shadow-md transition-all flex items-center gap-2">
                <i data-lucide="check" class="w-4 h-4"></i>
                <span>सेव करें (Save Settings)</span>
              </button>
            </div>
          </form>
        </div>
      `;
    } else if (state.adminSubTab === "tips") {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i data-lucide="lightbulb" class="w-5 h-5 text-amber-500"></i>
              घरेलू कुकिंग टिप्स सूची (${tips.length})
            </h2>
            <button onclick="window.app.openAdminEditTip(null)" class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>नई टिप जोड़ें</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${tips.map(t => `
              <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-start gap-4 justify-between">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                  <img src="${t.image}" alt="${t.title}" class="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div class="min-w-0">
                    <span class="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded-md">${t.badge}</span>
                    <h3 class="font-bold text-gray-900 text-sm mt-1 truncate">${t.title}</h3>
                    <p class="text-xs text-gray-500 mt-0.5 line-clamp-1">${t.problem}</p>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="window.app.openAdminEditTip('${t.id}')" class="p-2 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors" title="एडिट करें">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                  </button>
                  <button onclick="window.app.deleteTip('${t.id}')" class="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="हटाएं">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else if (state.adminSubTab === "masalas") {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i data-lucide="package" class="w-5 h-5 text-red-600"></i>
              सीक्रेट मसाले सूची (${masalas.length})
            </h2>
            <button onclick="window.app.openAdminEditMasala(null)" class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>नया मसाला जोड़ें</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${masalas.map(m => `
              <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-start gap-4 justify-between">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                  <img src="${m.image}" alt="${m.name}" class="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div class="min-w-0">
                    <span class="text-[10px] font-bold text-red-700 uppercase bg-red-50 px-2 py-0.5 rounded-md">${m.categoryLabel}</span>
                    <h3 class="font-bold text-gray-900 text-sm mt-1 truncate">${m.name}</h3>
                    <p class="text-xs text-amber-700">${m.englishName}</p>
                    <p class="text-[11px] text-gray-500 mt-0.5">${m.ingredients ? m.ingredients.length : 0} मसाले | ${m.prepTime}</p>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="window.app.openAdminEditMasala('${m.id}')" class="p-2 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors" title="एडिट करें">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                  </button>
                  <button onclick="window.app.deleteMasala('${m.id}')" class="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="हटाएं">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else if (state.adminSubTab === "recipes") {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i data-lucide="utensils" class="w-5 h-5 text-amber-600"></i>
              रेसिपीज सूची (${recipes.length})
            </h2>
            <button onclick="window.app.openAdminEditRecipe(null)" class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>नई रेसिपी जोड़ें</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${recipes.map(r => `
              <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-start gap-4 justify-between">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                  <img src="${r.image}" alt="${r.title}" class="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div class="min-w-0">
                    <span class="text-[10px] font-bold ${r.isVeg ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'} px-2 py-0.5 rounded-md">${r.categoryLabel}</span>
                    <h3 class="font-bold text-gray-900 text-sm mt-1 truncate">${r.title}</h3>
                    <p class="text-xs text-amber-700">${r.englishTitle}</p>
                    <p class="text-[11px] text-gray-500 mt-0.5">समय: ${r.time} | सर्विंग्स: ${r.servings}</p>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="window.app.openAdminEditRecipe('${r.id}')" class="p-2 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors" title="एडिट करें">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                  </button>
                  <button onclick="window.app.deleteRecipe('${r.id}')" class="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="हटाएं">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else if (state.adminSubTab === "sos") {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i data-lucide="flame" class="w-5 h-5 text-red-600"></i>
              किचन इमरजेंसी SOS सवाल (${quickSos.length})
            </h2>
            <button onclick="window.app.openAdminEditSos(null)" class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>नया SOS जोड़ें</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${quickSos.map((s, idx) => `
              <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-start gap-4 justify-between">
                <div>
                  <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-red-600"></span>
                    ${s.query}
                  </h3>
                  <p class="text-xs text-gray-600 mt-1">${s.answer}</p>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="window.app.deleteSos(${idx})" class="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="हटाएं">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else if (state.adminSubTab === "backup") {
      container.innerHTML = `
        <div class="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-8">
          <div>
            <h2 class="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <i data-lucide="database" class="w-5 h-5 text-amber-600"></i>
              डेटा बैकअप, रीस्टोर व रीसेट
            </h2>
            <p class="text-xs text-gray-500">आप अपने सभी कस्टम डेटा को JSON फाइल में सुरक्षित रख सकते हैं या कभी भी डिफ़ॉल्ट डेटा वापस ला सकते हैं।</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="border border-amber-200 rounded-2xl p-6 bg-amber-50/50 space-y-3 flex flex-col justify-between">
              <div>
                <h4 class="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <i data-lucide="download" class="w-4 h-4 text-amber-600"></i>
                  बैकअप डाउनलोड करें
                </h4>
                <p class="text-xs text-gray-600 mt-1">आपकी सभी रेसिपीज़, मसाले और फोन नंबर एक सिंगल JSON फाइल में सेव हो जाएंगे।</p>
              </div>
              <button onclick="window.app.exportDataJSON()" class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all">
                डाउनलोड JSON बैकअप
              </button>
            </div>

            <div class="border border-emerald-200 rounded-2xl p-6 bg-emerald-50/50 space-y-3 flex flex-col justify-between">
              <div>
                <h4 class="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <i data-lucide="upload" class="w-4 h-4 text-emerald-600"></i>
                  बैकअप अपलोड करें
                </h4>
                <p class="text-xs text-gray-600 mt-1">पहले से डाउनलोड की गई JSON फाइल अपलोड करके सारा डेटा रीस्टोर करें।</p>
              </div>
              <div>
                <input type="file" id="backup-file-input" accept=".json" onchange="window.app.importDataJSON(event)" class="hidden" />
                <button onclick="document.getElementById('backup-file-input').click()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all">
                  JSON फाइल चुनें
                </button>
              </div>
            </div>

            <div class="border border-red-200 rounded-2xl p-6 bg-red-50/50 space-y-3 flex flex-col justify-between">
              <div>
                <h4 class="font-bold text-red-900 text-sm flex items-center gap-2">
                  <i data-lucide="rotate-ccw" class="w-4 h-4 text-red-600"></i>
                  फैक्ट्री रीसेट (Factory Reset)
                </h4>
                <p class="text-xs text-red-700 mt-1">यदि कोई गलती हो जाए तो मूल डिफ़ॉल्ट डेटा वापस लाने के लिए रीसेट करें।</p>
              </div>
              <button onclick="window.app.resetMasterData()" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all">
                डिफ़ॉल्ट डेटा रीसेट करें
              </button>
            </div>
          </div>
        </div>
      `;
    }

    lucide.createIcons();
  }

  function handleAdminSaveGeneral(e) {
    e.preventDefault();
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    state.data.config.appName = document.getElementById("admin-appName").value;
    state.data.config.hindiName = document.getElementById("admin-hindiName").value;
    state.data.config.tagline = document.getElementById("admin-tagline").value;
    state.data.config.rawPhone = document.getElementById("admin-rawPhone").value.replace(/[^0-9]/g, "");
    state.data.config.phone = document.getElementById("admin-phone").value;
    state.data.config.chefName = document.getElementById("admin-chefName").value;
    state.data.config.experience = document.getElementById("admin-experience").value;
    state.data.config.announcementText = document.getElementById("admin-announcement").value;
    state.data.config.address = document.getElementById("admin-address").value;
    state.data.config.workingHours = document.getElementById("admin-workingHours").value;

    // UPI Payment & QR Code Config
    const upiIdInp = document.getElementById("admin-upiId");
    if (upiIdInp) state.data.config.upiId = upiIdInp.value.trim();
    const upiNameInp = document.getElementById("admin-upiName");
    if (upiNameInp) state.data.config.upiName = upiNameInp.value.trim();
    const qrTitleInp = document.getElementById("admin-qrTitle");
    if (qrTitleInp) state.data.config.qrTitle = qrTitleInp.value.trim();
    const qrSubtitleInp = document.getElementById("admin-qrSubtitle");
    if (qrSubtitleInp) state.data.config.qrSubtitle = qrSubtitleInp.value.trim();
    const qrCustomImageInp = document.getElementById("admin-qrCustomImage");
    if (qrCustomImageInp) state.data.config.qrCustomImage = qrCustomImageInp.value.trim();
    const showFooterQrInp = document.getElementById("admin-showFooterQr");
    if (showFooterQrInp) state.data.config.showFooterQr = showFooterQrInp.checked;

    const newAdminUser = (document.getElementById("admin-adminUser").value || "").trim();
    const newAdminPass = (document.getElementById("admin-adminPass").value || "").trim();
    if (newAdminUser) state.data.config.adminUser = newAdminUser;
    if (newAdminPass) state.data.config.adminPass = newAdminPass;

    saveMasterData();
    showToast("ब्रांड, संपर्क, पासवर्ड व QR पेमेंट सेटिंग्स सुरक्षित कर ली गईं! ✅");
  }

  // --- CRUD MODALS FOR TIPS ---
  function openAdminEditTip(tipId) {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    const isNew = !tipId;
    const tip = isNew ? {
      id: "tip-" + Date.now(),
      title: "",
      badge: "घरेलू नुस्खा",
      category: "emergency",
      categoryLabel: "इमरजेंसी सुधार",
      image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
      shortDesc: "",
      problem: "",
      quickAction: "",
      solutions: [
        { step: 1, title: "पहला उपाय", desc: "" },
        { step: 2, title: "दूसरा उपाय", desc: "" },
        { step: 3, title: "तीसरा उपाय", desc: "" }
      ],
      chefSecret: "",
      audioText: ""
    } : (state.data.tips.find(t => t.id === tipId) || {});

    const modal = document.getElementById("universal-modal");
    const container = document.getElementById("modal-dynamic-content");
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden max-w-2xl w-full mx-auto shadow-2xl modal-content-box border border-amber-200">
        <button onclick="window.app.closeModal()" class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="p-6 bg-gradient-to-r from-red-600 to-amber-600 text-white">
          <h3 class="text-xl font-bold">${isNew ? '➕ नई कुकिंग टिप जोड़ें' : '✏️ कुकिंग टिप एडिट करें'}</h3>
          <p class="text-xs text-amber-100">सब्जी, दाल, जलेबी या खमन से जुड़ा कोई भी हैक जोड़ें</p>
        </div>

        <form onsubmit="window.app.handleSaveTipForm(event, '${tip.id}', ${isNew})" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">टिप का शीर्षक (Title)</label>
            <input type="text" id="tip-form-title" value="${tip.title || ''}" required placeholder="उदा. सब्जी में ज्यादा तेल गिर जाए तो क्या करें?" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">बैज (Badge)</label>
              <input type="text" id="tip-form-badge" value="${tip.badge || 'इमरजेंसी हैक'}" required class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">केटेगरी (Category)</label>
              <select id="tip-form-category" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm">
                <option value="emergency" ${tip.category === 'emergency' ? 'selected' : ''}>इमरजेंसी सुधार (Emergency)</option>
                <option value="sweets" ${tip.category === 'sweets' ? 'selected' : ''}>मिठाई ट्रिक्स (Sweets)</option>
                <option value="snacks" ${tip.category === 'snacks' ? 'selected' : ''}>नाश्ता ट्रिक्स (Snacks)</option>
                <option value="roti_chawal" ${tip.category === 'roti_chawal' ? 'selected' : ''}>रोटी व चावल (Roti & Rice)</option>
                <option value="masala_storage" ${tip.category === 'masala_storage' ? 'selected' : ''}>मसाला सुरक्षा व भंडारण (Storage)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">फोटो लिंक (Image URL)</label>
            <input type="url" id="tip-form-image" value="${tip.image || ''}" required class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">समस्या क्या है? (Problem)</label>
            <input type="text" id="tip-form-problem" value="${tip.problem || ''}" required placeholder="उदा. सब्जी में गलती से ज्यादा तेल डल गया है..." class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">तुरंत करने वाला काम (Instant Quick Action)</label>
            <input type="text" id="tip-form-quick" value="${tip.quickAction || ''}" required placeholder="उदा. बर्फ का टुकड़ा तरी पर 15 सेकंड घुमाएं..." class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div class="border-t border-gray-100 pt-3">
            <h4 class="font-bold text-sm text-gray-900 mb-2">विस्तार से उपाय (3 Steps):</h4>
            <div class="space-y-3">
              <div>
                <input type="text" id="tip-form-s1-title" value="${tip.solutions && tip.solutions[0] ? tip.solutions[0].title : 'उपाय 1'}" placeholder="उपाय 1 शीर्षक" class="w-full bg-gray-50 border border-gray-300 rounded-t-xl px-3 py-1.5 text-xs font-bold" />
                <textarea id="tip-form-s1-desc" rows="2" placeholder="उपाय 1 का पूरा विवरण..." class="w-full bg-gray-50 border border-t-0 border-gray-300 rounded-b-xl px-3 py-2 text-xs">${tip.solutions && tip.solutions[0] ? tip.solutions[0].desc : ''}</textarea>
              </div>

              <div>
                <input type="text" id="tip-form-s2-title" value="${tip.solutions && tip.solutions[1] ? tip.solutions[1].title : 'उपाय 2'}" placeholder="उपाय 2 शीर्षक" class="w-full bg-gray-50 border border-gray-300 rounded-t-xl px-3 py-1.5 text-xs font-bold" />
                <textarea id="tip-form-s2-desc" rows="2" placeholder="उपाय 2 का पूरा विवरण..." class="w-full bg-gray-50 border border-t-0 border-gray-300 rounded-b-xl px-3 py-2 text-xs">${tip.solutions && tip.solutions[1] ? tip.solutions[1].desc : ''}</textarea>
              </div>

              <div>
                <input type="text" id="tip-form-s3-title" value="${tip.solutions && tip.solutions[2] ? tip.solutions[2].title : 'उपाय 3'}" placeholder="उपाय 3 शीर्षक" class="w-full bg-gray-50 border border-gray-300 rounded-t-xl px-3 py-1.5 text-xs font-bold" />
                <textarea id="tip-form-s3-desc" rows="2" placeholder="उपाय 3 का पूरा विवरण..." class="w-full bg-gray-50 border border-t-0 border-gray-300 rounded-b-xl px-3 py-2 text-xs">${tip.solutions && tip.solutions[2] ? tip.solutions[2].desc : ''}</textarea>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">ज्योति दीदी का सीक्रेट नुस्खा (Chef Secret)</label>
            <input type="text" id="tip-form-secret" value="${tip.chefSecret || ''}" placeholder="ज्योति दीदी का नुस्खा..." class="w-full bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div class="pt-4 flex items-center justify-end gap-3">
            <button type="button" onclick="window.app.closeModal()" class="px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50">रद्द करें</button>
            <button type="submit" class="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md">टिप सेव करें</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove("hidden");
    lucide.createIcons();
  }

  function handleSaveTipForm(e, tipId, isNew) {
    e.preventDefault();
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    const cat = document.getElementById("tip-form-category").value;
    const catLabels = {
      emergency: "इमरजेंसी सुधार",
      sweets: "मिठाई ट्रिक्स",
      snacks: "नाश्ता ट्रिक्स",
      roti_chawal: "रोटी व चावल",
      masala_storage: "मसाला व सुरक्षा"
    };

    const newTip = {
      id: tipId,
      title: document.getElementById("tip-form-title").value,
      badge: document.getElementById("tip-form-badge").value,
      category: cat,
      categoryLabel: catLabels[cat] || "घरेलू नुस्खा",
      image: document.getElementById("tip-form-image").value,
      shortDesc: document.getElementById("tip-form-quick").value,
      problem: document.getElementById("tip-form-problem").value,
      quickAction: document.getElementById("tip-form-quick").value,
      solutions: [
        { step: 1, title: document.getElementById("tip-form-s1-title").value, desc: document.getElementById("tip-form-s1-desc").value },
        { step: 2, title: document.getElementById("tip-form-s2-title").value, desc: document.getElementById("tip-form-s2-desc").value },
        { step: 3, title: document.getElementById("tip-form-s3-title").value, desc: document.getElementById("tip-form-s3-desc").value }
      ],
      chefSecret: document.getElementById("tip-form-secret").value,
      audioText: document.getElementById("tip-form-title").value + ". " + document.getElementById("tip-form-quick").value
    };

    if (isNew) {
      state.data.tips.unshift(newTip);
      showToast("नई टिप सफलतापूर्वक जोड़ी गई! ✨");
    } else {
      const idx = state.data.tips.findIndex(t => t.id === tipId);
      if (idx > -1) {
        state.data.tips[idx] = newTip;
        showToast("टिप सफलतापूर्वक अपडेट की गई! ✅");
      }
    }

    saveMasterData();
    closeModal();
    if (state.currentTab === "admin") renderAdmin();
    if (state.currentTab === "tips") renderTips();
  }

  function deleteTip(tipId) {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }
    if (!confirm("क्या आप वाकई इस टिप को हटाना चाहते हैं?")) return;
    state.data.tips = state.data.tips.filter(t => t.id !== tipId);
    saveMasterData();
    showToast("टिप हटा दी गई");
    if (state.currentTab === "admin") renderAdmin();
    if (state.currentTab === "tips") renderTips();
  }

  // --- CRUD MODALS FOR MASALAS ---
  function openAdminEditMasala(masalaId) {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    const isNew = !masalaId;
    const m = isNew ? {
      id: "masala-" + Date.now(),
      name: "",
      englishName: "",
      tagline: "",
      category: "dal",
      categoryLabel: "दाल मसाला",
      image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
      prepTime: "15 मिनट",
      shelfLife: "6 महीने",
      spiceLevel: "मध्यम",
      description: "",
      baseYieldGrams: 200,
      ingredients: [
        { name: "साबुत धनिया", weight: 50, ratio: "25%" },
        { name: "साबुत जीरा", weight: 35, ratio: "17.5%" },
        { name: "मोटी सौंफ", weight: 20, ratio: "10%" }
      ],
      roastingGuide: "धीमी आंच पर 3-4 मिनट तक भूनें।",
      grindingGuide: "पूरी तरह ठंडा करके पल्स मोड पर पीसें।",
      usageGuide: "1 छोटा चम्मच तड़के में या ऊपर से डालें।",
      chefTips: ""
    } : (state.data.masalas.find(item => item.id === masalaId) || {});

    const modal = document.getElementById("universal-modal");
    const container = document.getElementById("modal-dynamic-content");
    if (!modal || !container) return;

    // Convert ingredients to line-separated text
    const ingText = (m.ingredients || []).map(i => `${i.name} | ${i.weight}g | ${i.ratio || ''}`).join("\n");

    container.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden max-w-2xl w-full mx-auto shadow-2xl modal-content-box border border-red-200">
        <button onclick="window.app.closeModal()" class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="p-6 bg-gradient-to-r from-red-600 to-amber-600 text-white">
          <h3 class="text-xl font-bold">${isNew ? '➕ नया मसाला जोड़ें' : '✏️ मसाला विधि एडिट करें'}</h3>
          <p class="text-xs text-amber-100">खड़े मसालों का अनुपात और भुनाई की तकनीक सेट करें</p>
        </div>

        <form onsubmit="window.app.handleSaveMasalaForm(event, '${m.id}', ${isNew})" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">मसाले का नाम (Hindi)</label>
              <input type="text" id="masala-form-name" value="${m.name || ''}" required placeholder="उदा. स्पेशल ढाबा दाल मसाला" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">English Name</label>
              <input type="text" id="masala-form-english" value="${m.englishName || ''}" required placeholder="Dhaba Dal Masala" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">केटेगरी (Category)</label>
              <select id="masala-form-category" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm">
                <option value="dal" ${m.category === 'dal' ? 'selected' : ''}>स्पेशल दाल मसाला</option>
                <option value="non_veg" ${m.category === 'non_veg' ? 'selected' : ''}>चिकन व मटन मसाला</option>
                <option value="daily" ${m.category === 'daily' ? 'selected' : ''}>दैनिक व गरम मसाला</option>
                <option value="special" ${m.category === 'special' ? 'selected' : ''}>स्पेशल चाट व चाय ब्लेंड</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">फोटो लिंक (Image URL)</label>
              <input type="url" id="masala-form-image" value="${m.image || ''}" required class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">टैगलाइन / विवरण (Tagline)</label>
            <input type="text" id="masala-form-tagline" value="${m.tagline || ''}" placeholder="उदा. सादी दाल को भी ढाबे जैसी खुशबूदार बनाए!" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">बनाने का समय</label>
              <input type="text" id="masala-form-time" value="${m.prepTime || '15 मिनट'}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">शेल्फ लाइफ</label>
              <input type="text" id="masala-form-shelf" value="${m.shelfLife || '6 महीने'}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">तीखापन</label>
              <input type="text" id="masala-form-spice" value="${m.spiceLevel || 'मध्यम'}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">सामग्री व वजन (प्रति लाइन: नाम | वजन | प्रतिशत)</label>
            <textarea id="masala-form-ingredients" rows="5" placeholder="साबुत धनिया | 50g | 25%&#10;साबुत जीरा | 35g | 17.5%&#10;कसूरी मेथी | 20g | 10%" class="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-mono">${ingText}</textarea>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">भूनने की विधि (Roasting Guide)</label>
              <textarea id="masala-form-roast" rows="2" class="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs">${m.roastingGuide || ''}</textarea>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">पीसने का तरीका (Grinding Texture)</label>
              <textarea id="masala-form-grind" rows="2" class="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs">${m.grindingGuide || ''}</textarea>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">उपयोग का नियम (Usage Guide)</label>
              <textarea id="masala-form-usage" rows="2" class="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs">${m.usageGuide || ''}</textarea>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">ज्योति दीदी का सीक्रेट (Chef Tip)</label>
              <input type="text" id="masala-form-tip" value="${m.chefTips || ''}" class="w-full bg-amber-50 border border-amber-300 rounded-xl px-4 py-2 text-xs" />
            </div>
          </div>

          <div class="pt-4 flex items-center justify-end gap-3">
            <button type="button" onclick="window.app.closeModal()" class="px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50">रद्द करें</button>
            <button type="submit" class="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md">मसाला सेव करें</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove("hidden");
    lucide.createIcons();
  }

  function handleSaveMasalaForm(e, masalaId, isNew) {
    e.preventDefault();
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    const cat = document.getElementById("masala-form-category").value;
    const catLabels = {
      dal: "दाल मसाला",
      non_veg: "नॉन-वेज स्पेशल",
      daily: "दैनिक स्पेशल",
      special: "स्पेशल ब्लेंड"
    };

    // Parse ingredients from text lines
    const rawIngLines = document.getElementById("masala-form-ingredients").value.split("\n");
    const ingredients = rawIngLines.filter(l => l.trim()).map(line => {
      const parts = line.split("|").map(p => p.trim());
      const weightNum = parseFloat((parts[1] || "20").replace(/[^0-9.]/g, "")) || 20;
      return {
        name: parts[0] || "मसाला",
        weight: weightNum,
        unit: "g",
        ratio: parts[2] || "10%"
      };
    });

    const newMasala = {
      id: masalaId,
      name: document.getElementById("masala-form-name").value,
      englishName: document.getElementById("masala-form-english").value,
      tagline: document.getElementById("masala-form-tagline").value,
      category: cat,
      categoryLabel: catLabels[cat] || "स्पेशल मसाला",
      image: document.getElementById("masala-form-image").value,
      prepTime: document.getElementById("masala-form-time").value,
      shelfLife: document.getElementById("masala-form-shelf").value,
      spiceLevel: document.getElementById("masala-form-spice").value,
      description: document.getElementById("masala-form-tagline").value,
      baseYieldGrams: 200,
      ingredients: ingredients,
      roastingGuide: document.getElementById("masala-form-roast").value,
      grindingGuide: document.getElementById("masala-form-grind").value,
      usageGuide: document.getElementById("masala-form-usage").value,
      chefTips: document.getElementById("masala-form-tip").value,
      rating: 5.0,
      reviewsCount: 150
    };

    if (isNew) {
      state.data.masalas.unshift(newMasala);
      showToast("नया मसाला सफलतापूर्वक जोड़ा गया! 🌿");
    } else {
      const idx = state.data.masalas.findIndex(m => m.id === masalaId);
      if (idx > -1) {
        state.data.masalas[idx] = newMasala;
        showToast("मसाला सफलतापूर्वक अपडेट किया गया! ✅");
      }
    }

    saveMasterData();
    closeModal();
    if (state.currentTab === "admin") renderAdmin();
    if (state.currentTab === "masalas") renderMasalas();
  }

  function deleteMasala(masalaId) {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }
    if (!confirm("क्या आप वाकई इस मसाले को हटाना चाहते हैं?")) return;
    state.data.masalas = state.data.masalas.filter(m => m.id !== masalaId);
    saveMasterData();
    showToast("मसाला हटा दिया गया");
    if (state.currentTab === "admin") renderAdmin();
    if (state.currentTab === "masalas") renderMasalas();
  }

  // --- CRUD MODALS FOR RECIPES ---
  function openAdminEditRecipe(recipeId) {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    const isNew = !recipeId;
    const r = isNew ? {
      id: "rec-" + Date.now(),
      title: "",
      englishTitle: "",
      category: "veg",
      categoryLabel: "शाकाहारी",
      isVeg: true,
      time: "30 मिनट",
      prepTime: "10 मिनट",
      cookTime: "20 मिनट",
      servings: "4 लोग",
      difficulty: "आसान (Easy)",
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
      specialMasalaUsed: "ज्योति स्पेशल मसाला",
      description: "",
      ingredients: ["सामग्री 1", "सामग्री 2", "सामग्री 3"],
      instructions: [
        { step: 1, title: "तैयारी", desc: "सभी सामग्री तैयार करें।" },
        { step: 2, title: "पकाना", desc: "धीमी आंच पर पकाएं।" }
      ],
      chefSecret: ""
    } : (state.data.recipes.find(item => item.id === recipeId) || {});

    const modal = document.getElementById("universal-modal");
    const container = document.getElementById("modal-dynamic-content");
    if (!modal || !container) return;

    const ingText = (r.ingredients || []).join("\n");
    const insText = (r.instructions || []).map(s => `${s.title} | ${s.desc}`).join("\n");

    container.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden max-w-2xl w-full mx-auto shadow-2xl modal-content-box border border-amber-200">
        <button onclick="window.app.closeModal()" class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="p-6 bg-gradient-to-r from-red-600 to-amber-600 text-white">
          <h3 class="text-xl font-bold">${isNew ? '➕ नई रेसिपी जोड़ें' : '✏️ रेसिपी एडिट करें'}</h3>
          <p class="text-xs text-amber-100">व्यंजन की सामग्री, स्टेप्स और सीक्रेट ट्रिक सेट करें</p>
        </div>

        <form onsubmit="window.app.handleSaveRecipeForm(event, '${r.id}', ${isNew})" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">रेसिपी का नाम (Hindi)</label>
              <input type="text" id="recipe-form-title" value="${r.title || ''}" required placeholder="उदा. कुरकुरी जलेबी" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">English Title</label>
              <input type="text" id="recipe-form-english" value="${r.englishTitle || ''}" required placeholder="Crispy Jalebi" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">प्रकार (Type)</label>
              <select id="recipe-form-isveg" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs">
                <option value="true" ${r.isVeg ? 'selected' : ''}>🟢 शाकाहारी (Veg)</option>
                <option value="false" ${!r.isVeg ? 'selected' : ''}>🔴 मांसाहारी (Non-Veg)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">केटेगरी (Category)</label>
              <select id="recipe-form-category" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs">
                <option value="veg" ${r.category === 'veg' ? 'selected' : ''}>शाकाहारी (Veg)</option>
                <option value="nonveg" ${r.category === 'nonveg' ? 'selected' : ''}>मांसाहारी (Non-Veg)</option>
                <option value="sweets" ${r.category === 'sweets' ? 'selected' : ''}>मिठाई (Sweets)</option>
                <option value="snacks" ${r.category === 'snacks' ? 'selected' : ''}>नाश्ता (Snacks)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">कठिनाई (Difficulty)</label>
              <input type="text" id="recipe-form-diff" value="${r.difficulty || 'आसान'}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">समय (Time)</label>
              <input type="text" id="recipe-form-time" value="${r.time || '30 मिनट'}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">सर्विंग्स (Servings)</label>
              <input type="text" id="recipe-form-servings" value="${r.servings || '4 लोग'}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">फोटो लिंक (Image URL)</label>
            <input type="url" id="recipe-form-image" value="${r.image || ''}" required class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">स्पेशल मसाला (Special Masala Used)</label>
            <input type="text" id="recipe-form-masala" value="${r.specialMasalaUsed || ''}" placeholder="उदा. ज्योति स्पेशल चिकन मसाला (2 चम्मच)" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">आवश्यक सामग्री (प्रति लाइन 1 सामग्री दर्ज करें)</label>
            <textarea id="recipe-form-ingredients" rows="4" placeholder="1 कप मैदा&#10;2 चम्मच चावल का आटा&#10;1 चम्मच देसी घी" class="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs">${ingText}</textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">बनाने की विधि (प्रति लाइन: स्टेप शीर्षक | विवरण)</label>
            <textarea id="recipe-form-instructions" rows="4" placeholder="बैटर तैयार करें | मैदा और दही फेंटें।&#10;चाशनी बनाएं | 1 तार की चाशनी तैयार करें।" class="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-mono">${insText}</textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">मास्टर सीक्रेट (Chef Secret)</label>
            <input type="text" id="recipe-form-secret" value="${r.chefSecret || ''}" placeholder="ज्योति दीदी का गेम-चेंजर नुस्खा..." class="w-full bg-amber-50 border border-amber-300 rounded-xl px-4 py-2 text-xs" />
          </div>

          <div class="pt-4 flex items-center justify-end gap-3">
            <button type="button" onclick="window.app.closeModal()" class="px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50">रद्द करें</button>
            <button type="submit" class="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md">रेसिपी सेव करें</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove("hidden");
    lucide.createIcons();
  }

  function handleSaveRecipeForm(e, recipeId, isNew) {
    e.preventDefault();
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    const isVeg = document.getElementById("recipe-form-isveg").value === "true";
    const cat = document.getElementById("recipe-form-category").value;
    const catLabels = {
      veg: "शाकाहारी",
      nonveg: "मांसाहारी",
      sweets: "मिठाई",
      snacks: "नाश्ता"
    };

    const ingredients = document.getElementById("recipe-form-ingredients").value.split("\n").map(l => l.trim()).filter(Boolean);
    const insLines = document.getElementById("recipe-form-instructions").value.split("\n").map(l => l.trim()).filter(Boolean);
    const instructions = insLines.map((line, idx) => {
      const parts = line.split("|").map(p => p.trim());
      return {
        step: idx + 1,
        title: parts[0] || `स्टेप ${idx + 1}`,
        desc: parts[1] || parts[0]
      };
    });

    const newRecipe = {
      id: recipeId,
      title: document.getElementById("recipe-form-title").value,
      englishTitle: document.getElementById("recipe-form-english").value,
      category: cat,
      categoryLabel: catLabels[cat] || (isVeg ? "शाकाहारी" : "मांसाहारी"),
      isVeg: isVeg,
      time: document.getElementById("recipe-form-time").value,
      servings: document.getElementById("recipe-form-servings").value,
      difficulty: document.getElementById("recipe-form-diff").value,
      image: document.getElementById("recipe-form-image").value,
      specialMasalaUsed: document.getElementById("recipe-form-masala").value,
      description: `${document.getElementById("recipe-form-title").value} की पारंपरिक व स्वादिष्ट रेसिपी`,
      ingredients: ingredients,
      instructions: instructions,
      chefSecret: document.getElementById("recipe-form-secret").value
    };

    if (isNew) {
      state.data.recipes.unshift(newRecipe);
      showToast("नई रेसिपी सफलतापूर्वक जोड़ी गई! 🍲");
    } else {
      const idx = state.data.recipes.findIndex(r => r.id === recipeId);
      if (idx > -1) {
        state.data.recipes[idx] = newRecipe;
        showToast("रेसिपी सफलतापूर्वक अपडेट की गई! ✅");
      }
    }

    saveMasterData();
    closeModal();
    if (state.currentTab === "admin") renderAdmin();
    if (state.currentTab === "recipes") renderRecipes();
  }

  function deleteRecipe(recipeId) {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }
    if (!confirm("क्या आप वाकई इस रेसिपी को हटाना चाहते हैं?")) return;
    state.data.recipes = state.data.recipes.filter(r => r.id !== recipeId);
    saveMasterData();
    showToast("रेसिपी हटा दी गई");
    if (state.currentTab === "admin") renderAdmin();
    if (state.currentTab === "recipes") renderRecipes();
  }

  // --- CRUD FOR SOS ---
  function openAdminEditSos(idx) {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    const isNew = idx === null || idx === undefined;
    const item = !isNew ? state.data.quickSos[idx] : { query: "", answer: "", icon: "flame", linkId: "tip-oil-excess" };

    const modal = document.getElementById("universal-modal");
    const container = document.getElementById("modal-dynamic-content");
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden max-w-lg w-full mx-auto shadow-2xl modal-content-box border border-red-200">
        <button onclick="window.app.closeModal()" class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="p-6 bg-red-600 text-white">
          <h3 class="text-xl font-bold">${isNew ? '➕ नया इमरजेंसी SOS जोड़ें' : '✏️ SOS एडिट करें'}</h3>
        </div>

        <form onsubmit="window.app.handleSaveSosForm(event, ${idx})" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">समस्या सवाल (Query)</label>
            <input type="text" id="sos-form-query" value="${item.query || ''}" required placeholder="उदा. सब्जी में तेल ज्यादा हो गया" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">त्वरित उत्तर (Quick 1-Line Solution)</label>
            <textarea id="sos-form-answer" required rows="3" placeholder="बर्फ का टुकड़ा तरी पर घुमाएं..." class="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs">${item.answer || ''}</textarea>
          </div>

          <div class="pt-4 flex items-center justify-end gap-3">
            <button type="button" onclick="window.app.closeModal()" class="px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50">रद्द करें</button>
            <button type="submit" class="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md">SOS सेव करें</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove("hidden");
    lucide.createIcons();
  }

  function handleSaveSosForm(e, idx) {
    e.preventDefault();
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }

    const query = document.getElementById("sos-form-query").value;
    const answer = document.getElementById("sos-form-answer").value;

    if (idx === null || idx === undefined) {
      state.data.quickSos.push({ query, answer, icon: "flame", linkId: "tip-oil-excess" });
      showToast("नया SOS सवाल जोड़ा गया! 🚨");
    } else {
      state.data.quickSos[idx].query = query;
      state.data.quickSos[idx].answer = answer;
      showToast("SOS सवाल अपडेट किया गया! ✅");
    }

    saveMasterData();
    closeModal();
    if (state.currentTab === "admin") renderAdmin();
  }

  function deleteSos(idx) {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }
    if (!confirm("क्या आप वाकई इस SOS को हटाना चाहते हैं?")) return;
    state.data.quickSos.splice(idx, 1);
    saveMasterData();
    showToast("SOS हटा दिया गया");
    if (state.currentTab === "admin") renderAdmin();
  }

  // --- EXPORT, IMPORT & RESET ENGINE ---
  function exportDataJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jyoti_masala_box_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("बैकअप JSON फाइल डाउनलोड हो गई! 📥");
  }

  function importDataJSON(event) {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported && imported.tips && imported.masalas && imported.recipes) {
          state.data = imported;
          saveMasterData();
          showToast("बैकअप सफलतापूर्वक रीस्टोर कर लिया गया! 🎉");
          renderAdmin();
          renderDashboard();
        } else {
          alert("अमान्य बैकअप फाइल। कृपया सही JSON बैकअप चुनें।");
        }
      } catch (err) {
        alert("फाइल पढ़ने में त्रुटि: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  function resetMasterData() {
    if (!state.isAdminLoggedIn) {
      openAdminLoginModal();
      return;
    }
    if (!confirm("⚠️ क्या आप वाकई सभी डेटा को फैक्ट्री रीसेट करना चाहते हैं? आपके द्वारा किए गए बदलाव हट जाएंगे और मूल डेटा वापस आ जाएगा।")) return;

    localStorage.removeItem("jyoti_master_store");
    state.data = {
      config: JSON.parse(JSON.stringify(JYOTI_CONFIG)),
      tips: JSON.parse(JSON.stringify(TIPS_DATA)),
      masalas: JSON.parse(JSON.stringify(MASALAS_DATA)),
      recipes: JSON.parse(JSON.stringify(RECIPES_DATA)),
      quickSos: JSON.parse(JSON.stringify(QUICK_SOS_HACKS))
    };
    saveMasterData();
    showToast("डिफ़ॉल्ट डेटा सफलतापूर्वक रीसेट किया गया! 🔄");
    renderAdmin();
    renderDashboard();
  }

  // --- DETAIL MODALS ---
  function openTipModal(tipId) {
    const tip = state.data.tips.find(t => t.id === tipId);
    if (!tip) return;

    const modal = document.getElementById("universal-modal");
    const container = document.getElementById("modal-dynamic-content");
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden max-w-2xl w-full mx-auto shadow-2xl modal-content-box border border-amber-200">
        <button onclick="window.app.closeModal()" class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="relative h-60 overflow-hidden">
          <img src="${tip.image}" alt="${tip.title}" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
            <span class="bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md w-fit mb-2">
              ${tip.badge}
            </span>
            <h2 class="text-2xl font-bold leading-tight">${tip.title}</h2>
          </div>
        </div>

        <div class="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div class="flex items-center justify-between bg-amber-50 p-3 rounded-2xl border border-amber-200">
            <button onclick="window.app.speakText('${tip.audioText || tip.shortDesc}')" class="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
              <i data-lucide="volume-2" class="w-4 h-4"></i>
              <span>ऑडियो सुनें (Hands-Free)</span>
            </button>
            
            <a href="${getWhatsAppUrl('नमस्ते ज्योति दीदी! मुझे टिप: ' + tip.title + ' के बारे में कुछ और पूछना है।')}" target="_blank" class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              <span>व्हाट्सएप पर पूछें</span>
            </a>
          </div>

          <div class="space-y-3">
            <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
              <h4 class="font-bold text-red-900 text-sm">समस्या क्या है?</h4>
              <p class="text-xs sm:text-sm text-red-800 mt-1">${tip.problem}</p>
            </div>

            <div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl">
              <h4 class="font-bold text-emerald-900 text-sm">तुरंत करने वाला काम (Instant Action):</h4>
              <p class="text-xs sm:text-sm text-emerald-800 mt-1">${tip.quickAction}</p>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i data-lucide="list-ordered" class="w-5 h-5 text-amber-600"></i>
              विस्तार से 3 अचूक उपाय:
            </h3>

            <div class="space-y-4">
              ${(tip.solutions || []).map(s => `
                <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div class="flex items-center gap-2.5 font-bold text-gray-900 text-sm mb-1.5">
                    <span class="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">${s.step}</span>
                    <span>${s.title}</span>
                  </div>
                  <p class="text-xs sm:text-sm text-gray-700 leading-relaxed pl-8">${s.desc}</p>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-md">
            <h4 class="font-bold text-sm flex items-center gap-2">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
              ज्योति दीदी की मास्टर सीक्रेट टिप:
            </h4>
            <p class="text-xs sm:text-sm text-amber-50 mt-1 leading-relaxed">${tip.chefSecret}</p>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    lucide.createIcons();
  }

  function openMasalaModal(masalaId) {
    const masala = state.data.masalas.find(m => m.id === masalaId);
    if (!masala) return;

    const modal = document.getElementById("universal-modal");
    const container = document.getElementById("modal-dynamic-content");
    if (!modal || !container) return;

    const baseYield = masala.baseYieldGrams || 200;
    if (!state.selectedMasalaBatch[masalaId]) {
      state.selectedMasalaBatch[masalaId] = baseYield;
    }
    const currentYield = state.selectedMasalaBatch[masalaId];
    const multiplier = currentYield / baseYield;

    container.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden max-w-3xl w-full mx-auto shadow-2xl modal-content-box border border-red-200">
        <button onclick="window.app.closeModal()" class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="relative h-64 overflow-hidden">
          <img src="${masala.image}" alt="${masala.name}" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
            <span class="bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md w-fit mb-2">
              ${masala.categoryLabel}
            </span>
            <h2 class="text-2xl sm:text-3xl font-bold">${masala.name}</h2>
            <p class="text-xs sm:text-sm text-amber-300 mt-1">${masala.englishName} | ${masala.tagline}</p>
          </div>
        </div>

        <div class="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div class="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 class="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <i data-lucide="scale" class="w-4 h-4 text-amber-600"></i>
                  वजन अनुपात कैलकुलेटर (Batch Quantity):
                </h4>
                <p class="text-xs text-gray-500">क्लिक करें और देखें कि कितने ग्राम मसाले चाहिए</p>
              </div>

              <div class="flex items-center gap-2">
                ${[100, 200, 500, 1000].map(grams => `
                  <button onclick="window.app.changeMasalaBatch('${masala.id}', ${grams})" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentYield === grams ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-amber-100'}">
                    ${grams >= 1000 ? '1 किलो' : grams + 'g'}
                  </button>
                `).join("")}
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center justify-between">
              <span>सामग्री की सूची (${currentYield}g बैच के लिए):</span>
              <span class="text-xs text-gray-500 font-normal">अनुपात प्रतिशत के साथ</span>
            </h3>

            <div class="overflow-x-auto border border-gray-200 rounded-2xl">
              <table class="w-full text-left text-xs sm:text-sm">
                <thead class="bg-gray-50 text-gray-700 border-b border-gray-200">
                  <tr>
                    <th class="p-3 font-bold">खड़ा मसाला (Spice)</th>
                    <th class="p-3 font-bold text-center">अनुपात (%)</th>
                    <th class="p-3 font-bold text-right">सटीक वजन (Grams)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  ${(masala.ingredients || []).map(ing => {
                    const calculatedWeight = Math.round(ing.weight * multiplier * 10) / 10;
                    return `
                      <tr class="hover:bg-amber-50/50">
                        <td class="p-3 font-medium text-gray-900">${ing.name}</td>
                        <td class="p-3 text-center text-gray-500">${ing.ratio || '-'}</td>
                        <td class="p-3 text-right font-bold text-red-600">${calculatedWeight} ग्राम</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-4">
            <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <h4 class="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1.5 text-amber-800">
                <i data-lucide="flame" class="w-4 h-4 text-amber-600"></i>
                1. भूनने की सही विधि (Dry Roasting):
              </h4>
              <p class="text-xs sm:text-sm text-gray-700 leading-relaxed">${masala.roastingGuide}</p>
            </div>

            <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <h4 class="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1.5 text-blue-800">
                <i data-lucide="refresh-cw" class="w-4 h-4 text-blue-600"></i>
                2. पीसने की तकनीक (Grinding Texture):
              </h4>
              <p class="text-xs sm:text-sm text-gray-700 leading-relaxed">${masala.grindingGuide}</p>
            </div>

            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <h4 class="font-bold text-emerald-950 text-sm flex items-center gap-2 mb-1.5">
                <i data-lucide="utensils" class="w-4 h-4 text-emerald-700"></i>
                3. इस्तेमाल का सही समय (Usage Guide):
              </h4>
              <p class="text-xs sm:text-sm text-emerald-900 leading-relaxed">${masala.usageGuide}</p>
            </div>
          </div>

          ${masala.chefTips ? `
            <div class="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl">
              <h4 class="font-bold text-red-950 text-sm flex items-center gap-1.5">
                <i data-lucide="sparkles" class="w-4 h-4 text-red-600"></i>
                ज्योति दीदी की सीक्रेट टिप:
              </h4>
              <p class="text-xs sm:text-sm text-red-900 mt-1 leading-relaxed">${masala.chefTips}</p>
            </div>
          ` : ''}

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <a href="${getWhatsAppUrl('नमस्ते ज्योति दीदी! मुझे आपके ' + masala.name + ' की रेसिपी बहुत अच्छी लगी।')}" target="_blank" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              <span>व्हाट्सएप पर शेयर करें / पूछें</span>
            </a>

            <button onclick="window.print()" class="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2">
              <i data-lucide="printer" class="w-4 h-4"></i>
              <span>प्रिंट करें</span>
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    lucide.createIcons();
  }

  function changeMasalaBatch(masalaId, grams) {
    state.selectedMasalaBatch[masalaId] = grams;
    openMasalaModal(masalaId);
  }

  function openRecipeModal(recipeId) {
    const recipe = state.data.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const modal = document.getElementById("universal-modal");
    const container = document.getElementById("modal-dynamic-content");
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden max-w-3xl w-full mx-auto shadow-2xl modal-content-box border border-amber-200">
        <button onclick="window.app.closeModal()" class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="relative h-64 overflow-hidden">
          <img src="${recipe.image}" alt="${recipe.title}" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
            <span class="${recipe.isVeg ? 'bg-emerald-600' : 'bg-red-600'} text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md w-fit mb-2 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-white"></span>
              ${recipe.categoryLabel}
            </span>
            <h2 class="text-2xl sm:text-3xl font-bold">${recipe.title}</h2>
            <p class="text-xs sm:text-sm text-amber-300 mt-1">${recipe.englishTitle}</p>
          </div>
        </div>

        <div class="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-3 gap-3 bg-amber-50 p-3 rounded-2xl text-center border border-amber-200">
            <div>
              <span class="text-[10px] text-gray-500 uppercase font-bold block">समय</span>
              <span class="text-xs sm:text-sm font-bold text-gray-900">${recipe.time}</span>
            </div>
            <div>
              <span class="text-[10px] text-gray-500 uppercase font-bold block">सर्विंग्स</span>
              <span class="text-xs sm:text-sm font-bold text-gray-900">${recipe.servings}</span>
            </div>
            <div>
              <span class="text-[10px] text-gray-500 uppercase font-bold block">कठिनाई</span>
              <span class="text-xs sm:text-sm font-bold text-emerald-700">${recipe.difficulty}</span>
            </div>
          </div>

          <div class="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span class="text-[11px] text-red-600 font-bold uppercase tracking-wider block">स्पेशल सीक्रेट मसाला</span>
              <span class="text-sm font-bold text-red-950">${recipe.specialMasalaUsed}</span>
            </div>
            <button onclick="window.app.switchTab('masalas')" class="text-xs font-bold text-red-700 bg-white px-3 py-1.5 rounded-xl border border-red-300 hover:bg-red-50 transition-colors">
              मसाला रेसिपी देखें →
            </button>
          </div>

          <div>
            <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center justify-between">
              <span>आवश्यक सामग्री (Ingredients):</span>
              <span class="text-xs text-gray-500 font-normal">टिक करें</span>
            </h3>

            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
              ${(recipe.ingredients || []).map((ing, idx) => {
                if (ing.startsWith("---")) {
                  return `<div class="font-bold text-amber-800 text-xs pt-2 border-t border-gray-200 uppercase">${ing.replace(/---/g, '')}</div>`;
                }
                const chkId = `ing-${recipe.id}-${idx}`;
                return `
                  <div class="flex items-center gap-3">
                    <input type="checkbox" id="${chkId}" class="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 ingredient-checkbox cursor-pointer" />
                    <label for="${chkId}" class="text-xs sm:text-sm text-gray-700 cursor-pointer select-none">${ing}</label>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i data-lucide="chef-hat" class="w-5 h-5 text-amber-600"></i>
              बनाने की संपूर्ण विधि (Step-by-Step):
            </h3>

            <div class="space-y-4">
              ${(recipe.instructions || []).map(step => `
                <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div class="flex items-center gap-2.5 font-bold text-gray-900 text-sm mb-1.5">
                    <span class="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xs font-bold">${step.step}</span>
                    <span>${step.title}</span>
                  </div>
                  <p class="text-xs sm:text-sm text-gray-700 leading-relaxed pl-9">${step.desc}</p>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-md">
            <h4 class="font-bold text-sm flex items-center gap-2">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
              ज्योति दीदी का गेम-चेंजर सीक्रेट:
            </h4>
            <p class="text-xs sm:text-sm text-amber-50 mt-1 leading-relaxed">${recipe.chefSecret}</p>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <a href="${getWhatsAppUrl('नमस्ते ज्योति दीदी! मुझे आपकी ' + recipe.title + ' की रेसिपी बहुत पसंद आई!')}" target="_blank" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              <span>व्हाट्सएप पर पूछें</span>
            </a>

            <button onclick="window.print()" class="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2">
              <i data-lucide="printer" class="w-4 h-4"></i>
              <span>प्रिंट करें</span>
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    lucide.createIcons();
  }

  function closeModal() {
    const modal = document.getElementById("universal-modal");
    if (modal) modal.classList.add("hidden");
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }

  // --- INTERACTIVE AI CHEF CHATBOT ---
  function toggleChat() {
    state.isChatOpen = !state.isChatOpen;
    const chatBox = document.getElementById("chat-widget-box");
    if (chatBox) {
      chatBox.classList.toggle("hidden", !state.isChatOpen);
    }
    if (state.isChatOpen) {
      renderChatMessages();
      const input = document.getElementById("chat-user-input");
      if (input) input.focus();
    }
    lucide.createIcons();
  }

  function renderChatMessages() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    container.innerHTML = state.chatMessages.map(msg => `
      <div class="flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-amber-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'}">
          <p class="whitespace-pre-line">${msg.text}</p>
          <span class="text-[9px] mt-1 block ${msg.sender === 'user' ? 'text-amber-200' : 'text-gray-400'} text-right">${msg.time}</span>
        </div>
      </div>
    `).join("");

    container.scrollTop = container.scrollHeight;
  }

  function sendChatMessage(text) {
    const query = (text || "").trim();
    if (!query) return;

    state.chatMessages.push({
      sender: "user",
      text: query,
      time: getCurrentTimeString()
    });
    renderChatMessages();

    const input = document.getElementById("chat-user-input");
    if (input) input.value = "";

    setTimeout(() => {
      const qLower = query.toLowerCase();
      let matchedReply = null;

      for (const item of BOT_KNOWLEDGE_BASE) {
        if (item.keywords.some(k => qLower.includes(k.toLowerCase()))) {
          matchedReply = item.reply;
          break;
        }
      }

      if (!matchedReply) {
        matchedReply = `नमस्ते जी! आपके सवाल "${query}" को मैंने नोट कर लिया है। यदि आपकी समस्या यहाँ हल नहीं हो पा रही है, तो आप मुझे तुरंत व्हाट्सएप पर मैसेज भेजें या डायरेक्ट कॉल करें। मैं आपको स्वयं गाइड करूँगी!`;
      }

      state.chatMessages.push({
        sender: "bot",
        text: matchedReply,
        time: getCurrentTimeString()
      });
      renderChatMessages();
    }, 600);
  }

  function triggerQuickChip(chipText) {
    sendChatMessage(chipText);
  }

  // --- SEARCH ENGINE ---
  function handleSearchInput(e) {
    state.activeSearch = e.target.value;
    if (state.currentTab === "tips") renderTips();
    else if (state.currentTab === "masalas") renderMasalas();
    else if (state.currentTab === "recipes") renderRecipes();
    else {
      if (state.activeSearch.length > 2) {
        switchTab("tips");
      }
    }
  }

  function handleContactSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("contact-name").value;
    showToast(`धन्यवाद ${name} जी! आपका संदेश प्राप्त हो गया है।`);
    e.target.reset();
  }

  function sendQueryViaWhatsApp() {
    const name = document.getElementById("contact-name").value || "कुकिंग प्रेमी";
    const topic = document.getElementById("contact-topic").value || "कुकिंग सवाल";
    const msg = document.getElementById("contact-msg").value || "नमस्ते ज्योति दीदी!";
    const fullMsg = `नमस्ते ज्योति दीदी! मेरा नाम ${name} है।\nविषय: ${topic}\nसवाल: ${msg}`;
    window.open(getWhatsAppUrl(fullMsg), "_blank");
  }

  function setTipFilter(cat) {
    state.tipFilter = cat;
    renderTips();
  }
  function setMasalaFilter(cat) {
    state.masalaFilter = cat;
    renderMasalas();
  }
  function setRecipeFilter(cat) {
    state.recipeFilter = cat;
    renderRecipes();
  }

  // --- ROSE FLOWER SHOWER EXCLUSIVELY ON LORD GANESHA 3D ICON (सिर्फ गणेश जी के 3D आइकन पर गुलाब के फूलों की वर्षा) ---
  function initGaneshMurtiFlowerRain() {
    const canvas = document.getElementById("ganesh-murti-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = 56;
    let height = 56;

    function resize() {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width || 56;
      height = rect.height || 56;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    const petals = [];
    const maxPetals = 20; // Perfect, elegant density strictly on the Ganesh icon

    class Petal3D {
      constructor(isBurst = false) {
        this.reset(isBurst);
      }

      reset(isBurst = false) {
        this.x = Math.random() * width;
        this.y = isBurst ? Math.random() * 8 : -4 - Math.random() * 12;
        this.z = Math.random() * 0.5 + 0.6;
        this.size = (Math.random() * 2.2 + 4.2) * this.z; // 4.5px to 7.5px
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() * 0.55 + 0.65) * this.z; // gentle graceful descent
        this.pitch = Math.random() * Math.PI;
        this.roll = Math.random() * Math.PI;
        this.yaw = Math.random() * Math.PI;
        this.pitchSpeed = (Math.random() - 0.5) * 0.045;
        this.rollSpeed = (Math.random() - 0.5) * 0.055;
        this.yawSpeed = (Math.random() - 0.5) * 0.035;
        this.opacity = Math.random() * 0.2 + 0.8;

        // Pure Velvet Indian Red Rose (गुलाब) Petal Palette
        const roseTones = [
          { outer: "#E11D48", inner: "#9F1239", deep: "#881337" }, // Classic Red Rose
          { outer: "#F43F5E", inner: "#BE123C", deep: "#9F1239" }, // Fresh Blooming Rose
          { outer: "#FB7185", inner: "#E11D48", deep: "#BE123C" }, // Tender Rose Pink Tip
          { outer: "#BE123C", inner: "#881337", deep: "#4C0519" }, // Deep Maroon Velvet Rose
          { outer: "#FF4D6D", inner: "#C9184A", deep: "#800F2F" }  // Vibrant Auspicious Rose
        ];
        this.colors = roseTones[Math.floor(Math.random() * roseTones.length)];
      }

      update() {
        this.x += this.vx + Math.sin(this.roll) * 0.28;
        this.y += this.vy;
        this.pitch += this.pitchSpeed;
        this.roll += this.rollSpeed;
        this.yaw += this.yawSpeed;

        if (this.y > height + 8 || this.x > width + 6 || this.x < -6) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.yaw);

        const scaleX = Math.cos(this.roll);
        const scaleY = Math.sin(this.pitch) * 0.95;
        ctx.scale(Math.abs(scaleX) < 0.15 ? 0.15 : scaleX, Math.abs(scaleY) < 0.15 ? 0.15 : scaleY);

        // Curvature of natural 3D rose petal
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.9);
        ctx.bezierCurveTo(this.size * 0.95, -this.size * 0.8, this.size * 1.05, this.size * 0.6, 0, this.size);
        ctx.bezierCurveTo(-this.size * 1.05, this.size * 0.6, -this.size * 0.95, -this.size * 0.8, 0, -this.size * 0.9);
        ctx.closePath();

        const grad = ctx.createRadialGradient(0, -this.size * 0.2, 0.5, 0, 0, this.size);
        grad.addColorStop(0, this.colors.outer);
        grad.addColorStop(0.7, this.colors.inner);
        grad.addColorStop(1, this.colors.deep);

        ctx.fillStyle = grad;
        ctx.globalAlpha = this.opacity;
        ctx.fill();

        // Delicate 3D Petal Spine Highlight
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.65);
        ctx.quadraticCurveTo(this.size * 0.1, 0, 0, this.size * 0.65);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.restore();
      }
    }

    for (let i = 0; i < maxPetals; i++) {
      const p = new Petal3D();
      p.y = Math.random() * height;
      petals.push(p);
    }

    function renderLoop() {
      if (width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < petals.length; i++) {
          petals[i].update();
          petals[i].draw();
        }
      }
      requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);

    window.app.showerExtraPetals = function () {
      showToast("🌸 भगवान श्री गणेश जी पर ताज़ा गुलाब पुष्प वर्षा! 🌸");
      for (let i = 0; i < 20; i++) {
        const burstPetal = new Petal3D(true);
        burstPetal.y = Math.random() * 6;
        burstPetal.vy = Math.random() * 1.2 + 0.8;
        petals.push(burstPetal);
        if (petals.length > 40) petals.shift();
      }
    };
  }

  function setTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("jyoti_theme", theme);
    const themeNames = {
      saffron: "शाही केसरिया",
      crimson: "रूबी मिर्च",
      haldi: "वैदिक हल्दी",
      darbar: "शाही दरबार"
    };
    showToast(`थीम बदली गई: ${themeNames[theme] || theme} ✨`);
  }

  function init() {
    const hash = window.location.hash.replace("#", "");
    if (["dashboard", "tips", "masalas", "recipes", "favorites", "contact", "admin"].includes(hash)) {
      switchTab(hash, false);
    } else {
      switchTab("dashboard", false);
    }

    updateBookmarkBadge();
    updateGlobalHeaderAndFooter();

    // Load saved theme
    const savedTheme = localStorage.getItem("jyoti_theme") || "saffron";
    document.body.setAttribute("data-theme", savedTheme);

    // Initialize Flower Rain strictly on Ganesha Murti
    setTimeout(initGaneshMurtiFlowerRain, 150);

    const searchInputs = document.querySelectorAll(".universal-search-input");
    searchInputs.forEach(inp => {
      inp.addEventListener("input", handleSearchInput);
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    lucide.createIcons();
  }

  // Expose to window for inline onclick handlers
  window.app = {
    switchTab,
    openMobileDrawer,
    closeMobileDrawer,
    setTipFilter,
    setMasalaFilter,
    setRecipeFilter,
    openTipModal,
    openMasalaModal,
    changeMasalaBatch,
    openRecipeModal,
    closeModal,
    toggleBookmark,
    speakText,
    toggleChat,
    sendChatMessage,
    triggerQuickChip,
    handleContactSubmit,
    sendQueryViaWhatsApp,
    setTheme,
    showerExtraPetals: function () {}, // Assigned in initRosePetalRain
    // Admin Authentication Handlers
    openAdminLoginModal,
    closeAdminLoginModal,
    handleAdminLogin,
    handleAdminLogout,
    // Payment & QR Code handlers
    copyUpiId,
    openQrPaymentModal,
    setPaymentModalAmount,
    // Admin specific handlers
    setAdminSubTab,
    handleAdminSaveGeneral,
    openAdminEditTip,
    handleSaveTipForm,
    deleteTip,
    openAdminEditMasala,
    handleSaveMasalaForm,
    deleteMasala,
    openAdminEditRecipe,
    handleSaveRecipeForm,
    deleteRecipe,
    openAdminEditSos,
    handleSaveSosForm,
    deleteSos,
    exportDataJSON,
    importDataJSON,
    resetMasterData
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

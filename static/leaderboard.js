// Loafed AI - Standalone Leaderboard Controller

document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    period: 'all',
    entries: [],
    user: null,
    idToken: localStorage.getItem('loafed_id_token') || null,
    accessToken: localStorage.getItem('loafed_access_token') || null,
    authConfig: null
  };

  // Helper to re-render Lucide icons
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // Toast Notification System (Zero emojis, Lucide vector icons)
  const toastContainer = document.getElementById('toastContainer');
  function showToast({ title = '', message = '', type = 'info', duration = 4500 } = {}) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast-card w-full p-3.5 rounded-xl shadow-lg border flex items-start gap-3 relative overflow-hidden bg-white text-stone-800';

    let iconName = 'info';
    let iconColor = 'text-orange-700 bg-orange-100/80 border-orange-200';
    let borderClass = 'border-orange-200 shadow-orange-950/5';

    if (type === 'error' || type === 'danger') {
      iconName = 'alert-circle';
      iconColor = 'text-rose-600 bg-rose-50 border-rose-200';
      borderClass = 'border-rose-200 shadow-rose-950/5';
    } else if (type === 'warning') {
      iconName = 'alert-triangle';
      iconColor = 'text-amber-700 bg-amber-50 border-amber-200';
      borderClass = 'border-amber-200 shadow-amber-950/5';
    } else if (type === 'success') {
      iconName = 'check-circle-2';
      iconColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      borderClass = 'border-emerald-200 shadow-emerald-950/5';
    }

    toast.classList.add(...borderClass.split(' '));

    toast.innerHTML = `
      <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconColor}">
        <i data-lucide="${iconName}" class="w-4 h-4"></i>
      </div>
      <div class="flex-1 min-w-0 pr-5">
        ${title ? `<div class="text-xs font-bold text-stone-900 mb-0.5 tracking-tight">${title}</div>` : ''}
        <div class="text-xs text-stone-600 leading-relaxed break-words">${message}</div>
      </div>
      <button class="toast-close-btn absolute top-2.5 right-2.5 text-stone-400 hover:text-stone-700 transition-colors p-1 rounded-md hover:bg-stone-100" aria-label="Dismiss">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    `;

    toastContainer.appendChild(toast);
    refreshIcons();

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => removeToast(toast));
    }

    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 280);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // DOM Elements
  const headerSignInBtn = document.getElementById('headerSignInBtn');
  const headerUserMenu = document.getElementById('headerUserMenu');
  const headerUserMenuBtn = document.getElementById('headerUserMenuBtn');
  const headerUserAvatar = document.getElementById('headerUserAvatar');
  const headerUserName = document.getElementById('headerUserName');
  const headerUserDropdown = document.getElementById('headerUserDropdown');
  const dropdownUserEmail = document.getElementById('dropdownUserEmail');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const menuMyLoavesBtn = document.getElementById('menuMyLoavesBtn');
  const menuSignOutBtn = document.getElementById('menuSignOutBtn');
  const menuProfileBtn = document.getElementById('menuProfileBtn');

  const tabPeriodAll = document.getElementById('tabPeriodAll');
  const tabPeriodMonth = document.getElementById('tabPeriodMonth');
  const tabPeriodWeek = document.getElementById('tabPeriodWeek');
  const tabPeriodMine = document.getElementById('tabPeriodMine');
  const leaderboardCountText = document.getElementById('leaderboardCountText');
  const listSectionTitle = document.getElementById('listSectionTitle');

  const podiumContainer = document.getElementById('podiumContainer');
  const podiumFirst = document.getElementById('podiumFirst');
  const podiumSecond = document.getElementById('podiumSecond');
  const podiumThird = document.getElementById('podiumThird');
  const leaderboardEntriesList = document.getElementById('leaderboardEntriesList');

  const authModal = document.getElementById('authModal');
  const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
  const authMainView = document.getElementById('authMainView');
  const authModalTitle = document.getElementById('authModalTitle');
  const authModalSubtitle = document.getElementById('authModalSubtitle');
  const signInGoogleBtn = document.getElementById('signInGoogleBtn');
  const authTabSignIn = document.getElementById('authTabSignIn');
  const authTabSignUp = document.getElementById('authTabSignUp');
  const authNotice = document.getElementById('authNotice');
  const authEmailForm = document.getElementById('authEmailForm');
  const authNameField = document.getElementById('authNameField');
  const authNameInput = document.getElementById('authNameInput');
  const authEmailInput = document.getElementById('authEmailInput');
  const authPasswordInput = document.getElementById('authPasswordInput');
  const authForgotPassLink = document.getElementById('authForgotPassLink');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authSubmitBtnText = document.getElementById('authSubmitBtnText');

  const authVerifyView = document.getElementById('authVerifyView');
  const authVerifyEmailDisplay = document.getElementById('authVerifyEmailDisplay');
  const authVerifyNotice = document.getElementById('authVerifyNotice');
  const authVerifyForm = document.getElementById('authVerifyForm');
  const authVerifyCodeInput = document.getElementById('authVerifyCodeInput');
  const authVerifySubmitBtn = document.getElementById('authVerifySubmitBtn');
  const authVerifySubmitBtnText = document.getElementById('authVerifySubmitBtnText');
  const authResendCodeBtn = document.getElementById('authResendCodeBtn');
  const authBackToSignInBtn = document.getElementById('authBackToSignInBtn');

  const authForgotView = document.getElementById('authForgotView');
  const authForgotEmailInput = document.getElementById('authForgotEmailInput');
  const authForgotNotice = document.getElementById('authForgotNotice');
  const authForgotForm = document.getElementById('authForgotForm');
  const authForgotStep2 = document.getElementById('authForgotStep2');
  const authForgotCodeInput = document.getElementById('authForgotCodeInput');
  const authForgotNewPassInput = document.getElementById('authForgotNewPassInput');
  const authForgotSubmitBtn = document.getElementById('authForgotSubmitBtn');
  const authForgotSubmitBtnText = document.getElementById('authForgotSubmitBtnText');
  const authForgotCancelBtn = document.getElementById('authForgotCancelBtn');

  const profileModal = document.getElementById('profileModal');
  const closeProfileBtn = document.getElementById('closeProfileBtn');
  const profileAvatarLarge = document.getElementById('profileAvatarLarge');
  const profileModalName = document.getElementById('profileModalName');
  const profileModalEmail = document.getElementById('profileModalEmail');
  const profileDisplayNameInput = document.getElementById('profileDisplayNameInput');
  const profileForm = document.getElementById('profileForm');
  const profileNotice = document.getElementById('profileNotice');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const saveProfileBtnText = document.getElementById('saveProfileBtnText');
  const profileAuthMethodDisplay = document.getElementById('profileAuthMethodDisplay');
  const profileDeleteAccountBtn = document.getElementById('profileDeleteAccountBtn');
  const rollAuthBakerTagBtn = document.getElementById('rollAuthBakerTagBtn');
  const rollProfileBakerTagBtn = document.getElementById('rollProfileBakerTagBtn');

  const deleteAccountModal = document.getElementById('deleteAccountModal');
  const cancelDeleteAccountBtn = document.getElementById('cancelDeleteAccountBtn');
  const confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');

  const photoLightboxModal = document.getElementById('photoLightboxModal');
  const lightboxCatName = document.getElementById('lightboxCatName');
  const lightboxImage = document.getElementById('lightboxImage');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');

  // Loaf Inspection Details Modal Elements
  const loafDetailsModal = document.getElementById('loafDetailsModal');
  const closeLoafDetailsBtn = document.getElementById('closeLoafDetailsBtn');
  const loafDetailsLoading = document.getElementById('loafDetailsLoading');
  const loafDetailsContent = document.getElementById('loafDetailsContent');
  const loafDetailsVerificationId = document.getElementById('loafDetailsVerificationId');
  const loafDetailsDate = document.getElementById('loafDetailsDate');
  const loafDetailsCatName = document.getElementById('loafDetailsCatName');
  const loafDetailsBakerName = document.getElementById('loafDetailsBakerName');
  const loafDetailsScoreStamp = document.getElementById('loafDetailsScoreStamp');
  const loafDetailsPhotoContainer = document.getElementById('loafDetailsPhotoContainer');
  const loafDetailsPhoto = document.getElementById('loafDetailsPhoto');
  const loafDetailsRank = document.getElementById('loafDetailsRank');
  const loafDetailsBread = document.getElementById('loafDetailsBread');
  const loafDetailsCritique = document.getElementById('loafDetailsCritique');
  const loafDetailsDragBadge = document.getElementById('loafDetailsDragBadge');
  const loafDetailsDragVal = document.getElementById('loafDetailsDragVal');
  const loafDetailsOarBadge = document.getElementById('loafDetailsOarBadge');
  const loafDetailsOarText = document.getElementById('loafDetailsOarText');
  const loafDetailsPawScore = document.getElementById('loafDetailsPawScore');
  const loafDetailsPawStatus = document.getElementById('loafDetailsPawStatus');
  const loafDetailsPawCritique = document.getElementById('loafDetailsPawCritique');
  const loafDetailsTailScore = document.getElementById('loafDetailsTailScore');
  const loafDetailsTailStatus = document.getElementById('loafDetailsTailStatus');
  const loafDetailsTailCritique = document.getElementById('loafDetailsTailCritique');
  const loafDetailsElbowScore = document.getElementById('loafDetailsElbowScore');
  const loafDetailsElbowStatus = document.getElementById('loafDetailsElbowStatus');
  const loafDetailsElbowCritique = document.getElementById('loafDetailsElbowCritique');
  const loafDetailsCrustScore = document.getElementById('loafDetailsCrustScore');
  const loafDetailsCrustStatus = document.getElementById('loafDetailsCrustStatus');
  const loafDetailsCrustCritique = document.getElementById('loafDetailsCrustCritique');
  const loafDetailsBadgesList = document.getElementById('loafDetailsBadgesList');
  const loafDetailsShareUrlInput = document.getElementById('loafDetailsShareUrlInput');
  const copyLoafShareUrlBtn = document.getElementById('copyLoafShareUrlBtn');
  const modalNativeShareBtn = document.getElementById('modalNativeShareBtn');

  // Display Name Safety Filters & Gamertag Generator
  const CLIENT_PROFANITY_REGEX = /\b(?:fuck|fck|shit|bitch|asshole|bastard|dick|pussy|cunt|cock|nigger|nigga|faggot|retard|whore|slut|twat|wanker|prick|penis|vagina|tit|tits|boob|boobs|nazi|hitler)\b/i;
  const ALLOWED_NAME_REGEX = /^[a-zA-Z0-9\u00C0-\u017F\s\-'.&_]+$/;
  const PLACEHOLDER_NAMES = new Set([
    'anonymous loaf', 'anonymous', 'unknown', 'untitled',
    'n/a', 'na', 'none', 'null', 'undefined', 'placeholder', 'test', 'user', 'username'
  ]);
  const RESERVED_DISPLAY_NAMES = new Set([
    'admin', 'administrator', 'system', 'moderator', 'mod', 'loafed',
    'loafedai', 'loafed-ai', 'loafed_ai', 'redersoft', 'staff', 'official',
    'support', 'root', 'security', 'bureau', 'master', 'owner'
  ]);

  const GAMERTAG_PREFIXES = [
    'Sir', 'Lady', 'Captain', 'Baron', 'Professor', 'Chef', 'Master', 
    'Grandmaster', 'Doctor', 'Agent', 'Count', 'Lord', 'Madame', 'Major'
  ];

  const GAMERTAG_ADJECTIVES = [
    'Toasty', 'Crispy', 'Golden', 'Kneady', 'Buttered', 'Sourdough', 'Brioche', 
    'Fluffy', 'Chonky', 'Glazed', 'Purrfect', 'Snuggly', 'Aerodynamic', 'Yeasty', 
    'Cinnamon', 'Artisan', 'Midnight', 'Crusty', 'Biscuity', 'Velvet', 'Warm', 
    'Frosted', 'Caramel', 'Nutty', 'Bubbly', 'Tender', 'DoubleBaked', 'Cozy'
  ];

  const GAMERTAG_NOUNS = [
    'Loaf', 'Boule', 'Brioche', 'Baguette', 'Croissant', 'Biscuit', 'Muffin', 
    'Scone', 'Pastry', 'Dough', 'Crumb', 'Whiskers', 'Paws', 'Peet', 'Claws', 
    'Tabby', 'Calico', 'Tuxedo', 'Baton', 'Bun', 'Baker', 'Roll', 'Fritter', 'Crust'
  ];

  const GAMERTAG_TITLES = [
    'Lord', 'Ninja', 'Knight', 'Wizard', 'Samurai', 'Champion', 'Crafter', 
    'Whisperer', 'Pilot', 'Overlord', 'Kneader', 'Specialist', 'Sensei', 'Boi'
  ];

  const GAMERTAG_PUNS = [
    'KneadForSpeed', 'LordOfLoaves', 'PawsitivelyToasted', 'TheDailyDough',
    'AerodynamicPeet', 'BaguetteBandit', 'CinnabunClaws', 'TheGlazedTabby',
    'ToastMaster3000', 'StarBakerCat', 'BreadWinnerMeow', 'RollModel',
    'DoughReMiFaw', 'BakeMyDay', 'FlourPowerCat', 'UpperCrustPaws'
  ];

  function generateBakerGamerTag() {
    const mode = Math.floor(Math.random() * 4);
    let tag = '';

    if (mode === 0) {
      const pre = GAMERTAG_PREFIXES[Math.floor(Math.random() * GAMERTAG_PREFIXES.length)];
      const adj = GAMERTAG_ADJECTIVES[Math.floor(Math.random() * GAMERTAG_ADJECTIVES.length)];
      const noun = GAMERTAG_NOUNS[Math.floor(Math.random() * GAMERTAG_NOUNS.length)];
      tag = `${pre}${adj}${noun}`;
    } else if (mode === 1) {
      const adj = GAMERTAG_ADJECTIVES[Math.floor(Math.random() * GAMERTAG_ADJECTIVES.length)];
      const noun = GAMERTAG_NOUNS[Math.floor(Math.random() * GAMERTAG_NOUNS.length)];
      const title = GAMERTAG_TITLES[Math.floor(Math.random() * GAMERTAG_TITLES.length)];
      tag = `${adj}${noun}${title}`;
    } else if (mode === 2) {
      tag = GAMERTAG_PUNS[Math.floor(Math.random() * GAMERTAG_PUNS.length)];
    } else {
      const adj = GAMERTAG_ADJECTIVES[Math.floor(Math.random() * GAMERTAG_ADJECTIVES.length)];
      const noun = GAMERTAG_NOUNS[Math.floor(Math.random() * GAMERTAG_NOUNS.length)];
      const num = Math.floor(Math.random() * 90) + 10;
      tag = `${adj}${noun}${num}`;
    }

    if (tag.length > 28) tag = tag.slice(0, 28);
    return tag;
  }

  function handleRollGamerTag(inputEl, btnEl) {
    if (!inputEl) return;
    const tag = generateBakerGamerTag();
    inputEl.value = tag;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.focus();

    if (btnEl) {
      btnEl.classList.remove('rolling');
      void btnEl.offsetWidth; // Force reflow for spin animation
      btnEl.classList.add('rolling');
      setTimeout(() => btnEl.classList.remove('rolling'), 450);
    }

    showToast({
      type: 'info',
      title: 'Baker Tag Rolled',
      message: `Suggested: "${tag}"!`
    });
  }

  function validateLeaderboardField(val, fieldLabel, minLen, maxLen) {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return `${fieldLabel} is required.`;
    }
    if (trimmed.length < minLen) {
      return `${fieldLabel} must be at least ${minLen} characters long.`;
    }
    if (trimmed.length > maxLen) {
      return `${fieldLabel} cannot exceed ${maxLen} characters.`;
    }
    // Reject HTML tags, script brackets, or injection characters
    if (/[<>{}[\];\\/`~=+^%$*"]/.test(trimmed)) {
      return `${fieldLabel} contains invalid characters. Please use letters, numbers, spaces, and basic punctuation (- ' . & _).`;
    }
    if (!ALLOWED_NAME_REGEX.test(trimmed)) {
      return `${fieldLabel} contains unsupported characters. Please use letters, numbers, spaces, and basic punctuation (- ' . & _).`;
    }
    if (!/[a-zA-Z0-9\u00C0-\u017F]/.test(trimmed)) {
      return `${fieldLabel} must contain at least one letter or number.`;
    }
    if (PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) {
      return `Please provide an actual name for your ${fieldLabel.toLowerCase()} instead of a generic placeholder.`;
    }
    // Reserved administrative title checks
    const normalizedLower = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (RESERVED_DISPLAY_NAMES.has(trimmed.toLowerCase()) || RESERVED_DISPLAY_NAMES.has(normalizedLower)) {
      return `"${trimmed}" is a reserved system title. Please choose a personalized baker name.`;
    }
    if (CLIENT_PROFANITY_REGEX.test(trimmed)) {
      return `${fieldLabel} contains inappropriate or offensive language. Please choose a family-friendly bakery name.`;
    }
    return null;
  }

  // Authentication & PKCE Implementation
  function generateRandomString(length = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  }

  async function sha256Base64Url(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function parseJwtPayload(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  function parseUserFromToken() {
    if (!state.idToken) {
      state.user = null;
      return;
    }
    const payload = parseJwtPayload(state.idToken);
    if (!payload) {
      state.user = null;
      return;
    }
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      signOut();
      return;
    }
    const email = payload.email || '';
    const tokenName = payload.name || payload['cognito:username'] || (email ? email.split('@')[0] : 'Baker');
    const savedName = localStorage.getItem('loafed_user_name');
    const name = savedName || tokenName;
    const avatarLetter = (name || 'B').charAt(0).toUpperCase();

    state.user = {
      id: payload.sub,
      email: email,
      name: name,
      avatar: avatarLetter
    };
  }

  function updateAuthUI() {
    if (state.user) {
      document.documentElement.classList.add('user-logged-in');
      if (headerSignInBtn) {
        headerSignInBtn.classList.add('hidden');
        headerSignInBtn.style.setProperty('display', 'none', 'important');
      }
      if (headerUserMenu) {
        headerUserMenu.classList.remove('hidden');
        headerUserMenu.style.display = '';
      }
      if (headerUserName) headerUserName.textContent = state.user.name;
      if (headerUserAvatar) headerUserAvatar.textContent = state.user.avatar;
      if (dropdownUserName) dropdownUserName.textContent = state.user.name;
      if (dropdownUserEmail) dropdownUserEmail.textContent = state.user.email || 'Authenticated User';
    } else {
      document.documentElement.classList.remove('user-logged-in');
      if (headerSignInBtn) {
        headerSignInBtn.classList.remove('hidden');
        headerSignInBtn.style.display = '';
      }
      if (headerUserMenu) {
        headerUserMenu.classList.add('hidden');
        headerUserMenu.style.setProperty('display', 'none', 'important');
      }
      if (headerUserDropdown) headerUserDropdown.classList.add('hidden');
    }
    refreshIcons();
  }

  async function fetchAuthConfig() {
    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        state.authConfig = await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch auth configuration', e);
    }
  }

  async function startCognitoAuth(idp = null) {
    if (!state.authConfig) {
      await fetchAuthConfig();
    }
    const config = state.authConfig;
    if (!config || !config.domain || !config.client_id) {
      showToast({ type: 'error', title: 'Auth Error', message: 'Cognito authentication configuration unavailable.' });
      return;
    }

    const verifier = generateRandomString(64);
    const challenge = await sha256Base64Url(verifier);
    sessionStorage.setItem('pkce_code_verifier', verifier);

    const redirectUri = window.location.origin + window.location.pathname;
    sessionStorage.setItem('pkce_redirect_uri', redirectUri);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.client_id,
      redirect_uri: redirectUri,
      scope: 'openid email profile aws.cognito.signin.user.admin',
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });

    if (idp === 'Google') {
      params.set('identity_provider', 'Google');
    }

    const authUrl = `https://${config.domain}/oauth2/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }

  async function handleAuthRedirectCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (!code) return;

    const verifier = sessionStorage.getItem('pkce_code_verifier');
    const redirectUri = sessionStorage.getItem('pkce_redirect_uri') || (window.location.origin + window.location.pathname);

    window.history.replaceState({}, document.title, window.location.pathname + (window.location.hash || ''));
    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('pkce_redirect_uri');

    if (!verifier) {
      console.warn('No PKCE verifier found in session.');
      return;
    }

    showToast({ type: 'info', title: 'Signing In', message: 'Authenticating with Google / Cognito...' });

    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          redirect_uri: redirectUri,
          code_verifier: verifier
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Token exchange failed');
      }

      const tokens = await res.json();
      if (tokens.id_token) {
        localStorage.setItem('loafed_id_token', tokens.id_token);
        state.idToken = tokens.id_token;
      }
      if (tokens.access_token) {
        localStorage.setItem('loafed_access_token', tokens.access_token);
        state.accessToken = tokens.access_token;
      }

      parseUserFromToken();
      updateAuthUI();
      showToast({
        type: 'success',
        title: 'Welcome Baker!',
        message: `Signed in as ${state.user ? state.user.name : 'Baker'}.`
      });

      // If user had clicked "My Loaves", reload it
      if (state.period === 'mine') {
        loadLeaderboard('mine');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      showToast({ type: 'error', title: 'Authentication Failed', message: err.message || 'Could not complete sign in.' });
    }
  }

  function signOut() {
    localStorage.removeItem('loafed_id_token');
    localStorage.removeItem('loafed_access_token');
    localStorage.removeItem('loafed_user_name');
    state.idToken = null;
    state.accessToken = null;
    state.user = null;
    updateAuthUI();
    if (headerUserDropdown) headerUserDropdown.classList.add('hidden');
    if (profileModal) profileModal.classList.add('hidden');
    showToast({ type: 'info', title: 'Signed Out', message: 'You have been signed out.' });

    if (state.period === 'mine') {
      loadLeaderboard('all');
    }
  }

  let authMode = 'signin';
  let pendingAuthEmail = '';
  let pendingAuthPassword = '';

  function showAuthNotice(element, message, type = 'error') {
    if (!element) return;
    element.className = `mb-3 p-3 rounded-xl text-xs font-medium border leading-relaxed ${
      type === 'error' ? 'auth-notice-error' : 'auth-notice-success'
    }`;
    element.textContent = message;
    element.classList.remove('hidden');
  }

  function hideAuthNotice(element) {
    if (element) {
      element.classList.add('hidden');
      element.textContent = '';
    }
  }

  function switchAuthView(viewName) {
    if (authMainView) authMainView.classList.toggle('hidden', viewName !== 'main');
    if (authVerifyView) authVerifyView.classList.toggle('hidden', viewName !== 'verify');
    if (authForgotView) authForgotView.classList.toggle('hidden', viewName !== 'forgot');
    hideAuthNotice(authNotice);
    hideAuthNotice(authVerifyNotice);
    hideAuthNotice(authForgotNotice);
    refreshIcons();
  }

  function setAuthMode(mode) {
    authMode = mode;
    hideAuthNotice(authNotice);
    if (mode === 'signin') {
      if (authTabSignIn) authTabSignIn.className = 'auth-tab-btn active';
      if (authTabSignUp) authTabSignUp.className = 'auth-tab-btn';
      if (authNameField) authNameField.classList.add('hidden');
      if (authModalTitle) authModalTitle.textContent = 'Sign In to Loafed AI';
      if (authModalSubtitle) authModalSubtitle.textContent = 'Publish certified cat loaves to the leaderboard and manage your bakery submissions.';
      if (authSubmitBtnText) authSubmitBtnText.textContent = 'Sign In to Loafed AI';
      if (authForgotPassLink) authForgotPassLink.classList.remove('hidden');
    } else {
      if (authTabSignUp) authTabSignUp.className = 'auth-tab-btn active';
      if (authTabSignIn) authTabSignIn.className = 'auth-tab-btn';
      if (authNameField) authNameField.classList.remove('hidden');
      if (authModalTitle) authModalTitle.textContent = 'Create Baker Account';
      if (authModalSubtitle) authModalSubtitle.textContent = 'Join the cat loaf bakery club and register your loaves on the public leaderboard.';
      if (authSubmitBtnText) authSubmitBtnText.textContent = 'Create Free Account';
      if (authForgotPassLink) authForgotPassLink.classList.add('hidden');
    }
    refreshIcons();
  }

  function openAuthModal(defaultMode = 'signin') {
    if (!authModal) return;
    setAuthMode(defaultMode);
    switchAuthView('main');
    if (authEmailInput) authEmailInput.value = '';
    if (authPasswordInput) authPasswordInput.value = '';
    if (authNameInput) authNameInput.value = '';
    authModal.classList.remove('hidden');
    refreshIcons();
    setTimeout(() => {
      if (authEmailInput) authEmailInput.focus();
    }, 60);
  }

  function closeAuthModal() {
    if (authModal) authModal.classList.add('hidden');
    hideAuthNotice(authNotice);
    hideAuthNotice(authVerifyNotice);
    hideAuthNotice(authForgotNotice);
  }

  function applyAuthTokens(tokens) {
    if (tokens.id_token) {
      localStorage.setItem('loafed_id_token', tokens.id_token);
      state.idToken = tokens.id_token;
    }
    if (tokens.access_token) {
      localStorage.setItem('loafed_access_token', tokens.access_token);
      state.accessToken = tokens.access_token;
    }
    parseUserFromToken();
    updateAuthUI();
    closeAuthModal();
    showToast({
      type: 'success',
      title: 'Welcome Baker!',
      message: `Signed in as ${state.user ? state.user.name : 'Baker'}.`
    });
    if (state.period === 'mine') {
      loadLeaderboard('mine');
    }
  }

  // Lightbox View
  function openLightbox(name, url) {
    if (!photoLightboxModal) return;
    lightboxCatName.textContent = name;
    lightboxImage.src = url;
    photoLightboxModal.classList.remove('hidden');
    refreshIcons();
  }
  window.loafedOpenLightbox = openLightbox;

  function closeLightbox() {
    if (photoLightboxModal) photoLightboxModal.classList.add('hidden');
  }

  if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
  if (photoLightboxModal) {
    photoLightboxModal.addEventListener('click', (e) => {
      if (e.target === photoLightboxModal) closeLightbox();
    });
  }

  // Loaf Inspection Details Modal View
  let activeLoafDetail = null;

  async function openLoafDetails(entryId) {
    if (!loafDetailsModal || !entryId) return;

    loafDetailsModal.classList.remove('hidden');
    if (loafDetailsLoading) loafDetailsLoading.classList.remove('hidden');
    if (loafDetailsContent) loafDetailsContent.classList.add('hidden');
    refreshIcons();

    try {
      const res = await fetch(`/api/loaf/${encodeURIComponent(entryId)}`);
      if (!res.ok) {
        throw new Error('Cat loaf details not found or may have been removed.');
      }
      const data = await res.json();
      activeLoafDetail = data;

      // Update URL with query param without full reload
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('loaf', entryId);
      window.history.replaceState({ loaf: entryId }, '', newUrl.toString());

      // Verification Badge
      if (loafDetailsVerificationId) {
        const gradeCode = (data.grade_letter || 'A').replace(/[^a-zA-Z]/g, '');
        const hash = (data.entry_id || '').slice(0, 6).toUpperCase();
        loafDetailsVerificationId.textContent = `LF-2026-${gradeCode}${hash}`;
      }

      // Date
      if (loafDetailsDate) {
        let dateStr = 'Certified 2026';
        if (data.created_at) {
          try {
            const d = new Date(data.created_at);
            dateStr = `Certified ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          } catch (_) {}
        }
        loafDetailsDate.textContent = dateStr;
      }

      if (loafDetailsCatName) loafDetailsCatName.textContent = data.cat_name || 'Anonymous Loaf';
      if (loafDetailsBakerName) loafDetailsBakerName.textContent = data.display_name || 'Anonymous Baker';
      if (loafDetailsScoreStamp) loafDetailsScoreStamp.textContent = `${data.overall_score || 0} ${data.grade_letter || ''}`;

      const photoUrl = data.thumbnail_url || '/static/logo.png';
      if (loafDetailsPhoto) {
        loafDetailsPhoto.src = photoUrl;
        loafDetailsPhoto.alt = `${data.cat_name || 'Cat'} Loaf Photo`;
      }
      if (loafDetailsPhotoContainer) {
        loafDetailsPhotoContainer.onclick = () => openLightbox(data.cat_name || 'Cat Loaf', photoUrl);
      }

      if (loafDetailsRank) loafDetailsRank.textContent = data.loaf_rank || 'Certified Artisan Loaf';
      if (loafDetailsBread) loafDetailsBread.textContent = data.bread_classification || 'Golden Brioche';
      if (loafDetailsCritique) loafDetailsCritique.textContent = data.summary_critique || 'Exemplary feline loaf posture.';

      if (loafDetailsDragVal) {
        const drag = data.drag_coefficient !== undefined ? Number(data.drag_coefficient).toFixed(2) : '0.12';
        loafDetailsDragVal.textContent = drag;
      }

      if (loafDetailsOarText) {
        loafDetailsOarText.textContent = data.oar_detected ? 'Oar Paw Deployed (Demerit)' : 'Flush Perimeter';
      }

      // 4 Pillars Breakdown
      const pt = data.paw_tuck || {};
      if (loafDetailsPawScore) loafDetailsPawScore.textContent = `${pt.score !== undefined ? pt.score : 20}/25`;
      if (loafDetailsPawStatus) loafDetailsPawStatus.textContent = pt.status || 'Paw Concealment';
      if (loafDetailsPawCritique) loafDetailsPawCritique.textContent = pt.critique || 'Perimeter inspected.';

      const tt = data.tail_tuck || {};
      if (loafDetailsTailScore) loafDetailsTailScore.textContent = `${tt.score !== undefined ? tt.score : 20}/25`;
      if (loafDetailsTailStatus) loafDetailsTailStatus.textContent = tt.status || 'Tail Tuck';
      if (loafDetailsTailCritique) loafDetailsTailCritique.textContent = tt.critique || 'Tail alignment inspected.';

      const ec = data.elbow_compactness || {};
      if (loafDetailsElbowScore) loafDetailsElbowScore.textContent = `${ec.score !== undefined ? ec.score : 20}/25`;
      if (loafDetailsElbowStatus) loafDetailsElbowStatus.textContent = ec.status || 'Elbow Compactness';
      if (loafDetailsElbowCritique) loafDetailsElbowCritique.textContent = ec.critique || 'Elbow fold inspected.';

      const cs = data.crust_symmetry || {};
      if (loafDetailsCrustScore) loafDetailsCrustScore.textContent = `${cs.score !== undefined ? cs.score : 20}/25`;
      if (loafDetailsCrustStatus) loafDetailsCrustStatus.textContent = cs.status || 'Crust Symmetry';
      if (loafDetailsCrustCritique) loafDetailsCrustCritique.textContent = cs.critique || 'Dorsal coat inspected.';

      // Badges
      if (loafDetailsBadgesList) {
        const badges = Array.isArray(data.badges) && data.badges.length > 0
          ? data.badges
          : ['Certified Feline Loaf', 'Zero Paw Visibility', `${data.bread_classification || 'Artisan'} Silhouette`];
        loafDetailsBadgesList.innerHTML = badges.map(b => `
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-orange-200 text-stone-800 font-bold text-[11px] shadow-2xs">
            <i data-lucide="check-circle" class="w-3 h-3 text-orange-600"></i>
            <span>${escapeHtml(b)}</span>
          </span>
        `).join('');
      }

      // Share URL input
      const shareUrl = `${window.location.origin}/leaderboard?loaf=${encodeURIComponent(data.entry_id)}`;
      if (loafDetailsShareUrlInput) loafDetailsShareUrlInput.value = shareUrl;

      // Show content
      if (loafDetailsLoading) loafDetailsLoading.classList.add('hidden');
      if (loafDetailsContent) loafDetailsContent.classList.remove('hidden');
      refreshIcons();

      // Highlight matching row if visible in current list
      const rowEl = document.getElementById(`loaf-row-${entryId}`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        rowEl.classList.add('ring-2', 'ring-orange-400');
        setTimeout(() => rowEl.classList.remove('ring-2', 'ring-orange-400'), 3000);
      }
    } catch (err) {
      console.error('Error opening loaf details:', err);
      showToast({ type: 'error', title: 'Inspection Record Not Found', message: err.message || 'Could not load loaf details.' });
      closeLoafDetails();
    }
  }

  function closeLoafDetails() {
    if (loafDetailsModal) loafDetailsModal.classList.add('hidden');
    // Clear URL param without reloading
    const newUrl = new URL(window.location);
    if (newUrl.searchParams.has('loaf')) {
      newUrl.searchParams.delete('loaf');
      window.history.replaceState({}, '', newUrl.pathname + (newUrl.search ? newUrl.search : ''));
    }
  }

  window.loafedOpenLoafDetails = openLoafDetails;

  async function shareLoafLink(entryId, catName, score, grade) {
    const shareUrl = `${window.location.origin}/leaderboard?loaf=${encodeURIComponent(entryId)}`;
    const shareData = {
      title: `${catName || 'Cat Loaf'} — Loafed AI Certified Feline`,
      text: `Check out ${catName || 'this cat loaf'} audited by Loafed AI with a verified score of ${score || ''} ${grade || ''}!`,
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast({
        type: 'success',
        title: 'Share Link Copied',
        message: `Shareable link for ${catName || 'this loaf'} copied to clipboard!`
      });
    } catch (_) {
      prompt('Copy shareable loaf link:', shareUrl);
    }
  }
  window.loafedShareLoaf = shareLoafLink;

  if (closeLoafDetailsBtn) closeLoafDetailsBtn.addEventListener('click', closeLoafDetails);
  if (loafDetailsModal) {
    loafDetailsModal.addEventListener('click', (e) => {
      if (e.target === loafDetailsModal) closeLoafDetails();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loafDetailsModal && !loafDetailsModal.classList.contains('hidden')) {
      closeLoafDetails();
    }
  });

  if (copyLoafShareUrlBtn && loafDetailsShareUrlInput) {
    copyLoafShareUrlBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(loafDetailsShareUrlInput.value);
        showToast({
          type: 'success',
          title: 'Link Copied',
          message: 'Loaf inspection link copied to clipboard!'
        });
      } catch (_) {
        loafDetailsShareUrlInput.select();
        document.execCommand('copy');
        showToast({
          type: 'success',
          title: 'Link Copied',
          message: 'Loaf inspection link copied to clipboard!'
        });
      }
    });
  }

  if (modalNativeShareBtn) {
    modalNativeShareBtn.addEventListener('click', () => {
      if (!activeLoafDetail) return;
      shareLoafLink(
        activeLoafDetail.entry_id,
        activeLoafDetail.cat_name,
        activeLoafDetail.overall_score,
        activeLoafDetail.grade_letter
      );
    });
  }

  // Leaderboard Filtering & Rendering
  function setPeriodTab(period) {
    state.period = period;

    const tabs = [
      { el: tabPeriodAll, key: 'all', title: 'All-Time Certified Rankings' },
      { el: tabPeriodMonth, key: 'month', title: 'This Month\'s Top Loaves' },
      { el: tabPeriodWeek, key: 'week', title: 'This Week\'s Fresh Bakes' },
      { el: tabPeriodMine, key: 'mine', title: 'My Submitted Loaf Evaluations' }
    ];

    tabs.forEach(t => {
      if (!t.el) return;
      if (t.key === period) {
        t.el.className = 'tab-filter-btn active';
        if (listSectionTitle) listSectionTitle.textContent = t.title;
      } else {
        t.el.className = 'tab-filter-btn';
      }
    });

    // Update URL query parameter without page reload
    const url = new URL(window.location.href);
    if (period === 'all') {
      url.searchParams.delete('period');
    } else {
      url.searchParams.set('period', period);
    }
    window.history.replaceState({}, '', url.toString());
  }

  function renderPodium(entries) {
    if (!podiumContainer || !entries || entries.length < 3 || state.period === 'mine') {
      if (podiumContainer) podiumContainer.classList.add('hidden');
      return;
    }

    const first = entries[0];
    const second = entries[1];
    const third = entries[2];

    const createPodiumContent = (entry, placeTitle, placeNumber, medalIcon, badgeClass, pillarClass, pillarLabel, isFirst = false) => {
      const catName = escapeHtml(entry.cat_name || 'Anonymous Loaf');
      const bakerName = escapeHtml(entry.display_name || 'Baker');
      const thumb = entry.thumbnail_url || '/static/logo.png';
      const score = entry.overall_score || 0;
      const grade = entry.grade_letter || '';
      const rankTitle = escapeHtml(entry.loaf_rank || 'Artisan Loaf');

      return `
        <div class="pedestal-card cursor-pointer" onclick="window.loafedOpenLoafDetails('${entry.entry_id}')" title="Click to view full inspection scorecard for ${catName}">
          <div class="pedestal-badge ${badgeClass}">
            <i data-lucide="${medalIcon}" class="w-3.5 h-3.5"></i>
            <span>${placeTitle}</span>
          </div>
          <div class="pedestal-photo-frame">
            <img src="${thumb}" alt="${catName}" loading="lazy">
            <span class="pedestal-stamp">${score} ${grade}</span>
          </div>
          <div class="w-full">
            <h3 class="font-black ${isFirst ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} text-stone-900 truncate max-w-full">${catName}</h3>
            <p class="text-[11px] sm:text-xs font-bold text-orange-800 truncate max-w-full mt-0.5">${rankTitle}</p>
            <p class="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 truncate max-w-full">Baked by <span class="font-medium text-stone-700">${bakerName}</span></p>
          </div>
        </div>
        <div class="pedestal-pillar ${pillarClass}">
          <span class="pedestal-number">${placeNumber}</span>
          <span class="pedestal-pillar-label">${pillarLabel}</span>
        </div>
      `;
    };

    podiumSecond.innerHTML = createPodiumContent(second, '2nd Place', '2', 'medal', 'pedestal-badge-silver', 'pedestal-pillar-2', 'Silver Loaf');
    podiumFirst.innerHTML = createPodiumContent(first, '1st Champion', '1', 'crown', 'pedestal-badge-gold', 'pedestal-pillar-1', 'Champion Boule', true);
    podiumThird.innerHTML = createPodiumContent(third, '3rd Place', '3', 'medal', 'pedestal-badge-bronze', 'pedestal-pillar-3', 'Bronze Loaf');

    podiumContainer.classList.remove('hidden');
    refreshIcons();
  }

  function renderList(entries, isMine = false) {
    if (!leaderboardEntriesList) return;

    if (!entries || entries.length === 0) {
      leaderboardEntriesList.innerHTML = `
        <div class="py-16 text-center text-stone-500">
          <div class="w-14 h-14 rounded-2xl bg-orange-100/80 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <i data-lucide="inbox" class="w-7 h-7"></i>
          </div>
          <h3 class="text-sm font-black text-stone-800">No submissions recorded for this period</h3>
          <p class="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            ${isMine 
              ? 'You have not submitted any cat loaves to the public leaderboard yet. Grade your cat to claim your spot!' 
              : 'Be the first baker to audit a feline loaf and claim the #1 ranking for this period!'}
          </p>
          <a href="/" class="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 shimmer-btn btn-tactile">
            <i data-lucide="camera" class="w-3.5 h-3.5"></i>
            <span>Inspect a Cat Loaf</span>
          </a>
        </div>
      `;
      refreshIcons();
      return;
    }

    leaderboardEntriesList.innerHTML = entries.map((entry, idx) => {
      const rank = entry.rank || (idx + 1);
      let rankBadge = '';

      if (rank === 1) {
        rankBadge = '<span class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 flex items-center justify-center text-xs font-black shadow-xs border border-amber-400">1</span>';
      } else if (rank === 2) {
        rankBadge = '<span class="w-8 h-8 rounded-xl bg-gradient-to-br from-stone-200 to-stone-400 text-stone-800 flex items-center justify-center text-xs font-black shadow-xs border border-stone-300">2</span>';
      } else if (rank === 3) {
        rankBadge = '<span class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 text-amber-50 flex items-center justify-center text-xs font-black shadow-xs border border-amber-700">3</span>';
      } else {
        rankBadge = `<span class="w-8 h-8 rounded-xl bg-orange-50 text-stone-700 flex items-center justify-center text-xs font-bold border border-orange-200">${rank}</span>`;
      }

      const thumb = entry.thumbnail_url || '/static/logo.png';
      const catName = escapeHtml(entry.cat_name || 'Anonymous Loaf');
      const bakerName = escapeHtml(entry.display_name || 'Baker');
      const score = entry.overall_score || 0;
      const gradeLetter = entry.grade_letter || '';
      const loafRank = escapeHtml(entry.loaf_rank || 'Artisan Loaf');
      const bread = escapeHtml(entry.bread_classification || 'Brioche');

      let actionBtns = '';
      if (isMine) {
        actionBtns = `
          <div class="flex items-center gap-1 shrink-0 ml-1.5" onclick="event.stopPropagation()">
            <button class="share-loaf-btn p-2 rounded-xl text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition-colors" data-id="${entry.entry_id}" data-name="${catName}" data-score="${score}" data-grade="${gradeLetter}" aria-label="Share ${catName} loaf link" title="Share link to this cat loaf">
              <i data-lucide="share-2" class="w-4 h-4 text-orange-600"></i>
            </button>
            <button class="delete-loaf-btn p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors" data-id="${entry.entry_id}" aria-label="Delete ${catName} submission" title="Delete submission">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        `;
      } else {
        actionBtns = `
          <div class="flex items-center gap-1 shrink-0 ml-1.5" onclick="event.stopPropagation()">
            <button class="share-loaf-btn p-2 rounded-xl text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition-colors" data-id="${entry.entry_id}" data-name="${catName}" data-score="${score}" data-grade="${gradeLetter}" aria-label="Share ${catName} loaf link" title="Share link to this cat loaf">
              <i data-lucide="share-2" class="w-4 h-4 text-orange-600"></i>
            </button>
            <button class="report-loaf-btn p-2 rounded-xl text-stone-300 hover:text-amber-700 hover:bg-orange-50 transition-colors" data-id="${entry.entry_id}" data-score="${score}" aria-label="Report ${catName} submission" title="Report submission as inappropriate or non-cat">
              <i data-lucide="flag" class="w-4 h-4"></i>
            </button>
          </div>
        `;
      }

      return `
        <div id="loaf-row-${entry.entry_id}" class="leaderboard-entry-row p-3.5 sm:p-4 rounded-2xl bg-white border border-orange-200/90 hover:border-amber-400 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5 sm:gap-4 group cursor-pointer" onclick="window.loafedOpenLoafDetails('${entry.entry_id}')" title="Click to view full inspection scorecard for ${catName}">
          <div class="shrink-0 flex items-center justify-center">
            ${rankBadge}
          </div>
          <div class="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-orange-200/80 bg-orange-50 shrink-0">
            <img src="${thumb}" alt="${catName}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200">
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h4 class="font-extrabold text-sm sm:text-base text-stone-900 truncate group-hover:text-orange-950 transition-colors">${catName}</h4>
              <span class="stamp text-xs font-black text-orange-700 bg-white border-orange-700 shrink-0">${score} ${gradeLetter}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-stone-600 mt-0.5 flex-wrap">
              <span class="text-orange-950 font-bold truncate">${loafRank}</span>
              <span class="hidden sm:inline text-stone-300">&bull;</span>
              <span class="text-stone-500 text-[11px] truncate">${bread}</span>
            </div>
            <div class="text-[11px] text-stone-400 mt-1 truncate">
              Baked by <span class="font-medium text-stone-600">${bakerName}</span>
            </div>
          </div>
          ${actionBtns}
        </div>
      `;
    }).join('');

    refreshIcons();

    leaderboardEntriesList.querySelectorAll('.share-loaf-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        const name = e.currentTarget.getAttribute('data-name');
        const score = e.currentTarget.getAttribute('data-score');
        const grade = e.currentTarget.getAttribute('data-grade');
        shareLoafLink(id, name, score, grade);
      });
    });

    if (isMine) {
      leaderboardEntriesList.querySelectorAll('.delete-loaf-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (!id) return;
          if (!confirm('Are you sure you want to permanently delete this cat loaf from the leaderboard?')) return;
          try {
            const res = await fetch(`/api/leaderboard/entry/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${state.idToken}` }
            });
            if (res.ok) {
              showToast({ type: 'info', title: 'Loaf Removed', message: 'Leaderboard submission removed.' });
              loadLeaderboard('mine');
            } else {
              showToast({ type: 'error', title: 'Delete Error', message: 'Failed to delete submission.' });
            }
          } catch (err) {
            showToast({ type: 'error', title: 'Delete Error', message: err.message });
          }
        });
      });
    } else {
      leaderboardEntriesList.querySelectorAll('.report-loaf-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const score = e.currentTarget.getAttribute('data-score');
          if (!id) return;
          if (!confirm('Report this submission as inappropriate or not an authentic cat loaf? Our moderators will review it.')) return;
          try {
            const headers = { 'Content-Type': 'application/json' };
            if (state.idToken) headers['Authorization'] = `Bearer ${state.idToken}`;
            const res = await fetch('/api/leaderboard/report', {
              method: 'POST',
              headers,
              body: JSON.stringify({ entry_id: id, score: parseInt(score, 10) })
            });
            const data = await res.json();
            if (res.ok) {
              showToast({ type: 'success', title: 'Report Submitted', message: 'Thank you for helping keep Loafed family friendly!' });
              loadLeaderboard(state.period);
            } else {
              showToast({ type: 'error', title: 'Report Error', message: data.detail || 'Could not submit report.' });
            }
          } catch (err) {
            showToast({ type: 'error', title: 'Report Error', message: err.message });
          }
        });
      });
    }
  }

  // Window helper for lightbox clicks inside generated HTML
  window.loafedOpenLightbox = openLightbox;

  async function loadLeaderboard(period = 'all') {
    setPeriodTab(period);
    if (!leaderboardEntriesList) return;

    leaderboardEntriesList.innerHTML = `
      <div class="py-16 text-center text-stone-400">
        <i data-lucide="loader-2" class="w-7 h-7 animate-spin mx-auto text-orange-600 mb-2"></i>
        <p class="text-xs font-semibold">Loading certified rankings...</p>
      </div>
    `;
    if (podiumContainer) podiumContainer.classList.add('hidden');
    refreshIcons();

    if (period === 'mine') {
      if (!state.user || !state.idToken) {
        leaderboardEntriesList.innerHTML = `
          <div class="py-16 text-center text-stone-500">
            <div class="w-14 h-14 rounded-2xl bg-orange-100/80 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <i data-lucide="lock" class="w-7 h-7"></i>
            </div>
            <h3 class="text-sm font-black text-stone-800">Sign in to view your submissions</h3>
            <p class="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
              Authenticate with Google or email to see all your certified loaves and manage your entries.
            </p>
            <button id="pageSignInPromptBtn" class="mt-4 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 shimmer-btn btn-tactile">
              Sign In
            </button>
          </div>
        `;
        refreshIcons();
        const pBtn = document.getElementById('pageSignInPromptBtn');
        if (pBtn) pBtn.addEventListener('click', openAuthModal);
        if (leaderboardCountText) leaderboardCountText.textContent = 'Sign-in required';
        return;
      }

      try {
        const res = await fetch('/api/leaderboard/my-entries', {
          headers: { 'Authorization': `Bearer ${state.idToken}` }
        });
        if (!res.ok) throw new Error('Could not retrieve your submissions');
        const data = await res.json();
        const entries = data.entries || [];
        state.entries = entries;
        if (leaderboardCountText) leaderboardCountText.textContent = `${entries.length} of your loaves`;
        renderList(entries, true);
      } catch (err) {
        leaderboardEntriesList.innerHTML = `<p class="py-10 text-center text-xs text-red-500">${err.message}</p>`;
      }
      return;
    }

    try {
      const res = await fetch(`/api/leaderboard?period=${period}`);
      if (!res.ok) throw new Error('Failed to retrieve leaderboard rankings');
      const data = await res.json();
      const entries = data.entries || [];
      state.entries = entries;
      if (leaderboardCountText) leaderboardCountText.textContent = `${entries.length} Certified Loaves`;

      renderPodium(entries);
      renderList(entries, false);
    } catch (err) {
      leaderboardEntriesList.innerHTML = `<p class="py-10 text-center text-xs text-red-500">${err.message}</p>`;
    }
  }

  // Event Listeners
  if (tabPeriodAll) tabPeriodAll.addEventListener('click', () => loadLeaderboard('all'));
  if (tabPeriodMonth) tabPeriodMonth.addEventListener('click', () => loadLeaderboard('month'));
  if (tabPeriodWeek) tabPeriodWeek.addEventListener('click', () => loadLeaderboard('week'));
  if (tabPeriodMine) tabPeriodMine.addEventListener('click', () => loadLeaderboard('mine'));

  if (headerSignInBtn) headerSignInBtn.addEventListener('click', () => openAuthModal('signin'));
  if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', closeAuthModal);

  // Password Visibility Toggles
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.innerHTML = isPassword 
        ? '<i data-lucide="eye-off" class="w-4 h-4"></i>' 
        : '<i data-lucide="eye" class="w-4 h-4"></i>';
      refreshIcons();
    });
  });

  // 1-Click Google Sign-In (Direct to Google, skips Cognito Hosted UI)
  if (signInGoogleBtn) {
    signInGoogleBtn.addEventListener('click', () => {
      closeAuthModal();
      startCognitoAuth('Google');
    });
  }

  // Auth Tabs (Sign In vs Create Account)
  if (authTabSignIn) {
    authTabSignIn.addEventListener('click', () => setAuthMode('signin'));
  }
  if (authTabSignUp) {
    authTabSignUp.addEventListener('click', () => setAuthMode('signup'));
  }

  // Roll GamerTag Buttons
  if (rollAuthBakerTagBtn) {
    rollAuthBakerTagBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleRollGamerTag(authNameInput, rollAuthBakerTagBtn);
    });
  }

  if (rollProfileBakerTagBtn) {
    rollProfileBakerTagBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleRollGamerTag(profileDisplayNameInput, rollProfileBakerTagBtn);
    });
  }

  // Email Sign In / Sign Up Form
  if (authEmailForm) {
    authEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthNotice(authNotice);

      const email = authEmailInput ? authEmailInput.value.trim().toLowerCase() : '';
      const password = authPasswordInput ? authPasswordInput.value : '';
      const name = authNameInput ? authNameInput.value.trim() : '';

      if (!email || !password) {
        showAuthNotice(authNotice, 'Please enter both email and password.');
        return;
      }

      const submitBtn = authSubmitBtn;
      const origText = authSubmitBtnText ? authSubmitBtnText.textContent : 'Submit';
      if (submitBtn) submitBtn.disabled = true;
      if (authSubmitBtnText) authSubmitBtnText.textContent = 'Please wait...';

      try {
        if (authMode === 'signin') {
          const res = await fetch('/api/auth/email/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 403 || (data.detail && data.detail.includes('USER_NOT_CONFIRMED'))) {
              pendingAuthEmail = email;
              pendingAuthPassword = password;
              if (authVerifyEmailDisplay) authVerifyEmailDisplay.textContent = email;
              switchAuthView('verify');
              showAuthNotice(authVerifyNotice, 'Your email has not been verified yet. Please enter the 6-digit code sent to your inbox.', 'error');
              return;
            }
            throw new Error(data.detail || 'Sign in failed. Please check your email and password.');
          }
          applyAuthTokens(data);
        } else {
          // Sign Up
          if (name) {
            const nameErr = validateLeaderboardField(name, 'Baker Display Name', 2, 30);
            if (nameErr) {
              showAuthNotice(authNotice, nameErr);
              if (submitBtn) submitBtn.disabled = false;
              if (authSubmitBtnText) authSubmitBtnText.textContent = origText;
              return;
            }
          }
          if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long.');
          }
          const res = await fetch('/api/auth/email/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, display_name: name })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.detail || 'Registration failed. Please try again.');
          }
          pendingAuthEmail = email;
          pendingAuthPassword = password;
          if (authVerifyEmailDisplay) authVerifyEmailDisplay.textContent = email;
          switchAuthView('verify');
          showAuthNotice(authVerifyNotice, 'Account created! Enter the 6-digit verification code sent to your email.', 'success');
        }
      } catch (err) {
        showAuthNotice(authNotice, err.message || 'An error occurred.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (authSubmitBtnText) authSubmitBtnText.textContent = origText;
        refreshIcons();
      }
    });
  }

  // Verification Code (OTP) Form
  if (authVerifyForm) {
    authVerifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthNotice(authVerifyNotice);
      const code = authVerifyCodeInput ? authVerifyCodeInput.value.trim() : '';
      if (!code) {
        showAuthNotice(authVerifyNotice, 'Please enter your 6-digit verification code.');
        return;
      }

      const submitBtn = authVerifySubmitBtn;
      const origText = authVerifySubmitBtnText ? authVerifySubmitBtnText.textContent : 'Verify';
      if (submitBtn) submitBtn.disabled = true;
      if (authVerifySubmitBtnText) authVerifySubmitBtnText.textContent = 'Verifying...';

      try {
        const res = await fetch('/api/auth/email/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pendingAuthEmail,
            code: code,
            password: pendingAuthPassword || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Verification code failed. Please check your code.');
        }

        if (data.id_token) {
          applyAuthTokens(data);
        } else {
          switchAuthView('main');
          setAuthMode('signin');
          if (authEmailInput) authEmailInput.value = pendingAuthEmail;
          showAuthNotice(authNotice, 'Email confirmed! You can now sign in with your password.', 'success');
        }
      } catch (err) {
        showAuthNotice(authVerifyNotice, err.message || 'Verification failed.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (authVerifySubmitBtnText) authVerifySubmitBtnText.textContent = origText;
        refreshIcons();
      }
    });
  }

  // Resend Verification Code
  if (authResendCodeBtn) {
    authResendCodeBtn.addEventListener('click', async () => {
      if (!pendingAuthEmail) return;
      try {
        const res = await fetch('/api/auth/email/resend-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingAuthEmail })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Could not resend code.');
        showAuthNotice(authVerifyNotice, 'A fresh 6-digit verification code has been emailed to you.', 'success');
      } catch (err) {
        showAuthNotice(authVerifyNotice, err.message || 'Could not resend code.', 'error');
      }
    });
  }

  if (authBackToSignInBtn) {
    authBackToSignInBtn.addEventListener('click', () => {
      switchAuthView('main');
      setAuthMode('signin');
    });
  }

  // Forgot Password Flow
  if (authForgotPassLink) {
    authForgotPassLink.addEventListener('click', () => {
      switchAuthView('forgot');
      if (authForgotStep2) authForgotStep2.classList.add('hidden');
      if (authForgotSubmitBtnText) authForgotSubmitBtnText.textContent = 'Send Reset Code';
      if (authForgotEmailInput && authEmailInput) {
        authForgotEmailInput.value = authEmailInput.value.trim();
      }
    });
  }

  if (authForgotForm) {
    authForgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthNotice(authForgotNotice);
      const email = authForgotEmailInput ? authForgotEmailInput.value.trim().toLowerCase() : '';
      if (!email) {
        showAuthNotice(authForgotNotice, 'Please enter your email address.');
        return;
      }

      const isStep2 = authForgotStep2 && !authForgotStep2.classList.contains('hidden');
      const submitBtn = authForgotSubmitBtn;
      const origText = authForgotSubmitBtnText ? authForgotSubmitBtnText.textContent : 'Submit';
      if (submitBtn) submitBtn.disabled = true;
      if (authForgotSubmitBtnText) authForgotSubmitBtnText.textContent = 'Processing...';

      try {
        if (!isStep2) {
          const res = await fetch('/api/auth/email/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Could not send reset code.');
          if (authForgotStep2) authForgotStep2.classList.remove('hidden');
          if (authForgotSubmitBtnText) authForgotSubmitBtnText.textContent = 'Update Password & Sign In';
          showAuthNotice(authForgotNotice, 'Reset code sent! Check your email inbox.', 'success');
        } else {
          const code = authForgotCodeInput ? authForgotCodeInput.value.trim() : '';
          const newPassword = authForgotNewPassInput ? authForgotNewPassInput.value : '';
          if (!code || !newPassword) {
            throw new Error('Please enter the reset code and a new password.');
          }
          if (newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters long.');
          }
          const res = await fetch('/api/auth/email/confirm-forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, new_password: newPassword })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Password reset failed.');

          if (data.id_token) {
            applyAuthTokens(data);
          } else {
            switchAuthView('main');
            setAuthMode('signin');
            if (authEmailInput) authEmailInput.value = email;
            showAuthNotice(authNotice, 'Password reset successfully! Please sign in with your new password.', 'success');
          }
        }
      } catch (err) {
        showAuthNotice(authForgotNotice, err.message || 'Password reset failed.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (authForgotSubmitBtnText && !isStep2 && authForgotStep2 && !authForgotStep2.classList.contains('hidden')) {
          authForgotSubmitBtnText.textContent = 'Update Password & Sign In';
        } else if (authForgotSubmitBtnText) {
          authForgotSubmitBtnText.textContent = origText;
        }
        refreshIcons();
      }
    });
  }

  if (authForgotCancelBtn) {
    authForgotCancelBtn.addEventListener('click', () => {
      switchAuthView('main');
      setAuthMode('signin');
    });
  }

  if (headerUserMenuBtn) {
    headerUserMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!headerUserDropdown) return;
      const isHidden = headerUserDropdown.classList.contains('hidden');
      if (isHidden) {
        headerUserDropdown.classList.remove('hidden');
        headerUserMenuBtn.setAttribute('aria-expanded', 'true');
      } else {
        headerUserDropdown.classList.add('hidden');
        headerUserMenuBtn.setAttribute('aria-expanded', 'false');
      }
      refreshIcons();
    });
  }

  document.addEventListener('click', (e) => {
    if (headerUserDropdown && !headerUserDropdown.contains(e.target) && e.target !== headerUserMenuBtn) {
      headerUserDropdown.classList.add('hidden');
      if (headerUserMenuBtn) headerUserMenuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  if (menuMyLoavesBtn) {
    menuMyLoavesBtn.addEventListener('click', () => {
      if (headerUserDropdown) headerUserDropdown.classList.add('hidden');
      loadLeaderboard('mine');
    });
  }
  if (menuSignOutBtn) {
    menuSignOutBtn.addEventListener('click', signOut);
  }

  function showProfileNotice(message, type = 'error') {
    if (!profileNotice) return;
    profileNotice.className = `mb-3 p-3 rounded-xl text-xs font-semibold border leading-relaxed ${
      type === 'error' ? 'auth-notice-error' : 'auth-notice-success'
    }`;
    profileNotice.textContent = message;
    profileNotice.classList.remove('hidden');
  }

  function hideProfileNotice() {
    if (profileNotice) {
      profileNotice.classList.add('hidden');
      profileNotice.textContent = '';
    }
  }

  async function openProfileModal() {
    if (!state.user) {
      openAuthModal('signin');
      return;
    }
    hideProfileNotice();
    if (profileModal) profileModal.classList.remove('hidden');
    if (profileModalName) profileModalName.textContent = state.user.name || 'Baker Profile';
    if (profileModalEmail) profileModalEmail.textContent = state.user.email || 'baker@example.com';
    if (profileAvatarLarge) profileAvatarLarge.textContent = state.user.avatar || 'B';
    if (profileDisplayNameInput) profileDisplayNameInput.value = state.user.name || '';
    if (profileAuthMethodDisplay) profileAuthMethodDisplay.textContent = 'Email & Password';

    refreshIcons();

    if (state.idToken) {
      try {
        const res = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${state.idToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.display_name) {
            state.user.name = data.display_name;
            state.user.avatar = (data.display_name || 'B').charAt(0).toUpperCase();
            localStorage.setItem('loafed_user_name', data.display_name);
            if (profileModalName) profileModalName.textContent = data.display_name;
            if (profileDisplayNameInput) profileDisplayNameInput.value = data.display_name;
            if (profileAvatarLarge) profileAvatarLarge.textContent = state.user.avatar;
            updateAuthUI();
          }
          if (data.email && profileModalEmail) {
            profileModalEmail.textContent = data.email;
          }
          if (data.auth_provider && profileAuthMethodDisplay) {
            profileAuthMethodDisplay.textContent = data.auth_provider;
          }
        }
      } catch (err) {
        console.warn('Could not refresh profile details:', err);
      }
    }
  }

  function closeProfileModal() {
    if (profileModal) profileModal.classList.add('hidden');
    hideProfileNotice();
  }

  if (menuProfileBtn) {
    menuProfileBtn.addEventListener('click', () => {
      if (headerUserDropdown) headerUserDropdown.classList.add('hidden');
      openProfileModal();
    });
  }

  if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', closeProfileModal);
  }

  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) {
        closeProfileModal();
      }
    });
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideProfileNotice();
      if (!state.idToken) {
        showProfileNotice('Please sign in to update your profile.', 'error');
        return;
      }
      const newName = profileDisplayNameInput ? profileDisplayNameInput.value.trim() : '';
      const nameErr = validateLeaderboardField(newName, 'Baker Display Name', 2, 30);
      if (nameErr) {
        showProfileNotice(nameErr, 'error');
        return;
      }

      const origText = saveProfileBtnText ? saveProfileBtnText.textContent : 'Save Display Name';
      if (saveProfileBtn) saveProfileBtn.disabled = true;
      if (saveProfileBtnText) saveProfileBtnText.textContent = 'Saving...';

      try {
        const res = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.idToken}`
          },
          body: JSON.stringify({ display_name: newName })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to update profile name.');
        }

        const cleanName = data.display_name || newName;
        state.user.name = cleanName;
        state.user.avatar = (cleanName || 'B').charAt(0).toUpperCase();
        localStorage.setItem('loafed_user_name', cleanName);

        if (profileModalName) profileModalName.textContent = cleanName;
        if (profileAvatarLarge) profileAvatarLarge.textContent = state.user.avatar;
        if (profileDisplayNameInput) profileDisplayNameInput.value = cleanName;

        updateAuthUI();
        showProfileNotice('Baker display name updated successfully!', 'success');
        showToast({
          type: 'success',
          title: 'Profile Updated',
          message: `Baker display name set to "${cleanName}".`
        });

        if (typeof loadLeaderboard === 'function' && state.period) {
          loadLeaderboard(state.period);
        }
      } catch (err) {
        showProfileNotice(err.message || 'An error occurred while updating profile.', 'error');
      } finally {
        if (saveProfileBtn) saveProfileBtn.disabled = false;
        if (saveProfileBtnText) saveProfileBtnText.textContent = origText;
        refreshIcons();
      }
    });
  }

  if (profileDeleteAccountBtn) {
    profileDeleteAccountBtn.addEventListener('click', () => {
      closeProfileModal();
      if (deleteAccountModal) deleteAccountModal.classList.remove('hidden');
      refreshIcons();
    });
  }

  if (cancelDeleteAccountBtn) {
    cancelDeleteAccountBtn.addEventListener('click', () => {
      if (deleteAccountModal) deleteAccountModal.classList.add('hidden');
    });
  }

  if (deleteAccountModal) {
    deleteAccountModal.addEventListener('click', (e) => {
      if (e.target === deleteAccountModal) {
        deleteAccountModal.classList.add('hidden');
      }
    });
  }

  if (confirmDeleteAccountBtn) {
    confirmDeleteAccountBtn.addEventListener('click', async () => {
      if (!state.idToken) return;
      confirmDeleteAccountBtn.disabled = true;
      confirmDeleteAccountBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Deleting...</span>';
      refreshIcons();

      try {
        const res = await fetch('/api/user/account', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${state.idToken}` }
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Account deletion failed.');
        }
        if (deleteAccountModal) deleteAccountModal.classList.add('hidden');
        if (profileModal) profileModal.classList.add('hidden');
        signOut();
        showToast({
          type: 'info',
          title: 'Account Deleted',
          message: 'Your account and all associated submissions have been permanently deleted.'
        });
      } catch (err) {
        showToast({ type: 'error', title: 'Deletion Error', message: err.message });
      } finally {
        confirmDeleteAccountBtn.disabled = false;
        confirmDeleteAccountBtn.innerHTML = '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i><span>Permanently Delete</span>';
        refreshIcons();
      }
    });
  }

  // Initial Boot
  fetchAuthConfig();
  parseUserFromToken();
  updateAuthUI();
  handleAuthRedirectCallback();

  // Read URL query parameter for default period
  const initialParams = new URLSearchParams(window.location.search);
  const requestedPeriod = initialParams.get('period');
  if (requestedPeriod && ['all', 'month', 'week', 'mine'].includes(requestedPeriod)) {
    loadLeaderboard(requestedPeriod);
  } else {
    loadLeaderboard('all');
  }

  // Check if a specific loaf was linked in the URL
  const requestedLoaf = initialParams.get('loaf');
  if (requestedLoaf) {
    openLoafDetails(requestedLoaf);
  }

  refreshIcons();
});

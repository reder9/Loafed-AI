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

  function formatUserFacingError(value, fallback = 'Something went wrong. Please try again.') {
    if (value instanceof Error) return formatUserFacingError(value.message, fallback);
    if (typeof value === 'string' && value.trim() && value.trim() !== '[object Object]') return value.trim();
    if (Array.isArray(value)) {
      const messages = value.map(item => formatUserFacingError(item, '')).filter(Boolean);
      return messages.length ? messages.join(' ') : fallback;
    }
    if (value && typeof value === 'object') {
      for (const key of ['detail', 'message', 'msg', 'error', 'reason']) {
        if (value[key] !== undefined) {
          const message = formatUserFacingError(value[key], '');
          if (message) return message;
        }
      }
    }
    return fallback;
  }

  // Toast Notification System (Zero emojis, Lucide vector icons)
  const toastContainer = document.getElementById('toastContainer');
  function showToast({ title = '', message = '', type = 'info', duration = 4500 } = {}) {
    if (!toastContainer) return;
    message = formatUserFacingError(message, 'Something went wrong. Please try again.');

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
        ${title ? `<div class="text-xs font-bold text-stone-900 mb-0.5 tracking-tight">${escapeHtml(title)}</div>` : ''}
        <div class="text-xs text-stone-600 leading-relaxed break-words">${escapeHtml(message)}</div>
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

  // Custom Stylized Modals
  const reportModal = document.getElementById('reportModal');
  const closeReportModalBtn = document.getElementById('closeReportModalBtn');
  const cancelReportModalBtn = document.getElementById('cancelReportModalBtn');
  const reportModalForm = document.getElementById('reportModalForm');
  const reportEntryId = document.getElementById('reportEntryId');
  const reportEntryScore = document.getElementById('reportEntryScore');
  const reportModalTargetTitle = document.getElementById('reportModalTargetTitle');
  const submitReportModalBtn = document.getElementById('submitReportModalBtn');

  const confirmActionModal = document.getElementById('confirmActionModal');
  const confirmActionModalTitle = document.getElementById('confirmActionModalTitle');
  const confirmActionModalSubtitle = document.getElementById('confirmActionModalSubtitle');
  const confirmActionModalMessage = document.getElementById('confirmActionModalMessage');
  const confirmActionBtnText = document.getElementById('confirmActionBtnText');
  const confirmActionBtnIcon = document.getElementById('confirmActionBtnIcon');
  const okConfirmActionModalBtn = document.getElementById('okConfirmActionModalBtn');
  const cancelConfirmActionModalBtn = document.getElementById('cancelConfirmActionModalBtn');

  const copyLinkModal = document.getElementById('copyLinkModal');
  const closeCopyLinkModalBtn = document.getElementById('closeCopyLinkModalBtn');
  const dismissCopyLinkModalBtn = document.getElementById('dismissCopyLinkModalBtn');
  const copyLinkModalInput = document.getElementById('copyLinkModalInput');
  const copyLinkModalCopyBtn = document.getElementById('copyLinkModalCopyBtn');
  const copyLinkModalCopyBtnText = document.getElementById('copyLinkModalCopyBtnText');
  const copyLinkModalCatName = document.getElementById('copyLinkModalCatName');

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
  const loafDetailsAnglesStrip = document.getElementById('loafDetailsAnglesStrip');
  const loafDetailsAnglesButtons = document.getElementById('loafDetailsAnglesButtons');
  const loafDetailsOwnerCertSection = document.getElementById('loafDetailsOwnerCertSection');
  const loafDetailsDownloadCertBtn = document.getElementById('loafDetailsDownloadCertBtn');
  const loafDetailsPublicVerificationNote = document.getElementById('loafDetailsPublicVerificationNote');
  const certificateCanvas = document.getElementById('certificateCanvas');
  const mascotLogoImg = new Image();
  mascotLogoImg.src = '/static/logo.png';
  const loafDetailsShareUrlInput = document.getElementById('loafDetailsShareUrlInput');
  const copyLoafShareUrlBtn = document.getElementById('copyLoafShareUrlBtn');
  const modalNativeShareBtn = document.getElementById('modalNativeShareBtn');

  // Stylized Confirmation Dialog (Replaces native browser confirm())
  let pendingConfirmResolve = null;

  function showConfirmModal({ title, subtitle, message, confirmText = 'Confirm', confirmIcon = 'trash-2', isDanger = true } = {}) {
    return new Promise((resolve) => {
      pendingConfirmResolve = resolve;
      if (!confirmActionModal) {
        resolve(false);
        return;
      }
      if (confirmActionModalTitle) confirmActionModalTitle.textContent = title || 'Confirm Action';
      if (confirmActionModalSubtitle) confirmActionModalSubtitle.textContent = subtitle || (isDanger ? 'Irreversible Action' : 'Notice');
      if (confirmActionModalMessage) confirmActionModalMessage.textContent = message || 'Are you sure you want to proceed with this action?';
      if (confirmActionBtnText) confirmActionBtnText.textContent = confirmText;
      if (confirmActionBtnIcon && confirmIcon) confirmActionBtnIcon.setAttribute('data-lucide', confirmIcon);

      if (okConfirmActionModalBtn) {
        if (isDanger) {
          okConfirmActionModalBtn.className = 'min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95';
        } else {
          okConfirmActionModalBtn.className = 'min-h-[42px] px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95';
        }
      }

      confirmActionModal.classList.remove('hidden');
      refreshIcons();
    });
  }

  function closeConfirmModal(result = false) {
    if (confirmActionModal) confirmActionModal.classList.add('hidden');
    if (pendingConfirmResolve) {
      pendingConfirmResolve(result);
      pendingConfirmResolve = null;
    }
  }

  if (cancelConfirmActionModalBtn) cancelConfirmActionModalBtn.addEventListener('click', () => closeConfirmModal(false));
  if (okConfirmActionModalBtn) okConfirmActionModalBtn.addEventListener('click', () => closeConfirmModal(true));
  if (confirmActionModal) {
    confirmActionModal.addEventListener('click', (e) => {
      if (e.target === confirmActionModal) closeConfirmModal(false);
    });
  }

  // Stylized Report Modal (Replaces native browser confirm())
  function openReportModal(id, score, catName) {
    if (!reportModal) return;
    if (reportEntryId) reportEntryId.value = id || '';
    if (reportEntryScore) reportEntryScore.value = (score !== undefined && score !== null) ? score : '';
    if (reportModalTargetTitle) {
      reportModalTargetTitle.textContent = catName ? `Reporting "${catName}"` : 'Loafed Community Integrity';
    }
    const defaultRadio = reportModal.querySelector('input[name="reportReasonOption"]');
    if (defaultRadio) defaultRadio.checked = true;
    reportModal.classList.remove('hidden');
    refreshIcons();
  }

  function closeReportModal() {
    if (reportModal) reportModal.classList.add('hidden');
  }

  if (closeReportModalBtn) closeReportModalBtn.addEventListener('click', closeReportModal);
  if (cancelReportModalBtn) cancelReportModalBtn.addEventListener('click', closeReportModal);
  if (reportModal) {
    reportModal.addEventListener('click', (e) => {
      if (e.target === reportModal) closeReportModal();
    });
  }

  if (reportModalForm) {
    reportModalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = reportEntryId ? reportEntryId.value.trim() : '';
      const score = reportEntryScore ? reportEntryScore.value.trim() : '';
      const reasonEl = reportModalForm.querySelector('input[name="reportReasonOption"]:checked');
      const reason = reasonEl ? reasonEl.value : 'Not an authentic cat loaf';

      if (!id) {
        closeReportModal();
        return;
      }

      if (submitReportModalBtn) {
        submitReportModalBtn.disabled = true;
        submitReportModalBtn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Submitting...</span>';
        refreshIcons();
      }

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (state.idToken) headers['Authorization'] = `Bearer ${state.idToken}`;
        const res = await fetch('/api/leaderboard/report', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            entry_id: id,
            score: score ? parseInt(score, 10) : undefined,
            reason
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          closeReportModal();
          showToast({
            type: data.already_reported ? 'info' : 'success',
            title: data.already_reported ? 'Already Reported' : 'Report Submitted',
            message: data.message || 'Thank you for helping keep Loafed authentic and family friendly!'
          });
          loadLeaderboard(state.period);
        } else {
          showToast({
            type: 'error',
            title: 'Report Error',
            message: data.detail || 'Could not submit report.'
          });
        }
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Report Error',
          message: err.message || 'An error occurred while submitting report.'
        });
      } finally {
        if (submitReportModalBtn) {
          submitReportModalBtn.disabled = false;
          submitReportModalBtn.innerHTML = '<i data-lucide="flag" class="w-3.5 h-3.5"></i><span>Submit Report</span>';
          refreshIcons();
        }
      }
    });
  }

  // Stylized Copy Link Modal (Replaces native browser prompt())
  function openCopyLinkModal(shareUrl, catName) {
    if (!copyLinkModal) return;
    if (copyLinkModalInput) copyLinkModalInput.value = shareUrl;
    if (copyLinkModalCatName) copyLinkModalCatName.textContent = catName ? `Shareable link for ${catName}` : 'Shareable Link';
    if (copyLinkModalCopyBtnText) copyLinkModalCopyBtnText.textContent = 'Copy';
    copyLinkModal.classList.remove('hidden');
    refreshIcons();
    if (copyLinkModalInput) {
      setTimeout(() => {
        copyLinkModalInput.focus();
        copyLinkModalInput.select();
      }, 50);
    }
  }

  function closeCopyLinkModal() {
    if (copyLinkModal) copyLinkModal.classList.add('hidden');
  }

  if (closeCopyLinkModalBtn) closeCopyLinkModalBtn.addEventListener('click', closeCopyLinkModal);
  if (dismissCopyLinkModalBtn) dismissCopyLinkModalBtn.addEventListener('click', closeCopyLinkModal);
  if (copyLinkModal) {
    copyLinkModal.addEventListener('click', (e) => {
      if (e.target === copyLinkModal) closeCopyLinkModal();
    });
  }

  if (copyLinkModalCopyBtn && copyLinkModalInput) {
    copyLinkModalCopyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyLinkModalInput.value);
        if (copyLinkModalCopyBtnText) copyLinkModalCopyBtnText.textContent = 'Copied!';
        showToast({
          type: 'success',
          title: 'Link Copied',
          message: 'Shareable loaf link copied to clipboard!'
        });
        setTimeout(() => {
          if (copyLinkModalCopyBtnText) copyLinkModalCopyBtnText.textContent = 'Copy';
        }, 2000);
      } catch (_) {
        copyLinkModalInput.select();
      }
    });
  }

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

  function isLocalOwner(entryId) {
    try {
      const list = JSON.parse(localStorage.getItem('loafed_my_submissions') || '[]');
      if (Array.isArray(list) && list.includes(entryId)) return true;
    } catch (_) {}
    return false;
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function drawCoverImage(ctx, img, x, y, w, h, radius = 0) {
    if (!img) return;
    ctx.save();
    if (radius > 0) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.clip();
    }
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const targetRatio = w / h;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (imgRatio > targetRatio) {
      sw = img.naturalHeight * targetRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / targetRatio;
      sy = (img.naturalHeight - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  }

  function drawCornerFlourish(ctx, cx, cy, dirX, dirY, arm = 24) {
    ctx.save();
    ctx.strokeStyle = '#c27803';
    ctx.fillStyle = '#b45309';
    ctx.lineWidth = arm > 30 ? 3 : 2;

    ctx.beginPath();
    ctx.moveTo(cx + dirX * arm, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dirY * arm);
    ctx.stroke();

    const dotOffset = arm > 30 ? 10 : 6;
    const dotRadius = arm > 30 ? 4 : 2.5;
    ctx.beginPath();
    ctx.arc(cx + dirX * dotOffset, cy + dirY * dotOffset, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawGoldEmbossedSeal(ctx, cx, cy, radius = 42) {
    ctx.save();
    const scale = radius / 42;
    
    // Ribbon Tails hanging down
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(cx - 16 * scale, cy + 28 * scale);
    ctx.lineTo(cx - 28 * scale, cy + 62 * scale);
    ctx.lineTo(cx - 16 * scale, cy + 54 * scale);
    ctx.lineTo(cx - 4 * scale, cy + 62 * scale);
    ctx.lineTo(cx - 8 * scale, cy + 28 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#9a3412';
    ctx.beginPath();
    ctx.moveTo(cx + 8 * scale, cy + 28 * scale);
    ctx.lineTo(cx + 4 * scale, cy + 62 * scale);
    ctx.lineTo(cx + 16 * scale, cy + 54 * scale);
    ctx.lineTo(cx + 28 * scale, cy + 62 * scale);
    ctx.lineTo(cx + 16 * scale, cy + 28 * scale);
    ctx.closePath();
    ctx.fill();

    // 24-point Scalloped Starburst Seal
    const pts = 24;
    const innerR = radius - (4 * scale);
    const outerR = radius;
    const sealGrad = ctx.createRadialGradient(cx - (10 * scale), cy - (10 * scale), 5 * scale, cx, cy, radius);
    sealGrad.addColorStop(0, '#fde68a');
    sealGrad.addColorStop(0.35, '#f59e0b');
    sealGrad.addColorStop(0.85, '#d97706');
    sealGrad.addColorStop(1, '#92400e');

    ctx.fillStyle = sealGrad;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / pts;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Concentric Inset Gold Rings
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - (8 * scale), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 0.8 * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - (11 * scale), 0, Math.PI * 2);
    ctx.stroke();

    // Center Seal Emblem
    ctx.fillStyle = '#78350f';
    ctx.font = `bold ${Math.max(7, Math.round(8 * scale))}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL', cx, cy - (8 * scale));
    ctx.font = `900 ${Math.max(9, Math.round(10 * scale))}px -apple-system, sans-serif`;
    ctx.fillText('100% ARTISAN', cx, cy + (4 * scale));
    ctx.font = `bold ${Math.max(6, Math.round(7 * scale))}px -apple-system, sans-serif`;
    ctx.fillText('ACCREDITED', cx, cy + (14 * scale));

    ctx.restore();
  }

  async function generateCertificate(result, shouldDownload = true) {
    const canvas = certificateCanvas;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Load active cat photo
    let catImg = null;
    const imgUrl = (result.photo_urls && result.photo_urls[0]) || result.thumbnail_url || null;
    if (imgUrl) {
      catImg = await loadImage(imgUrl);
    }

    // 1. Background Antique Archival Parchment
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 720);
    bgGrad.addColorStop(0, '#fffefc');
    bgGrad.addColorStop(0.65, '#fbf7ef');
    bgGrad.addColorStop(1, '#f4ede0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Archival Guilloche Security Micro-Lines
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 140, 90, 0.035)';
    ctx.lineWidth = 1;
    for (let x = -800; x < w + 800; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Triple Architectural Borders
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    ctx.strokeStyle = '#c27803';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    ctx.strokeStyle = '#d6cebe';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(46, 46, w - 92, h - 92);

    // 4 Corner Flourishes
    drawCornerFlourish(ctx, 42, 42, 1, 1);
    drawCornerFlourish(ctx, w - 42, 42, -1, 1);
    drawCornerFlourish(ctx, 42, h - 42, 1, -1);
    drawCornerFlourish(ctx, w - 42, h - 42, -1, -1);

    // 3. Official Bureau Mascot Emblems in Header
    if (mascotLogoImg && mascotLogoImg.complete && mascotLogoImg.naturalWidth > 0) {
      try {
        ctx.drawImage(mascotLogoImg, 65, 58, 68, 58);
        ctx.drawImage(mascotLogoImg, w - 133, 58, 68, 58);
      } catch (e) {
        // Skip silently if tainted canvas
      }
    }

    // Top Bureau Header
    ctx.fillStyle = '#57534e';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3.5px';
    ctx.fillText('INTERNATIONAL BUREAU OF FELINE POSTURE & KINEMATICS', w / 2, 80);
    ctx.letterSpacing = '0px';

    // Main Certificate Title
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText('Official Certificate of Loaf Posture', w / 2, 122);

    // Subtitle
    ctx.fillStyle = '#78716c';
    ctx.font = 'italic 13.5px Georgia, serif';
    ctx.fillText('This hereby certifies that the domestic feline subject identified as', w / 2, 150);

    // Cat Name
    ctx.fillStyle = '#7c2d12';
    ctx.font = 'bold 38px Georgia, serif';
    ctx.fillText(result.cat_name || 'Anonymous Subject', w / 2, 192);

    // Rank & Bread Classification Ribbon Banner
    const rankText = `${result.loaf_rank || 'Certified Loaf'}   •   ${result.bread_classification || 'Artisan Loaf'}`;
    ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, sans-serif';
    const rankWidth = ctx.measureText(rankText).width + 36;
    
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect((w - rankWidth) / 2, 206, rankWidth, 26, 13);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.fillText(rankText, w / 2, 224);

    // 4. Left Column: Inspected Subject Portrait & Score Dial (x: 65, y: 248, w: 330, h: 450)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(65, 248, 330, 450, 14);
    ctx.fill();
    ctx.stroke();

    // Cat's Actual Photograph Frame
    ctx.fillStyle = '#faf8f5';
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(80, 262, 300, 215, 10);
    ctx.fill();
    ctx.stroke();

    if (catImg) {
      drawCoverImage(ctx, catImg, 82, 264, 296, 211, 8);
    } else {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(82, 264, 296, 211);
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 15px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Audited Feline Specimen', 230, 375);
    }

    // Photo Exhibit Plaque
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(145, 458, 170, 20, 10);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 9px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXHIBIT A: AUDITED SPECIMEN', 230, 471);

    // Composite Score Dial & Number
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('COMPOSITE SCORE', 230, 508);

    ctx.fillStyle = '#7c2d12';
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText((result.overall_score || 0).toString(), 230, 568);

    ctx.fillStyle = '#a8a29e';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('/ 100', 230, 592);

    // Physical Rubber Stamp
    ctx.save();
    ctx.translate(230, 642);
    ctx.rotate(-0.1);
    const gradeLetter = (result.grade_letter || 'A').toUpperCase().trim();
    let stampColor = '#c2410c'; // A
    if (gradeLetter.includes('B')) stampColor = '#d97706';
    else if (gradeLetter.includes('C')) stampColor = '#57534e';
    else if (gradeLetter.includes('D') || gradeLetter.includes('F')) stampColor = '#be123c';

    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const stampMetrics = ctx.measureText(gradeLetter);
    const stampW = Math.max(104, Math.round(stampMetrics.width + 38));
    const stampH = 46;
    const halfW = stampW / 2;
    const halfH = stampH / 2;

    ctx.fillStyle = 'rgba(194, 65, 12, 0.06)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-halfW, -halfH, stampW, stampH, 6);
    } else {
      ctx.rect(-halfW, -halfH, stampW, stampH);
    }
    ctx.fill();

    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-halfW, -halfH, stampW, stampH, 6);
    } else {
      ctx.rect(-halfW, -halfH, stampW, stampH);
    }
    ctx.stroke();

    ctx.fillStyle = stampColor;
    ctx.fillText(gradeLetter, 0, 0);
    ctx.restore();

    // Telemetry Footnote
    ctx.fillStyle = '#57534e';
    ctx.font = '11.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`Drag: Cd ${(result.drag_coefficient !== undefined ? Number(result.drag_coefficient) : 0.05).toFixed(2)}  •  Bonus: +${result.multi_angle_bonus || 0} pts`, 230, 684);

    // 5. Right Column: Kinematic Criteria Breakdown & Chief Inspector Memo (x: 412, y: 248, w: 724, h: 450)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(412, 248, 724, 265, 14);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Kinematic Posture Telemetry', 438, 278);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('FOUR-PLANE ORTHOGRAPHIC AUDIT', 1112, 278);
    ctx.textAlign = 'left';

    const pt = result.paw_tuck || {};
    const tt = result.tail_tuck || {};
    const ec = result.elbow_compactness || {};
    const cs = result.crust_symmetry || {};

    const criteriaList = [
      { name: 'Paw Tuck & Undercarriage Stealth', score: pt.score !== undefined ? pt.score : 20, status: pt.status || 'Concealed' },
      { name: 'Tail Aerodynamics & Flank Wrap', score: tt.score !== undefined ? tt.score : 20, status: tt.status || 'Tucked' },
      { name: 'Flank Compression & Boule Compactness', score: ec.score !== undefined ? ec.score : 20, status: ec.status || 'Compact' },
      { name: 'Dorsal Symmetry & Crust Distribution', score: cs.score !== undefined ? cs.score : 20, status: cs.status || 'Symmetric' }
    ];

    criteriaList.forEach((c, idx) => {
      const rowY = 305 + idx * 50;

      // Criterion Title
      ctx.fillStyle = '#292524';
      ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(c.name, 438, rowY);

      // Score Pill
      ctx.textAlign = 'right';
      ctx.fillStyle = '#7c2d12';
      ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`${c.score} / 25`, 1112, rowY);
      ctx.textAlign = 'left';

      // Dual-tone Gradient Progress Bar
      const barTrackW = 674;
      const barH = 6;
      ctx.fillStyle = '#f5ebe0';
      ctx.beginPath();
      ctx.roundRect(438, rowY + 6, barTrackW, barH, 3);
      ctx.fill();

      const pct = Math.min(100, Math.max(0, (c.score / 25) * 100));
      const fillW = Math.max(8, (barTrackW * pct) / 100);
      const barGrad = ctx.createLinearGradient(438, 0, 438 + fillW, 0);
      barGrad.addColorStop(0, '#ea580c');
      barGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(438, rowY + 6, fillW, barH, 3);
      ctx.fill();

      // Status subtitle
      ctx.fillStyle = '#78716c';
      ctx.font = '11.5px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText((c.status || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ''), 438, rowY + 25);
    });

    // Chief Auditor Findings Memo Box (w: 724, h: 170)
    ctx.fillStyle = '#fffaf5';
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(412, 528, 724, 170, 12);
    ctx.fill();
    ctx.stroke();

    // Warm left accent bar
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.roundRect(412, 528, 4.5, 170, [12, 0, 0, 12]);
    ctx.fill();

    // Callout Label
    ctx.fillStyle = '#c2410c';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('CHIEF AUDITOR FIELD NOTES', 434, 550);

    // Multi-line Adaptive Word-Wrapped Critique
    ctx.fillStyle = '#292524';
    const cleanCritique = (result.summary_critique || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    drawFittedCritique(ctx, `"${cleanCritique}"`, 434, 574, 680, 110);

    // 6. Footer: Inspector Signature, Seal & Official Certification Serial
    ctx.textAlign = 'left';
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    const dateStr = result.created_at ? new Date(result.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const hashStr = Math.abs(((result.overall_score || 0) * 31) ^ (result.cat_name ? result.cat_name.length * 17 : 42)).toString(16).toUpperCase().padStart(4, '0');
    ctx.fillText(`VERIFICATION ID: LF-2026-${result.grade_letter || 'A'}${hashStr}`, 68, 738);
    ctx.fillStyle = '#a8a29e';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText(`Certified on ${dateStr}`, 68, 755);

    // Center: Signature & Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1c1917';
    ctx.font = 'italic bold 19px Georgia, serif';
    ctx.fillText('Dr. Oliver Pawsbury', 640, 738);
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('CHIEF CRUST INSPECTOR', 640, 755);
    ctx.letterSpacing = '0px';

    // Right: Official Gold Embossed Seal
    drawGoldEmbossedSeal(ctx, 1070, 736, 38);

    function drawFittedCritique(context, text, startX, startY, maxWidth, maxHeight) {
      const fontTiers = [
        { size: 13.5, lineHeight: 19.5 },
        { size: 12.5, lineHeight: 18 },
        { size: 11.5, lineHeight: 16.5 },
        { size: 10.5, lineHeight: 15 }
      ];

      const words = text.split(/\s+/).filter(Boolean);
      let selectedTier = fontTiers[0];
      let selectedLines = [];

      for (const tier of fontTiers) {
        context.font = `italic ${tier.size}px Georgia, serif`;
        const lines = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
          if (context.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        selectedTier = tier;
        selectedLines = lines;

        if (lines.length * tier.lineHeight <= maxHeight) {
          break;
        }
      }

      context.font = `italic ${selectedTier.size}px Georgia, serif`;
      const maxAllowedLines = Math.floor(maxHeight / selectedTier.lineHeight);
      let currentY = startY;

      for (let idx = 0; idx < Math.min(selectedLines.length, maxAllowedLines); idx++) {
        let lineText = selectedLines[idx];
        if (idx === maxAllowedLines - 1 && selectedLines.length > maxAllowedLines) {
          while (lineText.length > 0 && context.measureText(lineText + '...').width > maxWidth) {
            lineText = lineText.slice(0, -1);
          }
          lineText += '...';
        }
        context.fillText(lineText, startX, currentY);
        currentY += selectedTier.lineHeight;
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    if (shouldDownload) {
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = (result.cat_name || 'subject').toLowerCase().replace(/[^a-z0-9]/g, '_');
      a.download = `loaf_certificate_${safeName}.png`;
      a.click();
    }
    return dataUrl;
  }

  function openLoafDetails(entryId) {
    if (!entryId) return;
    window.location.href = `/loaf?id=${encodeURIComponent(entryId)}`;
  }

  async function openLoafDetailsModal(entryId) {
    if (!loafDetailsModal || !entryId) return;

    loafDetailsModal.classList.remove('hidden');
    if (loafDetailsLoading) loafDetailsLoading.classList.remove('hidden');
    if (loafDetailsContent) loafDetailsContent.classList.add('hidden');
    const topProgress = document.getElementById('loafDetailsTopProgress');
    if (topProgress) topProgress.classList.remove('hidden');

    // Pre-populate known entry metadata immediately for instant visual feedback
    const cachedEntry = Array.isArray(state.entries) ? state.entries.find(e => e.entry_id === entryId) : null;
    if (cachedEntry) {
      if (loafDetailsCatName) loafDetailsCatName.textContent = cachedEntry.cat_name || 'Anonymous Loaf';
      if (loafDetailsBakerName) loafDetailsBakerName.textContent = cachedEntry.display_name || 'Anonymous Baker';
      if (loafDetailsScoreStamp) loafDetailsScoreStamp.textContent = `${cachedEntry.overall_score || 0} ${cachedEntry.grade_letter || ''}`;
      if (loafDetailsRank) loafDetailsRank.textContent = cachedEntry.loaf_rank || 'Artisan Loaf';
      if (loafDetailsPhoto && cachedEntry.thumbnail_url) {
        loafDetailsPhoto.src = cachedEntry.thumbnail_url;
        loafDetailsPhoto.alt = `${cachedEntry.cat_name || 'Cat'} Loaf Photo`;
      }
    }
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

      // Check owner status for certificate visibility
      const isMyCat = Boolean(
        (state.user && state.user.id && data.user_id && (data.user_id === state.user.id)) ||
        state.period === 'mine' ||
        isLocalOwner(entryId)
      );

      if (loafDetailsOwnerCertSection) {
        if (isMyCat) {
          loafDetailsOwnerCertSection.classList.remove('hidden');
        } else {
          loafDetailsOwnerCertSection.classList.add('hidden');
        }
      }

      if (loafDetailsPublicVerificationNote) {
        if (isMyCat) {
          loafDetailsPublicVerificationNote.classList.add('hidden');
        } else {
          loafDetailsPublicVerificationNote.classList.remove('hidden');
        }
      }

      // Multi-angle perspectives selector
      const rawUrls = Array.isArray(data.photo_urls) && data.photo_urls.length > 0
        ? data.photo_urls
        : (data.thumbnail_url ? [data.thumbnail_url] : []);
      const rawAngles = Array.isArray(data.angles) ? data.angles : [];

      if (loafDetailsAnglesStrip && loafDetailsAnglesButtons) {
        if (rawUrls.length > 1) {
          loafDetailsAnglesStrip.classList.remove('hidden');
          loafDetailsAnglesButtons.innerHTML = '';

          rawUrls.forEach((url, idx) => {
            const angleItem = rawAngles[idx];
            let angleText = '';
            let customLabel = '';

            if (typeof angleItem === 'string') {
              angleText = angleItem;
              customLabel = angleItem;
            } else if (angleItem && typeof angleItem === 'object') {
              angleText = `${angleItem.angle || ''} ${angleItem.label || ''} ${angleItem.name || ''}`;
              customLabel = angleItem.label || angleItem.name || angleItem.angle || '';
            }

            const rawAngle = angleText.toLowerCase();
            let label = customLabel || `Angle ${idx + 1}`;
            let icon = 'camera';
            if (rawAngle.includes('front') || rawAngle.includes('elevation')) {
              label = customLabel || 'Front View';
              icon = 'eye';
            } else if (rawAngle.includes('side') || rawAngle.includes('lateral') || rawAngle.includes('profile')) {
              label = customLabel || 'Side Profile';
              icon = 'move-horizontal';
            } else if (rawAngle.includes('top') || rawAngle.includes('dorsal') || rawAngle.includes('overhead')) {
              label = customLabel || 'Overhead (Top)';
              icon = 'compass';
            }

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${idx === 0 ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-stone-700 border border-stone-200 hover:bg-orange-50'}`;
            btn.innerHTML = `<i data-lucide="${icon}" class="w-3 h-3"></i><span>${escapeHtml(label)}</span>`;

            btn.onclick = () => {
              if (loafDetailsPhoto) {
                loafDetailsPhoto.src = url;
              }
              if (loafDetailsPhotoContainer) {
                loafDetailsPhotoContainer.onclick = () => openLightbox(`${data.cat_name || 'Cat'} (${label})`, url);
              }
              loafDetailsAnglesButtons.querySelectorAll('button').forEach(b => {
                b.className = 'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer bg-white text-stone-700 border border-stone-200 hover:bg-orange-50';
              });
              btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer bg-orange-600 text-white shadow-2xs';
              refreshIcons();
            };

            loafDetailsAnglesButtons.appendChild(btn);
          });
        } else {
          loafDetailsAnglesStrip.classList.add('hidden');
        }
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
      if (loafDetailsContent) {
        loafDetailsContent.classList.remove('hidden');
        loafDetailsContent.classList.add('animate-in', 'fade-in', 'duration-200');
      }
      const topProgressDone = document.getElementById('loafDetailsTopProgress');
      if (topProgressDone) topProgressDone.classList.add('hidden');
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
    activeLoafDetail = null;
    if (loafDetailsModal) loafDetailsModal.classList.add('hidden');
    const topProgress = document.getElementById('loafDetailsTopProgress');
    if (topProgress) topProgress.classList.add('hidden');
    if (loafDetailsLoading) loafDetailsLoading.classList.remove('hidden');
    if (loafDetailsContent) loafDetailsContent.classList.add('hidden');
    // Clear URL param without reloading
    const newUrl = new URL(window.location);
    if (newUrl.searchParams.has('loaf')) {
      newUrl.searchParams.delete('loaf');
      window.history.replaceState({}, '', newUrl.pathname + (newUrl.search ? newUrl.search : ''));
    }
  }

  window.loafedOpenLoafDetails = openLoafDetails;

  async function shareLoafLink(entryId, catName, score, grade) {
    const shareUrl = `${window.location.origin}/loaf?id=${encodeURIComponent(entryId)}`;
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
      openCopyLinkModal(shareUrl, catName);
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
    if (e.key === 'Escape') {
      if (loafDetailsModal && !loafDetailsModal.classList.contains('hidden')) closeLoafDetails();
      if (reportModal && !reportModal.classList.contains('hidden')) closeReportModal();
      if (confirmActionModal && !confirmActionModal.classList.contains('hidden')) closeConfirmModal(false);
      if (copyLinkModal && !copyLinkModal.classList.contains('hidden')) closeCopyLinkModal();
      if (photoLightboxModal && !photoLightboxModal.classList.contains('hidden')) closePhotoLightbox();
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

  if (loafDetailsDownloadCertBtn) {
    loafDetailsDownloadCertBtn.addEventListener('click', async () => {
      if (!activeLoafDetail) return;
      try {
        loafDetailsDownloadCertBtn.disabled = true;
        loafDetailsDownloadCertBtn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Generating...</span>`;
        refreshIcons();
        await generateCertificate(activeLoafDetail, true);
        showToast({
          type: 'success',
          title: 'Certificate Downloaded',
          message: `Official certificate for ${activeLoafDetail.cat_name || 'your cat'} has been saved!`
        });
      } catch (err) {
        console.error('Failed to generate certificate:', err);
        showToast({
          type: 'error',
          title: 'Export Failed',
          message: 'Unable to render the certificate image.'
        });
      } finally {
        loafDetailsDownloadCertBtn.disabled = false;
        loafDetailsDownloadCertBtn.innerHTML = `<i data-lucide="download" class="w-3.5 h-3.5"></i><span>Download Certificate</span>`;
        refreshIcons();
      }
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
        t.el.setAttribute('aria-selected', 'true');
        if (listSectionTitle) listSectionTitle.textContent = t.title;
      } else {
        t.el.className = 'tab-filter-btn';
        t.el.setAttribute('aria-selected', 'false');
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
            <img src="${thumb}" alt="${catName}" loading="lazy" decoding="async">
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
          <div class="flex items-center gap-1 shrink-0" onclick="event.stopPropagation()">
            <button class="share-loaf-btn p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition-colors" data-id="${entry.entry_id}" data-name="${catName}" data-score="${score}" data-grade="${gradeLetter}" aria-label="Share ${catName} loaf link" title="Share link to this cat loaf">
              <i data-lucide="share-2" class="w-4 h-4 text-orange-600"></i>
            </button>
            <button class="delete-loaf-btn p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors" data-id="${entry.entry_id}" data-name="${catName}" aria-label="Delete ${catName} submission" title="Delete submission">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        `;
      } else {
        actionBtns = `
          <div class="flex items-center gap-1 shrink-0" onclick="event.stopPropagation()">
            <button class="share-loaf-btn p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition-colors" data-id="${entry.entry_id}" data-name="${catName}" data-score="${score}" data-grade="${gradeLetter}" aria-label="Share ${catName} loaf link" title="Share link to this cat loaf">
              <i data-lucide="share-2" class="w-4 h-4 text-orange-600"></i>
            </button>
            <button class="report-loaf-btn p-1.5 sm:p-2 rounded-xl text-stone-300 hover:text-amber-700 hover:bg-orange-50 transition-colors" data-id="${entry.entry_id}" data-score="${score}" data-name="${catName}" aria-label="Report ${catName} submission" title="Report submission as inappropriate or non-cat">
              <i data-lucide="flag" class="w-4 h-4"></i>
            </button>
          </div>
        `;
      }

      return `
        <div id="loaf-row-${entry.entry_id}" class="leaderboard-entry-row p-3 sm:p-4 rounded-2xl bg-white border border-orange-200/90 hover:border-amber-400 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 sm:gap-4 group cursor-pointer" onclick="window.loafedOpenLoafDetails('${entry.entry_id}')" title="Click to view full inspection scorecard for ${catName}">
          <div class="shrink-0 flex items-center justify-center">
            ${rankBadge}
          </div>
          <div class="leaderboard-photo-frame">
            <img src="${thumb}" alt="${catName}" class="leaderboard-photo-img" loading="lazy" decoding="async">
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-extrabold text-sm sm:text-base text-stone-900 truncate group-hover:text-orange-950 transition-colors">${catName}</h3>
            <div class="flex items-center gap-1.5 sm:gap-2 text-xs text-stone-600 mt-0.5 flex-wrap">
              <span class="text-orange-950 font-bold truncate">${loafRank}</span>
              <span class="hidden sm:inline text-stone-300">&bull;</span>
              <span class="text-stone-500 text-[11px] truncate hidden sm:inline">${bread}</span>
            </div>
            <div class="text-[11px] text-stone-600 font-medium mt-0.5 truncate">
              Baked by <span class="font-bold text-stone-800">${bakerName}</span>
            </div>
          </div>
          <div class="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-3">
            <span class="stamp text-xs font-black text-orange-700 bg-white border-orange-700 shrink-0">${score} ${gradeLetter}</span>
            ${actionBtns}
          </div>
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
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          const name = e.currentTarget.getAttribute('data-name') || 'this loaf';
          if (!id) return;
          const confirmed = await showConfirmModal({
            title: 'Delete Loaf Submission?',
            subtitle: 'Leaderboard Removal',
            message: `Delete "${name}" permanently? Its scorecard and stored photo will be deleted, and the loaf will disappear from the public leaderboard.`,
            confirmText: 'Delete Submission',
            confirmIcon: 'trash-2',
            isDanger: true
          });
          if (!confirmed) return;
          try {
            const res = await fetch(`/api/leaderboard/entry/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${state.idToken}` }
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              showToast({ type: 'info', title: 'Loaf Removed', message: 'Leaderboard submission removed.' });
              loadLeaderboard('mine');
            } else {
              showToast({
                type: 'error',
                title: 'Delete Error',
                message: formatUserFacingError(data, 'The submission could not be removed. Please try again shortly.')
              });
            }
          } catch (err) {
            showToast({ type: 'error', title: 'Delete Error', message: err.message });
          }
        });
      });
    } else {
      leaderboardEntriesList.querySelectorAll('.report-loaf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          const score = e.currentTarget.getAttribute('data-score');
          const name = e.currentTarget.getAttribute('data-name');
          if (!id) return;
          openReportModal(id, score, name);
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
        leaderboardEntriesList.innerHTML = `<p class="py-10 text-center text-xs text-red-500">${escapeHtml(formatUserFacingError(err))}</p>`;
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
      leaderboardEntriesList.innerHTML = `<p class="py-10 text-center text-xs text-red-500">${escapeHtml(formatUserFacingError(err))}</p>`;
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
  const requestedLoaf = initialParams.get('loaf') || initialParams.get('id');
  if (requestedLoaf) {
    window.location.replace(`/loaf?id=${encodeURIComponent(requestedLoaf)}`);
    return;
  }

  refreshIcons();
});

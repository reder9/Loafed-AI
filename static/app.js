// Loafed AI - Feline Posture & Silhouette Inspection Controller

document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    photos: [], // Array of { id, file, previewUrl, name } (max 5)
    slots: {
      front: null,
      side: null,
      top: null
    },
    catName: '',
    apiKey: localStorage.getItem('loafed_gemini_key') || '',
    model: localStorage.getItem('loafed_model') || 'gemini-3.8-flash',
    serverHasKey: false,
    currentResult: null,
    gradeToken: null,
    submittedPhotoBlob: null,
    primaryPhotoIndex: 0,
    samplePresets: {},
    // User & Authentication State
    user: null,
    idToken: localStorage.getItem('loafed_id_token') || null,
    accessToken: localStorage.getItem('loafed_access_token') || null,
    authConfig: null,
    leaderboardPeriod: 'all',
    // Example preview & state preservation
    isExamplePreset: false,
    activePresetKey: null,
    canSubmit: true,
    userSavedPhotos: [],
    userSavedCatName: '',
    pendingLeaderboardIntent: false,
    submittedEntryId: null,
    loadedHistoryId: null
  };

  // Helper to re-render Lucide icons
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // DOM Elements
  const catNameInput = document.getElementById('catNameInput');
  const gradeLoafBtn = document.getElementById('gradeLoafBtn');
  const photoCountBadge = document.getElementById('photoCountBadge');
  const loadingState = document.getElementById('loadingState');
  const loadingPhrase = document.getElementById('loadingPhrase');
  const loadingProgressBar = document.getElementById('loadingProgressBar');
  const inspectorBay = document.getElementById('inspectorBay');
  const resultsSection = document.getElementById('resultsSection');
  const loadButtercupBtn = document.getElementById('loadButtercupBtn');
  const resetInspectorBtn = document.getElementById('resetInspectorBtn');
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  const downloadCertificateBtn = document.getElementById('downloadCertificateBtn');
  const downloadStoryCardBtn = document.getElementById('downloadStoryCardBtn');
  const certificateCanvas = document.getElementById('certificateCanvas');
  const storyCanvas = document.getElementById('storyCanvas');

  // Example Preview & Collapsible Inspection Elements
  const exampleLoafBanner = document.getElementById('exampleLoafBanner');
  const exampleCatBadge = document.getElementById('exampleCatBadge');
  const collapseExampleBtn = document.getElementById('collapseExampleBtn');
  const closeResultsSectionBtn = document.getElementById('closeResultsSectionBtn');
  const uploadOwnLoafBtn = document.getElementById('uploadOwnLoafBtn');
  const uploadOwnLoafBtnText = document.getElementById('uploadOwnLoafBtnText');
  const bottomUploadOwnLoafBtn = document.getElementById('bottomUploadOwnLoafBtn');
  const bottomUploadBtnText = document.getElementById('bottomUploadBtnText');

  // Disqualification & Non-Feline Alert Elements
  const disqualificationBanner = document.getElementById('disqualificationBanner');
  const disqualificationReason = document.getElementById('disqualificationReason');
  const disqualificationTryAgainBtn = document.getElementById('disqualificationTryAgainBtn');
  const criteriaGrid = document.getElementById('criteriaGrid');
  const angleReviewStrip = document.getElementById('angleReviewStrip');
  const badgesAndTipsGrid = document.getElementById('badgesAndTipsGrid');
  const authPendingLoafBadge = document.getElementById('authPendingLoafBadge');

  // Animated Oven Hearth Portal Elements
  const ovenPhotoStage = document.getElementById('ovenPhotoStage');
  const ovenCatPhoto = document.getElementById('ovenCatPhoto');

  // Audit Disqualification Modal Elements
  const disqualificationModal = document.getElementById('disqualificationModal');
  const closeDisqualificationModalBtn = document.getElementById('closeDisqualificationModalBtn');
  const dismissDisqualificationModalBtn = document.getElementById('dismissDisqualificationModalBtn');
  const disqualificationTryAgainModalBtn = document.getElementById('disqualificationTryAgainModalBtn');

  // Multi-Photo Upload & Staging Elements
  const mainDropzone = document.getElementById('mainDropzone');
  const photosInput = document.getElementById('photosInput');
  const stagedPhotosContainer = document.getElementById('stagedPhotosContainer');
  const stagedPhotosGrid = document.getElementById('stagedPhotosGrid');
  const stagedCountBadge = document.getElementById('stagedCountBadge');
  const clearAllPhotosBtn = document.getElementById('clearAllPhotosBtn');
  const addMorePhotosBtn = document.getElementById('addMorePhotosBtn');
  const telemetryStatusText = document.getElementById('telemetryStatusText');

  // Header & Auth Elements
  const toastContainer = document.getElementById('toastContainer');
  const openLeaderboardBtn = document.getElementById('openLeaderboardBtn');
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

  const submitLeaderboardBtn = document.getElementById('submitLeaderboardBtn');

  // Modals
  const leaderboardModal = document.getElementById('leaderboardModal');
  const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
  const dismissLeaderboardBtn = document.getElementById('dismissLeaderboardBtn');
  const leaderboardList = document.getElementById('leaderboardList');
  const tabPeriodAll = document.getElementById('tabPeriodAll');
  const tabPeriodMonth = document.getElementById('tabPeriodMonth');
  const tabPeriodWeek = document.getElementById('tabPeriodWeek');
  const tabPeriodMine = document.getElementById('tabPeriodMine');

  const submitModal = document.getElementById('submitModal');
  const closeSubmitModalBtn = document.getElementById('closeSubmitModalBtn');
  const cancelSubmitModalBtn = document.getElementById('cancelSubmitModalBtn');
  const confirmSubmitLeaderboardBtn = document.getElementById('confirmSubmitLeaderboardBtn');
  const submitModalThumbnail = document.getElementById('submitModalThumbnail');
  const submitModalCatName = document.getElementById('submitModalCatName');
  const submitModalScoreBadge = document.getElementById('submitModalScoreBadge');
  const submitModalRank = document.getElementById('submitModalRank');
  const submitModalBread = document.getElementById('submitModalBread');
  const submitCatNameInput = document.getElementById('submitCatNameInput');
  const submitDisplayNameInput = document.getElementById('submitDisplayNameInput');
  const rollSubmitBakerTagBtn = document.getElementById('rollSubmitBakerTagBtn');
  const submitModalNotice = document.getElementById('submitModalNotice');
  const submitConsentCheckbox = document.getElementById('submitConsentCheckbox');
  const submitModalFormView = document.getElementById('submitModalFormView');
  const submitSuccessView = document.getElementById('submitSuccessView');
  const submitSuccessMessage = document.getElementById('submitSuccessMessage');
  const submitSuccessThumb = document.getElementById('submitSuccessThumb');
  const submitSuccessCatName = document.getElementById('submitSuccessCatName');
  const submitSuccessScoreBadge = document.getElementById('submitSuccessScoreBadge');
  const submitSuccessRank = document.getElementById('submitSuccessRank');
  const submitSuccessShareUrl = document.getElementById('submitSuccessShareUrl');
  const copySubmitSuccessUrlBtn = document.getElementById('copySubmitSuccessUrlBtn');
  const shareSuccessNativeBtn = document.getElementById('shareSuccessNativeBtn');
  const submitSuccessViewLeaderboardBtn = document.getElementById('submitSuccessViewLeaderboardBtn');

  const authModal = document.getElementById('authModal');
  const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
  const rollAuthBakerTagBtn = document.getElementById('rollAuthBakerTagBtn');
  const rollProfileBakerTagBtn = document.getElementById('rollProfileBakerTagBtn');
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

  const authOpenTermsBtn = document.getElementById('authOpenTermsBtn');
  const authOpenPrivacyBtn = document.getElementById('authOpenPrivacyBtn');

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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Modern Toast Notification System (Zero emojis, clean Lucide iconography)
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

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    const closeBtn = toast.querySelector('.toast-close-btn');
    let timer = null;

    const dismiss = () => {
      if (timer) clearTimeout(timer);
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });
    }

    if (duration > 0) {
      timer = setTimeout(dismiss, duration);
    }
  }

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
            type: 'success',
            title: 'Report Submitted',
            message: 'Thank you for helping keep Loafed authentic and family friendly!'
          });
          loadLeaderboardEntries('all');
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (reportModal && !reportModal.classList.contains('hidden')) closeReportModal();
      if (confirmActionModal && !confirmActionModal.classList.contains('hidden')) closeConfirmModal(false);
      if (copyLinkModal && !copyLinkModal.classList.contains('hidden')) closeCopyLinkModal();
    }
  });


  // Check Server Status
  async function checkServerStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      state.serverHasKey = data.has_server_api_key;
    } catch (e) {
      console.warn('Could not query /api/status', e);
    }
  }


  // Image Optimization (Resize large images with high-quality smoothing and fidelity)
  async function optimizeImage(file, maxDimension = 1400, quality = 0.84) {
    if (!file || !file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension && file.size < 400 * 1024) {
          return resolve(file);
        }
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          // If still over 650KB, perform a quick second pass to guarantee payload stays compact
          if (blob.size > 650 * 1024) {
            const c2 = document.createElement('canvas');
            const scale = 0.82;
            c2.width = Math.round(width * scale);
            c2.height = Math.round(height * scale);
            const ctx2 = c2.getContext('2d');
            ctx2.imageSmoothingEnabled = true;
            ctx2.imageSmoothingQuality = 'high';
            ctx2.drawImage(canvas, 0, 0, c2.width, c2.height);
            c2.toBlob((blob2) => {
              const finalBlob = blob2 || blob;
              const optimizedFile = new File([finalBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
              resolve(optimizedFile);
            }, 'image/jpeg', 0.78);
            return;
          }
          const optimizedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          resolve(optimizedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  const SAMPLE_FILENAMES = [
    'flash_92', 'flash_front', 'flash_side', 'flash_top',
    'chonks_79', 'chonks_68', 'chonks_front', 'chonks_side', 'chonks_semi_front',
    'buttercup_front', 'buttercup_side', 'buttercup_top'
  ];

  const SAMPLE_HASH_HEXES = new Set([
    '29da98c29f5869499aafc34c8e88189bdc9bb8beda548c226e5cd9ca0c9e3e85',
    '4568a6c10e9b60596f8b73a33296764d1588140e08b0fd5974edbb3e67e0c5ca',
    'd2480d9bb3eff46f4084e9264e30535d73d8ca58303a3fdc29d5ecda127e1bca',
    '03e31ad8318cb8ace8e462bd8010e489ed236ed6f2af921bcb04103e610e1fa3',
    'eaadea8fff7b013b611c699936281e1d126bc27d2bfe7bf8198a65896d8590ec',
    '9a102c7c2c9ec2c848047e2d2a971fb46aa511649f070b3583daa6c2633ba3a7',
    'df4bf53b6e0d69e3c8c064ed7a5acff5f5214596570a8a3283ac2cadf73b4f55',
    'c059f4f9d9f6eb424c292135c938114335846500fae6a14b029c62ac8633fd47',
    '933a9f36ef7b3821a74783a8c76e2d28f0a83c9b80d576bb639f2b1deee97cfb',
    '20301653b8089a0c1b49baef72bad3d612634f5d7a710d8b09683d1f50d06b50',
    '58e4732d0c104587f82c4751bace5a8cc8d1f737878e3934b68a266a0612c70b',
    'dc2e47056d559c6f56053d7387145b2cc96dace39acec3bb375fb88325f1f0eb',
    '0591e1137fd2a61b5abbc107e5d922a3d9a19227c8daf32ae8179f9c17225454',
    'a7ea6c8bf8aa75ca0f0c9b4f234e084d4c8cda5284b524d049c6c7cbec0e4602',
    '5636eab1ddf6655bead01cdf2d1103935e01b6d5aabdbfb2a92579803b02ce32'
  ]);

  async function calculateFileSha256(file) {
    if (!window.crypto || !window.crypto.subtle) return null;
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return null;
    }
  }

  // Multi-Photo Staging Manager (1 to 5 Photos)
  async function addFiles(files, isBenchmarkInternal = false) {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showToast({
        type: 'warning',
        title: 'Invalid Files',
        message: 'Please select valid image files (JPG, PNG, WEBP).'
      });
      return;
    }

    // If user is uploading real photos while a benchmark preset was displayed, clear the preset
    if (!isBenchmarkInternal && state.isExamplePreset) {
      state.photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
      state.photos = [];
      state.isExamplePreset = false;
      state.activePresetKey = null;
      state.gradeToken = null;
      state.canSubmit = true;
      resetBenchmarkButtons();
      if (catNameInput) catNameInput.value = '';
    }

    if (!isBenchmarkInternal) {
      state.submittedEntryId = null;
      state.loadedHistoryId = null;
    }

    let filesToInspect = imageFiles;

    // Detect and reject any benchmark reference images attempted by the user
    if (!isBenchmarkInternal) {
      const passedFiles = [];
      let hadSampleViolation = false;

      for (const f of imageFiles) {
        const lowerName = (f.name || '').toLowerCase();
        const matchesName = SAMPLE_FILENAMES.some(s => lowerName.includes(s));
        let matchesHash = false;
        if (!matchesName) {
          const fileHash = await calculateFileSha256(f);
          if (fileHash && SAMPLE_HASH_HEXES.has(fileHash)) {
            matchesHash = true;
          }
        }
        if (matchesName || matchesHash) {
          hadSampleViolation = true;
        } else {
          passedFiles.push(f);
        }
      }

      if (hadSampleViolation) {
        showToast({
          type: 'warning',
          title: 'Benchmark Cat Detected',
          message: 'Example reference cats (Flash, Chonks) cannot be uploaded. Please upload original photos of your own cat!'
        });
        if (passedFiles.length === 0) {
          updateSubmitButton();
          return;
        }
      }
      filesToInspect = passedFiles;
      state.canSubmit = true;
    }

    const currentCount = state.photos.length;
    const available = 5 - currentCount;
    if (available <= 0) {
      showToast({
        type: 'warning',
        title: 'Photo Limit Reached',
        message: 'You can stage a maximum of 5 inspection photos.'
      });
      return;
    }

    let toProcess = filesToInspect;
    if (toProcess.length > available) {
      toProcess = toProcess.slice(0, available);
      showToast({
        type: 'info',
        title: 'Photo Limit Applied',
        message: `Staged ${available} photo(s). Maximum limit is 5 photos.`
      });
    }

    for (const rawFile of toProcess) {
      const optimized = await optimizeImage(rawFile);
      const previewUrl = URL.createObjectURL(optimized);
      const id = 'photo_' + Math.random().toString(36).substring(2, 9);
      const detectedAngle = detectPhotoAngle(rawFile.name, state.photos.length);
      state.photos.push({
        id,
        file: optimized,
        previewUrl,
        name: rawFile.name,
        angleType: detectedAngle
      });
    }

    selectBestThumbnail();
    syncLegacySlots();
    renderStagedPhotos();
    updateSubmitButton();
  }

  function detectPhotoAngle(filename, currentIdx) {
    const lower = (filename || '').toLowerCase();
    if (lower.includes('top') || lower.includes('overhead') || lower.includes('dorsal') || lower.includes('bird')) {
      return 'top';
    }
    if (lower.includes('side') || lower.includes('profile') || lower.includes('lateral')) {
      return 'side';
    }
    if (lower.includes('front') || lower.includes('chest') || lower.includes('anterior') || lower.includes('head_on')) {
      return 'front';
    }
    if (currentIdx === 0) return 'front';
    if (currentIdx === 1) return 'side';
    if (currentIdx === 2) return 'top';
    return 'other';
  }

  function selectBestThumbnail() {
    if (!state.photos || state.photos.length === 0) {
      state.primaryPhotoIndex = 0;
      return 0;
    }
    // 1. If currently chosen index is non-top and valid, retain it
    if (state.primaryPhotoIndex !== null && state.primaryPhotoIndex >= 0 && state.primaryPhotoIndex < state.photos.length) {
      if (state.photos[state.primaryPhotoIndex].angleType !== 'top') {
        return state.primaryPhotoIndex;
      }
    }
    // 2. Look for Front view
    const frontIdx = state.photos.findIndex(p => p.angleType === 'front');
    if (frontIdx !== -1) {
      state.primaryPhotoIndex = frontIdx;
      return frontIdx;
    }
    // 3. Look for Side view
    const sideIdx = state.photos.findIndex(p => p.angleType === 'side');
    if (sideIdx !== -1) {
      state.primaryPhotoIndex = sideIdx;
      return sideIdx;
    }
    // 4. Look for any non-top view
    const nonTopIdx = state.photos.findIndex(p => p.angleType !== 'top');
    if (nonTopIdx !== -1) {
      state.primaryPhotoIndex = nonTopIdx;
      return nonTopIdx;
    }
    // 5. Fallback to 0 if all are top
    state.primaryPhotoIndex = 0;
    return 0;
  }

  function syncLegacySlots() {
    state.slots.front = state.photos.find(p => p.angleType === 'front') || state.photos[0] || null;
    state.slots.side = state.photos.find(p => p.angleType === 'side') || state.photos[1] || null;
    state.slots.top = state.photos.find(p => p.angleType === 'top') || state.photos[2] || null;
  }

  function removePhoto(id) {
    const idx = state.photos.findIndex(p => p.id === id);
    if (idx !== -1) {
      URL.revokeObjectURL(state.photos[idx].previewUrl);
      state.photos.splice(idx, 1);
      if (state.photos.length === 0) {
        state.isExamplePreset = false;
        state.activePresetKey = null;
        state.canSubmit = true;
      }
      selectBestThumbnail();
      syncLegacySlots();
      renderStagedPhotos();
      updateSubmitButton();
    }
  }

  function clearAllPhotos() {
    state.photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    state.photos = [];
    state.primaryPhotoIndex = 0;
    state.isExamplePreset = false;
    state.activePresetKey = null;
    state.canSubmit = true;
    state.submittedEntryId = null;
    state.loadedHistoryId = null;
    syncLegacySlots();
    if (photosInput) photosInput.value = '';
    renderStagedPhotos();
    updateSubmitButton();
  }

  function renderStagedPhotos() {
    if (!stagedPhotosGrid) return;
    stagedPhotosGrid.innerHTML = '';
    const count = state.photos.length;

    if (count === 0) {
      if (mainDropzone) mainDropzone.classList.remove('hidden');
      if (stagedPhotosContainer) stagedPhotosContainer.classList.add('hidden');
      return;
    }

    if (mainDropzone) mainDropzone.classList.add('hidden');
    if (stagedPhotosContainer) stagedPhotosContainer.classList.remove('hidden');

    selectBestThumbnail();

    state.photos.forEach((photo, idx) => {
      const isPrimary = (state.primaryPhotoIndex === idx);
      const isTop = (photo.angleType === 'top');

      let badgeHtml = '';
      if (isPrimary) {
        badgeHtml = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white font-extrabold text-[10px] shadow-xs">
            <i data-lucide="star" class="w-3 h-3 text-amber-100 fill-amber-100"></i>
            <span>Main Thumbnail</span>
          </span>
        `;
      } else if (!isTop) {
        badgeHtml = `
          <button type="button" class="set-primary-thumb-btn text-[10px] font-bold text-amber-200 hover:text-white underline transition-colors cursor-pointer" data-idx="${idx}" title="Set as primary leaderboard portrait">
            Set as Thumbnail
          </button>
        `;
      } else {
        badgeHtml = `
          <span class="text-[9px] text-amber-200/90 font-medium italic" title="Top angles are stored as 360-degree telemetry but front/side is used as the primary portrait">
            Overhead Angle
          </span>
        `;
      }

      const card = document.createElement('div');
      card.className = `relative group rounded-xl overflow-hidden border ${isPrimary ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-orange-200/80'} bg-white shadow-2xs flex flex-col`;
      card.innerHTML = `
        <div class="relative w-full aspect-square bg-stone-100 overflow-hidden">
          <img src="${photo.previewUrl}" class="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200 ortho-photo-img" alt="${photo.name}">
          <div class="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-between p-2 text-white">
            <div class="flex items-center justify-between">
              ${isPrimary ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/95 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">Primary</span>' : '<span></span>'}
              <button type="button" class="remove-photo-btn bg-stone-900/80 hover:bg-rose-600 text-white rounded-md p-1 transition-colors shrink-0 cursor-pointer" data-id="${photo.id}" title="Remove photo" aria-label="Remove photo ${idx + 1}">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between gap-1">
                <select class="angle-type-select w-full bg-stone-900/90 text-white text-[10px] font-bold rounded-md px-1.5 py-1 border border-white/20 outline-none cursor-pointer" data-id="${photo.id}" title="Designate angle perspective">
                  <option value="front" ${photo.angleType === 'front' ? 'selected' : ''}>Front View</option>
                  <option value="side" ${photo.angleType === 'side' ? 'selected' : ''}>Side Profile</option>
                  <option value="top" ${photo.angleType === 'top' ? 'selected' : ''}>Overhead (Top)</option>
                  <option value="other" ${photo.angleType === 'other' ? 'selected' : ''}>Other Perspective</option>
                </select>
              </div>
              <div class="flex items-center justify-between">
                ${badgeHtml}
              </div>
            </div>
          </div>
        </div>
      `;
      stagedPhotosGrid.appendChild(card);
    });

    // Bind remove buttons
    stagedPhotosGrid.querySelectorAll('.remove-photo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        removePhoto(id);
      });
    });

    // Bind angle dropdowns
    stagedPhotosGrid.querySelectorAll('.angle-type-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = sel.getAttribute('data-id');
        const photo = state.photos.find(p => p.id === id);
        if (photo) {
          photo.angleType = sel.value;
          selectBestThumbnail();
          syncLegacySlots();
          renderStagedPhotos();
        }
      });
    });

    // Bind set-primary-thumb buttons
    stagedPhotosGrid.querySelectorAll('.set-primary-thumb-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetIdx = parseInt(btn.getAttribute('data-idx'), 10);
        if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < state.photos.length) {
          state.primaryPhotoIndex = targetIdx;
          renderStagedPhotos();
        }
      });
    });

    if (stagedCountBadge) {
      stagedCountBadge.textContent = `${count} / 5 Photos`;
    }

    if (addMorePhotosBtn) {
      if (count >= 5) {
        addMorePhotosBtn.classList.add('hidden');
      } else {
        addMorePhotosBtn.classList.remove('hidden');
      }
    }

    if (telemetryStatusText) {
      if (count === 1) {
        telemetryStatusText.innerHTML = `
          <i data-lucide="alert-circle" class="w-4 h-4 text-amber-600 shrink-0"></i>
          <span class="text-amber-900"><strong>Single-Photo Mode:</strong> Strict conservative grading will apply. Add side or top angles to verify hidden peet & unlock top scores!</span>
        `;
      } else if (count === 2) {
        telemetryStatusText.innerHTML = `
          <i data-lucide="shield" class="w-4 h-4 text-amber-700 shrink-0"></i>
          <span class="text-stone-700"><strong>Dual-Plane Telemetry:</strong> Good coverage across 2 vectors (+2 bonus points).</span>
        `;
      } else {
        const bonus = count >= 4 ? 5 : 4;
        telemetryStatusText.innerHTML = `
          <i data-lucide="sparkles" class="w-4 h-4 text-orange-600 shrink-0"></i>
          <span class="text-orange-950 font-bold">Full 360-Degree Telemetry Active! (+${bonus} bonus unlocked)</span>
        `;
      }
    }

    refreshIcons();
  }

  function updateSubmitButton() {
    if (state.isExamplePreset || state.canSubmit === false) {
      gradeLoafBtn.disabled = true;
      gradeLoafBtn.className = 'w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-stone-400 bg-stone-200 cursor-not-allowed shadow-none transition-all flex items-center justify-center gap-2 btn-tactile';
      gradeLoafBtn.title = 'Example reference cats cannot be submitted or evaluated. Please upload photos of your own cat!';
      photoCountBadge.textContent = 'Reference Benchmark Loaded (Upload your cat to inspect)';
      photoCountBadge.className = 'font-semibold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded border border-stone-200';
      return;
    }

    gradeLoafBtn.title = 'Grade and certify cat loaf';
    const count = state.photos.length;
    if (count === 0) {
      gradeLoafBtn.disabled = true;
      gradeLoafBtn.className = 'w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-stone-400 bg-stone-200 cursor-not-allowed shadow-none transition-all flex items-center justify-center gap-2 btn-tactile';
      photoCountBadge.textContent = '0 photos selected';
      photoCountBadge.className = 'font-semibold text-stone-600 bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200';
    } else {
      gradeLoafBtn.disabled = false;
      gradeLoafBtn.className = 'w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shimmer-btn btn-tactile';
      
      if (count === 1) {
        photoCountBadge.textContent = '1 photo staged (Single-Angle Mode)';
        photoCountBadge.className = 'font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded border border-amber-300';
      } else if (count === 2) {
        photoCountBadge.textContent = '2 photos staged (+2 Bonus)';
        photoCountBadge.className = 'font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded border border-amber-300';
      } else {
        const bonus = count >= 4 ? 5 : 4;
        photoCountBadge.textContent = `${count} photos staged (+${bonus} 360-Degree Bonus)`;
        photoCountBadge.className = 'font-bold text-orange-950 bg-orange-100 px-2.5 py-0.5 rounded border border-orange-300';
      }
    }
  }

  // Main Dropzone & File Input Listeners
  if (mainDropzone && photosInput) {
    mainDropzone.addEventListener('click', () => {
      photosInput.click();
    });

    mainDropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        photosInput.click();
      }
    });

    photosInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = '';
      }
    });

    ['dragenter', 'dragover'].forEach(evt => {
      mainDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        mainDropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      mainDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        mainDropzone.classList.remove('drag-over');
      });
    });

    mainDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    });
  }

  if (addMorePhotosBtn && photosInput) {
    addMorePhotosBtn.addEventListener('click', () => {
      photosInput.click();
    });
  }

  if (clearAllPhotosBtn) {
    clearAllPhotosBtn.addEventListener('click', () => {
      clearAllPhotos();
      state.userSavedPhotos = [];
      state.userSavedCatName = '';
    });
  }

  // Global Clipboard Paste Support (Ctrl+V)
  window.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.items) return;
    const pastedFiles = [];
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      addFiles(pastedFiles);
    }
  });

  // Benchmark Loaf Presets (Flash, Chonks 79 C+, and Chonks 68 C)
  const BENCHMARK_PRESETS = {
    flash: {
      name: "Flash",
      subtitle: "Rustic Dark Rye",
      badge: "5 Angles",
      images: [
        { url: '/samples/flash_92_front.webp', filename: 'flash_front.webp' },
        { url: '/samples/flash_92_top.webp', filename: 'flash_top.webp' },
        { url: '/samples/flash_92_side1.webp', filename: 'flash_side1.webp' },
        { url: '/samples/flash_92_side2.webp', filename: 'flash_side2.webp' },
        { url: '/samples/flash_92_extra.webp', filename: 'flash_extra.webp' }
      ],
      result: {
        cat_name: "Flash",
        overall_score: 92,
        grade_letter: "A",
        loaf_rank: "Grandmaster Artisan Loaf",
        bread_classification: "Rustic Dark Rye Boule",
        summary_critique: "Flash delivers a textbook demonstration of high-altitude culinary geometry with near-total peet concealment and formidable dorsal density. Telemetry across five distinct inspection angles confirms exceptional structural integrity and minimal aerodynamic drag.",
        paw_tuck: {
          score: 23,
          status: "Stealth Peet Concealment",
          critique: "Front limbs are folded impeccably inward, keeping all toe beans completely out of sight from primary inspection angles.",
          observations: [
            "Front paws vanish beneath the dense chest fleece with zero wrist protrusion.",
            "No oar deployment or loaf boat tendencies detected.",
            "Extreme discretion maintained regarding regional toe bean exposure."
          ]
        },
        tail_tuck: {
          score: 22,
          status: "Flush Flank Wrap",
          critique: "The tail is tightly coiled along the posterior perimeter, creating a seamless dough boundary with negligible wake turbulence.",
          observations: [
            "Tail tip tucked securely into the lateral flank.",
            "Zero casual tail swishing or trailing drag detected in multi-angle telemetry.",
            "Posterior curvature resembles a masterfully shaped sourdough end piece."
          ]
        },
        elbow_compactness: {
          score: 23,
          status: "Tight Boule Convergence",
          critique: "Elbows are tucked firmly against the ribcage, eliminating chicken-wing flare and maintaining a solid, aerodynamic loaf geometry.",
          observations: [
            "Flanks compress inward to form a cohesive, unified dough mass.",
            "Shoulder joints locked tightly in place for maximum thermal retention.",
            "Body contour exhibits zero lateral sagging or liquid dough behavior."
          ]
        },
        crust_symmetry: {
          score: 24,
          status: "Masterclass Bilateral Balance",
          critique: "The tabby coat grain displays even rise and balanced proportion from both profile and overhead perspectives.",
          observations: [
            "Evenly baked distribution of gray and black tabby striping.",
            "Dorsal ridge runs straight down the center line with artisanal precision.",
            "Stately facial expression matches the rigorous dignity of a Michelin-starred bakery."
          ]
        },
        drag_coefficient: 0.14,
        oar_detected: false,
        face_loaf: false,
        multi_angle_bonus: 5,
        badges: [
          "Multi-Angle Telemetry Master",
          "Invisible Peet Elite",
          "Zero-Drag Aerodynamicist",
          "Certified Master Boule"
        ],
        fun_tips_for_cat: [
          "Maintain this exact structural tightness during sudden household disturbances to protect your A-grade rating.",
          "Consider a micro-adjustment of the rear tail coil by 2 millimeters to chase absolute perfection."
        ],
        angle_notes: {
          front: "Front view confirms total invisibility of the front paws and a stern, focused baking countenance.",
          side: "Profile perspectives reveal exceptional height-to-width ratio and snug elbow containment.",
          top: "Overhead bird-eye telemetry demonstrates a perfectly oval, compact boule contour."
        }
      }
    },
    chonks_79: {
      name: "Chonks",
      subtitle: "Charcoal Rye Boule",
      badge: "4 Angles",
      images: [
        { url: '/samples/chonks_79_front.webp', filename: 'chonks_front.webp' },
        { url: '/samples/chonks_79_side.webp', filename: 'chonks_side.webp' },
        { url: '/samples/chonks_79_top.webp', filename: 'chonks_top.webp' },
        { url: '/samples/chonks_79_extra.webp', filename: 'chonks_extra.webp' }
      ],
      result: {
        cat_name: "Chonks",
        overall_score: 79,
        grade_letter: "C+",
        loaf_rank: "Qualified Journeyman Loaf",
        bread_classification: "Charcoal Rye Boule",
        summary_critique: "A solid domestic loaf attempt with good dorsal symmetry and compact elbows, though front paw exposure and a trailing tail tip incur standard demerits.",
        paw_tuck: {
          score: 15,
          status: "Visible Front Peet Infraction",
          critique: "While the wrist fold shows promise, individual toe beans and front paws remain stubbornly deployed outside the perimeter.",
          observations: [
            "Front paws are clearly resting outward on the carpet surface",
            "Lack of complete stealth concealment under the breastplate"
          ]
        },
        tail_tuck: {
          score: 18,
          status: "Trailing Tail Tip",
          critique: "The tail begins a respectable flank wrap but terminates in a persistent rearward extension, creating unnecessary aerodynamic drag.",
          observations: [
            "Tail coils partially along the right flank",
            "Terminal tip trails outward rather than locking flush"
          ]
        },
        elbow_compactness: {
          score: 21,
          status: "Taut Dough Boundary",
          critique: "Elbows are drawn inward with commendable discipline, maintaining a tight core structure reminiscent of well-kneaded dough.",
          observations: [
            "Minimal chicken-wing flare detected across all angles",
            "Torso breadth is well-contained against the ribcage"
          ]
        },
        crust_symmetry: {
          score: 20,
          status: "Balanced Gray Toast",
          critique: "The coat exhibits an even, velvety charcoal pigmentation with a balanced dorsal ridge and minimal lateral listing.",
          observations: [
            "Symmetrical spine line running from crown to rump",
            "Evenly baked fur texture with uniform density"
          ]
        },
        drag_coefficient: 0.38,
        oar_detected: false,
        face_loaf: false,
        multi_angle_bonus: 5,
        badges: [
          "Multi-Angle Telemetry Pioneer",
          "Charcoal Crust Achiever",
          "Minor Peet Protrusion Demerit"
        ],
        fun_tips_for_cat: [
          "Practice retracting front paws entirely beneath the chest cavity during pre-nap stretches.",
          "Work on coiling the tail tip closer to the flank to eliminate rear aerodynamic drag."
        ],
        angle_notes: {
          front: "Reveals clear front paw exposure and upright posture.",
          side: "Highlights body length and trailing tail configuration.",
          top: "Provides confirmation of dorsal symmetry and flank curvature."
        }
      }
    },
    chonks_68: {
      name: "Chonks",
      subtitle: "Dark Pumpernickel",
      badge: "Single Angle",
      images: [
        { url: '/samples/chonks_68_front.webp', filename: 'chonks_front.webp' }
      ],
      result: {
        cat_name: "Chonks",
        overall_score: 68,
        grade_letter: "C",
        loaf_rank: "Apprentice Doughball",
        bread_classification: "Dark Pumpernickel Loaf",
        summary_critique: "Single-photo inspection limitation applied: The subject demonstrates a recognizable attempt at domestic feline baking, but substantial aerodynamic drag from the trailing appendage and a slight chicken-wing elbow flare pull this loaf into the apprentice tier.",
        paw_tuck: {
          score: 16,
          status: "Slight Toe Peek Detected",
          critique: "The front wrist area shows a minor lack of discipline with digits hovering perilously near the edge of concealment.",
          observations: [
            "Front right paw shows slight wrist elevation",
            "Perimeter containment is marginally compromised",
            "Single-photo angle obscures secondary rear peet telemetry"
          ]
        },
        tail_tuck: {
          score: 8,
          status: "Trailing Aerodynamic Drag",
          critique: "The tail is cascading freely off the edge of the cat tree perch rather than curling flush against the flank, creating severe aerodynamic turbulence.",
          observations: [
            "Full tail extension draping downwards",
            "Zero flank wrap observed",
            "High gravitational pull on distal tail tip"
          ]
        },
        elbow_compactness: {
          score: 20,
          status: "Acceptable Joint Fold",
          critique: "Elbows are reasonably tucked inward toward the ribcage, though a minor flare prevents this from achieving artisan masterclass status.",
          observations: [
            "Forelimbs pressed moderately close to the chest cavity",
            "Slight lateral protrusion near the shoulder joints"
          ]
        },
        crust_symmetry: {
          score: 24,
          status: "Evenly Baked Charcoal Coat",
          critique: "The sleek gray fur coat is gorgeously toasted and exhibits a wonderful uniform color profile across the dorsal arch.",
          observations: [
            "Rich matte charcoal pigment",
            "Solid bilateral dorsal contour",
            "Balanced rise along the spine"
          ]
        },
        drag_coefficient: 0.58,
        oar_detected: false,
        face_loaf: false,
        multi_angle_bonus: 0,
        badges: [
          "Perch Gravity Defier",
          "Tail-Drag Infraction Recipient",
          "Midnight Fur Monolith"
        ],
        fun_tips_for_cat: [
          "Practice curling the tail around the front paws like a cinnamon roll to eliminate aerodynamic drag.",
          "Tuck the front wrists deeper into the chest cavity during the next resting cycle.",
          "Avoid perching on narrow edges where appendages are tempted to spill over."
        ],
        angle_notes: {
          front: "Front view reveals a stately gray coat with a trailing tail and minor wrist visibility on the perch edge."
        }
      }
    }
  };
  BENCHMARK_PRESETS.flash_92 = BENCHMARK_PRESETS.flash;
  BENCHMARK_PRESETS.chonks = BENCHMARK_PRESETS.chonks_79;
  BENCHMARK_PRESETS.buttercup = BENCHMARK_PRESETS.flash;

  // Benchmark button UI helpers
  function resetBenchmarkButtons() {
    document.querySelectorAll('.benchmark-card').forEach(card => {
      card.classList.remove('ring-2', 'ring-orange-500', 'border-orange-500', 'bg-orange-50/30', 'shadow-md');
      card.classList.add('border-orange-200/90', 'bg-white/95');
      const badge = card.querySelector('.benchmark-active-badge');
      if (badge) badge.classList.add('hidden');
    });

    document.querySelectorAll('.load-benchmark-btn').forEach(btn => {
      btn.innerHTML = `
        <i data-lucide="sparkles" class="w-3.5 h-3.5 text-orange-700 shrink-0"></i>
        <span>Inspect</span>
      `;
      btn.className = 'load-benchmark-btn flex-1 min-h-[38px] sm:min-h-[40px] py-1.5 px-1.5 sm:px-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-950 text-[11px] sm:text-xs font-bold border border-orange-200 transition-all flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs active:scale-95 whitespace-nowrap btn-tactile';
    });
    refreshIcons();
  }

  function setActiveBenchmarkButton(catKey) {
    document.querySelectorAll('.load-benchmark-btn').forEach(btn => {
      const cat = btn.getAttribute('data-cat');
      const card = btn.closest('.benchmark-card');

      if (cat === catKey) {
        btn.innerHTML = `
          <i data-lucide="chevron-up" class="w-3.5 h-3.5 text-white shrink-0"></i>
          <span>Collapse</span>
        `;
        btn.className = 'load-benchmark-btn flex-1 min-h-[38px] sm:min-h-[40px] py-1.5 px-1.5 sm:px-2 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-700 hover:to-amber-700 text-white text-[11px] sm:text-xs font-black border border-transparent transition-all flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm active:scale-95 whitespace-nowrap shimmer-btn btn-tactile';

        if (card) {
          card.classList.remove('border-orange-200/90', 'bg-white/95');
          card.classList.add('ring-2', 'ring-orange-500', 'border-orange-500', 'bg-orange-50/30', 'shadow-md');
          const badge = card.querySelector('.benchmark-active-badge');
          if (badge) badge.classList.remove('hidden');
        }
      } else {
        btn.innerHTML = `
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-orange-700 shrink-0"></i>
          <span>Inspect</span>
        `;
        btn.className = 'load-benchmark-btn flex-1 min-h-[40px] py-1.5 px-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-950 text-xs font-bold border border-orange-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 whitespace-nowrap btn-tactile';

        if (card) {
          card.classList.remove('ring-2', 'ring-orange-500', 'border-orange-500', 'bg-orange-50/30', 'shadow-md');
          card.classList.add('border-orange-200/90', 'bg-white/95');
          const badge = card.querySelector('.benchmark-active-badge');
          if (badge) badge.classList.add('hidden');
        }
      }
    });
    refreshIcons();
  }

  // Helper to load benchmark cat presets
  async function loadBenchmarkLoaf(catKey) {
    // If the same cat preset is already active and results section is visible, clicking it collapses it!
    if (state.isExamplePreset && state.activePresetKey === catKey && !resultsSection.classList.contains('hidden')) {
      collapseResultsSection(true);
      return;
    }

    const preset = BENCHMARK_PRESETS[catKey];
    if (!preset) return;

    const clickedBtn = document.querySelector(`.load-benchmark-btn[data-cat="${catKey}"]`);
    if (clickedBtn) {
      clickedBtn.innerHTML = `
        <i data-lucide="loader-2" class="w-3.5 h-3.5 text-orange-600 animate-spin"></i>
        <span>Loading...</span>
      `;
      refreshIcons();
    }

    try {
      // If user had staged photos that were NOT from an example preset, preserve them!
      if (!state.isExamplePreset && state.photos.length > 0) {
        state.userSavedPhotos = [...state.photos];
        state.userSavedCatName = catNameInput ? catNameInput.value : '';
        // Clear active photos without revoking user object URLs
        state.photos = [];
      } else if (state.isExamplePreset) {
        // Revoke object URLs from previous preset photos
        state.photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
        state.photos = [];
      } else {
        state.photos = [];
      }

      if (catNameInput) catNameInput.value = preset.name;

      const loadPresetImage = async (url, filename) => {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching sample image`);
        const blob = await resp.blob();
        const mimeType = url.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
        return new File([blob], filename, { type: mimeType });
      };

      const files = await Promise.all(
        preset.images.map(img => loadPresetImage(img.url, img.filename))
      );

      await addFiles(files, true);
      state.isExamplePreset = true;
      state.activePresetKey = catKey;
      state.canSubmit = false;
      state.currentResult = preset.result;
      state.gradeToken = null;
      state.submittedPhotoBlob = null;

      updateSubmitButton();
      setActiveBenchmarkButton(catKey);
      renderResults(preset.result, false);
    } catch (e) {
      console.error('Failed to load benchmark preset', e);
      resetBenchmarkButtons();
      showToast({
        type: 'error',
        title: 'Preset Load Error',
        message: 'Could not load preset images: ' + e.message
      });
    }
  }

  // Benchmark Gallery Card Button Handlers
  document.querySelectorAll('.load-benchmark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.currentTarget.getAttribute('data-cat');
      if (cat && BENCHMARK_PRESETS[cat]) {
        loadBenchmarkLoaf(cat);
      }
    });
  });

  // Load Buttercup Shortcut Button in upload bay
  if (loadButtercupBtn) {
    loadButtercupBtn.addEventListener('click', () => {
      loadBenchmarkLoaf('flash');
    });
  }

  // Loading Cycle Messages (Lighthearted & witty cat bakery references, zero emojis)
  const bakeryAuditSteps = [
    { title: "Loading the oven right meow...", detail: "Calibrating temperature for golden brioche" },
    { title: "Kneading dough and making biscuits...", detail: "Rhythmic front-paw biscuit agitation detected" },
    { title: "Proofing loaf for maximum purr-fection...", detail: "Resting on warm sunlit carpet" },
    { title: "Scanning undercarriage for paws-itively illicit peet peek...", detail: "Auditing all 4 paws for hidden toe beans" },
    { title: "Monitoring radar for cat-astrophic Loaf Boat hazards...", detail: "Checking for unauthorized oar deployments" },
    { title: "Checking elbow fold against chicken-wing rules...", detail: "Verifying flank compression against ribcage" },
    { title: "Measuring dorsal symmetry for meow-velous crust toastiness...", detail: "Scoring tiger-stripe toast pigmentation" },
    { title: "Consulting Chief Loaf Auditor to certify total purr-fection...", detail: "Preparing official certification papers" }
  ];

  let progressInterval = null;
  let isGradingActive = false;
  const loadingStepLog = document.getElementById('loadingStepLog');

  function renderStepLog(activeIdx) {
    if (!loadingStepLog) return;
    loadingStepLog.innerHTML = '';
    
    // Show current step and recent completed steps
    const startIdx = Math.max(0, activeIdx - 2);
    for (let i = startIdx; i <= activeIdx && i < bakeryAuditSteps.length; i++) {
      const step = bakeryAuditSteps[i];
      const isCurrent = (i === activeIdx && activeIdx < bakeryAuditSteps.length - 1);
      const el = document.createElement('div');
      el.className = isCurrent 
        ? 'flex items-center gap-2 text-orange-950 font-semibold bg-orange-50/90 px-2.5 py-1 rounded-lg border border-orange-200/70 transition-all duration-300 loading-step-item'
        : 'flex items-center gap-2 text-stone-600 font-medium px-2.5 py-0.5 transition-all duration-300 loading-step-item';
      
      const iconName = isCurrent ? 'loader-2' : 'check-circle-2';
      const iconClass = isCurrent ? 'w-3.5 h-3.5 text-orange-600 animate-spin shrink-0' : 'w-3.5 h-3.5 text-emerald-600 shrink-0';
      
      el.innerHTML = `
        <i data-lucide="${iconName}" class="${iconClass}"></i>
        <span class="truncate">${step.title}</span>
      `;
      loadingStepLog.appendChild(el);
    }
    refreshIcons();
  }

  // Scroll so the given section's top sits just below the sticky header (works on desktop and mobile)
  function scrollToSection(el, onComplete = null) {
    if (!el) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    requestAnimationFrame(() => {
      const header = document.querySelector('header');
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerH - 16);
      
      let finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        if (typeof onComplete === 'function') {
          // Extra settling buffer: 200ms after scrolling stops to let the viewport visually rest
          setTimeout(onComplete, 200);
        }
      }

      // Respect Reduced Motion Preferences (Vestibular disorders / motion sensitivity)
      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        window.scrollTo({ top: targetY, behavior: 'auto' });
        finish();
        return;
      }

      // If already within 15px of target, finish immediately with settling buffer
      if (Math.abs(window.scrollY - targetY) <= 15) {
        finish();
        return;
      }

      // Modern browser native scrollend event
      const onScrollEnd = () => {
        window.removeEventListener('scrollend', onScrollEnd);
        finish();
      };
      if ('onscrollend' in window) {
        window.addEventListener('scrollend', onScrollEnd, { once: true });
      }

      // Robust fallback watcher across all devices (including mobile & older browsers)
      let lastPos = window.scrollY;
      let restingCount = 0;
      const watcher = setInterval(() => {
        const curr = window.scrollY;
        // Reached destination
        if (Math.abs(curr - targetY) <= 15) {
          clearInterval(watcher);
          finish();
        } else if (Math.abs(curr - lastPos) < 2) {
          // Hasn't moved across ticks (e.g. hit bottom of document or completed scroll)
          restingCount++;
          if (restingCount >= 3) {
            clearInterval(watcher);
            finish();
          }
        } else {
          restingCount = 0;
          lastPos = curr;
        }
      }, 50);

      // Hard timeout fallback (1400ms max smooth scroll duration)
      setTimeout(() => {
        clearInterval(watcher);
        finish();
      }, 1400);

      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  }

  let photoCycleInterval = null;

  function startLoadingAnimation() {
    if (progressInterval) clearInterval(progressInterval);
    if (photoCycleInterval) clearInterval(photoCycleInterval);

    // Prepare user cat photos to slide into the hearth oven
    let photoUrls = [];
    if (state.photos && state.photos.length > 0) {
      photoUrls = state.photos.map(p => p.previewUrl).filter(Boolean);
    }
    if (photoUrls.length === 0 && state.activePresetKey && BENCHMARK_PRESETS[state.activePresetKey]) {
      photoUrls = BENCHMARK_PRESETS[state.activePresetKey].images.map(img => img.url);
    }
    if (photoUrls.length === 0) {
      photoUrls = ['/samples/flash_92_front.webp'];
    }

    if (ovenCatPhoto) {
      ovenCatPhoto.src = photoUrls[0];
      ovenCatPhoto.style.opacity = '1';
    }

    // Trigger smooth slide-into-oven entrance animation
    if (ovenPhotoStage) {
      ovenPhotoStage.classList.add('sliding');
      void ovenPhotoStage.offsetWidth; // Force reflow
      ovenPhotoStage.classList.remove('sliding');
    }

    // Smoothly cycle through multi-angle photos if user uploaded multiple photos
    if (photoUrls.length > 1) {
      let photoIdx = 0;
      photoCycleInterval = setInterval(() => {
        if (!progressInterval) {
          clearInterval(photoCycleInterval);
          return;
        }
        photoIdx = (photoIdx + 1) % photoUrls.length;
        if (ovenCatPhoto) {
          ovenCatPhoto.style.opacity = '0.35';
          setTimeout(() => {
            if (ovenCatPhoto && progressInterval) {
              ovenCatPhoto.src = photoUrls[photoIdx];
              ovenCatPhoto.style.opacity = '1';
            }
          }, 240);
        }
      }, 2500);
    }

    loadingState.classList.remove('hidden');
    loadingState.classList.add('hearth-oven-active');
    inspectorBay.classList.add('hidden');
    resultsSection.classList.add('hidden');
    scrollToSection(loadingState);

    const startTime = Date.now();
    let currentStep = 0;

    // Initial state
    loadingPhrase.textContent = bakeryAuditSteps[0].title;
    loadingProgressBar.style.width = '12%';
    renderStepLog(0);

    // Smooth monotonic asymptotic progress - NEVER jumps backward or loops
    progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;

      // Realistic progressive pacing:
      // 0-2s: 12% to 34% (Image upload & preprocessing)
      // 2-6s: 34% to 65% (Dough fold & paw concealment inspection)
      // 6-12s: 65% to 88% (Gemini multimodal geometry evaluation)
      // >12s: Asymptotic creep toward 94% (never exceeds 94% while waiting)
      let pct = 12;
      if (elapsed <= 2) {
        pct = 12 + elapsed * 11;
      } else if (elapsed <= 6) {
        pct = 34 + (elapsed - 2) * 7.75;
      } else if (elapsed <= 12) {
        pct = 65 + (elapsed - 6) * 3.83;
      } else {
        const extra = elapsed - 12;
        pct = 88 + 6 * (1 - Math.exp(-extra / 8));
      }

      pct = Math.min(Math.max(pct, 12), 94);
      loadingProgressBar.style.width = `${pct.toFixed(1)}%`;

      // Advance audit steps forward without modulo wrapping (clamp to final step)
      const stepIdx = Math.min(Math.floor(elapsed / 1.5), bakeryAuditSteps.length - 1);
      if (stepIdx !== currentStep) {
        currentStep = stepIdx;
        loadingPhrase.textContent = bakeryAuditSteps[currentStep].title;
        renderStepLog(currentStep);
      }
    }, 200);
  }

  function stopLoadingAnimation(callback = null) {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;
    if (photoCycleInterval) clearInterval(photoCycleInterval);
    photoCycleInterval = null;

    loadingProgressBar.style.width = '100%';
    loadingPhrase.textContent = 'Inspection complete! Finalizing scorecard...';
    renderStepLog(bakeryAuditSteps.length - 1);

    setTimeout(() => {
      loadingState.classList.remove('hearth-oven-active');
      loadingState.classList.add('hidden');
      if (typeof callback === 'function') {
        callback();
      }
    }, 380);
  }

  // Submit & Grade
  gradeLoafBtn.addEventListener('click', async () => {
    if (isGradingActive) return;
    if (state.isExamplePreset || state.canSubmit === false) {
      showToast({
        type: 'warning',
        title: 'Benchmark Loaf Active',
        message: 'Benchmark example cats cannot be evaluated or submitted. Please upload photos of your own cat!'
      });
      return;
    }
    if (state.photos.length === 0) {
      showToast({
        type: 'warning',
        title: 'Photographs Required',
        message: 'Please provide between 1 and 5 cat photos to run the evaluation.'
      });
      return;
    }

    isGradingActive = true;
    state.isExamplePreset = false;
    state.activePresetKey = null;
    state.canSubmit = true;
    state.userSavedPhotos = [];
    state.userSavedCatName = '';
    resetBenchmarkButtons();
    startLoadingAnimation();

    const formData = new FormData();
    const trimmedCatName = catNameInput ? catNameInput.value.trim() : '';
    if (trimmedCatName) {
      formData.append('cat_name', trimmedCatName);
    }
    formData.append('model', state.model);
    
    // Anti-bot honeypot check
    const honeypot = document.getElementById('honeypotInput');
    if (honeypot && honeypot.value) {
      formData.append('website_url_check', honeypot.value);
    }

    if (state.apiKey) {
      formData.append('api_key', state.apiKey);
    }

    // Append all staged photos (1 to 5) with angle hints without file duplication
    const angleTypes = [];
    state.photos.forEach((photo) => {
      formData.append('images', photo.file);
      angleTypes.push(photo.angleType || 'other');
    });
    formData.append('angle_types', JSON.stringify(angleTypes));

    try {
      const headers = {};
      if (state.apiKey) {
        headers['X-Gemini-API-Key'] = state.apiKey;
      }

      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: headers,
        body: formData
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        if (res.status === 413) {
          throw new Error('Total upload payload exceeded size limits. Please try with fewer photos or smaller image files.');
        }
        throw new Error(`Inspection failed (Server HTTP ${res.status}).`);
      }

      if (!res.ok) {
        const errorDetail = data && (data.detail || data.message);
        if (res.status === 413) {
          throw new Error(errorDetail || 'Upload payload exceeded size limits. Please try with fewer photos.');
        }
        throw new Error(errorDetail || 'Inspection failed');
      }

      stopLoadingAnimation(() => {
        state.currentResult = data.result;
        state.gradeToken = data.grade_token || null;
        state.canSubmit = (data.can_submit !== false) && !data.demo_mode;
        if (data.best_thumbnail_index !== undefined && data.best_thumbnail_index !== null) {
          if (data.best_thumbnail_index >= 0 && data.best_thumbnail_index < state.photos.length) {
            if (state.photos[data.best_thumbnail_index].angleType !== 'top') {
              state.primaryPhotoIndex = data.best_thumbnail_index;
            }
          }
        }
        selectBestThumbnail();
        const pIdx = (state.primaryPhotoIndex !== null && state.primaryPhotoIndex >= 0 && state.primaryPhotoIndex < state.photos.length) ? state.primaryPhotoIndex : 0;
        if (state.photos.length > pIdx && state.photos[pIdx].file) {
          state.submittedPhotoBlob = state.photos[pIdx].file;
        } else if (state.photos.length > 0 && state.photos[0].file) {
          state.submittedPhotoBlob = state.photos[0].file;
        }
        renderResults(data.result, data.demo_mode);
        saveLoafToHistory(data.result, {
          gradeToken: data.grade_token || null,
          canSubmit: (data.can_submit !== false) && !data.demo_mode,
          primaryPhotoIndex: state.primaryPhotoIndex
        });
        if (data.demo_mode && data.message) {
          showToast({
            type: 'info',
            title: 'Demo Calibration Mode',
            message: data.message
          });
        }
      });
    } catch (err) {
      stopLoadingAnimation();
      inspectorBay.classList.remove('hidden');

      const isOvenFull = err.message.toLowerCase().includes('oven') || 
                         err.message.toLowerCase().includes('capacity') || 
                         err.message.toLowerCase().includes('quota') || 
                         err.message.toLowerCase().includes('limit') ||
                         err.message.includes('429');
                         
      if (isOvenFull) {
        showOvenAlert(err.message);
      } else {
        showToast({
          type: 'error',
          title: 'Inspection Alert',
          message: err.message
        });
      }
    } finally {
      isGradingActive = false;
    }
  });

  // Render Results Dashboard
  function renderResults(result, isDemoMode) {
    resultsSection.classList.remove('hidden');
    inspectorBay.classList.add('hidden');

    // Reset score number to 0 and reset ring gauge before scrolling so user sees the roll
    const scoreNumEl = document.getElementById('scoreNumber');
    if (scoreNumEl) scoreNumEl.textContent = '0';
    const circleEl = document.getElementById('scoreMeterCircle');
    if (circleEl) {
      const circumference = 2 * Math.PI * 90;
      circleEl.style.strokeDashoffset = circumference;
    }

    // Keep grade stamp hidden until score roll completes
    const gradeStamp = document.getElementById('gradeStamp');
    if (gradeStamp) {
      gradeStamp.classList.remove('stamp-slam');
      gradeStamp.style.opacity = '0';
    }
    const catCertificationStamp = document.getElementById('catCertificationStamp');
    if (catCertificationStamp) catCertificationStamp.classList.remove('cat-certification-stamp-slam');

    // Hide badges until stamp impact
    const multiAngleBadge = document.getElementById('multiAngleBadge');
    if (multiAngleBadge) multiAngleBadge.classList.add('hidden');
    const oarBadge = document.getElementById('oarBadge');
    if (oarBadge) oarBadge.classList.add('hidden');

    // Configure Example Preset vs User Inspection UX
    if (state.isExamplePreset || state.canSubmit === false || isDemoMode) {
      if (exampleLoafBanner) {
        exampleLoafBanner.classList.remove('hidden');
        if (exampleCatBadge) {
          exampleCatBadge.textContent = `${result.cat_name || 'Benchmark'} Baseline`;
        }
      }
      if (submitLeaderboardBtn) {
        submitLeaderboardBtn.classList.add('hidden');
      }
      if (uploadOwnLoafBtn) {
        uploadOwnLoafBtn.classList.remove('hidden');
        if (uploadOwnLoafBtnText) uploadOwnLoafBtnText.textContent = 'Grade Your Own Cat';
      }
      if (bottomUploadBtnText) {
        bottomUploadBtnText.textContent = 'Upload Your Own Cat';
      }
    } else {
      if (exampleLoafBanner) {
        exampleLoafBanner.classList.add('hidden');
      }
      if (submitLeaderboardBtn && result.is_cat !== false) {
        submitLeaderboardBtn.classList.remove('hidden');
      }
      if (uploadOwnLoafBtn) {
        uploadOwnLoafBtn.classList.remove('hidden');
        if (uploadOwnLoafBtnText) uploadOwnLoafBtnText.textContent = 'Grade Another Loaf';
      }
      if (bottomUploadBtnText) {
        bottomUploadBtnText.textContent = 'Grade Another Loaf';
      }
    }

    // Header info
    document.getElementById('resultCatName').textContent = result.cat_name || 'The Mysterious Loaf';
    document.getElementById('resultHonoraryRank').textContent = result.loaf_rank;
    document.getElementById('resultBreadClass').textContent = result.bread_classification;
    document.getElementById('resultSummaryCritique').textContent = `"${result.summary_critique}"`;

    // Disqualification & Non-Feline Alert Handling
    if (result.is_cat === false) {
      if (disqualificationBanner) disqualificationBanner.classList.remove('hidden');
      if (disqualificationReason) {
        disqualificationReason.textContent = `"${result.rejection_reason || result.summary_critique || 'Disqualification: Inspector sensors detected a non-feline imposter rather than an authentic feline loaf!'}"`;
      }
      if (criteriaGrid) criteriaGrid.classList.add('hidden');
      if (angleReviewStrip) angleReviewStrip.classList.add('hidden');
      if (badgesAndTipsGrid) badgesAndTipsGrid.classList.add('hidden');
      if (downloadCertificateBtn) downloadCertificateBtn.classList.add('hidden');
      if (downloadStoryCardBtn) downloadStoryCardBtn.classList.add('hidden');

      if (submitLeaderboardBtn) {
        submitLeaderboardBtn.classList.remove('hidden');
        submitLeaderboardBtn.disabled = false;
        submitLeaderboardBtn.className = 'w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs border border-rose-300 transition-all flex items-center justify-center gap-2 shadow-2xs btn-tactile';
        submitLeaderboardBtn.innerHTML = `
          <i data-lucide="ban" class="w-4 h-4 text-rose-600"></i>
          <span>Leaderboard Ineligible (DQ)</span>
        `;
        submitLeaderboardBtn.title = result.rejection_reason || 'Audit Disqualified: Not an authentic feline loaf';
      }

      showToast({
        type: 'error',
        title: 'Non-Feline Disqualification',
        message: result.rejection_reason || 'Non-feline subject detected. Only authentic domestic cats can be certified!'
      });
    } else {
      if (disqualificationBanner) disqualificationBanner.classList.add('hidden');
      if (criteriaGrid) criteriaGrid.classList.remove('hidden');
      if (angleReviewStrip) angleReviewStrip.classList.remove('hidden');
      if (badgesAndTipsGrid) badgesAndTipsGrid.classList.remove('hidden');
      if (downloadCertificateBtn) downloadCertificateBtn.classList.remove('hidden');
      if (downloadStoryCardBtn) downloadStoryCardBtn.classList.remove('hidden');
      if (submitLeaderboardBtn) {
        if (!isDemoMode && !state.isExamplePreset && state.canSubmit !== false) {
          submitLeaderboardBtn.classList.remove('hidden');
        } else {
          submitLeaderboardBtn.classList.add('hidden');
        }
        submitLeaderboardBtn.disabled = false;
        updateSubmitLeaderboardBtnState();
      }
    }

    // Criteria Cards
    renderSubScore('paw', result.paw_tuck);
    renderSubScore('tail', result.tail_tuck);
    renderSubScore('elbow', result.elbow_compactness);
    renderSubScore('crust', result.crust_symmetry);

    // Drag coefficient & Telemetry HUD Row
    const dragNum = (result.drag_coefficient || 0.05).toFixed(2);
    const dragEl = document.getElementById('dragCoeffNum');
    if (dragEl) dragEl.textContent = dragNum;
    const hudDrag = document.getElementById('hudDragCoeff');
    if (hudDrag) hudDrag.textContent = `${dragNum} Cd`;

    const reportRefTag = document.getElementById('reportRefTag');
    if (reportRefTag) {
      const hashStr = Math.abs((result.overall_score * 31) ^ (result.cat_name ? result.cat_name.length * 17 : 42)).toString(16).toUpperCase().padStart(4, '0');
      reportRefTag.textContent = `DOSSIER #LF-2026-${result.grade_letter || 'A'}${hashStr}`;
    }

    const hudPaw = document.getElementById('hudPawSummary');
    if (hudPaw) {
      hudPaw.textContent = (result.paw_tuck && result.paw_tuck.status) ? result.paw_tuck.status.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() : '100% Peet Stealth';
    }

    const hudSym = document.getElementById('hudSymmetrySummary');
    if (hudSym) {
      hudSym.textContent = (result.crust_symmetry && result.crust_symmetry.status) ? result.crust_symmetry.status.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() : 'Bilateral Boule';
    }

    // Render Submitted Angles Strip
    renderAngleReview(result);

    // Render Badges (Clean pills, zero emojis)
    const badgesContainer = document.getElementById('badgesContainer');
    badgesContainer.innerHTML = '';
    (result.badges || []).forEach(badge => {
      // Strip any accidental emojis from AI output
      const cleanBadge = badge.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
      const el = document.createElement('span');
      el.className = 'px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-orange-100/90 to-amber-100/90 text-orange-950 border border-orange-300/80 shadow-2xs';
      el.textContent = cleanBadge;
      badgesContainer.appendChild(el);
    });

    // Render Tips (Clean bulleted layout, zero emojis)
    const tipsList = document.getElementById('tipsList');
    tipsList.innerHTML = '';
    (result.fun_tips_for_cat || []).forEach(tip => {
      const cleanTip = tip.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
      const li = document.createElement('li');
      li.className = 'flex items-start gap-2.5';
      li.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0"></span><span>${cleanTip}</span>`;
      tipsList.appendChild(li);
    });

    refreshIcons();

    // Screen reader accessible announcement
    const a11yEl = document.getElementById('a11yStatusRegion');
    if (a11yEl) {
      if (result.is_cat === false) {
        a11yEl.textContent = `Inspection completed. Subject was disqualified: ${result.rejection_reason || 'Non-feline subject detected'}.`;
      } else {
        a11yEl.textContent = `Inspection completed! ${result.cat_name || 'Subject'} scored ${result.overall_score} out of 100, Grade ${result.grade_letter}, classified as ${result.loaf_rank}.`;
      }
    }

    // Smooth scroll to the score summary card (or disqualification banner) first,
    // ensure the user has physically arrived and settled, then roll score & slam stamp!
    const scoreHeroCard = document.getElementById('scoreHeroCard');
    const scrollTarget = (result.is_cat === false && disqualificationBanner) ? disqualificationBanner : (scoreHeroCard || resultsSection);

    scrollToSection(scrollTarget, () => {
      if (result.is_cat === false) {
        triggerStampSlam(result);
      } else {
        animateScore(result.overall_score, () => {
          triggerStampSlam(result);
        });
      }
    });
  }

  function renderSubScore(prefix, sub) {
    document.getElementById(`${prefix}ScoreNum`).textContent = sub.score;
    document.getElementById(`${prefix}StatusTag`).textContent = (sub.status || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    document.getElementById(`${prefix}Critique`).textContent = (sub.critique || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    
    const pct = Math.min(100, Math.round((sub.score / 25) * 100));
    document.getElementById(`${prefix}Bar`).style.width = `${pct}%`;

    const obsList = document.getElementById(`${prefix}Observations`);
    obsList.innerHTML = '';
    (sub.observations || []).forEach(obs => {
      const cleanObs = obs.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
      const li = document.createElement('li');
      li.className = 'flex items-start gap-2';
      li.innerHTML = `<span class="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0"></span><span>${cleanObs}</span>`;
      obsList.appendChild(li);
    });
  }

  function renderAngleReview(result) {
    const grid = document.getElementById('angleReviewGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const angleNotesKeys = ['front', 'side', 'top'];
    const defaultLabels = ['Front Elevation', 'Lateral Profile', 'Dorsal Projection', 'Perspective 4', 'Perspective 5'];
    const icons = ['eye', 'move-horizontal', 'compass', 'camera', 'camera'];

    state.photos.forEach((photo, idx) => {
      const noteKey = angleNotesKeys[idx];
      const note = result.angle_notes && noteKey ? result.angle_notes[noteKey] : null;
      const label = defaultLabels[idx] || `Photo ${idx + 1}`;
      const icon = icons[idx] || 'camera';

      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl bg-orange-50/50 border border-orange-200/90 flex flex-col gap-2 shadow-2xs';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-stone-900 flex items-center gap-1.5">
            <i data-lucide="${icon}" class="w-3.5 h-3.5 text-orange-700"></i> ${label}
          </span>
          <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200">Inspected</span>
        </div>
        <div class="w-full h-36 sm:h-40 overflow-hidden rounded-xl border border-orange-200 bg-stone-900/5 relative">
          <img src="${photo.previewUrl}" class="w-full h-full object-cover ortho-photo-img" alt="${label}">
        </div>
        <p class="text-[11px] text-stone-600 leading-snug">${(note || 'Evaluated in composite score telemetry.').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')}</p>
      `;
      grid.appendChild(card);
    });

    // If fewer than 3 photos, show an informative card about omitted angles
    if (state.photos.length < 3) {
      const missingCard = document.createElement('div');
      missingCard.className = 'p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col gap-2 justify-between';
      missingCard.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <i data-lucide="info" class="w-3.5 h-3.5 text-amber-700"></i> Additional Perspectives
          </span>
          <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Omitted</span>
        </div>
        <div class="w-full h-36 sm:h-40 bg-white/80 rounded-xl border border-dashed border-amber-300 flex flex-col items-center justify-center p-3 text-center">
          <i data-lucide="camera-off" class="w-6 h-6 text-amber-400 mb-1"></i>
          <span class="text-xs font-bold text-amber-900">Missing Telemetry</span>
          <span class="text-[10px] text-amber-700 mt-0.5">Submit up to 5 photos for full 360-degree audit bonus</span>
        </div>
        <p class="text-[11px] text-amber-800 leading-snug">Hidden angles prevented 100% paw concealment validation. Score evaluated conservatively.</p>
      `;
      grid.appendChild(missingCard);
    }

    refreshIcons();
  }

  function triggerStampSlam(result) {
    const gradeStamp = document.getElementById('gradeStamp');
    if (!gradeStamp) return;
    const catCertificationStamp = document.getElementById('catCertificationStamp');

    gradeStamp.classList.remove('stamp-slam');
    gradeStamp.style.opacity = '1';

    if (result.is_cat === false) {
      gradeStamp.textContent = 'DQ';
      gradeStamp.className = 'stamp text-rose-700 border-rose-700 text-lg font-black';
    } else {
      gradeStamp.textContent = result.grade_letter || 'A';
      if (result.grade_letter && result.grade_letter.includes('A')) {
        gradeStamp.className = 'stamp text-orange-700 border-orange-700 text-lg font-black';
      } else if (result.grade_letter && result.grade_letter.includes('B')) {
        gradeStamp.className = 'stamp text-amber-700 border-amber-700 text-lg font-black';
      } else if (result.grade_letter && result.grade_letter.includes('C')) {
        gradeStamp.className = 'stamp text-stone-700 border-stone-700 text-lg font-black';
      } else {
        gradeStamp.className = 'stamp text-rose-700 border-rose-700 text-lg font-black';
      }
    }

    // Force reflow and re-add stamp-slam animation
    void gradeStamp.offsetWidth;
    gradeStamp.classList.add('stamp-slam');
    if (catCertificationStamp) {
      void catCertificationStamp.offsetWidth;
      catCertificationStamp.classList.add('cat-certification-stamp-slam');
    }

    // Subtle tactile haptic vibration feedback on supported mobile devices
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([25, 30, 45]);
      }
    } catch (_) {}

    // Reveal multi-angle and oar badges smoothly after impact
    setTimeout(() => {
      const multiAngleBadge = document.getElementById('multiAngleBadge');
      if (multiAngleBadge) {
        if (result.multi_angle_bonus && result.multi_angle_bonus > 0) {
          multiAngleBadge.classList.remove('hidden');
        } else {
          multiAngleBadge.classList.add('hidden');
        }
      }

      const oarBadge = document.getElementById('oarBadge');
      if (oarBadge) {
        if (result.oar_detected) {
          oarBadge.classList.remove('hidden');
        } else {
          oarBadge.classList.add('hidden');
        }
      }
    }, 200);
  }

  function animateScore(target, onComplete = null) {
    const numEl = document.getElementById('scoreNumber');
    const circleEl = document.getElementById('scoreMeterCircle');
    const circumference = 2 * Math.PI * 90;

    if (circleEl) circleEl.style.strokeDashoffset = circumference;
    if (numEl) numEl.textContent = '0';

    if (!target || target <= 0) {
      if (numEl) numEl.textContent = '0';
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    // Respect Reduced Motion Preferences
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (numEl) numEl.textContent = target;
      if (circleEl) {
        const offset = circumference - (circumference * (target / 100));
        circleEl.style.strokeDashoffset = offset;
      }
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    function step(currTime) {
      const elapsed = currTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(start + (target - start) * ease);

      if (numEl) numEl.textContent = currentScore;

      if (circleEl) {
        const offset = circumference - (circumference * (currentScore / 100));
        circleEl.style.strokeDashoffset = offset;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (numEl) numEl.textContent = target;
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    }

    requestAnimationFrame(step);
  }

  // Collapse Results Section & Return to Photo Staging Bay
  function collapseResultsSection(scroll = true) {
    resultsSection.classList.add('hidden');
    if (exampleLoafBanner) exampleLoafBanner.classList.add('hidden');
    inspectorBay.classList.remove('hidden');

    if (state.isExamplePreset) {
      // Clean up the preset's photos
      state.photos.forEach(p => URL.revokeObjectURL(p.previewUrl));

      if (state.userSavedPhotos && state.userSavedPhotos.length > 0) {
        // Restore photos user had staged previously
        state.photos = [...state.userSavedPhotos];
        state.userSavedPhotos = [];
        if (catNameInput) catNameInput.value = state.userSavedCatName || '';
        state.userSavedCatName = '';
        syncLegacySlots();
        renderStagedPhotos();
        updateSubmitButton();

        showToast({
          type: 'info',
          title: 'Inspection Bay Restored',
          message: 'Restored your staged photos. Ready to audit your cat!'
        });
      } else {
        // Clean slate for uploading
        state.photos = [];
        if (catNameInput) catNameInput.value = '';
        if (photosInput) photosInput.value = '';
        syncLegacySlots();
        renderStagedPhotos();
        updateSubmitButton();

        showToast({
          type: 'info',
          title: 'Inspection Bay Ready',
          message: 'Upload 1 to 5 photos to grade your cat loaf.'
        });
      }

      state.isExamplePreset = false;
      state.activePresetKey = null;
      state.currentResult = null;
    } else {
      // Return after grading user's cat
      clearAllPhotos();
      state.currentResult = null;
      state.gradeToken = null;
      state.submittedPhotoBlob = null;
      if (catNameInput) catNameInput.value = '';

      showToast({
        type: 'info',
        title: 'Inspector Ready',
        message: 'Returned to photo staging bay for a new feline inspection.'
      });
    }

    resetBenchmarkButtons();
    const gradeStamp = document.getElementById('gradeStamp');
    if (gradeStamp) {
      gradeStamp.classList.remove('stamp-slam');
      gradeStamp.style.opacity = '0';
    }
    if (scroll) {
      scrollToSection(inspectorBay);
    }
    refreshIcons();
  }

  // Collapse / Return to Staging Event Handlers
  if (collapseExampleBtn) {
    collapseExampleBtn.addEventListener('click', () => collapseResultsSection(true));
  }
  if (closeResultsSectionBtn) {
    closeResultsSectionBtn.addEventListener('click', () => collapseResultsSection(true));
  }
  if (uploadOwnLoafBtn) {
    uploadOwnLoafBtn.addEventListener('click', () => collapseResultsSection(true));
  }
  if (bottomUploadOwnLoafBtn) {
    bottomUploadOwnLoafBtn.addEventListener('click', () => collapseResultsSection(true));
  }
  if (resetInspectorBtn) {
    resetInspectorBtn.addEventListener('click', () => collapseResultsSection(true));
  }

  // Copy Summary (Technical & Clean Plain Text, Zero Emojis)
  copySummaryBtn.addEventListener('click', () => {
    if (!state.currentResult) return;

    const r = state.currentResult;
    const cleanCritique = (r.summary_critique || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    const summary = `FELINE POSTURE & LOAF INSPECTION REPORT
Subject: ${r.cat_name}
Composite Loaf Score: ${r.overall_score}/100 (Grade: ${r.grade_letter})
Classification: ${r.loaf_rank}
Morphology Index: ${r.bread_classification}

CRITERIA BREAKDOWN:
- Paw Concealment: ${r.paw_tuck.score}/25 (${r.paw_tuck.status})
- Tail Aerodynamics: ${r.tail_tuck.score}/25 (Drag Coeff: ${r.drag_coefficient})
- Flank Compression: ${r.elbow_compactness.score}/25 (${r.elbow_compactness.status})
- Dorsal Symmetry: ${r.crust_symmetry.score}/25 (${r.crust_symmetry.status})

AUDITOR SUMMARY:
"${cleanCritique}"

Certified by Loafed Inspection Engine`;

    navigator.clipboard.writeText(summary).then(() => {
      const copyBtnText = document.getElementById('copyBtnText');
      const copyIcon = document.getElementById('copyIcon');
      copyBtnText.textContent = 'Copied to Clipboard';
      copyIcon.setAttribute('data-lucide', 'check');
      refreshIcons();

      showToast({
        type: 'success',
        title: 'Report Copied',
        message: 'Evaluation summary has been copied to your clipboard.'
      });

      setTimeout(() => {
        copyBtnText.textContent = 'Copy Technical Summary';
        copyIcon.setAttribute('data-lucide', 'copy');
        refreshIcons();
      }, 2500);
    });
  });

  const shareScorecardBtn = document.getElementById('shareScorecardBtn');
  if (shareScorecardBtn) {
    shareScorecardBtn.addEventListener('click', async () => {
      const r = state.currentResult;
      if (!r) return;
      const shareUrl = state.submittedEntryId
        ? `${window.location.origin}/loaf?id=${encodeURIComponent(state.submittedEntryId)}`
        : window.location.origin;
      const shareData = {
        title: `${r.cat_name || 'My Cat'} — Official Loaf Score`,
        text: `My cat ${r.cat_name || 'loaf'} scored ${r.overall_score}/100 (${r.grade_letter} — ${r.loaf_rank}) on Loafed AI! Can your cat beat this loaf?`,
        url: shareUrl
      };
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (_) {}
      }
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        showToast({
          type: 'success',
          title: 'Scorecard Link Copied',
          message: state.submittedEntryId 
            ? 'Official loaf link and summary copied to clipboard!' 
            : 'Loaf scorecard text and link copied to clipboard!'
        });
      } catch (_) {
        showToast({
          type: 'info',
          title: 'Loafed AI',
          message: shareUrl
        });
      }
    });
  }

  // Preload Mascot Emblem for Certificate
  const mascotLogoImg = new Image();
  mascotLogoImg.src = '/static/logo.png';

  // Helper to resolve active cat photo URL
  function getActiveLoafImageUrl(result) {
    if (state.photos && state.photos.length > 0 && state.photos[0].previewUrl) {
      return state.photos[0].previewUrl;
    }
    if (state.activePresetKey && BENCHMARK_PRESETS[state.activePresetKey]) {
      const preset = BENCHMARK_PRESETS[state.activePresetKey];
      if (preset.images && preset.images.length > 0) return preset.images[0].url;
    }
    if (result && result.cat_name) {
      const nameLow = result.cat_name.toLowerCase();
      if (nameLow.includes('flash')) return '/samples/flash_92_thumb.webp';
      if (nameLow.includes('chonks')) return '/samples/chonks_79_thumb.webp';
      if (nameLow.includes('chonk')) return '/samples/chonks_front.jpg';
      if (nameLow.includes('flash')) return '/samples/flash_front.jpg';
    }
    const firstGridImg = document.querySelector('#angleReviewGrid img');
    if (firstGridImg && firstGridImg.src) return firstGridImg.src;
    return '/samples/flash_92_thumb.webp';
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

  function drawCoverImage(ctx, img, x, y, w, h, radius = 8) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
    
    const imgRatio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
    const targetRatio = w / h;
    let renderW, renderH, offsetX, offsetY;
    
    if (imgRatio > targetRatio) {
      renderH = h;
      renderW = h * imgRatio;
      offsetX = x - (renderW - w) / 2;
      offsetY = y;
    } else {
      renderW = w;
      renderH = w / imgRatio;
      offsetX = x;
      offsetY = y - (renderH - h) / 2;
    }
    
    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
    ctx.restore();
  }

  // Draw Ornate Corner Bracket at (cx, cy)
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

  // Draw Official Gold Foil Embossed Seal
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

  // Certificate Download & Preview Generator (Canvas with clean professional styling, zero emojis)
  if (downloadCertificateBtn) {
    downloadCertificateBtn.addEventListener('click', () => {
      if (!state.currentResult) return;
      openCertificateModal(state.currentResult);
    });
  }

  if (downloadStoryCardBtn) {
    downloadStoryCardBtn.addEventListener('click', async () => {
      const res = state.currentResult || (activeModalCertResult || BENCHMARK_PRESETS.flash.result);
      if (!res) return;
      await generateStoryCard(res, true);
      showToast({
        type: 'success',
        title: 'Story Card Exported',
        message: `Exported 1080x1920 9:16 vertical story card for ${res.cat_name || 'Subject'}.`
      });
    });
  }

  async function generateCertificate(result, shouldDownload = true, prefetchedImg = null) {
    const canvas = certificateCanvas;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Load active cat photo
    let catImg = prefetchedImg;
    if (!catImg) {
      const imgUrl = getActiveLoafImageUrl(result);
      if (imgUrl) {
        catImg = await loadImage(imgUrl);
      }
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
    if (mascotLogoImg.complete && mascotLogoImg.naturalWidth > 0) {
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
    const rankText = `${result.loaf_rank}   •   ${result.bread_classification}`;
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
    ctx.fillText(result.overall_score.toString(), 230, 568);

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
    ctx.fillText(`Drag: Cd ${(result.drag_coefficient || 0.05).toFixed(2)}  •  Bonus: +${result.multi_angle_bonus || 0} pts`, 230, 684);

    // 5. Right Column: Kinematic Criteria Breakdown & Chief Inspector Memo (x: 412, y: 248, w: 724, h: 450)
    // Criteria Module (w: 724, h: 265)
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

    const criteriaList = [
      { name: 'Paw Tuck & Undercarriage Stealth', score: result.paw_tuck.score, status: result.paw_tuck.status },
      { name: 'Tail Aerodynamics & Flank Wrap', score: result.tail_tuck.score, status: result.tail_tuck.status },
      { name: 'Flank Compression & Boule Compactness', score: result.elbow_compactness.score, status: result.elbow_compactness.status },
      { name: 'Dorsal Symmetry & Crust Distribution', score: result.crust_symmetry.score, status: result.crust_symmetry.status }
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
    // Left: Serial & Date Stamp
    ctx.textAlign = 'left';
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const hashStr = Math.abs((result.overall_score * 31) ^ (result.cat_name ? result.cat_name.length * 17 : 42)).toString(16).toUpperCase().padStart(4, '0');
    ctx.fillText(`VERIFICATION ID: LF-2026-${result.grade_letter || 'A'}${hashStr}`, 68, 738);
    ctx.fillStyle = '#a8a29e';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText(`Certified on ${dateStr}`, 68, 755);

    // Center: Cursive Signature & Title
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

  // 9:16 Vertical Story Card Generator (1080x1920 HD for Instagram / TikTok / WhatsApp)
  async function generateStoryCard(result, shouldDownload = true, prefetchedImg = null) {
    const canvas = storyCanvas || document.getElementById('storyCanvas');
    if (!canvas) return null;
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    const w = 1080;
    const h = 1920;

    // Load active cat photo
    let catImg = prefetchedImg;
    if (!catImg) {
      const imgUrl = getActiveLoafImageUrl(result);
      if (imgUrl) {
        catImg = await loadImage(imgUrl);
      }
    }

    // 1. Archival Parchment Background
    const bgGrad = ctx.createRadialGradient(w / 2, 600, 100, w / 2, h / 2, 1200);
    bgGrad.addColorStop(0, '#fffdfa');
    bgGrad.addColorStop(0.5, '#fbf5e8');
    bgGrad.addColorStop(1, '#f1e5d0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Guilloche security diagonal lines
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 140, 90, 0.035)';
    ctx.lineWidth = 1;
    for (let x = -1000; x < w + 1000; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Triple Border
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 5;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    ctx.strokeStyle = '#c27803';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(52, 52, w - 104, h - 104);

    ctx.strokeStyle = '#d6cebe';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(62, 62, w - 124, h - 124);

    // Corner flourishes
    drawCornerFlourish(ctx, 54, 54, 1, 1, 38);
    drawCornerFlourish(ctx, w - 54, 54, -1, 1, 38);
    drawCornerFlourish(ctx, 54, h - 54, 1, -1, 38);
    drawCornerFlourish(ctx, w - 54, h - 54, -1, -1, 38);

    // 3. Header Section
    if (mascotLogoImg && mascotLogoImg.complete && mascotLogoImg.naturalWidth > 0) {
      ctx.drawImage(mascotLogoImg, (w - 70) / 2, 90, 70, 70);
    }
    ctx.fillStyle = '#9a3412';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUREAU OF FELINE POSTURE & LOAF CERTIFICATION', w / 2, 195);

    ctx.fillStyle = '#1c1917';
    ctx.font = '900 46px Georgia, serif';
    ctx.fillText('OFFICIAL LOAF CERTIFICATION', w / 2, 255);

    ctx.strokeStyle = '#c27803';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 160, 280);
    ctx.lineTo(w / 2 + 160, 280);
    ctx.stroke();

    // 4. Cat Photo Portrait
    const photoX = 90;
    const photoY = 310;
    const photoW = 900;
    const photoH = 800;

    if (catImg) {
      drawCoverImage(ctx, catImg, photoX, photoY, photoW, photoH, 32);
      ctx.save();
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, 32);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(photoX + 5, photoY + 5, photoW - 10, photoH - 10, 28);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = '#e7e5e4';
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, 32);
      ctx.fill();
    }

    // Photo Exhibit Ribbon Badge
    ctx.save();
    ctx.fillStyle = 'rgba(28, 25, 23, 0.88)';
    ctx.beginPath();
    ctx.roundRect(photoX + 24, photoY + 24, 340, 44, 12);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXHIBIT A: AUDITED SPECIMEN', photoX + 194, photoY + 52);
    ctx.restore();

    // 5. Cat Name & Bread Rank
    ctx.fillStyle = '#1c1917';
    ctx.font = '900 52px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(result.cat_name || 'Anonymous Loaf', w / 2, 1175);

    ctx.fillStyle = '#c2410c';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText(`${result.loaf_rank || 'Artisan Loaf'} • ${result.bread_classification || 'Brioche'}`, w / 2, 1218);

    // 6. Score & Grade Ink Box
    const scoreBoxX = 100;
    const scoreBoxY = 1255;
    const scoreBoxW = 880;
    const scoreBoxH = 175;

    ctx.fillStyle = '#fff7ed';
    ctx.beginPath();
    ctx.roundRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 24);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Score on the left
    ctx.fillStyle = '#9a3412';
    ctx.font = '900 84px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${result.overall_score || 0}`, scoreBoxX + 50, scoreBoxY + 115);

    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.fillText('/ 100', scoreBoxX + 190, scoreBoxY + 115);

    // Grade Rubber Stamp on the right
    ctx.save();
    const gradeStr = (result.grade_letter || 'A').toUpperCase().trim();
    const stampText = `GRADE ${gradeStr}`;
    ctx.font = '900 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stampMetrics = ctx.measureText(stampText);
    const stampTextW = stampMetrics.width;
    const padX = 36;
    const stampW = Math.max(280, Math.round(stampTextW + padX * 2));
    const stampH = 88;
    const halfW = stampW / 2;
    const halfH = stampH / 2;

    const stampCenterX = Math.min(scoreBoxX + scoreBoxW - halfW - 25, scoreBoxX + 670);
    const stampCenterY = scoreBoxY + Math.round(scoreBoxH / 2);

    ctx.translate(stampCenterX, stampCenterY);
    ctx.rotate(-0.06);

    let stampColor = '#c2410c'; // A / A+
    if (gradeStr.startsWith('B')) stampColor = '#d97706';
    else if (gradeStr.startsWith('C')) stampColor = '#57534e';
    else if (gradeStr.startsWith('D') || gradeStr.startsWith('F')) stampColor = '#be123c';

    // Stamp ink background tint
    ctx.fillStyle = 'rgba(194, 65, 12, 0.08)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-halfW, -halfH, stampW, stampH, 8);
    } else {
      ctx.rect(-halfW, -halfH, stampW, stampH);
    }
    ctx.fill();

    // Outer crisp stamp border
    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-halfW, -halfH, stampW, stampH, 8);
    } else {
      ctx.rect(-halfW, -halfH, stampW, stampH);
    }
    ctx.stroke();

    // Inner subtle hairline for authentic bureau stamp depth
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-halfW + 5, -halfH + 5, stampW - 10, stampH - 10, 5);
    } else {
      ctx.rect(-halfW + 5, -halfH + 5, stampW - 10, stampH - 10);
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Stamp text centered
    ctx.fillStyle = stampColor;
    ctx.fillText(stampText, 0, 0);
    ctx.restore();

    // 7. Subscore Telemetry Progress Bars
    const subBarsY = 1470;
    const criteria = [
      { label: 'Paw Tuck (Limbs Concealed)', score: result.tuck ? result.tuck.score : 24 },
      { label: 'Boule Bilateral Symmetry', score: result.symmetry ? result.symmetry.score : 23 },
      { label: 'Spherical Compactness', score: result.compactness ? result.compactness.score : 24 },
      { label: 'Tail Wrap Concealment', score: result.tail ? result.tail.score : 23 }
    ];

    criteria.forEach((item, idx) => {
      const rowY = subBarsY + idx * 46;
      ctx.fillStyle = '#44403c';
      ctx.font = 'bold 18px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, 110, rowY + 18);

      const barX = 520;
      const barW = 340;
      const barH = 16;
      ctx.fillStyle = '#e7e5e4';
      ctx.beginPath();
      ctx.roundRect(barX, rowY + 4, barW, barH, 8);
      ctx.fill();

      const pct = Math.min(1, Math.max(0, item.score / 25));
      const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      fillGrad.addColorStop(0, '#f59e0b');
      fillGrad.addColorStop(1, '#ea580c');
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.roundRect(barX, rowY + 4, barW * pct, barH, 8);
      ctx.fill();

      ctx.fillStyle = '#9a3412';
      ctx.font = 'bold 18px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${item.score}/25`, 960, rowY + 18);
    });

    // 8. Seal, Signature & Footer Call to Action
    drawGoldEmbossedSeal(ctx, 880, 1750, 70);

    ctx.fillStyle = '#78350f';
    ctx.font = 'italic 28px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('Dr. Oliver Pawsbury, Chief Crust Inspector', 110, 1740);

    const hashStr = Math.abs((result.cat_name || 'cat').split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)).toString(16).toUpperCase().padStart(6, '0');
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`VERIFICATION ID: LF-2026-${hashStr}`, 110, 1780);

    ctx.fillStyle = '#ea580c';
    ctx.font = '900 22px -apple-system, sans-serif';
    ctx.fillText('loafed.redersoft.com • Grade Your Cat Today', 110, 1820);

    const dataUrl = canvas.toDataURL('image/png');
    if (shouldDownload) {
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = (result.cat_name || 'subject').toLowerCase().replace(/[^a-z0-9]/g, '_');
      a.download = `loaf_story_${safeName}.png`;
      a.click();
    }
    return dataUrl;
  }

  // Certificate Preview Modal Controller
  let activeModalCertResult = null;
  const certificateModal = document.getElementById('certificateModal');
  const certModalImage = document.getElementById('certModalImage');
  const certModalTitle = document.getElementById('certModalTitle');
  const closeCertModalBtn = document.getElementById('closeCertModalBtn');
  const dismissCertModalBtn = document.getElementById('dismissCertModalBtn');
  const modalDownloadCertBtn = document.getElementById('modalDownloadCertBtn');
  const viewSampleCertBtn = document.getElementById('viewSampleCertBtn');

  async function openCertificateModal(result) {
    if (!result) return;
    activeModalCertResult = result;
    const dataUrl = await generateCertificate(result, false);
    if (certModalImage) certModalImage.src = dataUrl;
    if (certModalTitle) {
      certModalTitle.textContent = `${result.cat_name || 'Feline'} — Official Loaf Certificate`;
    }
    if (certificateModal) {
      certificateModal.classList.remove('hidden');
    }
    refreshIcons();
  }

  function closeCertificateModal() {
    if (certificateModal) {
      certificateModal.classList.add('hidden');
    }
  }

  if (closeCertModalBtn) closeCertModalBtn.addEventListener('click', closeCertificateModal);
  if (dismissCertModalBtn) dismissCertModalBtn.addEventListener('click', closeCertificateModal);
  if (certificateModal) {
    certificateModal.addEventListener('click', (e) => {
      if (e.target === certificateModal) closeCertificateModal();
    });
  }

  if (modalDownloadCertBtn) {
    modalDownloadCertBtn.addEventListener('click', async () => {
      if (activeModalCertResult) {
        await generateCertificate(activeModalCertResult, true);
        showToast({
          type: 'success',
          title: 'Certificate Downloaded',
          message: `Exported 1200x800 HD certificate for ${activeModalCertResult.cat_name}.`
        });
      }
    });
  }

  const modalDownloadStoryBtn = document.getElementById('modalDownloadStoryBtn');
  if (modalDownloadStoryBtn) {
    modalDownloadStoryBtn.addEventListener('click', async () => {
      if (activeModalCertResult) {
        await generateStoryCard(activeModalCertResult, true);
        showToast({
          type: 'success',
          title: 'Story Card Downloaded',
          message: `Exported 1080x1920 9:16 vertical story card for ${activeModalCertResult.cat_name}.`
        });
      }
    });
  }

  if (viewSampleCertBtn) {
    viewSampleCertBtn.addEventListener('click', () => {
      const sample = state.currentResult || BENCHMARK_PRESETS.flash.result;
      openCertificateModal(sample);
    });
  }

  // Certificate Preview Buttons across benchmark cards
  document.querySelectorAll('.preview-cert-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.currentTarget.getAttribute('data-cat');
      if (cat && BENCHMARK_PRESETS[cat]) {
        openCertificateModal(BENCHMARK_PRESETS[cat].result);
      }
    });
  });




  // Capacity Alert Modal Controls
  const ovenAlertModal = document.getElementById('ovenAlertModal');
  const ovenAlertBody = document.getElementById('ovenAlertBody');
  const closeOvenAlertBtn = document.getElementById('closeOvenAlertBtn');
  const ovenAlertPresetBtn = document.getElementById('ovenAlertPresetBtn');

  function showOvenAlert(msg) {
    if (ovenAlertBody) {
      if (msg && !msg.toLowerCase().includes('configuration') && !msg.toLowerCase().includes('settings')) {
        ovenAlertBody.textContent = msg;
      } else {
        ovenAlertBody.textContent = "Our public evaluation ovens have reached their daily limit for today! Fresh loaf inspection slots will open up tomorrow. In the meantime, you can inspect Flash's certified benchmark dataset below or explore today's champions on the Leaderboard.";
      }
    }
    if (ovenAlertModal) ovenAlertModal.classList.remove('hidden');
    refreshIcons();
  }

  if (closeOvenAlertBtn) {
    closeOvenAlertBtn.addEventListener('click', () => {
      ovenAlertModal.classList.add('hidden');
    });
  }

  if (ovenAlertPresetBtn) {
    ovenAlertPresetBtn.addEventListener('click', () => {
      ovenAlertModal.classList.add('hidden');
      loadBenchmarkLoaf('flash');
    });
  }

  // Local History & Photo Cache Manager (0 login required, stored locally in browser)
  const historyBadgeCount = document.getElementById('historyBadgeCount');
  const historyModal = document.getElementById('historyModal');
  const openHistoryBtn = document.getElementById('openHistoryBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const dismissHistoryBtn = document.getElementById('dismissHistoryBtn');
  const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
  const historyListContainer = document.getElementById('historyListContainer');

  const IDB_NAME = 'loafed_cache_db';
  const IDB_VERSION = 2;
  const IDB_STORE = 'inspections';

  function openIndexedDb() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
    });
  }

  async function saveInspectionToIndexedDb(record) {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not save inspection photos to IndexedDB cache:', err);
      return false;
    }
  }

  async function getInspectionFromIndexedDb(id) {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not retrieve inspection photos from IndexedDB:', err);
      return null;
    }
  }

  async function updateInspectionInIndexedDb(id, updates) {
    try {
      const existing = await getInspectionFromIndexedDb(id);
      if (!existing) return false;
      const updated = { ...existing, ...updates };
      return await saveInspectionToIndexedDb(updated);
    } catch (err) {
      console.warn('Could not update inspection in IndexedDB:', err);
      return false;
    }
  }

  async function deleteInspectionFromIndexedDb(id) {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not delete inspection from IndexedDB:', err);
      return false;
    }
  }

  async function clearAllInspectionsFromIndexedDb() {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (_) {
      return false;
    }
  }

  function getSavedHistory() {
    try {
      return JSON.parse(localStorage.getItem('loafed_history') || '[]');
    } catch {
      return [];
    }
  }

  function updateHistoryBadge() {
    const history = getSavedHistory();
    if (historyBadgeCount) {
      historyBadgeCount.textContent = history.length;
    }
    if (openHistoryBtn) {
      const lastSeenId = localStorage.getItem('loafed_history_seen_id');
      if (history.length > 0 && (!lastSeenId || history[0].id !== lastSeenId)) {
        openHistoryBtn.classList.add('has-new-entry');
      } else {
        openHistoryBtn.classList.remove('has-new-entry');
      }
    }
  }

  function markHistoryAsSeen() {
    const history = getSavedHistory();
    if (history.length > 0) {
      localStorage.setItem('loafed_history_seen_id', history[0].id);
    } else {
      localStorage.removeItem('loafed_history_seen_id');
    }
    if (openHistoryBtn) {
      openHistoryBtn.classList.remove('has-new-entry');
    }
  }

  async function saveLoafToHistory(result, options = {}) {
    if (!result) return;
    try {
      const id = Date.now().toString();
      const gradeToken = options.gradeToken || state.gradeToken || null;
      const canSubmit = (options.canSubmit !== undefined) ? options.canSubmit : (state.canSubmit !== false && !state.isExamplePreset);
      const primaryPhotoIndex = (options.primaryPhotoIndex !== undefined) ? options.primaryPhotoIndex : (state.primaryPhotoIndex || 0);

      const entry = {
        id: id,
        cat_name: result.cat_name || 'Anonymous Subject',
        overall_score: result.overall_score || 0,
        grade_letter: result.grade_letter || 'N/A',
        loaf_rank: result.loaf_rank || 'Unclassified',
        bread_classification: result.bread_classification || 'Standard Loaf',
        summary_critique: result.summary_critique || '',
        timestamp: new Date().toISOString(),
        result: result,
        grade_token: gradeToken,
        can_submit: canSubmit,
        primary_photo_index: primaryPhotoIndex,
        has_cached_photos: false
      };

      // Persist authentic photos to IndexedDB so user can submit or view later with 100% integrity
      if (!state.isExamplePreset && Array.isArray(state.photos) && state.photos.length > 0) {
        try {
          const photoRecords = [];
          for (let i = 0; i < state.photos.length; i++) {
            const p = state.photos[i];
            let blob = p.file;
            if (!blob && p.previewUrl) {
              try {
                const res = await fetch(p.previewUrl);
                blob = await res.blob();
              } catch (_) {}
            }
            if (blob) {
              photoRecords.push({
                blob: blob,
                name: p.name || `photo_${i + 1}.jpg`,
                type: blob.type || 'image/jpeg',
                angleType: p.angleType || 'front'
              });
            }
          }

          if (photoRecords.length > 0) {
            const savedOk = await saveInspectionToIndexedDb({
              id: id,
              result: result,
              grade_token: gradeToken,
              can_submit: canSubmit,
              primary_photo_index: primaryPhotoIndex,
              timestamp: entry.timestamp,
              photos: photoRecords
            });
            if (savedOk) {
              entry.has_cached_photos = true;
            }
          }
          state.loadedHistoryId = id;
        } catch (dbErr) {
          console.warn('IndexedDB photo cache failed (continuing with localStorage metadata):', dbErr);
        }
      }

      const history = getSavedHistory();
      history.unshift(entry);
      if (history.length > 30) {
        const removed = history.splice(30);
        removed.forEach(r => {
          if (r.id) deleteInspectionFromIndexedDb(r.id).catch(() => {});
        });
      }
      localStorage.setItem('loafed_history', JSON.stringify(history));
      updateHistoryBadge();
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }

  function updateMyBakeryStats(history) {
    const bakeryTopScoreEl = document.getElementById('bakeryTopScore');
    const bakeryTotalAuditsEl = document.getElementById('bakeryTotalAudits');
    const bakeryTopCrustEl = document.getElementById('bakeryTopCrust');
    if (!bakeryTopScoreEl || !bakeryTotalAuditsEl || !bakeryTopCrustEl) return;

    if (history && history.length > 0) {
      const maxScore = Math.max(...history.map(h => h.overall_score || 0));
      const bestEntry = history.find(h => (h.overall_score || 0) === maxScore) || history[0];
      bakeryTopScoreEl.textContent = `${maxScore}/100`;
      bakeryTotalAuditsEl.textContent = history.length;
      bakeryTopCrustEl.textContent = bestEntry.loaf_rank || bestEntry.bread_classification || 'Artisan Loaf';
      bakeryTopCrustEl.title = bakeryTopCrustEl.textContent;
    } else {
      bakeryTopScoreEl.textContent = '--';
      bakeryTotalAuditsEl.textContent = '0';
      bakeryTopCrustEl.textContent = '--';
      bakeryTopCrustEl.title = '';
    }
  }

  function renderHistoryModal() {
    const history = getSavedHistory();
    updateMyBakeryStats(history);
    if (!historyListContainer) return;

    if (history.length === 0) {
      historyListContainer.innerHTML = `
        <div class="py-10 text-center text-stone-400">
          <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-stone-300"></i>
          <p class="text-xs font-semibold text-stone-600">No saved inspections yet</p>
          <p class="text-[11px] text-stone-400 mt-1">Upload photos and inspect a cat to log your first score.</p>
        </div>
      `;
      refreshIcons();
      return;
    }

    historyListContainer.innerHTML = history.map((item) => {
      const formattedDate = new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      const photoTag = item.has_cached_photos
        ? '<span class="inline-flex items-center gap-1 text-[9px] bg-orange-100 text-orange-800 font-semibold px-1.5 py-0.5 rounded border border-orange-200"><i data-lucide="camera" class="w-2.5 h-2.5"></i>Photos Cached</span>'
        : '';

      const leaderboardTag = item.submitted_entry_id
        ? `<a href="/loaf?id=${encodeURIComponent(item.submitted_entry_id)}" class="inline-flex items-center gap-1 text-[9px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200 transition-colors" title="View official leaderboard entry"><i data-lucide="trophy" class="w-2.5 h-2.5 text-emerald-700"></i>Leaderboard</a>`
        : '';

      return `
        <div class="p-3.5 rounded-xl border border-orange-200/90 bg-orange-50/40 hover:bg-orange-50/80 transition-colors flex items-center justify-between gap-3 shadow-2xs" data-id="${item.id}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-lg bg-white border border-orange-200 flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span class="text-xs font-black text-orange-700">${item.overall_score}</span>
              <span class="text-[9px] font-bold text-orange-900/60 leading-none">${item.grade_letter}</span>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-bold text-stone-900 truncate flex items-center gap-1.5 flex-wrap">
                <span class="truncate">${item.cat_name}</span>
                ${photoTag}
                ${leaderboardTag}
              </div>
              <div class="text-[11px] text-stone-600 truncate">${item.loaf_rank} &bull; ${item.bread_classification}</div>
              <div class="text-[10px] text-stone-400 mt-0.5">${formattedDate}</div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${item.submitted_entry_id ? `
              <a href="/loaf?id=${encodeURIComponent(item.submitted_entry_id)}" class="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors shadow-2xs flex items-center gap-1" title="View published leaderboard loaf">
                <i data-lucide="trophy" class="w-3 h-3 text-emerald-700"></i>
                <span class="hidden sm:inline">Loaf</span>
              </a>
            ` : ''}
            <button class="view-history-entry-btn px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-100 text-orange-950 text-xs font-bold border border-orange-200 transition-colors shadow-2xs" data-id="${item.id}" aria-label="View inspection for ${item.cat_name}">
              View
            </button>
            <button class="delete-history-entry-btn p-1.5 text-stone-400 hover:text-rose-600 transition-colors" data-id="${item.id}" title="Delete" aria-label="Delete saved inspection for ${item.cat_name}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    refreshIcons();

    historyListContainer.querySelectorAll('.view-history-entry-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const entry = history.find(h => h.id === id);
        if (!entry) return;

        // Clean up previously active preview URLs to prevent memory leaks
        state.photos.forEach(p => {
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        });
        state.photos = [];
        state.userSavedPhotos = [];

        // Clear preset indicators
        state.isExamplePreset = false;
        state.activePresetKey = null;

        // Track loaded history entry ID
        state.loadedHistoryId = id;

        // Try to load full inspection with photos from IndexedDB
        let fullRecord = null;
        try {
          fullRecord = await getInspectionFromIndexedDb(id);
        } catch (dbErr) {
          console.warn('Could not read from IndexedDB:', dbErr);
        }

        const resultToRender = (fullRecord && fullRecord.result) || entry.result;
        state.currentResult = resultToRender;
        state.gradeToken = (fullRecord && fullRecord.grade_token) || entry.grade_token || null;
        state.canSubmit = fullRecord ? (fullRecord.can_submit !== false) : (entry.can_submit !== false);
        state.primaryPhotoIndex = (fullRecord && fullRecord.primary_photo_index !== undefined)
          ? fullRecord.primary_photo_index
          : (entry.primary_photo_index || 0);
        state.submittedEntryId = entry.submitted_entry_id || (fullRecord && fullRecord.submitted_entry_id) || null;

        // Restore photos if available in fullRecord
        if (fullRecord && Array.isArray(fullRecord.photos) && fullRecord.photos.length > 0) {
          state.photos = fullRecord.photos.map((p, idx) => {
            const blob = p.blob;
            const file = blob instanceof File ? blob : new File([blob], p.name || `photo_${idx + 1}.jpg`, { type: p.type || blob.type || 'image/jpeg' });
            return {
              id: `cached_${id}_${idx}`,
              file: file,
              name: p.name || file.name,
              angleType: p.angleType || (idx === 0 ? 'front' : (idx === 1 ? 'side' : (idx === 2 ? 'top' : 'angle'))),
              previewUrl: URL.createObjectURL(file)
            };
          });

          const pIdx = (state.primaryPhotoIndex >= 0 && state.primaryPhotoIndex < state.photos.length) ? state.primaryPhotoIndex : 0;
          state.submittedPhotoBlob = state.photos[pIdx].file;
        } else {
          state.submittedPhotoBlob = null;
        }

        if (catNameInput && entry.result && entry.result.cat_name) {
          catNameInput.value = entry.result.cat_name;
        }

        historyModal.classList.add('hidden');
        renderResults(resultToRender, false);
        updateSubmitButton();
        if (typeof updateSubmitLeaderboardBtnState === 'function') {
          updateSubmitLeaderboardBtnState();
        }
      });
    });

    historyListContainer.querySelectorAll('.delete-history-entry-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        const updated = history.filter(h => h.id !== id);
        localStorage.setItem('loafed_history', JSON.stringify(updated));
        deleteInspectionFromIndexedDb(id).catch(() => {});
        updateHistoryBadge();
        renderHistoryModal();
      });
    });
  }

  if (openHistoryBtn) {
    openHistoryBtn.addEventListener('click', () => {
      markHistoryAsSeen();
      renderHistoryModal();
      historyModal.classList.remove('hidden');
      refreshIcons();
    });
  }

  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', () => {
      historyModal.classList.add('hidden');
    });
  }

  if (dismissHistoryBtn) {
    dismissHistoryBtn.addEventListener('click', () => {
      historyModal.classList.add('hidden');
    });
  }

  if (clearAllHistoryBtn) {
    clearAllHistoryBtn.addEventListener('click', () => {
      localStorage.removeItem('loafed_history');
      localStorage.removeItem('loafed_history_seen_id');
      clearAllInspectionsFromIndexedDb();
      updateHistoryBadge();
      renderHistoryModal();
      showToast({
        type: 'info',
        title: 'History Cleared',
        message: 'All saved local inspections removed.'
      });
    });
  }

  // Legal Modal & Policies (Privacy Policy & Terms of Service)
  const legalModal = document.getElementById('legalModal');
  const closeLegalBtn = document.getElementById('closeLegalBtn');
  const dismissLegalBtn = document.getElementById('dismissLegalBtn');
  const tabPrivacyBtn = document.getElementById('tabPrivacyBtn');
  const tabTermsBtn = document.getElementById('tabTermsBtn');
  const legalModalBody = document.getElementById('legalModalBody');
  const openPrivacyBtn = document.getElementById('openPrivacyBtn');
  const openTermsBtn = document.getElementById('openTermsBtn');

  const privacyPolicyContent = `
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">1. Voluntary Leaderboard & Authentication</h4>
      <p class="text-stone-600 leading-relaxed">Loafed AI is freeware created strictly for feline appreciation and recreational entertainment by <a href="https://redersoft.com" target="_blank" rel="noopener noreferrer" class="text-orange-700 underline font-semibold">RederSoft</a>. You may inspect your cat loaves completely anonymously without creating an account. If you voluntarily choose to publish your cat's loaf to the public Leaderboard, authentication is handled securely via AWS Cognito (supporting Google Sign-In or email). We store solely your public baker display name, email (for account ownership), certified loaf score, and the submitted cat photo.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">2. Complete User Control & Immediate Deletion</h4>
      <p class="text-stone-600 leading-relaxed">You maintain 100% ownership of your submissions. You can delete any individual loaf submission at any time, or permanently delete your entire account and all associated media from our cloud storage with a single click in your Account settings.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">3. In-Memory Evaluation for Non-Leaderboard Loaves</h4>
      <p class="text-stone-600 leading-relaxed">Unless you explicitly opt in and click "Submit to Leaderboard", uploaded cat photographs are streamed in-memory to Google Gemini Vision API solely to generate your real-time posture audit. Unsubmitted photos are never retained on server disks or shared.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">4. Animal Silhouette Analysis & Zero Human Biometrics</h4>
      <p class="text-stone-600 leading-relaxed">Loafed AI processes animal posture contours exclusively. Our system does not scan, extract, retain, or identify human facial geometry, biometric signatures, or personal identity vectors, even if an individual appears incidentally in the background of an audited photograph.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">5. No Tracking, Profiling, or Advertising</h4>
      <p class="text-stone-600 leading-relaxed">We do not employ third-party advertising trackers, cross-site profiling pixels, or marketing analytics. Your browsing activity on this service remains private.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">6. Third-Party AI & Cloud Services</h4>
      <p class="text-stone-600 leading-relaxed">Visual inspection is processed via Google Gemini API in accordance with Google API terms. Authentication and leaderboard storage are hosted on AWS infrastructure (Cognito, DynamoDB, and S3).</p>
    </div>
  `;

  const termsOfServiceContent = `
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">1. Entertainment & Appreciation Purpose</h4>
      <p class="text-stone-600 leading-relaxed">Loafed AI is an open web experiment developed by <a href="https://redersoft.com" target="_blank" rel="noopener noreferrer" class="text-orange-700 underline font-semibold">RederSoft</a> provided as free novelty software. All scores (including aerodynamic drag coefficients, boule symmetry percentages, and dough classifications) are humorous computer vision evaluations intended solely for personal entertainment.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">2. Not Veterinary or Medical Advice</h4>
      <p class="text-stone-600 leading-relaxed">The analysis generated by this engine does not constitute veterinary medical diagnosis, musculoskeletal evaluation, orthopedic assessment, or health advice. If your cat demonstrates sudden changes in resting posture, abnormal weight loss, or tucks its limbs due to pain or illness, please consult a licensed veterinarian immediately.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">3. Age Requirements & Children's Privacy (COPPA / GDPR-K)</h4>
      <p class="text-stone-600 leading-relaxed">This service is intended for users 13 years of age and older (16 in the EEA/UK). If you are under 13, you may only use Loafed AI under direct parental or guardian supervision without creating an account or submitting personal data.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">4. Permitted Content</h4>
      <p class="text-stone-600 leading-relaxed">You agree to submit only images of domestic felines that you own or have permission to inspect. Submissions of unlawful, abusive, infringing, or non-feline graphic content are strictly prohibited.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">5. Fair Use & Abuse Prevention</h4>
      <p class="text-stone-600 leading-relaxed">To ensure this service remains 100% free for everyone, automated scraping, bot submissions, high-frequency script attacks, or attempts to circumvent rate-limiting guardrails are prohibited.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">6. Disclaimer of Warranty ("As-Is")</h4>
      <p class="text-stone-600 leading-relaxed">Loafed AI is provided on an "as-is" and "as-available" basis without warranties of any kind, either express or implied.</p>
    </div>
  `;

  function setLegalTab(tab) {
    if (tab === 'privacy') {
      tabPrivacyBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-50 text-amber-900 border border-amber-200/80';
      tabTermsBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-stone-600 hover:text-stone-900 border border-transparent';
      legalModalBody.innerHTML = privacyPolicyContent;
    } else {
      tabTermsBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-50 text-amber-900 border border-amber-200/80';
      tabPrivacyBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-stone-600 hover:text-stone-900 border border-transparent';
      legalModalBody.innerHTML = termsOfServiceContent;
    }
  }

  function openLegalModal(tab = 'privacy') {
    setLegalTab(tab);
    legalModal.classList.remove('hidden');
    refreshIcons();
  }

  function closeLegalModal() {
    legalModal.classList.add('hidden');
  }

  if (openPrivacyBtn) openPrivacyBtn.addEventListener('click', () => openLegalModal('privacy'));
  if (openTermsBtn) openTermsBtn.addEventListener('click', () => openLegalModal('terms'));
  if (tabPrivacyBtn) tabPrivacyBtn.addEventListener('click', () => setLegalTab('privacy'));
  if (tabTermsBtn) tabTermsBtn.addEventListener('click', () => setLegalTab('terms'));
  if (closeLegalBtn) closeLegalBtn.addEventListener('click', closeLegalModal);
  if (dismissLegalBtn) dismissLegalBtn.addEventListener('click', closeLegalModal);

  // Authentication & PKCE Logic
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
      syncUserSubmissionsFromServer();
      syncSubmitDisplayNameField();
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
      syncSubmitDisplayNameField();
    }
    refreshIcons();
  }

  async function syncUserSubmissionsFromServer() {
    if (!state.idToken) return;
    try {
      const res = await fetch('/api/leaderboard/my-entries', {
        headers: { 'Authorization': `Bearer ${state.idToken}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const entries = data.entries || [];
      if (entries.length > 0) {
        const saved = JSON.parse(localStorage.getItem('loafed_my_submissions') || '[]');
        const history = getSavedHistory();
        let historyChanged = false;

        entries.forEach(sub => {
          if (!saved.includes(sub.entry_id)) {
            saved.push(sub.entry_id);
          }
          const matched = history.find(h =>
            h.result && (h.result.overall_score === sub.overall_score && (h.cat_name === sub.cat_name || (h.result.cat_name && h.result.cat_name === sub.cat_name)))
          );
          if (matched && !matched.submitted_entry_id) {
            matched.submitted_entry_id = sub.entry_id;
            historyChanged = true;
          }
        });

        localStorage.setItem('loafed_my_submissions', JSON.stringify(saved));
        if (historyChanged) {
          localStorage.setItem('loafed_history', JSON.stringify(history));
          updateHistoryBadge();
        }
        updateSubmitLeaderboardBtnState();
      }
    } catch (_) {}
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

    window.history.replaceState({}, document.title, window.location.pathname);
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

  function openAuthModal(defaultMode = 'signin', intent = 'general') {
    if (!authModal) return;
    setAuthMode(defaultMode);
    switchAuthView('main');
    if (authEmailInput) authEmailInput.value = '';
    if (authPasswordInput) authPasswordInput.value = '';
    if (authNameInput) authNameInput.value = '';

    const isLeaderboardIntent = intent === 'leaderboard_submit' || (state.pendingLeaderboardIntent && state.currentResult && state.currentResult.is_cat !== false);
    if (isLeaderboardIntent && state.currentResult) {
      if (authModalTitle) authModalTitle.textContent = defaultMode === 'signup' ? 'Sign Up to Publish Loaf' : 'Sign In to Publish Loaf';
      if (authModalSubtitle) {
        authModalSubtitle.textContent = `Sign in or create an account to publish ${state.currentResult.cat_name || 'your cat'} to the public leaderboard!`;
      }
      if (authPendingLoafBadge) {
        authPendingLoafBadge.textContent = `${state.currentResult.cat_name || 'Loaf'} • ${state.currentResult.overall_score || 0} ${state.currentResult.grade_letter || ''}`;
        authPendingLoafBadge.classList.remove('hidden');
      }
    } else {
      if (authModalTitle) authModalTitle.textContent = defaultMode === 'signup' ? 'Create Baker Account' : 'Sign In to Loafed AI';
      if (authModalSubtitle) {
        authModalSubtitle.textContent = defaultMode === 'signup' 
          ? 'Join the cat loaf bakery club and register your loaves on the public leaderboard.'
          : 'Publish certified cat loaves to the public leaderboard and earn bakery titles.';
      }
      if (authPendingLoafBadge) authPendingLoafBadge.classList.add('hidden');
    }

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
    if (authPendingLoafBadge) authPendingLoafBadge.classList.add('hidden');
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

    // Seamless auto-open submit modal if user signed in specifically to publish their loaf
    if (state.pendingLeaderboardIntent && state.currentResult && state.currentResult.is_cat !== false) {
      state.pendingLeaderboardIntent = false;
      setTimeout(() => {
        openSubmitModal();
      }, 250);
    }
  }

  // Leaderboard Modal Logic
  function setLeaderboardPeriodTab(period) {
    state.leaderboardPeriod = period;
    const tabs = [
      { id: tabPeriodAll, key: 'all' },
      { id: tabPeriodMonth, key: 'month' },
      { id: tabPeriodWeek, key: 'week' },
      { id: tabPeriodMine, key: 'mine' }
    ];

    tabs.forEach(t => {
      if (!t.id) return;
      if (t.key === period) {
        t.id.className = 'flex-1 py-1.5 px-3 rounded-lg transition-all bg-white text-orange-950 shadow-2xs border border-orange-200/60 font-bold';
      } else {
        t.id.className = 'flex-1 py-1.5 px-3 rounded-lg transition-all text-stone-600 hover:text-stone-900 border border-transparent font-bold';
      }
    });
  }

  function renderLeaderboardList(entries, isMine = false) {
    if (!leaderboardList) return;
    if (!entries || entries.length === 0) {
      leaderboardList.innerHTML = `
        <div class="py-12 text-center text-stone-500">
          <div class="w-12 h-12 rounded-xl bg-orange-100/70 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto mb-2">
            <i data-lucide="inbox" class="w-6 h-6"></i>
          </div>
          <p class="text-xs font-bold text-stone-700">No submissions recorded yet</p>
          <p class="text-[11px] text-stone-500 mt-0.5">${isMine ? 'You have not submitted any loaves to the leaderboard yet.' : 'Be the first baker to audit and submit a cat loaf for this period!'}</p>
        </div>
      `;
      refreshIcons();
      return;
    }

    leaderboardList.innerHTML = entries.map((entry, idx) => {
      const rank = entry.rank || (idx + 1);
      let rankBadge = '';
      if (rank === 1) {
        rankBadge = '<span class="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 flex items-center justify-center text-xs font-black shadow-xs border border-amber-400">1</span>';
      } else if (rank === 2) {
        rankBadge = '<span class="w-7 h-7 rounded-xl bg-gradient-to-br from-stone-200 to-stone-400 text-stone-800 flex items-center justify-center text-xs font-black shadow-xs border border-stone-300">2</span>';
      } else if (rank === 3) {
        rankBadge = '<span class="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 text-amber-50 flex items-center justify-center text-xs font-black shadow-xs border border-amber-700">3</span>';
      } else {
        rankBadge = `<span class="w-7 h-7 rounded-xl bg-orange-50 text-stone-700 flex items-center justify-center text-xs font-bold border border-orange-200">${rank}</span>`;
      }

      const thumb = entry.thumbnail_url || '/static/logo.png';
      const catName = escapeHtml(entry.cat_name || 'Anonymous Loaf');
      const bakerName = escapeHtml(entry.display_name || 'Baker');
      const score = entry.overall_score || 0;
      const gradeLetter = entry.grade_letter || '';
      const loafRank = escapeHtml(entry.loaf_rank || 'Artisan Loaf');

      let actionBtn = '';
      if (isMine) {
        actionBtn = `
          <button class="delete-loaf-btn p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-2" data-id="${entry.entry_id}" data-name="${catName}" aria-label="Delete ${catName} submission">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        `;
      } else {
        actionBtn = `
          <button class="report-loaf-btn p-1.5 rounded-lg text-stone-300 hover:text-amber-700 hover:bg-orange-50 transition-colors ml-2" data-id="${entry.entry_id}" data-score="${score}" data-name="${catName}" aria-label="Report ${catName} submission" title="Report submission as inappropriate or non-cat">
            <i data-lucide="flag" class="w-4 h-4"></i>
          </button>
        `;
      }

      return `
        <div class="p-3 rounded-2xl bg-white border border-orange-200/90 hover:border-amber-400 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
          <div class="shrink-0 flex items-center justify-center">
            ${rankBadge}
          </div>
          <img src="${thumb}" alt="${catName}" class="w-12 h-12 rounded-xl object-cover border border-orange-200/80 bg-orange-50 shrink-0 leaderboard-photo-img" loading="lazy" decoding="async">
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <h4 class="font-extrabold text-xs sm:text-sm text-stone-900 truncate">${catName}</h4>
              <span class="stamp text-[11px] font-black text-orange-700 bg-white border-orange-700 shrink-0">${score} ${gradeLetter}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5 truncate">
              <span class="text-orange-950 font-bold truncate">${loafRank}</span>
              <span>&bull;</span>
              <span class="truncate">by ${bakerName}</span>
            </div>
          </div>
          ${actionBtn}
        </div>
      `;
    }).join('');

    refreshIcons();

    if (isMine) {
      leaderboardList.querySelectorAll('.delete-loaf-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const name = e.currentTarget.getAttribute('data-name') || 'this loaf';
          if (!id) return;
          const confirmed = await showConfirmModal({
            title: 'Remove Loaf Submission?',
            subtitle: 'Leaderboard Removal',
            message: `Are you sure you want to remove "${name}" from the public leaderboard?`,
            confirmText: 'Remove Loaf',
            confirmIcon: 'trash-2',
            isDanger: true
          });
          if (!confirmed) return;
          try {
            const res = await fetch(`/api/leaderboard/entry/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${state.idToken}` }
            });
            if (res.ok) {
              showToast({ type: 'info', title: 'Loaf Removed', message: 'Leaderboard submission deleted.' });
              loadLeaderboardEntries('mine');
            } else {
              showToast({ type: 'error', title: 'Delete Error', message: 'Failed to delete submission.' });
            }
          } catch (err) {
            showToast({ type: 'error', title: 'Delete Error', message: err.message });
          }
        });
      });
    } else {
      leaderboardList.querySelectorAll('.report-loaf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const score = e.currentTarget.getAttribute('data-score');
          const name = e.currentTarget.getAttribute('data-name');
          if (!id) return;
          openReportModal(id, score, name);
        });
      });
    }
  }

  async function loadLeaderboardEntries(period = 'all') {
    setLeaderboardPeriodTab(period);
    if (!leaderboardList) return;
    leaderboardList.innerHTML = `
      <div class="py-12 text-center text-stone-400">
        <i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto text-orange-600 mb-2"></i>
        <p class="text-xs">Loading loaf rankings...</p>
      </div>
    `;
    refreshIcons();

    if (period === 'mine') {
      if (!state.user || !state.idToken) {
        leaderboardList.innerHTML = `
          <div class="py-12 text-center text-stone-500">
            <div class="w-12 h-12 rounded-xl bg-orange-100/70 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto mb-2">
              <i data-lucide="lock" class="w-6 h-6"></i>
            </div>
            <p class="text-xs font-bold text-stone-800">Sign in to view your submitted loaves</p>
            <button id="leaderboardSignInPromptBtn" class="mt-3 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-all">
              Sign In
            </button>
          </div>
        `;
        refreshIcons();
        const pBtn = document.getElementById('leaderboardSignInPromptBtn');
        if (pBtn) pBtn.addEventListener('click', () => {
          leaderboardModal.classList.add('hidden');
          openAuthModal();
        });
        return;
      }

      try {
        const res = await fetch('/api/leaderboard/my-entries', {
          headers: { 'Authorization': `Bearer ${state.idToken}` }
        });
        if (!res.ok) throw new Error('Could not load entries');
        const data = await res.json();
        renderLeaderboardList(data.entries || [], true);
      } catch (err) {
        leaderboardList.innerHTML = `<p class="py-8 text-center text-xs text-red-500">${err.message}</p>`;
      }
      return;
    }

    try {
      const res = await fetch(`/api/leaderboard?period=${period}`);
      if (!res.ok) throw new Error('Failed to retrieve rankings');
      const data = await res.json();
      renderLeaderboardList(data.entries || [], false);
    } catch (err) {
      leaderboardList.innerHTML = `<p class="py-8 text-center text-xs text-red-500">${err.message}</p>`;
    }
  }

  function openLeaderboardModal(period = 'all') {
    if (period && period !== 'all') {
      window.location.href = `/leaderboard?period=${period}`;
    } else {
      window.location.href = '/leaderboard';
    }
  }

  function closeLeaderboardModal() {
    if (leaderboardModal) leaderboardModal.classList.add('hidden');
  }

  // Submit Modal Logic & Safety Filters
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

  // ==========================================================================
  // Fun Feline & Bakery GamerTag / Display Name Generator
  // ==========================================================================
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
  }

  function showSubmitNotice(msg) {
    if (!submitModalNotice) return;
    submitModalNotice.textContent = msg;
    submitModalNotice.classList.remove('hidden');
  }

  function hideSubmitNotice() {
    if (!submitModalNotice) return;
    submitModalNotice.textContent = '';
    submitModalNotice.classList.add('hidden');
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

  function syncSubmitDisplayNameField() {
    const signedIn = Boolean(state.user);
    const hintEl = document.getElementById('submitDisplayNameHint');

    if (submitDisplayNameInput) {
      if (signedIn) {
        submitDisplayNameInput.value = (state.user.name || '').trim();
        submitDisplayNameInput.readOnly = true;
        submitDisplayNameInput.setAttribute('aria-readonly', 'true');
      } else {
        submitDisplayNameInput.readOnly = false;
        submitDisplayNameInput.removeAttribute('aria-readonly');
      }
    }

    if (rollSubmitBakerTagBtn) {
      rollSubmitBakerTagBtn.classList.toggle('hidden', signedIn);
      rollSubmitBakerTagBtn.disabled = signedIn;
    }

    if (hintEl) {
      hintEl.textContent = signedIn
        ? 'Your baker tag is set on your profile (or when you sign up). Update it from Profile — not here.'
        : 'Your baker gamertag displayed alongside your cat on the leaderboard.';
    }
  }

  function getSubmitFormValidation() {
    const catName = submitCatNameInput ? submitCatNameInput.value.trim() : '';
    const displayName = state.user
      ? (state.user.name || '').trim()
      : (submitDisplayNameInput ? submitDisplayNameInput.value.trim() : '');
    const consent = submitConsentCheckbox ? submitConsentCheckbox.checked : false;

    const catErr = validateLeaderboardField(catName, "Cat's Name", 2, 40);
    if (catErr) return { valid: false, error: catErr, catName, displayName };

    const displayErr = validateLeaderboardField(displayName, "Public Baker Display Name", 2, 30);
    if (displayErr) return { valid: false, error: displayErr, catName, displayName };

    if (!consent) {
      return { valid: false, error: 'Please check the consent box to confirm publishing.', catName, displayName };
    }

    return { valid: true, error: null, catName, displayName };
  }

  function getSubmittedEntryIdForCurrentLoaf() {
    if (state.submittedEntryId) return state.submittedEntryId;

    if (state.gradeToken) {
      try {
        const tokenMap = JSON.parse(localStorage.getItem('loafed_submitted_tokens') || '{}');
        if (tokenMap[state.gradeToken]) {
          state.submittedEntryId = tokenMap[state.gradeToken];
          return state.submittedEntryId;
        }
      } catch (_) {}
    }

    const history = getSavedHistory();
    if (state.loadedHistoryId) {
      const entry = history.find(h => h.id === state.loadedHistoryId);
      if (entry && entry.submitted_entry_id) {
        state.submittedEntryId = entry.submitted_entry_id;
        return state.submittedEntryId;
      }
    }

    if (state.currentResult) {
      const entry = history.find(h =>
        (state.gradeToken && h.grade_token === state.gradeToken) ||
        (h.result && h.result.overall_score === state.currentResult.overall_score &&
         (h.cat_name === state.currentResult.cat_name || (h.result.cat_name && h.result.cat_name === state.currentResult.cat_name)) &&
         h.submitted_entry_id)
      );
      if (entry && entry.submitted_entry_id) {
        state.submittedEntryId = entry.submitted_entry_id;
        return state.submittedEntryId;
      }
    }

    return null;
  }

  function markLoafAsSubmitted(entryId, details = {}) {
    if (!entryId) return;
    state.submittedEntryId = entryId;

    // 1. List of user submission IDs
    try {
      const list = JSON.parse(localStorage.getItem('loafed_my_submissions') || '[]');
      if (!list.includes(entryId)) {
        list.push(entryId);
        localStorage.setItem('loafed_my_submissions', JSON.stringify(list));
      }
    } catch (_) {}

    // 2. Token mapping
    try {
      const tokenMap = JSON.parse(localStorage.getItem('loafed_submitted_tokens') || '{}');
      if (state.gradeToken) {
        tokenMap[state.gradeToken] = entryId;
      }
      if (details.gradeToken) {
        tokenMap[details.gradeToken] = entryId;
      }
      localStorage.setItem('loafed_submitted_tokens', JSON.stringify(tokenMap));
    } catch (_) {}

    // 3. Update localStorage history
    try {
      const history = getSavedHistory();
      const catName = details.catName || (state.currentResult && state.currentResult.cat_name);
      const target = history.find(h =>
        (state.loadedHistoryId && h.id === state.loadedHistoryId) ||
        (details.historyId && h.id === details.historyId) ||
        (state.gradeToken && h.grade_token === state.gradeToken) ||
        (catName && (h.cat_name === catName || (h.result && h.result.cat_name === catName)))
      );
      if (target) {
        target.submitted_entry_id = entryId;
        localStorage.setItem('loafed_history', JSON.stringify(history));
        if (target.id) {
          updateInspectionInIndexedDb(target.id, { submitted_entry_id: entryId }).catch(() => {});
        }
      }
    } catch (_) {}

    // 4. Update UI button and badges
    updateSubmitLeaderboardBtnState();
    updateHistoryBadge();
  }

  function updateSubmitLeaderboardBtnState() {
    if (!submitLeaderboardBtn) return;
    if (!state.currentResult || state.currentResult.is_cat === false || state.isExamplePreset || state.canSubmit === false) {
      submitLeaderboardBtn.classList.add('hidden');
      return;
    }

    const entryId = getSubmittedEntryIdForCurrentLoaf();
    if (entryId) {
      submitLeaderboardBtn.classList.remove('hidden');
      submitLeaderboardBtn.disabled = false;
      submitLeaderboardBtn.className = 'w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs border border-emerald-600 transition-all flex items-center justify-center gap-2 shadow-2xs btn-tactile cursor-pointer';
      submitLeaderboardBtn.innerHTML = `
        <i data-lucide="trophy" class="w-4 h-4 text-amber-200"></i>
        <span>View on Leaderboard</span>
        <i data-lucide="external-link" class="w-3.5 h-3.5 text-emerald-200 ml-0.5"></i>
      `;
      submitLeaderboardBtn.title = `View official leaderboard entry #${entryId}`;
      refreshIcons();
    } else {
      submitLeaderboardBtn.classList.remove('hidden');
      submitLeaderboardBtn.disabled = false;
      submitLeaderboardBtn.className = 'btn-submit-leaderboard shimmer-btn btn-tactile';
      submitLeaderboardBtn.innerHTML = `
        <i data-lucide="trophy" class="w-4 h-4 text-amber-200"></i>
        <span>Submit to Leaderboard</span>
      `;
      submitLeaderboardBtn.title = 'Submit to Official Leaderboard';
      refreshIcons();
    }
  }

  function updateSubmitButtonState() {
    const catName = submitCatNameInput ? submitCatNameInput.value.trim() : '';
    if (submitModalCatName) {
      submitModalCatName.textContent = catName || 'Cat Name';
    }

    const { valid } = getSubmitFormValidation();
    const hasPhoto = Boolean(state.submittedPhotoBlob || (state.photos && state.photos.length > 0 && state.photos[0].file));
    if (confirmSubmitLeaderboardBtn) {
      confirmSubmitLeaderboardBtn.disabled = !valid || !hasPhoto;
    }
  }

  function openSubmitModal() {
    if (!state.currentResult || !submitModal) return;
    if (state.isExamplePreset || state.canSubmit === false) {
      showToast({
        type: 'warning',
        title: 'Benchmark Reference',
        message: 'Benchmark example cats cannot be submitted to the leaderboard. You can only submit a cat you uploaded yourself!'
      });
      return;
    }

    const alreadySubmittedId = getSubmittedEntryIdForCurrentLoaf();
    if (alreadySubmittedId) {
      const shareUrl = `${window.location.origin}/loaf?id=${encodeURIComponent(alreadySubmittedId)}`;
      if (submitSuccessCatName) submitSuccessCatName.textContent = state.currentResult.cat_name || 'Your Cat';
      if (submitSuccessScoreBadge) submitSuccessScoreBadge.textContent = `${state.currentResult.overall_score} ${state.currentResult.grade_letter || ''}`;
      if (submitSuccessRank) submitSuccessRank.textContent = state.currentResult.loaf_rank || 'Artisan Loaf';
      if (submitSuccessShareUrl) submitSuccessShareUrl.value = shareUrl;
      if (submitSuccessViewLeaderboardBtn) submitSuccessViewLeaderboardBtn.href = `/loaf?id=${encodeURIComponent(alreadySubmittedId)}`;
      if (submitSuccessMessage) submitSuccessMessage.textContent = `${state.currentResult.cat_name || 'Your cat'} is officially published on the Leaderboard. Share your certified scorecard with friends!`;
      if (submitModalFormView) submitModalFormView.classList.add('hidden');
      if (submitSuccessView) submitSuccessView.classList.remove('hidden');
      submitModal.classList.remove('hidden');
      refreshIcons();
      return;
    }

    if (submitModalFormView) submitModalFormView.classList.remove('hidden');
    if (submitSuccessView) submitSuccessView.classList.add('hidden');

    const initialCatName = (state.currentResult.cat_name && state.currentResult.cat_name !== 'Anonymous Loaf') 
      ? state.currentResult.cat_name 
      : '';
    if (submitCatNameInput) submitCatNameInput.value = initialCatName;
    if (submitModalCatName) submitModalCatName.textContent = initialCatName || 'Cat Name';
    if (submitModalScoreBadge) submitModalScoreBadge.textContent = `${state.currentResult.overall_score} ${state.currentResult.grade_letter}`;
    if (submitModalRank) submitModalRank.textContent = state.currentResult.loaf_rank || 'Artisan Loaf';
    if (submitModalBread) submitModalBread.textContent = state.currentResult.bread_classification || 'Brioche';
    syncSubmitDisplayNameField();
    if (submitConsentCheckbox) submitConsentCheckbox.checked = false;
    hideSubmitNotice();

    // Check if photo is present or missing from local cache
    const hasPhoto = Boolean(state.submittedPhotoBlob || (state.photos && state.photos.length > 0 && state.photos[0].file));
    const photoPickerBox = document.getElementById('submitModalPhotoPickerBox');
    if (photoPickerBox) {
      if (!hasPhoto) {
        photoPickerBox.classList.remove('hidden');
        const pickedNameEl = document.getElementById('submitModalPhotoPickedName');
        if (pickedNameEl) pickedNameEl.textContent = 'No photo attached';
      } else {
        photoPickerBox.classList.add('hidden');
      }
    }

    if (submitModalThumbnail) {
      const pIdx = (state.primaryPhotoIndex !== null && state.primaryPhotoIndex >= 0 && state.primaryPhotoIndex < state.photos.length) ? state.primaryPhotoIndex : 0;
      if (state.photos.length > pIdx && state.photos[pIdx].previewUrl) {
        submitModalThumbnail.src = state.photos[pIdx].previewUrl;
      } else if (state.photos.length > 0 && state.photos[0].previewUrl) {
        submitModalThumbnail.src = state.photos[0].previewUrl;
      } else {
        submitModalThumbnail.src = '/static/logo.webp';
      }
    }

    updateSubmitButtonState();
    submitModal.classList.remove('hidden');
    refreshIcons();
  }

  function closeSubmitModal() {
    if (submitModal) submitModal.classList.add('hidden');
    hideSubmitNotice();
  }

  const submitModalPhotoFilePicker = document.getElementById('submitModalPhotoFilePicker');
  if (submitModalPhotoFilePicker) {
    submitModalPhotoFilePicker.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const optimized = await optimizeImage(file);
        state.submittedPhotoBlob = optimized;
        const previewUrl = URL.createObjectURL(optimized);
        state.photos = [{
          id: 'reattached_photo_' + Date.now(),
          file: optimized,
          previewUrl: previewUrl,
          name: file.name,
          angleType: 'front'
        }];
        state.primaryPhotoIndex = 0;

        if (submitModalThumbnail) {
          submitModalThumbnail.src = previewUrl;
        }
        const pickedNameEl = document.getElementById('submitModalPhotoPickedName');
        if (pickedNameEl) {
          pickedNameEl.textContent = file.name;
        }

        // Cache into IndexedDB for current history entry if available
        if (state.loadedHistoryId) {
          try {
            await saveInspectionToIndexedDb({
              id: state.loadedHistoryId,
              result: state.currentResult,
              grade_token: state.gradeToken,
              can_submit: state.canSubmit,
              primary_photo_index: 0,
              timestamp: new Date().toISOString(),
              photos: [{
                blob: optimized,
                name: file.name,
                type: optimized.type || 'image/jpeg',
                angleType: 'front'
              }]
            });
            const history = getSavedHistory();
            const hItem = history.find(h => h.id === state.loadedHistoryId);
            if (hItem) {
              hItem.has_cached_photos = true;
              localStorage.setItem('loafed_history', JSON.stringify(history));
            }
          } catch (dbErr) {
            console.warn('Could not cache attached photo in IndexedDB:', dbErr);
          }
        }

        hideSubmitNotice();
        updateSubmitButtonState();
        refreshIcons();
      } catch (err) {
        showSubmitNotice('Could not process selected image: ' + err.message);
      }
    });
  }

  if (submitCatNameInput) {
    submitCatNameInput.addEventListener('input', () => {
      hideSubmitNotice();
      updateSubmitButtonState();
    });
  }

  if (submitDisplayNameInput) {
    submitDisplayNameInput.addEventListener('input', () => {
      if (state.user) return;
      hideSubmitNotice();
      updateSubmitButtonState();
    });
  }

  if (submitConsentCheckbox) {
    submitConsentCheckbox.addEventListener('change', () => {
      hideSubmitNotice();
      updateSubmitButtonState();
    });
  }

  if (rollSubmitBakerTagBtn) {
    rollSubmitBakerTagBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.user) return;
      handleRollGamerTag(submitDisplayNameInput, rollSubmitBakerTagBtn);
    });
  }

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

  if (confirmSubmitLeaderboardBtn) {
    confirmSubmitLeaderboardBtn.addEventListener('click', async () => {
      if (!state.user || !state.idToken) {
        openAuthModal();
        return;
      }

      if (state.isExamplePreset || state.canSubmit === false) {
        showSubmitNotice('Benchmark example cats cannot be submitted to the leaderboard. You can only submit a cat you uploaded yourself.');
        confirmSubmitLeaderboardBtn.disabled = false;
        confirmSubmitLeaderboardBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Confirm & Publish</span>';
        refreshIcons();
        return;
      }

      const validation = getSubmitFormValidation();
      if (!validation.valid) {
        showSubmitNotice(validation.error);
        return;
      }

      confirmSubmitLeaderboardBtn.disabled = true;
      confirmSubmitLeaderboardBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Publishing...</span>';
      refreshIcons();

      try {
        let photoFile = state.submittedPhotoBlob;
        const pIdx = (state.primaryPhotoIndex !== null && state.primaryPhotoIndex >= 0 && state.primaryPhotoIndex < state.photos.length) ? state.primaryPhotoIndex : 0;
        if (!photoFile && state.photos.length > pIdx && state.photos[pIdx].file) {
          photoFile = state.photos[pIdx].file;
        } else if (!photoFile && state.photos.length > 0 && state.photos[0].file) {
          photoFile = state.photos[0].file;
        }

        if (!photoFile) {
          throw new Error('The original photo file is not stored in your local browser cache for this past inspection. To publish to the leaderboard, please re-upload and inspect your cat in the inspector bay.');
        }

        let gradeToken = state.gradeToken;
        if (!gradeToken) {
          throw new Error('A verified inspection grade token is required. Please re-run inspection to generate a valid certification token.');
        }

        // Validate token age client-side to prevent unexpected network roundtrips
        if (gradeToken.includes('.')) {
          try {
            const rawPayload = gradeToken.split('.')[0];
            const tokenData = JSON.parse(atob(rawPayload.replace(/-/g, '+').replace(/_/g, '/')));
            if (tokenData && tokenData.ts) {
              const ageSeconds = (Date.now() / 1000) - tokenData.ts;
              if (ageSeconds > 86400) {
                throw new Error('Leaderboard certification tokens expire after 24 hours. Please run a quick re-inspection of your cat to submit.');
              }
            }
          } catch (tokErr) {
            if (tokErr.message && tokErr.message.includes('expire')) {
              throw tokErr;
            }
          }
        }

        const submitForm = new FormData();
        submitForm.append('grade_token', gradeToken);
        submitForm.append('cat_name', validation.catName);
        // The API derives this from the authenticated profile. Anonymous users
        // still provide the name chosen in the submit modal.
        if (!state.user) {
          submitForm.append('display_name', validation.displayName);
        }
        submitForm.append('primary_photo_index', pIdx);

        if (state.photos && state.photos.length > 0) {
          state.photos.forEach(p => {
            if (p.file) submitForm.append('photos', p.file);
          });
          const labels = state.photos.map(p => {
            if (p.angleType === 'front') return 'Front View';
            if (p.angleType === 'side') return 'Side Profile';
            if (p.angleType === 'top') return 'Overhead (Top) View';
            return p.name || 'Perspective Angle';
          });
          submitForm.append('photo_labels', JSON.stringify(labels));
        } else if (photoFile) {
          submitForm.append('photo', photoFile);
        }

        const subRes = await fetch('/api/leaderboard/submit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.idToken}`
          },
          body: submitForm
        });

        let subData;
        try {
          subData = await subRes.json();
        } catch (_) {
          const errMsg = subRes.status === 413 ? 'Photos payload exceeded submission size limit.' : `Leaderboard submission failed (HTTP ${subRes.status}).`;
          showSubmitNotice(errMsg);
          throw new Error(errMsg);
        }

        // Handle duplicate submission prevented by backend
        if (subRes.status === 409 || (subData && subData.already_submitted)) {
          const existingId = (subData && subData.entry_id) || state.submittedEntryId;
          markLoafAsSubmitted(existingId, { catName: validation.catName });

          const shareUrl = `${window.location.origin}/loaf?id=${encodeURIComponent(existingId)}`;
          if (submitSuccessCatName) submitSuccessCatName.textContent = validation.catName;
          if (submitSuccessThumb) submitSuccessThumb.src = (submitModalThumbnail ? submitModalThumbnail.src : '/static/logo.webp');
          if (submitSuccessScoreBadge) submitSuccessScoreBadge.textContent = `${(subData && subData.score) || (state.currentResult ? state.currentResult.overall_score : 90)} ${state.currentResult ? state.currentResult.grade_letter : ''}`;
          if (submitSuccessRank) submitSuccessRank.textContent = state.currentResult ? state.currentResult.loaf_rank : 'Artisan Loaf';
          if (submitSuccessShareUrl) submitSuccessShareUrl.value = shareUrl;
          if (submitSuccessViewLeaderboardBtn) submitSuccessViewLeaderboardBtn.href = `/loaf?id=${encodeURIComponent(existingId)}`;
          if (submitSuccessMessage) {
            submitSuccessMessage.textContent = `${validation.catName} has already been officially published to the Leaderboard (Entry #${existingId}). Share your certified scorecard with friends!`;
          }

          if (submitModalFormView) submitModalFormView.classList.add('hidden');
          if (submitSuccessView) submitSuccessView.classList.remove('hidden');
          updateSubmitLeaderboardBtnState();

          showToast({
            type: 'info',
            title: 'Already on Leaderboard',
            message: `${validation.catName} is already on the leaderboard! (Entry #${existingId})`
          });
          refreshIcons();
          return;
        }

        if (!subRes.ok) {
          const errMsg = (subData && (subData.detail || subData.message)) || (subRes.status === 413 ? 'Photos payload exceeded size limit.' : 'Leaderboard submission failed.');
          showSubmitNotice(errMsg);
          throw new Error(errMsg);
        }

        markLoafAsSubmitted(subData.entry_id, { catName: validation.catName });

        // Populate success view
        const shareUrl = `${window.location.origin}/loaf?id=${encodeURIComponent(subData.entry_id)}`;
        if (submitSuccessCatName) submitSuccessCatName.textContent = subData.cat_name || 'Your Cat';
        if (submitSuccessThumb) submitSuccessThumb.src = subData.thumbnail_url || (submitModalThumbnail ? submitModalThumbnail.src : '/static/logo.webp');
        if (submitSuccessScoreBadge) submitSuccessScoreBadge.textContent = `${subData.score} ${state.currentResult ? state.currentResult.grade_letter : ''}`;
        if (submitSuccessRank) submitSuccessRank.textContent = state.currentResult ? state.currentResult.loaf_rank : 'Artisan Loaf';
        if (submitSuccessShareUrl) submitSuccessShareUrl.value = shareUrl;
        if (submitSuccessViewLeaderboardBtn) submitSuccessViewLeaderboardBtn.href = `/loaf?id=${encodeURIComponent(subData.entry_id)}`;
        if (submitSuccessMessage) submitSuccessMessage.textContent = `${subData.cat_name || 'Your cat'} has been officially published to the Leaderboard. Share your certified scorecard with friends!`;

        // Switch to success view inside modal
        if (submitModalFormView) submitModalFormView.classList.add('hidden');
        if (submitSuccessView) submitSuccessView.classList.remove('hidden');

        // Update submit button on scorecard
        updateSubmitLeaderboardBtnState();

        showToast({
          type: 'success',
          title: 'Published to Leaderboard!',
          message: `${subData.cat_name || 'Your cat'} is now live on the Leaderboard! Click below to share the link.`
        });
        refreshIcons();
      } catch (err) {
        console.error('Submission error:', err);
        showToast({ type: 'error', title: 'Submission Failed', message: err.message || 'Failed to submit loaf.' });
      } finally {
        confirmSubmitLeaderboardBtn.disabled = false;
        confirmSubmitLeaderboardBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Confirm & Publish</span>';
        updateSubmitButtonState();
        refreshIcons();
      }
    });

    if (copySubmitSuccessUrlBtn && submitSuccessShareUrl) {
      copySubmitSuccessUrlBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(submitSuccessShareUrl.value);
          showToast({
            type: 'success',
            title: 'Link Copied',
            message: 'Shareable loaf link copied to clipboard!'
          });
        } catch (_) {
          submitSuccessShareUrl.select();
          document.execCommand('copy');
          showToast({
            type: 'success',
            title: 'Link Copied',
            message: 'Shareable loaf link copied to clipboard!'
          });
        }
      });
    }

    if (shareSuccessNativeBtn) {
      shareSuccessNativeBtn.addEventListener('click', async () => {
        if (!state.submittedEntryId) return;
        const shareUrl = `${window.location.origin}/loaf?id=${encodeURIComponent(state.submittedEntryId)}`;
        const cat = (state.currentResult && state.currentResult.cat_name) || 'My Cat';
        const score = (state.currentResult && state.currentResult.overall_score) || '';
        const grade = (state.currentResult && state.currentResult.grade_letter) || '';
        const shareData = {
          title: `${cat} — Official Loaf Score`,
          text: `Check out ${cat}'s certified loaf score (${score} ${grade}) on Loafed AI!`,
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
            title: 'Link Copied',
            message: 'Shareable loaf link copied to clipboard!'
          });
        } catch (_) {
          openCopyLinkModal(shareUrl, 'Cat Loaf');
        }
      });
    }
  }

  // Event Listeners for Leaderboard & Auth
  if (openLeaderboardBtn) openLeaderboardBtn.addEventListener('click', () => openLeaderboardModal('all'));
  if (closeLeaderboardBtn) closeLeaderboardBtn.addEventListener('click', closeLeaderboardModal);
  if (dismissLeaderboardBtn) dismissLeaderboardBtn.addEventListener('click', closeLeaderboardModal);

  if (tabPeriodAll) tabPeriodAll.addEventListener('click', () => loadLeaderboardEntries('all'));
  if (tabPeriodMonth) tabPeriodMonth.addEventListener('click', () => loadLeaderboardEntries('month'));
  if (tabPeriodWeek) tabPeriodWeek.addEventListener('click', () => loadLeaderboardEntries('week'));
  if (tabPeriodMine) tabPeriodMine.addEventListener('click', () => loadLeaderboardEntries('mine'));

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

  if (authOpenTermsBtn) {
    authOpenTermsBtn.addEventListener('click', () => {
      closeAuthModal();
      openLegalModal('terms');
    });
  }
  if (authOpenPrivacyBtn) {
    authOpenPrivacyBtn.addEventListener('click', () => {
      closeAuthModal();
      openLegalModal('privacy');
    });
  }

  function openDisqualificationModal(reason) {
    if (!disqualificationModal) return;
    const noteEl = document.getElementById('disqualificationModalAuditorNote');
    const reasonEl = document.getElementById('disqualificationModalReason');
    if (noteEl) {
      noteEl.textContent = `"${reason || 'Disqualification: Non-feline subject detected.'}"`;
    }
    if (reasonEl) {
      reasonEl.textContent = reason || 'This photograph was audited as a non-feline subject. To preserve competition integrity, only authentic living domestic feline loaves can be certified and published to the public Leaderboard.';
    }
    disqualificationModal.classList.remove('hidden');
    refreshIcons();
  }

  function closeDisqualificationModal() {
    if (disqualificationModal) disqualificationModal.classList.add('hidden');
  }

  if (closeDisqualificationModalBtn) {
    closeDisqualificationModalBtn.addEventListener('click', closeDisqualificationModal);
  }
  if (dismissDisqualificationModalBtn) {
    dismissDisqualificationModalBtn.addEventListener('click', closeDisqualificationModal);
  }
  if (disqualificationTryAgainModalBtn) {
    disqualificationTryAgainModalBtn.addEventListener('click', () => {
      closeDisqualificationModal();
      collapseResultsSection(true);
    });
  }
  if (disqualificationModal) {
    disqualificationModal.addEventListener('click', (e) => {
      if (e.target === disqualificationModal) closeDisqualificationModal();
    });
  }

  if (submitLeaderboardBtn) {
    submitLeaderboardBtn.addEventListener('click', () => {
      if (!state.currentResult) {
        showToast({ type: 'warning', title: 'No Loaf Graded', message: 'Please grade a cat loaf before submitting to the leaderboard.' });
        return;
      }
      if (state.isExamplePreset || state.canSubmit === false) {
        showToast({
          type: 'warning',
          title: 'Benchmark Reference',
          message: 'Benchmark example cats cannot be submitted to the leaderboard. You can only submit a cat you uploaded yourself!'
        });
        return;
      }
      if (state.currentResult.is_cat === false) {
        openDisqualificationModal(state.currentResult.rejection_reason);
        return;
      }

      // Check if already submitted to leaderboard
      const alreadySubmittedId = getSubmittedEntryIdForCurrentLoaf();
      if (alreadySubmittedId) {
        window.location.href = `/loaf?id=${encodeURIComponent(alreadySubmittedId)}`;
        return;
      }

      // Check if grade token is expired (> 24 hours)
      if (state.gradeToken && state.gradeToken.includes('.')) {
        try {
          const rawPayload = state.gradeToken.split('.')[0];
          const tokenData = JSON.parse(atob(rawPayload.replace(/-/g, '+').replace(/_/g, '/')));
          if (tokenData && tokenData.ts && (Date.now() / 1000 - tokenData.ts > 86400)) {
            showToast({
              type: 'warning',
              title: 'Inspection Expired',
              message: 'Leaderboard certification tokens expire after 24 hours. Please run a quick re-inspection of your cat to submit.'
            });
            return;
          }
        } catch (_) {}
      }

      if (!state.user) {
        state.pendingLeaderboardIntent = true;
        openAuthModal('signup', 'leaderboard_submit');
        return;
      }
      openSubmitModal();
    });
  }

  if (disqualificationTryAgainBtn) {
    disqualificationTryAgainBtn.addEventListener('click', () => {
      collapseResultsSection(true);
    });
  }
  if (closeSubmitModalBtn) closeSubmitModalBtn.addEventListener('click', closeSubmitModal);
  if (cancelSubmitModalBtn) cancelSubmitModalBtn.addEventListener('click', closeSubmitModal);

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
      openLeaderboardModal('mine');
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
  checkServerStatus();
  fetchAuthConfig();
  parseUserFromToken();
  updateAuthUI();
  handleAuthRedirectCallback();
  // Check for shared loaf query param
  const urlLoaf = new URLSearchParams(window.location.search).get('loaf') || new URLSearchParams(window.location.search).get('id');
  if (urlLoaf) {
    window.location.replace(`/loaf?id=${encodeURIComponent(urlLoaf)}`);
    return;
  }

  // Check for legal modal query param
  const urlLegal = new URLSearchParams(window.location.search).get('legal');
  if (urlLegal === 'privacy' || urlLegal === 'terms') {
    openLegalModal(urlLegal);
  }

  updateHistoryBadge();
  try { localStorage.removeItem('loafed_sound_muted'); } catch (_) {}
  refreshIcons();
});

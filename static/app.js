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
    userSavedPhotos: [],
    userSavedCatName: '',
    pendingLeaderboardIntent: false
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
  const certificateCanvas = document.getElementById('certificateCanvas');

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


  // Image Optimization (Resize large images to maintain responsive performance)
  async function optimizeImage(file, maxDimension = 1280, quality = 0.85) {
    if (!file || !file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension && file.size < 800 * 1024) {
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
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
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

  // Multi-Photo Staging Manager (1 to 5 Photos)
  async function addFiles(files) {
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

    let toProcess = imageFiles;
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
      state.photos.push({
        id,
        file: optimized,
        previewUrl,
        name: rawFile.name
      });
    }

    syncLegacySlots();
    renderStagedPhotos();
    updateSubmitButton();
  }

  function syncLegacySlots() {
    state.slots.front = state.photos[0] || null;
    state.slots.side = state.photos[1] || null;
    state.slots.top = state.photos[2] || null;
  }

  function removePhoto(id) {
    const idx = state.photos.findIndex(p => p.id === id);
    if (idx !== -1) {
      URL.revokeObjectURL(state.photos[idx].previewUrl);
      state.photos.splice(idx, 1);
      syncLegacySlots();
      renderStagedPhotos();
      updateSubmitButton();
    }
  }

  function clearAllPhotos() {
    state.photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    state.photos = [];
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

    const suggestedLabels = [
      { title: 'Front View', icon: 'eye' },
      { title: 'Side View', icon: 'move-horizontal' },
      { title: 'Overhead View', icon: 'compass' },
      { title: 'Angle 4', icon: 'camera' },
      { title: 'Angle 5', icon: 'camera' }
    ];

    state.photos.forEach((photo, idx) => {
      const labelInfo = suggestedLabels[idx] || { title: `Angle ${idx + 1}`, icon: 'camera' };
      const card = document.createElement('div');
      card.className = 'relative group rounded-xl overflow-hidden border border-orange-200/80 bg-white shadow-2xs flex flex-col';
      card.innerHTML = `
        <div class="relative w-full aspect-square bg-stone-100 overflow-hidden">
          <img src="${photo.previewUrl}" class="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200" alt="${photo.name}">
          <div class="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent flex items-end justify-between p-2 text-white">
            <span class="text-[10px] font-bold flex items-center gap-1 drop-shadow-xs truncate max-w-[80%]">
              <i data-lucide="${labelInfo.icon}" class="w-3 h-3 shrink-0"></i> ${labelInfo.title}
            </span>
            <button type="button" class="remove-photo-btn bg-stone-900/80 hover:bg-rose-600 text-white rounded-md p-1 transition-colors shrink-0" data-id="${photo.id}" title="Remove photo" aria-label="Remove photo ${idx + 1}">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
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

  // Benchmark Loaf Presets (Buttercup, Chonks, and Flash)
  const BENCHMARK_PRESETS = {
    buttercup: {
      name: "Buttercup",
      subtitle: "Golden Brioche",
      badge: "3 Angles",
      images: [
        { url: '/samples/buttercup_front.jpg', filename: 'buttercup_front.jpg' },
        { url: '/samples/buttercup_side.jpg', filename: 'buttercup_side.jpg' },
        { url: '/samples/buttercup_top.jpg', filename: 'buttercup_top.jpg' }
      ],
      result: {
        cat_name: "Buttercup",
        overall_score: 98,
        grade_letter: "A+",
        loaf_rank: "Grandmaster Artisan Loaf",
        bread_classification: "Double-Toasted Golden Brioche",
        summary_critique: "A masterclass in feline bakery arts. Buttercup demonstrates peerless geometry with zero paw visibility across all three inspected planes. The tail tuck is flush, virtually eliminating aerodynamic drag.",
        paw_tuck: {
          score: 25,
          status: "100% Peet Stealth Concealment",
          critique: "Front and rear peet are completely tucked beneath the chest. Not a single toe bean, claw, or wrist joint breaches the loaf perimeter from any angle.",
          observations: [
            "Front view reveals total paw withdrawal into undercarriage",
            "Side view confirms rear haunches are flush to floor",
            "Zero paw flaring visible from overhead inspection"
          ]
        },
        tail_tuck: {
          score: 24,
          status: "Zero Drag Flank Wrap",
          critique: "Tail is seamlessly curled flush along the starboard flank, hugging the body curve like an artisanal baguette score line.",
          observations: [
            "Tail tip rests tightly against flank with no swishing",
            "Calculated aerodynamic drag coefficient: 0.03",
            "Minor 1-point deduction because tail tip has high-contrast white ring accentuating outline"
          ]
        },
        elbow_compactness: {
          score: 24,
          status: "Artisanal Dough Fold",
          critique: "Elbows are neatly pulled inwards against the ribcage. The rising dough curvature creates a smooth, unbroken parabolic contour with no chicken-wing flare.",
          observations: [
            "Flanks are tightly drawn with zero wing flare",
            "Chest curve is smooth and rectangular",
            "Posture displays maximum relaxation and security"
          ]
        },
        crust_symmetry: {
          score: 25,
          status: "Top-Tier Dorsal Boule Symmetry",
          critique: "Overhead inspection reveals a textbook oval boule with golden tiger-stripe crusting, baked to an even, honey-golden hue with optimal butterfat gloss.",
          observations: [
            "Top-down view shows pristine 50/50 bilateral symmetry",
            "Coat toastiness is uniform with warm marmalade highlights",
            "Bread rise is even with no dough slumping"
          ]
        },
        drag_coefficient: 0.03,
        oar_detected: false,
        face_loaf: false,
        multi_angle_bonus: 5,
        badges: [
          "Certified 360-Degree Artisan Loaf",
          "Zero Paw Visibility",
          "Golden Brioche Classification",
          "Sub-0.05 Drag Coefficient",
          "Bilateral Boule Symmetry"
        ],
        fun_tips_for_cat: [
          "Buttercup could attempt a full 'Face Loaf' to reach the legendary 100/100 threshold.",
          "Maintain current hydration levels for optimal crust sheen.",
          "Continue maintaining optimal bilateral flank compression."
        ],
        angle_notes: {
          front: "Pristine chest tuck; calm, unbothered facial expression.",
          side: "Sleek aerodynamic silhouette; tail tightly wrapped along flank.",
          top: "Near-perfect oval boule; impeccable bilateral spinal symmetry."
        }
      }
    },
    chonks: {
      name: "Chonks",
      subtitle: "Dark Rye Pumpernickel",
      badge: "2 Angles",
      images: [
        { url: '/samples/chonks_side.jpg', filename: 'chonks_side.jpg' },
        { url: '/samples/chonks_front.jpg', filename: 'chonks_front.jpg' }
      ],
      result: {
        cat_name: "Chonks",
        overall_score: 89,
        grade_letter: "A",
        loaf_rank: "Master Artisan Loaf",
        bread_classification: "Dark Rye Pumpernickel Boule",
        summary_critique: "Chonks demonstrates textbook high-elevation loaf technique. Perched atop the lookout tree, this dark rye pumpernickel boule displays exceptional undercarriage discipline with zero toe bean breaches and sleek, low-drag flank compression. A distinguished feline baker of the highest order.",
        paw_tuck: {
          score: 23,
          status: "95% Concealment (Sub-Perch Tuck)",
          critique: "Front and rear limbs are securely tucked into the plush undercarriage. While the cat tree rim assists in masking the lower extremities, zero illicit toe beans or claws are visibly breaching the perimeter.",
          observations: [
            "Undercarriage limbs fully withdrawn into dark charcoal fur perimeter",
            "No forward wrist extension detected from front-quarter view",
            "Slight edge elevation supported by cat perch bolster"
          ]
        },
        tail_tuck: {
          score: 23,
          status: "Starboard Flank Curvature",
          critique: "Tail is smoothly curled along the lateral flank, providing unbroken curvature with negligible aerodynamic turbulence.",
          observations: [
            "Tail tip resting flush against starboard haunch",
            "Aerodynamic drag coefficient measured at 0.04",
            "Uniform dark coat renders tail outline nearly imperceptible"
          ]
        },
        elbow_compactness: {
          score: 22,
          status: "Compact Dough Rise",
          critique: "Excellent lateral dough compression. Elbows pulled tightly against ribcage with zero chicken-wing flare, forming an imposing rectangular bread profile.",
          observations: [
            "Zero lateral limb flare or oar protrusions",
            "Solid muscular rise with uniform breadth",
            "Slight upward gaze introduces minor cranial yaw"
          ]
        },
        crust_symmetry: {
          score: 21,
          status: "Dark Rye Boule Symmetry",
          critique: "Dense, beautifully baked charcoal-slate coat resembling a rustic pumpernickel boule. Topline curvature is even with a smooth spinal arch.",
          observations: [
            "Uniform dark coat toastiness with velvety matte finish",
            "Bilateral contour balanced across medial axis",
            "Slight cranial turn toward starboard window"
          ]
        },
        drag_coefficient: 0.04,
        oar_detected: false,
        face_loaf: false,
        multi_angle_bonus: 4,
        badges: [
          "Certified Dark Rye Pumpernickel",
          "High-Perch Boule Formation",
          "Stealth Peet Concealment",
          "Sub-0.05 Aerodynamic Drag",
          "Solid Slate Symmetry"
        ],
        fun_tips_for_cat: [
          "Align cranial axis directly forward for 100% bilateral boule symmetry.",
          "Try the floor-level test to verify paw concealment without perch rim support.",
          "A sub-perch ear tuck would push Chonks toward Grandmaster status."
        ],
        angle_notes: {
          front: "Alert, observant gaze; chest squarely aligned over perch bolster.",
          side: "Continuous slate-grey parabolic topline with tight starboard tail tuck."
        }
      }
    },
    flash: {
      name: "Flash",
      subtitle: "Marbled Sourdough",
      badge: "2 Angles",
      images: [
        { url: '/samples/flash_front.jpg', filename: 'flash_front.jpg' },
        { url: '/samples/flash_side.jpg', filename: 'flash_side.jpg' }
      ],
      result: {
        cat_name: "Flash",
        overall_score: 83,
        grade_letter: "B+",
        loaf_rank: "Senior Artisan Loaf",
        bread_classification: "Marbled Sourdough Baton",
        summary_critique: "Flash presents an exquisite marbled sourdough baton resting atop prime cushion real estate. While full aerodynamic marks are awarded for the remarkable horizontal airplane ears, a minor wrist protrusion on the starboard side prevents an A+ rating. Nonetheless, an outstanding exhibition of feline baking discipline.",
        paw_tuck: {
          score: 20,
          status: "Minor Wrist Protrusion (Cushion Sink)",
          critique: "Right front wrist displays slight forward protrusion onto the cushion surface, breaching pure concealment by approximately 1.5 cm. Rear peet remain fully tucked.",
          observations: [
            "Starboard front wrist joint visible resting on cushion piping",
            "Rear peet and hocks firmly retracted beneath flank",
            "Cushion softness causes slight dough sinking along lower seam"
          ]
        },
        tail_tuck: {
          score: 21,
          status: "Portside Flank Wrap",
          critique: "Tail is tucked along the portside flank, creating a tight sweep though slightly flattened by the cushion seam.",
          observations: [
            "Calculated aerodynamic drag coefficient: 0.06",
            "Tail tip resting flush against left rear haunch",
            "Minimal swish turbulence detected"
          ]
        },
        elbow_compactness: {
          score: 21,
          status: "Marbled Dough Fold",
          critique: "Elbows pulled inwards with good bilateral compression. Distinctive 'airplane ears' deployed horizontally, creating an aerodynamically intriguing cranial profile.",
          observations: [
            "Lateral airplane ear configuration detected (aerodynamic stabilizer mode)",
            "Subtle leftward lean due to pillow contour",
            "Suspicious facial expression indicates hyper-vigilant loaf state"
          ]
        },
        crust_symmetry: {
          score: 21,
          status: "Tiger-Stripe Sourdough Swirl",
          critique: "Gorgeous marbled silver-grey tiger stripes with distinct dorsal scoring. Bilateral symmetry is solid despite slight pillow elevation gradient.",
          observations: [
            "Even tiger-stripe crust score markings across back",
            "Bilateral symmetry graded at 84% due to cushion tilt",
            "Coat luster exhibits pristine sourdough crust shine"
          ]
        },
        drag_coefficient: 0.06,
        oar_detected: false,
        face_loaf: false,
        multi_angle_bonus: 4,
        badges: [
          "Aerodynamic Airplane Ears",
          "Marbled Sourdough Certification",
          "Cushion Loaf Specialist",
          "Vigilant Baker Stance",
          "Tiger-Stripe Crust Finish"
        ],
        fun_tips_for_cat: [
          "Retract the right front wrist 1.5 cm deeper into the chest fold to eliminate peet deductions.",
          "Test on a firm, flat surface to prevent cushion-induced dough slumping.",
          "Fold ears forward during inspection to reduce lateral cranial drag."
        ],
        angle_notes: {
          front: "Signature horizontal airplane ears deployed; minor right wrist breach.",
          side: "Classic sourdough baton contour along cushion diagonal; tail tucked flush."
        }
      }
    }
  };

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
      btn.className = 'load-benchmark-btn flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-950 text-xs font-bold border border-orange-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 whitespace-nowrap btn-tactile';
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
        btn.className = 'load-benchmark-btn flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-black border border-transparent transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap shimmer-btn btn-tactile';

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
        btn.className = 'load-benchmark-btn flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-950 text-xs font-bold border border-orange-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 whitespace-nowrap btn-tactile';

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
        return new File([blob], filename, { type: 'image/jpeg' });
      };

      const files = await Promise.all(
        preset.images.map(img => loadPresetImage(img.url, img.filename))
      );

      await addFiles(files);
      state.isExamplePreset = true;
      state.activePresetKey = catKey;
      state.currentResult = preset.result;
      state.gradeToken = null;
      state.submittedPhotoBlob = null;

      setActiveBenchmarkButton(catKey);
      renderResults(preset.result, false);

      showToast({
        type: 'success',
        title: `${preset.name} Staged & Inspected`,
        message: `Simulated inspection loaded: ${preset.result.overall_score} ${preset.result.grade_letter} (${preset.result.loaf_rank}).`
      });
    } catch (e) {
      console.error('Failed to load benchmark preset', e);
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
      loadBenchmarkLoaf('buttercup');
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
  function scrollToSection(el) {
    if (!el) return;
    requestAnimationFrame(() => {
      const header = document.querySelector('header');
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const top = el.getBoundingClientRect().top + window.scrollY - headerH - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }

  function startLoadingAnimation() {
    if (progressInterval) clearInterval(progressInterval);

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

  function stopLoadingAnimation() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;

    loadingProgressBar.style.width = '100%';
    loadingPhrase.textContent = 'Inspection complete! Finalizing scorecard...';
    renderStepLog(bakeryAuditSteps.length - 1);

    setTimeout(() => {
      loadingState.classList.remove('hearth-oven-active');
      loadingState.classList.add('hidden');
    }, 380);
  }

  // Submit & Grade
  gradeLoafBtn.addEventListener('click', async () => {
    if (isGradingActive) return;
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

    // Append all staged photos (1 to 5)
    state.photos.forEach((photo, idx) => {
      formData.append('images', photo.file);
      if (idx === 0) formData.append('front', photo.file);
      else if (idx === 1) formData.append('side', photo.file);
      else if (idx === 2) formData.append('top', photo.file);
    });

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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Inspection failed');
      }

      stopLoadingAnimation();
      state.currentResult = data.result;
      state.gradeToken = data.grade_token || null;
      if (state.photos.length > 0 && state.photos[0].file) {
        state.submittedPhotoBlob = state.photos[0].file;
      }
      renderResults(data.result, data.demo_mode);
      saveLoafToHistory(data.result);
      if (data.demo_mode && data.message) {
        showToast({
          type: 'info',
          title: 'Demo Calibration Mode',
          message: data.message
        });
      }
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
    scrollToSection(resultsSection);

    // Configure Example Preset vs User Inspection UX
    if (state.isExamplePreset) {
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
      if (submitLeaderboardBtn) submitLeaderboardBtn.classList.add('hidden');

      showToast({
        type: 'error',
        title: 'Non-Feline Disqualification',
        message: result.rejection_reason || 'Non-feline subject detected. Only authentic domestic cats can be certified!'
      });

      setTimeout(() => {
        if (disqualificationBanner) {
          disqualificationBanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      if (disqualificationBanner) disqualificationBanner.classList.add('hidden');
      if (criteriaGrid) criteriaGrid.classList.remove('hidden');
      if (angleReviewStrip) angleReviewStrip.classList.remove('hidden');
      if (badgesAndTipsGrid) badgesAndTipsGrid.classList.remove('hidden');
      if (downloadCertificateBtn) downloadCertificateBtn.classList.remove('hidden');
      if (submitLeaderboardBtn && !isDemo) submitLeaderboardBtn.classList.remove('hidden');
    }

    // Grade Stamp & Badges
    const gradeStamp = document.getElementById('gradeStamp');
    if (result.is_cat === false) {
      gradeStamp.textContent = 'DQ';
      gradeStamp.className = 'stamp text-rose-700 border-rose-700 text-lg font-black';
      if (submitLeaderboardBtn) {
        submitLeaderboardBtn.disabled = true;
        submitLeaderboardBtn.classList.add('hidden');
        submitLeaderboardBtn.title = result.rejection_reason || 'Audit Disqualified: Not an authentic feline loaf';
      }
    } else {
      gradeStamp.textContent = result.grade_letter;
      if (submitLeaderboardBtn) {
        submitLeaderboardBtn.disabled = false;
        submitLeaderboardBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        submitLeaderboardBtn.title = '';
      }
      
      // Stamp colors & Physical Stamp Slam Animation
      gradeStamp.classList.remove('stamp-slam');
      void gradeStamp.offsetWidth; // Force reflow to re-trigger animation

      if (result.grade_letter.includes('A')) {
        gradeStamp.className = 'stamp text-orange-700 border-orange-700 text-lg font-black stamp-slam';
      } else if (result.grade_letter.includes('B')) {
        gradeStamp.className = 'stamp text-amber-700 border-amber-700 text-lg font-black stamp-slam';
      } else if (result.grade_letter.includes('C')) {
        gradeStamp.className = 'stamp text-stone-700 border-stone-700 text-lg font-black stamp-slam';
      } else {
        gradeStamp.className = 'stamp text-rose-700 border-rose-700 text-lg font-black stamp-slam';
      }
    }

    // Multi-angle badge
    const multiAngleBadge = document.getElementById('multiAngleBadge');
    if (result.multi_angle_bonus && result.multi_angle_bonus > 0) {
      multiAngleBadge.classList.remove('hidden');
    } else {
      multiAngleBadge.classList.add('hidden');
    }

    // Oar / Loaf Boat badge
    const oarBadge = document.getElementById('oarBadge');
    if (result.oar_detected) {
      oarBadge.classList.remove('hidden');
    } else {
      oarBadge.classList.add('hidden');
    }

    // Animated Score Counter & Circle Gauge
    animateScore(result.overall_score);

    // Criteria Cards
    renderSubScore('paw', result.paw_tuck);
    renderSubScore('tail', result.tail_tuck);
    renderSubScore('elbow', result.elbow_compactness);
    renderSubScore('crust', result.crust_symmetry);

    // Drag coefficient
    document.getElementById('dragCoeffNum').textContent = (result.drag_coefficient || 0.05).toFixed(2);

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
        <img src="${photo.previewUrl}" class="w-full h-28 object-cover rounded-lg border border-orange-200" alt="${label}">
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
        <div class="w-full h-28 bg-white/80 rounded-lg border border-dashed border-amber-300 flex flex-col items-center justify-center p-3 text-center">
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

  function animateScore(target) {
    const numEl = document.getElementById('scoreNumber');
    const circleEl = document.getElementById('scoreMeterCircle');
    const circumference = 2 * Math.PI * 90;

    circleEl.style.strokeDashoffset = circumference;

    let start = 0;
    const duration = 1400;
    const startTime = performance.now();

    function step(currTime) {
      const elapsed = currTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(start + (target - start) * ease);

      numEl.textContent = currentScore;

      const offset = circumference - (circumference * (currentScore / 100));
      circleEl.style.strokeDashoffset = offset;

      if (progress < 1) {
        requestAnimationFrame(step);
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

  // Preload Mascot Emblem for Certificate
  const mascotLogoImg = new Image();
  mascotLogoImg.src = '/static/logo.png';

  // Certificate Download & Preview Generator (Canvas with clean professional styling, zero emojis)
  downloadCertificateBtn.addEventListener('click', () => {
    if (!state.currentResult) return;
    openCertificateModal(state.currentResult);
  });

  function generateCertificate(result, shouldDownload = true) {
    const canvas = certificateCanvas;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background Pure Clean Parchment
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, w, h);

    // Architectural Double Border
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    ctx.strokeStyle = '#d6cebe';
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, w - 96, h - 96);

    // Official Bureau Mascot Emblems in Header
    if (mascotLogoImg.complete && mascotLogoImg.naturalWidth > 0) {
      try {
        ctx.drawImage(mascotLogoImg, 70, 70, 75, 65);
        ctx.drawImage(mascotLogoImg, w - 145, 70, 75, 65);
      } catch (e) {
        // Skip silently if tainted canvas
      }
    }

    // Header Label
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText('FELINE POSTURE & KINEMATICS CERTIFICATION BUREAU', w / 2, 95);

    // Title
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.fillText('Official Certificate of Loaf Inspection', w / 2, 145);

    // Cat Name
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(result.cat_name || 'Anonymous Subject', w / 2, 215);

    // Rank & Morphology
    ctx.fillStyle = '#44403c';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`${result.loaf_rank}  —  ${result.bread_classification}`, w / 2, 250);

    // Left Box: Score & Photo
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(80, 290, 340, 420, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('COMPOSITE SCORE', 250, 330);

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 76px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(result.overall_score.toString(), 250, 410);

    ctx.fillStyle = '#a8a29e';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('/ 100', 250, 442);

    // Stamp
    ctx.save();
    ctx.translate(250, 520);
    ctx.rotate(-0.06);
    let stampColor = '#c2410c'; // A
    if (result.grade_letter.includes('B')) stampColor = '#d97706';
    else if (result.grade_letter.includes('C')) stampColor = '#57534e';
    else if (result.grade_letter.includes('D') || result.grade_letter.includes('F')) stampColor = '#be123c';

    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(-60, -28, 120, 56);
    ctx.fillStyle = stampColor;
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(result.grade_letter, 0, 10);
    ctx.restore();

    ctx.fillStyle = '#57534e';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`Drag Coeff: ${result.drag_coefficient.toFixed(2)}  |  Bonus: +${result.multi_angle_bonus} pts`, 250, 615);

    // Right Box: Criteria Breakdown
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(450, 290, 670, 420, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Planar Criteria Evaluation', 480, 330);

    const criteria = [
      { name: 'Paw Tuck & Undercarriage', score: `${result.paw_tuck.score}/25`, status: result.paw_tuck.status },
      { name: 'Tail Aerodynamics & Drag', score: `${result.tail_tuck.score}/25`, status: result.tail_tuck.status },
      { name: 'Flank Compression & Form', score: `${result.elbow_compactness.score}/25`, status: result.elbow_compactness.status },
      { name: 'Dorsal Symmetry & Crust', score: `${result.crust_symmetry.score}/25`, status: result.crust_symmetry.status }
    ];

    criteria.forEach((c, idx) => {
      const y = 362 + idx * 47;
      ctx.fillStyle = '#292524';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(c.name, 480, y);

      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(c.score, 1080, y);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#78716c';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText((c.status || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ''), 480, y + 17);
    });

    // Auditor Findings Callout Card (Spacious card with adaptive multi-line word wrap, zero overflow)
    ctx.fillStyle = '#fffaf5';
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(468, 540, 634, 155, 10);
    ctx.fill();
    ctx.stroke();

    // Warm left accent bar
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.roundRect(468, 540, 4, 155, [10, 0, 0, 10]);
    ctx.fill();

    // Callout Label
    ctx.fillStyle = '#c2410c';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('CHIEF AUDITOR FINDINGS & PURR-FECTION SUMMARY', 488, 561);

    // Multi-line Adaptive Word-Wrapped Critique (dynamically chooses font tier to render full text)
    ctx.fillStyle = '#292524';
    const cleanCritique = (result.summary_critique || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    drawFittedCritique(ctx, `"${cleanCritique}"`, 488, 582, 600, 104);

    // Footer
    ctx.fillStyle = '#a8a29e';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(`Evaluation Date: ${dateStr}  |  Certified by Loafed Machine Vision Engine`, w / 2, 745);

    function drawFittedCritique(context, text, startX, startY, maxWidth, maxHeight) {
      const fontTiers = [
        { size: 13, lineHeight: 19 },
        { size: 12, lineHeight: 17.5 },
        { size: 11, lineHeight: 16 }
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

        // If all lines comfortably fit within maxHeight, select this tier
        if (lines.length * tier.lineHeight <= maxHeight) {
          break;
        }
      }

      // Render lines using the chosen tier
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

  // Certificate Preview Modal Controller
  let activeModalCertResult = null;
  const certificateModal = document.getElementById('certificateModal');
  const certModalImage = document.getElementById('certModalImage');
  const certModalTitle = document.getElementById('certModalTitle');
  const closeCertModalBtn = document.getElementById('closeCertModalBtn');
  const dismissCertModalBtn = document.getElementById('dismissCertModalBtn');
  const modalDownloadCertBtn = document.getElementById('modalDownloadCertBtn');
  const viewSampleCertBtn = document.getElementById('viewSampleCertBtn');

  function openCertificateModal(result) {
    if (!result) return;
    activeModalCertResult = result;
    const dataUrl = generateCertificate(result, false);
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
    modalDownloadCertBtn.addEventListener('click', () => {
      if (activeModalCertResult) {
        generateCertificate(activeModalCertResult, true);
        showToast({
          type: 'success',
          title: 'Certificate Downloaded',
          message: `Exported 1200x800 HD certificate for ${activeModalCertResult.cat_name}.`
        });
      }
    });
  }

  if (viewSampleCertBtn) {
    viewSampleCertBtn.addEventListener('click', () => {
      const sample = state.currentResult || BENCHMARK_PRESETS.buttercup.result;
      openCertificateModal(sample);
    });
  }

  // Diploma Preview Buttons across benchmark cards
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
    if (ovenAlertBody) ovenAlertBody.textContent = msg;
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
      loadBenchmarkLoaf('buttercup');
    });
  }

  // Local History Manager (0 login required, stored locally in browser)
  const historyBadgeCount = document.getElementById('historyBadgeCount');
  const historyModal = document.getElementById('historyModal');
  const openHistoryBtn = document.getElementById('openHistoryBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const dismissHistoryBtn = document.getElementById('dismissHistoryBtn');
  const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
  const historyListContainer = document.getElementById('historyListContainer');

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
  }

  function saveLoafToHistory(result) {
    if (!result) return;
    try {
      const history = getSavedHistory();
      const entry = {
        id: Date.now().toString(),
        cat_name: result.cat_name || 'Anonymous Subject',
        overall_score: result.overall_score || 0,
        grade_letter: result.grade_letter || 'N/A',
        loaf_rank: result.loaf_rank || 'Unclassified',
        bread_classification: result.bread_classification || 'Standard Loaf',
        summary_critique: result.summary_critique || '',
        timestamp: new Date().toISOString(),
        result: result
      };
      history.unshift(entry);
      if (history.length > 30) history.length = 30;
      localStorage.setItem('loafed_history', JSON.stringify(history));
      updateHistoryBadge();
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }

  function renderHistoryModal() {
    const history = getSavedHistory();
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

      return `
        <div class="p-3.5 rounded-xl border border-orange-200/90 bg-orange-50/40 hover:bg-orange-50/80 transition-colors flex items-center justify-between gap-3 shadow-2xs" data-id="${item.id}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-lg bg-white border border-orange-200 flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span class="text-xs font-black text-orange-700">${item.overall_score}</span>
              <span class="text-[9px] font-bold text-orange-900/60 leading-none">${item.grade_letter}</span>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-bold text-stone-900 truncate">${item.cat_name}</div>
              <div class="text-[11px] text-stone-600 truncate">${item.loaf_rank} &bull; ${item.bread_classification}</div>
              <div class="text-[10px] text-stone-400 mt-0.5">${formattedDate}</div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
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
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const entry = history.find(h => h.id === id);
        if (entry && entry.result) {
          state.currentResult = entry.result;
          historyModal.classList.add('hidden');
          renderResults(entry.result, false);
          showToast({
            type: 'info',
            title: 'Report Loaded',
            message: `Loaded past inspection report for ${entry.cat_name}.`
          });
        }
      });
    });

    historyListContainer.querySelectorAll('.delete-history-entry-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        const updated = history.filter(h => h.id !== id);
        localStorage.setItem('loafed_history', JSON.stringify(updated));
        updateHistoryBadge();
        renderHistoryModal();
      });
    });
  }

  if (openHistoryBtn) {
    openHistoryBtn.addEventListener('click', () => {
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
      <h4 class="font-bold text-stone-900 text-xs mb-1">4. No Tracking, Profiling, or Advertising</h4>
      <p class="text-stone-600 leading-relaxed">We do not employ third-party advertising trackers, cross-site profiling pixels, or marketing analytics. Your browsing activity on this service remains private.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">5. Third-Party AI & Cloud Services</h4>
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
      <p class="text-stone-600 leading-relaxed">The analysis generated by this engine does not constitute veterinary medical diagnosis, orthopedic assessment, or health advice. If your cat demonstrates sudden changes in resting posture, gait abnormalities, or tucks its limbs due to pain or illness, please consult a licensed veterinarian immediately.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">3. Permitted Content</h4>
      <p class="text-stone-600 leading-relaxed">You agree to submit only images of cats that you own or have permission to inspect. Submissions of unlawful, abusive, or non-feline graphic content are strictly prohibited.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">4. Fair Use & Abuse Prevention</h4>
      <p class="text-stone-600 leading-relaxed">To ensure this service remains 100% free for everyone, automated scraping, bot submissions, high-frequency script attacks, or attempts to circumvent rate-limiting guardrails are prohibited.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">5. Disclaimer of Warranty ("As-Is")</h4>
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
          <button class="delete-loaf-btn p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-2" data-id="${entry.entry_id}" aria-label="Delete ${catName} submission">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        `;
      } else {
        actionBtn = `
          <button class="report-loaf-btn p-1.5 rounded-lg text-stone-300 hover:text-amber-700 hover:bg-orange-50 transition-colors ml-2" data-id="${entry.entry_id}" data-score="${score}" aria-label="Report ${catName} submission" title="Report submission as inappropriate or non-cat">
            <i data-lucide="flag" class="w-4 h-4"></i>
          </button>
        `;
      }

      return `
        <div class="p-3 rounded-2xl bg-white border border-orange-200/90 hover:border-amber-400 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
          <div class="shrink-0 flex items-center justify-center">
            ${rankBadge}
          </div>
          <img src="${thumb}" alt="${catName}" class="w-12 h-12 rounded-xl object-cover border border-orange-200/80 bg-orange-50 shrink-0">
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
          if (!id) return;
          if (!confirm('Are you sure you want to remove this loaf from the leaderboard?')) return;
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
              loadLeaderboardEntries('all');
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

    showToast({
      type: 'info',
      title: 'Baker Tag Rolled',
      message: `Suggested: "${tag}"!`
    });
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

  function getSubmitFormValidation() {
    const catName = submitCatNameInput ? submitCatNameInput.value.trim() : '';
    const displayName = submitDisplayNameInput ? submitDisplayNameInput.value.trim() : '';
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

  function updateSubmitButtonState() {
    const catName = submitCatNameInput ? submitCatNameInput.value.trim() : '';
    if (submitModalCatName) {
      submitModalCatName.textContent = catName || 'Cat Name';
    }

    const { valid } = getSubmitFormValidation();
    if (confirmSubmitLeaderboardBtn) {
      confirmSubmitLeaderboardBtn.disabled = !valid;
    }
  }

  function openSubmitModal() {
    if (!state.currentResult || !submitModal) return;
    const initialCatName = (state.currentResult.cat_name && state.currentResult.cat_name !== 'Anonymous Loaf') 
      ? state.currentResult.cat_name 
      : '';
    if (submitCatNameInput) submitCatNameInput.value = initialCatName;
    if (submitModalCatName) submitModalCatName.textContent = initialCatName || 'Cat Name';
    if (submitModalScoreBadge) submitModalScoreBadge.textContent = `${state.currentResult.overall_score} ${state.currentResult.grade_letter}`;
    if (submitModalRank) submitModalRank.textContent = state.currentResult.loaf_rank || 'Artisan Loaf';
    if (submitModalBread) submitModalBread.textContent = state.currentResult.bread_classification || 'Brioche';
    if (submitDisplayNameInput) submitDisplayNameInput.value = state.user ? (state.user.name || '') : '';
    if (submitConsentCheckbox) submitConsentCheckbox.checked = false;
    hideSubmitNotice();
    updateSubmitButtonState();

    if (submitModalThumbnail) {
      if (state.photos.length > 0 && state.photos[0].previewUrl) {
        submitModalThumbnail.src = state.photos[0].previewUrl;
      } else {
        submitModalThumbnail.src = '/static/logo.png';
      }
    }

    submitModal.classList.remove('hidden');
    refreshIcons();
  }

  function closeSubmitModal() {
    if (submitModal) submitModal.classList.add('hidden');
    hideSubmitNotice();
  }

  if (submitCatNameInput) {
    submitCatNameInput.addEventListener('input', () => {
      hideSubmitNotice();
      updateSubmitButtonState();
    });
  }

  if (submitDisplayNameInput) {
    submitDisplayNameInput.addEventListener('input', () => {
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
        if (!photoFile && state.photos.length > 0 && state.photos[0].file) {
          photoFile = state.photos[0].file;
        }

        if (!photoFile) {
          const sampleImgSrc = submitModalThumbnail.src || '/samples/buttercup_front.jpg';
          const imgResp = await fetch(sampleImgSrc);
          const blob = await imgResp.blob();
          photoFile = new File([blob], 'loaf.jpg', { type: blob.type || 'image/jpeg' });
        }

        let gradeToken = state.gradeToken;
        if (!gradeToken) {
          const formData = new FormData();
          formData.append('cat_name', validation.catName);
          formData.append('images', photoFile);
          const gRes = await fetch('/api/grade', { method: 'POST', body: formData });
          if (gRes.ok) {
            const gData = await gRes.json();
            gradeToken = gData.grade_token;
            state.gradeToken = gradeToken;
          } else {
            throw new Error('Could not verify grade signature token.');
          }
        }

        const submitForm = new FormData();
        submitForm.append('grade_token', gradeToken);
        submitForm.append('cat_name', validation.catName);
        submitForm.append('display_name', validation.displayName);
        submitForm.append('photo', photoFile);

        const subRes = await fetch('/api/leaderboard/submit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.idToken}`
          },
          body: submitForm
        });

        const subData = await subRes.json();
        if (!subRes.ok) {
          const errMsg = subData.detail || 'Leaderboard submission failed.';
          showSubmitNotice(errMsg);
          throw new Error(errMsg);
        }

        closeSubmitModal();
        showToast({
          type: 'success',
          title: 'Published to Leaderboard!',
          message: subData.message || 'Your cat loaf is now live on the Leaderboard!'
        });

        setTimeout(() => {
          window.location.href = '/leaderboard';
        }, 1000);
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

  if (submitLeaderboardBtn) {
    submitLeaderboardBtn.addEventListener('click', () => {
      if (!state.currentResult) {
        showToast({ type: 'warning', title: 'No Loaf Graded', message: 'Please grade a cat loaf before submitting to the leaderboard.' });
        return;
      }
      if (state.currentResult.is_cat === false) {
        showToast({
          type: 'error',
          title: 'Audit Disqualification',
          message: state.currentResult.rejection_reason || 'This photo was disqualified as a non-feline subject and cannot be published to the leaderboard.'
        });
        return;
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
  // Check for legal modal query param
  const urlLegal = new URLSearchParams(window.location.search).get('legal');
  if (urlLegal === 'privacy' || urlLegal === 'terms') {
    openLegalModal(urlLegal);
  }

  updateHistoryBadge();
  refreshIcons();
});

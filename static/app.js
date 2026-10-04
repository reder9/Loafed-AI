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
    samplePresets: {}
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

  // Multi-Photo Upload & Staging Elements
  const mainDropzone = document.getElementById('mainDropzone');
  const photosInput = document.getElementById('photosInput');
  const stagedPhotosContainer = document.getElementById('stagedPhotosContainer');
  const stagedPhotosGrid = document.getElementById('stagedPhotosGrid');
  const stagedCountBadge = document.getElementById('stagedCountBadge');
  const clearAllPhotosBtn = document.getElementById('clearAllPhotosBtn');
  const addMorePhotosBtn = document.getElementById('addMorePhotosBtn');
  const telemetryStatusText = document.getElementById('telemetryStatusText');

  // Header Elements
  const toastContainer = document.getElementById('toastContainer');

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
            <button type="button" class="remove-photo-btn bg-stone-900/80 hover:bg-rose-600 text-white rounded-md p-1 transition-colors shrink-0" data-id="${photo.id}" title="Remove photo">
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
      gradeLoafBtn.className = 'w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-stone-400 bg-stone-200 cursor-not-allowed shadow-none transition-all flex items-center justify-center gap-2';
      photoCountBadge.textContent = '0 photos selected';
      photoCountBadge.className = 'font-semibold text-stone-600 bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200';
    } else {
      gradeLoafBtn.disabled = false;
      gradeLoafBtn.className = 'w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer';
      
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

  // Load Buttercup Preset (Stages 3 masterclass angles)
  loadButtercupBtn.addEventListener('click', async () => {
    loadButtercupBtn.disabled = true;
    loadButtercupBtn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Loading Baseline Dataset...</span>';
    refreshIcons();

    try {
      catNameInput.value = 'Buttercup';
      clearAllPhotos();

      const loadPresetImage = async (url, filename) => {
        const resp = await fetch(url);
        const blob = await resp.blob();
        return new File([blob], filename, { type: 'image/jpeg' });
      };

      const files = await Promise.all([
        loadPresetImage('/static/samples/buttercup_front.jpg', 'buttercup_front.jpg'),
        loadPresetImage('/static/samples/buttercup_side.jpg', 'buttercup_side.jpg'),
        loadPresetImage('/static/samples/buttercup_top.jpg', 'buttercup_top.jpg'),
      ]);

      await addFiles(files);

      loadButtercupBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-700"></i><span>Buttercup Dataset Loaded (3 Angles)</span>';
      loadButtercupBtn.className = 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-300 shadow-sm';
      refreshIcons();
      showToast({
        type: 'success',
        title: 'Calibration Dataset Loaded',
        message: 'Buttercup 3-angle dataset staged for inspection.'
      });
    } catch (e) {
      console.error('Failed to load sample photos', e);
      showToast({
        type: 'error',
        title: 'Dataset Unavailable',
        message: 'Could not load sample baseline images: ' + e.message
      });
    } finally {
      loadButtercupBtn.disabled = false;
    }
  });

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

  let phraseInterval = null;
  const loadingStepLog = document.getElementById('loadingStepLog');

  function renderStepLog(activeIdx) {
    if (!loadingStepLog) return;
    loadingStepLog.innerHTML = '';
    
    // Show current step and recent completed steps
    const startIdx = Math.max(0, activeIdx - 2);
    for (let i = startIdx; i <= activeIdx && i < bakeryAuditSteps.length; i++) {
      const step = bakeryAuditSteps[i];
      const isCurrent = i === activeIdx;
      const el = document.createElement('div');
      el.className = isCurrent 
        ? 'flex items-center gap-2 text-orange-950 font-semibold bg-orange-50/90 px-2.5 py-1 rounded-lg border border-orange-200/70 transition-all duration-300'
        : 'flex items-center gap-2 text-stone-500 px-2.5 py-0.5 transition-all duration-300';
      
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

  function startLoadingAnimation() {
    loadingState.classList.remove('hidden');
    inspectorBay.classList.add('hidden');
    resultsSection.classList.add('hidden');
    window.scrollTo({ top: 120, behavior: 'smooth' });

    let index = 0;
    loadingPhrase.textContent = bakeryAuditSteps[0].title;
    loadingProgressBar.style.width = '18%';
    renderStepLog(0);

    phraseInterval = setInterval(() => {
      index = (index + 1) % bakeryAuditSteps.length;
      loadingPhrase.textContent = bakeryAuditSteps[index].title;
      const pct = Math.min(20 + index * 11, 95);
      loadingProgressBar.style.width = `${pct}%`;
      renderStepLog(index);
    }, 1000);
  }

  function stopLoadingAnimation() {
    clearInterval(phraseInterval);
    loadingProgressBar.style.width = '100%';
    setTimeout(() => {
      loadingState.classList.add('hidden');
    }, 350);
  }

  // Submit & Grade
  gradeLoafBtn.addEventListener('click', async () => {
    if (state.photos.length === 0) {
      showToast({
        type: 'warning',
        title: 'Photographs Required',
        message: 'Please provide between 1 and 5 cat photos to run the evaluation.'
      });
      return;
    }

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
    }
  });

  // Render Results Dashboard
  function renderResults(result, isDemoMode) {
    resultsSection.classList.remove('hidden');
    inspectorBay.classList.add('hidden');
    window.scrollTo({ top: 180, behavior: 'smooth' });

    // Header info
    document.getElementById('resultCatName').textContent = result.cat_name || 'The Mysterious Loaf';
    document.getElementById('resultHonoraryRank').textContent = result.loaf_rank;
    document.getElementById('resultBreadClass').textContent = result.bread_classification;
    document.getElementById('resultSummaryCritique').textContent = `"${result.summary_critique}"`;

    // Grade Stamp & Badges
    const gradeStamp = document.getElementById('gradeStamp');
    gradeStamp.textContent = result.grade_letter;
    
    // Stamp colors
    if (result.grade_letter.includes('A')) {
      gradeStamp.className = 'stamp text-orange-700 border-orange-700 text-lg font-black';
    } else if (result.grade_letter.includes('B')) {
      gradeStamp.className = 'stamp text-amber-700 border-amber-700 text-lg font-black';
    } else if (result.grade_letter.includes('C')) {
      gradeStamp.className = 'stamp text-stone-700 border-stone-700 text-lg font-black';
    } else {
      gradeStamp.className = 'stamp text-rose-700 border-rose-700 text-lg font-black';
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

  // Reset Button
  resetInspectorBtn.addEventListener('click', () => {
    resultsSection.classList.add('hidden');
    inspectorBay.classList.remove('hidden');
    clearAllPhotos();
    if (catNameInput) catNameInput.value = '';
    window.scrollTo({ top: 120, behavior: 'smooth' });
    showToast({
      type: 'info',
      title: 'Inspector Ready',
      message: 'Returned to photo staging bay for a new feline inspection.'
    });
  });

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

  // Certificate Download Generator (Canvas with clean professional styling, zero emojis)
  downloadCertificateBtn.addEventListener('click', () => {
    if (!state.currentResult) return;
    generateCertificate(state.currentResult);
    showToast({
      type: 'success',
      title: 'Certificate Exported',
      message: 'High-resolution PNG inspection certificate generated and downloaded.'
    });
  });

  function generateCertificate(result) {
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
      const y = 368 + idx * 49;
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
      ctx.fillText((c.status || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ''), 480, y + 18);
    });

    // Auditor Findings Callout Card (Multi-line word wrap, zero overflow)
    ctx.fillStyle = '#fffaf5';
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(475, 575, 620, 115, 10);
    ctx.fill();
    ctx.stroke();

    // Warm left accent bar
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.roundRect(475, 575, 4, 115, [10, 0, 0, 10]);
    ctx.fill();

    // Callout Label
    ctx.fillStyle = '#c2410c';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('CHIEF AUDITOR FINDINGS & PURR-FECTION SUMMARY', 495, 598);

    // Multi-line Word-Wrapped Critique
    ctx.fillStyle = '#292524';
    ctx.font = 'italic 13.5px Georgia, serif';
    const cleanCritique = (result.summary_critique || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    drawWrappedText(ctx, `"${cleanCritique}"`, 495, 622, 580, 21, 3);

    // Footer
    ctx.fillStyle = '#a8a29e';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(`Evaluation Date: ${dateStr}  |  Certified by Loafed Machine Vision Engine`, w / 2, 745);

    function drawWrappedText(context, text, startX, startY, maxWidth, lineHeight, maxLines = 3) {
      const words = text.split(' ');
      let currentLine = '';
      let currentY = startY;
      let linesDrawn = 0;

      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine + (currentLine ? ' ' : '') + words[n];
        const metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && currentLine !== '') {
          linesDrawn++;
          if (linesDrawn === maxLines) {
            let lineWithEllipsis = currentLine;
            while (lineWithEllipsis.length > 0 && context.measureText(lineWithEllipsis + '...').width > maxWidth) {
              lineWithEllipsis = lineWithEllipsis.slice(0, -1);
            }
            context.fillText(lineWithEllipsis + '...', startX, currentY);
            return;
          }
          context.fillText(currentLine, startX, currentY);
          currentLine = words[n];
          currentY += lineHeight;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine && linesDrawn < maxLines) {
        context.fillText(currentLine, startX, currentY);
      }
    }

    function triggerDownload() {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = (result.cat_name || 'subject').toLowerCase().replace(/[^a-z0-9]/g, '_');
      a.download = `loaf_certificate_${safeName}.png`;
      a.click();
    }

    triggerDownload();
  }




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
      loadButtercupBtn.click();
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
            <button class="view-history-entry-btn px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-100 text-orange-950 text-xs font-bold border border-orange-200 transition-colors shadow-2xs" data-id="${item.id}">
              View
            </button>
            <button class="delete-history-entry-btn p-1.5 text-stone-400 hover:text-rose-600 transition-colors" data-id="${item.id}" title="Delete">
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
      <h4 class="font-bold text-stone-900 text-xs mb-1">1. Zero Personal Data Collection</h4>
      <p class="text-stone-600 leading-relaxed">Loafed AI is freeware created strictly for feline appreciation and recreational entertainment by <a href="https://redersoft.com" target="_blank" rel="noopener noreferrer" class="text-orange-700 underline font-semibold">RederSoft</a>. We do not require account registration, and we do not collect your name, email address, phone number, location, or payment information.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">2. In-Memory Image Evaluation (No Persistent Storage)</h4>
      <p class="text-stone-600 leading-relaxed">Uploaded cat photographs are transferred over encrypted HTTPS and streamed in-memory to Google Gemini Vision API solely to generate your real-time posture report. Photos are never saved to persistent server disks, never archived into public storage buckets, and never shared, sold, or used for model training by <a href="https://redersoft.com" target="_blank" rel="noopener noreferrer" class="text-orange-700 underline font-semibold">RederSoft</a>.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">3. Local Device Storage Only</h4>
      <p class="text-stone-600 leading-relaxed">Any client preferences (such as audio mute state, past score history, or an optional client-provided API key) remain stored exclusively in your browser local storage (localStorage) on your own device. They are never sent to our servers.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">4. No Tracking, Profiling, or Advertising</h4>
      <p class="text-stone-600 leading-relaxed">We do not employ third-party advertising trackers, cross-site profiling pixels, or marketing analytics. Your browsing activity on this service remains private.</p>
    </div>
    <div>
      <h4 class="font-bold text-stone-900 text-xs mb-1">5. Third-Party AI Services</h4>
      <p class="text-stone-600 leading-relaxed">Visual inspection is processed via Google Gemini API in accordance with Google API terms and standard privacy guidelines.</p>
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

  // Initial Boot
  checkServerStatus();
  updateHistoryBadge();
  refreshIcons();
});

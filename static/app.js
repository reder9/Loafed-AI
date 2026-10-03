// Loafed AI - Feline Posture & Silhouette Inspection Controller

document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    slots: {
      front: null, // { file, previewUrl }
      side: null,
      top: null
    },
    catName: '',
    apiKey: localStorage.getItem('loafed_gemini_key') || '',
    model: localStorage.getItem('loafed_model') || 'gemini-3.8-flash',
    soundEnabled: localStorage.getItem('loafed_sound') !== 'false',
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
  const multiInput = document.getElementById('multiInput');
  const loadButtercupBtn = document.getElementById('loadButtercupBtn');
  const resetInspectorBtn = document.getElementById('resetInspectorBtn');
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  const downloadCertificateBtn = document.getElementById('downloadCertificateBtn');
  const certificateCanvas = document.getElementById('certificateCanvas');

  // Settings Elements
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelSelect = document.getElementById('modelSelect');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const clearKeyBtn = document.getElementById('clearKeyBtn');
  const serverKeyBadge = document.getElementById('serverKeyBadge');
  const settingsStatusText = document.getElementById('settingsStatusText');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const toastContainer = document.getElementById('toastContainer');

  // Modern Toast Notification System (Zero emojis, clean Lucide iconography)
  function showToast({ title = '', message = '', type = 'info', duration = 4500 } = {}) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast-card w-full p-3.5 rounded-xl shadow-lg border flex items-start gap-3 relative overflow-hidden bg-white text-stone-800';

    let iconName = 'info';
    let iconColor = 'text-stone-700 bg-stone-100 border-stone-200';
    let borderClass = 'border-stone-200 shadow-stone-900/5';

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

  // Synthesized Web Audio
  function playTone(type) {
    if (!state.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === 'complete') {
        const now = ctx.currentTime;
        [523.25, 659.25].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + i * 0.1);
          g.gain.setValueAtTime(0.08, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.6);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.6);
        });
      }
    } catch (e) {
      console.warn('Audio not available', e);
    }
  }

  // Check Server Status
  async function checkServerStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      state.serverHasKey = data.has_server_api_key;
      updateSettingsUI();
    } catch (e) {
      console.warn('Could not query /api/status', e);
    }
  }

  function updateSettingsUI() {
    if (state.serverHasKey) {
      serverKeyBadge.textContent = 'Active (.env / Server)';
      serverKeyBadge.className = 'font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200';
      settingsStatusText.textContent = 'Server Configured';
    } else if (state.apiKey) {
      serverKeyBadge.textContent = 'Client Key Set';
      serverKeyBadge.className = 'font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200';
      settingsStatusText.textContent = 'Client Configured';
    } else {
      serverKeyBadge.textContent = 'Public / Demo Mode';
      serverKeyBadge.className = 'font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200';
      settingsStatusText.textContent = 'Configuration';
    }

    if (state.apiKey) {
      apiKeyInput.value = state.apiKey;
    }
    modelSelect.value = state.model;
    updateSoundIcon();
  }

  function updateSoundIcon() {
    if (soundIcon) {
      soundIcon.setAttribute('data-lucide', state.soundEnabled ? 'volume-2' : 'volume-x');
      refreshIcons();
    }
  }

  // Slot Setup & Drag-and-Drop
  const slotIds = ['front', 'side', 'top'];
  slotIds.forEach(slotKey => {
    const slotEl = document.getElementById(`slot${slotKey.charAt(0).toUpperCase() + slotKey.slice(1)}`);
    const inputEl = document.getElementById(`input${slotKey.charAt(0).toUpperCase() + slotKey.slice(1)}`);
    const removeBtn = slotEl.querySelector('.remove-btn');

    // Click slot to browse
    slotEl.addEventListener('click', (e) => {
      if (e.target.closest('.remove-btn')) return;
      playTone('click');
      inputEl.click();
    });

    // File selected
    inputEl.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        setSlotFile(slotKey, e.target.files[0]);
      }
    });

    // Remove button
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playTone('click');
      clearSlot(slotKey);
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(evt => {
      slotEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        slotEl.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      slotEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        slotEl.classList.remove('drag-over');
      });
    });

    slotEl.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        setSlotFile(slotKey, files[0]);
      }
    });
  });

  // Global Clipboard Paste Support (Ctrl+V)
  window.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.items) return;
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          playTone('click');
          const emptySlot = slotIds.find(key => state.slots[key] === null) || 'front';
          setSlotFile(emptySlot, file);
          break;
        }
      }
    }
  });

  // Multi-file input
  multiInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      playTone('click');
      const files = Array.from(e.target.files).slice(0, 3);
      files.forEach((file, index) => {
        const slotKey = slotIds[index];
        if (slotKey) {
          setSlotFile(slotKey, file);
        }
      });
    }
  });

  function setSlotFile(slotKey, file) {
    const slotEl = document.getElementById(`slot${slotKey.charAt(0).toUpperCase() + slotKey.slice(1)}`);
    const emptyState = slotEl.querySelector('.slot-empty');
    const previewState = slotEl.querySelector('.slot-preview');
    const previewImg = slotEl.querySelector('.preview-img');

    const previewUrl = URL.createObjectURL(file);
    state.slots[slotKey] = { file, previewUrl };

    previewImg.src = previewUrl;
    emptyState.classList.add('hidden');
    previewState.classList.remove('hidden');
    slotEl.classList.add('has-image');

    updateSubmitButton();
    refreshIcons();
  }

  function clearSlot(slotKey) {
    const slotEl = document.getElementById(`slot${slotKey.charAt(0).toUpperCase() + slotKey.slice(1)}`);
    const inputEl = document.getElementById(`input${slotKey.charAt(0).toUpperCase() + slotKey.slice(1)}`);
    const emptyState = slotEl.querySelector('.slot-empty');
    const previewState = slotEl.querySelector('.slot-preview');
    const previewImg = slotEl.querySelector('.preview-img');

    if (state.slots[slotKey] && state.slots[slotKey].previewUrl) {
      URL.revokeObjectURL(state.slots[slotKey].previewUrl);
    }
    state.slots[slotKey] = null;
    inputEl.value = '';

    previewImg.src = '';
    previewState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    slotEl.classList.remove('has-image');

    updateSubmitButton();
    refreshIcons();
  }

  function updateSubmitButton() {
    const activeSlots = Object.values(state.slots).filter(s => s !== null);
    const count = activeSlots.length;

    if (count === 0) {
      gradeLoafBtn.disabled = true;
      gradeLoafBtn.className = 'w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-stone-300 cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2';
      photoCountBadge.textContent = '0 images selected';
      photoCountBadge.className = 'font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200';
    } else {
      gradeLoafBtn.disabled = false;
      gradeLoafBtn.className = 'w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-amber-700 hover:bg-amber-800 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer';
      
      if (count === 3) {
        photoCountBadge.textContent = '3 planes loaded (+5 Multi-Angle Bonus)';
        photoCountBadge.className = 'font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300';
      } else {
        photoCountBadge.textContent = `${count} plane${count > 1 ? 's' : ''} loaded`;
        photoCountBadge.className = 'font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200';
      }
    }
  }

  // Load Buttercup Preset
  loadButtercupBtn.addEventListener('click', async () => {
    playTone('click');
    loadButtercupBtn.disabled = true;
    loadButtercupBtn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Loading Baseline Dataset...</span>';
    refreshIcons();

    try {
      catNameInput.value = 'Buttercup';
      
      const loadPresetImage = async (url, slotKey, filename) => {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const file = new File([blob], filename, { type: 'image/jpeg' });
        setSlotFile(slotKey, file);
      };

      await Promise.all([
        loadPresetImage('/static/samples/buttercup_front.jpg', 'front', 'buttercup_front.jpg'),
        loadPresetImage('/static/samples/buttercup_side.jpg', 'side', 'buttercup_side.jpg'),
        loadPresetImage('/static/samples/buttercup_top.jpg', 'top', 'buttercup_top.jpg'),
      ]);

      loadButtercupBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-700"></i><span>Buttercup Dataset Loaded (3 Planes)</span>';
      loadButtercupBtn.className = 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-300 shadow-sm';
      refreshIcons();
      showToast({
        type: 'success',
        title: 'Calibration Dataset Loaded',
        message: 'Buttercup 3-angle dataset loaded into the inspector bay.'
      });
    } catch (e) {
      console.error('Failed to load sample photos', e);
      showToast({
        type: 'error',
        title: 'Dataset Unavailable',
        message: 'Could not load sample baseline images: ' + e.message
      });
      loadButtercupBtn.disabled = false;
      loadButtercupBtn.innerHTML = '<i data-lucide="flask-conical" class="w-3.5 h-3.5 text-amber-700"></i><span>Load Buttercup Dataset (3-Angle Baseline)</span>';
      refreshIcons();
    }
  });

  // Loading Cycle Messages (Technical & dryly analytical, zero emojis)
  const auditPhrases = [
    "Initializing orthographic projection tensors...",
    "Scanning ventral surface for undercarriage paw concealment...",
    "Calculating flank curvature and lateral drag coefficient...",
    "Performing bilateral dorsal boule symmetry analysis...",
    "Auditing pectoral limb tuck and ribcage alignment...",
    "Cross-referencing coat pattern and toast pigmentation index...",
    "Compiling final composite kinematics report..."
  ];

  let phraseInterval = null;
  function startLoadingAnimation() {
    loadingState.classList.remove('hidden');
    inspectorBay.classList.add('hidden');
    resultsSection.classList.add('hidden');
    window.scrollTo({ top: 120, behavior: 'smooth' });

    let index = 0;
    loadingPhrase.textContent = auditPhrases[0];
    loadingProgressBar.style.width = '20%';

    phraseInterval = setInterval(() => {
      index = (index + 1) % auditPhrases.length;
      loadingPhrase.textContent = auditPhrases[index];
      const pct = Math.min(25 + index * 12, 95);
      loadingProgressBar.style.width = `${pct}%`;
    }, 1200);
  }

  function stopLoadingAnimation() {
    clearInterval(phraseInterval);
    loadingProgressBar.style.width = '100%';
    setTimeout(() => {
      loadingState.classList.add('hidden');
    }, 300);
  }

  // Submit & Grade
  gradeLoafBtn.addEventListener('click', async () => {
    playTone('click');
    const activeSlots = Object.entries(state.slots).filter(([k, v]) => v !== null);
    if (activeSlots.length === 0) {
      showToast({
        type: 'warning',
        title: 'Photographs Required',
        message: 'Please provide at least one photo (front, side, or top perspective) to run the analysis.'
      });
      return;
    }

    startLoadingAnimation();

    const formData = new FormData();
    formData.append('cat_name', catNameInput.value.trim() || 'Anonymous Subject');
    formData.append('model', state.model);
    
    if (state.apiKey) {
      formData.append('api_key', state.apiKey);
    }

    if (state.slots.front) formData.append('front', state.slots.front.file);
    if (state.slots.side) formData.append('side', state.slots.side.file);
    if (state.slots.top) formData.append('top', state.slots.top.file);

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
      playTone('complete');

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
    document.getElementById('resultCatName').textContent = result.cat_name || 'Anonymous Subject';
    document.getElementById('resultHonoraryRank').textContent = result.loaf_rank;
    document.getElementById('resultBreadClass').textContent = result.bread_classification;
    document.getElementById('resultSummaryCritique').textContent = `"${result.summary_critique}"`;

    // Grade Stamp & Badges
    const gradeStamp = document.getElementById('gradeStamp');
    gradeStamp.textContent = result.grade_letter;
    
    // Stamp colors
    if (result.grade_letter.includes('A')) {
      gradeStamp.className = 'stamp text-amber-800 border-amber-800 text-lg';
    } else if (result.grade_letter.includes('B')) {
      gradeStamp.className = 'stamp text-stone-800 border-stone-800 text-lg';
    } else {
      gradeStamp.className = 'stamp text-stone-600 border-stone-600 text-lg';
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
      el.className = 'px-3 py-1 rounded-md text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200/80 shadow-xs';
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
      li.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-700 mt-1.5 shrink-0"></span><span>${cleanTip}</span>`;
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
      li.innerHTML = `<span class="w-1 h-1 rounded-full bg-stone-400 mt-1.5 shrink-0"></span><span>${cleanObs}</span>`;
      obsList.appendChild(li);
    });
  }

  function renderAngleReview(result) {
    const grid = document.getElementById('angleReviewGrid');
    grid.innerHTML = '';

    const angleLabels = [
      { key: 'front', label: 'Front Elevation', iconName: 'eye' },
      { key: 'side', label: 'Lateral Profile', iconName: 'move-horizontal' },
      { key: 'top', label: 'Dorsal Projection', iconName: 'compass' }
    ];

    angleLabels.forEach(angle => {
      const slotData = state.slots[angle.key];
      const note = result.angle_notes ? result.angle_notes[angle.key] : null;

      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-col gap-2';

      let imgHtml = '';
      if (slotData && slotData.previewUrl) {
        imgHtml = `<img src="${slotData.previewUrl}" class="w-full h-28 object-cover rounded-lg border border-stone-200" alt="${angle.label}">`;
      } else {
        imgHtml = `<div class="w-full h-28 bg-stone-200/50 rounded-lg flex items-center justify-center text-xs text-stone-400 italic">Not submitted</div>`;
      }

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <i data-lucide="${angle.iconName}" class="w-3.5 h-3.5 text-stone-600"></i> ${angle.label}
          </span>
          ${slotData ? '<span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Inspected</span>' : '<span class="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded">Omitted</span>'}
        </div>
        ${imgHtml}
        <p class="text-[11px] text-stone-600 leading-snug">${(note || (slotData ? 'Evaluated in composite score calculation.' : 'Submit this view for deeper geometric validation.')).replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')}</p>
      `;

      grid.appendChild(card);
    });

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
    playTone('click');
    resultsSection.classList.add('hidden');
    inspectorBay.classList.remove('hidden');
    window.scrollTo({ top: 120, behavior: 'smooth' });
    showToast({
      type: 'info',
      title: 'Inspector Ready',
      message: 'Returned to photo staging bay for a new feline inspection.'
    });
  });

  // Copy Summary (Technical & Clean Plain Text, Zero Emojis)
  copySummaryBtn.addEventListener('click', () => {
    playTone('click');
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

  // Certificate Download Generator (Canvas with clean professional styling, zero emojis)
  downloadCertificateBtn.addEventListener('click', () => {
    playTone('click');
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
    ctx.fillText('COMPOSITE SCORE', 250, 325);

    ctx.fillStyle = '#b45309';
    ctx.font = 'black 76px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(result.overall_score.toString(), 250, 410);

    ctx.fillStyle = '#a8a29e';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('/ 100', 250, 440);

    // Stamp
    ctx.save();
    ctx.translate(250, 520);
    ctx.rotate(-0.06);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;
    ctx.strokeRect(-60, -28, 120, 56);
    ctx.fillStyle = '#b45309';
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
    ctx.fillText('Planar Criteria Evaluation', 480, 335);

    const criteria = [
      { name: 'Paw Tuck & Undercarriage', score: `${result.paw_tuck.score}/25`, status: result.paw_tuck.status },
      { name: 'Tail Aerodynamics & Drag', score: `${result.tail_tuck.score}/25`, status: result.tail_tuck.status },
      { name: 'Flank Compression & Form', score: `${result.elbow_compactness.score}/25`, status: result.elbow_compactness.status },
      { name: 'Dorsal Symmetry & Crust', score: `${result.crust_symmetry.score}/25`, status: result.crust_symmetry.status }
    ];

    criteria.forEach((c, idx) => {
      const y = 385 + idx * 56;
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
      ctx.fillText((c.status || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ''), 480, y + 20);
    });

    // Auditor Quote
    ctx.fillStyle = '#44403c';
    ctx.font = 'italic 14px Georgia, serif';
    const cleanCritique = (result.summary_critique || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    const wrappedCritique = `"${cleanCritique.slice(0, 115)}..."`;
    ctx.fillText(wrappedCritique, 480, 645);

    // Footer
    ctx.fillStyle = '#a8a29e';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(`Evaluation Date: ${dateStr}  |  Certified by Loafed Machine Vision Engine`, w / 2, 745);

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

  // Settings Modal Controls
  openSettingsBtn.addEventListener('click', () => {
    playTone('click');
    settingsModal.classList.remove('hidden');
    refreshIcons();
  });

  closeSettingsBtn.addEventListener('click', () => {
    playTone('click');
    settingsModal.classList.add('hidden');
  });

  saveSettingsBtn.addEventListener('click', () => {
    playTone('click');
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;

    state.apiKey = key;
    state.model = model;
    localStorage.setItem('loafed_gemini_key', key);
    localStorage.setItem('loafed_model', model);

    updateSettingsUI();
    settingsModal.classList.add('hidden');
    showToast({
      type: 'success',
      title: 'Configuration Saved',
      message: key ? 'Personal API key configured for evaluations.' : 'Inspection model preferences updated.'
    });
  });

  clearKeyBtn.addEventListener('click', () => {
    playTone('click');
    apiKeyInput.value = '';
    state.apiKey = '';
    localStorage.removeItem('loafed_gemini_key');
    updateSettingsUI();
    showToast({
      type: 'info',
      title: 'Key Removed',
      message: 'Personal key cleared. System reverted to server/public evaluation mode.'
    });
  });

  // Sound Toggle
  soundToggleBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem('loafed_sound', state.soundEnabled ? 'true' : 'false');
    updateSoundIcon();
    if (state.soundEnabled) playTone('click');
  });

  // Capacity Alert Modal Controls
  const ovenAlertModal = document.getElementById('ovenAlertModal');
  const ovenAlertBody = document.getElementById('ovenAlertBody');
  const closeOvenAlertBtn = document.getElementById('closeOvenAlertBtn');
  const ovenAlertPresetBtn = document.getElementById('ovenAlertPresetBtn');
  const ovenAlertSettingsBtn = document.getElementById('ovenAlertSettingsBtn');

  function showOvenAlert(msg) {
    if (ovenAlertBody) ovenAlertBody.textContent = msg;
    if (ovenAlertModal) ovenAlertModal.classList.remove('hidden');
    refreshIcons();
  }

  if (closeOvenAlertBtn) {
    closeOvenAlertBtn.addEventListener('click', () => {
      playTone('click');
      ovenAlertModal.classList.add('hidden');
    });
  }

  if (ovenAlertPresetBtn) {
    ovenAlertPresetBtn.addEventListener('click', () => {
      playTone('click');
      ovenAlertModal.classList.add('hidden');
      loadButtercupBtn.click();
    });
  }

  if (ovenAlertSettingsBtn) {
    ovenAlertSettingsBtn.addEventListener('click', () => {
      playTone('click');
      ovenAlertModal.classList.add('hidden');
      openSettingsBtn.click();
    });
  }

  // Initial Boot
  checkServerStatus();
  refreshIcons();
});

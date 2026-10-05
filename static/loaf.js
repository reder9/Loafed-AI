// Loafed AI - Dedicated Mobile-Optimized Cat Loaf Scorecard Controller

document.addEventListener('DOMContentLoaded', () => {
  // State
  let activeLoaf = null;
  const currentOrigin = window.location.origin;

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
  const loafTopProgress = document.getElementById('loafTopProgress');
  const loafLoadingState = document.getElementById('loafLoadingState');
  const loafErrorState = document.getElementById('loafErrorState');
  const loafErrorMessage = document.getElementById('loafErrorMessage');
  const loafContent = document.getElementById('loafContent');

  const loafBreadcrumbCat = document.getElementById('loafBreadcrumbCat');
  const loafVerificationId = document.getElementById('loafVerificationId');
  const loafDate = document.getElementById('loafDate');
  const loafCatName = document.getElementById('loafCatName');
  const loafBakerName = document.getElementById('loafBakerName');
  const loafScoreStamp = document.getElementById('loafScoreStamp');

  const loafPhotoContainer = document.getElementById('loafPhotoContainer');
  const loafPhoto = document.getElementById('loafPhoto');
  const loafAnglesStrip = document.getElementById('loafAnglesStrip');
  const loafAnglesButtons = document.getElementById('loafAnglesButtons');

  const loafRank = document.getElementById('loafRank');
  const loafBread = document.getElementById('loafBread');
  const loafCritique = document.getElementById('loafCritique');

  const loafDragVal = document.getElementById('loafDragVal');
  const loafOarText = document.getElementById('loafOarText');
  const loafAngleBonusBadge = document.getElementById('loafAngleBonusBadge');
  const loafAngleBonusText = document.getElementById('loafAngleBonusText');

  const loafPawScore = document.getElementById('loafPawScore');
  const loafPawBar = document.getElementById('loafPawBar');
  const loafPawStatus = document.getElementById('loafPawStatus');
  const loafPawCritique = document.getElementById('loafPawCritique');

  const loafTailScore = document.getElementById('loafTailScore');
  const loafTailBar = document.getElementById('loafTailBar');
  const loafTailStatus = document.getElementById('loafTailStatus');
  const loafTailCritique = document.getElementById('loafTailCritique');

  const loafElbowScore = document.getElementById('loafElbowScore');
  const loafElbowBar = document.getElementById('loafElbowBar');
  const loafElbowStatus = document.getElementById('loafElbowStatus');
  const loafElbowCritique = document.getElementById('loafElbowCritique');

  const loafCrustScore = document.getElementById('loafCrustScore');
  const loafCrustBar = document.getElementById('loafCrustBar');
  const loafCrustStatus = document.getElementById('loafCrustStatus');
  const loafCrustCritique = document.getElementById('loafCrustCritique');

  const loafBadgesList = document.getElementById('loafBadgesList');
  const loafTipsContainer = document.getElementById('loafTipsContainer');
  const loafTipsList = document.getElementById('loafTipsList');

  const downloadCertBtn = document.getElementById('downloadCertBtn');
  const loafCertOwnershipTag = document.getElementById('loafCertOwnershipTag');
  const loafShareUrlInput = document.getElementById('loafShareUrlInput');
  const copyShareUrlBtn = document.getElementById('copyShareUrlBtn');
  const loafNativeShareBtn = document.getElementById('loafNativeShareBtn');
  const headerShareBtn = document.getElementById('headerShareBtn');
  const backToLeaderboardBtn = document.getElementById('backToLeaderboardBtn');

  const photoLightboxModal = document.getElementById('photoLightboxModal');
  const lightboxCatName = document.getElementById('lightboxCatName');
  const lightboxImage = document.getElementById('lightboxImage');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');
  const certificateCanvas = document.getElementById('certificateCanvas');

  // Parse Loaf ID from URL query param (?id= or ?loaf=) or path (/loaf/{id})
  function getLoafIdFromUrl() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('id')) return url.searchParams.get('id').trim();
    if (url.searchParams.get('loaf')) return url.searchParams.get('loaf').trim();

    const parts = url.pathname.split('/').filter(Boolean);
    const loafIdx = parts.indexOf('loaf');
    if (loafIdx !== -1 && parts[loafIdx + 1] && parts[loafIdx + 1] !== 'loaf.html') {
      return decodeURIComponent(parts[loafIdx + 1]).trim();
    }
    return null;
  }

  // Lightbox handlers
  function openLightbox(title, imgSrc) {
    if (!photoLightboxModal || !lightboxImage) return;
    lightboxImage.src = imgSrc;
    if (lightboxCatName) lightboxCatName.textContent = title;
    photoLightboxModal.classList.remove('hidden');
    refreshIcons();
  }

  function closeLightbox() {
    if (photoLightboxModal) photoLightboxModal.classList.add('hidden');
  }

  if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
  if (photoLightboxModal) {
    photoLightboxModal.addEventListener('click', (e) => {
      if (e.target === photoLightboxModal) closeLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && photoLightboxModal && !photoLightboxModal.classList.contains('hidden')) {
      closeLightbox();
    }
  });

  // Local ownership check
  function isLocalOwner(entryId) {
    try {
      const list = JSON.parse(localStorage.getItem('loafed_my_submissions') || '[]');
      if (Array.isArray(list) && list.includes(entryId)) return true;
    } catch (_) {}
    return false;
  }

  // Back button smart navigation
  if (backToLeaderboardBtn) {
    backToLeaderboardBtn.addEventListener('click', (e) => {
      if (document.referrer && document.referrer.includes('/leaderboard')) {
        e.preventDefault();
        window.history.back();
      }
    });
  }

  // Load image helper for canvas rendering
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

  // Official Archival Certificate Generator (1200x800)
  async function generateCertificate(result, shouldDownload = true) {
    const canvas = certificateCanvas;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Load active cat photo and mascot
    let catImg = null;
    const imgUrl = (result.photo_urls && result.photo_urls[0]) || result.thumbnail_url || null;
    if (imgUrl) {
      catImg = await loadImage(imgUrl);
    }
    const mascotLogoImg = await loadImage('/static/logo.png');

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

    // 3. Mascot Emblems in Header
    if (mascotLogoImg && mascotLogoImg.complete && mascotLogoImg.naturalWidth > 0) {
      try {
        ctx.drawImage(mascotLogoImg, 65, 58, 68, 58);
        ctx.drawImage(mascotLogoImg, w - 133, 58, 68, 58);
      } catch (_) {}
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

    // Cat's Photograph Frame
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
    let stampColor = '#c2410c';
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

    // 5. Right Column: Kinematic Criteria Breakdown & Chief Inspector Memo
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

      ctx.fillStyle = '#292524';
      ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(c.name, 438, rowY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#7c2d12';
      ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`${c.score} / 25`, 1112, rowY);
      ctx.textAlign = 'left';

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

      ctx.fillStyle = '#78716c';
      ctx.font = '11.5px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText((c.status || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ''), 438, rowY + 25);
    });

    // Chief Auditor Findings Memo Box
    ctx.fillStyle = '#fffaf5';
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(412, 528, 724, 170, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.roundRect(412, 528, 4.5, 170, [12, 0, 0, 12]);
    ctx.fill();

    ctx.fillStyle = '#c2410c';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('CHIEF AUDITOR FIELD NOTES', 434, 550);

    ctx.fillStyle = '#292524';
    const cleanCritique = (result.summary_critique || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    drawFittedCritique(ctx, `"${cleanCritique}"`, 434, 574, 680, 110);

    // 6. Footer: Inspector Signature, Seal & Certification Serial
    ctx.textAlign = 'left';
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    const dateStr = result.created_at ? new Date(result.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const hashStr = Math.abs(((result.overall_score || 0) * 31) ^ (result.cat_name ? result.cat_name.length * 17 : 42)).toString(16).toUpperCase().padStart(4, '0');
    ctx.fillText(`VERIFICATION ID: LF-2026-${result.grade_letter || 'A'}${hashStr}`, 68, 738);
    ctx.fillStyle = '#a8a29e';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText(`Certified on ${dateStr}`, 68, 755);

    // Signature
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1c1917';
    ctx.font = 'italic bold 19px Georgia, serif';
    ctx.fillText('Dr. Oliver Pawsbury', 640, 738);
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('CHIEF CRUST INSPECTOR', 640, 755);
    ctx.letterSpacing = '0px';

    // Official Gold Embossed Seal
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

        if (lines.length * tier.lineHeight <= maxHeight) break;
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

  // Load and Render Scorecard Data
  async function loadLoafScorecard(entryId) {
    if (!entryId) {
      showErrorState('No cat loaf specified in the link.');
      return;
    }

    if (loafTopProgress) loafTopProgress.classList.remove('hidden');
    if (loafLoadingState) loafLoadingState.classList.remove('hidden');
    if (loafErrorState) loafErrorState.classList.add('hidden');
    if (loafContent) loafContent.classList.add('hidden');

    try {
      const res = await fetch(`/api/loaf/${encodeURIComponent(entryId)}`);
      if (!res.ok) {
        throw new Error('Cat loaf details not found or may have been removed.');
      }
      const data = await res.json();
      activeLoaf = data;

      // Update Page Metadata
      const catName = data.cat_name || 'Anonymous Loaf';
      document.title = `${catName} Loaf Scorecard (${data.overall_score || 0} ${data.grade_letter || ''}) — Loafed AI`;

      // Verification Badge
      if (loafVerificationId) {
        const gradeCode = (data.grade_letter || 'A').replace(/[^a-zA-Z]/g, '');
        const hash = (data.entry_id || '').slice(0, 6).toUpperCase();
        loafVerificationId.textContent = `LF-2026-${gradeCode}${hash}`;
      }

      // Date
      if (loafDate) {
        let dateStr = 'Certified 2026';
        if (data.created_at) {
          try {
            const d = new Date(data.created_at);
            dateStr = `Certified ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          } catch (_) {}
        }
        loafDate.textContent = dateStr;
      }

      if (loafBreadcrumbCat) loafBreadcrumbCat.textContent = catName;
      if (loafCatName) loafCatName.textContent = catName;
      if (loafBakerName) loafBakerName.textContent = data.display_name || 'Anonymous Baker';
      if (loafScoreStamp) loafScoreStamp.textContent = `${data.overall_score || 0} ${data.grade_letter || ''}`;

      // Photo and angles
      const photoUrl = data.thumbnail_url || (Array.isArray(data.photo_urls) && data.photo_urls[0]) || '/static/logo.png';
      if (loafPhoto) {
        loafPhoto.src = photoUrl;
        loafPhoto.alt = `${catName} Loaf Portrait`;
      }
      if (loafPhotoContainer) {
        loafPhotoContainer.onclick = () => openLightbox(`${catName} Loaf Portrait`, loafPhoto.src);
      }

      // Multi-angle perspectives
      const rawUrls = Array.isArray(data.photo_urls) && data.photo_urls.length > 0
        ? data.photo_urls
        : (data.thumbnail_url ? [data.thumbnail_url] : []);
      const rawAngles = Array.isArray(data.angles) ? data.angles : [];

      if (loafAnglesStrip && loafAnglesButtons) {
        if (rawUrls.length > 1) {
          loafAnglesStrip.classList.remove('hidden');
          loafAnglesButtons.innerHTML = '';

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
            btn.className = `px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${idx === 0 ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-stone-700 border border-stone-200 hover:bg-orange-50'}`;
            btn.innerHTML = `<i data-lucide="${icon}" class="w-3.5 h-3.5"></i><span>${label}</span>`;

            btn.onclick = () => {
              if (loafPhoto) loafPhoto.src = url;
              if (loafPhotoContainer) {
                loafPhotoContainer.onclick = () => openLightbox(`${catName} (${label})`, url);
              }
              loafAnglesButtons.querySelectorAll('button').forEach(b => {
                b.className = 'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer bg-white text-stone-700 border border-stone-200 hover:bg-orange-50';
              });
              btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer bg-orange-600 text-white shadow-2xs';
              refreshIcons();
            };

            loafAnglesButtons.appendChild(btn);
          });
        } else {
          loafAnglesStrip.classList.add('hidden');
        }
      }

      if (loafRank) loafRank.textContent = data.loaf_rank || 'Certified Artisan Loaf';
      if (loafBread) loafBread.textContent = data.bread_classification || 'Golden Brioche';
      if (loafCritique) loafCritique.textContent = data.summary_critique || 'Exemplary feline loaf posture with symmetric bread contour.';

      if (loafDragVal) {
        const drag = data.drag_coefficient !== undefined ? Number(data.drag_coefficient).toFixed(2) : '0.04';
        loafDragVal.textContent = drag;
      }

      if (loafOarText) {
        loafOarText.textContent = data.oar_detected ? 'Oar Paw Deployed (Demerit)' : 'Flush Perimeter';
      }

      if (loafAngleBonusBadge && loafAngleBonusText) {
        if (data.multi_angle_bonus && data.multi_angle_bonus > 0) {
          loafAngleBonusText.textContent = `+${data.multi_angle_bonus} Multi-Angle Bonus`;
          loafAngleBonusBadge.classList.remove('hidden');
        } else {
          loafAngleBonusBadge.classList.add('hidden');
        }
      }

      // 4 Kinematic Pillars
      const pt = data.paw_tuck || {};
      const ptScore = pt.score !== undefined ? pt.score : 20;
      if (loafPawScore) loafPawScore.textContent = `${ptScore}/25`;
      if (loafPawBar) loafPawBar.style.width = `${Math.min(100, Math.max(10, (ptScore / 25) * 100))}%`;
      if (loafPawStatus) loafPawStatus.textContent = pt.status || 'Paw Concealment';
      if (loafPawCritique) loafPawCritique.textContent = pt.critique || 'Undercarriage perimeter inspected.';

      const tt = data.tail_tuck || {};
      const ttScore = tt.score !== undefined ? tt.score : 20;
      if (loafTailScore) loafTailScore.textContent = `${ttScore}/25`;
      if (loafTailBar) loafTailBar.style.width = `${Math.min(100, Math.max(10, (ttScore / 25) * 100))}%`;
      if (loafTailStatus) loafTailStatus.textContent = tt.status || 'Tail Tuck & Flank Wrap';
      if (loafTailCritique) loafTailCritique.textContent = tt.critique || 'Flank wrap curvature inspected.';

      const ec = data.elbow_compactness || {};
      const ecScore = ec.score !== undefined ? ec.score : 20;
      if (loafElbowScore) loafElbowScore.textContent = `${ecScore}/25`;
      if (loafElbowBar) loafElbowBar.style.width = `${Math.min(100, Math.max(10, (ecScore / 25) * 100))}%`;
      if (loafElbowStatus) loafElbowStatus.textContent = ec.status || 'Elbow Form & Compactness';
      if (loafElbowCritique) loafElbowCritique.textContent = ec.critique || 'Shoulder joint fold inspected.';

      const cs = data.crust_symmetry || {};
      const csScore = cs.score !== undefined ? cs.score : 20;
      if (loafCrustScore) loafCrustScore.textContent = `${csScore}/25`;
      if (loafCrustBar) loafCrustBar.style.width = `${Math.min(100, Math.max(10, (csScore / 25) * 100))}%`;
      if (loafCrustStatus) loafCrustStatus.textContent = cs.status || 'Crust Symmetry & Toast';
      if (loafCrustCritique) loafCrustCritique.textContent = cs.critique || 'Bilateral dorsal coat inspected.';

      // Badges
      if (loafBadgesList) {
        const badges = Array.isArray(data.badges) && data.badges.length > 0
          ? data.badges
          : ['Certified Feline Loaf', 'Zero Paw Visibility', `${data.bread_classification || 'Artisan'} Silhouette`];
        loafBadgesList.innerHTML = badges.map(b => `
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-orange-200 text-stone-800 font-bold text-xs shadow-2xs">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-orange-600"></i>
            <span>${escapeHtml(b)}</span>
          </span>
        `).join('');
      }

      // Tips
      if (loafTipsContainer && loafTipsList) {
        const tips = Array.isArray(data.fun_tips_for_cat) && data.fun_tips_for_cat.length > 0
          ? data.fun_tips_for_cat
          : [];
        if (tips.length > 0) {
          loafTipsList.innerHTML = tips.map(t => `<li>${escapeHtml(t)}</li>`).join('');
          loafTipsContainer.classList.remove('hidden');
        } else {
          loafTipsContainer.classList.add('hidden');
        }
      }

      // Share URL
      const shareUrl = `${currentOrigin}/loaf?id=${encodeURIComponent(data.entry_id)}`;
      if (loafShareUrlInput) loafShareUrlInput.value = shareUrl;

      // Ownership badge
      const isOwner = isLocalOwner(data.entry_id);
      if (loafCertOwnershipTag) {
        if (isOwner) {
          loafCertOwnershipTag.textContent = 'Owner Access (Archival)';
          loafCertOwnershipTag.className = 'px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300';
        } else {
          loafCertOwnershipTag.textContent = 'Archival 1200x800';
          loafCertOwnershipTag.className = 'px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-200/90 text-amber-900 border border-amber-300';
        }
      }

      // Show content
      if (loafLoadingState) loafLoadingState.classList.add('hidden');
      if (loafTopProgress) loafTopProgress.classList.add('hidden');
      if (loafContent) {
        loafContent.classList.remove('hidden');
        loafContent.classList.add('animate-in', 'fade-in', 'duration-300');
      }
      refreshIcons();

    } catch (err) {
      console.error('Error loading loaf:', err);
      showErrorState(err.message || 'Cat loaf record not found or unavailable.');
    } finally {
      if (loafTopProgress) loafTopProgress.classList.add('hidden');
    }
  }

  function showErrorState(msg) {
    if (loafLoadingState) loafLoadingState.classList.add('hidden');
    if (loafTopProgress) loafTopProgress.classList.add('hidden');
    if (loafContent) loafContent.classList.add('hidden');
    if (loafErrorState) loafErrorState.classList.remove('hidden');
    if (loafErrorMessage) loafErrorMessage.textContent = msg;
    refreshIcons();
  }

  // Certificate Download Action
  if (downloadCertBtn) {
    downloadCertBtn.addEventListener('click', async () => {
      if (!activeLoaf) return;
      const origText = downloadCertBtn.innerHTML;
      try {
        downloadCertBtn.disabled = true;
        downloadCertBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Rendering Certificate...</span>`;
        refreshIcons();

        await generateCertificate(activeLoaf, true);
        showToast({
          type: 'success',
          title: 'Certificate Downloaded',
          message: `Official certificate for ${activeLoaf.cat_name || 'your cat'} has been saved!`
        });
      } catch (err) {
        console.error('Failed to generate certificate:', err);
        showToast({
          type: 'error',
          title: 'Export Failed',
          message: 'Unable to render the certificate image.'
        });
      } finally {
        downloadCertBtn.disabled = false;
        downloadCertBtn.innerHTML = origText;
        refreshIcons();
      }
    });
  }

  // Sharing Actions
  async function shareActiveLoaf() {
    if (!activeLoaf) return;
    const catName = activeLoaf.cat_name || 'Cat Loaf';
    const score = activeLoaf.overall_score || 0;
    const grade = activeLoaf.grade_letter || '';
    const shareUrl = `${currentOrigin}/loaf?id=${encodeURIComponent(activeLoaf.entry_id)}`;

    const shareData = {
      title: `${catName} — Loafed AI Certified Feline`,
      text: `Check out ${catName} audited by Loafed AI with a verified score of ${score} ${grade}!`,
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
        message: `Scorecard link for ${catName} copied to clipboard!`
      });
    } catch (_) {
      if (loafShareUrlInput) {
        loafShareUrlInput.select();
        document.execCommand('copy');
      }
      showToast({
        type: 'success',
        title: 'Share Link Copied',
        message: `Scorecard link copied to clipboard!`
      });
    }
  }

  if (copyShareUrlBtn && loafShareUrlInput) {
    copyShareUrlBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(loafShareUrlInput.value);
        showToast({
          type: 'success',
          title: 'Link Copied',
          message: 'Scorecard link copied to clipboard!'
        });
      } catch (_) {
        loafShareUrlInput.select();
        document.execCommand('copy');
        showToast({
          type: 'success',
          title: 'Link Copied',
          message: 'Scorecard link copied to clipboard!'
        });
      }
    });
  }

  if (loafNativeShareBtn) loafNativeShareBtn.addEventListener('click', shareActiveLoaf);
  if (headerShareBtn) headerShareBtn.addEventListener('click', shareActiveLoaf);

  // Boot
  const loafId = getLoafIdFromUrl();
  loadLoafScorecard(loafId);
  refreshIcons();
});

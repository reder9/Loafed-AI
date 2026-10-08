(() => {
  const confirmationKey = 'loafed_age_confirmed_v1';

  try {
    if (window.localStorage.getItem('loafed_id_token')) {
      document.documentElement.classList.add('user-logged-in');
    }
  } catch (error) {
    // Authentication UI can still initialize normally if storage is unavailable.
  }

  document.querySelectorAll('link[data-async-fonts]').forEach((fontStylesheet) => {
    const activateFontStyles = () => { fontStylesheet.media = 'all'; };
    fontStylesheet.addEventListener('load', activateFontStyles, { once: true });
    if (fontStylesheet.sheet) activateFontStyles();
  });

  function hasStoredConfirmation() {
    try {
      return window.localStorage.getItem(confirmationKey) === 'yes';
    } catch (error) {
      return false;
    }
  }

  function showAgeGate() {
    window.loafedAgeConfirmed = false;
    document.body.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ageGateTitle');

    const card = document.createElement('section');
    card.className = 'bakery-card max-w-lg w-full p-6 sm:p-8 bg-white border border-orange-200 shadow-2xl';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'text-[11px] uppercase tracking-widest font-extrabold text-orange-700 mb-2';
    eyebrow.textContent = 'Adults only';

    const title = document.createElement('h1');
    title.id = 'ageGateTitle';
    title.className = 'text-2xl font-black text-stone-900 mb-3';
    title.textContent = 'This AI service is for people 18 and older';

    const ageCopy = document.createElement('p');
    ageCopy.className = 'text-sm text-stone-700 leading-relaxed mb-3';
    ageCopy.textContent = 'Google’s Gemini API terms require users to be at least 18 and prohibit API clients directed to or likely accessed by people under 18. Continue only if you are 18 or older. This self-declaration does not verify identity or guarantee that the separate audience restriction is met.';

    const dataCopy = document.createElement('p');
    dataCopy.className = 'text-xs text-stone-600 leading-relaxed mb-4';
    dataCopy.textContent = 'Photos submitted for grading are sent to Google Gemini. Depending on whether the API project has active billing, Google’s terms may allow submitted content to be used to improve services and reviewed by people. Do not upload sensitive, confidential, or personal information.';

    const links = document.createElement('p');
    links.className = 'text-xs text-stone-600 mb-5';
    const termsLink = document.createElement('a');
    termsLink.href = '/terms.html';
    termsLink.className = 'text-orange-800 underline font-semibold';
    termsLink.textContent = 'Loafed terms';
    const separator = document.createTextNode(' · ');
    const googleLink = document.createElement('a');
    googleLink.href = 'https://ai.google.dev/gemini-api/terms';
    googleLink.target = '_blank';
    googleLink.rel = 'noopener noreferrer';
    googleLink.className = 'text-orange-800 underline font-semibold';
    googleLink.textContent = 'Google Gemini API terms';
    links.append(termsLink, separator, googleLink);

    const actions = document.createElement('div');
    actions.className = 'flex flex-col gap-2';

    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'min-h-[44px] w-full px-4 py-3 rounded-xl bg-orange-700 hover:bg-orange-800 text-white font-bold text-sm transition-colors';
    continueButton.textContent = 'I am 18 or older — continue';
    continueButton.addEventListener('click', () => {
      window.loafedAgeConfirmed = true;
      try {
        window.localStorage.setItem(confirmationKey, 'yes');
      } catch (error) {
        // Keep the declaration for this page session when storage is blocked.
      }
      document.body.style.overflow = '';
      overlay.remove();
    });

    const underAgeButton = document.createElement('button');
    underAgeButton.type = 'button';
    underAgeButton.className = 'min-h-[44px] w-full rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm transition-colors';
    underAgeButton.textContent = 'I am under 18';
    underAgeButton.addEventListener('click', () => {
      ageCopy.textContent = 'You cannot use this service. No photos will be submitted. You may close this page.';
      dataCopy.remove();
      links.remove();
      continueButton.remove();
      underAgeButton.disabled = true;
      underAgeButton.textContent = 'Access unavailable';
      underAgeButton.className = 'min-h-[44px] w-full rounded-xl bg-stone-100 text-stone-500 font-semibold text-sm cursor-not-allowed';
    });

    actions.append(continueButton, underAgeButton);
    card.append(eyebrow, title, ageCopy, dataCopy, links, actions);
    overlay.append(card);
    document.body.append(overlay);
    continueButton.focus();
  }

  function initialize() {
    if (hasStoredConfirmation()) {
      window.loafedAgeConfirmed = true;
      return;
    }
    showAgeGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();

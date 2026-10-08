(() => {
  try {
    if (window.localStorage.getItem('loafed_id_token')) {
      document.documentElement.classList.add('user-logged-in');
    }
    // Remove the one-time age acknowledgement from earlier versions; the app no longer uses it.
    window.localStorage.removeItem('loafed_age_confirmed_v1');
  } catch (error) {
    // Authentication UI can still initialize normally if storage is unavailable.
  }

  document.querySelectorAll('link[data-async-fonts]').forEach((fontStylesheet) => {
    const activateFonts = () => { fontStylesheet.media = 'all'; };
    fontStylesheet.addEventListener('load', activateFonts, { once: true });
    if (fontStylesheet.sheet) activateFonts();
  });
})();

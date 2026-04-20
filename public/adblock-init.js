/**
 * Nextflix Shield — Early Initialization
 * Monkey-patches key APIs before any ad-scripts load.
 */
(function() {
  const originalOpen = window.open;
  const originalFetch = window.fetch;
  
  // High-priority targets from your logs
  const earlyBlocklist = [
    'rtmark.net', '104processors.net', 'yandex.ru', 
    'adscore.info', 'doubleclick.net', 'google-analytics.com', 
    'vidlink.pro/api', 'tarzansaminate.cfd', 'streameeeeee.site'
  ];

  // 🛑 GLOBAL POPUP KILLER
  window.open = function(url, ...args) {
    const urlStr = url?.toString() || '';
    console.warn('[Shield] Intercepted window.open attempt to:', urlStr);
    
    // We strictly block all popups from the player context
    if (urlStr !== 'about:blank' && !urlStr.startsWith(window.location.origin)) {
        console.error('[Shield] BLOCKED EXTERNAL POPUP:', urlStr);
        return { 
            focus: () => {}, 
            close: () => {}, 
            closed: true,
            location: { replace: () => {} }
        };
    }
    return originalOpen.apply(this, [url, ...args]);
  };

  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (earlyBlocklist.some(d => url.includes(d))) {
      console.warn('[Shield] BLOCKED STEALTH FETCH:', url);
      return Promise.resolve(new Response('/* Shielded */', { 
          status: 200, 
          headers: { 'Content-Type': 'application/javascript' } 
      }));
    }
    return originalFetch.apply(this, args);
  };

  console.log('🛡️ Nextflix Web Shield Initialized');
})();

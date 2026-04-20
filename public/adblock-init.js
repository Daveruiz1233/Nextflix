/**
 * Nextflix Shield — Early Initialization (Operation Retro)
 * Pure ES5 Version for Legacy Hardware (iPhone 6s Plus)
 */
(function() {
  var originalOpen = window.open;
  var originalFetch = window.fetch;
  
  // High-priority targets from your logs
  var earlyBlocklist = [
    'rtmark.net', '104processors.net', 'yandex.ru', 
    'adscore.info', 'doubleclick.net', 'google-analytics.com', 
    'vidlink.pro/api', 'tarzansaminate.cfd', 'streameeeeee.site'
  ];

  // 🛑 GLOBAL POPUP KILLER (ES5 Arguments pattern)
  window.open = function(url) {
    var args = Array.prototype.slice.call(arguments);
    var urlStr = (url && url.toString) ? url.toString() : '';
    console.warn('[Shield] Intercepted window.open attempt to:', urlStr);
    
    // We strictly block all popups from the player context
    if (urlStr !== 'about:blank' && urlStr.indexOf(window.location.origin) !== 0) {
        console.error('[Shield] BLOCKED EXTERNAL POPUP:', urlStr);
        return { 
            focus: function() {}, 
            close: function() {}, 
            closed: true,
            location: { replace: function() {} }
        };
    }
    return originalOpen.apply(this, args);
  };

  window.fetch = function() {
    var args = arguments;
    try {
      var firstArg = args[0];
      var url = '';
      
      if (typeof firstArg === 'string') {
        url = firstArg;
      } else if (firstArg && typeof firstArg === 'object') {
        url = firstArg.url || (firstArg.toString ? firstArg.toString() : '');
      }

      var isBlocked = false;
      for (var i = 0; i < earlyBlocklist.length; i++) {
        if (url && url.indexOf(earlyBlocklist[i]) !== -1) {
          isBlocked = true;
          break;
        }
      }

      if (isBlocked) {
        console.warn('[Shield] BLOCKED STEALTH FETCH:', url);
        return Promise.resolve(new Response('/* Shielded */', { 
            status: 200, 
            statusText: 'OK',
            headers: { 'Content-Type': 'application/javascript' } 
        }));
      }
    } catch (e) {
      console.error('[Shield] Fetch interceptor error:', e);
    }
    return originalFetch.apply(this, args);
  };

  console.log('🛡️ Nextflix Web Shield v1.1.3 (Retro) Initialized');
})();

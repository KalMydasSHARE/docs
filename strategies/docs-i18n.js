/**
 * KalMydas Docs, i18n (FR/EN) toggle
 * Adds a floating FR/EN toggle to every docs page.
 * Shares language preference with landing & app via:
 *   - cookie `km_lang` on .kalmydas.com (authoritative, cross-subdomain)
 *   - localStorage 'km_lang' (legacy + local-dev fallback)
 *   - URL query `?lang=fr|en` (survives Safari ITP 7-day cookie cap when coming from a sibling subdomain)
 * Uses data-en attributes on elements for EN translations.
 * FR content is the default (in the HTML). EN stored in data-en attributes.
 */
(function () {
  'use strict';

  /* ─── Cross-subdomain language plumbing ─────────────────────────────────
     Safari ITP 2.1+ caps client-set cookies (document.cookie) to 7 days
     regardless of max-age. To survive that cap across cross-subdomain nav,
     we also accept ?lang=fr|en as a query param, decorated on outgoing links
     by installCrossSubdomainClickShim. A functional language cookie is
     exempt from GDPR consent (ePrivacy art. 5.3).
  ───────────────────────────────────────────────────────────────────────── */

  function isKalmydasHost(host) {
    return host === 'kalmydas.com' || host.endsWith('.kalmydas.com');
  }

  function readSharedCookie() {
    var m = document.cookie.match(/(?:^|; )km_lang=([^;]+)/);
    if (m && (m[1] === 'fr' || m[1] === 'en')) return m[1];
    return null;
  }

  function readQueryLang() {
    try {
      var m = (location.search || '').match(/[?&]lang=(fr|en)\b/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  function writeSharedCookie(lang) {
    var isKalmydas = isKalmydasHost(location.hostname);
    var domainPart = isKalmydas ? '; domain=.kalmydas.com' : '';
    var securePart = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = 'km_lang=' + lang + '; path=/' + domainPart + '; max-age=31536000; SameSite=Lax' + securePart;
  }

  function cleanLangFromUrl() {
    try {
      if (!window.history || typeof history.replaceState !== 'function') return;
      var url = new URL(location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        var newSearch = url.searchParams.toString();
        var newUrl = url.pathname + (newSearch ? '?' + newSearch : '') + url.hash;
        history.replaceState(null, '', newUrl);
      }
    } catch (e) {}
  }

  /**
   * Detect language.
   * Priority: 0. ?lang query · 1. shared cookie · 2. localStorage · 3. navigator.language · 4. FR
   */
  function detectInitialLang() {
    var qLang = readQueryLang();
    if (qLang) return qLang;
    var cookieLang = readSharedCookie();
    if (cookieLang) return cookieLang;
    try {
      var saved = localStorage.getItem('km_lang');
      if (saved === 'fr' || saved === 'en') return saved;
    } catch (e) {}
    var browserLang = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
    return browserLang.indexOf('fr') === 0 ? 'fr' : 'en';
  }

  function installCrossSubdomainClickShim(getLang) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var anchor = e.target && e.target.closest && e.target.closest('a[href]');
      if (!anchor) return;
      var href = anchor.getAttribute('href');
      if (!href) return;
      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.hostname === location.hostname) return;
      if (!isKalmydasHost(url.hostname)) return;
      if (url.searchParams.has('lang')) return;
      url.searchParams.set('lang', getLang());
      anchor.setAttribute('href', url.toString());
    }, true);
  }

  /* ─── i18n engine ───────────────────────────────────────────────────── */

  var currentLang = detectInitialLang();

  // Cache FR content on first run
  var frCache = new Map();

  function cacheFR() {
    document.querySelectorAll('[data-en]').forEach(function (el) {
      frCache.set(el, el.innerHTML);
    });
  }

  function applyLang(lang) {
    currentLang = lang;
    writeSharedCookie(lang);
    try { localStorage.setItem('km_lang', lang); } catch (e) {}
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (lang === 'en') {
        if (!frCache.has(el)) frCache.set(el, el.innerHTML);
        el.innerHTML = el.getAttribute('data-en');
      } else {
        if (frCache.has(el)) el.innerHTML = frCache.get(el);
      }
    });

    // Update toggle UI
    var toggle = document.getElementById('docsLangToggle');
    if (toggle) {
      toggle.querySelectorAll('.dlang-opt').forEach(function (opt) {
        opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
      });
    }
  }

  function injectToggle() {
    // CSS
    var style = document.createElement('style');
    style.textContent = [
      '.docs-lang-toggle{position:fixed;top:16px;right:16px;z-index:99999;display:flex;align-items:center;background:rgba(10,11,13,0.92);border:1px solid rgba(241,196,15,0.3);border-radius:20px;padding:2px;cursor:pointer;user-select:none;backdrop-filter:blur(12px);box-shadow:0 4px 20px rgba(0,0,0,0.4);}',
      '.dlang-opt{padding:4px 12px;border-radius:16px;font-size:0.78rem;font-weight:600;color:rgba(255,255,255,0.45);transition:all 0.3s;letter-spacing:0.02em;font-family:Outfit,Arial,sans-serif;}',
      '.dlang-opt.active{background:linear-gradient(135deg,#c9a84c,#f1da7a);color:#0a0a0f;}',
      '.dlang-opt:hover:not(.active){color:rgba(255,255,255,0.7);}',
      '@media(max-width:600px){.docs-lang-toggle{top:auto;bottom:16px;right:16px;}}'
    ].join('\n');
    document.head.appendChild(style);

    // Toggle button
    var div = document.createElement('div');
    div.id = 'docsLangToggle';
    div.className = 'docs-lang-toggle';
    div.setAttribute('role', 'button');
    div.setAttribute('aria-label', 'Switch language');
    div.innerHTML = '<span class="dlang-opt' + (currentLang === 'fr' ? ' active' : '') + '" data-lang="fr">FR</span>' +
                    '<span class="dlang-opt' + (currentLang === 'en' ? ' active' : '') + '" data-lang="en">EN</span>';
    document.body.appendChild(div);

    div.addEventListener('click', function () {
      applyLang(currentLang === 'fr' ? 'en' : 'fr');
    });
  }

  function init() {
    cacheFR();
    injectToggle();

    // Persist detected language to the shared cookie so siblings see it.
    writeSharedCookie(currentLang);

    // If we arrived with ?lang=XX, strip it from the URL now that it's promoted.
    cleanLangFromUrl();

    // Decorate outgoing cross-subdomain links so Safari ITP cannot desync us.
    installCrossSubdomainClickShim(function () { return currentLang; });

    if (currentLang === 'en') applyLang('en');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

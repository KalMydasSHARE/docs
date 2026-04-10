/**
 * KalMydas Docs — i18n (FR/EN) toggle
 * Adds a floating FR/EN toggle to every docs page.
 * Shares language preference with landing & app via localStorage key 'km_lang'.
 * Uses data-en attributes on elements for EN translations.
 * FR content is the default (in the HTML). EN stored in data-en attributes.
 */
(function () {
  'use strict';

  var currentLang = 'fr';
  try {
    var saved = localStorage.getItem('km_lang');
    if (saved === 'en') currentLang = 'en';
  } catch (e) {}

  // Cache FR content on first run
  var frCache = new Map();

  function cacheFR() {
    document.querySelectorAll('[data-en]').forEach(function (el) {
      frCache.set(el, el.innerHTML);
    });
  }

  function applyLang(lang) {
    currentLang = lang;
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
    if (currentLang === 'en') applyLang('en');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

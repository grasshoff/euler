/* Reading guide.
   1. The "Read first" sticker and banner on a landing page can be switched off. The card on the landing page stays
      either way. The state is kept per site in localStorage.
   2. The language of the guide (tour and cards, de/en): kept in localStorage 'guide-lang', else the page language.
      It is set on <html data-guide-lang>, the cards show the matching text and guide-player.js reloads its tour on the
      event 'guide:lang'. */
(function () {
  'use strict';
  var slug = (document.currentScript && document.currentScript.dataset.slug) || '';
  var key = 'guide-hint:' + slug;
  var root = document.documentElement;
  function set(off) {
    root.classList.toggle('guide-off', off);
    try { if (off) localStorage.setItem(key, 'off'); else localStorage.removeItem(key); } catch (e) {}
  }
  function lang(l, announce) {
    root.dataset.guideLang = l;
    var bs = document.querySelectorAll('[data-guide-lang-set]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', String(bs[i].dataset.guideLangSet === l));
    if (announce) {
      try { localStorage.setItem('guide-lang', l); } catch (e) {}
      document.dispatchEvent(new CustomEvent('guide:lang', { detail: { lang: l } }));
    }
  }
  var start = root.lang && root.lang.slice(0, 2) === 'en' ? 'en' : 'de';
  try { var s = localStorage.getItem('guide-lang'); if (s === 'de' || s === 'en') start = s; } catch (e) {}
  lang(start, false);
  document.addEventListener('DOMContentLoaded', function () { lang(root.dataset.guideLang, false); });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-guide-off]')) set(true);
    else if (e.target.closest('[data-guide-on]')) set(false);
    var b = e.target.closest('[data-guide-lang-set]');
    if (b && b.dataset.guideLangSet !== root.dataset.guideLang) lang(b.dataset.guideLangSet, true);
  });
})();

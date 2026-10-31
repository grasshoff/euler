/* Reading guide.
   1. The "Read first" sticker and banner on a landing page can be switched off. The card on the landing page stays
      either way. The state is kept per site in localStorage.
   2. The language of the guide (tour and cards, de/en): kept in localStorage 'guide-lang', else the page language.
      It is set on <html data-guide-lang>, the cards show the matching text and guide-player.js reloads its tour on the
      event 'guide:lang'.
   3. Handing the language to the viewer (FAMULUS-8, owner decision E5, 31 Oct 2026): only when the reader clicked DE/EN
      in the guide ('guide-lang-gewaehlt' = 1 in localStorage), the viewer links ("Ausprobieren" a.try and the open
      button of the player's end card a.gp-go) get ?ui=<guide language> at the moment they are followed. Without a click
      no ui is added and the viewer shows the browser language (visibly). The built links stay free of the capture's ui
      (build.py card links). */
(function () {
  'use strict';
  var slug = (document.currentScript && document.currentScript.dataset.slug) || '';
  var key = 'guide-hint:' + slug;
  var CHOSEN = 'guide-lang-gewaehlt';
  var root = document.documentElement;
  var picked = false;   // a click on this page, also when localStorage is blocked
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
  // a real click on DE/EN is the reader's choice, also when it confirms the language already shown
  function choose(l) {
    picked = true;
    try { localStorage.setItem(CHOSEN, '1'); localStorage.setItem('guide-lang', l); } catch (e) {}
    if (l !== root.dataset.guideLang) lang(l, true);
  }
  function chosen() {
    if (picked) return true;
    try { return localStorage.getItem(CHOSEN) === '1'; } catch (e) { return false; }
  }
  // the viewer link carries the chosen language; set at pointerdown/click/context menu, so a new tab gets it too
  function carry(e) {
    var a = e.target && e.target.closest && e.target.closest('a.try[href], a.gp-go[href]');
    if (!a || a.classList.contains('quiet') || !chosen()) return;
    var l = root.dataset.guideLang;
    if (l !== 'de' && l !== 'en') return;
    var u;
    try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (!/^https?:$/.test(u.protocol) || (u.origin === location.origin && u.pathname === location.pathname)) return;
    if (u.searchParams.get('ui') === l) return;
    u.searchParams.set('ui', l);
    a.href = u.href;
  }
  var start = root.lang && root.lang.slice(0, 2) === 'en' ? 'en' : 'de';
  try { var s = localStorage.getItem('guide-lang'); if (s === 'de' || s === 'en') start = s; } catch (e) {}
  lang(start, false);
  document.addEventListener('DOMContentLoaded', function () { lang(root.dataset.guideLang, false); });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-guide-off]')) set(true);
    else if (e.target.closest('[data-guide-on]')) set(false);
    var b = e.target.closest('[data-guide-lang-set]');
    if (b && (b.dataset.guideLangSet === 'de' || b.dataset.guideLangSet === 'en')) choose(b.dataset.guideLangSet);
  });
  ['pointerdown', 'click', 'auxclick', 'contextmenu'].forEach(function (t) { document.addEventListener(t, carry, true); });
})();

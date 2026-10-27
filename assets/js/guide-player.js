/* The guide player: plays a tour captured from the live ai-viewer (guide_capture.py -> guide/<lang>/tour.json).
   Every picture is a real screenshot; the player lays the pointer, the clicks, the keys, the spotlight and the
   captions over it and moves a camera in on what a step shows.

     <div class="gp" data-guide="tour" data-base="guide/">            the entrance tour, with controls
     <div class="gp" data-guide="card:auswahl" data-base="guide/">    a guide card: the card's steps as a silent loop

   The language follows the guide switch (document.documentElement.dataset.guideLang, set by guide.js) and changes
   with the event 'guide:lang'. A tour plays by itself once it is in view and stops when it leaves; with
   prefers-reduced-motion nothing moves by itself: the steps are turned with the buttons. */
(function () {
  'use strict';
  const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cache = {};
  const T = {
    de: { unmute: 'Ton einschalten', sound: 'Erzählung an/aus', play: 'Abspielen', pause: 'Anhalten', prev: 'Schritt zurück', next: 'Schritt vor', cc: 'Untertitel', start: 'Rundgang starten', close: 'Vollbild schließen', back: 'Zurück zur Hauptseite',
          again: 'Noch einmal', open: 'Diese Seite im Viewer öffnen', all: 'Alle Anleitungen', step: 'Schritt', loading: 'Der Rundgang wird geladen …',
          missing: 'Für diese Sprache ist noch kein Rundgang aufgenommen.' },
    en: { unmute: 'Turn the sound on', sound: 'Narration on/off', play: 'Play', pause: 'Pause', prev: 'Previous step', next: 'Next step', cc: 'Captions', start: 'Start the tour', close: 'Close full screen', back: 'Back to the main page',
          again: 'Play again', open: 'Open this page in the viewer', all: 'All guides', step: 'Step', loading: 'Loading the tour …',
          missing: 'No tour has been recorded for this language yet.' },
  };
  const lang = () => (document.documentElement.dataset.guideLang || document.documentElement.lang || 'de').slice(0, 2);
  const t = k => (T[lang()] || T.en)[k];
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // every file of a tour carries the build (?v=): a new voice or capture is never served from the browser's cache
  let V = '';
  const q = f => f + (V ? (f.includes('?') ? '&' : '?') + 'v=' + V : '');
  function load(base, lg) {
    const url = q(base + lg + '/tour.json');
    if (!cache[url]) cache[url] = fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
    return cache[url];
  }

  const CURSOR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.5 L4 19 L8.6 14.9 L11.6 21.4 L14.4 20.1 L11.5 13.8 L17.6 13.6 Z" ' +
    'fill="#fffdf8" stroke="#00152e" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  class Player {
    constructor(root) {
      this.root = root;
      this.kind = (root.dataset.guide || 'tour').split(':');
      this.card = this.kind[0] === 'card' ? this.kind[1] : null;
      this.base = root.dataset.base || 'guide/';
      if (root.dataset.v) V = root.dataset.v;
      this.build();
      this.token = 0;
      this.playing = false;
      this.visible = false;
      this.open();
      document.addEventListener('guide:lang', () => this.open());
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => es.forEach(e => {
          this.visible = e.intersectionRatio >= 0.45;
          if (RM) return;
          // the entrance: the tour starts by itself the first time it is in view, silent
          if (this.visible && !this.userPaused) this.play(!this.card);
          if (!this.visible && this.playing && !(this.sound && !this.card)) this.pause(false);
        }), { threshold: [0, 0.45, 0.8] }).observe(root);
      }
    }

    build() {
      const r = this.root;
      r.innerHTML = '';
      r.classList.add(this.card ? 'gp-card' : 'gp-tour');
      this.win = el('div', 'gp-window');
      const bar = el('div', 'gp-bar');
      bar.append(el('span', 'gp-dots'), this.url = el('span', 'gp-url'));
      this.stage = el('div', 'gp-stage');
      this.cam = el('div', 'gp-cam');
      this.imgA = el('img', 'gp-f on'); this.imgB = el('img', 'gp-f');
      [this.imgA, this.imgB].forEach(i => { i.alt = ''; i.decoding = 'async'; });
      this.spot = el('div', 'gp-spot');
      this.cursor = el('div', 'gp-cursor'); this.cursor.innerHTML = CURSOR;
      this.cam.append(this.imgA, this.imgB, this.spot, this.cursor);
      this.slide = el('div', 'gp-slide');                          // a card step: a slide drawn by the player
      this.keys = el('div', 'gp-keys');
      this.cap = el('div', 'gp-cap'); this.cap.setAttribute('aria-live', 'polite');
      this.stage.append(this.cam, this.slide, this.keys);
      this.win.append(bar, this.stage, this.cap);                  // the caption lies over the picture, under it on a phone
      r.append(this.win);
      if (this.card) return;
      // the start and end cards and the controls of the tour
      this.cover = el('div', 'gp-cover');
      this.coverBtn = el('button', 'gp-big'); this.coverBtn.type = 'button';
      this.coverBtn.onclick = () => { this.userPaused = false; this.play(true); };
      this.cover.append(this.coverBtn);
      this.endCard = el('div', 'gp-end'); this.endCard.hidden = true;
      this.stage.append(this.cover, this.endCard);
      const c = el('div', 'gp-ctrl');
      this.bPlay = el('button', 'gp-btn gp-play'); this.bPlay.type = 'button';
      this.bPlay.onclick = () => (this.playing ? this.pause(true) : (this.userPaused = false, this.play(true)));
      this.bPrev = el('button', 'gp-btn', '‹'); this.bPrev.type = 'button'; this.bPrev.onclick = () => this.jump(this.i - 1);
      this.bNext = el('button', 'gp-btn', '›'); this.bNext.type = 'button'; this.bNext.onclick = () => this.jump(this.i + 1);
      this.track = el('div', 'gp-track');
      this.fill = el('div', 'gp-fill'); this.track.append(this.fill);
      this.track.onclick = e => {
        const b = this.track.getBoundingClientRect(), x = (e.clientX - b.left) / b.width;
        let acc = 0, k = 0;
        for (; k < this.steps.length; k++) { acc += this.dur(this.steps[k]); if (acc / this.total > x) break; }
        this.jump(Math.min(k, this.steps.length - 1));
      };
      this.time = el('span', 'gp-time');
      this.bCc = el('button', 'gp-btn gp-cc', 'CC'); this.bCc.type = 'button'; this.bCc.setAttribute('aria-pressed', 'true');
      this.bCc.onclick = () => { const on = this.root.classList.toggle('gp-nocc'); this.bCc.setAttribute('aria-pressed', String(!on)); };
      // the narrated version: sound starts only on the reader's click (browsers block sound that plays by itself)
      this.bSnd = el('button', 'gp-btn gp-snd', '🔊'); this.bSnd.type = 'button'; this.bSnd.hidden = true;
      this.bSnd.setAttribute('aria-pressed', 'true');
      // the narration is on from the start; one audio element serves every line (browsers let a page play sound only
      // from an element the reader has started once, Safari above all)
      this.audioEl = new Audio();
      this.audioEl.preload = 'auto';
      this.bSnd.onclick = () => {
        this.sound = !this.sound;
        try { localStorage.setItem('guide-sound', this.sound ? 'on' : 'off'); } catch (e) {}
        if (this.sound) this.unlock();
        this.bSnd.setAttribute('aria-pressed', String(this.sound));
        this.bSnd.textContent = this.sound ? '🔊' : '🔈';
        this.stopAudio();
        this.total = this.steps.reduce((a, s) => a + this.dur(s), 0);
        this.markers();
        if (this.sound) { this.userPaused = false; this.jump(this.i); this.play(true); }
      };
      c.append(this.bPrev, this.bPlay, this.bNext, this.track, this.time, this.bSnd, this.bCc);
      this.unmute = el('button', 'gp-unmute'); this.unmute.type = 'button'; this.unmute.hidden = true;
      this.unmute.onclick = () => this.unlock(true);
      this.stage.append(this.unmute);
      r.append(c);
      r.tabIndex = 0;
      r.addEventListener('keydown', e => {
        if (e.target.closest('a, input')) return;
        if (e.key === ' ' || e.key === 'k') { e.preventDefault(); this.bPlay.click(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); this.jump(this.i + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); this.jump(this.i - 1); }
      });
    }

    async open() {
      const lg = lang();
      const tok = ++this.token;
      this.playing = false;
      this.stopAudio();
      const data = (await load(this.base, lg)) || (await load(this.base, lg === 'de' ? 'en' : 'de'));
      if (tok !== this.token) return;
      if (!data) { this.cap.textContent = t('missing'); this.root.classList.add('gp-empty'); return; }
      this.data = data;
      const all = data.steps || [];
      this.steps = this.card ? all.filter(s => (s.cards || []).includes(this.card)) : all.filter(s => s.tour !== false);
      if (!this.steps.length) { this.root.hidden = true; return; }
      this.total = this.steps.reduce((a, s) => a + this.dur(s), 0);
      this.i = 0;
      this.pos = { x: 0.62, y: 0.55 };
      this.show(this.steps[0], true);
      this.steps.forEach(s => [s.pre, s.frame].filter(Boolean).forEach(f => { const im = new Image(); im.src = q(this.base + lg + '/' + f); }));
      if (this.card) {
        this.root.querySelectorAll('.gp-try').forEach(a => a.remove());
        if (this.visible && !RM) this.play();
        return;
      }
      this.markers();
      const narrated = this.steps.some(s => s.audio);
      this.bSnd.hidden = !narrated;
      this.bSnd.title = t('sound');
      let pref = null;
      try { pref = localStorage.getItem('guide-sound'); } catch (e) {}
      this.sound = narrated && pref !== 'off';
      this.bSnd.setAttribute('aria-pressed', String(this.sound));
      this.bSnd.textContent = this.sound ? '🔊' : '🔈';
      this.unmute.textContent = '🔊 ' + t('unmute');
      this.total = this.steps.reduce((a, s) => a + this.dur(s), 0);
      this.coverBtn.innerHTML = '';
      this.coverBtn.append(el('span', 'gp-big-icon', '▶'), el('span', null, t('start')),
        el('span', 'gp-big-time', this.clock(this.total)));
      this.cover.hidden = this.started;
      this.endCard.hidden = true;
      this.labels();
      this.tick(0);
      if (this.started && this.visible && !RM && !this.userPaused) this.play();
      // the entrance: the tour begins as soon as the page is open, narrated
      if (!this.started && !RM && !this.userPaused && this.root.dataset.autostart !== 'false') this.play(true);
    }

    // silent: the step's own time; narrated: as long as its line
    dur(s) { return Math.max(s.hold || 4, this.sound && s.audio_s ? s.audio_s + 1.2 : 0) * 1000; }
    clock(ms) { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

    markers() {
      this.track.querySelectorAll('.gp-mark').forEach(m => m.remove());
      let acc = 0;
      this.steps.forEach((s, k) => {
        if (k) {
          const m = el('span', 'gp-mark'); m.style.left = (100 * acc / this.total) + '%';
          m.title = (k + 1) + ' · ' + (s.caption || '');
          this.track.append(m);
        }
        acc += this.dur(s);
      });
    }

    labels() {
      if (this.card) return;
      this.bPlay.textContent = this.playing ? '❚❚' : '▶';
      this.bPlay.setAttribute('aria-label', this.playing ? t('pause') : t('play'));
      this.bPrev.setAttribute('aria-label', t('prev'));
      this.bNext.setAttribute('aria-label', t('next'));
      this.bCc.title = t('cc');
    }

    tick(msInStep) {
      if (this.card || !this.steps) return;
      let acc = 0;
      for (let k = 0; k < this.i; k++) acc += this.dur(this.steps[k]);
      acc += Math.min(msInStep, this.dur(this.steps[this.i]));
      this.fill.style.width = (100 * acc / this.total) + '%';
      this.time.textContent = this.clock(acc) + ' / ' + this.clock(this.total);
    }

    // the picture of a step, with spotlight and camera; `now` without transitions
    show(s, now) {
      if (s.kind === 'card') { this.card_(s, now); return; }
      (this.evTimers || []).forEach(clearTimeout); this.evTimers = [];
      this.slide.classList.remove('on');
      const src = q(this.base + lang() + '/' + s.frame);
      const [on, off] = this.imgA.classList.contains('on') ? [this.imgA, this.imgB] : [this.imgB, this.imgA];
      if (on.getAttribute('src') !== src) {
        off.src = src;
        if (now) { off.classList.add('on'); on.classList.remove('on'); }
        else requestAnimationFrame(() => { off.classList.add('on'); on.classList.remove('on'); });
      }
      this.url.textContent = s.url ? s.url.replace(/^https?:\/\//, '') : '';
      this.win.classList.toggle('gp-full', s.chrome === false);
      this.focus(s, now);
    }

    // a slide: kicker, title, figures counting up, lines appearing one after the other
    card_(s, now) {
      const c = s.card || {};
      (this.evTimers || []).forEach(clearTimeout); this.evTimers = [];
      this.slide.innerHTML = '';
      this.slide.classList.toggle('gp-ev-slide', !!c.evidence);
      if (c.evidence) { this.evidence(s, c, now); return; }
      if (c.kicker) this.slide.append(el('p', 'gp-s-kicker', c.kicker));
      if (c.title) this.slide.append(el('h3', 'gp-s-title', c.title));
      if (c.figures && c.figures.length) {
        const g = el('div', 'gp-s-figs');
        c.figures.forEach((f, i) => {
          const d = el('div', 'gp-s-fig'); d.style.animationDelay = (now ? 0 : 250 + i * 180) + 'ms';
          const v = el('span', 'gp-s-v', f.v); v.dataset.to = f.v;
          d.append(v, el('span', 'gp-s-k', f.k));
          g.append(d);
        });
        this.slide.append(g);
      }
      (c.lines || []).forEach((t, i) => {
        const p = el('p', 'gp-s-line', t); p.style.animationDelay = (now ? 0 : 700 + i * 650) + 'ms';
        this.slide.append(p);
      });
      this.slide.classList.toggle('gp-now', !!now);
      this.slide.classList.add('on');
      this.spot.classList.remove('on');
      this.cursor.classList.remove('on');
      this.cam.style.transform = '';
      if (s.url) this.url.textContent = s.url.replace(/^https?:\/\//, '');
      this.win.classList.toggle('gp-full', s.chrome === false);
      if (!now && !RM) this.slide.querySelectorAll('.gp-s-v').forEach(v => this.count(v));
    }

    // the evidence of one statement as a sequence (card.evidence, made from a dossier fact): the bare answer of a usual
    // AI and its question "where from?"; the same statement split into its parts; the source with the spans each part is
    // bound to, drawn as lines; the address, the status and the verdict. Timed over the step (its narration); `now`
    // (a jump, a paused tour) shows the end state at once.
    evidence(s, c, now) {
      const ev = c.evidence, T = this.dur(s), S = this.slide;
      const box = el('div', 'gp-ev');
      if (c.kicker) box.append(el('p', 'gp-s-kicker', c.kicker));
      if (c.title) box.append(el('h3', 'gp-s-title', c.title));
      const marked = (text, parts, key) => {
        const p = el('p', 'gp-ev-satz');
        const out = [];
        const hits = parts.map((t, i) => ({ i, at: text.indexOf(t[key]), len: t[key].length })).filter(h => h.at >= 0).sort((x, y) => x.at - y.at);
        let pos = 0;
        hits.forEach(h => {
          if (h.at < pos) return;
          if (h.at > pos) out.push(document.createTextNode(text.slice(pos, h.at)));
          const m = el('mark', 'gp-ev-m gp-ev-c' + h.i, text.slice(h.at, h.at + h.len)); m.dataset.i = h.i;
          out.push(m); pos = h.at + h.len;
        });
        if (pos < text.length) out.push(document.createTextNode(text.slice(pos)));
        p.append(...out);
        return p;
      };
      const ki = el('div', 'gp-ev-ki');
      ki.append(el('span', 'gp-ev-lab', c.ki_label || 'KI'), el('p', 'gp-ev-satz', ev.aussage), el('span', 'gp-ev-woher', c.woher || '?'));
      const grid = el('div', 'gp-ev-grid');
      const fam = el('div', 'gp-ev-fam');
      const rollen = el('div', 'gp-ev-rollen');
      ev.teile.forEach((t, i) => { const r = el('span', 'gp-ev-rolle gp-ev-c' + i, t.rolle); r.dataset.i = i; rollen.append(r); });
      fam.append(el('span', 'gp-ev-lab', c.famulus_label || 'Famulus'), marked(ev.aussage, ev.teile, 'aussage'), rollen);
      const qu = el('div', 'gp-ev-quelle');
      if (ev.img) { const im = el('img', 'gp-ev-img'); im.src = q(this.base + lang() + '/frames/' + ev.img); im.alt = ''; qu.append(im); }
      qu.append(marked(ev.beleg, ev.teile, 'spanne'));
      qu.querySelector('.gp-ev-satz').classList.add('gp-ev-beleg');
      qu.append(el('p', 'gp-ev-ref', ev.ref + ' · ' + (c.status_label || 'Status') + ': ' + (c.status_text || ev.status) + ' · ' +
        ev.begruendet + (c.von || ' / ') + ev.klauseln + ' ' + (c.begruendet_label || '')));
      grid.append(fam, qu);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'gp-ev-lines');
      box.append(ki, grid, el('p', 'gp-ev-fazit', c.fazit || ''));
      S.append(box, svg);
      S.classList.toggle('gp-now', !!now);
      S.classList.add('on');
      this.spot.classList.remove('on'); this.cursor.classList.remove('on'); this.cam.style.transform = '';
      if (s.url) this.url.textContent = s.url.replace(/^https?:\/\//, '');
      this.win.classList.toggle('gp-full', s.chrome === false);
      const lines = () => {
        svg.innerHTML = '';
        const b = S.getBoundingClientRect();
        if (!b.width) return;
        svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
        ev.teile.forEach((t, i) => {
          const a = fam.querySelector(`.gp-ev-m[data-i="${i}"]`), z = qu.querySelector(`.gp-ev-m[data-i="${i}"]`);
          if (!a || !z) return;
          const ra = a.getBoundingClientRect(), rz = z.getBoundingClientRect();
          const x1 = ra.left + ra.width / 2 - b.left, y1 = ra.bottom - b.top + 2, x2 = rz.left + rz.width / 2 - b.left, y2 = rz.top - b.top - 2;
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const my = (y1 + y2) / 2;
          path.setAttribute('d', `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`);
          path.setAttribute('class', 'gp-ev-line gp-ev-c' + i);
          path.dataset.i = i;
          svg.append(path);
          const L = path.getTotalLength(); path.style.strokeDasharray = L; path.style.strokeDashoffset = now ? 0 : L;
        });
      };
      const at = (frac, fn) => { if (now) fn(); else this.evTimers.push(setTimeout(fn, frac * T)); };
      const on = (sel, cls) => () => S.querySelectorAll(sel).forEach(n => n.classList.add(cls || 'an'));
      // the phases (fractions of the step): the bare answer, its parts, the source and the bindings, the verdict
      at(0.02, on('.gp-ev-ki'));
      at(0.14, on('.gp-ev-woher'));
      at(0.30, () => { S.querySelector('.gp-ev-ki').classList.add('weg'); on('.gp-ev-fam')(); });
      ev.teile.forEach((t, i) => at(0.36 + i * 0.05, on(`.gp-ev-fam .gp-ev-c${i}`)));
      at(0.58, () => { on('.gp-ev-quelle')(); });
      at(0.62, lines);
      ev.teile.forEach((t, i) => at(0.64 + i * 0.05, () => {
        on(`.gp-ev-quelle .gp-ev-c${i}`)();
        const pth = svg.querySelector(`path[data-i="${i}"]`); if (pth) pth.style.strokeDashoffset = 0;
      }));
      at(0.86, on('.gp-ev-fazit'));
      if (now) requestAnimationFrame(lines);
    }

    count(v) {
      const to = v.dataset.to, m = to.match(/[\d.,’']+/);
      if (!m) return;
      const sep = (m[0].match(/[.,’']/) || [''])[0], n = parseInt(m[0].replace(/[.,’']/g, ''), 10);
      if (!(n > 20)) return;
      const t0 = performance.now(), ms = 1400;
      const fmt = x => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
      const f = now => {
        const u = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - u, 3);
        v.textContent = to.replace(m[0], fmt(Math.round(n * e)));
        if (u < 1 && v.isConnected) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    }

    focus(s, now) {
      const f = s.focus;
      this.cam.classList.toggle('gp-now', !!now);
      if (f) {
        const pad = 0.008;
        Object.assign(this.spot.style, { left: (100 * (f[0] - pad)) + '%', top: (100 * (f[1] - pad)) + '%',
          width: (100 * (f[2] + 2 * pad)) + '%', height: (100 * (f[3] + 2 * pad)) + '%' });
        this.spot.classList.add('on');
      } else this.spot.classList.remove('on');
      // on a narrow screen the camera always moves in on what the step shows, so the text stays legible
      const narrow = this.stage.clientWidth && this.stage.clientWidth < 560 ? Math.min(2.2, 0.9 / Math.max(f ? f[2] : 1, 0.3)) : 1;
      const z = f ? Math.max(s.zoom || 1, narrow) : 1;
      if (z > 1) {
        const cx = f[0] + f[2] / 2, cy = f[1] + f[3] / 2;
        const tx = Math.min(0, Math.max(1 - z, 0.5 - cx * z)), ty = Math.min(0, Math.max(1 - z, 0.5 - cy * z));
        this.cam.style.transform = `translate(${tx * 100}%, ${ty * 100}%) scale(${z})`;
        this.cursor.style.setProperty('--cz', 1 / z);
      } else {
        this.cam.style.transform = '';
        this.cursor.style.setProperty('--cz', 1);
      }
    }

    caption(s) {
      this.cap.classList.remove('in');
      void this.cap.offsetWidth;
      this.cap.textContent = s.caption || '';
      this.cap.classList.add('in');
      this.keys.innerHTML = '';
      (s.key || []).forEach((k, n) => {
        const kb = el('kbd', 'gp-key', k);
        kb.style.animationDelay = (n * 140) + 'ms';
        this.keys.append(kb);
      });
    }

    async move(to, tok) {
      const from = { ...this.pos };
      const d = Math.hypot(to.x - from.x, to.y - from.y);
      const ms = RM ? 0 : Math.min(1100, 420 + d * 900);
      const nx = -(to.y - from.y), ny = to.x - from.x;               // a gentle arc
      const c = { x: (from.x + to.x) / 2 + nx * 0.18, y: (from.y + to.y) / 2 + ny * 0.18 };
      const t0 = performance.now();
      this.cursor.classList.add('on');
      await new Promise(res => {
        const f = now => {
          if (tok !== this.token) return res();
          const u = ms ? ease(Math.min(1, (now - t0) / ms)) : 1;
          const x = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * c.x + u * u * to.x;
          const y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * c.y + u * u * to.y;
          this.cursor.style.left = (x * 100) + '%'; this.cursor.style.top = (y * 100) + '%';
          if (u < 1) requestAnimationFrame(f); else res();
        };
        requestAnimationFrame(f);
      });
      this.pos = to;
    }

    async click(n, tok) {
      for (let k = 0; k < Math.max(1, n); k++) {
        if (tok !== this.token) return;
        const r = el('span', 'gp-ripple');
        r.style.left = this.cursor.style.left; r.style.top = this.cursor.style.top;
        this.cam.append(r);
        this.cursor.classList.add('down');
        setTimeout(() => r.remove(), 700);
        await sleep(110);
        this.cursor.classList.remove('down');
        await sleep(90);
      }
    }

    // one step: pointer to the control, click, the new picture, spotlight; resolves when the step's time is over
    // the browser holds the sound back until the reader touches the page: the tour runs on with captions, a hint offers
    // the sound, and the first click or key anywhere starts the narration at the current step
    held() {
      if (!this.sound || this.card) return;
      this.unmute.hidden = false;
      if (this.waiting) return;
      this.waiting = true;
      const go = e => {
        if (e && e.target && e.target.closest && e.target.closest('.gp-snd')) return;
        document.removeEventListener('pointerdown', go, true);
        document.removeEventListener('keydown', go, true);
        this.waiting = false;
        this.unlock(true);
      };
      document.addEventListener('pointerdown', go, true);
      document.addEventListener('keydown', go, true);
    }

    unlock(restart) {
      this.unmute.hidden = true;
      this.audioEl.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      this.audioEl.play().catch(() => {});
      if (restart && this.sound) { this.userPaused = false; this.jump(this.i); this.play(true); }
    }

    stopAudio() { if (this.audio) { this.audio.pause(); this.audio = null; } }

    voice(file, tok) {
      if (!this.sound || !file || tok !== this.token || !this.audioEl) return;
      this.stopAudio();
      this.audio = this.audioEl;
      this.audio.src = q(this.base + lang() + '/' + file);
      this.audio.play().then(() => { this.unmute.hidden = true; }).catch(() => this.held());
    }

    async step(k, tok) {
      const s = this.steps[k];
      this.i = k;
      this.caption(s);
      this.voice(s.audio, tok);
      const t0 = performance.now();
      const clock = setInterval(() => this.tick(performance.now() - t0), 200);
      try {
        if (s.target && !RM) {
          const to = { x: s.target[0] + s.target[2] / 2, y: s.target[1] + s.target[3] / 2 };
          if (s.pre) { this.show({ ...s, frame: s.pre, focus: null, zoom: null }, false); await sleep(450); }
          this.focus({ ...s, focus: null, zoom: null });
          await sleep(250);
          await this.move(to, tok);
          await this.click(s.clicks, tok);
        } else if (!RM) {
          this.cursor.classList.remove('on');
          await sleep(s.key && s.key.length ? 650 : 250);
        }
        if (tok !== this.token) return;
        this.show(s, false);
        const left = this.dur(s) - (performance.now() - t0);
        await sleep(Math.max(900, left));
      } finally { clearInterval(clock); }
    }

    async play(user) {
      if (this.playing || !this.steps) return;
      if (user) this.started = true;
      if (!this.card && !this.started) return;
      if (this.cover) this.cover.hidden = true;
      if (this.endCard) this.endCard.hidden = true;
      this.playing = true;
      this.labels();
      const tok = ++this.token;
      if (this.i >= this.steps.length - 1 && this.ended) this.i = 0;
      this.ended = false;
      const intro = this.data.intro;
      if (!this.card && this.sound && this.i === 0 && intro && intro.audio) {       // the narration opens on the first picture
        this.cap.textContent = intro.text || '';
        this.voice(intro.audio, tok);
        await sleep(intro.audio_s * 1000 + 1200);          // the same pause as after every step
        if (tok !== this.token) return;
      }
      for (let k = this.i; k < this.steps.length; k++) {
        await this.step(k, tok);
        if (tok !== this.token) return;
      }
      if (this.card) {                                      // a card loops after a short rest
        await sleep(1200);
        if (tok !== this.token) return;
        this.playing = false; this.i = 0; this.pos = { x: 0.62, y: 0.55 };
        this.show(this.steps[0], false);
        return this.play();
      }
      this.playing = false; this.ended = true;
      this.labels();
      this.end();
      const outro = this.data.outro;
      if (outro && outro.audio) this.voice(outro.audio, tok);
    }

    pause(user) {
      this.token++;
      this.stopAudio();
      this.playing = false;
      if (user) this.userPaused = true;
      this.labels();
    }

    jump(k) {
      if (!this.steps) return;
      k = Math.max(0, Math.min(this.steps.length - 1, k));
      const was = this.playing;
      this.token++;
      this.stopAudio();
      this.playing = false;
      this.started = true;
      if (this.cover) this.cover.hidden = true;
      if (this.endCard) this.endCard.hidden = true;
      this.i = k;
      const s = this.steps[k];
      this.caption(s);
      this.show(s, false);
      if (s.target) {
        const to = { x: s.target[0] + s.target[2] / 2, y: s.target[1] + s.target[3] / 2 };
        this.cursor.style.left = (to.x * 100) + '%'; this.cursor.style.top = (to.y * 100) + '%'; this.pos = to;
      }
      this.tick(0);
      this.labels();
      if (was) this.play();
    }

    end() {
      const e = this.endCard;
      e.innerHTML = '';
      const last = this.steps[this.steps.length - 1];
      const first = this.steps.find(s => s.url) || last;
      const a = el('a', 'gp-go', t('open') + ' →'); a.href = (this.root.dataset.open || first.url); a.target = '_blank'; a.rel = 'noopener';
      const again = el('button', 'gp-go quiet', '↻ ' + t('again')); again.type = 'button';
      again.onclick = () => { this.i = 0; this.ended = false; this.pos = { x: 0.62, y: 0.55 }; this.show(this.steps[0], true); this.play(true); };
      // the tour as an excursion (the sticker, full screen) ends back on the page that opened it; the tour page goes
      // back to the landing (the page before it when that is the landing, else data-home)
      if (this.excursion || this.root.dataset.home) {
        const back = el('button', 'gp-go', '← ' + t('back')); back.type = 'button';
        back.onclick = () => {
          if (this.excursion) { screenOff(this.root); return; }
          const home = new URL(this.root.dataset.home, location.href).href;
          if (document.referrer && document.referrer.split('#')[0] === home && history.length > 1) history.back();
          else location.href = home;
        };
        e.append(back);
      }
      e.append(a);
      if (this.root.dataset.all && !this.root.classList.contains('gp-nur-vollbild')) { const b = el('a', 'gp-go quiet', t('all')); b.href = this.root.dataset.all; e.append(b); }
      e.append(again);
      e.hidden = false;
    }
  }

  // a card's player starts the tour at the card's first step ("Im Rundgang ansehen")
  window.GuidePlayer = { players: [] };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-guide-jump]');
    if (!a) return;
    const tour = window.GuidePlayer.players.find(p => !p.card);
    if (!tour || !tour.steps) return;
    e.preventDefault();
    const k = tour.steps.findIndex(s => (s.cards || []).includes(a.dataset.guideJump));
    tour.root.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
    tour.userPaused = false;
    tour.jump(Math.max(0, k));
    tour.play(true);
  });
  // a start link ([data-guide-start], the sticker on a landing's first screen): the tour from its first picture, filling
  // the screen, narrated. The click is the reader's gesture, so the browser lets the sound play at once; where an
  // element cannot go full screen (iPhone) the player covers the window instead, with a close button.
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-guide-start]');
    if (!a) return;
    const tour = window.GuidePlayer.players.find(p => !p.card);
    if (!tour || !tour.steps) return;                       // not loaded yet: the link scrolls to the tour
    e.preventDefault();
    screenOn(tour.root);
    tour.pause();
    tour.excursion = true;
    tour.sound = tour.steps.some(s => s.audio);
    tour.bSnd.setAttribute('aria-pressed', String(tour.sound)); tour.bSnd.textContent = tour.sound ? '🔊' : '🔈';
    tour.total = tour.steps.reduce((x, s) => x + tour.dur(s), 0); tour.markers();
    tour.unlock(false);
    tour.userPaused = false; tour.ended = false; tour.i = 0; tour.pos = { x: 0.62, y: 0.55 };
    tour.show(tour.steps[0], true);
    tour.play(true);
  });
  function screenOn(r) {
    if (!r.querySelector('.gp-close')) {
      const x = el('button', 'gp-close', '✕'); x.type = 'button'; x.setAttribute('aria-label', t('close'));
      x.onclick = () => screenOff(r);
      r.append(x);
    }
    const fs = r.requestFullscreen || r.webkitRequestFullscreen;
    if (fs) {
      try { const pr = fs.call(r); if (pr && pr.catch) pr.catch(() => r.classList.add('gp-screen')); } catch (err) { r.classList.add('gp-screen'); }
    } else r.classList.add('gp-screen');
    document.documentElement.classList.add('gp-screen-open');
  }
  function screenOff(r) {
    if (document.fullscreenElement === r || document.webkitFullscreenElement === r) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    r.classList.remove('gp-screen');
    document.documentElement.classList.remove('gp-screen-open');
    endExcursion(r);
  }
  function endExcursion(r) {
    const p = window.GuidePlayer.players.find(x => x.root === r);
    if (p && p.excursion) { p.excursion = false; p.pause(true); if (p.endCard) p.endCard.hidden = true; }
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement)
      document.querySelectorAll('.gp').forEach(r => { if (!r.classList.contains('gp-screen')) { document.documentElement.classList.remove('gp-screen-open'); endExcursion(r); } });
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.gp.gp-screen').forEach(screenOff);
  });
  function init() {
    document.querySelectorAll('.gp[data-guide]').forEach(r => window.GuidePlayer.players.push(new Player(r)));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

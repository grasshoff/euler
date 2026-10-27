/* The issues of a collection on its landing (build.py render_issues_card / render_issues_nav).

   Card  [data-issues-card]: one field, one action per step — describe the problem → "Prüfen" (the hub matches it
         against the known issues: BM25 + DeepSeek) → a known issue with its state ("Das ist es – Meldung zählen") or
         "Noch nicht bekannt" ("Als neues Problem melden") → the confirmation with its id and a link to follow it.
   Nav   [data-issues-nav]: every issue of the collection and of the platform (viewer, services), from the snapshot
         data/issues.json at once, then live from the hub; filters by state, kind and origin, a search, one card per
         issue that opens into finding, task, deadline and history. #<ID> in the address opens that issue.
   Both read data-collection, data-kuerzel, data-issues-api, data-snapshot, data-nav. */
(function () {
  'use strict';
  const STAND = { gemeldet: 'gemeldet', bestaetigt: 'bestätigt', geplant: 'geplant', in_arbeit: 'in Arbeit',
    entscheidung: 'wartet auf Entscheidung', erledigt: 'erledigt', verworfen: 'verworfen' };
  const STAND_LANG = { gemeldet: 'gemeldet, noch nicht geprüft' };
  const ART = { luecke: 'Lücke', fehler: 'Fehler', referenz: 'Referenz', ablauf: 'Verfahren', bedienung: 'Bedienung' };
  const BEREICH = { daten: 'Bestand', viewer: 'Viewer', rundgang: 'Rundgang', landing: 'Website', dienst: 'Dienst', register: 'Register' };
  const OFFEN = new Set(['gemeldet', 'bestaetigt', 'geplant', 'in_arbeit', 'entscheidung']);

  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const datum = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${+d}. ${+m}. ${y}`; };
  const badge = s => el('span', 'iss-st iss-st-' + s, STAND[s] || s);

  async function api(root, pfad, body, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms || 20000);
    try {
      const r = await fetch(root.dataset.issuesApi + '/' + pfad, body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal }
        : { signal: ctl.signal });
      const j = await r.json().catch(() => ({}));
      return { status: r.status, ...j };
    } finally { clearTimeout(t); }
  }

  // ── the card ──────────────────────────────────────────────────────────────────────────────────────────────────
  function karte(root) {
    const form = root.querySelector('.iss-form'), feld = form.querySelector('textarea'), knopf = form.querySelector('button');
    const antwort = root.querySelector('.iss-antwort');
    let text = '';
    const zeige = (...knoten) => { antwort.innerHTML = ''; antwort.append(...knoten); form.hidden = knoten.length > 0; };
    const fehler = r => {
      const msg = r && r.status === 429 ? 'Zu viele Meldungen in kurzer Zeit. Bitte später noch einmal.'
        : 'Der Prüfdienst ist gerade nicht erreichbar. Bitte später noch einmal.';
      const zurueck = el('button', 'iss-knopf iss-leise', 'Zurück'); zurueck.type = 'button'; zurueck.onclick = () => zeige();
      zeige(el('p', 'iss-hinweis', msg), zurueck);
    };
    const danke = r => {
      const p = el('p', 'iss-danke');
      p.append(el('strong', null, r.neu ? 'Danke. Neu aufgenommen als ' : 'Danke. Gezählt bei '), el('span', 'iss-id', r.id),
        document.createTextNode(r.neu ? ' – gemeldet, noch nicht geprüft.' : ` – jetzt ${r.n_meldungen} Meldungen.`));
      const weiter = el('div', 'iss-reihe');
      if (root.dataset.nav) { const a = el('a', 'iss-knopf', 'Stand verfolgen →'); a.href = root.dataset.nav.replace(/#issues$/, '#' + r.id); weiter.append(a); }
      const nochmal = el('button', 'iss-knopf iss-leise', 'Weiteres Problem melden'); nochmal.type = 'button';
      nochmal.onclick = () => { feld.value = ''; zeige(); feld.focus(); };
      weiter.append(nochmal);
      zeige(p, weiter);
    };
    const melden = async (issueId, score) => {
      zeige(el('p', 'iss-warte', 'Wird aufgenommen …'));
      try {
        const r = await api(root, 'melden', { collection: root.dataset.collection, kuerzel: root.dataset.kuerzel, text,
          ort: location.href, sprache: (navigator.language || 'de').slice(0, 2), issue_id: issueId || undefined, score,
          website: form.querySelector('.iss-hp').value });
        if (r.ok) danke(r); else fehler(r);
      } catch (e) { fehler(null); }
    };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      text = feld.value.trim();
      if (text.length < 10) { feld.setCustomValidity('Bitte mindestens zehn Zeichen.'); feld.reportValidity(); feld.setCustomValidity(''); return; }
      knopf.disabled = true;
      zeige(el('p', 'iss-warte', 'Famulus prüft, ob das Problem schon bekannt ist …'));
      let r;
      try { r = await api(root, 'pruefen', { collection: root.dataset.collection, text, ort: location.href }, 60000); }
      catch (err) { r = null; }
      knopf.disabled = false;
      if (!r || !r.ok) { fehler(r); return; }
      if (r.bekannt && r.bekannt.length) {
        const liste = el('div', 'iss-treffer');
        r.bekannt.forEach(b => {
          const k = el('div', 'iss-treffer-k');
          const kopf = el('p', 'iss-treffer-kopf');
          kopf.append(el('span', 'iss-id', b.id), badge(b.status), el('span', 'iss-treffer-t', b.titel));
          const meta = el('p', 'iss-meta', b.status === 'erledigt' ? `erledigt am ${datum(b.erledigt_am)}. Tritt es bei Ihnen weiter auf, zählen Sie die Meldung.`
            : (b.frist ? `Frist ${datum(b.frist)}. ` : '') + (b.aufgabe ? 'Aufgabe: ' + b.aufgabe : ''));
          const ja = el('button', 'iss-knopf', 'Das ist es – Meldung zählen'); ja.type = 'button'; ja.onclick = () => melden(b.id, b.score);
          k.append(kopf);
          if (b.grund) k.append(el('p', 'iss-grund', b.grund));
          if (meta.textContent) k.append(meta);
          k.append(ja);
          liste.append(k);
        });
        const anders = el('button', 'iss-knopf iss-leise', 'Mein Problem ist ein anderes – neu melden'); anders.type = 'button';
        anders.onclick = () => melden(null);
        zeige(el('p', 'iss-schritt', r.bekannt.length > 1 ? 'Schon bekannt – eines davon?' : 'Das ist schon bekannt:'), liste, anders);
      } else {
        const neu = el('button', 'iss-knopf', 'Als neues Problem melden'); neu.type = 'button'; neu.onclick = () => melden(null);
        const zurueck = el('button', 'iss-knopf iss-leise', 'Text ändern'); zurueck.type = 'button'; zurueck.onclick = () => zeige();
        const reihe = el('div', 'iss-reihe'); reihe.append(neu, zurueck);
        zeige(el('p', 'iss-schritt', 'Noch nicht bekannt.'), el('p', 'iss-meta', 'Ihre Meldung erscheint gleich öffentlich als „gemeldet“ und wird geprüft. Gespeichert werden nur Text, Seite und Zeit; bitte keine persönlichen Angaben.'), reihe);
      }
    });
  }

  // ── the navigation ────────────────────────────────────────────────────────────────────────────────────────────
  function navigation(root) {
    let daten = null, stand = '', filter = { st: 'offen', art: '', herkunft: '', q: '' };
    const rahmen = el('div', 'iss-filter'), liste = el('div', 'iss-liste'), fuss = el('p', 'iss-stand');

    const alle = () => daten ? [...(daten.issues || []).map(i => ({ ...i, _h: 'sammlung' })), ...(daten.plattform || []).map(i => ({ ...i, _h: 'plattform' }))] : [];
    const passt = (i, f) => (f.st === 'alle' || (f.st === 'offen' ? OFFEN.has(i.status) : i.status === f.st))
      && (!f.art || i.art === f.art) && (!f.herkunft || i._h === f.herkunft)
      && (!f.q || (i.id + ' ' + i.titel + ' ' + i.befund + ' ' + (i.aufgabe || '')).toLowerCase().includes(f.q));

    function chips(name, werte) {
      const g = el('div', 'iss-chips'); g.setAttribute('role', 'group');
      werte.forEach(([v, label]) => {
        const n = alle().filter(i => passt(i, { ...filter, [name]: v })).length;
        if (!n && filter[name] !== v && v !== 'alle' && v !== '') return;        // no chip that would show nothing
        const b = el('button', 'iss-chip'); b.type = 'button';
        b.append(document.createTextNode(label + ' '), el('span', 'iss-chip-n', String(n)));
        b.setAttribute('aria-pressed', String(filter[name] === v));
        b.onclick = () => { filter[name] = v; zeichnen(); };
        g.append(b);
      });
      return g;
    }

    function karteVon(i) {
      const d = el('details', `iss-item iss-art-${i.art} iss-z-${i.status}`); d.id = i.id;   // iss-z: the state of the card (iss-st colours the badge only)
      const s = el('summary');
      s.append(el('span', 'iss-id', i.id), el('span', 'iss-art', ART[i.art] || i.art), el('span', 'iss-titel', i.titel), badge(i.status));
      d.append(s);
      const b = el('div', 'iss-body');
      // the path of the issue: recognised → each change of state, with dates
      const weg = el('ol', 'iss-weg');
      (i.verlauf || []).filter(v => v.feld === 'angelegt' || v.feld === 'status').forEach((v, k, a) => {
        const li = el('li', k === a.length - 1 ? 'jetzt' : '');
        li.append(el('span', 'iss-weg-d', datum(v.ts)), el('span', null, v.feld === 'angelegt' ? 'erkannt' : (STAND[v.neu] || v.neu)));
        weg.append(li);
      });
      b.append(weg, el('p', 'iss-befund', i.befund));
      const dl = el('dl', 'iss-daten');
      const zeile = (k, v) => { if (!v) return; dl.append(el('dt', null, k), el('dd', null, v)); };
      zeile('Stand', STAND_LANG[i.status] || STAND[i.status] || i.status);
      zeile('Aufgabe', i.aufgabe);
      if (OFFEN.has(i.status)) zeile('Frist', datum(i.frist));
      zeile('Erledigt am', datum(i.erledigt_am));
      zeile('Beleg', i.beleg);
      zeile('Bereich', (BEREICH[i.bereich] || i.bereich) + (i._h === 'plattform' ? ' · alle Sammlungen' : ''));
      zeile('Meldungen', i.n_meldungen ? String(i.n_meldungen) : '');
      b.append(dl);
      d.append(b);
      return d;
    }

    function zeichnen() {
      rahmen.innerHTML = '';
      const arten = [...new Set(alle().map(i => i.art))];
      rahmen.append(
        chips('st', [['offen', 'Offen'], ['gemeldet', 'Gemeldet'], ['in_arbeit', 'In Arbeit'], ['erledigt', 'Erledigt'], ['alle', 'Alle']]),
        chips('art', [['', 'Jede Art'], ...arten.map(a => [a, ART[a] || a])]),
        chips('herkunft', [['', 'Sammlung und Plattform'], ['sammlung', 'Nur Sammlung'], ['plattform', 'Nur Plattform']]));
      const such = el('input', 'iss-suche'); such.type = 'search'; such.placeholder = 'Suchen in Titel, Befund, Aufgabe …';
      such.value = filter.q; such.setAttribute('aria-label', 'Probleme durchsuchen');
      such.oninput = () => { filter.q = such.value.trim().toLowerCase(); liste_(); };
      rahmen.append(such);
      liste_();
    }
    function liste_() {
      liste.innerHTML = '';
      const treffer = alle().filter(i => passt(i, filter))
        .sort((a, b) => (OFFEN.has(b.status) - OFFEN.has(a.status)) || String(b.geaendert || b.erkannt).localeCompare(String(a.geaendert || a.erkannt)));
      if (!treffer.length) liste.append(el('p', 'iss-leer', 'Keine Probleme mit dieser Auswahl.'));
      treffer.forEach(i => liste.append(karteVon(i)));
      fuss.textContent = stand;
      oeffneHash();
    }
    function oeffneHash() {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id || id === 'issues') return;
      let d = document.getElementById(id);
      if (!d && alle().some(i => i.id === id)) { filter = { st: 'alle', art: '', herkunft: '', q: '' }; zeichnen(); d = document.getElementById(id); }
      if (d && d.tagName === 'DETAILS') { d.open = true; d.classList.add('iss-ziel'); d.scrollIntoView({ block: 'center' }); }
    }
    root.innerHTML = '';
    root.append(rahmen, liste, fuss);
    fetch(root.dataset.snapshot).then(r => r.ok ? r.json() : null).catch(() => null).then(s => {
      if (s && !daten) { daten = s; stand = `Stand der Liste: ${s.stand}`; zeichnen(); }
      return api(root, 'liste?collection=' + encodeURIComponent(root.dataset.collection));
    }).then(r => { if (r && r.ok) { daten = r; stand = 'Stand: live'; zeichnen(); } })
      .catch(() => { if (!daten) liste.append(el('p', 'iss-leer', 'Die Liste ist gerade nicht erreichbar.')); });
    window.addEventListener('hashchange', oeffneHash);
  }

  function init() {
    document.querySelectorAll('[data-issues-card]').forEach(karte);
    document.querySelectorAll('[data-issues-nav]').forEach(navigation);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

# Opera omnia Reihe IV (und II 26/27): Abgleich mit den PDFs der Bernoulli-Euler-Gesellschaft (5. 11. 2026)

Quelle der Gesellschaft: „Publikationen des Bernoulli-Euler-Zentrums“ (PublBEZ) auf eterna, dem Publikationsserver der
UB Basel (`eterna.unibas.ch/publbez`, Reihe „Briefwechsel Euler“ `LEOOIVA`), Lizenz CC BY-NC-SA 4.0. Gelesen wurden
außerdem `bez.unibas.ch/de/publikationen/`, `bez.unibas.ch/de/projekte/opera-omnia-leonhard-euler/` und
`bernoulli-euler-gesellschaft.ch/de/publikationen`. Dort ist keine neuere oder endgültige Fassung verlinkt; die
Projektseite nennt als Ziel, „bis Ende 2027 sämtliche gedruckten Werke der Opera Omnia … online und open-access“
zugänglich zu machen, und plant, IVA 1–8 in PublBEZ „aufzuschalten“. Auf `LEOOIVA` stehen IVA 1, 2, 5, 6 als
„Online-Edition 2026“ ohne Link (noch kein PDF).


| PublBEZ | Band | eterna-Datei (Galley) | Seiten | erstellt | Vermerk | Sammlung | Ergebnis |
|---|---|---|---|---|---|---|---|
| Bd. 1, doi 10.12685/publbez.1.2016 | IVA 4 | `LEOO_IVA4-pre.pdf` (1192/1333) | 1256 | 27.10.2022 | PRELIMINARY VERSION | `978-3-0348-0892-7` (eulerOO, eulerOO-IVA) | **byte-gleich** (sha256 addcc426…) |
| Bd. 2, …2.2017 | IVA 3 | `LEOO_IVA3-pre.pdf` (1193/1341) | 1167 | 27.10.2022 | PRELIMINARY VERSION | `978-3-319-33989-4`: Birkhäuser-Druck 2016, 1176 S. (Pars I + II) | Sammlung hat die gedruckte Fassung mit ISBN — behalten |
| Bd. 3, …3.2018 | IVA 7 | `LEOO_IVA7-pre.pdf` (1165/1340) | 633 | 27.10.2022 | PRELIMINARY VERSION | `978-3-7643-8743-3` | **byte-gleich** (4dc798c6…) |
| Bd. 4, …4.2019 | IVA 8 | `LEOO_IVA8-pre.pdf` (1174/1339) | 726 | 27.10.2022 | PRELIMINARY VERSION | `978-3-319-75942`: Birkhäuser-Druck 2018, 727 S. | gedruckte Fassung — behalten |
| Bd. 5, …5.2019 | IVA 9 | `LEOO_IVA9-pre.pdf` (1197/1399) | 78 | 05.12.2022 | PRELIMINARY VERSION | fehlte | **neu aufgenommen** als `eulerOO-IVA/EOIVA9` |
| Bd. 6, …6.2021 | II 26 | `LEOO_II26-pre.pdf` (1160/1342) | 370 | 27.10.2022 | PRELIMINARY VERSION | `978-3-7643-1472-9` | **byte-gleich** (1589d5f9…) |
| Bd. 7, …7.2022 | II 27 | `LEOO_II27-pre.pdf` (1170/1343) | 530 | 27.10.2022 | PRELIMINARY VERSION | `978-3-7643-1473-6`; zweite Rasterung `EOII27` | **byte-gleich** (e5744f4d…) |

**Befund.** Die Sammlung ist mit dem Stand der Gesellschaft synchron: Die Vorabfassungen von IVA 4, IVA 7, II 26 und
II 27 sind genau die Dateien, die eterna heute ausliefert; eine endgültige Fassung ist nirgends veröffentlicht. Es gab
daher keinen Band mit abweichender Paginierung und nichts neu einzulesen. Für IVA 3 und IVA 8 hält die Sammlung die
gedruckten Birkhäuser-Bände (ISBN), die eterna-Fassungen sind dort neu gesetzte Vorabfassungen (1167 statt 1176 bzw.
726 statt 727 Seiten) — maßgeblich bleibt der Druck.

**IVA 9** (Condorcet, Turgot; Gilain, Hug, Taton; Basel 2020): vollständig (Titelei + S. 1–69 bis zur „Liste des
abréviations“, wie im Inhaltsverzeichnis). Seitenbilder gerendert (78). Pilot-Gate Kimi auf pidx 7, 20, 40, 63, 72
gegen die born-digital Textschicht: Recall 0,998 / 0,951 / 0,987 / 0,983 / 0,971. Abweichungen: Formeln als
`\int`/`\frac` (S. 20, kein erfundener Text), Kyrillisch im Register richtig gelesen (die LaTeX-Textschicht liefert dort
Transliterationsmüll, S. 72), aber **Normalisierung gedruckter Formen** — am Faksimile geprüft: gedruckt „Tunkina“
(Kimi „Turkina“, pidx 7), „voulû“, „rétour“, „égarés“ (Kimi „voulu“, „retour“, „égares“, pidx 40). Gate damit nicht
100 % PASS; der Band steht am Gate (kein Batch, keine Registry, kein Klon nach eulerOO). Nächster Schritt ist die
Owner-Entscheidung über einen Textschicht-Abgleich (wortweise Übernahme der born-digital Wörter für lateinische Schrift),
die für IVA 7 und Verdun 2015 schon offen ist.

**Daneben gefunden.** IVA 2 (`978-3-7643-5271-4`): Das Titelblatt (PDF-Seite 3, `page_002`) hat in der Seiten-XML ein
leeres `<main>` (qwen3.5:cloud, 29. 3. 2026) — gedruckt steht dort „Series quarta A · Commercium epistolicum · Volumen
secundum“. Die ABBYY-Textschicht des PDFs ist unbrauchbar.

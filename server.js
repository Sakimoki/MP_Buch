/**
 * Medizinprodukte-Datenbank – Backend
 * Node.js 25.9.0 | Express 4 | node:sqlite (stable ab Node 22.10)
 * Gemäß MPBetreibV 2025, MPDG und EU MDR 2017/745
 */

import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { exec } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, 'medizinprodukte.db');
const PORT      = process.env.PORT || 3000;

// ── Datenbank-Initialisierung ─────────────────────────────────────────────────

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS geraete (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bezeichnung TEXT NOT NULL,
    art_typ TEXT, seriennummer TEXT, loscode TEXT,
    anschaffungsjahr TEXT, inbetriebnahmedatum TEXT, ausserdienst_datum TEXT,
    hersteller_name TEXT, hersteller_anschrift TEXT, hersteller_kontakt TEXT,
    bevollmaechtigter TEXT, ce_jahr TEXT, konformitaetserklaerung TEXT,
    risikoklasse TEXT, udi_di TEXT, udi_pi TEXT, emdn_code TEXT,
    aktives_geraet INTEGER DEFAULT 0, implantierbar INTEGER DEFAULT 0,
    einmalprodukt INTEGER DEFAULT 0, steril INTEGER DEFAULT 0,
    zweckbestimmung TEXT, betreiber TEXT, abteilung TEXT, standort_raum TEXT,
    inventarnummer TEXT, verantwortliche_person TEXT,
    netzwerkanbindung INTEGER DEFAULT 0, softwareversion TEXT, bemerkungen TEXT,
    erstellt_am TEXT DEFAULT CURRENT_TIMESTAMP,
    geaendert_am TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS einweisungen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    geraet_id INTEGER NOT NULL,
    datum TEXT, eingewiesene_person TEXT, beauftragte_person TEXT,
    funktionspruefung INTEGER DEFAULT 0, bemerkungen TEXT,
    FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS pruefungen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    geraet_id INTEGER NOT NULL,
    art TEXT, datum TEXT, naechste_faelligkeit TEXT, pruefer TEXT,
    ergebnis TEXT, messwerte TEXT, messverfahren TEXT,
    maengel TEXT, korrektivmassnahmen TEXT, bemerkungen TEXT,
    FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS vorkommnisse (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    geraet_id INTEGER NOT NULL,
    datum TEXT, art_stoerung TEXT, folgen TEXT,
    meldung_behoerde TEXT, meldung_hersteller TEXT,
    korrektivmassnahmen TEXT, bemerkungen TEXT,
    FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
  )
`);

// ── Express-App ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ── Hilfsfunktion ─────────────────────────────────────────────────────────────

const GERAETE_FIELDS = [
  'bezeichnung','art_typ','seriennummer','loscode','anschaffungsjahr',
  'inbetriebnahmedatum','ausserdienst_datum','hersteller_name','hersteller_anschrift',
  'hersteller_kontakt','bevollmaechtigter','ce_jahr','konformitaetserklaerung',
  'risikoklasse','udi_di','udi_pi','emdn_code','aktives_geraet','implantierbar',
  'einmalprodukt','steril','zweckbestimmung','betreiber','abteilung','standort_raum',
  'inventarnummer','verantwortliche_person','netzwerkanbindung','softwareversion','bemerkungen',
];

function nowTs() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ── Routen: Geräte ────────────────────────────────────────────────────────────

// Geräteliste (mit optionaler Suche)
app.get('/api/geraete', (req, res) => {
  const q = req.query.search?.trim();
  if (q) {
    const like = `%${q}%`;
    const rows = db.prepare(`
      SELECT id, bezeichnung, art_typ, risikoklasse, standort_raum FROM geraete
      WHERE bezeichnung LIKE ? OR art_typ LIKE ? OR seriennummer LIKE ?
            OR inventarnummer LIKE ? OR abteilung LIKE ?
      ORDER BY bezeichnung
    `).all(like, like, like, like, like);
    return res.json(rows);
  }
  const rows = db.prepare(
    'SELECT id, bezeichnung, art_typ, risikoklasse, standort_raum FROM geraete ORDER BY bezeichnung'
  ).all();
  res.json(rows);
});

// Einzelnes Gerät
app.get('/api/geraete/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM geraete WHERE id = ?').get(+req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(row);
});

// Neues Gerät anlegen
app.post('/api/geraete', (req, res) => {
  const body = req.body;
  if (!body.bezeichnung?.trim()) {
    return res.status(400).json({ error: 'Bezeichnung ist ein Pflichtfeld.' });
  }
  const fields = GERAETE_FIELDS.filter(k => k in body);
  const ts     = nowTs();
  const result = db.prepare(
    `INSERT INTO geraete (${fields.join(',')}, erstellt_am, geaendert_am)
     VALUES (${fields.map(() => '?').join(',')}, ?, ?)`
  ).run(...fields.map(k => body[k] ?? null), ts, ts);
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

// Gerät aktualisieren
app.put('/api/geraete/:id', (req, res) => {
  const body   = req.body;
  const fields = GERAETE_FIELDS.filter(k => k in body);
  if (!fields.length) return res.status(400).json({ error: 'Keine Felder zum Aktualisieren.' });
  db.prepare(
    `UPDATE geraete SET ${fields.map(k => `${k}=?`).join(',')}, geaendert_am=? WHERE id=?`
  ).run(...fields.map(k => body[k] ?? null), nowTs(), +req.params.id);
  res.json({ success: true });
});

// Gerät löschen (ON DELETE CASCADE entfernt Einweisungen, Prüfungen, Vorkommnisse)
app.delete('/api/geraete/:id', (req, res) => {
  db.prepare('DELETE FROM geraete WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Routen: Prüfungen ─────────────────────────────────────────────────────────

app.get('/api/geraete/:id/pruefungen', (req, res) => {
  const rows = db.prepare(`
    SELECT id, art, datum, naechste_faelligkeit, pruefer, ergebnis
    FROM pruefungen WHERE geraet_id = ? ORDER BY datum DESC
  `).all(+req.params.id);
  res.json(rows);
});

app.post('/api/pruefungen', (req, res) => {
  const b = req.body;
  if (!b.art || !b.datum) {
    return res.status(400).json({ error: 'Art und Datum sind Pflichtfelder.' });
  }
  const result = db.prepare(`
    INSERT INTO pruefungen
      (geraet_id, art, datum, naechste_faelligkeit, pruefer, ergebnis,
       messwerte, messverfahren, maengel, korrektivmassnahmen, bemerkungen)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    b.geraet_id, b.art, b.datum,
    b.naechste_faelligkeit || null, b.pruefer       || null,
    b.ergebnis             || null, b.messwerte      || null,
    b.messverfahren        || null, b.maengel         || null,
    b.korrektivmassnahmen  || null, b.bemerkungen     || null,
  );
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

app.delete('/api/pruefungen/:id', (req, res) => {
  db.prepare('DELETE FROM pruefungen WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Routen: Einweisungen ──────────────────────────────────────────────────────

app.get('/api/geraete/:id/einweisungen', (req, res) => {
  const rows = db.prepare(`
    SELECT id, datum, eingewiesene_person, beauftragte_person,
           CASE funktionspruefung WHEN 1 THEN 'Ja' ELSE 'Nein' END AS funktionspruefung
    FROM einweisungen WHERE geraet_id = ? ORDER BY datum DESC
  `).all(+req.params.id);
  res.json(rows);
});

app.post('/api/einweisungen', (req, res) => {
  const b = req.body;
  if (!b.datum) return res.status(400).json({ error: 'Datum ist ein Pflichtfeld.' });
  const result = db.prepare(`
    INSERT INTO einweisungen
      (geraet_id, datum, eingewiesene_person, beauftragte_person, funktionspruefung, bemerkungen)
    VALUES (?,?,?,?,?,?)
  `).run(
    b.geraet_id, b.datum,
    b.eingewiesene_person || null, b.beauftragte_person || null,
    b.funktionspruefung ? 1 : 0,   b.bemerkungen        || null,
  );
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

app.delete('/api/einweisungen/:id', (req, res) => {
  db.prepare('DELETE FROM einweisungen WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Routen: Vorkommnisse ──────────────────────────────────────────────────────

app.get('/api/geraete/:id/vorkommnisse', (req, res) => {
  const rows = db.prepare(`
    SELECT id, datum, art_stoerung, meldung_behoerde, meldung_hersteller
    FROM vorkommnisse WHERE geraet_id = ? ORDER BY datum DESC
  `).all(+req.params.id);
  res.json(rows);
});

app.post('/api/vorkommnisse', (req, res) => {
  const b = req.body;
  if (!b.datum) return res.status(400).json({ error: 'Datum ist ein Pflichtfeld.' });
  const result = db.prepare(`
    INSERT INTO vorkommnisse
      (geraet_id, datum, art_stoerung, folgen,
       meldung_behoerde, meldung_hersteller, korrektivmassnahmen, bemerkungen)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    b.geraet_id, b.datum,
    b.art_stoerung         || null, b.folgen              || null,
    b.meldung_behoerde     || null, b.meldung_hersteller  || null,
    b.korrektivmassnahmen  || null, b.bemerkungen          || null,
  );
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

app.delete('/api/vorkommnisse/:id', (req, res) => {
  db.prepare('DELETE FROM vorkommnisse WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Server starten ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('\nMedizinprodukte-Datenbank (MPBetreibV 2025)');
  console.log(`Läuft auf:  ${url}`);
  console.log(`Datenbank:  ${DB_PATH}\n`);
  const cmd = process.platform === 'win32' ? `start ${url}`
            : process.platform === 'darwin' ? `open ${url}`
            : `xdg-open ${url}`;
  exec(cmd);
});

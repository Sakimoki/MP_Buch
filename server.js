/**
 * Medizinprodukte-Datenbank – Backend
 * Node.js 22.10+ | Express 4 | node:sqlite | multer
 * Gemäß MPBetreibV 2025, MPDG und EU MDR 2017/745
 */

import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { exec } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import multer from 'multer';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const DB_PATH     = join(__dirname, 'medizinprodukte.db');
const UPLOADS_DIR = join(__dirname, 'uploads');
const PORT        = process.env.PORT || 3000;

mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// ── Datenbank ─────────────────────────────────────────────────────────────────

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS geraete (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bezeichnung TEXT NOT NULL,
    art_typ TEXT, seriennummer TEXT, loscode TEXT,
    anschaffungsjahr TEXT, inbetriebnahmedatum TEXT, ausserdienst_datum TEXT,
    hersteller_name TEXT, hersteller_anschrift TEXT,
    hersteller_tel TEXT, hersteller_email TEXT,
    ce_jahr TEXT, risikoklasse TEXT, udi_di TEXT, udi_pi TEXT, emdn_code TEXT,
    aktives_geraet INTEGER DEFAULT 0, implantierbar INTEGER DEFAULT 0,
    einmalprodukt INTEGER DEFAULT 0, steril INTEGER DEFAULT 0,
    zweckbestimmung TEXT,
    betreiber TEXT, betreiber_anschrift TEXT, betreiber_tel TEXT, betreiber_email TEXT,
    inventarnummer TEXT, verantwortliche_person TEXT,
    netzwerkanbindung INTEGER DEFAULT 0, softwareversion TEXT, bemerkungen TEXT,
    erstellt_am TEXT DEFAULT CURRENT_TIMESTAMP,
    geaendert_am TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS hersteller (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    anschrift TEXT, tel TEXT, email TEXT, bemerkungen TEXT,
    erstellt_am TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS betreiber (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    anschrift TEXT, tel TEXT, email TEXT, bemerkungen TEXT,
    erstellt_am TEXT DEFAULT CURRENT_TIMESTAMP
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
  CREATE TABLE IF NOT EXISTS uebergaben (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    geraet_id INTEGER NOT NULL,
    datum TEXT, pruefer TEXT, empfaenger TEXT,
    funktionspruefung TEXT DEFAULT 'Nicht geprüft',
    datei_name TEXT, datei_pfad TEXT, bemerkungen TEXT,
    erstellt_am TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS dokumente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    geraet_id INTEGER NOT NULL,
    dateiname TEXT, dateipfad TEXT, beschreibung TEXT,
    hochgeladen_am TEXT DEFAULT CURRENT_TIMESTAMP,
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

// Spalten nachrüsten für bestehende Datenbanken
const migrate = sql => { try { db.exec(sql); } catch {} };
migrate('ALTER TABLE geraete ADD COLUMN hersteller_id INTEGER REFERENCES hersteller(id)');
migrate('ALTER TABLE geraete ADD COLUMN betreiber_id  INTEGER REFERENCES betreiber(id)');
migrate('ALTER TABLE geraete ADD COLUMN hersteller_tel TEXT');
migrate('ALTER TABLE geraete ADD COLUMN hersteller_email TEXT');
migrate('ALTER TABLE geraete ADD COLUMN betreiber_anschrift TEXT');
migrate('ALTER TABLE geraete ADD COLUMN betreiber_tel TEXT');
migrate('ALTER TABLE geraete ADD COLUMN betreiber_email TEXT');
migrate('ALTER TABLE hersteller ADD COLUMN tel TEXT');
migrate('ALTER TABLE hersteller ADD COLUMN email TEXT');
migrate('ALTER TABLE betreiber ADD COLUMN tel TEXT');
migrate('ALTER TABLE betreiber ADD COLUMN email TEXT');

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));
app.use('/uploads', express.static(UPLOADS_DIR));

function nowTs() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

const GERAETE_FIELDS = [
  'bezeichnung','art_typ','seriennummer','loscode','anschaffungsjahr',
  'inbetriebnahmedatum','ausserdienst_datum',
  'hersteller_id','hersteller_name','hersteller_anschrift','hersteller_tel','hersteller_email',
  'ce_jahr','risikoklasse','udi_di','udi_pi','emdn_code',
  'aktives_geraet','implantierbar','einmalprodukt','steril','zweckbestimmung',
  'betreiber_id','betreiber','betreiber_anschrift','betreiber_tel','betreiber_email',
  'inventarnummer','verantwortliche_person','netzwerkanbindung','softwareversion','bemerkungen',
];

// ── Geräte ────────────────────────────────────────────────────────────────────

app.get('/api/geraete', (req, res) => {
  const q = req.query.search?.trim();
  if (q) {
    const like = `%${q}%`;
    const rows = db.prepare(`
      SELECT id, bezeichnung, art_typ, risikoklasse, betreiber FROM geraete
      WHERE bezeichnung LIKE ? OR art_typ LIKE ? OR seriennummer LIKE ?
            OR inventarnummer LIKE ? OR betreiber LIKE ?
      ORDER BY bezeichnung
    `).all(like, like, like, like, like);
    return res.json(rows);
  }
  res.json(db.prepare(
    'SELECT id, bezeichnung, art_typ, risikoklasse, betreiber FROM geraete ORDER BY bezeichnung'
  ).all());
});

app.get('/api/geraete/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM geraete WHERE id = ?').get(+req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(row);
});

app.post('/api/geraete', (req, res) => {
  const body = req.body;
  if (!body.bezeichnung?.trim()) return res.status(400).json({ error: 'Bezeichnung ist ein Pflichtfeld.' });
  const fields = GERAETE_FIELDS.filter(k => k in body);
  const ts = nowTs();
  const result = db.prepare(
    `INSERT INTO geraete (${fields.join(',')}, erstellt_am, geaendert_am)
     VALUES (${fields.map(() => '?').join(',')}, ?, ?)`
  ).run(...fields.map(k => body[k] ?? null), ts, ts);
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

app.put('/api/geraete/:id', (req, res) => {
  const body = req.body;
  const fields = GERAETE_FIELDS.filter(k => k in body);
  if (!fields.length) return res.status(400).json({ error: 'Keine Felder zum Aktualisieren.' });
  db.prepare(
    `UPDATE geraete SET ${fields.map(k => `${k}=?`).join(',')}, geaendert_am=? WHERE id=?`
  ).run(...fields.map(k => body[k] ?? null), nowTs(), +req.params.id);
  res.json({ success: true });
});

app.delete('/api/geraete/:id', (req, res) => {
  db.prepare('DELETE FROM geraete WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

app.get('/api/bestandsliste', (req, res) => {
  res.json(db.prepare(`
    SELECT id, bezeichnung, art_typ, seriennummer, risikoklasse,
           hersteller_name, betreiber, inventarnummer,
           inbetriebnahmedatum, ausserdienst_datum
    FROM geraete ORDER BY bezeichnung
  `).all());
});

// ── Einweisungen ──────────────────────────────────────────────────────────────

app.get('/api/geraete/:id/einweisungen', (req, res) => {
  res.json(db.prepare(`
    SELECT id, datum, eingewiesene_person, beauftragte_person,
           CASE funktionspruefung WHEN 1 THEN 'Ja' ELSE 'Nein' END AS funktionspruefung
    FROM einweisungen WHERE geraet_id = ? ORDER BY datum DESC
  `).all(+req.params.id));
});

app.post('/api/einweisungen', (req, res) => {
  const b = req.body;
  if (!b.datum) return res.status(400).json({ error: 'Datum ist ein Pflichtfeld.' });
  const r = db.prepare(`
    INSERT INTO einweisungen
      (geraet_id, datum, eingewiesene_person, beauftragte_person, funktionspruefung, bemerkungen)
    VALUES (?,?,?,?,?,?)
  `).run(b.geraet_id, b.datum, b.eingewiesene_person||null, b.beauftragte_person||null,
         b.funktionspruefung ? 1 : 0, b.bemerkungen||null);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.delete('/api/einweisungen/:id', (req, res) => {
  db.prepare('DELETE FROM einweisungen WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Übergaben ─────────────────────────────────────────────────────────────────

app.get('/api/geraete/:id/uebergaben', (req, res) => {
  res.json(db.prepare(`
    SELECT id, datum, pruefer, empfaenger, funktionspruefung, datei_name, erstellt_am
    FROM uebergaben WHERE geraet_id = ? ORDER BY datum DESC
  `).all(+req.params.id));
});

app.post('/api/uebergaben', (req, res) => {
  const b = req.body;
  if (!b.datum) return res.status(400).json({ error: 'Datum ist ein Pflichtfeld.' });
  const r = db.prepare(`
    INSERT INTO uebergaben (geraet_id, datum, pruefer, empfaenger, funktionspruefung, bemerkungen, erstellt_am)
    VALUES (?,?,?,?,?,?,?)
  `).run(b.geraet_id, b.datum, b.pruefer||null, b.empfaenger||null,
         b.funktionspruefung||'Nicht geprüft', b.bemerkungen||null, nowTs());
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.post('/api/uebergaben/:id/upload', upload.single('datei'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  db.prepare('UPDATE uebergaben SET datei_name=?, datei_pfad=? WHERE id=?')
    .run(req.file.originalname, req.file.filename, +req.params.id);
  res.json({ success: true, datei_name: req.file.originalname });
});

app.delete('/api/uebergaben/:id', (req, res) => {
  db.prepare('DELETE FROM uebergaben WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Dokumente / Gebrauchsanweisungen ─────────────────────────────────────────

app.get('/api/geraete/:id/dokumente', (req, res) => {
  res.json(db.prepare(`
    SELECT id, dateiname, dateipfad, beschreibung, hochgeladen_am
    FROM dokumente WHERE geraet_id = ? ORDER BY hochgeladen_am DESC
  `).all(+req.params.id));
});

app.post('/api/dokumente/upload', upload.single('datei'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  if (!req.body.geraet_id) return res.status(400).json({ error: 'geraet_id fehlt.' });
  const r = db.prepare(`
    INSERT INTO dokumente (geraet_id, dateiname, dateipfad, beschreibung, hochgeladen_am)
    VALUES (?,?,?,?,?)
  `).run(+req.body.geraet_id, req.file.originalname, req.file.filename,
         req.body.beschreibung||null, nowTs());
  res.status(201).json({ id: Number(r.lastInsertRowid), dateiname: req.file.originalname });
});

app.delete('/api/dokumente/:id', (req, res) => {
  db.prepare('DELETE FROM dokumente WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── STK / Prüfungen ───────────────────────────────────────────────────────────

app.get('/api/geraete/:id/pruefungen', (req, res) => {
  res.json(db.prepare(`
    SELECT id, art, datum, naechste_faelligkeit, pruefer, ergebnis
    FROM pruefungen WHERE geraet_id = ? ORDER BY datum DESC
  `).all(+req.params.id));
});

app.post('/api/pruefungen', (req, res) => {
  const b = req.body;
  if (!b.art || !b.datum) return res.status(400).json({ error: 'Art und Datum sind Pflichtfelder.' });
  const r = db.prepare(`
    INSERT INTO pruefungen
      (geraet_id, art, datum, naechste_faelligkeit, pruefer, ergebnis,
       messwerte, messverfahren, maengel, korrektivmassnahmen, bemerkungen)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(b.geraet_id, b.art, b.datum, b.naechste_faelligkeit||null, b.pruefer||null,
         b.ergebnis||null, b.messwerte||null, b.messverfahren||null,
         b.maengel||null, b.korrektivmassnahmen||null, b.bemerkungen||null);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.delete('/api/pruefungen/:id', (req, res) => {
  db.prepare('DELETE FROM pruefungen WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Vorkommnisse ──────────────────────────────────────────────────────────────

app.get('/api/geraete/:id/vorkommnisse', (req, res) => {
  res.json(db.prepare(`
    SELECT id, datum, art_stoerung, meldung_behoerde, meldung_hersteller
    FROM vorkommnisse WHERE geraet_id = ? ORDER BY datum DESC
  `).all(+req.params.id));
});

app.post('/api/vorkommnisse', (req, res) => {
  const b = req.body;
  if (!b.datum) return res.status(400).json({ error: 'Datum ist ein Pflichtfeld.' });
  const r = db.prepare(`
    INSERT INTO vorkommnisse
      (geraet_id, datum, art_stoerung, folgen,
       meldung_behoerde, meldung_hersteller, korrektivmassnahmen, bemerkungen)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(b.geraet_id, b.datum, b.art_stoerung||null, b.folgen||null,
         b.meldung_behoerde||null, b.meldung_hersteller||null,
         b.korrektivmassnahmen||null, b.bemerkungen||null);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.delete('/api/vorkommnisse/:id', (req, res) => {
  db.prepare('DELETE FROM vorkommnisse WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Hersteller ────────────────────────────────────────────────────────────────

app.get('/api/hersteller', (req, res) => {
  const q = req.query.search?.trim();
  res.json(q
    ? db.prepare('SELECT * FROM hersteller WHERE name LIKE ? ORDER BY name').all(`%${q}%`)
    : db.prepare('SELECT * FROM hersteller ORDER BY name').all());
});

app.get('/api/hersteller/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM hersteller WHERE id = ?').get(+req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(row);
});

app.post('/api/hersteller', (req, res) => {
  const b = req.body;
  if (!b.name?.trim()) return res.status(400).json({ error: 'Name ist ein Pflichtfeld.' });
  const r = db.prepare(`
    INSERT INTO hersteller (name, anschrift, tel, email, bemerkungen, erstellt_am)
    VALUES (?,?,?,?,?,?)
  `).run(b.name.trim(), b.anschrift||null, b.tel||null, b.email||null, b.bemerkungen||null, nowTs());
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.put('/api/hersteller/:id', (req, res) => {
  const b = req.body;
  if (!b.name?.trim()) return res.status(400).json({ error: 'Name ist ein Pflichtfeld.' });
  db.prepare(`UPDATE hersteller SET name=?, anschrift=?, tel=?, email=?, bemerkungen=? WHERE id=?`)
    .run(b.name.trim(), b.anschrift||null, b.tel||null, b.email||null, b.bemerkungen||null, +req.params.id);
  res.json({ success: true });
});

app.delete('/api/hersteller/:id', (req, res) => {
  db.prepare('DELETE FROM hersteller WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Betreiber ─────────────────────────────────────────────────────────────────

app.get('/api/betreiber', (req, res) => {
  const q = req.query.search?.trim();
  res.json(q
    ? db.prepare('SELECT * FROM betreiber WHERE name LIKE ? ORDER BY name').all(`%${q}%`)
    : db.prepare('SELECT * FROM betreiber ORDER BY name').all());
});

app.get('/api/betreiber/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM betreiber WHERE id = ?').get(+req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(row);
});

app.post('/api/betreiber', (req, res) => {
  const b = req.body;
  if (!b.name?.trim()) return res.status(400).json({ error: 'Name ist ein Pflichtfeld.' });
  const r = db.prepare(`
    INSERT INTO betreiber (name, anschrift, tel, email, bemerkungen, erstellt_am)
    VALUES (?,?,?,?,?,?)
  `).run(b.name.trim(), b.anschrift||null, b.tel||null, b.email||null, b.bemerkungen||null, nowTs());
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.put('/api/betreiber/:id', (req, res) => {
  const b = req.body;
  if (!b.name?.trim()) return res.status(400).json({ error: 'Name ist ein Pflichtfeld.' });
  db.prepare(`UPDATE betreiber SET name=?, anschrift=?, tel=?, email=?, bemerkungen=? WHERE id=?`)
    .run(b.name.trim(), b.anschrift||null, b.tel||null, b.email||null, b.bemerkungen||null, +req.params.id);
  res.json({ success: true });
});

app.delete('/api/betreiber/:id', (req, res) => {
  db.prepare('DELETE FROM betreiber WHERE id = ?').run(+req.params.id);
  res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('\nMedizinprodukte-Datenbank (MPBetreibV 2025)');
  console.log(`Läuft auf:  ${url}`);
  console.log(`Datenbank:  ${DB_PATH}`);
  console.log(`Uploads:    ${UPLOADS_DIR}\n`);
  const cmd = process.platform === 'win32' ? `start ${url}`
            : process.platform === 'darwin' ? `open ${url}`
            : `xdg-open ${url}`;
  exec(cmd);
});

/**
 * Medizinprodukte-Datenbank – Backend
 * Node.js 25.9.0 | node:sqlite (stable ab Node 22.10) | node:http
 * Gemäß MPBetreibV 2025, MPDG und EU MDR 2017/745
 */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { exec } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'medizinprodukte.db');
const PORT = process.env.PORT || 3000;

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

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

const GERAETE_FIELDS = [
  'bezeichnung','art_typ','seriennummer','loscode','anschaffungsjahr',
  'inbetriebnahmedatum','ausserdienst_datum','hersteller_name','hersteller_anschrift',
  'hersteller_kontakt','bevollmaechtigter','ce_jahr','konformitaetserklaerung',
  'risikoklasse','udi_di','udi_pi','emdn_code','aktives_geraet','implantierbar',
  'einmalprodukt','steril','zweckbestimmung','betreiber','abteilung','standort_raum',
  'inventarnummer','verantwortliche_person','netzwerkanbindung','softwareversion','bemerkungen',
];

function readBody(req) {
  return new Promise(resolve => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve({}); }
    });
  });
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function nowTs() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ── HTTP-Server / Router ──────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, 'http://x');
  const path = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Frontend ausliefern
  if (method === 'GET' && path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(join(__dirname, 'public', 'index.html')));
    return;
  }

  try {
    let m;

    // GET /api/geraete[?search=...]
    if (method === 'GET' && path === '/api/geraete') {
      const q = url.searchParams.get('search')?.trim();
      const rows = q
        ? db.prepare(`
            SELECT id, bezeichnung, art_typ, risikoklasse, standort_raum FROM geraete
            WHERE bezeichnung LIKE ? OR art_typ LIKE ? OR seriennummer LIKE ?
                  OR inventarnummer LIKE ? OR abteilung LIKE ?
            ORDER BY bezeichnung
          `).all(...Array(5).fill(`%${q}%`))
        : db.prepare(
            'SELECT id, bezeichnung, art_typ, risikoklasse, standort_raum FROM geraete ORDER BY bezeichnung'
          ).all();
      return send(res, 200, rows);
    }

    // POST /api/geraete
    if (method === 'POST' && path === '/api/geraete') {
      const body = await readBody(req);
      if (!body.bezeichnung?.trim()) return send(res, 400, { error: 'Bezeichnung ist ein Pflichtfeld.' });
      const fields = GERAETE_FIELDS.filter(k => k in body);
      const ts = nowTs();
      const result = db.prepare(
        `INSERT INTO geraete (${fields.join(',')}, erstellt_am, geaendert_am)
         VALUES (${fields.map(() => '?').join(',')}, ?, ?)`
      ).run(...fields.map(k => body[k] ?? null), ts, ts);
      return send(res, 201, { id: Number(result.lastInsertRowid) });
    }

    // /api/geraete/:id
    if ((m = path.match(/^\/api\/geraete\/(\d+)$/))) {
      const id = +m[1];
      if (method === 'GET') {
        const row = db.prepare('SELECT * FROM geraete WHERE id = ?').get(id);
        if (!row) return send(res, 404, { error: 'Nicht gefunden' });
        return send(res, 200, row);
      }
      if (method === 'PUT') {
        const body = await readBody(req);
        const fields = GERAETE_FIELDS.filter(k => k in body);
        if (!fields.length) return send(res, 400, { error: 'Keine Felder zum Aktualisieren.' });
        db.prepare(
          `UPDATE geraete SET ${fields.map(k => `${k}=?`).join(',')}, geaendert_am=? WHERE id=?`
        ).run(...fields.map(k => body[k] ?? null), nowTs(), id);
        return send(res, 200, { success: true });
      }
      if (method === 'DELETE') {
        db.prepare('DELETE FROM geraete WHERE id = ?').run(id);
        return send(res, 200, { success: true });
      }
    }

    // GET /api/geraete/:id/pruefungen
    if ((m = path.match(/^\/api\/geraete\/(\d+)\/pruefungen$/)) && method === 'GET') {
      return send(res, 200, db.prepare(`
        SELECT id, art, datum, naechste_faelligkeit, pruefer, ergebnis
        FROM pruefungen WHERE geraet_id = ? ORDER BY datum DESC
      `).all(+m[1]));
    }

    // GET /api/geraete/:id/einweisungen
    if ((m = path.match(/^\/api\/geraete\/(\d+)\/einweisungen$/)) && method === 'GET') {
      return send(res, 200, db.prepare(`
        SELECT id, datum, eingewiesene_person, beauftragte_person,
               CASE funktionspruefung WHEN 1 THEN 'Ja' ELSE 'Nein' END AS funktionspruefung
        FROM einweisungen WHERE geraet_id = ? ORDER BY datum DESC
      `).all(+m[1]));
    }

    // GET /api/geraete/:id/vorkommnisse
    if ((m = path.match(/^\/api\/geraete\/(\d+)\/vorkommnisse$/)) && method === 'GET') {
      return send(res, 200, db.prepare(`
        SELECT id, datum, art_stoerung, meldung_behoerde, meldung_hersteller
        FROM vorkommnisse WHERE geraet_id = ? ORDER BY datum DESC
      `).all(+m[1]));
    }

    // POST /api/pruefungen
    if (method === 'POST' && path === '/api/pruefungen') {
      const b = await readBody(req);
      if (!b.art || !b.datum) return send(res, 400, { error: 'Art und Datum sind Pflichtfelder.' });
      const r = db.prepare(`
        INSERT INTO pruefungen (geraet_id, art, datum, naechste_faelligkeit, pruefer, ergebnis,
          messwerte, messverfahren, maengel, korrektivmassnahmen, bemerkungen)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(b.geraet_id, b.art, b.datum,
             b.naechste_faelligkeit||null, b.pruefer||null, b.ergebnis||null,
             b.messwerte||null, b.messverfahren||null, b.maengel||null,
             b.korrektivmassnahmen||null, b.bemerkungen||null);
      return send(res, 201, { id: Number(r.lastInsertRowid) });
    }

    // DELETE /api/pruefungen/:id
    if ((m = path.match(/^\/api\/pruefungen\/(\d+)$/)) && method === 'DELETE') {
      db.prepare('DELETE FROM pruefungen WHERE id = ?').run(+m[1]);
      return send(res, 200, { success: true });
    }

    // POST /api/einweisungen
    if (method === 'POST' && path === '/api/einweisungen') {
      const b = await readBody(req);
      if (!b.datum) return send(res, 400, { error: 'Datum ist ein Pflichtfeld.' });
      const r = db.prepare(`
        INSERT INTO einweisungen (geraet_id, datum, eingewiesene_person, beauftragte_person,
          funktionspruefung, bemerkungen)
        VALUES (?,?,?,?,?,?)
      `).run(b.geraet_id, b.datum,
             b.eingewiesene_person||null, b.beauftragte_person||null,
             b.funktionspruefung ? 1 : 0, b.bemerkungen||null);
      return send(res, 201, { id: Number(r.lastInsertRowid) });
    }

    // DELETE /api/einweisungen/:id
    if ((m = path.match(/^\/api\/einweisungen\/(\d+)$/)) && method === 'DELETE') {
      db.prepare('DELETE FROM einweisungen WHERE id = ?').run(+m[1]);
      return send(res, 200, { success: true });
    }

    // POST /api/vorkommnisse
    if (method === 'POST' && path === '/api/vorkommnisse') {
      const b = await readBody(req);
      if (!b.datum) return send(res, 400, { error: 'Datum ist ein Pflichtfeld.' });
      const r = db.prepare(`
        INSERT INTO vorkommnisse (geraet_id, datum, art_stoerung, folgen,
          meldung_behoerde, meldung_hersteller, korrektivmassnahmen, bemerkungen)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(b.geraet_id, b.datum,
             b.art_stoerung||null, b.folgen||null,
             b.meldung_behoerde||null, b.meldung_hersteller||null,
             b.korrektivmassnahmen||null, b.bemerkungen||null);
      return send(res, 201, { id: Number(r.lastInsertRowid) });
    }

    // DELETE /api/vorkommnisse/:id
    if ((m = path.match(/^\/api\/vorkommnisse\/(\d+)$/)) && method === 'DELETE') {
      db.prepare('DELETE FROM vorkommnisse WHERE id = ?').run(+m[1]);
      return send(res, 200, { success: true });
    }

    send(res, 404, { error: 'Not found' });

  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('\nMedizinprodukte-Datenbank (MPBetreibV 2025)');
  console.log(`Läuft auf:  ${url}`);
  console.log(`Datenbank:  ${DB_PATH}\n`);
  const cmd = process.platform === 'win32' ? `start ${url}`
            : process.platform === 'darwin' ? `open ${url}`
            : `xdg-open ${url}`;
  exec(cmd);
});

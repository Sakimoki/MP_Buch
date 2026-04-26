# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Über das Projekt

Medizinprodukte-Datenbank gemäß **MPBetreibV 2025**, **MPDG** und **EU MDR 2017/745**. Erfassung, Verwaltung und Dokumentation von Medizinprodukten inklusive Einweisungen (§13), IT-Sicherheit (§14 Abs. 3), Übergaben, STK/MTK-Prüfungen, Gebrauchsanweisungen und Vorkommnismeldungen (§3 MPDG / Art. 87 MDR).

## Befehle

```bash
# Entwicklung — zwei Terminals erforderlich
npm run dev:server   # Express-Backend auf http://localhost:3000
npm run dev:client   # Vite Dev-Server auf http://localhost:5173

# Produktion
npm run build        # React-Build → dist/
npm start            # Express serviert dist/ auf Port 3000

# Vite Dev-Preview (ohne Express)
npm run preview
```

Es gibt **keine Tests und keinen Linter** konfiguriert.

## Architektur

### Zwei-Schichten-System

**Backend** (`server.js`): Einzelne Datei, Express 4 + `node:sqlite` (eingebautes Node.js-Modul ab v22.10 — **nicht** das npm-Paket `sqlite3`). Startet auf Port 3000. Alle REST-Endpunkte und Datenbankzugriffe sind hier.

**Frontend** (`src/`): React 18 + Vite. Im Entwicklungsmodus läuft Vite auf Port 5173 und proxied `/api/*` und `/uploads/*` transparent zu Port 3000 (konfiguriert in `vite.config.js`). Im Produktionsmodus dient Express den Dateien aus `dist/` statisch.

### Datenbankschema (SQLite)

8 Tabellen: `geraete` (Haupttabelle, 34+ Spalten), `hersteller`, `betreiber` (Stammdaten), `einweisungen`, `pruefungen`, `uebergaben`, `dokumente`, `vorkommnisse`. Alle Untertabellen referenzieren `geraete.id` mit `ON DELETE CASCADE`.

**Migrations-Muster**: Neue Spalten werden per `migrate()` Hilfsfunktion nachgerüstet — die Funktion fängt den Fehler bei bereits vorhandenen Spalten still ab:
```js
const migrate = sql => { try { db.exec(sql); } catch {} };
migrate('ALTER TABLE geraete ADD COLUMN neue_spalte TEXT');
```

`package.json` hat `"type": "module"` — `server.js` verwendet ES-Module-Syntax (`import`/`export`).

### Frontend-State

`AppContext` (in `src/App.jsx`) hält **nur** globalen State: `geraeteList`, `selectedGeraetId`, `searchQuery`, `statusMessage`, `herstellerList`, `betreiberList`. Der Context wird via `useApp()` Hook abgerufen.

Jede Tab-Komponente (`src/components/tabs/`) lädt ihre eigenen Unterdaten (Einweisungen, Prüfungen etc.) selbstständig per `useEffect([geraetId])` und hält ihren lokalen State (selektierter Eintrag, Dialog offen/zu) intern.

### API-Schicht

`src/api/api.js` exportiert alle Fetch-Funktionen als Named Exports. Intern nutzen alle JSON-Endpunkte `apiFetch()`, File-Uploads gehen direkt über `fetch()` mit `FormData`. Fehler werden als `Error` mit der Backend-Fehlermeldung geworfen.

### Dialog-Muster

Dialoge verwenden natives HTML `<dialog>` mit `useRef` + `useEffect`:
```jsx
const ref = useRef()
useEffect(() => { ref.current?.showModal() }, [])
// ESC-Taste wird automatisch behandelt via onCancel
```
Dialoge werden **konditional** innerhalb ihrer aufrufenden Komponente gerendert (nicht zentral in App.jsx). `{showDialog && <MeinDialog onClose={...} />}` — beim Mount wird automatisch `showModal()` aufgerufen.

### CSS-Selektoren

Die CSS-Dateien in `src/styles/` verwenden `#id`-Selektoren (`#toolbar`, `#main`, `#list-panel`, `#detail-panel` usw.), die direkt den JSX-`id`-Props der Komponenten entsprechen. IDs in JSX nicht umbenennen ohne die zugehörigen CSS-Regeln anzupassen.

### Datei-Uploads

Multer speichert Dateien im `/uploads/`-Verzeichnis mit Präfix `{timestamp}_{sicherername}`. In der Datenbank wird nur der Dateiname (ohne Pfad) gespeichert. Zugriff über `/uploads/{datei_pfad}`. Maximale Dateigröße: 25 MB.

Das Verzeichnis `public/` enthält die alte Vanilla-JS-Version (`index.html`) als Referenz — sie wird in der Produktion **nicht** mehr ausgeliefert (Express dient jetzt `dist/`).

### Das Projekt dient dem Erlenern von Claude und Python. Es soll eine Datenerfassung für Medizinprodukte erstellt werden. 

Die Umstellung ist abgeschlossen. Hier eine Zusammenfassung was gemacht wurde:
                                                                                                         
  ---                                                    
  Was wurde erstellt (30 Dateien):                                                                       
                                                         
  ┌─────────────────────────────────────┬─────────────────────────────────────────────────────────────┐  
  │                Datei                │                            Zweck                            │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ vite.config.js                      │ Build-Tool Konfiguration, API-Proxy auf Port 3000           │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ index.html (Root)                   │ Vite-Einstiegspunkt                                         │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/main.jsx                        │ ReactDOM-Einstieg, importiert alle CSS-Dateien              │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/App.jsx                         │ Wurzel-Komponente + AppContext mit globalem State           │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/api/api.js                      │ Alle fetch()-Funktionen als named exports                   │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/styles/*.css                    │ 6 CSS-Dateien (index, toolbar, device-list, device-detail,  │
  │                                     │ dialogs, print)                                             │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/components/Toolbar.jsx          │ Toolbar-Leiste inkl. Bestandsliste-Funktion                 │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/components/DeviceList.jsx       │ Linkes Panel: Bestandsverzeichnis                           │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/components/DeviceDetail.jsx     │ Rechtes Panel: Tab-Navigation                               │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/components/tabs/*.jsx           │ 6 Tab-Komponenten (jede lädt ihre eigenen Daten)            │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/components/dialogs/*.jsx        │ 7 Dialog-Komponenten                                        │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ src/components/shared/StatusBar.jsx │ Statusleiste                                                │
  └─────────────────────────────────────┴─────────────────────────────────────────────────────────────┘

  Geändert:
  - server.js: express.static('public') → express.static('dist')
  - package.json: React, Vite und neue npm-Scripts ergänzt

  Starten:
  # Terminal 1 — Express-Backend
  npm run dev:server   # http://localhost:3000

  # Terminal 2 — React Dev-Server
  npm run dev:client   # http://localhost:5173

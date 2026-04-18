"""
Medizinprodukte-Datenbank
Gemäß MPBetreibV 2025, MPDG und EU MDR 2017/745

Dieses Programm dient der digitalen Führung des Medizinproduktebuches
nach §12 MPBetreibV sowie des Bestandsverzeichnisses nach §14 MPBetreibV.
Es deckt folgende gesetzliche Pflichten des Betreibers ab:
  - Bestandsverzeichnis aktiver und sicherheitstechnisch prüfpflichtiger Geräte
  - Dokumentation von STK (Sicherheitstechnische Kontrollen) gem. §11 MPBetreibV
  - Dokumentation von MTK (Messtechnische Kontrollen) gem. §14 MPDG / §12 MPBetreibV
  - Einweisungsnachweise gem. §13 MPBetreibV
  - Störungs- und Vorkommnisprotokoll gem. §3 MPDG / Art. 87 EU MDR 2017/745
"""

# ── Standardbibliotheken ───────────────────────────────────────────────────────
import tkinter as tk                        # GUI-Framework (in Python enthalten)
from tkinter import ttk, messagebox, simpledialog  # Erweiterte tkinter-Widgets
import sqlite3                              # Eingebettete SQL-Datenbank (keine Installation nötig)
import os                                   # Betriebssystemfunktionen (Pfade)
from datetime import datetime, date         # Datums- und Zeitfunktionen

# ── Datenbankpfad ─────────────────────────────────────────────────────────────
# Die Datenbankdatei wird im selben Verzeichnis wie dieses Skript abgelegt.
# os.path.dirname(__file__) liefert den Ordnerpfad des aktuellen Skripts,
# sodass die App auch aus anderen Verzeichnissen heraus gestartet werden kann.
DB_PATH = os.path.join(os.path.dirname(__file__), "medizinprodukte.db")


# ─────────────────────────────────────────────
# Datenbank-Initialisierung
# ─────────────────────────────────────────────

def init_db():
    """
    Erstellt beim ersten Start alle benötigten Datenbanktabellen, sofern sie
    noch nicht existieren (CREATE TABLE IF NOT EXISTS).
    Wird bei jedem Programmstart aufgerufen – ist idempotent, d.h. bereits
    vorhandene Tabellen werden nicht verändert oder geleert.

    Tabellenstruktur entspricht den Dokumentationspflichten nach:
      - §14 MPBetreibV: Bestandsverzeichnis (Tabelle: geraete)
      - §13 MPBetreibV: Einweisungsnachweis (Tabelle: einweisungen)
      - §§7,12,15 MPBetreibV: STK/MTK/Wartung (Tabelle: pruefungen)
      - Art. 87 EU MDR / §3 MPDG: Vorkommnisse (Tabelle: vorkommnisse)
    """
    conn = sqlite3.connect(DB_PATH)   # Verbindung öffnen (Datei wird ggf. neu angelegt)
    c = conn.cursor()                 # Cursor-Objekt für SQL-Befehle

    # ── Tabelle: geraete ──────────────────────────────────────────────────────
    # Zentrales Bestandsverzeichnis aller Medizinprodukte im Betrieb.
    # Pflichtinhalt gemäß §14 MPBetreibV, ergänzt um UDI-Felder (EU MDR Art. 27).
    c.execute("""
        CREATE TABLE IF NOT EXISTS geraete (
            id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Interne Datensatz-ID (automatisch vergeben)

            -- ── Gerätekennzeichnung (§14 Abs. 2 MPBetreibV) ───────────────
            bezeichnung TEXT NOT NULL,             -- Handelsname / Produktbezeichnung (Pflichtfeld)
            art_typ TEXT,                          -- Modell- oder Typenbezeichnung des Herstellers
            seriennummer TEXT,                     -- Eindeutige Seriennummer des Einzelgerätes
            loscode TEXT,                          -- Losnummer (relevant bei Chargenware / IVD)
            anschaffungsjahr TEXT,                 -- Jahr der Beschaffung durch den Betreiber
            inbetriebnahmedatum TEXT,              -- Datum der ersten Inbetriebnahme (ISO 8601)
            ausserdienst_datum TEXT,               -- Datum der Außerdienststellung / Entsorgung

            -- ── Hersteller-Informationen ──────────────────────────────────
            hersteller_name TEXT,                  -- Firmenname des Herstellers (CE-Kennzeichnung)
            hersteller_anschrift TEXT,             -- Postanschrift des Herstellers
            hersteller_kontakt TEXT,               -- Telefon / E-Mail des Herstellers
            bevollmaechtigter TEXT,                -- EU-Bevollmächtigter (bei Nicht-EU-Herstellern)
            ce_jahr TEXT,                          -- Jahr der CE-Erstzertifizierung
            konformitaetserklaerung TEXT,          -- Nummer / Fundstelle der EG-Konformitätserklärung

            -- ── Klassifikation & Unique Device Identification (UDI) ───────
            risikoklasse TEXT,                     -- Klasse I / IIa / IIb / III (MDR) bzw. IVD-A–D
            udi_di TEXT,                           -- UDI-Device Identifier (Produktebene, Art. 27 MDR)
            udi_pi TEXT,                           -- UDI-Production Identifier (Chargen-/Serienebene)
            emdn_code TEXT,                        -- European Medical Device Nomenclature Code
            aktives_geraet INTEGER DEFAULT 0,      -- 1 = Aktives MP (benötigt Energiequelle), 0 = passiv
            implantierbar INTEGER DEFAULT 0,       -- 1 = implantierbares Produkt
            einmalprodukt INTEGER DEFAULT 0,       -- 1 = Einmalprodukt (Wiederverwendung verboten)
            steril INTEGER DEFAULT 0,              -- 1 = steril verpackt / steril geliefert
            zweckbestimmung TEXT,                  -- Bestimmungsgemäße Verwendung laut Hersteller

            -- ── Betreiber & Standort ──────────────────────────────────────
            betreiber TEXT,                        -- Name der betreibenden Institution / Klinik
            abteilung TEXT,                        -- Abteilung / Station, der das Gerät zugeordnet ist
            standort_raum TEXT,                    -- Konkreter Aufstellungsort (Raumnummer o.ä.)
            inventarnummer TEXT,                   -- Interne Inventarnummer des Betreibers
            verantwortliche_person TEXT,           -- Ansprechpartner / Geräteverantwortlicher

            -- ── IT-Sicherheit (§14 Abs. 3 MPBetreibV 2025) ───────────────
            netzwerkanbindung INTEGER DEFAULT 0,   -- 1 = Gerät ist an ein Netzwerk angebunden
            softwareversion TEXT,                  -- Aktuelle Firmware-/Softwareversion

            -- ── Verwaltungsfelder ─────────────────────────────────────────
            bemerkungen TEXT,                      -- Freitext für sonstige Hinweise
            erstellt_am TEXT DEFAULT CURRENT_TIMESTAMP,   -- Zeitstempel der Datensatzerstellung
            geaendert_am TEXT DEFAULT CURRENT_TIMESTAMP   -- Zeitstempel der letzten Änderung
        )
    """)

    # ── Tabelle: einweisungen ─────────────────────────────────────────────────
    # Protokoll der Einweisungen von Anwendern gemäß §13 MPBetreibV.
    # Für jedes Gerät können beliebig viele Einweisungsdatensätze erfasst werden.
    # ON DELETE CASCADE: Wird ein Gerät gelöscht, werden alle zugehörigen
    # Einweisungsdatensätze automatisch mitgelöscht.
    c.execute("""
        CREATE TABLE IF NOT EXISTS einweisungen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            geraet_id INTEGER NOT NULL,                    -- Verweis auf geraete.id (Fremdschlüssel)
            datum TEXT,                                    -- Datum der Einweisung (ISO 8601)
            eingewiesene_person TEXT,                      -- Name der eingewiesenen Person (Anwender)
            beauftragte_person TEXT,                       -- Name der einweisenden Person (Beauftragter)
            funktionspruefung INTEGER DEFAULT 0,           -- 1 = Funktionsprüfung wurde durchgeführt
            bemerkungen TEXT,                              -- Freitext / Besonderheiten
            FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
        )
    """)

    # ── Tabelle: pruefungen ───────────────────────────────────────────────────
    # Prüf- und Wartungsprotokoll für STK, MTK, Reparaturen und IT-Sicherheitsprüfungen.
    # STK = Sicherheitstechnische Kontrolle (§11 MPBetreibV), Intervall vom Hersteller vorgegeben
    # MTK = Messtechnische Kontrolle (§12 MPBetreibV), i.d.R. jährlich durch zugelassene Stellen
    # Wartung = Herstellerspezifische Wartungsmaßnahmen (§15 MPBetreibV)
    c.execute("""
        CREATE TABLE IF NOT EXISTS pruefungen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            geraet_id INTEGER NOT NULL,                    -- Verweis auf geraete.id
            art TEXT,           -- Art der Prüfung: STK | MTK | Wartung | IT-Sicherheit | Reparatur
            datum TEXT,                                    -- Durchführungsdatum (ISO 8601)
            naechste_faelligkeit TEXT,                     -- Fälligkeitsdatum der nächsten Prüfung
            pruefer TEXT,                                  -- Name/Firma des Prüfers oder Sachverständigen
            ergebnis TEXT,      -- Prüfergebnis: Bestanden | Bedingt bestanden | Nicht bestanden
            messwerte TEXT,                                -- Gemessene Werte (z.B. Ableitstrom in µA)
            messverfahren TEXT,                            -- Angewandte Norm / Messverfahren (z.B. IEC 62353)
            maengel TEXT,                                  -- Festgestellte Mängel und Abweichungen
            korrektivmassnahmen TEXT,                      -- Eingeleitete Korrektivmaßnahmen
            bemerkungen TEXT,                              -- Sonstige Anmerkungen
            FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
        )
    """)

    # ── Tabelle: vorkommnisse ─────────────────────────────────────────────────
    # Protokoll sicherheitsrelevanter Störungen und Vorkommnisse.
    # Meldepflicht gegenüber Behörden (BfArM) und Herstellern gemäß:
    #   - §3 Abs. 2 MPDG (Meldung schwerwiegender Vorkommnisse)
    #   - Art. 87 EU MDR 2017/745
    c.execute("""
        CREATE TABLE IF NOT EXISTS vorkommnisse (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            geraet_id INTEGER NOT NULL,                    -- Verweis auf geraete.id
            datum TEXT,                                    -- Datum des Vorkommnisses (ISO 8601)
            art_stoerung TEXT,                             -- Beschreibung der Störung / des Ereignisses
            folgen TEXT,                                   -- Tatsächliche oder mögliche Folgen für Patienten
            meldung_behoerde TEXT,                         -- Datum der Behördenmeldung (BfArM / Landesbehörde)
            meldung_hersteller TEXT,                       -- Datum der Herstellermeldung
            korrektivmassnahmen TEXT,                      -- Ergriffene Sicherheitsmaßnahmen
            bemerkungen TEXT,                              -- Sonstige Anmerkungen
            FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
        )
    """)

    conn.commit()   # Alle CREATE TABLE-Befehle dauerhaft speichern
    conn.close()    # Datenbankverbindung schließen


def get_conn():
    """
    Öffnet eine neue SQLite-Datenbankverbindung und gibt sie zurück.
    Jede Methode, die Datenbankzugriffe benötigt, ruft diese Funktion auf
    und schließt die Verbindung nach der Verwendung wieder.
    Eine einzige persistente Verbindung würde bei Multi-Threading Probleme
    verursachen; dieser Ansatz ist für eine Single-Thread-GUI-App ausreichend.
    """
    return sqlite3.connect(DB_PATH)


# ─────────────────────────────────────────────
# Haupt-App
# ─────────────────────────────────────────────

class App(tk.Tk):
    """
    Hauptfenster der Anwendung. Erbt von tk.Tk, ist also selbst das Root-Fenster.

    Layout-Struktur:
      ┌─────────────────────────────────────────────────────────┐
      │  Toolbar (Schaltflächen + Suchfeld)                     │
      ├──────────────────┬──────────────────────────────────────┤
      │ Geräteliste      │  Detail-Tabs                         │
      │ (Treeview links) │  (Gerätedaten | STK/MTK | Einw. | Vork.)│
      ├──────────────────┴──────────────────────────────────────┤
      │  Statusleiste                                           │
      └─────────────────────────────────────────────────────────┘
    """

    def __init__(self):
        super().__init__()
        self.title("Medizinprodukte-Datenbank (MPBetreibV 2025)")
        self.geometry("1200x750")       # Startgröße des Fensters in Pixeln
        self.resizable(True, True)       # Fenstergröße kann vom Nutzer verändert werden
        self.configure(bg="#f0f0f0")     # Hintergrundfarbe des Hauptfensters
        self._build_ui()                 # UI-Komponenten aufbauen
        self.load_geraete()              # Geräteliste aus der Datenbank laden

    def _build_ui(self):
        """
        Baut alle Oberflächenelemente des Hauptfensters auf:
        Toolbar, PanedWindow mit Geräteliste und Detail-Notebook sowie Statusleiste.
        """

        # ── Toolbar ───────────────────────────────────────────────────────────
        # Horizontaler Rahmen am oberen Rand mit Aktionsschaltflächen und Suchfeld.
        toolbar = tk.Frame(self, bg="#007ba5", pady=6)
        toolbar.pack(fill="x")   # Volle Breite, keine vertikale Ausdehnung

        # Anwendungstitel in der Toolbar (dekorativ)
        tk.Label(toolbar, text="Medizinprodukte-Datenbank", font=("Helvetica", 14, "bold"),
                 bg="#2c3e50", fg="white").pack(side="left", padx=12)

        # Schaltflächen-Definitionen als Liste: (Beschriftung, Callback-Methode)
        # Alle Buttons erhalten dasselbe Styling für ein einheitliches Erscheinungsbild.
        for text, cmd in [
            ("+ Neues Gerät", self.neues_geraet),
            ("Bearbeiten", self.geraet_bearbeiten),
            ("Löschen", self.geraet_loeschen),
        ]:
            tk.Button(toolbar, text=text, command=cmd,
                      bg="#007ba5", fg="white", relief="flat",
                      padx=10, pady=4, cursor="hand2").pack(side="left", padx=4)

        # ── Suchfeld ──────────────────────────────────────────────────────────
        # trace_add("write", ...) ruft load_geraete() bei jeder Zeicheneingabe auf,
        # sodass die Liste live gefiltert wird (kein separater "Suchen"-Button nötig).
        tk.Label(toolbar, text="Suche:", bg="#2c3e50", fg="white").pack(side="right", padx=(0, 4))
        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", lambda *_: self.load_geraete())
        tk.Entry(toolbar, textvariable=self.search_var, width=22).pack(side="right", padx=(0, 12))

        # ── PanedWindow: Geräteliste + Detail-Bereich ─────────────────────────
        # PanedWindow erlaubt dem Nutzer, den Trennbalken zwischen Liste und
        # Detailansicht per Maus zu verschieben (sashwidth = Breite des Balkens).
        paned = tk.PanedWindow(self, orient="horizontal", sashwidth=6, bg="#ccc")
        paned.pack(fill="both", expand=True, padx=8, pady=8)

        # ── Linke Seite: Bestandsverzeichnis (Geräteliste) ────────────────────
        list_frame = tk.Frame(paned, bg="#f0f0f0")
        paned.add(list_frame, minsize=280)   # Mindestbreite 280 px

        tk.Label(list_frame, text="Bestandsverzeichnis", font=("Helvetica", 10, "bold"),
                 bg="#f0f0f0").pack(anchor="w", padx=4, pady=(4, 0))

        # Treeview zeigt die kompakte Übersichtsliste aller Geräte.
        # show="headings" blendet die leere Baum-Spalte aus.
        # selectmode="browse" erlaubt nur die Auswahl einer einzelnen Zeile.
        cols = ("ID", "Bezeichnung", "Typ", "Klasse", "Standort")
        self.tree = ttk.Treeview(list_frame, columns=cols, show="headings", selectmode="browse")
        for col in cols:
            self.tree.heading(col, text=col)
        # Spaltenbreiten anpassen: ID-Spalte schmal, Bezeichnung breiter
        self.tree.column("ID", width=40, anchor="center")
        self.tree.column("Bezeichnung", width=160)
        self.tree.column("Typ", width=100)
        self.tree.column("Klasse", width=60, anchor="center")
        self.tree.column("Standort", width=100)

        # Vertikale Scrollleiste für die Geräteliste
        vsb = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")

        # Ereignisbindung: Bei Auswahl eines Eintrags wird on_select() aufgerufen,
        # um die Detailansicht und alle Sub-Tabs zu aktualisieren.
        self.tree.bind("<<TreeviewSelect>>", self.on_select)

        # ── Rechte Seite: Detail-Notebook (Tabs) ──────────────────────────────
        # ttk.Notebook stellt die vier Karteireiter bereit.
        self.detail_nb = ttk.Notebook(paned)
        paned.add(self.detail_nb, minsize=600)

        # Frames für die einzelnen Tabs (werden als Eltern der jeweiligen Widgets verwendet)
        self.tab_detail = tk.Frame(self.detail_nb, bg="#f9f9f9")  # Stammdaten
        self.tab_pruef = tk.Frame(self.detail_nb, bg="#f9f9f9")   # STK/MTK/Wartung
        self.tab_einw = tk.Frame(self.detail_nb, bg="#f9f9f9")    # Einweisungen
        self.tab_vork = tk.Frame(self.detail_nb, bg="#f9f9f9")    # Vorkommnisse

        self.detail_nb.add(self.tab_detail, text="Gerätedaten")
        self.detail_nb.add(self.tab_pruef, text="STK / MTK / Wartung")
        self.detail_nb.add(self.tab_einw, text="Einweisungen")
        self.detail_nb.add(self.tab_vork, text="Vorkommnisse")

        # Inhalte der Tabs aufbauen
        self._build_detail_tab()
        self._build_pruef_tab()
        self._build_einw_tab()
        self._build_vork_tab()

        # ── Statusleiste ──────────────────────────────────────────────────────
        # Zeigt Statusinformationen wie die Anzahl geladener Geräte.
        self.status_var = tk.StringVar(value="Bereit")
        tk.Label(self, textvariable=self.status_var, bd=1, relief="sunken",
                 anchor="w", bg="#ecf0f1").pack(fill="x", side="bottom")

    # ── Detail-Tab ──────────────────────────────

    def _build_detail_tab(self):
        """
        Erstellt den scrollbaren Container für die Geräte-Stammdatenansicht.
        Da die Daten viele Felder umfassen, wird ein Canvas mit Scrollbar verwendet,
        weil normale Frames keine Scrollfunktion unterstützen.
        self.detail_frame ist der eigentliche Inhaltsrahmen innerhalb des Canvas.
        """
        canvas = tk.Canvas(self.tab_detail, bg="#f9f9f9", highlightthickness=0)
        sb = ttk.Scrollbar(self.tab_detail, orient="vertical", command=canvas.yview)
        self.detail_frame = tk.Frame(canvas, bg="#f9f9f9")

        # Wenn sich die Größe des Inhaltsrahmens ändert (z.B. durch neue Daten),
        # wird der sichtbare Scrollbereich des Canvas neu berechnet.
        self.detail_frame.bind("<Configure>", lambda e: canvas.configure(
            scrollregion=canvas.bbox("all")))

        canvas.create_window((0, 0), window=self.detail_frame, anchor="nw")
        canvas.configure(yscrollcommand=sb.set)
        canvas.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        self.detail_labels = {}  # Wörterbuch für eventuelle spätere Referenzen auf Label-Widgets

    def _show_detail(self, row):
        """
        Füllt den Gerätedaten-Tab mit den Werten des ausgewählten Gerätes.
        Löscht zuerst alle vorhandenen Widgets im detail_frame und baut
        die Anzeige dann mit den neuen Daten neu auf.

        Die Felder werden in thematische Abschnitte (sections) gruppiert,
        die jeweils einen farbigen Abschnittstitel erhalten.

        Parameter:
            row: Tupel aus der Datenbankabfrage (SELECT * FROM geraete WHERE id=?)
        """
        # Alte Inhalte löschen, bevor neue angezeigt werden
        for w in self.detail_frame.winfo_children():
            w.destroy()
        self.detail_labels = {}

        # Abschnitts-Definitionen: Abschnittsname → Liste aus (Anzeigebezeichnung, DB-Spaltenname)
        sections = {
            "Gerätekennzeichnung (§14 MPBetreibV)": [
                ("Bezeichnung", "bezeichnung"), ("Art / Typ", "art_typ"),
                ("Seriennummer", "seriennummer"), ("Loscode", "loscode"),
                ("Anschaffungsjahr", "anschaffungsjahr"),
                ("Inbetriebnahme", "inbetriebnahmedatum"),
                ("Außerdienststellung", "ausserdienst_datum"),
            ],
            "Hersteller": [
                ("Name", "hersteller_name"), ("Anschrift", "hersteller_anschrift"),
                ("Kontakt", "hersteller_kontakt"),
                ("Bevollmächtigter", "bevollmaechtigter"),
                ("CE-Jahr", "ce_jahr"),
                ("Konformitätserklärung", "konformitaetserklaerung"),
            ],
            "Klassifikation & UDI": [
                ("Risikoklasse", "risikoklasse"), ("UDI-DI", "udi_di"),
                ("UDI-PI", "udi_pi"), ("EMDN-Code", "emdn_code"),
                ("Aktives Gerät", "aktives_geraet"),
                ("Implantierbar", "implantierbar"),
                ("Einmalprodukt", "einmalprodukt"), ("Steril", "steril"),
                ("Zweckbestimmung", "zweckbestimmung"),
            ],
            "Betreiber / Standort": [
                ("Betreiber", "betreiber"), ("Abteilung", "abteilung"),
                ("Standort / Raum", "standort_raum"),
                ("Inventarnummer", "inventarnummer"),
                ("Verantwortliche Person", "verantwortliche_person"),
            ],
            "IT-Sicherheit": [
                ("Netzwerkanbindung", "netzwerkanbindung"),
                ("Softwareversion", "softwareversion"),
            ],
            "Bemerkungen": [("Bemerkungen", "bemerkungen")],
        }

        # Spaltennamen in der Reihenfolge, wie sie SELECT * liefert
        # (muss mit der Tabellendefinition in init_db() übereinstimmen)
        keys = [
            "id", "bezeichnung", "art_typ", "seriennummer", "loscode",
            "anschaffungsjahr", "inbetriebnahmedatum", "ausserdienst_datum",
            "hersteller_name", "hersteller_anschrift", "hersteller_kontakt",
            "bevollmaechtigter", "ce_jahr", "konformitaetserklaerung",
            "risikoklasse", "udi_di", "udi_pi", "emdn_code",
            "aktives_geraet", "implantierbar", "einmalprodukt", "steril",
            "zweckbestimmung", "betreiber", "abteilung", "standort_raum",
            "inventarnummer", "verantwortliche_person",
            "netzwerkanbindung", "softwareversion", "bemerkungen",
            "erstellt_am", "geaendert_am",
        ]
        # Zeile als Dictionary aufbereiten, damit der Zugriff per Spaltenname möglich ist
        data = dict(zip(keys, row))

        # Abschnitte und Felder dynamisch rendern
        for section, fields in sections.items():
            # Abschnittsüberschrift mit farbigem Hintergrund
            lbl = tk.Label(self.detail_frame, text=section,
                           font=("Helvetica", 10, "bold"), bg="#dce6f0",
                           anchor="w", padx=6, pady=3)
            lbl.pack(fill="x", pady=(8, 2), padx=4)

            for label, key in fields:
                row_frame = tk.Frame(self.detail_frame, bg="#f9f9f9")
                row_frame.pack(fill="x", padx=10, pady=1)

                # Feldbezeichnung (grau, feste Breite für gleichmäßige Ausrichtung)
                tk.Label(row_frame, text=f"{label}:", width=22, anchor="w",
                         bg="#f9f9f9", fg="#555").pack(side="left")

                val = data.get(key, "")
                # Boolesche Datenbankwerte (0/1) in lesbare Texte umwandeln
                if val in (0, 1):
                    val = "Ja" if val else "Nein"

                # Wert anzeigen; "–" als Platzhalter für leere Felder
                val_lbl = tk.Label(row_frame, text=str(val or "–"),
                                   anchor="w", bg="#f9f9f9", wraplength=380)
                val_lbl.pack(side="left", fill="x", expand=True)

        # Audit-Trail: Erstellungs- und Änderungszeitstempel am Ende anzeigen
        tk.Label(self.detail_frame,
                 text=f"Erstellt: {data.get('erstellt_am','')}   |   Geändert: {data.get('geaendert_am','')}",
                 font=("Helvetica", 8), bg="#f9f9f9", fg="#aaa").pack(pady=6)

    # ── Prüfungen-Tab ───────────────────────────

    def _build_pruef_tab(self):
        """
        Erstellt den Tab für STK/MTK/Wartungs-Einträge.
        Enthält eine Schaltflächenleiste und einen Treeview für die tabellarische Anzeige.
        Überfällige Prüfungen (Fälligkeitsdatum < heute) werden rot hinterlegt,
        noch nicht fällige grün – setzt auf Treeview-Tag-Konfiguration.
        """
        btn_frame = tk.Frame(self.tab_pruef, bg="#f9f9f9")
        btn_frame.pack(fill="x", padx=6, pady=4)
        tk.Button(btn_frame, text="+ Prüfung hinzufügen", command=self.pruefung_hinzufuegen,
                  bg="#27ae60", fg="white", relief="flat", padx=8).pack(side="left", padx=2)
        tk.Button(btn_frame, text="Löschen", command=self.pruefung_loeschen,
                  bg="#e74c3c", fg="white", relief="flat", padx=8).pack(side="left", padx=2)

        cols = ("ID", "Art", "Datum", "Nächste Fälligkeit", "Prüfer", "Ergebnis")
        self.pruef_tree = ttk.Treeview(self.tab_pruef, columns=cols, show="headings")
        for col in cols:
            self.pruef_tree.heading(col, text=col)
        self.pruef_tree.column("ID", width=40, anchor="center")
        self.pruef_tree.column("Art", width=100)
        self.pruef_tree.column("Datum", width=100)
        self.pruef_tree.column("Nächste Fälligkeit", width=130)
        self.pruef_tree.column("Prüfer", width=160)
        self.pruef_tree.column("Ergebnis", width=120)

        vsb = ttk.Scrollbar(self.tab_pruef, orient="vertical", command=self.pruef_tree.yview)
        self.pruef_tree.configure(yscrollcommand=vsb.set)
        self.pruef_tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")

        # Farbliche Markierung: rot = überfällig, grün = fristgerecht
        self.pruef_tree.tag_configure("overdue", background="#ffe0e0")
        self.pruef_tree.tag_configure("ok", background="#e8f8e8")

    def _build_einw_tab(self):
        """
        Erstellt den Tab für Einweisungsnachweise gemäß §13 MPBetreibV.
        Tabellarische Anzeige mit Schaltflächen zum Hinzufügen und Löschen.
        """
        btn_frame = tk.Frame(self.tab_einw, bg="#f9f9f9")
        btn_frame.pack(fill="x", padx=6, pady=4)
        tk.Button(btn_frame, text="+ Einweisung hinzufügen", command=self.einweisung_hinzufuegen,
                  bg="#27ae60", fg="white", relief="flat", padx=8).pack(side="left", padx=2)
        tk.Button(btn_frame, text="Löschen", command=self.einweisung_loeschen,
                  bg="#e74c3c", fg="white", relief="flat", padx=8).pack(side="left", padx=2)

        cols = ("ID", "Datum", "Eingewiesene Person", "Beauftragte Person", "Funktionsprüfung")
        self.einw_tree = ttk.Treeview(self.tab_einw, columns=cols, show="headings")
        for col in cols:
            self.einw_tree.heading(col, text=col)
        self.einw_tree.column("ID", width=40, anchor="center")

        vsb = ttk.Scrollbar(self.tab_einw, orient="vertical", command=self.einw_tree.yview)
        self.einw_tree.configure(yscrollcommand=vsb.set)
        self.einw_tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")

    def _build_vork_tab(self):
        """
        Erstellt den Tab für Störungs- und Vorkommnisprotokolle.
        Relevant für die Meldepflicht gem. §3 MPDG / Art. 87 EU MDR 2017/745.
        """
        btn_frame = tk.Frame(self.tab_vork, bg="#f9f9f9")
        btn_frame.pack(fill="x", padx=6, pady=4)
        tk.Button(btn_frame, text="+ Vorkommnis hinzufügen", command=self.vorkommnis_hinzufuegen,
                  bg="#e67e22", fg="white", relief="flat", padx=8).pack(side="left", padx=2)
        tk.Button(btn_frame, text="Löschen", command=self.vorkommnis_loeschen,
                  bg="#e74c3c", fg="white", relief="flat", padx=8).pack(side="left", padx=2)

        cols = ("ID", "Datum", "Art der Störung", "Meldung Behörde", "Meldung Hersteller")
        self.vork_tree = ttk.Treeview(self.tab_vork, columns=cols, show="headings")
        for col in cols:
            self.vork_tree.heading(col, text=col)
        self.vork_tree.column("ID", width=40, anchor="center")

        vsb = ttk.Scrollbar(self.tab_vork, orient="vertical", command=self.vork_tree.yview)
        self.vork_tree.configure(yscrollcommand=vsb.set)
        self.vork_tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")

    # ── Daten laden ─────────────────────────────

    def load_geraete(self):
        """
        Lädt die Geräteliste aus der Datenbank und befüllt den Treeview links.
        Wenn im Suchfeld Text eingegeben wurde, wird eine LIKE-Suche über die
        Felder Bezeichnung, Art/Typ, Seriennummer, Inventarnummer und Abteilung
        durchgeführt. Ohne Suchtext werden alle Geräte alphabetisch geladen.
        Aktualisiert außerdem die Statusleiste mit der Anzahl gefundener Einträge.
        """
        self.tree.delete(*self.tree.get_children())   # Vorherige Einträge löschen
        search = self.search_var.get().strip()
        conn = get_conn()
        c = conn.cursor()

        if search:
            # Parameterisierte Abfrage verhindert SQL-Injection.
            # Das %-Zeichen wird als Platzhalter für beliebige Zeichenfolgen
            # im LIKE-Operator verwendet (LIKE '%suchbegriff%').
            c.execute("""
                SELECT id, bezeichnung, art_typ, risikoklasse, standort_raum
                FROM geraete
                WHERE bezeichnung LIKE ? OR art_typ LIKE ? OR seriennummer LIKE ?
                      OR inventarnummer LIKE ? OR abteilung LIKE ?
                ORDER BY bezeichnung
            """, tuple(f"%{search}%" for _ in range(5)))
        else:
            # Ohne Suchfilter: alle Geräte alphabetisch nach Bezeichnung sortiert
            c.execute("""
                SELECT id, bezeichnung, art_typ, risikoklasse, standort_raum
                FROM geraete ORDER BY bezeichnung
            """)

        for row in c.fetchall():
            self.tree.insert("", "end", values=row)   # Jede Zeile als neuen Eintrag einfügen

        conn.close()
        self.status_var.set(f"{len(self.tree.get_children())} Gerät(e) geladen")

    def _selected_id(self):
        """
        Gibt die Datenbank-ID des aktuell im Treeview ausgewählten Gerätes zurück.
        Gibt None zurück, wenn keine Auswahl getroffen wurde.
        Die ID befindet sich immer in der ersten Spalte (Index 0) der Treeview-Zeile.
        """
        sel = self.tree.selection()
        if not sel:
            return None
        return self.tree.item(sel[0])["values"][0]

    def on_select(self, _=None):
        """
        Ereignishandler für die Auswahl eines Gerätes in der Liste.
        Wird bei <<TreeviewSelect>> ausgelöst. Lädt die Stammdaten sowie
        alle zugehörigen Prüfungen, Einweisungen und Vorkommnisse.
        Der Parameter _ ist das tkinter-Ereignisobjekt, das hier nicht benötigt wird.
        """
        gid = self._selected_id()
        if gid is None:
            return

        # Stammdaten aus der Datenbank laden und in der Detailansicht anzeigen
        conn = get_conn()
        c = conn.cursor()
        c.execute("SELECT * FROM geraete WHERE id=?", (gid,))
        row = c.fetchone()
        conn.close()

        if row:
            self._show_detail(row)

        # Alle Sub-Tabs mit den zugehörigen Daten befüllen
        self._load_pruefungen(gid)
        self._load_einweisungen(gid)
        self._load_vorkommnisse(gid)

    def _load_pruefungen(self, gid):
        """
        Lädt alle Prüfeinträge für das Gerät mit der übergebenen ID.
        Zeilen mit überschrittenem Fälligkeitsdatum erhalten das Tag "overdue"
        und werden rot hinterlegt; alle anderen erhalten das Tag "ok" (grün).
        Sortierung absteigend nach Datum (neueste Prüfung zuerst).
        """
        self.pruef_tree.delete(*self.pruef_tree.get_children())
        conn = get_conn()
        c = conn.cursor()
        c.execute("""
            SELECT id, art, datum, naechste_faelligkeit, pruefer, ergebnis
            FROM pruefungen WHERE geraet_id=? ORDER BY datum DESC
        """, (gid,))

        today = date.today().isoformat()  # Heutiges Datum als ISO-String (YYYY-MM-DD)
        for row in c.fetchall():
            fael = row[3] or ""
            # Überfälligkeitsprüfung: Fälligkeitsdatum vorhanden UND liegt in der Vergangenheit
            tag = "overdue" if fael and fael < today else "ok"
            self.pruef_tree.insert("", "end", values=row, tags=(tag,))

        conn.close()

    def _load_einweisungen(self, gid):
        """
        Lädt alle Einweisungseinträge für das angegebene Gerät.
        Der Boolesche Wert funktionspruefung wird direkt per CASE-Ausdruck
        in der SQL-Abfrage in 'Ja'/'Nein' umgewandelt (vermeidet Python-Nachbearbeitung).
        Sortierung absteigend nach Datum (neueste zuerst).
        """
        self.einw_tree.delete(*self.einw_tree.get_children())
        conn = get_conn()
        c = conn.cursor()
        c.execute("""
            SELECT id, datum, eingewiesene_person, beauftragte_person,
                   CASE funktionspruefung WHEN 1 THEN 'Ja' ELSE 'Nein' END
            FROM einweisungen WHERE geraet_id=? ORDER BY datum DESC
        """, (gid,))
        for row in c.fetchall():
            self.einw_tree.insert("", "end", values=row)
        conn.close()

    def _load_vorkommnisse(self, gid):
        """
        Lädt alle Vorkommnis-/Störungseinträge für das angegebene Gerät.
        Sortierung absteigend nach Datum (neuestes Vorkommnis zuerst).
        """
        self.vork_tree.delete(*self.vork_tree.get_children())
        conn = get_conn()
        c = conn.cursor()
        c.execute("""
            SELECT id, datum, art_stoerung, meldung_behoerde, meldung_hersteller
            FROM vorkommnisse WHERE geraet_id=? ORDER BY datum DESC
        """, (gid,))
        for row in c.fetchall():
            self.vork_tree.insert("", "end", values=row)
        conn.close()

    # ── CRUD Geräte ─────────────────────────────

    def neues_geraet(self):
        """Öffnet den Gerätedialog ohne vorausgefüllte Daten (Neuanlage)."""
        GeraetDialog(self, title="Neues Gerät erfassen")

    def geraet_bearbeiten(self):
        """
        Öffnet den Gerätedialog mit den bestehenden Daten des ausgewählten Gerätes.
        Zeigt eine Hinweismeldung, wenn kein Gerät ausgewählt wurde.
        """
        gid = self._selected_id()
        if gid is None:
            messagebox.showinfo("Hinweis", "Bitte zuerst ein Gerät auswählen.")
            return
        conn = get_conn()
        c = conn.cursor()
        c.execute("SELECT * FROM geraete WHERE id=?", (gid,))
        row = c.fetchone()
        conn.close()
        GeraetDialog(self, title="Gerät bearbeiten", data=row)

    def geraet_loeschen(self):
        """
        Löscht das ausgewählte Gerät nach Bestätigung durch den Nutzer.
        Durch ON DELETE CASCADE in der Datenbank werden alle zugehörigen
        Einweisungen, Prüfungen und Vorkommnisse automatisch mitgelöscht.
        Nach dem Löschen wird die Geräteliste neu geladen und der Detailbereich geleert.
        """
        gid = self._selected_id()
        if gid is None:
            messagebox.showinfo("Hinweis", "Bitte zuerst ein Gerät auswählen.")
            return
        if messagebox.askyesno("Löschen bestätigen",
                               "Gerät und alle zugehörigen Einträge wirklich löschen?"):
            conn = get_conn()
            conn.execute("DELETE FROM geraete WHERE id=?", (gid,))
            conn.commit()
            conn.close()
            self.load_geraete()
            # Detailbereich leeren, da das angezeigte Gerät nicht mehr existiert
            for w in self.detail_frame.winfo_children():
                w.destroy()

    # ── CRUD Prüfungen ──────────────────────────

    def pruefung_hinzufuegen(self):
        """Öffnet den Prüfungsdialog für das aktuell ausgewählte Gerät."""
        gid = self._selected_id()
        if gid is None:
            messagebox.showinfo("Hinweis", "Bitte zuerst ein Gerät auswählen.")
            return
        PruefungDialog(self, gid)

    def pruefung_loeschen(self):
        """
        Löscht den im Prüfungen-Treeview ausgewählten Eintrag nach Bestätigung.
        Aktualisiert anschließend die Prüfungsliste für das aktuelle Gerät.
        """
        sel = self.pruef_tree.selection()
        if not sel:
            return
        pid = self.pruef_tree.item(sel[0])["values"][0]   # ID aus erster Spalte
        if messagebox.askyesno("Löschen", "Prüfeintrag löschen?"):
            conn = get_conn()
            conn.execute("DELETE FROM pruefungen WHERE id=?", (pid,))
            conn.commit()
            conn.close()
            self._load_pruefungen(self._selected_id())

    # ── CRUD Einweisungen ────────────────────────

    def einweisung_hinzufuegen(self):
        """Öffnet den Einweisungsdialog für das aktuell ausgewählte Gerät."""
        gid = self._selected_id()
        if gid is None:
            messagebox.showinfo("Hinweis", "Bitte zuerst ein Gerät auswählen.")
            return
        EinweisungDialog(self, gid)

    def einweisung_loeschen(self):
        """
        Löscht den im Einweisungs-Treeview ausgewählten Eintrag nach Bestätigung.
        Aktualisiert anschließend die Einweisungsliste für das aktuelle Gerät.
        """
        sel = self.einw_tree.selection()
        if not sel:
            return
        eid = self.einw_tree.item(sel[0])["values"][0]
        if messagebox.askyesno("Löschen", "Einweisungseintrag löschen?"):
            conn = get_conn()
            conn.execute("DELETE FROM einweisungen WHERE id=?", (eid,))
            conn.commit()
            conn.close()
            self._load_einweisungen(self._selected_id())

    # ── CRUD Vorkommnisse ────────────────────────

    def vorkommnis_hinzufuegen(self):
        """Öffnet den Vorkommnisdialog für das aktuell ausgewählte Gerät."""
        gid = self._selected_id()
        if gid is None:
            messagebox.showinfo("Hinweis", "Bitte zuerst ein Gerät auswählen.")
            return
        VorkommnisDialog(self, gid)

    def vorkommnis_loeschen(self):
        """
        Löscht das im Vorkommnis-Treeview ausgewählte Ereignis nach Bestätigung.
        Aktualisiert anschließend die Vorkommnisliste für das aktuelle Gerät.
        """
        sel = self.vork_tree.selection()
        if not sel:
            return
        vid = self.vork_tree.item(sel[0])["values"][0]
        if messagebox.askyesno("Löschen", "Vorkommnis löschen?"):
            conn = get_conn()
            conn.execute("DELETE FROM vorkommnisse WHERE id=?", (vid,))
            conn.commit()
            conn.close()
            self._load_vorkommnisse(self._selected_id())


# ─────────────────────────────────────────────
# Dialog: Gerät erfassen / bearbeiten
# ─────────────────────────────────────────────

class GeraetDialog(tk.Toplevel):
    """
    Modaler Eingabedialog zum Erfassen und Bearbeiten von Gerätestammdaten.
    Wird sowohl für die Neuanlage (data=None) als auch für die Bearbeitung
    (data=Datenbankzeile) verwendet.

    Das Formular wird aus der Klassenvariable FIELDS dynamisch aufgebaut.
    Jeder Eintrag definiert: (Beschriftung, DB-Spaltenname, Widget-Typ, Optionen)
    Widget-Typen:
      "separator" – Abschnittsüberschrift (kein Dateneingabefeld)
      "entry"     – Einzeiliges Texteingabefeld (tk.Entry)
      "combo"     – Auswahlfeld mit vordefinierten Optionen (ttk.Combobox)
      "check"     – Kontrollkästchen für Ja/Nein-Felder (tk.Checkbutton)
      "text"      – Mehrzeiliges Texteingabefeld (tk.Text)
    """

    # Felddefinitionen: Reihenfolge bestimmt die Darstellung im Formular.
    # key=None bei Separatoren (kein Datenbankbezug).
    FIELDS = [
        # (label, key, widget_type, options)
        ("── Gerätekennzeichnung (§14 MPBetreibV) ──", None, "separator", None),
        ("Bezeichnung *", "bezeichnung", "entry", None),
        ("Art / Typ", "art_typ", "entry", None),
        ("Seriennummer", "seriennummer", "entry", None),
        ("Loscode", "loscode", "entry", None),
        ("Anschaffungsjahr", "anschaffungsjahr", "entry", None),
        ("Inbetriebnahmedatum (YYYY-MM-DD)", "inbetriebnahmedatum", "entry", None),
        ("Außerdienststellung (YYYY-MM-DD)", "ausserdienst_datum", "entry", None),
        ("── Hersteller ──", None, "separator", None),
        ("Herstellername", "hersteller_name", "entry", None),
        ("Herstelleranschrift", "hersteller_anschrift", "entry", None),
        ("Herstellerkontakt", "hersteller_kontakt", "entry", None),
        ("Bevollmächtigter", "bevollmaechtigter", "entry", None),
        ("CE-Jahr", "ce_jahr", "entry", None),
        ("Konformitätserklärung Nr.", "konformitaetserklaerung", "entry", None),
        ("── Klassifikation & UDI ──", None, "separator", None),
        ("Risikoklasse", "risikoklasse", "combo",
         ["I", "IIa", "IIb", "III", "IVD-A", "IVD-B", "IVD-C", "IVD-D"]),
        ("UDI-DI", "udi_di", "entry", None),
        ("UDI-PI", "udi_pi", "entry", None),
        ("EMDN-Code", "emdn_code", "entry", None),
        ("Aktives Gerät", "aktives_geraet", "check", None),
        ("Implantierbar", "implantierbar", "check", None),
        ("Einmalprodukt", "einmalprodukt", "check", None),
        ("Steril", "steril", "check", None),
        ("Zweckbestimmung", "zweckbestimmung", "text", None),
        ("── Betreiber / Standort ──", None, "separator", None),
        ("Betreiber / Institution", "betreiber", "entry", None),
        ("Abteilung", "abteilung", "entry", None),
        ("Standort / Raum", "standort_raum", "entry", None),
        ("Inventarnummer", "inventarnummer", "entry", None),
        ("Verantwortliche Person", "verantwortliche_person", "entry", None),
        ("── IT-Sicherheit ──", None, "separator", None),
        ("Netzwerkanbindung", "netzwerkanbindung", "check", None),
        ("Softwareversion", "softwareversion", "entry", None),
        ("── Sonstiges ──", None, "separator", None),
        ("Bemerkungen", "bemerkungen", "text", None),
    ]

    def __init__(self, parent, title="Gerät", data=None):
        """
        Parameter:
            parent  – Elternfenster (Hauptfenster App)
            title   – Fenstertitel (z.B. "Neues Gerät erfassen" oder "Gerät bearbeiten")
            data    – Datenbankzeile als Tupel (bei Bearbeitung) oder None (bei Neuanlage)
        """
        super().__init__(parent)
        self.parent = parent
        self.data = data       # None = Neuanlage, Tupel = Bearbeitung
        self.title(title)
        self.geometry("600x700")
        self.resizable(True, True)
        self.grab_set()        # Modaler Dialog: sperrt Interaktion mit dem Elternfenster
        self.widgets = {}      # Wörterbuch: DB-Spaltenname → Widget-Variable (für save())
        self._build()
        if data:
            self._populate(data)  # Felder mit vorhandenen Daten befüllen (Bearbeitungsmodus)

    def _build(self):
        """
        Erstellt das scrollbare Formular dynamisch anhand der FIELDS-Klassenvariable.
        Für jeden Feldeintrag wird je nach Widget-Typ ein passendes Eingabewidget erzeugt
        und die zugehörige Variable in self.widgets gespeichert.
        Separatoren erzeugen nur eine visuelle Abschnittsüberschrift ohne Widget.
        """
        # Scrollbarer Canvas-Bereich für das Formular
        canvas = tk.Canvas(self, highlightthickness=0)
        sb = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        form = tk.Frame(canvas, padx=12, pady=8)

        # Canvas-Scrollbereich automatisch anpassen, wenn Formularinhalt wächst
        form.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=form, anchor="nw")
        canvas.configure(yscrollcommand=sb.set)
        canvas.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        # Mausrad-Scrolling aktivieren (Windows: e.delta ist ein Vielfaches von 120)
        canvas.bind_all("<MouseWheel>", lambda e: canvas.yview_scroll(-1 * (e.delta // 120), "units"))

        # Felder dynamisch erzeugen
        for label, key, wtype, opts in self.FIELDS:
            if wtype == "separator":
                # Abschnittsüberschrift ohne Eingabefeld
                tk.Label(form, text=label, font=("Helvetica", 9, "bold"),
                         bg="#dce6f0", anchor="w", padx=4).pack(fill="x", pady=(10, 2))
                continue

            # Zeilen-Frame für Label + Widget (horizontales Layout)
            row = tk.Frame(form)
            row.pack(fill="x", pady=2)
            tk.Label(row, text=label, width=30, anchor="w").pack(side="left")

            if wtype == "entry":
                var = tk.StringVar()
                tk.Entry(row, textvariable=var, width=30).pack(side="left", fill="x", expand=True)
                self.widgets[key] = var

            elif wtype == "combo":
                var = tk.StringVar()
                # state="readonly" verhindert, dass Nutzer eigene Werte eintippen
                ttk.Combobox(row, textvariable=var, values=opts, width=28,
                             state="readonly").pack(side="left")
                self.widgets[key] = var

            elif wtype == "check":
                var = tk.BooleanVar()
                tk.Checkbutton(row, variable=var).pack(side="left")
                self.widgets[key] = var

            elif wtype == "text":
                # Mehrzeiliges Textfeld für Freitextfelder (z.B. Zweckbestimmung, Bemerkungen)
                txt = tk.Text(row, height=3, width=30, wrap="word")
                txt.pack(side="left", fill="x", expand=True)
                self.widgets[key] = txt

        # Speichern/Abbrechen-Schaltflächen am unteren Rand
        btn_frame = tk.Frame(self)
        btn_frame.pack(fill="x", padx=12, pady=8)
        tk.Button(btn_frame, text="Speichern", command=self.save,
                  bg="#27ae60", fg="white", relief="flat", padx=12).pack(side="left", padx=4)
        tk.Button(btn_frame, text="Abbrechen", command=self.destroy,
                  relief="flat", padx=12).pack(side="left")

    def _populate(self, row):
        """
        Befüllt alle Formularfelder mit den Werten aus einer vorhandenen Datenbankzeile.
        Wird nur im Bearbeitungsmodus (data != None) aufgerufen.
        Die keys-Liste muss in der Reihenfolge der SELECT *-Abfrage übereinstimmen.

        Parameter:
            row – Datenbankzeile als Tupel (aus SELECT * FROM geraete WHERE id=?)
        """
        keys = [
            "id", "bezeichnung", "art_typ", "seriennummer", "loscode",
            "anschaffungsjahr", "inbetriebnahmedatum", "ausserdienst_datum",
            "hersteller_name", "hersteller_anschrift", "hersteller_kontakt",
            "bevollmaechtigter", "ce_jahr", "konformitaetserklaerung",
            "risikoklasse", "udi_di", "udi_pi", "emdn_code",
            "aktives_geraet", "implantierbar", "einmalprodukt", "steril",
            "zweckbestimmung", "betreiber", "abteilung", "standort_raum",
            "inventarnummer", "verantwortliche_person",
            "netzwerkanbindung", "softwareversion", "bemerkungen",
        ]
        d = dict(zip(keys, row))

        for key, widget in self.widgets.items():
            val = d.get(key, "")
            if isinstance(widget, tk.BooleanVar):
                widget.set(bool(val))                  # 0/1 → False/True
            elif isinstance(widget, tk.StringVar):
                widget.set(str(val or ""))
            elif isinstance(widget, tk.Text):
                widget.delete("1.0", "end")
                widget.insert("1.0", str(val or ""))   # "1.0" = Zeile 1, Zeichen 0

    def save(self):
        """
        Liest alle Formularwerte aus, validiert das Pflichtfeld 'Bezeichnung'
        und schreibt die Daten in die Datenbank.

        Im Bearbeitungsmodus (self.data != None): UPDATE-Anweisung mit der vorhandenen ID.
        Im Neuanlage-Modus (self.data is None): INSERT-Anweisung.

        Die SQL-Anweisung wird dynamisch aus den Feldnamen konstruiert, sodass neue
        Felder nur in FIELDS und der Tabellendefinition ergänzt werden müssen.
        Nach dem Speichern wird die Geräteliste im Hauptfenster aktualisiert.
        """
        vals = {}
        for key, widget in self.widgets.items():
            if isinstance(widget, tk.BooleanVar):
                vals[key] = 1 if widget.get() else 0   # Boolean → Integer für SQLite
            elif isinstance(widget, tk.StringVar):
                vals[key] = widget.get().strip()         # Führende/nachfolgende Leerzeichen entfernen
            elif isinstance(widget, tk.Text):
                vals[key] = widget.get("1.0", "end").strip()

        # Pflichtfeldvalidierung: Bezeichnung darf nicht leer sein
        if not vals.get("bezeichnung"):
            messagebox.showerror("Fehler", "Bezeichnung ist ein Pflichtfeld.")
            return

        now = datetime.now().isoformat(sep=" ", timespec="seconds")  # Zeitstempel für Audit-Trail

        conn = get_conn()
        if self.data:
            # ── Bearbeitungsmodus: UPDATE ──────────────────────────────────
            gid = self.data[0]  # ID aus dem ersten Element der ursprünglichen Datenbankzeile
            # Dynamisch: "feld1=?, feld2=?, ..." aus den Schlüsseln der vals-Dictionary
            cols = ", ".join(f"{k}=?" for k in vals)
            conn.execute(
                f"UPDATE geraete SET {cols}, geaendert_am=? WHERE id=?",
                [*vals.values(), now, gid]
            )
        else:
            # ── Neuanlage: INSERT ──────────────────────────────────────────
            cols = ", ".join(vals.keys())
            placeholders = ", ".join("?" for _ in vals)
            conn.execute(
                f"INSERT INTO geraete ({cols}, erstellt_am, geaendert_am) VALUES ({placeholders}, ?, ?)",
                [*vals.values(), now, now]
            )

        conn.commit()
        conn.close()
        self.parent.load_geraete()   # Geräteliste im Hauptfenster aktualisieren
        self.destroy()               # Dialog schließen


# ─────────────────────────────────────────────
# Dialog: Prüfung
# ─────────────────────────────────────────────

class PruefungDialog(tk.Toplevel):
    """
    Modaler Eingabedialog zum Erfassen einer neuen STK/MTK/Wartungs-Prüfung.
    Der Dialog ist mit der Geräte-ID verknüpft und speichert den Eintrag
    direkt in der Tabelle 'pruefungen'.

    Pflichtfelder: Art der Prüfung und Datum.
    """

    def __init__(self, parent, geraet_id, data=None):
        """
        Parameter:
            parent    – Elternfenster (App-Hauptfenster)
            geraet_id – ID des Gerätes, für das die Prüfung erfasst wird
            data      – (reserviert für zukünftige Bearbeitungsfunktion)
        """
        super().__init__(parent)
        self.parent = parent
        self.geraet_id = geraet_id
        self.data = data
        self.title("Prüfung / Wartung erfassen")
        self.geometry("500x520")
        self.grab_set()
        self.widgets = {}
        self._build()

    def _build(self):
        """
        Erstellt das Eingabeformular für Prüfungsdaten.
        Die Felddefinitionen sind lokal, da dieser Dialog keine FIELDS-Klassenvariable
        wie GeraetDialog verwendet (weniger Felder, kein Scroll-Canvas nötig).
        """
        frame = tk.Frame(self, padx=12, pady=10)
        frame.pack(fill="both", expand=True)

        fields = [
            ("Art *", "art", "combo",
             ["STK", "MTK", "Wartung", "Reparatur", "IT-Sicherheitsprüfung", "Kalibrierung"]),
            ("Datum (YYYY-MM-DD) *", "datum", "entry", None),
            ("Nächste Fälligkeit (YYYY-MM-DD)", "naechste_faelligkeit", "entry", None),
            ("Prüfer / Firma", "pruefer", "entry", None),
            ("Ergebnis", "ergebnis", "combo", ["Bestanden", "Bedingt bestanden", "Nicht bestanden"]),
            ("Messwerte", "messwerte", "entry", None),
            ("Messverfahren / Norm", "messverfahren", "entry", None),  # z.B. IEC 62353, DIN EN ISO 9001
            ("Aufgedeckte Mängel", "maengel", "text", None),
            ("Korrektivmaßnahmen", "korrektivmassnahmen", "text", None),
            ("Bemerkungen", "bemerkungen", "text", None),
        ]

        for label, key, wtype, opts in fields:
            row = tk.Frame(frame)
            row.pack(fill="x", pady=3)
            tk.Label(row, text=label, width=28, anchor="w").pack(side="left")

            if wtype == "entry":
                var = tk.StringVar()
                tk.Entry(row, textvariable=var, width=28).pack(side="left", fill="x", expand=True)
                self.widgets[key] = var
            elif wtype == "combo":
                var = tk.StringVar()
                ttk.Combobox(row, textvariable=var, values=opts, width=26).pack(side="left")
                self.widgets[key] = var
            elif wtype == "text":
                txt = tk.Text(row, height=2, width=28, wrap="word")
                txt.pack(side="left", fill="x", expand=True)
                self.widgets[key] = txt

        btn_frame = tk.Frame(self)
        btn_frame.pack(fill="x", padx=12, pady=8)
        tk.Button(btn_frame, text="Speichern", command=self.save,
                  bg="#27ae60", fg="white", relief="flat", padx=12).pack(side="left", padx=4)
        tk.Button(btn_frame, text="Abbrechen", command=self.destroy,
                  relief="flat", padx=12).pack(side="left")

    def save(self):
        """
        Liest die Formulardaten aus, validiert Pflichtfelder (Art + Datum)
        und fügt einen neuen Datensatz in die Tabelle 'pruefungen' ein.
        Anschließend wird die Prüfungsliste im Hauptfenster aktualisiert.
        """
        vals = {}
        for key, w in self.widgets.items():
            if isinstance(w, tk.StringVar):
                vals[key] = w.get().strip()
            elif isinstance(w, tk.Text):
                vals[key] = w.get("1.0", "end").strip()

        if not vals.get("art") or not vals.get("datum"):
            messagebox.showerror("Fehler", "Art und Datum sind Pflichtfelder.")
            return

        conn = get_conn()
        conn.execute("""
            INSERT INTO pruefungen
            (geraet_id, art, datum, naechste_faelligkeit, pruefer, ergebnis,
             messwerte, messverfahren, maengel, korrektivmassnahmen, bemerkungen)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (self.geraet_id, vals["art"], vals["datum"],
              vals.get("naechste_faelligkeit"), vals.get("pruefer"),
              vals.get("ergebnis"), vals.get("messwerte"),
              vals.get("messverfahren"), vals.get("maengel"),
              vals.get("korrektivmassnahmen"), vals.get("bemerkungen")))
        conn.commit()
        conn.close()
        self.parent._load_pruefungen(self.geraet_id)   # Tab im Hauptfenster aktualisieren
        self.destroy()


# ─────────────────────────────────────────────
# Dialog: Einweisung
# ─────────────────────────────────────────────

class EinweisungDialog(tk.Toplevel):
    """
    Modaler Eingabedialog zum Erfassen eines Einweisungsnachweises
    gemäß §13 MPBetreibV.

    Pflichtfeld: Datum der Einweisung.
    Das Feld 'Funktionsprüfung' dokumentiert, ob beim Einweisungstermin
    eine Funktionsprüfung des Gerätes durchgeführt wurde.
    """

    def __init__(self, parent, geraet_id):
        super().__init__(parent)
        self.parent = parent
        self.geraet_id = geraet_id
        self.title("Einweisung erfassen (§13 MPBetreibV)")
        self.geometry("450x320")
        self.grab_set()
        self.widgets = {}
        self._build()

    def _build(self):
        """Erstellt das Eingabeformular für Einweisungsdaten."""
        frame = tk.Frame(self, padx=12, pady=10)
        frame.pack(fill="both", expand=True)

        fields = [
            ("Datum (YYYY-MM-DD) *", "datum", "entry"),
            ("Eingewiesene Person", "eingewiesene_person", "entry"),    # Anwender, der eingewiesen wird
            ("Beauftragte Person", "beauftragte_person", "entry"),      # Einweisende Person (Beauftragter)
            ("Bemerkungen", "bemerkungen", "text"),
        ]

        for label, key, wtype in fields:
            row = tk.Frame(frame)
            row.pack(fill="x", pady=3)
            tk.Label(row, text=label, width=26, anchor="w").pack(side="left")
            if wtype == "entry":
                var = tk.StringVar()
                tk.Entry(row, textvariable=var, width=28).pack(side="left")
                self.widgets[key] = var
            elif wtype == "text":
                txt = tk.Text(row, height=3, width=28, wrap="word")
                txt.pack(side="left")
                self.widgets[key] = txt

        # Funktionsprüfungs-Checkbox separat, da sie kein Texteingabefeld ist
        row = tk.Frame(frame)
        row.pack(fill="x", pady=3)
        tk.Label(row, text="Funktionsprüfung durchgeführt", width=26, anchor="w").pack(side="left")
        self.fp_var = tk.BooleanVar()
        tk.Checkbutton(row, variable=self.fp_var).pack(side="left")

        btn_frame = tk.Frame(self)
        btn_frame.pack(fill="x", padx=12, pady=8)
        tk.Button(btn_frame, text="Speichern", command=self.save,
                  bg="#27ae60", fg="white", relief="flat", padx=12).pack(side="left", padx=4)
        tk.Button(btn_frame, text="Abbrechen", command=self.destroy,
                  relief="flat", padx=12).pack(side="left")

    def save(self):
        """
        Validiert das Pflichtfeld 'Datum' und speichert den Einweisungseintrag
        in die Tabelle 'einweisungen'. fp_var (Funktionsprüfung) wird als 0/1
        gespeichert. Aktualisiert die Einweisungsliste im Hauptfenster.
        """
        vals = {}
        for key, w in self.widgets.items():
            if isinstance(w, tk.StringVar):
                vals[key] = w.get().strip()
            elif isinstance(w, tk.Text):
                vals[key] = w.get("1.0", "end").strip()

        if not vals.get("datum"):
            messagebox.showerror("Fehler", "Datum ist ein Pflichtfeld.")
            return

        conn = get_conn()
        conn.execute("""
            INSERT INTO einweisungen
            (geraet_id, datum, eingewiesene_person, beauftragte_person,
             funktionspruefung, bemerkungen)
            VALUES (?,?,?,?,?,?)
        """, (self.geraet_id, vals["datum"],
              vals.get("eingewiesene_person"), vals.get("beauftragte_person"),
              1 if self.fp_var.get() else 0,   # BooleanVar → Integer
              vals.get("bemerkungen")))
        conn.commit()
        conn.close()
        self.parent._load_einweisungen(self.geraet_id)
        self.destroy()


# ─────────────────────────────────────────────
# Dialog: Vorkommnis
# ─────────────────────────────────────────────

class VorkommnisDialog(tk.Toplevel):
    """
    Modaler Eingabedialog zum Erfassen sicherheitsrelevanter Störungen
    und Vorkommnisse gemäß §3 MPDG / Art. 87 EU MDR 2017/745.

    Pflichtfeld: Datum des Vorkommnisses.
    Die Felder 'Meldung Behörde' und 'Meldung Hersteller' dokumentieren,
    ob und wann die gesetzlich vorgeschriebenen Meldungen erstattet wurden.
    """

    def __init__(self, parent, geraet_id):
        super().__init__(parent)
        self.parent = parent
        self.geraet_id = geraet_id
        self.title("Vorkommnis / Störung erfassen")
        self.geometry("500x420")
        self.grab_set()
        self.widgets = {}
        self._build()

    def _build(self):
        """Erstellt das Eingabeformular für Vorkommnisdaten."""
        frame = tk.Frame(self, padx=12, pady=10)
        frame.pack(fill="both", expand=True)

        fields = [
            ("Datum (YYYY-MM-DD) *", "datum", "entry"),
            ("Art der Störung", "art_stoerung", "entry"),
            ("Folgen / Konsequenzen", "folgen", "text"),                       # Patientengefährdung?
            ("Meldung an Behörde (Datum)", "meldung_behoerde", "entry"),       # BfArM / Landesbehörde
            ("Meldung an Hersteller (Datum)", "meldung_hersteller", "entry"),  # Hersteller-FSCA
            ("Korrektivmaßnahmen", "korrektivmassnahmen", "text"),
            ("Bemerkungen", "bemerkungen", "text"),
        ]

        for label, key, wtype in fields:
            row = tk.Frame(frame)
            row.pack(fill="x", pady=3)
            tk.Label(row, text=label, width=28, anchor="w").pack(side="left")
            if wtype == "entry":
                var = tk.StringVar()
                tk.Entry(row, textvariable=var, width=28).pack(side="left")
                self.widgets[key] = var
            elif wtype == "text":
                txt = tk.Text(row, height=2, width=28, wrap="word")
                txt.pack(side="left", fill="x", expand=True)
                self.widgets[key] = txt

        btn_frame = tk.Frame(self)
        btn_frame.pack(fill="x", padx=12, pady=8)
        # Orangefarbener Speichern-Button als visuelles Signal für Vorkommnisse
        tk.Button(btn_frame, text="Speichern", command=self.save,
                  bg="#e67e22", fg="white", relief="flat", padx=12).pack(side="left", padx=4)
        tk.Button(btn_frame, text="Abbrechen", command=self.destroy,
                  relief="flat", padx=12).pack(side="left")

    def save(self):
        """
        Validiert das Pflichtfeld 'Datum' und speichert das Vorkommnis
        in die Tabelle 'vorkommnisse'. Aktualisiert die Vorkommnisliste
        im Hauptfenster nach dem Speichern.
        """
        vals = {}
        for key, w in self.widgets.items():
            if isinstance(w, tk.StringVar):
                vals[key] = w.get().strip()
            elif isinstance(w, tk.Text):
                vals[key] = w.get("1.0", "end").strip()

        if not vals.get("datum"):
            messagebox.showerror("Fehler", "Datum ist ein Pflichtfeld.")
            return

        conn = get_conn()
        conn.execute("""
            INSERT INTO vorkommnisse
            (geraet_id, datum, art_stoerung, folgen,
             meldung_behoerde, meldung_hersteller, korrektivmassnahmen, bemerkungen)
            VALUES (?,?,?,?,?,?,?,?)
        """, (self.geraet_id, vals["datum"], vals.get("art_stoerung"),
              vals.get("folgen"), vals.get("meldung_behoerde"),
              vals.get("meldung_hersteller"), vals.get("korrektivmassnahmen"),
              vals.get("bemerkungen")))
        conn.commit()
        conn.close()
        self.parent._load_vorkommnisse(self.geraet_id)
        self.destroy()


# ─────────────────────────────────────────────
# Einstiegspunkt
# ─────────────────────────────────────────────

if __name__ == "__main__":
    # Datenbank initialisieren (Tabellen anlegen, falls noch nicht vorhanden)
    init_db()
    # Hauptfenster erstellen und die tkinter-Ereignisschleife starten.
    # mainloop() blockiert, bis das Fenster geschlossen wird.
    app = App()
    app.mainloop()

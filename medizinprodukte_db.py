"""
Medizinprodukte-Datenbank
Gemäß MPBetreibV 2025, MPDG und EU MDR 2017/745
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import sqlite3
import os
from datetime import datetime, date

DB_PATH = os.path.join(os.path.dirname(__file__), "medizinprodukte.db")


# ─────────────────────────────────────────────
# Datenbank
# ─────────────────────────────────────────────

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Bestandsverzeichnis (§14 MPBetreibV)
    c.execute("""
        CREATE TABLE IF NOT EXISTS geraete (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            -- Gerätekennzeichnung
            bezeichnung TEXT NOT NULL,
            art_typ TEXT,
            seriennummer TEXT,
            loscode TEXT,
            anschaffungsjahr TEXT,
            inbetriebnahmedatum TEXT,
            ausserdienst_datum TEXT,
            -- Hersteller
            hersteller_name TEXT,
            hersteller_anschrift TEXT,
            hersteller_kontakt TEXT,
            bevollmaechtigter TEXT,
            ce_jahr TEXT,
            konformitaetserklaerung TEXT,
            -- Klassifikation
            risikoklasse TEXT,
            udi_di TEXT,
            udi_pi TEXT,
            emdn_code TEXT,
            aktives_geraet INTEGER DEFAULT 0,
            implantierbar INTEGER DEFAULT 0,
            einmalprodukt INTEGER DEFAULT 0,
            steril INTEGER DEFAULT 0,
            zweckbestimmung TEXT,
            -- Betreiber / Standort
            betreiber TEXT,
            abteilung TEXT,
            standort_raum TEXT,
            inventarnummer TEXT,
            verantwortliche_person TEXT,
            -- IT-Sicherheit
            netzwerkanbindung INTEGER DEFAULT 0,
            softwareversion TEXT,
            -- Sonstiges
            bemerkungen TEXT,
            erstellt_am TEXT DEFAULT CURRENT_TIMESTAMP,
            geaendert_am TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Medizinproduktebuch: Einweisungen (§13 MPBetreibV)
    c.execute("""
        CREATE TABLE IF NOT EXISTS einweisungen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            geraet_id INTEGER NOT NULL,
            datum TEXT,
            eingewiesene_person TEXT,
            beauftragte_person TEXT,
            funktionspruefung INTEGER DEFAULT 0,
            bemerkungen TEXT,
            FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
        )
    """)

    # STK / MTK / Wartung (§§7, 12, 15 MPBetreibV)
    c.execute("""
        CREATE TABLE IF NOT EXISTS pruefungen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            geraet_id INTEGER NOT NULL,
            art TEXT,  -- STK, MTK, Wartung, IT-Sicherheit, Reparatur
            datum TEXT,
            naechste_faelligkeit TEXT,
            pruefer TEXT,
            ergebnis TEXT,  -- Bestanden, Bedingt, Nicht bestanden
            messwerte TEXT,
            messverfahren TEXT,
            maengel TEXT,
            korrektivmassnahmen TEXT,
            bemerkungen TEXT,
            FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
        )
    """)

    # Störungen / Vorkommnisse
    c.execute("""
        CREATE TABLE IF NOT EXISTS vorkommnisse (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            geraet_id INTEGER NOT NULL,
            datum TEXT,
            art_stoerung TEXT,
            folgen TEXT,
            meldung_behoerde TEXT,
            meldung_hersteller TEXT,
            korrektivmassnahmen TEXT,
            bemerkungen TEXT,
            FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()


def get_conn():
    return sqlite3.connect(DB_PATH)


# ─────────────────────────────────────────────
# Haupt-App
# ─────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Medizinprodukte-Datenbank (MPBetreibV 2025)")
        self.geometry("1200x750")
        self.resizable(True, True)
        self.configure(bg="#f0f0f0")
        self._build_ui()
        self.load_geraete()

    def _build_ui(self):
        # Toolbar
        toolbar = tk.Frame(self, bg="#007ba5", pady=6)
        toolbar.pack(fill="x")

        tk.Label(toolbar, text="Medizinprodukte-Datenbank", font=("Helvetica", 14, "bold"),
                 bg="#2c3e50", fg="white").pack(side="left", padx=12)

        for text, cmd in [
            ("+ Neues Gerät", self.neues_geraet),
            ("Bearbeiten", self.geraet_bearbeiten),
            ("Löschen", self.geraet_loeschen),
        ]:
            tk.Button(toolbar, text=text, command=cmd,
                      bg="#007ba5", fg="white", relief="flat",
                      padx=10, pady=4, cursor="hand2").pack(side="left", padx=4)

        # Suche
        tk.Label(toolbar, text="Suche:", bg="#2c3e50", fg="white").pack(side="right", padx=(0, 4))
        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", lambda *_: self.load_geraete())
        tk.Entry(toolbar, textvariable=self.search_var, width=22).pack(side="right", padx=(0, 12))

        # Hauptbereich: Liste links, Tabs rechts
        paned = tk.PanedWindow(self, orient="horizontal", sashwidth=6, bg="#ccc")
        paned.pack(fill="both", expand=True, padx=8, pady=8)

        # Geräteliste
        list_frame = tk.Frame(paned, bg="#f0f0f0")
        paned.add(list_frame, minsize=280)

        tk.Label(list_frame, text="Bestandsverzeichnis", font=("Helvetica", 10, "bold"),
                 bg="#f0f0f0").pack(anchor="w", padx=4, pady=(4, 0))

        cols = ("ID", "Bezeichnung", "Typ", "Klasse", "Standort")
        self.tree = ttk.Treeview(list_frame, columns=cols, show="headings", selectmode="browse")
        for col in cols:
            self.tree.heading(col, text=col)
        self.tree.column("ID", width=40, anchor="center")
        self.tree.column("Bezeichnung", width=160)
        self.tree.column("Typ", width=100)
        self.tree.column("Klasse", width=60, anchor="center")
        self.tree.column("Standort", width=100)

        vsb = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")
        self.tree.bind("<<TreeviewSelect>>", self.on_select)

        # Detail-Tabs
        self.detail_nb = ttk.Notebook(paned)
        paned.add(self.detail_nb, minsize=600)

        self.tab_detail = tk.Frame(self.detail_nb, bg="#f9f9f9")
        self.tab_pruef = tk.Frame(self.detail_nb, bg="#f9f9f9")
        self.tab_einw = tk.Frame(self.detail_nb, bg="#f9f9f9")
        self.tab_vork = tk.Frame(self.detail_nb, bg="#f9f9f9")

        self.detail_nb.add(self.tab_detail, text="Gerätedaten")
        self.detail_nb.add(self.tab_pruef, text="STK / MTK / Wartung")
        self.detail_nb.add(self.tab_einw, text="Einweisungen")
        self.detail_nb.add(self.tab_vork, text="Vorkommnisse")

        self._build_detail_tab()
        self._build_pruef_tab()
        self._build_einw_tab()
        self._build_vork_tab()

        # Statusbar
        self.status_var = tk.StringVar(value="Bereit")
        tk.Label(self, textvariable=self.status_var, bd=1, relief="sunken",
                 anchor="w", bg="#ecf0f1").pack(fill="x", side="bottom")

    # ── Detail-Tab ──────────────────────────────

    def _build_detail_tab(self):
        canvas = tk.Canvas(self.tab_detail, bg="#f9f9f9", highlightthickness=0)
        sb = ttk.Scrollbar(self.tab_detail, orient="vertical", command=canvas.yview)
        self.detail_frame = tk.Frame(canvas, bg="#f9f9f9")
        self.detail_frame.bind("<Configure>", lambda e: canvas.configure(
            scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=self.detail_frame, anchor="nw")
        canvas.configure(yscrollcommand=sb.set)
        canvas.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        self.detail_labels = {}

    def _show_detail(self, row):
        for w in self.detail_frame.winfo_children():
            w.destroy()
        self.detail_labels = {}

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
        data = dict(zip(keys, row))

        for section, fields in sections.items():
            lbl = tk.Label(self.detail_frame, text=section,
                           font=("Helvetica", 10, "bold"), bg="#dce6f0",
                           anchor="w", padx=6, pady=3)
            lbl.pack(fill="x", pady=(8, 2), padx=4)
            for label, key in fields:
                row_frame = tk.Frame(self.detail_frame, bg="#f9f9f9")
                row_frame.pack(fill="x", padx=10, pady=1)
                tk.Label(row_frame, text=f"{label}:", width=22, anchor="w",
                         bg="#f9f9f9", fg="#555").pack(side="left")
                val = data.get(key, "")
                if val in (0, 1):
                    val = "Ja" if val else "Nein"
                val_lbl = tk.Label(row_frame, text=str(val or "–"),
                                   anchor="w", bg="#f9f9f9", wraplength=380)
                val_lbl.pack(side="left", fill="x", expand=True)

        tk.Label(self.detail_frame,
                 text=f"Erstellt: {data.get('erstellt_am','')}   |   Geändert: {data.get('geaendert_am','')}",
                 font=("Helvetica", 8), bg="#f9f9f9", fg="#aaa").pack(pady=6)

    # ── Prüfungen-Tab ───────────────────────────

    def _build_pruef_tab(self):
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

        # Überfälligkeit farblich markieren
        self.pruef_tree.tag_configure("overdue", background="#ffe0e0")
        self.pruef_tree.tag_configure("ok", background="#e8f8e8")

    def _build_einw_tab(self):
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
        self.tree.delete(*self.tree.get_children())
        search = self.search_var.get().strip()
        conn = get_conn()
        c = conn.cursor()
        if search:
            c.execute("""
                SELECT id, bezeichnung, art_typ, risikoklasse, standort_raum
                FROM geraete
                WHERE bezeichnung LIKE ? OR art_typ LIKE ? OR seriennummer LIKE ?
                      OR inventarnummer LIKE ? OR abteilung LIKE ?
                ORDER BY bezeichnung
            """, tuple(f"%{search}%" for _ in range(5)))
        else:
            c.execute("""
                SELECT id, bezeichnung, art_typ, risikoklasse, standort_raum
                FROM geraete ORDER BY bezeichnung
            """)
        for row in c.fetchall():
            self.tree.insert("", "end", values=row)
        conn.close()
        self.status_var.set(f"{len(self.tree.get_children())} Gerät(e) geladen")

    def _selected_id(self):
        sel = self.tree.selection()
        if not sel:
            return None
        return self.tree.item(sel[0])["values"][0]

    def on_select(self, _=None):
        gid = self._selected_id()
        if gid is None:
            return
        conn = get_conn()
        c = conn.cursor()
        c.execute("SELECT * FROM geraete WHERE id=?", (gid,))
        row = c.fetchone()
        conn.close()
        if row:
            self._show_detail(row)
        self._load_pruefungen(gid)
        self._load_einweisungen(gid)
        self._load_vorkommnisse(gid)

    def _load_pruefungen(self, gid):
        self.pruef_tree.delete(*self.pruef_tree.get_children())
        conn = get_conn()
        c = conn.cursor()
        c.execute("""
            SELECT id, art, datum, naechste_faelligkeit, pruefer, ergebnis
            FROM pruefungen WHERE geraet_id=? ORDER BY datum DESC
        """, (gid,))
        today = date.today().isoformat()
        for row in c.fetchall():
            fael = row[3] or ""
            tag = "overdue" if fael and fael < today else "ok"
            self.pruef_tree.insert("", "end", values=row, tags=(tag,))
        conn.close()

    def _load_einweisungen(self, gid):
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
        GeraetDialog(self, title="Neues Gerät erfassen")

    def geraet_bearbeiten(self):
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
            for w in self.detail_frame.winfo_children():
                w.destroy()

    # ── CRUD Prüfungen ──────────────────────────

    def pruefung_hinzufuegen(self):
        gid = self._selected_id()
        if gid is None:
            messagebox.showinfo("Hinweis", "Bitte zuerst ein Gerät auswählen.")
            return
        PruefungDialog(self, gid)

    def pruefung_loeschen(self):
        sel = self.pruef_tree.selection()
        if not sel:
            return
        pid = self.pruef_tree.item(sel[0])["values"][0]
        if messagebox.askyesno("Löschen", "Prüfeintrag löschen?"):
            conn = get_conn()
            conn.execute("DELETE FROM pruefungen WHERE id=?", (pid,))
            conn.commit()
            conn.close()
            self._load_pruefungen(self._selected_id())

    # ── CRUD Einweisungen ────────────────────────

    def einweisung_hinzufuegen(self):
        gid = self._selected_id()
        if gid is None:
            messagebox.showinfo("Hinweis", "Bitte zuerst ein Gerät auswählen.")
            return
        EinweisungDialog(self, gid)

    def einweisung_loeschen(self):
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
        gid = self._selected_id()
        if gid is None:
            messagebox.showinfo("Hinweis", "Bitte zuerst ein Gerät auswählen.")
            return
        VorkommnisDialog(self, gid)

    def vorkommnis_loeschen(self):
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
        super().__init__(parent)
        self.parent = parent
        self.data = data
        self.title(title)
        self.geometry("600x700")
        self.resizable(True, True)
        self.grab_set()
        self.widgets = {}
        self._build()
        if data:
            self._populate(data)

    def _build(self):
        # Scrollable form
        canvas = tk.Canvas(self, highlightthickness=0)
        sb = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        form = tk.Frame(canvas, padx=12, pady=8)
        form.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=form, anchor="nw")
        canvas.configure(yscrollcommand=sb.set)
        canvas.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        # Mousewheel scrolling
        canvas.bind_all("<MouseWheel>", lambda e: canvas.yview_scroll(-1 * (e.delta // 120), "units"))

        for label, key, wtype, opts in self.FIELDS:
            if wtype == "separator":
                tk.Label(form, text=label, font=("Helvetica", 9, "bold"),
                         bg="#dce6f0", anchor="w", padx=4).pack(fill="x", pady=(10, 2))
                continue

            row = tk.Frame(form)
            row.pack(fill="x", pady=2)
            tk.Label(row, text=label, width=30, anchor="w").pack(side="left")

            if wtype == "entry":
                var = tk.StringVar()
                tk.Entry(row, textvariable=var, width=30).pack(side="left", fill="x", expand=True)
                self.widgets[key] = var
            elif wtype == "combo":
                var = tk.StringVar()
                ttk.Combobox(row, textvariable=var, values=opts, width=28,
                             state="readonly").pack(side="left")
                self.widgets[key] = var
            elif wtype == "check":
                var = tk.BooleanVar()
                tk.Checkbutton(row, variable=var).pack(side="left")
                self.widgets[key] = var
            elif wtype == "text":
                txt = tk.Text(row, height=3, width=30, wrap="word")
                txt.pack(side="left", fill="x", expand=True)
                self.widgets[key] = txt

        # Buttons
        btn_frame = tk.Frame(self)
        btn_frame.pack(fill="x", padx=12, pady=8)
        tk.Button(btn_frame, text="Speichern", command=self.save,
                  bg="#27ae60", fg="white", relief="flat", padx=12).pack(side="left", padx=4)
        tk.Button(btn_frame, text="Abbrechen", command=self.destroy,
                  relief="flat", padx=12).pack(side="left")

    def _populate(self, row):
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
                widget.set(bool(val))
            elif isinstance(widget, tk.StringVar):
                widget.set(str(val or ""))
            elif isinstance(widget, tk.Text):
                widget.delete("1.0", "end")
                widget.insert("1.0", str(val or ""))

    def save(self):
        vals = {}
        for key, widget in self.widgets.items():
            if isinstance(widget, tk.BooleanVar):
                vals[key] = 1 if widget.get() else 0
            elif isinstance(widget, tk.StringVar):
                vals[key] = widget.get().strip()
            elif isinstance(widget, tk.Text):
                vals[key] = widget.get("1.0", "end").strip()

        if not vals.get("bezeichnung"):
            messagebox.showerror("Fehler", "Bezeichnung ist ein Pflichtfeld.")
            return

        now = datetime.now().isoformat(sep=" ", timespec="seconds")
        conn = get_conn()
        if self.data:
            gid = self.data[0]
            cols = ", ".join(f"{k}=?" for k in vals)
            conn.execute(
                f"UPDATE geraete SET {cols}, geaendert_am=? WHERE id=?",
                [*vals.values(), now, gid]
            )
        else:
            cols = ", ".join(vals.keys())
            placeholders = ", ".join("?" for _ in vals)
            conn.execute(
                f"INSERT INTO geraete ({cols}, erstellt_am, geaendert_am) VALUES ({placeholders}, ?, ?)",
                [*vals.values(), now, now]
            )
        conn.commit()
        conn.close()
        self.parent.load_geraete()
        self.destroy()


# ─────────────────────────────────────────────
# Dialog: Prüfung
# ─────────────────────────────────────────────

class PruefungDialog(tk.Toplevel):
    def __init__(self, parent, geraet_id, data=None):
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
            ("Messverfahren / Norm", "messverfahren", "entry", None),
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
        self.parent._load_pruefungen(self.geraet_id)
        self.destroy()


# ─────────────────────────────────────────────
# Dialog: Einweisung
# ─────────────────────────────────────────────

class EinweisungDialog(tk.Toplevel):
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
        frame = tk.Frame(self, padx=12, pady=10)
        frame.pack(fill="both", expand=True)

        fields = [
            ("Datum (YYYY-MM-DD) *", "datum", "entry"),
            ("Eingewiesene Person", "eingewiesene_person", "entry"),
            ("Beauftragte Person", "beauftragte_person", "entry"),
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
              1 if self.fp_var.get() else 0, vals.get("bemerkungen")))
        conn.commit()
        conn.close()
        self.parent._load_einweisungen(self.geraet_id)
        self.destroy()


# ─────────────────────────────────────────────
# Dialog: Vorkommnis
# ─────────────────────────────────────────────

class VorkommnisDialog(tk.Toplevel):
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
        frame = tk.Frame(self, padx=12, pady=10)
        frame.pack(fill="both", expand=True)

        fields = [
            ("Datum (YYYY-MM-DD) *", "datum", "entry"),
            ("Art der Störung", "art_stoerung", "entry"),
            ("Folgen / Konsequenzen", "folgen", "text"),
            ("Meldung an Behörde (Datum)", "meldung_behoerde", "entry"),
            ("Meldung an Hersteller (Datum)", "meldung_hersteller", "entry"),
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
        tk.Button(btn_frame, text="Speichern", command=self.save,
                  bg="#e67e22", fg="white", relief="flat", padx=12).pack(side="left", padx=4)
        tk.Button(btn_frame, text="Abbrechen", command=self.destroy,
                  relief="flat", padx=12).pack(side="left")

    def save(self):
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
    init_db()
    app = App()
    app.mainloop()

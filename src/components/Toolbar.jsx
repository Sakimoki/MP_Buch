import { useState } from 'react'
import { deleteGeraet, getBestandsliste } from '../api/api.js'
import { useApp } from '../App.jsx'
import GeraetDialog          from './dialogs/GeraetDialog.jsx'
import HerstellerDialog      from './dialogs/HerstellerDialog.jsx'
import BetreiberDialog       from './dialogs/BetreiberDialog.jsx'
import VorkommnisseOverview      from './VorkommnisseOverview.jsx'
import WartungsuebersichtDialog  from './WartungsuebersichtDialog.jsx'

export default function Toolbar() {
  const { selectedGeraetId, setSelectedGeraetId, searchQuery, setSearchQuery, loadGeraete, setStatus } = useApp()
  const [dialog, setDialog] = useState(null)

  const handleDelete = async () => {
    if (!selectedGeraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return }
    if (!confirm('Gerät und alle zugehörigen Einträge (Prüfungen, Einweisungen, Übergaben, Vorkommnisse) wirklich löschen?')) return
    try {
      await deleteGeraet(selectedGeraetId)
      setSelectedGeraetId(null)
      loadGeraete()
    } catch (e) { alert(e.message) }
  }

  const handleGeraetSaved = () => {
    setDialog(null)
    loadGeraete()
  }

  const openBestandsliste = async () => {
    try {
      const data = await getBestandsliste()
      const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const rows = data.map(g => `
        <tr>
          <td>${esc(g.id)}</td><td><strong>${esc(g.bezeichnung)}</strong></td>
          <td>${esc(g.art_typ)}</td><td>${esc(g.seriennummer)}</td>
          <td>${esc(g.risikoklasse)}</td><td>${esc(g.hersteller_name)}</td>
          <td>${esc(g.betreiber)}</td><td>${esc(g.inventarnummer)}</td>
          <td>${esc(g.inbetriebnahmedatum)}</td>
        </tr>`).join('')
      const win = window.open('', '_blank', 'width=1200,height=800')
      win.document.write(`<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><title>Bestandsliste Medizinprodukte</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #231f20; background: #fff; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #007ba5; }
  .header-left h1 { font-size: 18pt; font-weight: bold; }
  .header-left p { font-size: 10pt; color: #555; margin-top: 4px; }
  .org { font-size: 13pt; font-weight: bold; color: #007ba5; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 12px; }
  thead th { background: #007ba5; color: #fff; padding: 6px 8px; text-align: left; font-weight: bold; }
  tbody tr:nth-child(even) td { background: #F2F2F2; }
  tbody tr:nth-child(odd)  td { background: #fff; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
  .footer { margin-top: 16px; font-size: 9pt; color: #888; display: flex; justify-content: space-between; }
  .count { font-weight: bold; color: #007ba5; }
  @media print { body { padding: 0; } button { display: none !important; } @page { margin: 1.5cm; size: A4 landscape; } }
</style></head>
<body>
<div class="header">
  <div class="header-left">
    <div class="org">Cooperative Mensch eG</div>
    <h1>Bestandsliste Medizinprodukte</h1>
    <p>Gemäß §13 MPBetreibV 2025 &nbsp;|&nbsp; Stand: ${datum}</p>
  </div>
  <div><button onclick="window.print()" style="background:#007ba5;color:#fff;border:none;padding:8px 20px;cursor:pointer;font-size:11pt;font-family:Calibri,Arial,sans-serif">Drucken / Als PDF speichern</button></div>
</div>
<table>
  <thead><tr>
    <th style="width:36px">ID</th><th>Bezeichnung</th><th style="width:100px">Art / Typ</th>
    <th style="width:110px">Seriennummer</th><th style="width:60px">Klasse</th>
    <th>Hersteller</th><th>Betreiber</th><th style="width:100px">Inventar-Nr.</th>
    <th style="width:95px">Inbetriebnahme</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <span class="count">${data.length} Gerät(e) gesamt</span>
  <span>Erstellt: ${datum} &nbsp;|&nbsp; Medizinprodukte-Datenbank MPBetreibV 2025</span>
</div>
</body></html>`)
      win.document.close()
    } catch (e) { setStatus('Fehler beim Laden der Bestandsliste: ' + e.message) }
  }

  return (
    <>
      <span id="app-title">Medizinprodukte-Datenbank</span>
      <button className="tbtn add" onClick={() => setDialog('geraet-new')}>+ Neues Gerät</button>
      <button className="tbtn" onClick={() => { if (!selectedGeraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return } setDialog('geraet-edit') }}>
        Bearbeiten
      </button>
      <button className="tbtn del" onClick={handleDelete}>Löschen</button>
      <span className="tbtn-sep" />
      <button className="tbtn" title="Hersteller-Stammdaten" onClick={() => setDialog('hersteller')}>🏭 Hersteller</button>
      <button className="tbtn" title="Betreiber-Stammdaten"  onClick={() => setDialog('betreiber')}>🏥 Betreiber</button>
      <button className="tbtn" title="Druckbare Bestandsliste" onClick={openBestandsliste}>📋 Bestandsliste</button>
      <button className="tbtn" title="Vorkommnisse – Übersicht" onClick={() => setDialog('vorkommnisse')}>⚠️ Vorkommnisse</button>
      <button className="tbtn" title="Wartungsübersicht – Anstehende Prüfungen" onClick={() => setDialog('wartung')}>📅 Wartungen</button>
      <div id="search-wrap">
        <label htmlFor="search-input">Suche:</label>
        <input
          id="search-input"
          type="text"
          placeholder="Bezeichnung, Typ, SN …"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {dialog === 'geraet-new' && (
        <GeraetDialog mode="new" onClose={() => setDialog(null)} onSaved={handleGeraetSaved} />
      )}
      {dialog === 'geraet-edit' && (
        <GeraetDialog mode="edit" onClose={() => setDialog(null)} onSaved={handleGeraetSaved} />
      )}
      {dialog === 'hersteller'    && <HerstellerDialog     onClose={() => setDialog(null)} />}
      {dialog === 'betreiber'     && <BetreiberDialog      onClose={() => setDialog(null)} />}
      {dialog === 'vorkommnisse'  && <VorkommnisseOverview     onClose={() => setDialog(null)} />}
      {dialog === 'wartung'       && <WartungsuebersichtDialog onClose={() => setDialog(null)} />}
    </>
  )
}

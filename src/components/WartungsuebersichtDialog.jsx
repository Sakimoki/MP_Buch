import { useRef, useEffect, useState } from 'react'
import { getWartungenFaellig } from '../api/api.js'
import { useApp } from '../App.jsx'

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function addMonths(isoDate, months) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + months, d))
  return dt.toISOString().slice(0, 10)
}

function nextDay(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

function foldIcsLine(line) {
  if (line.length <= 75) return line
  const chunks = []
  chunks.push(line.slice(0, 75))
  let pos = 75
  while (pos < line.length) {
    chunks.push(' ' + line.slice(pos, pos + 74))
    pos += 74
  }
  return chunks.join('\r\n')
}

function escIcs(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export default function WartungsuebersichtDialog({ onClose }) {
  const ref = useRef()
  const { setStatus } = useApp()
  const today = isoToday()
  const [von, setVon]       = useState(today)
  const [bis, setBis]       = useState(addMonths(today, 6))
  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { ref.current?.showModal(); load(today, addMonths(today, 6)) }, [])

  const load = async (v, b) => {
    setLoading(true)
    try { setList(await getWartungenFaellig(v, b)) }
    catch (e) { setStatus('Fehler: ' + e.message) }
    finally { setLoading(false) }
  }

  const exportICS = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MPBuch//Wartungsübersicht//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ]
    list.forEach(w => {
      const dtStart = w.naechste_faelligkeit.replace(/-/g, '')
      const dtEnd   = nextDay(w.naechste_faelligkeit).replace(/-/g, '')
      const summary = `${escIcs(w.art)} fällig – ${escIcs(w.bezeichnung)}${w.art_typ ? ` (${escIcs(w.art_typ)})` : ''}`
      const descParts = [
        w.inventarnummer  ? `Inventar-Nr.: ${w.inventarnummer}`     : null,
        w.letzte_pruefung ? `Letzte Prüfung: ${w.letzte_pruefung}`  : null,
        w.pruefer         ? `Prüfer: ${w.pruefer}`                  : null,
        w.firma           ? `Firma: ${w.firma}`                     : null,
        w.betreiber       ? `Betreiber: ${w.betreiber}`             : null,
      ].filter(Boolean).join('\\n')
      lines.push(
        'BEGIN:VEVENT',
        foldIcsLine(`UID:wartung-${w.art}-${w.geraet_id}-${dtStart}@mpbuch`),
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        foldIcsLine(`SUMMARY:${summary}`),
        descParts ? foldIcsLine(`DESCRIPTION:${descParts}`) : null,
        'END:VEVENT',
      )
    })
    lines.push('END:VCALENDAR')
    const content = lines.filter(l => l != null).join('\r\n')
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `wartungen_${von}_bis_${bis}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const datum   = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const vonFmt  = new Date(von + 'T00:00:00').toLocaleDateString('de-DE')
    const bisFmt  = new Date(bis + 'T00:00:00').toLocaleDateString('de-DE')
    const esc     = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const rows    = list.map(w => {
      const faellig  = new Date(w.naechste_faelligkeit + 'T00:00:00')
      const overdue  = faellig < new Date(today + 'T00:00:00')
      const rowStyle = overdue ? 'background:#f8d7da' : ''
      const tdStyle  = overdue ? 'color:#842029;font-weight:bold' : ''
      return `<tr style="${rowStyle}">
        <td style="${tdStyle}">${esc(w.naechste_faelligkeit)}</td>
        <td><strong>${esc(w.bezeichnung)}</strong></td>
        <td>${esc(w.art_typ)}</td>
        <td>${esc(w.inventarnummer)}</td>
        <td><strong>${esc(w.art)}</strong></td>
        <td>${esc(w.letzte_pruefung)}</td>
        <td>${esc([w.pruefer, w.firma].filter(Boolean).join(' / '))}</td>
        <td>${esc(w.betreiber)}</td>
      </tr>`
    }).join('')
    const win = window.open('', '_blank', 'width=1200,height=800')
    win.document.write(`<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><title>Wartungsübersicht</title>
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
  tbody td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
  .footer { margin-top: 16px; font-size: 9pt; color: #888; display: flex; justify-content: space-between; }
  .count { font-weight: bold; color: #007ba5; }
  @media print { body { padding: 0; } .no-print { display: none !important; } @page { margin: 1.5cm; size: A4 landscape; } }
</style></head>
<body>
<div class="header">
  <div class="header-left">
    <div class="org">Cooperative Mensch eG</div>
    <h1>Wartungsübersicht – Anstehende Prüfungen</h1>
    <p>Zeitraum: ${vonFmt} – ${bisFmt} &nbsp;|&nbsp; Stand: ${datum}</p>
  </div>
  <div class="no-print">
    <button onclick="window.print()" style="background:#007ba5;color:#fff;border:none;padding:8px 20px;cursor:pointer;font-size:11pt;font-family:Calibri,Arial,sans-serif">Drucken / Als PDF speichern</button>
  </div>
</div>
<table>
  <thead><tr>
    <th style="width:90px">Fälligkeit</th><th>Gerät</th><th style="width:90px">Art/Typ</th>
    <th style="width:100px">Inventar-Nr.</th><th style="width:85px">Prüfungsart</th>
    <th style="width:95px">Letzte Prüfung</th><th>Prüfer / Firma</th><th>Betreiber</th>
  </tr></thead>
  <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#bbb;padding:16px">Keine fälligen Wartungen im gewählten Zeitraum.</td></tr>'}</tbody>
</table>
<div class="footer">
  <span class="count">${list.length} Wartung(en) im Zeitraum</span>
  <span>Erstellt: ${datum} &nbsp;|&nbsp; Medizinprodukte-Datenbank MPBetreibV 2025</span>
</div>
</body></html>`)
    win.document.close()
  }

  const heute = new Date(today + 'T00:00:00')

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 1060 }}>
      <div className="dlg-hd">📅 Wartungsübersicht – Anstehende Prüfungen</div>
      <div className="dlg-body" style={{ padding: 0 }}>

        <div style={{ padding: '10px 12px', borderBottom: '1px solid #ddd', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13 }}>Zeitraum von</label>
          <input type="date" value={von} onChange={e => setVon(e.target.value)}
            style={{ fontSize: 13, padding: '3px 6px' }} />
          <label style={{ fontSize: 13 }}>bis</label>
          <input type="date" value={bis} onChange={e => setBis(e.target.value)}
            style={{ fontSize: 13, padding: '3px 6px' }} />
          <button onClick={() => load(von, bis)}
            style={{ background: 'var(--c-sec,#007ba5)', color: '#fff', border: 'none', padding: '4px 14px', cursor: 'pointer', borderRadius: 3, fontSize: 13 }}>
            Anzeigen
          </button>
          <span style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>
            {loading ? 'Lade …' : `${list.length} Wartung(en)`}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={exportICS} disabled={list.length === 0}
              style={{ background: '#5a6895', color: '#fff', border: 'none', padding: '4px 12px', cursor: list.length === 0 ? 'default' : 'pointer', borderRadius: 3, fontSize: 13, opacity: list.length === 0 ? 0.5 : 1 }}>
              📅 iCalendar (.ics)
            </button>
            <button onClick={exportPDF}
              style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '4px 12px', cursor: 'pointer', borderRadius: 3, fontSize: 13 }}>
              🖨️ Drucken / PDF
            </button>
          </div>
        </div>

        <div style={{ overflow: 'auto', maxHeight: '62vh' }}>
          <table className="dt" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Fälligkeit</th>
                <th>Gerät</th>
                <th style={{ width: 90 }}>Art / Typ</th>
                <th style={{ width: 110 }}>Inventar-Nr.</th>
                <th style={{ width: 95 }}>Prüfungsart</th>
                <th style={{ width: 100 }}>Letzte Prüfung</th>
                <th>Prüfer / Firma</th>
                <th>Betreiber</th>
              </tr>
            </thead>
            <tbody>
              {!loading && list.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#bbb', padding: 16 }}>
                  Keine anstehenden Wartungen im gewählten Zeitraum.
                </td></tr>
              )}
              {list.map((w) => {
                const faellig = new Date(w.naechste_faelligkeit + 'T00:00:00')
                const overdue = faellig < heute
                return (
                  <tr key={`${w.art}-${w.geraet_id}`}
                    style={overdue ? { background: '#f8d7da' } : {}}>
                    <td style={{ fontWeight: 600, color: overdue ? '#842029' : 'inherit' }}>
                      {w.naechste_faelligkeit}
                    </td>
                    <td><strong>{w.bezeichnung}</strong></td>
                    <td>{w.art_typ}</td>
                    <td>{w.inventarnummer}</td>
                    <td><strong>{w.art}</strong></td>
                    <td>{w.letzte_pruefung}</td>
                    <td>{[w.pruefer, w.firma].filter(Boolean).join(' / ')}</td>
                    <td>{w.betreiber}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="dlg-ft">
        <button className="cancel" onClick={onClose}>Schließen</button>
      </div>
    </dialog>
  )
}

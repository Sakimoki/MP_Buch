import { useRef, useEffect, useState } from 'react'
import { getAllVorkommnisseGlobal, deleteVorkommnis } from '../api/api.js'
import { useApp } from '../App.jsx'
import VorkommnisDialog from './dialogs/VorkommnisDialog.jsx'

const typBadge = (typ) => (
  <span style={{
    fontSize: 11, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
    background: typ === 'Störungsmeldung' ? '#fff3cd' : '#f8d7da',
    color:      typ === 'Störungsmeldung' ? '#856404' : '#842029',
    border:     `1px solid ${typ === 'Störungsmeldung' ? '#ffc107' : '#f5c2c7'}`
  }}>{typ}</span>
)

export default function VorkommnisseOverview({ onClose }) {
  const ref = useRef()
  const { setStatus } = useApp()
  const [list, setList]           = useState([])
  const [selectedRow, setSelectedRow] = useState(null)
  const [dialogRow, setDialogRow] = useState(null)

  useEffect(() => { ref.current?.showModal(); load() }, [])

  const load = () =>
    getAllVorkommnisseGlobal().then(setList).catch(e => setStatus('Fehler: ' + e.message))

  const handleDelete = async () => {
    if (!selectedRow) { alert('Bitte zuerst einen Eintrag auswählen.'); return }
    if (selectedRow.typ === 'Störungsmeldung') {
      alert('Störungsmeldungen können nur im Gerät unter dem Tab „Störungsmeldungen" gelöscht werden.')
      return
    }
    if (!confirm('Vorkommnis wirklich löschen?')) return
    try {
      await deleteVorkommnis(selectedRow.id)
      setSelectedRow(null)
      load()
      setStatus('Vorkommnis gelöscht.')
    } catch (e) { alert(e.message) }
  }

  const rowKey = (r) => `${r.typ}-${r.id}`

  const counts = list.reduce((a, r) => { a[r.typ] = (a[r.typ] || 0) + 1; return a }, {})

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 1020 }}>
      <div className="dlg-hd">⚠️ Vorkommnisse – Gesamtübersicht (§3 MPDG / Art. 87 MDR)</div>
      <div className="dlg-body" style={{ padding: 0 }}>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid #ddd', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ background: 'var(--c-del)', color: '#fff', border: 'none', padding: '4px 12px', cursor: 'pointer', borderRadius: 3 }}
            onClick={handleDelete}>Löschen</button>
          <span style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>
            Zeile anklicken zum Bearbeiten
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
            {counts['Vorkommnis'] || 0} Vorkommnis(se) &nbsp;·&nbsp; {counts['Störungsmeldung'] || 0} Störungsmeldung(en)
          </span>
        </div>

        <div style={{ overflow: 'auto', maxHeight: '65vh' }}>
          <table className="dt" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 95 }}>Datum</th>
                <th style={{ width: 145 }}>Typ</th>
                <th>Gerät</th>
                <th>Art der Störung / Beschreibung</th>
                <th style={{ width: 115 }}>Meldung Behörde</th>
                <th style={{ width: 115 }}>Meldung Hersteller</th>
                <th>Bemerkungen</th>
                <th style={{ width: 72, textAlign: 'center' }}>Erledigt</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#bbb', padding: 16 }}>
                  Keine Vorkommnisse oder Störungsmeldungen vorhanden.
                </td></tr>
              )}
              {list.map((r) => {
                const key = rowKey(r)
                const isSelected = selectedRow && rowKey(selectedRow) === key
                const rowStyle = r.erledigt
                  ? { background: '#d4edda', cursor: 'pointer' }
                  : { cursor: 'pointer' }
                return (
                  <tr key={key}
                    className={isSelected ? 'sel' : ''}
                    style={rowStyle}
                    onClick={() => { setSelectedRow(r); setDialogRow(r) }}>
                    <td>{r.datum}</td>
                    <td>{typBadge(r.typ)}</td>
                    <td>
                      {r.geraet_bezeichnung
                        ? <>{r.geraet_bezeichnung}{r.inventarnummer
                            ? <span style={{ color: '#888', fontSize: 11 }}> ({r.inventarnummer})</span>
                            : null}</>
                        : <span style={{ color: '#bbb' }}>–</span>}
                    </td>
                    <td>{r.art_stoerung}</td>
                    <td>{r.meldung_behoerde || '—'}</td>
                    <td>{r.meldung_hersteller || '—'}</td>
                    <td>{r.bemerkungen}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.erledigt ? '✓' : ''}
                    </td>
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

      {dialogRow && (
        <VorkommnisDialog
          row={dialogRow}
          onClose={() => setDialogRow(null)}
          onSaved={() => { setDialogRow(null); setSelectedRow(null); load(); setStatus('Gespeichert.') }}
        />
      )}
    </dialog>
  )
}

import { useState, useEffect } from 'react'
import { getPruefungen, deletePruefung } from '../../api/api.js'
import { useApp } from '../../App.jsx'
import PruefungDialog from '../dialogs/PruefungDialog.jsx'

const TODAY = new Date().toISOString().substring(0, 10)

export default function PruefungenTab({ geraetId }) {
  const { setStatus } = useApp()
  const [data, setData]             = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showDialog, setShowDialog] = useState(false)

  const load = () => {
    if (!geraetId) return
    getPruefungen(geraetId).then(setData).catch(e => setStatus('Fehler: ' + e.message))
  }

  useEffect(() => {
    setSelectedId(null)
    load()
  }, [geraetId])

  const handleDelete = async () => {
    if (!selectedId) { alert('Bitte zuerst einen Prüfeintrag auswählen.'); return }
    if (!confirm('Prüfeintrag löschen?')) return
    try {
      await deletePruefung(selectedId)
      setSelectedId(null)
      load()
    } catch (e) { alert(e.message) }
  }

  const rowClass = (p) => {
    const f = p.naechste_faelligkeit || ''
    if (selectedId === p.id) return f && f < TODAY ? 'overdue sel' : 'sel'
    if (f && f < TODAY) return 'overdue'
    if (f) return 'ok-row'
    return ''
  }

  return (
    <>
      <div className="sub-toolbar">
        <button className="add" onClick={() => { if (!geraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return } setShowDialog(true) }}>
          + Prüfung hinzufügen
        </button>
        <button className="del" onClick={handleDelete}>Löschen</button>
      </div>
      <div className="table-scroll">
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 36 }}>ID</th>
              <th style={{ width: 120 }}>Art</th>
              <th style={{ width: 95 }}>Datum</th>
              <th style={{ width: 115 }}>Nächste Fälligkeit</th>
              <th>Prüfer</th>
              <th style={{ width: 130 }}>Ergebnis</th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id} className={rowClass(p)} onClick={() => setSelectedId(p.id)}>
                <td>{p.id}</td>
                <td>{p.art}</td>
                <td>{p.datum}</td>
                <td>{p.naechste_faelligkeit}</td>
                <td>{p.pruefer}</td>
                <td>{p.ergebnis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showDialog && (
        <PruefungDialog
          geraetId={geraetId}
          onClose={() => setShowDialog(false)}
          onSaved={() => { setShowDialog(false); load() }}
        />
      )}
    </>
  )
}

import { useState, useEffect } from 'react'
import { getStoerungsmeldungen, deleteStoerungsmeldung } from '../../api/api.js'
import { useApp } from '../../App.jsx'
import StorungsmeldungDialog from '../dialogs/StoerungsmeldungDialog.jsx'

export default function StorungsmeldungenTab({ geraetId }) {
  const { setStatus } = useApp()
  const [data, setData]             = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showDialog, setShowDialog] = useState(false)

  const load = () => {
    if (!geraetId) return
    getStoerungsmeldungen(geraetId).then(setData).catch(e => setStatus('Fehler: ' + e.message))
  }

  useEffect(() => {
    setSelectedId(null)
    load()
  }, [geraetId])

  const handleDelete = async () => {
    if (!selectedId) { alert('Bitte zuerst einen Eintrag auswählen.'); return }
    if (!confirm('Störungsmeldung löschen?')) return
    try {
      await deleteStoerungsmeldung(selectedId)
      setSelectedId(null)
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <>
      <div className="sub-toolbar">
        <button className="add" onClick={() => { if (!geraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return } setShowDialog(true) }}>
          + Störung melden
        </button>
        <button className="del" onClick={handleDelete}>Löschen</button>
      </div>
      <div className="table-scroll">
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 36 }}>ID</th>
              <th style={{ width: 95 }}>Datum</th>
              <th>Art der Störung</th>
              <th>Bemerkungen</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => (
              <tr key={s.id} className={selectedId === s.id ? 'sel' : ''} onClick={() => setSelectedId(s.id)}>
                <td>{s.id}</td>
                <td>{s.datum}</td>
                <td>{s.art_stoerung}</td>
                <td>{s.bemerkungen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showDialog && (
        <StorungsmeldungDialog
          geraetId={geraetId}
          onClose={() => setShowDialog(false)}
          onSaved={() => { setShowDialog(false); load(); setStatus('Störungsmeldung gespeichert.') }}
        />
      )}
    </>
  )
}

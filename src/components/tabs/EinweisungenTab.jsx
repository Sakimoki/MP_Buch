import { useState, useEffect } from 'react'
import { getEinweisungen, deleteEinweisung } from '../../api/api.js'
import { useApp } from '../../App.jsx'
import EinweisungDialog from '../dialogs/EinweisungDialog.jsx'

export default function EinweisungenTab({ geraetId }) {
  const { setStatus } = useApp()
  const [data, setData]           = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showDialog, setShowDialog] = useState(false)

  const load = () => {
    if (!geraetId) return
    getEinweisungen(geraetId).then(setData).catch(e => setStatus('Fehler: ' + e.message))
  }

  useEffect(() => {
    setSelectedId(null)
    load()
  }, [geraetId])

  const handleDelete = async () => {
    if (!selectedId) { alert('Bitte zuerst einen Einweisungseintrag auswählen.'); return }
    if (!confirm('Einweisungseintrag löschen?')) return
    try {
      await deleteEinweisung(selectedId)
      setSelectedId(null)
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <>
      <div className="sub-toolbar">
        <button className="add" onClick={() => { if (!geraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return } setShowDialog(true) }}>
          + Einweisung hinzufügen
        </button>
        <button className="del" onClick={handleDelete}>Löschen</button>
      </div>
      <div className="table-scroll">
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 36 }}>ID</th>
              <th style={{ width: 95 }}>Datum</th>
              <th>Eingewiesene Person</th>
              <th>Beauftragte Person</th>
              <th style={{ width: 110 }}>Funktionsprüfung</th>
            </tr>
          </thead>
          <tbody>
            {data.map(e => (
              <tr key={e.id} className={selectedId === e.id ? 'sel' : ''} onClick={() => setSelectedId(e.id)}>
                <td>{e.id}</td>
                <td>{e.datum}</td>
                <td>{e.eingewiesene_person}</td>
                <td>{e.beauftragte_person}</td>
                <td style={{ textAlign: 'center' }}>{e.funktionspruefung}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showDialog && (
        <EinweisungDialog
          geraetId={geraetId}
          onClose={() => setShowDialog(false)}
          onSaved={() => { setShowDialog(false); load() }}
        />
      )}
    </>
  )
}

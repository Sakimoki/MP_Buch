import { useState, useEffect } from 'react'
import { getUebergaben, deleteUebergabe } from '../../api/api.js'
import { useApp } from '../../App.jsx'
import UebergabeDialog from '../dialogs/UebergabeDialog.jsx'

export default function UebergabenTab({ geraetId }) {
  const { setStatus } = useApp()
  const [data, setData]             = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showDialog, setShowDialog] = useState(false)

  const load = () => {
    if (!geraetId) return
    getUebergaben(geraetId).then(setData).catch(e => setStatus('Fehler: ' + e.message))
  }

  useEffect(() => {
    setSelectedId(null)
    load()
  }, [geraetId])

  const handleDelete = async () => {
    if (!selectedId) { alert('Bitte zuerst einen Übergabeeintrag auswählen.'); return }
    if (!confirm('Übergabeeintrag löschen?')) return
    try {
      await deleteUebergabe(selectedId)
      setSelectedId(null)
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <>
      <div className="sub-toolbar">
        <button className="add" onClick={() => { if (!geraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return } setShowDialog(true) }}>
          + Übergabe hinzufügen
        </button>
        <button className="del" onClick={handleDelete}>Löschen</button>
      </div>
      <div className="table-scroll">
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 36 }}>ID</th>
              <th style={{ width: 95 }}>Datum</th>
              <th>Prüfer</th>
              <th>Empfänger</th>
              <th style={{ width: 150 }}>Funktionsprüfung</th>
              <th style={{ width: 120 }}>Protokoll</th>
            </tr>
          </thead>
          <tbody>
            {data.map(u => (
              <tr key={u.id} className={selectedId === u.id ? 'sel' : ''} onClick={() => setSelectedId(u.id)}>
                <td>{u.id}</td>
                <td>{u.datum}</td>
                <td>{u.pruefer}</td>
                <td>{u.empfaenger}</td>
                <td>{u.funktionspruefung}</td>
                <td>
                  {u.datei_name
                    ? <a className="file-link" href={`/uploads/${u.datei_pfad}`} target="_blank" rel="noreferrer">{u.datei_name}</a>
                    : <span style={{ color: '#bbb' }}>–</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showDialog && (
        <UebergabeDialog
          geraetId={geraetId}
          onClose={() => setShowDialog(false)}
          onSaved={() => { setShowDialog(false); load(); setStatus('Übergabe gespeichert.') }}
        />
      )}
    </>
  )
}

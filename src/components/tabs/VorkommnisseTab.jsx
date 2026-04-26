import { useState, useEffect } from 'react'
import { getVorkommnisse, deleteVorkommnis } from '../../api/api.js'
import { useApp } from '../../App.jsx'
import VorkommnisDialog from '../dialogs/VorkommnisDialog.jsx'

export default function VorkommnisseTab({ geraetId }) {
  const { setStatus } = useApp()
  const [data, setData]             = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showDialog, setShowDialog] = useState(false)

  const load = () => {
    if (!geraetId) return
    getVorkommnisse(geraetId).then(setData).catch(e => setStatus('Fehler: ' + e.message))
  }

  useEffect(() => {
    setSelectedId(null)
    load()
  }, [geraetId])

  const handleDelete = async () => {
    if (!selectedId) { alert('Bitte zuerst einen Vorkommniseintrag auswählen.'); return }
    if (!confirm('Vorkommnis löschen?')) return
    try {
      await deleteVorkommnis(selectedId)
      setSelectedId(null)
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <>
      <div className="sub-toolbar">
        <button className="warn" onClick={() => { if (!geraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return } setShowDialog(true) }}>
          + Vorkommnis hinzufügen
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
              <th style={{ width: 120 }}>Meldung Behörde</th>
              <th style={{ width: 130 }}>Meldung Hersteller</th>
            </tr>
          </thead>
          <tbody>
            {data.map(v => (
              <tr key={v.id} className={selectedId === v.id ? 'sel' : ''} onClick={() => setSelectedId(v.id)}>
                <td>{v.id}</td>
                <td>{v.datum}</td>
                <td>{v.art_stoerung}</td>
                <td>{v.meldung_behoerde}</td>
                <td>{v.meldung_hersteller}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showDialog && (
        <VorkommnisDialog
          geraetId={geraetId}
          onClose={() => setShowDialog(false)}
          onSaved={() => { setShowDialog(false); load() }}
        />
      )}
    </>
  )
}

import { useState, useEffect, useRef } from 'react'
import { getPruefungen, deletePruefung, uploadPruefungsDokument } from '../../api/api.js'
import { useApp } from '../../App.jsx'
import PruefungDialog from '../dialogs/PruefungDialog.jsx'

const TODAY = new Date().toISOString().substring(0, 10)

export default function PruefungenTab({ geraetId }) {
  const { setStatus } = useApp()
  const [data, setData]             = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showDialog, setShowDialog] = useState(false)
  const fileRef = useRef()

  const load = () => {
    if (!geraetId) return
    getPruefungen(geraetId).then(setData).catch(e => setStatus('Fehler: ' + e.message))
  }

  useEffect(() => {
    setSelectedId(null)
    load()
  }, [geraetId])

  const handleDelete = async () => {
    if (!selectedId) { alert('Bitte zuerst einen Eintrag auswählen.'); return }
    if (!confirm('Eintrag löschen?')) return
    try {
      await deletePruefung(selectedId)
      setSelectedId(null)
      load()
    } catch (e) { alert(e.message) }
  }

  const handleUpload = async () => {
    if (!selectedId) { alert('Bitte zuerst einen Eintrag auswählen.'); return }
    if (!fileRef.current?.files?.length) { alert('Bitte zuerst eine Datei auswählen.'); return }
    try {
      const fd = new FormData()
      fd.append('datei', fileRef.current.files[0])
      await uploadPruefungsDokument(selectedId, fd)
      fileRef.current.value = ''
      load()
      setStatus('Protokoll hochgeladen.')
    } catch (e) { alert(e.message) }
  }

  const rowClass = (p) => {
    const parts = []
    if (selectedId === p.id) parts.push('sel')
    if (p.ergebnis === 'Nicht bestanden') parts.push('row-fail')
    else if (p.naechste_faelligkeit && p.naechste_faelligkeit < TODAY) parts.push('overdue')
    return parts.join(' ')
  }

  return (
    <>
      <div className="sub-toolbar">
        <button className="add" onClick={() => { if (!geraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return } setShowDialog(true) }}>
          + Eintrag hinzufügen
        </button>
        <button className="del" onClick={handleDelete}>Löschen</button>
        <span style={{ marginLeft: 8 }}>
          <input type="file" ref={fileRef} style={{ fontSize: 12 }} />
          <button className="tbtn" onClick={handleUpload} style={{ marginLeft: 4 }}>Protokoll hochladen</button>
        </span>
      </div>
      <div className="table-scroll">
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 36 }}>ID</th>
              <th style={{ width: 90 }}>Art</th>
              <th style={{ width: 95 }}>Datum</th>
              <th style={{ width: 115 }}>Nächste Fälligkeit</th>
              <th>Prüfer</th>
              <th>Firma</th>
              <th style={{ width: 130 }}>Ergebnis</th>
              <th style={{ width: 110 }}>Protokoll</th>
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
                <td>{p.firma}</td>
                <td>{p.ergebnis}</td>
                <td>
                  {p.datei_name
                    ? <a className="file-link" href={`/uploads/${p.datei_pfad}`} target="_blank" rel="noreferrer">{p.datei_name}</a>
                    : <span style={{ color: '#bbb' }}>–</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showDialog && (
        <PruefungDialog
          geraetId={geraetId}
          onClose={() => setShowDialog(false)}
          onSaved={() => { setShowDialog(false); load(); setStatus('Eintrag gespeichert.') }}
        />
      )}
    </>
  )
}

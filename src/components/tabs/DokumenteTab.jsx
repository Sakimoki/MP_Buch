import { useState, useEffect, useRef } from 'react'
import { getDokumente, deleteDokument, uploadDokument } from '../../api/api.js'
import { useApp } from '../../App.jsx'

export default function DokumenteTab({ geraetId }) {
  const { setStatus } = useApp()
  const [data, setData]             = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const fileInputRef                = useRef()

  const load = () => {
    if (!geraetId) return
    getDokumente(geraetId).then(setData).catch(e => setStatus('Fehler: ' + e.message))
  }

  useEffect(() => {
    setSelectedId(null)
    load()
  }, [geraetId])

  const handleUploadClick = () => {
    if (!geraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return }
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('datei', file)
    fd.append('geraet_id', geraetId)
    try {
      await uploadDokument(fd)
      e.target.value = ''
      load()
      setStatus('Dokument hochgeladen.')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) { alert('Bitte zuerst ein Dokument auswählen.'); return }
    if (!confirm('Dokument löschen? Die Datei bleibt auf dem Server erhalten.')) return
    try {
      await deleteDokument(selectedId)
      setSelectedId(null)
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <>
      <div className="sub-toolbar">
        <button className="add" onClick={handleUploadClick}>+ Datei hochladen</button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button className="del" onClick={handleDelete}>Löschen</button>
      </div>
      <div className="table-scroll">
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 36 }}>ID</th>
              <th>Dateiname</th>
              <th>Beschreibung</th>
              <th style={{ width: 130 }}>Hochgeladen am</th>
              <th style={{ width: 70 }}>Öffnen</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.id} className={selectedId === d.id ? 'sel' : ''} onClick={() => setSelectedId(d.id)}>
                <td>{d.id}</td>
                <td>{d.dateiname}</td>
                <td>{d.beschreibung}</td>
                <td>{d.hochgeladen_am}</td>
                <td>
                  <a className="file-link" href={`/uploads/${d.dateipfad}`} target="_blank" rel="noreferrer">
                    📄 Öffnen
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

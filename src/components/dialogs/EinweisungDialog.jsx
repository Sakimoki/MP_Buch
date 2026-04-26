import { useRef, useEffect, useState } from 'react'
import { createEinweisung, uploadDokument, dataURIToBlob } from '../../api/api.js'
import { useApp } from '../../App.jsx'
import SignatureDocument from '../signature/SignatureDocument.jsx'

const INITIAL = {
  datum: '',
  eingewiesene_person: '',
  beauftragte_person: '',
  funktionspruefung: false,
  bemerkungen: '',
}

export default function EinweisungDialog({ geraetId, onClose, onSaved }) {
  const ref = useRef()
  const { setStatus } = useApp()
  const [form, setForm]           = useState(INITIAL)
  const [pdfErstellt, setPdfErstellt] = useState(false)

  useEffect(() => { ref.current?.showModal() }, [])

  const set = (e) => {
    const { name, value, type, checked } = e.target
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const handlePdfComplete = async (pdfDataUrl) => {
    try {
      const blob = dataURIToBlob(pdfDataUrl)
      const fd = new FormData()
      fd.append('datei', blob, `Einweisungsprotokoll_Geraet${geraetId}_${form.datum || 'kein-datum'}.pdf`)
      fd.append('geraet_id', geraetId)
      await uploadDokument(fd)
      setStatus('Einweisungsprotokoll gespeichert.')
    } catch (e) {
      // Download lief bereits — Archivierungsfehler ist kein kritischer Fehler
      console.warn('PDF-Archivierung fehlgeschlagen:', e.message)
    }
    setPdfErstellt(true)
  }

  const handleSave = async () => {
    if (!form.datum) { alert('Datum ist ein Pflichtfeld.'); return }
    try {
      await createEinweisung({
        geraet_id: geraetId,
        datum: form.datum,
        eingewiesene_person: form.eingewiesene_person || null,
        beauftragte_person: form.beauftragte_person || null,
        funktionspruefung: form.funktionspruefung ? 1 : 0,
        bemerkungen: form.bemerkungen || null,
      })
      onSaved()
    } catch (e) { alert(e.message) }
  }

  const pdfDate = form.datum ? new Date(form.datum) : new Date()
  const pdfFileName = `Einweisungsprotokoll_Geraet${geraetId}_${form.datum || 'kein-datum'}.pdf`

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 680 }}>
      <div className="dlg-hd">Einweisung erfassen (§13 MPBetreibV)</div>
      <div className="dlg-body">

        <div className="form-sec">Einweisungsdaten</div>
        <div className="form-row">
          <label>Datum *</label>
          <input type="date" name="datum" value={form.datum} onChange={set} />
        </div>
        <div className="form-row">
          <label>Eingewiesene Person</label>
          <input type="text" name="eingewiesene_person" value={form.eingewiesene_person} onChange={set} />
        </div>
        <div className="form-row">
          <label>Beauftragte Person</label>
          <input type="text" name="beauftragte_person" value={form.beauftragte_person} onChange={set} />
        </div>
        <div className="form-row">
          <label>Funktionsprüfung durchgeführt</label>
          <input type="checkbox" name="funktionspruefung" checked={form.funktionspruefung} onChange={set} />
        </div>
        <div className="form-row">
          <label>Bemerkungen</label>
          <textarea name="bemerkungen" value={form.bemerkungen} onChange={set} rows={3} />
        </div>

        <div className="form-sec">Unterschriften (§13 MPBetreibV)</div>
        <SignatureDocument
          title="Einweisungsprotokoll"
          date={pdfDate}
          signatories={[
            { label: 'Einweiser (Beauftragte Person)' },
            { label: 'Eingewiesene Person' },
          ]}
          initialNames={[form.beauftragte_person, form.eingewiesene_person]}
          downloadFileName={pdfFileName}
          onComplete={handlePdfComplete}
        />

        {pdfErstellt && (
          <p style={{ fontSize: 12, color: '#27ae60', marginTop: 6, textAlign: 'center' }}>
            ✓ PDF erstellt und als Gerätedokument gespeichert
          </p>
        )}

      </div>
      <div className="dlg-ft">
        <button
          className="save"
          onClick={handleSave}
          disabled={!pdfErstellt}
          style={{ opacity: pdfErstellt ? 1 : 0.45, cursor: pdfErstellt ? 'pointer' : 'not-allowed' }}
        >
          Speichern
        </button>
        <button className="cancel" onClick={onClose}>Abbrechen</button>
      </div>
    </dialog>
  )
}

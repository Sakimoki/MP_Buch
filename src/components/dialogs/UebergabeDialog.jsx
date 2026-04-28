import { useRef, useEffect, useState } from 'react'
import { createUebergabe, uploadProtokoll } from '../../api/api.js'

const INITIAL = { datum: '', empfaenger: '', bemerkungen: '' }

export default function UebergabeDialog({ geraetId, onClose, onSaved }) {
  const ref     = useRef()
  const fileRef = useRef()
  const [form, setForm] = useState(INITIAL)

  useEffect(() => { ref.current?.showModal() }, [])

  const set = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
  }

  const handleSave = async () => {
    if (!form.datum) { alert('Datum ist ein Pflichtfeld.'); return }
    try {
      const { id } = await createUebergabe({
        geraet_id: geraetId,
        datum: form.datum,
        empfaenger: form.empfaenger || null,
        bemerkungen: form.bemerkungen || null,
      })
      if (fileRef.current?.files?.length) {
        const fd = new FormData()
        fd.append('datei', fileRef.current.files[0])
        await uploadProtokoll(id, fd).catch(() => alert('Warnung: Protokolldatei konnte nicht hochgeladen werden.'))
      }
      onSaved()
    } catch (e) { alert(e.message) }
  }

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 520 }}>
      <div className="dlg-hd">Lieferschein erfassen</div>
      <div className="dlg-body">
        <div className="form-row"><label>Datum *</label>
          <input type="date" name="datum" value={form.datum} onChange={set} /></div>
        <div className="form-row"><label>Empfänger</label>
          <input type="text" name="empfaenger" value={form.empfaenger} onChange={set} /></div>
        <div className="form-row"><label>Protokoll (Datei)</label>
          <input type="file" ref={fileRef} /></div>
        <div className="form-row"><label>Bemerkungen</label>
          <textarea name="bemerkungen" value={form.bemerkungen} onChange={set} rows={2} /></div>
      </div>
      <div className="dlg-ft">
        <button className="save" onClick={handleSave}>Speichern</button>
        <button className="cancel" onClick={onClose}>Abbrechen</button>
      </div>
    </dialog>
  )
}

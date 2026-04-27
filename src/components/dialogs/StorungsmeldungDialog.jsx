import { useRef, useEffect, useState } from 'react'
import { createStoerungsmeldung } from '../../api/api.js'

const INITIAL = { datum: '', art_stoerung: '', bemerkungen: '' }

export default function StorungsmeldungDialog({ geraetId, onClose, onSaved }) {
  const ref = useRef()
  const [form, setForm] = useState(INITIAL)

  useEffect(() => { ref.current?.showModal() }, [])

  const set = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
  }

  const handleSave = async () => {
    if (!form.datum) { alert('Datum ist ein Pflichtfeld.'); return }
    try {
      await createStoerungsmeldung({
        geraet_id: geraetId,
        datum: form.datum,
        art_stoerung: form.art_stoerung || null,
        bemerkungen: form.bemerkungen || null,
      })
      onSaved()
    } catch (e) { alert(e.message) }
  }

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 500 }}>
      <div className="dlg-hd">Störungsmeldung erfassen</div>
      <div className="dlg-body">
        <div className="form-row"><label>Datum *</label>
          <input type="date" name="datum" value={form.datum} onChange={set} /></div>
        <div className="form-row"><label>Art der Störung</label>
          <input type="text" name="art_stoerung" value={form.art_stoerung} onChange={set} /></div>
        <div className="form-row"><label>Bemerkungen</label>
          <textarea name="bemerkungen" value={form.bemerkungen} onChange={set} rows={3} /></div>
      </div>
      <div className="dlg-ft">
        <button className="save" onClick={handleSave}>Speichern</button>
        <button className="cancel" onClick={onClose}>Abbrechen</button>
      </div>
    </dialog>
  )
}

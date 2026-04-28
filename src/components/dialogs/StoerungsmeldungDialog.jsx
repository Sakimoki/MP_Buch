import { useRef, useEffect, useState } from 'react'                                                                                                                                            
  import { createStoerungsmeldung } from '../../api/api.js'                                                                                                                                      
                  
  const INITIAL = { datum: '', art_stoerung: '', bemerkungen: '' }

  export default function StoerungsmeldungDialog({ geraetId, onClose, onSaved }) {
    const ref = useRef()
    const [form, setForm] = useState(INITIAL)

    useEffect(() => { ref.current?.showModal() }, [])

    const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

    const handleSave = async () => {
      if (!form.datum) { alert('Datum ist ein Pflichtfeld.'); return }
      try {
        await createStoerungsmeldung({ geraet_id: geraetId, ...form })
        onSaved()
      } catch (e) { alert(e.message) }
    }

    return (
      <dialog ref={ref} onCancel={onClose} style={{ width: 480 }}>
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
          <button className="savew" onClick={handleSave}>Speichern</button>
          <button className="cancel" onClick={onClose}>Abbrechen</button>
        </div>
      </dialog>
    )
  }
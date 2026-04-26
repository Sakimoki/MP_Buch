import { useRef, useEffect, useState } from 'react'
import { createPruefung } from '../../api/api.js'

const INITIAL = {
  art: '', datum: '', naechste_faelligkeit: '', pruefer: '', ergebnis: '',
  messwerte: '', messverfahren: '', maengel: '', korrektivmassnahmen: '', bemerkungen: '',
}

export default function PruefungDialog({ geraetId, onClose, onSaved }) {
  const ref = useRef()
  const [form, setForm] = useState(INITIAL)

  useEffect(() => { ref.current?.showModal() }, [])

  const set = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
  }

  const handleSave = async () => {
    if (!form.art || !form.datum) { alert('Art und Datum sind Pflichtfelder.'); return }
    try {
      await createPruefung({
        geraet_id: geraetId,
        art: form.art,
        datum: form.datum,
        naechste_faelligkeit: form.naechste_faelligkeit || null,
        pruefer: form.pruefer || null,
        ergebnis: form.ergebnis || null,
        messwerte: form.messwerte || null,
        messverfahren: form.messverfahren || null,
        maengel: form.maengel || null,
        korrektivmassnahmen: form.korrektivmassnahmen || null,
        bemerkungen: form.bemerkungen || null,
      })
      onSaved()
    } catch (e) { alert(e.message) }
  }

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 540 }}>
      <div className="dlg-hd">Prüfung / Wartung erfassen</div>
      <div className="dlg-body">
        <div className="form-row"><label>Art *</label>
          <select name="art" value={form.art} onChange={set}>
            <option value=""></option>
            <option>STK</option><option>MTK</option><option>Wartung</option>
            <option>Reparatur</option><option>IT-Sicherheitsprüfung</option><option>Kalibrierung</option>
          </select></div>
        <div className="form-row"><label>Datum *</label>
          <input type="date" name="datum" value={form.datum} onChange={set} /></div>
        <div className="form-row"><label>Nächste Fälligkeit</label>
          <input type="date" name="naechste_faelligkeit" value={form.naechste_faelligkeit} onChange={set} /></div>
        <div className="form-row"><label>Prüfer / Firma</label>
          <input type="text" name="pruefer" value={form.pruefer} onChange={set} /></div>
        <div className="form-row"><label>Ergebnis</label>
          <select name="ergebnis" value={form.ergebnis} onChange={set}>
            <option value=""></option>
            <option>Bestanden</option><option>Bedingt bestanden</option><option>Nicht bestanden</option>
          </select></div>
        <div className="form-row"><label>Messwerte</label>
          <input type="text" name="messwerte" value={form.messwerte} onChange={set} placeholder="z.B. Ableitstrom 42 µA" /></div>
        <div className="form-row"><label>Messverfahren / Norm</label>
          <input type="text" name="messverfahren" value={form.messverfahren} onChange={set} placeholder="z.B. IEC 62353" /></div>
        <div className="form-row"><label>Aufgedeckte Mängel</label>
          <textarea name="maengel" value={form.maengel} onChange={set} rows={2} /></div>
        <div className="form-row"><label>Korrektivmaßnahmen</label>
          <textarea name="korrektivmassnahmen" value={form.korrektivmassnahmen} onChange={set} rows={2} /></div>
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

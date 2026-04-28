import { useRef, useEffect, useState } from 'react'
import { createPruefung } from '../../api/api.js'
import { createUebergabe, uploadPruefungsDokument } from '../../api/api.js'
import { useApp } from '../../App.jsx'

const INITIAL = {
  art: '', datum: '', naechste_faelligkeit: '', pruefer: '', firma: '', ergebnis: '',
  messwerte: '', messverfahren: '', maengel: '', korrektivmassnahmen: '', bemerkungen: '',
}

export default function PruefungDialog({ geraetId, onClose, onSaved }) {
  const ref = useRef()
  const fileRef = useRef()
  const { herstellerList, loadHersteller } = useApp()
  const [form, setForm] = useState(INITIAL)

  useEffect(() => {
    ref.current?.showModal()
    loadHersteller()
  }, [])

  const set = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
  }

  const handleSave = async () => {
    if (!form.art || !form.datum) { alert('Art und Datum sind Pflichtfelder.'); return }
    try {
      const {id} = await createPruefung({
        geraet_id: geraetId,
        art: form.art,
        datum: form.datum,
        naechste_faelligkeit: form.naechste_faelligkeit || null,
        pruefer: form.pruefer || null,
        firma: form.firma || null,
        ergebnis: form.ergebnis || null,
        messwerte: form.messwerte || null,
        messverfahren: form.messverfahren || null,
        maengel: form.maengel || null,
        korrektivmassnahmen: form.korrektivmassnahmen || null,
        bemerkungen: form.bemerkungen || null,
      })
      if (fileRef.current?.files?.length) {
      const fd = new FormData()
      fd.append('datei', fileRef.current.files[0])
      await uploadPruefungsDokument(id, fd).catch(() => alert('Warnung: Protokolldatei konnte nicht hochgeladen werden.'))
      }
      onSaved()
    } catch (e) { alert(e.message) }
  }

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 540 }}>
      <div className="dlg-hd">Wartungsbeleg erfassen</div>
      <div className="dlg-body">
        <div className="form-row"><label>Art *</label>
          <select name="art" value={form.art} onChange={set}>
            <option value=""></option>
            <option>MTK</option>
            <option>Wartung</option>
          </select></div>
        <div className="form-row"><label>Datum *</label>
          <input type="date" name="datum" value={form.datum} onChange={set} /></div>
        <div className="form-row"><label>Nächste Fälligkeit</label>
          <input type="date" name="naechste_faelligkeit" value={form.naechste_faelligkeit} onChange={set} /></div>
        <div className="form-row"><label>Prüfer</label>
          <input type="text" name="pruefer" value={form.pruefer} onChange={set} /></div>
        <div className="form-row"><label>Firma</label>
          <select name="firma" value={form.firma} onChange={set}>
            <option value="">— Bitte wählen —</option>
            {herstellerList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
          </select></div>
        <div className="form-row"><label>Ergebnis</label>
          <select name="ergebnis" value={form.ergebnis} onChange={set}>
            <option value=""></option>
            <option>Bestanden</option>
            <option>Bedingt bestanden</option>
            <option>Nicht bestanden</option>
          </select></div>
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

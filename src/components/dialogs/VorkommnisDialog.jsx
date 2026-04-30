import { useRef, useEffect, useState } from 'react'
import { createVorkommnis, updateVorkommnis, updateStoerungsmeldung } from '../../api/api.js'

const INITIAL = {
  datum: '', art_stoerung: '', folgen: '', meldung_behoerde: '',
  meldung_hersteller: '', korrektivmassnahmen: '', bemerkungen: '', erledigt: false,
}

export default function VorkommnisDialog({ geraetId, row, onClose, onSaved }) {
  const ref = useRef()
  const isEdit     = !!row
  const isStoerung = row?.typ === 'Störungsmeldung'

  const [form, setForm] = useState(() => isEdit ? {
    datum:               row.datum               || '',
    art_stoerung:        row.art_stoerung        || '',
    folgen:              row.folgen              || '',
    meldung_behoerde:    row.meldung_behoerde    || '',
    meldung_hersteller:  row.meldung_hersteller  || '',
    korrektivmassnahmen: row.korrektivmassnahmen || '',
    bemerkungen:         row.bemerkungen         || '',
    erledigt:            !!row.erledigt,
  } : INITIAL)

  useEffect(() => { ref.current?.showModal() }, [])

  const set = (e) => {
    const { name, value, type, checked } = e.target
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSave = async () => {
    if (!form.datum) { alert('Datum ist ein Pflichtfeld.'); return }
    try {
      if (isEdit) {
        if (isStoerung) {
          await updateStoerungsmeldung(row.id, {
            datum:        form.datum,
            art_stoerung: form.art_stoerung || null,
            bemerkungen:  form.bemerkungen  || null,
            erledigt:     form.erledigt,
          })
        } else {
          await updateVorkommnis(row.id, {
            datum:               form.datum,
            art_stoerung:        form.art_stoerung        || null,
            folgen:              form.folgen              || null,
            meldung_behoerde:    form.meldung_behoerde    || null,
            meldung_hersteller:  form.meldung_hersteller  || null,
            korrektivmassnahmen: form.korrektivmassnahmen || null,
            bemerkungen:         form.bemerkungen         || null,
            erledigt:            form.erledigt,
          })
        }
      } else {
        await createVorkommnis({
          geraet_id:           geraetId,
          datum:               form.datum,
          art_stoerung:        form.art_stoerung        || null,
          folgen:              form.folgen              || null,
          meldung_behoerde:    form.meldung_behoerde    || null,
          meldung_hersteller:  form.meldung_hersteller  || null,
          korrektivmassnahmen: form.korrektivmassnahmen || null,
          bemerkungen:         form.bemerkungen         || null,
        })
      }
      onSaved()
    } catch (e) { alert(e.message) }
  }

  const title = isEdit
    ? (isStoerung ? 'Störungsmeldung bearbeiten' : 'Vorkommnis bearbeiten (§3 MPDG / Art. 87 MDR)')
    : 'Vorkommnis / Störung erfassen (§3 MPDG / Art. 87 MDR)'

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 540 }}>
      <div className="dlg-hd">{title}</div>
      <div className="dlg-body">
        <div className="form-row"><label>Datum *</label>
          <input type="date" name="datum" value={form.datum} onChange={set} /></div>
        <div className="form-row"><label>Art der Störung</label>
          <input type="text" name="art_stoerung" value={form.art_stoerung} onChange={set} /></div>
        {!isStoerung && <>
          <div className="form-row"><label>Folgen / Konsequenzen</label>
            <textarea name="folgen" value={form.folgen} onChange={set} rows={2} /></div>
          <div className="form-row"><label>Meldung an Behörde (Datum)</label>
            <input type="date" name="meldung_behoerde" value={form.meldung_behoerde} onChange={set} /></div>
          <div className="form-row"><label>Meldung an Hersteller (Datum)</label>
            <input type="date" name="meldung_hersteller" value={form.meldung_hersteller} onChange={set} /></div>
          <div className="form-row"><label>Korrektivmaßnahmen</label>
            <textarea name="korrektivmassnahmen" value={form.korrektivmassnahmen} onChange={set} rows={2} /></div>
        </>}
        <div className="form-row"><label>Bemerkungen</label>
          <textarea name="bemerkungen" value={form.bemerkungen} onChange={set} rows={2} /></div>
        {isEdit && (
          <div className="form-row">
            <label>Erledigt</label>
            <input type="checkbox" name="erledigt" checked={form.erledigt} onChange={set}
              style={{ width: 'auto', marginTop: 2 }} />
          </div>
        )}
      </div>
      <div className="dlg-ft">
        <button className="savew" onClick={handleSave}>Speichern</button>
        <button className="cancel" onClick={onClose}>Abbrechen</button>
      </div>
    </dialog>
  )
}

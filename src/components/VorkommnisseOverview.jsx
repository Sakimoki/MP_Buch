import { useRef, useEffect, useState } from 'react'
import { getAllVorkommnisse, createVorkommnis, deleteVorkommnis } from '../api/api.js'
import { useApp } from '../App.jsx'

const EMPTY = {
  geraet_id: '', datum: '', art_stoerung: '', folgen: '',
  meldung_behoerde: '', meldung_hersteller: '', korrektivmassnahmen: '', bemerkungen: '',
}

export default function VorkommnisseOverview({ onClose }) {
  const ref = useRef()
  const { setStatus, geraeteList } = useApp()
  const [list, setList]             = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(EMPTY)

  useEffect(() => { ref.current?.showModal(); load() }, [])

  const load = () => getAllVorkommnisse().then(setList).catch(e => setStatus('Fehler: ' + e.message))

  const set = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
  }

  const handleSave = async () => {
    if (!form.datum) { alert('Datum ist ein Pflichtfeld.'); return }
    try {
      await createVorkommnis({
        geraet_id: form.geraet_id ? parseInt(form.geraet_id, 10) : null,
        datum: form.datum,
        art_stoerung: form.art_stoerung || null,
        folgen: form.folgen || null,
        meldung_behoerde: form.meldung_behoerde || null,
        meldung_hersteller: form.meldung_hersteller || null,
        korrektivmassnahmen: form.korrektivmassnahmen || null,
        bemerkungen: form.bemerkungen || null,
      })
      setShowForm(false)
      setForm(EMPTY)
      load()
      setStatus('Vorkommnis gespeichert.')
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async () => {
    if (!selectedId) { alert('Bitte zuerst einen Eintrag auswählen.'); return }
    if (!confirm('Vorkommnis wirklich löschen?')) return
    try {
      await deleteVorkommnis(selectedId)
      setSelectedId(null)
      load()
      setStatus('Vorkommnis gelöscht.')
    } catch (e) { alert(e.message) }
  }

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 900 }}>
      <div className="dlg-hd">Vorkommnisse – Gesamtübersicht (§3 MPDG / Art. 87 MDR)</div>
      <div className="dlg-body" style={{ padding: 0 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #ddd', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ background: 'var(--c-add)', color: '#fff', border: 'none', padding: '4px 12px', cursor: 'pointer', borderRadius: 3 }}
            onClick={() => { setShowForm(f => !f); setForm(EMPTY) }}>
            {showForm ? 'Abbrechen' : '+ Neu'}
          </button>
          <button style={{ background: 'var(--c-del)', color: '#fff', border: 'none', padding: '4px 12px', cursor: 'pointer', borderRadius: 3 }}
            onClick={handleDelete}>Löschen</button>
        </div>

        {showForm && (
          <div style={{ padding: '12px', borderBottom: '2px solid var(--c-sec)', background: '#f9f9f9' }}>
            <div className="form-sec" style={{ marginTop: 0 }}>Neues Vorkommnis</div>
            <div className="form-row"><label>Gerät</label>
              <select name="geraet_id" value={form.geraet_id} onChange={set}>
                <option value="">— Kein Gerät zugeordnet —</option>
                {geraeteList.map(g => <option key={g.id} value={g.id}>{g.bezeichnung} {g.art_typ ? `(${g.art_typ})` : ''}</option>)}
              </select></div>
            <div className="form-row"><label>Datum *</label>
              <input type="date" name="datum" value={form.datum} onChange={set} /></div>
            <div className="form-row"><label>Art der Störung</label>
              <input type="text" name="art_stoerung" value={form.art_stoerung} onChange={set} /></div>
            <div className="form-row"><label>Folgen / Konsequenzen</label>
              <textarea name="folgen" value={form.folgen} onChange={set} rows={2} /></div>
            <div className="form-row"><label>Meldung an Behörde (Datum)</label>
              <input type="date" name="meldung_behoerde" value={form.meldung_behoerde} onChange={set} /></div>
            <div className="form-row"><label>Meldung an Hersteller (Datum)</label>
              <input type="date" name="meldung_hersteller" value={form.meldung_hersteller} onChange={set} /></div>
            <div className="form-row"><label>Korrektivmaßnahmen</label>
              <textarea name="korrektivmassnahmen" value={form.korrektivmassnahmen} onChange={set} rows={2} /></div>
            <div className="form-row"><label>Bemerkungen</label>
              <textarea name="bemerkungen" value={form.bemerkungen} onChange={set} rows={2} /></div>
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button style={{ background: 'var(--c-add)', color: '#fff', border: 'none', padding: '5px 16px', cursor: 'pointer', borderRadius: 3 }}
                onClick={handleSave}>Speichern</button>
            </div>
          </div>
        )}

        <div style={{ overflow: 'auto', maxHeight: showForm ? '35vh' : '60vh' }}>
          <table className="dt" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>ID</th>
                <th style={{ width: 95 }}>Datum</th>
                <th>Gerät</th>
                <th>Art der Störung</th>
                <th style={{ width: 110 }}>Meldung Behörde</th>
                <th style={{ width: 110 }}>Meldung Hersteller</th>
              </tr>
            </thead>
            <tbody>
              {list.map(v => (
                <tr key={v.id} className={selectedId === v.id ? 'sel' : ''} onClick={() => setSelectedId(v.id)}>
                  <td>{v.id}</td>
                  <td>{v.datum}</td>
                  <td>{v.geraet_bezeichnung || <span style={{ color: '#bbb' }}>–</span>}</td>
                  <td>{v.art_stoerung}</td>
                  <td>{v.meldung_behoerde}</td>
                  <td>{v.meldung_hersteller}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#bbb', padding: 16 }}>Keine Vorkommnisse eingetragen.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="dlg-ft">
        <button className="cancel" onClick={onClose}>Schließen</button>
      </div>
    </dialog>
  )
}

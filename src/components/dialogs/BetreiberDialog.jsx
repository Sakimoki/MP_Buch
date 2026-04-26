import { useRef, useEffect, useState } from 'react'
import { getBetreiber, createBetreiber, updateBetreiber, deleteBetreiber } from '../../api/api.js'
import { useApp } from '../../App.jsx'

const EMPTY_FORM = { name: '', anschrift: '', tel: '', email: '', bemerkungen: '' }

export default function BetreiberDialog({ onClose }) {
  const ref = useRef()
  const { setStatus, loadBetreiber } = useApp()
  const [list, setList]             = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formTitle, setFormTitle]   = useState('Neuer Betreiber')

  useEffect(() => { ref.current?.showModal(); loadList() }, [])

  const loadList = () => getBetreiber().then(setList).catch(e => setStatus('Fehler: ' + e.message))

  const handleSelect = (b) => {
    setSelectedId(b.id)
    setFormTitle('Betreiber bearbeiten')
    setForm({ name: b.name || '', anschrift: b.anschrift || '', tel: b.tel || '', email: b.email || '', bemerkungen: b.bemerkungen || '' })
  }

  const handleNeu = () => {
    setSelectedId(null)
    setFormTitle('Neuer Betreiber')
    setForm(EMPTY_FORM)
  }

  const set = (e) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Name ist ein Pflichtfeld.'); return }
    const body = { name: form.name.trim(), anschrift: form.anschrift || null, tel: form.tel || null, email: form.email || null, bemerkungen: form.bemerkungen || null }
    try {
      if (selectedId) {
        await updateBetreiber(selectedId, body)
      } else {
        const { id } = await createBetreiber(body)
        setSelectedId(id)
      }
      setStatus('Betreiber gespeichert.')
      loadList()
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async () => {
    if (!selectedId) { alert('Bitte zuerst einen Betreiber auswählen.'); return }
    if (!confirm('Betreiber wirklich löschen?')) return
    try {
      await deleteBetreiber(selectedId)
      setSelectedId(null)
      handleNeu()
      loadList()
      setStatus('Betreiber gelöscht.')
    } catch (e) { alert(e.message) }
  }

  const handleClose = () => { loadBetreiber(); onClose() }

  return (
    <dialog ref={ref} onCancel={handleClose} style={{ width: 720 }}>
      <div className="dlg-hd">Betreiber-Stammdaten</div>
      <div className="dlg-body" style={{ padding: 0 }}>
        <div className="mgmt-wrap">
          <div className="mgmt-list">
            <div className="mgmt-toolbar">
              <button style={{ background: 'var(--c-add)' }} onClick={handleNeu}>+ Neu</button>
              <button style={{ background: 'var(--c-del)' }} onClick={handleDelete}>Löschen</button>
            </div>
            <div className="mgmt-list-scroll">
              <table className="dt">
                <thead><tr><th style={{ width: 36 }}>ID</th><th>Name / Institution</th></tr></thead>
                <tbody>
                  {list.map(b => (
                    <tr key={b.id} className={selectedId === b.id ? 'sel' : ''} onClick={() => handleSelect(b)}>
                      <td>{b.id}</td><td>{b.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mgmt-form">
            <div className="form-sec" style={{ marginTop: 8 }}>{formTitle}</div>
            <div className="form-row"><label>Name / Institution *</label>
              <input type="text" name="name" value={form.name} onChange={set} /></div>
            <div className="form-row"><label>Anschrift</label>
              <input type="text" name="anschrift" value={form.anschrift} onChange={set} placeholder="Straße, PLZ Ort" /></div>
            <div className="form-row"><label>Tel</label>
              <input type="text" name="tel" value={form.tel} onChange={set} /></div>
            <div className="form-row"><label>E-Mail</label>
              <input type="text" name="email" value={form.email} onChange={set} /></div>
            <div className="form-row"><label>Bemerkungen</label>
              <textarea name="bemerkungen" value={form.bemerkungen} onChange={set} rows={2} /></div>
            <div className="mgmt-save-row">
              <button style={{ background: 'var(--c-add)' }} onClick={handleSave}>Speichern</button>
              <button style={{ background: '#bbb' }} onClick={handleNeu}>Neu / Abbrechen</button>
            </div>
          </div>
        </div>
      </div>
      <div className="dlg-ft">
        <button className="cancel" onClick={handleClose}>Schließen</button>
      </div>
    </dialog>
  )
}

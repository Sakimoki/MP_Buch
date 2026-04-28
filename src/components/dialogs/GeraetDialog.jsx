import { useRef, useEffect, useState } from 'react'
import { getGeraetById, createGeraet, updateGeraet, getHersteller, getBetreiber } from '../../api/api.js'
import { useApp } from '../../App.jsx'

const BOOL_FIELDS = ['aktives_geraet', 'implantierbar', 'einmalprodukt', 'steril', 'netzwerkanbindung']
const INT_FIELDS  = ['hersteller_id', 'betreiber_id']

const INITIAL = {
  bezeichnung: '', art_typ: '', seriennummer: '',
  anschaffungsjahr: '', inbetriebnahmedatum: '', ausserdienst_datum: '',
  hersteller_id: '', hersteller_name: '', hersteller_anschrift: '',
  hersteller_tel: '', hersteller_email: '', ce_jahr: '',
  risikoklasse: '', udi_di: '', udi_pi: '', emdn_code: '',
  aktives_geraet: false, implantierbar: false, einmalprodukt: false, steril: false,
  betreiber_id: '', betreiber: '', betreiber_anschrift: '',
  betreiber_tel: '', betreiber_email: '',
  inventarnummer: '', verantwortliche_person: '',
  betreiber_typ: 'Cooperative Mensch',
  stk_anlage1: 'nein', stk_datum: '',
  mtk_anlage2: 'nein', mtk_datum: '', wartung_datum: '',
  netzwerkanbindung: false, softwareversion: '', bemerkungen: '',
}

export default function GeraetDialog({ mode, onClose, onSaved }) {
  const ref = useRef()
  const { selectedGeraetId, herstellerList, betreiberList, loadHersteller, loadBetreiber } = useApp()
  const [form, setForm]               = useState(INITIAL)
  const [showHstHint, setShowHstHint] = useState(false)
  const [showBtrHint, setShowBtrHint] = useState(false)
  const [mtkManual, setMtkManual]     = useState(false)
  const [wartManual, setWartManual]   = useState(false)

  useEffect(() => {
    ref.current?.showModal()
    loadHersteller()
    loadBetreiber()
    if (mode === 'edit' && selectedGeraetId) {
      getGeraetById(selectedGeraetId).then(d => {
        const f = { ...INITIAL }
        Object.keys(INITIAL).forEach(k => {
          if (BOOL_FIELDS.includes(k)) f[k] = !!d[k]
          else f[k] = d[k] ?? ''
        })
        setForm(f)
        setShowHstHint(!!d.hersteller_id)
        setShowBtrHint(!!d.betreiber_id)
        if (d.mtk_datum) setMtkManual(true)
        if (d.wartung_datum) setWartManual(true)
      })
    }
  }, [])

  // Auto-berechne MTK-Datum
  useEffect(() => {
    if (mtkManual) return
    if (!form.inbetriebnahmedatum || form.mtk_anlage2 === 'nein') {
      setForm(p => ({ ...p, mtk_datum: '' }))
      return
    }
    const base = new Date(form.inbetriebnahmedatum)
    const years = form.mtk_anlage2 === 'Infrarot-Strahlungsthermometer' ? 1 : 2
    base.setFullYear(base.getFullYear() + years)
    setForm(p => ({ ...p, mtk_datum: base.toISOString().split('T')[0] }))
  }, [form.mtk_anlage2, form.inbetriebnahmedatum, mtkManual])

  // Auto-berechne Wartungs-Datum
  useEffect(() => {
    if (wartManual) return
    if (!form.inbetriebnahmedatum) return
    const base = new Date(form.inbetriebnahmedatum)
    base.setFullYear(base.getFullYear() + 2)
    setForm(p => ({ ...p, wartung_datum: base.toISOString().split('T')[0] }))
  }, [form.inbetriebnahmedatum, wartManual])

  const set = (e) => {
    const { name, value, type, checked } = e.target
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const setMtk = (e) => {
    setMtkManual(true)
    set(e)
  }

  const setWart = (e) => {
    setWartManual(true)
    set(e)
  }

  const onHerstellerSelect = (id) => {
    setForm(p => ({ ...p, hersteller_id: id }))
    if (!id) { setShowHstHint(false); return }
    const h = herstellerList.find(x => String(x.id) === id)
    if (h) {
      setForm(p => ({
        ...p, hersteller_id: id,
        hersteller_name: h.name || '', hersteller_anschrift: h.anschrift || '',
        hersteller_tel: h.tel || '', hersteller_email: h.email || '',
      }))
      setShowHstHint(true)
    }
  }

  const onBetreiberSelect = (id) => {
    setForm(p => ({ ...p, betreiber_id: id }))
    if (!id) { setShowBtrHint(false); return }
    const b = betreiberList.find(x => String(x.id) === id)
    if (b) {
      setForm(p => ({
        ...p, betreiber_id: id,
        betreiber: b.name || '', betreiber_anschrift: b.anschrift || '',
        betreiber_tel: b.tel || '', betreiber_email: b.email || '',
      }))
      setShowBtrHint(true)
    }
  }

  const handleSave = async () => {
    if (!form.bezeichnung.trim()) { alert('Bezeichnung ist ein Pflichtfeld.'); return }
    const body = {}
    Object.keys(INITIAL).forEach(k => {
      if (BOOL_FIELDS.includes(k)) body[k] = form[k] ? 1 : 0
      else if (INT_FIELDS.includes(k)) body[k] = form[k] ? parseInt(form[k], 10) : null
      else body[k] = form[k]?.trim?.() !== undefined ? (form[k].trim() || null) : form[k]
    })
    try {
      if (mode === 'edit') {
        await updateGeraet(selectedGeraetId, body)
      } else {
        await createGeraet(body)
      }
      onSaved()
    } catch (e) { alert(e.message) }
  }

  const title = mode === 'edit' ? 'Gerät bearbeiten' : 'Neues Gerät erfassen'

  return (
    <dialog ref={ref} onCancel={onClose} style={{ width: 640 }}>
      <div className="dlg-hd">{title}</div>
      <div className="dlg-body">

        <div className="form-sec">Gerätekennzeichnung (§14 MPBetreibV)</div>
        <div className="form-row"><label>Bezeichnung *</label>
          <input type="text" name="bezeichnung" value={form.bezeichnung} onChange={set} /></div>
        <div className="form-row"><label>Art / Typ</label>
          <input type="text" name="art_typ" value={form.art_typ} onChange={set} /></div>
        <div className="form-row"><label>Seriennummer / Loscode</label>
          <input type="text" name="seriennummer" value={form.seriennummer} onChange={set} /></div>
        <div className="form-row"><label>Anschaffungsjahr</label>
          <input type="text" name="anschaffungsjahr" value={form.anschaffungsjahr} onChange={set} placeholder="z.B. 2023" /></div>
        <div className="form-row"><label>Inbetriebnahmedatum</label>
          <input type="date" name="inbetriebnahmedatum" value={form.inbetriebnahmedatum} onChange={set} /></div>
        <div className="form-row"><label>Außerdienststellung</label>
          <input type="date" name="ausserdienst_datum" value={form.ausserdienst_datum} onChange={set} /></div>

        <div className="form-sec">Hersteller</div>
        <div className="form-row">
          <label>Aus Stammdaten wählen</label>
          <select name="hersteller_id" value={form.hersteller_id} onChange={e => onHerstellerSelect(e.target.value)}>
            <option value="">— Kein / manuell eingeben —</option>
            {herstellerList.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        {showHstHint && <div className="sel-hint">Felder wurden aus den Stammdaten befüllt — bei Bedarf anpassbar.</div>}
        <div className="form-row"><label>Herstellername</label>
          <input type="text" name="hersteller_name" value={form.hersteller_name} onChange={set} /></div>
        <div className="form-row"><label>Anschrift</label>
          <input type="text" name="hersteller_anschrift" value={form.hersteller_anschrift} onChange={set} placeholder="Straße, PLZ Ort" /></div>
        <div className="form-row"><label>Tel</label>
          <input type="text" name="hersteller_tel" value={form.hersteller_tel} onChange={set} /></div>
        <div className="form-row"><label>E-Mail</label>
          <input type="text" name="hersteller_email" value={form.hersteller_email} onChange={set} /></div>
        <div className="form-row"><label>CE Kennzeichnung</label>
          <input type="text" name="ce_jahr" value={form.ce_jahr} onChange={set} placeholder="z.B. 2021" /></div>

        <div className="form-sec">Klassifikation &amp; UDI</div>
        <div className="form-row"><label>Risikoklasse</label>
          <select name="risikoklasse" value={form.risikoklasse} onChange={set}>
            <option value=""></option>
            <option>I</option><option>IIa</option><option>IIb</option><option>III</option>
            <option>IVD-A</option><option>IVD-B</option><option>IVD-C</option><option>IVD-D</option>
          </select></div>
        <div className="form-row"><label>UDI-DI</label>
          <input type="text" name="udi_di" value={form.udi_di} onChange={set} /></div>
        <div className="form-row"><label>UDI-PI</label>
          <input type="text" name="udi_pi" value={form.udi_pi} onChange={set} /></div>
        <div className="form-row"><label>EMDN-Code</label>
          <input type="text" name="emdn_code" value={form.emdn_code} onChange={set} /></div>
        <div className="form-row"><label>Aktives Gerät</label>
          <input type="checkbox" name="aktives_geraet" checked={form.aktives_geraet} onChange={set} /></div>
        <div className="form-row"><label>Implantierbar</label>
          <input type="checkbox" name="implantierbar" checked={form.implantierbar} onChange={set} /></div>
        <div className="form-row"><label>Einmalprodukt</label>
          <input type="checkbox" name="einmalprodukt" checked={form.einmalprodukt} onChange={set} /></div>
        <div className="form-row"><label>Steril</label>
          <input type="checkbox" name="steril" checked={form.steril} onChange={set} /></div>

        <div className="form-sec">Betreiber / Standort</div>
        <div className="form-row">
          <label>Aus Stammdaten wählen</label>
          <select name="betreiber_id" value={form.betreiber_id} onChange={e => onBetreiberSelect(e.target.value)}>
            <option value="">— Kein / manuell eingeben —</option>
            {betreiberList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {showBtrHint && <div className="sel-hint">Felder wurden aus den Stammdaten befüllt — bei Bedarf anpassbar.</div>}
        <div className="form-row"><label>Standort</label>
          <input type="text" name="betreiber" value={form.betreiber} onChange={set} /></div>
        <div className="form-row"><label>Adresse</label>
          <input type="text" name="betreiber_anschrift" value={form.betreiber_anschrift} onChange={set} placeholder="Straße, PLZ Ort" /></div>
        <div className="form-row"><label>Tel</label>
          <input type="text" name="betreiber_tel" value={form.betreiber_tel} onChange={set} /></div>
        <div className="form-row"><label>E-Mail</label>
          <input type="text" name="betreiber_email" value={form.betreiber_email} onChange={set} /></div>
        <div className="form-row"><label>Inventarnummer</label>
          <input type="text" name="inventarnummer" value={form.inventarnummer} onChange={set} /></div>
        <div className="form-row"><label>Verantwortliche Person</label>
          <input type="text" name="verantwortliche_person" value={form.verantwortliche_person} onChange={set} /></div>
        <div className="form-row"><label>Betreiber</label>
          <select name="betreiber_typ" value={form.betreiber_typ} onChange={set}>
            <option>Versorgender</option>
            <option>Leistungserbringer/Dritte</option>
            <option>Cooperative Mensch</option>
          </select></div>
        <div className="form-sec">MTK/STK/Wartung</div>
          <div className="form-row"><label>STK/Anlage 1 Relevant</label>
        <select name="stk_anlage1" value={form.stk_anlage1} onChange={set}>
          <option value="nein">Nein</option>
          <option value="ja">Ja</option>
        </select></div>
        {form.stk_anlage1 === 'ja' && (
        <div className="form-row"><label>STK (Fälligkeit)</label>
          <input type="date" name="stk_datum" value={form.stk_datum} onChange={set} /></div>
        )}
        <div className="form-row"><label>MTK/Anlage 2 Relevant</label>
          <select name="mtk_anlage2" value={form.mtk_anlage2} onChange={set}>
            <option>Nein</option>
            <option>Elektrothermometer</option>
            <option>Infrarot-Strahlungsthermometer</option>
            <option>Blutdruckmessung</option>
          </select></div>
        {form.mtk_anlage2 !== 'Nein' && (
          <div className="form-row"><label>MTK (Fälligkeit)</label>
          <input type="date" name="mtk_datum" value={form.mtk_datum} onChange={setMtk} /></div>
        )}
        <div className="form-row"><label>Wartung (Fälligkeit)</label>
          <input type="date" name="wartung_datum" value={form.wartung_datum} onChange={setWart} /></div>

        <div className="form-sec">IT-Sicherheit (§14 Abs. 3 MPBetreibV)</div>
        <div className="form-row"><label>Netzwerkanbindung</label>
          <input type="checkbox" name="netzwerkanbindung" checked={form.netzwerkanbindung} onChange={set} /></div>
        <div className="form-row"><label>Softwareversion</label>
          <input type="text" name="softwareversion" value={form.softwareversion} onChange={set} /></div>

        <div className="form-sec">Sonstiges</div>
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

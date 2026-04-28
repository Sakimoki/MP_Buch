 import { useState, useEffect } from 'react'
  import { getVorkommnisse, deleteVorkommnis, getStoerungsmeldungen, deleteStoerungsmeldung } from '../../api/api.js'
  import { useApp } from '../../App.jsx'
  import VorkommnisDialog from '../dialogs/VorkommnisDialog.jsx'
  import StoerungsmeldungDialog from '../dialogs/StoerungsmeldungDialog.jsx'

  export default function VorkommnisseTab({ geraetId }) {
    const { setStatus } = useApp()
    const [vorkommnisse, setVorkommnisse]       = useState([])
    const [stoerungen, setStoerungen]           = useState([])
    const [selectedVId, setSelectedVId]         = useState(null)
    const [selectedSId, setSelectedSId]         = useState(null)
    const [showVDialog, setShowVDialog]         = useState(false)
    const [showSDialog, setShowSDialog]         = useState(false)

    const load = () => {
      if (!geraetId) return
      getVorkommnisse(geraetId).then(setVorkommnisse).catch(e => setStatus('Fehler: ' + e.message))
      getStoerungsmeldungen(geraetId).then(setStoerungen).catch(e => setStatus('Fehler: ' + e.message))
    }

    useEffect(() => { setSelectedVId(null); setSelectedSId(null); load() }, [geraetId])

    const handleDeleteV = async () => {
      if (!selectedVId) { alert('Bitte zuerst einen Vorkommniseintrag auswählen.'); return }
      if (!confirm('Vorkommnis löschen?')) return
      try { await deleteVorkommnis(selectedVId); setSelectedVId(null); load() }
      catch (e) { alert(e.message) }
    }

    const handleDeleteS = async () => {
      if (!selectedSId) { alert('Bitte zuerst eine Störungsmeldung auswählen.'); return }
      if (!confirm('Störungsmeldung löschen?')) return
      try { await deleteStoerungsmeldung(selectedSId); setSelectedSId(null); load() }
      catch (e) { alert(e.message) }
    }

    const guard = (fn) => () => { if (!geraetId) { alert('Bitte zuerst ein Gerät auswählen.'); return } fn() }

    return (
      <>
        <div className="sub-toolbar">
          <button className="warn" onClick={guard(() => setShowVDialog(true))}>+ Vorkommnis hinzufügen</button>
          <button className="del" onClick={handleDeleteV}>Löschen</button>
        </div>
        <div className="table-scroll">
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 36 }}>ID</th>
                <th style={{ width: 95 }}>Datum</th>
                <th>Art der Störung</th>
                <th style={{ width: 120 }}>Meldung Behörde</th>
                <th style={{ width: 130 }}>Meldung Hersteller</th>
              </tr>
            </thead>
            <tbody>
              {vorkommnisse.map(v => (
                <tr key={v.id} className={selectedVId === v.id ? 'sel' : ''} onClick={() => setSelectedVId(v.id)}>
                  <td>{v.id}</td>
                  <td>{v.datum}</td>
                  <td>{v.art_stoerung}</td>
                  <td>{v.meldung_behoerde}</td>
                  <td>{v.meldung_hersteller}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sub-toolbar" style={{ marginTop: 16 }}>
          <button className="warn" onClick={guard(() => setShowSDialog(true))}>+ Störungsmeldung hinzufügen</button>
          <button className="del" onClick={handleDeleteS}>Löschen</button>
        </div>
        <div className="table-scroll">
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 36 }}>ID</th>
                <th style={{ width: 95 }}>Datum</th>
                <th>Art der Störung</th>
                <th>Bemerkungen</th>
              </tr>
            </thead>
            <tbody>
              {stoerungen.map(s => (
                <tr key={s.id} className={selectedSId === s.id ? 'sel' : ''} onClick={() => setSelectedSId(s.id)}>
                  <td>{s.id}</td>
                  <td>{s.datum}</td>
                  <td>{s.art_stoerung}</td>
                  <td>{s.bemerkungen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showVDialog && (
          <VorkommnisDialog geraetId={geraetId}
            onClose={() => setShowVDialog(false)}
            onSaved={() => { setShowVDialog(false); load() }} />
        )}
        {showSDialog && (
          <StoerungsmeldungDialog geraetId={geraetId}
            onClose={() => setShowSDialog(false)}
            onSaved={() => { setShowSDialog(false); load() }} />
        )}
      </>
    )
  }
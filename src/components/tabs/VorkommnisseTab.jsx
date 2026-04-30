 import { useState, useEffect } from 'react'
  import { getVorkommnisse, getVorkommnisseUebersicht, deleteVorkommnis, getStoerungsmeldungen, deleteStoerungsmeldung } from '../../api/api.js'
  import { useApp } from '../../App.jsx'
  import VorkommnisDialog from '../dialogs/VorkommnisDialog.jsx'
  import StoerungsmeldungDialog from '../dialogs/StoerungsmeldungDialog.jsx'

  export default function VorkommnisseTab({ geraetId }) {
    const { setStatus } = useApp()
    const [uebersicht, setUebersicht]             = useState([])
    const [vorkommnisse, setVorkommnisse]         = useState([])
    const [stoerungen, setStoerungen]             = useState([])
    const [selectedVId, setSelectedVId]           = useState(null)
    const [selectedSId, setSelectedSId]           = useState(null)
    const [showVDialog, setShowVDialog]           = useState(false)
    const [showSDialog, setShowSDialog]           = useState(false)

    const load = () => {
      if (!geraetId) return
      getVorkommnisseUebersicht(geraetId).then(setUebersicht).catch(e => setStatus('Fehler: ' + e.message))
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

    const typBadge = (typ) => (
      <span style={{
        fontSize: 11, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
        background: typ === 'Störungsmeldung' ? '#fff3cd' : '#f8d7da',
        color: typ === 'Störungsmeldung' ? '#856404' : '#842029',
        border: `1px solid ${typ === 'Störungsmeldung' ? '#ffc107' : '#f5c2c7'}`
      }}>{typ}</span>
    )

    return (
      <>
        {/* ── Gesamtübersicht für den MPB ── */}
        <div className="sub-toolbar">
          <strong>Gesamtübersicht Vorkommnisse</strong>
          <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
            (Vorkommnisse + Störungsmeldungen + nicht bestandene Prüfungen)
          </span>
        </div>
        <div className="table-scroll">
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 95 }}>Datum</th>
                <th style={{ width: 140 }}>Typ</th>
                <th>Beschreibung</th>
                <th style={{ width: 120 }}>Meldung Behörde</th>
                <th style={{ width: 130 }}>Meldung Hersteller</th>
                <th>Bemerkungen</th>
              </tr>
            </thead>
            <tbody>
              {uebersicht.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>Keine Einträge</td></tr>
                : uebersicht.map((u, i) => (
                  <tr key={`${u.typ}-${u.id}-${i}`}>
                    <td>{u.datum}</td>
                    <td>{typBadge(u.typ)}</td>
                    <td>{u.art_stoerung}</td>
                    <td>{u.meldung_behoerde || '—'}</td>
                    <td>{u.meldung_hersteller || '—'}</td>
                    <td>{u.bemerkungen}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* ── Manuelle Vorkommnisse ── */}
        <div className="sub-toolbar" style={{ marginTop: 20 }}>
          <span style={{ fontWeight: 600 }}>Vorkommnisse (manuell)</span>
          <button className="warn" style={{ marginLeft: 12 }} onClick={guard(() => setShowVDialog(true))}>+ Vorkommnis hinzufügen</button>
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
              {vorkommnisse.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>Keine Einträge</td></tr>
                : vorkommnisse.map(v => (
                  <tr key={v.id} className={selectedVId === v.id ? 'sel' : ''} onClick={() => setSelectedVId(v.id)}>
                    <td>{v.id}</td>
                    <td>{v.datum}</td>
                    <td>{v.art_stoerung}</td>
                    <td>{v.meldung_behoerde}</td>
                    <td>{v.meldung_hersteller}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* ── Störungsmeldungen ── */}
        <div className="sub-toolbar" style={{ marginTop: 20 }}>
          <span style={{ fontWeight: 600 }}>Störungsmeldungen</span>
          <button className="warn" style={{ marginLeft: 12 }} onClick={guard(() => setShowSDialog(true))}>+ Störungsmeldung hinzufügen</button>
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
              {stoerungen.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>Keine Einträge</td></tr>
                : stoerungen.map(s => (
                  <tr key={s.id} className={selectedSId === s.id ? 'sel' : ''} onClick={() => setSelectedSId(s.id)}>
                    <td>{s.id}</td>
                    <td>{s.datum}</td>
                    <td>{s.art_stoerung}</td>
                    <td>{s.bemerkungen}</td>
                  </tr>
                ))
              }
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

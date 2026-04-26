const SECTIONS = [
  ['Gerätekennzeichnung (§14 MPBetreibV)', [
    ['Bezeichnung', 'bezeichnung'],
    ['Art / Typ', 'art_typ'],
    ['Seriennummer', 'seriennummer'],
    ['Loscode', 'loscode'],
    ['Anschaffungsjahr', 'anschaffungsjahr'],
    ['Inbetriebnahme', 'inbetriebnahmedatum'],
    ['Außerdienststellung', 'ausserdienst_datum'],
  ]],
  ['Hersteller', [
    ['Name', 'hersteller_name'],
    ['Anschrift', 'hersteller_anschrift'],
    ['Tel', 'hersteller_tel'],
    ['E-Mail', 'hersteller_email'],
    ['CE Kennzeichnung', 'ce_jahr'],
  ]],
  ['Klassifikation & UDI', [
    ['Risikoklasse', 'risikoklasse'],
    ['UDI-DI', 'udi_di'],
    ['UDI-PI', 'udi_pi'],
    ['EMDN-Code', 'emdn_code'],
    ['Aktives Gerät', 'aktives_geraet', 'bool'],
    ['Implantierbar', 'implantierbar', 'bool'],
    ['Einmalprodukt', 'einmalprodukt', 'bool'],
    ['Steril', 'steril', 'bool'],
    ['Zweckbestimmung', 'zweckbestimmung'],
  ]],
  ['Betreiber / Standort', [
    ['Betreiber', 'betreiber'],
    ['Adresse', 'betreiber_anschrift'],
    ['Tel', 'betreiber_tel'],
    ['E-Mail', 'betreiber_email'],
    ['Inventarnummer', 'inventarnummer'],
    ['Verantwortliche Person', 'verantwortliche_person'],
  ]],
  ['IT-Sicherheit', [
    ['Netzwerkanbindung', 'netzwerkanbindung', 'bool'],
    ['Softwareversion', 'softwareversion'],
  ]],
  ['Bemerkungen', [['Bemerkungen', 'bemerkungen']]],
]

export default function GeraetedatenTab({ geraet }) {
  if (!geraet) return <p id="detail-placeholder">Bitte ein Gerät aus der Liste auswählen.</p>

  return (
    <div id="tab-detail">
      {SECTIONS.map(([title, fields]) => (
        <div key={title}>
          <div className="sec-hd">{title}</div>
          {fields.map(([lbl, key, type]) => {
            let v = geraet[key]
            if (type === 'bool') v = v ? 'Ja' : 'Nein'
            return (
              <div className="frow" key={key}>
                <span className="flabel">{lbl}:</span>
                <span className="fval">
                  {v ? v : <span style={{ color: '#bbb' }}>–</span>}
                </span>
              </div>
            )
          })}
        </div>
      ))}
      <div className="audit">
        Erstellt: {geraet.erstellt_am} &nbsp;|&nbsp; Geändert: {geraet.geaendert_am}
      </div>
    </div>
  )
}

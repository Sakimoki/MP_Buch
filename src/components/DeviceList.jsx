import { useApp } from '../App.jsx'

export default function DeviceList() {
  const { geraeteList, selectedGeraetId, setSelectedGeraetId } = useApp()

  return (
    <div id="list-panel">
      <div id="list-heading">Bestandsverzeichnis</div>
      <div id="list-scroll">
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 36 }}>ID</th>
              <th>Bezeichnung</th>
              <th style={{ width: 80 }}>Typ</th>
              <th style={{ width: 50 }}>Klasse</th>
              <th style={{ width: 90 }}>Betreiber</th>
            </tr>
          </thead>
          <tbody>
            {geraeteList.map(g => (
              <tr
                key={g.id}
                className={selectedGeraetId === g.id ? 'sel' : ''}
                onClick={() => setSelectedGeraetId(g.id)}
              >
                <td>{g.id}</td>
                <td>{g.bezeichnung}</td>
                <td>{g.art_typ}</td>
                <td style={{ textAlign: 'center' }}>{g.risikoklasse}</td>
                <td>{g.betreiber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getGeraete, getHersteller, getBetreiber } from './api/api.js'
import Toolbar      from './components/Toolbar.jsx'
import DeviceList   from './components/DeviceList.jsx'
import DeviceDetail from './components/DeviceDetail.jsx'
import StatusBar    from './components/shared/StatusBar.jsx'

const AppContext = createContext()

export function useApp() {
  return useContext(AppContext)
}

export default function App() {
  const [geraeteList,    setGeraeteList]    = useState([])
  const [selectedGeraetId, setSelectedGeraetId] = useState(null)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [statusMessage,  setStatusMessage]  = useState('Bereit')
  const [herstellerList, setHerstellerList] = useState([])
  const [betreiberList,  setBetreiberList]  = useState([])

  const loadGeraete = useCallback(async () => {
    try {
      const data = await getGeraete(searchQuery)
      setGeraeteList(data)
      setStatusMessage(`${data.length} Gerät(e) geladen`)
    } catch (e) {
      setStatusMessage('Fehler: ' + e.message)
    }
  }, [searchQuery])

  const loadHersteller = useCallback(async () => {
    const data = await getHersteller()
    setHerstellerList(data)
    return data
  }, [])

  const loadBetreiber = useCallback(async () => {
    const data = await getBetreiber()
    setBetreiberList(data)
    return data
  }, [])

  useEffect(() => { loadGeraete() }, [loadGeraete])

  const ctx = {
    geraeteList,
    selectedGeraetId,
    setSelectedGeraetId,
    searchQuery,
    setSearchQuery,
    statusMessage,
    setStatus: setStatusMessage,
    herstellerList,
    betreiberList,
    loadGeraete,
    loadHersteller,
    loadBetreiber,
  }

  return (
    <AppContext.Provider value={ctx}>
      <header id="toolbar">
        <Toolbar />
      </header>
      <div id="main">
        <DeviceList />
        <DeviceDetail />
      </div>
      <StatusBar />
    </AppContext.Provider>
  )
}

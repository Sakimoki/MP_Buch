import { useState, useEffect } from 'react'
import { getGeraetById } from '../api/api.js'
import { useApp } from '../App.jsx'
import GeraetedatenTab from './tabs/GeraetedatenTab.jsx'
import EinweisungenTab from './tabs/EinweisungenTab.jsx'
import UebergabenTab   from './tabs/UebergabenTab.jsx'
import PruefungenTab   from './tabs/PruefungenTab.jsx'
import DokumenteTab    from './tabs/DokumenteTab.jsx'
import VorkommnisseTab from './tabs/VorkommnisseTab.jsx'

const TABS = [
  { key: 'detail', label: 'Gerätedaten' },
  { key: 'einw',   label: 'Einweisungen' },
  { key: 'ueberg', label: 'Übergabe' },
  { key: 'pruef',  label: 'STK / Wartung' },
  { key: 'dok',    label: 'Gebrauchsanweisungen' },
  { key: 'vork',   label: 'Vorkommnisse' },
]

export default function DeviceDetail() {
  const { selectedGeraetId, setStatus } = useApp()
  const [activeTab, setActiveTab] = useState('detail')
  const [geraet, setGeraet]       = useState(null)

  useEffect(() => {
    if (!selectedGeraetId) { setGeraet(null); return }
    getGeraetById(selectedGeraetId)
      .then(setGeraet)
      .catch(e => setStatus('Fehler: ' + e.message))
  }, [selectedGeraetId])

  return (
    <div id="detail-panel">
      <div id="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="tab-detail" className={`tab-pane${activeTab === 'detail' ? ' active' : ''}`}>
        <GeraetedatenTab geraet={geraet} />
      </div>

      <div id="tab-einw" className={`tab-pane${activeTab === 'einw' ? ' active' : ''}`}>
        <EinweisungenTab geraetId={selectedGeraetId} />
      </div>

      <div id="tab-ueberg" className={`tab-pane${activeTab === 'ueberg' ? ' active' : ''}`}>
        <UebergabenTab geraetId={selectedGeraetId} />
      </div>

      <div id="tab-pruef" className={`tab-pane${activeTab === 'pruef' ? ' active' : ''}`}>
        <PruefungenTab geraetId={selectedGeraetId} />
      </div>

      <div id="tab-dok" className={`tab-pane${activeTab === 'dok' ? ' active' : ''}`}>
        <DokumenteTab geraetId={selectedGeraetId} />
      </div>

      <div id="tab-vork" className={`tab-pane${activeTab === 'vork' ? ' active' : ''}`}>
        <VorkommnisseTab geraetId={selectedGeraetId} />
      </div>
    </div>
  )
}

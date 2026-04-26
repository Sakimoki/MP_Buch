import { useApp } from '../../App.jsx'

export default function StatusBar() {
  const { statusMessage } = useApp()
  return <div id="statusbar">{statusMessage}</div>
}

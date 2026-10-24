import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ViewMemoryProvider } from './view-memory'
import './styles.css'
import './editorial.css'
import './luxe.css'

class StorageBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Never log private wardrobe data. */
  }
  render() {
    if (this.state.failed)
      return (
        <div className="fatal-error">
          <h1>MyStyle konnte nicht starten.</h1>
          <p>
            Lade die Seite erneut. Falls das Problem bleibt, prüfe, ob dein
            Browser lokale Speicherung (IndexedDB) erlaubt.
          </p>
          <p>
            Bitte lösche keine Website-Daten, wenn du deinen Kleiderschrank noch
            nicht gesichert hast.
          </p>
          <button className="button primary" onClick={() => location.reload()}>
            Erneut versuchen
          </button>
        </div>
      )
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StorageBoundary>
      <ViewMemoryProvider>
        <App />
      </ViewMemoryProvider>
    </StorageBoundary>
  </StrictMode>,
)

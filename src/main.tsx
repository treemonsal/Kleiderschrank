import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

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
          <p className="eyebrow">MYSTYLE</p>
          <h1>Ein kleiner Moment.</h1>
          <p>
            Die App konnte nicht geöffnet werden. Prüfe, ob dein Browser lokale
            Speicherung (IndexedDB) erlaubt, und lade die Seite erneut.
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
      <App />
    </StorageBoundary>
  </StrictMode>,
)

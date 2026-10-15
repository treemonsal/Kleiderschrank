import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronRight,
  Database,
  HardDrive,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  Smartphone,
} from 'lucide-react'
import {
  createDatabaseBackup,
  importFullBackup,
  MAX_BACKUP_BYTES,
  parseFullBackup,
  type BackupData,
} from './backup'
import { validateBackupPhotos } from './photos'
import type { Garment } from './model'
import { storageError } from './db'
import { ErrorMessage, Sheet } from './ui'

export type Theme = 'system' | 'light' | 'dark'
export function BackupView({
  items,
  theme,
  onTheme,
  notify,
}: {
  items: Garment[]
  theme: Theme
  onTheme: (theme: Theme) => void
  notify: (message: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const download = useRef<{ url: string; filename: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<BackupData | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [usage, setUsage] = useState<number>()
  const [persistent, setPersistent] = useState<boolean>()
  const [storageMessage, setStorageMessage] = useState('')
  const [exportLink, setExportLink] = useState<{
    url: string
    filename: string
  } | null>(null)
  const [help, setHelp] = useState(false)
  useEffect(() => {
    void navigator.storage
      ?.estimate?.()
      .then((result) => setUsage(result.usage))
      .catch(() => {})
    void navigator.storage
      ?.persisted?.()
      .then(setPersistent)
      .catch(() => {})
  }, [items.length])
  useEffect(
    () => () => {
      if (download.current) URL.revokeObjectURL(download.current.url)
    },
    [],
  )
  async function exportData() {
    setBusy(true)
    setError('')
    try {
      const json = await createDatabaseBackup()
      if (download.current) URL.revokeObjectURL(download.current.url)
      const next = {
        url: URL.createObjectURL(
          new Blob([json], { type: 'application/json' }),
        ),
        filename: `MyStyle-Sicherung-${new Date().toISOString().slice(0, 10)}.json`,
      }
      download.current = next
      setExportLink(next)
      const anchor = document.createElement('a')
      anchor.href = next.url
      anchor.download = next.filename
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      notify(
        'Sicherung erstellt. Bitte speichere die Datei an einem sicheren Ort.',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Die Sicherung konnte nicht erstellt werden.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="view settings-view">
      <header className="page-heading">
        <p className="eyebrow">DEIN PERSÖNLICHER RAUM</p>
        <h1>Gut aufgehoben.</h1>
        <p>Deine Stücke. Deine Daten. Deine Entscheidung.</p>
      </header>
      <section className="privacy-banner">
        <div className="privacy-icon">
          <LockKeyhole size={23} strokeWidth={1.5} />
        </div>
        <div>
          <h2>Privat ist hier der Standard.</h2>
          <p>
            Deine Fotos und Angaben bleiben auf diesem Gerät. Kein Konto, kein
            Tracking, keine Bildübertragung.
          </p>
        </div>
      </section>
      <section className="settings-section">
        <div className="section-heading">
          <h2>Deine Datensicherung</h2>
          <Database size={18} />
        </div>
        <p className="muted section-intro">
          Ein kleines Ritual, das deine Lieblingsstücke schützt.
        </p>
        <div className="settings-card">
          <button
            className="settings-action"
            disabled={busy}
            onClick={() => void exportData()}
          >
            <span className="action-icon">
              <ArrowDownToLine size={20} />
            </span>
            <span>
              <strong>
                {busy ? 'Bitte einen Moment …' : 'Sicherung exportieren'}
              </strong>
              <small>
                Alle {items.length} Stücke, Outfits & Vorlieben · JSON
              </small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button
            className="settings-action"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <span className="action-icon">
              <ArrowUpFromLine size={20} />
            </span>
            <span>
              <strong>Sicherung importieren</strong>
              <small>Datei prüfen und Bestand wiederherstellen</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Sicherungsdatei"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setBusy(true)
            setError('')
            try {
              if (file.size > MAX_BACKUP_BYTES)
                throw new Error('Die Sicherung ist grösser als 100 MB.')
              const data = parseFullBackup(await file.text())
              await validateBackupPhotos(data.garments)
              setPending(data)
              setMode('merge')
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : 'Die Datei konnte nicht gelesen werden.',
              )
            } finally {
              setBusy(false)
            }
          }}
        />
        {exportLink && (
          <a
            className="download-link"
            href={exportLink.url}
            download={exportLink.filename}
          >
            Sicherung erneut herunterladen
          </a>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="storage-note">
          <ShieldCheck size={19} />
          <p>
            iOS kann Website-Daten entfernen. Sichere regelmässig in „Dateien“,
            besonders vor einem Geräte- oder Domainwechsel. Backups enthalten
            unverschlüsselte private Fotos. Bis 100 MB und 1000 Stücke pro
            Sicherung.
          </p>
        </div>
      </section>
      <section className="settings-section">
        <div className="section-heading">
          <h2>So fühlt sich MyStyle an</h2>
          <Sun size={19} />
        </div>
        <div
          className="theme-picker"
          role="group"
          aria-label="Erscheinungsbild"
        >
          {(
            [
              { value: 'light', label: 'Hell', Icon: Sun },
              { value: 'dark', label: 'Dunkel', Icon: Moon },
              { value: 'system', label: 'System', Icon: Smartphone },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              aria-pressed={theme === value}
              className={theme === value ? 'selected' : ''}
              onClick={() => onTheme(value)}
            >
              <Icon size={19} strokeWidth={1.5} />
              <span>{label}</span>
              {theme === value && <Check size={14} />}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <div className="section-heading">
          <h2>Auf deinem Gerät</h2>
          <HardDrive size={18} />
        </div>
        <div className="settings-card storage-details">
          <p>
            <span>Lokaler Speicherbedarf</span>
            <strong>
              {usage === undefined
                ? 'Nicht verfügbar'
                : `${(usage / 1024 / 1024).toLocaleString('de-CH', { maximumFractionDigits: 1 })} MB`}
            </strong>
          </p>
          <p>
            <span>Beständiger Speicher</span>
            <strong>
              {persistent === true ? 'Vom Browser gewährt' : 'Nicht garantiert'}
            </strong>
          </p>
          {navigator.storage?.persist && (
            <button
              className="text-button"
              onClick={async () => {
                try {
                  const granted = await navigator.storage.persist()
                  setPersistent(granted)
                  setStorageMessage(
                    granted
                      ? 'Der Browser hat beständigen Speicher gewährt. Bitte trotzdem regelmässig sichern.'
                      : 'Der Browser hat die Anfrage nicht gewährt. Backups bleiben der zuverlässigste Schutz.',
                  )
                } catch {
                  setStorageMessage(
                    'Dieser Browser unterstützt die Speicheranfrage hier nicht.',
                  )
                }
              }}
            >
              Speicherschutz anfragen <ChevronRight size={15} />
            </button>
          )}
          {storageMessage && (
            <p className="muted" role="status">
              {storageMessage}
            </p>
          )}
        </div>
      </section>
      <button className="install-help" onClick={() => setHelp(true)}>
        <Smartphone size={23} strokeWidth={1.4} />
        <span>
          <strong>Ein Zuhause auf deinem iPhone</strong>
          <small>So legst du MyStyle auf den Home-Bildschirm.</small>
        </span>
        <ChevronRight size={18} />
      </button>
      <p className="app-signature">
        MyStyle <span>·</span> Mit weniger mehr du sein.
        <br />
        <small>Version 0.2 · Lokal & persönlich</small>
      </p>
      {pending && (
        <Sheet
          title="Deine Sicherung ist bereit."
          eyebrow="IMPORT PRÜFEN"
          onClose={() => {
            if (!busy) setPending(null)
          }}
        >
          <div className="import-content">
            <p>
              Die Datei enthält{' '}
              <strong>{pending.garments.length} Stücke</strong>, davon{' '}
              <strong>
                {pending.garments.filter((i) => i.photo).length} mit Foto
              </strong>
              . Ausserdem: {pending.outfits.length} Outfits und{' '}
              {pending.feedback.length} Rückmeldungen. Wie möchtest du sie
              übernehmen?
            </p>
            <label
              className={`import-choice ${mode === 'merge' ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="import-mode"
                checked={mode === 'merge'}
                disabled={busy}
                onChange={() => setMode('merge')}
              />
              <span>
                <strong>Zusammenführen</strong>
                <small>
                  Neue Stücke ergänzen. Bei gleicher ID bleibt die neuere
                  Version erhalten.
                </small>
              </span>
            </label>
            <label
              className={`import-choice ${mode === 'replace' ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="import-mode"
                checked={mode === 'replace'}
                disabled={busy}
                onChange={() => setMode('replace')}
              />
              <span>
                <strong>Vorhandenen Bestand ersetzen</strong>
                <small>
                  Alle {items.length} vorhandenen Stücke, Outfits und Vorlieben
                  werden durch die Sicherung ersetzt. Alte Sicherungen enthalten
                  noch keine Outfits. Exportiere zuerst ein Backup.
                </small>
              </span>
            </label>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <button
              className={`button full ${mode === 'replace' ? 'danger' : 'primary'}`}
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError('')
                try {
                  const count = await importFullBackup(pending, mode)
                  setPending(null)
                  notify(
                    `${count} ${count === 1 ? 'Stück' : 'Stücke'} importiert.`,
                  )
                } catch (err) {
                  setError(storageError(err))
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy
                ? 'Wird importiert …'
                : mode === 'replace'
                  ? 'Bestand ersetzen und importieren'
                  : 'Sicherung importieren'}
            </button>
          </div>
        </Sheet>
      )}
      {help && (
        <Sheet
          title="Immer griffbereit."
          eyebrow="MYSTYLE AUF DEINEM IPHONE"
          onClose={() => setHelp(false)}
        >
          <div className="install-content">
            <ol>
              <li>
                Öffne die HTTPS-Adresse von MyStyle in <strong>Safari</strong>.
              </li>
              <li>
                Tippe auf <strong>Teilen</strong> und dann auf{' '}
                <strong>Zum Home-Bildschirm</strong>.
              </li>
              <li>
                Bestätige mit <strong>Hinzufügen</strong> und öffne die App über
                das neue Symbol.
              </li>
              <li>
                Lade MyStyle einmal vollständig online. Danach ist dein
                Kleiderschrank auch offline verfügbar.
              </li>
            </ol>
            <p className="muted">
              Safari und die installierte App können getrennte Datenbestände
              verwenden. Übertrage deine Stücke bei Bedarf mit Export und
              Import. Im privaten Modus ist die Aufbewahrung besonders
              unzuverlässig.
            </p>
          </div>
        </Sheet>
      )}
    </div>
  )
}

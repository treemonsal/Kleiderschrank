import { EverydaySettings } from './EverydaySettings'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Database,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import {
  createDatabaseBackupExport,
  importFullBackup,
  MAX_BACKUP_BYTES,
  parseFullBackup,
  type BackupData,
} from './backup'
import { validateBackupPhotos } from './photos'
import type { Garment } from './model'
import { storageError } from './db'
import { ErrorMessage, Sheet } from './ui'
import { updateBackupReminder } from './backup-reminder'
import { AISettings } from './AISettings'
import { DriveSyncCard } from './DriveSync'
import { StyleProfileCard } from './StyleProfile'
import { version } from '../package.json'

export function BackupView({
  items,
  notify,
}: {
  items: Garment[]
  notify: (message: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const download = useRef<{ url: string; filename: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<BackupData | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [exportLink, setExportLink] = useState<{
    url: string
    filename: string
  } | null>(null)
  const [help, setHelp] = useState(false)
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
      const exported = await createDatabaseBackupExport()
      const json = exported.json
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
      await updateBackupReminder({
        lastExportedAt: exported.exportedAt,
        lastExportedRevision: exported.revision,
      }).catch(() =>
        setError(
          'Die Datei ist bereit. Die Erinnerung konnte nicht aktualisiert werden.',
        ),
      )
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
        <h1>Einstellungen</h1>
        <p className="page-sub">Profil, KI und Sicherung.</p>
      </header>
      <AISettings />
      <StyleProfileCard items={items} notify={notify} />
      <EverydaySettings />
      <DriveSyncCard />
      <section className="settings-section" id="backup-section" tabIndex={-1}>
        <div className="section-heading">
          <h2>Sicherung</h2>
          <Database size={18} />
        </div>
        <p className="muted section-intro">
          Exportiere regelmässig eine Sicherung in „Dateien“.
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
                Alle {items.length} Stücke, Outfits, Kalender & Vorlieben · JSON
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
            iOS kann Website-Daten löschen. Sichere regelmässig in „Dateien“.
          </p>
        </div>
      </section>
      <button className="install-help" onClick={() => setHelp(true)}>
        <Smartphone size={23} strokeWidth={1.4} />
        <span>
          <strong>Auf dem Home-Bildschirm installieren</strong>
          <small>Anleitung für Safari</small>
        </span>
        <ChevronRight size={18} />
      </button>
      <p className="app-signature">
        MyStyle <span>·</span> Version {version}
      </p>
      {pending && (
        <Sheet
          title="Sicherung prüfen"
          eyebrow="Import"
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
              {pending.feedback.length} Rückmeldungen sowie{' '}
              {pending.calendar?.length ?? 0} Kalendertage
              {pending.weather ? ' und ein gespeicherter Wetterort' : ''}. Dazu:{' '}
              {
                Object.keys(pending.preferences?.styleInterview?.answers ?? {})
                  .length
              }{' '}
              vertiefte Stilantworten und{' '}
              {(pending.chat?.messages.length ?? 0) / 2} Gesprächsrunden. Wie
              möchtest du sie übernehmen?
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
                  Alle {items.length} vorhandenen Stücke, Outfits,
                  Rückmeldungen, Stilvorlieben einschliesslich vertiefter
                  Antworten, Gesprächsverlauf, Kalendereinträge und
                  gespeicherten Wetterdaten werden vollständig durch diese
                  Sicherung ersetzt. Datenarten, die in älteren Sicherungen
                  fehlen, werden dabei gelöscht. Exportiere zuerst ein Backup.
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
          title="Auf dem iPhone installieren"
          eyebrow="Installation"
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

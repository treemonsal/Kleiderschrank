import { useEffect, useId, useRef, useState } from 'react'
import { Pipette, X } from 'lucide-react'
import {
  nearestWardrobeColor,
  readPhotoPixels,
  samplePhotoColor,
  type PhotoPixels,
} from './photo-color'
import { ErrorMessage } from './ui'

export function PhotoColorPicker({
  photo,
  onChoose,
}: {
  photo: Blob
  onChoose: (color: string) => void
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <div className="photo-color-assist">
      <button
        type="button"
        className="button secondary full"
        ref={trigger}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Pipette size={18} /> Farbe aus Foto wählen
      </button>
      {open && (
        <div id={id} className="photo-color-panel">
          <div className="photo-color-heading">
            <h3>Deine Farbprobe</h3>
            <button
              type="button"
              className="icon-button"
              aria-label="Farbprobe schliessen"
              onClick={() => {
                setOpen(false)
                trigger.current?.focus()
              }}
            >
              <X size={19} />
            </button>
          </div>
          <PhotoSampler photo={photo} onChoose={onChoose} />
        </div>
      )}
    </div>
  )
}

function PhotoSampler({
  photo,
  onChoose,
}: {
  photo: Blob
  onChoose: (color: string) => void
}) {
  const [loaded, setLoaded] = useState<{ photo: Blob; pixels: PhotoPixels }>()
  const [error, setError] = useState('')
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const canvas = useRef<HTMLCanvasElement>(null)
  const instructions = useId()
  const pixels = loaded?.photo === photo ? loaded.pixels : undefined
  useEffect(() => {
    let active = true
    void readPhotoPixels(photo)
      .then((next) => {
        if (active) {
          setLoaded({ photo, pixels: next })
          setError('')
        }
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : 'Die Farbprobe konnte nicht geöffnet werden.',
          )
      })
    return () => {
      active = false
    }
  }, [photo])
  useEffect(() => {
    if (!pixels || !canvas.current) return
    canvas.current
      .getContext('2d')
      ?.putImageData(
        new ImageData(
          new Uint8ClampedArray(pixels.data),
          pixels.width,
          pixels.height,
        ),
        0,
        0,
      )
  }, [pixels])
  const rgb = pixels && samplePhotoColor(pixels, position.x, position.y)
  const result = rgb && nearestWardrobeColor(rgb)
  function move(axis: 'x' | 'y', value: number) {
    setPosition((old) => ({
      ...old,
      [axis]: Math.max(0, Math.min(100, value)),
    }))
  }
  return (
    <>
      <p id={instructions}>
        Tippe auf eine einfarbige Stelle am Kleidungsstück. Die Regler helfen
        beim genauen Auswählen.
      </p>
      {error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : !pixels ? (
        <p role="status">Farbprobe wird vorbereitet …</p>
      ) : (
        <>
          <button
            type="button"
            className="color-sample-photo"
            aria-label="Farbstelle im Foto wählen"
            aria-describedby={instructions}
            style={{ width: pixels.width }}
            onClick={(event) => {
              if (event.detail === 0) return
              const rect = event.currentTarget.getBoundingClientRect()
              move('x', ((event.clientX - rect.left) / rect.width) * 100)
              move('y', ((event.clientY - rect.top) / rect.height) * 100)
            }}
            onKeyDown={(event) => {
              const deltas: Record<string, ['x' | 'y', number]> = {
                ArrowLeft: ['x', -2],
                ArrowRight: ['x', 2],
                ArrowUp: ['y', -2],
                ArrowDown: ['y', 2],
              }
              const delta = deltas[event.key]
              if (delta) {
                event.preventDefault()
                move(delta[0], position[delta[0]] + delta[1])
              }
            }}
          >
            <canvas
              ref={canvas}
              width={pixels.width}
              height={pixels.height}
              aria-hidden="true"
            />
            <span
              className="color-sample-marker"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              aria-hidden="true"
            />
          </button>
          <div className="color-sample-controls">
            <label>
              Position waagrecht
              <input
                type="range"
                min="0"
                max="100"
                value={position.x}
                onChange={(e) => move('x', Number(e.target.value))}
              />
            </label>
            <label>
              Position senkrecht
              <input
                type="range"
                min="0"
                max="100"
                value={position.y}
                onChange={(e) => move('y', Number(e.target.value))}
              />
            </label>
          </div>
          {result ? (
            <div className="color-sample-result">
              <p role="status">
                <span
                  className="color-sample-swatch"
                  style={{ backgroundColor: result.hex }}
                  aria-hidden="true"
                />
                Nächste Kleiderschrankfarbe: <strong>{result.name}</strong>
              </p>
              <button
                type="button"
                className="button secondary full"
                onClick={() => onChoose(result.name)}
              >
                {result.name} übernehmen
              </button>
            </div>
          ) : (
            <p role="status">
              An dieser Stelle ist keine Farbe erkennbar. Bitte wähle eine
              andere Stelle.
            </p>
          )}
        </>
      )}
      <p className="photo-color-note">
        Licht, Schatten und Hintergrund verändern die Farbe. Prüfe den Vorschlag
        selbst; bei Mustern kannst du „Bunt“ wählen. Dein Foto bleibt
        unverändert. Alles wird auf deinem Gerät verarbeitet.
      </p>
    </>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { COLORS, type Garment } from './model'
import { Sheet } from './ui'
import { wardrobeInsights, type RankedPiece } from './wardrobe-insights'
import { formatChf } from './wear-stats'

function PieceList({
  pieces,
  detail,
  onOpen,
}: {
  pieces: { item: Garment; value?: number }[]
  detail: (entry: RankedPiece) => string
  onOpen: (id: string) => void
}) {
  return (
    <ul className="insight-list">
      {pieces.map((entry) => (
        <li key={entry.item.id}>
          <button onClick={() => onOpen(entry.item.id)}>
            <span>{entry.item.name}</span>
            <small>{detail(entry as RankedPiece)}</small>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Wardrobe analytics: value, usage, colours and how well pieces combine. */
export function InsightsSheet({
  items,
  onOpen,
  onClose,
}: {
  items: Garment[]
  onOpen: (id: string) => void
  onClose: () => void
}) {
  const data = useLiveQuery(async () => ({
    calendar: await db.calendar.toArray(),
    outfits: await db.outfits.toArray(),
  }))
  const insights = data
    ? wardrobeInsights(items, data.calendar, data.outfits)
    : undefined
  const open = (id: string) => {
    onClose()
    onOpen(id)
  }
  const maxColor = Math.max(1, ...(insights?.colors.map((c) => c.count) ?? []))
  return (
    <Sheet title="Auswertung" eyebrow="Kleiderschrank" onClose={onClose}>
      {!insights ? (
        <p role="status">Wird berechnet …</p>
      ) : (
        <div className="insights">
          <div className="insight-tiles">
            <div>
              <strong>{insights.count}</strong>
              <span>Stücke</span>
            </div>
            <div>
              <strong>
                {insights.priced ? formatChf(insights.value) : '–'}
              </strong>
              <span>
                {insights.priced === insights.count || !insights.priced
                  ? 'Garderobenwert'
                  : `Wert von ${insights.priced} Stücken`}
              </span>
            </div>
            <div>
              <strong>{insights.wornLast30}</strong>
              <span>Tragetage in 30 Tagen</span>
            </div>
          </div>
          {insights.hints.map((hint) => (
            <p key={hint} className="insight-hint">
              {hint}
            </p>
          ))}
          {!!insights.mostWorn.length && (
            <section>
              <h3>Am meisten getragen</h3>
              <PieceList
                pieces={insights.mostWorn}
                detail={(entry) => `${entry.value}×`}
                onOpen={open}
              />
            </section>
          )}
          {!!insights.bestValue.length && (
            <section>
              <h3>Bester Preis pro Tragen</h3>
              <PieceList
                pieces={insights.bestValue}
                detail={(entry) => `${formatChf(entry.value)} pro Tragen`}
                onOpen={open}
              />
            </section>
          )}
          {!!insights.allrounders.length && (
            <section>
              <h3>Allrounder</h3>
              <p className="muted">Stücke mit den meisten möglichen Looks.</p>
              <PieceList
                pieces={insights.allrounders}
                detail={(entry) => `${entry.value} Looks`}
                onOpen={open}
              />
            </section>
          )}
          {!!insights.loners.length && (
            <section>
              <h3>Ohne Partner</h3>
              <p className="muted">
                Dazu fehlt noch ein passendes Gegenstück für einen ganzen Look.
              </p>
              <PieceList
                pieces={insights.loners.map((item) => ({ item }))}
                detail={() => 'Kein Look möglich'}
                onOpen={open}
              />
            </section>
          )}
          {!!insights.idle.length && (
            <section>
              <h3>Seit 90 Tagen nicht getragen</h3>
              <PieceList
                pieces={insights.idle.map((item) => ({ item }))}
                detail={() => 'Behalten, kombinieren oder weggeben?'}
                onOpen={open}
              />
            </section>
          )}
          {!!insights.neverWorn.length && (
            <section>
              <h3>Noch nie getragen</h3>
              <PieceList
                pieces={insights.neverWorn
                  .slice(0, 8)
                  .map((item) => ({ item }))}
                detail={(entry) => entry.item.category}
                onOpen={open}
              />
            </section>
          )}
          {!!insights.colors.length && (
            <section>
              <h3>Farben</h3>
              <ul className="color-bars">
                {insights.colors.map(({ color, count }) => (
                  <li key={color}>
                    <span
                      className="color-swatch"
                      style={{
                        background: COLORS.find((c) => c.name === color)?.hex,
                      }}
                    />
                    <span className="color-name">{color}</span>
                    <span className="color-bar">
                      <span style={{ width: `${(count / maxColor) * 100}%` }} />
                    </span>
                    <span className="color-count">{count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Sheet>
  )
}

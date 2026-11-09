import { Camera, Images, PenLine, Search } from 'lucide-react'
import { Sheet } from './ui'

/** The middle button: how a new piece comes in, chosen from below. */
export function AddSheet({
  onClose,
  onFiles,
  onSearch,
  onManual,
}: {
  onClose: () => void
  onFiles: (files: File[]) => void
  /** Absent when no search server is configured. */
  onSearch?: () => void
  onManual: () => void
}) {
  const take = (list: FileList | null) => {
    const files = [...(list ?? [])]
    if (files.length) onFiles(files)
  }
  return (
    <Sheet title="Hinzufügen" className="add-sheet" onClose={onClose}>
      <div className="add-options">
        <label className="add-option">
          <Camera size={24} strokeWidth={1.6} />
          <span>Foto aufnehmen</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Foto aufnehmen"
            onChange={(event) => take(event.target.files)}
          />
        </label>
        <label className="add-option">
          <Images size={24} strokeWidth={1.6} />
          <span>Aus Galerie wählen</span>
          <input
            type="file"
            accept="image/*"
            multiple
            aria-label="Aus Galerie wählen"
            onChange={(event) => take(event.target.files)}
          />
        </label>
        {onSearch && (
          <button className="add-option" onClick={onSearch}>
            <Search size={24} strokeWidth={1.6} />
            <span>Online suchen</span>
          </button>
        )}
        <button className="add-option" onClick={onManual}>
          <PenLine size={24} strokeWidth={1.6} />
          <span>Ohne Foto eintragen</span>
        </button>
      </div>
    </Sheet>
  )
}

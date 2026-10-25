import { GarmentSketch } from './GarmentSketch'

/** A small outfit drawn from the garment sketches; decorative only. */
export function EmptyIllustration() {
  return (
    <div className="empty-illustration" aria-hidden="true">
      <span className="tilt-left">
        <GarmentSketch category="Oberteile" color="Blau" />
      </span>
      <span>
        <GarmentSketch category="Hosen" color="Beige" />
      </span>
      <span className="tilt-right">
        <GarmentSketch category="Schuhe" color="Braun" />
      </span>
    </div>
  )
}

/**
 * Springs as Apple describes them (Designing Fluid Interfaces, WWDC 2018):
 * a damping ratio (1 = no overshoot) and a response in seconds instead of
 * a fixed duration. Springs start from the current value and velocity, so
 * a moving sheet can be grabbed and redirected at any instant.
 */

export interface SpringConfig {
  /** 1 = critically damped, below 1 overshoots. */
  damping: number
  /** Seconds to (nearly) reach the target; not a duration. */
  response: number
}

export interface SpringState {
  value: number
  /** Units per second. */
  velocity: number
}

/** Calm default for UI that was not thrown. */
export const SPRING_DEFAULT: SpringConfig = { damping: 1, response: 0.4 }
/** Drawer or sheet after a gesture: a touch of momentum. */
export const SPRING_SHEET: SpringConfig = { damping: 0.86, response: 0.32 }

/** Advances a unit-mass spring by dt seconds (small fixed substeps). */
export function stepSpring(
  state: SpringState,
  target: number,
  config: SpringConfig,
  dt: number,
): SpringState {
  const stiffness = ((2 * Math.PI) / config.response) ** 2
  const friction = (4 * Math.PI * config.damping) / config.response
  let { value, velocity } = state
  const steps = Math.max(1, Math.ceil(dt / 0.004))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    const acceleration = -stiffness * (value - target) - friction * velocity
    velocity += acceleration * h
    value += velocity * h
  }
  return { value, velocity }
}

/** Close enough to rest that the last frame can snap to the target. */
export function springSettled(
  state: SpringState,
  target: number,
  precision = 0.5,
): boolean {
  return (
    Math.abs(state.value - target) < precision &&
    Math.abs(state.velocity) < precision * 10
  )
}

/**
 * Where a flick would come to rest, like scroll deceleration
 * (Apple's sample code; 0.998 is the normal scroll feel).
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/** Past a boundary the element follows less and less. */
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55,
): number {
  if (dimension <= 0) return 0
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  )
}

/** Release velocity from the last ~100 ms of pointer samples (px/s). */
export function releaseVelocity(
  samples: { value: number; time: number }[],
  now = samples.at(-1)?.time ?? 0,
): number {
  const recent = samples.filter((sample) => now - sample.time <= 100)
  if (recent.length < 2) return 0
  const first = recent[0]
  const last = recent.at(-1)!
  const elapsed = (last.time - first.time) / 1000
  return elapsed > 0 ? (last.value - first.value) / elapsed : 0
}

export interface SpringAnimation {
  /** Stops where it is and returns the live value and velocity. */
  stop(): SpringState
}

/** Runs a spring on the display clock until it settles. */
export function animateSpring(options: {
  from: SpringState
  to: number
  config?: SpringConfig
  onUpdate: (value: number) => void
  onComplete?: () => void
  precision?: number
}): SpringAnimation {
  const config = options.config ?? SPRING_DEFAULT
  let state = { ...options.from }
  let last: number | undefined
  let frame = 0
  let running = true
  const tick = (time: number) => {
    if (!running) return
    const dt =
      last === undefined ? 1 / 60 : Math.min((time - last) / 1000, 1 / 30)
    last = time
    state = stepSpring(state, options.to, config, dt)
    if (springSettled(state, options.to, options.precision)) {
      state = { value: options.to, velocity: 0 }
      running = false
      options.onUpdate(state.value)
      options.onComplete?.()
      return
    }
    options.onUpdate(state.value)
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return {
    stop() {
      running = false
      cancelAnimationFrame(frame)
      return { ...state }
    },
  }
}

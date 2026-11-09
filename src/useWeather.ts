import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { localDay } from './calendar'
import { loadWeather, weatherFresh, type WeatherState } from './weather'

export function useClock() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const timer = window.setInterval(tick, 60000)
    window.addEventListener('pageshow', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pageshow', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return now
}
export function weatherForToday(cache: WeatherState | undefined, now: number) {
  return cache?.report.days.find((item) => item.day === localDay(new Date(now)))
}
// One refresh per saved forecast/day while online. No geolocation and no retry loop.
export function useSavedWeatherRefresh(online: boolean) {
  const snapshot = useLiveQuery(() =>
    db
      .transaction('r', db.weather, db.preferences, async () => ({
        cache: await db.weather.get('local'),
        enabled: (await db.preferences.get('personal'))?.useWeather !== false,
      }))
      .catch(() => undefined),
  )
  const now = useClock()
  const attempted = useRef(new Set<string>())
  const cache = snapshot?.cache
  const enabled = snapshot?.enabled
  useEffect(() => {
    if (
      !cache ||
      !enabled ||
      !online ||
      (weatherFresh(cache.report, now) && weatherForToday(cache, now))
    )
      return
    const key = `${cache.location.latitude}:${cache.location.longitude}:${cache.updatedAt}:${localDay(new Date(now))}`
    if (attempted.current.has(key)) return
    attempted.current.add(key)
    const controller = new AbortController()
    void loadWeather(cache.location, controller.signal)
      .then(async (report) => {
        if (controller.signal.aborted) return
        await db.transaction('rw', db.weather, db.preferences, async () => {
          const current = await db.weather.get('local')
          if (
            !controller.signal.aborted &&
            current?.updatedAt === cache.updatedAt &&
            current.location.latitude === cache.location.latitude &&
            current.location.longitude === cache.location.longitude &&
            (await db.preferences.get('personal'))?.useWeather !== false
          )
            await db.weather.put(report)
        })
      })
      .catch(() => {
        /* Cached forecast remains visible, marked as stale. */
      })
    return () => {
      controller.abort()
      attempted.current.delete(key)
    }
    // Clock ticks update freshness without aborting an in-flight request every minute.
  }, [
    cache?.updatedAt,
    cache?.location.latitude,
    cache?.location.longitude,
    enabled,
    online,
    !!cache &&
      (!weatherFresh(cache.report, now) || !weatherForToday(cache, now)),
    localDay(new Date(now)),
  ])
}

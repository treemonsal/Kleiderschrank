import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from 'lucide-react'
export function WeatherSymbol({
  code,
  size = 20,
}: {
  code?: number
  size?: number
}) {
  const Icon =
    code === undefined
      ? CloudSun
      : code === 0
        ? Sun
        : code <= 2
          ? CloudSun
          : code === 3
            ? Cloud
            : code <= 48
              ? CloudFog
              : code <= 67 || (code >= 80 && code <= 82)
                ? CloudRain
                : code <= 86
                  ? CloudSnow
                  : CloudLightning
  return <Icon size={size} aria-hidden="true" />
}

import { useCallback, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import {
  computeResultMinZoom,
  shiftGuessLngForDisplay,
} from '../lib/mapFit'
import { GestureHandling } from 'leaflet-gesture-handling'
import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.css'

L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

type LatLng = { lat: number; lng: number }

type MapBoardProps = {
  guess: LatLng | null
  target: LatLng | null
  onGuess: (pos: LatLng) => void
  disabled: boolean
  reducedMotion: boolean
  fitGuessAndTarget?: boolean
  /** When false, no instruction line under the map (result view). */
  showInstructions?: boolean
  coarsePointer?: boolean
  /** Result screen: dynamic minZoom + dateline-aware fit (padding 24px). */
  resultMapFit?: boolean
}

function ClickLayer({
  onGuess,
  disabled,
}: {
  onGuess: (pos: LatLng) => void
  disabled: boolean
}) {
  useMapEvents({
    click(e) {
      if (disabled) return
      onGuess({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function GestureHandlingLayer() {
  const map = useMap()
  useEffect(() => {
    const withGesture = map as L.Map & {
      gestureHandling?: { enable: () => void }
    }
    withGesture.gestureHandling?.enable()
  }, [map])
  return null
}

function FitGuessTarget({
  guess,
  target,
  reducedMotion,
  enabled,
}: {
  guess: LatLng | null
  target: LatLng | null
  reducedMotion: boolean
  enabled: boolean
}) {
  const map = useMap()

  const refit = useCallback(() => {
    if (!enabled || !guess || !target) return
    map.invalidateSize()
    const bounds = L.latLngBounds(
      [guess.lat, guess.lng],
      [target.lat, target.lng],
    ).pad(0.12)
    map.fitBounds(bounds, {
      padding: [32, 32],
      animate: !reducedMotion,
      maxZoom: 6,
    })
  }, [enabled, guess, target, map, reducedMotion])

  useEffect(() => {
    refit()
    const t1 = window.setTimeout(refit, 100)
    const t2 = window.setTimeout(refit, 350)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [refit])

  useEffect(() => {
    window.addEventListener('resize', refit)
    window.addEventListener('orientationchange', refit)
    return () => {
      window.removeEventListener('resize', refit)
      window.removeEventListener('orientationchange', refit)
    }
  }, [refit])

  return null
}

function ResultFitGuessTarget({
  guess,
  target,
  reducedMotion,
  enabled,
}: {
  guess: LatLng | null
  target: LatLng | null
  reducedMotion: boolean
  enabled: boolean
}) {
  const map = useMap()

  const refit = useCallback(() => {
    if (!enabled || !guess || !target) return
    map.invalidateSize()
    const displayGuess = shiftGuessLngForDisplay(guess, target)
    const bounds = L.latLngBounds(
      [displayGuess.lat, displayGuess.lng],
      [target.lat, target.lng],
    )
    const size = map.getSize()
    let minZ = computeResultMinZoom(
      size.x,
      size.y,
      bounds.getNorth(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getWest(),
      24,
    )
    for (; minZ >= 0; minZ -= 1) {
      map.setMinZoom(minZ)
      map.fitBounds(bounds, {
        padding: [24, 24],
        animate: !reducedMotion,
        maxZoom: 12,
      })
      const pad = 24
      const inside = (lat: number, lng: number) => {
        const p = map.latLngToContainerPoint([lat, lng])
        return (
          p.x >= pad &&
          p.x <= size.x - pad &&
          p.y >= pad &&
          p.y <= size.y - pad
        )
      }
      if (
        inside(displayGuess.lat, displayGuess.lng) &&
        inside(target.lat, target.lng)
      ) {
        break
      }
    }
  }, [enabled, guess, target, map, reducedMotion])

  useEffect(() => {
    refit()
    const t1 = window.setTimeout(refit, 100)
    const t2 = window.setTimeout(refit, 350)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [refit])

  useEffect(() => {
    window.addEventListener('resize', refit)
    window.addEventListener('orientationchange', refit)
    return () => {
      window.removeEventListener('resize', refit)
      window.removeEventListener('orientationchange', refit)
    }
  }, [refit])

  return null
}

function MapInvalidateOnMount() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const t = window.setTimeout(() => map.invalidateSize(), 50)
    return () => window.clearTimeout(t)
  }, [map])
  return null
}

export function MapBoard({
  guess,
  target,
  onGuess,
  disabled,
  reducedMotion,
  fitGuessAndTarget = false,
  showInstructions = true,
  coarsePointer = false,
  resultMapFit = false,
}: MapBoardProps) {
  const nudge = useCallback(
    (dLat: number, dLng: number) => {
      if (disabled) return
      const base = guess ?? { lat: 20, lng: 0 }
      onGuess({
        lat: Math.max(-85, Math.min(85, base.lat + dLat)),
        lng: (((base.lng + dLng + 180) % 360) + 360) % 360 - 180,
      })
    },
    [disabled, guess, onGuess],
  )

  const onMapShellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || coarsePointer) return
    const step = e.shiftKey ? 5 : 1
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        nudge(step, 0)
        break
      case 'ArrowDown':
        e.preventDefault()
        nudge(-step, 0)
        break
      case 'ArrowLeft':
        e.preventDefault()
        nudge(0, -step)
        break
      case 'ArrowRight':
        e.preventDefault()
        nudge(0, step)
        break
      default:
        break
    }
  }

  const displayGuess =
    guess && target && resultMapFit
      ? shiftGuessLngForDisplay(guess, target)
      : guess

  const line =
    displayGuess && target
      ? [
          [displayGuess.lat, displayGuess.lng],
          [target.lat, target.lng],
        ]
      : null

  const mapOptions = {
    center: [20, 0] as [number, number],
    zoom: 2,
    minZoom: resultMapFit ? 0 : 2,
    maxZoom: 12,
    className: 'map-frame',
    scrollWheelZoom: true,
    zoomAnimation: !reducedMotion,
    fadeAnimation: !reducedMotion,
    markerZoomAnimation: !reducedMotion,
    gestureHandling: true,
  }

  return (
    <div
      className="map-shell"
      role="application"
      aria-label="World map pin placement"
      tabIndex={disabled || coarsePointer ? -1 : 0}
      onKeyDown={onMapShellKeyDown}
    >
      <MapContainer {...mapOptions}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInvalidateOnMount />
        <GestureHandlingLayer />
        <ClickLayer onGuess={onGuess} disabled={disabled} />
        {resultMapFit ? (
          <ResultFitGuessTarget
            guess={guess}
            target={target}
            reducedMotion={reducedMotion}
            enabled={fitGuessAndTarget}
          />
        ) : (
          <FitGuessTarget
            guess={guess}
            target={target}
            reducedMotion={reducedMotion}
            enabled={fitGuessAndTarget}
          />
        )}
        {displayGuess && (
          <Marker
            position={[displayGuess.lat, displayGuess.lng]}
            keyboard={false}
            title="Your guess"
          />
        )}
        {target && (
          <Marker
            position={[target.lat, target.lng]}
            keyboard={false}
            title="Actual location"
            icon={L.divIcon({
              className: 'target-pin',
              html: '<span aria-hidden="true" title="Actual location"></span>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          />
        )}
        {line && (
          <Polyline
            positions={line as [number, number][]}
            pathOptions={{
              color: '#ffd166',
              weight: 3,
              opacity: 0.95,
              dashArray: '8 6',
            }}
          />
        )}
      </MapContainer>
      {showInstructions && (
        <p className="map-hint">
          {coarsePointer ? (
            <>
              Tap the map to drop a pin. Drag to pan, pinch to zoom.
            </>
          ) : (
            <>
              Focus the map, then use arrow keys to move the pin (Shift = faster).
              Use the Lock in guess button to submit.
            </>
          )}
        </p>
      )}
    </div>
  )
}

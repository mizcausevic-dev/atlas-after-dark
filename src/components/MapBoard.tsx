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
  useEffect(() => {
    if (!enabled || !guess || !target) return
    const bounds = L.latLngBounds(
      [guess.lat, guess.lng],
      [target.lat, target.lng],
    )
    map.fitBounds(bounds, {
      padding: [48, 48],
      animate: !reducedMotion,
      maxZoom: 8,
    })
  }, [enabled, guess, target, map, reducedMotion])
  return null
}

export function MapBoard({
  guess,
  target,
  onGuess,
  disabled,
  reducedMotion,
  fitGuessAndTarget = false,
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
    if (disabled) return
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

  const line =
    guess && target
      ? [
          [guess.lat, guess.lng],
          [target.lat, target.lng],
        ]
      : null

  return (
    <div
      className="map-shell"
      role="application"
      aria-label="World map pin placement"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onMapShellKeyDown}
    >
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={12}
        className="map-frame"
        scrollWheelZoom
        zoomAnimation={!reducedMotion}
        fadeAnimation={!reducedMotion}
        markerZoomAnimation={!reducedMotion}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickLayer onGuess={onGuess} disabled={disabled} />
        <FitGuessTarget
          guess={guess}
          target={target}
          reducedMotion={reducedMotion}
          enabled={fitGuessAndTarget}
        />
        {guess && (
          <Marker
            position={[guess.lat, guess.lng]}
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
      <p className="map-hint">
        Focus the map, then use arrow keys to move the pin (Shift = faster). Use the
        Lock in guess button to submit.
      </p>
    </div>
  )
}

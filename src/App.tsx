import 'leaflet/dist/leaflet.css'
import './App.css'
import { MapBoard } from './components/MapBoard'
import { useGameSession } from './hooks/useGameSession'
import type { DifficultyMode } from '../shared/types'
import { formatDistance } from '../shared/haversine'

const MODES: { id: DifficultyMode; label: string; detail: string }[] = [
  {
    id: 'rookie',
    label: 'Rookie',
    detail: 'Gentler distance penalty. Good first pass.',
  },
  {
    id: 'daily',
    label: 'Daily Case',
    detail: 'Standard scoring. One shared puzzle per UTC day.',
  },
  {
    id: 'night-owl',
    label: 'Night Owl',
    detail: 'Harsh distance curve. For seasoned detectives.',
  },
]

function App() {
  const game = useGameSession()
  const highContrast = game.settings.highContrast

  return (
    <div className={`app ${highContrast ? 'high-contrast' : ''}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Working title</p>
          <h1>Atlas After Dark</h1>
        </div>
        {game.phase === 'playing' && (
          <div className="timer" aria-live="polite">
            Timer {game.timerLabel}
          </div>
        )}
      </header>

      {game.error && (
        <div className="banner error" role="alert">
          {game.error}
        </div>
      )}

      {game.phase === 'title' && (
        <section className="panel title-panel" aria-labelledby="intro-heading">
          <h2 id="intro-heading">Night photography location detective</h2>
          <p>
            Study the night scene, drop a pin on the map, then see how far you were
            from the real city. Three environmental clues unlock after your guess.
            Optional hints cost points.
          </p>
          <ol className="steps">
            <li>Pick a difficulty tier (three progression steps).</li>
            <li>Place a pin with mouse, touch, or keyboard arrows.</li>
            <li>Submit, then read distance, score, and clue breakdown.</li>
          </ol>
          <fieldset className="mode-picker">
            <legend>Difficulty</legend>
            {MODES.map((m) => (
              <label key={m.id} className="mode-option">
                <input
                  type="radio"
                  name="mode"
                  checked={game.settings.mode === m.id}
                  onChange={() =>
                    game.setSettings({ ...game.settings, mode: m.id })
                  }
                />
                <span>
                  <strong>{m.label}</strong>
                  <small>{m.detail}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="settings-row">
            <label>
              <input
                type="checkbox"
                checked={game.settings.highContrast}
                onChange={(e) =>
                  game.setSettings({
                    ...game.settings,
                    highContrast: e.target.checked,
                  })
                }
              />
              High contrast
            </label>
            <label>
              <input
                type="checkbox"
                checked={game.settings.reducedMotion}
                onChange={(e) =>
                  game.setSettings({
                    ...game.settings,
                    reducedMotion: e.target.checked,
                  })
                }
              />
              Reduce motion
            </label>
          </div>
          <p className="meta">
            Streak {game.progress.streak} · Best daily{' '}
            {game.progress.bestByMode.daily ?? '—'} ·{' '}
            {game.offline ? 'Offline fixture mode' : 'API-backed scoring'}
          </p>
          <button
            type="button"
            className="primary"
            disabled={game.loading}
            onClick={() => void game.startGame()}
          >
            {game.loading ? 'Loading case…' : 'Start tonight\'s case'}
          </button>
        </section>
      )}

      {game.phase === 'playing' && game.challenge && (
        <div className="play-grid">
          <section className="panel photo-panel" aria-label="Night photo evidence">
            <img
              src={game.challenge.imagePath}
              alt={`Night evidence still for ${game.challenge.title}`}
              className="evidence-photo"
            />
            <p className="caption">{game.challenge.title}</p>
            <div className="hints">
              <h3>Optional hints (−650 pts each)</h3>
              <ul>
                {game.challenge.hintTexts.map((text, i) => (
                  <li key={text}>
                    <button
                      type="button"
                      disabled={game.revealedHints[i]}
                      onClick={() => game.revealHint(i)}
                    >
                      {game.revealedHints[i] ? `Hint ${i + 1} revealed` : `Reveal hint ${i + 1}`}
                    </button>
                    {game.revealedHints[i] && <p>{text}</p>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="submit-row">
              <button
                type="button"
                className="primary"
                disabled={!game.guess || game.loading}
                onClick={() => void game.confirmGuess()}
              >
                {game.loading ? 'Calculating…' : 'Lock in guess'}
              </button>
              {!game.guess && (
                <p className="empty" role="status">
                  Place a pin on the map to continue.
                </p>
              )}
            </div>
          </section>
          <section className="panel map-panel">
            <MapBoard
              guess={game.guess}
              target={null}
              onGuess={game.setGuess}
              disabled={game.loading}
              reducedMotion={game.settings.reducedMotion}
            />
          </section>
        </div>
      )}

      {game.phase === 'result' && game.result && game.challenge && (
        <section className="panel result-panel" aria-live="polite">
          <h2>
            {game.result.city}, {game.result.country}
          </h2>
          <p className="distance">
            You were {formatDistance(game.result.distanceKm)} off.
          </p>
          <p className="score">Score {game.result.score} / 10,000</p>
          <dl className="score-breakdown">
            <div>
              <dt>Distance component</dt>
              <dd>{game.result.scoreBreakdown.distanceScore}</dd>
            </div>
            <div>
              <dt>Time bonus</dt>
              <dd>{game.result.scoreBreakdown.timeBonus}</dd>
            </div>
            <div>
              <dt>Hint penalty</dt>
              <dd>{game.result.scoreBreakdown.hintPenalty}</dd>
            </div>
            <div>
              <dt>Bullseye bonus</dt>
              <dd>{game.result.scoreBreakdown.bullseyeBonus}</dd>
            </div>
          </dl>
          <h3>Environmental clues</h3>
          <ol className="clues">
            {game.result.clueTexts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
          <div className="result-map">
            <MapBoard
              guess={game.result.guess}
              target={game.result.target}
              onGuess={() => {}}
              disabled
              reducedMotion={game.settings.reducedMotion}
            />
          </div>
          <button type="button" className="primary" onClick={game.restart}>
            Play again
          </button>
        </section>
      )}

      <footer className="footer">
        <p>
          Map © OpenStreetMap contributors. Demo night art is original SVG (not
          real photography). See docs/ASSET_RIGHTS-Cursor.md and docs/SCORING-Cursor.md.
        </p>
      </footer>
    </div>
  )
}

export default App

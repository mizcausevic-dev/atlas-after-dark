import 'leaflet/dist/leaflet.css'
import './App.css'
import { MapBoard } from './components/MapBoard'
import { useGameSession } from './hooks/useGameSession'
import type { DifficultyMode } from '../shared/types'
import { formatDistance } from '../shared/haversine'
import { MAX_SCORE } from '../shared/scoring'
import { assetUrl } from './lib/assetUrl'

const MODES: { id: DifficultyMode; label: string; detail: string }[] = [
  {
    id: 'rookie',
    label: 'Rookie',
    detail: 'Gentler distance decay. Good first pass.',
  },
  {
    id: 'daily',
    label: 'Daily Case',
    detail: 'One shared case per tier per UTC day.',
  },
  {
    id: 'night-owl',
    label: 'Night Owl',
    detail: 'Harsh distance curve. For seasoned detectives.',
  },
]

function ResultBody({
  game,
  showPracticeNote,
}: {
  game: ReturnType<typeof useGameSession>
  showPracticeNote?: boolean
}) {
  if (!game.result || !game.challenge) return null
  return (
    <>
      {(showPracticeNote ||
        game.result?.practice ||
        game.result?.scored === false) && (
        <p className="banner practice" role="status">
          Practice (unscored) — not saved to streak or best.
        </p>
      )}
      <h2>
        {game.result.city}, {game.result.country}
      </h2>
      <p className="distance">
        You were {formatDistance(game.result.distanceKm)} off.
      </p>
      <p className="score">
        Score {game.result.score} / {MAX_SCORE.toLocaleString()}
      </p>
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
          fitGuessAndTarget
        />
      </div>
    </>
  )
}

function App() {
  const game = useGameSession()
  const highContrast = game.settings.highContrast
  const reduceMotion = game.settings.reducedMotion

  return (
    <div
      className={`app ${highContrast ? 'high-contrast' : ''} ${reduceMotion ? 'reduce-motion' : ''}`}
    >
      <header className="topbar">
        <div>
          <p className="eyebrow">Working title</p>
          <h1>Atlas After Dark</h1>
        </div>
        {game.phase === 'playing' && (
          <div className="timer" aria-live="polite">
            Timer {game.timerLabel}
            {game.isPractice && (
              <span className="practice-tag"> · Practice</span>
            )}
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
            Streak {game.progress.streak} · Best ({game.settings.mode}){' '}
            {game.bestForSelectedMode ?? '—'} ·{' '}
            {game.offline
              ? 'Offline solo demo (GitHub Pages)'
              : 'Server session scoring'}
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
              src={assetUrl(game.challenge.imagePath)}
              alt={`Night evidence still for ${game.challenge.title}`}
              className="evidence-photo"
            />
            <p className="caption">{game.challenge.title}</p>
            <div className="hints">
              <h3>Optional hints (−650 pts each)</h3>
              <ul>
                {Array.from({ length: game.hintSlotCount }, (_, i) => (
                  <li key={`hint-${i}`}>
                    <button
                      type="button"
                      disabled={game.revealedHints[i] || game.loading}
                      onClick={() => void game.revealHint(i)}
                    >
                      {game.revealedHints[i] ? `Hint ${i + 1} revealed` : `Reveal hint ${i + 1}`}
                    </button>
                    {game.revealedHints[i] && game.hintTexts[i] && (
                      <p>{game.hintTexts[i]}</p>
                    )}
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

      {game.phase === 'daily-locked' && game.result && game.challenge && (
        <section className="panel result-panel" aria-live="polite">
          <p className="banner locked" role="status">
            You already scored today&apos;s {game.dailyMeta?.mode ?? 'daily'}{' '}
            case (UTC). Come back after midnight UTC for a new puzzle, or practice
            without affecting streak or best.
          </p>
          <ResultBody game={game} />
          <div className="result-actions">
            <button
              type="button"
              className="primary"
              disabled={game.loading}
              onClick={() => void game.startPractice()}
            >
              {game.loading ? 'Loading…' : 'Practice replay (unscored)'}
            </button>
            <button type="button" onClick={game.restart}>
              Back to title
            </button>
          </div>
        </section>
      )}

      {game.phase === 'result' && game.result && game.challenge && (
        <section className="panel result-panel" aria-live="polite">
          <ResultBody game={game} showPracticeNote={game.isPractice} />
          <button type="button" className="primary" onClick={game.restart}>
            Play again
          </button>
        </section>
      )}

      <footer className="footer">
        <p>
          Map © OpenStreetMap contributors. Demo night art is original SVG (not
          real photography).
        </p>
        <nav className="footer-docs" aria-label="Project documentation">
          <a href="https://github.com/mizcausevic-dev/atlas-after-dark/blob/main/docs/ASSET_RIGHTS-Cursor.md">
            Asset rights
          </a>
          <a href="https://github.com/mizcausevic-dev/atlas-after-dark/blob/main/docs/SCORING-Cursor.md">
            Scoring
          </a>
          <a href="https://github.com/mizcausevic-dev/atlas-after-dark/blob/main/docs/PRIVACY-Cursor.md">
            Privacy
          </a>
          <a href="https://github.com/mizcausevic-dev/atlas-after-dark/blob/main/docs/SECURITY-Cursor.md">
            Security
          </a>
        </nav>
      </footer>
    </div>
  )
}

export default App

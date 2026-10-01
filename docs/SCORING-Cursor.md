# Disclosed score formula

All values are integers after rounding. **MAX_SCORE = 6,300** (5,000 distance + 800 time + 500 bullseye).

```
distanceKm = haversine(guess, target)   // great-circle, Earth radius 6371 km

D = 2000 (Rookie) | 1500 (Daily) | 1000 (Night Owl)

distanceScore = max(0, round(5000 * exp(-distanceKm / D)))

timeBonusRaw = max(0, min(800, floor((120000 - elapsedMs) / 150)))
  // up to 800 pts if guess within 120s; 0 after 120s

timeBonus = floor(timeBonusRaw * (distanceScore / 5000))
  // fast guesses only help when you are geographically close

hintPenalty = hintsUsed * 650   // each of 3 optional hints

bullseyeBonus = 500 if distanceKm <= 0.05 else 0

raw = distanceScore + timeBonus - hintPenalty + bullseyeBonus
finalScore = clamp(raw, 0, 6300)
```

Distance display uses the same Haversine result, formatted to one decimal km (or meters if &lt; 1 km).

## Offline daily cap

GitHub Pages / `VITE_OFFLINE=true` builds store **one scored attempt per UTC date per difficulty mode** in `localStorage`. Practice replays do not update streak or best.

## Server mode

One guess per HMAC session token. There is not yet a global per-user daily cap beyond the token and client-side progress.

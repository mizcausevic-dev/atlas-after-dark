# Disclosed score formula

All values are integers after rounding.

```
distanceKm = haversine(guess, target)   // great-circle, Earth radius 6371 km

distanceScore = max(0, 5000 - distanceKm * M)
  M = 18 (Rookie) | 25 (Daily) | 32 (Night Owl)

timeBonus = max(0, min(800, floor((120000 - elapsedMs) / 150)))
  // up to 800 pts if guess within 120s; 0 after 120s

hintPenalty = hintsUsed * 650   // each of 3 optional hints

raw = distanceScore + timeBonus - hintPenalty
finalScore = clamp(raw, 0, 10000)
```

Perfect guess (≤ 0.05 km) adds a flat **500** “bullseye” bonus before clamp.

Distance display uses the same Haversine result, formatted to one decimal km (or meters if &lt; 1 km).

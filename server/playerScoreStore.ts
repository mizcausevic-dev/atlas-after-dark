import type { DifficultyMode } from '../shared/types.ts'

export class PlayerScoreStore {
  private scored = new Set<string>()

  private key(playerId: string, mode: DifficultyMode, date: string): string {
    return `${playerId}|${mode}|${date}`
  }

  hasScored(playerId: string, mode: DifficultyMode, date: string): boolean {
    return this.scored.has(this.key(playerId, mode, date))
  }

  markScored(playerId: string, mode: DifficultyMode, date: string): void {
    this.scored.add(this.key(playerId, mode, date))
  }
}

// src/utils/deckComparisonUtils.ts
import type { Deck, MatrixRow, Card } from './types'

/**
 * Builds a matrix where each row is a unique card,
 * and `counts[col]` is how many of that card each deck has.
 */
export function buildComparisonMatrix(decks: Deck[]): MatrixRow[] {
  const map = new Map<number, MatrixRow>()

  decks.forEach((deck, colIdx) => {
    deck.cards.forEach((card: Card) => {
      if (!map.has(card.id)) {
        map.set(card.id, {
          id: card.id,
          name: card.name,
          type: card.type,
          mana_cost: card.mana_cost,
          deckCounts: {},
        })
      }
      map.get(card.id)!.deckCounts[`deck_${deck.deck_id}`] = card.card_count
    })
  })

  const matrix = Array.from(map.values())
  matrix.sort((a, b) => {
    const aAll = Object.values(a.deckCounts).every(c => c > 0)
    const bAll = Object.values(b.deckCounts).every(c => c > 0)
    if (aAll !== bAll) return aAll ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return matrix
}

/**
 * Aggregates total card counts across only the locked decks.
 */
export function buildShoppingList(decks: Deck[]): Card[] {
  const locked = decks.filter(d => d.locked)
  const map = new Map<number, Card & { total: number }>()

  locked.forEach(deck => {
    deck.cards.forEach(card => {
      const prev = map.get(card.id)
      if (prev) {
        prev.total += card.card_count
      } else {
        map.set(card.id, { ...card, total: card.card_count })
      }
    })
  })

  return Array.from(map.values())
}

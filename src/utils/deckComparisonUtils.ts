// src/utils/deckComparisonUtils.ts
import type { Deck, MatrixRow, Card } from './types'

const base_url = "http://localhost:80";
/**
 * Builds a matrix where each row is a unique card,
 * and `counts[col]` is how many of that card each deck has.
 */
export function buildComparisonMatrix(decks: Deck[]): MatrixRow[] {
  const map = new Map<number, MatrixRow>()

  decks.forEach((deck, colIdx) => {
    deck.cards.forEach((card: Card, i) => {
    if (!card || typeof card.id !== 'number') {
      console.error(`Null or invalid card at deck ${deck.deck_id}, index ${i}:`, card)
      debugger
      return
    }

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
export async function buildShoppingList(decks: Deck[]): Promise<Card[]> {
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

  const shoppingList = Array.from(map.values())
  const normalizedIds = shoppingList.map(card => card.id)

  await fetchPricesForShoppingList(normalizedIds)

  return shoppingList
}


async function fetchPricesForShoppingList(normalizedIds: number[]): Promise<void> {
  const response = await fetch(`${base_url}/api/fetch-card-prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_data_normalized_ids: normalizedIds }),
  })

  const prices = await response.json()

  // You can now attach prices to cards, cache them, or pass to CSV export
  console.log('Fetched prices:', prices)
}

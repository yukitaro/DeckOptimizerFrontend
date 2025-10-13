// src/utils/deckComparisonUtils.ts
import type { Deck, MatrixRow, Card } from './types'

const base_url = "http://localhost:80";
/**
 * Builds a matrix where each row is a unique card,
 * and `counts[col]` is how many of that card each deck has.
 */
export function buildComparisonMatrix(decks: Deck[]): MatrixRow[] {
  const map = new Map<string, MatrixRow>()

  decks.forEach((deck, colIdx) => {
    deck.cards.forEach((card: Card, i) => {
      if (!card || typeof card.id !== 'number') {
        console.error(`Null or invalid card at deck ${deck.deck_id}, index ${i}:`, card)
        debugger
        return
      }
      const key = `${card.id}_main}`

      if (!map.has(key)) {
        map.set(key, {
          id: card.id,
          name: card.name,
          type: card.type,
          mana_cost: card.mana_cost,
          deckCounts: {},
        })
      }
      map.get(key)!.deckCounts[`deck_${deck.deck_id}_main`] = card.card_count
    })
    deck.sideboard_cards?.forEach((card: Card, i) => {
      const key = `${card.id}_side}`

      if (!map.has(key)) {
        map.set(key, {
          id: card.id,
          name: card.name,
          type: "Sideboard",
          mana_cost: card.mana_cost,
          deckCounts: {},
        })
      }
      map.get(key)!.deckCounts[`deck_${deck.deck_id}_side`] = card.card_count
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
  const locked = decks.filter(d => d.locked);
  const map = new Map<number, Card & { total: number }>();

  // Aggregate card counts across locked decks
  locked.forEach(deck => {
    deck.cards.forEach(card => {
      const prev = map.get(card.id);
      if (prev) {
        prev.total += card.card_count;
      } else {
        map.set(card.id, { ...card, total: card.card_count });
      }
    });
  });

  const shoppingList = Array.from(map.values());
  const normalizedIds = shoppingList.map(card => card.id);

  // Fetch price data from backend
  const retrievedPriceList = await fetchPricesForShoppingList(normalizedIds);

  // Attach up to 3 cheapest non-foil prices per card
  shoppingList.forEach(card => {
    const matchingPrices = (retrievedPriceList as any[])
      .filter(p => p.normalized_card_id === card.id && !p.is_foil)
      .sort((a, b) => (parseFloat(a.price) || Infinity) - (parseFloat(b.price) || Infinity))
      .slice(0, 3);

    card.prices = matchingPrices.map(p => ({
      price: p.price,
      is_foil: p.is_foil,
      currency: p.currency,
      source: p.source,
      price_date: p.price_date,
      set_name: p.set_code,
      scryfall_id: p.scryfall_id,
      tcg_player_link: p.tcg_player_link
    }));
  });

  return shoppingList;
}


async function fetchPricesForShoppingList(normalizedIds: number[]): Promise<any[]> {
  const response = await fetch(`${base_url}/api/fetch-card-prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_data_normalized_ids: normalizedIds }),
  })

  const prices = await response.json()

  // You can now attach prices to cards, cache them, or pass to CSV export
  //console.log('Fetched prices, KK was here:', prices)
  return prices;
}

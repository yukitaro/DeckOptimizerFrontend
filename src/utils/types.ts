// src/utils/types.ts

/** A single card in a deck */
export interface Card {
  id: number
  name: string
  type: string
  card_count: number
  mana_cost?: string
  image_url_to_use?: string
  official_set_name?: string
  board_group?: string
}

export interface MtgCard {
  name: string
  set_name: string
  official_set_name: string
  type: string
  colors: string
  mana_cost: string
  image_url: string
  card_text: string
}

/** A deck selected for comparison */
export interface Deck {
  archetype: string
  deck_id: number
  deck_name: string
  cards: Card[]
  sideboard_cards?: Card[]
  locked?: boolean
}

/** One row in the comparison matrix */
export interface MatrixRow {
  id: number
  name: string
  type: string
  deckCounts: Record<string, number>
  mana_cost?: string
}

export interface ShoppingListRow {
  name: string
  total_locked: number
  inventory: number
  need: number
  mana_cost?: string
  type: string
  official_set_name?: string
  price_1?: string
  set_1?: string
  price_2?: string
  set_2?: string
  price_3?: string
  set_3?: string
  tcg_player_link?: string
}


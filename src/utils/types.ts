// src/utils/types.ts

/** A single card in a deck */
export interface Card {
  id: number
  name: string
  type: string
  card_count: number
  mana_cost?: string
}

/** A deck selected for comparison */
export interface Deck {
  id: number
  name: string
  cards: Card[]
  locked?: boolean
}

/** One row in the comparison matrix */
export interface MatrixRow {
  id: number
  name: string
  type: string
  counts: number[]
}

export interface ComparisonItem {
  name: string;
  [key: string]: string | number;
}
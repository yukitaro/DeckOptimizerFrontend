// Regex patterns
export const numericalManaCostRegEx = /\{(X|\d+)\}/
export const colorSymbolRegex = /\{([RGBUW]\/[RGBUW]|[RGBUW]|)\}/g
import axios from 'axios';

const base_url = "http://localhost:80";

// Extracts numerical mana cost from a string like "{3}{R}"
export function getNumericalManaCost(mana_cost: string): string {
  const match = numericalManaCostRegEx.exec(mana_cost)
  return match === null ? '' : match[1]
}

export function getColorManaCost(mana_cost: string | null | undefined): string[] {
  if (!mana_cost || typeof mana_cost !== 'string') return [];
  return Array.from(mana_cost.matchAll(colorSymbolRegex)).map(match => match[1]);
}

// Maps single-letter color codes to your internal naming convention
export function mapColorCodeToName(colorCode: string): string {
  switch (colorCode) {
    case 'W':
      return 'plains'
    case 'U':
      return 'islands'
    case 'B':
      return 'swamps'
    case 'R':
      return 'mountains'
    case 'G':
      return 'forests'
    default:
      return 'colorless'
  }
}

export async function retrieveCardsForDeck(deck_id: any) {
    const response = await axios.get(`${base_url}/api/cardsInDeck/${deck_id}`)
    return response.data || []
}
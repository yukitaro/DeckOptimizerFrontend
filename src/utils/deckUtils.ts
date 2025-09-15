// Regex patterns
export const numericalManaCostRegEx = /\{(X|\d+)\}/
export const colorSymbolRegex = /\{([RGBUW]\/[RGBUW]|[RGBUW]|)\}/g

// Extracts numerical mana cost from a string like "{3}{R}"
export function getNumericalManaCost(mana_cost: string): string {
  const match = numericalManaCostRegEx.exec(mana_cost)
  return match === null ? '' : match[1]
}

// Extracts color symbols from a string like "{U}{R}" or "{R/G}"
export function getColorManaCost(mana_cost: string): string[] {
  return Array.from(mana_cost.matchAll(colorSymbolRegex)).map(match => match[1])
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
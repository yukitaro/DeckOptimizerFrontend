function buildComparisonMatrix(decks) {
  // 1. Gather every unique card ID across all decks
  const allCards = new Map()
  decks.forEach((deck, colIdx) => {
    deck.cards.forEach(card => {
      if (!allCards.has(card.id)) {
        allCards.set(card.id, {
          id: card.id,
          name: card.name,
          type: card.type,
          counts: Array(decks.length).fill(0)
        })
      }
      allCards.get(card.id).counts[colIdx] = card.card_count
    })
  })

  // 2. Convert to array and sort by:
  //    a) common first (present in every deck)
  //    b) then by typeHierarchy
  const matrix = Array.from(allCards.values())
  matrix.sort((a, b) => {
    const aCommon = a.counts.every(c => c > 0)
    const bCommon = b.counts.every(c => c > 0)
    if (aCommon !== bCommon) return aCommon ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return matrix
}
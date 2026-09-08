// src/utils/types.ts

// Types for our component
export interface SetDataItem {
  set_name: string;
  official_set_code: string;
  total_cards: string;
}

export interface CardPrice {
  price: string | number
  is_foil: boolean
  currency?: string
  source?: string
  price_date?: string
  set_name?: string
  scryfall_id?: string
  tcg_player_link?: string
}

/** A single card in a deck */
export interface Card {
  id: number
  name: string
  type: string
  card_count: number
  total?: number
  mana_cost?: string
  image_url_to_use?: string
  official_set_name?: string
  is_foil?: boolean
  board_group?: string
  prices?: CardPrice[]
  card_from_set?: CardBackendData
}

export interface CardBackendData {
  colorIdentities: string
  id: number
  image_url: string
  mana_cost: string
  name: string
  number_in_set: string | number
  set_name: string
  slug: string
  text: string
  type: string
}

export interface Collection {
  id: number
  collection_name: string
  description: string
  type: string
  game_type: string
  owner_id: number
  visibility: string
  is_favorite: boolean
  include_in_inventory: boolean
  import_status: string
}

export interface UpdateCollectionPayload {
  collection_name?: string
  description?: string
  is_favorite?: boolean
  include_in_inventory?: boolean
  type?: string
  game_type?: string
  visibility?: string
}

export interface EnrichedCardData {
  related_printings: string // Comma-separated set codes
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

export interface DeckImportDTO {
  name: string
  mainboard: { name: string; count: number }[]
  sideboard: { name: string; count: number }[]
  format?: string
  description?: string
  sourceUrl?: string
  archetype?: string
  tags?: { name: string; count: number }[]
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

export interface ImportCandidate {
  set_code: string;
  set_name: string;
  release_date: string;
  metadata_pct: number;
  normalization_pct: number;
  image_pct: number;
  ready_for_import: boolean;
  imported_into_database: boolean;
}

export interface Role {
  id: number
  name: string
  label?: string
  permissions: Permission[]
}

export interface Permission {
  id: number
  name: string
  label?: string
}

export interface User {
  id: number
  email: string
  name?: string
  roles: Role[]
  is_superuser: boolean
}

export interface Issue {
  id: number
  title: string
  description: string
  issueType: string
  created_at: string
  updated_at: string
  status: string
  priority: string
  type: string
  issueAssigneeId: number
  issueCreatorId: number
  assignee?: User
  site_mode: SiteMode | null
  site_feature_slug?: string | null
}

export interface IssueForm {
  title: string
  description: string
  type: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | ''
  site_mode: string | null
  feature_slug: string | null   // machine-friendly key for the feature
}

export type SiteMode = string

export interface SiteFeature {
  id?: number
  site_mode: SiteMode
  slug: string
  feature_name: string
  description?: string
  is_enabled?: boolean
  is_global?: boolean
  sort_order?: number
  meta?: Record<string, any>
}
// composables/useExportModal.ts
import { ref, MaybeRefOrGetter, toValue } from 'vue'
import { useCsvExport, CsvColumn } from './useCsvExport'

export interface ExportFormat {
  title: string
  value: string
  subtitle: string
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { title: 'Default CSV', value: 'default', subtitle: 'Standard card collection layout' },
  { title: 'ManaBox CSV', value: 'manabox', subtitle: 'Formatted specifically for ManaBox app imports' },
]

export function useExportModal(cardData: MaybeRefOrGetter<any[]>) {
  const isOpen = ref(false)
  const selectedFormat = ref('default')
  const { downloadCsv } = useCsvExport<any>()

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function exportData() {
    const data = toValue(cardData)

    if (selectedFormat.value === 'manabox') {
      const columnsManabox: CsvColumn<any>[] = [
        { key: 'name', label: 'card name' },
        { key: 'set_name', label: 'set code' },
        { key: 'official_set_name', label: 'set name' },
        { key: 'number_in_set', label: 'card number' },
        { key: 'language', label: 'language' },
        { key: 'is_foil', label: 'foil' },
        { key: 'quantity', label: 'quantity' },
        { key: 'scryfall_id', label: 'Scryfall ID' },
        { key: 'price_usd', label: 'purchase price' },
        { key: 'purchase_currency', label: 'purchase currency' },
      ]
      downloadCsv(data, columnsManabox, 'mtg_cards_manabox_export.csv')
    } else {
      const columnsDefault: CsvColumn<any>[] = [
        { key: 'name', label: 'Name' },
        { key: 'set_name', label: 'Set code' },
        { key: 'number_in_set', label: 'Collector number' },
        { key: 'is_foil', label: 'Foil' },
        { key: 'rarity', label: 'Rarity' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'scryfall_id', label: 'Scryfall ID' },
        { key: 'price_usd', label: 'Purchase price' },
      ]
      downloadCsv(data, columnsDefault, 'mtg_cards_export.csv')
    }

    close()
  }

  return {
    isOpen,
    selectedFormat,
    formats: EXPORT_FORMATS,
    open,
    close,
    exportData,
  }
}
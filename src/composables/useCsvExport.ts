// src/composables/useCsvExport.ts
import { Ref } from 'vue'

export type CsvColumn<T> = {
  /** the property on your row object */
  key: keyof T
  /** the column header label */
  label: string
}

/**
 * Provides a CSV download function that uses native Blobs & <a download>
 */
export function useCsvExport<T>() {
  /**
   * Download `rows` as a CSV file, using the `columns` map.
   *
   * @param rows     the array of data objects
   * @param columns  array of { key, label } describing order & headers
   * @param filename the file name (default: export.csv)
   */
  function downloadCsv(
    rows: T[] | Ref<T[]>,
    columns: CsvColumn<T>[],
    filename = 'export.csv'
  ) {
    // unwrap if it’s a ref
    const data: T[] = Array.isArray(rows) ? rows : rows.value

    // 1) build header row
    const headerLine =
      columns
        .map(col => `"${col.label.replace(/"/g, '""')}"`)
        .join(',') +
      '\r\n'

    // 2) build each data row
    const body = data
      .map(row =>
        columns
          .map(col => {
            const cell = row[col.key] == null ? '' : String(row[col.key])
            // escape any inner quotes
            return `"${cell.replace(/"/g, '""')}"`
          })
          .join(',')
      )
      .join('\r\n')

    const csvContent = headerLine + body

    // 3) turn into a Blob
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    })

    // 4) create & click a temporary download link
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()

    // 5) cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  return { downloadCsv }
}

// Builds and downloads a CSV file that spreadsheets open correctly.

export type CsvValue = string | number | undefined

const escape = (value: CsvValue): string => {
  if (value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
}

export function downloadCsv(fileName: string, csv: string): void {
  // The byte-order mark tells Excel the file is UTF-8 (for "München" etc.).
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

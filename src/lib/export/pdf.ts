import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface PdfExportOptions {
  title: string
  columns: { header: string; key: string }[]
  rows: Record<string, unknown>[]
  fileName: string
  subtitle?: string
}

export function exportToPdf({ title, columns, rows, fileName, subtitle }: PdfExportOptions) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" })

  doc.setFontSize(14)
  doc.text(title, 14, 16)
  if (subtitle) {
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(subtitle, 14, 22)
  }

  autoTable(doc, {
    startY: subtitle ? 27 : 22,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    headStyles: { fillColor: [0, 119, 182] },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  doc.save(`${fileName}.pdf`)
}

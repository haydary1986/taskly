/**
 * Export an array of objects as a CSV file download
 */
export function useExportCSV() {
    function exportToCSV(data: Record<string, any>[], filename: string, columns?: { key: string; label: string }[]) {
        if (!data.length) return

        // Determine columns
        const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }))

        // UTF-8 BOM for Arabic support
        const BOM = '\uFEFF'

        // Header row
        const header = cols.map(c => `"${c.label}"`).join(',')

        // Data rows
        const rows = data.map(row =>
            cols.map(c => {
                let val = row[c.key]
                if (val === null || val === undefined) val = ''
                if (typeof val === 'object') val = val.name || val.title || JSON.stringify(val)
                return `"${String(val).replace(/"/g, '""')}"`
            }).join(',')
        )

        const csv = BOM + header + '\n' + rows.join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return { exportToCSV }
}

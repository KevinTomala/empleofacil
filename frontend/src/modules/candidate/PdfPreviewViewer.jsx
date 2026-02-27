import { useMemo } from 'react'

export function PdfPreviewViewer({ htmlData, onClose }) {
  const previewSrcDoc = useMemo(() => {
    if (!htmlData) return ''

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    let normalizedHtml = String(htmlData)

    normalizedHtml = normalizedHtml.replace(/src="(\/uploads\/[^\"]+)"/g, (_match, path) => {
      const fullUrl = `${apiBase}${path}`
      return `src="${fullUrl}"`
    })

    return normalizedHtml
  }, [htmlData])

  if (!previewSrcDoc) {
    return <p className="p-4 text-sm text-foreground/70">No se pudo cargar la previsualizacion.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Previsualizacion de curriculum</h2>
          <p className="text-xs text-foreground/65">Vista exacta del PDF que descargaras</p>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 border border-border rounded-lg text-xs"
          onClick={onClose}
        >
          Cerrar vista previa
        </button>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <iframe
          title="Previsualizacion de curriculum"
          className="w-full h-[78vh] bg-white"
          srcDoc={previewSrcDoc}
        />
      </div>
    </div>
  )
}

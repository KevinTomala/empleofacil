import { useMemo } from 'react'

export function PdfPreviewViewer({ htmlData, onClose }) {
  // Extraer estilos y contenido del HTML del servidor
  const { styles, content } = useMemo(() => {
    if (!htmlData) return { styles: '', content: '' }

    // Extraer el style del documento
    const styleMatch = htmlData.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
    const styles = styleMatch && styleMatch[1] ? styleMatch[1] : ''

    // Extraer solo el contenido del body
    const bodyMatch = htmlData.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    let content = bodyMatch ? bodyMatch[1] : htmlData

    // Procesar URLs de imagen para que sean absolutas
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    content = content.replace(/src="(\/uploads\/[^"]+)"/g, (match, path) => {
      const fullUrl = `${apiBase}${path}`
      return `src="${fullUrl}"`
    })

    return { styles, content }
  }, [htmlData])

  if (!content) {
    return <p className="p-4 text-sm text-foreground/70">No se pudo cargar la previsualizacion.</p>
  }

  return (
    <>
      {styles && <style>{`.pdf-preview { ${styles} }`}</style>}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Previsualizacion de curriculum</h2>
            <p className="text-xs text-foreground/65">Vista exacta del PDF que descargarás</p>
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
          <div 
            className="pdf-preview max-h-[78vh] overflow-auto p-5 sm:p-6"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </>
  )
}

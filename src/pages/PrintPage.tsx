import { useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CompanyContext } from '../pdf/CompanyContext'
import { decodePdfPayload } from '../pdf/data'
import { invoiceDoc } from '../pdf/InvoicePdf'
import { PdfDocument } from '../pdf/PdfDocument'
import { PdfSheet } from '../pdf/primitives'
import { serviceReportDoc } from '../pdf/ServiceReport'

declare global {
  interface Window {
    /** Set once the document is paginated and fonts and images are in — the PDF renderer
     *  waits for it before printing. */
    __pdfReady?: boolean
  }
}

/** Routes `/print/report` and `/print/invoice`: the bare sheets, 1:1, no app chrome, for
 *  headless Chrome on the server. All data arrives in the URL hash (`#data=…`, built by the
 *  function from the stored job), so this page needs no session and makes no queries. */
export function PrintPage() {
  const { kind } = useParams()
  const payload = useMemo(() => decodePdfPayload(window.location.hash), [])
  const doc = useMemo(() => {
    if (!payload || payload.kind !== kind) return null
    if (payload.kind === 'report') return payload.report ? serviceReportDoc(payload.report) : null
    return payload.invoice ? invoiceDoc(payload.invoice) : null
  }, [payload, kind])

  // Pagination may have added sheets (and their images) after the first paint, so the
  // images are awaited only once the layout has settled.
  const onSettled = useCallback(() => {
    void Promise.all(
      [...document.images].map(
        (img) =>
          img.complete ||
          new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    ).then(() => {
      window.__pdfReady = true
    })
  }, [])

  if (!payload || !doc) return <p className="p-lg text-body text-ink">No document data.</p>

  return (
    <CompanyContext.Provider value={payload.company}>
      <div className="print-page flex flex-col bg-surface">
        <PdfDocument doc={doc} onSettled={onSettled} sheet={(content, i) => <PdfSheet key={i}>{content}</PdfSheet>} />
      </div>
    </CompanyContext.Provider>
  )
}

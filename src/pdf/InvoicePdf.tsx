import { WORK_PERFORMED_ITEMS } from './checklists'
import type { PdfDoc, PdfGroup } from './layout'
import { PdfChecklist, PdfHeroBig, PdfSection, PdfThankYou, PdfUnitCard } from './primitives'
import type { InvoicePdfData } from './types'

const money = (n: number) => `$${n.toFixed(2)}`

/** Figma: PDF · Invoice · Page 1–2 (213:3679, 229:8527). Customer-paid items print with
 *  their price but a $0.00 amount and are excluded from the totals (Line Item component
 *  doc). Customer notes are deliberately NOT on the invoice (client decision).
 *  Returned as groups of blocks, one group per designed page; `PdfDocument` paginates them,
 *  so a long line-item table or several units continue on the next sheet. */
export function invoiceDoc(inv: InvoicePdfData): PdfDoc {
  const subtotal = inv.items.reduce((sum, i) => sum + (i.customerPaid ? 0 : i.qty * i.unitPrice), 0)
  const tax = subtotal * (inv.taxRate / 100)
  const total = Math.max(0, subtotal + tax - inv.discount)
  const numberLabel = inv.number === 'Draft' ? 'DRAFT' : `#${inv.number}`

  const page1: PdfGroup = {
    bodyClassName: 'py-3xl',
    blocks: [
      {
        key: 'items',
        items: inv.items.map((item) => (
          <div key={item.id} className="flex items-start gap-sm border-t border-line px-sm py-[5px] text-pdf-body text-ink">
            <p className="min-w-0 flex-1">
              {item.description}
              {item.customerPaid ? ' (Customer Paid)' : ''}
            </p>
            <p className="w-[56px] shrink-0 text-center">{item.qty}</p>
            <p className="w-[80px] shrink-0 text-right">{money(item.unitPrice)}</p>
            <p className="w-[84px] shrink-0 text-right">{money(item.customerPaid ? 0 : item.qty * item.unitPrice)}</p>
          </div>
        )),
        // The header row repeats on every sheet the table continues on.
        wrap: (rows) => (
          <div className="flex w-full flex-col overflow-hidden rounded-2xs border border-line">
            <div className="flex items-start gap-sm bg-brand px-sm py-[5px] text-pdf-table text-inverse">
              <p className="min-w-0 flex-1">DESCRIPTION</p>
              <p className="w-[56px] shrink-0 text-center">QTY</p>
              <p className="w-[80px] shrink-0 text-right">UNIT PRICE</p>
              <p className="w-[84px] shrink-0 text-right">AMOUNT</p>
            </div>
            {rows}
          </div>
        ),
      },
      {
        key: 'totals',
        node: (
          <div className="flex w-full flex-col overflow-hidden rounded-2xs border border-line">
            <div className="flex items-start gap-sm bg-surface-alt px-[10px] py-[5px] text-ink">
              <p className="min-w-0 flex-1 text-pdf-table">SUBTOTAL</p>
              <p className="text-pdf-body text-right">{money(subtotal)}</p>
            </div>
            <div className="flex items-start gap-sm bg-surface-alt px-[10px] py-[5px] text-ink">
              <p className="min-w-0 flex-1 text-pdf-table">TAX ({inv.taxRate.toFixed(2)}%)</p>
              <p className="text-pdf-body text-right">{money(tax)}</p>
            </div>
            {inv.discount > 0 && (
              <div className="flex items-start gap-sm bg-surface-alt px-[10px] py-[5px] text-ink">
                <p className="min-w-0 flex-1 text-pdf-table">DISCOUNT</p>
                <p className="text-pdf-body text-right">−{money(inv.discount)}</p>
              </div>
            )}
            <div className="flex items-center gap-sm bg-brand px-[10px] py-[7px] text-inverse">
              <p className="min-w-0 flex-1 text-pdf-section">TOTAL</p>
              <p className="text-pdf-emphasis text-right">{money(total)}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'description',
        node: (
          <PdfSection title="DESCRIPTION OF WORK">
            <p className="text-pdf-body text-ink">{inv.description || '—'}</p>
          </PdfSection>
        ),
      },
    ],
  }

  /** A line of the acknowledgment block: blank for a pen, or filled from the app's invoice
   *  signature (drawn image on the SIGNATURE line, name and date as text on theirs). */
  const signatureField = (label: string, className = '', value?: string, image?: string) => (
    <div className={`flex flex-col gap-[3px] ${className}`}>
      {/* Fixed 28px band above the line: the image is clipped to it, so a tall signature
          image can't overlap the row above; text sits on the baseline like before. */}
      <div className="relative h-[28px] w-full overflow-hidden">
        {image && <img src={image} alt="" className="absolute bottom-0 left-0 h-[26px] w-[128px] object-contain object-left-bottom" />}
        {value && !image && <p className="absolute bottom-[2px] left-0 text-pdf-body text-ink">{value}</p>}
      </div>
      <div className="h-px w-full bg-line-strong" />
      <p className="text-pdf-small text-icon">{label}</p>
    </div>
  )
  const sig = inv.customerSignature

  const page2: PdfGroup = {
    bodyClassName: 'py-lg',
    blocks: [
      {
        key: 'units',
        items: inv.equipment.map((u, i) => (
          <PdfUnitCard
            key={i}
            title={['UNIT ' + (i + 1), u.unitId, u.location].filter(Boolean).join(' · ')}
            rows={[
              ['Type', u.type],
              ['Brand', u.manufacturer],
              ['Model', u.model],
              ['Serial No.', u.serial],
            ]}
            labelWidth={70}
          />
        )),
        // First part: the designed row, units beside the WORK PERFORMED checklist. Units
        // that do not fit continue full width, two cards per row at the same card width.
        wrap: (cards, continued) =>
          continued ? (
            <PdfSection title="UNIT DESCRIPTION (CONTINUED)">
              <div className="grid w-full grid-cols-2 items-start gap-xs">{cards}</div>
            </PdfSection>
          ) : (
            <div className="flex w-full items-start gap-md">
              <PdfSection title="UNIT DESCRIPTION" className="flex-1">
                {cards}
              </PdfSection>
              <PdfSection title="WORK PERFORMED" className="flex-1">
                <PdfChecklist items={WORK_PERFORMED_ITEMS} checked={inv.workPerformed} />
              </PdfSection>
            </div>
          ),
      },
      {
        key: 'acknowledgment',
        // Moves on together with the thank-you block rather than leaving it alone on a sheet.
        keepWithNext: true,
        node: (
          <div className="flex w-full flex-col gap-[6px] rounded-2xs border border-line px-[10px] pb-[10px] pt-sm">
            <p className="text-pdf-body text-ink">I hereby acknowledge the work performed as described above and agree to the charges.</p>
            <div className="flex w-full items-start gap-lg">
              {signatureField('DATE COMPLETED', 'w-[150px] shrink-0', sig?.signedAt)}
              {signatureField('PRINT NAME', 'min-w-0 flex-1', sig?.name)}
            </div>
            <div className="flex w-full items-start gap-lg">
              {signatureField('JOB TITLE', 'w-[150px] shrink-0', sig?.title)}
              {signatureField('SIGNATURE', 'min-w-0 flex-1', undefined, sig?.image)}
            </div>
          </div>
        ),
      },
      { key: 'thanks', node: <PdfThankYou /> },
    ],
  }

  return {
    hero: (
      <PdfHeroBig
        title={`INVOICE ${numberLabel}`}
        rows={[
          ['CUSTOMER', inv.customer],
          ['ADDRESS', inv.addressLines],
          ['DATE', inv.date],
          ['PHONE', inv.phone ?? '—'],
          ['WORK ORDER', inv.workOrder],
        ]}
      />
    ),
    pill: `Invoice ${inv.number === 'Draft' ? '(draft)' : `#${inv.number}`} · ${inv.customer} · ${inv.date}`,
    groups: [page1, page2],
  }
}

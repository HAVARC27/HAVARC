import { Check, Mail, MapPin, Phone } from 'lucide-react'
import { useContext, type CSSProperties, type ReactNode, type Ref } from 'react'
import { CompanyContext } from './CompanyContext.js'
import { splitFooterNote } from './company.js'

/** Building blocks shared by the Service Report and Invoice templates (Figma page
 *  "PDF Templates Design", 213:3678). Every sheet is US Letter at 72 dpi: 612 × 792 px,
 *  hero 220 (page 1) / 83 (later pages), footer 88, 32 px side margins. Backgrounds are the
 *  flattened exports in public/pdf/ (gradient + blobs + noise), text stays live text. */

export const PDF_WIDTH = 612
export const PDF_HEIGHT = 792

export function PdfSheet({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="pdf-sheet relative flex h-[792px] w-[612px] shrink-0 flex-col overflow-hidden bg-surface shadow-modal" style={style}>
      {children}
    </div>
  )
}

const bg = (name: string) => ({ src: `/pdf/${name}.webp`, srcSet: `/pdf/${name}.webp 1x, /pdf/${name}@2x.webp 2x` })

/** Page-1 hero: contacts on the left, document card (band + info table) on the right. */
export function PdfHeroBig({ title, rows }: { title: string; rows: [string, string | string[]][] }) {
  const COMPANY = useContext(CompanyContext)
  const contacts: [ReactNode, string][] = [
    [<Phone key="p" size={11} strokeWidth={1.5} />, COMPANY.phone],
    [<Mail key="m" size={11} strokeWidth={1.5} />, COMPANY.email],
    [<MapPin key="a" size={11} strokeWidth={1.5} />, COMPANY.address],
  ]
  return (
    <div className="relative flex h-[220px] w-full shrink-0 items-start gap-5xl p-3xl shadow-[0_4px_24px_0_var(--alpha-navy-30)]">
      <img {...bg('hero_big')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="relative flex h-full min-w-0 flex-1 flex-col justify-between">
        <img src="/brand/header-lockup.svg" alt={COMPANY.name} width={174} height={45} className="h-[45px] w-auto self-start" />
        <div className="flex flex-col gap-xs text-inverse [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
          {contacts.map(([icon, text], i) => (
            <div key={i} className="flex items-center gap-xs">
              {icon}
              <p className="text-pdf-body font-medium whitespace-nowrap">{text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex w-[250px] shrink-0 flex-col">
        <div className="rounded-t-xs bg-brand px-md py-sm text-pdf-emphasis text-inverse">{title}</div>
        <div className="flex flex-col rounded-b-xs bg-brand-strong">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start gap-sm px-sm py-2xs">
              <p className="w-[92px] shrink-0 text-pdf-section text-inverse">{label}</p>
              <div className="min-w-0 flex-1 text-pdf-body text-inverse">
                {(Array.isArray(value) ? value : [value]).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Compact hero for pages 2+: lockup left, document pill right. */
export function PdfHeroSmall({ pill }: { pill: string }) {
  const COMPANY = useContext(CompanyContext)
  return (
    <div className="relative flex h-[83px] w-full shrink-0 items-start justify-between px-3xl pb-lg pt-3xl shadow-[0_4px_24px_0_var(--alpha-navy-30)]">
      <img {...bg('hero')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <img src="/brand/header-lockup.svg" alt={COMPANY.name} width={137} height={35} className="relative h-[35px] w-auto" />
      <div className="relative rounded-full bg-brand-strong px-lg py-[10px]">
        <p className="text-pdf-body whitespace-nowrap text-inverse">{pill}</p>
      </div>
    </div>
  )
}

export function PdfFooter({ page, total }: { page: number; total: number }) {
  const COMPANY = useContext(CompanyContext)
  return (
    <div className="relative mt-auto flex h-[88px] w-full shrink-0 items-center justify-between gap-sm border-t border-line p-3xl">
      <img {...bg('footer')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <p className="relative w-[403px] text-pdf-small text-ink">
        {COMPANY.name} · {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}
      </p>
      <div className="relative rounded-full bg-[var(--alpha-white-20)] px-sm py-2xs">
        <p className="text-pdf-small whitespace-nowrap text-ink">
          Page {page} of {total}
        </p>
      </div>
    </div>
  )
}

/** Body column between hero and footer. Page 1 uses pt-md pb-3xl, later pages py-lg.
 *  `bodyRef` lets `PdfDocument` measure the column when it paginates. */
export function PdfBody({ children, className = 'py-lg', bodyRef }: { children: ReactNode; className?: string; bodyRef?: Ref<HTMLDivElement> }) {
  return (
    <div ref={bodyRef} className={`relative flex min-h-0 w-full flex-1 flex-col gap-md px-3xl ${className}`}>
      {children}
    </div>
  )
}

/** Bordered section with a navy title band (Figma "section · …"). */
export function PdfSection({ title, children, className = '', bodyClassName = '' }: { title: string; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-2xs border border-line ${className}`}>
      <div className="flex shrink-0 items-start bg-brand px-sm py-[5px]">
        <p className="text-pdf-section text-inverse">{title}</p>
      </div>
      <div className={`flex min-h-0 w-full flex-col gap-xs p-sm ${bodyClassName}`}>{children}</div>
    </div>
  )
}

export function PdfCheckbox({ checked }: { checked: boolean }) {
  return checked ? (
    <span className="flex size-[11px] shrink-0 items-center justify-center rounded-[2px] bg-brand text-inverse">
      <Check size={9} strokeWidth={2.5} />
    </span>
  ) : (
    <span className="size-[11px] shrink-0 rounded-[2px] border border-brand" />
  )
}

/** Checklist laid out column-major across `columns` (Figma fills column 1 top-to-bottom first). */
export function PdfChecklist({ items, checked, columns = 2 }: { items: string[]; checked: string[]; columns?: number }) {
  const perColumn = Math.ceil(items.length / columns)
  const cols = Array.from({ length: columns }, (_, c) => items.slice(c * perColumn, (c + 1) * perColumn))
  return (
    <div className="flex w-full items-start gap-sm">
      {cols.map((col, c) => (
        <div key={c} className="flex min-w-0 flex-1 flex-col gap-2xs">
          {col.map((label) => (
            <div key={label} className="flex items-start gap-[5px]">
              <PdfCheckbox checked={checked.includes(label)} />
              <p className="min-w-0 flex-1 text-pdf-body text-ink">{label}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Key/value table with a light title row (equipment units). `columns={2}` sets the fields
 *  side by side in pairs, halving the card's height (the report's equipment block, so two
 *  units and the readings share a page). */
export function PdfUnitCard({ title, rows, labelWidth = 110, columns = 1 }: { title: string; rows: [string, string][]; labelWidth?: number; columns?: 1 | 2 }) {
  const lines: [string, string][][] = []
  for (let i = 0; i < rows.length; i += columns) lines.push(rows.slice(i, i + columns))
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xs border border-line">
      <div className="bg-surface-alt px-sm py-2xs">
        <p className="text-pdf-section whitespace-nowrap text-brand">{title}</p>
      </div>
      {lines.map((line) => (
        <div key={line[0][0]} className="flex items-stretch border-t border-line">
          {line.map(([label, value], i) => (
            <div key={label} className={`flex min-w-0 flex-1 items-start gap-sm px-sm py-[3px] ${i > 0 ? 'border-l border-line' : ''}`}>
              <p className="shrink-0 text-pdf-body text-icon" style={{ width: labelWidth }}>
                {label}
              </p>
              <p className="min-w-0 flex-1 text-pdf-body text-ink">{value || '—'}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** "Thank you!" closing row with the branded slogan band (public/pdf/band.webp). */
export function PdfThankYou() {
  const COMPANY = useContext(CompanyContext)
  const [emphasis, note] = splitFooterNote(COMPANY.footerNote)
  return (
    <div className="flex w-full items-center gap-lg">
      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <div className="flex flex-col gap-[2px]">
          <p className="text-[16px] font-bold leading-normal text-brand">Thank you!</p>
          <p className="text-pdf-section text-pdf-footer">{emphasis}</p>
        </div>
        <p className="text-[12px] leading-normal text-brand">{note}</p>
      </div>
      <div className="relative flex w-[240px] shrink-0 items-center justify-center overflow-hidden rounded-full px-md py-lg">
        <img {...bg('band')} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <p className="relative text-center text-pdf-section text-inverse">
          {COMPANY.slogan.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}

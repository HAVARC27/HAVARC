import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { initialPlan, isSplit, relieve, type PdfDoc, type Sheet } from './layout'
import { PdfBody, PdfFooter, PdfHeroSmall } from './primitives'

/** Upper bound on relayout passes for one document — far above any real job, it only
 *  guards against a loop if a template ever produces something that cannot settle. */
const MAX_STEPS = 400

/** The least clear space kept between the last block and the footer. The body's bottom
 *  padding is the designed spacing, not a hard limit: the standard invoice's second page
 *  already ends 7px inside it, so a sheet is only full when a block would come closer to
 *  the footer than this. */
const MIN_FOOTER_GAP = 6

/** True when the last block of a sheet's body ends too close to (or under) the footer. */
const overflows = (body: HTMLElement) => {
  const last = body.lastElementChild as HTMLElement | null
  if (!last) return false
  return last.offsetTop + last.offsetHeight > body.clientHeight - MIN_FOOTER_GAP
}

/** Lays a `PdfDoc` out onto 612×792 sheets and paginates it: after each render every sheet
 *  is checked, and the first one that overflows hands its last unit to the next sheet, until
 *  all of them fit. `sheet` wraps one sheet's content (the caller supplies `PdfSheet`, scaled
 *  or not). `onSettled` fires once the fonts are in and the layout is stable — the print page
 *  waits for it before the PDF is taken. */
export function PdfDocument({ doc, sheet, onSettled }: { doc: PdfDoc; sheet: (content: ReactNode, index: number) => ReactNode; onSettled?: () => void }) {
  const [layout, setLayout] = useState(() => ({ doc, plan: initialPlan(doc), steps: 0 }))
  const [fontsReady, setFontsReady] = useState(false)
  const bodies = useRef<(HTMLDivElement | null)[]>([])
  const settledPlan = useRef<Sheet[] | null>(null)

  // A new document (the parent re-rendered with fresh data) starts from the designed layout.
  const current = layout.doc === doc ? layout : { doc, plan: initialPlan(doc), steps: 0 }
  if (current !== layout) setLayout(current)

  // Text is measured with the real fonts: once they are in, lay out again from scratch.
  useEffect(() => {
    let alive = true
    void document.fonts.ready.then(() => {
      if (!alive) return
      setFontsReady(true)
      setLayout((l) => ({ doc: l.doc, plan: initialPlan(l.doc), steps: 0 }))
    })
    return () => {
      alive = false
    }
  }, [])

  useLayoutEffect(() => {
    if (layout.doc !== doc) return // the reset above is already scheduled
    bodies.current.length = layout.plan.length
    if (layout.steps < MAX_STEPS) {
      for (let s = 0; s < layout.plan.length; s++) {
        const body = bodies.current[s]
        if (!body || !overflows(body)) continue
        const next = relieve(layout.plan, s, doc)
        if (next) {
          setLayout({ doc, plan: next, steps: layout.steps + 1 })
          return
        }
      }
    }
    if (fontsReady && settledPlan.current !== layout.plan) {
      settledPlan.current = layout.plan
      onSettled?.()
    }
    // Sheet contents only change with the plan, the document or the fonts, so those are the
    // only moments a sheet can start or stop overflowing.
  }, [layout, doc, fontsReady, onSettled])

  const { plan } = current
  return (
    <>
      {plan.map((placed, i) => {
        const group = doc.groups[placed.group]
        return sheet(
          <>
            {i === 0 ? doc.hero : <PdfHeroSmall pill={doc.pill} />}
            <PdfBody
              className={group.bodyClassName}
              bodyRef={(el) => {
                bodies.current[i] = el
              }}
            >
              {placed.placements.map((p) => {
                const block = group.blocks[p.block]
                return isSplit(block) ? (
                  <div key={`${block.key}:${p.from}`} className="w-full shrink-0">
                    {block.wrap(block.items.slice(p.from, p.to), p.from > 0)}
                  </div>
                ) : (
                  <div key={block.key} className={`w-full shrink-0 ${block.pinBottom ? 'mt-auto' : ''}`}>
                    {block.node}
                  </div>
                )
              })}
            </PdfBody>
            <PdfFooter page={i + 1} total={plan.length} />
          </>,
          i,
        )
      })}
    </>
  )
}

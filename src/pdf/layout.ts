import type { ReactNode } from 'react'

/* Pagination model for the PDF templates.
 *
 * A document is a list of designed pages ("groups", one per Figma page). Each group is a
 * column of blocks. When a group's blocks do not fit one sheet, the overflow moves onto
 * continuation sheets inserted right after it, so the designed pages that follow keep their
 * layout. Nothing is ever squeezed or clipped.
 *
 * Fitting is decided by the browser, not by arithmetic: `PdfDocument` renders the current
 * plan, checks every sheet for overflow and calls `relieve` to move one unit forward, until
 * every sheet fits. That keeps two-column rows, wrapped text and grids exact without
 * re-implementing their layout here. */

/** A block that moves as a whole. */
export interface PdfNodeBlock {
  key: string
  node: ReactNode
  /** Sits at the bottom of its sheet (the signatures block of the report). */
  pinBottom?: boolean
  /** Never left as the last block of a sheet while the block after it moved on. */
  keepWithNext?: boolean
}

/** A container whose items may continue on the next sheet (equipment units, invoice lines,
 *  photos). `wrap` draws the container around a run of items; `continued` is true for every
 *  part after the first. */
export interface PdfSplitBlock {
  key: string
  items: ReactNode[]
  wrap: (items: ReactNode[], continued: boolean) => ReactNode
}

export type PdfBlock = PdfNodeBlock | PdfSplitBlock

export interface PdfGroup {
  /** Padding classes of the body column on this group's sheets. */
  bodyClassName: string
  blocks: PdfBlock[]
}

export interface PdfDoc {
  /** Page-1 hero; every later sheet gets the compact hero with `pill`. */
  hero: ReactNode
  pill: string
  groups: PdfGroup[]
}

export const isSplit = (block: PdfBlock): block is PdfSplitBlock => 'items' in block

/** A block, or the run `[from, to)` of a split block's items, placed on a sheet. */
export interface Placement {
  block: number
  from: number
  to: number
}

export interface Sheet {
  group: number
  placements: Placement[]
}

/** One sheet per group, everything on it — the designed layout. */
export const initialPlan = (doc: PdfDoc): Sheet[] =>
  doc.groups.map((group, g) => ({
    group: g,
    placements: group.blocks.map((block, b) => ({ block: b, from: 0, to: isSplit(block) ? block.items.length : 1 })),
  }))

const unitsOn = (sheet: Sheet) => sheet.placements.reduce((n, p) => n + Math.max(1, p.to - p.from), 0)

/** Moves the last unit of sheet `index` (a whole block, or the last item of a split block)
 *  to the front of the next sheet of the same group, creating that sheet when needed.
 *  Returns null when the sheet holds a single unit: it cannot be made to fit by moving. */
export function relieve(plan: Sheet[], index: number, doc: PdfDoc): Sheet[] | null {
  if (unitsOn(plan[index]) <= 1) return null
  const next = plan.map((sheet) => ({ group: sheet.group, placements: sheet.placements.map((p) => ({ ...p })) }))
  const current = next[index]
  const blocks = doc.groups[current.group].blocks
  let target = next[index + 1]
  if (!target || target.group !== current.group) {
    target = { group: current.group, placements: [] }
    next.splice(index + 1, 0, target)
  }
  const prepend = (p: Placement) => {
    const head = target.placements[0]
    if (head && head.block === p.block && head.from === p.to) head.from = p.from
    else target.placements.unshift(p)
  }
  const moveLast = () => {
    const last = current.placements[current.placements.length - 1]
    if (isSplit(blocks[last.block]) && last.to - last.from > 1) {
      last.to -= 1
      prepend({ block: last.block, from: last.to, to: last.to + 1 })
    } else {
      current.placements.pop()
      prepend(last)
    }
  }
  moveLast()
  for (;;) {
    const last = current.placements[current.placements.length - 1]
    if (!last || current.placements.length < 2) break
    const block = blocks[last.block]
    if (isSplit(block) || !block.keepWithNext) break
    moveLast()
  }
  return next
}

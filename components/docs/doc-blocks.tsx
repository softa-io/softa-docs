import Link from 'next/link'
import type { ReactNode } from 'react'
import { FLOW_FIGURES, type FlowFigureName } from './flow-figures'

// Building blocks for docs pages, registered globally in `mdx-components.tsx` so a page uses them without
// importing anything. Text goes in as children, not props, wherever it is prose: search indexes the rendered page
// and a translator edits the Markdown. Styles live in `style.css` under "Doc blocks".

/** A page's or section's opening: the conclusion first, the details after it. */
export function Lead({ children }: { children: ReactNode }) {
  return <div className="sd-lead">{children}</div>
}

/**
 * Implementation detail for developers: class names, configuration keys, diagnostics. Collapsed by default, so the
 * main text reads for administrators and testers. The tag in front of the title follows the page language.
 */
export function Dev({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="sd-dev">
      <summary>
        <span className="sd-dev-tag" />
        <span className="sd-dev-title">{title}</span>
      </summary>
      <div className="sd-dev-body">{children}</div>
    </details>
  )
}

type Tone = 'idle' | 'info' | 'ok' | 'bad' | 'warn' | 'cancel'

/** One colour per status, the same everywhere: a record's, an instance's and a preview step's. */
const TONES: Record<string, Tone> = {
  Draft: 'idle',
  Pending: 'info',
  Approved: 'ok',
  Rejected: 'bad',
  Cancelled: 'cancel',
  Running: 'info',
  Waiting: 'info',
  Completed: 'ok',
  Returned: 'idle',
  Withdrawn: 'idle',
  Failed: 'warn',
  AutoApproved: 'ok',
  NoApproverApproved: 'ok',
  NoApproverSkipped: 'idle',
  NoApproverFails: 'bad',
  Undetermined: 'warn',
  Ready: 'ok',
  InProgress: 'info',
  Refused: 'bad',
  NoFlow: 'bad',
  SeveralFlows: 'bad'
}

/** A status value as a coloured chip; the tone comes from the value unless `tone` names one. */
export function Status({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const value = typeof children === 'string' ? children.trim() : ''
  return <span className={`sd-status sd-${tone ?? TONES[value] ?? 'idle'}`}>{children}</span>
}

/** A Flow diagram from `flow-figures.ts`, with its caption as children. */
export function FlowFigure({ name, children }: { name: FlowFigureName; children?: ReactNode }) {
  return (
    <figure className="sd-figure">
      <div className="sd-figure-canvas" dangerouslySetInnerHTML={{ __html: FLOW_FIGURES[name] }} />
      {children ? <figcaption>{children}</figcaption> : null}
    </figure>
  )
}

/** Where each reader starts on the page: a grid of `RoleCard`s. */
export function RoleCards({ children }: { children: ReactNode }) {
  return <div className="sd-cards">{children}</div>
}

/** One reader's way in: who, where to go (an anchor on the page or a site path), and what they find there. */
export function RoleCard({ title, href, children }: { title: ReactNode; href: string; children?: ReactNode }) {
  return (
    <Link className="sd-card" href={href}>
      <span className="sd-card-title">
        {title}
        <span className="sd-card-arrow" aria-hidden="true">
          →
        </span>
      </span>
      {children ? <span className="sd-card-body">{children}</span> : null}
    </Link>
  )
}

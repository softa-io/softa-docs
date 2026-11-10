import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { Dev, FlowFigure, Lead, RoleCard, RoleCards, Status } from './components/docs/doc-blocks'

const docsComponents = getDocsMDXComponents()

// Doc blocks every page can use without an import: see components/docs/doc-blocks.tsx.
const docBlocks = { Dev, FlowFigure, Lead, RoleCard, RoleCards, Status }

export function useMDXComponents(components?: Record<string, unknown>) {
  return {
    ...docsComponents,
    ...docBlocks,
    ...components
  }
}

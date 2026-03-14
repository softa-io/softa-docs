export type DocsMessages = {
  backToTop: string
  dark: string
  editPage: string
  feedback: string
  lastUpdated: string
  light: string
  searchEmptyResult: string
  searchError: string
  searchLoading: string
  searchPlaceholder: string
  system: string
  tocTitle: string
}

export type LocaleSwitchMessages = {
  buttonAria: string
  menuAria: string
}

export type RedirectMessages = {
  chooseLanguage: string
  jsRequired: string
  redirecting: string
}

export type NotFoundMessages = {
  aboutLabel: string
  backendLabel: string
  badge: string
  description: string
  docsLabel: string
  frontendLabel: string
  hint: string
  primaryLabel: string
  secondaryLabel: string
  title: string
}

export type SiteNavMessages = {
  aboutLabel: string
  docsLabel: string
  githubAria: string
  openApiHref: string
  openApiLabel: string
}

export type AppMessages = {
  docs: DocsMessages
  localeSwitch: LocaleSwitchMessages
  notFound: NotFoundMessages
  redirect: RedirectMessages
  siteNav: SiteNavMessages
}

export type HomeQuickLink =
  | { title: string; href: string }
  | { title: string; href: string; external: true }

export type HomeCard = {
  title: string
  desc: string
}

export type HomeIconCard = {
  icon: string
  title: string
  desc: string
}

export type HomePill = {
  label: string
}

export type HomeFlowPair = {
  from: string
  to: string
}

export type HomeFeature = {
  icon: string
  title: string
  desc: string
}

export type HomeMessages = {
  hero: {
    badge: string
    h1: string
    h2: string
    lead: string
    primaryCta: string
    secondaryCta: string
    assurances: HomePill[]
    quickTitle: string
    quickLinks: HomeQuickLink[]
    previewEyebrow: string
    previewTitle: string
    previewDesc: string
    diagramRows: HomeFlowPair[]
  }
  features: {
    title: string
    subtitle: string
    items: HomeFeature[]
  }
  workflow: {
    title: string
    subtitle: string
    steps: HomeCard[]
  }
  values: {
    title: string
    subtitle: string
    items: HomeCard[]
  }
  principles: {
    title: string
    items: HomeIconCard[]
  }
  closing: {
    title: string
    desc: string
    primaryCta: string
    secondaryCta: string
    linksTitle: string
    links: HomeQuickLink[]
  }
}

export type MessagesByNamespace = {
  app: AppMessages
  home: HomeMessages
}

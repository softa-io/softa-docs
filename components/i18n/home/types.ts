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

export type HomeFeature = {
  icon: string
  title: string
  desc: string
}

export type HomeDictionary = {
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

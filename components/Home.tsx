'use client'

import Link from 'next/link'
import styles from './Home.module.css'
import { getHomeDictionary } from './i18n/home'
import { toLocalePath, type Lang } from './i18n/lang'

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' as const }
  const stroke = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (name) {
    case 'metadata':
      return (
        <svg {...common}>
          <path {...stroke} d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3-3.582 3-8 3-8-1.343-8-3Z" />
          <path {...stroke} d="M4 7v10c0 1.657 3.582 3 8 3s8-1.343 8-3V7" />
          <path {...stroke} d="M4 12c0 1.657 3.582 3 8 3s8-1.343 8-3" />
        </svg>
      )
    case 'flow':
      return (
        <svg {...common}>
          <path {...stroke} d="M7 7h10" />
          <path {...stroke} d="M7 17h10" />
          <path {...stroke} d="M7 7l-3 3 3 3" />
          <path {...stroke} d="M17 17l3-3-3-3" />
        </svg>
      )
    case 'security':
      return (
        <svg {...common}>
          <path {...stroke} d="M12 3l8 4v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V7l8-4Z" />
          <path {...stroke} d="M9.5 12l2 2 3-4" />
        </svg>
      )
    case 'integration':
      return (
        <svg {...common}>
          <path {...stroke} d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
          <path {...stroke} d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
        </svg>
      )
    case 'timeline':
      return (
        <svg {...common}>
          <path {...stroke} d="M4 6h16" />
          <path {...stroke} d="M8 6v14" />
          <path {...stroke} d="M8 10h8" />
          <path {...stroke} d="M8 14h6" />
        </svg>
      )
    case 'i18n':
      return (
        <svg {...common}>
          <path {...stroke} d="M3 5h8" />
          <path {...stroke} d="M7 5v14" />
          <path {...stroke} d="M5 19h4" />
          <path {...stroke} d="M13 7h8" />
          <path {...stroke} d="M13 17h8" />
          <path {...stroke} d="M13 7c1 4 3 7 8 10" />
        </svg>
      )
    case 'database':
      return (
        <svg {...common}>
          <path {...stroke} d="M4 6c0-1.657 3.582-3 8-3s8 1.343 8 3-3.582 3-8 3-8-1.343-8-3Z" />
          <path {...stroke} d="M4 6v12c0 1.657 3.582 3 8 3s8-1.343 8-3V6" />
        </svg>
      )
    case 'tenant':
      return (
        <svg {...common}>
          <path {...stroke} d="M16 11a4 4 0 1 0-8 0" />
          <path {...stroke} d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path {...stroke} d="M12 2v20" />
          <path {...stroke} d="M2 12h20" />
        </svg>
      )
  }
}

export default function Home({ lang }: { lang: Lang }) {
  const localePath = toLocalePath(lang)
  const copy = getHomeDictionary(lang)
  const hero = copy.hero
  const prefixHref = (href: string) =>
    href.startsWith('http://') || href.startsWith('https://') ? href : `${localePath}${href}`

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.badge}>{hero.badge}</div>
              <h1 className={styles.h1}>
                <span className={styles.h1Line}>{hero.h1}</span>
                <br />
                <span className={styles.h1Em}>{hero.h2}</span>
              </h1>
              <p className={styles.lead}>{hero.lead}</p>

              <div className={styles.ctaRow}>
                <Link className={styles.primaryCta} href={`${localePath}/docs`}>
                  {hero.primaryCta}
                </Link>
                <a
                  className={styles.secondaryCta}
                  href="https://github.com/softa-io/softa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {hero.secondaryCta}
                </a>
              </div>

              <div className={styles.pills}>
                {hero.assurances.map(p => (
                  <div key={p.label} className={styles.pill}>
                    {p.label}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.heroPanel}>
              <div className={styles.previewHeader}>
                <div className={styles.previewEyebrow}>{hero.previewEyebrow}</div>
                <div className={styles.previewTitle}>{hero.previewTitle}</div>
                <div className={styles.previewDesc}>{hero.previewDesc}</div>
              </div>

              <div className={styles.bento}>
                <div className={styles.bentoCard}>
                  <div className={styles.bentoTitle}>{hero.quickTitle}</div>
                  <div className={styles.quickGrid}>
                    {hero.quickLinks.map(item => {
                      if ('external' in item && item.external) {
                        return (
                          <a
                            key={item.title}
                            className={styles.quickCard}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className={styles.quickCardTitle}>{item.title}</div>
                            <div className={styles.quickCardMeta}>↗</div>
                          </a>
                        )
                      }
                      return (
                        <Link key={item.title} className={styles.quickCard} href={prefixHref(item.href)}>
                          <div className={styles.quickCardTitle}>{item.title}</div>
                          <div className={styles.quickCardMeta}>→</div>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                <div className={styles.bentoCardAccent} aria-hidden="true">
                  <div className={styles.diagramRow}>
                    <div className={styles.diagramNode}>Metadata</div>
                    <div className={styles.diagramArrow} />
                    <div className={styles.diagramNode}>UI / API</div>
                  </div>
                  <div className={styles.diagramRow}>
                    <div className={styles.diagramNode}>Flow / AI</div>
                    <div className={styles.diagramArrow} />
                    <div className={styles.diagramNode}>Governance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.h2}>{copy.features.title}</h2>
            <p className={styles.sub}>{copy.features.subtitle}</p>
          </header>

          <div className={styles.featureGrid}>
            {copy.features.items.map(item => (
              <div key={item.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <Icon name={item.icon} />
                </div>
                <div className={styles.featureTitle}>{item.title}</div>
                <div className={styles.featureDesc}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAltTight}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.h2}>{copy.workflow.title}</h2>
            <p className={styles.sub}>{copy.workflow.subtitle}</p>
          </header>

          <div className={styles.stepGrid}>
            {copy.workflow.steps.map(step => (
              <div key={step.title} className={styles.stepCard}>
                <div className={styles.stepTitle}>{step.title}</div>
                <div className={styles.stepDesc}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.h2}>{copy.values.title}</h2>
            <p className={styles.sub}>{copy.values.subtitle}</p>
          </header>

          <div className={styles.valueGrid}>
            {copy.values.items.map(v => (
              <div key={v.title} className={styles.valueCard}>
                <div className={styles.valueTitle}>{v.title}</div>
                <div className={styles.valueDesc}>{v.desc}</div>
              </div>
            ))}
          </div>

          <header className={styles.sectionHeaderTight}>
            <h2 className={styles.h2Small}>{copy.principles.title}</h2>
          </header>

          <div className={styles.principleGrid}>
            {copy.principles.items.map(p => (
              <div key={p.title} className={styles.principleCard}>
                <div className={styles.principleHead}>
                  <div className={styles.principleIcon} aria-hidden="true">
                    <Icon name={p.icon} />
                  </div>
                  <div className={styles.principleTitle}>{p.title}</div>
                </div>
                <div className={styles.principleDesc}>{p.desc}</div>
              </div>
            ))}
          </div>

          <div className={styles.closing}>
            <div className={styles.closingLeft}>
              <div className={styles.closingTitle}>{copy.closing.title}</div>
              <div className={styles.closingDesc}>{copy.closing.desc}</div>
              <div className={styles.closingCtas}>
                <Link className={styles.primaryCta} href={`${localePath}/docs`}>
                  {copy.closing.primaryCta}
                </Link>
                <a
                  className={styles.secondaryCta}
                  href="https://github.com/softa-io/softa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.closing.secondaryCta}
                </a>
              </div>
            </div>
            <div className={styles.closingLinks}>
              <div className={styles.closingLinksTitle}>{copy.closing.linksTitle}</div>
              <div className={styles.closingLinksGrid}>
                {copy.closing.links.map(item => {
                  if ('external' in item && item.external) {
                    return (
                      <a
                        key={item.title}
                        className={styles.closingLink}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className={styles.closingLinkTitle}>{item.title}</span>
                        <span className={styles.closingLinkMeta}>↗</span>
                      </a>
                    )
                  }
                  return (
                    <Link key={item.title} className={styles.closingLink} href={prefixHref(item.href)}>
                      <span className={styles.closingLinkTitle}>{item.title}</span>
                      <span className={styles.closingLinkMeta}>→</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

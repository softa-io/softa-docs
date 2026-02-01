import Link from 'next/link';
import styles from './Hero.module.css';
import type { HeroCopy } from './i18n/hero';

type HeroProps = {
  copy: HeroCopy
  docsHref: string
  githubHref?: string
}

export default function Hero({ copy, docsHref, githubHref }: HeroProps) {
  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <h1 className={styles.headline}>
          <p className={styles.head}>
            <span></span>
            <span>
              {copy.headlineOne}<br className="max-md:hidden" />
              {copy.headlineTwo}
            </span>
            <span></span>
          </p>
        </h1>
        <p className={styles.subtitle}>
          {copy.subtitleOne}<br className="max-md:hidden" />
          {copy.subtitleTwo}
        </p>
        <div className={styles.actions}>
          <Link className={styles.cta} href={docsHref}>
            {copy.cta}
          </Link>
          <a
            className={styles.secondaryAction}
            href={githubHref ?? 'https://github.com/softa-io/softa'}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  )
}

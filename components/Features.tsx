
import styles from './Features.module.css';
import type { FeatureItem } from './i18n/features';

type FeaturesProps = {
  items: FeatureItem[]
}

export default function Features({ items }: FeaturesProps) {
  return (
    <div className={styles.featuresContainer}>
      {items.map(item => (
        <div key={item.title} className={styles.featureItem}>
          <h2>{item.title}</h2>
          <p>{item.desc}</p>
        </div>
      ))}
    </div>
  )
}

// Trail.tsx

import styles from './Trail.module.css';
import type { TrailCopy } from './i18n/trail';

type TrailProps = {
  copy: TrailCopy
}

export default function Trail({ copy }: TrailProps) {
  return (
    <div className={styles.trailContainer}>
      <h3 className={styles.sectionTitle}>{copy.title}</h3>
      {copy.descriptions.map(text => (
        <p key={text} className={styles.trailDescription}>
          {text}
        </p>
      ))}
    </div>
  );
};

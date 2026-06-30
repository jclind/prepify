import styles from 'src/_exports.module.scss'

// Single source for Prepify's loading-state palette (docs/design/loading-states.md),
// mirroring src/util/modalStyles.ts. These re-export SCSS tokens so JS consumers
// (react-loading-skeleton's `baseColor`, react-loader-spinner's `color`) stay in
// lockstep with the stylesheet instead of redefining hex literals per file.
//
//   skeletonBase  — the one grey for every Skeleton placeholder ($gray-400)
//   spinnerColor  — the one neutral-dark for page/section spinners ($primary-text);
//                   spinners sitting on a coloured button pass `white` directly.
export const skeletonBase = styles.skeletonBase
export const spinnerColor = styles.spinnerColor

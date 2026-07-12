// cypress-image-diff-js config — visual baseline check for the type-scale
// migration. This file is TEST INFRA and is committed; the generated screenshot
// and report directories it points at are gitignored (regenerated per run, not a
// git-tracked baseline). Driven by cypress/e2e/visual/type-scale.cy.ts.
module.exports = {
  ROOT_DIR: '.',
  SCREENSHOTS_DIR: 'cypress-image-diff-screenshots', // baseline/ comparison/ diff/
  REPORT_DIR: 'cypress-image-diff-html-report', // html + json report

  // Flag anything above 0.1% of pixels differing. Conservative on purpose: the
  // expected type-scale shifts (<=2.8px, usually <=0.8px, on a line or two) stay
  // well under this, while real reflow/truncation/overflow blows past it.
  FAILURE_THRESHOLD: 0.001,

  // The baseline pass runs against the development server with an empty baseline
  // dir; this lets it auto-create baselines instead of failing.
  FAIL_ON_MISSING_BASELINE: false,

  // pixelmatch per-pixel antialiasing tolerance (lib default) — damps sub-pixel
  // AA noise so it isn't mistaken for a layout change.
  COMPARISON_OPTIONS: { threshold: 0.1 },

  JSON_REPORT: { FILENAME: 'type-scale', OVERWRITE: true },
}

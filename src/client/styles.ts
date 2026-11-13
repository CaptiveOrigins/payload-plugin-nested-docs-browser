/**
 * The default look, entirely from CSS custom properties, so a theme changes it without touching markup.
 *
 * Each `--ndb-*` variable falls back first to a generic theme token (`--palette-*`, as written by
 * `@extantape/payload-plugin-color-theory`, or any theme that sets the same names), then to a plain
 * default. Set `--ndb-*` to change only this browser; set `--palette-*` to change the whole site.
 *
 * Every element has a stable class (`ndb`, `ndb-card__name`, …) and state is in data attributes
 * (`data-layout`, `data-leaf`, `data-hidden`, `data-empty`, `data-share`), so a site can restyle any part.
 */
export const NDB_VARIABLES = {
  '--ndb-color-text': 'var(--palette-text, #3b2a26)',
  '--ndb-color-muted': 'var(--palette-text-muted, #6e5d57)',
  '--ndb-color-line': 'var(--palette-border, #e5ddd6)',
  '--ndb-color-line-soft': 'var(--palette-border-soft, #f1ebe6)',
  '--ndb-color-card': 'var(--palette-surface-raised, #ffffff)',
  '--ndb-color-card-hover': 'var(--palette-surface-hover, #fffaf6)',
  '--ndb-color-accent': 'var(--palette-primary, #cf8137)',
  '--ndb-color-on-accent': 'var(--palette-on-primary, #ffffff)',
  '--ndb-color-ink': 'var(--palette-text, #3b2a26)',
  '--ndb-color-on-ink': 'var(--palette-surface-raised, #ffffff)',
  '--ndb-color-track': 'var(--palette-surface-sunken, #f1e9e2)',
  '--ndb-color-focus': 'var(--palette-focus, var(--palette-primary, #cf8137))',
  /** Color of mask images (one-color icons and silhouettes). */
  '--ndb-color-image': 'var(--palette-primary, currentColor)',
  '--ndb-radius-card': 'var(--palette-radius-lg, 14px)',
  '--ndb-radius-control': 'var(--palette-radius-md, 8px)',
  '--ndb-radius-pill': '999px',
  '--ndb-gap': '16px',
  '--ndb-card-padding': '18px',
  '--ndb-card-min': '230px',
  '--ndb-gallery-min': '280px',
  '--ndb-leaf-min': '220px',
  '--ndb-target': '44px',
  '--ndb-bar-height': '6px',
  '--ndb-image-size': '48px',
  '--ndb-columns': '15rem',
  '--ndb-section-gap': '36px',
  '--ndb-font-name-weight': '650',
} as const

const vars = Object.entries(NDB_VARIABLES)
  .map(([k, v]) => `  ${k}: ${v};`)
  .join('\n')

/**
 * The stylesheet. Zero specificity (`:where`) except link color, which carries one class so a site's bare
 * `a { color }` can't override the theme; any class a site adds still wins.
 */
export const NDB_STYLES = `
:where(.ndb) {
${vars}
  color: var(--ndb-color-text);
}
/* One class of weight: beats a site's bare a { color } rule, loses to any class the site adds. */
.ndb :where(a) { color: inherit; }
:where(.ndb) :where(a, button, input, summary):focus-visible { outline: 3px solid var(--ndb-color-focus); outline-offset: 2px; }
:where(.ndb__crumbs) { color: var(--ndb-color-muted); font-size: .95em; margin-bottom: 8px; }
:where(.ndb__crumbs-list) { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; }
:where(.ndb__crumb) { display: inline-flex; gap: 6px; align-items: center; }
:where(.ndb__crumb-link) { display: inline-flex; min-height: var(--ndb-target); align-items: center; }
:where(.ndb__title) { margin: 4px 0 6px; }
:where(.ndb__system-name) { color: var(--ndb-color-muted); font-style: italic; margin: 0; }
:where(.ndb__summary) { color: var(--ndb-color-muted); margin: 6px 0 0; }
:where(.ndb__switch) { display: inline-flex; gap: 8px; align-items: center; min-height: var(--ndb-target); margin-top: 8px; cursor: pointer; }
:where(.ndb__switch-input) { width: 20px; height: 20px; accent-color: var(--ndb-color-accent); }
:where(.ndb__switch-count) { color: var(--ndb-color-muted); }
:where(.ndb__showing) { color: var(--ndb-color-muted); margin-top: 10px; }
:where(.ndb__grid) { display: grid; gap: var(--ndb-gap); margin-top: var(--ndb-gap); grid-template-columns: repeat(auto-fill, minmax(min(var(--ndb-card-min), 100%), 1fr)); }
:where(.ndb[data-layout="gallery"] .ndb__grid) { grid-template-columns: repeat(auto-fill, minmax(min(var(--ndb-gallery-min), 100%), 1fr)); }
:where(.ndb[data-layout="leaves"] .ndb__grid) { grid-template-columns: repeat(auto-fill, minmax(min(var(--ndb-leaf-min), 100%), 1fr)); }
:where(.ndb-card) { display: flex; flex-direction: column; gap: 6px; padding: var(--ndb-card-padding); border: 1px solid var(--ndb-color-line); border-radius: var(--ndb-radius-card); background: var(--ndb-color-card); color: inherit; text-decoration: none; }
:where(a.ndb-card:hover) { border-color: var(--ndb-color-accent); background: var(--ndb-color-card-hover); }
:where(.ndb-card__image) { width: var(--ndb-image-size); height: var(--ndb-image-size); object-fit: contain; }
:where(.ndb-card__name) { font-weight: var(--ndb-font-name-weight); }
:where(.ndb-card__system-name) { color: var(--ndb-color-muted); font-style: italic; font-size: .93em; }
:where(.ndb-card__count) { color: var(--ndb-color-muted); font-size: .93em; }
:where(.ndb-card__bar) { display: block; height: var(--ndb-bar-height); background: var(--ndb-color-track); border-radius: calc(var(--ndb-bar-height) / 2); overflow: hidden; margin-top: 4px; }
:where(.ndb-card__bar-fill) { display: block; height: 100%; background: var(--ndb-color-accent); }
:where(.ndb-button) { display: inline-flex; align-items: center; justify-content: center; min-height: var(--ndb-target); padding: 0 16px; border: 1px solid var(--ndb-color-line); border-radius: var(--ndb-radius-pill); background: var(--ndb-color-card); font: inherit; font-weight: 600; color: inherit; cursor: pointer; }
:where(.ndb-button[aria-pressed="true"], .ndb-button[aria-expanded="true"]) { background: var(--ndb-color-ink); color: var(--ndb-color-on-ink); border-color: var(--ndb-color-ink); }
:where(.ndb-showall__button) { margin-top: 12px; }
:where(.ndb-compact) { margin-top: 12px; padding: 12px 16px; border: 1px solid var(--ndb-color-line); border-radius: 12px; background: var(--ndb-color-card); }
:where(.ndb-compact__tools) { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; color: var(--ndb-color-muted); font-size: .9em; }
:where(.ndb-compact__sort) { min-height: 36px; font-weight: 400; }
:where(.ndb-compact__list) { list-style: none; margin: 8px 0 0; padding: 0; columns: 3 var(--ndb-columns); column-gap: 28px; }
:where(.ndb-compact__row) { break-inside: avoid; display: flex; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--ndb-color-line-soft); min-height: 32px; }
:where(.ndb-compact__count) { color: var(--ndb-color-muted); font-variant-numeric: tabular-nums; }
:where(.ndb-compact__empty) { margin-top: 10px; }
:where(.ndb-compact__empty-summary) { min-height: var(--ndb-target); display: flex; align-items: center; cursor: pointer; color: var(--ndb-color-muted); }
:where(.ndb-letters) { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 12px; }
:where(.ndb-letters__button) { min-width: var(--ndb-target); padding: 0 10px; border-radius: var(--ndb-radius-control); flex-direction: column; line-height: 1.1; }
:where(.ndb-letters__count) { font-weight: 400; font-size: .72em; }
:where(.ndb-section) { margin-top: var(--ndb-section-gap); }
:where(.ndb-section__title) { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 1.3em; }
:where(.ndb-section__count) { color: var(--ndb-color-muted); font-size: .75em; font-weight: 400; }
:where(.ndb-section__image) { width: 40px; height: 40px; }
`

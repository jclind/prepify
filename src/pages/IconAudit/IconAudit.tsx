// TEMPORARY review page — proposed Lucide single-family migration, before/after.
// Reachable at /icon-audit. Deleted (with src/Components/icons/_audit.tsx) before
// the PR opens; never ships.
import React, { FC } from 'react'
import type { IconType } from 'src/Components/icons'
import {
  CROSS_FAMILY, DECISIONS, FEATHER_RENAME, ALREADY_LUCIDE, AuditRow,
} from 'src/Components/icons/_audit'

const SIZE = 30

const Swatch: FC<{ Icon: IconType; fam?: string; label?: string; props?: Record<string, unknown> }> = ({
  Icon, fam, label, props,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 64 }}>
    <div
      style={{
        width: 52, height: 52, display: 'grid', placeItems: 'center',
        border: '1px solid #e3e3e3', borderRadius: 8, background: '#fff', color: '#303841',
      }}
    >
      <Icon size={SIZE} {...props} />
    </div>
    <code style={{ fontSize: 11, color: '#8a8f98' }}>{label ?? fam}</code>
  </div>
)

const Row: FC<{ row: AuditRow }> = ({ row }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px',
      borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap',
    }}
  >
    <div style={{ width: 220 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{row.concept}</div>
      {row.note && <div style={{ fontSize: 12, color: '#8a8f98', marginTop: 2 }}>{row.note}</div>}
    </div>
    <Swatch Icon={row.before} fam={row.beforeFam} label={`now · ${row.beforeFam}`} />
    <span style={{ color: '#c0c4cc', fontSize: 22 }}>→</span>
    <Swatch
      Icon={row.after}
      fam={row.afterFam}
      label={`Lucide${row.afterProps ? ' · fill' : ''}`}
      props={row.afterProps}
    />
    {row.options && (
      <div style={{ display: 'flex', gap: 12, marginLeft: 16, paddingLeft: 16, borderLeft: '1px dashed #e3e3e3' }}>
        {row.options.map(o => (
          <Swatch key={o.label} Icon={o.Icon} label={o.label} props={o.props} />
        ))}
      </div>
    )}
  </div>
)

const Section: FC<{ title: string; blurb?: string; children: React.ReactNode }> = ({ title, blurb, children }) => (
  <section style={{ marginBottom: 36 }}>
    <h2 style={{ fontSize: 18, margin: '0 0 2px' }}>{title}</h2>
    {blurb && <p style={{ margin: '0 0 12px', color: '#8a8f98', fontSize: 13 }}>{blurb}</p>}
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>{children}</div>
  </section>
)

const IconAudit: FC = () => (
  <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px', color: '#303841' }}>
    <h1 style={{ marginBottom: 4 }}>Icon family audit — Lucide</h1>
    <p style={{ color: '#8a8f98', marginTop: 0 }}>
      Temporary review page (<code>/icon-audit</code>). Left = today's glyph, right = proposed Lucide.
      94 concepts: 21 already Lucide, 40 Feather→Lucide renames, 21 cross-family swaps, 12 decisions.
    </p>

    <Section
      title="① Cross-family swaps — these change appearance (the real win)"
      blurb="Today these are pulled from AntDesign / BoxIcons / Bootstrap / Ionicons / Material / Tabler. Lucide equivalents below."
    >
      {CROSS_FAMILY.map(r => <Row key={r.concept} row={r} />)}
    </Section>

    <Section
      title="② Decisions — pick a glyph"
      blurb="Filled/outline pairs collapse to the SAME Lucide glyph via fill='currentColor' (no shape change on toggle). Taste picks show options. GoogleColorIcon stays — the one true exception."
    >
      {DECISIONS.map(r => <Row key={r.concept} row={r} />)}
    </Section>

    <Section
      title="③ Feather → Lucide — near-identical (Lucide is Feather's successor)"
      blurb="Pure renames, zero visual risk. A couple of glyph renames flagged inline."
    >
      {FEATHER_RENAME.map(r => <Row key={r.concept} row={r} />)}
    </Section>

    <Section title="④ Already Lucide — no change (the food/avatar set)">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16 }}>
        {ALREADY_LUCIDE.map(({ concept, Icon }) => (
          <Swatch key={concept} Icon={Icon} label={concept.replace(/Icon$/, '')} />
        ))}
      </div>
    </Section>
  </div>
)

export default IconAudit

// TEMPORARY review page — full-app clickable/button audit. Reachable at
// /button-audit. Deleted (with _data.ts) before the PR opens; never ships.
// Same throwaway-audit-page precedent as /icon-audit and /elevation-audit.
import React, { FC, useMemo, useState } from 'react'
import {
  INVENTORY, FINDINGS, CANON, FAMILIES, SEV_ORDER,
  Severity, Family, Clickable, Finding,
} from './_data'

const SEV: Record<Severity, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#c5303f', bg: '#fdecee' },
  high: { label: 'High', color: '#e8590c', bg: '#fdefe6' },
  medium: { label: 'Medium', color: '#b7791f', bg: '#fbf3e2' },
  low: { label: 'Low', color: '#667085', bg: '#f2f4f7' },
  ok: { label: 'On-system', color: '#2f855a', bg: '#eaf6ef' },
}

const INK = '#303841'
const MUTED = '#8a8f98'
const LINE = '#ececec'

const Pill: FC<{ sev: Severity; children?: React.ReactNode }> = ({ sev, children }) => (
  <span
    style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 11.5,
      fontWeight: 700, letterSpacing: '.02em', color: SEV[sev].color, background: SEV[sev].bg,
      whiteSpace: 'nowrap',
    }}
  >
    {children ?? SEV[sev].label}
  </span>
)

// Tiny visual approximation of each family (so the table reads at a glance).
const FamilySwatch: FC<{ family: Family }> = ({ family }) => {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: 26, minWidth: 54, padding: '0 10px', fontSize: 11, fontWeight: 700,
    borderRadius: 999, boxSizing: 'border-box',
  }
  const map: Record<Family, React.CSSProperties> = {
    'Primary fill': { ...base, background: '#ff5722', color: '#fff' },
    Outline: { ...base, background: '#fff', border: '1px solid #d6d6d6', color: INK },
    Ghost: { ...base, background: 'transparent', color: '#595f66' },
    Danger: { ...base, background: '#fff', border: '1px solid #c5303f', color: '#c5303f' },
    'Text link': { ...base, background: 'transparent', color: '#ff5722', textDecoration: 'underline', minWidth: 0, padding: 0 },
    'Icon-only': { ...base, width: 26, minWidth: 26, padding: 0, borderRadius: '50%', background: '#fff', border: '1px solid #d6d6d6', color: '#595f66' },
    'Chip / toggle': { ...base, background: 'rgba(255,87,34,.1)', color: '#ff5722' },
    Card: { ...base, borderRadius: 8, background: '#fff', boxShadow: '0 2px 8px rgba(48,56,65,.14)', color: INK },
    'Nav / segmented': { ...base, background: 'transparent', color: '#595f66', minWidth: 0, padding: '0 4px' },
    'Load more': { ...base, borderRadius: 8, background: '#fff', border: '1px solid #d6d6d6', color: INK },
    'Select / combobox': { ...base, borderRadius: 6, background: '#fff', border: '2px solid #d6d6d6', color: MUTED },
    Other: { ...base, borderRadius: 6, background: 'transparent', border: '1px dashed #c0c4cc', color: MUTED },
  }
  return <span style={map[family]}>{family === 'Icon-only' ? '•' : family === 'Text link' ? 'link' : 'Aa'}</span>
}

const Card: FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#fff', ...style }}>{children}</div>
)

const FindingCard: FC<{ f: Finding; n: number }> = ({ f, n }) => (
  <Card style={{ padding: '16px 18px', borderLeft: `4px solid ${SEV[f.severity].color}` }}>
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 800, color: MUTED, fontSize: 13 }}>#{n}</span>
      <Pill sev={f.severity} />
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1, minWidth: 240 }}>{f.title}</h3>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', marginTop: 12, fontSize: 13.5, lineHeight: 1.5 }}>
      <span style={{ color: '#2f855a', fontWeight: 700 }}>Peers</span><span>{f.peers}</span>
      <span style={{ color: f.severity === 'ok' ? MUTED : SEV[f.severity].color, fontWeight: 700 }}>Outlier</span><span>{f.offender}</span>
      <span style={{ color: INK, fontWeight: 700 }}>Fix</span><span>{f.recommend}</span>
    </div>
    <div style={{ marginTop: 10, fontSize: 11.5, color: MUTED, fontFamily: 'ui-monospace, Menlo, monospace' }}>{f.refs}</div>
  </Card>
)

const ButtonAudit: FC = () => {
  const [famFilter, setFamFilter] = useState<Family | 'All'>('All')
  const [sevFilter, setSevFilter] = useState<Severity | 'All'>('All')
  const [q, setQ] = useState('')

  const counts = useMemo(() => {
    const bySev: Record<string, number> = {}
    const byFam: Record<string, number> = {}
    INVENTORY.forEach(c => { bySev[c.outlier] = (bySev[c.outlier] || 0) + 1; byFam[c.family] = (byFam[c.family] || 0) + 1 })
    return { bySev, byFam }
  }, [])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return INVENTORY.filter(c =>
      (famFilter === 'All' || c.family === famFilter) &&
      (sevFilter === 'All' || c.outlier === sevFilter) &&
      (!needle || `${c.name} ${c.surface} ${c.label} ${c.hover} ${c.why ?? ''}`.toLowerCase().includes(needle))
    ).sort((a, b) => SEV_ORDER.indexOf(a.outlier) - SEV_ORDER.indexOf(b.outlier))
  }, [famFilter, sevFilter, q])

  const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: MUTED, borderBottom: `1px solid ${LINE}`, position: 'sticky', top: 0, background: '#fff' }
  const td: React.CSSProperties = { padding: '9px 10px', fontSize: 13, verticalAlign: 'top', borderBottom: `1px solid #f6f6f6` }

  const flagged = INVENTORY.filter(c => c.outlier !== 'ok' && c.outlier !== 'low').length

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 24px 96px', color: INK, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Real .btn elements below hover with the SHIPPED behaviour — this style
          block only handles the filter chips + table row hover on THIS page. */}
      <style>{`
        .ba-chip{cursor:pointer;transition:all .12s ease}
        .ba-chip:hover{border-color:#ff5722}
        .ba-row:hover{background:#fcfcfa}
        .ba-live{display:inline-flex;gap:10px;flex-wrap:wrap}
      `}</style>

      <header style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#ff5722' }}>Design audit · temporary</div>
        <h1 style={{ margin: '6px 0 0', fontSize: 34, fontWeight: 800, letterSpacing: '-.02em' }}>Clickables &amp; buttons — full-app audit</h1>
        <p style={{ margin: '10px 0 0', color: MUTED, fontSize: 15, lineHeight: 1.55, maxWidth: 820 }}>
          An outside-eye pass over every clickable in the app — buttons, links, icon controls, toggles, cards,
          nav items — cataloguing its <strong>text &amp; icon format</strong>, <strong>base style</strong>, <strong>hover behaviour</strong>,
          and how likely it is to be an <strong>outlier</strong> against its peers. Read straight from the SCSS; no assumptions.
          Reachable at <code>/button-audit</code>; deleted before the PR. Not a to-do list — a map of where the button system is and isn’t coherent.
        </p>
      </header>

      {/* Coverage strip */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '22px 0 34px' }}>
        <Stat big={String(INVENTORY.length)} label="controls catalogued" />
        <Stat big={String(FINDINGS.length)} label="systemic findings" />
        <Stat big={String(flagged)} label="critical/high/medium outliers" />
        <Stat big="10" label="surfaces swept" />
        {SEV_ORDER.map(s => (
          <button key={s} className="ba-chip" onClick={() => { setSevFilter(sevFilter === s ? 'All' : s); const el = document.getElementById('inventory'); el?.scrollIntoView({ behavior: 'smooth' }) }}
            style={{ border: `1px solid ${sevFilter === s ? SEV[s].color : LINE}`, background: sevFilter === s ? SEV[s].bg : '#fff', borderRadius: 12, padding: '10px 14px', textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: SEV[s].color }}>{counts.bySev[s] || 0}</div>
            <div style={{ fontSize: 11.5, color: MUTED }}>{SEV[s].label}</div>
          </button>
        ))}
      </div>

      {/* Canonical reference — REAL buttons, hover them to feel the shipped language */}
      <Section title="The intended language" blurb="These are live .btn elements — hover them to feel the shipped hover behaviour every other control is judged against.">
        <Card style={{ padding: 20 }}>
          <div className="ba-live">
            {CANON.map(b => (
              <div key={b.cls} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                <button className={b.cls}>{b.label}</button>
                <code style={{ fontSize: 10.5, color: MUTED }}>{b.note}</code>
              </div>
            ))}
          </div>
          <p style={{ margin: '18px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
            One 0.15s timing token drives every property together; fills lighten (brightness 1.06); surfaced buttons rise −2px and gain a
            fill-matched glow; ghost stays flat. The audit below measures drift <em>from</em> this.
          </p>
        </Card>
      </Section>

      {/* Findings */}
      <Section title="Systemic findings" blurb="Cross-cutting inconsistencies, ranked by severity. Each pairs what the peer group does against the outlier and a fix.">
        <div style={{ display: 'grid', gap: 12 }}>
          {FINDINGS.map((f, i) => <FindingCard key={f.title} f={f} n={i + 1} />)}
        </div>
      </Section>

      {/* Family clusters */}
      <Section title="By family" blurb="Every control grouped by the family it belongs to. Outlier count per family shown; click a family to filter the inventory.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {FAMILIES.map(fam => {
            const members = INVENTORY.filter(c => c.family === fam)
            if (!members.length) return null
            const bad = members.filter(m => m.outlier === 'critical' || m.outlier === 'high').length
            return (
              <Card key={fam} style={{ padding: 14, cursor: 'pointer', borderColor: bad ? '#f2c9c0' : LINE }}
                onClick={() => { setFamFilter(fam); setSevFilter('All'); document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' }) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <FamilySwatch family={fam} />
                  <span style={{ fontSize: 12, color: MUTED }}>{members.length}</span>
                </div>
                <div style={{ marginTop: 10, fontWeight: 700, fontSize: 14 }}>{fam}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: bad ? SEV.high.color : MUTED }}>
                  {bad ? `${bad} high/critical outlier${bad > 1 ? 's' : ''}` : 'coherent'}
                </div>
              </Card>
            )
          })}
        </div>
      </Section>

      {/* Full inventory */}
      <Section title="Full inventory" blurb="Every catalogued clickable. Filter by family or severity; search text/hover/notes.">
        <div id="inventory" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 12px' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
            style={{ padding: '8px 12px', border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13, minWidth: 180 }} />
          <FilterChip active={famFilter === 'All'} onClick={() => setFamFilter('All')}>All families</FilterChip>
          {FAMILIES.filter(f => counts.byFam[f]).map(f => (
            <FilterChip key={f} active={famFilter === f} onClick={() => setFamFilter(famFilter === f ? 'All' : f)}>{f} ({counts.byFam[f]})</FilterChip>
          ))}
          {(famFilter !== 'All' || sevFilter !== 'All' || q) && (
            <button className="ba-chip" onClick={() => { setFamFilter('All'); setSevFilter('All'); setQ('') }}
              style={{ border: 'none', background: 'none', color: '#ff5722', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>reset</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12.5, color: MUTED }}>{rows.length} shown</span>
        </div>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 920 }}>
              <thead>
                <tr>
                  <th style={th}>Control</th><th style={th}>Surface</th><th style={th}>Element</th>
                  <th style={th}>Icon</th><th style={th}>Family</th><th style={th}>Hover behaviour</th><th style={th}>Outlier</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.name + i} className="ba-row" style={{ borderLeft: `3px solid ${c.outlier === 'ok' ? 'transparent' : SEV[c.outlier].color}` }}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: MUTED, fontFamily: 'ui-monospace, Menlo, monospace' }}>{c.loc}</div>
                      {c.label !== '—' && <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>“{c.label}”</div>}
                    </td>
                    <td style={{ ...td, color: '#667085' }}>{c.surface}</td>
                    <td style={{ ...td, fontSize: 11.5, fontFamily: 'ui-monospace, Menlo, monospace', color: '#667085' }}>{c.element}</td>
                    <td style={{ ...td, fontSize: 12, color: '#667085' }}>{c.icon}</td>
                    <td style={td}><FamilySwatch family={c.family} /><div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{c.family}</div></td>
                    <td style={{ ...td, maxWidth: 300 }}>
                      <div>{c.hover}</div>
                      {c.why && <div style={{ fontSize: 12, color: c.outlier === 'ok' ? '#2f855a' : SEV[c.outlier].color, marginTop: 4 }}>{c.why}</div>}
                    </td>
                    <td style={td}><Pill sev={c.outlier} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <footer style={{ marginTop: 48, paddingTop: 18, borderTop: `1px solid ${LINE}`, fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>
        Temporary audit surface · not linked from nav · remove before merge. Contrast/AA notes reflect the owner-deferred
        brand-orange recolor (<code>$primary-accessible</code> currently aliases the vivid <code>$primary</code>). “On-system”
        rows are included as the coherent baseline, not as problems.
      </footer>
    </div>
  )
}

const Stat: FC<{ big: string; label: string }> = ({ big, label }) => (
  <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: '10px 16px', background: '#fff' }}>
    <div style={{ fontSize: 22, fontWeight: 800 }}>{big}</div>
    <div style={{ fontSize: 11.5, color: MUTED }}>{label}</div>
  </div>
)

const Section: FC<{ title: string; blurb?: string; children: React.ReactNode }> = ({ title, blurb, children }) => (
  <section style={{ marginTop: 44 }}>
    <h2 style={{ fontSize: 21, fontWeight: 800, margin: '0 0 3px', letterSpacing: '-.01em' }}>{title}</h2>
    {blurb && <p style={{ margin: '0 0 16px', color: MUTED, fontSize: 13.5, maxWidth: 760, lineHeight: 1.5 }}>{blurb}</p>}
    {children}
  </section>
)

const FilterChip: FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button className="ba-chip" onClick={onClick}
    style={{ border: `1px solid ${active ? '#ff5722' : LINE}`, background: active ? '#fff3ee' : '#fff', color: active ? '#ff5722' : '#667085', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
    {children}
  </button>
)

export default ButtonAudit

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Calendar, Clock, Database, HeartCrack, Info, MapPin, TrendingUp, Zap } from 'lucide-react';

// Paleta validada sobre el panel oscuro #0c1a29 (validate_palette.js, modo dark)
const C_COUNT = '#3987e5';
const C_LETHAL = '#d95926';
const RAMP_COUNT = ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb'];
const RAMP_LETHAL = ['#8a3510', '#b8471b', '#d95926', '#ec8a5e', '#f5b394', '#fcdccb'];
const PANEL_BG = '#0c1a29';
const INK_AXIS = '#94a3b8';
const INK_LABEL = '#cbd5e1';
const GRID = 'rgba(255,255,255,0.08)';

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_SHORT = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
const DOW_LONG = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const NIGHT_HOURS = [22, 23, 0, 1, 2, 3, 4];
const DAY_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
// Por debajo de este número de accidentes con víctimas la letalidad es poco fiable
const MIN_VICTIM_SAMPLE = 500;

const fmt = (n) => Number(n || 0).toLocaleString('es-CO');
const pct = (n, digits = 1) => `${Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
const victims = (r) => (r.heridos || 0) + (r.muertos || 0);
// Accidentes con muertos por cada 100 accidentes con víctimas: no depende de si se registran los "solo daños"
const lethality = (r) => (victims(r) ? (r.muertos / victims(r)) * 100 : 0);
const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;
const shortCommune = (name) => name.replace('Corregimiento de ', 'Correg. ');

function sumRows(rows) {
  return rows.reduce(
    (acc, r) => ({ total: acc.total + r.total, heridos: acc.heridos + r.heridos, muertos: acc.muertos + r.muertos }),
    { total: 0, heridos: 0, muertos: 0 }
  );
}

function niceMax(v) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function rampColor(ramp, value, max) {
  if (max <= 0) return ramp[0];
  const idx = Math.min(ramp.length - 1, Math.floor((value / max) * ramp.length));
  return ramp[idx];
}

const S = {
  label: { fontSize: '11.5px', color: 'var(--c-text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  th: { padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' },
  td: { padding: '10px 14px' },
  tdNum: { padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--c-text)', fontWeight: 600, whiteSpace: 'nowrap' },
};

function Kpi({ label, value, sub, icon: Icon, tint, color }) {
  return (
    <div className="card-surface" style={{ padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={S.label}>{label}</span>
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            backgroundColor: tint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--c-text)', marginTop: '8px', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '11.5px', color: 'var(--c-text-2)', marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

function MetricToggle({ value, onChange }) {
  const options = [
    { id: 'count', label: 'Cantidad' },
    { id: 'lethal', label: 'Letalidad' },
  ];
  return (
    <div style={{ display: 'flex', backgroundColor: 'var(--c-surface-2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: value === o.id ? 700 : 500,
            color: value === o.id ? '#ffffff' : 'var(--c-text-2)',
            backgroundColor: value === o.id ? 'var(--c-petrol)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LegendSwatch({ color, label, dashed, ink = 'var(--c-text)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
      <span
        style={{
          width: '14px',
          height: dashed ? '0' : '10px',
          borderTop: dashed ? `2px dashed ${color}` : 'none',
          backgroundColor: dashed ? 'transparent' : color,
          borderRadius: '2px',
          display: 'inline-block',
        }}
      />
      <span style={{ color: ink, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function RampLegend({ ramp, minLabel, maxLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: INK_AXIS, marginTop: '8px' }}>
      <span>{minLabel}</span>
      <div style={{ display: 'flex', gap: '2px' }}>
        {ramp.map((c) => (
          <span key={c} style={{ width: '22px', height: '10px', backgroundColor: c, borderRadius: '2px', display: 'inline-block' }} />
        ))}
      </div>
      <span>{maxLabel}</span>
    </div>
  );
}

// Panel oscuro del laboratorio; el tooltip se posiciona en % del área del gráfico
function ChartPanel({ children, tooltip, legend }) {
  const below = tooltip && tooltip.y < 35;
  const flip = tooltip && tooltip.x > 65;
  return (
    <div
      style={{
        width: '100%',
        backgroundColor: PANEL_BG,
        borderRadius: '10px',
        padding: '14px 18px',
        border: '1px solid #1a334d',
        boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
      <div style={{ position: 'relative', minWidth: '640px' }}>
        {children}
        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltip.x}%`,
              top: `${tooltip.y}%`,
              transform: `translate(${flip ? 'calc(-100% - 10px)' : '10px'}, ${below ? '10px' : 'calc(-100% - 6px)'})`,
              backgroundColor: '#0b1a29',
              border: '1px solid rgba(148, 163, 184, 0.45)',
              borderRadius: '6px',
              padding: '7px 10px',
              pointerEvents: 'none',
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            {tooltip.lines.map((l, i) => (
              <div
                key={i}
                style={{
                  fontSize: i === 0 ? '11.5px' : '11px',
                  fontWeight: i === 0 ? 700 : 500,
                  color: i === 0 ? '#ffffff' : INK_LABEL,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.45,
                }}
              >
                {l}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      {legend}
    </div>
  );
}

function ChartCard({ title, subtitle, controls, children, howTo, footer }) {
  return (
    <div className="card-surface" style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--c-text)' }}>{title}</h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--c-text-2)' }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>{controls}</div>
      </div>
      {howTo && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: 'var(--c-text-2)', lineHeight: 1.5, marginTop: '-6px' }}>
          <Info size={14} color="var(--c-teal)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong style={{ color: 'var(--c-text)' }}>Cómo leer: </strong>
            {howTo}
          </span>
        </div>
      )}
      {children}
      {footer}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: '6px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-text-2)', borderBottom: '1px solid var(--c-border)' }}>
            {columns.map((c) => (
              <th key={c.key} style={{ ...S.th, textAlign: c.num ? 'right' : 'left' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid var(--c-border)', backgroundColor: idx % 2 === 0 ? 'var(--c-surface)' : 'var(--c-surface-3)' }}>
              {columns.map((c) => (
                <td key={c.key} style={c.num ? { ...S.tdNum, textAlign: 'right' } : { ...S.td, color: 'var(--c-text)' }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceNote({ data }) {
  const historic = data.source === 'incidents_historico';
  return (
    <div style={{ fontSize: '11px', color: 'var(--c-text-2)', lineHeight: 1.5, borderTop: '1px solid var(--c-border)', paddingTop: '10px' }}>
      Fuente:{' '}
      {historic
        ? 'Secretaría de Movilidad de Medellín, vía Mendeley Data (Correa Álvarez et al., 2026, CC BY 4.0, doi:10.17632/r6g5dfnpgh.1).'
        : 'MEData — Alcaldía de Medellín.'}{' '}
      Letalidad = accidentes con muertos por cada 100 accidentes con víctimas (heridos o muertos). Desde 2023 casi no se registran los
      accidentes de solo daños, por eso la letalidad se calcula sobre accidentes con víctimas.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horario: matriz hora × día de la semana
// ---------------------------------------------------------------------------
function HourDayView({ data, metric, setMetric }) {
  const [tooltip, setTooltip] = useState(null);
  const cells = data.hour_day;

  const byHour = useMemo(() => Array.from({ length: 24 }, (_, h) => sumRows(cells.filter((c) => c.hour === h))), [cells]);
  const byDow = useMemo(() => Object.fromEntries(DOW_ORDER.map((d) => [d, sumRows(cells.filter((c) => c.dow === d))])), [cells]);
  const total = sumRows(cells).total;

  const peakHour = byHour.reduce((best, r, h) => (r.total > byHour[best].total ? h : best), 0);
  const lethalHour = byHour.reduce((best, r, h) => (lethality(r) > lethality(byHour[best]) ? h : best), 0);
  const peakDow = DOW_ORDER.reduce((best, d) => (byDow[d].total > byDow[best].total ? d : best), DOW_ORDER[0]);
  const lethalDow = DOW_ORDER.reduce((best, d) => (lethality(byDow[d]) > lethality(byDow[best]) ? d : best), DOW_ORDER[0]);

  const night = sumRows(NIGHT_HOURS.map((h) => byHour[h]));
  const day = sumRows(DAY_HOURS.map((h) => byHour[h]));
  const ratio = lethality(day) ? lethality(night) / lethality(day) : 0;
  const nightShare = total ? (night.total / total) * 100 : 0;

  const value = (c) => (metric === 'count' ? c.total : lethality(c));
  const max = Math.max(...cells.map(value), 0);
  const ramp = metric === 'count' ? RAMP_COUNT : RAMP_LETHAL;

  const vbW = 1000;
  const left = 46;
  const cw = (vbW - left - 4) / 24;
  const ch = 26;
  const vbH = 7 * ch + 26;

  const findCell = (d, h) => cells.find((c) => c.dow === d && c.hour === h) || { total: 0, heridos: 0, muertos: 0 };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Kpi label="Hora con más accidentes" value={hourLabel(peakHour)} sub={`${fmt(byHour[peakHour].total)} accidentes (${pct((byHour[peakHour].total / total) * 100)} del total)`} icon={Clock} tint="rgba(22, 135, 248, 0.08)" color="var(--c-route-short)" />
        <Kpi label="Hora más letal" value={hourLabel(lethalHour)} sub={`${lethality(byHour[lethalHour]).toFixed(1)} con muertos por cada 100 con víctimas`} icon={HeartCrack} tint="rgba(239, 68, 68, 0.1)" color="var(--c-danger)" />
        <Kpi label="Día con más accidentes" value={DOW_LONG[peakDow]} sub={`${fmt(byDow[peakDow].total)} accidentes registrados`} icon={Calendar} tint="var(--c-route-safe-soft)" color="var(--c-route-safe)" />
        <Kpi label="Día más letal" value={DOW_LONG[lethalDow]} sub={`${lethality(byDow[lethalDow]).toFixed(1)} con muertos por cada 100 con víctimas`} icon={AlertTriangle} tint="rgba(245, 158, 11, 0.12)" color="var(--risk-2)" />
      </div>

      <ChartCard
        title={
          ratio > 1.3
            ? `De noche hay menos accidentes, pero son ${ratio.toFixed(1)} veces más letales`
            : 'Accidentes por hora y día de la semana'
        }
        subtitle={`Entre las 22:00 y las 05:00 ocurre el ${pct(nightShare)} de los accidentes; la letalidad nocturna es ${lethality(night).toFixed(1)} vs ${lethality(day).toFixed(1)} de día (07:00–19:00).`}
        controls={<MetricToggle value={metric} onChange={setMetric} />}
        howTo={
          metric === 'count'
            ? 'Cada celda es una hora de un día de la semana. Cuanto más clara, más accidentes ocurrieron a esa hora. Pasa el cursor para ver el detalle.'
            : 'Cada celda muestra cuántos de cada 100 accidentes con víctimas terminaron con muertos a esa hora. Más claro = más letal, aunque haya pocos accidentes.'
        }
      >
        <ChartPanel
          tooltip={tooltip}
          legend={
            <RampLegend
              ramp={ramp}
              minLabel={metric === 'count' ? 'Menos accidentes' : 'Menos letal'}
              maxLabel={metric === 'count' ? `Más (${fmt(max)})` : `Más letal (${max.toFixed(1)})`}
            />
          }
        >
          <svg viewBox={`0 0 ${vbW} ${vbH}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseLeave={() => setTooltip(null)}>
            {DOW_ORDER.map((d, row) => (
              <g key={d}>
                <text x={left - 8} y={row * ch + ch / 2 + 4} fill={INK_LABEL} fontSize="11" textAnchor="end" fontFamily="'JetBrains Mono'">
                  {DOW_SHORT[d]}
                </text>
                {Array.from({ length: 24 }, (_, h) => {
                  const c = findCell(d, h);
                  return (
                    <rect
                      key={h}
                      x={left + h * cw + 1}
                      y={row * ch + 1}
                      width={cw - 2}
                      height={ch - 2}
                      rx="3"
                      fill={rampColor(ramp, value(c), max)}
                      onMouseEnter={() =>
                        setTooltip({
                          x: ((left + h * cw + cw / 2) / vbW) * 100,
                          y: ((row * ch + ch / 2) / vbH) * 100,
                          lines: [
                            `${DOW_LONG[d]} ${hourLabel(h)}`,
                            `${fmt(c.total)} accidentes`,
                            `${fmt(c.heridos)} con heridos · ${fmt(c.muertos)} con muertos`,
                            `Letalidad ${lethality(c).toFixed(2)}`,
                          ],
                        })
                      }
                    />
                  );
                })}
              </g>
            ))}
            {Array.from({ length: 8 }, (_, i) => i * 3).map((h) => (
              <text key={h} x={left + h * cw + cw / 2} y={7 * ch + 16} fill={INK_AXIS} fontSize="10" textAnchor="middle" fontFamily="'JetBrains Mono'">
                {hourLabel(h)}
              </text>
            ))}
          </svg>
        </ChartPanel>

        <DataTable
          columns={[
            { key: 'hora', label: 'Hora', render: (r) => <strong style={{ fontFamily: 'var(--font-mono)' }}>{hourLabel(r.h)}</strong> },
            {
              key: 'total',
              label: 'Accidentes',
              num: true,
              render: (r) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '70px', height: '6px', backgroundColor: 'var(--c-surface-2)', borderRadius: '3px', overflow: 'hidden', display: 'inline-block' }}>
                    <span style={{ width: `${(r.total / byHour[peakHour].total) * 100}%`, height: '100%', backgroundColor: C_COUNT, display: 'block', borderRadius: '3px' }} />
                  </span>
                  {fmt(r.total)}
                </span>
              ),
            },
            { key: 'share', label: '% del total', num: true, render: (r) => pct((r.total / total) * 100) },
            { key: 'heridos', label: 'Con heridos', num: true, render: (r) => fmt(r.heridos) },
            { key: 'muertos', label: 'Con muertos', num: true, render: (r) => fmt(r.muertos) },
            { key: 'let', label: 'Letalidad', num: true, render: (r) => lethality(r).toFixed(2) },
            {
              key: 'pico',
              label: 'Día con más accidentes',
              render: (r) => DOW_LONG[DOW_ORDER.reduce((best, d) => (findCell(d, r.h).total > findCell(best, r.h).total ? d : best), DOW_ORDER[0])],
            },
          ]}
          rows={byHour.map((r, h) => ({ ...r, h }))}
        />
        <SourceNote data={data} />
      </ChartCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tipo de accidente: % de accidentes vs % de muertes
// ---------------------------------------------------------------------------
function ClassView({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const rows = data.by_class;
  const t = sumRows(rows);
  const enriched = rows.map((r) => ({
    ...r,
    shareAcc: t.total ? (r.total / t.total) * 100 : 0,
    shareDeath: t.muertos ? (r.muertos / t.muertos) * 100 : 0,
  }));

  const mostFrequent = enriched[0];
  const reliable = enriched.filter((r) => victims(r) >= MIN_VICTIM_SAMPLE);
  const mostLethal = reliable.reduce((best, r) => (lethality(r) > lethality(best) ? r : best), reliable[0] || enriched[0]);
  const overRep = enriched.reduce((best, r) => (r.shareAcc && r.shareDeath / r.shareAcc > best.shareDeath / Math.max(best.shareAcc, 0.01) ? r : best), enriched[0]);

  const vbW = 1000;
  const labelW = 150;
  const rowH = 46;
  const barH = 14;
  const plotW = vbW - labelW - 70;
  const max = niceMax(Math.max(...enriched.map((r) => Math.max(r.shareAcc, r.shareDeath)), 1));
  const vbH = enriched.length * rowH + 24;
  const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Kpi label="Tipo más frecuente" value={titleCase(mostFrequent.clase)} sub={`${pct(mostFrequent.shareAcc)} de los accidentes`} icon={Database} tint="rgba(22, 135, 248, 0.08)" color="var(--c-route-short)" />
        <Kpi label="Tipo más letal" value={titleCase(mostLethal.clase)} sub={`${lethality(mostLethal).toFixed(1)} con muertos por cada 100 con víctimas`} icon={HeartCrack} tint="rgba(239, 68, 68, 0.1)" color="var(--c-danger)" />
        <Kpi label={`Muertes por ${titleCase(overRep.clase).toLowerCase()}`} value={pct(overRep.shareDeath)} sub={`siendo solo el ${pct(overRep.shareAcc)} de los accidentes`} icon={AlertTriangle} tint="rgba(245, 158, 11, 0.12)" color="var(--risk-2)" />
        <Kpi label="Accidentes con muertos" value={fmt(t.muertos)} sub={`de ${fmt(t.total)} accidentes registrados`} icon={Zap} tint="rgba(16, 42, 67, 0.08)" color="var(--c-petrol)" />
      </div>

      <ChartCard
        title={`Los ${titleCase(overRep.clase).toLowerCase()}s son el ${pct(overRep.shareAcc, 0)} de los accidentes, pero el ${pct(overRep.shareDeath, 0)} de las muertes`}
        subtitle="Compara qué parte de los accidentes y qué parte de las muertes aporta cada tipo. Cuando la barra naranja supera a la azul, ese tipo mata más de lo que su frecuencia sugiere."
        controls={
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <LegendSwatch color={C_COUNT} label="% de los accidentes" />
            <LegendSwatch color={C_LETHAL} label="% de las muertes" />
          </div>
        }
        howTo="Las dos barras de cada tipo suman cada una 100% entre todos los tipos. Una barra naranja mucho más larga que la azul indica un tipo de accidente poco frecuente pero muy peligroso."
      >
        <ChartPanel tooltip={tooltip}>
          <svg viewBox={`0 0 ${vbW} ${vbH}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseLeave={() => setTooltip(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={labelW + f * plotW} y1="0" x2={labelW + f * plotW} y2={enriched.length * rowH} stroke={f === 0 ? 'rgba(255,255,255,0.18)' : GRID} strokeDasharray={f === 0 ? '' : '3 3'} />
                <text x={labelW + f * plotW} y={enriched.length * rowH + 16} fill={INK_AXIS} fontSize="10" textAnchor="middle" fontFamily="'JetBrains Mono'">
                  {Math.round(f * max)}%
                </text>
              </g>
            ))}
            {enriched.map((r, i) => {
              const y = i * rowH + 8;
              const wA = Math.max((r.shareAcc / max) * plotW, r.total ? 2 : 0);
              const wD = Math.max((r.shareDeath / max) * plotW, r.muertos ? 2 : 0);
              return (
                <g
                  key={r.clase}
                  onMouseEnter={() =>
                    setTooltip({
                      x: ((labelW + Math.max(wA, wD)) / vbW) * 100,
                      y: ((y + barH) / vbH) * 100,
                      lines: [
                        titleCase(r.clase),
                        `${fmt(r.total)} accidentes (${pct(r.shareAcc)})`,
                        `${fmt(r.muertos)} con muertos (${pct(r.shareDeath)})`,
                        `Letalidad ${lethality(r).toFixed(2)}`,
                      ],
                    })
                  }
                >
                  <rect x="0" y={i * rowH} width={vbW} height={rowH} fill="transparent" />
                  <text x={labelW - 10} y={y + barH + 4} fill={INK_LABEL} fontSize="11.5" textAnchor="end" fontWeight="600">
                    {titleCase(r.clase)}
                  </text>
                  <rect x={labelW} y={y} width={wA} height={barH} rx="3" fill={C_COUNT} />
                  <text x={labelW + wA + 6} y={y + barH - 3} fill={INK_LABEL} fontSize="10" fontFamily="'JetBrains Mono'">
                    {pct(r.shareAcc)}
                  </text>
                  <rect x={labelW} y={y + barH + 2} width={wD} height={barH} rx="3" fill={C_LETHAL} />
                  <text x={labelW + wD + 6} y={y + 2 * barH - 1} fill={INK_LABEL} fontSize="10" fontFamily="'JetBrains Mono'">
                    {pct(r.shareDeath)}
                  </text>
                </g>
              );
            })}
          </svg>
        </ChartPanel>

        <DataTable
          columns={[
            { key: 'clase', label: 'Tipo de accidente', render: (r) => <strong>{titleCase(r.clase)}</strong> },
            { key: 'total', label: 'Accidentes', num: true, render: (r) => fmt(r.total) },
            { key: 'shareAcc', label: '% accidentes', num: true, render: (r) => pct(r.shareAcc) },
            { key: 'heridos', label: 'Con heridos', num: true, render: (r) => fmt(r.heridos) },
            { key: 'muertos', label: 'Con muertos', num: true, render: (r) => fmt(r.muertos) },
            { key: 'shareDeath', label: '% muertes', num: true, render: (r) => pct(r.shareDeath) },
            { key: 'let', label: 'Letalidad', num: true, render: (r) => (victims(r) < MIN_VICTIM_SAMPLE ? `${lethality(r).toFixed(2)}*` : lethality(r).toFixed(2)) },
          ]}
          rows={enriched}
        />
        <div style={{ fontSize: '11px', color: 'var(--c-text-2)' }}>* Menos de {MIN_VICTIM_SAMPLE} accidentes con víctimas: tasa poco fiable.</div>
        <SourceNote data={data} />
      </ChartCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Comunas: volumen vs letalidad
// ---------------------------------------------------------------------------
function CommuneView({ data, metric, setMetric }) {
  const [tooltip, setTooltip] = useState(null);
  const all = data.by_commune;
  const t = sumRows(all);
  const grandTotal = data.totals.total;

  const value = (r) => (metric === 'count' ? r.total : lethality(r));
  const sorted = [...all].sort((a, b) => value(b) - value(a));
  const reliable = all.filter((r) => victims(r) >= MIN_VICTIM_SAMPLE);
  const top = [...all].sort((a, b) => b.total - a.total);
  const mostLethal = reliable.reduce((best, r) => (lethality(r) > lethality(best) ? r : best), reliable[0] || all[0]);
  const top3Share = grandTotal ? (sumRows(top.slice(0, 3)).total / grandTotal) * 100 : 0;
  const cityLethality = lethality(t);

  const vbW = 1000;
  const labelW = 210;
  const rowH = 22;
  const plotW = vbW - labelW - 80;
  const max = niceMax(Math.max(...sorted.map(value), 0));
  const vbH = sorted.length * rowH + 24;
  const color = metric === 'count' ? C_COUNT : C_LETHAL;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Kpi label="Comuna con más accidentes" value={top[0] ? shortCommune(top[0].comuna) : '—'} sub={top[0] ? `${fmt(top[0].total)} accidentes (${pct((top[0].total / grandTotal) * 100)})` : ''} icon={MapPin} tint="rgba(22, 135, 248, 0.08)" color="var(--c-route-short)" />
        <Kpi label="Comuna más letal" value={mostLethal ? shortCommune(mostLethal.comuna) : '—'} sub={mostLethal ? `${lethality(mostLethal).toFixed(1)} vs ${cityLethality.toFixed(1)} promedio de la ciudad` : ''} icon={HeartCrack} tint="rgba(239, 68, 68, 0.1)" color="var(--c-danger)" />
        <Kpi label="Concentración top 3" value={pct(top3Share)} sub={`de los accidentes en ${top.slice(0, 3).map((r) => shortCommune(r.comuna)).join(', ')}`} icon={TrendingUp} tint="rgba(245, 158, 11, 0.12)" color="var(--risk-2)" />
        <Kpi label="Territorios analizados" value={all.length} sub="16 comunas y 5 corregimientos" icon={Database} tint="var(--c-route-safe-soft)" color="var(--c-route-safe)" />
      </div>

      <ChartCard
        title={
          metric === 'count'
            ? `${top[0] ? shortCommune(top[0].comuna) : ''} concentra el ${top[0] ? pct((top[0].total / grandTotal) * 100, 0) : ''} de los accidentes de la ciudad`
            : `En ${mostLethal ? shortCommune(mostLethal.comuna) : ''}, ${lethality(mostLethal || {}).toFixed(1)} de cada 100 accidentes con víctimas terminan con muertos`
        }
        subtitle={
          metric === 'count'
            ? 'Número de accidentes registrados por comuna y corregimiento. El centro concentra el tráfico, pero no necesariamente las muertes: cambia a "Letalidad".'
            : `Promedio de la ciudad: ${cityLethality.toFixed(1)}. Las comunas periféricas y los corredores rápidos suelen tener menos accidentes pero más graves.`
        }
        controls={<MetricToggle value={metric} onChange={setMetric} />}
        howTo={
          metric === 'count'
            ? 'Barras ordenadas de mayor a menor número de accidentes. Pasa el cursor para ver heridos, muertos y el barrio con más accidentes.'
            : `Barras ordenadas por letalidad. Las marcadas con * tienen menos de ${MIN_VICTIM_SAMPLE} accidentes con víctimas y su tasa es poco fiable.`
        }
      >
        <ChartPanel
          tooltip={tooltip}
          legend={
metric === 'lethal' && (
            <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: INK_AXIS, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', borderTop: `1.5px dashed ${INK_LABEL}`, display: 'inline-block' }} />
                Promedio de la ciudad ({cityLethality.toFixed(2)})
              </span>
            </div>
          )
          }
        >
          <svg viewBox={`0 0 ${vbW} ${vbH}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseLeave={() => setTooltip(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={labelW + f * plotW} y1="0" x2={labelW + f * plotW} y2={sorted.length * rowH} stroke={f === 0 ? 'rgba(255,255,255,0.18)' : GRID} strokeDasharray={f === 0 ? '' : '3 3'} />
                <text x={labelW + f * plotW} y={sorted.length * rowH + 16} fill={INK_AXIS} fontSize="10" textAnchor="middle" fontFamily="'JetBrains Mono'">
                  {metric === 'count' ? fmt(Math.round(f * max)) : (f * max).toFixed(1)}
                </text>
              </g>
            ))}
            {metric === 'lethal' && (
              <line x1={labelW + (cityLethality / max) * plotW} y1="0" x2={labelW + (cityLethality / max) * plotW} y2={sorted.length * rowH} stroke={INK_LABEL} strokeDasharray="4 3" strokeWidth="1.5" />
            )}
            {sorted.map((r, i) => {
              const w = Math.max((value(r) / max) * plotW, 2);
              const small = victims(r) < MIN_VICTIM_SAMPLE;
              return (
                <g
                  key={r.code}
                  onMouseEnter={() =>
                    setTooltip({
                      x: ((labelW + w) / vbW) * 100,
                      y: ((i * rowH + rowH / 2) / vbH) * 100,
                      lines: [
                        `${r.comuna} (${r.code})`,
                        `${fmt(r.total)} accidentes · ${pct((r.total / grandTotal) * 100)}`,
                        `${fmt(r.heridos)} con heridos · ${fmt(r.muertos)} con muertos`,
                        `Letalidad ${lethality(r).toFixed(2)}${small ? ' (muestra pequeña)' : ''}`,
                        r.top_barrio ? `Barrio con más accidentes: ${r.top_barrio}` : '',
                      ].filter(Boolean),
                    })
                  }
                >
                  <rect x="0" y={i * rowH} width={vbW} height={rowH} fill="transparent" />
                  <text x={labelW - 10} y={i * rowH + 15} fill={INK_LABEL} fontSize="11" textAnchor="end">
                    {shortCommune(r.comuna)}
                    {metric === 'lethal' && small ? ' *' : ''}
                  </text>
                  <rect x={labelW} y={i * rowH + 4} width={w} height={rowH - 8} rx="3" fill={color} opacity={metric === 'lethal' && small ? 0.45 : 1} />
                  <text x={labelW + w + 6} y={i * rowH + 15} fill={INK_LABEL} fontSize="10" fontFamily="'JetBrains Mono'">
                    {metric === 'count' ? fmt(r.total) : lethality(r).toFixed(2)}
                  </text>
                </g>
              );
            })}
          </svg>
</ChartPanel>

        <DataTable
          columns={[
            { key: 'rank', label: '#', render: (r) => r.rank },
            { key: 'comuna', label: 'Comuna / corregimiento', render: (r) => <strong>{r.comuna}</strong> },
            { key: 'code', label: 'Código', num: true },
            { key: 'total', label: 'Accidentes', num: true, render: (r) => fmt(r.total) },
            { key: 'share', label: '% ciudad', num: true, render: (r) => pct((r.total / grandTotal) * 100) },
            { key: 'heridos', label: 'Con heridos', num: true, render: (r) => fmt(r.heridos) },
            { key: 'muertos', label: 'Con muertos', num: true, render: (r) => fmt(r.muertos) },
            { key: 'let', label: 'Letalidad', num: true, render: (r) => `${lethality(r).toFixed(2)}${victims(r) < MIN_VICTIM_SAMPLE ? '*' : ''}` },
            { key: 'top_barrio', label: 'Barrio con más accidentes', render: (r) => r.top_barrio || '—' },
          ]}
          rows={sorted.map((r, i) => ({ ...r, rank: i + 1 }))}
        />
        <SourceNote data={data} />
      </ChartCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Evolución 2008–2025: serie mensual
// ---------------------------------------------------------------------------
const EVENTS = [
  { anio: 2020, mes: 3, label: 'Cuarentena COVID-19' },
  { anio: 2023, mes: 1, label: 'Dejan de registrarse los "solo daños"' },
];

function TrendView({ data, metric, setMetric }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const months = data.by_month;
  const years = data.by_year;
  const first = months[0];
  const last = months[months.length - 1];
  const idxOf = (anio, mes) => (anio - first.anio) * 12 + (mes - first.mes);

  const series =
    metric === 'count'
      ? months.map((m) => ({ i: idxOf(m.anio, m.mes), v: victims(m), row: m, label: `${MONTHS[m.mes - 1]} ${m.anio}` }))
      : years.map((y) => {
          const ms = months.filter((m) => m.anio === y.anio);
          const mid = ms.length ? idxOf(y.anio, ms[Math.floor(ms.length / 2)].mes) : idxOf(y.anio, 6);
          return { i: mid, v: lethality(y), row: y, label: String(y.anio) };
        });

  const completeYears = years.filter((y) => y.desde.endsWith('-01-01') && y.hasta >= `${y.anio}-12-30`);
  const peakYear = years.reduce((best, y) => (victims(y) > victims(best) ? y : best), years[0]);
  const lowMonth = months.reduce((best, m) => (victims(m) < victims(best) ? m : best), months[0]);
  const firstFull = completeYears[0];
  const lastFull = completeYears[completeYears.length - 1];
  const change = firstFull && lastFull ? ((victims(lastFull) - victims(firstFull)) / victims(firstFull)) * 100 : 0;
  const total = years.reduce((a, y) => a + y.total, 0);

  const vbW = 1000;
  const vbH = 250;
  const padL = 56;
  const padR = 16;
  const padT = 46;
  const padB = 28;
  const n = idxOf(last.anio, last.mes) + 1;
  const max = niceMax(Math.max(...series.map((s) => s.v), 0));
  const x = (i) => padL + (i / Math.max(n - 1, 1)) * (vbW - padL - padR);
  const y = (v) => vbH - padB - (v / max) * (vbH - padT - padB);
  const path = series.reduce((acc, s, k) => `${acc} ${k === 0 ? 'M' : 'L'} ${x(s.i).toFixed(1)} ${y(s.v).toFixed(1)}`, '');
  const color = metric === 'count' ? C_COUNT : C_LETHAL;

  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * vbW;
    const nearest = series.reduce((best, s) => (Math.abs(x(s.i) - px) < Math.abs(x(best.i) - px) ? s : best), series[0]);
    setHover(nearest);
  };

  const tooltip = hover && {
    x: (x(hover.i) / vbW) * 100,
    y: (y(hover.v) / vbH) * 100,
    lines: [
      hover.label,
      `${fmt(victims(hover.row))} accidentes con víctimas`,
      `${fmt(hover.row.muertos)} con muertos · letalidad ${lethality(hover.row).toFixed(2)}`,
      `${fmt(hover.row.total)} registros en total`,
    ],
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Kpi label="Registros analizados" value={fmt(total)} sub={`${years.length} años · ${MONTHS[first.mes - 1]} ${first.anio} a ${MONTHS[last.mes - 1]} ${last.anio}`} icon={Database} tint="rgba(22, 135, 248, 0.08)" color="var(--c-route-short)" />
        <Kpi label="Año con más víctimas" value={peakYear.anio} sub={`${fmt(victims(peakYear))} accidentes con heridos o muertos`} icon={TrendingUp} tint="rgba(245, 158, 11, 0.12)" color="var(--risk-2)" />
        <Kpi label="Mes más bajo" value={`${MONTHS[lowMonth.mes - 1]} ${lowMonth.anio}`} sub={`${fmt(victims(lowMonth))} accidentes con víctimas`} icon={Calendar} tint="var(--c-route-safe-soft)" color="var(--c-route-safe)" />
        <Kpi
          label={firstFull && lastFull ? `Variación ${firstFull.anio} → ${lastFull.anio}` : 'Variación'}
          value={`${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
          sub="accidentes con víctimas (años completos)"
          icon={HeartCrack}
          tint="rgba(239, 68, 68, 0.1)"
          color="var(--c-danger)"
        />
      </div>

      <ChartCard
        title={
          metric === 'count'
            ? `Accidentes con víctimas por mes: ${change < 0 ? 'bajaron' : 'subieron'} ${Math.abs(change).toFixed(0)}% entre ${firstFull?.anio} y ${lastFull?.anio}`
            : 'Letalidad por año: de cada 100 accidentes con víctimas, cuántos terminan con muertos'
        }
        subtitle={
          metric === 'count'
            ? 'Se cuentan solo accidentes con heridos o muertos, que se registran igual en los 18 años. Las líneas punteadas marcan eventos que cambian la serie.'
            : 'Un punto por año. Los años parciales (primero y último) se calculan con los meses disponibles.'
        }
        controls={<MetricToggle value={metric} onChange={setMetric} />}
        howTo={
          metric === 'count'
            ? `Pasa el cursor sobre la línea para ver cada mes. Ojo: el total de registros cae en 2023 porque desde ese año casi no se registran los accidentes de solo daños; los accidentes con víctimas no se ven afectados.`
            : 'Pasa el cursor sobre la línea para ver cada año. Una línea que sube indica que, aunque haya menos accidentes, los que ocurren son más graves.'
        }
      >
        <ChartPanel tooltip={tooltip} legend={<div style={{ marginTop: '6px' }}><LegendSwatch color={color} ink={INK_LABEL} label={metric === 'count' ? 'Accidentes con víctimas (mensual)' : 'Letalidad (anual)'} /></div>}>
          <svg ref={svgRef} viewBox={`0 0 ${vbW} ${vbH}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={padL} y1={y(f * max)} x2={vbW - padR} y2={y(f * max)} stroke={f === 0 ? 'rgba(255,255,255,0.18)' : GRID} strokeDasharray={f === 0 ? '' : '3 3'} />
                <text x={padL - 8} y={y(f * max) + 3} fill={INK_AXIS} fontSize="10" textAnchor="end" fontFamily="'JetBrains Mono'">
                  {metric === 'count' ? fmt(Math.round(f * max)) : (f * max).toFixed(1)}
                </text>
              </g>
            ))}
            {years.map((yr) =>
              (yr.anio - first.anio) % 2 === 0 ? (
                <text key={yr.anio} x={x(idxOf(yr.anio, 1))} y={vbH - 10} fill={INK_AXIS} fontSize="10" textAnchor="middle" fontFamily="'JetBrains Mono'">
                  {yr.anio}
                </text>
              ) : null
            )}
            {EVENTS.filter((ev) => idxOf(ev.anio, ev.mes) >= 0 && idxOf(ev.anio, ev.mes) < n).map((ev, k) => (
              <g key={ev.label}>
                <line x1={x(idxOf(ev.anio, ev.mes))} y1={padT - 36 + k * 14} x2={x(idxOf(ev.anio, ev.mes))} y2={vbH - padB} stroke={INK_LABEL} strokeDasharray="4 3" opacity="0.6" />
                <text x={x(idxOf(ev.anio, ev.mes)) - 5} y={padT - 26 + k * 14} fill={INK_LABEL} fontSize="10.5" textAnchor="end">
                  {ev.label}
                </text>
              </g>
            ))}
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            {metric === 'lethal' && series.map((s) => <circle key={s.i} cx={x(s.i)} cy={y(s.v)} r="4" fill={color} stroke={PANEL_BG} strokeWidth="2" />)}
            {hover && (
              <g pointerEvents="none">
                <line x1={x(hover.i)} y1={padT} x2={x(hover.i)} y2={vbH - padB} stroke="rgba(255,255,255,0.35)" />
                <circle cx={x(hover.i)} cy={y(hover.v)} r="5" fill="#ffffff" stroke={color} strokeWidth="2" />
              </g>
            )}
            <rect x={padL} y={padT} width={vbW - padL - padR} height={vbH - padT - padB} fill="transparent" />
          </svg>
        </ChartPanel>

        <DataTable
          columns={[
            { key: 'anio', label: 'Año', render: (r) => <strong style={{ fontFamily: 'var(--font-mono)' }}>{r.anio}</strong> },
            { key: 'periodo', label: 'Periodo cubierto', render: (r) => `${r.desde.slice(5).split('-').reverse().join('/')} – ${r.hasta.slice(5).split('-').reverse().join('/')}` },
            { key: 'total', label: 'Registros', num: true, render: (r) => fmt(r.total) },
            { key: 'danos', label: 'Solo daños', num: true, render: (r) => fmt(r.total - victims(r)) },
            { key: 'heridos', label: 'Con heridos', num: true, render: (r) => fmt(r.heridos) },
            { key: 'muertos', label: 'Con muertos', num: true, render: (r) => fmt(r.muertos) },
            { key: 'let', label: 'Letalidad', num: true, render: (r) => lethality(r).toFixed(2) },
            {
              key: 'var',
              label: 'Var. con víctimas',
              num: true,
              render: (r) => (r.prev ? `${r.varPct > 0 ? '+' : ''}${r.varPct.toFixed(1)}%` : '—'),
            },
            { key: 'nota', label: 'Nota', render: (r) => r.nota },
          ]}
          rows={years.map((r, i) => {
            const prev = years[i - 1];
            const partial = !(r.desde.endsWith('-01-01') && r.hasta >= `${r.anio}-12-30`);
            const notes = [];
            if (partial) notes.push('Año parcial');
            if (r.anio === 2020) notes.push('Cuarentena COVID-19');
            if (r.anio >= 2023 && r.total - victims(r) < 1000) notes.push('Sin registro de solo daños');
            return {
              ...r,
              prev,
              varPct: prev ? ((victims(r) - victims(prev)) / victims(prev)) * 100 : 0,
              nota: notes.join(' · ') || '—',
            };
          })}
        />
        <SourceNote data={data} />
      </ChartCard>
    </>
  );
}

// ---------------------------------------------------------------------------

export const ANALYTICS_MODES = ['hourday', 'classes', 'communes', 'trend'];

export function useIncidentAnalytics(year, reloadKey, enabled) {
  const [state, setState] = useState({ data: null, loading: true, error: false });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    const q = year === 'ALL' ? '' : `?anio=${year}`;
    fetch(`http://127.0.0.1:8000/api/v1/incidents/analytics${q}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [year, reloadKey, enabled]);

  return state;
}

export default function IncidentAnalytics({ mode, analytics }) {
  const [metric, setMetric] = useState('count');
  const { data, loading, error } = analytics;

  if (error || (!data && !loading)) {
    return (
      <div className="card-surface" style={{ padding: '22px 26px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertTriangle size={18} color="var(--c-danger)" />
        <span style={{ fontSize: '13px', color: 'var(--c-text)' }}>
          No se pudieron cargar los datos de siniestralidad. Verifica que el backend esté corriendo en el puerto 8000.
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card-surface" style={{ padding: '22px 26px', fontSize: '13px', color: 'var(--c-text-2)' }}>
        Calculando agregaciones sobre el histórico de siniestros…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0, opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
      {mode === 'hourday' && <HourDayView data={data} metric={metric} setMetric={setMetric} />}
      {mode === 'classes' && <ClassView data={data} />}
      {mode === 'communes' && <CommuneView data={data} metric={metric} setMetric={setMetric} />}
      {mode === 'trend' && <TrendView data={data} metric={metric} setMetric={setMetric} />}
    </div>
  );
}

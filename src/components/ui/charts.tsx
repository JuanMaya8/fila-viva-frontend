'use client';

import { useState } from 'react';
import { formatMinutes } from '../../lib/format';
import { niceMax } from '../../lib/visual';

const ROW_HEIGHT = 34;
const BAR_HEIGHT = 16;
const LABEL_WIDTH = 170;
const LABEL_MAX_CHARS = 22;

const shorten = (text: string) =>
  text.length > LABEL_MAX_CHARS ? `${text.slice(0, LABEL_MAX_CHARS - 1).trimEnd()}…` : text;

const tickLabel = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const CHART_WIDTH = 560;

interface BarDatum {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

/**
 * Horizontal bar chart for one measure (minutes). Single series, so the
 * title names it and there is no legend; every bar has a hover tooltip.
 */
export function HorizontalBarChart({ data, color }: { data: BarDatum[]; color: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = niceMax(data.map((d) => d.value));
  const plot = CHART_WIDTH - LABEL_WIDTH - 50;
  const height = data.length * ROW_HEIGHT + 22;
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const current = data.find((d) => d.key === active);

  return (
    <div className={`chart ${active ? 'dimmed' : ''}`} onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} role="img" aria-label="Espera estimada por trámite">
        {ticks.map((tick) => {
          const x = LABEL_WIDTH + (tick / max) * plot;
          return (
            <g key={tick}>
              <line className="grid-line" x1={x} x2={x} y1={0} y2={height - 18} />
              <text className="axis-label" x={x} y={height - 4} textAnchor="middle">
                {tickLabel(tick)} min
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const y = i * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
          const width = Math.max(2, (d.value / max) * plot);
          return (
            <g key={d.key}>
              <text className="axis-label" x={LABEL_WIDTH - 10} y={y + BAR_HEIGHT - 3} textAnchor="end">
                <title>{d.label}</title>
                {shorten(d.label)}
              </text>
              <rect
                className={`mark ${active === d.key ? 'active' : ''}`}
                x={LABEL_WIDTH}
                y={y}
                width={width}
                height={BAR_HEIGHT}
                rx={4}
                fill={color}
              />
              <text className="value-label" x={LABEL_WIDTH + width + 6} y={y + BAR_HEIGHT - 3}>
                {formatMinutes(d.value)}
              </text>
              <rect
                className="hit"
                x={0}
                y={i * ROW_HEIGHT}
                width={CHART_WIDTH}
                height={ROW_HEIGHT}
                onMouseEnter={() => setActive(d.key)}
                onFocus={() => setActive(d.key)}
                tabIndex={0}
              />
            </g>
          );
        })}
      </svg>
      {current && (
        <div
          className="chart-tooltip"
          style={{
            left: `${((LABEL_WIDTH + Math.max(2, (current.value / max) * plot) / 2) / CHART_WIDTH) * 100}%`,
            top: `${((data.indexOf(current) * ROW_HEIGHT + 8) / height) * 100}%`,
          }}
        >
          <strong>{current.label}</strong>
          <br />
          {formatMinutes(current.value)}
          {current.detail && (
            <>
              <br />
              {current.detail}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

interface GroupDatum {
  key: string;
  label: string;
  values: Record<string, number | null>;
}

/** Grouped columns (one group per attention, one column per series) with legend and tooltip. */
export function GroupedColumnChart({ data, series }: { data: GroupDatum[]; series: SeriesDef[] }) {
  const [active, setActive] = useState<string | null>(null);
  const width = 560;
  const height = 210;
  const top = 12;
  const bottom = 26;
  const left = 34;
  const plotH = height - top - bottom;
  const max = niceMax(data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)));
  const groupW = (width - left) / Math.max(1, data.length);
  const barW = Math.min(18, (groupW - 14) / series.length - 2);
  const current = data.find((d) => d.key === active);
  const currentIndex = current ? data.indexOf(current) : -1;

  return (
    <div className="stack tight">
      <div className="legend" aria-hidden>
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className={`chart ${active ? 'dimmed' : ''}`} onMouseLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Espera predicha por la IA, tradicional y real">
          {[0, 0.5, 1].map((f) => {
            const y = top + plotH * (1 - f);
            return (
              <g key={f}>
                <line className="grid-line" x1={left} x2={width} y1={y} y2={y} />
                <text className="axis-label" x={left - 6} y={y + 4} textAnchor="end">
                  {tickLabel(f * max)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const groupX = left + i * groupW + (groupW - series.length * (barW + 2)) / 2;
            return (
              <g key={d.key}>
                {series.map((s, j) => {
                  const value = d.values[s.key] ?? 0;
                  const h = Math.max(2, (value / max) * plotH);
                  return (
                    <rect
                      key={s.key}
                      className={`mark ${active === d.key ? 'active' : ''}`}
                      x={groupX + j * (barW + 2)}
                      y={top + plotH - h}
                      width={barW}
                      height={h}
                      rx={3}
                      fill={s.color}
                    />
                  );
                })}
                <text className="axis-label" x={left + i * groupW + groupW / 2} y={height - 8} textAnchor="middle">
                  {d.label}
                </text>
                <rect
                  className="hit"
                  x={left + i * groupW}
                  y={0}
                  width={groupW}
                  height={height}
                  onMouseEnter={() => setActive(d.key)}
                  onFocus={() => setActive(d.key)}
                  tabIndex={0}
                />
              </g>
            );
          })}
        </svg>
        {current && (
          <div
            className="chart-tooltip"
            style={{
              left: `${((left + currentIndex * groupW + groupW / 2) / width) * 100}%`,
              top: '10%',
            }}
          >
            <strong>{current.label}</strong>
            {series.map((s) => (
              <div key={s.key}>
                <i
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: s.color,
                    marginRight: 6,
                  }}
                />
                {s.label}: {formatMinutes(current.values[s.key])}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

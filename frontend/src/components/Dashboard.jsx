import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Car,
  HeartCrack,
  Shield,
  Activity,
  Layers,
  Calendar,
  MapPin,
  Info,
  Filter,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros sincronizados compactos
  const [selectedSeverity, setSelectedSeverity] = useState('ALL'); // 'ALL' | 'SOLO DAÑOS' | 'CON HERIDOS' | 'CON MUERTOS'
  const [selectedYear, setSelectedYear] = useState('ALL'); // 'ALL' | '2014' .. '2020'
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Hover interactivo
  const [hoveredYear, setHoveredYear] = useState(null);
  const [hoveredCommune, setHoveredCommune] = useState(null);

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/v1/incidents/summary')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data || !data.total_incidents) throw new Error('Respuesta vacía');
        setStats(data);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading || loadError || !stats) {
    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px' }}>
        <div className="card-surface" style={{ padding: '22px 26px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {loadError ? <AlertTriangle size={18} color="var(--c-danger)" /> : <Activity size={18} />}
          <span style={{ fontSize: '13px', color: 'var(--c-text)' }}>
            {loadError
              ? 'No se pudieron cargar las estadísticas. Verifica que el backend esté corriendo en el puerto 8000.'
              : 'Cargando estadísticas…'}
          </span>
        </div>
      </div>
    );
  }

  const data = stats;

  // Cálculo de totales aplicando el filtro de severidad seleccionado si corresponde
  const rawTotal = data.total_incidents;
  const soloDanos = data.by_severity['SOLO DAÑOS'] || 0;
  const conHeridos = data.by_severity['CON HERIDOS'] || 0;
  const conMuertos = data.by_severity['CON MUERTOS'] || 0;

  let displayTotal = rawTotal;
  if (selectedSeverity === 'SOLO DAÑOS') displayTotal = soloDanos;
  else if (selectedSeverity === 'CON HERIDOS') displayTotal = conHeridos;
  else if (selectedSeverity === 'CON MUERTOS') displayTotal = conMuertos;

  // Filtrado temporal
  if (selectedYear !== 'ALL' && data.by_year[selectedYear]) {
    displayTotal =
      selectedSeverity === 'ALL'
        ? data.by_year[selectedYear]
        : data.by_year_severity?.[selectedYear]?.[selectedSeverity] || 0;
  }

  const isAnyFilterActive = selectedSeverity !== 'ALL' || selectedYear !== 'ALL' || selectedCommune !== null;

  const handleResetFilters = () => {
    setSelectedSeverity('ALL');
    setSelectedYear('ALL');
    setSelectedCommune(null);
  };

  return (
    <div
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
      className="animate-fade-in"
    >
      {/* ========================================================= */}
      {/* CABECERA EDITORIAL & FILTROS COMPACTOS                     */}
      {/* ========================================================= */}
      <div
        className="card-surface"
        style={{
          padding: '22px 26px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--c-petrol)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--c-teal-700)',
                backgroundColor: 'var(--c-teal-soft)',
                padding: '3px 9px',
                borderRadius: '6px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Inteligencia Territorial
            </span>
            <span style={{ fontSize: '12px', color: 'var(--c-text-2)' }}>
              Secretaría de Movilidad &bull; MEData Medellín
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--c-text)',
              letterSpacing: '-0.02em',
            }}
          >
            Analítica de Accidentalidad Vial en Medellín
          </h1>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: 'var(--c-text-2)',
              maxWidth: '820px',
              lineHeight: 1.45,
            }}
          >
            Exploración de 251.150 incidentes georreferenciados (2014–2020). Haz clic en una severidad, año o comuna para profundizar interactivamente.
          </p>
        </div>

        {/* Botón para desplegar / ocultar panel de filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#b91c1c',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                cursor: 'pointer',
                transition: 'all 0.16s ease',
              }}
            >
              <X size={13} />
              <span>Restablecer</span>
            </button>
          )}

          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 15px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: isAnyFilterActive ? 'var(--c-teal-soft)' : 'var(--c-surface-2)',
              color: isAnyFilterActive ? 'var(--c-teal-700)' : 'var(--c-text)',
              border: `1px solid ${isAnyFilterActive ? 'var(--c-teal)' : 'var(--c-border)'}`,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            <Filter size={14} color={isAnyFilterActive ? 'var(--c-teal)' : 'var(--c-text-2)'} />
            <span>Filtros {isAnyFilterActive ? '(Activo)' : ''}</span>
            <ChevronDown
              size={14}
              style={{
                transform: showFiltersPanel ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
        </div>
      </div>

      {/* Panel desplegable de filtros interactivos */}
      {showFiltersPanel && (
        <div
          className="card-surface animate-fade-in"
          style={{
            padding: '16px 22px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            backgroundColor: 'var(--c-surface-2)',
            borderColor: 'var(--c-border-strong)',
          }}
        >
          {/* Selector de Severidad */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--c-text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Severidad:
            </span>
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'SOLO DAÑOS', label: 'Solo Daños' },
              { id: 'CON HERIDOS', label: 'Con Heridos' },
              { id: 'CON MUERTOS', label: 'Víctimas Fatales' },
            ].map((s) => {
              const active = selectedSeverity === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeverity(s.id)}
                  style={{
                    padding: '6px 13px',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: active ? 700 : 500,
                    backgroundColor: active ? 'var(--c-petrol)' : 'var(--c-surface)',
                    color: active ? '#ffffff' : 'var(--c-text)',
                    border: `1px solid ${active ? 'var(--c-petrol)' : 'var(--c-border)'}`,
                    boxShadow: active ? '0 2px 6px rgba(16, 42, 67, 0.15)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Selector de Año */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--c-text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Año:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                backgroundColor: 'var(--c-surface)',
                color: 'var(--c-text)',
                border: '1px solid var(--c-border-strong)',
                borderRadius: '7px',
                padding: '6px 12px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Todo el histórico (2014–2020)</option>
              {Object.keys(data.by_year).map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4 KPIS ESENCIALES (ALTO CONTRASTE Y JERARQUÍA)             */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
        }}
      >
        {/* KPI Total Siniestros */}
        <div className="card-surface" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--c-text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Siniestros
            </span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 42, 67, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={16} color="var(--c-petrol)" />
            </div>
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--c-text)',
              marginTop: '8px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.1,
            }}
          >
            {displayTotal.toLocaleString()}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--c-text-2)', marginTop: '4px' }}>
            {selectedYear !== 'ALL' ? `Año ${selectedYear}` : 'Población 2014–2020'} &bull; MEData
          </div>
        </div>

        {/* KPI Solo Daños */}
        <div
          className="card-surface"
          onClick={() => setSelectedSeverity(selectedSeverity === 'SOLO DAÑOS' ? 'ALL' : 'SOLO DAÑOS')}
          style={{
            padding: '18px 22px',
            cursor: 'pointer',
            border: selectedSeverity === 'SOLO DAÑOS' ? '2px solid var(--c-route-safe)' : '1px solid var(--c-border)',
            backgroundColor: selectedSeverity === 'SOLO DAÑOS' ? 'var(--c-route-safe-soft)' : 'var(--c-surface)',
            transition: 'all 0.16s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--c-text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Solo Daños
            </span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'var(--c-route-safe-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Car size={16} color="var(--c-route-safe)" />
            </div>
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--c-text)',
              marginTop: '8px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.1,
            }}
          >
            {soloDanos.toLocaleString()}
          </div>
          <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '4px', fontWeight: 600 }}>
            {((soloDanos / rawTotal) * 100).toFixed(1)}% &bull; Severidad leve (peso 1.0)
          </div>
        </div>

        {/* KPI Con Heridos */}
        <div
          className="card-surface"
          onClick={() => setSelectedSeverity(selectedSeverity === 'CON HERIDOS' ? 'ALL' : 'CON HERIDOS')}
          style={{
            padding: '18px 22px',
            cursor: 'pointer',
            border: selectedSeverity === 'CON HERIDOS' ? '2px solid var(--risk-2)' : '1px solid var(--c-border)',
            backgroundColor: selectedSeverity === 'CON HERIDOS' ? 'rgba(245, 158, 11, 0.08)' : 'var(--c-surface)',
            transition: 'all 0.16s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--c-text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Con Heridos
            </span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={16} color="var(--risk-2)" />
            </div>
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--c-text)',
              marginTop: '8px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.1,
            }}
          >
            {conHeridos.toLocaleString()}
          </div>
          <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '4px', fontWeight: 600 }}>
            {((conHeridos / rawTotal) * 100).toFixed(1)}% &bull; Atención médica (peso 3.0)
          </div>
        </div>

        {/* KPI Con Muertos */}
        <div
          className="card-surface"
          onClick={() => setSelectedSeverity(selectedSeverity === 'CON MUERTOS' ? 'ALL' : 'CON MUERTOS')}
          style={{
            padding: '18px 22px',
            cursor: 'pointer',
            border: selectedSeverity === 'CON MUERTOS' ? '2px solid var(--risk-4)' : '1px solid var(--c-border)',
            backgroundColor: selectedSeverity === 'CON MUERTOS' ? 'rgba(239, 68, 68, 0.08)' : 'var(--c-surface)',
            transition: 'all 0.16s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--c-text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Víctimas Fatales
            </span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HeartCrack size={16} color="var(--risk-4)" />
            </div>
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--c-text)',
              marginTop: '8px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.1,
            }}
          >
            {conMuertos.toLocaleString()}
          </div>
          <div style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '4px', fontWeight: 600 }}>
            {((conMuertos / rawTotal) * 100).toFixed(1)}% &bull; Severidad crítica (peso 10.0)
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* COMPOSICIÓN PRINCIPAL: SERIE TEMPORAL & DISTRIBUCIÓN      */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Serie Temporal Histórica */}
        <div className="card-surface" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--c-text)' }}>
                Serie Temporal Anual (2014 &ndash; 2020)
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--c-text-2)' }}>
                Haz clic en cualquier año para filtrar. Nota: 2020 refleja confinamiento por pandemia (-28%).
              </p>
            </div>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(22, 135, 248, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={16} color="var(--c-route-short)" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(data.by_year).map(([year, count]) => {
              const maxVal = Math.max(...Object.values(data.by_year));
              const pct = (count / maxVal) * 100;
              const isSelected = selectedYear === year;
              const isHovered = hoveredYear === year;

              return (
                <div
                  key={year}
                  onClick={() => setSelectedYear(selectedYear === year ? 'ALL' : year)}
                  onMouseEnter={() => setHoveredYear(year)}
                  onMouseLeave={() => setHoveredYear(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '7px',
                    backgroundColor: isSelected ? 'var(--c-teal-soft)' : isHovered ? 'var(--c-surface-2)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '42px',
                      fontFamily: 'var(--font-mono)',
                      color: isSelected ? 'var(--c-teal-700)' : 'var(--c-text)',
                      fontWeight: isSelected ? 800 : 600,
                    }}
                  >
                    {year}
                  </span>

                  <div
                    style={{
                      flex: 1,
                      height: '16px',
                      backgroundColor: 'var(--c-surface-2)',
                      borderRadius: '5px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor:
                          year === '2020'
                            ? 'var(--risk-2)'
                            : isSelected
                            ? 'var(--c-teal)'
                            : isHovered
                            ? 'var(--c-route-short)'
                            : 'var(--c-petrol-500)',
                        borderRadius: '5px',
                        transition: 'all 0.18s ease',
                      }}
                    />
                  </div>

                  <span
                    style={{
                      width: '66px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: isSelected ? 'var(--c-teal-700)' : 'var(--c-text)',
                    }}
                  >
                    {count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Comunas de Medellín */}
        <div className="card-surface" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--c-text)' }}>
                Top 10 Comunas de Mayor Siniestralidad
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--c-text-2)' }}>
                Frecuencia espacial acumulada. Haz clic en una comuna para inspeccionarla.
              </p>
            </div>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--c-route-safe-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={16} color="var(--c-route-safe)" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.top_communes.map((c, i) => {
              const maxVal = data.top_communes[0]?.count || 1;
              const pct = (c.count / maxVal) * 100;
              const cleanName = c.comuna;
              const isSelected = selectedCommune?.comuna === cleanName;
              const isHovered = hoveredCommune === i;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedCommune(isSelected ? null : { ...c, comuna: cleanName })}
                  onMouseEnter={() => setHoveredCommune(i)}
                  onMouseLeave={() => setHoveredCommune(null)}
                  style={{
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '7px',
                    backgroundColor: isSelected ? 'var(--c-route-safe-soft)' : isHovered ? 'var(--c-surface-2)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: isSelected ? '#047857' : 'var(--c-text)', fontWeight: isSelected ? 700 : 600 }}>
                      <span style={{ color: 'var(--c-text-2)', marginRight: '6px', fontWeight: 500 }}>{i + 1}.</span>
                      {cleanName}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-text)', fontWeight: 700 }}>
                      {c.count.toLocaleString()}{' '}
                      {c.pct > 0 && (
                        <span style={{ fontSize: '10.5px', color: 'var(--c-text-2)', fontWeight: 500 }}>
                          ({c.pct}%)
                        </span>
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'var(--c-surface-2)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: isSelected ? 'var(--c-route-safe)' : isHovered ? 'var(--c-teal)' : 'var(--c-petrol-600)',
                        borderRadius: '4px',
                        transition: 'background-color 0.18s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ficha de Comuna seleccionada */}
          {selectedCommune && (
            <div
              className="animate-fade-in"
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '9px',
                backgroundColor: 'var(--c-route-safe-soft)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#047857' }}>{selectedCommune.comuna}</strong>
                <div style={{ fontSize: '11.5px', color: 'var(--c-text)', marginTop: '3px' }}>
                  Barrios con más siniestros: {selectedCommune.top_barrios?.length ? selectedCommune.top_barrios.join(', ') : 'Sin datos'}
                </div>
              </div>
              <button
                onClick={() => setSelectedCommune(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--c-text-2)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

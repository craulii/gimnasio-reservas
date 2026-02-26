"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import ApiService from "@/services/api";
import { BLOQUES_HORARIOS, SEDES, HORARIOS_BLOQUE, sortBloques } from "@/app/utils/constants";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

import GestionTab from "@/components/admin/GestionTab";
import UsuariosTab from "@/components/admin/UsuariosTab";
import ReservasTab from "@/components/admin/ReservasTab";
import ReservarCupo from "@/components/alumno/ReservarCupo";
import useCupos from "@/hooks/useCupos";

const REFRESH_INTERVAL = 15;

const TABS = [
  { id: 'monitor', label: 'Monitor' },
  { id: 'gestion', label: 'Gestion' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'reservar', label: 'Mi Reserva' },
];

// Heatmap color por porcentaje de ocupacion
function heatColor(pct) {
  if (pct === 0) return "bg-slate-800 text-slate-500";
  if (pct < 30) return "bg-emerald-900/60 text-emerald-300";
  if (pct < 60) return "bg-cyan-900/60 text-cyan-300";
  if (pct < 85) return "bg-amber-900/60 text-amber-300";
  return "bg-red-900/60 text-red-300";
}

// Activity feed color por tipo
function activityStyle(asistio) {
  if (asistio === 1) return { dot: "bg-emerald-400", text: "text-emerald-400", label: "Presente" };
  if (asistio === 2) return { dot: "bg-red-500", text: "text-red-400", label: "Ausencia auto" };
  if (asistio === 0) return { dot: "bg-amber-400", text: "text-amber-400", label: "Ausencia" };
  return { dot: "bg-cyan-400", text: "text-cyan-400", label: "Reserva" };
}

const CHART_COLORS = {
  cyan: "#06b6d4",
  emerald: "#10b981",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  red: "#ef4444",
  slate: "#64748b",
};

const PIE_COLORS = [CHART_COLORS.cyan, CHART_COLORS.emerald, CHART_COLORS.violet, CHART_COLORS.amber];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardGodMode({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [activeTab, setActiveTab] = useState('monitor');
  const [message, setMessage] = useState("");
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Hook de cupos para tabs admin/alumno
  const { cupos, loading: cuposLoading, fetchCupos } = useCupos(user);

  const fetchData = useCallback(async () => {
    try {
      const res = await ApiService.getMonitorData();
      if (res.ok) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.data?.error || "Error cargando datos");
      }
    } catch (err) {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchData();

    timerRef.current = setInterval(() => {
      fetchData();
      setCountdown(REFRESH_INTERVAL);
    }, REFRESH_INTERVAL * 1000);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [fetchData]);

  // Auto-clear message after 4s
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  // --- LOADING STATE ---
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-cyan-400 mx-auto mb-4" />
          <p className="text-cyan-400 text-lg font-mono animate-pulse">Inicializando God Mode...</p>
        </div>
      </div>
    );
  }

  // --- PREPARE MONITOR DATA ---
  const db = data?.db;
  const stats = data?.stats_hoy || {};
  const cuposMonitor = data?.cupos || {};
  const actividad = data?.actividad || [];
  const riesgo = data?.usuarios_riesgo || [];
  const tendencia = data?.tendencia_7d || [];
  const userTotals = data?.usuarios_totales || {};
  const mantenimiento = data?.mantenimiento;

  // Heatmap: group by bloque
  const cuposDetalle = cuposMonitor.detalle || [];
  const heatmapBloques = BLOQUES_HORARIOS.sort(sortBloques).map(bloque => {
    const items = cuposDetalle.filter(c => c.bloque === bloque);
    return { bloque, sedes: items };
  });

  // Tendencia chart data
  const tendenciaChart = tendencia.map(t => ({
    fecha: typeof t.fecha === 'string' ? t.fecha.slice(5) : new Date(t.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
    reservas: Number(t.reservas),
    usuarios: Number(t.usuarios_unicos),
  }));

  // Bar chart: reservas por bloque hoy
  const bloqueChart = cuposDetalle.reduce((acc, c) => {
    const existing = acc.find(x => x.bloque === c.bloque);
    if (existing) {
      existing.reservados += Number(c.reservados);
      existing.total += Number(c.total);
    } else {
      acc.push({ bloque: c.bloque, reservados: Number(c.reservados), total: Number(c.total) });
    }
    return acc;
  }, []).sort((a, b) => sortBloques(a.bloque, b.bloque));

  // Pie chart: reservas por sede hoy
  const sedeChart = SEDES.map(sede => {
    const items = cuposDetalle.filter(c => c.sede === sede);
    const reservados = items.reduce((sum, c) => sum + Number(c.reservados), 0);
    return { name: sede, value: reservados };
  }).filter(s => s.value > 0);

  // KPIs
  const totalReservas = Number(stats.total_reservas || 0);
  const pctUso = cuposMonitor.porcentaje_uso || 0;
  const totalUsuarios = Number(userTotals.total || 0);
  const ausencias = Number(stats.ausencias_auto || 0) + Number(stats.ausencias_manual || 0);

  // Cron status from new query
  const cronOk = mantenimiento && mantenimiento.status === 'ok';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="bg-slate-900/80 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 border border-cyan-500/40 rounded px-3 py-1">
            <span className="text-cyan-400 font-mono font-bold text-sm tracking-wider">ChrisCrauli GOD MODE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 text-xs font-mono">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-500 text-xs font-mono">{user.email}</span>
          <div className="text-slate-400 text-xs font-mono tabular-nums bg-slate-800 rounded px-2 py-1">
            {countdown}s
          </div>
          {error && <span className="text-red-400 text-xs">{error}</span>}
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-red-400 text-xs font-mono border border-slate-700 hover:border-red-500/50 rounded px-3 py-1 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="p-4 max-w-[1600px] mx-auto space-y-4">

        {/* HEALTH BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <HealthCard
            label="Database"
            value={db ? `${db.latency_ms}ms` : "---"}
            ok={!!db}
            icon="DB"
          />
          <HealthCard
            label="API"
            value={data ? "Online" : "Offline"}
            ok={!!data}
            icon="API"
          />
          <HealthCard
            label="Cron"
            value={cronOk ? `OK (${mantenimiento.cupos_generados})` : "Sin cupos"}
            ok={cronOk}
            icon="CRON"
          />
          <HealthCard
            label="Cupos hoy"
            value={`${cuposMonitor.total_reservados || 0}/${cuposMonitor.total_capacidad || 0}`}
            ok={true}
            icon="CAP"
          />
        </div>

        {/* TABS */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-mono rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* MESSAGE TOAST */}
        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm font-mono border ${
            message.toLowerCase().includes('error')
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {message}
          </div>
        )}

        {/* TAB CONTENT */}
        {activeTab === 'monitor' && (
          <MonitorContent
            stats={stats}
            cuposMonitor={cuposMonitor}
            cuposDetalle={cuposDetalle}
            heatmapBloques={heatmapBloques}
            actividad={actividad}
            riesgo={riesgo}
            tendenciaChart={tendenciaChart}
            bloqueChart={bloqueChart}
            sedeChart={sedeChart}
            totalReservas={totalReservas}
            pctUso={pctUso}
            totalUsuarios={totalUsuarios}
            ausencias={ausencias}
            data={data}
          />
        )}

        {activeTab === 'gestion' && (
          <div className="bg-stone-100 rounded-xl p-4">
            <GestionTab cupos={cupos} setMessage={setMessage} fetchCupos={fetchCupos} />
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div className="bg-stone-100 rounded-xl p-4">
            <UsuariosTab setMessage={setMessage} />
          </div>
        )}

        {activeTab === 'reservas' && (
          <div className="bg-stone-100 rounded-xl p-4">
            <ReservasTab cupos={cupos} setMessage={setMessage} fetchCupos={fetchCupos} />
          </div>
        )}

        {activeTab === 'reservar' && (
          <div className="bg-stone-100 rounded-xl p-4">
            <ReservarCupo user={user} cupos={cupos} loading={cuposLoading} setMessage={setMessage} fetchCupos={fetchCupos} />
          </div>
        )}

        {/* FOOTER */}
        <div className="text-center text-slate-700 text-[10px] font-mono py-2">
          ChrisCrauli God Mode v2.0 &mdash; {data?.fecha || '---'} &mdash; {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString('es-CL') : ''}
        </div>
      </div>
    </div>
  );
}

// --- MONITOR TAB CONTENT (extracted) ---
function MonitorContent({
  stats, cuposMonitor, cuposDetalle, heatmapBloques, actividad, riesgo,
  tendenciaChart, bloqueChart, sedeChart,
  totalReservas, pctUso, totalUsuarios, ausencias, data
}) {
  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Reservas hoy" value={totalReservas} color="cyan" />
        <KpiCard label="% Uso cupos" value={`${pctUso}%`} color="emerald" />
        <KpiCard label="Usuarios total" value={totalUsuarios} color="violet" />
        <KpiCard label="Ausencias hoy" value={ausencias} color="amber" />
      </div>

      {/* HEATMAP + ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* HEATMAP */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-mono text-slate-400 mb-3 uppercase tracking-wider">Heatmap Cupos</h3>
          <div className="space-y-1.5">
            {/* Header */}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `60px repeat(${SEDES.length}, 1fr)` }}>
              <div />
              {SEDES.map(s => (
                <div key={s} className="text-center text-[10px] text-slate-500 font-mono truncate">{s}</div>
              ))}
            </div>
            {heatmapBloques.map(({ bloque, sedes }) => {
              const horario = HORARIOS_BLOQUE[bloque];
              return (
                <div key={bloque} className="grid gap-1.5" style={{ gridTemplateColumns: `60px repeat(${SEDES.length}, 1fr)` }}>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center">
                    {horario ? horario.inicio : bloque}
                  </div>
                  {SEDES.map(sede => {
                    const item = sedes.find(s => s.sede === sede);
                    const pct = item ? Number(item.porcentaje) : 0;
                    const res = item ? Number(item.reservados) : 0;
                    const tot = item ? Number(item.total) : 0;
                    return (
                      <div
                        key={sede}
                        className={`rounded text-center py-2 text-xs font-mono ${heatColor(pct)}`}
                        title={`${bloque} ${sede}: ${res}/${tot} (${pct}%)`}
                      >
                        {item ? `${res}/${tot}` : '-'}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex gap-2 mt-3 justify-center">
            {[
              { label: "0%", cls: "bg-slate-800" },
              { label: "<30", cls: "bg-emerald-900/60" },
              { label: "<60", cls: "bg-cyan-900/60" },
              { label: "<85", cls: "bg-amber-900/60" },
              { label: "85+", cls: "bg-red-900/60" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${l.cls}`} />
                <span className="text-[9px] text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVITY FEED */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
          <h3 className="text-sm font-mono text-slate-400 mb-3 uppercase tracking-wider">
            Activity Log <span className="text-slate-600 text-xs">({actividad.length})</span>
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[340px] space-y-1 pr-1 scrollbar-thin">
            {actividad.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">Sin actividad hoy</p>
            ) : (
              actividad.map((a, i) => {
                const style = activityStyle(a.asistio);
                const time = a.created_at
                  ? new Date(a.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' })
                  : '--:--';
                return (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-slate-800/50">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                    <span className="text-slate-500 font-mono w-12 flex-shrink-0">{time}</span>
                    <span className="text-slate-300 truncate flex-1">{a.name || a.email}</span>
                    <span className="text-slate-500 font-mono text-[10px] flex-shrink-0">{a.bloque_horario}</span>
                    <span className="text-slate-600 text-[10px] flex-shrink-0 hidden sm:inline">{a.sede}</span>
                    <span className={`text-[10px] font-mono flex-shrink-0 ${style.text}`}>{style.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart - Tendencia 7d */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-mono text-slate-400 mb-3 uppercase tracking-wider">Tendencia 7 dias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tendenciaChart}>
              <defs>
                <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.cyan} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.cyan} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.violet} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="fecha" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="reservas" stroke={CHART_COLORS.cyan} fill="url(#gradCyan)" name="Reservas" />
              <Area type="monotone" dataKey="usuarios" stroke={CHART_COLORS.violet} fill="url(#gradViolet)" name="Usuarios" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Bloques hoy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-mono text-slate-400 mb-3 uppercase tracking-wider">Reservas por bloque</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bloqueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="bloque" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="reservados" fill={CHART_COLORS.cyan} name="Reservados" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" fill={CHART_COLORS.slate} name="Capacidad" radius={[4, 4, 0, 0]} opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Sedes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-mono text-slate-400 mb-3 uppercase tracking-wider">Distribucion sedes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sedeChart.length > 0 ? sedeChart : [{ name: "Sin datos", value: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {(sedeChart.length > 0 ? sedeChart : [{ name: "Sin datos", value: 1 }]).map((_, i) => (
                  <Cell key={i} fill={sedeChart.length > 0 ? PIE_COLORS[i % PIE_COLORS.length] : '#334155'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className="text-slate-400 text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLA USUARIOS EN RIESGO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-mono text-slate-400 mb-3 uppercase tracking-wider">
          Usuarios en riesgo de baneo
          <span className="text-slate-600 text-xs ml-2">({riesgo.length})</span>
        </h3>
        {riesgo.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-4">No hay usuarios en riesgo</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-2 font-mono font-normal">Nombre</th>
                  <th className="text-left py-2 font-mono font-normal">Email</th>
                  <th className="text-center py-2 font-mono font-normal">Faltas</th>
                  <th className="text-center py-2 font-mono font-normal">Estado</th>
                </tr>
              </thead>
              <tbody>
                {riesgo.map((u, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 text-slate-300">{u.name}</td>
                    <td className="py-2 text-slate-400 font-mono">{u.email}</td>
                    <td className="py-2 text-center">
                      <span className={`font-mono font-bold ${
                        Number(u.faltas) >= 3 ? 'text-red-400' :
                        Number(u.faltas) >= 2 ? 'text-amber-400' : 'text-yellow-400'
                      }`}>
                        {u.faltas}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      {Number(u.baneado) === 1 ? (
                        <span className="bg-red-500/20 text-red-400 text-[10px] font-mono px-2 py-0.5 rounded">BANNED</span>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded">RIESGO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function HealthCard({ label, value, ok, icon }) {
  return (
    <div className={`bg-slate-900 border rounded-lg px-3 py-2 flex items-center gap-3 ${
      ok ? 'border-slate-800' : 'border-red-800/50'
    }`}>
      <div className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
        ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
      }`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-slate-500 uppercase">{label}</div>
        <div className={`text-sm font-mono font-bold ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {ok ? '\u2713' : '\u2717'} {value}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  const colorMap = {
    cyan: 'border-cyan-500/30 text-cyan-400',
    emerald: 'border-emerald-500/30 text-emerald-400',
    violet: 'border-violet-500/30 text-violet-400',
    amber: 'border-amber-500/30 text-amber-400',
  };
  const bgMap = {
    cyan: 'bg-cyan-500/10',
    emerald: 'bg-emerald-500/10',
    violet: 'bg-violet-500/10',
    amber: 'bg-amber-500/10',
  };
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 ${bgMap[color]}`}>
      <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${colorMap[color]}`}>{value}</div>
    </div>
  );
}

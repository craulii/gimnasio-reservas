"use client";
import { useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ApiService from "../../../services/api";

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function EstadisticasGeneral({ setMessage, setLoading }) {
  const [periodo, setPeriodo] = useState("1mes");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargarEstadisticas = async () => {
    setCargando(true);
    setLoading(true);
    setMessage("Cargando estadísticas...");

    try {
      const hoy = new Date();
      const fechaFin = hoy.toISOString().split('T')[0];
      const fechaInicio = new Date(hoy);

      // Calcular fecha inicio según el periodo
      switch(periodo) {
        case "1semana":
          fechaInicio.setDate(hoy.getDate() - 7);
          break;
        case "1mes":
          fechaInicio.setMonth(hoy.getMonth() - 1);
          break;
        case "3meses":
          fechaInicio.setMonth(hoy.getMonth() - 3);
          break;
        case "6meses":
          fechaInicio.setMonth(hoy.getMonth() - 6);
          break;
        case "12meses":
          fechaInicio.setMonth(hoy.getMonth() - 12);
          break;
        default:
          fechaInicio.setMonth(hoy.getMonth() - 1);
      }

      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];

      const { ok, data } = await ApiService.getEstadisticas(fechaInicioStr, fechaFin);

      if (ok && data) {
        setDatos(data);
        const mensajes = {
          "1semana": "última semana",
          "1mes": "último mes",
          "3meses": "últimos 3 meses",
          "6meses": "últimos 6 meses",
          "12meses": "últimos 12 meses"
        };
        setMessage(`Estadísticas de ${mensajes[periodo]} cargadas correctamente`);
      } else {
        setMessage("No se pudieron cargar las estadísticas");
        setDatos(null);
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión");
      setDatos(null);
    } finally {
      setCargando(false);
      setLoading(false);
    }
  };

  // Preparar datos para gráficos
  const dataBloques = datos?.por_bloque?.map(bloque => ({
    bloque: `Bloque ${bloque.bloque_horario}`,
    reservas: parseInt(bloque.total_reservas) || 0,
    asistencias: parseInt(bloque.total_asistencias) || 0,
    ausencias: (parseInt(bloque.total_reservas) || 0) - (parseInt(bloque.total_asistencias) || 0),
    porcentaje: parseFloat(bloque.porcentaje_asistencia) || 0
  })) || [];

  const dataSedes = datos?.por_sede?.map(sede => ({
    sede: sede.sede,
    reservas: parseInt(sede.total_reservas) || 0,
    asistencias: parseInt(sede.total_asistencias) || 0,
    ausencias: (parseInt(sede.total_reservas) || 0) - (parseInt(sede.total_asistencias) || 0)
  })) || [];

  const dataDistribucion = datos?.resumen ? [
    { name: 'Asistieron', value: parseInt(datos.resumen.total_asistencias) || 0 },
    { name: 'No asistieron', value: (parseInt(datos.resumen.total_reservas) || 0) - (parseInt(datos.resumen.total_asistencias) || 0) }
  ] : [];

  const tasasOcupacion = dataBloques.map(b => ({
    bloque: b.bloque,
    tasa: b.porcentaje
  }));

  return (
    <div className="space-y-6">
      {/* HEADER CON SELECTOR Y BOTÓN - MEJORADO */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 rounded-2xl shadow-2xl overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-40 h-40 bg-white opacity-10 rounded-full"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Estadísticas Generales</h2>
              <p className="text-indigo-100 text-sm">Panel de análisis del gimnasio</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-white text-sm font-semibold mb-2 tracking-wide">
                PERIODO DE ANÁLISIS
              </label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-base font-medium bg-white/95 backdrop-blur-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-white/50 shadow-lg transition-all hover:bg-white"
              >
                <option value="1semana">Última semana (7 días)</option>
                <option value="1mes">Último mes (30 días)</option>
                <option value="3meses">Últimos 3 meses</option>
                <option value="6meses">Últimos 6 meses</option>
                <option value="12meses">Último año (12 meses)</option>
              </select>
            </div>
            <button
              onClick={cargarEstadisticas}
              disabled={cargando}
              className="px-10 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-gray-50 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-lg shadow-xl transform hover:scale-105 active:scale-95"
            >
              {cargando ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Cargando...
                </span>
              ) : (
                "CARGAR DATOS"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      {!datos && !cargando ? (
        <div className="text-center py-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
          <div className="inline-block p-6 bg-white rounded-full shadow-lg mb-6">
            <svg className="h-20 w-20 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-2xl text-gray-700 font-semibold mb-2">
            Selecciona un periodo
          </p>
          <p className="text-gray-500">
            Presiona CARGAR DATOS para visualizar las estadísticas
          </p>
        </div>
      ) : datos ? (
        <>
          {/* TARJETAS DE RESUMEN - MEJORADAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-6 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm uppercase font-bold tracking-wider opacity-90">Total Reservas</p>
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-5xl font-bold mb-2">{datos.resumen?.total_reservas || 0}</p>
              <p className="text-xs opacity-80">Reservas totales realizadas</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm uppercase font-bold tracking-wider opacity-90">Asistencias</p>
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-5xl font-bold mb-2">{datos.resumen?.total_asistencias || 0}</p>
              <p className="text-xs opacity-80">Alumnos que asistieron</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm uppercase font-bold tracking-wider opacity-90">Tasa de Asistencia</p>
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <p className="text-5xl font-bold mb-2">{datos.resumen?.porcentaje_asistencia || 0}%</p>
              <p className="text-xs opacity-80">Porcentaje de cumplimiento</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm uppercase font-bold tracking-wider opacity-90">Alumnos Únicos</p>
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-5xl font-bold mb-2">{datos.resumen?.usuarios_unicos || 0}</p>
              <p className="text-xs opacity-80">Usuarios activos del periodo</p>
            </div>
          </div>

          {/* GRÁFICOS EN 2 COLUMNAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GRÁFICO DE PASTEL */}
            {dataDistribucion.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                  <h3 className="text-xl font-bold text-gray-800">Distribución de Asistencia</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dataDistribucion}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dataDistribucion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* GRÁFICO DE BARRAS - Asistencia vs Ausencias */}
            {dataBloques.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-green-600 rounded-full"></div>
                  <h3 className="text-xl font-bold text-gray-800">Asistencia vs Ausencias por Bloque</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dataBloques}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="bloque" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="asistencias" fill="#10b981" name="Asistencias" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="ausencias" fill="#ef4444" name="Ausencias" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* SEGUNDA FILA DE GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GRÁFICO DE LÍNEA - Tasa */}
            {tasasOcupacion.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                  <h3 className="text-xl font-bold text-gray-800">Tasa de Asistencia por Bloque</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tasasOcupacion}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="bloque" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="tasa" stroke="#3b82f6" strokeWidth={3} name="Tasa %" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* GRÁFICO DE BARRAS - Comparación por Sede */}
            {dataSedes.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
                  <h3 className="text-xl font-bold text-gray-800">Comparación por Sede</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dataSedes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="sede" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reservas" fill="#6366f1" name="Reservas" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="asistencias" fill="#10b981" name="Asistencias" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="ausencias" fill="#ef4444" name="Ausencias" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* TABLA DETALLADA POR BLOQUE */}
          {datos.por_bloque && datos.por_bloque.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-gray-800">Detalles por Bloque Horario</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Bloque</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Reservas</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Asistencias</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Ausencias</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Tasa %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {datos.por_bloque.map((bloque, idx) => {
                      const ausencias = bloque.total_reservas - bloque.total_asistencias;
                      return (
                        <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-900">Bloque {bloque.bloque_horario}</td>
                          <td className="px-6 py-4 text-right text-gray-700">{bloque.total_reservas}</td>
                          <td className="px-6 py-4 text-right font-bold text-green-600">{bloque.total_asistencias}</td>
                          <td className="px-6 py-4 text-right font-bold text-red-600">{ausencias}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                              {bloque.porcentaje_asistencia}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABLA POR SEDE */}
          {datos.por_sede && datos.por_sede.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-gray-800">Detalles por Sede</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sede</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Reservas</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Asistencias</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Ausencias</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Tasa %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {datos.por_sede.map((sede, idx) => {
                      const ausencias = sede.total_reservas - sede.total_asistencias;
                      return (
                        <tr key={idx} className="hover:bg-purple-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-900">{sede.sede}</td>
                          <td className="px-6 py-4 text-right text-gray-700">{sede.total_reservas}</td>
                          <td className="px-6 py-4 text-right font-bold text-green-600">{sede.total_asistencias}</td>
                          <td className="px-6 py-4 text-right font-bold text-red-600">{ausencias}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                              {sede.porcentaje_asistencia}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

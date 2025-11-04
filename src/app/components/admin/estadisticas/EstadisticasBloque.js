"use client";
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ApiService from "../../../services/api";

export default function EstadisticasBloque({ fechaInicio, fechaFin, cupos, setMessage, setLoading }) {
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState("");
  const [estadisticasBloque, setEstadisticasBloque] = useState({});

  const cargarEstadisticasBloque = async () => {
    if (!bloqueSeleccionado) {
      setMessage("Por favor selecciona un bloque");
      return;
    }
    
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getEstadisticasBloque(
        bloqueSeleccionado, 
        fechaInicio, 
        fechaFin
      );
      console.log("Datos bloque recibidos:", data);
      if (ok) {
        setEstadisticasBloque(data);
        setMessage("");
      } else {
        setMessage("Error cargando estadísticas del bloque");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Error de conexión");
    }
    setLoading(false);
  };

  const limpiarEstadisticas = () => {
    setEstadisticasBloque({});
    setBloqueSeleccionado("");
  };

  // Extraer bloques únicos de cupos
  const bloquesDisponibles = [...new Set(Object.values(cupos).map(c => c.bloque))].sort();

  // Preparar datos para gráficos
  const dataPorDia = estadisticasBloque.datosPorDia?.slice(0, 14).reverse().map(d => ({
    fecha: new Date(d.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
    reservas: d.reservas,
    asistencias: d.asistencias,
    porcentaje: parseFloat(d.porcentaje_asistencia)
  })) || [];

  const dataDiaSemana = estadisticasBloque.estadisticasDiaSemana?.map(d => ({
    dia: d.dia_semana.substring(0, 3),
    reservas: d.total_reservas,
    asistencia: parseFloat(d.porcentaje_asistencia)
  })) || [];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bloque horario
          </label>
          <select
            value={bloqueSeleccionado}
            onChange={(e) => setBloqueSeleccionado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccionar bloque</option>
            {bloquesDisponibles.map((b) => (
              <option key={b} value={b}>
                Bloque {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end space-x-2">
          <button
            onClick={cargarEstadisticasBloque}
            disabled={!bloqueSeleccionado}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            Analizar Bloque
          </button>
          <button
            onClick={limpiarEstadisticas}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
          >
            Limpiar
          </button>
        </div>
      </div>

      {estadisticasBloque && Object.keys(estadisticasBloque).length > 0 ? (
        <div className="space-y-6 mt-6">
          {/* Header con nombre del bloque */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white shadow-lg">
            <h3 className="text-3xl font-bold">
              Análisis del Bloque {estadisticasBloque.bloque}
            </h3>
            <p className="text-blue-100 mt-1">Estadísticas detalladas del horario seleccionado</p>
          </div>

          {/* Métricas principales */}
          {estadisticasBloque.estadisticasGenerales && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg border-l-4 border-blue-500 shadow-sm">
                <p className="text-sm text-gray-600 font-medium mb-1">Total Reservas</p>
                <p className="text-3xl font-bold text-blue-600">
                  {estadisticasBloque.estadisticasGenerales.total_reservas}
                </p>
                <p className="text-xs text-gray-500 mt-1">En el período</p>
              </div>

              <div className="bg-white p-6 rounded-lg border-l-4 border-green-500 shadow-sm">
                <p className="text-sm text-gray-600 font-medium mb-1">Alumnos Únicos</p>
                <p className="text-3xl font-bold text-green-600">
                  {estadisticasBloque.estadisticasGenerales.alumnos_unicos}
                </p>
                <p className="text-xs text-gray-500 mt-1">Usuarios diferentes</p>
              </div>

              <div className="bg-white p-6 rounded-lg border-l-4 border-purple-500 shadow-sm">
                <p className="text-sm text-gray-600 font-medium mb-1">% Asistencia</p>
                <p className="text-3xl font-bold text-purple-600">
                  {estadisticasBloque.estadisticasGenerales.porcentaje_asistencia}%
                </p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        estadisticasBloque.estadisticasGenerales.porcentaje_asistencia >= 80 ? 'bg-green-500' :
                        estadisticasBloque.estadisticasGenerales.porcentaje_asistencia >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${estadisticasBloque.estadisticasGenerales.porcentaje_asistencia}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border-l-4 border-orange-500 shadow-sm">
                <p className="text-sm text-gray-600 font-medium mb-1">Promedio/día</p>
                <p className="text-3xl font-bold text-orange-600">
                  {estadisticasBloque.estadisticasGenerales.promedio_reservas_por_dia}
                </p>
                <p className="text-xs text-gray-500 mt-1">Reservas diarias</p>
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendencia últimos 14 días */}
            {dataPorDia.length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-4">Tendencia Últimos 14 Días</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dataPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" stroke="#6b7280" style={{ fontSize: '11px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="reservas" stroke="#3b82f6" strokeWidth={2} name="Reservas" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="asistencias" stroke="#10b981" strokeWidth={2} name="Asistencias" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Estadísticas por día de semana */}
            {dataDiaSemana.length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-4">Popularidad por Día de Semana</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dataDiaSemana}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dia" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="reservas" fill="#3b82f6" name="Reservas" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Alumnos más frecuentes */}
          {estadisticasBloque.alumnosFrecuentes && estadisticasBloque.alumnosFrecuentes.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
                <h4 className="font-semibold text-white">Alumnos Más Frecuentes en este Bloque</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Alumno</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Veces</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Asistió</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">% Asistencia</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estadisticasBloque.alumnosFrecuentes.slice(0, 10).map((alumno, idx) => (
                      <tr key={idx} className={idx < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-gray-300 text-gray-900' :
                            idx === 2 ? 'bg-orange-400 text-orange-900' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {alumno.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {alumno.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {alumno.veces_reservado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {alumno.veces_asistido}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  alumno.porcentaje_asistencia >= 80 ? 'bg-green-500' :
                                  alumno.porcentaje_asistencia >= 60 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${alumno.porcentaje_asistencia}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{alumno.porcentaje_asistencia}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resumen estadístico */}
          {estadisticasBloque.estadisticasGenerales && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
              <h4 className="font-semibold text-blue-900 mb-4">Resumen del Período</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-600 font-medium">Días activos</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {estadisticasBloque.estadisticasGenerales.dias_activos}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Primera reserva</p>
                  <p className="text-lg font-bold text-blue-900">
                    {new Date(estadisticasBloque.estadisticasGenerales.primera_fecha).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Última reserva</p>
                  <p className="text-lg font-bold text-blue-900">
                    {new Date(estadisticasBloque.estadisticasGenerales.ultima_fecha).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Promedio diario</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {estadisticasBloque.estadisticasGenerales.promedio_reservas_por_dia}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : bloqueSeleccionado === "" ? (
        <div className="text-center py-12 bg-white rounded-lg mt-4 border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Analizar Bloque Horario
          </h3>
          <p className="text-gray-600">
            Selecciona un bloque y presiona "Analizar Bloque" para ver estadísticas detalladas.
          </p>
        </div>
      ) : null}
    </>
  );
}
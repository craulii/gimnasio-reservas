"use client";
import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ApiService from "../../../services/api";

export default function EstadisticasAlumno({ fechaInicio, fechaFin, setMessage, setLoading }) {
  const [emailAlumno, setEmailAlumno] = useState("");
  const [estadisticasAlumno, setEstadisticasAlumno] = useState({});

  const cargarEstadisticasAlumno = async () => {
    if (!emailAlumno) {
      setMessage("Por favor ingresa un email");
      return;
    }
    
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getEstadisticasAlumno(emailAlumno, fechaInicio, fechaFin);
      console.log("Datos alumno recibidos:", data);
      if (ok) {
        setEstadisticasAlumno(data);
        setMessage("");
      } else {
        setMessage("Error cargando estadísticas del alumno");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Error de conexión");
    }
    setLoading(false);
  };

  const limpiarEstadisticas = () => {
    setEstadisticasAlumno({});
    setEmailAlumno("");
  };

  // Preparar datos para gráficos
  const dataBloques = estadisticasAlumno.reservasPorBloque?.map(b => ({
    bloque: b.bloque_horario,
    reservas: b.total_reservas,
    asistencias: b.asistencias,
    porcentaje: parseFloat(b.porcentaje_asistencia)
  })) || [];

  const dataHistorial = estadisticasAlumno.historialDiario?.slice(0, 14).reverse().map(d => ({
    fecha: new Date(d.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
    reservas: d.reservas_dia,
    asistencias: d.asistencias_dia
  })) || [];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email del alumno
          </label>
          <input
            type="email"
            placeholder="alumno@usm.cl"
            value={emailAlumno}
            onChange={(e) => setEmailAlumno(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && cargarEstadisticasAlumno()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-end space-x-2">
          <button
            onClick={cargarEstadisticasAlumno}
            disabled={!emailAlumno}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            Analizar Alumno
          </button>
          <button
            onClick={limpiarEstadisticas}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
          >
            Limpiar
          </button>
        </div>
      </div>

      {estadisticasAlumno && Object.keys(estadisticasAlumno).length > 0 ? (
        <div className="space-y-6 mt-6">
          {/* Header con info del alumno */}
          {estadisticasAlumno.alumno && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-white bg-opacity-20 backdrop-blur rounded-full flex items-center justify-center">
                  <span className="text-4xl font-bold">
                    {estadisticasAlumno.alumno.name?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">
                    {estadisticasAlumno.alumno.name}
                  </h3>
                  <p className="text-indigo-100">{estadisticasAlumno.alumno.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Métricas principales */}
          {estadisticasAlumno.estadisticasGenerales && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg border-l-4 border-blue-500 shadow-sm">
                <p className="text-sm text-gray-600 font-medium mb-1">Total Reservas</p>
                <p className="text-3xl font-bold text-blue-600">
                  {estadisticasAlumno.estadisticasGenerales.total_reservas}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  En {estadisticasAlumno.estadisticasGenerales.dias_activos} días activos
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg border-l-4 border-green-500 shadow-sm">
                <p className="text-sm text-gray-600 font-medium mb-1">Asistencias</p>
                <p className="text-3xl font-bold text-green-600">
                  {estadisticasAlumno.estadisticasGenerales.total_asistencias}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia}% de asistencia
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg border-l-4 border-purple-500 shadow-sm">
                <p className="text-sm text-gray-600 font-medium mb-1">Tasa Asistencia</p>
                <p className="text-3xl font-bold text-purple-600">
                  {estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia}%
                </p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia >= 80 ? 'bg-green-500' :
                        estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border-l-4 border-orange-500 shadow-sm">
                <p className="text-sm text-gray-600 font-medium mb-1">vs Promedio</p>
                <p className={`text-3xl font-bold ${
                  estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia > estadisticasAlumno.promedioGeneral 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {estadisticasAlumno.promedioGeneral
                    ? (estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia - estadisticasAlumno.promedioGeneral).toFixed(1)
                    : "N/A"}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia > estadisticasAlumno.promedioGeneral 
                    ? 'Sobre el promedio' 
                    : 'Bajo el promedio'}
                </p>
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico por bloque */}
            {dataBloques.length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-4">Desempeño por Bloque Horario</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dataBloques}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="bloque" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="reservas" fill="#3b82f6" name="Reservas" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="asistencias" fill="#10b981" name="Asistencias" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Historial últimos 14 días */}
            {dataHistorial.length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-4">Historial Últimos 14 Días</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dataHistorial}>
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
          </div>

          {/* Tabla de bloques favoritos */}
          {estadisticasAlumno.reservasPorBloque && estadisticasAlumno.reservasPorBloque.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Bloques Favoritos</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Bloque</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Reservas</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Asistencias</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">% Asistencia</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estadisticasAlumno.reservasPorBloque.map((bloque, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Bloque {bloque.bloque_horario}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {bloque.total_reservas}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {bloque.asistencias}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  bloque.porcentaje_asistencia >= 80 ? 'bg-green-500' :
                                  bloque.porcentaje_asistencia >= 60 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${bloque.porcentaje_asistencia}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{bloque.porcentaje_asistencia}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Días faltados */}
          {estadisticasAlumno.diasFaltados && estadisticasAlumno.diasFaltados.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-red-600 text-xl">⚠</span>
                <h4 className="font-semibold text-red-900">
                  Días en que faltó ({estadisticasAlumno.diasFaltados.length})
                </h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {estadisticasAlumno.diasFaltados.slice(0, 8).map((falta, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-red-200">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(falta.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-xs text-gray-600">Bloque {falta.bloque_horario}</p>
                  </div>
                ))}
              </div>
              {estadisticasAlumno.diasFaltados.length > 8 && (
                <p className="text-sm text-red-600 mt-3">
                  Y {estadisticasAlumno.diasFaltados.length - 8} días más...
                </p>
              )}
            </div>
          )}
        </div>
      ) : emailAlumno === "" ? (
        <div className="text-center py-12 bg-white rounded-lg mt-4 border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Buscar Alumno
          </h3>
          <p className="text-gray-600">
            Ingresa el email de un alumno y presiona "Analizar Alumno" para ver sus estadísticas detalladas.
          </p>
        </div>
      ) : null}
    </>
  );
}
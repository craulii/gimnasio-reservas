"use client";
import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ApiService from "../../../services/api";

const COLORS = ['#10b981', '#ef4444'];

export default function EstadisticasGeneral({ fechaInicio, fechaFin, setMessage, setLoading }) {
  const [estadisticas, setEstadisticas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const prevFechasRef = useRef();

  // Función para comparar fechas
  const sonFechasIguales = (fecha1, fecha2) => {
    if (!fecha1 && !fecha2) return true;
    if (!fecha1 || !fecha2) return false;
    return fecha1 === fecha2;
  };

  useEffect(() => {
    const fechasActuales = { fechaInicio, fechaFin };
    const fechasAnteriores = prevFechasRef.current;

    // Solo recargar si las fechas realmente cambiaron
    if (!fechasAnteriores || 
        !sonFechasIguales(fechasAnteriores.fechaInicio, fechaInicio) || 
        !sonFechasIguales(fechasAnteriores.fechaFin, fechaFin)) {
      
      console.log("🔄 Fechas cambiaron, recargando estadísticas...");
      cargarEstadisticas();
      prevFechasRef.current = fechasActuales;
    }
  }, [fechaInicio, fechaFin]);

  const cargarEstadisticas = async () => {
    // Evitar múltiples llamadas simultáneas
    if (cargando) return;

    setCargando(true);
    setLoading(true);
    setError(null);
    
    try {
      const { ok, data } = await ApiService.getEstadisticas(fechaInicio, fechaFin);
      
      if (ok && data) {
        setEstadisticas(data);
        setMessage("Estadísticas cargadas correctamente");
      } else {
        const errorMsg = "No se pudieron cargar las estadísticas";
        setError(errorMsg);
        setMessage(errorMsg);
      }
    } catch (error) {
      const errorMsg = error.message || "Error de conexión";
      setError(errorMsg);
      setMessage(errorMsg);
    } finally {
      setCargando(false);
      setLoading(false);
    }
  };

  // Loading
  if (cargando) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Cargando estadísticas...</h3>
        <p className="text-gray-600">Por favor espera un momento</p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-red-200">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-red-900 mb-2">Error al cargar estadísticas</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={cargarEstadisticas}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // No data
  if (!estadisticas || Object.keys(estadisticas).length === 0) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border-2 border-yellow-200">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-yellow-900 mb-2">No hay estadísticas disponibles</h3>
        <p className="text-yellow-700 mb-4">No se encontraron datos para mostrar</p>
        <button
          onClick={cargarEstadisticas}
          className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
        >
          Recargar
        </button>
      </div>
    );
  }

  const dataBloques = estadisticas.estadisticasBloques?.map(b => ({
    bloque: b.bloque_horario,
    reservas: b.total_reservas,
    asistencias: b.total_asistencias
  })) || [];

  const dataAsistencia = [
    { name: 'Asistieron', value: estadisticas.resumen?.total_asistencias || 0 },
    { name: 'Faltaron', value: (estadisticas.resumen?.total_reservas || 0) - (estadisticas.resumen?.total_asistencias || 0) }
  ];

  return (
    <div className="space-y-6">
      {/* DEBUG INFO - Opcional: puedes comentar o eliminar esta sección */}
      {/* <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
        <p className="font-bold text-blue-900 mb-2">🔍 DEBUG INFO:</p>
        <div className="grid grid-cols-2 gap-2 text-blue-800">
          <div>✅ Resumen: {estadisticas.resumen ? 'SÍ' : 'NO'}</div>
          <div>✅ Bloques: {dataBloques.length}</div>
          <div>✅ Alumnos: {estadisticas.estadisticasAlumnos?.length || 0}</div>
          <div>✅ Total Reservas: {estadisticas.resumen?.total_reservas || 0}</div>
        </div>
      </div> */}

      {/* Métricas principales */}
      {estadisticas.resumen ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-700 font-semibold">Alumnos Activos</p>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-2xl">
                👥
              </div>
            </div>
            <p className="text-4xl font-bold text-blue-900">{estadisticas.resumen.total_alumnos_activos || 0}</p>
            <p className="text-xs text-blue-600 mt-1">Usuarios con reservas</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-700 font-semibold">Total Reservas</p>
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white text-2xl">
                📅
              </div>
            </div>
            <p className="text-4xl font-bold text-green-900">{estadisticas.resumen.total_reservas || 0}</p>
            <p className="text-xs text-green-600 mt-1">En el período</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-purple-700 font-semibold">Asistencias</p>
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white text-2xl">
                ✓
              </div>
            </div>
            <p className="text-4xl font-bold text-purple-900">{estadisticas.resumen.total_asistencias || 0}</p>
            <p className="text-xs text-purple-600 mt-1">Alumnos presentes</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-orange-700 font-semibold">Tasa Asistencia</p>
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white text-2xl">
                %
              </div>
            </div>
            <p className="text-4xl font-bold text-orange-900">{estadisticas.resumen.porcentaje_asistencia_general || 0}%</p>
            <p className="text-xs text-orange-600 mt-1">Promedio general</p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-yellow-800">⚠️ No hay resumen disponible</p>
        </div>
      )}

      {/* Gráficos */}
      {dataBloques.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Reservas y Asistencias por Bloque
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataBloques}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="bloque" stroke="#6b7280" style={{ fontSize: '13px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '13px' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="reservas" fill="#3b82f6" name="Reservas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="asistencias" fill="#10b981" name="Asistencias" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {dataAsistencia[0].value > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🥧 Distribución de Asistencia
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dataAsistencia}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {dataAsistencia.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 flex justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Asistieron ({dataAsistencia[0].value})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Faltaron ({dataAsistencia[1].value})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-100 p-8 rounded-lg text-center border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-lg">📊 No hay datos de bloques para mostrar</p>
          <p className="text-gray-500 text-sm mt-2">Intenta seleccionar un rango de fechas diferente</p>
        </div>
      )}

      {/* Tabla Top 10 */}
      {estadisticas.estadisticasAlumnos && estadisticas.estadisticasAlumnos.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">🏆 Top 10 Alumnos Más Activos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Alumno</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Reservas</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Asistencias</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">% Asistencia</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {estadisticas.estadisticasAlumnos.slice(0, 10).map((alumno, index) => (
                  <tr key={alumno.email} className={index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-900' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
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
                        {alumno.total_reservas}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {alumno.total_asistencias || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (alumno.porcentaje_asistencia || 0) >= 80 ? 'bg-green-500' :
                              (alumno.porcentaje_asistencia || 0) >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${alumno.porcentaje_asistencia || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {alumno.porcentaje_asistencia || 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 p-8 rounded-lg text-center border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-lg">👥 No hay datos de alumnos para mostrar</p>
        </div>
      )}
    </div>
  );
}
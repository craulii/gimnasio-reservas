"use client";
import { useState, useEffect } from "react";
import { FiX, FiRefreshCw } from "react-icons/fi";
import ApiService from "../../services/api";

export default function ReservasTab({ cupos, setMessage, fetchCupos }) {
  const [loading, setLoading] = useState(false);
  const [reservas, setReservas] = useState({});
  const [expandido, setExpandido] = useState({});

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    setLoading(true);
    setMessage("Cargando reservas...");
    try {
      const { ok, data } = await ApiService.getReservasPorBloque();
      if (ok) {
        setReservas(data);
        setMessage(`${Object.keys(data).length} bloques con reservas`);
      } else {
        setMessage("Error al cargar reservas");
      }
    } catch (error) {
      console.error("Error al cargar reservas:", error);
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const cancelarReserva = async (email, bloqueHorario, sede, fecha) => {
    if (!confirm(`¿Cancelar reserva de ${email} en bloque ${bloqueHorario}?`)) return;

    setMessage("Cancelando reserva...");
    try {
      const { ok, data } = await ApiService.cancelarReserva(
        email,
        bloqueHorario,
        sede,
        fecha
      );
      if (ok) {
        setMessage(data.message || "✅ Reserva cancelada");
        cargarReservas();
        fetchCupos?.();
      } else {
        setMessage("❌ Error al cancelar");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error de conexión");
    }
  };

  const toggleBloque = (bloqueKey) => {
    setExpandido(prev => ({
      ...prev,
      [bloqueKey]: !prev[bloqueKey]
    }));
  };

  const totalReservas = Object.values(reservas).reduce((acc, usuarios) => acc + usuarios.length, 0);

  return (
    <div className="space-y-4">
      {/* Header con botón de refrescar */}
      <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Reservas de Hoy</h2>
          <p className="text-sm text-gray-600">
            {totalReservas} reserva{totalReservas !== 1 ? 's' : ''} en {Object.keys(reservas).length} bloque{Object.keys(reservas).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={cargarReservas}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          <FiRefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "Cargando..." : "Refrescar"}
        </button>
      </div>

      {/* Lista de reservas por bloque */}
      {loading ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FiRefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Cargando reservas...</p>
        </div>
      ) : Object.keys(reservas).length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No hay reservas para hoy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(reservas).map(([bloqueKey, usuarios]) => {
            const estaExpandido = expandido[bloqueKey];
            const sede = usuarios[0]?.sede || "N/A";
            
            return (
              <div key={bloqueKey} className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                {/* Header del bloque (clickeable para expandir/contraer) */}
                <div
                  onClick={() => toggleBloque(bloqueKey)}
                  className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">
                      Bloque {bloqueKey} - {sede}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {usuarios.length} alumno{usuarios.length !== 1 ? 's' : ''} inscrito{usuarios.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl text-gray-400">
                      {estaExpandido ? "−" : "+"}
                    </span>
                  </div>
                </div>

                {/* Lista de usuarios (expandible) */}
                {estaExpandido && (
                  <div className="p-4 space-y-2 bg-white">
                    {usuarios.map((user, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{user.nombre}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex gap-3 mt-1">
                            <p className="text-xs text-gray-500">
                              📍 {user.sede}
                            </p>
                            <p className="text-xs">
                              {user.asistio === 1 ? (
                                <span className="text-green-600 font-medium">✅ Asistió</span>
                              ) : user.asistio === 0 ? (
                                <span className="text-red-600 font-medium">❌ No asistió</span>
                              ) : (
                                <span className="text-gray-500">⏳ Pendiente</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelarReserva(user.email, bloqueKey, user.sede, user.fecha);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancelar reserva"
                        >
                          <FiX className="text-xl" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

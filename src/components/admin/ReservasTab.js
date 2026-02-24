"use client";
import { useState, useEffect } from "react";
import { FiX, FiRefreshCw } from "react-icons/fi";
import ApiService from "../../services/api";

export default function ReservasTab({ cupos, setMessage, fetchCupos }) {
  const [loading, setLoading] = useState(false);
  const [reservas, setReservas] = useState({});
  const [expandido, setExpandido] = useState({});
  const [sede, setSede] = useState("Vitacura");

  useEffect(() => {
    cargarReservas();
  }, [sede]);

  const cargarReservas = async () => {
    setLoading(true);
    setMessage("Cargando reservas...");
    try {
      const { ok, data } = await ApiService.getReservasPorBloque(sede);

      if (ok) {
        // Issue #19 fix: Validación defensiva de datos del API
        const datosReservas = (data && typeof data === 'object' && !Array.isArray(data))
          ? data
          : {};
        setReservas(datosReservas);

        const total = Object.values(datosReservas).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0);
        setMessage(`${total} reservas encontradas en ${Object.keys(datosReservas).length} bloques`);
      } else {
        setReservas({});
        setMessage("Error al cargar el listado de reservas");
      }
    } catch (error) {
      console.error("Error al cargar reservas:", error);
      setReservas({});
      setMessage("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const cancelarReserva = async (email, bloqueHorario, sedeReserva, fecha) => {
    if (!confirm(`¿Estás seguro de cancelar la reserva de ${email}?`)) return;

    setMessage("Cancelando reserva...");
    try {
      const fechaCancelacion = fecha || new Date().toISOString().split('T')[0];

      const { ok, data } = await ApiService.cancelarReserva(
        email,
        bloqueHorario,
        sedeReserva,
        fechaCancelacion
      );

      if (ok) {
        setMessage(data?.message || "Reserva cancelada exitosamente");
        await cargarReservas();
        if (fetchCupos) await fetchCupos();
      } else {
        const errorMsg = data?.error || data?.message || "Error al cancelar reserva";
        setMessage(errorMsg);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Error de conexión");
    }
  };

  const toggleBloque = (bloqueKey) => {
    setExpandido(prev => ({
      ...prev,
      [bloqueKey]: !prev[bloqueKey]
    }));
  };

  const totalReservas = Object.values(reservas || {}).reduce((acc, usuarios) => acc + (Array.isArray(usuarios) ? usuarios.length : 0), 0);

  return (
    <div className="space-y-4">
      {/* Header con selector de sede y botón de refrescar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-100 p-4 rounded-lg">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Reservas de Hoy</h2>
          <p className="text-sm text-gray-600">
            {totalReservas} reserva{totalReservas !== 1 ? 's' : ''} en {Object.keys(reservas || {}).length} bloque{Object.keys(reservas || {}).length !== 1 ? 's' : ''} activos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Issue #3: Selector de sede */}
          <div className="flex gap-1">
            <button
              onClick={() => setSede("Vitacura")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                sede === "Vitacura"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Vitacura
            </button>
            <button
              onClick={() => setSede("San Joaquín")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                sede === "San Joaquín"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              San Joaquín
            </button>
          </div>
          <button
            onClick={cargarReservas}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        </div>
      </div>

      {/* Lista de reservas por bloque */}
      {loading ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <FiRefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Obteniendo listado de reservas...</p>
        </div>
      ) : Object.keys(reservas || {}).length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500 text-lg">No hay reservas registradas para hoy en {sede}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(reservas).map(([bloqueKey, usuarios]) => {
            if (!Array.isArray(usuarios)) return null;
            const estaExpandido = expandido[bloqueKey];
            const sedeBloque = usuarios?.[0]?.sede || sede;

            return (
              <div key={bloqueKey} className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                {/* Header del bloque */}
                <div
                  onClick={() => toggleBloque(bloqueKey)}
                  className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors select-none"
                >
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      Bloque {bloqueKey}
                      <span className="text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded border">
                        {sedeBloque}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600">
                      {usuarios.length} alumno{usuarios.length !== 1 ? 's' : ''} inscrito{usuarios.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl text-gray-400 font-bold">
                      {estaExpandido ? "−" : "+"}
                    </span>
                  </div>
                </div>

                {/* Lista de usuarios */}
                {estaExpandido && (
                  <div className="p-4 space-y-2 bg-white border-t border-gray-200">
                    {usuarios.map((user, idx) => (
                      <div
                        key={`${bloqueKey}-${idx}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow group"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{user.nombre || "Sin Nombre"}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex gap-3 mt-1">
                            <p className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                              {user.rol || "Alumno"}
                            </p>
                            <p className="text-xs">
                              {user.asistio === 1 ? (
                                <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded border border-green-200">Asistió</span>
                              ) : user.asistio === 0 ? (
                                <span className="text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded border border-red-200">No asistió</span>
                              ) : (
                                <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">Pendiente</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelarReserva(user.email, bloqueKey, user.sede, user.fecha);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                          title="Cancelar reserva de este alumno"
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

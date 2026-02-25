"use client";
import { useState, useEffect } from "react";
// Asegúrate de que la ruta sea correcta según tu estructura
import ApiService from "../../services/api";
import { HORARIOS_BLOQUE } from "../../app/utils/constants";

export default function ReservarCupo({ user, cupos, loading, setMessage, fetchCupos }) {
  const [sedeSeleccionada, setSedeSeleccionada] = useState("Vitacura");
  const [mostrarRecordatorio, setMostrarRecordatorio] = useState(false);
  const [misReservas, setMisReservas] = useState([]);

  // Obtener las reservas del alumno al cargar
  useEffect(() => {
    obtenerMisReservas();
  }, []);

  const obtenerMisReservas = async () => {
    try {
      // CAMBIO 1: Ya no pasamos 'user' como argumento, la cookie se encarga
      const { ok, data } = await ApiService.getMisReservas();
      if (ok && data.reservas) {
        setMisReservas(data.reservas);
      }
    } catch (error) {
      console.error("Error obteniendo reservas:", error);
    }
  };

  const hacerReserva = async (bloque, sede) => {
    if (!bloque || !sede) {
      setMessage("Selecciona un bloque y sede primero");
      return;
    }

    setMessage("Reservando...");
    
    try {
      // CAMBIO 2: Eliminamos 'user' de los argumentos
      const { ok, data } = await ApiService.makeReserva(bloque, sede);
      
      if (ok) {
        setMostrarRecordatorio(true);
        
        const successMsg = data?.message || "Reserva realizada exitosamente";
        setMessage(String(successMsg));
        
        // CAMBIO 3: Validación de seguridad para fetchCupos
        if (typeof fetchCupos === 'function') {
            await fetchCupos();
        }
        await obtenerMisReservas();
        
        setTimeout(() => {
          setMostrarRecordatorio(false);
        }, 8000);

      } else {
        const errorMsg = data?.error || data?.message || "Error al realizar la reserva";
        setMessage(String(errorMsg));
      }
    } catch (error) {
      console.error("Error en reserva:", error);
      setMessage("Error crítico al intentar reservar");
    }
  };

  const cancelarReserva = async (bloque, sede) => {
    if (!window.confirm(`¿Estás seguro que deseas cancelar tu reserva para el bloque ${bloque} en ${sede}?`)) {
      return;
    }

    setMessage("Cancelando reserva...");
    try {
      // CAMBIO 4: Eliminamos 'user' de los argumentos
      const { ok, data } = await ApiService.cancelarMiReserva(bloque, sede);
      
      if (ok) {
        setMessage("Reserva cancelada exitosamente");
        
        if (typeof fetchCupos === 'function') {
            await fetchCupos();
        }
        await obtenerMisReservas();
      } else {
        setMessage(data?.error || data?.message || "Error al cancelar la reserva");
      }
    } catch (error) {
      console.error("Error cancelando reserva:", error);
      setMessage("Error al cancelar la reserva");
    }
  };

  // Verificar si el alumno tiene reserva en un bloque específico
  const tieneReservaEn = (bloque, sede) => {
    return misReservas.some(r => r.bloque_horario === bloque && r.sede === sede);
  };

  // Filtrar cupos por sede seleccionada (manejo seguro si cupos es null/undefined)
  const cuposData = cupos || {};
  const cuposFiltrados = Object.entries(cuposData).filter(([key, info]) => 
    info.sede === sedeSeleccionada
  );

  return (
    <div className="bg-gray-200 p-4 rounded-lg">
      <h2 className="text-lg font-medium text-gray-800 mb-3">
        Reservar cupo
      </h2>

      {/* RECORDATORIO - Solo aparece después de reservar */}
      {mostrarRecordatorio && (
        <div className="mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-4 rounded-lg shadow-lg border-2 border-yellow-500">
          <h3 className="font-bold text-lg mb-2">
            Recordatorio importante
          </h3>
          <p className="text-sm mb-2">No olvides llevar:</p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>Credencial USM</li>
            <li>Toalla de mano</li>
            <li>Ropa deportiva</li>
          </ul>
        </div>
      )}

      {/* Selector de Sede */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecciona tu sede:
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setSedeSeleccionada("Vitacura")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              sedeSeleccionada === "Vitacura"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Vitacura
          </button>
          <button
            onClick={() => setSedeSeleccionada("San Joaquín")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              sedeSeleccionada === "San Joaquín"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            San Joaquín
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center">Cargando cupos...</p>
      ) : cuposFiltrados.length === 0 ? (
        <p className="text-center">No hay cupos disponibles en {sedeSeleccionada}</p>
      ) : (
        <div className="space-y-3">
          {cuposFiltrados.map(([key, info]) => {
            const disponibles = info.total - info.reservados;
            const yaReservado = tieneReservaEn(info.bloque, info.sede);
            const horario = HORARIOS_BLOQUE[info.bloque];
            const porcentajeOcupado = info.total > 0 ? (info.reservados / info.total) * 100 : 0;
            const barColor = porcentajeOcupado > 85 ? "bg-red-500" : porcentajeOcupado >= 60 ? "bg-yellow-500" : "bg-green-500";

            return (
              <div
                key={key}
                className="bg-white rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {horario ? `${horario.inicio} - ${horario.fin}` : `Bloque ${info.bloque}`}
                    </p>
                    {horario && (
                      <p className="text-sm text-gray-500">Bloque {info.bloque}</p>
                    )}
                  </div>
                  {yaReservado ? (
                    <button
                      onClick={() => cancelarReserva(info.bloque, info.sede)}
                      className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition font-medium"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      disabled={disponibles <= 0}
                      onClick={() => hacerReserva(info.bloque, info.sede)}
                      className={`px-4 py-2 rounded-lg text-white font-medium ${
                        disponibles > 0
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Reservar
                    </button>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div
                    className={`h-2.5 rounded-full ${barColor}`}
                    style={{ width: `${porcentajeOcupado}%` }}
                  ></div>
                </div>
                <p className={`text-sm ${disponibles > 0 ? "text-gray-600" : "text-red-600 font-medium"}`}>
                  {disponibles > 0 ? `${disponibles} cupos disponibles` : "Sin cupos"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
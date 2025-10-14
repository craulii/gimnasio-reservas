"use client";
import { useState } from "react";
import ApiService from "../../services/api";

export default function ReservarCupo({ user, cupos, loading, setMessage, fetchCupos }) {
  const [sedeSeleccionada, setSedeSeleccionada] = useState("Vitacura");

const hacerReserva = async (bloque, sede) => {
  console.log("===== DEBUG USER =====");
  console.log("User completo:", user);
  console.log("user.username:", user?.username);
  console.log("user.password:", user?.password);
  console.log("======================");
  
  if (!bloque) {
    setMessage("Selecciona un bloque primero");
    return;
  }
      if (!bloque) {
      setMessage("Selecciona un bloque primero");
      return;
    }

    if (!sede) {
      setMessage("Selecciona una sede primero");
      return;
    }

    setMessage("Reservando...");
    try {
      const { ok, data } = await ApiService.makeReserva(bloque, sede, user);
      
      if (ok) {
        if (typeof data === 'object' && data.message) {
          setMessage(data.message);
        } else {
          setMessage(data || "Reserva realizada exitosamente");
        }
        await fetchCupos();
      } else {
        setMessage(data || "Error al realizar la reserva");
      }
    } catch (error) {
      console.error("Error en reserva:", error);
      setMessage("Error al reservar");
    }
  };

  // Filtrar cupos por sede seleccionada
  const cuposFiltrados = Object.entries(cupos).filter(([key, info]) => 
    info.sede === sedeSeleccionada
  );

  return (
    <div className="bg-gray-200 p-4 rounded-lg">
      <h2 className="text-lg font-medium text-gray-800 mb-3">
        Reservar cupo
      </h2>

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
            🏢 Vitacura
          </button>
          <button
            onClick={() => setSedeSeleccionada("San Joaquín")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              sedeSeleccionada === "San Joaquín"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            🏫 San Joaquín
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center">Cargando cupos...</p>
      ) : cuposFiltrados.length === 0 ? (
        <p className="text-center">No hay cupos disponibles en {sedeSeleccionada}</p>
      ) : (
        <div className="space-y-2">
          {cuposFiltrados.map(([key, info]) => {
            const disponibles = info.total - info.reservados;
            return (
              <div
                key={key}
                className="flex justify-between items-center bg-white rounded p-3 shadow-sm"
              >
                <div>
                  <strong className="text-gray-800">Bloque {info.bloque}</strong>
                  <p className="text-sm text-gray-600">
                    Cupos: {disponibles} / {info.total} (Reservados: {info.reservados})
                  </p>
                  <p className="text-xs text-gray-500">{info.sede}</p>
                </div>
                <button
                  disabled={disponibles <= 0}
                  onClick={() => hacerReserva(info.bloque, info.sede)}
                  className={`px-4 py-2 rounded text-white ${
                    disponibles > 0
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Reservar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
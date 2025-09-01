"use client";
import { useState } from "react";
import ApiService from "../../services/api";

export default function ReservarCupo({ user, cupos, loading, setMessage, fetchCupos }) {
  const [bloque, setBloque] = useState(null);

  const hacerReserva = async () => {
    if (!bloque) {
      setMessage("Selecciona un bloque primero");
      return;
    }

    setMessage("Reservando...");
    try {
      const { ok, data } = await ApiService.makeReserva(bloque, user);
      setMessage(data);
      if (ok) await fetchCupos();
    } catch (error) {
      setMessage("Error al reservar");
    }
  };

  return (
    <div className="bg-gray-200 p-4 rounded-lg">
      <h2 className="text-lg font-medium text-gray-800 mb-3">
        Reservar cupo
      </h2>
      {loading ? (
        <p className="text-center">Cargando cupos...</p>
      ) : Object.keys(cupos).length === 0 ? (
        <p className="text-center">No hay cupos disponibles</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(cupos).map(([b, info]) => {
            const disponibles = info.total - info.reservados;
            return (
              <div
                key={b}
                className="flex justify-between items-center bg-white rounded p-3 shadow-sm"
              >
                <div>
                  <strong className="text-gray-800">Bloque {b}</strong>
                  <p className="text-sm text-gray-600">
                    Cupos: {disponibles} / {info.total} (Reservados: {info.reservados})
                  </p>
                </div>
                <button
                  disabled={disponibles <= 0}
                  onClick={() => {
                    setBloque(b);
                    hacerReserva();
                  }}
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
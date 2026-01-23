"use client";
import { useState, useEffect } from "react";
// Asegúrate de que la ruta al servicio sea correcta
import ApiService from "../../services/api";

const BLOQUES = [
  "1-2",   // 8:15-9:40
  "3-4",   // 9:40-11:05
  "5-6",   // 11:05-12:30
  "7-8",   // 12:30-13:55
  "9-10",  // 14:40-16:05
  "11-12", // 16:05-17:30
  "13-14", // 17:30-18:55
  "15-16",
];

const SEDES = ["Vitacura", "San Joaquín"];

export default function BotonPanicoTab() {
  const [seleccionados, setSeleccionados] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [estadoActual, setEstadoActual] = useState([]);

  useEffect(() => {
    cargarEstado();
  }, []);

  const cargarEstado = async () => {
    try {
      // ✅ CORRECCIÓN: Usamos ApiService en lugar de fetch directo
      const fechaHoy = new Date().toISOString().split('T')[0];
      const { ok, data } = await ApiService.getEstadoBloques(fechaHoy);
      
      if (ok) {
        setEstadoActual(data.cupos || []);
      }
    } catch (error) {
      console.error("Error cargando estado:", error);
    }
  };

  const toggleBloque = (bloque, sede) => {
    const key = `${bloque}-${sede}`;
    const existe = seleccionados.find(s => s.bloque === bloque && s.sede === sede);
    
    if (existe) {
      setSeleccionados(seleccionados.filter(s => !(s.bloque === bloque && s.sede === sede)));
    } else {
      setSeleccionados([...seleccionados, { bloque, sede }]);
    }
  };

  const seleccionarTodos = () => {
    const todos = [];
    BLOQUES.forEach(bloque => {
      SEDES.forEach(sede => {
        todos.push({ bloque, sede });
      });
    });
    setSeleccionados(todos);
  };

  const limpiarSeleccion = () => {
    setSeleccionados([]);
  };

  const activarPanico = async () => {
    if (seleccionados.length === 0) {
      setMensaje("⚠️ Debes seleccionar al menos un bloque");
      return;
    }

    const confirmacion = window.confirm(
      `🚨 ¿ESTÁS SEGURO?\n\nSe desactivarán ${seleccionados.length} bloques y se cancelarán todas las reservas existentes.\n\nEsta acción NO se puede deshacer.`
    );

    if (!confirmacion) return;

    setLoading(true);
    setMensaje("Procesando...");

    try {
      const fecha = new Date().toISOString().split('T')[0];
      
      // ✅ CORRECCIÓN: Usamos ApiService para enviar la petición con cookies
      const { ok, data } = await ApiService.activarBotonPanico(seleccionados, fecha);

      if (ok) {
        setMensaje(
          `✅ ${data.message}\n` +
          `📊 Bloques desactivados: ${data.cuposDesactivados}\n` +
          `🚫 Reservas canceladas: ${data.reservasCanceladas}`
        );
        setSeleccionados([]);
        await cargarEstado();
      } else {
        const errorMsg = data?.message || data?.error || "Error al activar botón de pánico";
        setMensaje(`❌ Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setMensaje("❌ Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const estaSeleccionado = (bloque, sede) => {
    return seleccionados.some(s => s.bloque === bloque && s.sede === sede);
  };

  const estaDesactivado = (bloque, sede) => {
    const cupo = estadoActual.find(c => c.bloque === bloque && c.sede === sede);
    return cupo && cupo.total === 0;
  };

  return (
    <div className="space-y-6">
      {/* Header con advertencia */}
      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">🚨</span>
          <h2 className="text-2xl font-bold text-red-700">
            BOTÓN DE PÁNICO
          </h2>
        </div>
        <p className="text-red-600 font-medium">
          Esta función <strong>desactivará completamente</strong> los bloques seleccionados y <strong>cancelará todas las reservas existentes</strong>. 
          Ningún alumno podrá reservar en esos horarios.
        </p>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`p-4 rounded-lg ${
          mensaje.includes('✅') ? 'bg-green-100 text-green-800' : 
          mensaje.includes('❌') ? 'bg-red-100 text-red-800' : 
          'bg-yellow-100 text-yellow-800'
        }`}>
          <pre className="whitespace-pre-wrap font-sans">{mensaje}</pre>
        </div>
      )}

      {/* Controles */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={seleccionarTodos}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
        >
          ✓ Seleccionar Todos
        </button>
        <button
          onClick={limpiarSeleccion}
          className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition"
        >
          ✗ Limpiar Selección
        </button>
        <button
          onClick={activarPanico}
          disabled={loading || seleccionados.length === 0}
          className={`px-6 py-2 rounded font-bold transition ${
            loading || seleccionados.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {loading ? "⏳ Procesando..." : `🚨 ACTIVAR PÁNICO (${seleccionados.length})`}
        </button>
      </div>

      {/* Tabla de bloques */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-800">Bloque Horario</th>
              {SEDES.map(sede => (
                <th key={sede} className="px-4 py-3 text-center font-semibold text-gray-800">
                  {sede}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BLOQUES.map((bloque, idx) => (
              <tr key={bloque} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-4 py-3 font-medium text-gray-800">{bloque}</td>
                {SEDES.map(sede => {
                  const seleccionado = estaSeleccionado(bloque, sede);
                  const desactivado = estaDesactivado(bloque, sede);
                  
                  return (
                    <td key={`${bloque}-${sede}`} className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleBloque(bloque, sede)}
                        className={`px-4 py-2 rounded font-medium transition ${
                          seleccionado
                            ? 'bg-red-500 text-white'
                            : desactivado
                            ? 'bg-gray-300 text-gray-700 border-2 border-gray-500'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                      >
                        {seleccionado ? '✓ Seleccionado' : 
                         desactivado ? '🔒 Desactivado' : 
                         'Seleccionar'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex gap-6 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Seleccionado para desactivar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 border-2 border-gray-500 rounded"></div>
          <span>Ya desactivado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-400 rounded"></div>
          <span>Activo (disponible)</span>
        </div>
      </div>
    </div>
  );
}
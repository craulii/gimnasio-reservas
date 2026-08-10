"use client";
import { useState, useEffect } from "react";
import ApiService from "@/services/api";
import { BLOQUES_HORARIOS, SEDES } from "@/app/utils/constants";

const TIPOS_DIA = [
  { key: "normal", label: "Lunes a Jueves" },
  { key: "viernes", label: "Viernes" },
];

export default function ConfigBloquesTab() {
  const [horarios, setHorarios] = useState({});
  const [activos, setActivos] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [dias, setDias] = useState(7);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    setCargando(true);
    try {
      const { ok, data } = await ApiService.getConfigBloques();
      if (ok) {
        setHorarios(data.horarios || {});
        setActivos(data.activos || {});
      } else {
        setMensaje(`❌ Error cargando configuración: ${data?.error || ""}`);
      }
    } catch {
      setMensaje("❌ Error de conexión");
    }
    setCargando(false);
  };

  const cambiarHorario = (bloque, campo, valor) => {
    setHorarios(prev => ({
      ...prev,
      [bloque]: { ...prev[bloque], [campo]: valor },
    }));
  };

  const toggleActivo = (sede, tipoDia, bloque) => {
    setActivos(prev => ({
      ...prev,
      [sede]: {
        ...prev[sede],
        [tipoDia]: {
          ...prev[sede]?.[tipoDia],
          [bloque]: !prev[sede]?.[tipoDia]?.[bloque],
        },
      },
    }));
  };

  const guardarCambios = async () => {
    if (!window.confirm("¿Guardar los cambios de horarios y bloques activos? Esto no modifica cupos ya generados (usa 'Aplicar a cupos existentes' para eso).")) return;

    setGuardando(true);
    setMensaje("Guardando...");

    const horariosArr = BLOQUES_HORARIOS.map(bloque => ({
      bloque,
      hora_inicio: horarios[bloque]?.inicio,
      hora_fin: horarios[bloque]?.fin,
    }));

    const activosArr = [];
    for (const sede of SEDES) {
      for (const { key: tipoDia } of TIPOS_DIA) {
        for (const bloque of BLOQUES_HORARIOS) {
          activosArr.push({ sede, bloque, tipo_dia: tipoDia, activo: !!activos[sede]?.[tipoDia]?.[bloque] });
        }
      }
    }

    try {
      const { ok, data } = await ApiService.guardarConfigBloques(activosArr, horariosArr);
      if (ok) {
        setHorarios(data.horarios || {});
        setActivos(data.activos || {});
        setMensaje("✅ Configuración guardada");
      } else {
        setMensaje(`❌ Error: ${data?.error || "Error guardando"}`);
      }
    } catch {
      setMensaje("❌ Error de conexión");
    }
    setGuardando(false);
  };

  const aplicarACuposExistentes = async () => {
    const confirmacion = window.confirm(
      `⚠️ Esto aplicará la configuración guardada a los cupos de los próximos ${dias} día(s) hábiles.\n\n` +
      `Bloques recién activados: se crearán sus cupos.\n` +
      `Bloques recién desactivados: se ELIMINARÁN sus cupos y las reservas existentes en ellos.\n\n` +
      `¿Continuar?`
    );
    if (!confirmacion) return;

    setAplicando(true);
    setMensaje("Aplicando...");
    try {
      const { ok, data } = await ApiService.aplicarConfigBloques(dias);
      if (ok) {
        setMensaje(
          `✅ ${data.message}\n` +
          `📅 Días procesados: ${data.diasProcesados}\n` +
          `➕ Cupos creados: ${data.cuposCreados}\n` +
          `➖ Cupos eliminados: ${data.cuposEliminados}\n` +
          `🚫 Reservas canceladas: ${data.reservasCanceladas}`
        );
      } else {
        setMensaje(`❌ Error: ${data?.error || "Error aplicando configuración"}`);
      }
    } catch {
      setMensaje("❌ Error de conexión");
    }
    setAplicando(false);
  };

  if (cargando) {
    return <p className="text-gray-500">Cargando configuración...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-300 rounded-lg p-4">
        <h2 className="text-lg font-bold text-indigo-800">Configuración de Horarios</h2>
        <p className="text-sm text-indigo-700 mt-1">
          Define la hora real de cada bloque y qué bloques están activos por sede y tipo de día.
          Los cambios se aplican a los cupos que se generen desde ahora; para actualizar cupos ya
          generados usa la sección de abajo.
        </p>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-lg ${
          mensaje.includes('✅') ? 'bg-green-100 text-green-800' :
          mensaje.includes('❌') ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          <pre className="whitespace-pre-wrap font-sans">{mensaje}</pre>
        </div>
      )}

      {/* Horarios reales por bloque */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-800">Bloque</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-800">Inicio</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-800">Fin</th>
            </tr>
          </thead>
          <tbody>
            {BLOQUES_HORARIOS.map((bloque, idx) => (
              <tr key={bloque} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-4 py-3 font-medium text-gray-800">{bloque}</td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="time"
                    value={horarios[bloque]?.inicio || ""}
                    onChange={(e) => cambiarHorario(bloque, 'inicio', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="time"
                    value={horarios[bloque]?.fin || ""}
                    onChange={(e) => cambiarHorario(bloque, 'fin', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bloques activos por sede y tipo de día */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-800">Bloque</th>
              {SEDES.map(sede => (
                TIPOS_DIA.map(({ key, label }) => (
                  <th key={`${sede}-${key}`} className="px-4 py-3 text-center font-semibold text-gray-800">
                    {sede}<br /><span className="font-normal text-xs text-gray-500">{label}</span>
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {BLOQUES_HORARIOS.map((bloque, idx) => (
              <tr key={bloque} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-4 py-3 font-medium text-gray-800">{bloque}</td>
                {SEDES.map(sede => (
                  TIPOS_DIA.map(({ key: tipoDia }) => {
                    const activo = !!activos[sede]?.[tipoDia]?.[bloque];
                    return (
                      <td key={`${sede}-${tipoDia}-${bloque}`} className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActivo(sede, tipoDia, bloque)}
                          className={`px-3 py-1.5 rounded font-medium text-sm transition ${
                            activo
                              ? 'bg-green-100 text-green-800 border border-green-400 hover:bg-green-200'
                              : 'bg-gray-200 text-gray-600 border border-gray-300 hover:bg-gray-300'
                          }`}
                        >
                          {activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                    );
                  })
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={guardarCambios}
        disabled={guardando}
        className={`px-6 py-2 rounded font-bold transition ${
          guardando ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {guardando ? "⏳ Guardando..." : "💾 Guardar cambios"}
      </button>

      {/* Zona de peligro: aplicar a cupos ya generados */}
      <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 space-y-3">
        <h3 className="font-bold text-red-700">Aplicar a cupos ya generados</h3>
        <p className="text-sm text-red-600">
          Los cupos de los próximos días ya están creados en la base de datos y no se actualizan
          solos al guardar arriba. Usa esto para propagar la configuración guardada: crea cupos
          para bloques recién activados y elimina (junto con sus reservas) los bloques recién
          desactivados.
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700">Días hacia adelante:</label>
          <input
            type="number"
            min={1}
            max={30}
            value={dias}
            onChange={(e) => setDias(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-20 border border-gray-300 rounded px-2 py-1 text-gray-800 focus:ring-2 focus:ring-red-500 outline-none"
          />
          <button
            onClick={aplicarACuposExistentes}
            disabled={aplicando}
            className={`px-4 py-2 rounded font-bold transition ${
              aplicando ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {aplicando ? "⏳ Aplicando..." : "🔄 Aplicar a cupos existentes"}
          </button>
        </div>
      </div>
    </div>
  );
}

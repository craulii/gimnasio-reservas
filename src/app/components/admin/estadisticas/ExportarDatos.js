"use client";
import { useState, useEffect } from "react";
import ApiService from "../../../services/api";
import { TIPOS_EXPORTACION } from "../../../utils/constants";

export default function ExportarDatos({ setMessage }) {
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [tipoExportacion, setTipoExportacion] = useState(TIPOS_EXPORTACION.COMPLETO);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarMesesDisponibles();
  }, []);

  const cargarMesesDisponibles = async () => {
    try {
      const { ok, data } = await ApiService.getMesesDisponibles();
      if (ok) {
        setMesesDisponibles(data.meses_disponibles || []);
      }
    } catch (error) {
      console.error("Error cargando meses:", error);
    }
  };

  const exportarDatos = async () => {
    setLoading(true);
    try {
      const response = await ApiService.exportarDatos(tipoExportacion, mesSeleccionado);

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;

        const contentDisposition = response.headers.get("Content-Disposition");
        const fileName = contentDisposition
          ? contentDisposition.split("filename=")[1].replace(/"/g, "")
          : `export_${new Date().toISOString().split("T")[0]}.csv`;

        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        setMessage("✅ Archivo CSV descargado exitosamente");
      } else {
        setMessage("❌ Error al exportar datos");
      }
    } catch (error) {
      setMessage("❌ Error de conexión al exportar");
    } finally {
      setLoading(false);
    }
  };

  const getDescripcionTipo = () => {
    switch (tipoExportacion) {
      case TIPOS_EXPORTACION.COMPLETO:
        return ["• Cupos y reservas", "• Estadísticas de asistencia", "• Lista de usuarios por bloque"];
      case TIPOS_EXPORTACION.CUPOS:
        return ["• Total de cupos por día", "• Cupos reservados/disponibles", "• Histórico de capacidad"];
      case TIPOS_EXPORTACION.RESERVAS:
        return ["• Reservas individuales", "• Estado de asistencia", "• Datos de usuarios"];
      default:
        return [];
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-2xl">📥</span>
        <h4 className="text-lg font-medium text-gray-900">Exportar Datos Históricos</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            📅 Mes a exportar
          </label>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          >
            <option value="">📊 Últimos 3 meses</option>
            {mesesDisponibles.map((mes) => (
              <option key={mes.mes} value={mes.mes}>
                📆 {mes.mes} ({mes.total_reservas} reservas)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            📋 Tipo de reporte
          </label>
          <select
            value={tipoExportacion}
            onChange={(e) => setTipoExportacion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          >
            <option value={TIPOS_EXPORTACION.COMPLETO}>📊 Reporte Completo</option>
            <option value={TIPOS_EXPORTACION.CUPOS}>📅 Solo Cupos</option>
            <option value={TIPOS_EXPORTACION.RESERVAS}>👥 Solo Reservas</option>
          </select>
        </div>

        <div className="flex flex-col justify-center">
          <div className="text-xs text-gray-600 space-y-1">
            {getDescripcionTipo().map((desc, idx) => (
              <div key={idx}>{desc}</div>
            ))}
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={exportarDatos}
            disabled={loading}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-md hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Descargar CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 p-3 bg-blue-50 rounded-md">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 text-sm">💡</span>
          <div className="text-xs text-blue-800 space-y-1">
            <div><strong>Automático:</strong> Los datos se eliminan automáticamente después de 6 meses</div>
            <div><strong>Formato:</strong> CSV compatible con Excel (UTF-8)</div>
            <div><strong>Histórico:</strong> {mesesDisponibles.length} meses disponibles para exportar</div>
          </div>
        </div>
      </div>
    </div>
  );
}
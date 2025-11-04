"use client";
import { useState, useEffect } from "react";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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

  const exportarAExcel = async () => {
    setLoading(true);
    setMessage("Generando archivo Excel...");
    
    try {
      const response = await ApiService.exportarDatos(tipoExportacion, mesSeleccionado);

      if (response.ok) {
        const text = await response.text();
        
        // Convertir CSV a array de objetos
        const lineas = text.split('\n').filter(l => l.trim());
        const headers = lineas[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        const datos = lineas.slice(1).map(linea => {
          // Manejar comillas dentro de campos
          const valores = [];
          let campo = '';
          let dentroComillas = false;
          
          for (let i = 0; i < linea.length; i++) {
            const char = linea[i];
            if (char === '"') {
              dentroComillas = !dentroComillas;
            } else if (char === ',' && !dentroComillas) {
              valores.push(campo.trim());
              campo = '';
            } else {
              campo += char;
            }
          }
          valores.push(campo.trim());
          
          const obj = {};
          headers.forEach((header, idx) => {
            obj[header] = valores[idx] || '';
          });
          return obj;
        });

        // Crear libro de Excel con ExcelJS
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Sistema Gimnasio USM';
        workbook.created = new Date();

        // Hoja principal con datos
        let sheetName = '';
        switch(tipoExportacion) {
          case TIPOS_EXPORTACION.COMPLETO:
            sheetName = 'Reporte Completo';
            break;
          case TIPOS_EXPORTACION.CUPOS:
            sheetName = 'Cupos';
            break;
          case TIPOS_EXPORTACION.RESERVAS:
            sheetName = 'Reservas';
            break;
          default:
            sheetName = 'Datos';
        }
        
        const worksheet = workbook.addWorksheet(sheetName);
        
        // Agregar headers con estilo
        worksheet.columns = headers.map(h => ({
          header: h,
          key: h,
          width: Math.max(h.length + 5, 15)
        }));
        
        // Estilo para headers
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Agregar datos
        datos.forEach(row => {
          worksheet.addRow(row);
        });
        
        // Aplicar bordes a todas las celdas
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
            };
          });
          
          // Alternar colores de filas (zebra striping)
          if (rowNumber > 1 && rowNumber % 2 === 0) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF5F5F5' }
              };
            });
          }
        });
        
        // Hoja de resumen
        const resumenSheet = workbook.addWorksheet('Resumen');
        resumenSheet.columns = [
          { header: 'Campo', key: 'campo', width: 30 },
          { header: 'Valor', key: 'valor', width: 40 }
        ];
        
        resumenSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        resumenSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF70AD47' }
        };
        
        resumenSheet.addRow({
          campo: 'Fecha de Exportación',
          valor: new Date().toLocaleString('es-CL')
        });
        resumenSheet.addRow({
          campo: 'Tipo de Reporte',
          valor: sheetName
        });
        resumenSheet.addRow({
          campo: 'Período',
          valor: mesSeleccionado || 'Últimos 3 meses'
        });
        resumenSheet.addRow({
          campo: 'Total de Registros',
          valor: datos.length
        });
        
        // Generar y descargar archivo
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const fileName = `gimnasio_${tipoExportacion}_${mesSeleccionado || 'reciente'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Crear link de descarga
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        setMessage(`✓ Archivo Excel descargado: ${fileName}`);
      } else {
        setMessage("Error al exportar datos");
      }
    } catch (error) {
      console.error("Error exportando:", error);
      setMessage("Error de conexión al exportar");
    } finally {
      setLoading(false);
    }
  };

  const getDescripcionTipo = () => {
    switch (tipoExportacion) {
      case TIPOS_EXPORTACION.COMPLETO:
        return ["Cupos y reservas", "Estadísticas de asistencia", "Lista de usuarios por bloque"];
      case TIPOS_EXPORTACION.CUPOS:
        return ["Total de cupos por día", "Cupos reservados/disponibles", "Histórico de capacidad"];
      case TIPOS_EXPORTACION.RESERVAS:
        return ["Reservas individuales", "Estado de asistencia", "Datos de usuarios"];
      default:
        return [];
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-2xl">📊</span>
        </div>
        <div>
          <h4 className="text-xl font-bold text-gray-900">Exportar a Excel</h4>
          <p className="text-sm text-gray-600">Descarga reportes profesionales en formato xlsx</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Período
          </label>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Últimos 3 meses</option>
            {mesesDisponibles.map((mes) => (
              <option key={mes.mes} value={mes.mes}>
                {mes.nombre || mes.mes} ({mes.total_reservas} reservas)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tipo de Reporte
          </label>
          <select
            value={tipoExportacion}
            onChange={(e) => setTipoExportacion(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value={TIPOS_EXPORTACION.COMPLETO}>Reporte Completo</option>
            <option value={TIPOS_EXPORTACION.CUPOS}>Solo Cupos</option>
            <option value={TIPOS_EXPORTACION.RESERVAS}>Solo Reservas</option>
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <button
            onClick={exportarAExcel}
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Descargar Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-sm font-semibold text-gray-700 mb-2">Este reporte incluye:</p>
        <ul className="space-y-1">
          {getDescripcionTipo().map((desc, idx) => (
            <li key={idx} className="text-sm text-gray-600 flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>Formato:</strong> Excel (.xlsx) con múltiples hojas</p>
            <p><strong>Contenido:</strong> Datos formateados con colores y anchos automáticos</p>
            <p><strong>Compatible:</strong> Microsoft Excel, Google Sheets, LibreOffice</p>
            <p><strong>Histórico:</strong> {mesesDisponibles.length} meses disponibles</p>
          </div>
        </div>
      </div>
    </div>
  );
}
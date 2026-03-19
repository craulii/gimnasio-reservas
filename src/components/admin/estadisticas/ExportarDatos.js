"use client";
import { useState } from "react";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import ApiService from "../../../services/api";
import { HORARIOS_BLOQUE, getFechaChile } from "../../../app/utils/constants";

const PERIODOS = [
  { id: "1semana", label: "Ultima semana", dias: 7 },
  { id: "1mes", label: "Ultimo mes", dias: 30 },
  { id: "3meses", label: "Ultimos 3 meses", dias: 90 },
  { id: "6meses", label: "Ultimos 6 meses", dias: 180 },
  { id: "12meses", label: "Ultimo año", dias: 365 },
];

function calcularFechaInicio(dias) {
  const hoy = getFechaChile();
  const [y, m, d] = hoy.split('-').map(Number);
  const fecha = new Date(y, m - 1, d - dias);
  return fecha.toLocaleDateString('en-CA');
}

function applyHeaderStyle(row, color) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 28;
}

function applyBordersAndZebra(sheet) {
  const border = {
    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  };
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => { cell.border = border; });
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        if (!cell.fill || cell.fill.fgColor?.argb !== 'FFFFFFFF') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
      });
    }
  });
}

function autoWidth(sheet) {
  sheet.columns.forEach((col) => {
    let maxLen = col.header ? col.header.length : 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 50);
  });
}

export default function ExportarDatos({ setMessage }) {
  const [periodo, setPeriodo] = useState("1mes");
  const [loading, setLoading] = useState(false);

  const exportarAExcel = async () => {
    setLoading(true);
    setMessage("Generando archivo Excel...");

    try {
      const periodoConfig = PERIODOS.find(p => p.id === periodo);
      const fechaInicio = calcularFechaInicio(periodoConfig.dias);
      const fechaFin = getFechaChile();

      const { ok, data } = await ApiService.exportarCompleto(fechaInicio, fechaFin);

      if (!ok || !data) {
        setMessage(data?.error || "Error al obtener datos para exportar");
        setLoading(false);
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema Gimnasio USM';
      workbook.created = new Date();

      // =============================================
      // HOJA 1: Resumen Ejecutivo
      // =============================================
      const s1 = workbook.addWorksheet('Resumen Ejecutivo');
      s1.columns = [
        { header: 'Indicador', key: 'indicador', width: 35 },
        { header: 'Valor', key: 'valor', width: 30 },
      ];
      applyHeaderStyle(s1.getRow(1), 'FF70AD47');

      const r = data.resumen || {};
      const ct = data.cupos_totales || {};
      const tasaOcupacion = parseInt(ct.cupos_totales) > 0
        ? ((parseInt(r.total_reservas) / parseInt(ct.cupos_totales)) * 100).toFixed(1)
        : '0';

      const resumenRows = [
        { indicador: 'Periodo', valor: `${fechaInicio} a ${fechaFin}` },
        { indicador: 'Total Reservas', valor: parseInt(r.total_reservas) || 0 },
        { indicador: 'Total Asistencias', valor: parseInt(r.total_asistencias) || 0 },
        { indicador: 'Tasa de Asistencia', valor: `${r.porcentaje_asistencia || 0}%` },
        { indicador: 'Usuarios Unicos', valor: parseInt(r.usuarios_unicos) || 0 },
        { indicador: 'Cupos Totales Ofrecidos', valor: parseInt(ct.cupos_totales) || 0 },
        { indicador: 'Cupos Reservados', valor: parseInt(ct.cupos_reservados) || 0 },
        { indicador: 'Tasa de Ocupacion', valor: `${tasaOcupacion}%` },
        { indicador: 'Fecha de Exportacion', valor: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }) },
      ];
      resumenRows.forEach(row => s1.addRow(row));
      applyBordersAndZebra(s1);

      // =============================================
      // HOJA 2: Por Bloque Horario
      // =============================================
      const s2 = workbook.addWorksheet('Por Bloque Horario');
      s2.columns = [
        { header: 'Bloque', key: 'bloque', width: 12 },
        { header: 'Horario Inicio', key: 'horario_inicio', width: 16 },
        { header: 'Horario Fin', key: 'horario_fin', width: 14 },
        { header: 'Reservas', key: 'reservas', width: 12 },
        { header: 'Asistencias', key: 'asistencias', width: 14 },
        { header: 'Ausencias', key: 'ausencias', width: 12 },
        { header: 'Tasa Asistencia %', key: 'porcentaje', width: 18 },
      ];
      applyHeaderStyle(s2.getRow(1), 'FF4472C4');

      (data.por_bloque || []).forEach(b => {
        s2.addRow({
          bloque: b.bloque,
          horario_inicio: b.horario_inicio,
          horario_fin: b.horario_fin,
          reservas: parseInt(b.reservas) || 0,
          asistencias: parseInt(b.asistencias) || 0,
          ausencias: (parseInt(b.reservas) || 0) - (parseInt(b.asistencias) || 0),
          porcentaje: parseFloat(b.porcentaje) || 0,
        });
      });
      applyBordersAndZebra(s2);
      autoWidth(s2);

      // =============================================
      // HOJA 3: Por Sede
      // =============================================
      const s3 = workbook.addWorksheet('Por Sede');
      s3.columns = [
        { header: 'Sede', key: 'sede', width: 20 },
        { header: 'Reservas', key: 'reservas', width: 12 },
        { header: 'Asistencias', key: 'asistencias', width: 14 },
        { header: 'Ausencias', key: 'ausencias', width: 12 },
        { header: 'Tasa Asistencia %', key: 'porcentaje', width: 18 },
        { header: 'Cupos Totales', key: 'cupos_totales', width: 16 },
        { header: 'Tasa Ocupacion %', key: 'tasa_ocupacion', width: 18 },
      ];
      applyHeaderStyle(s3.getRow(1), 'FF7030A0');

      (data.por_sede || []).forEach(s => {
        const reservas = parseInt(s.reservas) || 0;
        const cupos = parseInt(s.cupos_totales) || 0;
        s3.addRow({
          sede: s.sede,
          reservas,
          asistencias: parseInt(s.asistencias) || 0,
          ausencias: reservas - (parseInt(s.asistencias) || 0),
          porcentaje: parseFloat(s.porcentaje) || 0,
          cupos_totales: cupos,
          tasa_ocupacion: cupos > 0 ? parseFloat(((reservas / cupos) * 100).toFixed(1)) : 0,
        });
      });
      applyBordersAndZebra(s3);
      autoWidth(s3);

      // =============================================
      // HOJA 4: Tendencia Diaria
      // =============================================
      const s4 = workbook.addWorksheet('Tendencia Diaria');
      s4.columns = [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Dia', key: 'dia_semana', width: 14 },
        { header: 'Reservas', key: 'reservas', width: 12 },
        { header: 'Asistencias', key: 'asistencias', width: 14 },
        { header: 'Ausencias', key: 'ausencias', width: 12 },
        { header: 'Tasa Asistencia %', key: 'porcentaje', width: 18 },
      ];
      applyHeaderStyle(s4.getRow(1), 'FF00B0F0');

      (data.tendencia || []).forEach(t => {
        s4.addRow({
          fecha: t.fecha,
          dia_semana: t.dia_semana,
          reservas: parseInt(t.reservas) || 0,
          asistencias: parseInt(t.asistencias) || 0,
          ausencias: (parseInt(t.reservas) || 0) - (parseInt(t.asistencias) || 0),
          porcentaje: parseFloat(t.porcentaje) || 0,
        });
      });
      applyBordersAndZebra(s4);
      autoWidth(s4);

      // =============================================
      // HOJA 5: Ranking Alumnos
      // =============================================
      const s5 = workbook.addWorksheet('Ranking Alumnos');
      s5.columns = [
        { header: '#', key: 'posicion', width: 6 },
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Reservas', key: 'reservas', width: 12 },
        { header: 'Asistencias', key: 'asistencias', width: 14 },
        { header: 'Tasa Asistencia %', key: 'porcentaje', width: 18 },
      ];
      applyHeaderStyle(s5.getRow(1), 'FFED7D31');

      (data.ranking || []).forEach((a, idx) => {
        s5.addRow({
          posicion: idx + 1,
          nombre: a.nombre || 'Sin nombre',
          email: a.email,
          reservas: parseInt(a.reservas) || 0,
          asistencias: parseInt(a.asistencias) || 0,
          porcentaje: parseFloat(a.porcentaje) || 0,
        });
      });
      applyBordersAndZebra(s5);
      autoWidth(s5);

      // =============================================
      // HOJA 6: Datos Crudos
      // =============================================
      const s6 = workbook.addWorksheet('Datos Crudos');
      s6.columns = [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Nombre', key: 'nombre', width: 28 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Sede', key: 'sede', width: 16 },
        { header: 'Bloque', key: 'bloque', width: 10 },
        { header: 'Horario', key: 'horario', width: 16 },
        { header: 'Estado', key: 'estado', width: 16 },
      ];
      applyHeaderStyle(s6.getRow(1), 'FF808080');

      (data.datos_crudos || []).forEach(d => {
        const h = HORARIOS_BLOQUE[d.bloque];
        s6.addRow({
          fecha: d.fecha,
          nombre: d.nombre || 'Sin nombre',
          email: d.email,
          sede: d.sede,
          bloque: d.bloque,
          horario: h ? `${h.inicio} - ${h.fin}` : '',
          estado: d.estado,
        });
      });
      applyBordersAndZebra(s6);
      autoWidth(s6);

      // Generar y descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const fileName = `gimnasio_reporte_${fechaFin}.xlsx`;
      saveAs(blob, fileName);
      setMessage(`Archivo descargado: ${fileName}`);
    } catch (error) {
      console.error("Error exportando:", error);
      setMessage("Error al generar el Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-40 h-40 bg-white opacity-10 rounded-full"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Exportar a Excel</h2>
              <p className="text-emerald-100 text-sm">Reporte profesional multi-hoja para presentaciones</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-white text-sm font-semibold mb-2 tracking-wide">
                PERIODO
              </label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-base font-medium bg-white/95 backdrop-blur-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-white/50 shadow-lg transition-all hover:bg-white"
              >
                {PERIODOS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={exportarAExcel}
              disabled={loading}
              className="px-10 py-3 bg-white text-emerald-600 font-bold rounded-xl hover:bg-gray-50 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-lg shadow-xl transform hover:scale-105 active:scale-95"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generando...
                </span>
              ) : "DESCARGAR EXCEL"}
            </button>
          </div>
        </div>
      </div>

      {/* Detalle de hojas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { nombre: "Resumen Ejecutivo", color: "from-green-500 to-green-600", desc: "KPIs clave, tasa de ocupacion y asistencia" },
          { nombre: "Por Bloque Horario", color: "from-blue-500 to-blue-600", desc: "Demanda por bloque con horarios reales" },
          { nombre: "Por Sede", color: "from-purple-500 to-purple-600", desc: "Comparativa entre campus" },
          { nombre: "Tendencia Diaria", color: "from-cyan-500 to-cyan-600", desc: "Evolucion dia a dia de la demanda" },
          { nombre: "Ranking Alumnos", color: "from-orange-500 to-orange-600", desc: "Top 50 usuarios mas activos" },
          { nombre: "Datos Crudos", color: "from-gray-500 to-gray-600", desc: "Todas las reservas para analisis libre" },
        ].map((hoja, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${hoja.color}`}></div>
              <h4 className="font-semibold text-gray-800 text-sm">{hoja.nombre}</h4>
            </div>
            <p className="text-xs text-gray-500">{hoja.desc}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>Formato:</strong> Excel (.xlsx) con 6 hojas profesionales</p>
            <p><strong>Contenido:</strong> Headers con color, zebra striping, bordes y columnas auto-ajustadas</p>
            <p><strong>Compatible:</strong> Microsoft Excel, Google Sheets, LibreOffice</p>
          </div>
        </div>
      </div>
    </div>
  );
}

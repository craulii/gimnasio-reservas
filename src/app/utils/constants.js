// src/app/utils/constants.js

// Bloques horarios del gimnasio
export const BLOQUES_HORARIOS = [
  "7-8",
  "8-9",
  "9-10",
  "10-11",
  "11-12",
  "12-13",
  "13-14",
  "14-15",
  "15-16",
  "16-17",
  "17-18",
  "18-19",
  "19-20",
  "20-21"
];

// Sedes disponibles
export const SEDES = ['Vitacura', 'San Joaquín'];

// Tipos de exportación de datos
export const TIPOS_EXPORTACION = {
  COMPLETO: "completo",
  CUPOS: "cupos",
  RESERVAS: "reservas"
};

// Tipos de usuarios para filtrado
export const TIPOS_USUARIOS = {
  TODOS: "todos",
  ALUMNOS: "alumnos",
  ADMINS: "admins"
};

// Mensajes estándar del sistema
export const MENSAJES = {
  ERROR_CONEXION: "Error de conexión",
  ERROR_GENERICO: "Ha ocurrido un error",
  OPERACION_EXITOSA: "Operación completada exitosamente",
  SESION_CERRADA: "Sesión cerrada con éxito",
  CAMPOS_INCOMPLETOS: "Por favor completa todos los campos",
  CONFIRMACION_ELIMINAR: "¿Estás seguro de eliminar este elemento?"
};

// Endpoints de la API
export const API_ENDPOINTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
  LOGIN: '/api/login',
  REGISTER: '/api/register',
  CUPOS: '/api/cupos',
  RESERVAS: '/api/reservas',
  ASISTENCIA: '/api/asistencia',
  ADMIN: {
    RESERVAS_BLOQUE: '/api/admin/reservas-por-bloque',
    CANCELAR_RESERVA: '/api/admin/cancelar-reserva',
    ESTADISTICAS: '/api/admin/estadisticas',
    ESTADISTICAS_ALUMNO: '/api/admin/estadisticas-alumno',
    ESTADISTICAS_BLOQUE: '/api/admin/estadisticas-bloque',
    USUARIOS: '/api/admin/usuarios',
    EXPORTAR: '/api/admin/exportar'
  }
};

// Colores para gráficos (usados en Recharts)
export const COLORES_GRAFICOS = {
  AZUL: '#3b82f6',
  VERDE: '#10b981',
  MORADO: '#8b5cf6',
  NARANJA: '#f59e0b',
  ROJO: '#ef4444',
  ROSA: '#ec4899',
  CYAN: '#06b6d4',
  AMARILLO: '#fbbf24',
  GRIS: '#6b7280',
  INDIGO: '#6366f1'
};

// Array de colores para gráficos con múltiples elementos
export const PALETA_COLORES = [
  '#3b82f6', // Azul
  '#10b981', // Verde
  '#f59e0b', // Naranja
  '#ef4444', // Rojo
  '#8b5cf6', // Morado
  '#ec4899', // Rosa
  '#06b6d4', // Cyan
  '#fbbf24'  // Amarillo
];

// Niveles de asistencia para clasificación
export const NIVELES_ASISTENCIA = {
  EXCELENTE: { 
    min: 90, 
    max: 100,
    color: 'green', 
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    label: 'Excelente' 
  },
  BUENO: { 
    min: 75, 
    max: 89,
    color: 'blue', 
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    label: 'Bueno' 
  },
  REGULAR: { 
    min: 60, 
    max: 74,
    color: 'yellow', 
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    label: 'Regular' 
  },
  BAJO: { 
    min: 0, 
    max: 59,
    color: 'red', 
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    label: 'Bajo' 
  }
};

// Función helper para obtener el nivel de asistencia
export const getNivelAsistencia = (porcentaje) => {
  if (porcentaje >= 90) return NIVELES_ASISTENCIA.EXCELENTE;
  if (porcentaje >= 75) return NIVELES_ASISTENCIA.BUENO;
  if (porcentaje >= 60) return NIVELES_ASISTENCIA.REGULAR;
  return NIVELES_ASISTENCIA.BAJO;
};

// Estados de reserva
export const ESTADOS_RESERVA = {
  PENDIENTE: {
    valor: 0,
    label: 'Pendiente',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800'
  },
  ASISTIO: {
    valor: 1,
    label: 'Presente',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800'
  }
};

// Configuración de paginación
export const PAGINACION = {
  ITEMS_POR_PAGINA: 10,
  ITEMS_POR_PAGINA_TABLA: 20
};

// Rangos de fechas predefinidos
export const RANGOS_FECHAS = {
  HOY: 'hoy',
  ULTIMA_SEMANA: 'ultima_semana',
  ULTIMO_MES: 'ultimo_mes',
  ULTIMOS_3_MESES: 'ultimos_3_meses',
  PERSONALIZADO: 'personalizado'
};

// Función helper para obtener rango de fechas
export const getRangoFechas = (tipo) => {
  const hoy = new Date();
  const fechaFin = hoy.toISOString().split('T')[0];
  let fechaInicio;

  switch (tipo) {
    case RANGOS_FECHAS.HOY:
      fechaInicio = fechaFin;
      break;
    case RANGOS_FECHAS.ULTIMA_SEMANA:
      const hace7Dias = new Date(hoy);
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      fechaInicio = hace7Dias.toISOString().split('T')[0];
      break;
    case RANGOS_FECHAS.ULTIMO_MES:
      const hace30Dias = new Date(hoy);
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      fechaInicio = hace30Dias.toISOString().split('T')[0];
      break;
    case RANGOS_FECHAS.ULTIMOS_3_MESES:
      const hace90Dias = new Date(hoy);
      hace90Dias.setDate(hace90Dias.getDate() - 90);
      fechaInicio = hace90Dias.toISOString().split('T')[0];
      break;
    default:
      fechaInicio = fechaFin;
  }

  return { fechaInicio, fechaFin };
};

// Configuración de formato de fechas
export const FORMATO_FECHA = {
  CORTO: { day: '2-digit', month: '2-digit', year: 'numeric' },
  LARGO: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  MES_ANIO: { year: 'numeric', month: 'long' }
};

// Días de la semana en español
export const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

// Meses en español
export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

// Límites del sistema
export const LIMITES = {
  MAX_CUPOS_POR_BLOQUE: 20,
  MIN_CUPOS_POR_BLOQUE: 5,
  MAX_RESERVAS_POR_USUARIO_DIA: 2,
  DIAS_ADELANTE_RESERVA: 7
};

// Roles de usuario
export const ROLES = {
  ADMIN: 'admin',
  ALUMNO: 'alumno'
};

// Validaciones
export const VALIDACIONES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ROL_REGEX: /^\d{8,9}-[\dkK]$/,
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 3
};
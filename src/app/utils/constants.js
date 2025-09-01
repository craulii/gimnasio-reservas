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

export const TIPOS_EXPORTACION = {
  COMPLETO: "completo",
  CUPOS: "cupos",
  RESERVAS: "reservas"
};

export const TIPOS_USUARIOS = {
  TODOS: "todos",
  ALUMNOS: "alumnos",
  ADMINS: "admins"
};

export const MENSAJES = {
  ERROR_CONEXION: "Error de conexión",
  ERROR_GENERICO: "Ha ocurrido un error",
  OPERACION_EXITOSA: "Operación completada exitosamente",
  SESION_CERRADA: "Sesión cerrada con éxito",
  CAMPOS_INCOMPLETOS: "Por favor completa todos los campos",
  CONFIRMACION_ELIMINAR: "¿Estás seguro de eliminar este elemento?"
};

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
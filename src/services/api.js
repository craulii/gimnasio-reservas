const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Función central para manejar todas las peticiones fetch.
 * Asegura que siempre se envíen las cookies (credentials: 'include')
 * y maneja los errores de conexión de forma uniforme.
 */
async function fetchWithAuth(endpoint, options = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // 🔥 VITAL: Esto permite que la cookie 'user_session' viaje al servidor
    credentials: 'include', 
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    
    // Intentamos parsear JSON, si falla devolvemos texto
    let data;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return { 
      ok: res.ok, 
      status: res.status, 
      data 
    };

  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    return { 
      ok: false, 
      status: 500, 
      data: { error: "Error de conexión con el servidor" } 
    };
  }
}

class ApiService {

  // --- AUTH ---
  
  static async login(credentials) {
    return await fetchWithAuth('/api/login', {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  static async register(userData) {
    return await fetchWithAuth('/api/register', {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  static async checkAuth() {
    return await fetchWithAuth('/api/auth/check', { method: "GET" });
  }

  // --- CUPOS ---

  static async getCupos(sede = null) {
    let endpoint = '/api/cupos';
    if (sede) {
      endpoint += `?sede=${encodeURIComponent(sede)}`;
    }
    return await fetchWithAuth(endpoint, { method: "GET" });
  }

  static async updateCupos(bloque, sede, cantidad) {
    return await fetchWithAuth('/api/cupos', {
      method: "PATCH",
      body: JSON.stringify({ bloque, sede, cantidad }),
    });
  }

  // --- RESERVAS ---

  static async makeReserva(bloque_horario, sede) {
    // Ya no necesitamos pasar 'user', la cookie lo lleva implícito
    return await fetchWithAuth('/api/reservas', {
      method: "POST",
      body: JSON.stringify({ bloque_horario, sede }),
    });
  }

  static async getMisReservas() {
    return await fetchWithAuth('/api/reservas', { method: "GET" });
  }

  static async cancelarMiReserva(bloque_horario, sede) {
    return await fetchWithAuth('/api/reservas', {
      method: "DELETE",
      body: JSON.stringify({ bloque_horario, sede }),
    });
  }

  // --- ADMIN: RESERVAS Y GESTIÓN ---

  static async getReservasPorBloque(sede = null) {
    let endpoint = '/api/admin/reservas-por-bloque';
    if (sede) {
      endpoint += `?sede=${encodeURIComponent(sede)}`;
    }
    return await fetchWithAuth(endpoint, { method: "GET" });
  }

  static async cancelarReserva(email, bloque_horario, sede, fecha) {
    let fechaFormateada = fecha;
    // Manejo robusto de fechas
    if (fecha instanceof Date) {
      fechaFormateada = fecha.toISOString().split("T")[0];
    } else if (typeof fecha === "string" && fecha.includes("T")) {
      fechaFormateada = fecha.split("T")[0];
    }

    return await fetchWithAuth('/api/admin/cancelar-reserva', {
      method: "DELETE",
      body: JSON.stringify({ email, bloque_horario, sede, fecha: fechaFormateada }),
    });
  }

  // --- ADMIN: ASISTENCIA ---

  static async marcarAsistencia(username, bloque, presente) {
    return await fetchWithAuth('/api/asistencia', {
      method: "POST",
      body: JSON.stringify({ username, bloque, presente }),
    });
  }

  static async getUsuariosBloque(bloque, sede, fecha) {
    const fechaParam = fecha || new Date().toISOString().split('T')[0];
    const endpoint = `/api/admin/asistencia-masiva?bloque=${encodeURIComponent(bloque)}&sede=${encodeURIComponent(sede)}&fecha=${fechaParam}`;
    return await fetchWithAuth(endpoint, { method: "GET" });
  }

  static async registrarAsistenciaMasiva(asistencias, bloque_horario, sede, fecha) {
    return await fetchWithAuth('/api/admin/asistencia-masiva', {
      method: "POST",
      body: JSON.stringify({ asistencias, bloque_horario, sede, fecha }),
    });
  }

  // --- ADMIN: ESTADÍSTICAS ---

  static async getEstadisticas(fechaInicio, fechaFin) {
    let endpoint = '/api/admin/estadisticas';
    if (fechaInicio && fechaFin) {
      endpoint += `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    return await fetchWithAuth(endpoint, { method: "GET" });
  }

  static async getEstadisticasAlumno(email, fechaInicio, fechaFin) {
    let endpoint = `/api/admin/estadisticas-alumno?email=${email}`;
    if (fechaInicio && fechaFin) {
      endpoint += `&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    return await fetchWithAuth(endpoint, { method: "GET" });
  }

  static async getEstadisticasBloque(bloque, fechaInicio, fechaFin) {
    let endpoint = `/api/admin/estadisticas-bloque?bloque=${bloque}`;
    if (fechaInicio && fechaFin) {
      endpoint += `&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    return await fetchWithAuth(endpoint, { method: "GET" });
  }

  // --- ADMIN: USUARIOS ---

  static async getUsuarios(tipo, search) {
    let endpoint = `/api/admin/usuarios?tipo=${tipo}`;
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }
    return await fetchWithAuth(endpoint, { method: "GET" });
  }

  static async updateUsuario(email, userData) {
    return await fetchWithAuth('/api/admin/usuarios', {
      method: "PUT",
      body: JSON.stringify({ email, ...userData }),
    });
  }

  static async deleteUsuario(email) {
    return await fetchWithAuth('/api/admin/usuarios', {
      method: "DELETE",
      body: JSON.stringify({ email }),
    });
  }

  static async borrarFalta(email, reservaId) {
    return await fetchWithAuth('/api/admin/usuarios', {
      method: "PATCH",
      body: JSON.stringify({ email, reservaId }),
    });
  }

  static async desbanearUsuario(email) {
    return await fetchWithAuth('/api/admin/usuarios', {
      method: "PUT",
      body: JSON.stringify({ email, baneado: 0, faltas: 0 }),
    });
  }

  // --- ADMIN: EXPORTAR Y OTROS ---

  static async getMesesDisponibles() {
    return await fetchWithAuth('/api/admin/exportar', { method: "POST" });
  }

  static async exportarCompleto(fechaInicio, fechaFin) {
    return await fetchWithAuth(`/api/admin/exportar-completo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, { method: "GET" });
  }

  static async exportarDatos(tipo, mes) {
    let endpoint = `/api/admin/exportar?tipo=${tipo}`;
    if (mes) {
      endpoint += `&mes=${mes}`;
    }
    return await fetchWithAuth(endpoint, { method: "GET" });
  }

  static async activarBotonPanico(bloques, fecha) {
    return await fetchWithAuth('/api/admin/boton-panico', {
      method: "POST",
      body: JSON.stringify({ bloques, fecha }),
    });
  }

  static async getEstadoBloques(fecha) {
    return await fetchWithAuth(`/api/admin/boton-panico?fecha=${fecha}`, { method: "GET" });
  }

  static async restablecerBloques(bloques, fecha) {
    return await fetchWithAuth('/api/admin/boton-panico', {
      method: "PUT",
      body: JSON.stringify({ bloques, fecha }),
    });
  }

  // --- GOD MODE: MONITOR ---

  static async getMonitorData() {
    return await fetchWithAuth('/api/admin/monitor', { method: "GET" });
  }

  // --- GOD MODE: HERRAMIENTAS ---

  static async generarCuposHastaFecha(fechaHasta) {
    return await fetchWithAuth('/api/admin/generar-cupos', {
      method: "POST",
      body: JSON.stringify({ fechaHasta }),
    });
  }

  static async reservarParaAlumno(email, fecha, bloque_horario, sede) {
    return await fetchWithAuth('/api/admin/reservar-alumno', {
      method: "POST",
      body: JSON.stringify({ email, fecha, bloque_horario, sede }),
    });
  }

  static async getCuposFecha(fecha, sede) {
    let endpoint = `/api/cupos?fecha=${fecha}`;
    if (sede) {
      endpoint += `&sede=${encodeURIComponent(sede)}`;
    }
    return await fetchWithAuth(endpoint, { method: "GET" });
  }

  static async logout() {
    // Esto llama al archivo que creamos en el paso 1
    return await fetchWithAuth('/api/logout', { method: "POST" });
  }
}

export default ApiService;
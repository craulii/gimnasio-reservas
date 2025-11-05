const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

class ApiService {
  static authHeader(user) {
    if (!user || !user.username || !user.password) {
      console.log("[authHeader] No hay usuario o credenciales");
      return {};
    }
    const token = btoa(`${user.username}:${user.password}`);
    console.log("[authHeader] Generando header con token para:", user.username);
    return { Authorization: `Basic ${token}` };
  }

  static adminHeader() {
    return { "x-user": JSON.stringify({ rol: "admin" }) };
  }

  // Auth
  static async login(credentials) {
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      
      return { 
        ok: res.ok, 
        status: res.status,
        data: data
      };
    } catch (error) {
      return { 
        ok: false, 
        status: 500,
        data: { message: "Error de conexión" }
      };
    }
  }

  static async register(userData) {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return { ok: res.ok, data: await res.json() };
  }

  // Cupos
  static async getCupos(sede = null) {
    let url = `${API_BASE}/api/cupos`;
    if (sede) {
      url += `?sede=${encodeURIComponent(sede)}`;
    }
    const res = await fetch(url);
    return { ok: res.ok, data: await res.json() };
  }

  static async updateCupos(bloque, sede, cantidad) {
    const res = await fetch(`${API_BASE}/api/cupos`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...this.adminHeader(),
      },
      body: JSON.stringify({ bloque, sede, cantidad }),
    });
    return { ok: res.ok, data: await res.json() };
  }

  // Reservas
  static async makeReserva(bloque_horario, sede, user) {
    try {
      console.log("[makeReserva] Enviando reserva para bloque:", bloque_horario, "sede:", sede);
      console.log("[makeReserva] Usuario:", user?.username);
      
      const headers = {
        "Content-Type": "application/json",
        ...this.authHeader(user),
      };
      
      console.log("[makeReserva] Headers:", headers);
      
      const res = await fetch(`${API_BASE}/api/reservas`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ bloque_horario, sede }),
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      
      console.log("[makeReserva] Respuesta:", res.status, data);
      
      return { ok: res.ok, data };
    } catch (error) {
      console.error("[makeReserva] Error:", error);
      return { ok: false, data: "Error de conexión" };
    }
  }

  static async getReservasPorBloque() {
    const res = await fetch(`${API_BASE}/api/admin/reservas-por-bloque`, {
      headers: {
        ...this.adminHeader(),
        "Content-Type": "application/json",
      },
    });
    return { ok: res.ok, data: await res.json() };
  }

  static async cancelarReserva(email, bloque_horario, sede, fecha) {
    let fechaFormateada = fecha;
    if (fecha instanceof Date) {
      fechaFormateada = fecha.toISOString().split("T")[0];
    } else if (typeof fecha === "string" && fecha.includes("T")) {
      fechaFormateada = fecha.split("T")[0];
    }

    const res = await fetch(`${API_BASE}/api/admin/cancelar-reserva`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...this.adminHeader(),
      },
      body: JSON.stringify({ email, bloque_horario, sede, fecha: fechaFormateada }),
    });
    return { ok: res.ok, data: await res.json() };
  }

  // Asistencia
  static async marcarAsistencia(username, bloque, presente) {
    const res = await fetch(`${API_BASE}/api/asistencia`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.adminHeader(),
      },
      body: JSON.stringify({ username, bloque, presente }),
    });
    return { ok: res.ok, data: await res.json() };
  }

  // Estadísticas
  static async getEstadisticas(fechaInicio, fechaFin) {
    let url = `${API_BASE}/api/admin/estadisticas`;
    if (fechaInicio && fechaFin) {
      url += `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    const res = await fetch(url, {
      headers: this.adminHeader(),
    });
    return { ok: res.ok, data: await res.json() };
  }

  static async getEstadisticasAlumno(email, fechaInicio, fechaFin) {
    let url = `${API_BASE}/api/admin/estadisticas-alumno?email=${email}`;
    if (fechaInicio && fechaFin) {
      url += `&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    const res = await fetch(url, {
      headers: this.adminHeader(),
    });
    return { ok: res.ok, data: await res.json() };
  }

  static async getEstadisticasBloque(bloque, fechaInicio, fechaFin) {
    let url = `${API_BASE}/api/admin/estadisticas-bloque?bloque=${bloque}`;
    if (fechaInicio && fechaFin) {
      url += `&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    const res = await fetch(url, {
      headers: this.adminHeader(),
    });
    return { ok: res.ok, data: await res.json() };
  }

  // Usuarios
  static async getUsuarios(tipo, search) {
    let url = `${API_BASE}/api/admin/usuarios?tipo=${tipo}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    const res = await fetch(url, {
      headers: this.adminHeader(),
    });
    return { ok: res.ok, data: await res.json() };
  }

  static async updateUsuario(email, userData) {
    const res = await fetch(`${API_BASE}/api/admin/usuarios`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...this.adminHeader(),
      },
      body: JSON.stringify({ email, ...userData }),
    });
    return { ok: res.ok };
  }

  static async deleteUsuario(email) {
    const res = await fetch(`${API_BASE}/api/admin/usuarios`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...this.adminHeader(),
      },
      body: JSON.stringify({ email }),
    });
    return { ok: res.ok, data: await res.json() };
  }

  // Exportar
  static async getMesesDisponibles() {
    const res = await fetch(`${API_BASE}/api/admin/exportar`, {
      method: "POST",
      headers: this.adminHeader(),
    });
    return { ok: res.ok, data: await res.json() };
  }

  static async exportarDatos(tipo, mes) {
    let url = `${API_BASE}/api/admin/exportar?tipo=${tipo}`;
    if (mes) {
      url += `&mes=${mes}`;
    }
    return await fetch(url, {
      headers: this.adminHeader(),
    });
  }

    // Asistencia Masiva
  static async getUsuariosBloque(bloque, sede, fecha) {
    const fechaParam = fecha || new Date().toISOString().split('T')[0];
    const res = await fetch(
      `${API_BASE}/api/admin/asistencia-masiva?bloque=${bloque}&sede=${sede}&fecha=${fechaParam}`,
      {
        headers: this.adminHeader(),
      }
    );
    return { ok: res.ok, data: await res.json() };
  }

  static async registrarAsistenciaMasiva(asistencias, bloque_horario, sede, fecha) {
    const res = await fetch(`${API_BASE}/api/admin/asistencia-masiva`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.adminHeader(),
      },
      body: JSON.stringify({ asistencias, bloque_horario, sede, fecha }),
    });
    return { ok: res.ok, data: await res.json() };
  }

  // Gestión de baneo
  static async desbanearUsuario(email) {
    const res = await fetch(`${API_BASE}/api/admin/usuarios`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...this.adminHeader(),
      },
      body: JSON.stringify({ email, baneado: 0, faltas: 0 }),
    });
    return { ok: res.ok };
  }

}

export default ApiService;
"use client";
import { useState, useEffect } from "react";
import {
  FiUser,
  FiLock,
  FiLogIn,
  FiLogOut,
  FiPlus,
  FiMinus,
  FiCheck,
  FiX,
} from "react-icons/fi";

export default function Home() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [bloque, setBloque] = useState(null);
  const [cupos, setCupos] = useState({});
  const [asistenciaUser, setAsistenciaUser] = useState("");
  const [asistenciaBloque, setAsistenciaBloque] = useState(null);
  const [asistenciaPresente, setAsistenciaPresente] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("gestion");
  const [reservasPorBloque, setReservasPorBloque] = useState({});
  const [estadisticas, setEstadisticas] = useState({});
  const [fechaConsulta, setFechaConsulta] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [tipoEstadistica, setTipoEstadistica] = useState("general");
  const [emailAlumno, setEmailAlumno] = useState("");
  const [estadisticasAlumno, setEstadisticasAlumno] = useState({});
  const [estadisticasBloque, setEstadisticasBloque] = useState({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    rol: "",
  });
  const [usuarios, setUsuarios] = useState([]);
  const [busquedaUsuarios, setBusquedaUsuarios] = useState("");
  const [tipoUsuarios, setTipoUsuarios] = useState("todos");
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [formUsuario, setFormUsuario] = useState({
    name: "",
    email: "",
    newEmail: "",
    password: "",
    isAdmin: false,
  });
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [tipoExportacion, setTipoExportacion] = useState("completo");

  function authHeader() {
    if (!user) {
      console.log("[authHeader] No hay usuario logueado");
      return {};
    }
    const token = btoa(`${user.username}:${user.password}`);
    console.log("[authHeader] Generando header con token:", token);
    return { Authorization: `Basic ${token}` };
  }
  async function cargarMesesDisponibles() {
    try {
      const response = await fetch("/api/admin/exportar", {
        method: "POST",
        headers: { "x-user": JSON.stringify({ rol: "admin" }) },
      });
      const data = await response.json();
      setMesesDisponibles(data.meses_disponibles || []);
    } catch (error) {
      console.error("Error cargando meses:", error);
    }
  }

  async function exportarDatos() {
    try {
      let url = `/api/admin/exportar?tipo=${tipoExportacion}`;
      if (mesSeleccionado) {
        url += `&mes=${mesSeleccionado}`;
      }

      const response = await fetch(url, {
        headers: { "x-user": JSON.stringify({ rol: "admin" }) },
      });

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
    }
  }

  useEffect(() => {
    if (activeTab === "estadisticas" && user?.is_admin === 1) {
      cargarMesesDisponibles();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === "usuarios" && user?.is_admin === 1) {
      cargarUsuarios();
    }
  }, [activeTab, user, busquedaUsuarios, tipoUsuarios]);
  useEffect(() => {
    console.log("[useEffect user] Cambio de usuario:", user);
    if (user) {
      fetchCupos();
    } else {
      setCupos({});
      setBloque(null);
      setAsistenciaBloque(null);
      setMessage("");
    }
  }, [user]);

  useEffect(() => {
    console.log("[useEffect cupos] Cupos actualizados:", cupos);
    const bloques = Object.keys(cupos);
    if (bloques.length > 0) {
      if (!bloque || !bloques.includes(bloque)) {
        console.log(
          `[useEffect cupos] Ajustando bloque seleccionado a: ${bloques[0]}`
        );
        setBloque(bloques[0]);
      }
      if (!asistenciaBloque || !bloques.includes(asistenciaBloque)) {
        console.log(
          `[useEffect cupos] Ajustando asistenciaBloque a: ${bloques[0]}`
        );
        setAsistenciaBloque(bloques[0]);
      }
    }
  }, [cupos]);

  useEffect(() => {
    if (activeTab === "reservas" && user?.is_admin === 1) {
      cargarReservasPorBloque();
    }
  }, [activeTab, user]);

  async function login() {
    setMessage("Autenticando...");
    console.log("[login] Intentando login con usuario:", username);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      console.log("[login] Respuesta login:", res.status, data);
      if (res.ok) {
        setUser({
          username,
          password,
          is_admin: data.is_admin,
          id: data.rol,
          name: data.name,
        });
        const tipoUsuario = data.is_admin === 1 ? "Administrador" : "Alumno";
        setMessage(`Bienvenido ${data.name} (${tipoUsuario})`);
        console.log(`[login] Usuario autenticado como ${tipoUsuario}`);
      } else {
        setMessage(data.message || "Credenciales incorrectas");
        console.warn("[login] Credenciales incorrectas");
      }
    } catch (error) {
      console.error("[login] Error en conexión:", error);
      setMessage("Error de conexión");
    }
  }

  async function fetchCupos() {
    setLoading(true);
    console.log("[fetchCupos] Consultando cupos...");
    try {
      const res = await fetch("/api/cupos");
      const data = await res.json();
      console.log("[fetchCupos] Datos recibidos:", data);
      if (res.ok) {
        setCupos(data);
        setMessage("");
      } else {
        setMessage("Error al cargar cupos");
        console.error("[fetchCupos] Error en respuesta:", res.status);
      }
    } catch (error) {
      console.error("[fetchCupos] Error fetching cupos:", error);
      setMessage("Error al cargar cupos");
    } finally {
      setLoading(false);
    }
  }

  async function hacerReserva() {
    if (!bloque) {
      setMessage("Selecciona un bloque primero");
      console.warn("[hacerReserva] No se seleccionó bloque");
      return;
    }

    setMessage("Reservando...");
    console.log("[hacerReserva] Reservando bloque:", bloque);
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ bloque_horario: bloque }),
      });
      const text = await res.text();
      setMessage(text);
      console.log("[hacerReserva] Respuesta reserva:", res.status, text);
      if (res.ok) await fetchCupos();
    } catch (error) {
      console.error("[hacerReserva] Error al reservar:", error);
      setMessage("Error al reservar");
    }
  }

  async function modificarCupos(cantidad) {
    if (!bloque) {
      setMessage("Selecciona un bloque primero");
      console.warn("[modificarCupos] No se seleccionó bloque");
      return;
    }

    setMessage("Actualizando cupos...");
    console.log(
      `[modificarCupos] Modificando cupos en bloque ${bloque} en ${cantidad}`
    );
    try {
      const response = await fetch("/api/cupos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify({ rol: "admin" }),
        },
        body: JSON.stringify({ bloque: bloque, cantidad }),
      });

      if (response.ok) {
        const data = await response.json();
        setCupos(data.cupos);
        setMessage(data.message || "Cupos actualizados");
        console.log("[modificarCupos] Cupos actualizados correctamente");
      } else {
        const errorText = await response.text();
        setMessage(errorText);
        console.warn("[modificarCupos] Error en modificar cupos:", errorText);
      }
    } catch (error) {
      console.error("[modificarCupos] Error de conexión:", error);
      setMessage("Error de conexión");
    }
  }

  async function marcarAsistencia() {
    if (!asistenciaUser || !asistenciaBloque) {
      setMessage("Completa todos los campos");
      console.warn("[marcarAsistencia] Campos incompletos");
      return;
    }

    setMessage("Registrando asistencia...");
    console.log(
      "[marcarAsistencia] Usuario:",
      asistenciaUser,
      "Bloque:",
      asistenciaBloque,
      "Presente:",
      asistenciaPresente
    );
    try {
      const response = await fetch("/api/asistencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify({ rol: "admin" }),
        },
        body: JSON.stringify({
          username: asistenciaUser,
          bloque: asistenciaBloque,
          presente: asistenciaPresente,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message || "Operación completada");
        console.log("[marcarAsistencia] Respuesta:", data);
        setAsistenciaUser("");
      } else {
        const errorText = await response.text();
        setMessage(errorText);
      }
    } catch (error) {
      console.error("[marcarAsistencia] Error de conexión:", error);
      setMessage("Error de conexión");
    }
  }

  async function cargarReservasPorBloque() {
    setLoading(true);
    console.log("Cargando reservas de HOY...");

    try {
      const url = `/api/admin/reservas-por-bloque`;

      const response = await fetch(url, {
        headers: {
          "x-user": JSON.stringify({ rol: "admin" }),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en response:", errorText);
        setMessage(`Error ${response.status}: ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log("Reservas de hoy recibidas:", data);

      setReservasPorBloque(data);
      setMessage("");
    } catch (error) {
      console.error("Error cargando reservas:", error);
      setMessage(`Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function cargarEstadisticas() {
    setLoading(true);
    try {
      let url = "/api/admin/estadisticas";
      if (fechaInicio && fechaFin) {
        url += `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      }
      const response = await fetch(url, {
        headers: { "x-user": JSON.stringify({ rol: "admin" }) },
      });
      const data = await response.json();
      setEstadisticas(data);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
      setMessage("Error cargando estadísticas");
    }
    setLoading(false);
  }

  async function cancelarReserva(email, bloque_horario, fecha) {
    console.log("=== CANCELANDO RESERVA FRONTEND ===");
    console.log(
      "Email:",
      email,
      "Bloque:",
      bloque_horario,
      "Fecha original:",
      fecha
    );

    if (!confirm(`¿Cancelar reserva de ${email} para ${bloque_horario}?`))
      return;

    try {
      let fechaFormateada = fecha;
      if (fecha instanceof Date) {
        fechaFormateada = fecha.toISOString().split("T")[0];
      } else if (typeof fecha === "string" && fecha.includes("T")) {
        fechaFormateada = fecha.split("T")[0];
      }

      console.log("Fecha a enviar:", fechaFormateada);

      const response = await fetch("/api/admin/cancelar-reserva", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify({ rol: "admin" }),
        },
        body: JSON.stringify({
          email,
          bloque_horario,
          fecha: fechaFormateada,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Resultado cancelación:", result);

        if (result.cancelada) {
          setMessage("Reserva cancelada exitosamente");
          await cargarReservasPorBloque();
          await fetchCupos();
        } else {
          setMessage("No se encontró la reserva para cancelar");
        }
      } else {
        const errorText = await response.text();
        console.error("Error cancelando:", errorText);
        setMessage("Error cancelando reserva: " + errorText);
      }
    } catch (error) {
      console.error("Error de conexión cancelando reserva:", error);
      setMessage("Error de conexión al cancelar reserva");
    }
  }

  async function marcarAsistenciaDirecta(email, bloque, presente) {
    try {
      const response = await fetch("/api/asistencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify({ rol: "admin" }),
        },
        body: JSON.stringify({
          username: email,
          bloque: bloque,
          presente: presente,
        }),
      });

      if (response.ok) {
        setMessage(
          `✅ ${presente ? "Presente" : "Ausente"} marcado correctamente`
        );
        await cargarReservasPorBloque();
      } else {
        const errorText = await response.text();
        setMessage(`Error: ${errorText}`);
      }
    } catch (error) {
      setMessage(" Error de conexión al marcar asistencia");
    }
  }

  async function cargarEstadisticasAlumno() {
    if (!emailAlumno) return;
    setLoading(true);
    try {
      let url = `/api/admin/estadisticas-alumno?email=${emailAlumno}`;
      if (fechaInicio && fechaFin) {
        url += `&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      }
      const response = await fetch(url, {
        headers: { "x-user": JSON.stringify({ rol: "admin" }) },
      });
      const data = await response.json();
      setEstadisticasAlumno(data);
    } catch (error) {
      console.error("Error cargando estadísticas alumno:", error);
      setMessage("Error cargando estadísticas del alumno");
    }
    setLoading(false);
  }

  async function cargarEstadisticasBloque() {
    if (!bloqueSeleccionado) return;
    setLoading(true);
    try {
      let url = `/api/admin/estadisticas-bloque?bloque=${bloqueSeleccionado}`;
      if (fechaInicio && fechaFin) {
        url += `&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      }
      const response = await fetch(url, {
        headers: { "x-user": JSON.stringify({ rol: "admin" }) },
      });
      const data = await response.json();
      setEstadisticasBloque(data);
    } catch (error) {
      console.error("Error cargando estadísticas bloque:", error);
      setMessage("Error cargando estadísticas del bloque");
    }
    setLoading(false);
  }
  async function register() {
    setMessage("Creando cuenta...");
    console.log("[register] Intentando crear cuenta:", registerData.email);

    try {
      const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerData),
    });

      const data = await res.json();
      console.log("[register] Respuesta register:", res.status, data);

      if (res.ok) {
        setMessage(`¡Cuenta creada exitosamente! Ya puedes iniciar sesión.`);
        setRegisterData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
        setIsRegistering(false);
        setUsername(registerData.email);
      } else {
        setMessage(data.message || "Error al crear la cuenta");
      }
    } catch (error) {
      console.error("[register] Error en conexión:", error);
      setMessage("Error de conexión");
    }
  }

  async function cargarUsuarios() {
    setLoading(true);
    try {
      let url = `/api/admin/usuarios?tipo=${tipoUsuarios}`;
      if (busquedaUsuarios) {
        url += `&search=${encodeURIComponent(busquedaUsuarios)}`;
      }

      const response = await fetch(url, {
        headers: { "x-user": JSON.stringify({ rol: "admin" }) },
      });

      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      } else {
        setMessage("Error cargando usuarios");
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      setMessage("Error de conexión");
    }
    setLoading(false);
  }

  async function guardarUsuario() {
    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify({ rol: "admin" }),
        },
        body: JSON.stringify({
          email: usuarioEditando,
          ...formUsuario,
        }),
      });

      if (response.ok) {
        setMessage("✅ Usuario actualizado exitosamente");
        setModalUsuario(false);
        setUsuarioEditando(null);
        setFormUsuario({
          name: "",
          email: "",
          newEmail: "",
          password: "",
          isAdmin: false,
        });
        cargarUsuarios();
      } else {
        const errorText = await response.text();
        setMessage(`❌ Error: ${errorText}`);
      }
    } catch (error) {
      setMessage("❌ Error de conexión");
    }
  }

  async function eliminarUsuario(email, nombre) {
    if (
      !confirm(
        `¿Estás seguro de eliminar a ${nombre} (${email})?\n\nEsto también eliminará todas sus reservas.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify({ rol: "admin" }),
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ ${result.message}`);
        cargarUsuarios();
      } else {
        const errorText = await response.text();
        setMessage(`❌ Error: ${errorText}`);
      }
    } catch (error) {
      setMessage("❌ Error de conexión");
    }
  }

  function abrirEditarUsuario(usuario) {
    setUsuarioEditando(usuario.email);
    setFormUsuario({
      name: usuario.name,
      email: usuario.email,
      newEmail: usuario.email,
      password: "",
      isAdmin: usuario.is_admin === 1,
    });
    setModalUsuario(true);
  }

  return (
    <div
      className="
        flex min-h-screen items-center justify-center
        bg-amber-100
        bg-[url('/gym-bg.jpg')] bg-cover bg-center
      "
    >
      <div
        className="
        w-full max-w-md
        bg-stone-400/90 bg-opacity-90
        rounded-xl shadow-2xl
        border-2 border-yellow-800
        p-8
        "
      >
        {!user ? (
          <div className="space-y-6">
            <div className="text-center">
              <img src="/usm.png" alt="USM" className="mx-auto h-26 w-30" />
              <h1 className="mt-2 text-3xl font-extrabold text-white">
                BetterGym USM
              </h1>
              <p className="mt-1 text-sm font-bold text-yellow-800">
                ¡Potencia tu entrenamiento con Defider!
              </p>
            </div>

            <div className="flex rounded-lg bg-gray-200 p-1">
              <button
                onClick={() => {
                  setIsRegistering(false);
                  setMessage("");
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  !isRegistering
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => {
                  setIsRegistering(true);
                  setMessage("");
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  isRegistering
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            {!isRegistering && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  login();
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-yellow-800"
                  >
                    Correo
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-yellow-800" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="tucorreo@usm.cl"
                      className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-yellow-800"
                  >
                    Contraseña
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-yellow-800" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-md shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
                >
                  <FiLogIn className="mr-2 h-5 w-5" />
                  Iniciar sesión
                </button>
              </form>
            )}

            {isRegistering && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  register();
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="register-name"
                    className="block text-sm font-medium text-yellow-800"
                  >
                    Nombre completo
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-yellow-800" />
                    </div>
                    <input
                      id="register-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Tu nombre completo"
                      className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
                      value={registerData.name}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                
                <div>
                  <label
                    htmlFor="register-rol"
                    className="block text-sm font-medium text-yellow-800"
                  >
                    Rol
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="register-rol"
                      name="rol"
                      type="text"
                      required
                      placeholder="Rol"
                      pattern="^\d{9}-\d{1}$"
                      className="block w-full pl-3 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
                      value={registerData.rol || ""}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          rol: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="register-email"
                    className="block text-sm font-medium text-yellow-800"
                  >
                    Correo electrónico
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-yellow-800" />
                    </div>
                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="tucorreo@usm.cl"
                      className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="register-password"
                    className="block text-sm font-medium text-yellow-800"
                  >
                    Contraseña
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-yellow-800" />
                    </div>
                    <input
                      id="register-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="register-confirm"
                    className="block text-sm font-medium text-yellow-800"
                  >
                    Confirmar contraseña
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-yellow-800" />
                    </div>
                    <input
                      id="register-confirm"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      placeholder="Repite tu contraseña"
                      className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-md shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
                >
                  <FiUser className="mr-2 h-5 w-5" />
                  Crear cuenta
                </button>
              </form>
            )}

            {message && (
              <p
                className={`mt-4 text-center text-sm ${
                  message.includes("exitosamente")
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Bienvenido, {user.name}
                </h1>
                <p className="text-sm text-indigo-600 capitalize">
                  {user.is_admin === 1 ? "Administrador" : "Alumno"}
                </p>
              </div>
              <button
                onClick={() => {
                  console.log(
                    "[logout] Cerrando sesión de usuario:",
                    user.name
                  );
                  setUser(null);
                  setMessage("Sesión cerrada con éxito");
                }}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FiLogOut className="mr-1 h-4 w-4" />
                Cerrar sesión
              </button>
            </div>

            {message && (
              <div
                className={`rounded-md p-4 ${
                  message.includes("éxito")
                    ? "bg-green-50 text-green-800"
                    : "bg-blue-50 text-blue-800"
                }`}
              >
                <p className="text-sm">{message}</p>
              </div>
            )}

            {user.is_admin === 0 && (
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
                            <strong className="text-gray-800">
                              Bloque {b}
                            </strong>
                            <p className="text-sm text-gray-600">
                              Cupos: {disponibles} / {info.total} (Reservados:{" "}
                              {info.reservados})
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
            )}

            {user.is_admin === 1 && (
              <>
                <div className="flex space-x-1 mb-4 border-b bg-white rounded-t-lg">
                  {[
                    { id: "gestion", label: "Gestión", icon: "⚙️" },
                    { id: "reservas", label: "Reservas", icon: "📅" },
                    { id: "estadisticas", label: "Estadísticas", icon: "📊" },
                    { id: "usuarios", label: "Usuarios", icon: "👥" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() =>
                        setActiveTab ? setActiveTab(tab.id) : null
                      }
                      className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                        (activeTab || "gestion") === tab.id
                          ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {(!activeTab || activeTab === "gestion") && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <h2 className="text-lg font-medium text-gray-800 mb-3">
                        Gestión de cupos
                      </h2>
                      <div className="flex space-x-2 mb-3">
                        <select
                          onChange={(e) => setBloque(e.target.value)}
                          value={bloque || ""}
                          className="text-gray-800 flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          {Object.keys(cupos).map((b) => (
                            <option key={b} value={b} className="text-gray-800">
                              Bloque {b} - Total: {cupos[b].total} | Reservados:{" "}
                              {cupos[b].reservados} | Disponibles:{" "}
                              {cupos[b].total - cupos[b].reservados}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => modificarCupos(1)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <FiPlus className="mr-1 h-4 w-4" />
                          Sumar cupo
                        </button>
                        <button
                          onClick={() => modificarCupos(-1)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <FiMinus className="mr-1 h-4 w-4" />
                          Restar cupo
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-100 p-4 rounded-lg">
                      <h2 className="text-lg font-medium text-gray-800 mb-3">
                        Registro de asistencia
                      </h2>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-800">
                            Email del usuario
                          </label>
                          <input
                            placeholder="usuario@usm.cl"
                            value={asistenciaUser}
                            onChange={(e) => setAsistenciaUser(e.target.value)}
                            className="text-gray-800 mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-800">
                            Bloque horario
                          </label>
                          <select
                            onChange={(e) =>
                              setAsistenciaBloque(e.target.value)
                            }
                            value={asistenciaBloque || ""}
                            className="text-gray-800 mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          >
                            {Object.keys(cupos).map((b) => (
                              <option
                                key={b}
                                value={b}
                                className="text-gray-800"
                              >
                                Bloque {b}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={asistenciaPresente}
                            onChange={(e) =>
                              setAsistenciaPresente(e.target.checked)
                            }
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 block text-sm text-gray-800">
                            Presente
                          </label>
                        </div>

                        <button
                          onClick={marcarAsistencia}
                          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          {asistenciaPresente ? (
                            <FiCheck className="mr-1 h-4 w-4" />
                          ) : (
                            <FiX className="mr-1 h-4 w-4" />
                          )}
                          {asistenciaPresente
                            ? "Marcar presente"
                            : "Marcar ausente"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "reservas" && (
                  <div className="space-y-4">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-800">
                            Reservas de hoy -{" "}
                            {new Date().toLocaleDateString("es-CL", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {(reservasPorBloque &&
                              Object.values(reservasPorBloque).flat().length) ||
                              0}{" "}
                            reservas totales
                          </p>
                        </div>
                        <button
                          onClick={() => cargarReservasPorBloque()}
                          disabled={loading}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                        >
                          {loading ? "Cargando..." : "🔄 Refrescar"}
                        </button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-8 bg-white rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                        <p className="text-gray-500">
                          Cargando reservas de hoy...
                        </p>
                      </div>
                    ) : reservasPorBloque &&
                      Object.keys(reservasPorBloque).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(reservasPorBloque)
                          .sort(([a], [b]) => {
                            const aNum = parseInt(a.split("-")[0]);
                            const bNum = parseInt(b.split("-")[0]);
                            return aNum - bNum;
                          })
                          .map(([bloque, reservas]) => {
                            const totalReservas = Array.isArray(reservas)
                              ? reservas.length
                              : 0;
                            const presentes = Array.isArray(reservas)
                              ? reservas.filter((r) => r.asistio).length
                              : 0;
                            const cupoInfo = cupos[bloque] || {
                              total: 0,
                              reservados: 0,
                            };

                            return (
                              <div
                                key={bloque}
                                className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                              >
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h3 className="text-lg font-medium text-gray-900">
                                        📅 Bloque {bloque}
                                      </h3>
                                      <p className="text-sm text-gray-600">
                                        {totalReservas} reservas • {presentes}{" "}
                                        presentes •{" "}
                                        {cupoInfo.total - cupoInfo.reservados}{" "}
                                        cupos libres
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-gray-900">
                                        {Math.round(
                                          (presentes /
                                            Math.max(totalReservas, 1)) *
                                            100
                                        )}
                                        % asistencia
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Capacidad: {cupoInfo.reservados}/
                                        {cupoInfo.total}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {totalReservas > 0 ? (
                                  <div className="divide-y divide-gray-100">
                                    {reservas
                                      .sort((a, b) =>
                                        a.nombre.localeCompare(b.nombre)
                                      )
                                      .map((reserva, index) => (
                                        <div
                                          key={index}
                                          className="px-4 py-3 hover:bg-gray-50 transition-colors"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                              <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                                  reserva.asistio
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-600"
                                                }`}
                                              >
                                                {reserva.nombre
                                                  .charAt(0)
                                                  .toUpperCase()}
                                              </div>

                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                  {reserva.nombre}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">
                                                  {reserva.email}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                              <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                  reserva.asistio
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                                }`}
                                              >
                                                {reserva.asistio
                                                  ? "✅ Presente"
                                                  : "⏳ Pendiente"}
                                              </span>

                                              <button
                                                onClick={() =>
                                                  cancelarReserva(
                                                    reserva.email,
                                                    bloque,
                                                    reserva.fecha
                                                  )
                                                }
                                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                                                title={`Cancelar reserva de ${reserva.nombre}`}
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                ) : (
                                  <div className="px-4 py-8 text-center text-gray-500">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p>No hay reservas para este bloque</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-lg">
                        <div className="text-6xl mb-4">🏃‍♂️</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No hay reservas para hoy
                        </h3>
                        <p className="text-gray-500">
                          Los alumnos aún no han hecho reservas para el día de
                          hoy.
                        </p>
                        <button
                          onClick={() => cargarReservasPorBloque()}
                          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                          Refrescar
                        </button>
                      </div>
                    )}

                    {reservasPorBloque &&
                      Object.keys(reservasPorBloque).length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">
                            📊 Resumen del día
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-blue-600 font-medium">
                                Bloques activos:
                              </span>
                              <div className="text-blue-900 font-bold">
                                {Object.keys(reservasPorBloque).length}
                              </div>
                            </div>
                            <div>
                              <span className="text-blue-600 font-medium">
                                Total reservas:
                              </span>
                              <div className="text-blue-900 font-bold">
                                {Object.values(reservasPorBloque).flat().length}
                              </div>
                            </div>
                            <div>
                              <span className="text-blue-600 font-medium">
                                Ya presentes:
                              </span>
                              <div className="text-blue-900 font-bold">
                                {
                                  Object.values(reservasPorBloque)
                                    .flat()
                                    .filter((r) => r.asistio).length
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-blue-600 font-medium">
                                % Asistencia:
                              </span>
                              <div className="text-blue-900 font-bold">
                                {Object.values(reservasPorBloque).flat()
                                  .length > 0
                                  ? Math.round(
                                      (Object.values(reservasPorBloque)
                                        .flat()
                                        .filter((r) => r.asistio).length /
                                        Object.values(reservasPorBloque).flat()
                                          .length) *
                                        100
                                    )
                                  : 0}
                                %
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {activeTab === "estadisticas" && (
                  <div className="space-y-6">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="flex space-x-4 mb-4">
                        {[
                          {
                            id: "general",
                            label: "📊 General",
                            desc: "Vista global del gimnasio",
                          },
                          {
                            id: "alumno",
                            label: "👤 Por Alumno",
                            desc: "Estadísticas individuales",
                          },
                          {
                            id: "bloque",
                            label: "🕐 Por Bloque",
                            desc: "Análisis de horarios",
                          },
                        ].map((tipo) => (
                          <button
                            key={tipo.id}
                            onClick={() => setTipoEstadistica(tipo.id)}
                            className={`flex-1 p-3 rounded-lg text-left transition-colors ${
                              tipoEstadistica === tipo.id
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className="font-medium">{tipo.label}</div>
                            <div className="text-xs opacity-75">
                              {tipo.desc}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha inicio
                          </label>
                          <input
                            type="date"
                            value={fechaInicio || ""}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha fin
                          </label>
                          <input
                            type="date"
                            value={fechaFin || ""}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          {tipoEstadistica === "alumno" && (
                            <>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email del alumno
                              </label>
                              <input
                                type="email"
                                placeholder="alumno@usm.cl"
                                value={emailAlumno || ""}
                                onChange={(e) => setEmailAlumno(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </>
                          )}

                          {tipoEstadistica === "bloque" && (
                            <>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bloque horario
                              </label>
                              <select
                                value={bloqueSeleccionado || ""}
                                onChange={(e) =>
                                  setBloqueSeleccionado(e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">Seleccionar bloque</option>
                                {Object.keys(cupos).map((b) => (
                                  <option key={b} value={b}>
                                    Bloque {b}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}

                          {tipoEstadistica === "general" && (
                            <div className="flex items-end">
                              <button
                                onClick={() => cargarEstadisticas()}
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                              >
                                📈 Cargar estadísticas
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {tipoEstadistica !== "general" && (
                        <div className="mt-4 flex space-x-2">
                          <button
                            onClick={() => {
                              if (tipoEstadistica === "alumno") {
                                cargarEstadisticasAlumno();
                              } else {
                                cargarEstadisticasBloque();
                              }
                            }}
                            disabled={
                              (tipoEstadistica === "alumno" && !emailAlumno) ||
                              (tipoEstadistica === "bloque" &&
                                !bloqueSeleccionado)
                            }
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                          >
                            {tipoEstadistica === "alumno"
                              ? "👤 Analizar Alumno"
                              : "🕐 Analizar Bloque"}
                          </button>

                          <button
                            onClick={() => {
                              setEstadisticasAlumno({});
                              setEstadisticasBloque({});
                            }}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                          >
                            🗑️ Limpiar
                          </button>
                        </div>
                      )}
                    </div>

                    {loading ? (
                      <div className="text-center py-8 bg-white rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                        <p className="text-gray-500">Cargando...</p>
                      </div>
                    ) : (
                      <>
                        {tipoEstadistica === "general" &&
                          estadisticas &&
                          Object.keys(estadisticas).length > 0 && (
                            <div className="space-y-6">
                              {estadisticas.resumen && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-blue-600 font-medium">
                                      Alumnos activos
                                    </p>
                                    <p className="text-2xl font-bold text-blue-900">
                                      {estadisticas.resumen
                                        .total_alumnos_activos || 0}
                                    </p>
                                  </div>
                                  <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-sm text-green-600 font-medium">
                                      Total reservas
                                    </p>
                                    <p className="text-2xl font-bold text-green-900">
                                      {estadisticas.resumen.total_reservas || 0}
                                    </p>
                                  </div>
                                  <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-sm text-purple-600 font-medium">
                                      Asistencias
                                    </p>
                                    <p className="text-2xl font-bold text-purple-900">
                                      {estadisticas.resumen.total_asistencias ||
                                        0}
                                    </p>
                                  </div>
                                  <div className="bg-orange-50 p-4 rounded-lg">
                                    <p className="text-sm text-orange-600 font-medium">
                                      % Asistencia
                                    </p>
                                    <p className="text-2xl font-bold text-orange-900">
                                      {estadisticas.resumen
                                        .porcentaje_asistencia_general || 0}
                                      %
                                    </p>
                                  </div>
                                </div>
                              )}

                              {estadisticas.estadisticasBloques &&
                                estadisticas.estadisticasBloques.length > 0 && (
                                  <div className="bg-white border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b">
                                      <h3 className="text-lg font-medium text-gray-900">
                                        Estadísticas por bloque
                                      </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Bloque
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Reservas
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Asistencias
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              % Asistencia
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {estadisticas.estadisticasBloques.map(
                                            (bloque) => (
                                              <tr key={bloque.bloque_horario}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                  {bloque.bloque_horario}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {bloque.total_reservas}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {bloque.total_asistencias}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {bloque.porcentaje_asistencia}
                                                  %
                                                </td>
                                              </tr>
                                            )
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                              {estadisticas.estadisticasAlumnos &&
                                estadisticas.estadisticasAlumnos.length > 0 && (
                                  <div className="bg-white border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b">
                                      <h3 className="text-lg font-medium text-gray-900">
                                        Top 10 alumnos más activos
                                      </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Alumno
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Email
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Reservas
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Asistencias
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              % Asistencia
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {estadisticas.estadisticasAlumnos
                                            .slice(0, 10)
                                            .map((alumno) => (
                                              <tr key={alumno.email}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                  {alumno.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {alumno.email}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {alumno.total_reservas}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {alumno.total_asistencias ||
                                                    0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {alumno.porcentaje_asistencia ||
                                                    0}
                                                  %
                                                </td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                        {tipoEstadistica === "alumno" &&
                          estadisticasAlumno &&
                          Object.keys(estadisticasAlumno).length > 0 && (
                            <div className="space-y-6">
                              <div className="bg-white border rounded-lg p-6">
                                <div className="flex items-center space-x-4">
                                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <span className="text-2xl font-bold text-indigo-600">
                                      {estadisticasAlumno.alumno?.name?.charAt(
                                        0
                                      ) || "?"}
                                    </span>
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                      {estadisticasAlumno.alumno?.name}
                                    </h3>
                                    <p className="text-gray-600">
                                      {estadisticasAlumno.alumno?.email}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {estadisticasAlumno.estadisticasGenerales && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-blue-600 font-medium">
                                      Total reservas
                                    </p>
                                    <p className="text-2xl font-bold text-blue-900">
                                      {
                                        estadisticasAlumno.estadisticasGenerales
                                          .total_reservas
                                      }
                                    </p>
                                    <p className="text-xs text-blue-600">
                                      En{" "}
                                      {
                                        estadisticasAlumno.estadisticasGenerales
                                          .dias_activos
                                      }{" "}
                                      días
                                    </p>
                                  </div>
                                  <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-sm text-green-600 font-medium">
                                      Asistencias
                                    </p>
                                    <p className="text-2xl font-bold text-green-900">
                                      {
                                        estadisticasAlumno.estadisticasGenerales
                                          .total_asistencias
                                      }
                                    </p>
                                    <p className="text-xs text-green-600">
                                      {
                                        estadisticasAlumno.estadisticasGenerales
                                          .porcentaje_asistencia
                                      }
                                      % de asistencia
                                    </p>
                                  </div>
                                  <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-sm text-purple-600 font-medium">
                                      vs Promedio
                                    </p>
                                    <p className="text-2xl font-bold text-purple-900">
                                      {estadisticasAlumno.promedioGeneral
                                        ? (
                                            estadisticasAlumno
                                              .estadisticasGenerales
                                              .porcentaje_asistencia -
                                            estadisticasAlumno.promedioGeneral
                                          ).toFixed(1)
                                        : "N/A"}
                                      %
                                    </p>
                                    <p className="text-xs text-purple-600">
                                      {estadisticasAlumno.estadisticasGenerales
                                        .porcentaje_asistencia >
                                      estadisticasAlumno.promedioGeneral
                                        ? "Mejor"
                                        : "Peor"}{" "}
                                      que el promedio
                                    </p>
                                  </div>
                                </div>
                              )}

                              {estadisticasAlumno.reservasPorBloque &&
                                estadisticasAlumno.reservasPorBloque.length >
                                  0 && (
                                  <div className="bg-white border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3">
                                      📊 Reservas por bloque horario
                                    </h4>
                                    <div className="space-y-2">
                                      {estadisticasAlumno.reservasPorBloque.map(
                                        (bloque, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                          >
                                            <span className="font-medium">
                                              Bloque {bloque.bloque_horario}
                                            </span>
                                            <div className="text-sm text-gray-600">
                                              {bloque.total_reservas} reservas •{" "}
                                              {bloque.asistencias} asistencias •{" "}
                                              {bloque.porcentaje_asistencia}%
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {estadisticasAlumno.diasFaltados &&
                                estadisticasAlumno.diasFaltados.length > 0 && (
                                  <div className="bg-white border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3">
                                      ❌ Días en que faltó (
                                      {estadisticasAlumno.diasFaltados.length})
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {estadisticasAlumno.diasFaltados.map(
                                        (falta, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between text-sm"
                                          >
                                            <span>
                                              {new Date(
                                                falta.fecha
                                              ).toLocaleDateString()}
                                            </span>
                                            <span className="text-gray-600">
                                              Bloque {falta.bloque_horario}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                        {tipoEstadistica === "bloque" &&
                          estadisticasBloque &&
                          Object.keys(estadisticasBloque).length > 0 && (
                            <div className="space-y-6">
                              <div className="bg-white border rounded-lg p-6">
                                <h3 className="text-xl font-bold text-gray-900">
                                  🕐 Análisis del Bloque{" "}
                                  {estadisticasBloque.bloque}
                                </h3>
                              </div>

                              {estadisticasBloque.estadisticasGenerales && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-blue-600 font-medium">
                                      Total reservas
                                    </p>
                                    <p className="text-2xl font-bold text-blue-900">
                                      {
                                        estadisticasBloque.estadisticasGenerales
                                          .total_reservas
                                      }
                                    </p>
                                  </div>
                                  <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-sm text-green-600 font-medium">
                                      Alumnos únicos
                                    </p>
                                    <p className="text-2xl font-bold text-green-900">
                                      {
                                        estadisticasBloque.estadisticasGenerales
                                          .alumnos_unicos
                                      }
                                    </p>
                                  </div>
                                  <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-sm text-purple-600 font-medium">
                                      % Asistencia
                                    </p>
                                    <p className="text-2xl font-bold text-purple-900">
                                      {
                                        estadisticasBloque.estadisticasGenerales
                                          .porcentaje_asistencia
                                      }
                                      %
                                    </p>
                                  </div>
                                  <div className="bg-orange-50 p-4 rounded-lg">
                                    <p className="text-sm text-orange-600 font-medium">
                                      Promedio/día
                                    </p>
                                    <p className="text-2xl font-bold text-orange-900">
                                      {
                                        estadisticasBloque.estadisticasGenerales
                                          .promedio_reservas_por_dia
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}

                              {estadisticasBloque.datosPorDia &&
                                estadisticasBloque.datosPorDia.length > 0 && (
                                  <div className="bg-white border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3">
                                      📊 Reservas por día (últimos 30 días)
                                    </h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {estadisticasBloque.datosPorDia.map(
                                        (dia, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-center space-x-3"
                                          >
                                            <div className="w-20 text-xs text-gray-600">
                                              {new Date(
                                                dia.fecha
                                              ).toLocaleDateString()}
                                            </div>
                                            <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                                              <div
                                                className="bg-indigo-600 h-4 rounded-full flex items-center justify-end pr-2"
                                                style={{
                                                  width: `${Math.max(
                                                    (dia.reservas / 20) * 100,
                                                    5
                                                  )}%`,
                                                }}
                                              >
                                                <span className="text-white text-xs">
                                                  {dia.reservas}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="w-12 text-xs text-gray-600">
                                              {dia.porcentaje_asistencia}%
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {estadisticasBloque.alumnosFrecuentes &&
                                estadisticasBloque.alumnosFrecuentes.length >
                                  0 && (
                                  <div className="bg-white border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3">
                                      👥 Alumnos más frecuentes en este bloque
                                    </h4>
                                    <div className="space-y-2">
                                      {estadisticasBloque.alumnosFrecuentes
                                        .slice(0, 5)
                                        .map((alumno, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                          >
                                            <div>
                                              <span className="font-medium">
                                                {alumno.name}
                                              </span>
                                              <span className="text-sm text-gray-600 ml-2">
                                                {alumno.email}
                                              </span>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                              {alumno.veces_reservado} veces •{" "}
                                              {alumno.porcentaje_asistencia}%
                                              asistencia
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                        {tipoEstadistica === "general" &&
                          (!estadisticas ||
                            Object.keys(estadisticas).length === 0) && (
                            <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
                              Selecciona un rango de fechas y presiona "Cargar
                              estadísticas" para ver los datos generales.
                            </div>
                          )}

                        {tipoEstadistica === "alumno" &&
                          (!estadisticasAlumno ||
                            Object.keys(estadisticasAlumno).length === 0) && (
                            <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
                              Ingresa el email de un alumno y presiona "Analizar
                              Alumno" para ver sus estadísticas.
                            </div>
                          )}

                        {tipoEstadistica === "bloque" &&
                          (!estadisticasBloque ||
                            Object.keys(estadisticasBloque).length === 0) && (
                            <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
                              Selecciona un bloque y presiona "Analizar Bloque"
                              para ver sus estadísticas.
                            </div>
                          )}
                      </>
                    )}

                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-2xl">📥</span>
                        <h4 className="text-lg font-medium text-gray-900">
                          Exportar Datos Históricos
                        </h4>
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
                            <option value="completo">
                              📊 Reporte Completo
                            </option>
                            <option value="cupos">📅 Solo Cupos</option>
                            <option value="reservas">👥 Solo Reservas</option>
                          </select>
                        </div>

                        <div className="flex flex-col justify-center">
                          <div className="text-xs text-gray-600 space-y-1">
                            {tipoExportacion === "completo" && (
                              <>
                                <div>• Cupos y reservas</div>
                                <div>• Estadísticas de asistencia</div>
                                <div>• Lista de usuarios por bloque</div>
                              </>
                            )}
                            {tipoExportacion === "cupos" && (
                              <>
                                <div>• Total de cupos por día</div>
                                <div>• Cupos reservados/disponibles</div>
                                <div>• Histórico de capacidad</div>
                              </>
                            )}
                            {tipoExportacion === "reservas" && (
                              <>
                                <div>• Reservas individuales</div>
                                <div>• Estado de asistencia</div>
                                <div>• Datos de usuarios</div>
                              </>
                            )}
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
                            <div>
                              <strong>Automático:</strong> Los datos se eliminan
                              automáticamente después de 6 meses
                            </div>
                            <div>
                              <strong>Formato:</strong> CSV compatible con Excel
                              (UTF-8)
                            </div>
                            <div>
                              <strong>Histórico:</strong>{" "}
                              {mesesDisponibles.length} meses disponibles para
                              exportar
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "usuarios" && (
                  <div className="space-y-6">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar usuario
                          </label>
                          <input
                            type="text"
                            placeholder="Nombre o email..."
                            value={busquedaUsuarios}
                            onChange={(e) =>
                              setBusquedaUsuarios(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de usuario
                          </label>
                          <select
                            value={tipoUsuarios}
                            onChange={(e) => setTipoUsuarios(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="todos">Todos los usuarios</option>
                            <option value="alumnos">Solo alumnos</option>
                            <option value="admins">Solo administradores</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={cargarUsuarios}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                          >
                            🔍 Buscar
                          </button>
                        </div>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-8 bg-white rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                        <p className="text-gray-500">Cargando usuarios...</p>
                      </div>
                    ) : usuarios.length > 0 ? (
                      <div className="bg-white border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <h3 className="text-lg font-medium text-gray-900">
                            👥 Usuarios ({usuarios.length})
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {usuarios.map((usuario) => (
                            <div
                              key={usuario.email}
                              className="px-4 py-4 hover:bg-gray-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                                      usuario.is_admin === 1
                                        ? "bg-purple-500"
                                        : "bg-blue-500"
                                    }`}
                                  >
                                    {usuario.name.charAt(0).toUpperCase()}
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="text-sm font-medium text-gray-900">
                                        {usuario.name}
                                      </h4>
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          usuario.is_admin === 1
                                            ? "bg-purple-100 text-purple-800"
                                            : "bg-blue-100 text-blue-800"
                                        }`}
                                      >
                                        {usuario.is_admin === 1
                                          ? "👑 Admin"
                                          : "👤 Alumno"}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      {usuario.email}
                                    </p>
                                    <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                                      <span>
                                        📅 {usuario.total_reservas} reservas
                                      </span>
                                      <span>
                                        ✅ {usuario.total_asistencias}{" "}
                                        asistencias
                                      </span>
                                      {usuario.total_reservas > 0 && (
                                        <span>
                                          📊{" "}
                                          {Math.round(
                                            (usuario.total_asistencias /
                                              usuario.total_reservas) *
                                              100
                                          )}
                                          % asistencia
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => abrirEditarUsuario(usuario)}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    onClick={() =>
                                      eliminarUsuario(
                                        usuario.email,
                                        usuario.name
                                      )
                                    }
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-lg">
                        <div className="text-6xl mb-4">👤</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No se encontraron usuarios
                        </h3>
                        <p className="text-gray-500">
                          Ajusta los filtros de búsqueda para encontrar
                          usuarios.
                        </p>
                      </div>
                    )}

                    {modalUsuario && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            ✏️ Editar Usuario
                          </h3>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre
                              </label>
                              <input
                                type="text"
                                value={formUsuario.name}
                                onChange={(e) =>
                                  setFormUsuario({
                                    ...formUsuario,
                                    name: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                              </label>
                              <input
                                type="email"
                                value={formUsuario.newEmail}
                                onChange={(e) =>
                                  setFormUsuario({
                                    ...formUsuario,
                                    newEmail: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nueva contraseña (dejar vacío para no cambiar)
                              </label>
                              <input
                                type="password"
                                value={formUsuario.password}
                                onChange={(e) =>
                                  setFormUsuario({
                                    ...formUsuario,
                                    password: e.target.value,
                                  })
                                }
                                placeholder="Nueva contraseña..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formUsuario.isAdmin}
                                onChange={(e) =>
                                  setFormUsuario({
                                    ...formUsuario,
                                    isAdmin: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label className="ml-2 block text-sm text-gray-700">
                                👑 Es administrador
                              </label>
                            </div>
                          </div>

                          <div className="flex space-x-3 mt-6">
                            <button
                              onClick={() => {
                                setModalUsuario(false);
                                setUsuarioEditando(null);
                              }}
                              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={guardarUsuario}
                              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                            >
                              💾 Guardar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

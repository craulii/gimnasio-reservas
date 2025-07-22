"use client";
import { useState } from "react";

export default function Home() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [bloque, setBloque] = useState("1-2");
  const [cupos, setCupos] = useState({ "1-2": 10, "3-4": 10, "5-6": 10 });
  const [asistenciaUser, setAsistenciaUser] = useState("");
  const [asistenciaBloque, setAsistenciaBloque] = useState("1-2");
  const [asistenciaPresente, setAsistenciaPresente] = useState(true);

  // Genera header Authorization Basic
  function authHeader() {
    if (!user) return {};
    const token = btoa(`${user.username}:${user.password}`);
    return { Authorization: `Basic ${token}` };
  }

  async function login() {
    setMessage("...");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser({ username, password, role: data.role });
      setMessage(`Login exitoso como ${data.role}`);
      fetchCupos();
    } else {
      setMessage(data.message || "Error en login");
    }
  }

  async function fetchCupos() {
    // Simulación, idealmente desde backend
    setCupos({ "1-2": 10, "3-4": 10, "5-6": 10 });
  }

  async function hacerReserva() {
    setMessage("Reservando...");
    const res = await fetch("/api/reservas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify({ bloque }),
    });
    const text = await res.text();
    setMessage(text);
  }

  async function modificarCupos(cantidad) {
    setMessage("Modificando cupos...");
    const res = await fetch("/api/cupos", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify({ bloque, cantidad }),
    });
    const data = await res.json();
    if (res.ok) setCupos(data.cupos);
    setMessage(data.message || "Error modificando cupos");
  }

  async function marcarAsistencia() {
    setMessage("Marcando asistencia...");
    const res = await fetch("/api/asistencia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify({
        username: asistenciaUser,
        bloque: asistenciaBloque,
        presente: asistenciaPresente,
      }),
    });
    const data = await res.json();
    setMessage(data.message || "Error marcando asistencia");
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial" }}>
      {!user ? (
        <>
          <h1>Login</h1>
          <input
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <br />
          <input
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />
          <button onClick={login}>Entrar</button>
          <p>{message}</p>
        </>
      ) : (
        <>
          <h1>
            Bienvenido, {user.username} ({user.role})
          </h1>
          <button
            onClick={() => {
              setUser(null);
              setMessage("Sesión cerrada");
            }}
          >
            Cerrar sesión
          </button>
          <hr />

          {user.role === "alumno" && (
            <>
              <h2>Reservar cupo</h2>
              <select onChange={(e) => setBloque(e.target.value)} value={bloque}>
                {Object.keys(cupos).map((b) => (
                  <option key={b} value={b}>
                    {b} (Cupos: {cupos[b]})
                  </option>
                ))}
              </select>
              <button onClick={hacerReserva}>Reservar</button>
            </>
          )}

          {user.role === "admin" && (
            <>
              <h2>Modificar cupos</h2>
              <select onChange={(e) => setBloque(e.target.value)} value={bloque}>
                {Object.keys(cupos).map((b) => (
                  <option key={b} value={b}>
                    {b} (Cupos: {cupos[b]})
                  </option>
                ))}
              </select>
              <button onClick={() => modificarCupos(1)}>Sumar 1 cupo</button>
              <button onClick={() => modificarCupos(-1)}>Restar 1 cupo</button>

              <h2>Marcar asistencia</h2>
              <input
                placeholder="Usuario a marcar"
                value={asistenciaUser}
                onChange={(e) => setAsistenciaUser(e.target.value)}
              />
              <select
                onChange={(e) => setAsistenciaBloque(e.target.value)}
                value={asistenciaBloque}
              >
                {Object.keys(cupos).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={asistenciaPresente}
                  onChange={(e) => setAsistenciaPresente(e.target.checked)}
                />
                Presente
              </label>
              <button onClick={marcarAsistencia}>Marcar</button>
            </>
          )}

          <p>{message}</p>
        </>
      )}
    </main>
  );
}

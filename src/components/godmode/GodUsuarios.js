"use client";
import { useState, useEffect } from "react";
import ApiService from "@/services/api";
import GodModalUsuario from "./GodModalUsuario";

export default function GodUsuarios({ setMessage }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    cargarUsuarios();
  }, [busqueda, tipo]);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getUsuarios(tipo, busqueda);
      if (ok) {
        setUsuarios(Array.isArray(data) ? data : (data?.usuarios || []));
      } else {
        setMessage("Error cargando usuarios");
        setUsuarios([]);
      }
    } catch {
      setMessage("Error de conexion al cargar usuarios");
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const eliminarUsuario = async (email, nombre) => {
    if (!confirm(`Eliminar a ${nombre} (${email})?\n\nEsto tambien eliminara todas sus reservas.`)) return;
    try {
      const { ok, data } = await ApiService.deleteUsuario(email);
      if (ok) {
        setMessage(data?.message || "Usuario eliminado");
        await cargarUsuarios();
      } else {
        setMessage(String(data?.error || data?.message || "Error al eliminar"));
      }
    } catch {
      setMessage("Error de conexion al eliminar");
    }
  };

  const desbanearUsuario = async (email, nombre) => {
    if (!confirm(`Quitar baneo y restaurar a ${nombre}?`)) return;
    try {
      const { ok } = await ApiService.desbanearUsuario(email);
      if (ok) {
        setMessage("Usuario desbaneado y faltas reiniciadas");
        await cargarUsuarios();
      } else {
        setMessage("Error al desbanear usuario");
      }
    } catch {
      setMessage("Error de conexion");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="alumnos">Alumnos</option>
              <option value="admins">Admins</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={cargarUsuarios}
              className="w-full px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg font-mono text-sm hover:bg-cyan-500/30 transition-colors"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm font-mono">Cargando usuarios...</p>
        </div>
      ) : usuarios.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider">
              Usuarios <span className="text-slate-600">({usuarios.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {usuarios.map((u) => (
              <div key={u.email} className="px-4 py-3 hover:bg-slate-800/40 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                      u.is_admin === 1 ? "bg-cyan-500/30 text-cyan-400 border border-cyan-500/40" : "bg-violet-500/30 text-violet-400 border border-violet-500/40"
                    }`}>
                      {u.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white font-medium truncate">{u.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          u.is_admin === 1
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-violet-500/20 text-violet-400"
                        }`}>
                          {u.is_admin === 1 ? "ADMIN" : "ALUMNO"}
                        </span>
                        {u.baneado === 1 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            BANNED
                          </span>
                        )}
                        {u.faltas > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            {u.faltas} falta{u.faltas > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono truncate">{u.email}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-0.5">
                        <span>Rol: {u.rol || "N/A"}</span>
                        <span>{u.total_reservas || 0} res</span>
                        <span>{u.total_asistencias || 0} asis</span>
                        {u.total_reservas > 0 && (
                          <span className={
                            (u.total_asistencias / u.total_reservas) < 0.5
                              ? "text-red-400 font-bold"
                              : "text-emerald-400"
                          }>
                            ({Math.round((u.total_asistencias / u.total_reservas) * 100)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {u.baneado === 1 && (
                      <button
                        onClick={() => desbanearUsuario(u.email, u.name)}
                        className="px-2.5 py-1 text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors"
                      >
                        Restaurar
                      </button>
                    )}
                    <button
                      onClick={() => { setUsuarioEditando(u); setModalOpen(true); }}
                      className="px-2.5 py-1 text-xs font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarUsuario(u.email, u.name)}
                      className="px-2.5 py-1 text-xs font-mono bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-500 font-mono text-sm">No se encontraron usuarios</p>
          <p className="text-slate-600 text-xs mt-1">Ajusta los filtros de busqueda</p>
        </div>
      )}

      {modalOpen && (
        <GodModalUsuario
          usuario={usuarioEditando}
          onClose={() => { setModalOpen(false); setUsuarioEditando(null); }}
          onSave={() => { cargarUsuarios(); setModalOpen(false); setUsuarioEditando(null); }}
          setMessage={setMessage}
        />
      )}
    </div>
  );
}

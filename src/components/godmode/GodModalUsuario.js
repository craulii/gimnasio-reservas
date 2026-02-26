"use client";
import { useState, useEffect } from "react";
import ApiService from "@/services/api";

export default function GodModalUsuario({ usuario, onClose, onSave, setMessage }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    newEmail: "",
    password: "",
    isAdmin: false,
    rut: "",
    rol: "",
    faltas: 0,
    baneado: false,
  });

  useEffect(() => {
    if (usuario) {
      setForm({
        name: usuario.name,
        email: usuario.email,
        newEmail: usuario.email,
        password: "",
        isAdmin: usuario.is_admin === 1,
        rut: usuario.rut || "",
        rol: usuario.rol || "",
        faltas: usuario.faltas || 0,
        baneado: usuario.baneado === 1,
      });
    }
  }, [usuario]);

  const guardar = async () => {
    try {
      const { ok, data } = await ApiService.updateUsuario(usuario.email, form);
      if (ok) {
        setMessage(data?.message || "Usuario actualizado");
        onSave();
      } else {
        setMessage(String(data?.error || data?.message || "Error al actualizar"));
      }
    } catch {
      setMessage("Error de conexion al guardar");
    }
  };

  const inputCls = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm";
  const labelCls = "block text-xs font-mono text-slate-500 uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
          <h3 className="text-white font-mono font-bold text-sm uppercase tracking-wider">Editar Usuario</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={form.newEmail}
              onChange={(e) => setForm({ ...form, newEmail: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Nueva password (vacio = sin cambio)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Nueva password..."
              className={inputCls}
            />
          </div>

          <div className={`flex items-center p-3 rounded-lg border ${form.isAdmin ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-800 border-slate-700'}`}>
            <input
              type="checkbox"
              id="godIsAdmin"
              checked={form.isAdmin}
              onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="godIsAdmin" className="ml-2 text-sm text-slate-300 cursor-pointer">
              Permisos de Administrador
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>RUT</label>
              <input
                type="text"
                value={form.rut}
                onChange={(e) => setForm({ ...form, rut: e.target.value })}
                placeholder="12.345.678-9"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Rol Institucional</label>
              <input
                type="text"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                placeholder="Alumno, Func..."
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Faltas</label>
            <input
              type="number"
              min="0"
              value={form.faltas}
              onChange={(e) => setForm({ ...form, faltas: parseInt(e.target.value) || 0 })}
              className={inputCls}
            />
            <p className="text-[10px] text-slate-600 font-mono mt-1">3 faltas = baneo automatico</p>
          </div>

          <div className={`flex items-center p-3 rounded-lg border ${form.baneado ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800 border-slate-700'}`}>
            <input
              type="checkbox"
              id="godBaneado"
              checked={form.baneado}
              onChange={(e) => setForm({ ...form, baneado: e.target.checked })}
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500"
            />
            <label htmlFor="godBaneado" className={`ml-2 text-sm cursor-pointer ${form.baneado ? 'text-red-400' : 'text-slate-300'}`}>
              Usuario Baneado
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 font-mono text-sm rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            className="flex-1 px-4 py-2 bg-cyan-500/20 text-cyan-400 font-mono text-sm rounded-lg hover:bg-cyan-500/30 border border-cyan-500/40 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

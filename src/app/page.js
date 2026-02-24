"use client";
import { useState, useEffect } from "react";
import ApiService from "@/services/api";

import LoginPage from "@/components/pages/LoginPage";
import DashboardAdmin from "@/components/pages/DashboardAdmin";
import DashboardAlumno from "@/components/pages/DashboardAlumno";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { ok, data } = await ApiService.checkAuth();
        
        // 🛡️ FILTRO DE SEGURIDAD: 
        // Solo si la API confirma explícitamente la autenticación
        if (ok && data && data.authenticated === true && data.user) {
          setUser(data.user);
        } else {
          setUser(null); // Aseguramos que sea null si no hay sesión
        }
      } catch (error) {
        console.error("Error verificando sesión:", error);
        setUser(null);
      } finally {
        // Importante: No dejar de cargar hasta tener la respuesta clara
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      
      // Llamar al API para borrar la cookie del servidor
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error logout: ${response.status}`);
      }

      // Limpiar estado local
      setUser(null);
      setMessage("Sesión cerrada correctamente");

      // Redirigir al login
      setTimeout(() => {
        window.location.href = "/";
      }, 300);

    } catch (error) {
      console.error("Error en logout:", error);
      setMessage(`Error al cerrar sesión: ${error.message}`);
      setLoading(false);
    }
  };

  // 1. ESTADO DE CARGA: Mientras verificamos, no mostramos NADA más.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-800 mb-4"></div>
          <div className="text-xl font-bold text-stone-800 animate-pulse">
            Verificando acceso...
          </div>
        </div>
      </div>
    );
  }

  // 2. PARED DE SEGURIDAD: Si no hay usuario validado, mostramos LOGIN.
  // Esto evita que el renderizado "caiga" por error en los Dashboards inferiores.
  if (!user || Object.keys(user).length === 0) {
    return (
      <LoginPage 
        setUser={setUser} 
        message={message} 
        setMessage={setMessage} 
      />
    );
  }

  // 3. RUTA ADMIN
  if (user.role_type === 'admin') {
    return (
      <DashboardAdmin 
        user={user} 
        message={message} 
        setMessage={setMessage} 
        onLogout={handleLogout} 
      />
    );
  }

  // 4. RUTA ALUMNO (Última opción, solo accesible si está logueado y no es admin)
  return (
    <DashboardAlumno 
      user={user} 
      message={message} 
      setMessage={setMessage} 
      onLogout={handleLogout} 
    />
  );
}
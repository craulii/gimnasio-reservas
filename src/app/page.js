"use client";
import { useState } from "react";
import LoginPage from "./components/pages/LoginPage";
import DashboardAlumno from "./components/pages/DashboardAlumno";
import DashboardAdmin from "./components/pages/DashboardAdmin";

export default function Home() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");

  const handleLogout = () => {
    console.log("[logout] Cerrando sesión de usuario:", user?.name);
    setUser(null);
    setMessage("Sesión cerrada con éxito");
  };

  if (!user) {
    return (
      <LoginPage 
        setUser={setUser}
        message={message}
        setMessage={setMessage}
      />
    );
  }

  if (user.is_admin === 1) {
    return (
      <DashboardAdmin
        user={user}
        message={message}
        setMessage={setMessage}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <DashboardAlumno
      user={user}
      message={message}
      setMessage={setMessage}
      onLogout={handleLogout}
    />
  );
}
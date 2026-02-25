"use client";
import { useState } from "react";
// Asegúrate de que las rutas sean correctas según tu estructura
import LoginForm from "@/components/auth/LoginForm"; 
import RegisterForm from "@/components/auth/RegisterForm";

export default function LoginPage({ setUser, message, setMessage }) {
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-100 bg-[url('/gym-bg.jpg')] bg-cover bg-center">
      <div className="w-full max-w-md bg-stone-400/90 bg-opacity-90 rounded-xl shadow-2xl border-2 border-yellow-800 p-8 transition-all duration-500">
        <div className="space-y-6">
          
          {/* Logo y Título */}
          <div className="text-center">
            {/* Si usas Next.js, idealmente usa <Image /> aquí, pero img funciona bien */}
            <img src="/usm.png" alt="USM" className="mx-auto h-24 w-auto mb-4 drop-shadow-md" />
            <h1 className="mt-2 text-3xl font-extrabold text-white drop-shadow-sm">
              Sistema de Reservas GYM USM
            </h1>
            <p className="mt-1 text-sm font-bold text-yellow-900">
              ¡Potencia tu entrenamiento con Defider!
            </p>
          </div>

          {/* Selector Login / Registro */}
          <div className="flex rounded-lg bg-gray-200 p-1 shadow-inner">
            <button
              onClick={() => {
                setIsRegistering(false);
                setMessage("");
              }}
              className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-all duration-200 ${
                !isRegistering
                  ? "bg-white text-gray-900 shadow-md transform scale-105"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setIsRegistering(true);
                setMessage("");
              }}
              className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-all duration-200 ${
                isRegistering
                  ? "bg-white text-gray-900 shadow-md transform scale-105"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Formularios */}
          <div className="transition-opacity duration-300">
            {!isRegistering ? (
              <LoginForm setUser={setUser} setMessage={setMessage} />
            ) : (
              <RegisterForm 
                setMessage={setMessage} 
                setIsRegistering={setIsRegistering}
              />
            )}
          </div>

          {/* Mensajes de Alerta Mejorados */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-center text-sm font-medium border animate-pulse ${
              message.includes("✅") || message.includes("Bienvenido") || message.includes("exito")
                ? "bg-green-100 text-green-800 border-green-300" 
                : "bg-red-100 text-red-800 border-red-300"
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
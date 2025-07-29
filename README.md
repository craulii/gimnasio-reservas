# Gimnasio USM – Cupos Diarios y Gestión de Reservas

Este es un sistema de gestión de reservas de cupos diarios para el gimnasio de la Universidad Técnica Federico Santa María (UTFSM). El sistema permite a estudiantes registrarse, reservar bloques horarios de uso del gimnasio, y al profesor (administrador) gestionar cupos, asistencia y estadísticas.  
Actualmente, el proyecto cuenta con una implementación funcional del **backend** usando **Next.js API Routes (App Router)**, y se encuentra en etapa de desarrollo de base de datos y frontend.

---

## Funcionalidades actuales (Backend)

- **Autenticación básica** de usuarios (login con nombre de usuario).
- **Reserva de cupos** por bloque horario (evita duplicadas).
- **Gestión de cupos** por parte del administrador (aumentar/disminuir cupos).
- **Control de asistencia** por parte del administrador.
- **Protección de rutas** según tipo de usuario (`admin` o `alumno`).
- **Datos en memoria** (aún sin base de datos).

---

## Tecnologías usadas

- [Next.js 14](https://nextjs.org/) (App Router)
- Node.js
- JavaScript (ES6)
- Arquitectura modular para rutas (`/api`)
- Middleware para autenticación

---

## Pendientes

- Registro de usuarios
- Envío de correos automáticos (20 minutos antes de la reserva)
- Interfaz web completa (frontend con Next.js + Tailwind)
- Panel de administración con estadísticas

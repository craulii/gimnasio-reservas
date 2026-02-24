# Gimnasio USM - Sistema de Reservas

Sistema web de reservas de cupos diarios para el gimnasio de la Universidad Tecnica Federico Santa Maria (UTFSM). Los alumnos reservan bloques horarios y los administradores gestionan asistencia, cupos y estadisticas.

**Sedes:** Vitacura y San Joaquin

## Stack

- **Frontend:** Next.js 16 (App Router) + React 18 + Tailwind CSS 4
- **Backend:** Next.js API Routes (20 endpoints)
- **Base de datos:** MySQL (mysql2/promise, connection pool)
- **Auth:** Cookies httpOnly + middleware con roles (admin/alumno)
- **Hosting:** ninjahost.cl (standalone build)

## Estructura del proyecto

```
src/
  app/
    api/
      login/             POST - Login con bcrypt + rate limiting
      register/          POST - Registro con validacion @usm.cl
      logout/            POST - Cierre de sesion
      auth/check/        GET  - Verificar sesion activa
      reservas/          GET/POST/DELETE - CRUD reservas alumno
      cupos/             GET  - Cupos disponibles (publico)
      asistencia/        GET  - Asistencia del alumno
      test/              GET  - Health check de BD
      users/             GET  - Listar usuarios
      admin/
        usuarios/        GET/POST/PUT/DELETE - CRUD usuarios
        reservas-por-bloque/  GET - Reservas agrupadas por bloque y sede
        asistencia-masiva/    GET/POST - Carga y guardado de asistencia
        procesar-ausencias/   POST - Marcar ausencias automaticamente
        cancelar-reserva/     DELETE - Admin cancela reserva
        boton-panico/         POST - Reset total de cupos del dia
        mantenimiento/        POST - Generar cupos diarios + limpieza
        estadisticas/         GET - Stats generales
        estadisticas-bloque/  GET - Stats por bloque horario
        estadisticas-alumno/  GET - Stats por alumno
        exportar/             GET/POST - Exportar datos a Excel
    page.js              Dashboard principal (admin o alumno)
    utils/constants.js   Constantes centralizadas
  components/
    auth/
      LoginForm.js       Formulario de login
      RegisterForm.js    Formulario de registro
    alumno/
      ReservarCupo.js    Selector de sede + bloques + reservar/cancelar
    admin/
      GestionTab.js      Gestion de asistencia por bloque
      ReservasTab.js     Vista de reservas con filtro por sede
      UsuariosTab.js     CRUD de usuarios
      EstadisticasTab.js Graficos y metricas
      BotonPanicoTab.js  Reset de emergencia
      ModalEditarUsuario.js  Modal de edicion
  services/
    api.js               Cliente HTTP centralizado (fetch + cookies)
  lib/
    db.js                Pool MySQL centralizado (env vars)
    rate-limit.js        Rate limiter en memoria (10 req / 15 min)
middleware.js            Auth + inyeccion de headers x-user, x-user-type
```

## Requisitos

- Node.js >= 20
- MySQL 5.7+
- npm

## Instalacion

```bash
git clone https://github.com/craulii/gimnasio-reservas.git
cd gimnasio-reservas
npm install
```

Crear `.env` basado en `.env.example`:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=tu_base_de_datos
```

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## Build para produccion (standalone)

```bash
npm run build
```

El build standalone queda en `.next/standalone/`. Para deployar:

1. Copiar `.next/static` a `.next/standalone/.next/static`
2. Copiar `public/` a `.next/standalone/public/`
3. Copiar `.env` a `.next/standalone/.env`
4. Comprimir y subir al servidor
5. `node server.js` en el servidor

## Tests

El proyecto incluye 328 tests automatizados organizados en 3 suites:

```bash
npm test              # Ejecutar todas las suites
npm run test:security # Tests de seguridad (credenciales, rate limiting, cookies)
npm run test:bugs     # Tests de bug fixes (20 issues verificados)
npm run test:arch     # Tests de arquitectura (transacciones, pool, estructura)
npm run test:watch    # Watch mode - re-ejecuta al detectar cambios
```

Los tests verifican estaticamente el codigo fuente (sin necesidad de BD ni servidor corriendo).

## Seguridad

- Credenciales de BD en variables de entorno (`.env` gitignored)
- Passwords hasheados con bcrypt (cost 12)
- Rate limiting en login y registro (10 intentos / 15 min por IP)
- Cookies httpOnly con sameSite
- Validacion de email @usm.cl en registro y edicion
- Middleware protege rutas admin (verifica role_type)
- Transacciones con `FOR UPDATE` para evitar race conditions en reservas
- Pool de conexiones centralizado (`pool.getConnection()` + `release()`)

## Flujo de uso

### Alumno
1. Registrarse con email @usm.cl
2. Login
3. Seleccionar sede (Vitacura / San Joaquin)
4. Reservar bloque horario disponible
5. Cancelar reserva si es necesario

### Administrador
1. Login con cuenta admin
2. **Gestion:** Cargar alumnos por bloque, marcar asistencia
3. **Reservas:** Ver reservas filtradas por sede
4. **Usuarios:** Crear, editar, eliminar usuarios
5. **Estadisticas:** Graficos de asistencia, uso por bloque, tendencias
6. **Exportar:** Descargar datos en Excel
7. **Mantenimiento:** Generar cupos diarios, limpiar datos antiguos
8. **Boton de panico:** Reset total de cupos del dia

## Base de datos

3 tablas principales:

- **users** - email, name, password (bcrypt), rol (RUT USM), is_admin, faltas, baneado
- **reservas** - email, fecha, bloque_horario, sede, asistio (0=pendiente, 1=presente, 2=ausente)
- **cupos** - bloque, sede, fecha, total, reservados

El sistema de faltas funciona asi:
- 3 faltas = cuenta baneada
- Reset automatico de faltas cada 6 meses
- Al procesar ausencia se libera el cupo para otro alumno

## Changelog

Ver [CHANGELOG.md](CHANGELOG.md) para el detalle de los 20 issues arreglados.

# Gimnasio USM - Sistema de Reservas

Sistema web de reservas de cupos diarios para el gimnasio de la Universidad Tecnica Federico Santa Maria (UTFSM). Los alumnos reservan bloques horarios y los administradores gestionan asistencia, cupos y estadisticas.

**Sedes:** Vitacura y San Joaquin

> **Documentacion completa:** Ver [DOCUMENTACION-TECNICA.md](DOCUMENTACION-TECNICA.md) para arquitectura, endpoints, base de datos, seguridad, deploy y guia practica.

## Stack

- **Frontend:** Next.js 16 (App Router) + React 18 + Tailwind CSS 4
- **Backend:** Next.js API Routes (21 endpoints)
- **Base de datos:** PostgreSQL (Supabase)
- **Auth:** JWT en cookies httpOnly + middleware con roles (admin/alumno)
- **Hosting:** Vercel (deploy automatico desde GitHub)
- **Cron:** Vercel Cron Jobs (mantenimiento diario 4 AM UTC)

## Despliegue

### Vercel + Supabase (produccion)

- **Deploy automatico:** cada `git push` a `vercel-supabase` dispara build en Vercel
- **Base de datos:** PostgreSQL en Supabase (conexion via `DATABASE_URL`)
- **Cron diario:** `0 4 * * *` → GET `/api/admin/mantenimiento` (genera cupos, sincroniza contadores, limpieza semanal)
- **Framework:** Next.js (detectado automaticamente)

### Variables de entorno (Vercel Settings)

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | URL de conexion PostgreSQL (Supabase) |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT |

### Branches

| Branch | Base de datos | Hosting | Estado |
|--------|--------------|---------|--------|
| `vercel-supabase` | PostgreSQL (Supabase) | Vercel | **Produccion activa** |
| `master` | MySQL (ninjahost local) | ninjahost.cl | Legacy (no se usa) |

> **Nota:** El branch `vercel-supabase` usa un wrapper en `src/lib/db.js` que traduce sintaxis MySQL (`?` placeholders) a PostgreSQL (`$1, $2...`) automaticamente. Los route.js usan la misma API que mysql2 pero ejecutan en PostgreSQL.

## Estructura del proyecto

```
src/
  app/
    api/
      login/                POST - Login con bcrypt + JWT + rate limiting
      register/             POST - Registro con validacion @usm.cl + RUT
      logout/               POST - Cierre de sesion
      auth/check/           GET  - Verificar sesion activa
      reservas/             GET/POST/DELETE - Reservas del alumno
      cupos/                GET/PATCH - Cupos disponibles + modificar capacidad
      asistencia/           POST - Marcar asistencia individual
      users/                GET/POST - Listar/crear usuarios
      test/                 GET  - Health check de BD
      admin/
        usuarios/           GET/PUT/PATCH/DELETE - CRUD usuarios avanzado
        reservas-por-bloque/ GET - Reservas agrupadas por bloque y sede
        asistencia-masiva/  GET/POST - Carga y guardado de asistencia masiva
        procesar-ausencias/ POST - Procesar ausencias automaticamente
        cancelar-reserva/   DELETE - Admin cancela reserva de alumno
        reservar-alumno/    POST - Reservar en nombre de un alumno
        generar-cupos/      GET/POST - Generar cupos a futuro
        boton-panico/       GET/POST/PUT - Desactivar/restaurar bloques
        mantenimiento/      GET - Cron diario (publico, whitelisteado)
        monitor/            GET - Dashboard God Mode
        estadisticas/       GET - Stats generales
        estadisticas-bloque/ GET - Stats por bloque horario
        estadisticas-alumno/ GET - Stats por alumno
        exportar/           GET/POST - Exportar datos CSV/Excel
        exportar-completo/  GET - Export JSON completo
    page.js                 Pagina principal (login + redirect God Mode)
    admin/page.js           Dashboard admin
    estudiante/page.js      Dashboard alumno
    utils/constants.js      Constantes centralizadas (bloques, horarios, sedes)
  components/
    auth/                   LoginForm, RegisterForm
    alumno/                 ReservarCupo (selector sede + bloques)
    admin/                  GestionTab, ReservasTab, UsuariosTab,
                            EstadisticasTab, BotonPanicoTab, ModalEditarUsuario
    godmode/                GodCupos, GodUsuarios, GodReservas, GodMiReserva,
                            GodModalUsuario, GodHerramientas
    pages/                  DashboardAdmin, DashboardAlumno, DashboardGodMode, LoginPage
  services/
    api.js                  Cliente HTTP centralizado (fetch + cookies)
  hooks/
    useCupos.js             Hook React para cargar cupos
  lib/
    db.js                   Pool PostgreSQL con wrapper MySQL-compatible
    auth.js                 Helper getUserFromRequest()
    rate-limit.js           Rate limiter en memoria (10 req / 15 min)
    rut.js                  Validacion RUT chileno
    procesar-ausencias.js   Auto-procesamiento de ausencias (compartido)
middleware.js               Auth + inyeccion headers x-user, x-user-type + God Mode
vercel.json                 Cron job de mantenimiento diario
supabase-schema.sql         Schema PostgreSQL completo
```

## Requisitos

- Node.js >= 18
- npm
- Cuenta en Supabase (gratis) para PostgreSQL

## Instalacion

```bash
git clone https://github.com/craulii/gimnasio-reservas.git
cd gimnasio-reservas
git checkout vercel-supabase
npm install
```

Crear `.env.local` en la raiz:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
JWT_SECRET=una-clave-secreta-larga-y-aleatoria
```

Para crear la base de datos, ejecutar `supabase-schema.sql` en el SQL Editor de Supabase.

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## Tests

El proyecto incluye 338 tests automatizados organizados en 3 suites:

```bash
npm test              # Ejecutar todas las suites (338 tests)
npm run test:security # Tests de seguridad (credenciales, rate limiting, cookies)
npm run test:bugs     # Tests de bug fixes (20+ issues verificados)
npm run test:arch     # Tests de arquitectura (transacciones, pool, estructura)
npm run test:watch    # Watch mode - re-ejecuta al detectar cambios
```

Los tests verifican estaticamente el codigo fuente (sin necesidad de BD ni servidor corriendo).

## Seguridad

- Credenciales de BD en variables de entorno (`.env.local` gitignored)
- Passwords hasheados con bcrypt (cost 12)
- JWT en cookies httpOnly, secure, sameSite strict (2h de duracion)
- Rate limiting en login y registro (10 intentos / 15 min por IP)
- Validacion de email @usm.cl en registro y edicion
- Validacion de RUT chileno (digito verificador)
- Middleware protege rutas admin (verifica role_type)
- Transacciones con `FOR UPDATE` para evitar race conditions en reservas
- Prepared statements (prevencion SQL injection)
- Pool de conexiones centralizado (`pool.getConnection()` + `release()`)

## Base de datos

3 tablas principales en PostgreSQL (Supabase):

- **users** — email (unique), name, password (bcrypt), rol, rut (unique), is_admin, faltas, baneado, ultimo_reset_faltas
- **reservas** — email (FK), fecha, bloque_horario, sede, asistio (NULL=pendiente, 1=presente, 0=ausente, 2=auto-procesado)
- **cupos** — bloque, sede, fecha, total, reservados. Constraint UNIQUE(bloque, sede, fecha)

Sistema de faltas:
- 3 faltas = cuenta baneada automaticamente
- Reset automatico de faltas cada 6 meses
- Al procesar ausencia se libera el cupo para otro alumno

## Flujo de uso

### Alumno
1. Registrarse con email @usm.cl y RUT
2. Login
3. Seleccionar sede (Vitacura / San Joaquin)
4. Reservar bloque horario disponible (max 1 por dia)
5. Cancelar reserva si es necesario

### Administrador
1. Login con cuenta admin
2. **Gestion:** Cargar alumnos por bloque, marcar asistencia masiva
3. **Reservas:** Ver reservas filtradas por sede, cancelar reservas
4. **Usuarios:** Crear, editar (nombre, email, RUT, rol, faltas, ban), eliminar
5. **Estadisticas:** Graficos de asistencia, uso por bloque, por alumno, tendencias
6. **Exportar:** Descargar datos en CSV/Excel
7. **Boton de panico:** Desactivar/restaurar bloques de emergencia

### God Mode (supervisores)
Dashboard avanzado con monitoreo del sistema, gestion de cupos, usuarios, reservas y herramientas administrativas. Acceso restringido a emails autorizados en el codigo.

## Cuentas de prueba

| Tipo | Email | Password |
|------|-------|----------|
| Admin | admin@usm.cl | admin123 |
| Alumno | alonso@usm.cl | alonso123 |

## Documentacion

Para informacion detallada sobre arquitectura, endpoints, logica de negocio, deploy y troubleshooting, ver **[DOCUMENTACION-TECNICA.md](DOCUMENTACION-TECNICA.md)**.

# Documentacion Tecnica - Gimnasio USM Sistema de Reservas

> Documento orientado a project managers y equipo tecnico.
> Ultima actualizacion: Marzo 2026

---

## Tabla de Contenidos

1. [Resumen del Sistema](#1-resumen-del-sistema)
2. [Arquitectura del Proyecto](#2-arquitectura-del-proyecto)
3. [Base de Datos Completa](#3-base-de-datos-completa)
4. [Sistema de Autenticacion y Seguridad](#4-sistema-de-autenticacion-y-seguridad)
5. [Referencia de Endpoints API](#5-referencia-de-endpoints-api)
6. [Logica de Negocio Clave](#6-logica-de-negocio-clave)
7. [Cron y Mantenimiento Automatico](#7-cron-y-mantenimiento-automatico)
8. [Vercel: Deploy, Cron y Monitoreo](#8-vercel-deploy-cron-y-monitoreo)
9. [Guia de Setup: Levantar el Proyecto desde Cero](#9-guia-de-setup-levantar-el-proyecto-desde-cero)
10. [Tests: Que Cubren y Como Ejecutarlos](#10-tests-que-cubren-y-como-ejecutarlos)
11. [Guia Practica: Donde Cambiar X](#11-guia-practica-donde-cambiar-x)
12. [Variables de Entorno](#12-variables-de-entorno)
13. [Cuentas de Prueba, Comandos y Troubleshooting](#13-cuentas-de-prueba-comandos-y-troubleshooting)

---

## 1. Resumen del Sistema

### Que hace

Aplicacion web para gestionar **reservas diarias de cupos** en el gimnasio de la Universidad Tecnica Federico Santa Maria (USM). Los alumnos reservan bloques horarios para asistir al gimnasio; los administradores gestionan capacidad, toman asistencia y monitorean el sistema.

### Para quien

- **Alumnos USM:** Reservan un bloque por dia, ven su historial y faltas
- **Administradores:** Gestionan cupos, toman asistencia masiva, ven estadisticas, exportan reportes
- **God Mode (supervisores):** Dashboard avanzado de monitoreo del sistema completo

### Donde esta deployado

| Entorno | URL | Hosting | Base de datos | Branch |
|---------|-----|---------|---------------|--------|
| Produccion activa | Vercel | Vercel | PostgreSQL (Supabase) | `vercel-supabase` |
| Produccion original | ninjahost.cl | ninjahost | MySQL local | `master` |

### Stack tecnologico

- **Framework:** Next.js 16 (App Router) + React 18
- **Estilos:** Tailwind CSS 4
- **Base de datos:** PostgreSQL en Supabase (produccion) / MySQL en ninjahost (legacy)
- **Auth:** JWT en cookies httpOnly (2 horas de duracion)
- **Deploy:** Vercel (auto-deploy al hacer push a `vercel-supabase`)
- **Tests:** Framework custom (338 tests estaticos, sin necesidad de DB)

### Flujo general del sistema

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│          │     │              │     │             │     │              │
│ Usuario  │────>│  Frontend    │────>│  API Routes │────>│  PostgreSQL  │
│ (Browser)│<────│  (React 18)  │<────│  (Next.js)  │<────│  (Supabase)  │
│          │     │              │     │             │     │              │
└──────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                            │
                                      ┌─────┴──────┐
                                      │ Middleware  │
                                      │ (Auth +     │
                                      │  Headers)   │
                                      └────────────┘

Flujo de una reserva:
1. Alumno abre la app → Frontend carga cupos (GET /api/cupos)
2. Alumno selecciona bloque → Frontend envia POST /api/reservas
3. Middleware verifica JWT cookie → inyecta headers x-user, x-user-type
4. API valida reglas de negocio → INSERT en DB con lock FOR UPDATE
5. DB confirma → API responde → Frontend actualiza UI
```

---

## 2. Arquitectura del Proyecto

### Estructura de carpetas

```
gimnasio-reservas/
├── middleware.js                    # Auth: verifica JWT, inyecta headers, God Mode
├── vercel.json                     # Cron job diario (4 AM UTC)
├── supabase-schema.sql             # Schema completo de PostgreSQL
├── package.json                    # Dependencias y scripts npm
├── next.config.mjs                 # Config Next.js (standalone output)
├── .env.example                    # Template de variables de entorno
│
├── src/
│   ├── app/
│   │   ├── page.js                 # Pagina principal (login + God Mode redirect)
│   │   ├── layout.js               # Layout root de Next.js
│   │   ├── globals.css             # Estilos globales Tailwind
│   │   │
│   │   ├── api/                    # === 21 ENDPOINTS API ===
│   │   │   ├── login/route.js      # POST: Autenticacion
│   │   │   ├── logout/route.js     # POST: Cerrar sesion
│   │   │   ├── register/route.js   # POST: Registro de alumnos
│   │   │   ├── auth/check/route.js # GET: Verificar sesion activa
│   │   │   ├── users/route.js      # GET/POST: Listar/crear usuarios
│   │   │   ├── cupos/route.js      # GET/PATCH: Cupos disponibles
│   │   │   ├── reservas/route.js   # GET/POST/DELETE: Reservas de alumnos
│   │   │   ├── asistencia/route.js # POST: Marcar asistencia individual
│   │   │   ├── test/route.js       # GET: Health check de BD
│   │   │   │
│   │   │   └── admin/              # Endpoints protegidos (solo admin)
│   │   │       ├── asistencia-masiva/route.js  # GET/POST: Asistencia por bloque
│   │   │       ├── boton-panico/route.js       # GET/POST/PUT: Emergencia
│   │   │       ├── cancelar-reserva/route.js   # DELETE: Cancelar reserva ajena
│   │   │       ├── estadisticas/route.js       # GET: Stats generales
│   │   │       ├── estadisticas-alumno/route.js # GET: Stats por alumno
│   │   │       ├── estadisticas-bloque/route.js # GET: Stats por bloque
│   │   │       ├── exportar/route.js           # GET/POST: Exportar CSV/Excel
│   │   │       ├── exportar-completo/route.js  # GET: Export JSON completo
│   │   │       ├── generar-cupos/route.js      # GET/POST: Generar cupos
│   │   │       ├── mantenimiento/route.js      # GET: Cron diario (publico)
│   │   │       ├── monitor/route.js            # GET: Dashboard God Mode
│   │   │       ├── procesar-ausencias/route.js # POST: Procesar ausencias
│   │   │       ├── reservar-alumno/route.js    # POST: Reservar para alumno
│   │   │       ├── reservas-por-bloque/route.js # GET: Reservas agrupadas
│   │   │       └── usuarios/route.js           # GET/PUT/PATCH/DELETE: CRUD
│   │   │
│   │   ├── admin/page.js           # Pagina del dashboard admin
│   │   ├── estudiante/page.js      # Pagina del dashboard alumno
│   │   │
│   │   └── utils/
│   │       └── constants.js        # === CONSTANTES CENTRALIZADAS ===
│   │                               # Bloques, horarios, sedes, helpers
│   │
│   ├── components/
│   │   ├── auth/                   # LoginForm.js, RegisterForm.js
│   │   ├── alumno/                 # ReservarCupo.js
│   │   ├── admin/                  # GestionTab, ReservasTab, UsuariosTab,
│   │   │   │                       # EstadisticasTab, BotonPanicoTab,
│   │   │   │                       # ModalEditarUsuario
│   │   │   └── estadisticas/       # General, Alumno, Bloque, ExportarDatos
│   │   ├── godmode/                # GodCupos, GodUsuarios, GodReservas,
│   │   │                           # GodMiReserva, GodModalUsuario, GodHerramientas
│   │   └── pages/                  # DashboardAdmin, DashboardAlumno,
│   │                               # DashboardGodMode, LoginPage
│   │
│   ├── hooks/
│   │   └── useCupos.js             # Hook React para cargar cupos
│   │
│   ├── services/
│   │   └── api.js                  # Cliente HTTP centralizado (ApiService)
│   │
│   └── lib/
│       ├── db.js                   # Wrapper PostgreSQL (traduce MySQL → PG)
│       ├── auth.js                 # getUserFromRequest() helper
│       ├── rate-limit.js           # Rate limiter en memoria
│       ├── rut.js                  # Validacion RUT chileno
│       └── procesar-ausencias.js   # Auto-procesamiento de ausencias
│
├── tests/
│   ├── runner.js                   # Framework de tests custom
│   ├── run-all.js                  # Ejecuta las 3 suites
│   ├── security.test.js            # Tests de seguridad (30+ tests)
│   ├── architecture.test.js        # Tests de arquitectura (35+ tests)
│   └── bugfixes.test.js            # Tests de bug fixes (20+ tests)
│
├── public/                         # Assets estaticos
└── scripts/                        # Scripts utilitarios
```

### Patron arquitectonico

Next.js **App Router**: cada carpeta dentro de `src/app/api/` con un archivo `route.js` se convierte automaticamente en un endpoint HTTP. El metodo exportado (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) determina que verbos HTTP acepta.

Ejemplo: `src/app/api/reservas/route.js` exporta `GET`, `POST` y `DELETE`, asi que responde a:
- `GET /api/reservas`
- `POST /api/reservas`
- `DELETE /api/reservas`

---

## 3. Base de Datos Completa

### Tabla `users` — Usuarios del sistema

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| `id` | SERIAL | Auto-increment | Identificador unico |
| `email` | VARCHAR(255) | — | Email institucional (@usm.cl). **UNIQUE, NOT NULL** |
| `name` | VARCHAR(255) | — | Nombre completo. **NOT NULL** |
| `password` | VARCHAR(255) | — | Hash bcrypt (cost 12). **NOT NULL** |
| `rol` | VARCHAR(20) | NULL | Rol institucional USM (ej: "Estudiante"). Lo asigna el admin |
| `rut` | VARCHAR(20) | NULL | RUT chileno (ej: "12.345.678-9"). **UNIQUE** |
| `is_admin` | INTEGER | 0 | 0 = alumno, 1 = administrador |
| `baneado` | INTEGER | 0 | 0 = activo, 1 = baneado (no puede reservar) |
| `faltas` | INTEGER | 0 | Contador de faltas (3 = baneo automatico) |
| `ultimo_reset_faltas` | TIMESTAMP | NULL | Fecha del ultimo reset semestral de faltas |

### Tabla `reservas` — Reservas de cupos

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| `id` | SERIAL | Auto-increment | Identificador unico |
| `email` | VARCHAR(255) | — | Email del alumno. **FK → users.email ON UPDATE CASCADE** |
| `fecha` | DATE | — | Fecha de la reserva (YYYY-MM-DD). **NOT NULL** |
| `bloque_horario` | VARCHAR(10) | — | Bloque de clase (ej: "1-2", "3-4"). **NOT NULL** |
| `sede` | VARCHAR(50) | — | Campus (ej: "Vitacura", "San Joaquín"). **NOT NULL** |
| `asistio` | INTEGER | NULL | Estado de asistencia (ver tabla abajo) |
| `created_at` | TIMESTAMP | NOW() | Fecha de creacion del registro |

**Estados de `asistio`:**

| Valor | Significado | Como se asigna |
|-------|-------------|----------------|
| `NULL` | Pendiente | Reserva creada, aun no se toma asistencia |
| `1` | Presente | Admin marco asistencia manualmente |
| `0` | Ausente | Admin marco como ausente manualmente |
| `2` | Auto-procesado | Sistema marco ausencia automatica (15 min despues del inicio) |

### Tabla `cupos` — Capacidad diaria por bloque

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| `id` | SERIAL | Auto-increment | Identificador unico |
| `bloque` | VARCHAR(10) | — | Bloque de clase (ej: "1-2"). **NOT NULL** |
| `sede` | VARCHAR(50) | — | Campus. **NOT NULL** |
| `fecha` | DATE | — | Fecha. **NOT NULL** |
| `total` | INTEGER | 15 | Cupos totales disponibles ese dia |
| `reservados` | INTEGER | 0 | Cupos ya tomados |

**Disponibilidad** se calcula como: `disponibles = total - reservados`

### Restricciones y constraints

```
UNIQUE (cupos):     cupos_bloque_sede_fecha_unique → (bloque, sede, fecha)
UNIQUE (reservas):  reservas_email_fecha_unique → (email, fecha)
                    → Un alumno solo puede tener 1 reserva por dia
UNIQUE (users):     email (unico), rut (unico)
FK (reservas):      email → users.email ON UPDATE CASCADE
```

### Indices de rendimiento

```
idx_reservas_email              → reservas(email)
idx_reservas_fecha              → reservas(fecha)
idx_reservas_bloque_fecha_sede  → reservas(bloque_horario, fecha, sede)
idx_cupos_fecha                 → cupos(fecha)
idx_cupos_bloque_sede_fecha     → cupos(bloque, sede, fecha)
```

### Diagrama de relaciones

```
┌─────────────────────────────┐
│          users              │
├─────────────────────────────┤
│ id (PK)                     │
│ email (UNIQUE, NOT NULL) ───┼──────┐
│ name                        │      │
│ password (bcrypt)           │      │  FK: email
│ rol (nullable)              │      │  ON UPDATE CASCADE
│ rut (UNIQUE, nullable)      │      │
│ is_admin (0/1)              │      │
│ baneado (0/1)               │      │
│ faltas (0-3)                │      │
│ ultimo_reset_faltas         │      │
└─────────────────────────────┘      │
                                     │
┌─────────────────────────────┐      │
│         reservas            │      │
├─────────────────────────────┤      │
│ id (PK)                     │      │
│ email (FK) ─────────────────┼──────┘
│ fecha                       │
│ bloque_horario              │
│ sede                        │
│ asistio (NULL/0/1/2)        │
│ created_at                  │
├─────────────────────────────┤
│ UNIQUE(email, fecha)        │  ← 1 reserva por alumno por dia
└─────────────────────────────┘

┌─────────────────────────────┐
│          cupos              │
├─────────────────────────────┤
│ id (PK)                     │
│ bloque                      │
│ sede                        │
│ fecha                       │
│ total                       │
│ reservados                  │
├─────────────────────────────┤
│ UNIQUE(bloque, sede, fecha) │  ← 1 registro por bloque/sede/dia
└─────────────────────────────┘

Nota: cupos no tiene FK directa con reservas.
La relacion es logica: cupos.reservados se incrementa/decrementa
al crear/cancelar reservas (mantenido por la logica de la API).
```

---

## 4. Sistema de Autenticacion y Seguridad

### Flujo completo de autenticacion

```
REGISTRO                              LOGIN
────────                              ─────
1. Alumno envia:                      1. Alumno envia:
   rut, name, email, password            email, password

2. Validaciones:                      2. Validaciones:
   - Email @usm.cl                       - Email @usm.cl
   - RUT valido (digito verificador)     - Rate limit (10/15min)
   - Password 8-72 chars                 - Email existe en DB
   - Email/RUT no duplicado              - bcrypt.compare(password)
   - Rate limit (10/15min)               - Usuario no baneado

3. Hash password (bcrypt, cost 12)    3. Genera JWT:
4. INSERT en tabla users                 payload: {email, role_type}
5. Responde 201 (sin login auto)         firma: JWT_SECRET
                                         expira: 2 horas

                                      4. Set cookie:
                                         name: user_session
                                         value: JWT token
                                         httpOnly: true
                                         secure: true (en prod)
                                         sameSite: strict
                                         maxAge: 7200 (2h)
                                         path: /

                                      5. Responde con datos del usuario
```

### Middleware — Que pasa en cada request

```
Request entrante
      │
      ▼
┌─ Es ruta publica? ──────────────────────────────────────────────┐
│  /api/login, /api/register, /api/auth/check,                    │
│  GET /api/cupos, GET /api/admin/mantenimiento,                  │
│  /_next/*, /static/*                                            │
│                                                                 │
│  SI → Pasar sin auth                                            │
└─────────────────────────────────────────────────────────────────┘
      │ NO
      ▼
┌─ Tiene cookie user_session? ────────────────────────────────────┐
│  NO → 401 (API) o redirect a / (pagina)                        │
└─────────────────────────────────────────────────────────────────┘
      │ SI
      ▼
┌─ JWT valido? (verificar firma + expiracion) ────────────────────┐
│  NO → Borrar cookie + 401/redirect                             │
└─────────────────────────────────────────────────────────────────┘
      │ SI
      ▼
┌─ Extraer email y role_type del JWT ─────────────────────────────┐
│                                                                 │
│  ¿Email es God Mode?                                            │
│  (jose.vargasv@usm.cl, crauli1@usm.cl,                        │
│   christian.riquelmep@usm.cl)                                   │
│                                                                 │
│  SI → Override role_type = 'admin'                              │
│  NO → Usar role_type del JWT                                    │
│                                                                 │
│  Inyectar headers:                                              │
│    x-user: email                                                │
│    x-user-type: admin | alumno                                  │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─ Es ruta /admin/*? ────────────────────────────────────────────┐
│  SI + x-user-type != 'admin' → Redirect a /                   │
│  SI + x-user-type == 'admin' → Pasar                           │
│  NO → Pasar                                                    │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
   Route handler recibe request con headers x-user y x-user-type
```

### Medidas de seguridad

| Medida | Implementacion | Donde |
|--------|---------------|-------|
| **Passwords hasheados** | bcrypt cost 12 (nunca texto plano) | register, usuarios PUT |
| **Cookie httpOnly** | JavaScript del browser NO puede leer la cookie | login/route.js |
| **Cookie secure** | Solo se envia por HTTPS (en produccion) | login/route.js |
| **Cookie sameSite strict** | Protege contra CSRF | login/route.js |
| **Sesion corta (2h)** | Token expira en 2 horas, obliga re-login | login/route.js |
| **Rate limiting** | 10 intentos por 15 minutos por IP | login, register |
| **SQL injection** | Prepared statements con placeholders ($1, $2...) | Todos los endpoints |
| **Race conditions** | `SELECT ... FOR UPDATE` en transacciones | POST /api/reservas |
| **Atomicidad** | `AND asistio IS NULL` previene doble-procesamiento | procesar-ausencias.js |
| **Email validacion** | Solo @usm.cl o @sansano.usm.cl | register, login, usuarios PUT |
| **RUT validacion** | Digito verificador validado algoritmicamente | register, rut.js |
| **God Mode hardcoded** | Lista fija de emails en codigo (no configurable externamente) | middleware.js |
| **DB centralizada** | Todos los endpoints usan `src/lib/db.js`, nunca importan pg directo | Convencion enforced por tests |

### God Mode — Dashboard de supervisores

**Que es:** Un dashboard secreto con tema oscuro (slate-950/cyan/emerald) que da acceso completo al sistema. Solo 3 emails autorizados pueden acceder.

**Quienes tienen acceso:**
1. `jose.vargasv@usm.cl`
2. `crauli1@usm.cl`
3. `christian.riquelmep@usm.cl`

**Como funciona:**
- El middleware detecta estos emails y fuerza `x-user-type = 'admin'` sin importar su `is_admin` real en la DB
- La pagina principal (`page.js`) redirige estos emails al dashboard God Mode en vez del dashboard alumno
- El endpoint `/api/admin/monitor` verifica la lista de emails y solo responde a estos usuarios

**Que puede hacer God Mode:**
- Monitor: Estado del sistema en tiempo real (latencia BD, cupos, actividad reciente, usuarios en riesgo)
- Gestion: Ver y modificar cupos, tomar asistencia
- Usuarios: Buscar, editar, banear/desbanear
- Reservas: Ver todas las reservas del dia
- Mi Reserva: Ver la reserva personal del usuario God Mode
- Herramientas: Generar cupos a futuro, reservar en nombre de un alumno

---

## 5. Referencia de Endpoints API

### Autenticacion (4 endpoints)

#### `POST /api/login` — Iniciar sesion
- **Acceso:** Publico (rate limited: 10/15min)
- **Body:** `{ "username": "email@usm.cl", "password": "string" }`
- **Respuesta:** Cookie `user_session` + datos del usuario (nombre, email, rol, is_admin)
- **Logica:** Verifica email @usm.cl, busca en DB, compara bcrypt, verifica no baneado, genera JWT

#### `POST /api/register` — Registrar alumno
- **Acceso:** Publico (rate limited: 10/15min)
- **Body:** `{ "rut": "12.345.678-9", "name": "Nombre", "email": "email@usm.cl", "password": "min8chars", "confirmPassword": "igual" }`
- **Respuesta:** 201 con datos del usuario creado
- **Logica:** Valida RUT (digito verificador), email @usm.cl, password 8-72 chars, no duplicados. El campo `rol` se inserta como NULL (el admin lo asigna despues)

#### `POST /api/logout` — Cerrar sesion
- **Acceso:** Publico
- **Body:** Ninguno
- **Respuesta:** `{ success: true }`
- **Logica:** Borra cookie `user_session`

#### `GET /api/auth/check` — Verificar sesion
- **Acceso:** Publico
- **Respuesta:** `{ authenticated: true/false, user: {email, role_type} }`
- **Logica:** Lee y verifica JWT de la cookie. Cache 60 segundos

---

### Cupos (2 endpoints)

#### `GET /api/cupos` — Obtener cupos disponibles
- **Acceso:** Publico
- **Query:** `?sede=Vitacura&fecha=2026-03-19` (ambos opcionales)
- **Respuesta:** Objeto con cupos por bloque: `{ "1-2-Vitacura": { bloque, sede, total, reservados, disponibles, fecha } }`
- **Logica especial:**
  - Si se piden cupos de hoy y no existen → los genera automaticamente (fallback del cron)
  - Auto-procesa ausencias de bloques que ya pasaron los 15 minutos
  - Filtra bloques segun restricciones de sede/dia (ej: Vitacura viernes solo hasta bloque 5-6)
  - Excluye fines de semana
  - Cache: 10s para hoy, 300s para fechas pasadas

#### `PATCH /api/cupos` — Modificar capacidad de un bloque
- **Acceso:** Admin
- **Body:** `{ "bloque": "1-2", "sede": "Vitacura", "cantidad": 15, "fecha": "2026-03-19" }`
- **Respuesta:** Cupos actualizados del dia
- **Logica:** Actualiza `cupos.total` para un bloque/sede/fecha especifico

---

### Reservas (3 endpoints)

#### `POST /api/reservas` — Crear reserva (alumno)
- **Acceso:** Alumno autenticado
- **Body:** `{ "bloque_horario": "1-2", "sede": "Vitacura" }`
- **Respuesta:** 201 con mensaje de confirmacion, faltas actuales, bloque y sede
- **Logica especial (la mas compleja del sistema):**
  1. Verifica que las reservas estan abiertas (>= 06:30 Chile)
  2. Verifica que el bloque no esta cerrado (< 25 min despues del inicio)
  3. Auto-procesa ausencias pendientes del bloque (libera cupos)
  4. Verifica que el alumno no tiene otra reserva hoy (UNIQUE constraint)
  5. Verifica que el alumno no esta baneado
  6. Auto-reset de faltas si pasaron 6 meses
  7. Abre transaccion con `FOR UPDATE` en cupos (lock pesimista)
  8. Verifica que hay cupos disponibles (`reservados < total`)
  9. Incrementa `cupos.reservados`
  10. Inserta reserva con `asistio = NULL`
  11. Commit o rollback

#### `GET /api/reservas` — Ver mis reservas
- **Acceso:** Alumno o Admin autenticado
- **Respuesta:** `{ reservas: [...hoy], usuario: {email, name, faltas, baneado}, historialFaltas: [...ultimas 20] }`
- **Logica:** Devuelve reservas de hoy del usuario + historial de faltas (asistio = 0 o 2)

#### `DELETE /api/reservas` — Cancelar mi reserva
- **Acceso:** Alumno autenticado (dueno de la reserva)
- **Body:** `{ "bloque_horario": "1-2", "sede": "Vitacura" }`
- **Respuesta:** `{ message: "Reserva cancelada exitosamente" }`
- **Logica:** Transaccion que borra la reserva y decrementa `cupos.reservados` con `GREATEST(0, reservados - 1)`. El alumno puede cancelar aunque el bloque ya empezo

---

### Admin — Asistencia (3 endpoints)

#### `POST /api/asistencia` — Marcar asistencia individual
- **Acceso:** Admin
- **Body:** `{ "username": "email@usm.cl", "bloque": "1-2", "presente": true/false }`
- **Respuesta:** `{ message: "Asistencia registrada" }`
- **Logica:** Actualiza `reservas.asistio` a 1 (presente) o 0 (ausente)

#### `GET /api/admin/asistencia-masiva` — Listar alumnos de un bloque
- **Acceso:** Admin
- **Query:** `?bloque=1-2&sede=Vitacura&fecha=2026-03-19`
- **Respuesta:** Array de alumnos con: email, nombre, rol, asistio, faltas, baneado
- **Logica:** Auto-procesa ausencias antes de devolver la lista

#### `POST /api/admin/asistencia-masiva` — Guardar asistencia masiva
- **Acceso:** Admin
- **Body:** `{ "asistencias": [{"email": "...", "asistio": true/false}], "bloque_horario": "1-2", "sede": "Vitacura", "fecha": "2026-03-19" }`
- **Respuesta:** `{ message: "Asistencia registrada", procesados: N }`
- **Logica compleja de transiciones:**
  - Si cambia de pendiente/presente → ausente: suma falta, verifica baneo a 3 faltas
  - Si cambia de ausente/auto-procesado → presente: resta falta, restaura cupo si fue auto-procesado, auto-desbanea si faltas < 3

---

### Admin — Gestion de reservas (3 endpoints)

#### `DELETE /api/admin/cancelar-reserva` — Cancelar reserva de un alumno
- **Acceso:** Admin
- **Body:** `{ "email": "alumno@usm.cl", "bloque_horario": "1-2", "sede": "Vitacura", "fecha": "2026-03-19" }`
- **Respuesta:** `{ message: "Reserva cancelada", cancelada: true }`

#### `GET /api/admin/reservas-por-bloque` — Reservas agrupadas
- **Acceso:** Admin
- **Query:** `?sede=Vitacura` (opcional)
- **Respuesta:** Reservas de hoy agrupadas por bloque con detalles de cada alumno

#### `POST /api/admin/reservar-alumno` — Reservar en nombre de un alumno
- **Acceso:** Admin (God Mode)
- **Body:** `{ "email": "alumno@usm.cl", "fecha": "2026-03-19", "bloque_horario": "1-2", "sede": "Vitacura" }`
- **Respuesta:** 201 con confirmacion
- **Logica:** Valida dia habil, no fecha pasada, bloque permitido para sede/fecha. Usa FOR UPDATE con transaccion

---

### Admin — Procesamiento de ausencias (1 endpoint)

#### `POST /api/admin/procesar-ausencias` — Procesar ausencias manualmente
- **Acceso:** Admin
- **Body:** `{ "bloque": "1-2", "sede": "Vitacura", "fecha": "2026-03-19" }`
- **Respuesta:** `{ message: "Procesadas X ausencias", faltasRegistradas: N }`
- **Logica:** Verifica que la hora actual >= HORARIOS_LIMITE del bloque. Marca `asistio = 2`, suma faltas, libera cupos, banea automaticamente a las 3 faltas

---

### Admin — Boton de Panico (3 metodos, 1 endpoint)

#### `GET /api/admin/boton-panico` — Ver estado de bloques
- **Acceso:** Admin
- **Query:** `?fecha=2026-03-19` (opcional)
- **Respuesta:** `{ fecha, cupos: [{bloque, sede, total, reservados}] }`

#### `POST /api/admin/boton-panico` — Desactivar bloques (emergencia)
- **Acceso:** Admin
- **Body:** `{ "bloques": [{"bloque": "1-2", "sede": "Vitacura"}], "fecha": "2026-03-19" }`
- **Respuesta:** `{ reservasCanceladas: N, cuposDesactivados: N }`
- **Logica:** Borra todas las reservas de esos bloques y pone `total = 0`

#### `PUT /api/admin/boton-panico` — Restaurar bloques
- **Acceso:** Admin
- **Body:** `{ "bloques": [{"bloque": "1-2", "sede": "Vitacura"}], "fecha": "2026-03-19" }`
- **Respuesta:** `{ bloquesRestaurados: N }`
- **Logica:** Restaura `total` al default de la sede (Vitacura=13, San Joaquin=17)

---

### Admin — Usuarios (4 metodos, 1 endpoint)

#### `GET /api/admin/usuarios` — Listar usuarios con estadisticas
- **Acceso:** Admin
- **Query:** `?search=nombre&tipo=alumnos` (ambos opcionales, tipo: 'alumnos'|'admins'|'todos')
- **Respuesta:** Array de usuarios con `total_reservas` y `total_asistencias` calculados (LEFT JOIN). Limite 500

#### `PUT /api/admin/usuarios` — Actualizar usuario
- **Acceso:** Admin
- **Body:** `{ "email": "...", "name": "...", "newEmail": "...", "password": "...", "isAdmin": true, "rut": "...", "rol": "...", "faltas": 2, "baneado": false }`
- **Respuesta:** `{ message: "Actualizado", updatedEmail: "..." }`
- **Logica:** Si cambia email, tambien actualiza `reservas.email`. Si cambia password, la hashea con bcrypt

#### `PATCH /api/admin/usuarios` — Eliminar una falta especifica
- **Acceso:** Admin
- **Body:** `{ "email": "...", "reservaId": 123 }`
- **Respuesta:** `{ message: "Falta eliminada", usuario: {...} }`
- **Logica:** Marca la reserva como `asistio = 1`, decrementa faltas, auto-desbanea si < 3

#### `DELETE /api/admin/usuarios` — Eliminar usuario
- **Acceso:** Admin
- **Body:** `{ "email": "..." }`
- **Respuesta:** `{ message: "Eliminado", reservasEliminadas: N }`
- **Logica:** Previene auto-eliminacion. Borra reservas y usuario en transaccion

---

### Admin — Estadisticas (3 endpoints)

#### `GET /api/admin/estadisticas` — Estadisticas generales
- **Acceso:** Admin
- **Query:** `?fechaInicio=2026-02-19&fechaFin=2026-03-19` (default: ultimos 30 dias)
- **Respuesta:**
  ```json
  {
    "resumen": { "usuarios_unicos": 45, "total_reservas": 320, "total_asistencias": 280, "porcentaje_asistencia": 87.5 },
    "por_bloque": [{ "bloque_horario": "1-2", "total_reservas": 40, "porcentaje_asistencia": 90 }],
    "por_sede": [{ "sede": "Vitacura", "total_reservas": 150, "porcentaje_asistencia": 85 }]
  }
  ```
- **Cache:** 60 segundos

#### `GET /api/admin/estadisticas-alumno` — Estadisticas de un alumno
- **Acceso:** Admin
- **Query:** `?email=alumno@usm.cl&fechaInicio=...&fechaFin=...`
- **Respuesta:** Datos del alumno + estadisticas generales + reservas por bloque + dias faltados + historial diario + promedio general

#### `GET /api/admin/estadisticas-bloque` — Estadisticas de un bloque
- **Acceso:** Admin
- **Query:** `?bloque=1-2&fechaInicio=...&fechaFin=...`
- **Respuesta:** Stats generales del bloque + datos por dia + alumnos frecuentes + estadisticas por dia de semana + tendencia 7 dias

---

### Admin — Exportacion (3 endpoints)

#### `GET /api/admin/exportar` — Exportar CSV
- **Acceso:** Admin
- **Query:** `?mes=2026-03&tipo=completo` (tipo: 'completo'|'cupos'|'reservas')
- **Respuesta:** Archivo CSV con BOM UTF-8 (compatible con Excel)
- **Logica:** Default ultimos 3 meses si no se especifica mes

#### `POST /api/admin/exportar` — Meses disponibles para exportar
- **Acceso:** Admin
- **Respuesta:** `{ meses_disponibles: [{mes, dias_con_datos, nombre}], total_meses: N }`

#### `GET /api/admin/exportar-completo` — Exportacion JSON completa
- **Acceso:** Admin
- **Query:** `?fechaInicio=...&fechaFin=...`
- **Respuesta:** JSON grande con resumen, cupos totales, por bloque (con horarios reales), por sede, tendencia diaria, ranking top 50 alumnos, datos crudos

---

### Admin — Mantenimiento y Monitoreo (3 endpoints)

#### `GET /api/admin/mantenimiento` — Cron diario
- **Acceso:** Publico (whitelisteado en middleware — llamado por Vercel cron)
- **Respuesta:** `{ message, cuposGenerados, cuposExistentes, diasProcesados }`
- **Logica:** Genera cupos 7 dias adelante, sincroniza contadores `reservados`, limpieza semanal los lunes (datos > 6 meses)

#### `GET /api/admin/generar-cupos` — Generar cupos (cron alternativo)
- **Acceso:** Publico (whitelisteado)
- **Logica:** Similar a mantenimiento, genera cupos 7 dias adelante

#### `POST /api/admin/generar-cupos` — Generar cupos manual
- **Acceso:** Admin
- **Body:** `{ "fechaHasta": "2026-06-30" }`
- **Respuesta:** `{ cuposCreados, cuposExistentes, diasProcesados }`
- **Logica:** Max 90 dias adelante, solo dias habiles

#### `GET /api/admin/monitor` — Dashboard God Mode
- **Acceso:** God Mode (3 emails)
- **Respuesta:** Estado completo del sistema:
  - Ping BD con latencia
  - Stats de hoy (asistencias, ausencias auto/manual)
  - Feed de actividad (ultimas 50 reservas)
  - Heatmap de cupos
  - Usuarios en riesgo (faltas > 0)
  - Tendencia 7 dias
  - Estado del mantenimiento
  - Totales de usuarios (total, admins, baneados)
- **Cache:** No-cache (siempre datos frescos)

---

### Utilidad (2 endpoints)

#### `GET /api/users` — Listar usuarios (simple)
- **Acceso:** Admin
- **Respuesta:** Array de usuarios basico (id, name, email, rol, is_admin, baneado)

#### `POST /api/users` — Crear usuario manualmente
- **Acceso:** Admin
- **Body:** `{ "name": "...", "email": "...@usm.cl", "password": "...", "rol": "..." }`

#### `GET /api/test` — Health check
- **Acceso:** Publico
- **Respuesta:** `{ status: "ok" }`
- **Logica:** Hace un ping simple a la base de datos

---

### Tabla resumen de endpoints

| # | Metodo | Ruta | Acceso | Funcion |
|---|--------|------|--------|---------|
| 1 | POST | `/api/login` | Publico | Autenticacion |
| 2 | POST | `/api/register` | Publico | Registro |
| 3 | POST | `/api/logout` | Publico | Cerrar sesion |
| 4 | GET | `/api/auth/check` | Publico | Verificar sesion |
| 5 | GET | `/api/cupos` | Publico | Ver cupos disponibles |
| 6 | PATCH | `/api/cupos` | Admin | Modificar capacidad |
| 7 | POST | `/api/reservas` | Alumno | Crear reserva |
| 8 | GET | `/api/reservas` | Auth | Ver mis reservas |
| 9 | DELETE | `/api/reservas` | Alumno | Cancelar reserva |
| 10 | POST | `/api/asistencia` | Admin | Marcar asistencia |
| 11 | GET | `/api/admin/asistencia-masiva` | Admin | Listar bloque |
| 12 | POST | `/api/admin/asistencia-masiva` | Admin | Asistencia masiva |
| 13 | DELETE | `/api/admin/cancelar-reserva` | Admin | Cancelar reserva ajena |
| 14 | GET | `/api/admin/reservas-por-bloque` | Admin | Reservas agrupadas |
| 15 | POST | `/api/admin/procesar-ausencias` | Admin | Procesar ausencias |
| 16 | GET/POST/PUT | `/api/admin/boton-panico` | Admin | Emergencia |
| 17 | GET/POST | `/api/admin/generar-cupos` | Publico/Admin | Generar cupos |
| 18 | POST | `/api/admin/reservar-alumno` | Admin | Reservar para alumno |
| 19 | GET/PUT/PATCH/DELETE | `/api/admin/usuarios` | Admin | CRUD usuarios |
| 20 | GET | `/api/admin/estadisticas` | Admin | Stats generales |
| 21 | GET | `/api/admin/estadisticas-alumno` | Admin | Stats por alumno |
| 22 | GET | `/api/admin/estadisticas-bloque` | Admin | Stats por bloque |
| 23 | GET/POST | `/api/admin/exportar` | Admin | Exportar CSV |
| 24 | GET | `/api/admin/exportar-completo` | Admin | Export JSON |
| 25 | GET | `/api/admin/mantenimiento` | Publico | Cron diario |
| 26 | GET | `/api/admin/monitor` | God Mode | Dashboard sistema |
| 27 | GET/POST | `/api/users` | Admin | Listar/crear usuarios |
| 28 | GET | `/api/test` | Publico | Health check |

> **Nota sobre la cuenta de 21 endpoints:** Se cuentan como 21 archivos `route.js`, pero varios manejan multiples metodos HTTP (GET + POST, GET + PUT + PATCH + DELETE, etc.), resultando en ~28 operaciones distintas.

---

## 6. Logica de Negocio Clave

### Sistema de bloques horarios

El gimnasio opera con **8 bloques de clase** (NO horas de reloj). Cada bloque corresponde a un par de periodos academicos:

| Bloque | Horario real | Hora limite ausencia (15 min) | Hora cierre reservas (25 min) |
|--------|-------------|-------------------------------|-------------------------------|
| 1-2 | 08:15 - 09:25 | 08:30 | 08:40 |
| 3-4 | 09:40 - 10:50 | 09:55 | 10:05 |
| 5-6 | 11:05 - 12:15 | 11:20 | 11:30 |
| 7-8 | 12:30 - 13:40 | 12:45 | 12:55 |
| 9-10 | 14:40 - 15:50 | 14:55 | 15:05 |
| 11-12 | 16:05 - 17:15 | 16:20 | 16:30 |
| 13-14 | 17:30 - 18:40 | 17:45 | 17:55 |
| 15-16 | 18:55 - 20:05 | 19:10 | 19:20 |

**Fuente de verdad:** `BLOQUES_HORARIOS` en `src/app/utils/constants.js`. Todos los componentes y endpoints importan de ahi.

### Ventanas de tiempo

```
Hora inicio bloque
      │
      ├─── 0 min: Bloque comienza. Alumnos con reserva deben llegar
      │
      ├─── 15 min (HORARIOS_LIMITE): Auto-procesamiento de ausencias
      │         → Reservas pendientes (asistio=NULL) se marcan como falta (asistio=2)
      │         → Cupos liberados quedan disponibles para otros alumnos
      │
      ├─── 15-25 min: Ventana para tomar cupos recien liberados
      │
      └─── 25 min (HORARIOS_CIERRE): Bloque CERRADO para nuevas reservas
                → Ni el frontend ni el backend permiten reservar
                → Validado tanto client-side como server-side
```

**Apertura de reservas:** Todos los dias a las **06:30 AM** hora Chile.

### Cupos por sede

| Sede | Cupos por bloque (L-J) | Cupos por bloque (Viernes) | Ultimo bloque viernes |
|------|----------------------|--------------------------|---------------------|
| Vitacura | 13 | 13 | 5-6 (cierra antes) |
| San Joaquin | 17 | 17 | 13-14 (cierra antes) |

### Sistema de faltas y baneos

```
Alumno no asiste al bloque reservado
      │
      ├─ Si pasan 15 min del inicio → Sistema auto-marca asistio=2
      │     O
      ├─ Admin marca ausente manualmente → asistio=0
      │
      ▼
   faltas++ (se incrementa el contador del alumno)
      │
      ├─ faltas < 3 → Puede seguir reservando
      │
      └─ faltas >= 3 → baneado = 1 (automaticamente)
            │
            └─ No puede hacer nuevas reservas hasta que:
                  - Admin lo desbanee manualmente (ModalEditarUsuario)
                  - O admin le quite faltas (PATCH /api/admin/usuarios)

Auto-reset de faltas:
   Al intentar reservar, si han pasado >= 6 meses desde ultimo_reset_faltas:
   → faltas = 0
   → baneado = 0
   → ultimo_reset_faltas = ahora
```

### Restricciones de sede por dia

Definidas en `HORARIO_CIERRE_SEDE` en constants.js:

- **Vitacura:**
  - Lunes a Jueves: Todos los bloques hasta 13-14
  - Viernes: Solo hasta bloque 5-6

- **San Joaquin:**
  - Lunes a Jueves: Todos los bloques hasta 15-16
  - Viernes: Solo hasta bloque 13-14

---

## 7. Cron y Mantenimiento Automatico

### Cron diario de Vercel

**Configuracion** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/admin/mantenimiento",
    "schedule": "0 4 * * *"
  }]
}
```

**Hora:** 4:00 AM UTC = ~1:00 AM Chile (invierno) / ~2:00 AM Chile (verano DST)

**Que hace el cron:**
1. **Genera cupos** para los proximos 7 dias (solo dias habiles, no fines de semana)
2. **Sincroniza contadores** `reservados` — recalcula `cupos.reservados = COUNT(reservas)` para corregir posibles desincronizaciones
3. **Limpieza semanal** (solo lunes): Borra cupos y reservas con mas de 6 meses de antiguedad

### Fallback si el cron falla

El endpoint `GET /api/cupos` tiene una verificacion integrada: si se piden cupos de hoy y no existen en la DB, los genera automaticamente. Esto garantiza que el sistema funcione aunque el cron de Vercel no se ejecute.

### Auto-procesamiento de ausencias

No es un cron, sino logica que se ejecuta **reactivamente** en dos lugares:

1. **GET /api/cupos:** Cuando alguien consulta cupos, se procesan ausencias de bloques que ya pasaron 15 min
2. **POST /api/reservas:** Antes de intentar reservar, se procesan ausencias del bloque solicitado

La funcion compartida esta en `src/lib/procesar-ausencias.js`:
- Lee la hora actual de Chile
- Si la hora >= HORARIOS_LIMITE del bloque:
  - Busca reservas con `asistio IS NULL`
  - Para cada una: marca `asistio = 2`, suma falta, libera cupo
  - Usa `AND asistio IS NULL` como condicion atomica para evitar doble-procesamiento en requests concurrentes

---

## 8. Vercel: Deploy, Cron y Monitoreo

### Deploy automatico

1. Se hace push al branch `vercel-supabase` en GitHub
2. Vercel detecta el push y lanza un build automatico
3. Ejecuta `npm run build` (Next.js standalone output)
4. Deploya las funciones serverless y archivos estaticos
5. La URL de produccion se actualiza automaticamente

**No hay que hacer nada manual.** Push a `vercel-supabase` = deploy a produccion.

### Dashboard de Vercel

#### Donde ver logs
- **Vercel Dashboard → [Proyecto] → Logs**
- Muestra logs en tiempo real de todas las funciones serverless
- Filtrar por: endpoint, nivel (error/info), periodo de tiempo

#### Funciones (Functions)
- **Vercel Dashboard → [Proyecto] → Functions**
- Cada archivo `route.js` se convierte en una funcion serverless independiente
- Metricas: invocaciones, duracion promedio, errores

#### Observability
- **Vercel Dashboard → [Proyecto] → Observability**
- Metricas de latencia, throughput, errores por funcion
- Alertas configurables

### Cron job en Vercel

- **Verificar que corrio:** Vercel Dashboard → Logs → Filtrar por `/api/admin/mantenimiento`
- **Ultimo resultado:** Ver el log del ultimo GET a esa ruta
- **Si no corrio:** Los cupos se generan igual via fallback en GET /api/cupos (el primer alumno que consulte los genera)
- **Ejecutar manualmente:** Abrir `https://[tu-dominio]/api/admin/mantenimiento` en el browser

### Variables de entorno en Vercel

**Donde configurarlas:**
1. Vercel Dashboard → [Proyecto] → Settings → Environment Variables
2. Agregar/editar variables (DATABASE_URL, JWT_SECRET, etc.)
3. **Importante:** Despues de cambiar una variable, hay que hacer un nuevo deploy para que tome efecto (push vacio o redeploy desde dashboard)

### Limites del free tier de Vercel

| Recurso | Limite gratuito |
|---------|----------------|
| Invocaciones de funciones | 300,000 / mes |
| Duracion de funciones | 100 GB-hours / mes |
| Bandwidth | 100 GB / mes |
| Builds | 6,000 minutos / mes |
| Cron jobs | 1 por proyecto (ya usado por mantenimiento) |
| Ejecucion maxima por funcion | 10 segundos (Hobby plan) |

---

## 9. Guia de Setup: Levantar el Proyecto desde Cero

### Requisitos previos
- Node.js 18 o superior
- npm (viene con Node.js)
- Git
- Cuenta en Supabase (gratis) para la base de datos
- (Opcional) Cuenta en Vercel para deploy

### Paso a paso

#### 1. Clonar el repositorio
```bash
git clone [URL-del-repo]
cd gimnasio-reservas
git checkout vercel-supabase    # Branch de produccion con PostgreSQL
```

#### 2. Instalar dependencias
```bash
npm install
```

#### 3. Crear base de datos en Supabase
1. Ir a [supabase.com](https://supabase.com) y crear un proyecto
2. En el SQL Editor de Supabase, copiar y ejecutar el contenido de `supabase-schema.sql`
3. Copiar la URL de conexion: Settings → Database → Connection string → URI

#### 4. Configurar variables de entorno
Crear archivo `.env.local` en la raiz:
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
JWT_SECRET=una-clave-secreta-larga-y-aleatoria-de-al-menos-32-caracteres
```

#### 5. Levantar en desarrollo
```bash
npm run dev
```
Abrir http://localhost:3000

#### 6. Crear usuario admin
En el SQL Editor de Supabase:
```sql
-- Primero registrar un usuario normalmente en la app, luego:
UPDATE users SET is_admin = 1 WHERE email = 'tu-email@usm.cl';
```

#### 7. Verificar que todo funciona
```bash
npm test    # Deberia pasar los 338 tests
```

### Diferencia entre branches

| Aspecto | `master` | `vercel-supabase` |
|---------|----------|-------------------|
| Base de datos | MySQL (mysql2) | PostgreSQL (pg) via wrapper |
| Hosting | ninjahost.cl | Vercel |
| Conexion DB | Host/user/password individuales | DATABASE_URL string |
| Cron | No tiene | vercel.json (4 AM UTC) |
| Estado | 22 commits atras | Produccion activa |

**Importante:** El branch `vercel-supabase` usa un wrapper en `src/lib/db.js` que traduce automaticamente:
- Placeholders `?` → `$1, $2, $3...` (MySQL → PostgreSQL)
- Resultados en formato `[rows, fields]` como mysql2
- Agrega `affectedRows` sintetico desde `pgResult.rowCount`

Esto permite que todos los `route.js` usen sintaxis MySQL, pero se ejecuten en PostgreSQL.

### Deploy a Vercel

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Configurar las variables de entorno en Vercel Settings:
   - `DATABASE_URL` (la URL de Supabase)
   - `JWT_SECRET` (la misma clave)
3. Configurar branch de produccion: `vercel-supabase`
4. Hacer push → deploy automatico

---

## 10. Tests: Que Cubren y Como Ejecutarlos

### Comandos

```bash
npm test              # Ejecuta las 3 suites (338 tests)
npm run test:security # Solo tests de seguridad
npm run test:arch     # Solo tests de arquitectura
npm run test:bugs     # Solo tests de bug fixes
```

### Caracteristica clave: Tests ESTATICOS

Los tests **NO necesitan base de datos ni servidor corriendo**. Funcionan leyendo archivos de codigo fuente y verificando patrones. Esto los hace:
- Rapidos (< 5 segundos)
- Sin dependencias externas
- Ejecutables en cualquier entorno (CI/CD, local, etc.)

### Suite 1: Seguridad (`security.test.js`)

~30 tests que verifican:
- No hay credenciales hardcodeadas en el codigo
- Todas las conexiones a DB pasan por `src/lib/db.js` (nunca importan `pg` o `mysql2` directo)
- Rate limiting esta configurado en login y register
- Cookies usan httpOnly, sameSite strict, maxAge de 2 horas
- Emails se validan contra @usm.cl
- Passwords se hashean con bcrypt
- El wrapper PostgreSQL funciona correctamente

### Suite 2: Arquitectura (`architecture.test.js`)

~35 tests que verifican:
- Patron de conexiones: `.release()` en `finally` (no `.end()`)
- Transacciones: `beginTransaction/commit/rollback` en `finally`
- Estructura de archivos correcta
- Respuestas API usan `NextResponse.json()` consistentemente
- Todos los endpoints tienen `try/catch`
- No hay imports directos de drivers de DB

### Suite 3: Bug Fixes (`bugfixes.test.js`)

~20+ tests que verifican correcciones historicas:
- Passwords se hashean al editar usuarios (no se guardan en texto plano)
- Filtrado por sede funciona en reservas
- Race conditions protegidas con `FOR UPDATE`
- Timezone consistente (America/Santiago)
- Validacion de emails @usm.cl en edicion
- Comparacion numerica de horas (no strings)
- Validacion de formato de bloques
- Constraints UNIQUE en DB
- Y mas...

### Como agregar un test nuevo

Editar el archivo de test apropiado (`security.test.js`, `architecture.test.js`, o `bugfixes.test.js`) y agregar:

```javascript
describe('Nombre del grupo', () => {
  it('descripcion del test', () => {
    // Leer archivo de codigo fuente
    const contenido = fs.readFileSync('src/app/api/ruta/route.js', 'utf8');

    // Verificar patron
    assert.includes(contenido, 'patron-esperado', 'Mensaje de error');
    // o
    assert.match(contenido, /regex-esperado/, 'Mensaje de error');
  });
});
```

Metodos assert disponibles: `ok()`, `equal()`, `notEqual()`, `includes()`, `notIncludes()`, `match()`, `gt()`, `fileExists()`, `fileNotExists()`

---

## 11. Guia Practica: Donde Cambiar X

| Quiero... | Archivo(s) | Que hacer |
|-----------|-----------|-----------|
| **Cambiar cupos por sede** (ej: Vitacura de 13 a 20) | `src/app/api/cupos/route.js`, `src/app/api/admin/boton-panico/route.js` | Buscar `CUPOS_POR_SEDE` o los valores 13/17 y cambiarlos |
| **Agregar un bloque horario** (ej: "17-18") | `src/app/utils/constants.js` | Agregar a `BLOQUES_HORARIOS`, `HORARIOS_BLOQUE`, `HORARIOS_LIMITE` y `HORARIOS_CIERRE` (los 4 deben coincidir) |
| **Cambiar duracion de sesion** (ej: de 2h a 8h) | `src/app/api/login/route.js` | Cambiar `maxAge: 7200` (segundos) y `expirationTime` del JWT |
| **Agregar email God Mode** | `middleware.js` + `src/app/api/admin/monitor/route.js` + `src/app/page.js` | Agregar email a la lista `GOD_MODE_EMAILS` en los **3 archivos** |
| **Cambiar restricciones viernes** (bloques permitidos) | `src/app/utils/constants.js` | Editar `HORARIO_CIERRE_SEDE` para la sede deseada |
| **Cambiar tiempo auto-ausencia** (de 15 a 20 min) | `src/app/utils/constants.js` | Editar todos los valores en `HORARIOS_LIMITE` (recalcular inicio + X minutos) |
| **Cambiar tiempo cierre** (de 25 a 30 min) | `src/app/utils/constants.js` | Editar todos los valores en `HORARIOS_CIERRE` |
| **Cambiar hora apertura reservas** (de 06:30) | `src/app/utils/constants.js` | Editar `HORA_APERTURA_RESERVAS` |
| **Agregar nueva sede** (ej: "Concepcion") | `constants.js` + `cupos/route.js` + `boton-panico/route.js` | Agregar a `SEDES`, definir cupos, agregar a `HORARIO_CIERRE_SEDE` |
| **Cambiar emails permitidos** (ej: aceptar @gmail) | Buscar `@usm.cl` en login, register, usuarios | Modificar validacion de email (regex o condicion) |
| **Banear/desbanear usuario** | Panel Admin → Usuarios → Editar | O via API: PUT `/api/admin/usuarios` con `{baneado: 0, faltas: 0}` |
| **Agregar campo a tabla users** | `supabase-schema.sql` + routes relevantes | 1. `ALTER TABLE users ADD COLUMN ...` en Supabase. 2. Actualizar queries en los route.js que lean/escriban ese campo |
| **Ver logs del sistema** | Vercel Dashboard → Logs | Filtrar por funcion o buscar texto de error |
| **Cambiar texto de emails de error** | El route.js correspondiente | Buscar el string del mensaje y cambiarlo |
| **Desactivar bloques de emergencia** | Panel Admin → Boton Panico | O via API: POST `/api/admin/boton-panico` |
| **Exportar datos a Excel** | Panel Admin → Estadisticas → Exportar | GET `/api/admin/exportar?tipo=completo&mes=2026-03` |
| **Cambiar max intentos de login** | `src/lib/rate-limit.js` | Editar `MAX_ATTEMPTS` (default 10) y `WINDOW_MS` (default 15 min) |
| **Cambiar costo bcrypt** | `src/app/api/register/route.js`, `src/app/api/admin/usuarios/route.js` | Cambiar el `12` en `bcrypt.hash(password, 12)` |
| **Agregar nuevo endpoint API** | `src/app/api/[nombre]/route.js` | Crear carpeta + route.js. Si requiere auth, no agregarlo a rutas publicas del middleware |
| **Cambiar hora del cron** | `vercel.json` | Editar `schedule` (formato cron, hora en UTC) |
| **Eliminar datos antiguos** | El cron ya lo hace (lunes, > 6 meses) | Para limpiar manualmente: SQL directo en Supabase |

---

## 12. Variables de Entorno

### Variables necesarias

| Variable | Descripcion | Ejemplo | Donde se usa |
|----------|-------------|---------|--------------|
| `DATABASE_URL` | URL de conexion PostgreSQL (Supabase) | `postgresql://postgres:pass@host:5432/postgres` | `src/lib/db.js` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | `mi-clave-super-secreta-de-32-chars` | `src/app/api/login/route.js`, `middleware.js` |
| `NODE_ENV` | Entorno de ejecucion | `production` o `development` | Next.js automaticamente |

### Donde se configuran

| Entorno | Ubicacion |
|---------|-----------|
| **Desarrollo local** | Archivo `.env.local` en la raiz del proyecto (NO se commitea) |
| **Produccion (Vercel)** | Vercel Dashboard → Settings → Environment Variables |

### Notas importantes

- `.env.local` esta en `.gitignore` — nunca se sube al repositorio
- Si se cambia una variable en Vercel, hay que hacer un nuevo deploy para que aplique
- `JWT_SECRET` debe ser la **misma** en desarrollo y produccion si se quiere que sesiones sean compatibles (normalmente no es necesario)
- No se necesita `NEXT_PUBLIC_API_URL` porque el frontend usa rutas relativas (`/api/...`)

---

## 13. Cuentas de Prueba, Comandos y Troubleshooting

### Cuentas de prueba

| Tipo | Email | Password | Notas |
|------|-------|----------|-------|
| Admin | admin@usm.cl | admin123 | Acceso al panel de administracion |
| Alumno | alonso@usm.cl | alonso123 | Puede hacer reservas |

### Comandos npm

| Comando | Que hace |
|---------|----------|
| `npm run dev` | Levanta servidor de desarrollo en http://localhost:3000 |
| `npm run build` | Compila para produccion |
| `npm start` | Inicia servidor de produccion (despues de build) |
| `npm test` | Ejecuta 338 tests (3 suites) |
| `npm run test:security` | Solo tests de seguridad |
| `npm run test:arch` | Solo tests de arquitectura |
| `npm run test:bugs` | Solo tests de bug fixes |

### Git branches

```bash
git checkout master            # Branch MySQL/ninjahost (legacy)
git checkout vercel-supabase   # Branch PostgreSQL/Vercel (produccion activa)
```

**Siempre trabajar en `vercel-supabase`** a menos que se necesite modificar la version MySQL.

### Troubleshooting comun

#### "Los cupos no aparecen"
1. **Verificar que el cron corrio:** Vercel → Logs → Buscar `/api/admin/mantenimiento`
2. **Forzar generacion:** Abrir `https://[dominio]/api/admin/mantenimiento` en el browser
3. **Verificar fecha:** Los cupos no se generan para fines de semana
4. **Verificar sede:** Algunos bloques no estan disponibles ciertos dias (ej: Vitacura viernes solo hasta 5-6)

#### "El usuario dice que esta baneado"
1. **Panel Admin → Usuarios** → Buscar usuario → Editar
2. Verificar campo `baneado` y `faltas`
3. Para desbanear: poner `baneado = 0` y `faltas = 0`
4. O usar la API: PUT `/api/admin/usuarios` con `{"email": "...", "baneado": false, "faltas": 0}`

#### "El cron no corrio"
1. **No pasa nada grave:** El fallback en GET `/api/cupos` genera cupos automaticamente
2. **Verificar en Vercel:** Dashboard → Cron Jobs → Ver ultimo run
3. **Ejecutar manualmente:** GET a `https://[dominio]/api/admin/mantenimiento`

#### "Error de timezone / fechas incorrectas"
- El sistema usa `America/Santiago` para todo
- Verificar que se usa `getFechaChile()` y NO `new Date().toISOString()`
- El cron corre a las 4 AM UTC, que es ~1 AM Chile (invierno) / ~2 AM Chile (verano)

#### "Error 401 Unauthorized"
- La sesion dura 2 horas. Si expiro, hay que hacer login de nuevo
- Verificar que la cookie `user_session` existe en el browser (DevTools → Application → Cookies)
- Si el usuario es admin, verificar que `is_admin = 1` en la DB

#### "Error al reservar: ya tienes una reserva"
- Cada alumno puede tener **maximo 1 reserva por dia** (constraint UNIQUE en la DB)
- El alumno debe cancelar la reserva actual antes de hacer otra

#### "Los tests fallan"
- Los tests son estaticos, no necesitan DB ni servidor
- Si fallan, probablemente se modifico un archivo de codigo que los tests verifican
- Leer el mensaje de error para entender que patron se espera
- Los tests estan en la carpeta `tests/`

#### "Variables de entorno no se leen"
- En desarrollo: verificar que `.env.local` existe en la raiz
- En Vercel: verificar Settings → Environment Variables
- Despues de cambiar variables en Vercel, hacer un nuevo deploy

---

> **Documento generado para el equipo de Gimnasio USM.**
> Para preguntas tecnicas, contactar al equipo de desarrollo.

# CLAUDE.md - Contexto del proyecto para Claude Code

## Proyecto
**Gimnasio USM - Sistema de Reservas** para la Universidad Tecnica Federico Santa Maria.
Reservas de cupos diarios para el gimnasio. Alumnos reservan bloques horarios, administradores gestionan asistencia.

## Stack
- **Framework:** Next.js 16 (App Router) + React 18 + Tailwind CSS 4
- **Backend:** 20 API Routes en `src/app/api/`
- **Auth:** Cookies httpOnly (`user_session`) + middleware con roles (admin/alumno)
- **Hosting:** Vercel (branch `vercel-supabase`) + ninjahost.cl (branch `master`)
- **Deploy:** Push a `vercel-supabase` hace deploy automatico a Vercel Production

## Branches y bases de datos
| Branch | Base de datos | Hosting | Estado |
|--------|--------------|---------|--------|
| `master` | MySQL (mysql2) en ninjahost local | ninjahost.cl | Produccion original |
| `vercel-supabase` | PostgreSQL (pg) en Supabase | Vercel | Operativo |

**IMPORTANTE:** El branch `vercel-supabase` tiene un wrapper en `src/lib/db.js` que convierte la API de mysql2 a pg automaticamente (placeholders `?` -> `$1`, retorna `[rows, fields]`, sintetiza `affectedRows`). Los route.js usan la misma sintaxis mysql2 pero el wrapper traduce todo a PostgreSQL.

## Estructura clave
```
src/lib/db.js              # Wrapper PostgreSQL (o MySQL en master)
src/lib/rate-limit.js      # Rate limiter en memoria
middleware.js              # Auth + headers x-user, x-user-type
src/app/api/               # 20 endpoints API
src/app/utils/constants.js # Constantes centralizadas (HORARIOS_BLOQUE, HORARIOS_LIMITE, getFechaChile, etc)
src/services/api.js        # Cliente HTTP del frontend
src/hooks/useCupos.js      # Hook React para cargar cupos
src/components/alumno/     # Componentes del dashboard alumno
src/components/admin/      # Componentes del dashboard admin (GestionTab, ReservasTab, etc)
src/components/pages/      # DashboardAdmin.js, DashboardAlumno.js
supabase-schema.sql        # Schema PostgreSQL (solo en vercel-supabase)
```

## Tests
```bash
npm test              # 328 tests (3 suites)
npm run test:security # Seguridad
npm run test:arch     # Arquitectura
npm run test:bugs     # Bug fixes
```
Los tests son estaticos - verifican codigo fuente sin necesitar BD ni servidor.

## Convenciones
- Todos los route.js importan pool desde `@/lib/db` (nunca pg/mysql2 directo)
- Transacciones: `pool.getConnection()` -> `beginTransaction()` -> `commit()/rollback()` -> `release()` en `finally`
- Queries simples: `pool.query(sql, params)` o `pool.execute(sql, params)`
- Auth en endpoints admin: verificar `request.headers.get("x-user-type") === 'admin'`
- Emails deben ser `@usm.cl`
- Passwords con bcrypt cost 12
- **Fechas:** Siempre usar `getFechaChile()` de constants.js (NUNCA `new Date().toISOString()` que es UTC)
- **Asistencia:** reservas.asistio usa NULL=pendiente, 0=ausente, 1=presente, 2=auto-procesado
- **Llamadas internas:** No usar HTTP fetch entre endpoints (falla auth). Usar funciones directas a BD
- **UI cupos alumno:** Tarjetas con horario real (HORARIOS_BLOQUE), barra de progreso con color dinamico

## Panel Admin - Tabs
| Tab | Componente | Funcion |
|-----|-----------|---------|
| Gestion | GestionTab.js | Modificar cupos + toma de asistencia masiva |
| Reservas | ReservasTab.js | Ver/cancelar reservas por bloque (filtro por sede) |
| Estadisticas | EstadisticasTab.js | General, por alumno, por bloque (Recharts) |
| Usuarios | UsuariosTab.js | CRUD usuarios, ban/unban |
| Boton Panico | BotonPanicoTab.js | Desactivar bloques de emergencia |

## Credenciales de servicios (NO commitear)
- Vercel: Token y project ID en sesion de trabajo
- Supabase: Token, project ID, DB password en sesion de trabajo
- Ver SESION.md para credenciales actuales

## Comandos utiles
```bash
npm run dev           # Desarrollo local
npm run build         # Build produccion
npm test              # Todos los tests
git checkout master           # Branch MySQL/ninjahost
git checkout vercel-supabase  # Branch PostgreSQL/Vercel
```

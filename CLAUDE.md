# CLAUDE.md - Contexto del proyecto para Claude Code

## Proyecto
**Gimnasio USM - Sistema de Reservas** para la Universidad Tecnica Federico Santa Maria.
Reservas de cupos diarios para el gimnasio. Alumnos reservan bloques horarios, administradores gestionan asistencia.

## Stack
- **Framework:** Next.js 16 (App Router) + React 18 + Tailwind CSS 4
- **Backend:** 20 API Routes en `src/app/api/`
- **Auth:** Cookies httpOnly (`user_session`, maxAge 2h) + middleware con roles (admin/alumno)
- **Hosting:** Vercel (branch `vercel-supabase`) + ninjahost.cl (branch `master`)
- **Deploy:** Push a `vercel-supabase` hace deploy automatico a Vercel Production

## Branches y bases de datos
| Branch | Base de datos | Hosting | Estado |
|--------|--------------|---------|--------|
| `master` | MySQL (mysql2) en ninjahost local | ninjahost.cl | Produccion original (18 commits atras) |
| `vercel-supabase` | PostgreSQL (pg) en Supabase | Vercel | Produccion activa |

**IMPORTANTE:** El branch `vercel-supabase` tiene un wrapper en `src/lib/db.js` que convierte la API de mysql2 a pg automaticamente (placeholders `?` -> `$1`, retorna `[rows, fields]`, sintetiza `affectedRows`). Los route.js usan la misma sintaxis mysql2 pero el wrapper traduce todo a PostgreSQL.

## Estructura clave
```
src/lib/db.js              # Wrapper PostgreSQL (o MySQL en master)
src/lib/rate-limit.js      # Rate limiter en memoria
middleware.js              # Auth + headers x-user, x-user-type
src/app/api/               # 20 endpoints API
src/app/utils/constants.js # Constantes centralizadas (HORARIOS_BLOQUE, HORARIOS_LIMITE, getFechaChile, sortBloques, etc)
src/services/api.js        # Cliente HTTP del frontend
src/hooks/useCupos.js      # Hook React para cargar cupos
src/components/alumno/     # Componentes del dashboard alumno
src/components/admin/      # Componentes del dashboard admin (GestionTab, ReservasTab, etc)
src/components/pages/      # DashboardAdmin.js, DashboardAlumno.js
vercel.json                # Cron job de mantenimiento diario
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
- **Registro:** Solo pide RUT, nombre, email y password. El ROL USM NO se pide al registrarse (se inserta NULL). El admin puede asignarlo despues desde el modal de edicion.
- Emails deben ser `@usm.cl`
- Passwords con bcrypt cost 12
- **Sesiones:** Cookie maxAge = 2 horas (no 24h)
- **Fechas:** Siempre usar `getFechaChile()` de constants.js (NUNCA `new Date().toISOString()` que es UTC)
- **Asistencia:** reservas.asistio usa NULL=pendiente, 0=ausente, 1=presente, 2=auto-procesado
- **Llamadas internas:** No usar HTTP fetch entre endpoints (falla auth). Usar funciones directas a BD
- **UI cupos alumno:** Tarjetas con horario real (HORARIOS_BLOQUE), barra de progreso con color dinamico, bloques expirados deshabilitados
- **Ordenamiento bloques:** Siempre usar `sortBloques`/`sortByBloque` de constants.js (NUNCA `.sort()` string que ordena "11-12" antes que "3-4")
- **Bloques horarios:** Los 8 bloques son de clase (`1-2, 3-4, 5-6...`), NO horas del reloj (`7-8, 8-9...`). `BLOQUES_HORARIOS` en constants.js es la unica fuente de verdad — usarla siempre en vez de definir listas locales. Debe coincidir con las keys de `HORARIOS_BLOQUE`, `HORARIOS_LIMITE` y `HORARIOS_CIERRE`.

## Cupos diarios - Generacion automatica
Los cupos se generan con doble seguridad:
1. **Cron Vercel** (`vercel.json`): `0 4 * * *` (4 AM UTC) llama GET `/api/admin/mantenimiento` que genera cupos + sincroniza contadores + limpieza semanal (lunes)
2. **Fallback en GET `/api/cupos`**: Si se piden cupos de hoy y no existen, los genera automaticamente (por si el cron falla)

Ambos usan `BLOQUES_HORARIOS` de `constants.js` como unica fuente de verdad para los nombres de bloque.

El endpoint GET `/api/admin/mantenimiento` esta whitelisteado en `middleware.js` (no requiere auth).

Bloques: `1-2, 3-4, 5-6, 7-8, 9-10, 11-12, 13-14, 15-16` (8 bloques de clase, NO horas del reloj).
Cupos por sede: Vitacura = 13, San Joaquin = 17.

## Panel Admin - Tabs
| Tab | Componente | Funcion |
|-----|-----------|---------|
| Gestion | GestionTab.js | Modificar cupos + toma de asistencia masiva |
| Reservas | ReservasTab.js | Ver/cancelar reservas por bloque (filtro por sede) |
| Estadisticas | EstadisticasTab.js | General, por alumno, por bloque (Recharts) |
| Usuarios | UsuariosTab.js | CRUD usuarios, ban/unban, edicion avanzada (rut, rol, faltas, baneado) |
| Boton Panico | BotonPanicoTab.js | Desactivar bloques de emergencia |

## Modal Editar Usuario
El modal (`ModalEditarUsuario.js`) permite editar: nombre, email, password, admin, RUT, rol institucional, faltas (3 = baneo auto) y baneado. El API PUT `/api/admin/usuarios` acepta todos estos campos. Esto tambien permite que `desbanearUsuario` funcione correctamente (envia `{baneado:0, faltas:0}`).

## Auto-liberacion de cupos y bloqueo de reservas
- **15 min** (`HORARIOS_LIMITE`): Se auto-procesan ausencias (reservas pendientes -> falta + liberar cupo). Esto ocurre al consultar cupos (GET `/api/cupos`) y al intentar reservar (POST `/api/reservas`). Funcion compartida en `src/lib/procesar-ausencias.js`.
- **15-25 min**: Ventana donde alumnos pueden tomar cupos recien liberados.
- **25 min** (`HORARIOS_CIERRE`): Bloque cerrado para nuevas reservas. Validado server-side en POST `/api/reservas` y en frontend (`ReservarCupo.js`).
- El boton "Cancelar" NO se afecta (el alumno puede cancelar aunque el bloque ya empezo). La hora se actualiza cada 30 segundos con `getHoraChile()`.

## Credenciales de servicios (NO commitear)
- Vercel: Token y project ID en sesion de trabajo
- Supabase: Token, project ID, DB password en sesion de trabajo
- Ver SESION.md para credenciales actuales

## Cuentas de prueba
- **Admin:** admin@usm.cl / admin123
- **Alumno:** alonso@usm.cl / alonso123

## Comandos utiles
```bash
npm run dev           # Desarrollo local
npm run build         # Build produccion
npm test              # Todos los tests
git checkout master           # Branch MySQL/ninjahost
git checkout vercel-supabase  # Branch PostgreSQL/Vercel
```

## Historial de sesiones

### Sesion 27-feb-2026
Commits: `4878ba6`
1. **Fix BLOQUES_HORARIOS** - Corregido de bloques por hora (`"7-8","8-9","9-10"...`) a bloques de clase (`"1-2","3-4","5-6"...`). Esto causaba que el fallback de auto-generacion en GET /api/cupos creara cupos con nombres incorrectos y que el procesamiento de ausencias no matcheara nada en la DB.
2. **Single source of truth** - Eliminado `BLOQUES_DEFAULT` duplicado en mantenimiento/route.js, ahora importa `BLOQUES_HORARIOS` de constants.js. Ambos generadores (cron y fallback) usan la misma constante.
3. **Limpieza de datos en Supabase** - Borrados cupos de hoy (2026-02-27) con bloques incorrectos y regenerados con los 8 bloques correctos. Movida reserva de bloque fantasma "17-18" a "15-16". Eliminados todos los cupos "17-18" historicos.

### Sesion 26-feb-2026 (tarde)
Commits: `657c986`
8. **Auto-liberar cupos + bloque cerrado 25 min** - Extraido `procesarAusenciasDirecto` a `src/lib/procesar-ausencias.js` (modulo compartido). Auto-procesar ausencias al consultar cupos (GET /api/cupos) y al reservar (POST /api/reservas). Nuevo `HORARIOS_CIERRE` (25 min) para cierre definitivo, validado server-side y frontend. Ventana 15-25 min para tomar cupos liberados.

### Sesion 26-feb-2026 (manana)
Commits: `ada7601`, `6a1c753`, `5e6d580`, `805e869`
1. **Sesiones 2h** - Reducido maxAge cookie de 24h a 2h
2. **Edicion avanzada usuarios** - Modal con campos RUT, rol, faltas, baneado + API PUT actualizada (fix bug desbanear)
3. **Orden numerico bloques** - Helpers `sortBloques`/`sortByBloque` aplicados en 4 componentes (alumno, gestion, reservas, estadisticas)
4. **Bloqueo reservas expiradas** - Boton "Bloque cerrado" 15 min despues de inicio, tarjetas atenuadas
5. **Cron DST fix** - Cambiado de `0 3 * * *` a `0 4 * * *` para funcionar en verano e invierno Chile
6. **Auto-generacion cupos** - Fallback en GET /api/cupos si el cron no corrio
7. **ROL eliminado del registro** - Registro basado solo en RUT. ROL es opcional, admin lo asigna desde modal. Header muerto `x-user-rol` eliminado del middleware.

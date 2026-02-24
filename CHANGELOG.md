# Changelog - Fix de Issues Gimnasio Reservas

## [2026-02-24] - Fix masivo de 20 issues

### SEGURIDAD (Issues #1, #8, #12, #20)

- **Credenciales eliminadas del código fuente**: Todos los 20 route.js ahora importan `pool` desde `@/lib/db` que lee las credenciales desde `.env`. Antes cada archivo tenía user/password hardcodeados.
- **`.env.example` creado** como plantilla sin datos sensibles.
- **`test/route.js` limpiado**: Tenía credenciales `root:root` hardcodeadas. Ahora usa el pool centralizado.
- **Rate limiting agregado** en login y register (10 intentos / 15 min por IP) via `src/lib/rate-limit.js`.

### BUGS CRÍTICOS DE USUARIO (Issues #2, #3, #4)

- **Issue #2 - Password no se hasheaba al editar usuario**: `admin/usuarios/route.js` PUT ahora usa `bcrypt.hash(password, 12)` antes de guardar. Antes guardaba texto plano, rompiendo el login del usuario editado.
- **Issue #3 - Reservas no se diferenciaban por campus**:
  - Backend (`reservas-por-bloque/route.js`): Acepta `?sede=` y agrupa resultados por `bloque_horario`.
  - Frontend (`ReservasTab.js`): Selector Vitacura / San Joaquín agregado.
  - API service (`api.js`): `getReservasPorBloque(sede)` acepta parámetro sede.
- **Issue #4 - "Cargar alumnos" no funcionaba**: `asistencia-masiva/route.js` hacía `JSON.parse(userHeader)` pero el middleware envía el email como string plano, no JSON. Ahora usa `request.headers.get("x-user")` y `request.headers.get("x-user-type")` como el resto de endpoints.

### LÓGICA CRÍTICA (Issues #5, #6, #7, #13)

- **Issue #5 - Race condition en reservas**: El SELECT de cupos y la verificación de reserva existente ahora están DENTRO de la transacción con `FOR UPDATE`, evitando que 2 usuarios reserven el último cupo simultáneamente.
- **Issue #6 - Liberación de cupos en ausencias**: Verificado que ya funcionaba correctamente. El cupo se libera al procesar ausencia.
- **Issue #7 - Timezone inconsistente**: Funciones `getFechaChile()` y `getHoraChile()` agregadas en `constants.js` con timezone `America/Santiago`.
- **Issue #13 - Comparación de hora por string**: Ahora usa función `horaAMinutos()` que convierte "HH:MM:SS" a minutos para comparación numérica robusta.

### FIXES MENORES (Issues #9, #10, #11, #14, #15, #18, #19)

- **Issue #9 - JSON.parse sin try-catch**: Resuelto con el fix de Issue #4 (ya no se usa JSON.parse).
- **Issue #10 - Email @usm.cl no se valida al editar**: Validación agregada en PUT de `admin/usuarios/route.js`.
- **Issue #11 - Código muerto `user.rol === 'admin'`**: Eliminado de `page.js`. Solo queda `user.role_type === 'admin'`.
- **Issue #14 - Sin validación de formato bloque**: `BLOQUE_REGEX` exportado desde `constants.js`.
- **Issue #15 - Horarios hardcodeados**: `HORARIOS_LIMITE` centralizado en `constants.js`, importado por `procesar-ausencias/route.js`.
- **Issue #18 - Cálculo fecha exportación**: `mes.split('-').map(Number)` para parseo correcto.
- **Issue #19 - Frontend no valida datos del API**: `ReservasTab.js` valida que data sea objeto y arrays antes de iterar.

### FIXES ADICIONALES ENCONTRADOS

- **LoginForm.js**: `setUser()` ahora lee `data.user` correctamente (antes leía `data.email` que no existía).
- **LoginForm.js**: `onKeyPress` reemplazado por `onKeyDown` (deprecado en React).
- **ReservarCupo.js**: Error display en cancelar ahora extrae `data?.error` en vez de mostrar `[object Object]`.
- **users/route.js**: Migrado a pool centralizado (tenía credenciales hardcodeadas).
- **Todas las transacciones**: Usan `pool.getConnection()` + `connection.release()` en vez de `mysql.createConnection()` + `connection.end()`.

### ARCHIVOS NUEVOS
- `.env.example` - Plantilla de configuración
- `.env` - Configuración real (gitignored)
- `src/lib/rate-limit.js` - Rate limiter en memoria

### ARCHIVOS MODIFICADOS (27)
- `src/lib/db.js`
- `src/app/utils/constants.js`
- `src/services/api.js`
- `src/app/page.js`
- `src/components/admin/ReservasTab.js`
- `src/components/alumno/ReservarCupo.js`
- `src/components/auth/LoginForm.js`
- 20 archivos route.js en `src/app/api/`

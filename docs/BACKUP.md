# Lumus — Backups y restauración

Fecha: 2026-08-20

El plan de Supabase de este proyecto es **free**, y el plan free **no tiene backups de ningún tipo** (los diarios con 7 días de retención arrancan en Pro; PITR es un add-on aparte). Este script es la única red de contención que existe.

---

## Correr un backup

```bash
npm run backup
```

Una vez por semana, a mano. El script:

1. Cuenta las filas de cada tabla **en producción**
2. Dumpea `auth.users` y `auth.identities`, y después el schema `public` completo (estructura + datos)
3. **Verifica que el dump coincida fila por fila con producción.** Si algo no cuadra, borra el archivo y aborta — es preferible no tener backup a tener uno incompleto que parezca válido
4. Cifra el resultado con AES-256 y **borra el `.sql` en texto plano**
5. Deja el archivo en `C:\Users\rasef\Lumus-Backups\lumus-YYYY-MM-DD.sql.enc`

### Último paso, manual

Abrir esa carpeta en el Explorador de Windows y **subir el archivo a Google Drive**. El script no lo hace solo, a propósito.

---

## Qué respalda y qué no

| Respalda | No respalda |
|---|---|
| Estructura de `public`: tablas, índices, funciones, triggers, 16 policies de RLS | Configuración de Auth (SMTP, templates, providers) |
| Datos de las 14 tablas de `public` | Variables de entorno y secretos |
| `auth.users` y `auth.identities` | Sesiones activas, refresh tokens, logs de auditoría |

Lo que no se respalda o está en `supabase/migrations/` y `supabase/templates/` (versionado en git), o es config que se rehace a mano en el dashboard.

**`auth.users` es la parte que la gente olvida.** Sin ella, restaurar deja 2.306 transacciones apuntando a `user_id` que no existen: datos que no le sirven a nadie.

---

## La passphrase

Está en `.env.local`, en `LUMUS_BACKUP_PASSPHRASE`.

> **Guardala en el gestor de contraseñas.** Si se muere la notebook, `.env.local` se muere con ella y los backups de Drive quedan inservibles para siempre. No hay recuperación posible: es AES-256, no hay puerta de atrás.

Para verla:

```bash
grep LUMUS_BACKUP_PASSPHRASE .env.local
```

---

## Restauración

### Paso 1 — Descifrar (siempre)

```bash
set -a && . ./.env.local && set +a
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
  -in /mnt/c/Users/rasef/Lumus-Backups/lumus-YYYY-MM-DD.sql.enc \
  -out /tmp/lumus-restore.sql -pass env:LUMUS_BACKUP_PASSPHRASE
```

Si la passphrase está mal, `openssl` responde `bad decrypt` y no genera nada.

### Paso 2 — Aplicar

El archivo viene ordenado para restaurarse de una sola pasada: primero los usuarios de `auth`, después el schema `public`. **Ese orden no es cosmético**: las tablas de `public` tienen FK contra `auth.users`, así que los usuarios tienen que existir antes de insertar sus datos.

**Contra un proyecto de Supabase nuevo y vacío** (el caso real de desastre):

```bash
export PGPASSWORD='<password de la base del proyecto NUEVO>'
psql -h aws-1-us-east-1.pooler.supabase.com -p 5432 \
     -U postgres.<ref-del-proyecto-nuevo> -d postgres \
     -v ON_ERROR_STOP=1 -f /tmp/lumus-restore.sql
```

Un proyecto nuevo ya trae el schema `auth` creado por GoTrue, los roles `anon` / `authenticated` / `service_role` y la función `auth.uid()`, que es lo que necesitan las policies del dump. Por eso el dump **no** incluye el DDL de `auth`: recrearlo a mano rompe más de lo que arregla.

**Contra el mismo proyecto, si las tablas todavía existen**: hay que vaciarlas antes, o el `CREATE TABLE` va a fallar por duplicado. Restaurar encima de datos existentes no funciona y no hay que intentarlo a ciegas.

**Contra un Postgres vanilla** (para verificar un backup sin gastar un proyecto de Supabase): un Postgres común no tiene el schema `auth`, ni los roles, ni `auth.uid()`, así que hay que crear esos stubs antes o la restauración se corta. Es lo que se hizo para validar este backup el 2026-08-20 — ver "Prueba de restauración" más abajo.

### Paso 3 — Verificar

```bash
psql ... -c "select count(*) from transactions"   -- tienen que ser las del backup
psql ... -c "select count(*) from auth.users"
```

---

## Detalles de conexión

- **La conexión directa a `db.<ref>.supabase.co` no funciona desde esta máquina.** En el plan free es solo IPv6 (IPv4 es un add-on pago) y la WSL2 no rutea IPv6 a internet: da `Network is unreachable`. Por eso todo va por el **pooler en session mode**, `aws-1-us-east-1.pooler.supabase.com:5432`, con usuario `postgres.<ref>`.
- Ojo que el cluster del pooler es `aws-1`, no `aws-0`: con `aws-0` el error es `Tenant or user not found`, que despista bastante.
- **No hace falta Docker.** `supabase db dump` levanta un contenedor para correr `pg_dump`, pero acá se usa el `pg_dump` nativo (17.9, contra un servidor 17.6). Docker Desktop está instalado en Windows pero sin integración con WSL, así que el comando del CLI falla.
- Se puede apuntar a otro host con `SUPABASE_DB_HOST` y a otra carpeta con `LUMUS_BACKUP_DIR` en `.env.local`.

---

## Cadencia

Manual, semanal, por decisión explícita. Si en algún momento se automatiza (GitHub Actions con cron, por ejemplo), hay que meter la password de la base y la passphrase como secrets del repo — evaluar si vale la pena antes de hacerlo.

---

## Prueba de restauración — 2026-08-20

El backup del 2026-08-20 **se restauró de verdad** en un PostgreSQL 17.9 local, levantado aparte en un puerto propio (no hizo falta Docker ni tocar el Postgres del sistema).

Resultado: `psql -v ON_ERROR_STOP=1` terminó con **exit code 0, sin un solo error**, y lo restaurado coincide con producción:

| Verificación | Resultado |
|---|---|
| Conteo de filas de las 14 tablas de `public` | Idéntico a producción (diff vacío) |
| Policies de RLS | 16 |
| Funciones y triggers | 3 y 1 |
| Tablas con RLS activo | 14 |
| Usuarios de `auth` | 3 |
| Billeteras activas y balance total | 4 billeteras, $2.862.950,00 — **igual que producción** |
| Transacciones con categoría válida (join real) | 1.879 — **igual que producción** |

### Dos cosas que rompían y se arreglaron gracias a esta prueba

1. **`CREATE SCHEMA public;`** — `pg_dump` lo emite a secas y falla en cualquier base donde `public` ya existe, o sea en todas, incluido un proyecto de Supabase recién creado. La restauración se cortaba en la primera línea útil. El script ahora lo reescribe como `CREATE SCHEMA IF NOT EXISTS public;`.
2. **Orden de los datos** — el dump ponía `public` antes que `auth`, pero las tablas de `public` tienen FK contra `auth.users`. Restaurar en ese orden explotaba por clave foránea. Ahora los usuarios van primero.

Las dos fallas eran silenciosas: el backup se generaba, pesaba lo esperado y parecía correcto. Se habrían descubierto el día que hiciera falta restaurar.

> Conviene repetir esta prueba cada tanto, sobre todo después de cambiar el schema.

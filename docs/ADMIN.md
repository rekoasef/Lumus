# Lumus — Tareas de admin

Fecha: 2026-08-20

Lumus **no tiene panel de admin y es a propósito** (ver `docs/BACKLOG.md`, `B4`). Con dos usuarios, el SQL editor del dashboard de Supabase alcanza y no agrega superficie de riesgo: un panel propio implicaría pantallas que leen datos de *todos* los usuarios, y cualquier bug ahí es una filtración cruzada.

Estos snippets se pegan tal cual en:

```
https://supabase.com/dashboard/project/ccixixskklovvvikiwbq/sql/new
```

El SQL editor corre como `postgres`, así que puede escribir en `free_access_grants` (esa tabla es de solo lectura para los usuarios comunes — ver migración `00018`).

---

## Acceso gratis (beta testers, cortesía)

> **El usuario tiene que estar registrado primero.** El grant se guarda por `user_id`, no por email: no se puede pre-autorizar a alguien que todavía no tiene cuenta. El orden es: se registra → verifica el mail → hace el onboarding → queda frenado en `/suscripcion` → le corrés el snippet → entra. Conviene tenerlo a mano cuando se registre, para que el bloqueo le dure un minuto y no se piense que la app está rota.

### Otorgar acceso, sin vencimiento

```sql
insert into free_access_grants (user_id, reason, expires_at)
select id, 'beta tester', null
from auth.users
where lower(email) = lower('mail-del-tester@ejemplo.com')
on conflict (user_id) do update
  set reason = excluded.reason,
      expires_at = excluded.expires_at,
      granted_at = now();
```

### Otorgar acceso con vencimiento

Mismo snippet, cambiando `null` por la fecha:

```sql
-- ... select id, 'beta tester', '2026-12-31'::timestamptz ...
```

Cuando vence, el usuario cae solo en `/suscripcion` sin tocar código.

### Revocar un acceso

```sql
delete from free_access_grants
where user_id = (select id from auth.users where lower(email) = lower('mail-del-tester@ejemplo.com'));
```

### Ver quién tiene acceso y por qué

```sql
select u.email,
       coalesce(b.status, '(sin suscripción)')            as suscripcion,
       coalesce(g.reason, '—')                            as cortesia,
       coalesce(g.expires_at::text, 'sin vencimiento')    as vence,
       case
         when b.status = 'authorized'                                        then 'ENTRA (pagando)'
         when g.user_id is not null
          and (g.expires_at is null or g.expires_at > now())                 then 'ENTRA (cortesía)'
         else 'BLOQUEADO → /suscripcion'
       end                                                as acceso
from auth.users u
left join billing_subscriptions b on b.user_id = u.id
left join free_access_grants   g on g.user_id = u.id
order by u.created_at;
```

> La columna `acceso` replica la misma regla que `src/lib/billing/access.ts`. Si esa lógica cambia, actualizar también esta consulta.

### Pendiente

`Tiagotossi10@gmail.com` — beta tester. Todavía no se registró; en cuanto tenga cuenta, correr el snippet de arriba con `reason = 'beta tester'`.

---

## Cómo funciona el gate

Un usuario entra al dashboard si cumple **una** de estas dos condiciones:

1. `billing_subscriptions.status = 'authorized'` — pagó por Mercado Pago
2. Tiene fila en `free_access_grants` y (`expires_at is null` o todavía no venció)

La regla vive en un solo lugar, `src/lib/billing/access.ts`, y se consulta desde tres:

| Dónde | Para qué |
|---|---|
| `src/proxy.ts` → `lib/supabase/middleware.ts` | Bloquea la navegación |
| `src/app/(dashboard)/layout.tsx` | Segunda barrera del lado del servidor |
| `src/app/suscripcion/page.tsx` | Evita que alguien que ya tiene acceso pague de más |

---

## Por qué `free_access_grants` es una tabla aparte

Lo intuitivo sería una columna `acceso_gratis` en `user_profiles`. **No se puede**: la policy de esa tabla es `users can manage own data`, así que cualquier usuario podría hacer `UPDATE` sobre su propia fila y **auto-otorgarse el acceso desde la consola del navegador**.

`free_access_grants` tiene RLS con **una sola policy, de SELECT**. Sin policy de insert/update/delete, RLS deniega por defecto: solo `service_role` o el owner de la base pueden otorgar. Verificado en la migración `00018`.

---

## Soporte: ¿se registró bien?

Cuando alguien dice "me registré y no puedo entrar", esta consulta dice en qué paso quedó trabado:

```sql
select u.email,
       case when u.email_confirmed_at is null then 'SIN VERIFICAR' else 'verificado' end as mail,
       coalesce(p.onboarding_done::text, '(sin perfil)')                                 as onboarding,
       u.created_at::date                                                                as registro,
       coalesce(u.last_sign_in_at::date::text, 'nunca')                                  as ultimo_ingreso
from auth.users u
left join user_profiles p on p.user_id = u.id
order by u.created_at desc;
```

Los tres bloqueos posibles, en orden: `SIN VERIFICAR` (no le llegó el código o no lo usó), `onboarding = false` (no terminó los 3 pasos), o llegó al paywall sin suscripción ni grant — ese último se ve con la consulta de acceso de más arriba.

---

## Soporte: qué tiene cargado un usuario

```sql
select u.email,
       (select count(*) from wallets w                where w.user_id=u.id and w.deleted_at is null) as billeteras,
       (select count(*) from transactions t           where t.user_id=u.id and t.deleted_at is null) as transacciones,
       (select max(t.date)::text from transactions t  where t.user_id=u.id and t.deleted_at is null) as ultima_carga,
       (select count(*) from finance_categories c     where c.user_id=u.id and c.deleted_at is null) as categorias,
       (select count(*) from budgets b                where b.user_id=u.id)                          as presupuestos,
       (select count(*) from recurring_transactions r where r.user_id=u.id)                          as vencimientos,
       (select count(*) from saving_goals s           where s.user_id=u.id)                          as metas
from auth.users u
where lower(u.email) = lower('mail@ejemplo.com');
```

Filtra `deleted_at is null` a propósito: sin ese filtro los números incluyen los borrados y no reflejan lo que el usuario ve en pantalla.

---

## Salud de la plataforma (free tier)

```sql
select pg_size_pretty(pg_database_size(current_database()))                    as tamano,
       round(100.0 * pg_database_size(current_database()) / (500*1024*1024),1) as pct_de_500mb,
       (select count(*) from auth.users)                                       as usuarios;
```

El plan free son **500 MB**. Al 2026-08-20: 14 MB, 2,7%.

Otros límites del free que no se ven en SQL y conviene tener presentes:

| Límite | Qué pasa si se cruza |
|---|---|
| Proyecto pausado tras 7 días sin actividad | La app queda caída hasta reactivarlo a mano en el dashboard |
| Sin backups automáticos | Ver `docs/BACKUP.md` — por eso el backup es manual |
| Sin protección de contraseñas filtradas | Es de Pro, ver `docs/BACKLOG.md` (`B2`) |
| Conexión directa a la base solo por IPv6 | Hay que ir por el pooler, ver `docs/BACKUP.md` |

---

## Borrar una cuenta

> Borrar de `auth.users` **cascadea** a billeteras, transacciones, categorías, presupuestos y metas. Es irreversible. Nunca hacerlo sin los tres pasos previos.

**1. Ver qué se va a perder.** Usar la consulta de "qué tiene cargado un usuario". Si algún número no es cero, parar y preguntar.

**2. Verificar que no tenga una suscripción cobrando.** Borrar el usuario borra su fila local, pero **no cancela nada en Mercado Pago**:

```sql
select u.email, b.status, b.mp_preapproval_id
from auth.users u join billing_subscriptions b on b.user_id = u.id
where lower(u.email) = lower('mail@ejemplo.com');
```

Si tiene `mp_preapproval_id`, chequear el estado real contra Mercado Pago antes de borrar:

```bash
curl -s -H "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN" \
  "https://api.mercadopago.com/preapproval/<mp_preapproval_id>"
```

Solo seguir si figura `cancelled`, o si el id ni siquiera es válido (un checkout que nunca se completó).

**3. Hacer un backup**: `npm run backup`.

Recién ahí:

```sql
delete from auth.users where lower(email) = lower('mail@ejemplo.com');
```

Este es el procedimiento que se siguió el 2026-08-20 para borrar las dos cuentas de prueba — ver `docs/BACKLOG.md` (`B3`).

---

## Feedback de los testers

Pendiente: llega con `B5` (botón de feedback in-app). Cuando exista la tabla, el snippet para leer lo no atendido va acá.

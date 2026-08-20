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

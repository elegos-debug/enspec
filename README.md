# ENSPEC Club Kickoff Registration

Production Next.js application for ENSPEC's English Speakers Community kickoff registration.

## Architecture

- Next.js App Router and React server components
- Tailwind CSS visual system
- Supabase Auth for administrator sign-in
- Supabase PostgreSQL for persistent storage
- A PostgreSQL RPC (`register_attendee`) serializes capacity checks and inserts using a singleton settings-row lock
- `pdf-lib` generates the invitation inside the serverless Node.js runtime
- Zod validates requests on both the form and API route

The public registration flow writes only through the server-side RPC. The frontend cannot submit an invitation ID or capacity value.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. In **Authentication > Providers**, enable Email and password authentication.
4. Create the administrator account in **Authentication > Users**, then copy its UUID.
5. Authorize that account:

```sql
insert into public.admins (user_id)
values ('ADMIN_AUTH_USER_UUID');
```

## Environment variables

Copy `.env.example` to `.env.local` and supply:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` must exist only on the server. Never add it to `NEXT_PUBLIC_*` or browser code.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The dashboard is at `/admin/login`.

## Event and form configuration

Edit `src/lib/config.ts` to change event details, capacity, academic years, or filière options.

The database capacity defaults to 200. Change it consistently in the config and database:

```sql
update public.event_settings set capacity = 200 where id = true;
```

## Database security

- Row Level Security is enabled on application tables.
- Public roles have no direct attendee read, insert, update, or delete policy.
- The registration RPC is granted only to `service_role`.
- The RPC locks `event_settings` and checks capacity before each insert.
- Email and normalized phone uniqueness is enforced by database indexes.
- Admin data operations require a valid Supabase session and an `admins` row.

The SQL rate limiter stores a hashed forwarded IP and allows ten registration attempts per rolling hour.

## Production deployment

1. Push this repository to GitHub.
2. Import it into Vercel.
3. Add the three environment variables to the Vercel project.
4. Deploy.

## Verification

```bash
npm test
npm run build
```

Before launch, confirm in Supabase:

- `register_attendee` exists and has execute access only for `service_role`
- RLS is enabled
- the admin UUID exists in `public.admins`
- capacity is 200
- email/password auth is enabled
# Obsoulba Luxe Hair

A mobile-first React storefront and Supabase-powered admin studio for Obsoulba Luxe Hair. The supplied client photographs and official logo are served locally; new service and wig photography is uploaded to Supabase Storage from the admin.

## Run locally (Supabase not connected yet)

Requires Node.js 20.19+ or 22.12+. Until this business has its own Supabase project, the React storefront reads its service, price and wig preview from the existing local SQLite server.

```sh
npm install
node server.mjs
```

In another terminal:

```sh
npm run dev
```

Open the Vite local URL. Local bookings and catalogue preview continue to use `.data/obsoulba.sqlite`. This keeps the salon website visible while its separate Supabase project is created.

## Connect this business to Supabase

Create a Supabase project specifically for Obsoulba Luxe Hair (do not reuse another client's project). In Supabase, open **Project Settings → API** and copy the project URL and public publishable key. Never put the `service_role` key in browser code or in a `VITE_` variable.

Add those two values to a local `.env.local` file. Vite uses the `VITE_` prefix; `NEXT_PUBLIC_` is for Next.js and will not be exposed to this React/Vite app.

```sh
cp .env.example .env.local
```

In the Supabase SQL Editor, run [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql). This creates the catalog, hero slide, booking and admin-profile tables, row-level security rules, the public catalog image bucket and initial service/product/slide content.

Create the owner account in **Authentication → Users → Add user** and confirm it. Copy that user's UUID, then grant admin access in the SQL Editor:

```sql
insert into public.profiles (id, is_admin)
values ('PASTE-THE-AUTH-USER-UUID-HERE', true)
on conflict (id) do update set is_admin = true;
```

Restart the React development server to load its new environment settings:

```sh
npm run dev
```

Open the local URL printed by Vite. Use **Admin** in the footer to open the studio. Build for deployment with `npm run build`; the static production output is written to `dist/`.

## Admin capabilities

- Sign in using the Supabase Auth owner account.
- Create, edit, hide, and update prices for services and wigs.
- Upload and replace JPG, PNG, or WebP photos (up to 6 MB) directly to Supabase Storage.
- Edit hero slide copy, images, focal positioning, visibility and ordering.
- Review appointment requests and update their status.
- Removed catalog items are hidden rather than physically deleted, preserving historical booking references.

The admin role is granted explicitly through `public.profiles`; signing up or creating another Auth user does not make that user an admin. Supabase row-level security protects admin edits, storage uploads/deletes, and booking visibility. Visitors may submit appointment requests but cannot read them.

## Deploy

Deploy the Vite static app to a static host such as Vercel, Netlify, Cloudflare Pages or Azure Static Web Apps. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build-time environment variables and redeploy after changing them. Add the production website origin to Supabase Auth's allowed redirect/site URLs. Keep RLS enabled and never deploy the Supabase service-role key to the browser.

The legacy `server.mjs` and `.data/` SQLite database are not used by the React app. Back up any local SQLite bookings you still need before retiring the earlier server setup.

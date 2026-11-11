# Snack Cart

A snack cart ordering site for a school. Students and teachers order snacks
online; THM students manage the catalog, keep inventory accurate, and deliver
orders to classrooms. Administrators control classes, weekly ordering windows,
roles, and school-wide settings.

Built with [Next.js 16](https://nextjs.org), [Auth.js](https://authjs.dev)
(Microsoft Entra ID), Tailwind CSS v4, shadcn/ui, and SQLite through Node's
built-in `node:sqlite`.

## What it does

- **Customers** (students and teachers) browse the menu, add items to a
  database-backed cart, check out to their classroom, pay in person at
  delivery, and track order status.
- **THM staff** manage products and stock with an audit trail, then work a
  delivery queue grouped by room.
- **Admins** create classes and optional rooms, assign people to classes, grant
  staff or admin roles, set recurring weekly ordering windows per class, and pause
  ordering globally.

## Roles

Roles are additive in the `user_roles` table. Everyone starts as `customer`.

| Role | Can do |
| --- | --- |
| `customer` | Order within their class window, view and cancel their own orders |
| `staff` | Everything a customer can do, plus products, categories, inventory, and the delivery queue |
| `admin` | Everything, plus classes, schedules, users, all orders, and settings |

The first administrator is bootstrapped from `ADMIN_EMAILS` in the environment.
After that, roles can come from Entra security groups (see below) or be set by
hand in **Admin → Users**. A role granted by a group is stored with
`source = 'entra'` and is the only kind the sign-in sync may revoke; manual
grants and `ADMIN_EMAILS` always survive.

Admins can review exactly what each role can open and change in
**Admin → Roles & access**, which also links to every page each role uses.

## Ordering windows

Each class can have any number of recurring weekly windows, stored as a local day
of week plus start/end minutes. Windows are evaluated in the timezone configured
in **Admin → Settings**, not the server's timezone.

A checkout is allowed only when:

1. Ordering is enabled globally, and
2. the signed-in customer has a class, and
3. the current local time falls inside one of that class's active windows.

Staff and admins can order outside a window for testing. The rule is enforced in
the server action, not just hidden in the UI.

## Categories

Admins and THM staff manage the product category list in
**Staff → Categories**. Categories can have one optional level of
subcategories (for example *Drinks → Juice*); products can point at either a
top-level category or a subcategory. Every product must use one of them, and
staff pick from that list when adding or editing a product. Renaming a category,
or moving it under another, updates its products automatically; a category that
has subcategories or products cannot be deleted. Existing product categories are
imported the first time the app starts.

## Inventory

Stock is checked and decremented in the same SQLite transaction that creates an
order, so two people cannot buy the last item. Cancelling an order restores the
stock. Every change writes an `inventory_movements` row (`initial`, `restock`,
`order`, `cancel`, `adjustment`) with the actor, optional note, and related
order.

## Payments and receipts

There is no online payment. Orders are created as `pending` and `unpaid`, and
customers pay in person when the cart is delivered. Staff mark an order paid in
the delivery queue; unpaid orders stay open until they are paid or cancelled.

- **Student receipt:** every order has a printable receipt at
  `/orders/<id>/receipt`. Customers open it from **My orders → Details →
  Print receipt**; staff can print the same page for any order.
- **Class pick list:** **Staff → Pick lists** shows each class with open orders,
  the combined quantity of every item to gather, and a per-student breakdown
  with what to collect. It is printable and updates as orders come in.

## Local setup

Node 24 or newer is required for `node:sqlite`. If you use nvm, run `nvm use`
to pick up `.nvmrc`.

```bash
npm install
cp .env.example .env.local
npx auth secret            # writes AUTH_SECRET
npm run dev
```

Set the Entra ID values in `.env.local`:

- `AUTH_MICROSOFT_ENTRA_ID_ID`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER`

Add your own email to `ADMIN_EMAILS`, then sign in. Open **Admin → Classes** to
create classes, **Admin → Users** to assign them, and **Admin → Schedule** to add
ordering windows. Add products from **Staff → Products**.

## Entra groups (roles and classes)

Entra groups can drive both the `admin`/`staff` roles and each user's class, so
nobody has to be set up by hand.

1. In the Entra admin center, create one **security group** per class (for
   example `Snack Cart – Period 3`) and add the students. Create (or pick)
   separate groups for app admins and cart staff.
2. Copy each group's **Object ID** (a GUID), not its name.
3. Optional but recommended: **App registrations → Snack Cart Site → Token
   configuration → Add groups claim → Security groups → Group ID**. Without it
   the app reads memberships from Microsoft Graph instead.
4. In **Admin → Settings**, paste the admin and staff group Object IDs. Leave
   either blank to keep that role manual.
5. In **Admin → Classes**, paste the class group Object ID (or several,
   comma-separated) into **Entra group ID** and save.

On every sign-in the app reads the user's group memberships — from the ID token
`groups` claim when present, otherwise from Microsoft Graph `/me/memberOf` (the
delegated `User.Read` scope the provider already requests covers this, including
the group-overage case).

- **Roles:** membership in the admin group grants `admin`; the staff group grants
  `staff`. These rows are tagged `source = 'entra'`, so removing someone from the
  group removes the role at their next sign-in. Roles set by hand in
  **Admin → Users**, and `ADMIN_EMAILS`, are never removed.
- **Classes:** if one of the user's groups is mapped to an active class, their
  class is set (or moved) to it. If several mapped groups match, the first class
  by name wins. No match leaves the existing class alone, which keeps manual
  assignments for teachers and staff. A manual change in **Admin → Users** is
  overwritten at the next sign-in when a mapped group matches.

If Graph is unreachable, sign-in still succeeds and nothing is changed.

## Deploying to Railway

The repo includes `railway.json` and pins Node 24 in `.nvmrc`. Node 24 is
required for the built-in `node:sqlite` module used by the database layer.

### 1. Create the service

1. Create a Railway project from this repository.
2. Set the service root directory to the repository root, where
   `package.json` and `railway.json` live.
3. Add a volume and mount it at **`/data`**.
4. Keep the service at **one replica**. SQLite is a single-file database and
   must not be shared between multiple instances.

### 2. Set variables

Use the Railway dashboard to add the variables from `.env.example`. At minimum:

| Variable | Production value |
| --- | --- |
| `DATABASE_PATH` | `/data/app.db` |
| `AUTH_SECRET` | output of `npx auth secret` |
| `AUTH_URL` | `https://<your-domain>` |
| `AUTH_TRUST_HOST` | `true` |
| `ADMIN_EMAILS` | your school email (comma-separated for multiple) |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Entra application client ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Entra client secret |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | `https://login.microsoftonline.com/<tenant-id>/v2.0` |

### 3. Configure callback URLs

- Entra ID redirect URI: `https://<your-domain>/api/auth/callback`
  (`auth.config.ts` sends this short URI in the authorization and token
  requests; a route forwards it onto Auth.js's internal
  `/api/auth/callback/microsoft-entra-id` path).

### 4. Deploy

Railway runs `npm run build`, then `npm start`. The start script binds to
`0.0.0.0` and respects Railway's `PORT`; health checks use `/api/health`.
The database schema is created automatically in `/data/app.db` on first use.

After the deploy, sign in with an `ADMIN_EMAILS` account and finish setup in
**Admin → Classes**, **Admin → Users**, and **Admin → Schedule**.

### Data and backups

The SQLite database lives at `DATABASE_PATH` (default `./data/app.db`; use
`/data/app.db` on Railway). It is **not** committed to git, so adding commits
never touches or resets it. A fresh clone simply creates an empty database on
first run.

Back up the database file before redeploying or changing services. In
production, mount a Railway volume at `/data` and set `DATABASE_PATH=/data/app.db`;
without the volume, the filesystem is ephemeral and the database is recreated
on every deploy.

If your data ever looks like it reset, check these first:

1. The volume is mounted at `/data` and `DATABASE_PATH=/data/app.db`.
2. You are not pointing at a second `app.db` (the default is relative to the
   current working directory).
3. The schema migrates in place — `ensureColumn` keeps older databases working,
   so a new release will not drop tables.

The volume is the only persistent part of the deployment. Back up `/data/app.db`
(and any `-wal` / `-shm` files alongside it) before redeploying or changing
services.

Do not scale the service past one replica. If you outgrow SQLite, move the data
layer to Postgres; the database code is isolated under `lib/db/`.


## Project layout

```text
app/
  actions/            server actions (cart, checkout, staff, admin)
  admin/              classes, categories, schedule, users, orders, roles, settings
  cart, checkout      ordering flow
  menu, orders        customer pages (receipts at orders/[id]/receipt)
  staff/              delivery queue, pick lists, products, inventory, history
lib/
  auth.ts             session resolution and role guards
  db/                 schema, migrations, and queries
  money.ts            cent formatting and parsing
  permissions.ts      role → capability map for Admin → Roles & access
  time.ts             timezone and window helpers
components/snack/     feature UI
```

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm start          # production server
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

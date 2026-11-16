<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Products live in the database `products` table; `src/lib/products.ts` holds the row→card mapping (`rowToProduct`), filter logic and formatting helpers; UI components in `src/components/dashboard/` only render — keeps filter rules unit-testable (`src/lib/products.test.ts`).
- The app is dark-only: dark palette lives directly on `:root` in `src/styles.css` and `<html>` carries `dark`; there is no theme toggle.
- Shared top navigation and the toast container live in `src/routes/__root.tsx` around `<Outlet />`; pages are separate routes (`/` landing, `/explorar` dashboard under `_authenticated/`, `/precios`, `/auth`, `/reset-password`) so each has its own head metadata.
- Plan names, prices and limits live in `src/lib/plans.ts` (tested in `src/lib/plans.test.ts`); pricing UI only renders them.

- Plan limits are enforced in the database (`get_dashboard_products`, `set_my_country` SECURITY DEFINER functions, column grants + guard trigger on `profiles`); `getAccess()` in `src/lib/plans.ts` only mirrors them for the UI — never trust the client for plan gating.
- Admin status lives in `user_roles` (`has_role`), never as a column on `profiles` — prevents self-promotion via profile updates.
- One auth listener: `AuthProvider` in `src/hooks/use-auth.tsx` (mounted in `__root`) owns session state and router/query invalidation; account + dashboard queries live in `src/lib/account.ts`.
- Product photos are served from `public/products/` and referenced by `imagen_url` paths — public storage buckets are blocked on this workspace.

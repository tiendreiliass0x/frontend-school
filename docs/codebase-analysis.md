# Codebase Analysis and Improvement Opportunities

## 1. Architectural Overview
- **Framework & Tooling**: The project is a Next.js App Router application with client-side rendering for most dashboard views. It relies on Tailwind utility classes, a custom component library inspired by shadcn/ui, and a small set of context/hooks for shared state. 【F:src/app/layout.tsx†L1-L41】
- **State & Data**: Authentication is managed via a custom `AuthProvider` that stores tokens in `localStorage` and exposes user data to client components. Data fetching layers are implemented manually through `apiClient`, `useApi`, and a bespoke in-memory cache. 【F:src/contexts/AuthContext.tsx†L1-L59】【F:src/hooks/useApi.ts†L1-L120】【F:src/hooks/useCache.ts†L1-L157】
- **API Surface**: `src/lib/api.ts` wraps REST endpoints with explicit request methods, custom error classes, interceptors, and retry logic. Domain models live in `src/lib/types.ts`. 【F:src/lib/api.ts†L1-L211】【F:src/lib/api.ts†L212-L424】【F:src/lib/types.ts†L1-L84】
- **UI Layer**: Dashboard pages combine bespoke business logic with card/grid layouts, while form controls reuse the design system components under `src/components/ui`. Loading states and error boundaries are provided by shared components. 【F:src/app/dashboard/assignments/page.tsx†L1-L160】【F:src/components/Loading.tsx†L1-L111】【F:src/components/ui/button.tsx†L1-L120】

## 2. Strengths
- **Typed API wrappers** centralize endpoint definitions and enforce domain models, reducing accidental shape mismatches when used correctly. 【F:src/lib/api.ts†L212-L424】【F:src/lib/types.ts†L1-L84】
- **Reusable UI primitives** (button, card, input, etc.) follow consistent styling and offer a clear path to expanding the design system. 【F:src/components/ui/button.tsx†L1-L120】【F:src/components/ui/card.tsx†L1-L86】
- **Extensible caching layer** supports TTL configuration, stale-while-revalidate behavior, and pattern-based invalidation for optimistic mutations. 【F:src/hooks/useCache.ts†L1-L157】【F:src/hooks/useApi.ts†L81-L150】

## 3. Key Risks and Issues
### 3.1 Data Integrity & Auth
- **Profile shape mismatch**: `AuthProvider` expects `apiClient.getProfile` to return `{ user: User }`, but the client method resolves to `User`. This causes `user` to become `undefined` after refresh and prevents automatic session restoration. 【F:src/contexts/AuthContext.tsx†L17-L47】【F:src/lib/api.ts†L133-L166】
- **Token shadowing in cache keys**: Generic `useApi` composes cache keys from `endpoint-token`, but callers that append query strings themselves (e.g., `/api/users?foo=bar`) can collide when the token changes yet the string remains cached. Consider incorporating explicit params and auth context into the key. 【F:src/hooks/useApi.ts†L44-L94】
- **Redundant role filtering**: Several pages (classes, assignments, dashboard) re-implement authorization checks client-side without guarding the routes server-side, making the UI fragile if the context fails to hydrate. 【F:src/app/dashboard/page.tsx†L12-L105】【F:src/app/dashboard/classes/page.tsx†L1-L160】

### 3.2 Error Handling & UX
- **Toast storms for validation errors**: `processApiError` emits a toast for every individual field error, overwhelming users on large forms. Aggregate messaging with a single summary would improve usability. 【F:src/hooks/useApi.ts†L151-L214】
- **Generic fallback copy**: Many dashboard cards show hard-coded zero counts or placeholder text even when requests fail, masking outages instead of surfacing actionable information. 【F:src/app/dashboard/page.tsx†L12-L105】
- **Error boundary gaps**: Only some dashboard pages wrap content with `ErrorBoundary`, leaving others to crash outright on rendering errors. Standardizing error boundaries at the layout level would improve resilience. 【F:src/app/dashboard/assignments/page.tsx†L98-L160】【F:src/app/dashboard/page.tsx†L1-L120】

### 3.3 Caching & Data Fetching
- **Manual cache invalidation**: Mutations rely on regex pattern invalidation, which is brittle and easy to misconfigure. Without naming conventions, cache entries for `/api/classes?page=1` and `/api/classes?page=2` share patterns that might invalidate unintended data. 【F:src/hooks/useCache.ts†L1-L157】【F:src/hooks/useApi.ts†L81-L150】
- **Lack of suspense/in-flight deduping**: Every `useEffect` fetch creates new requests even when multiple components need the same resource, because the cache fetcher aborts previous calls but does not share promises. Introducing request coalescing or adopting React Query would save bandwidth. 【F:src/hooks/useCache.ts†L34-L118】
- **Missing refresh on focus**: The cache never revalidates on window focus or network recovery, so dashboards can display stale information indefinitely. 【F:src/hooks/useCache.ts†L60-L157】

### 3.4 Code Quality & Maintainability
- **Duplicated domain types**: Pages like `dashboard/assignments` redeclare `Assignment` and `Grade` instead of importing from `src/lib/types.ts`, increasing drift risk. 【F:src/app/dashboard/assignments/page.tsx†L13-L36】【F:src/lib/types.ts†L33-L76】
- **Implicit any-style responses**: Several `apiClient` methods promise wrapper objects (`{ assignments: Assignment[] }`) but downstream code only needs arrays. Harmonizing return shapes with domain models would simplify components and reduce optional chaining. 【F:src/lib/api.ts†L212-L424】【F:src/app/dashboard/assignments/page.tsx†L38-L77】
- **Comment drift**: `useApiMutation` advertises "optimistic updates" but only triggers toasts and invalidations, confusing future maintainers. 【F:src/hooks/useApi.ts†L101-L150】
- **Legacy README**: The project documentation still mirrors the default Next.js template and lacks instructions for environment variables, linting, or data mocking. 【F:README.md†L1-L31】

### 3.5 Testing & Tooling
- **No automated tests**: There is no unit or integration test coverage for hooks, API client logic, or UI components. Critical code paths such as retry logic and error categorization remain unverified. 【F:package.json†L1-L39】【F:src/hooks/useApi.ts†L151-L214】
- **Linting instability**: The `npm run lint` script currently fails on legacy files, preventing CI enforcement. Establishing a baseline (e.g., using ESLint `--max-warnings` with gradual cleanup) would restore confidence. 【F:package.json†L1-L39】

## 4. Recommended Improvements
### 4.1 High Priority
1. **Fix authentication bootstrap** by aligning `getProfile` to return `{ user }` or updating the context to accept raw `User`. This unblocks automatic session restoration. 【F:src/contexts/AuthContext.tsx†L17-L47】【F:src/lib/api.ts†L133-L166】
2. **Normalize API response shapes** (e.g., `getAssignments` => `Assignment[]`) and update consumers to import shared types, eliminating redundant interfaces and `?.` checks. 【F:src/lib/api.ts†L212-L424】【F:src/app/dashboard/assignments/page.tsx†L13-L77】
3. **Consolidate error messaging** so validation toasts surface a single summary with contextual details rather than spamming separate notifications. 【F:src/hooks/useApi.ts†L151-L214】

### 4.2 Medium Priority
1. **Replace bespoke cache with React Query** (already installed) to gain request deduplication, stale-while-revalidate, and focus refetch for free. This would also simplify invalidation after mutations. 【F:package.json†L1-L39】【F:src/hooks/useCache.ts†L1-L157】
2. **Add route-level error boundaries and loading UI** via Next.js `error.tsx`/`loading.tsx` files to standardize UX across dashboard sections. 【F:src/app/dashboard/assignments/page.tsx†L98-L160】【F:src/components/Loading.tsx†L1-L111】
3. **Document environment setup** in the README, covering API base URL configuration and the lint/test workflow to improve onboarding. 【F:README.md†L1-L31】

### 4.3 Long Term
1. **Introduce automated tests** starting with the API client (retry logic, error parsing) and hooks (`processApiError`, cache invalidation). Pair with MSW-backed integration tests for dashboard pages. 【F:src/lib/api.ts†L60-L211】【F:src/hooks/useApi.ts†L151-L214】
2. **Establish design tokens** for repeated Tailwind color choices and spacing so that layout changes propagate consistently through the UI layer. 【F:src/app/dashboard/page.tsx†L37-L120】【F:src/components/ui/button.tsx†L1-L120】
3. **Implement granular authorization** (server-side route guards or middleware) to prevent unauthorized access before React renders, reducing flicker and security risk. 【F:src/app/dashboard/page.tsx†L12-L105】【F:src/contexts/AuthContext.tsx†L1-L59】

## 5. Quick Wins Checklist
- [x] Align profile response shape
- [x] Update README with project-specific guidance
- [x] DRY up domain models by importing shared types
- [x] Tone down validation toast spam
- [x] Add smoke tests for `processApiError`

## 6. Future Investigations
- Evaluate whether `apiClient` should expose interceptors publicly or if React Query’s `queryFn` wrappers suffice; current interceptor arrays are never populated. 【F:src/lib/api.ts†L60-L211】
- Consider moving sensitive operations (e.g., password change) to server actions to avoid bundling token-aware logic in the client. 【F:src/lib/api.ts†L167-L211】
- Audit Tailwind class names (`min-h-[16rem]`, etc.) for consistency and ensure design tokens cover responsive states. 【F:src/components/Loading.tsx†L99-L111】【F:src/app/dashboard/assignments/page.tsx†L82-L111】

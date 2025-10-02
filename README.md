# Frontend School Dashboard

A Next.js App Router frontend for managing schools, classes, assignments, and grades. The project uses Tailwind CSS utilities alongside shadcn/ui-inspired primitives for consistent styling.

## Prerequisites
- Node.js 18 or later
- npm 9+

## Environment Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file at the project root and configure the API base URL:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
   Adjust the URL to point at your backend service.
3. Start the development server:
   ```bash
   npm run dev
   ```
   The app is served at [http://localhost:3000](http://localhost:3000).

## Available Scripts
- `npm run dev` – start the development server with Turbopack.
- `npm run build` – generate an optimized production build.
- `npm run start` – serve the production build.
- `npm run lint` – run ESLint across the project.
- `npm run test` – execute the Vitest suite (see `src/lib/__tests__`).

## Linting & Testing Workflow
1. Run `npm run lint` to verify TypeScript, accessibility, and best-practices rules.
2. Run `npm run test` to exercise critical helpers such as API error handling.
3. Address any reported issues before opening a pull request.

## Project Structure
- `src/app` – Next.js routes and pages.
- `src/components` – shared UI primitives and layout utilities.
- `src/lib` – API client, domain types, and supporting helpers.
- `src/contexts` – React context providers (e.g., authentication).
- `src/hooks` – custom hooks for data access and caching utilities.

## Additional Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

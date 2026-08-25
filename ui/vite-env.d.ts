/**
 * Vite's ambient client types. Both shells are Vite builds, so `import.meta.env`
 * is real at runtime in each of them — but nothing in the program referenced
 * these typings, so `npx tsc --noEmit` failed on the first use of it
 * (`import.meta.env.BASE_URL`, the Ko-fi asset path in `composer.tsx`).
 *
 * A reference file rather than a `types` array in `tsconfig.json`: setting
 * `types` switches off automatic `@types/*` inclusion for the whole program,
 * which would silently drop `@types/node` from the Vite config files.
 */
/// <reference types="vite/client" />

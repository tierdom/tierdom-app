import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    expect: { requireAssertions: true },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 98,
        branches: 93,
        functions: 98,
        lines: 98,
      },
      // Anything in `src/**/*.ts` outside the exclude list is expected to
      // have unit tests. New 0% files in the report = a conscious decision
      // to make: write tests, or add the file here with a reason.
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.svelte',
        'src/**/*.svelte.ts',
        'src/**/*.test.ts',
        'src/routes/**',
        'src/hooks.server.ts',
        'src/app.d.ts',
        'src/lib/server/db/schema.ts',
        'src/lib/server/db/index.ts',
        'src/lib/server/db/init.ts',
        // Sharp-based image pipeline; exercised by E2E (deterministic seed
        // images + admin upload flow), hard to unit-test meaningfully.
        'src/lib/server/generate-image.ts',
        'src/lib/server/db/seed-images.ts',
        // CLI entrypoint, not a module; run via `npm run db:seed` and
        // exercised by `test:e2e:reset`.
        'src/lib/server/db/seed.ts',
        // Type-only module — emits no runtime code, so the v8 provider
        // reports it as 0/0/0/0 and drags the average down.
        'src/lib/components/admin/import/phase.ts',
      ],
    },
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        },
      },
    ],
  },
});

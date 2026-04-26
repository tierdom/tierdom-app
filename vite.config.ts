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
        'src/lib/server/db/init.ts'
      ]
    },
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
        }
      }
    ]
  }
});

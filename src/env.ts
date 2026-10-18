import { defineEnvVars } from '@sveltejs/kit/env';

// Read at app start, not inlined at build time (`static` defaults to false).
export const variables = defineEnvVars({
  DATA_PATH: { schema: (input) => input },
  ADMIN_PASSWORD: { schema: (input) => input },
  ADMIN_USERNAME: { schema: (input) => input },
});

import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: { adapter: adapter({ bodyParser: { maxSize: 1024 * 1024 } }) },
  vitePlugin: {
    // Force runes mode for project files; leave node_modules in legacy.
    // Done via dynamicCompileOptions (per Svelte docs) rather than a function
    // in compilerOptions.runes — the function form can't be statically read by
    // svelte-eslint-parser, which silently disables runes-aware lint rules.
    // Removable in Svelte 6, where runes will be the default.
    dynamicCompileOptions({ filename, compileOptions }) {
      if (filename.includes('node_modules')) return;
      if (compileOptions.runes === undefined) return { runes: true };
    },
  },
};

export default config;

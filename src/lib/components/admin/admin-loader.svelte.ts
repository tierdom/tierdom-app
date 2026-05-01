import { enhance as kitEnhance } from '$app/forms';

export function createAdminLoader() {
  let loading = $state(false);
  let error = $state<string | null>(null);

  function enhance(form: HTMLFormElement) {
    return kitEnhance(form, () => {
      loading = true;
      error = null;
      return async ({ result, update }) => {
        if (result.type === 'failure' || result.type === 'error') {
          error =
            (result.type === 'failure' && (result.data as { error?: string })?.error) ||
            'Something went wrong';
        }
        await update();
        loading = false;
      };
    });
  }

  function withLoading<A extends unknown[], T>(fn: (...args: A) => Promise<T>) {
    return async (...args: A): Promise<T> => {
      loading = true;
      try {
        return await fn(...args);
      } finally {
        loading = false;
      }
    };
  }

  return {
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    enhance,
    withLoading,
  };
}

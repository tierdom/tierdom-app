import { enhance as kitEnhance } from '$app/forms';

export function createAdminLoader() {
	let loading = $state(false);

	function enhance(form: HTMLFormElement) {
		return kitEnhance(form, () => {
			loading = true;
			return async ({ update }) => {
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
		enhance,
		withLoading
	};
}

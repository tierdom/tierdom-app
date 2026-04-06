<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Login — tierdom</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<h1 class="mb-6 text-center text-xl font-bold text-primary">tierdom admin</h1>

		{#if form?.error}
			<p class="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
				{form.error}
			</p>
		{/if}

		<form method="POST" use:enhance class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<label for="username" class="text-xs font-medium text-secondary">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					value={form?.username ?? ''}
					required
					autocomplete="username"
					class="rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label for="password" class="text-xs font-medium text-secondary">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					autocomplete="current-password"
					class="rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				class="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
			>
				Sign in
			</button>
		</form>
	</div>
</div>

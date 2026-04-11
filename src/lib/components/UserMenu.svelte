<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { afterNavigate } from '$app/navigation';
	import { User, UserCheck } from 'lucide-svelte';

	type Props = {
		user: { id: string; username: string } | null;
	};

	let { user }: Props = $props();
	let open = $state(false);

	afterNavigate(() => {
		open = false;
	});

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-user-menu]')) {
			open = false;
		}
	}
</script>

<svelte:window onclick={open ? handleClickOutside : undefined} />

<div class="relative" data-user-menu>
	<button
		class="cursor-pointer rounded border p-1.5 transition-colors {user
			? 'border-accent text-accent'
			: 'border-subtle text-secondary hover:bg-surface hover:text-primary'}"
		aria-label={user ? `Signed in as ${user.username}` : 'Sign in'}
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		{#if user}
			<UserCheck size={14} />
		{:else}
			<User size={14} />
		{/if}
	</button>

	{#if open}
		<div class="absolute right-0 mt-2 w-48 rounded border border-subtle bg-elevated py-1 shadow-lg">
			{#if user}
				<p class="px-3 py-2 text-xs text-secondary">Signed in as {user.username}</p>
				<div class="border-t border-subtle"></div>
				<a
					href={resolve('/admin')}
					class="block px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface hover:text-primary"
				>
					Admin
				</a>
				<form method="POST" action="/admin/logout" use:enhance>
					<button
						type="submit"
						class="w-full cursor-pointer px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-surface hover:text-primary"
					>
						Sign out
					</button>
				</form>
			{:else}
				<a
					href={resolve('/admin/login')}
					class="block px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface hover:text-primary"
				>
					Sign in
				</a>
			{/if}
		</div>
	{/if}
</div>

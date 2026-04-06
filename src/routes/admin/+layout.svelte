<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { User } from 'lucide-svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const links = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/pages', label: 'Pages' },
		{ href: '/admin/categories', label: 'Categories' },
		{ href: '/admin/items', label: 'Items (all)' },
		{ href: '/admin/tags', label: 'Tags' }
	];
</script>

<nav class="-mx-4 border-b border-subtle bg-surface md:mx-0">
	<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
		<span class="hidden text-xs font-bold tracking-widest text-accent uppercase md:inline"
			>Admin</span
		>
		<div class="flex flex-1 flex-wrap items-center gap-1">
			{#each links as link (link.href)}
				<a
					href={resolve(link.href as '/')}
					class="rounded px-3 py-1 text-sm transition-colors {page.url.pathname === link.href
						? 'bg-elevated text-primary'
						: 'text-secondary hover:text-primary'}"
				>
					{link.label}
				</a>
			{/each}
		</div>
		{#if data.user}
			<div class="flex items-center gap-3">
				<span class="flex items-center gap-1 text-xs text-secondary" title="Currently signed in as">
					<User size={14} />
					{data.user.username}
				</span>
				<form method="POST" action="/admin/logout" use:enhance>
					<button
						type="submit"
						class="cursor-pointer rounded px-3 py-1 text-sm text-secondary transition-colors hover:text-primary"
					>
						Sign out
					</button>
				</form>
			</div>
		{/if}
	</div>
</nav>

<div class="py-6">
	{@render children()}
</div>

<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const links = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/pages', label: 'Pages' },
		{ href: '/admin/categories', label: 'Categories' },
		{ href: '/admin/items', label: 'Items (all)' },
		{ href: '/admin/tags', label: 'Tags' }
	];
</script>

<nav class="border-b border-subtle bg-surface">
	<div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
		<span class="text-xs font-bold tracking-widest text-accent uppercase">Admin</span>
		<div class="flex items-center gap-1">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="rounded px-3 py-1 text-sm transition-colors {page.url.pathname === link.href
						? 'bg-elevated text-primary'
						: 'text-secondary hover:text-primary'}"
				>
					{link.label}
				</a>
			{/each}
		</div>
		<a href="/" class="ml-auto text-xs text-secondary transition-colors hover:text-primary">
			Back to site
		</a>
	</div>
</nav>

<div class="py-6">
	{@render children()}
</div>

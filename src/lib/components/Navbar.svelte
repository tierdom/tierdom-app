<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { Pencil } from 'lucide-svelte';
	import NavLink from './NavLink.svelte';
	import MobileMenu from './MobileMenu.svelte';

	type Props = {
		categories: { id: number; slug: string; name: string }[];
	};

	let { categories }: Props = $props();
	let menuOpen = $state(false);

	const extraLinks: { href: string; label: string }[] = [
		{ href: '/about', label: 'About' },
		{ href: '/admin', label: 'Admin' }
	];

	// Close mobile menu on navigation
	afterNavigate(() => {
		menuOpen = false;
	});
</script>

<header class="fixed inset-x-0 top-0 z-50 border-b border-subtle bg-elevated/80 backdrop-blur-sm">
	<nav class="mx-auto flex h-14 max-w-6xl items-center px-4">
		<!-- Logo -->
		<a href={resolve('/')} class="shrink-0 transition-opacity hover:opacity-80" aria-label="Home">
			<img src="/favicon.png" alt="" class="h-8 w-8" />
		</a>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Desktop category links -->
		<ul class="hidden items-center gap-6 md:flex">
			{#each categories as cat (cat.id)}
				<li>
					<NavLink href={`/category/${cat.slug}`} label={cat.name} />
				</li>
			{/each}
		</ul>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Extra links (desktop) -->
		{#each extraLinks as link (link.href)}
			{#if link.href === '/admin'}
				<a
					href={resolve('/admin')}
					class="ml-4 hidden rounded border p-1.5 transition-colors md:inline-flex {page.url.pathname.startsWith('/admin')
						? 'border-accent text-accent'
						: 'border-subtle text-secondary hover:bg-surface hover:text-primary'}"
					aria-label="Admin"
					aria-current={page.url.pathname.startsWith('/admin') ? 'page' : undefined}
				>
					<Pencil size={14} />
				</a>
			{:else}
				<div class="hidden md:block">
					<NavLink href={link.href} label={link.label} />
				</div>
			{/if}
		{/each}

		<!-- Hamburger button (mobile) -->
		<button
			class="cursor-pointer p-2 text-secondary transition-colors hover:text-primary md:hidden"
			onclick={() => (menuOpen = !menuOpen)}
			aria-label="Toggle menu"
			aria-expanded={menuOpen}
		>
			<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				{#if menuOpen}
					<path d="M6 6l12 12M18 6L6 18" />
				{:else}
					<path d="M4 6h16M4 12h16M4 18h16" />
				{/if}
			</svg>
		</button>
	</nav>
</header>

<MobileMenu open={menuOpen} onclose={() => (menuOpen = false)} {categories} {extraLinks} />

<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { afterNavigate } from '$app/navigation';
	import { User, UserCheck } from 'lucide-svelte';
	import NavLink from './NavLink.svelte';
	import MobileMenu from './MobileMenu.svelte';

	type Props = {
		categories: { id: number; slug: string; name: string }[];
		user: { id: string; username: string } | null;
	};

	let { categories, user }: Props = $props();
	let menuOpen = $state(false);
	let userMenuOpen = $state(false);

	const extraLinks: { href: string; label: string }[] = [{ href: '/about', label: 'About' }];

	afterNavigate(() => {
		menuOpen = false;
		userMenuOpen = false;
	});

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-user-menu]')) {
			userMenuOpen = false;
		}
	}
</script>

<svelte:window onclick={userMenuOpen ? handleClickOutside : undefined} />

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
			<div class="hidden md:block">
				<NavLink href={link.href} label={link.label} />
			</div>
		{/each}

		<!-- User menu (desktop) -->
		<div class="relative ml-4 hidden md:block" data-user-menu>
			<button
				class="cursor-pointer rounded border p-1.5 transition-colors {user
					? 'border-accent text-accent'
					: 'border-subtle text-secondary hover:bg-surface hover:text-primary'}"
				aria-label={user ? `Signed in as ${user.username}` : 'Sign in'}
				aria-expanded={userMenuOpen}
				onclick={() => (userMenuOpen = !userMenuOpen)}
			>
				{#if user}
					<UserCheck size={14} />
				{:else}
					<User size={14} />
				{/if}
			</button>

			{#if userMenuOpen}
				<div
					class="absolute right-0 mt-2 w-48 rounded border border-subtle bg-elevated py-1 shadow-lg"
				>
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

<MobileMenu open={menuOpen} onclose={() => (menuOpen = false)} {categories} {extraLinks} {user} />

<script lang="ts">
	const pros = [
		{ feature: 'Data ownership', self: 'Full', proprietary: 'Theirs' },
		{ feature: 'Minimalist UI', self: 'Yes', proprietary: 'Varies' },
		{ feature: 'Uniform rankings', self: 'S–F everywhere', proprietary: 'Per-platform' },
		{ feature: 'Ad-free', self: 'Always', proprietary: 'Rarely' },
		{ feature: 'Custom categories', self: 'Unlimited', proprietary: 'Fixed' }
	];
</script>

<svelte:head>
	<title>About — tierdom</title>
</svelte:head>

<article class="mx-auto max-w-2xl py-12">
	<!-- Intro -->
	<h1 class="text-3xl font-extrabold text-primary">About tierdom</h1>
	<p class="mt-4 text-secondary leading-relaxed">
		Tierdom is a personal, self-hosted tier list application. Instead of scattering reviews and
		ratings across dozens of proprietary platforms, everything lives in one place — owned and
		controlled by me.
	</p>

	<!-- Why -->
	<h2 class="mt-12 text-xl font-bold text-primary">Why self-host?</h2>
	<p class="mt-3 text-secondary leading-relaxed">
		Review platforms like IMDB, Goodreads, and BoardGameGeek are great resources, but they each
		lock your data into their own silo with their own rating scale. Tierdom brings all of that
		together under a single, consistent system.
	</p>

	<!-- Comparison table -->
	<div class="mt-6 overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-subtle text-left text-xs uppercase tracking-wider text-secondary">
					<th class="py-2 pr-4 font-semibold">Feature</th>
					<th class="py-2 pr-4 font-semibold">Self-hosted</th>
					<th class="py-2 font-semibold">Proprietary</th>
				</tr>
			</thead>
			<tbody>
				{#each pros as row (row.feature)}
					<tr class="border-b border-subtle/50">
						<td class="py-2 pr-4 text-primary">{row.feature}</td>
						<td class="py-2 pr-4 text-accent">{row.self}</td>
						<td class="py-2 text-secondary">{row.proprietary}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Name origin -->
	<h2 class="mt-12 text-xl font-bold text-primary">What's in a name?</h2>
	<p class="mt-3 text-secondary leading-relaxed">
		<strong class="text-primary">Tierdom</strong> blends "tier" (as in tier lists) with "fiefdom"
		— a small, self-governed domain. It's a nod to the idea of owning your own little corner of
		the ranking world.
	</p>

	<!-- Creator -->
	<h2 class="mt-12 text-xl font-bold text-primary">Who made this?</h2>
	<p class="mt-3 text-secondary leading-relaxed">
		Tierdom is built and maintained by
		<a
			href="https://jeroenheijmans.nl"
			class="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:text-accent/80"
			target="_blank"
			rel="noopener noreferrer">Jeroen Heijmans</a
		>. It started as a small side project and grew into the thing you see here.
	</p>

	<!-- Open source -->
	<h2 class="mt-12 text-xl font-bold text-primary">Open source</h2>
	<p class="mt-3 text-secondary leading-relaxed">
		The source code is publicly available on
		<a
			href="https://github.com/jeroenheijmans/tierdom-pro"
			class="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:text-accent/80"
			target="_blank"
			rel="noopener noreferrer">GitHub</a
		>. Feel free to explore, fork, or draw inspiration for your own tier list project.
	</p>
</article>

export type SeedItem = { name: string; score: number; tags: string[]; description?: string };

export type SeedCategory = {
	slug: string;
	name: string;
	description: string;
	order: number;
	items: SeedItem[];
};

export const TAGS = [
	{ slug: 'classic', label: 'Classic' },
	{ slug: 'indie', label: 'Indie' },
	{ slug: 'masterpiece', label: 'Masterpiece' },
	{ slug: 'overrated', label: 'Overrated' },
	{ slug: 'hidden-gem', label: 'Hidden Gem' },
	{ slug: 'nostalgia', label: 'Nostalgia' },
	{ slug: 'sci-fi', label: 'Sci-Fi' },
	{ slug: 'fantasy', label: 'Fantasy' },
	{ slug: 'horror', label: 'Horror' },
	{ slug: 'comedy', label: 'Comedy' }
];

export const CATEGORIES: SeedCategory[] = [
	{
		slug: 'video-games',
		name: 'Video Games',
		description:
			"All the games I've ever played (as far as I can remember) ranked and stuffed into tiers. **Note:** this is what the games mean to me, and sometimes they may sit in a tier that could be considered '*too high*' if they are crap but were somehow special to me.",
		order: 0,
		items: [
			{
				name: 'Hollow Knight',
				score: 97,
				tags: ['indie', 'masterpiece', 'fantasy'],
				description:
					'A **masterclass** in metroidvania design. The atmosphere, the music, the challenge — everything clicks.\n\nTeam Cherry created something truly special with a tiny budget.'
			},
			{ name: 'The Witcher 3', score: 94, tags: ['masterpiece', 'fantasy'] },
			{
				name: 'Disco Elysium',
				score: 92,
				tags: ['indie', 'masterpiece'],
				description:
					'An RPG where *every skill is a voice in your head*. The writing is unmatched in games.\n\nNothing else plays like this.'
			},
			{ name: 'Hades', score: 91, tags: ['indie', 'masterpiece'] },
			{ name: 'Dark Souls', score: 88, tags: ['classic', 'masterpiece'] },
			{ name: 'Celeste', score: 86, tags: ['indie', 'hidden-gem'] },
			{ name: 'Red Dead Redemption 2', score: 85, tags: ['masterpiece'] },
			{ name: 'Elden Ring', score: 83, tags: ['fantasy'] },
			{ name: 'Stardew Valley', score: 82, tags: ['indie', 'hidden-gem'] },
			{ name: 'Outer Wilds', score: 80, tags: ['indie', 'hidden-gem', 'sci-fi'] },
			{ name: 'Divinity: Original Sin 2', score: 78, tags: ['fantasy'] },
			{ name: 'Sekiro', score: 76, tags: ['classic'] },
			{ name: 'Inside', score: 74, tags: ['indie', 'horror'] },
			{ name: 'Cuphead', score: 72, tags: ['indie', 'classic'] },
			{ name: 'Monster Hunter: World', score: 70, tags: ['classic'] },
			{ name: 'Dragon Age: Origins', score: 68, tags: ['nostalgia', 'fantasy'] },
			{ name: 'Subnautica', score: 65, tags: ['indie', 'sci-fi'] },
			{ name: 'Fallout: New Vegas', score: 63, tags: ['classic', 'nostalgia'] },
			{ name: 'The Talos Principle', score: 60, tags: ['sci-fi'] },
			{ name: 'A Short Hike', score: 58, tags: ['indie'] },
			{ name: 'Genshin Impact', score: 50, tags: ['overrated'] },
			{ name: "No Man's Sky (launch)", score: 40, tags: ['overrated', 'sci-fi'] },
			{ name: 'Forspoken', score: 32, tags: ['overrated'] },
			{ name: 'Redfall', score: 20, tags: ['overrated'] },
			{ name: 'Anthem', score: 10, tags: ['overrated'] }
		]
	},
	{
		slug: 'books',
		name: 'Books',
		description:
			'Fiction and non-fiction both. Sorted by how much the book actually *stuck with me* long after reading.\n\nHeavy on sci-fi and fantasy, with a few literary outliers.',
		order: 1,
		items: [
			{
				name: 'Blood Meridian',
				score: 96,
				tags: ['masterpiece', 'classic'],
				description:
					'McCarthy at his most **brutal and poetic**. The Judge is one of the greatest villains in all of literature.\n\nNot for the faint of heart.'
			},
			{ name: 'Infinite Jest', score: 93, tags: ['masterpiece', 'classic'] },
			{ name: 'The Road', score: 91, tags: ['masterpiece', 'horror'] },
			{
				name: 'Dune',
				score: 90,
				tags: ['masterpiece', 'sci-fi'],
				description:
					'The **definitive** science fiction epic. World-building that puts most fantasy to shame.\n\nHerbert created an entire universe of politics, religion, and ecology.'
			},
			{ name: 'Piranesi', score: 88, tags: ['hidden-gem', 'fantasy'] },
			{ name: 'The Name of the Wind', score: 85, tags: ['fantasy'] },
			{ name: 'Recursion', score: 83, tags: ['sci-fi'] },
			{ name: 'A Fire Upon the Deep', score: 81, tags: ['sci-fi', 'hidden-gem'] },
			{ name: 'Thinking, Fast and Slow', score: 79, tags: ['classic'] },
			{ name: 'The Lies of Locke Lamora', score: 77, tags: ['fantasy'] },
			{ name: 'All Systems Red', score: 75, tags: ['sci-fi', 'indie'] },
			{ name: 'Flowers for Algernon', score: 73, tags: ['classic', 'sci-fi'] },
			{ name: 'The Left Hand of Darkness', score: 71, tags: ['sci-fi', 'classic'] },
			{ name: 'The Poppy War', score: 68, tags: ['fantasy'] },
			{ name: 'Ready Player One', score: 55, tags: ['sci-fi', 'overrated'] },
			{ name: 'The Martian', score: 65, tags: ['sci-fi'] },
			{ name: 'Dark Matter (Crouch)', score: 62, tags: ['sci-fi'] },
			{ name: 'Six of Crows', score: 60, tags: ['fantasy'] },
			{ name: 'Eragon', score: 48, tags: ['fantasy', 'nostalgia'] },
			{ name: 'Divergent', score: 42, tags: ['overrated'] },
			{ name: 'Twilight', score: 35, tags: ['nostalgia', 'overrated'] },
			{ name: 'The Fault in Our Stars', score: 46, tags: ['overrated'] },
			{ name: 'Halo: The Fall of Reach', score: 50, tags: ['sci-fi', 'nostalgia'] },
			{ name: 'Bobiverse 1', score: 72, tags: ['sci-fi', 'comedy'] },
			{
				name: 'Sword of Truth: Wizards First Rule',
				score: 28,
				tags: ['fantasy', 'overrated']
			}
		]
	},
	{
		slug: 'movies',
		name: 'Movies',
		description:
			'Films ranked by **lasting impression** — not box office, not hype, just how they hold up on reflection.\n\nHeavy on horror and sci-fi; blockbusters need not apply.',
		order: 2,
		items: [
			{
				name: 'Annihilation',
				score: 95,
				tags: ['masterpiece', 'sci-fi', 'horror'],
				description:
					"Garland turned VanderMeer's *weird fiction* into something even stranger on screen. The Shimmer is **unforgettable**.\n\nThe bear scene alone earns it a spot in S-tier."
			},
			{
				name: '2001: A Space Odyssey',
				score: 93,
				tags: ['masterpiece', 'classic', 'sci-fi']
			},
			{ name: 'Stalker (1979)', score: 91, tags: ['masterpiece', 'classic', 'sci-fi'] },
			{
				name: 'The Thing (1982)',
				score: 90,
				tags: ['masterpiece', 'classic', 'horror']
			},
			{
				name: 'Blade Runner 2049',
				score: 88,
				tags: ['masterpiece', 'sci-fi'],
				description:
					"Villeneuve proved a *Blade Runner* sequel could work. Deakins' cinematography is **breathtaking**.\n\nSlow, meditative, and visually perfect."
			},
			{ name: 'Parasite', score: 86, tags: ['masterpiece'] },
			{ name: 'Arrival', score: 84, tags: ['sci-fi', 'masterpiece'] },
			{ name: 'Mad Max: Fury Road', score: 82, tags: ['classic'] },
			{ name: 'The Witch', score: 80, tags: ['horror', 'hidden-gem'] },
			{ name: 'Midsommar', score: 78, tags: ['horror'] },
			{ name: 'Under the Skin', score: 76, tags: ['sci-fi', 'hidden-gem'] },
			{ name: 'Get Out', score: 75, tags: ['horror'] },
			{ name: 'Ex Machina', score: 87, tags: ['sci-fi'] },
			{ name: 'Whiplash', score: 85, tags: ['masterpiece'] },
			{ name: 'The Prestige', score: 83, tags: ['classic'] },
			{ name: "Pan's Labyrinth", score: 81, tags: ['fantasy', 'horror'] },
			{ name: 'Sicario', score: 79, tags: ['classic'] },
			{ name: 'There Will Be Blood', score: 89, tags: ['masterpiece', 'classic'] },
			{ name: 'No Country for Old Men', score: 88, tags: ['masterpiece', 'classic'] },
			{ name: 'The Babadook', score: 77, tags: ['horror', 'indie'] },
			{ name: 'Color Out of Space', score: 76, tags: ['horror', 'sci-fi'] },
			{ name: 'It Follows', score: 75, tags: ['horror', 'indie'] },
			{ name: 'Coherence', score: 75, tags: ['sci-fi', 'indie', 'hidden-gem'] },
			{
				name: 'Everything Everywhere All at Once',
				score: 74,
				tags: ['indie']
			},
			{ name: 'Hereditary', score: 72, tags: ['horror'] },
			{ name: 'The Lighthouse', score: 70, tags: ['horror', 'indie'] },
			{ name: 'Dune: Part One', score: 68, tags: ['sci-fi'] },
			{ name: 'Interstellar', score: 63, tags: ['sci-fi', 'overrated'] },
			{ name: 'The Northman', score: 60, tags: ['indie'] },
			{ name: 'Mandy (2018)', score: 65, tags: ['horror', 'hidden-gem'] },
			{ name: 'The Menu', score: 67, tags: ['comedy', 'horror'] },
			{ name: 'The Banshees of Inisherin', score: 71, tags: ['comedy'] },
			{ name: 'Triangle of Sadness', score: 62, tags: ['comedy'] },
			{ name: 'Nope', score: 58, tags: ['sci-fi', 'horror'] },
			{
				name: 'Transformers: Age of Extinction',
				score: 12,
				tags: ['overrated']
			},
			{ name: 'Avatar (2009)', score: 45, tags: ['overrated', 'sci-fi'] },
			{ name: 'Cats (2019)', score: 5, tags: ['horror'] },
			{ name: 'Morbius', score: 18, tags: ['overrated'] },
			{ name: 'Venom (2018)', score: 38, tags: ['overrated', 'comedy'] },
			{ name: 'The Emoji Movie', score: 3, tags: ['comedy', 'overrated'] },
			{ name: 'Dragonball Evolution', score: 4, tags: ['overrated'] },
			{ name: 'Battlefield Earth', score: 2, tags: ['sci-fi', 'overrated'] },
			{ name: 'Movie 43', score: 6, tags: ['comedy', 'overrated'] },
			{ name: 'Disaster Movie', score: 1, tags: ['comedy', 'overrated'] },
			{ name: 'Epic Movie', score: 7, tags: ['comedy', 'overrated'] },
			{ name: 'The Last Airbender', score: 8, tags: ['fantasy', 'overrated'] },
			{ name: 'Birdemic', score: 3, tags: ['horror', 'comedy'] },
			{ name: 'Son of the Mask', score: 5, tags: ['comedy', 'overrated'] },
			{ name: 'Jaws: The Revenge', score: 9, tags: ['horror', 'overrated'] },
			{ name: 'Alone in the Dark (2005)', score: 6, tags: ['horror', 'overrated'] },
			{ name: 'Catwoman (2004)', score: 10, tags: ['overrated'] },
			{ name: 'Bloodshot', score: 11, tags: ['overrated', 'sci-fi'] },
			{ name: 'Left Behind (2014)', score: 4, tags: ['overrated'] }
		]
	},
	{
		slug: 'board-games',
		name: 'Board Games',
		description:
			'A small but growing collection of **tabletop games** ranked by replayability and fun factor.\n\nOnly the ones that actually hit the table more than once.',
		order: 3,
		items: [
			{ name: 'Gloomhaven', score: 95, tags: ['masterpiece', 'fantasy'] },
			{ name: 'Spirit Island', score: 92, tags: ['indie', 'hidden-gem'] },
			{ name: 'Catan', score: 48, tags: ['classic', 'nostalgia', 'overrated'] },
			{ name: 'Pandemic', score: 42, tags: ['classic'] },
			{ name: 'Exploding Kittens', score: 25, tags: ['comedy', 'overrated'] }
		]
	},
	{
		slug: 'recipes',
		name: 'Recipes',
		description: 'Recipes I have tried, ranked by taste and effort. *Coming soon.*',
		order: 4,
		items: []
	}
];

export const PAGES = [
	{
		slug: 'home',
		title: 'Home',
		content: `# My personal **Tierdom**

My personal list of lists: how I rank all sorts of things, along with small reviews. Divided into _tiers_. Have a look around!`
	},
	{
		slug: 'about',
		title: 'About tierdom',
		content: `**Tierdom** is a personal, self-hosted tier list application. Instead of scattering reviews and ratings across dozens of proprietary platforms, everything lives in one place, owned and controlled by yours truly.

## Why self-host?

Review platforms like IMDB, Goodreads, and BoardGameGeek are great resources, but they each lock your data into their own silo with their own rating scale. Tierdom brings all of that together under a single, consistent system.

|                               | Proprietary Apps | Self-hosted    |
| ----------------------------- | ---------------- | -------------- |
| Can show lists                | ✅               | ✅             |
| Feature rich                  | ✅               | ❌             |
| Minimalistic UI               | ❌               | ✅             |
| Uniform UI across lists       | ❌               | ✅             |
| Own your words (e.g. reviews) | ❌               | ✅             |
| Own your data (the lists)     | ❌               | ✅             |
| Solution rating :-)           | 😐 55 / 100 😐   | 🤩 90 / 100 🤩 |

## What is a "Tier List"?

It's a way to rank items in a list. Items in the same "Tier" ("rank") are normally considered equal. However, at tierdom, within tiers items are also ranked. The tiers are based of the US grading system with letters (with an "S" added at the top).

## Open source

The source code is publicly available on [GitHub](https://github.com/tierdom/tierdom-app).`
	}
];

export type SeedItem = { name: string; score: number; description?: string };

export type SeedCategory = {
  slug: string;
  name: string;
  description: string;
  order: number;
  items: SeedItem[];
};

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
        description:
          'A **masterclass** in metroidvania design. The atmosphere, the music, the challenge — everything clicks.\n\nTeam Cherry created something truly special with a tiny budget.'
      },
      { name: 'The Witcher 3', score: 94 },
      {
        name: 'Disco Elysium',
        score: 92,
        description:
          'An RPG where *every skill is a voice in your head*. The writing is unmatched in games.\n\nNothing else plays like this.'
      },
      { name: 'Hades', score: 91 },
      { name: 'Dark Souls', score: 88 },
      { name: 'Celeste', score: 86 },
      { name: 'Red Dead Redemption 2', score: 85 },
      { name: 'Elden Ring', score: 83 },
      { name: 'Stardew Valley', score: 82 },
      { name: 'Outer Wilds', score: 80 },
      { name: 'Divinity: Original Sin 2', score: 78 },
      { name: 'Sekiro', score: 76 },
      { name: 'Inside', score: 74 },
      { name: 'Cuphead', score: 72 },
      { name: 'Monster Hunter: World', score: 70 },
      { name: 'Dragon Age: Origins', score: 68 },
      { name: 'Subnautica', score: 65 },
      { name: 'Fallout: New Vegas', score: 63 },
      { name: 'The Talos Principle', score: 60 },
      { name: 'A Short Hike', score: 58 },
      { name: 'Genshin Impact', score: 50 },
      { name: "No Man's Sky (launch)", score: 40 },
      { name: 'Forspoken', score: 32 },
      { name: 'Redfall', score: 20 },
      { name: 'Anthem', score: 10 }
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
        description:
          'McCarthy at his most **brutal and poetic**. The Judge is one of the greatest villains in all of literature.\n\nNot for the faint of heart.'
      },
      { name: 'Infinite Jest', score: 93 },
      { name: 'The Road', score: 91 },
      {
        name: 'Dune',
        score: 90,
        description:
          'The **definitive** science fiction epic. World-building that puts most fantasy to shame.\n\nHerbert created an entire universe of politics, religion, and ecology.'
      },
      { name: 'Piranesi', score: 88 },
      { name: 'The Name of the Wind', score: 85 },
      { name: 'Recursion', score: 83 },
      { name: 'A Fire Upon the Deep', score: 81 },
      { name: 'Thinking, Fast and Slow', score: 79 },
      { name: 'The Lies of Locke Lamora', score: 77 },
      { name: 'All Systems Red', score: 75 },
      { name: 'Flowers for Algernon', score: 73 },
      { name: 'The Left Hand of Darkness', score: 71 },
      { name: 'The Poppy War', score: 68 },
      { name: 'Ready Player One', score: 55 },
      { name: 'The Martian', score: 65 },
      { name: 'Dark Matter (Crouch)', score: 62 },
      { name: 'Six of Crows', score: 60 },
      { name: 'Eragon', score: 48 },
      { name: 'Divergent', score: 42 },
      { name: 'Twilight', score: 35 },
      { name: 'The Fault in Our Stars', score: 46 },
      { name: 'Halo: The Fall of Reach', score: 50 },
      { name: 'Bobiverse 1', score: 72 },
      {
        name: 'Sword of Truth: Wizards First Rule',
        score: 28
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
        description:
          "Garland turned VanderMeer's *weird fiction* into something even stranger on screen. The Shimmer is **unforgettable**.\n\nThe bear scene alone earns it a spot in S-tier."
      },
      {
        name: '2001: A Space Odyssey',
        score: 93
      },
      { name: 'Stalker (1979)', score: 91 },
      {
        name: 'The Thing (1982)',
        score: 90
      },
      {
        name: 'Blade Runner 2049',
        score: 88,
        description:
          "Villeneuve proved a *Blade Runner* sequel could work. Deakins' cinematography is **breathtaking**.\n\nSlow, meditative, and visually perfect."
      },
      { name: 'Parasite', score: 86 },
      { name: 'Arrival', score: 84 },
      { name: 'Mad Max: Fury Road', score: 82 },
      { name: 'The Witch', score: 80 },
      { name: 'Midsommar', score: 78 },
      { name: 'Under the Skin', score: 76 },
      { name: 'Get Out', score: 75 },
      { name: 'Ex Machina', score: 87 },
      { name: 'Whiplash', score: 85 },
      { name: 'The Prestige', score: 83 },
      { name: "Pan's Labyrinth", score: 81 },
      { name: 'Sicario', score: 79 },
      { name: 'There Will Be Blood', score: 89 },
      { name: 'No Country for Old Men', score: 88 },
      { name: 'The Babadook', score: 77 },
      { name: 'Color Out of Space', score: 76 },
      { name: 'It Follows', score: 75 },
      { name: 'Coherence', score: 75 },
      {
        name: 'Everything Everywhere All at Once',
        score: 74
      },
      { name: 'Hereditary', score: 72 },
      { name: 'The Lighthouse', score: 70 },
      { name: 'Dune: Part One', score: 68 },
      { name: 'Interstellar', score: 63 },
      { name: 'The Northman', score: 60 },
      { name: 'Mandy (2018)', score: 65 },
      { name: 'The Menu', score: 67 },
      { name: 'The Banshees of Inisherin', score: 71 },
      { name: 'Triangle of Sadness', score: 62 },
      { name: 'Nope', score: 58 },
      {
        name: 'Transformers: Age of Extinction',
        score: 12
      },
      { name: 'Avatar (2009)', score: 45 },
      { name: 'Cats (2019)', score: 5 },
      { name: 'Morbius', score: 18 },
      { name: 'Venom (2018)', score: 38 },
      { name: 'The Emoji Movie', score: 3 },
      { name: 'Dragonball Evolution', score: 4 },
      { name: 'Battlefield Earth', score: 2 },
      { name: 'Movie 43', score: 6 },
      { name: 'Disaster Movie', score: 1 },
      { name: 'Epic Movie', score: 7 },
      { name: 'The Last Airbender', score: 8 },
      { name: 'Birdemic', score: 3 },
      { name: 'Son of the Mask', score: 5 },
      { name: 'Jaws: The Revenge', score: 9 },
      { name: 'Alone in the Dark (2005)', score: 6 },
      { name: 'Catwoman (2004)', score: 10 },
      { name: 'Bloodshot', score: 11 },
      { name: 'Left Behind (2014)', score: 4 }
    ]
  },
  {
    slug: 'board-games',
    name: 'Board Games',
    description:
      'A small but growing collection of **tabletop games** ranked by replayability and fun factor.\n\nOnly the ones that actually hit the table more than once.',
    order: 3,
    items: [
      { name: 'Gloomhaven', score: 95 },
      { name: 'Spirit Island', score: 92 },
      { name: 'Catan', score: 48 },
      { name: 'Pandemic', score: 42 },
      { name: 'Exploding Kittens', score: 25 }
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

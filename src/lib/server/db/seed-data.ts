import type { Prop, PropKeyConfig } from '$lib/props';

export type SeedItem = { name: string; score: number; props: Prop[]; description?: string };

export type SeedCategory = {
  slug: string;
  name: string;
  description: string;
  order: number;
  propKeys?: PropKeyConfig[];
  items: SeedItem[];
};

const p = (key: string, value: string): Prop => ({ key, value });

export const CATEGORIES: SeedCategory[] = [
  {
    slug: 'video-games',
    name: 'Video Games',
    description:
      "All the games I've ever played (as far as I can remember) ranked and stuffed into tiers. **Note:** this is what the games mean to me, and sometimes they may sit in a tier that could be considered '*too high*' if they are crap but were somehow special to me.",
    order: 0,
    propKeys: [{ key: 'Platform', iconSet: 'gaming-platforms', showOnCard: true }],
    items: [
      {
        name: 'Hollow Knight',
        score: 97,
        props: [p('Platform', 'PC')],
        description:
          'A **masterclass** in metroidvania design. The atmosphere, the music, the challenge — everything clicks.\n\nTeam Cherry created something truly special with a tiny budget.',
      },
      { name: 'The Witcher 3', score: 94, props: [p('Platform', 'PC')] },
      {
        name: 'Disco Elysium',
        score: 92,
        props: [p('Platform', 'PC')],
        description:
          'An RPG where *every skill is a voice in your head*. The writing is unmatched in games.\n\nNothing else plays like this.',
      },
      { name: 'Hades', score: 91, props: [p('Platform', 'PC')] },
      { name: 'Dark Souls', score: 88, props: [p('Platform', 'PS3')] },
      { name: 'Celeste', score: 86, props: [p('Platform', 'Switch')] },
      { name: 'Red Dead Redemption 2', score: 85, props: [p('Platform', 'PS4')] },
      { name: 'Elden Ring', score: 83, props: [p('Platform', 'PC')] },
      { name: 'Stardew Valley', score: 82, props: [p('Platform', 'PC')] },
      { name: 'Outer Wilds', score: 80, props: [p('Platform', 'PC')] },
      { name: 'Divinity: Original Sin 2', score: 78, props: [p('Platform', 'PC')] },
      { name: 'Sekiro', score: 76, props: [p('Platform', 'PC')] },
      { name: 'Inside', score: 74, props: [p('Platform', 'PC')] },
      { name: 'Cuphead', score: 72, props: [p('Platform', 'PC')] },
      { name: 'Monster Hunter: World', score: 70, props: [p('Platform', 'PC')] },
      { name: 'Dragon Age: Origins', score: 68, props: [p('Platform', 'PC')] },
      { name: 'Subnautica', score: 65, props: [p('Platform', 'PC')] },
      { name: 'Fallout: New Vegas', score: 63, props: [p('Platform', 'PC')] },
      { name: 'The Talos Principle', score: 60, props: [p('Platform', 'PC')] },
      { name: 'A Short Hike', score: 58, props: [p('Platform', 'PC')] },
      { name: 'Genshin Impact', score: 50, props: [p('Platform', 'PC')] },
      { name: "No Man's Sky (launch)", score: 40, props: [p('Platform', 'PS4')] },
      { name: 'Forspoken', score: 32, props: [p('Platform', 'PS5')] },
      { name: 'Redfall', score: 20, props: [p('Platform', 'Xbox Series S/X')] },
      { name: 'Anthem', score: 10, props: [p('Platform', 'PC')] },
    ],
  },
  {
    slug: 'books',
    name: 'Books',
    description:
      'Fiction and non-fiction both. Sorted by how much the book actually *stuck with me* long after reading.\n\nHeavy on sci-fi and fantasy, with a few literary outliers.',
    order: 1,
    propKeys: [{ key: 'Year', showOnCard: true }, { key: 'ISBN' }],
    items: [
      {
        name: 'Blood Meridian',
        score: 96,
        props: [p('Year', '1985'), p('ISBN', '978-0679728757')],
        description:
          'McCarthy at his most **brutal and poetic**. The Judge is one of the greatest villains in all of literature.\n\nNot for the faint of heart.',
      },
      { name: 'Infinite Jest', score: 93, props: [p('Year', '1996'), p('ISBN', '978-0316066525')] },
      { name: 'The Road', score: 91, props: [p('Year', '2006'), p('ISBN', '978-0307387899')] },
      {
        name: 'Dune',
        score: 90,
        props: [p('Year', '1965'), p('ISBN', '978-0441013593')],
        description:
          'The **definitive** science fiction epic. World-building that puts most fantasy to shame.\n\nHerbert created an entire universe of politics, religion, and ecology.',
      },
      { name: 'Piranesi', score: 88, props: [p('Year', '2020'), p('ISBN', '978-1635575941')] },
      {
        name: 'The Name of the Wind',
        score: 85,
        props: [p('Year', '2007'), p('ISBN', '978-0756404741')],
      },
      { name: 'Recursion', score: 83, props: [p('Year', '2019'), p('ISBN', '978-1524759780')] },
      {
        name: 'A Fire Upon the Deep',
        score: 81,
        props: [p('Year', '1992'), p('ISBN', '978-0812515282')],
      },
      {
        name: 'Thinking, Fast and Slow',
        score: 79,
        props: [p('Year', '2011'), p('ISBN', '978-0374533557')],
      },
      {
        name: 'The Lies of Locke Lamora',
        score: 77,
        props: [p('Year', '2006'), p('ISBN', '978-0553588941')],
      },
      {
        name: 'All Systems Red',
        score: 75,
        props: [p('Year', '2017'), p('ISBN', '978-0765397539')],
      },
      {
        name: 'Flowers for Algernon',
        score: 73,
        props: [p('Year', '1966'), p('ISBN', '978-0156030083')],
      },
      {
        name: 'The Left Hand of Darkness',
        score: 71,
        props: [p('Year', '1969'), p('ISBN', '978-0441478125')],
      },
      { name: 'The Poppy War', score: 68, props: [p('Year', '2018'), p('ISBN', '978-0062662569')] },
      {
        name: 'Ready Player One',
        score: 55,
        props: [p('Year', '2011'), p('ISBN', '978-0307887443')],
      },
      { name: 'The Martian', score: 65, props: [p('Year', '2011'), p('ISBN', '978-0553418026')] },
      {
        name: 'Dark Matter (Crouch)',
        score: 62,
        props: [p('Year', '2016'), p('ISBN', '978-1101904220')],
      },
      { name: 'Six of Crows', score: 60, props: [p('Year', '2015'), p('ISBN', '978-1627792127')] },
      { name: 'Eragon', score: 48, props: [p('Year', '2003'), p('ISBN', '978-0375826696')] },
      { name: 'Divergent', score: 42, props: [p('Year', '2011'), p('ISBN', '978-0062024039')] },
      { name: 'Twilight', score: 35, props: [p('Year', '2005'), p('ISBN', '978-0316015844')] },
      {
        name: 'The Fault in Our Stars',
        score: 46,
        props: [p('Year', '2012'), p('ISBN', '978-0525478812')],
      },
      {
        name: 'Halo: The Fall of Reach',
        score: 50,
        props: [p('Year', '2001'), p('ISBN', '978-0765367297')],
      },
      { name: 'Bobiverse 1', score: 72, props: [p('Year', '2016'), p('ISBN', '978-1680680584')] },
      {
        name: 'Sword of Truth: Wizards First Rule',
        score: 28,
        props: [p('Year', '1994'), p('ISBN', '978-0812548051')],
      },
    ],
  },
  {
    slug: 'movies',
    name: 'Movies',
    description:
      'Films ranked by **lasting impression** — not box office, not hype, just how they hold up on reflection.\n\nHeavy on horror and sci-fi; blockbusters need not apply.',
    order: 2,
    propKeys: [{ key: 'Year' }, { key: 'Genre', showOnCard: true }],
    items: [
      {
        name: 'Annihilation',
        score: 95,
        props: [p('Year', '2018'), p('Genre', 'Sci-Fi')],
        description:
          "Garland turned VanderMeer's *weird fiction* into something even stranger on screen. The Shimmer is **unforgettable**.\n\nThe bear scene alone earns it a spot in S-tier.",
      },
      {
        name: '2001: A Space Odyssey',
        score: 93,
        props: [p('Year', '1968'), p('Genre', 'Sci-Fi')],
      },
      { name: 'Stalker (1979)', score: 91, props: [p('Year', '1979'), p('Genre', 'Sci-Fi')] },
      { name: 'The Thing (1982)', score: 90, props: [p('Year', '1982'), p('Genre', 'Horror')] },
      {
        name: 'Blade Runner 2049',
        score: 88,
        props: [p('Year', '2017'), p('Genre', 'Sci-Fi')],
        description:
          "Villeneuve proved a *Blade Runner* sequel could work. Deakins' cinematography is **breathtaking**.\n\nSlow, meditative, and visually perfect.",
      },
      { name: 'Parasite', score: 86, props: [p('Year', '2019'), p('Genre', 'Thriller')] },
      { name: 'Arrival', score: 84, props: [p('Year', '2016'), p('Genre', 'Sci-Fi')] },
      { name: 'Mad Max: Fury Road', score: 82, props: [p('Year', '2015'), p('Genre', 'Action')] },
      { name: 'The Witch', score: 80, props: [p('Year', '2015'), p('Genre', 'Horror')] },
      { name: 'Midsommar', score: 78, props: [p('Year', '2019'), p('Genre', 'Horror')] },
      { name: 'Under the Skin', score: 76, props: [p('Year', '2013'), p('Genre', 'Sci-Fi')] },
      { name: 'Get Out', score: 75, props: [p('Year', '2017'), p('Genre', 'Horror')] },
      { name: 'Ex Machina', score: 87, props: [p('Year', '2014'), p('Genre', 'Sci-Fi')] },
      { name: 'Whiplash', score: 85, props: [p('Year', '2014'), p('Genre', 'Drama')] },
      { name: 'The Prestige', score: 83, props: [p('Year', '2006'), p('Genre', 'Thriller')] },
      { name: "Pan's Labyrinth", score: 81, props: [p('Year', '2006'), p('Genre', 'Fantasy')] },
      { name: 'Sicario', score: 79, props: [p('Year', '2015'), p('Genre', 'Thriller')] },
      { name: 'There Will Be Blood', score: 89, props: [p('Year', '2007'), p('Genre', 'Drama')] },
      {
        name: 'No Country for Old Men',
        score: 88,
        props: [p('Year', '2007'), p('Genre', 'Thriller')],
      },
      { name: 'The Babadook', score: 77, props: [p('Year', '2014'), p('Genre', 'Horror')] },
      { name: 'Color Out of Space', score: 76, props: [p('Year', '2019'), p('Genre', 'Horror')] },
      { name: 'It Follows', score: 75, props: [p('Year', '2014'), p('Genre', 'Horror')] },
      { name: 'Coherence', score: 75, props: [p('Year', '2013'), p('Genre', 'Sci-Fi')] },
      {
        name: 'Everything Everywhere All at Once',
        score: 74,
        props: [p('Year', '2022'), p('Genre', 'Sci-Fi')],
      },
      { name: 'Hereditary', score: 72, props: [p('Year', '2018'), p('Genre', 'Horror')] },
      { name: 'The Lighthouse', score: 70, props: [p('Year', '2019'), p('Genre', 'Horror')] },
      { name: 'Dune: Part One', score: 68, props: [p('Year', '2021'), p('Genre', 'Sci-Fi')] },
      { name: 'Interstellar', score: 63, props: [p('Year', '2014'), p('Genre', 'Sci-Fi')] },
      { name: 'The Northman', score: 60, props: [p('Year', '2022'), p('Genre', 'Action')] },
      { name: 'Mandy (2018)', score: 65, props: [p('Year', '2018'), p('Genre', 'Horror')] },
      { name: 'The Menu', score: 67, props: [p('Year', '2022'), p('Genre', 'Comedy')] },
      {
        name: 'The Banshees of Inisherin',
        score: 71,
        props: [p('Year', '2022'), p('Genre', 'Drama')],
      },
      { name: 'Triangle of Sadness', score: 62, props: [p('Year', '2022'), p('Genre', 'Comedy')] },
      { name: 'Nope', score: 58, props: [p('Year', '2022'), p('Genre', 'Sci-Fi')] },
      {
        name: 'Transformers: Age of Extinction',
        score: 12,
        props: [p('Year', '2014'), p('Genre', 'Action')],
      },
      { name: 'Avatar (2009)', score: 45, props: [p('Year', '2009'), p('Genre', 'Sci-Fi')] },
      { name: 'Cats (2019)', score: 5, props: [p('Year', '2019'), p('Genre', 'Musical')] },
      { name: 'Morbius', score: 18, props: [p('Year', '2022'), p('Genre', 'Action')] },
      { name: 'Venom (2018)', score: 38, props: [p('Year', '2018'), p('Genre', 'Action')] },
      { name: 'The Emoji Movie', score: 3, props: [p('Year', '2017'), p('Genre', 'Animation')] },
      { name: 'Dragonball Evolution', score: 4, props: [p('Year', '2009'), p('Genre', 'Action')] },
      { name: 'Battlefield Earth', score: 2, props: [p('Year', '2000'), p('Genre', 'Sci-Fi')] },
      { name: 'Movie 43', score: 6, props: [p('Year', '2013'), p('Genre', 'Comedy')] },
      { name: 'Disaster Movie', score: 1, props: [p('Year', '2008'), p('Genre', 'Comedy')] },
      { name: 'Epic Movie', score: 7, props: [p('Year', '2007'), p('Genre', 'Comedy')] },
      { name: 'The Last Airbender', score: 8, props: [p('Year', '2010'), p('Genre', 'Fantasy')] },
      { name: 'Birdemic', score: 3, props: [p('Year', '2010'), p('Genre', 'Horror')] },
      { name: 'Son of the Mask', score: 5, props: [p('Year', '2005'), p('Genre', 'Comedy')] },
      { name: 'Jaws: The Revenge', score: 9, props: [p('Year', '1987'), p('Genre', 'Horror')] },
      {
        name: 'Alone in the Dark (2005)',
        score: 6,
        props: [p('Year', '2005'), p('Genre', 'Horror')],
      },
      { name: 'Catwoman (2004)', score: 10, props: [p('Year', '2004'), p('Genre', 'Action')] },
      { name: 'Bloodshot', score: 11, props: [p('Year', '2020'), p('Genre', 'Action')] },
      { name: 'Left Behind (2014)', score: 4, props: [p('Year', '2014'), p('Genre', 'Drama')] },
    ],
  },
  {
    slug: 'board-games',
    name: 'Board Games',
    description:
      'A small but growing collection of **tabletop games** ranked by replayability and fun factor.\n\nOnly the ones that actually hit the table more than once.',
    order: 3,
    items: [
      { name: 'Gloomhaven', score: 95, props: [] },
      { name: 'Spirit Island', score: 92, props: [] },
      { name: 'Catan', score: 48, props: [] },
      { name: 'Pandemic', score: 42, props: [] },
      { name: 'Exploding Kittens', score: 25, props: [] },
    ],
  },
  {
    slug: 'recipes',
    name: 'Recipes',
    description: 'Recipes I have tried, ranked by taste and effort. *Coming soon.*',
    order: 4,
    items: [],
  },
];

export const PAGES = [
  {
    slug: 'home',
    title: 'Home',
    content: `# My personal **Tierdom**

My personal list of lists: how I rank all sorts of things, along with small reviews. Divided into _tiers_. Have a look around!`,
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

The source code is publicly available on [GitHub](https://github.com/tierdom/tierdom-app).`,
  },
];

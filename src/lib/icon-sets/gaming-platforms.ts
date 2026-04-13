import type { IconSet } from './index';

const base = '/icons/gaming-platforms';

export const gamingPlatforms: IconSet = {
  slug: 'gaming-platforms',
  name: 'Gaming Platforms',
  icons: {
    Amiga: { src: `${base}/amiga.svg`, alt: 'Amiga' },
    Atari: { src: `${base}/atari.svg`, alt: 'Atari' },
    'Game Boy': { src: `${base}/gameboy.svg`, alt: 'Game Boy' },
    GameCube: { src: `${base}/gamecube.svg`, alt: 'GameCube' },
    N64: { src: `${base}/n64.svg`, alt: 'N64' },
    NES: { src: `${base}/nes.svg`, alt: 'NES' },
    Oculus: { src: `${base}/oculus.svg`, alt: 'Oculus' },
    PC: { src: `${base}/pc.svg`, alt: 'PC' },
    PS1: { src: `${base}/ps1.svg`, alt: 'PS1' },
    SNES: { src: `${base}/snes.svg`, alt: 'SNES' },
    'Steam Deck': { src: `${base}/steamdeck.svg`, alt: 'Steam Deck' },
    'Switch 2': { src: `${base}/switch-2.svg`, alt: 'Switch 2' },
    Switch: { src: `${base}/switch.svg`, alt: 'Switch' },
    Wii: { src: `${base}/wii.svg`, alt: 'Wii' }
  }
};

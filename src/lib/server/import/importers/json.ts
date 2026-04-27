import type { Importer } from '../types';

export const jsonImporter: Importer = {
  id: 'json',
  label: 'Tierdom JSON',
  description:
    "Round-trip our own export format. Drop in the data.json from a Tierdom export ZIP, or any file matching the published schema. Doubles as a 'generic' importer: wrangle your data into our format and you can import any data!",
  status: 'available',
  accept: 'application/json,.json',
  run: async () => {
    throw new Error('JSON importer not yet implemented — lands in M3.');
  }
};

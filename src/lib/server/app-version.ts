import pkg from '../../../package.json';

/** Version stamped onto every export manifest. Read once at module load. */
export const APP_VERSION: string = pkg.version;

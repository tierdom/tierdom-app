const types = [
  'feat',
  'fix',
  'remove',
  'refactor',
  'docs',
  'style',
  'test',
  'config',
  'deps',
  'deps-remove',
  'perf',
  'security',
  'db',
  'docker',
  'i18n',
  'ui',
  'arch',
  'merge',
  'types',
  'wip',
  'release',
  'other',
];

const bodyLineLengthIgnoringUrls = (parsed, _when, max) => {
  const tooLong = (parsed.body ?? '')
    .split('\n')
    .filter((line) => line.length > max && !line.includes('://'));
  return [tooLong.length === 0, `body lines must be at most ${max} characters (URLs excepted)`];
};

export default {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      // "<emoji> <type>: <subject>"; the default pattern expects the type first.
      headerPattern: /^\S+ (\w+(?:-\w+)*)(?:\((.*)\))?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
  plugins: [{ rules: { 'body-max-line-length-ignore-urls': bodyLineLengthIgnoringUrls } }],
  rules: {
    'type-enum': [2, 'always', types],
    // The agent aims for 50; 52 leaves slack, since commitlint counts the emoji as two characters.
    'header-max-length': [2, 'always', 52],
    'body-max-line-length': [0],
    'body-max-line-length-ignore-urls': [2, 'always', 72],
  },
};

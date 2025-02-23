import yarnConfig from '@yarnpkg/eslint-config';

export default [
  {
    files: [
      `**/*.ts`,
      `**/*.tsx`,
    ],
  },
  ...yarnConfig,
];

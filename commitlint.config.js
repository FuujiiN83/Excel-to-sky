/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Match the convention documented in CONTRIBUTING.md: feat, fix, chore,
    // refactor, docs, test, perf, ci, build, style, revert.
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'refactor',
        'docs',
        'test',
        'perf',
        'ci',
        'build',
        'style',
        'revert',
      ],
    ],
    // Subject is free-form; the default 'not start with capital' is too strict for proper nouns.
    'subject-case': [0],
    // Headers can be a bit longer when a scope is included.
    'header-max-length': [2, 'always', 100],
    // Body is optional but, when present, must be wrapped sensibly.
    'body-max-line-length': [1, 'always', 100],
  },
}

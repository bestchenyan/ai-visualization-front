import { interopDefault } from '../utils.mjs';

export async function test() {
  const [pluginTest, pluginNoOnlyTests] = await Promise.all([
    interopDefault(import('eslint-plugin-vitest')),
    interopDefault(import('eslint-plugin-no-only-tests')),
  ]);

  return [
    {
      files: [
        `**/__tests__/**/*.?([cm])[jt]s?(x)`,
        `**/*.spec.?([cm])[jt]s?(x)`,
        `**/*.test.?([cm])[jt]s?(x)`,
        `**/*.bench.?([cm])[jt]s?(x)`,
        `**/*.benchmark.?([cm])[jt]s?(x)`,
      ],
      plugins: {
        test: {
          ...pluginTest,
          rules: {
            ...pluginTest.rules,
            ...pluginNoOnlyTests.rules,
          },
        },
      },
      rules: {
        'no-console': 'off',
        'node/prefer-global/process': 'off',
        'test/consistent-test-it': [
          'error',
          { fn: 'it', withinDescribe: 'it' },
        ],
        'test/no-identical-title': 'error',
        'test/no-import-node-test': 'error',
        'test/no-only-tests': 'error',
        'test/prefer-hooks-in-order': 'error',
        'test/prefer-lowercase-title': 'error',
      },
    },
  ];
}

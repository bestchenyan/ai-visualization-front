import { interopDefault } from '../utils.mjs';

export async function regexp() {
  const pluginRegexp = await interopDefault(import('eslint-plugin-regexp'));

  return [
    {
      plugins: {
        regexp: pluginRegexp,
      },
      rules: {
        ...pluginRegexp.configs.recommended.rules,
      },
    },
  ];
}

import { interopDefault } from '../utils.mjs';

export async function prettier() {
  const pluginPrettier = await interopDefault(import('eslint-plugin-prettier'));
  return [
    {
      plugins: {
        prettier: pluginPrettier,
      },
      rules: {
        'prettier/prettier': 'error',
      },
    },
  ];
}

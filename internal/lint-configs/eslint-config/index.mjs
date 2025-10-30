import {
  comments,
  disableds,
  ignores,
  importPluginConfig,
  javascript,
  jsdoc,
  jsonc,
  perfectionist,
  prettier,
  regexp,
  test,
  typescript,
  unicorn,
  vue,
} from './configs/index.mjs';

async function defineConfig(config = []) {
  const configs = [
    vue(),
    javascript(),
    ignores(),
    prettier(),
    typescript(),
    jsonc(),
    disableds(),
    importPluginConfig(),
    perfectionist(),
    comments(),
    jsdoc(),
    unicorn(),
    test(),
    regexp(),
    ...config,
  ];

  const resolved = await Promise.all(configs);

  return resolved.flat();
}

export { defineConfig };

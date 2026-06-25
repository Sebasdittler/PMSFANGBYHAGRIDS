module.exports = {
  env: { es2022: true, node: true },
  extends: ["eslint:recommended", "google"],
  rules: { "max-len": ["warn", { code: 120 }] },
  parserOptions: { ecmaVersion: 2022 },
};

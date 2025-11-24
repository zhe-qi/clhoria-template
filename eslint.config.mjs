import antfu from "@antfu/eslint-config";

export default antfu({
  type: "app",
  typescript: true,
  formatters: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: "double",
  },
  ignores: [
    "migrations/**/*",
    "CLAUDE.md",
    "CLAUDE.local.md",
    "./.claude/**/*",
    "./.serena/**/*",
    "./docs/**/*",
  ],
}, {
  rules: {
    "no-console": ["warn"],
    "antfu/no-top-level-await": ["off"],
    "node/prefer-global/process": ["off"],
    "node/no-process-env": ["error"],
    "perfectionist/sort-imports": ["error", {
      tsconfigRootDir: ".",
    }],
    "unicorn/filename-case": ["error", {
      case: "kebabCase",
      ignore: ["README.md"],
    }],
    "antfu/top-level-function": "off",
    "ts/consistent-type-definitions": ["error", "type"],
    "test/padding-around-all": "error",
    "test/prefer-lowercase-title": "off",
  },
});

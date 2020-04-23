module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ["eslint:recommended", "plugin:vue/recommended"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "vue/attributes-order": "off",
    "vue/component-definition-name-casing": "off",
    "vue/html-closing-bracket-spacing": "off",
    "vue/html-self-closing": "off",
    "vue/max-attributes-per-line": "off",
    "vue/multi-word-component-names": "off",
    "vue/name-property-casing": "off",
    "vue/singleline-html-element-content-newline": "off",
  },
};

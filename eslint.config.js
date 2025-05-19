// eslint.config.js
const stylisticJs = require('@stylistic/eslint-plugin-js'),
  promise = require('eslint-plugin-promise');

module.exports = [
  {
    ignores: [
      'static/js/**/*.min.js',
      'static/js/**/jquery*.js',
      'static/js/**/bootstrap*.js',
      'static/js/**/popper*.js'
    ],
    plugins: { '@stylistic/js': stylisticJs, promise },
    rules: {
      'prefer-const': 'error',
      'react/require-extension': 'off',

      strict: ['error', 'global'],
      camelcase: ['error', { properties: 'never', ignoreGlobals: true, ignoreDestructuring: true, allow: ['[a-z]+([a-z0-9_])?'] }],
      'one-var': ['error', { var: 'never', let: 'consecutive', const: 'consecutive' }],
      'no-var': 'error',

      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="console"][callee.property.name!=/^(log|warn|error|info|trace)$/]',
          message: 'Unexpected property on console object was called'
        }
      ],
      'curly': 'error',

      '@stylistic/js/indent': ['error', 2],
      '@stylistic/js/key-spacing': ['error', { beforeColon: false, afterColon: true, mode: 'strict' }],
      '@stylistic/js/keyword-spacing': ['error', { before: false, after: true }],
      '@stylistic/js/linebreak-style': ['error', 'unix'],
      '@stylistic/js/space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      //'@stylistic/js/func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      '@stylistic/js/space-infix-ops': 'error',
      '@stylistic/js/space-before-blocks': ['error', 'never'],
      //'@stylistic/js/newline-before-return': 'error',
      /*'@stylistic/js/lines-around-comment': ['error', { 'beforeBlockComment': true,  'beforeLineComment': true, 'allowBlockStart': true }],*/
      '@stylistic/js/indent': ['error', 2],
      '@stylistic/js/comma-dangle': ['error', 'never'],
      '@stylistic/js/max-len': ['error', 160],
      '@stylistic/js/no-trailing-spaces': ['error', {'skipBlankLines': false}],
      '@stylistic/js/no-multiple-empty-lines': ['error', { max: 1 }],
      '@stylistic/js/semi': ['error', 'always'],
      '@stylistic/js/quotes': ['error', 'single'],
      '@stylistic/js/one-var-declaration-per-line': ['error', 'always'],
      '@stylistic/js/no-extra-semi': 'error',
      '@stylistic/js/no-multi-spaces': 'error',
      '@stylistic/js/no-mixed-spaces-and-tabs': 'error',
      '@stylistic/js/arrow-parens': ['error', 'always'],
      '@stylistic/js/arrow-spacing': ['error', { before: true, after: true }],
      '@stylistic/js/block-spacing': 'error',
      '@stylistic/js/brace-style': ['error', 'stroustrup'],
      '@stylistic/js/comma-spacing': ['error', { before: false, after: true }],
      '@stylistic/js/comma-style': ['error', 'last'],
      '@stylistic/js/dot-location': ['error', 'property'],
      /*'@stylistic/js/dot-notation': ['error', { 'allowKeywords': false }],*/
      '@stylistic/js/func-call-spacing': ['error', 'never'],

      'promise/always-return': 'error',
      //'promise/no-return-wrap': 'warn',
      'promise/param-names': 'off',
      'promise/catch-or-return': 'error',
      'promise/no-native': 'off',
      'promise/no-nesting': 'off',
      //'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'off',
      'promise/avoid-new': 'off',
      'promise/no-new-statics': 'error',
      'promise/no-return-in-finally': 'warn',
      'promise/valid-params': 'warn'
    }
  }
];

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    mocha: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended'
      ],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.test.json']
      },
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/prefer-const': 'error',
        '@typescript-eslint/no-var-requires': 'off',
        'no-unused-vars': 'off', // Use TypeScript version instead
        'prefer-const': 'off', // Use TypeScript version instead
        'object-shorthand': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-template': 'error',
        'template-curly-spacing': 'error',
        'arrow-spacing': 'error',
        'comma-dangle': ['error', 'never'],
        'semi': ['error', 'always'],
        'quotes': ['error', 'single', { 'avoidEscape': true }],
        'indent': ['error', 2],
        'no-trailing-spaces': 'error',
        'eol-last': 'error'
      }
    }
  ],
  rules: {
    'no-console': 'off',
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'arrow-spacing': 'error',
    'comma-dangle': ['error', 'never'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'indent': ['error', 2],
    'no-trailing-spaces': 'error',
    'eol-last': 'error'
  }
};

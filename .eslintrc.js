const eslintConfig = {
  env: {
    'cypress/globals': true,
    'jest/globals': true,
  },
  extends: [
    'plugin:cypress/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:react-hooks/recommended',
    '@ghadyani-eslint/node',
    '@ghadyani-eslint/react',
  ],
  overrides: [
    {
      files: '**/*.?(ts|tsx)',
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
      plugins: [
        '@typescript-eslint',
        '@typescript-eslint/eslint-plugin',
        'deprecation',
      ],
      rules: {
        "no-shadow": "off",
        "no-use-before-define": "off",
        '@typescript-eslint/await-thenable': 'warn',
        '@typescript-eslint/ban-ts-comment': 'warn',
        '@typescript-eslint/ban-types': [
          'error',
          {
            types: {
              Number: {
                message: 'Use number instead',
                fixWith: 'number',
              },
              String: {
                message: 'Use string instead',
                fixWith: 'string',
              },
            },
          },
        ],
        '@typescript-eslint/member-delimiter-style': [
          'error',
          {
            multiline: {
              delimiter: 'comma',
              requireLast: true,
            },
            singleline: {
              delimiter: 'comma',
              requireLast: false,
            },
          },
        ],
        '@typescript-eslint/naming-convention': [
          'error',
          {
            format: [
              'PascalCase'
            ],
            selector: 'interface',
          },
        ],
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            args: 'after-used',
            ignoreRestSiblings: false,
            vars: 'all',
          },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-use-before-define': ['error'],
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/type-annotation-spacing': 'error',
        'deprecation/deprecation': 'warn',
      },
    },
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    babelOptions: {
      configFile: (
        require
        .resolve(
          './babel.config.js',
        )
      ),
    },
  },
  plugins: [
    'cypress',
    'jest',
    'react-hooks',
  ],
  rules: {
    '@getify/proper-ternary/nested': 'off',
    '@ghadyani-eslint/arrow-body-parens/parens': 'off',
    '@ghadyani-eslint/eslint-overrides/indent': 'off',
    'array-bracket-newline': [
      'warn',
      {
        minItems: 1,
        multiline: true,
      },
    ],
    'arrow-parens': [
      'warn',
      'always',
    ],
    'import/no-unresolved': [
      'warn',
      {
        caseSensitive: false,
        ignore: [
          '\\$',
        ],
      },
    ],
    'indent': 'off', // TEMP. Remove 'off' when fixed in @ghadyani-eslint
    // 'indent': [
    //   'error',
    //   2,
    //   {
    //     flatTernaryExpressions: false,
    //     MemberExpression: 0,
    //     offsetTernaryExpressions: false,
    //     SwitchCase: 1,
    //   },
    // ],
    'no-unexpected-multiline': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}

module.exports = eslintConfig

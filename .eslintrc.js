module.exports = {
    'env': {
        'browser': true,
        'commonjs': true,
        'es2021': true,
    },
    'extends': [
        'google',
        'plugin:jsdoc/recommended',
    ],
    'plugins': [
        'jsdoc',
    ],
    'parserOptions': {
        'ecmaVersion': 12,
    },
    'rules': {
        'quotes': ['error', 'single'],
        'object-curly-spacing': ['error', 'always'],
        'valid-jsdoc': ['off'],
        'jsdoc/require-returns-description': 'off',
        'jsdoc/newline-after-description': 'off',
        'indent': ['error', 4],
        'prefer-const': ['off'],
        'max-len': ['error', 120],
    },
};

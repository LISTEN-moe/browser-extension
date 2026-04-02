import neonCommon from 'eslint-config-neon/common';
import neonBrowser from 'eslint-config-neon/browser';
import neonTypescript from 'eslint-config-neon/typescript';
import neonVue from 'eslint-config-neon/vue';
import neonVueTypescript from 'eslint-config-neon/vue-typescript';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';
// @ts-ignore
import autoImports from './.wxt/eslint-auto-imports.mjs';

export default [
	{
		ignores: ["**/.output/*", "**/.wxt/*", "**/src-old/*", "eslint.config.ts"],
	},
	autoImports,
	...neonCommon,
	...neonBrowser,
	...neonTypescript,
	...neonVue.map(config => {
		const replacementMap: Record<string, string | undefined> = {
			'vue/component-tags-order': 'vue/block-order',
			'vue/experimental-script-setup-vars': undefined,
			'vue/name-property-casing': 'vue/component-definition-name-casing',
			'vue/no-confusing-v-for-v-if': 'vue/no-use-v-if-with-v-for',
			'vue/no-invalid-model-keys': 'vue/valid-model-definition',
			'vue/no-ref-object-destructure': 'vue/no-ref-object-reactivity-loss',
			'vue/no-setup-props-destructure': 'vue/no-setup-props-reactivity-loss',
			'vue/no-unregistered-components': 'vue/no-undef-components',
			'vue/script-setup-uses-vars': undefined,
			'vue/v-on-function-call': 'vue/v-on-handler-style',
		};

		const rules: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(config.rules ?? {})) {
			if (key in replacementMap && replacementMap[key] === undefined) continue;
			const newKey = replacementMap[key] ?? key;
			rules[newKey] = value;
		}

		return { ...config, rules } as typeof config;
	}),
	...neonVueTypescript,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './tsconfig.json',
			},
		},
	},
	{
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tsParser,
				project: './tsconfig.json',
			},
		},
		processor: 'vue/vue',
	},
	{
		plugins: {
			'@stylistic': stylistic,
		},
		rules: {
			//
			'@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
			'@stylistic/no-extra-parens': 'off',
			'@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
			'@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
			'@stylistic/array-bracket-newline': ['error', 'consistent'],
			'@stylistic/array-element-newline': ['error', { multiline: true, consistent: true }],
			'@stylistic/arrow-parens': ['error', 'as-needed'],
			'@stylistic/operator-linebreak': ['error', 'before'],
			'@stylistic/line-comment-position': 'off',

			// Typescript
			'typescript-sort-keys/interface': 'off',

			// Built-in
			'func-names': 'off',
			'arrow-body-style': 'off',
			'id-length': 'off',
			'consistent-return': 'off',
			'no-inline-comments': 'off',
			'no-shadow': 'off',
			'no-warning-comments': 'off',
			'prefer-named-capture-group': 'off',

			//
			'import-x/order': 'off',
			'promise/prefer-await-to-callbacks': 'off',

			// Unicorn
			'unicorn/numeric-separators-style': 'off',
			'unicorn/no-array-method-this-argument': 'off',
			'unicorn/require-post-message-target-origin': 'off'
		},
	},
	{
		rules: {
			'vue/sort-keys': 'off',
			'vue/multi-word-component-names': 'off',
			'vue/valid-v-for': 'off',
			'vue/html-closing-bracket-newline': 'off',
			// 'vue/comment-directive': 'warn',
			'vue/html-comment-indent': 'off',
			'vue/html-comment-content-newline': 'off',
			'vue/script-indent': ['error', 'tab', { switchCase: 1 }],
			'vue/v-on-handler-style': 'off',
			'vue/no-v-model-argument': 'off',
		},
	},
];

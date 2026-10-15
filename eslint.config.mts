import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json', 'tests/*.mjs'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
			// `brands` replaces the rule's default list, so the product names used in
			// this plugin are listed explicitly to keep their official casing.
			'obsidianmd/ui/sentence-case': [
				'warn',
				{
					brands: ['Hugo', 'Hugo Publisher', 'Markdown', 'Git', 'GitHub', 'WeChat', 'Toutiao'],
					acronyms: ['PATH', 'URL', 'HTML'],
					enforceCamelCaseLower: true,
				},
			],
		},
	},
);

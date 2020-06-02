import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import svelte from 'rollup-plugin-svelte';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import config from 'sapper/config/rollup.js';
import pkg from './package.json';
import glob from 'rollup-plugin-glob'
import { mdsvex } from "mdsvex";

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
const legacy = !!process.env.SAPPER_LEGACY_BUILD;

const onwarn = (warning, onwarn) => (warning.code === 'CIRCULAR_DEPENDENCY' && /[/\\]@sapper[/\\]/.test(warning.message)) || onwarn(warning);

import { readdirSync } from 'fs';
import { join, extname } from 'path';

function get_routes() {
	const  blog_path = join(process.cwd(), 'src', 'routes', 'blog');
	return readdirSync(blog_path).filter(p => extname(p) === "");
}

export default {
	client: {
		input: config.client.input(),
		output: config.client.output(),
		plugins: [
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode),
				'__ROUTES__': JSON.stringify(get_routes())
			}),
			svelte({
				dev,
				hydratable: true,
				emitCss: true,
				extensions: [".svelte", ".svx"],
				preprocess: mdsvex({ 
					layout: join(process.cwd(), 'src/routes/_mdsvex_layout.svelte') 
				})
			}),
			resolve({
				browser: true,
				dedupe: ['svelte']
			}),
			commonjs(),
			glob(),

			legacy && babel({
				extensions: ['.js', '.mjs', '.html', '.svelte', '.svx'],
				babelHelpers: 'runtime',
				exclude: ['node_modules/@babel/**'],
				presets: [
					['@babel/preset-env', {
						targets: '> 0.25%, not dead'
					}]
				],
				plugins: [
					'@babel/plugin-syntax-dynamic-import',
					['@babel/plugin-transform-runtime', {
						useESModules: true
					}]
				]
			}),

			!dev && terser({
				module: true
			})
		],

		preserveEntrySignatures: false,
		onwarn,
	},

	server: {
		input: config.server.input(),
		output: config.server.output(),
		plugins: [
			replace({
				'process.browser': false,
				'process.env.NODE_ENV': JSON.stringify(mode),
				'__ROUTES__': JSON.stringify(get_routes())
			}),
			svelte({
				generate: 'ssr',
				dev,
				extensions: [".svelte", ".svx"],
				preprocess: mdsvex({ 
					layout: join(process.cwd(), 'src/routes/_mdsvex_layout.svelte') 
				})
			}),
			resolve({
				dedupe: ['svelte']
			}),
			commonjs(),
			glob()
		],
		external: Object.keys(pkg.dependencies).concat(
			require('module').builtinModules || Object.keys(process.binding('natives'))
		),

		preserveEntrySignatures: 'strict',
		onwarn,
	},

	serviceworker: {
		input: config.serviceworker.input(),
		output: config.serviceworker.output(),
		plugins: [
			resolve(),
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
			commonjs(),
			!dev && terser()
		],

		preserveEntrySignatures: false,
		onwarn,
	}
};

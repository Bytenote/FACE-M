const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const NODE_ENV = process.env.NODE_ENV || 'development';
const ASSET_PATH = process.env.ASSET_PATH || '/';
const BROWSER = process.env.BROWSER || 'chrome';

const options = {
	mode: NODE_ENV,
	entry: {
		background: path.join(__dirname, '../src', 'background', 'index.js'),
		content: path.join(__dirname, '../src', 'content', 'index.js'),
		popup: path.join(__dirname, '../src', 'popup', 'index.js'),
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, '../build'),
		clean: true,
		publicPath: ASSET_PATH,
	},
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: new RegExp(
					'.(' + ['jpg', 'jpeg', 'png', 'svg'].join('|') + ')$'
				),
				type: 'asset/resource',
				exclude: /node_modules/,
			},
			{
				test: /\.html$/,
				loader: 'html-loader',
				exclude: /node_modules/,
			},
		],
	},
	plugins: [
		new CleanWebpackPlugin({ verbose: false }),
		new webpack.ProgressPlugin(),
		new CopyWebpackPlugin({
			patterns: [
				{
					from: path.join(__dirname, '../src/manifest.json'),
					to: path.join(__dirname, '../build'),
					force: true,
					transform: function (content) {
						let manifest = JSON.parse(content.toString());

						if (BROWSER === 'firefox') {
							manifest = convertManifestV3ToFirefoxV2(manifest);
						}

						return Buffer.from(JSON.stringify(manifest));
					},
				},
			],
		}),
		new CopyWebpackPlugin({
			patterns: [
				{
					from: 'assets/img',
					to: path.join(__dirname, '../build'),
					force: true,
				},
			],
		}),
		new HtmlWebpackPlugin({
			template: path.join(__dirname, '../src', 'popup', 'index.html'),
			filename: 'popup.html',
			chunks: ['popup'],
			cache: false,
		}),
	],
	infrastructureLogging: {
		level: 'info',
	},
};

if (NODE_ENV === 'development') {
	options.devtool = 'cheap-module-source-map';
} else {
	options.optimization = {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				extractComments: false,
			}),
		],
	};
}

function convertManifestV3ToFirefoxV2(manifest) {
	manifest.manifest_version = 2;
	manifest.background = {
		scripts: ['background.js'],
	};
	manifest.content_scripts[0] = {
		...manifest.content_scripts[0],
		all_frames: false,
	};
	manifest['browser_action'] = manifest.action;
	manifest.permissions = [
		...manifest.permissions,
		...manifest.host_permissions,
	];

	if (NODE_ENV === 'development') {
		manifest['browser_specific_settings'] = {
			gecko: {
				id: 'addon@example.com',
				strict_min_version: '42.0',
			},
		};
	}

	delete manifest.action;
	delete manifest.host_permissions;

	return manifest;
}

module.exports = options;

const path = require('node:path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {createRemoteMiddleware} = require('./server/remote.cjs');

module.exports = (_env, {mode}) => {
    const qwc = path.dirname(require.resolve('qwc2-lts/package.json'));
    const profile = mode === 'development' ? process.env.ORBIT_PROFILE || 'solothurn' : 'solothurn';
    if (!['solothurn', 'fixture', 'bentley'].includes(profile)) throw new Error('Unbekanntes ORBIT_PROFILE');
    return {
        entry: './js/app.jsx',
        output: {path: path.resolve(__dirname, 'prod'), publicPath: '/map/', filename: 'dist/[name].js', clean: true},
        devtool: mode === 'development' ? 'eval-source-map' : false,
        devServer: {
            host: '127.0.0.1',
            port: Number(process.env.QWC_PORT || 8082),
            static: false,
            setupMiddlewares(middlewares) {
                middlewares.unshift({name: 'solothurn', middleware: createRemoteMiddleware({profile})});
                return middlewares;
            }
        },
        resolve: {
            extensions: ['.mjs', '.js', '.jsx'],
            alias: {qwc2: qwc, '@giro3d/giro3d': '@sourcepole/qwc-giro3d'},
            fallback: {path: require.resolve('path-browserify')}
        },
        module: {
            rules: [
                {include: path.join(qwc, 'components', 'ResizeableWindow.js'),
                    use: path.resolve(__dirname, 'server/qwc-compat-loader.cjs')},
                {test: /\.jsx?$/, include: path.resolve(__dirname, 'js'), use: 'babel-loader'},
                {test: /\.css$/, use: ['style-loader', 'css-loader']},
                {test: /\.(woff2?|png|jpe?g|gif|svg|glb)$/, type: 'asset/inline'}
            ]
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.OrbitProfile': JSON.stringify(profile),
                'process.env.BuildDate': JSON.stringify('dev'),
                'process.env.AvailableLanguages': JSON.stringify(['de-CH'])
            }),
            new webpack.NormalModuleReplacementPlugin(/^openlayers$/, path.join(qwc, 'libs', 'openlayers')),
            new HtmlWebpackPlugin({template: './index.html'}),
            new CopyWebpackPlugin({patterns: [
                {from: path.join(qwc, 'static/translations/de-CH.json'), to: 'translations/de-CH.json'},
                {from: 'static', to: '.'}
            ]})
        ]
    };
};

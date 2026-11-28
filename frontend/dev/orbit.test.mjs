import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import test from 'node:test';

import {cameraFeatures, nearestFootprint, square} from '../js/orbit/geometry.mjs';

const require = createRequire(import.meta.url);
const {adaptConfig, adaptThemes, createRemoteMiddleware, isPublicRead} = require('../server/remote.cjs');
const {createStaticConfiguration} = require('../server/static-config.cjs');
const qwcCompatibility = require('../server/qwc-compat-loader.cjs');
const point = (x, y, id, symbolName = 'circle_filled') => ({
    objectType: 'footprint', symbolName, objectId: id, spatialPoint: {x, y, crs: '2056'}
});

test('50 m in LV95 mit sphärischen Footprints und stabiler Auswahl', () => {
    assert.deepEqual(square([100, 200], 50), [50, 150, 150, 250]);
    assert.equal(nearestFootprint([point(40, 40, 'diagonal'), point(50.01, 0, 'entfernt')], [0, 0]), null);
    assert.equal(nearestFootprint([
        point(5, 0, 'planar', 'square_filled'), point(50, 0, 'grenze'), point(10, 0, 'z'), point(-10, 0, 'a')
    ], [0, 0]).objectId, 'a');
    assert.equal(nearestFootprint([point(30, 40, 'grenze')], [0, 0]).objectId, 'grenze');
});

test('Blickkeil folgt der Drehung bei gleichbleibender Kamera', () => {
    const north = cameraFeatures({x: 100, y: 200, pan: 0, fov: 60});
    const east = cameraFeatures({x: 100, y: 200, pan: 90, fov: 60});
    assert.deepEqual(north[1], east[1]);
    assert.deepEqual(north[0].geometry.coordinates[0][5], [100, 222]);
    assert.deepEqual(east[0].geometry.coordinates[0][5], [122, 200]);
});

test('Proxy erlaubt öffentliche Karten- und Suchabfragen', () => {
    const wms = query => new URL('https://geo.so.ch/ows/somap?' + query);
    assert.equal(isPublicRead(wms('REQUEST=GetMap')), true);
    assert.equal(isPublicRead(wms('REQUEST=Transaction')), false);
    assert.equal(isPublicRead(wms('REQUEST=GetMap&request=Transaction')), false);
    assert.equal(isPublicRead(new URL('https://geo.so.ch/api/search/v2/?searchtext=Solothurn')), true);
    assert.equal(isPublicRead(new URL('https://geo.so.ch/api/wmts/1.0.0/public/default/2056/8/49/73.png')), true);
    assert.equal(isPublicRead(new URL('https://geo.so.ch/api/data/v1/example/')), false);
});

test('Der Dev-Proxy stellt frühere Editier- und Höhenprofilrouten nicht bereit', async t => {
    const middleware = createRemoteMiddleware();
    const server = createServer((req, res) => middleware(req, res, () => res.writeHead(404).end()));
    server.listen(0, '127.0.0.1');
    t.after(() => server.close());
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const profile = await fetch(base + '/elevation/getheightprofile', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'
    });
    assert.equal(profile.status, 403);
    const oldRoute = '/orbit-dev-data/orbit_dev.lines/';
    assert.equal((await fetch(base + oldRoute)).status, 404);
    assert.equal((await fetch(base + oldRoute + 'multipart', {method: 'POST'})).status, 404);
});

test('Die Dev-Konfiguration registriert Karte und Viewer ohne Editierfunktionen', () => {
    const tools = {key: 'Tools', subitems: [{key: 'Editing'}]};
    const topbar = {name: 'TopBar', cfg: {menuItems: [{key: 'LayerTree'}, tools]}};
    const entries = [topbar, {name: 'Editing'}, {name: 'OrbitDevLayers'}];
    const config = adaptConfig({plugins: {desktop: entries, mobile: entries}, editServiceUrl: '/api/data/v1/'});
    const menu = {name: 'TopBar', cfg: {menuItems: [{key: 'LayerTree'}, {...tools, subitems: []}]}};
    assert.deepEqual(config.plugins.desktop, [menu, {name: 'Orbit3DM', cfg: {buttonPosition: 5}}]);
    assert.deepEqual(config.plugins.mobile, [menu, {name: 'Orbit3DM', cfg: {buttonPosition: 3}}]);
    assert.equal('editServiceUrl' in config, false);
});

test('Die Dev-Themenkonfiguration entfernt Editiermetadaten und erhält die Kartenquelle', () => {
    const layer = {name: 'example', editConfig: {example: {}}, editConfigUrl: '/example'};
    const theme = {id: 'main', url: '/ows/somap', sublayers: [layer]};
    const {themes} = adaptThemes({themes: {defaultTheme: 'main', items: [theme]}}, 'solothurn');
    assert.equal(themes.items[0].url, '/ows/somap');
    assert.deepEqual(themes.items[0].sublayers, [{name: 'example'}]);
});

test('Der statische Build verwendet öffentliche Solothurner Dienste und relative Übersetzungspfade', () => {
    const entries = [{name: 'TopBar', cfg: {logoUrl: '/map'}}];
    const config = {plugins: {desktop: entries, mobile: entries}, searchServiceUrl: '/api/search/v2/',
        searchDataServiceUrl: '/api/data/v1/', dataproductServiceUrl: '/api/dataproduct/v1/',
        editServiceUrl: '/api/data/v1/'};
    const tile = '/api/wmts/1.0.0/example/default/{TileMatrix}/{TileRow}/{TileCol}.png';
    const input = {themes: {defaultTheme: 'main', backgroundLayers: [{url: 'https://geo.so.ch' + tile}],
        items: [{id: 'main', url: '/ows/somap', featureInfoUrl: '/api/v1/featureinfo/somap',
            sublayers: [{name: 'example', editConfigUrl: '/map/editConfig.json'}]}]}};
    const output = createStaticConfiguration(config, input);
    assert.equal(output.config.assetsPath, 'https://geo.so.ch/map/assets');
    assert.equal(output.config.translationsPath, 'translations');
    assert.equal(output.config.plugins.desktop[0].cfg.logoUrl, './');
    assert.equal(output.config.searchServiceUrl, 'https://geo.so.ch/api/search/v2/');
    assert.equal(output.config.searchDataServiceUrl, 'https://geo.so.ch/api/data/v1/');
    assert.equal(output.config.dataproductServiceUrl, 'https://geo.so.ch/api/dataproduct/v1/');
    assert.equal('editServiceUrl' in output.config, false);
    const theme = output.themes.themes.items[0];
    assert.equal(theme.url, 'https://geo.so.ch/ows/somap');
    assert.equal(theme.featureInfoUrl, 'https://geo.so.ch/api/v1/featureinfo/somap');
    assert.deepEqual(theme.sublayers, [{name: 'example'}]);
    assert.equal(output.themes.themes.backgroundLayers[0].url, 'https://geo.so.ch' + tile);
});

test('Die QWC-Integration aktualisiert den Kartenrand bei einem Wechsel der Dockseite', () => {
    const resourcePath = require.resolve('qwc2-lts/components/ResizeableWindow.js');
    assert.match(qwcCompatibility(readFileSync(resourcePath, 'utf8')),
        /splitScreenWhenDocked && \(this\.props\.dockable !== prevProps\.dockable/);
});

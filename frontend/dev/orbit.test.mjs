import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {json} from 'node:stream/consumers';
import test from 'node:test';

import {cameraFeatures, nearestFootprint, overlayParts, square} from '../js/orbit/geometry.mjs';
import {addProfileHeights, buildProfile, profileGeometry} from '../js/orbit/height-profile.mjs';

const require = createRequire(import.meta.url);
const {adaptConfig, isPublicRead, localRequestAllowed} = require('../server/remote.cjs');
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
    const north = cameraFeatures({x: 100, y: 200}, {pan: 0, fov: 60});
    const east = cameraFeatures({x: 100, y: 200}, {pan: 90, fov: 60});
    assert.deepEqual(north[1], east[1]);
    assert.deepEqual(north[0].geometry.coordinates[0][5], [100, 222]);
    assert.deepEqual(east[0].geometry.coordinates[0][5], [122, 200]);
});

test('Mehrteilige Flächen behalten ihre Innenringe', () => {
    const exterior = [[0, 0], [4, 0], [4, 4], [0, 0]];
    const interior = [[1, 1], [2, 1], [2, 2], [1, 1]];
    assert.deepEqual(overlayParts({type: 'MultiPolygon', coordinates: [[exterior, interior], [exterior]]}), [
        {kind: 'area', parts: [exterior, interior]}, {kind: 'area', parts: [exterior]}
    ]);
});

test('Proxy erlaubt nur vorgesehene Datensätze und WMS-Leseabfragen', () => {
    assert.equal(localRequestAllowed('/orbit_dev.lines/multipart', 'POST'), true);
    assert.equal(localRequestAllowed('/orbit_dev.polygons/multipart/12', 'PUT'), true);
    assert.equal(localRequestAllowed('/orbit_dev.polygons/12', 'DELETE'), true);
    assert.equal(localRequestAllowed('/orbit_dev.lines/export', 'GET'), false);
    assert.equal(localRequestAllowed('/orbit_dev.grundstuecke/extent', 'GET'), true);
    assert.equal(localRequestAllowed('/orbit_dev.grundstuecke/extent', 'POST'), false);
    assert.equal(localRequestAllowed('/orbit_dev.grundstuecke/multipart/1', 'PUT'), true);
    assert.equal(localRequestAllowed('/orbit_dev.grundstuecke_import/', 'GET'), false);
    assert.equal(localRequestAllowed('/ch.so.internal.lines/multipart', 'POST'), false);
    const wms = query => new URL('https://geo.so.ch/ows/somap?' + query);
    assert.equal(isPublicRead(wms('REQUEST=GetMap')), true);
    assert.equal(isPublicRead(wms('REQUEST=Transaction')), false);
    assert.equal(isPublicRead(wms('REQUEST=GetMap&request=Transaction')), false);
});

test('Höhenprofil bewahrt Knickpunkte und beschränkt die Anzahl Abtastwerte', () => {
    const line = [[0, 0], [3.4, 0], [3.4, 2]];
    const profile = buildProfile(line);
    assert.deepEqual(profile.request, {coordinates: line, distances: [3.4, 2], projection: 'EPSG:2056', samples: 7});
    const result = profileGeometry(profile, {elevations: [400, 401, 402, 403, 404, 405, 406]});
    assert.deepEqual(result.coordinates[0], [0, 0, 400]);
    assert.deepEqual(result.coordinates.at(-1), [3.4, 2, 406]);
    assert.deepEqual(result.coordinates[4].slice(0, 2), [3.4, 0]);
    assert.ok(Math.abs(result.coordinates[4][2] - (400 + 3.4 / 0.9)) < 1e-10);
    assert.ok(result.coordinates.every(([x, y]) => y === 0 || x === 3.4));
    assert.deepEqual(line, [[0, 0], [3.4, 0], [3.4, 2]]);
    assert.equal(buildProfile([[0, 0], [1000, 0]]).request.samples, 500);
    assert.equal(buildProfile([[0, 0], [0, 0]]), null);
});

test('Fehler und NoData behalten die betroffene Linie als 2D-Overlay', async t => {
    const server = createServer(async (req, res) => {
        const data = await json(req);
        const easting = data.coordinates[0][0];
        if (easting === 5) return res.writeHead(503).end();
        const values = Array.from({length: data.samples}, () => easting === 10 ? 0 : 430);
        return res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify({elevations: values}));
    }).listen(0, '127.0.0.1');
    t.after(() => server.close());
    await once(server, 'listening');
    const url = 'http://127.0.0.1:' + server.address().port;
    const lines = [0, 5, 10].map(x => ({geometry: {type: 'LineString', coordinates: [[x, 0], [x + 2, 0]]}}));
    const result = await addProfileHeights(lines, url, new AbortController().signal);
    assert.equal(result.missing, 2);
    assert.deepEqual(result.features[0].geometry.coordinates, [[0, 0, 430], [1, 0, 430], [2, 0, 430]]);
    assert.equal(result.features[1], lines[1]);
    assert.equal(result.features[2], lines[2]);
});

test('Leerer Profil-Endpunkt bleibt deaktiviert', () => {
    const input = {plugins: {desktop: [], mobile: []}};
    assert.equal(adaptConfig(input).plugins.desktop[1].cfg.heightProfileUrl, '/elevation/getheightprofile');
    assert.equal(adaptConfig(input, '').plugins.desktop[1].cfg.heightProfileUrl, '');
});

test('Die QWC-Integration aktualisiert Formular und Dock nur bei den relevanten Änderungen', () => {
    const patch = name => {
        const resourcePath = require.resolve('qwc2-lts/components/' + name + '.js');
        return qwcCompatibility.call({resourcePath}, readFileSync(resourcePath, 'utf8'));
    };
    assert.match(patch('AttributeForm'), /state\.formValid === formValid \? null : \{formValid\}/);
    assert.match(patch('ResizeableWindow'), /splitScreenWhenDocked && \(this\.props\.dockable !== prevProps\.dockable/);
});

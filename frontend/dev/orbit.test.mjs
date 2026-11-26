import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';

import {cameraFeatures, nearestFootprint, overlayParts, square} from '../js/orbit/geometry.mjs';

const require = createRequire(import.meta.url);
const {isPublicRead, localRequestAllowed} = require('../server/remote.cjs');
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
    assert.equal(localRequestAllowed('/ch.so.internal.lines/multipart', 'POST'), false);
    const wms = query => new URL('https://geo.so.ch/ows/somap?' + query);
    assert.equal(isPublicRead(wms('REQUEST=GetMap')), true);
    assert.equal(isPublicRead(wms('REQUEST=Transaction')), false);
    assert.equal(isPublicRead(wms('REQUEST=GetMap&request=Transaction')), false);
});

test('Die QWC-Integration aktualisiert Formular und Dock nur bei den relevanten Änderungen', () => {
    const patch = name => {
        const resourcePath = require.resolve('qwc2-lts/components/' + name + '.js');
        return qwcCompatibility.call({resourcePath}, readFileSync(resourcePath, 'utf8'));
    };
    assert.match(patch('AttributeForm'), /state\.formValid === formValid \? null : \{formValid\}/);
    assert.match(patch('ResizeableWindow'), /splitScreenWhenDocked && \(this\.props\.dockable !== prevProps\.dockable/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {createOrbitViewer} from '../js/orbit/sdk.js';

const position = {x: 2618468, y: 1240132, crs: '2056'};
const spherical = 'photo_spherical';
const field = (renderMode, photoId, pan, fov = 60, viewId = '1') => ({
    properties: new Map(Object.entries({viewId, renderMode, photoId, pan: String(pan), fov: String(fov)})),
    spatialPoint: position
});

class Signal extends Set {
    remove(listener) {
        this.delete(listener);
    }

    emit(payload) {
        this.forEach(listener => listener(payload));
    }
}

test('Die aktive Orbit-Ansicht liefert Kamerapunkt und Keil zusammen', async t => {
    let sdkViewer;
    let openingCount = 0;
    let camera;
    const frames = new Map();
    let frameId = 0;
    class SDKViewer {
        constructor() {
            sdkViewer = this;
            this.fields = [];
            this.onWorkspaceOpened = new Signal();
            this.onWorkspaceClosed = new Signal();
            this.onPhotoOpened = new Signal();
            this.onPhotoClosed = new Signal();
            this.onFieldOfViewsChanged = new Signal();
            this.onViewVectorChanged = new Signal();
        }

        doAction() {}
        close() {}

        getFieldOfViews2D() {
            return {toArray: () => this.fields};
        }

        async getFootprints2D() {
            return {toArray: () => [{
                objectType: 'footprint', symbolName: 'circle_filled', objectId: 'pano', spatialPoint: position
            }]};
        }

        async openPhoto() {
            openingCount += 1;
            this.fields = [field(spherical, 'pano', 60)];
            this.onPhotoOpened.emit();
            return '1';
        }
    }

    const flushFrame = () => {
        const scheduled = [...frames.values()];
        frames.clear();
        scheduled.forEach(callback => callback());
    };
    const globals = {
        window: {orbitgt: {mapping3d: {sdk: {viewer: {
            SDKViewer, AMap: Map, Bounds: {fromXY() {}}, Constants: {}
        }}}}},
        document: {createElement: () => ({}), head: {append: script => script.onload()}},
        requestAnimationFrame: callback => {
            frames.set(++frameId, callback);
            return frameId;
        },
        cancelAnimationFrame: id => frames.delete(id)
    };
    Object.assign(globalThis, globals);
    let adapter;
    t.after(() => {
        adapter?.close();
        Object.keys(globals).forEach(key => delete globalThis[key]);
    });
    adapter = await createOrbitViewer(new EventTarget(), {}, {
        workspace() {},
        camera(next) {
            camera = next;
        }
    }, new AbortController().signal);
    sdkViewer.onWorkspaceOpened.emit();

    const openNear = async () => {
        const result = adapter.openNear([position.x, position.y]);
        await new Promise(resolve => setImmediate(resolve));
        flushFrame();
        return result;
    };
    assert.equal(await openNear(), 'opened');
    assert.deepEqual(camera, {id: 'pano', viewId: '1', x: position.x, y: position.y, pan: 60, fov: 60});

    sdkViewer.fields = [field('photo_streetlevel', 'detail', 160)];
    sdkViewer.onPhotoOpened.emit();
    flushFrame();
    assert.equal(camera, null);

    // The photo event can arrive before the current field of view is available.
    sdkViewer.onPhotoOpened.emit();
    flushFrame();
    assert.equal(camera, null);
    sdkViewer.fields = [field(spherical, 'pano', 120, 42)];
    sdkViewer.onViewVectorChanged.emit();
    flushFrame();
    assert.equal(camera.pan, 120);
    assert.equal(camera.fov, 42);

    sdkViewer.fields = [field(spherical, 'pano', 150, 38)];
    assert.equal(adapter.refreshCamera().pan, 150);
    assert.equal(camera.fov, 38);
    assert.equal(await openNear(), 'opened');
    assert.equal(openingCount, 1);

    sdkViewer.fields = [field(spherical, 'pano', 90, 50, '2'), field('3d', '', 150)];
    sdkViewer.onFieldOfViewsChanged.emit();
    flushFrame();
    assert.equal(camera, null);

    sdkViewer.fields = [field(spherical, 'pano', 150, 38)];
    sdkViewer.onFieldOfViewsChanged.emit();
    flushFrame();
    assert.equal(camera.pan, 150);
    sdkViewer.fields = [];
    sdkViewer.onPhotoClosed.emit();
    flushFrame();
    assert.equal(camera, null);
    assert.equal(await openNear(), 'opened');
    assert.equal(openingCount, 2);
    assert.equal(camera.pan, 60);
});

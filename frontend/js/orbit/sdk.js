import {distance, nearestFootprint, orbitCrs, overlayParts, searchRadius, square} from './geometry.mjs';

const sdkUrl = 'https://cdn.3dmapping.cloud/26.2.0/javascript/viewer_sdk_javascript.js';
const mode = 'photo_spherical';
let loadingSdk;

function loadSdk() {
    if (!loadingSdk) {
        loadingSdk = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = sdkUrl;
            script.onload = () => {
                const sdk = window.orbitgt?.mapping3d?.sdk?.viewer;
                if (sdk) resolve(sdk);
                else {
                    script.remove();
                    reject(new Error('Orbit SDK konnte nicht initialisiert werden.'));
                }
            };
            script.onerror = () => {
                script.remove();
                reject(new Error('Orbit SDK konnte nicht geladen werden.'));
            };
            document.head.append(script);
        }).catch(error => {
            loadingSdk = null;
            throw error;
        });
    }
    return loadingSdk;
}

function makeObjects(sdk, features, color) {
    const {AList, Color, Coordinate, CoordinatePart, CoordinatePath, MapObject} = sdk;
    const objects = new AList(MapObject.TYPE);
    for (const feature of features) {
        overlayParts(feature.geometry).forEach(({kind, parts}, index) => {
            if (!parts.length || parts.some(part => part.length < (kind === 'area' ? 4 : 2) ||
                part.some(point => !Number.isFinite(point[0]) || !Number.isFinite(point[1])))) return;

            const path = new CoordinatePath();
            path.crs = orbitCrs;
            for (const coordinates of parts) {
                const part = new CoordinatePart();
                part.crs = orbitCrs;
                for (const [x, y, z] of coordinates) {
                    part.points.add(Number.isFinite(z) ? Coordinate.fromXYZ(orbitCrs, x, y, z) : Coordinate.fromXY(orbitCrs, x, y));
                }
                path.parts.add(part);
            }
            const object = new MapObject();
            object.objectId = String(feature.id) + ':' + index;
            object.color = Color.fromRGB(...color);
            object.fillColor = Color.fromRGBA(...color, 65);
            object.lineWidth = 3;
            if (kind === 'line') object.spatialLine = path;
            else object.spatialArea = path;
            if (typeof feature.properties?.name === 'string') object.tooltip = feature.properties.name;
            objects.add(object);
        });
    }
    return objects;
}

async function withTimeout(promise, ms) {
    let timer;
    try {
        return await Promise.race([promise, new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Orbit antwortet nicht.')), ms);
        })]);
    } finally {
        clearTimeout(timer);
    }
}

export async function createOrbitViewer(container, config, callbacks, signal) {
    const sdk = await loadSdk();
    signal.throwIfAborted();
    const {AMap, Bounds, Constants, SDKViewer} = sdk;
    const demo = config.profile === 'bentley';
    const login = new AMap();
    login.set(Constants.LOGIN_MODE, Constants.LOGINMODE_PUBLISHER);
    login.set(Constants.LOGIN_HOST, config.publisher);
    login.set(Constants.LOGIN_PUBLICATION_NAME, config.publication);
    if (demo) {
        // Published example account for the public Bentley SDK demonstration.
        login.set(Constants.LOGIN_USERNAME, 'demo');
        login.set(Constants.LOGIN_PASSWORD, 'demo');
    }
    const options = new AMap();
    options.set(demo ? Constants.STARTUP_AUTO_LOGIN : Constants.STARTUP_PRESET_LOGIN, login);
    options.set(Constants.STARTUP_CRS, orbitCrs);
    if (config.boundedSearch) {
        const state = JSON.stringify({photoMaxSearchDistanceStreetlevelSpherical: searchRadius,
            photoSearchCenterStreetlevelSpherical: 'focus', photoSearchDimensionsStreetlevelSpherical: '2d',
            sphericalStreetlevelSortingMethod: 3});
        options.set(Constants.STARTUP_WORKSPACE_STATE, state);
    }
    const viewer = new SDKViewer('QWC2 · Strassenbilder', container, options);
    const subscriptions = [];
    let workspace = 0;
    let ready = false;
    let accepted = null;
    let pending = null;
    let frame = null;
    const patchedPhotoViews = new WeakSet();
    const renderedLayers = new Set();

    const subscribe = (event, listener) => {
        event.add(listener);
        subscriptions.push(() => event.remove(listener));
    };
    function reportDirection() {
        frame = null;
        if (!accepted || !ready) return;
        const view = viewer.getFieldOfViews2D().toArray().find(item =>
            item.properties?.get('photoId') === accepted.id && item.properties.get('renderMode') === mode);
        const pan = parseFloat(view?.properties.get('pan'));
        const fov = parseFloat(view?.properties.get('fov'));
        if (Number.isFinite(pan) && Number.isFinite(fov) && fov > 0) callbacks.heading({pan, fov});
    }
    function accept(photo) {
        accepted = photo;
        callbacks.photo(photo);
        reportDirection();
    }
    function fixPlanarPhotoHotspot() {
        // SDK 26.2.0's native hotspot omits options, which the planar branch reads after opening the image.
        const views = viewer.Yie?.dataStore?.orbitManager?.orbitViewers ?? [];
        for (const view of views) {
            const openPhotoObject = view.openPhotoObject;
            if (patchedPhotoViews.has(view) || typeof openPhotoObject !== 'function') continue;
            view.openPhotoObject = (renderMode, photo, options) => {
                if (renderMode === mode && options == null && photo?.isPlanarCamera?.() && photo.hasAccurateProjection?.()) {
                    options = {};
                }
                return openPhotoObject.call(view, renderMode, photo, options);
            };
            patchedPhotoViews.add(view);
        }
    }

    subscribe(viewer.onWorkspaceOpened, () => {
        workspace += 1;
        ready = true;
        viewer.doAction('setSetting:sidebarVisible:false');
        callbacks.workspace(true);
    });
    subscribe(viewer.onWorkspaceClosed, () => {
        workspace += 1;
        ready = false;
        accepted = null;
        renderedLayers.clear();
        pending?.finish('unavailable');
        callbacks.workspace(false);
    });
    subscribe(viewer.onPhotoOpened, payload => {
        fixPlanarPhotoHotspot();
        const {photoId, photoPosition, renderMode} = JSON.parse(payload);
        if (!ready || renderMode !== mode || String(photoPosition?.crs) !== orbitCrs ||
            !Number.isFinite(photoPosition.x) || !Number.isFinite(photoPosition.y)) return;
        const photo = {id: photoId, x: photoPosition.x, y: photoPosition.y};
        if (pending) {
            if (pending.id && pending.id !== photoId) return;
            if (pending.target && distance(pending.target, [photo.x, photo.y]) > searchRadius) {
                pending.finish('mismatch');
            } else {
                accept(photo);
                pending.finish('opened');
            }
        } else if (accepted) {
            accept(photo);
        }
    });
    subscribe(viewer.onFieldOfViewsChanged, () => {
        if (frame === null) frame = requestAnimationFrame(reportDirection);
    });

    function openAndWait(target, id, open) {
        return new Promise(resolve => {
            const timer = setTimeout(() => pending?.finish('unavailable'), 15000);
            pending = {
                target, id,
                finish(result) {
                    clearTimeout(timer);
                    pending = null;
                    resolve(result);
                }
            };
            const active = pending;
            Promise.resolve().then(open).then(viewId => {
                if (!viewId && pending === active) active.finish(id ? 'unavailable' : 'missing');
            }, () => {
                if (pending === active) active.finish('unavailable');
            });
        });
    }

    return {
        resize(width, height) {
            viewer.setSize(width, height);
        },
        async openNear(target) {
            if (!ready) return 'unavailable';
            const current = workspace;
            const points = await withTimeout(
                viewer.getFootprints2D(Bounds.fromXY(orbitCrs, ...square(target, searchRadius)), 1000), 10000
            );
            if (signal.aborted || workspace !== current) return 'unavailable';
            const footprint = nearestFootprint(points.toArray(), target);
            if (!footprint && !config.boundedSearch) return 'missing';
            if (footprint && accepted?.id === footprint.objectId) return 'opened';

            const previous = accepted;
            const result = footprint
                ? await openAndWait(target, footprint.objectId, () => viewer.openPhoto(footprint))
                : await openAndWait(target, null, () => viewer.addView(sdk.Coordinate.fromXY(orbitCrs, ...target), mode, true));
            if ((result === 'mismatch' || result === 'unavailable') && previous && !signal.aborted && workspace === current) {
                const restore = new AMap();
                restore.set(Constants.STARTUP_PHOTO_ID, previous.id);
                const restored = await openAndWait(null, previous.id, () => viewer.addViewWithOptions(undefined, undefined, true, restore));
                if (restored !== 'opened') {
                    accepted = null;
                    callbacks.photo(null);
                }
            }
            return result === 'mismatch' ? 'unavailable' : result;
        },
        replaceLayer(key, features, color) {
            if (!ready) return;
            const name = 'QWC2:' + workspace + ':' + key;
            if (renderedLayers.delete(name)) viewer.clearOverlayObjects(name);
            if (features.length) {
                const objects = makeObjects(sdk, features, color);
                if (objects.size()) {
                    viewer.addOverlayObjects(objects, name);
                    renderedLayers.add(name);
                }
            }
        },
        close() {
            subscriptions.forEach(unsubscribe => unsubscribe());
            pending?.finish('unavailable');
            if (frame !== null) cancelAnimationFrame(frame);
            viewer.close();
        }
    };
}

import {distance, nearestFootprint, orbitCrs, searchRadius, square} from './geometry.mjs';

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
    options.set(Constants.STARTUP_ADD_MAPOBJECT_CAMERA_PROPERTIES, true);
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
    let lastPanorama = null;
    let camera = null;
    let activeViewId;
    let choosing = false;
    let pending = null;
    let frame = null;
    let sidebarMode = 1;
    let overviewStyle;
    const patchedPhotoViews = new WeakSet();

    const subscribe = (event, listener) => {
        event.add(listener);
        subscriptions.push(() => event.remove(listener));
    };
    function readCamera(viewId) {
        const fields = viewer.getFieldOfViews2D().toArray().filter(item => item.properties?.get('renderMode'));
        const {activeWorkspaceState, orbitManager} = viewer.Yie?.dataStore ?? {};
        const layout = activeWorkspaceState?.viewerLayout;
        const requestedId = viewId ?? layout?.getMaximizedView()?.id;
        const selectedId = requestedId ?? activeViewId;
        const nativeView = orbitManager?.findOrbitViewerById(selectedId);
        if (nativeView?.viewerState?.openingPhoto) return null;
        const selected = fields.find(item => item.properties.get('viewId') === selectedId) ??
            (requestedId == null && !nativeView ? fields[0] : null);
        if (selected?.properties.get('renderMode') !== mode) return null;

        const id = selected.properties.get('photoId');
        const {x, y, crs} = selected.spatialPoint ?? {};
        const pan = parseFloat(selected.properties.get('pan'));
        const fov = parseFloat(selected.properties.get('fov'));
        if (!id || String(crs) !== orbitCrs || ![x, y, pan, fov].every(Number.isFinite) || fov <= 0) return null;
        return {id, viewId: selected.properties.get('viewId'), x, y, pan, fov};
    }

    function publishCamera(next) {
        if (next) lastPanorama = next;
        if (next !== camera && (!next || !camera || Object.keys(next).some(key => next[key] !== camera[key]))) {
            camera = next;
            callbacks.camera(next);
        }
        return camera;
    }

    function refreshCamera() {
        if (!ready || choosing || signal.aborted || !lastPanorama) return null;
        return publishCamera(readCamera());
    }

    function scheduleCamera() {
        if (frame !== null) return;
        frame = requestAnimationFrame(() => {
            frame = null;
            if (pending?.viewId != null) {
                const next = readCamera(pending.viewId);
                if (next && (!pending.id || next.id === pending.id)) {
                    pending.finish(pending.target && distance(pending.target, [next.x, next.y]) > searchRadius ? 'mismatch' : next);
                }
            } else {
                refreshCamera();
            }
        });
    }

    function selectViewport(event) {
        const views = viewer.Yie?.dataStore?.orbitManager?.orbitViewers ?? [];
        const target = event.composedPath()[0];
        const view = views.find(item => !item.view.isReference() &&
            item.view.getMapViewerContext()?.getElement()?.contains(target));
        if (view) {
            activeViewId = view.view.getViewerId();
            scheduleCamera();
        }
    }

    function setOverviewVisible(show) {
        if (show) {
            overviewStyle?.remove();
            return;
        }
        if (!overviewStyle) {
            overviewStyle = document.createElement('style');
            // Orbit 26.2 puts the reference-map resize button inside its floating viewport.
            overviewStyle.textContent = '.oviewport.floating:has(.resize-toggle) { display: none !important; }';
        }
        const root = container.firstElementChild?.shadowRoot ?? container;
        root.append(overviewStyle);
    }

    function setSidebarVisible(show) {
        const {dataStore, viewStore} = viewer.Yie ?? {};
        if (!show) {
            sidebarMode = dataStore?.activeWorkspaceState?.sidebarMode || sidebarMode;
            viewer.doAction('setSetting:sidebarVisible:false');
            return false;
        }
        viewer.doAction('setSetting:sidebarPosition:left');
        viewer.doAction('setSetting:sidebarVisible:true');
        if (!dataStore?.showSidebar || !viewStore?.setSidebarMode) return false;
        if (!dataStore.activeWorkspaceState.sidebarMode) viewStore.setSidebarMode(sidebarMode);
        return true;
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
        setSidebarVisible(false);
        callbacks.workspace(true);
    });
    subscribe(viewer.onWorkspaceClosed, () => {
        workspace += 1;
        ready = false;
        lastPanorama = null;
        camera = null;
        activeViewId = undefined;
        choosing = false;
        pending?.finish('unavailable');
        callbacks.workspace(false);
    });
    subscribe(viewer.onPhotoOpened, () => {
        fixPlanarPhotoHotspot();
        scheduleCamera();
    });
    subscribe(viewer.onPhotoClosed, scheduleCamera);
    subscribe(viewer.onFieldOfViewsChanged, scheduleCamera);
    subscribe(viewer.onViewVectorChanged, scheduleCamera);
    container.addEventListener('focusin', selectViewport);
    container.addEventListener('pointerdown', selectViewport, true);

    function openAndWait(target, id, open) {
        return new Promise(resolve => {
            const active = {
                target, id,
                finish(result) {
                    clearTimeout(timer);
                    pending = null;
                    resolve(result);
                }
            };
            const timer = setTimeout(() => active.finish('unavailable'), 15000);
            pending = active;
            Promise.resolve().then(open).then(viewId => {
                if (pending !== active) return;
                if (viewId == null) {
                    active.finish(id ? 'unavailable' : 'missing');
                } else {
                    active.viewId = viewId;
                    scheduleCamera();
                }
            }, () => {
                if (pending === active) active.finish('unavailable');
            });
        });
    }

    return {
        refreshCamera,
        setSidebarVisible,
        setOverviewVisible,
        resize(width, height) {
            viewer.setSize(width, height);
        },
        async openNear(target) {
            if (!ready || choosing) return 'unavailable';
            const current = workspace;
            const points = await withTimeout(
                viewer.getFootprints2D(Bounds.fromXY(orbitCrs, ...square(target, searchRadius)), 1000), 10000
            );
            if (signal.aborted || workspace !== current || choosing) return 'unavailable';
            const footprint = nearestFootprint(points.toArray(), target);
            if (!footprint && !config.boundedSearch) return 'missing';
            const visible = refreshCamera();
            if (footprint && visible?.id === footprint.objectId &&
                distance(target, [visible.x, visible.y]) <= searchRadius) return 'opened';

            const previous = lastPanorama;
            choosing = true;
            publishCamera(null);
            try {
                const result = footprint
                    ? await openAndWait(target, footprint.objectId, () => viewer.openPhoto(footprint))
                    : await openAndWait(target, null, () => viewer.addView(sdk.Coordinate.fromXY(orbitCrs, ...target), mode, true));
                if (signal.aborted || workspace !== current) return 'unavailable';
                if (typeof result === 'object') {
                    activeViewId = result.viewId;
                    publishCamera(result);
                    return 'opened';
                }
                if ((result === 'mismatch' || result === 'unavailable') && previous) {
                    const restore = new AMap();
                    restore.set(Constants.STARTUP_PHOTO_ID, previous.id);
                    const restored = await openAndWait(null, previous.id, () => viewer.addViewWithOptions(undefined, undefined, true, restore));
                    if (signal.aborted || workspace !== current) return 'unavailable';
                    if (typeof restored === 'object') {
                        activeViewId = restored.viewId;
                        publishCamera(restored);
                    } else {
                        lastPanorama = null;
                    }
                } else if (result === 'missing') {
                    publishCamera(visible);
                }
                return result === 'mismatch' ? 'unavailable' : result;
            } finally {
                if (workspace === current) choosing = false;
            }
        },
        close() {
            ready = false;
            workspace += 1;
            subscriptions.forEach(unsubscribe => unsubscribe());
            container.removeEventListener('focusin', selectViewport);
            container.removeEventListener('pointerdown', selectViewport, true);
            pending?.finish('unavailable');
            if (frame !== null) cancelAnimationFrame(frame);
            overviewStyle?.remove();
            viewer.close();
        }
    };
}

import React, {useEffect, useRef, useState} from 'react';

import {addLayerFeatures, LayerRole, removeLayer} from 'qwc2/actions/layers';
import {panTo} from 'qwc2/actions/map';
import MapButton from 'qwc2/components/MapButton';
import MapSelection from 'qwc2/components/MapSelection';
import ResizeableWindow from 'qwc2/components/ResizeableWindow';
import CoordinatesUtils from 'qwc2/utils/CoordinatesUtils';
import LocaleUtils from 'qwc2/utils/LocaleUtils';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';

import {cameraFeatures, mapCrs, searchRadius} from './orbit/geometry.mjs';
import {createOrbitViewer} from './orbit/sdk';

import './Orbit3DM.css';

const cameraLayer = 'orbit3dm-camera';
const targetLayer = 'orbit3dm-target';
const profile = process.env.OrbitProfile;
const bentley = profile === 'bentley';
const tr = (key, ...args) => LocaleUtils.tr('orbit3dm.' + key, ...args);
const createViewer = process.env.OrbitProfile === 'fixture'
    ? (container, config, callbacks, signal) => import('./orbit/fixture').then(({createFixtureViewer}) => {
        signal.throwIfAborted();
        return createFixtureViewer(container, config, callbacks);
    })
    : createOrbitViewer;

function ViewerPanel({publisher, publication, boundedSearch, visible, onClose}) {
    const dispatch = useDispatch();
    const map = useSelector(state => state.map);
    const mapTaskActive = useSelector(state => Boolean(state.task?.id || state.task?.blocked));
    const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 840px)').matches);
    const [workspace, setWorkspace] = useState('loading');
    const [viewer, setViewer] = useState(null);
    const [camera, setCamera] = useState(null);
    const [hasPhoto, setHasPhoto] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [sidebarUnavailable, setSidebarUnavailable] = useState(false);
    const [overviewVisible, setOverviewVisible] = useState(true);
    const [selecting, setSelecting] = useState(false);
    const [status, setStatus] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const [searching, setSearching] = useState(false);
    const [previous, setPrevious] = useState(false);
    const busy = useRef(false);
    const searchId = useRef(0);
    const host = useRef(null);
    const cameraRef = useRef(null);
    const visibleRef = useRef(visible);

    useEffect(() => {
        const query = matchMedia('(max-width: 840px)');
        const update = event => setNarrow(event.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        const abort = new AbortController();
        let instance;
        let observer;
        const container = host.current;
        async function initialize() {
            setViewer(null);
            setWorkspace('loading');
            const callbacks = {
                workspace(open) {
                    if (abort.signal.aborted) return;
                    searchId.current += 1;
                    busy.current = false;
                    setSearching(false);
                    setWorkspace(open ? 'ready' : 'login');
                    setStatus(null);
                    setCamera(null);
                    cameraRef.current = null;
                    setHasPhoto(false);
                    setSidebarUnavailable(false);
                    setPrevious(false);
                    dispatch(removeLayer(targetLayer));
                },
                camera(next) {
                    if (abort.signal.aborted) return;
                    cameraRef.current = next;
                    setCamera(next);
                    if (next) setHasPhoto(true);
                }
            };
            const config = {
                profile,
                publisher: bentley ? 'https://publisher.orbitgt.com' : publisher,
                publication: bentley ? 'demo.mobilemapping' : publication,
                boundedSearch
            };
            instance = await createViewer(container, config, callbacks, abort.signal);
            if (abort.signal.aborted) {
                instance.close();
                return;
            }
            setViewer(instance);
            // Workspace may already have opened with the fixture.
            setWorkspace(current => current === 'loading' ? (bentley ? 'connecting' : 'login') : current);
            function resize() {
                if (container.clientWidth && container.clientHeight) instance.resize(container.clientWidth, container.clientHeight);
            }
            observer = new ResizeObserver(resize);
            observer.observe(container);
            resize();
        }
        initialize().catch(() => {
            if (!abort.signal.aborted) setWorkspace('error');
        });
        return () => {
            abort.abort();
            searchId.current += 1;
            observer?.disconnect();
            instance?.close();
        };
    }, [attempt, publisher, publication, boundedSearch, dispatch]);

    useEffect(() => () => {
        dispatch(removeLayer(cameraLayer));
        dispatch(removeLayer(targetLayer));
    }, [dispatch]);

    useEffect(() => {
        if (visible && camera) {
            dispatch(addLayerFeatures({id: cameraLayer, projection: mapCrs, role: LayerRole.SELECTION},
                cameraFeatures(camera), true));
        } else dispatch(removeLayer(cameraLayer));
    }, [camera, visible, dispatch]);

    useEffect(() => {
        if (workspace === 'ready' && viewer?.setSidebarVisible) {
            const shown = viewer.setSidebarVisible(sidebarVisible);
            setSidebarUnavailable(sidebarVisible && !shown);
        }
    }, [viewer, workspace, sidebarVisible]);

    useEffect(() => {
        if (workspace === 'ready') viewer?.setOverviewVisible?.(overviewVisible);
    }, [viewer, workspace, overviewVisible]);

    useEffect(() => {
        visibleRef.current = visible;
        if (!visible) dispatch(removeLayer(targetLayer));
        if (!visible || mapTaskActive || workspace !== 'ready') setSelecting(false);
    }, [dispatch, mapTaskActive, visible, workspace]);

    async function choose(coordinates) {
        setSelecting(false);
        if (!visible || !viewer || workspace !== 'ready' || busy.current) return;
        const target = CoordinatesUtils.reproject(coordinates, map.projection, mapCrs);
        if (!target?.every(Number.isFinite)) return;

        busy.current = true;
        const request = ++searchId.current;
        setPrevious(false);
        setSearching(true);
        setStatus(null);
        dispatch(removeLayer(targetLayer));
        let result;
        try {
            result = await viewer.openNear(target);
        } catch {
            result = 'unavailable';
        }
        if (request !== searchId.current) return;
        busy.current = false;
        setSearching(false);
        if (result === 'opened') return;

        setPrevious(Boolean(cameraRef.current));
        setStatus(result === 'missing' ? tr('missing', searchRadius) : tr('photoError'));
        if (result === 'missing' && visibleRef.current) {
            dispatch(addLayerFeatures({id: targetLayer, projection: mapCrs, role: LayerRole.SELECTION}, [{
                id: 'search-target', type: 'Feature', crs: mapCrs, properties: {}, styleName: 'default',
                geometry: {type: 'Point', coordinates: target},
                styleOptions: {circleRadius: 6, strokeWidth: 2, strokeColor: [143, 61, 8, 1], fillColor: [255, 183, 78, 0.35]}
            }], true));
        }
    }

    const ready = workspace === 'ready';
    const notice = status || (searching ? tr('searching') : null);
    const covered = ready && (!hasPhoto || searching);
    return (
        <ResizeableWindow detachable={false} dockable={narrow ? 'bottom' : 'right'}
            icon="camera" initialHeight={Math.round(innerHeight * 0.50)}
            initialWidth={Math.max(320, Math.round(innerWidth * 0.43))}
            initiallyDocked onClose={onClose} scrollable={false} splitScreenWhenDocked title={tr('title')} usePortal visible={visible}>
            <div className="orbit3dm-panel" onKeyDown={event => {
                if (event.key === 'Escape' && selecting) {
                    event.stopPropagation();
                    setSelecting(false);
                }
            }}>
                <div className="orbit3dm-toolbar">
                    <button aria-pressed={selecting} disabled={!ready || mapTaskActive || searching}
                        onClick={() => setSelecting(current => !current)} title={mapTaskActive ? tr('pickWhileTaskActive') : undefined}
                        type="button">{tr('pick')}</button>
                    <button disabled={!ready || searching} onClick={() => choose(map.center)}
                        type="button">{tr('center')}</button>
                    <button disabled={!camera || searching} onClick={() => {
                        const current = viewer?.refreshCamera();
                        if (current) dispatch(panTo([current.x, current.y], mapCrs));
                    }} type="button">{tr('showCamera')}</button>
                    {ready && viewer?.setSidebarVisible && (
                        <details className="orbit3dm-view-options">
                            <summary>{tr('viewOptions')}</summary>
                            <div>
                                <label>
                                    <input checked={sidebarVisible && !sidebarUnavailable} disabled={sidebarUnavailable}
                                        onChange={event => setSidebarVisible(event.target.checked)} type="checkbox" />
                                    {tr('sidebar')}
                                </label>
                                <label>
                                    <input checked={overviewVisible} onChange={event => setOverviewVisible(event.target.checked)}
                                        type="checkbox" />
                                    {tr('overview')}
                                </label>
                                {sidebarUnavailable && <small role="status">{tr('sidebarUnavailable')}</small>}
                            </div>
                        </details>
                    )}
                </div>
                {selecting && <div className="orbit3dm-message" role="status">{tr('pickPrompt')}</div>}
                {notice && <div className="orbit3dm-message" role="status">{notice}{previous ? ' · ' + tr('previous') : ''}</div>}
                {bentley && ready && <div className="orbit3dm-message">{tr('demo')}</div>}
                <div className="orbit3dm-stage">
                    <div className="orbit3dm-view" ref={host} />
                    {covered && <div className="orbit3dm-cover">{searching ? tr('searching') : tr('choose')}</div>}
                    {workspace === 'loading' && <div className="orbit3dm-cover">{tr('loading')}</div>}
                    {workspace === 'connecting' && <div className="orbit3dm-message orbit3dm-connection" role="status">{tr('connecting')}</div>}
                    {workspace === 'login' && <div className="orbit3dm-message orbit3dm-connection" role="status">{tr('login')}</div>}
                    {workspace === 'error' && <div className="orbit3dm-cover" role="alert">
                        {tr('sdkError')} <button onClick={() => setAttempt(count => count + 1)} type="button">{tr('retry')}</button>
                    </div>}
                </div>
            </div>
            <MapSelection active={visible && selecting && ready && !mapTaskActive}
                drawCondition={event => event.originalEvent.button === 0 && event.originalEvent.isPrimary !== false}
                geometryChanged={geometry => geometry && selecting && !mapTaskActive && choose(geometry.coordinates)}
                geomType="Point" hideGeometry />
        </ResizeableWindow>
    );
}

export default function Orbit3DM({
    buttonPosition = 5, publisher = 'https://www.digitalmaps.ch',
    publication = '150449_Kantonsstrassen_Solothurn', boundedSearch = false, visible: controlledVisible, onVisibilityChange
}) {
    const [localVisible, setLocalVisible] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);
    const visible = controlledVisible ?? localVisible;
    const setVisible = onVisibilityChange ?? setLocalVisible;
    useEffect(() => {
        if (visible) setHasOpened(true);
    }, [visible]);
    return (
        <>
            <MapButton active={visible} icon="camera" onClick={() => setVisible(!visible)}
                buttonRef={button => {
                    button?.setAttribute('aria-label', tr('title'));
                    button?.setAttribute('aria-expanded', String(visible));
                }}
                position={buttonPosition} tooltip={tr('title')} />
            {(visible || hasOpened) && <ViewerPanel boundedSearch={boundedSearch} onClose={() => setVisible(false)}
                publication={publication} publisher={publisher} visible={visible} />}
        </>
    );
}

Orbit3DM.propTypes = {
    boundedSearch: PropTypes.bool,
    buttonPosition: PropTypes.number,
    onVisibilityChange: PropTypes.func,
    publication: PropTypes.string,
    publisher: PropTypes.string,
    visible: PropTypes.bool
};

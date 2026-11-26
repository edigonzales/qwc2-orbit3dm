import React, {useEffect, useRef, useState} from 'react';

import {addLayerFeatures, LayerRole, removeLayer} from 'qwc2/actions/layers';
import {panTo} from 'qwc2/actions/map';
import MapButton from 'qwc2/components/MapButton';
import MapSelection from 'qwc2/components/MapSelection';
import ResizeableWindow from 'qwc2/components/ResizeableWindow';
import CoordinatesUtils from 'qwc2/utils/CoordinatesUtils';
import EditingInterface from 'qwc2/utils/EditingInterface';
import LocaleUtils from 'qwc2/utils/LocaleUtils';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';

import {cameraFeatures, featureLimit, mapCrs, overlayRadius, searchRadius, square} from './orbit/geometry.mjs';
import {createOrbitViewer} from './orbit/sdk';

import './Orbit3DM.css';

const cameraLayer = 'orbit3dm-camera';
const targetLayer = 'orbit3dm-target';
const profile = process.env.OrbitProfile;
const bentley = profile === 'bentley';
const emptyDatasets = [];
const tr = (key, ...args) => LocaleUtils.tr('orbit3dm.' + key, ...args);
const createViewer = process.env.OrbitProfile === 'fixture'
    ? (container, config, callbacks, signal) => import('./orbit/fixture').then(({createFixtureViewer}) => {
        signal.throwIfAborted();
        return createFixtureViewer(container, config, callbacks);
    })
    : createOrbitViewer;

function Overlay({dataset, viewer, photo, enabled, onWarning}) {
    const rev = useSelector(state => state.layers.flat.find(layer =>
        layer.id === dataset.layer || layer.wms_name === dataset.layer)?.rev);
    useEffect(() => {
        if (!viewer || !photo) return undefined;
        const replace = (features = []) => viewer.replaceLayer(dataset.id, features, dataset.color);
        if (!enabled) {
            replace();
            onWarning(dataset.id, null);
            return undefined;
        }
        let current = true;
        replace();
        onWarning(dataset.id, null);
        EditingInterface.getFeatures({editDataset: dataset.id, fields: []}, mapCrs, result => {
            if (!current) return;
            if (!result) {
                onWarning(dataset.id, tr('dataError', dataset.label));
                return;
            }
            replace(result.features);
            if (result.numberMatched > featureLimit) onWarning(dataset.id, tr('layerLimit', dataset.label, featureLimit));
        }, {bbox: square([photo.x, photo.y], overlayRadius), limit: featureLimit});
        return () => {
            current = false;
        };
    }, [dataset, viewer, photo, enabled, rev, onWarning]);
    return null;
}

function ViewerPanel({publisher, publication, datasets, boundedSearch, onClose}) {
    const dispatch = useDispatch();
    const map = useSelector(state => state.map);
    const editing = useSelector(state => Boolean(state.editing.currentContext || state.task.id || state.task.blocked));
    const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 840px)').matches);
    const [workspace, setWorkspace] = useState('loading');
    const [viewer, setViewer] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [heading, setHeading] = useState(null);
    const [selecting, setSelecting] = useState(false);
    const [status, setStatus] = useState(null);
    const [selected, setSelected] = useState(() => datasets.map(dataset => dataset.id));
    const [warnings, setWarnings] = useState({});
    const [attempt, setAttempt] = useState(0);
    const [searching, setSearching] = useState(false);
    const [previous, setPrevious] = useState(false);
    const busy = useRef(false);
    const searchId = useRef(0);
    const host = useRef(null);
    const cameraRef = useRef(null);
    const warningRef = useRef((id, message) => setWarnings(current => ({...current, [id]: message})));

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
                    setPhoto(null);
                    cameraRef.current = null;
                    setHeading(null);
                    setPrevious(false);
                    setWarnings({});
                    dispatch(removeLayer(targetLayer));
                },
                photo(next) {
                    if (abort.signal.aborted) return;
                    if (cameraRef.current?.id !== next?.id) setHeading(null);
                    cameraRef.current = next;
                    setPhoto(next);
                },
                heading(direction) {
                    if (!abort.signal.aborted) setHeading(direction);
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
        if (photo) {
            dispatch(addLayerFeatures({id: cameraLayer, projection: mapCrs, role: LayerRole.SELECTION},
                cameraFeatures(photo, heading), true));
        } else dispatch(removeLayer(cameraLayer));
    }, [photo, heading, dispatch]);

    useEffect(() => {
        if (editing || workspace !== 'ready') setSelecting(false);
    }, [editing, workspace]);

    async function choose(coordinates) {
        setSelecting(false);
        if (!viewer || workspace !== 'ready' || busy.current) return;
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
        if (result === 'missing') {
            dispatch(addLayerFeatures({id: targetLayer, projection: mapCrs, role: LayerRole.SELECTION}, [{
                id: 'search-target', type: 'Feature', crs: mapCrs, properties: {}, styleName: 'default',
                geometry: {type: 'Point', coordinates: target},
                styleOptions: {circleRadius: 6, strokeWidth: 2, strokeColor: [143, 61, 8, 1], fillColor: [255, 183, 78, 0.35]}
            }], true));
        }
    }

    const ready = workspace === 'ready';
    const notice = status || (searching ? tr('searching') : null);
    const covered = ready && (!photo || searching);
    return (
        <ResizeableWindow detachable={false} dockable={narrow ? 'bottom' : 'right'}
            icon="camera" initialHeight={Math.round(innerHeight * 0.50)}
            initialWidth={Math.max(320, Math.round(innerWidth * 0.43))}
            initiallyDocked onClose={onClose} scrollable={false} splitScreenWhenDocked title={tr('title')}>
            <div className="orbit3dm-panel" onKeyDown={event => {
                if (event.key === 'Escape' && selecting) {
                    event.stopPropagation();
                    setSelecting(false);
                }
            }}>
                <div className="orbit3dm-toolbar">
                    <button aria-pressed={selecting} disabled={!ready || editing || searching}
                        onClick={() => setSelecting(current => !current)} title={editing ? tr('pickWhileEditing') : undefined}
                        type="button">{tr('pick')}</button>
                    <button disabled={!ready || searching} onClick={() => choose(map.center)}
                        type="button">{tr('center')}</button>
                    <button disabled={!photo || searching} onClick={() => dispatch(panTo([photo.x, photo.y], mapCrs))}
                        type="button">{tr('showCamera')}</button>
                    {datasets.length > 0 && (
                        <details className="orbit3dm-layers">
                            <summary>{tr('layers')}</summary>
                            <div>
                                {datasets.map(dataset => (
                                    <label key={dataset.id}>
                                        <input checked={selected.includes(dataset.id)} onChange={event => {
                                            const checked = event.target.checked;
                                            setSelected(current => checked ? [...current, dataset.id] : current.filter(id => id !== dataset.id));
                                        }} type="checkbox" />
                                        {dataset.label}
                                    </label>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
                {selecting && <div className="orbit3dm-message" role="status">{tr('pickPrompt')}</div>}
                {notice && <div className="orbit3dm-message" role="status">{notice}{previous ? ' · ' + tr('previous') : ''}</div>}
                {bentley && ready && <div className="orbit3dm-message">{tr('demo')}</div>}
                {photo && selected.length > 0 && <div className="orbit3dm-message">{tr('approximate')}</div>}
                {Object.entries(warnings).filter(([, message]) => message).map(([id, message]) => (
                    <div className="orbit3dm-message" key={id} role="status">{message}</div>
                ))}
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
            <MapSelection active={selecting && ready && !editing}
                drawCondition={event => event.originalEvent.button === 0 && event.originalEvent.isPrimary !== false}
                geometryChanged={geometry => geometry && selecting && !editing && choose(geometry.coordinates)}
                geomType="Point" hideGeometry />
            {datasets.map(dataset => <Overlay dataset={dataset} enabled={selected.includes(dataset.id)}
                key={dataset.id} onWarning={warningRef.current} photo={photo} viewer={viewer} />)}
        </ResizeableWindow>
    );
}

export default function Orbit3DM({
    buttonPosition = 5, publisher = 'https://www.digitalmaps.ch',
    publication = '150449_Kantonsstrassen_Solothurn', datasets = emptyDatasets, boundedSearch = false
}) {
    const [visible, setVisible] = useState(false);
    return (
        <>
            <MapButton active={visible} icon="camera" onClick={() => setVisible(current => !current)}
                buttonRef={button => {
                    button?.setAttribute('aria-label', tr('title'));
                    button?.setAttribute('aria-expanded', String(visible));
                }}
                position={buttonPosition} tooltip={tr('title')} />
            {visible && <ViewerPanel boundedSearch={boundedSearch} datasets={datasets} onClose={() => setVisible(false)}
                publication={publication} publisher={publisher} />}
        </>
    );
}

Orbit3DM.propTypes = {
    boundedSearch: PropTypes.bool,
    buttonPosition: PropTypes.number,
    datasets: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired, layer: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired, color: PropTypes.arrayOf(PropTypes.number).isRequired
    })),
    publication: PropTypes.string,
    publisher: PropTypes.string
};

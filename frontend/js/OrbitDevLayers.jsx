import React, {useEffect} from 'react';

import {addLayer, changeLayerProperty, LayerRole} from 'qwc2/actions/layers';
import EditingInterface from 'qwc2/utils/EditingInterface';
import {useDispatch, useSelector} from 'react-redux';

import {demoDatasets, editConfig} from './orbit/datasets';
import {featureLimit, mapCrs} from './orbit/geometry.mjs';

function DevLayer({dataset}) {
    const dispatch = useDispatch();
    const theme = useSelector(state => state.theme.current);
    const themeLayer = useSelector(state => state.layers.flat.find(layer => layer.role === LayerRole.THEME)?.id);
    const exists = useSelector(state => state.layers.flat.some(layer => layer.id === dataset.layer));
    const rev = useSelector(state => state.layers.flat.find(layer => layer.id === dataset.layer)?.rev);
    const bbox = useSelector(state => state.map.bbox?.bounds);
    const projection = useSelector(state => state.map.projection);
    const config = editConfig(dataset);

    useEffect(() => {
        if (!theme || !themeLayer || exists || projection !== mapCrs) return;
        dispatch(addLayer({
            id: dataset.layer, type: 'vector', name: dataset.layer, wms_name: dataset.layer,
            title: dataset.label, role: LayerRole.USERLAYER, projection: mapCrs, features: [],
            editConfig: {[dataset.layer]: config}
        }));
    }, [dispatch, theme, themeLayer, exists, projection, dataset]);

    useEffect(() => {
        if (!exists || !dataset.zoomToDataset) return undefined;
        let current = true;
        EditingInterface.getExtent(config, mapCrs, result => {
            if (!current) return;
            const bounds = result?.bbox;
            const valid = Array.isArray(bounds) && bounds.length === 4 && bounds.every(Number.isFinite);
            dispatch(changeLayerProperty(dataset.layer, 'bbox', valid ? {bounds, crs: mapCrs} : null));
        });
        return () => { current = false; };
    }, [dispatch, dataset, exists, rev]);

    useEffect(() => {
        if (!exists || projection !== mapCrs || !bbox?.some(Boolean)) return undefined;
        let current = true;
        const timer = setTimeout(() => {
            EditingInterface.getFeatures(config, mapCrs, result => {
                if (!current || !result) return;
                const features = result.features.map(feature => ({
                    ...feature, id: String(feature.id), crs: mapCrs, styleName: 'default',
                    styleOptions: {strokeColor: [...dataset.color, 1], fillColor: [...dataset.color, 0.2], strokeWidth: 3}
                }));
                dispatch(changeLayerProperty(dataset.layer, 'features', features));
            }, {bbox, limit: featureLimit});
        }, 150);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [dispatch, dataset, exists, bbox, projection, rev]);
    return null;
}

export default function OrbitDevLayers() {
    return demoDatasets.map(dataset => <DevLayer dataset={dataset} key={dataset.id} />);
}

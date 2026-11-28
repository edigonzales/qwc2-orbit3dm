export const demoDatasets = [
    {id: 'orbit_dev.lines', layer: 'orbit-demo-lines', label: 'Testlinien', geometry: 'LineString', color: [11, 165, 219]},
    {id: 'orbit_dev.polygons', layer: 'orbit-demo-polygons', label: 'Testflächen', geometry: 'Polygon', color: [255, 160, 28]},
    {id: 'orbit_dev.grundstuecke', layer: 'orbit-demo-grundstuecke', label: 'Grundstücksanpassungen',
        geometry: 'LineString', color: [238, 61, 172], terrainHeights: true, zoomToDataset: true,
        primaryKey: 'fid', displayField: 'bemerkung', fields: [
            {id: 't_id', name: 'TID', type: 'number', data_type: 'integer', constraints: {readOnly: true}},
            {id: 'bemerkung', name: 'Bemerkung', type: 'text', data_type: 'text', constraints: {maxlength: 500}}
        ]}
];

export function editConfig(dataset) {
    return {
        editDataset: dataset.id,
        layerName: dataset.label,
        layerTitle: dataset.label,
        geomType: dataset.geometry,
        primaryKey: dataset.primaryKey ?? 'id',
        displayField: dataset.displayField ?? 'name',
        reltables: [],
        fields: dataset.fields ?? [{id: 'name', name: 'Bezeichnung', type: 'text', data_type: 'text',
            constraints: {required: true, maxlength: 120}}],
        permissions: {creatable: true, updatable: true, deletable: true}
    };
}

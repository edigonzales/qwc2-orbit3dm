export const demoDatasets = [
    {id: 'orbit_dev.lines', layer: 'orbit-demo-lines', label: 'Testlinien', geometry: 'LineString', color: [11, 165, 219]},
    {id: 'orbit_dev.polygons', layer: 'orbit-demo-polygons', label: 'Testflächen', geometry: 'Polygon', color: [255, 160, 28]}
];

export function editConfig(dataset) {
    return {
        editDataset: dataset.id,
        layerName: dataset.label,
        layerTitle: dataset.label,
        geomType: dataset.geometry,
        primaryKey: 'id',
        displayField: 'name',
        reltables: [],
        fields: [{id: 'name', name: 'Bezeichnung', type: 'text', data_type: 'text',
            constraints: {required: true, maxlength: 120}}],
        permissions: {creatable: true, updatable: true, deletable: true}
    };
}

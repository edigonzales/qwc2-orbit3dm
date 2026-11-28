export const mapCrs = 'EPSG:2056';
export const orbitCrs = '2056';
export const searchRadius = 50;

export function square([x, y], radius) {
    return [x - radius, y - radius, x + radius, y + radius];
}

export function distance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function nearestFootprint(candidates, target) {
    let nearest = null;
    let bestDistance = searchRadius;
    for (const candidate of candidates) {
        if (candidate.objectType !== 'footprint' || candidate.symbolName !== 'circle_filled' ||
            !candidate.objectId || !candidate.spatialPoint || String(candidate.spatialPoint.crs) !== orbitCrs) continue;
        const gap = distance(target, [candidate.spatialPoint.x, candidate.spatialPoint.y]);
        if (gap <= bestDistance && (!nearest || gap !== bestDistance || candidate.objectId < nearest.objectId)) {
            nearest = candidate;
            bestDistance = gap;
        }
    }
    return nearest;
}

export function cameraFeatures({x, y, pan, fov}) {
    const feature = (id, type, coordinates, style) => ({
        id, type: 'Feature', crs: mapCrs, properties: {}, geometry: {type, coordinates},
        styleName: 'default', styleOptions: style
    });
    const position = [x, y];
    const half = Math.min(fov / 2, 85);
    const beam = Array.from({length: 9}, (_, index) => {
        const angle = (pan - half + index * half / 4) * Math.PI / 180;
        return [x + 22 * Math.sin(angle), y + 22 * Math.cos(angle)];
    });
    return [
        feature('direction', 'Polygon', [[position, ...beam, position]], {
            strokeWidth: 1, strokeColor: [0, 88, 158, 0.9], fillColor: [0, 88, 158, 0.25]
        }),
        feature('camera', 'Point', position, {
            circleRadius: 6, strokeWidth: 2, strokeColor: [255, 255, 255, 1], fillColor: [0, 88, 158, 1]
        })
    ];
}

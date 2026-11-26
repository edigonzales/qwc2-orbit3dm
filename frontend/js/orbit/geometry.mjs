export const mapCrs = 'EPSG:2056';
export const orbitCrs = '2056';
export const searchRadius = 50;
export const overlayRadius = 100;
export const featureLimit = 200;

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

export function overlayParts(geometry) {
    if (!geometry) return [];
    switch (geometry.type) {
    case 'LineString': return [{kind: 'line', parts: [geometry.coordinates]}];
    case 'MultiLineString': return [{kind: 'line', parts: geometry.coordinates}];
    case 'Polygon': return [{kind: 'area', parts: geometry.coordinates}];
    case 'MultiPolygon': return geometry.coordinates.map(rings => ({kind: 'area', parts: rings}));
    default: return [];
    }
}

export function cameraFeatures(photo, heading) {
    const feature = (id, type, coordinates, style) => ({
        id, type: 'Feature', crs: mapCrs, properties: {}, geometry: {type, coordinates},
        styleName: 'default', styleOptions: style
    });
    const position = [photo.x, photo.y];
    const features = [feature('camera', 'Point', position, {
        circleRadius: 6, strokeWidth: 2, strokeColor: [255, 255, 255, 1], fillColor: [0, 88, 158, 1]
    })];
    if (heading) {
        const half = Math.min(heading.fov / 2, 85);
        const beam = Array.from({length: 9}, (_, index) => {
            const angle = (heading.pan - half + index * half / 4) * Math.PI / 180;
            return [photo.x + 22 * Math.sin(angle), photo.y + 22 * Math.cos(angle)];
        });
        features.unshift(feature('direction', 'Polygon', [[position, ...beam, position]], {
            strokeWidth: 1, strokeColor: [0, 88, 158, 0.9], fillColor: [0, 88, 158, 0.25]
        }));
    }
    return features;
}

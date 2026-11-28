import {mapCrs} from './geometry.mjs';

export function buildProfile(coordinates) {
    if (coordinates.length < 2 || coordinates.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) {
        return null;
    }
    const distances = [];
    const stations = [{distance: 0, point: coordinates[0]}];
    let length = 0;
    for (let index = 1; index < coordinates.length; index += 1) {
        const [x, y] = coordinates[index];
        const [previousX, previousY] = coordinates[index - 1];
        const distance = Math.hypot(x - previousX, y - previousY);
        distances.push(distance);
        length += distance;
        stations.push({distance: length, point: coordinates[index]});
    }
    if (!Number.isFinite(length) || length <= 0) return null;
    const samples = Math.min(500, Math.ceil(length) + 1);
    return {
        request: {coordinates, distances, projection: mapCrs, samples},
        stations,
        spacing: length / (samples - 1)
    };
}

export function profileGeometry(profile, response) {
    const {stations, spacing, request: {samples}} = profile;
    const elevations = response?.elevations ?? (response?.elevations_list?.length === 1
        ? response.elevations_list[0]?.elevations : null);
    // QWC uses zero for a location without a raster value.
    if (!Array.isArray(elevations) || elevations.length !== samples ||
        elevations.some(height => !Number.isFinite(height) || height === 0)) return null;

    const coordinates = [];
    let sample = 1;
    for (let index = 0; index < stations.length; index += 1) {
        const station = stations[index];
        const previous = stations[index - 1];
        while (sample < samples - 1 && sample * spacing < station.distance - 1e-8) {
            const fraction = (sample * spacing - previous.distance) / (station.distance - previous.distance);
            const [x, y] = previous.point.map((value, axis) => value + fraction * (station.point[axis] - value));
            coordinates.push([x, y, elevations[sample]]);
            sample += 1;
        }
        // The uniform samples need not land on a bend. Keep its exact XY.
        const position = Math.min(samples - 1, station.distance / spacing);
        const lower = Math.floor(position);
        const upper = Math.ceil(position);
        coordinates.push([...station.point, elevations[lower] + (position - lower) * (elevations[upper] - elevations[lower])]);
        if (sample * spacing <= station.distance + 1e-8) sample += 1;
    }
    return {type: 'LineString', coordinates};
}

export async function addProfileHeights(features, url, signal) {
    const result = [...features];
    let next = 0;
    let missing = 0;
    const requests = new AbortController();
    const stop = () => requests.abort();
    if (signal.aborted) stop();
    else signal.addEventListener('abort', stop, {once: true});
    const timeout = setTimeout(stop, 6000);
    async function processLines() {
        while (next < features.length) {
            const index = next++;
            const feature = features[index];
            const geometry = feature.geometry;
            if (geometry?.type !== 'LineString' || geometry.coordinates.some(point => point.length !== 2)) continue;
            try {
                const profile = buildProfile(geometry.coordinates);
                if (!profile) throw new Error('Ungültige Linie');
                const response = await fetch(url, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(profile.request), signal: requests.signal
                });
                const withHeight = response.ok && profileGeometry(profile, await response.json());
                if (!withHeight) throw new Error('Fehlende Profilhöhe');
                result[index] = {...feature, geometry: withHeight};
            } catch {
                missing += 1;
            }
        }
    }
    try {
        await Promise.all(Array.from({length: Math.min(4, features.length)}, processLines));
        return {features: result, missing};
    } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', stop);
    }
}

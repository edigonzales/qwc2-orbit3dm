import {distance, overlayParts, searchRadius} from './geometry.mjs';

const photos = [
    {id: 'test-1', x: 2607869.16, y: 1228269.06},
    {id: 'test-2', x: 2607880, y: 1228287}
];

export function createFixtureViewer(container, _config, callbacks) {
    container.innerHTML = `
        <div class="orbit-fixture">
            <div class="orbit-fixture-caption">Simulierte Bildquelle · Rötistrasse</div>
            <svg viewBox="0 0 400 300" aria-label="Schematische Strassenansicht">
                <rect width="400" height="300" fill="#b9d5e7"/>
                <rect y="122" width="400" height="178" fill="#a8b29e"/>
                <path d="M170 122H230L400 300H0Z" fill="#5d646a"/>
                <path d="M199 122h2v178h-2Z" fill="#f4ebc5"/>
                <g class="orbit-fixture-objects"></g>
            </svg>
            <div class="orbit-fixture-controls">
                <button type="button">Bild wechseln</button>
                <button type="button">Blick drehen</button>
            </div>
        </div>`;
    const shapes = container.querySelector('.orbit-fixture-objects');
    const controls = container.querySelector('.orbit-fixture-controls');
    let photo = null;
    let pan = 0;
    const layers = new Map();

    function redraw() {
        shapes.replaceChildren();
        if (!photo) return;
        for (const {features, color} of layers.values()) {
            for (const feature of features) {
                for (const {kind, parts} of overlayParts(feature.geometry)) {
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    const d = parts.map(part => part.map(([x, y], index) =>
                        (index ? 'L' : 'M') + (200 + 2 * (x - photo.x)) + ' ' + (240 - 2 * (y - photo.y))
                    ).join(' ') + (kind === 'area' ? 'Z' : '')).join(' ');
                    path.setAttribute('d', d);
                    path.setAttribute('stroke', 'rgb(' + color.join(',') + ')');
                    path.setAttribute('stroke-width', '3');
                    path.setAttribute('fill', kind === 'area' ? 'rgb(' + color.join(' ') + ' / 0.25)' : 'none');
                    path.setAttribute('fill-rule', 'evenodd');
                    shapes.append(path);
                }
            }
        }
    }

    function show(next) {
        photo = next;
        callbacks.photo(photo);
        callbacks.heading({pan, fov: 72});
        redraw();
    }

    controls.children[0].onclick = () => {
        if (photo) show(photos[photo.id === photos[0].id ? 1 : 0]);
    };
    controls.children[1].onclick = () => {
        if (!photo) return;
        pan = (pan + 45) % 360;
        callbacks.heading({pan, fov: 72});
    };

    callbacks.workspace(true);
    return {
        resize() {},
        async openNear(target) {
            const nearest = [...photos].sort((a, b) => distance(target, [a.x, a.y]) - distance(target, [b.x, b.y]))[0];
            if (distance(target, [nearest.x, nearest.y]) > searchRadius) return 'missing';
            show(nearest);
            return 'opened';
        },
        replaceLayer(key, features, color) {
            layers.set(key, {features, color});
            redraw();
        },
        close() {
            container.replaceChildren();
        }
    };
}

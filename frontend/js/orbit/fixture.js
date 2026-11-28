import {distance, searchRadius} from './geometry.mjs';

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
            </svg>
            <div class="orbit-fixture-controls">
                <button type="button">Bild wechseln</button>
                <button type="button">Blick drehen</button>
            </div>
        </div>`;
    const controls = container.querySelector('.orbit-fixture-controls');
    let photo = null;
    let pan = 0;

    function refreshCamera() {
        const camera = photo ? {...photo, pan, fov: 72} : null;
        callbacks.camera(camera);
        return camera;
    }

    function show(next) {
        photo = next;
        refreshCamera();
    }

    controls.children[0].onclick = () => {
        if (photo) show(photos[photo.id === photos[0].id ? 1 : 0]);
    };
    controls.children[1].onclick = () => {
        if (!photo) return;
        pan = (pan + 45) % 360;
        refreshCamera();
    };

    callbacks.workspace(true);
    return {
        refreshCamera,
        resize() {},
        async openNear(target) {
            const nearest = [...photos].sort((a, b) => distance(target, [a.x, a.y]) - distance(target, [b.x, b.y]))[0];
            if (distance(target, [nearest.x, nearest.y]) > searchRadius) return 'missing';
            show(nearest);
            return 'opened';
        },
        close() {
            container.replaceChildren();
        }
    };
}

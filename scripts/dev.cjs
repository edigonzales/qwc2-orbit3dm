const {spawn, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const {setTimeout: delay} = require('node:timers/promises');

function compose(args, options = {}) {
    const result = spawnSync('docker', ['compose', ...args], {stdio: 'inherit', ...options});
    if (result.status !== 0) throw new Error('Docker Compose fehlgeschlagen: ' + args.join(' '));
}

async function start() {
    if (!fs.existsSync('.env') || !fs.existsSync('frontend/icons/build/qwc2-icons.css')) {
        throw new Error('Zuerst npm run setup ausführen.');
    }
    compose(['up', '-d', '--wait', 'postgis']);
    compose(['exec', '-T', 'postgis', 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1',
        '-U', 'orbit_dev', '-d', 'orbit_dev'], {
        input: fs.readFileSync('local-data/grundstuecke.sql'),
        stdio: ['pipe', 'inherit', 'inherit']
    });
    compose(['up', '-d', 'data']);

    const origin = 'http://127.0.0.1:' + (process.env.ORBIT_DATA_PORT || '8083');
    const deadline = Date.now() + 90_000;
    while (true) {
        const checks = await Promise.all(['lines', 'polygons', 'grundstuecke'].map(async dataset => {
            try {
                const response = await fetch(origin + '/api/v1/data/orbit_dev.' + dataset + '/?limit=1', {
                    signal: AbortSignal.timeout(3000)
                });
                return response.ok && (await response.json()).type === 'FeatureCollection';
            } catch {
                return false;
            }
        }));
        if (checks.every(Boolean)) break;
        if (Date.now() >= deadline) throw new Error('QWC Data Service antwortet nicht. docker compose logs data zeigt die Details.');
        await delay(1200);
    }
    const frontend = spawn('npm', ['--prefix', 'frontend', 'start'], {stdio: 'inherit'});
    frontend.on('exit', code => { process.exitCode = code ?? 0; });
}

start().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});

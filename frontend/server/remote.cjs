// The fixed upstream and development routing follow the Solothurn QWC2 AI Assistant.
const {pipeline} = require('node:stream');
const {json} = require('node:stream/consumers');

const origin = 'https://geo.so.ch';
const publicPlugins = new Set([
    'Map', 'HomeButton', 'LocateButton', 'ZoomIn', 'ZoomOut', 'BackgroundSwitcher',
    'TopBar', 'BottomBar', 'ThemeSwitcher', 'LayerTree', 'Identify'
]);
const publicMenu = new Set(['LayerTree', 'Tools']);

function adaptConfig(input) {
    const config = structuredClone(input);
    const filterMenu = items => items.filter(item => publicMenu.has(item.key)).map(item =>
        item.subitems ? {...item, subitems: filterMenu(item.subitems)} : item
    );
    for (const device of ['desktop', 'mobile']) {
        const entries = config.plugins[device].filter(entry => publicPlugins.has(entry.name));
        const topbar = entries.find(entry => entry.name === 'TopBar');
        if (topbar) topbar.cfg.menuItems = filterMenu(topbar.cfg.menuItems || []);
        config.plugins[device] = [
            ...entries,
            {name: 'Orbit3DM', cfg: {buttonPosition: device === 'desktop' ? 5 : 3}}
        ];
    }
    for (const key of ['authServiceUrl', 'cccConfigService', 'startupTask', 'permalinkServiceUrl',
        'editServiceUrl', 'editTextNullValue', 'editingAddLinkAnchors']) delete config[key];
    return {...config, username: null, user_infos: {}, assetsPath: '/map/assets',
        translationsPath: '/map/translations', loadTranslationOverrides: true, globallyDisableDockableDialogs: false};
}

function adaptThemes(input, profile) {
    const result = JSON.parse(JSON.stringify(input, (key, value) => {
        if (key === 'editConfigUrl' || key === 'editConfig') return undefined;
        if (typeof value === 'string' && value.startsWith(origin + '/api/wmts/')) return value.slice(origin.length);
        return value;
    }));
    const theme = result.themes.items.find(item => item.id === result.themes.defaultTheme);
    if (!theme) throw new Error('Solothurner Standardthema fehlt');
    const [x, y] = profile === 'bentley' ? [1836515.70, 842224.98] : [2607865, 1228270];
    theme.initialBbox = {bounds: [x - 190, y - 150, x + 190, y + 150], crs: 'EPSG:2056'};
    if (profile === 'bentley') {
        theme.bbox = theme.initialBbox;
        theme.title = 'Öffentliche Bentley-Demo';
        theme.sublayers = [];
        const background = 'orbit-test-osm';
        result.themes.backgroundLayers.push({type: 'osm', name: background, title: 'OpenStreetMap',
            attribution: {Title: '© OpenStreetMap contributors', OnlineResource: 'https://www.openstreetmap.org/copyright'}});
        theme.backgroundLayers = [{name: background, visibility: true}];
        result.themes.items = [theme];
        result.themes.subdirs = [];
    }
    return result;
}

function isPublicRead(url) {
    if (url.pathname === '/ows/somap') {
        const requests = [...url.searchParams].filter(([name]) => name.toLowerCase() === 'request');
        return requests.length === 1 &&
            ['getmap', 'getfeatureinfo', 'getlegendgraphic', 'getcapabilities'].includes(requests[0][1].toLowerCase());
    }
    return /^\/(?:api\/(?:wmts\/|search\/v2\/|dataproduct\/v1\/weblayers$|v1\/(?:featureinfo|legend)\/somap$)|map\/(?:img|assets\/img)\/)/.test(url.pathname);
}

function createRemoteMiddleware({profile = 'solothurn'} = {}) {
    return async (req, res, next) => {
        const raw = req.url.split('?')[0];
        if (!raw.startsWith('/') || raw.startsWith('//') || /[\\%]/.test(raw) ||
            raw.split('/').some(part => part === '.' || part === '..')) {
            return res.writeHead(400).end();
        }
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/' || url.pathname === '/map') {
            return res.writeHead(302, {Location: '/map/' + url.search}).end();
        }
        const config = url.pathname === '/map/config.json';
        const themes = url.pathname === '/map/themes.json';
        if (!(config || themes || isPublicRead(url))) {
            if (/^\/(?:api|ows|auth|mysochauth|elevation)(?:\/|$)/.test(url.pathname)) return res.writeHead(403).end();
            return next();
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(403).end();

        try {
            const response = await fetch(origin + url.pathname + url.search, {
                signal: AbortSignal.timeout(15000), redirect: 'error',
                headers: {Accept: req.headers.accept || '*/*'}
            });
            const type = response.headers.get('content-type') || 'application/octet-stream';
            if ((config || themes) && response.ok) {
                const source = await json(response.body);
                const result = config ? adaptConfig(source) : adaptThemes(source, profile);
                res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
                return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(result));
            }
            res.writeHead(response.status, {'Content-Type': type});
            if (req.method === 'HEAD' || !response.body) return res.end();
            pipeline(response.body, res, () => {});
        } catch {
            if (!res.headersSent) res.writeHead(502).end('Solothurner Dienst nicht erreichbar.');
        }
    };
}

module.exports = {adaptConfig, adaptThemes, createRemoteMiddleware, isPublicRead};

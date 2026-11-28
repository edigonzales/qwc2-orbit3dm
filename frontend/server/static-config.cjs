const {writeFile} = require('node:fs/promises');
const path = require('node:path');
const {adaptConfig, adaptThemes, origin} = require('./remote.cjs');

const servicePaths = /^\/(?:ows\/somap(?:\?|$)|api\/(?:wmts\/|search\/v2\/|data\/v1\/|dataproduct\/v1\/|v1\/(?:featureinfo|legend)\/))/;

function absoluteServiceUrls(document) {
    return JSON.parse(JSON.stringify(document, (_key, value) =>
        typeof value === 'string' && servicePaths.test(value) ? origin + value : value
    ));
}

function createStaticConfiguration(config, themes) {
    const adapted = adaptConfig(config);
    adapted.assetsPath = origin + '/map/assets';
    adapted.translationsPath = 'translations';
    for (const entries of Object.values(adapted.plugins)) {
        const topBar = entries.find(entry => entry.name === 'TopBar');
        if (topBar) topBar.cfg.logoUrl = './';
    }
    for (const key of ['documentServiceUrl', 'elevationServiceUrl', 'landRegisterService',
        'mapInfoService', 'plotInfoService']) delete adapted[key];

    return {
        config: absoluteServiceUrls(adapted),
        themes: absoluteServiceUrls(adaptThemes(themes, 'solothurn'))
    };
}

async function fetchPublicConfig(name) {
    const url = origin + '/map/' + name + '.json';
    const response = await fetch(url, {signal: AbortSignal.timeout(15000), redirect: 'error'});
    if (!response.ok) throw new Error(url + ' (HTTP ' + response.status + ')');
    return response.json();
}

async function writeStaticConfiguration() {
    const [config, themes] = await Promise.all(['config', 'themes'].map(fetchPublicConfig));
    const files = createStaticConfiguration(config, themes);
    await Promise.all(Object.entries(files).map(([name, data]) =>
        writeFile(path.resolve(__dirname, '../prod', name + '.json'), JSON.stringify(data) + '\n')
    ));
}

if (require.main === module) {
    writeStaticConfiguration().catch(error => {
        console.error('Solothurner Konfiguration konnte nicht erstellt werden.', error.message);
        process.exitCode = 1;
    });
}

module.exports = {createStaticConfiguration};

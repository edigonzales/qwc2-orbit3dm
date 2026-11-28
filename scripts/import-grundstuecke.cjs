const {spawnSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {readFileSync} = require('node:fs');
const {DatabaseSync} = require('node:sqlite');
const path = require('node:path');

const layer = 'grundstueck_knton_anpassung';
const root = path.resolve(__dirname, '..');

function lineWkb(blob) {
    const gpkg = Buffer.from(blob);
    const flags = gpkg[3];
    const envelopeBytes = [0, 32][(flags >> 1) & 7];
    if (gpkg.length < 8 || gpkg.toString('ascii', 0, 2) !== 'GP' || gpkg[2] !== 0 ||
        flags & 0xf0 || envelopeBytes === undefined ||
        (flags & 1 ? gpkg.readInt32LE(4) : gpkg.readInt32BE(4)) !== 2056) {
        throw new Error('Erwartet wird eine nicht leere 2D-Linie in EPSG:2056.');
    }
    const wkb = gpkg.subarray(8 + envelopeBytes);
    if (wkb.length < 41 || wkb[0] > 1) throw new Error('Ungültige Liniengeometrie.');
    const readInt = offset => wkb[0] ? wkb.readUInt32LE(offset) : wkb.readUInt32BE(offset);
    const count = readInt(5);
    if (readInt(1) !== 2 || wkb.length !== 9 + 16 * count) throw new Error('Erwartet wird eine 2D-Liniengeometrie.');
    for (let offset = 9; offset < wkb.length; offset += 8) {
        if (!Number.isFinite(wkb[0] ? wkb.readDoubleLE(offset) : wkb.readDoubleBE(offset))) {
            throw new Error('Ungültige Koordinate.');
        }
    }
    return wkb.toString('hex');
}

function readSource(filename) {
    const db = new DatabaseSync(filename, {readOnly: true});
    try {
        const info = db.prepare('SELECT * FROM gpkg_geometry_columns WHERE table_name = ?').get(layer);
        if (!info || info.column_name !== 'geom' || info.geometry_type_name !== 'LINESTRING' ||
            info.srs_id !== 2056 || info.z !== 0 || info.m !== 0) {
            throw new Error('Der Layer ' + layer + ' muss 2D-Linien in EPSG:2056 enthalten.');
        }
        const rows = db.prepare('SELECT fid, t_id, bemerkung, geom FROM ' + layer + ' ORDER BY fid').all();
        if (!rows.length) throw new Error('Der GeoPackage-Layer ist leer.');
        return rows.map(({fid, t_id, bemerkung, geom}) => {
            const integer = value => Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
            if (!integer(fid) || fid <= 0 || (t_id !== null && !integer(t_id)) ||
                (bemerkung !== null && (typeof bemerkung !== 'string' || [...bemerkung].length > 500)) || !geom) {
                throw new Error('Ungültige Objekt-ID, Bemerkung oder Geometrie im GeoPackage.');
            }
            return {fid, t_id, bemerkung, wkb: lineWkb(geom)};
        });
    } finally {
        db.close();
    }
}

try {
    if (process.argv.length !== 3) throw new Error('Aufruf: npm run import:grundstuecke -- DATEI.gpkg');
    const rows = readSource(process.argv[2]);
    const data = Buffer.from(JSON.stringify(rows));
    const fingerprint = createHash('sha256').update(data).digest('hex');
    // Both SQL values consist of hex digits. The input text never enters the SQL syntax.
    const sql = `
BEGIN;
${readFileSync(path.join(root, 'local-data/grundstuecke.sql'), 'utf8')}
LOCK TABLE orbit_dev.grundstuecke_import IN EXCLUSIVE MODE;
DO $import$
DECLARE
    previous text;
BEGIN
    SELECT fingerprint INTO previous FROM orbit_dev.grundstuecke_import;
    IF previous = '${fingerprint}' THEN
        RAISE NOTICE 'GeoPackage bereits importiert. Gespeicherte Änderungen bleiben erhalten.';
        RETURN;
    ELSIF previous IS NOT NULL OR EXISTS (SELECT FROM orbit_dev.grundstuecke) THEN
        RAISE EXCEPTION 'Der Ziellayer enthält bereits Daten aus einem anderen Import oder aus dem Editor.';
    END IF;
    INSERT INTO orbit_dev.grundstuecke (fid, t_id, bemerkung, geom)
    SELECT fid, t_id, bemerkung, ST_GeomFromWKB(decode(wkb, 'hex'), 2056)
    FROM jsonb_to_recordset(convert_from(decode('${data.toString('hex')}', 'hex'), 'UTF8')::jsonb)
        AS source(fid integer, t_id integer, bemerkung text, wkb text);
    PERFORM setval(pg_get_serial_sequence('orbit_dev.grundstuecke', 'fid'),
        (SELECT max(fid) FROM orbit_dev.grundstuecke));
    INSERT INTO orbit_dev.grundstuecke_import (fingerprint) VALUES ('${fingerprint}');
    RAISE NOTICE '${rows.length} Grundstückslinien importiert.';
END
$import$;
COMMIT;
`;
    const result = spawnSync('docker', ['compose', 'exec', '-T', 'postgis', 'psql', '-X', '-q',
        '-v', 'ON_ERROR_STOP=1', '-U', 'orbit_dev', '-d', 'orbit_dev'], {
        cwd: root, input: sql, stdio: ['pipe', 'inherit', 'inherit']
    });
    if (result.status !== 0) throw new Error('Import fehlgeschlagen. Der lokale PostGIS-Container muss laufen.');
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}

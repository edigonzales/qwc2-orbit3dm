const {randomBytes} = require('node:crypto');
const fs = require('node:fs');

try {
    fs.writeFileSync('.env', [
        `ORBIT_DEV_DB_PASSWORD=${randomBytes(24).toString('hex')}`,
        `ORBIT_DEV_JWT_SECRET=${randomBytes(32).toString('hex')}`,
        ''
    ].join('\n'), {flag: 'wx', mode: 0o600});
} catch (error) {
    if (error.code !== 'EEXIST') throw error;
}

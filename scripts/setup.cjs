const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {existsSync, readFileSync, statSync, writeFileSync} = require('node:fs');

const run = (...args) => execFileSync(process.execPath, [process.env.npm_execpath, '--prefix', 'frontend', ...args], {
    stdio: 'inherit'
});
const stamp = 'frontend/node_modules/.qwc-setup-lock';
const lockHash = createHash('sha256')
    .update(readFileSync('frontend/package.json'))
    .update(readFileSync('frontend/package-lock.json'))
    .digest('hex');
if (!existsSync(stamp) || readFileSync(stamp, 'utf8') !== lockHash ||
    !existsSync('frontend/node_modules/webpack/bin/webpack.js') ||
    !existsSync('frontend/node_modules/qwc2-lts/scripts/makeIconkit.js')) {
    run('ci', '--include=dev');
    writeFileSync(stamp, lockHash);
}

const dependencyTime = statSync(stamp).mtimeMs;
const icons = ['css', 'woff'].map(ext => 'frontend/icons/build/qwc2-icons.' + ext);
const iconIsCurrent = path => {
    const file = statSync(path, {throwIfNoEntry: false});
    return file?.size > 0 && file.mtimeMs >= dependencyTime;
};
if (!icons.every(iconIsCurrent)) {
    run('run', 'iconfont');
    if (!icons.every(iconIsCurrent)) throw new Error('Die QWC-Iconfont konnte nicht erstellt werden.');
}

module.exports = function qwcCompatibility(source) {
    // Refresh the map margins when the same window changes dock side.
    const original = 'this.props.splitScreenWhenDocked && (this.props.visible !== prevProps.visible';
    const replacement = 'this.props.splitScreenWhenDocked && (this.props.dockable !== prevProps.dockable || ' +
        'this.props.visible !== prevProps.visible';
    if (!source.includes(original)) {
        throw new Error('QWC2 ResizeableWindow.js changed. Recheck its compatibility fix.');
    }
    return source.replace(original, replacement);
};

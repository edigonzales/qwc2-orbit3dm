const fixes = {
    // QWC2 LTS 2026.0.30 observes DOM mutations from its own form renders.
    // Only a validity transition needs another render.
    'AttributeForm.js': [`          _this.setState({
            formValid: form.checkValidity()
          });`, `          const formValid = form.checkValidity();
          _this.setState(state => state.formValid === formValid ? null : {formValid});`],
    // Refresh the map margins when the same window changes dock side.
    'ResizeableWindow.js': [
        'this.props.splitScreenWhenDocked && (this.props.visible !== prevProps.visible',
        'this.props.splitScreenWhenDocked && (this.props.dockable !== prevProps.dockable || this.props.visible !== prevProps.visible'
    ]
};

module.exports = function qwcCompatibility(source) {
    const file = require('node:path').basename(this.resourcePath);
    const [original, replacement] = fixes[file];
    if (!source.includes(original)) {
        throw new Error('QWC2 ' + file + ' changed. Recheck its compatibility fix.');
    }
    return source.replace(original, replacement);
};

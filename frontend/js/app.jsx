import React from 'react';

import AppMenu from 'qwc2/components/AppMenu';
import SearchBox from 'qwc2/components/SearchBox';
import StandardApp from 'qwc2/components/StandardApp';
import BackgroundSwitcherPlugin from 'qwc2/plugins/BackgroundSwitcher';
import BottomBarPlugin from 'qwc2/plugins/BottomBar';
import EditingPlugin from 'qwc2/plugins/Editing';
import HomeButtonPlugin from 'qwc2/plugins/HomeButton';
import IdentifyPlugin from 'qwc2/plugins/Identify';
import LayerTreePlugin from 'qwc2/plugins/LayerTree';
import LocateButtonPlugin from 'qwc2/plugins/LocateButton';
import MapPlugin from 'qwc2/plugins/Map';
import EditingSupport from 'qwc2/plugins/map/EditingSupport';
import LocateSupport from 'qwc2/plugins/map/LocateSupport';
import ThemeSwitcherPlugin from 'qwc2/plugins/ThemeSwitcher';
import TopBarPlugin from 'qwc2/plugins/TopBar';
import {ZoomInPlugin, ZoomOutPlugin} from 'qwc2/plugins/ZoomButtons';
import locale from 'qwc2/static/translations/de-CH.json';
import {createRoot} from 'react-dom/client';

import Orbit3DM from './Orbit3DM';
import OrbitDevLayers from './OrbitDevLayers';
import {demoDatasets} from './orbit/datasets';

import '../icons/build/qwc2-icons.css';
import translations from '../static/translations/de-CH_overrides.json';

const url = new URL(location.href);
for (const key of [...url.searchParams.keys()]) {
    if (key === 'localConfig' || key.startsWith('config:')) url.searchParams.delete(key);
}
if (url.href !== location.href) history.replaceState(null, '', url);

function Orbit3DMPlugin(props) {
    return <Orbit3DM datasets={demoDatasets} {...props} />;
}

const appConfig = {
    getDefaultLocale: () => 'de-CH',
    defaultLocaleData: {...locale, messages: {...locale.messages, ...translations.messages}},
    initialState: {defaultState: {}, mobile: {}},
    pluginsDef: {cfg: {}, plugins: {
        MapPlugin: MapPlugin({EditingSupport, LocateSupport}),
        HomeButtonPlugin,
        LocateButtonPlugin,
        ZoomInPlugin,
        ZoomOutPlugin,
        BackgroundSwitcherPlugin,
        TopBarPlugin: TopBarPlugin({AppMenu, Search: SearchBox}),
        BottomBarPlugin,
        ThemeSwitcherPlugin,
        LayerTreePlugin,
        IdentifyPlugin,
        EditingPlugin: EditingPlugin(),
        OrbitDevLayersPlugin: OrbitDevLayers,
        Orbit3DMPlugin
    }}
};

createRoot(document.getElementById('container')).render(<StandardApp appConfig={appConfig} />);

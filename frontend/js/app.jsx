import React, {createContext, useContext, useState} from 'react';

import AppMenu from 'qwc2/components/AppMenu';
import SearchBox from 'qwc2/components/SearchBox';
import StandardApp from 'qwc2/components/StandardApp';
import BackgroundSwitcherPlugin from 'qwc2/plugins/BackgroundSwitcher';
import BottomBarPlugin from 'qwc2/plugins/BottomBar';
import HomeButtonPlugin from 'qwc2/plugins/HomeButton';
import IdentifyPlugin from 'qwc2/plugins/Identify';
import LayerTreePlugin from 'qwc2/plugins/LayerTree';
import LocateButtonPlugin from 'qwc2/plugins/LocateButton';
import MapPlugin from 'qwc2/plugins/Map';
import LocateSupport from 'qwc2/plugins/map/LocateSupport';
import ThemeSwitcherPlugin from 'qwc2/plugins/ThemeSwitcher';
import TopBarPlugin from 'qwc2/plugins/TopBar';
import {ZoomInPlugin, ZoomOutPlugin} from 'qwc2/plugins/ZoomButtons';
import locale from 'qwc2/static/translations/de-CH.json';
import {createRoot} from 'react-dom/client';

import Orbit3DM from './Orbit3DM';

import '../icons/build/qwc2-icons.css';
import translations from '../static/translations/de-CH_overrides.json';

const url = new URL(location.href);
for (const key of [...url.searchParams.keys()]) {
    if (key === 'localConfig' || key.startsWith('config:')) url.searchParams.delete(key);
}
if (url.href !== location.href) history.replaceState(null, '', url);

const OrbitWindowContext = createContext(null);
const openOrbitCommand = 'orbit3dm:open';

function OrbitAppMenu({menuItems, openExternalUrl, ...props}) {
    const {setVisible} = useContext(OrbitWindowContext);
    const tools = {key: 'Orbit3DM', title: 'orbit3dm.title', icon: 'camera', url: openOrbitCommand};
    const items = menuItems.map(item => item.key === 'Tools'
        ? {...item, subitems: [...(item.subitems || []), tools]} : item);
    if (!items.some(item => item.key === 'Tools')) items.push({key: 'Tools', icon: 'tools', subitems: [tools]});
    return <AppMenu {...props} appMenuClearsTask={false} menuItems={items}
        openExternalUrl={(target, ...args) => {
            if (target === openOrbitCommand) setVisible(true);
            else openExternalUrl(target, ...args);
        }} />;
}

function Orbit3DMPlugin(props) {
    const {visible, setVisible} = useContext(OrbitWindowContext);
    return <Orbit3DM {...props} visible={visible} onVisibilityChange={setVisible} />;
}

const appConfig = {
    getDefaultLocale: () => 'de-CH',
    defaultLocaleData: {...locale, messages: {...locale.messages, ...translations.messages}},
    initialState: {defaultState: {}, mobile: {}},
    pluginsDef: {cfg: {}, plugins: {
        MapPlugin: MapPlugin({LocateSupport}),
        HomeButtonPlugin,
        LocateButtonPlugin,
        ZoomInPlugin,
        ZoomOutPlugin,
        BackgroundSwitcherPlugin,
        TopBarPlugin: TopBarPlugin({AppMenu: OrbitAppMenu, Search: SearchBox}),
        BottomBarPlugin,
        ThemeSwitcherPlugin,
        LayerTreePlugin,
        IdentifyPlugin,
        Orbit3DMPlugin
    }}
};

function DevelopmentApp() {
    const [visible, setVisible] = useState(false);
    return <OrbitWindowContext.Provider value={{visible, setVisible}}>
        <StandardApp appConfig={appConfig} />
    </OrbitWindowContext.Provider>;
}

createRoot(document.getElementById('container')).render(<DevelopmentApp />);

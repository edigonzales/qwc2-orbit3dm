# qwc2-orbit3dm

QWC2-Prototyp für die Solothurner Strassenbefahrung. Das Orbit-Panorama öffnet
neben der Karte. Auf der Karte zeigen ein Kamerapunkt und ein Blickkeil die
aktuelle Aufnahme und Blickrichtung.

## QWC2 lokal starten

Node 22 verwenden.

```sh
npm run dev
```

Beim ersten Start installiert npm die gepinnten Frontend-Abhängigkeiten und
erzeugt die QWC-Iconfont. Danach startet der Webpack-Dev-Server. Die Karte und
die Suche verwenden die öffentlichen Solothurner Dienste.

[Solothurner Karte öffnen](http://127.0.0.1:8082/map/). Über **Karte & Werkzeuge
→ Werkzeuge → Strassenbilder** oder den Kameraknopf die Split-View öffnen. Im
eingebetteten Orbit-Viewer anmelden und **Kartenmitte** oder **Aufnahme wählen**
verwenden. Die Kartenmitte liegt beim ersten Start an der Rötistrasse. Mit
dem Dockknopf kann das Panorama auch als schwebendes Fenster verwendet werden.
Das × blendet es aus und erhält die Sitzung bis zum Neuladen der Karte.

**Auf Karte zeigen** zentriert die Karte auf die aktuelle Panoramaaufnahme.
Beim Wechsel ins Originalbild oder in die Orbit-3D-Ansicht wird der
Panorama-Blickkeil ausgeblendet. Unter **Ansicht** lassen sich die
Orbit-Seitenleiste und die Übersichtskarte einzeln umschalten.

## Lokale Abnahmeprofile

| Startbefehl | Zweck |
| --- | --- |
| `ORBIT_PROFILE=fixture npm run dev` | Solothurner Karte mit reproduzierbaren Bildorten und simulierter Bildquelle |
| `ORBIT_PROFILE=bentley QWC_PORT=8084 npm run dev` | Öffentliches Orbit SDK in San Sebastián mit eigener lokaler Kartenansicht |

Beide Profile sind an den Dev-Server gebunden. Die Standardkonfiguration
verwendet die Solothurner Publikation. Der Webpack-Build verwendet ebenfalls
die Standardkonfiguration. `npm test` prüft die LV95-Suche, den Blickkeil,
die Dev-Konfiguration und das Routing der öffentlichen Dienste. `npm run build`
erstellt den Produktionsbuild. Zum Vorbereiten von Tests oder Build aus einer
frischen Kopie lässt sich `npm run setup` separat ausführen.

Die [Safari-Abnahme](docs/safari-abnahme.md) hält die Tests, Korrekturen und
die Sichtprüfung in der geschützten Solothurner Publikation fest.

In einem bestehenden QWC2-Client kann `Orbit3DM.jsx` als Plugin registriert
werden.

## Standalone-SDK-Prototyp in Safari

Starte im Repository einen lokalen HTTP-Server mit Python 3.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

1. Öffne [http://127.0.0.1:8765/](http://127.0.0.1:8765/) in Safari.
2. Melde dich im eingebetteten Orbit Viewer mit deinem Digital-Survey-Konto an.
   Der Publisher ist vorausgefüllt. Falls Orbit eine Publikationsauswahl zeigt,
   wähle `150449_Kantonsstrassen_Solothurn`.
3. Warte auf **Publikation geladen**. Klicke auf **Panorama öffnen** oder gib
   zuerst andere LV95-Koordinaten ein. Das Beispiel liegt an der Rötistrasse in
   Solothurn. Orbit sucht zur Zielkoordinate ein passendes sphärisches Panorama.
   Sobald das Bild geöffnet ist, zeigt die Seite dessen Kameraposition und
   Foto-ID an.

**GeoJSON-Testpunkt anzeigen** setzt einen temporären Punkt etwa zehn Meter in
die aktuelle Blickrichtung. Mit **GeoJSON-Testpunkt ausblenden** lässt er sich
wieder entfernen.

**Foto per SDK speichern** ruft das angezeigte Foto über `getPhoto()` ab. Die
Methode ist in SDK 26.2.0 vorhanden. Der Server und das Bildformat bestimmen,
welche Bilddaten zurückkommen. Den Download im Orbit-Ansichtsmenü kannst du
für dieselbe Foto-ID separat testen, sofern er in der Publikation verfügbar ist.

**WMS in 3D laden** importiert die farbige Landeskarte von swisstopo als
WMS-Rasterressource der aktuellen Viewer-Sitzung und öffnet die 3D-Ansicht an
den eingegebenen LV95-Koordinaten. Ein erneuter Klick verwendet dieselbe
Ressource. **Panorama öffnen** führt zurück zum Strassenbild. Der Prototyp
nutzt dafür den internen lokalen Dateiimport des Orbit SDK 26.2.0.

Die Seite lädt das SDK vom Orbit-CDN. Gib deine Zugangsdaten im Orbit-Dialog
erneut ein, damit der Viewer eine eigene Sitzung vom lokalen Origin aus
öffnet. Für die spätere Integration den Login und das Streaming auch vom
Origin des QWC2-Clients prüfen.

[Orbit JavaScript SDK](https://kb.orbitgt.com/262/viewer/sdk/initialize_js)
· [Viewer-API](https://sdk.3dmapping.cloud/26.2.0/reference_docs/classes/Viewer3DM.html)

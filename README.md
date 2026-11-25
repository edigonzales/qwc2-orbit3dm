# qwc2-orbit3dm

Lokaler Browser-Prototyp für das Orbit 3DM Viewer SDK 26.2.0 und die Publikation
`150449_Kantonsstrassen_Solothurn` auf `https://www.digitalmaps.ch`.

## In Safari testen

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

# qwc2-orbit3dm

QWC2-Prototyp für die Solothurner Strassenbefahrung. Das Orbit-Panorama öffnet
neben der Karte. Gespeicherte QWC-Linien und -Flächen lassen sich im Bild
einblenden.

## QWC2 lokal starten

Node 22 und Docker Compose bereitstellen. Die beiden lokalen Images nutzen
`linux/amd64`, auch auf Apple Silicon.

```sh
npm run setup
npm run dev
```

[Solothurner Karte öffnen](http://127.0.0.1:8082/map/). Der Kameraknopf am
rechten Kartenrand heisst **Strassenbilder**. Im eingebetteten Orbit-Viewer
anmelden und **Kartenmitte** oder **Aufnahme wählen** verwenden. Die
Kartenmitte liegt beim ersten Start an der Rötistrasse. Den Bereich mit dem
Dockknopf verstellen oder als schwebendes Fenster verwenden.

Unter **Karte & Werkzeuge → Werkzeuge → Editieren** **Testlinien** oder
**Testflächen** auswählen, zeichnen, eine Bezeichnung eingeben und speichern.
Unter **Fachobjekte** steuern die beiden Kontrollkästchen die Darstellung im
Panorama. Die ungefähre Lage der 2D-Objekte hängt von der Orbit-Referenzhöhe ab.

Die öffentlichen Solothurner Dienste liefern Karte und Suche. Testobjekte
werden im lokalen Flask-basierten QWC Data Service und PostGIS gespeichert.
`docker compose down` hält die Container an und erhält die Testdaten.
`npm run setup` generiert die lokalen Secrets einmalig in `.env`. Den Orbit-Login
gibst du bei Nutzung der geschützten Publikation direkt im Viewer ein.

## Lokale Abnahmeprofile

| Startbefehl | Zweck |
| --- | --- |
| `ORBIT_PROFILE=fixture npm run dev` | Solothurner Karte, reproduzierbare Bildorte und lokale Editierstrecke |
| `ORBIT_PROFILE=bentley QWC_PORT=8084 npm run dev` | Öffentliches Orbit SDK in San Sebastián mit eigener lokaler Kartenansicht |

Beide Profile sind an den Dev-Server gebunden. Die Standardkonfiguration
verwendet die Solothurner Publikation. Der Webpack-Build verwendet ebenfalls
die Standardkonfiguration. `npm test` prüft die LV95-Suche, den Blickkeil,
Geometrie-Ringe und das lokale Routing. `npm run build` prüft den Build.

Die [Safari-Abnahme](docs/safari-abnahme.md) hält die Tests, Korrekturen und
den offenen Live-Test der geschützten Publikation fest.

Das Plugin verwendet die nativen QWC-Speicheraktionen. Die Fachobjekte werden
über `layer.rev` nachgeführt. In einem bestehenden QWC2-Client kann
`Orbit3DM.jsx` als Plugin registriert werden. Seine `datasets`-Einträge
enthalten `id` (Data-Service-ID), `layer` (QWC-Layer-ID oder WMS-Name), `label`
und `color` (RGB). Für die lokale App liefern `OrbitDevLayers` und die
Compose-Konfiguration die Testdatensätze.

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

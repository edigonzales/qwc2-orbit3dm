# Safari-Abnahme

## Blickkeil und Ansichtsoptionen

- In der Solothurner Publikation bei LV95 **2’618’468 / 1’240’132** verschwand
  der Panorama-Blickkeil im Originalbild und in der 3D-Ansicht. Bei der
  Rückkehr über die Lupe oder den Panorama-Knopf erschien der aktuelle Keil
  wieder. Beim Drehen und Zoomen folgte er dem Blickfeld. **Auf Karte zeigen**
  zentrierte die Karte auf den Kamerapunkt bei gleichem Massstab.
- Nach dem Schliessen des Bildes mit dem nativen Orbit-Knopf öffnete
  **Kartenmitte** an derselben Stelle das Panorama erneut.
- **Ansicht** schaltete Seitenleiste und Übersichtskarte einzeln und gemeinsam
  um. Beim Dockwechsel sowie beim Schliessen und Wiederöffnen von
  **Strassenbilder** blieben Aufnahme, Sitzung und Einstellungen erhalten.
- Acht Tests und der Produktionsbuild liefen erfolgreich. Dazu gehört ein
  Regressionstest für verzögerte Blickdaten und die erneute Bildwahl.

## Abnahme nach Ausbau der Editierumgebung vom 28. November 2026

- `npm run dev` installierte im frischen Arbeitsverzeichnis die gepinnten
  Abhängigkeiten, erzeugte die QWC-Iconfont und startete den Webpack-Server.
  Der Test lief ohne `.env` und bei gestoppten Projektcontainern. Der nächste
  Startaufbau verwendete die vorhandene Installation.
- In Safari enthielt **Karte & Werkzeuge → Werkzeuge** den Eintrag
  **Strassenbilder**. Die drei ehemaligen Projektlayer und **Editieren**
  waren aus der Oberfläche entfernt. Über die Suche liess sich
  **Benannte Gebiete (amtliche Vermessung)** zum normalen Layerbaum hinzufügen.
- In der angemeldeten Solothurner Publikation bei LV95
  **2’618’468 / 1’240’132** öffnete **Kartenmitte** ein Panorama.
  **Aufnahme wählen** wechselte per Kartenklick zu einer benachbarten
  Aufnahme. Kamerapunkt und Blickkeil folgten Ansicht und Blickrichtung.
  Abdocken und erneutes Andocken erhielten die Aufnahme. Mit der Lupe liess
  sich das planare Detailbild öffnen und zum Panorama zurückkehren.
- Die alte Data-Service-Route lieferte `404`. Die Projektcontainer und das
  bestätigte PostGIS-Volume wurden entfernt. Sieben Tests und der
  Produktionsbuild liefen erfolgreich. Webpack meldete Grössenwarnungen.

## Frühere Abnahme mit Editor und ohne Orbit-Overlay vom 28. November 2026

- In Safari am Standort LV95 **2’618’468 / 1’240’132** war die
  Grundstückslinie ausschliesslich auf der QWC-Karte sichtbar. Das
  Fachobjekt-Menü und seine Hinweise waren aus der Split-View entfernt.
- In der angemeldeten Solothurner Publikation öffnete die Lupe das planare
  Detailbild. Der Rückweg zum Panorama funktionierte und der Blickkeil auf
  der QWC-Karte folgte der Ansicht. Bei geöffnetem Panorama liess sich
  **Grundstücksanpassungen** im nativen Editor auswählen. Die Werkzeuge
  **Auswählen** und **Zeichnen** waren aktiv.
- Die QWC-Kartenabfragen lieferten `200`. Beim Öffnen des Panoramas, dem
  Wechsel zum Detailbild und der Rückkehr zeigte das Safari-Netzwerkprotokoll
  Bild- und Kartenkacheln. Die Zahl der kamerabezogenen Aufrufe des
  Data Service und der Höhenprofilabfragen lag in diesem Abschnitt bei null.
  Der neu gestartete Dev-Proxy antwortete auf einen separaten Testaufruf
  des früheren Höhenprofilpfads mit `403`.
- `npm test` bestand alle sechs Tests. Der Produktionsbuild war
  erfolgreich und meldete die bereits bekannten Webpack-Grössenwarnungen.

## Abnahme mit Orbit-Overlay

Die folgenden Ergebnisse stammen vom Stand mit Fachobjekten im Orbit-Viewer.
[Abnahme am Tag `before-orbit-overlay-removal`](https://github.com/edigonzales/qwc2-orbit3dm/blob/before-orbit-overlay-removal/docs/safari-abnahme.md)

### Prüfung vom 25. November 2026

| Profil | Ergebnis |
| --- | --- |
| Solothurner Karte mit simulierter Bildquelle | An der Rötistrasse liess sich das Bild über die Kartenmitte laden. Bildwechsel und Drehung aktualisierten Kamerapunkt und Blickkeil. Beim Abdocken blieben Bild und Editor erhalten. In der schmalen Ansicht dockte das Fenster unten an. Ein geändertes Attribut blieb beim Schliessen und erneuten Öffnen des Panoramas im Editor und liess sich danach speichern. |
| Solothurner Karte mit simulierter Bildquelle | Ein einzelner Kartenklick ausserhalb der Abdeckung setzte die Suchmarke und meldete «Keine Aufnahme im Umkreis von 50 m». Die vorherige Aufnahme blieb sichtbar. Während der Bearbeitung war der Kartenklick zur Bildwahl gesperrt. |
| Lokaler QWC Data Service | Im nativen Editor wurden je eine Linie und eine Fläche angelegt. Die Linie wurde geändert, die Fläche gelöscht und eine weitere Fläche verworfen. Die Overlays folgten den gespeicherten Änderungen. Nach dem Neustart lieferten Data Service und PostGIS die verbliebenen Testobjekte wieder. |
| Öffentliches Bentley-Panorama in San Sebastián | Das SDK öffnete Photo-ID `170704m01001551`. Die Karte zeigte Kamerapunkt und Blickkeil. Eine Linie und eine Fläche aus dem lokalen Data Service waren im echten Bild sichtbar. |

### Bedienung am gesicherten Stand

Der Kameraknopf sitzt bei den Kartenwerkzeugen. Von dort führen zwei direkte
Wege zum Bild. **Kartenmitte** passt für die Stelle, die bereits auf der Karte
im Fokus steht. **Aufnahme wählen** passt für einen abweichenden Zielort und
endet nach dem ersten Klick. Der blaue Kamerapunkt mit Blickkeil ist auch
bei einer erfolglosen Suche sichtbar. Der Suchort erscheint separat in
Orange. So bleibt erkennbar, von wo das bisherige Bild stammt.

Die Split-View hält Karte, Editor und Bild gleichzeitig zugänglich.
Beim Abdocken kann etwas mehr Kartenfläche genutzt werden. Beim Zeichnen
verhindert die gesperrte Bildwahl, dass derselbe Kartenklick zwei Werkzeuge
bedient. Der Hinweis zur ungefähren Lage der Fachobjekte gehört ins Bild,
weil für 2D-Geometrien die Orbit-Referenzhöhe verwendet wird.

### Korrekturen und Testgrenzen

- QWC2 LTS 2026.0.30 hat im Attributformular wiederholt seine eigenen
  DOM-Änderungen verarbeitet. Der lokale Build aktualisiert den
  Formularzustand nur bei geänderter Gültigkeit. Die Dock-Komponente
  aktualisiert beim Wechsel der Dockseite auch den Kartenrand.
- Beim browsergesteuerten Zeichnen in Safari meldete die simulierte
  Mauseingabe `buttons=0`. Für diesen Test liess eine temporäre lokale
  Anpassung des QWC-Zeichenwerkzeugs die linke Taste über `button=0` zu.
  Die Anpassung ist entfernt. Geometrien, Formular, Speicherung,
  Laden und Löschen liefen über die regulären QWC-Komponenten und den
  lokalen Data Service.
- Bei der Abnahme vom 25. November war der Live-Test der geschützten
  Solothurner Publikation noch offen. Die spätere Prüfung steht unten.
  Die alternative SDK-Suche ist in der Standardkonfiguration deaktiviert.
  Ihre 50-m-Begrenzung braucht einen eigenen Nachweis im Browser.

### Grundstücksanpassungen und Höhenprofil

- In Safari startete QWC2 mit geschlossenem Viewer. **Werkzeuge →
  Strassenbilder** öffnete ihn. Nach dem Ausblenden blieben die Aufnahme
  und die Auswahl der Fachlayer erhalten. Der Kameraknopf erhielt eine
  ungespeicherte Bemerkung im nativen QWC-Editor. Nach dem Speichern
  lieferte der lokale Data Service den geänderten Wert.
- PostGIS übernahm 36 Linien mit identischer WKB-Geometrie und identischen
  Attributen. Die temporäre Änderung einer importierten Linie über den
  Data Service überstand dessen Neustart und den erneuten Import der
  Quelldatei. Die Teständerung wurde danach zurückgesetzt.
- Der kantonale Dienst lieferte für die kurze und die längere Prüflinie
  vollständige Höhenprofile. In beiden Darstellungskopien waren alle
  originalen XY-Knickpunkte enthalten.
- Im Safari-Fixture blieb die violette Linie bei deaktivierter Profilabfrage
  und bei einem abgewiesenen HTTP-Abruf sichtbar. Der Viewer zeigte in
  beiden Fällen den jeweiligen Hinweis.
- In der angemeldeten Solothurner Orbit-Publikation waren die magentafarbenen
  Grundstückslinien an zwei Stellen im grossen Strassenbild sichtbar. Bei
  einer kurzen Linie liess sich der Verlauf am Strassenrand erkennen. Bei
  der längeren Linie war ein Knick am Gehweg neben dem Geländer sichtbar.
  Die Beobachtungen beschreiben die Bildlage. Für eine metrische Prüfung
  wären zuordenbare vermessene Kontrollpunkte nötig.
- Das Schliessen und Wiederöffnen über das Menü erhielt die echte
  Orbit-Sitzung und die zuvor gewählte Aufnahme. An einem dritten Standort
  ohne Bild im Umkreis von 50 m wurde die Meldung zur fehlenden Aufnahme
  angezeigt.

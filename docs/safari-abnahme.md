# Safari-Abnahme vom 25. November 2026

| Profil | Ergebnis |
| --- | --- |
| Solothurner Karte mit simulierter Bildquelle | An der Rötistrasse liess sich das Bild über die Kartenmitte laden. Bildwechsel und Drehung aktualisierten Kamerapunkt und Blickkeil. Beim Abdocken blieben Bild und Editor erhalten. In der schmalen Ansicht dockte das Fenster unten an. Ein geändertes Attribut blieb beim Schliessen und erneuten Öffnen des Panoramas im Editor und liess sich danach speichern. |
| Solothurner Karte mit simulierter Bildquelle | Ein einzelner Kartenklick ausserhalb der Abdeckung setzte die Suchmarke und meldete «Keine Aufnahme im Umkreis von 50 m». Die vorherige Aufnahme blieb sichtbar. Während der Bearbeitung war der Kartenklick zur Bildwahl gesperrt. |
| Lokaler QWC Data Service | Im nativen Editor wurden je eine Linie und eine Fläche angelegt. Die Linie wurde geändert, die Fläche gelöscht und eine weitere Fläche verworfen. Die Overlays folgten den gespeicherten Änderungen. Nach dem Neustart lieferten Data Service und PostGIS die verbliebenen Testobjekte wieder. |
| Öffentliches Bentley-Panorama in San Sebastián | Das SDK öffnete Photo-ID `170704m01001551`. Die Karte zeigte Kamerapunkt und Blickkeil. Eine Linie und eine Fläche aus dem lokalen Data Service waren im echten Bild sichtbar. |

## Bedienung

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

## Korrekturen und Testgrenzen

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
- Der Live-Test der geschützten Solothurner Publikation bleibt offen.
  Er umfasst Anmeldung, Footprint-Verfügbarkeit, Bildwechsel und das
  Aufliegen der Solothurner Fachobjekte auf der Referenzhöhe. Die
  alternative SDK-Suche ist in der Standardkonfiguration deaktiviert.
  Ihre 50-m-Begrenzung braucht einen eigenen Nachweis im Browser.

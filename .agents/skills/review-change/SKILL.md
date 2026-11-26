---
name: review-change
description: Review an Orbit3DM patch or verify a browser acceptance run, especially panorama synchronization, the native QWC edit workflow, and overlay rendering.
---

# Änderung prüfen

- Repo-Start und Ausgangscommit festhalten. `npm test` und bei Build-Änderungen `npm run build` ausführen.
- Im Fixture-Profil den Kameraeinstieg bei laufendem QWC-Entwurf, Dockwechsel, Kartenauswahl und fehlende Abdeckung prüfen. Ein Bildwechsel darf den Kartenausschnitt nur über die explizite Zentrieraktion verschieben.
- Schreibzugriffe über den nativen Editor und Hintergrundabfragen per Data Service an eigenen Testobjekten prüfen. Entwurf, gespeichertes Objekt, gelöschtes Objekt und nachgezogene Einblendung unterscheiden.
- Im Bentley-Profil eine echte Aufnahme und sichtbare Linien- und Flächenoverlays prüfen. 2D-Fachobjekte dienen der Orientierung. Den Teststatus der geschützten Solothurner Publikation separat angeben.
- Befunde und ihre Auswirkung knapp dokumentieren. Keine echten Zugangsdaten oder nichtöffentliche Daten in Prüfartefakte übernehmen.

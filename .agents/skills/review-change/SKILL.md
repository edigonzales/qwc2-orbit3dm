---
name: review-change
description: Review an Orbit3DM patch or verify a browser acceptance run, especially QWC2 map navigation, panorama synchronization, and the Orbit detail view.
---

# Änderung prüfen

- Repo-Start und Ausgangscommit festhalten. `npm test` und bei Build-Änderungen `npm run build` ausführen.
- Im Fixture-Profil Kameraeinstieg, Dockwechsel, Kartenauswahl und fehlende Abdeckung prüfen. Ein Bildwechsel darf den Kartenausschnitt nur über die explizite Zentrieraktion verschieben.
- Bei Änderungen am Dev-Server den Start mit `npm run dev` und die öffentlichen Solothurner Karten- und Suchabfragen prüfen.
- Für SDK-Änderungen eine echte Aufnahme prüfen. In der geschützten Solothurner Publikation mit der Lupe das planare Detailbild öffnen und zum Panorama zurückkehren. Bei getrennter Prüfung im Bentley-Profil die Bildquelle angeben.
- Befunde und ihre Auswirkung knapp dokumentieren. Keine echten Zugangsdaten oder nichtöffentliche Daten in Prüfartefakte übernehmen.

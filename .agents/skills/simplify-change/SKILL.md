---
name: simplify-change
description: Simplify a QWC2 Orbit3DM change before handing it off, preserving the native QWC workflows and the SDK adapter boundary.
---

# Änderung vereinfachen

- Prüfe den Diff auf Logik, die QWC2 oder der Orbit-Adapter bereits anbietet. Native Fenster- und Kartenabläufe erhalten.
- Testprofile und das Routing öffentlicher Kartendienste gehören zur Dev-App. Die Plugin-Konfiguration umfasst die Parameter für die QWC2-Integration.
- Reichweite, aktuelle Aufnahme und Dockzustand pro zuständiger Komponente halten. Beim Entfernen eines Zustands prüfen, ob er verspätete Antworten oder konkurrierende Kartenwerkzeuge abfängt.
- Mit `npm test` und der kleinsten betroffenen Browserstrecke prüfen.

---
name: simplify-change
description: Simplify a QWC2 Orbit3DM change before handing it off, preserving the native QWC workflows and the SDK adapter boundary.
---

# Änderung vereinfachen

- Prüfe den Diff auf Logik, die QWC2, EditingInterface oder der Orbit-Adapter bereits anbietet. Native Fenster-, Karten- und Speicherabläufe erhalten.
- Testprofil, Datenbank-Bootstrap und lokales Routing in der Dev-App belassen. Die Plugin-Konfiguration umfasst nur die Parameter für echte Integrationen.
- Reichweite, aktuelle Aufnahme, Dockzustand und Layer-Revision pro zuständiger Komponente halten. Beim Entfernen eines Zustands prüfen, ob er verspätete Antworten oder Konkurrenz mit Editing abfängt.
- Mit `npm test` und der kleinsten betroffenen Browserstrecke prüfen.

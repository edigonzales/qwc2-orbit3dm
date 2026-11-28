---
name: qwc2-integration
description: Implement or adjust the Orbit3DM plugin, QWC2 viewer integration, map synchronization, or the Orbit SDK adapter in this repository.
---

# QWC2-Integration

- QWC2-Komponenten und Redux-Actions aus der gepinnten LTS-Version verwenden. Der Kameraknopf verwendet den lokalen Zustand des Plugins. Die einmalige MapSelection respektiert den QWC-Aufgabenstatus.
- Die Kommunikationskoordinaten des Orbit-Adapters sind LV95. Bei der Auswahl zählen nur sphärische Footprints innerhalb von 50 m. Die aktive Panoramaansicht liefert Position, Blickrichtung und Öffnungswinkel gemeinsam. Kartenbewegungen lösen keine Bildsuche aus.
- Öffentliche Solothurner Karten- und Suchabfragen über den Dev-Proxy beziehen.
- Die Profile und Browserprüfung stehen in der Repo-README.

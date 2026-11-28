---
name: qwc2-integration
description: Implement or adjust the Orbit3DM plugin, QWC2 viewer integration, map synchronization, local editing, or the Orbit SDK adapter in this repository.
---

# QWC2-Integration

- QWC2-Komponenten und Redux-Actions aus der gepinnten LTS-Version verwenden. Der Kameraknopf öffnet lokalen Plugin-Zustand, damit laufende Editierkontexte erhalten bleiben. Die einmalige MapSelection greift nur ohne konkurrierendes QWC-Werkzeug.
- Die Kommunikationskoordinaten des Orbit-Adapters sind LV95. Bei der Auswahl zählen nur sphärische Footprints innerhalb von 50 m. Ein SDK-Ergebnis wird erst mit dem bestätigten Foto-Event zum Bildstandort. Drehung ändert den Blickkeil und Bildwechsel die Position. Kartenbewegungen lösen keine Bildsuche aus.
- Fachobjekte via `EditingInterface.getFeatures` um die aktive Kamera lesen. `layer.rev` signalisiert die gespeicherte Änderung. Wenn der Dev-Layer seine Features ersetzt, die Revision erhalten. Die beim Start geladene Auswahl bleibt beim Andocken erhalten.
- Bearbeitung bleibt bei QWC. Lokale Schreibzugriffe sind auf Testlinien, Testflächen und importierte Grundstücksanpassungen begrenzt. Der kantonale Höhenprofil-POST ist eine Abfrage. Profilhöhen gelangen nur in das Panorama-Overlay.
- Die Profile und Browserprüfung stehen in der Repo-README.

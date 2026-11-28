# qwc2-orbit3dm

- `npm run setup` installiert die gepinnten Frontend-Abhängigkeiten und legt lokale Compose-Secrets in `.env` an. `npm run dev` startet QWC2, den QWC Data Service und PostGIS.
- `frontend/js/Orbit3DM.jsx` ist das integrierbare QWC2-Plugin. In `frontend/js/orbit/` liegen der SDK-Adapter und die LV95-Helfer. `OrbitDevLayers` und der Dev-Proxy gehören zur lokalen Test-App.
- Der native QWC-Editor schreibt Testlinien, Testflächen und importierte Grundstücksanpassungen über den lokalen QWC Data Service. Der kantonale Höhenprofildienst liefert Höhen für die Darstellung. Gespeicherte Grundstückslinien bleiben zweidimensional.
- Die geschützte Publikation verwendet den persönlichen Login im Orbit-Viewer. Repo und Browser-Bundle enthalten nur die Publikationskonfiguration. Zugangsdaten der lokalen Schreibstrecke stehen in der gitignorierten `.env`.
- Bei QWC2-, Editing- oder SDK-Arbeit den Skill [qwc2-integration](.agents/skills/qwc2-integration/SKILL.md) verwenden. Vor der Abnahme [simplify-change](.agents/skills/simplify-change/SKILL.md) und bei der Prüfung [review-change](.agents/skills/review-change/SKILL.md) anwenden.
- `ORBIT_PROFILE=fixture` dient dem Solothurner Browserablauf ohne Zugangsdaten. `ORBIT_PROFILE=bentley` nutzt die öffentliche Bentley-Demo für Rendering und SDK-Ereignisse. Im Review die tatsächliche Bildquelle nennen.

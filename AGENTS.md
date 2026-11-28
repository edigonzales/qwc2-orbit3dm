# qwc2-orbit3dm

- `npm run dev` startet unter Node 22 den Webpack-Dev-Server. `npm run setup` bereitet bei Bedarf die gepinnten Frontend-Abhängigkeiten und die QWC-Iconfont vor.
- `frontend/js/Orbit3DM.jsx` ist das integrierbare QWC2-Plugin. In `frontend/js/orbit/` liegen der SDK-Adapter und die LV95-Helfer. Der Dev-Proxy bindet öffentliche Solothurner Karten- und Suchdienste ein.
- Die geschützte Publikation verwendet den persönlichen Login im Orbit-Viewer. Repo und Browser-Bundle enthalten für Solothurn die Publikationskonfiguration.
- Bei QWC2- oder SDK-Arbeit den Skill [qwc2-integration](.agents/skills/qwc2-integration/SKILL.md) verwenden. Vor der Abnahme [simplify-change](.agents/skills/simplify-change/SKILL.md) und bei der Prüfung [review-change](.agents/skills/review-change/SKILL.md) anwenden.
- `ORBIT_PROFILE=fixture` dient dem Solothurner Browserablauf ohne Zugangsdaten. `ORBIT_PROFILE=bentley` nutzt die öffentliche Bentley-Demo für Rendering und SDK-Ereignisse. Im Review die tatsächliche Bildquelle nennen.

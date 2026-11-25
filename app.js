"use strict";

const publisher = "https://www.digitalmaps.ch";
const publication = "150449_Kantonsstrassen_Solothurn";
const crs = "2056";

const form = document.getElementById("focus-form");
const eastInput = document.getElementById("east");
const northInput = document.getElementById("north");
const openButton = document.getElementById("open-photo");
const testPointButton = document.getElementById("toggle-test-point");
const downloadButton = document.getElementById("download-sdk-photo");
const status = document.getElementById("status");
const camera = document.getElementById("camera");
const panel = document.getElementById("viewer-panel");
const container = document.getElementById("orbit-viewer");

function showStatus(message, isError = false) {
    status.textContent = message;
    status.toggleAttribute("data-error", isError);
}

function parseCoordinate(value) {
    const normalized = value.trim().replace(/[\s'’]/g, "").replace(",", ".");
    return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

async function initialize() {
    const sdk = window.orbitgt?.mapping3d?.sdk?.viewer;
    if (!sdk) {
        showStatus("Das Orbit SDK konnte nicht geladen werden. Prüfe die Verbindung zu cdn.3dmapping.cloud.", true);
        return;
    }

    const { AList, AMap, Color, Constants, Coordinate, MapObject, SDKViewer } = sdk;
    const login = new AMap();
    login.set(Constants.LOGIN_MODE, Constants.LOGINMODE_PUBLISHER);
    login.set(Constants.LOGIN_HOST, publisher);
    login.set(Constants.LOGIN_PUBLICATION_NAME, publication);

    const options = new AMap();
    options.set(Constants.STARTUP_PRESET_LOGIN, login);
    options.set(Constants.STARTUP_CRS, crs);

    const viewer = new SDKViewer("QWC2 Orbit3DM", container, options);
    const testPointLayer = "GeoJSON-Testpunkt";
    let workspace = null;
    let opening = false;
    let photoId = null;
    let testPointVisible = false;
    let downloading = false;
    const updateButtons = () => {
        openButton.disabled = !workspace || opening;
        testPointButton.disabled = !workspace || opening || (!photoId && !testPointVisible);
        testPointButton.setAttribute("aria-pressed", String(testPointVisible));
        testPointButton.textContent = testPointVisible
            ? "GeoJSON-Testpunkt ausblenden"
            : "GeoJSON-Testpunkt anzeigen";
        downloadButton.disabled = !workspace || opening || !photoId || downloading;
    };

    viewer.onWorkspaceOpened.add(() => {
        workspace = {};
        updateButtons();
        showStatus("Publikation geladen. Du kannst ein Panorama öffnen.");
    });

    viewer.onWorkspaceClosed.add(() => {
        workspace = null;
        photoId = null;
        testPointVisible = false;
        camera.hidden = true;
        updateButtons();
        showStatus("Melde dich im Orbit Viewer an.");
    });

    viewer.onPhotoOpened.add((payload) => {
        const { photoId: openedPhotoId, photoPosition, renderMode } = JSON.parse(payload);
        if (!workspace || renderMode !== Constants.RENDER_MODE_PHOTO_SPHERICAL || !photoPosition) {
            return;
        }
        photoId = openedPhotoId;
        const { x, y, crs: cameraCrs } = photoPosition;
        const coordinateSystem = String(cameraCrs) === crs ? "LV95" : cameraCrs;
        camera.textContent = `Kameraposition (${coordinateSystem}) · ${x.toFixed(2)} / ${y.toFixed(2)} · Foto ${photoId}`;
        camera.hidden = false;
        updateButtons();
    });

    viewer.onPhotoClosed.add((payload) => {
        const { photoId: closedPhotoId, renderMode } = JSON.parse(payload);
        if (photoId === closedPhotoId && renderMode === Constants.RENDER_MODE_PHOTO_SPHERICAL) {
            photoId = null;
            camera.hidden = true;
            updateButtons();
        }
    });

    await viewer.isReady;
    if (!workspace) {
        showStatus("Melde dich im Orbit Viewer an.");
    }

    const resizeViewer = () => viewer.setSize(panel.clientWidth, panel.clientHeight);
    new ResizeObserver(resizeViewer).observe(panel);
    resizeViewer();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!workspace || opening) {
            return;
        }

        const east = parseCoordinate(eastInput.value);
        const north = parseCoordinate(northInput.value);
        if (!Number.isFinite(east) || !Number.isFinite(north)) {
            showStatus("Gib den Ost- und Nordwert in LV95 ein, je eine Zahl pro Feld.", true);
            return;
        }

        const requestedWorkspace = workspace;
        opening = true;
        updateButtons();
        showStatus("Orbit sucht ein Panorama …");

        try {
            const position = Coordinate.fromXY(crs, east, north);
            await viewer.addView(position, Constants.RENDER_MODE_PHOTO_SPHERICAL, true);
            if (workspace === requestedWorkspace) {
                showStatus("Panorama geöffnet.");
            }
        } catch (error) {
            if (workspace === requestedWorkspace) {
                const message = error?.code === Constants.ADD_VIEW_ERROR_PHOTO_NOT_FOUND
                    ? "Orbit hat zu dieser Koordinate kein Panorama gefunden."
                    : "Orbit konnte das Panorama nicht öffnen. Prüfe die Meldung im Viewer.";
                showStatus(message, true);
            }
        } finally {
            opening = false;
            updateButtons();
        }
    });

    testPointButton.addEventListener("click", () => {
        try {
            if (testPointVisible) {
                viewer.clearOverlayObjects(testPointLayer);
                testPointVisible = false;
                showStatus("GeoJSON-Testpunkt ausgeblendet.");
                return;
            }

            const views = viewer.getFieldOfViews2D().toArray();
            const view = views.find((item) => item.properties?.get("photoId") === photoId);
            const origin = view?.spatialPoint;
            const pan = parseFloat(view?.properties.get("pan")) * Math.PI / 180;
            const tilt = parseFloat(view?.properties.get("tilt")) * Math.PI / 180;
            if (!origin || !Number.isFinite(pan) || !Number.isFinite(tilt)) {
                throw new Error("Blickrichtung fehlt.");
            }

            const horizontalDistance = 10 * Math.cos(tilt);
            const target = Coordinate.fromXYZ(origin.crs,
                origin.x + Math.sin(pan) * horizontalDistance,
                origin.y + Math.cos(pan) * horizontalDistance,
                origin.z + Math.sin(tilt) * 10);
            const geographic = viewer.transformCoordinate(target, "4326");
            if (!geographic || ![geographic.x, geographic.y, geographic.z].every(Number.isFinite)) {
                throw new Error("Koordinatentransformation fehlgeschlagen.");
            }
            const feature = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [geographic.x, geographic.y, geographic.z]
                },
                properties: { name: testPointLayer }
            };

            const point = new MapObject();
            point.objectId = "geojson-test-point";
            point.spatialPoint = Coordinate.fromXYZ("4326", ...feature.geometry.coordinates);
            point.color = Color.fromRGB(255, 255, 255);
            point.fillColor = Color.fromRGBA(255, 35, 122, 255);
            point.symbolName = "circle_filled";
            point.symbolSize = 24;
            point.lineWidth = 2;
            point.tooltip = feature.properties.name;
            const objects = new AList(MapObject.TYPE);
            objects.add(point);
            viewer.addOverlayObjects(objects, testPointLayer);
            testPointVisible = true;
            showStatus("GeoJSON-Testpunkt etwa 10 m vor der Kamera eingeblendet.");
        } catch (error) {
            showStatus(`GeoJSON-Testpunkt konnte nicht angezeigt werden. ${error.message ?? ""}`.trim(), true);
        } finally {
            updateButtons();
        }
    });

    downloadButton.addEventListener("click", async () => {
        if (!workspace || !photoId || downloading) {
            return;
        }

        const requestedWorkspace = workspace;
        const requestedPhotoId = photoId;
        downloading = true;
        updateButtons();
        showStatus("Orbit lädt die Bilddatei …");
        try {
            if (typeof viewer.getPhoto !== "function") {
                throw new Error("Diese SDK-Version stellt getPhoto() nicht bereit.");
            }
            const dataUrl = await viewer.getPhoto(requestedPhotoId);
            if (workspace !== requestedWorkspace) {
                return;
            }
            if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
                throw new Error("Das SDK hat keine Bilddatei zurückgegeben.");
            }
            const fileId = requestedPhotoId.replace(/[^a-z0-9._-]+/gi, "_");
            const extension = dataUrl.startsWith("data:image/jpeg;") ? "jpg"
                : dataUrl.startsWith("data:image/png;") ? "png" : "bin";
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `orbit-sdk-${fileId}.${extension}`;
            document.body.append(link);
            link.click();
            link.remove();
            showStatus("Bild an den Browser-Download übergeben.");
        } catch (error) {
            if (workspace === requestedWorkspace) {
                showStatus(`SDK-Download fehlgeschlagen. ${error.message ?? ""}`.trim(), true);
            }
        } finally {
            downloading = false;
            updateButtons();
        }
    });
}

initialize().catch(() => {
    showStatus("Der Orbit Viewer konnte nicht initialisiert werden.", true);
});

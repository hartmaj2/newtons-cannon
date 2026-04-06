(() => {
    "use strict";

    // ── Constants (SI units) ──
    const G  = 6.674e-11;          // gravitational constant
    const M  = 5.972e24;           // Earth mass (kg)
    const GM = G * M;              // standard gravitational parameter
    const R  = 6.378e6;            // Earth radius (m)

    // ── Internationalization ──
    const LOCALES = {
        en: {
            // Page
            title: "Newton's Cannon",

            // Headings
            headingLaunch:    "Launch Parameters",
            headingSim:       "Simulation",
            headingTelemetry: "Telemetry",
            headingPresets:   "Presets",

            // Labels
            labelSpeed:     "Speed",
            labelAltitude:  "Altitude above surface",
            labelDirection: "Launch angle",
            labelTimeScale: "Time scale",

            // Buttons
            btnLaunch:     "Launch",
            btnResetAngle: "Reset Angle",
            btnReset:      "Recenter View",
            btnClearAll:   "Remove all objects",

            // Canvas
            cannon: "Cannon",

            // Telemetry
            telemVelocity: "Velocity",
            telemAltitude: "Altitude",
            telemRemove:   "Remove",

            // Preset labels
            presetSuborbital:     "Suborbital",
            presetCircular:       "Circular",
            presetParabolic:      "Parabolic",
            presetEllipticalLow:  "Elliptical (low)",
            presetEllipticalHigh: "Elliptical (high)",

            // Preset descriptions
            descSuborbital:     "Half of orbital velocity",
            descCircular:       "Circular orbit at this altitude",
            descParabolic:      "Escape velocity at this altitude",
            descEllipticalLow:  "Periapsis at planet surface",
            descEllipticalHigh: "Apoapsis at 2× launch radius",

            // Orbit classification
            orbitSuborbital:   "Suborbital",
            orbitLowElliptic:  "Low elliptical orbit",
            orbitCircular:     "Near-circular orbit",
            orbitElliptic:     "Elliptical orbit",
            orbitNearEscape:   "Near-escape trajectory",
            orbitParabolic:    "Escape — parabolic",
            orbitHyperbolic:   "Hyperbolic escape",

            // Info panel
            infoTitle:    "Physical Constants",
            infoG:        "Gravitational constant",
            infoM:        "Earth mass",
            infoR:        "Earth radius",

            // Tooltips
            tipLaunch:      "Space",
            tipResetAngle:  "Press O",
            tipRecenter:    "Press C",
            tipHold:        "Hold",
            tipIndicatorRecenter: "Click to recenter view",

            // Language toggle
            langLabel: "🇬🇧 EN",
        },
        cs: {
            title: "Newtonův kanón",

            headingLaunch:    "Parametry startu",
            headingSim:       "Simulace",
            headingTelemetry: "Telemetrie",
            headingPresets:   "Předvolby",

            labelSpeed:     "Rychlost",
            labelAltitude:  "Výška nad povrchem",
            labelDirection: "Úhel startu",
            labelTimeScale: "Časové měřítko",

            btnLaunch:     "Start",
            btnResetAngle: "Vynulovat úhel",
            btnReset:      "Vycentrovat pohled",
            btnClearAll:   "Odstranit všechna tělesa",

            cannon: "Kanón",

            telemVelocity: "Rychlost",
            telemAltitude: "Výška",
            telemRemove:   "Odstranit",

            presetSuborbital:     "Suborbitální",
            presetCircular:       "Kruhová",
            presetParabolic:      "Parabolická",
            presetEllipticalLow:  "Eliptická (nízká)",
            presetEllipticalHigh: "Eliptická (vysoká)",

            descSuborbital:     "Polovina orbitální rychlosti",
            descCircular:       "Kruhová orbita v této výšce",
            descParabolic:      "Úniková rychlost v této výšce",
            descEllipticalLow:  "Perigeum na povrchu planety",
            descEllipticalHigh: "Apogeum ve 2× poloměru startu",

            orbitSuborbital:   "Suborbitální",
            orbitLowElliptic:  "Nízká eliptická orbita",
            orbitCircular:     "Téměř kruhová orbita",
            orbitElliptic:     "Eliptická orbita",
            orbitNearEscape:   "Téměř úniková trajektorie",
            orbitParabolic:    "Únik — parabolický",
            orbitHyperbolic:   "Hyperbolický únik",

            infoTitle:    "Fyzikální konstanty",
            infoG:        "Gravitační konstanta",
            infoM:        "Hmotnost Země",
            infoR:        "Poloměr Země",

            tipLaunch:      "Mezerník",
            tipResetAngle:  "Klávesa O",
            tipRecenter:    "Klávesa C",
            tipHold:        "Držet",
            tipIndicatorRecenter: "Klikněte pro vycentrování pohledu",

            langLabel: "🇨🇿 CZ",
        },
    };

    let currentLocale = "cs";

    function t(key) {
        return LOCALES[currentLocale][key] || LOCALES.en[key] || key;
    }

    // ── Canvas setup ──
    const canvas = document.getElementById("simCanvas");
    const ctx    = canvas.getContext("2d");

    function resize() {
        canvas.width  = canvas.clientWidth  * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    window.addEventListener("resize", resize);
    resize();

    // ── View / camera ──
    let viewCenterX = 0;   // world coords (meters) at screen center
    let viewCenterY = 0;
    let viewScale   = 0;   // pixels per meter — computed from planet

    function isMobile() {
        return window.matchMedia("(max-width: 768px)").matches;
    }

    function resetView() {
        viewCenterX = 0;
        viewCenterY = 0;
        const minDim = Math.min(canvas.clientWidth, canvas.clientHeight);
        const divisor = isMobile() ? 4.5 : 3.5;
        viewScale = minDim / (divisor * R);
    }
    resetView();

    function worldToScreen(wx, wy) {
        const cx = canvas.clientWidth  / 2;
        const cy = canvas.clientHeight / 2;
        return [
            cx + (wx - viewCenterX) * viewScale,
            cy - (wy - viewCenterY) * viewScale,   // y up → screen y down
        ];
    }

    function screenToWorld(sx, sy) {
        const cx = canvas.clientWidth  / 2;
        const cy = canvas.clientHeight / 2;
        return [
            (sx - cx) / viewScale + viewCenterX,
            -(sy - cy) / viewScale + viewCenterY,
        ];
    }

    // ── Pan & zoom ──
    let isPanning  = false;
    let panStartX  = 0;
    let panStartY  = 0;
    let panOriginX = 0;
    let panOriginY = 0;

    canvas.addEventListener("mousedown", e => {
        isPanning  = true;
        panStartX  = e.clientX;
        panStartY  = e.clientY;
        panOriginX = viewCenterX;
        panOriginY = viewCenterY;
    });
    window.addEventListener("mousemove", e => {
        if (!isPanning) return;
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        viewCenterX = panOriginX - dx / viewScale;
        viewCenterY = panOriginY + dy / viewScale;
    });
    window.addEventListener("mouseup", () => isPanning = false);

    canvas.addEventListener("wheel", e => {
        e.preventDefault();
        const [wx, wy] = screenToWorld(e.offsetX, e.offsetY);
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        viewScale *= factor;
        // keep point under cursor fixed
        viewCenterX = wx - (e.offsetX - canvas.clientWidth  / 2) / viewScale;
        viewCenterY = wy + (e.offsetY - canvas.clientHeight / 2) / viewScale;
    }, { passive: false });

    // ── Touch pan & pinch-zoom (mobile) ──
    let lastTouchDist = 0;

    canvas.addEventListener("touchstart", e => {
        const rect = canvas.getBoundingClientRect();

        if (e.touches.length === 1) {
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;

            if (arrowTipHitTest(x, y)) {
                arrowTipDragging = true;
                return;
            }
            if (cannonHitTest(x, y)) {
                cannonDragging = true;
                return;
            }
            if (cannonIndicatorHitTest(x, y)) {
                resetView();
                return;
            }
            if (scaleBarHitTest(x, y)) {
                scaleBarDragging = true;
                scaleBarDragStartX = x - scaleBarOffsetX;
                scaleBarDragStartY = y - scaleBarOffsetY;
                scaleBarTween = null;
                return;
            }

            isPanning  = true;
            panStartX  = e.touches[0].clientX;
            panStartY  = e.touches[0].clientY;
            panOriginX = viewCenterX;
            panOriginY = viewCenterY;
        } else if (e.touches.length === 2) {
            isPanning = false;
            arrowTipDragging = false;
            cannonDragging = false;
            scaleBarDragging = false;

            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDist = Math.hypot(dx, dy);
        }
    }, { passive: true });

    canvas.addEventListener("touchmove", e => {
        const rect = canvas.getBoundingClientRect();

        if (
            (e.touches.length === 1 && (isPanning || arrowTipDragging || cannonDragging || scaleBarDragging)) ||
            e.touches.length === 2
        ) {
            e.preventDefault();
        }

        if (e.touches.length === 1) {
            const clientX = e.touches[0].clientX;
            const clientY = e.touches[0].clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            if (arrowTipDragging) {
                updateArrowFromMouse(clientX, clientY);
                return;
            }

            if (cannonDragging) {
                updateCannonFromMouse(clientX, clientY);
                return;
            }

            if (scaleBarDragging) {
                scaleBarOffsetX = x - scaleBarDragStartX;
                scaleBarOffsetY = y - scaleBarDragStartY;
                return;
            }

            if (isPanning) {
                const dx = clientX - panStartX;
                const dy = clientY - panStartY;
                viewCenterX = panOriginX - dx / viewScale;
                viewCenterY = panOriginY + dy / viewScale;
            }
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (lastTouchDist > 0) {
                const factor = dist / lastTouchDist;
                viewScale *= factor;
            }
            lastTouchDist = dist;
        }
    }, { passive: false });

    canvas.addEventListener("touchend", () => {
        isPanning = false;
        lastTouchDist = 0;
    }, { passive: true });

    // ── Slider configuration ──
    const SLIDER_CONFIG = {
        speed:     { min: 0,   max: 20,   step: 0.1, keyStep: 0.5,  default: 7.9 },
        altitude:  { min: 0,   max: 10000, step: 10,  keyStep: 50,   default: 10   },
        direction: { min: -90, max: 90,   step: 1,   keyStep: 5,    default: 0   },
        timeScale: { min: 0, max: 4, step: 1, keyStep: 1,  default: 2}, // changes by multiples of 10
    };

    function getTimeScale() { return Math.round(Math.pow(10, parseInt(timeScaleSlider.value))); }

    // ── Units ──
    const UNIT_SPEED     = " km/s";
    const UNIT_ALTITUDE  = " km";
    const UNIT_DIRECTION = "°";
    const UNIT_TIMESCALE = "×";

    // ── UI elements ──
    const speedSlider     = document.getElementById("speed");
    const altSlider       = document.getElementById("altitude");
    const dirSlider       = document.getElementById("direction");
    const timeScaleSlider = document.getElementById("timeScale");

    // Apply config to sliders
    const SLIDER_MAP = { speed: speedSlider, altitude: altSlider, direction: dirSlider, timeScale: timeScaleSlider };
    for (const [name, cfg] of Object.entries(SLIDER_CONFIG)) {
        const el = SLIDER_MAP[name];
        el.min   = cfg.min;
        el.max   = cfg.max;
        el.step  = cfg.step;
        el.value = cfg.default;
    }

    const speedVal     = document.getElementById("speedValue");
    const altVal       = document.getElementById("altitudeValue");
    const dirVal       = document.getElementById("directionValue");
    const timeScaleVal = document.getElementById("timeScaleValue");

    const launchBtn     = document.getElementById("launchBtn");
    const clearAllBtn   = document.getElementById("clearAllBtn");

    const telemetryContainer = document.getElementById("telemetryContainer");
    const telemetrySection   = document.getElementById("telemetrySection");
    const orbitLabel  = document.getElementById("orbit-label");

    function updateSliderDisplays() {
        speedVal.textContent     = parseFloat(speedSlider.value).toFixed(1) + UNIT_SPEED;
        altVal.textContent       = parseInt(altSlider.value).toLocaleString() + UNIT_ALTITUDE;
        dirVal.textContent       = dirSlider.value + UNIT_DIRECTION;
        timeScaleVal.textContent = getTimeScale() + UNIT_TIMESCALE;
    }

    [speedSlider, altSlider, dirSlider, timeScaleSlider].forEach(s =>
        s.addEventListener("input", updateSliderDisplays)
    );

    // Sliders interfere with the current preset
    [speedSlider, altSlider, dirSlider].forEach(s =>
        s.addEventListener("input", unselectPresets)
    );

    updateSliderDisplays();

    // ── Click-to-edit on value displays ──
    const VALUE_DISPLAY_MAP = {
        speedValue:     { slider: speedSlider, name: "speed",     parse: parseFloat, suffix: UNIT_SPEED },
        altitudeValue:  { slider: altSlider,   name: "altitude",  parse: parseInt,   suffix: UNIT_ALTITUDE },
        directionValue: { slider: dirSlider,   name: "direction", parse: parseFloat, suffix: UNIT_DIRECTION },
        timeScaleValue: { slider: timeScaleSlider, name: "timeScale", parse: parseFloat, suffix: UNIT_TIMESCALE, isTimeScale: true },
    };

    for (const [elId, cfg] of Object.entries(VALUE_DISPLAY_MAP)) {
        const span = document.getElementById(elId);
        span.addEventListener("click", () => {
            if (span.querySelector("input")) return; // already editing
            const scfg = SLIDER_CONFIG[cfg.name];
            const currentRaw = cfg.isTimeScale
                ? getTimeScale()
                : cfg.parse(cfg.slider.value);
            const input = document.createElement("input");
            input.type = "text";
            input.className = "value-input";
            input.value = currentRaw;
            span.textContent = "";
            span.appendChild(input);
            input.focus();
            input.select();

            function commit() {
                let val = cfg.parse(input.value);
                if (isNaN(val)) val = cfg.parse(cfg.slider.value);
                if (cfg.isTimeScale) {
                    // Convert from display value (e.g. 100) to slider exponent
                    val = Math.max(1, val);
                    let exp = Math.round(Math.log10(val));
                    exp = Math.max(scfg.min, Math.min(scfg.max, exp));
                    cfg.slider.value = exp;
                } else {
                    val = Math.max(scfg.min, Math.min(scfg.max, val));
                    // Snap to step
                    val = Math.round(val / scfg.step) * scfg.step;
                    cfg.slider.value = val;
                }
                updateSliderDisplays();
                if (cfg.name !== "timeScale") unselectPresets();
                if (cfg.name === "altitude") updatePresets();
            }

            input.addEventListener("keydown", e => {
                if (e.key === "Enter") { commit(); input.blur(); }
                if (e.key === "Escape") { input.blur(); }
                e.stopPropagation();
            });
            input.addEventListener("blur", commit, { once: true });
        });
    }

    // ── Dynamic presets based on altitude ──
    // V_orbital at Sun's distance for 3rd cosmic speed
    const V_EARTH_ORBIT = 29780; // m/s — Earth's orbital speed around Sun

    function computePresetSpeed(type, r) {
        const v1 = Math.sqrt(GM / r);           // 1st cosmic: circular orbit
        const v2 = Math.sqrt(2 * GM / r);       // 2nd cosmic: escape velocity
        // 3rd cosmic: escape Earth + escape Sun from Earth orbit
        const v_inf = (Math.sqrt(2) - 1) * V_EARTH_ORBIT; // extra speed needed at infinity
        const v3 = Math.sqrt(v_inf * v_inf + v2 * v2);    // launch speed from altitude r
        switch (type) {
            case "suborbital":     return v1 * 0.5;
            case "v1":             return v1;
            case "v2":             return v2;
            case "elliptical-low": return Math.sqrt(GM * 2 * R / (r * (r + R)));
            case "elliptical-high":return Math.sqrt(GM * 2 * 2 * r / (r * (r + 2 * r)));
            default:               return v1;
        }
    }

    // ── Button & preset emojis ──
    const BUTTON_ICONS = {
        launch:     "🚀",
        resetAngle: "🧭",
        reset:      "🎯",
    };

    // Apply icons, tooltips, button labels
    function applyButtonLabels() {
        launchBtn.textContent     = BUTTON_ICONS.launch     + " " + t("btnLaunch");
        clearAllBtn.title         = t("btnClearAll");

        launchBtn.title     = t("tipLaunch");

        const hold = t("tipHold");
        speedSlider.title     = hold + " R + ←→↑↓";
        altSlider.title       = hold + " V + ←→↑↓";
        dirSlider.title       = hold + " U + ←→↑↓";
        timeScaleSlider.title = hold + " K + ←→↑↓";
    }
    applyButtonLabels();

    const PRESET_ICONS = {
        "suborbital":      "🏔️",
        "v1":              "🛰️",
        "v2":              "☄️",
        "elliptical-low":  "📉",
        "elliptical-high": "📈",
    };

    const PRESET_LABEL_KEYS = {
        "suborbital":      "presetSuborbital",
        "v1":              "presetCircular",
        "v2":              "presetParabolic",
        "elliptical-low":  "presetEllipticalLow",
        "elliptical-high": "presetEllipticalHigh",
    };

    const PRESET_DESC_KEYS = {
        "suborbital":      "descSuborbital",
        "v1":              "descCircular",
        "v2":              "descParabolic",
        "elliptical-low":  "descEllipticalLow",
        "elliptical-high": "descEllipticalHigh",
    };

    function unselectPresets() {
        document.querySelectorAll(".preset").forEach(b => b.classList.remove("active"));
    }

    function updatePresets() {
        const alt_km = parseFloat(altSlider.value);
        const r = R + alt_km * 1000;
        document.querySelectorAll(".preset").forEach(btn => {
            const type = btn.dataset.type;
            const speed_ms = computePresetSpeed(type, r);
            const speed_km = speed_ms / 1000;
            btn.dataset.speed = speed_km.toFixed(2);
            btn.querySelector("strong").textContent =
                PRESET_ICONS[type] + " " + t(PRESET_LABEL_KEYS[type]);
            btn.querySelector("span").textContent =
                speed_km.toFixed(1) + UNIT_SPEED + " — " + t(PRESET_DESC_KEYS[type]);
        });
    }

    altSlider.addEventListener("input", updatePresets);
    updatePresets();

    // Presets
    document.querySelectorAll(".preset").forEach(btn => {
        btn.addEventListener("click", () => {
            speedSlider.value = btn.dataset.speed;
            dirSlider.value = 0;
            updateSliderDisplays();
            document.querySelectorAll(".preset").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });

    // ── Projectile names (real missions, satellites, rockets) ──
    const MISSION_NAMES = [
        "Sputnik", "Apollo", "Gemini", "Mercury", "Vostok", "Voskhod", "Soyuz",
        "Skylab", "Mir", "Salyut", "Tiangong", "Zond", "Luna", "Ranger",
        "Surveyor", "Mariner", "Pioneer", "Voyager", "Viking", "Galileo",
        "Cassini", "Juno", "Rosetta", "Giotto", "Ulysses", "Kepler",
        "Hubble", "Chandra", "Spitzer", "Fermi", "Swift", "TESS",
        "Parker", "Dawn", "Stardust", "Genesis", "NEAR", "Hayabusa",
        "OSIRIS-REx", "InSight", "Phoenix", "Spirit", "Opportunity",
        "Curiosity", "Perseverance", "Ingenuity", "Sojourner", "Pathfinder",
        "Magellan", "Venera", "Akatsuki", "BepiColombo", "Messenger",
        "New Horizons", "Deep Impact", "ICE", "ISEE", "Explorer",
        "Discoverer", "Corona", "Lacrosse", "Cosmos", "Molniya",
        "Intelsat", "Telstar", "Syncom", "Echo", "Relay",
        "Landsat", "GOES", "NOAA", "Aqua", "Terra", "Aura",
        "CloudSat", "CALIPSO", "Sentinel", "Copernicus", "GRACE",
        "GOCE", "CryoSat", "Aeolus", "Envisat", "ERS",
        "Ariane", "Vega", "Titan", "Atlas", "Delta",
        "Falcon", "Starship", "Electron", "Antares", "Minotaur",
        "Pegasus", "Athena", "Saturn V", "N-1", "Energia",
        "Proton", "Angara", "Zenit", "Dnepr", "Rokot",
        "Long March", "PSLV", "GSLV", "H-IIA", "Epsilon",
        "Diamant", "Europa", "Black Arrow", "Lambda", "Mu",
        "Chandrayaan", "Mangalyaan", "Aditya", "Astrosat", "Cartosat",
        "Shijian", "Beidou", "GLONASS", "Navstar", "Iridium",
        "Starlink", "OneWeb", "Orbcomm", "Globalstar", "Thuraya",
        "Olympus", "Artemis", "Orion", "Starliner", "Dragon",
        "Cygnus", "Progress", "Tianzhou", "Kounotori", "ATV",
        "Buran", "Hermes", "Clipper", "Dream Chaser", "SpaceShipTwo",
        "X-37B", "Dyna-Soar", "Almaz", "SNAP", "Transit",
        "Navsat", "LAGEOS", "Magion", "Proba", "LISA",
    ];

    const usedNames = new Set();

    function pickName() {
        const available = MISSION_NAMES.filter(n => !usedNames.has(n));
        if (available.length === 0) {
            usedNames.clear();
            return MISSION_NAMES[Math.floor(Math.random() * MISSION_NAMES.length)];
        }
        const name = available[Math.floor(Math.random() * available.length)];
        usedNames.add(name);
        return name;
    }

    // ── Projectile simulation ──
    const projectiles = [];   // each: { id, name, trail, x, y, vx, vy, alive, color, label }
    let nextProjectileId = 1;

    // ── Language toggle ──
    const langToggle = document.getElementById("langToggle");
    const LANG_CYCLE = Object.keys(LOCALES);

    // ── Info panel toggle ──
    const infoToggle = document.getElementById("infoToggle");
    const infoPanel  = document.getElementById("infoPanel");

    infoToggle.addEventListener("click", () => {
        const open = infoPanel.style.display === "none";
        infoPanel.style.display = open ? "" : "none";
        infoToggle.classList.toggle("active", open);
    });

    // Populate info panel from constants
    function sciNote(val, unit) {
        const exp = Math.floor(Math.log10(Math.abs(val)));
        const mantissa = val / Math.pow(10, exp);
        const sup = String(exp).replace(/-/g, "⁻").replace(/\d/g, d =>
            "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);
        return mantissa.toPrecision(4) + " × 10" + sup + " " + unit;
    }
    document.getElementById("infoValG").textContent  = "G = " + sciNote(G, "N·m²/kg²");
    document.getElementById("infoValM").textContent  = "M = " + sciNote(M, "kg");
    document.getElementById("infoValR").textContent  = "R = " + (R / 1e3).toLocaleString() + UNIT_ALTITUDE;

    function setLocale(lang) {
        currentLocale = lang;
        document.documentElement.lang = lang;

        // Static data-i18n elements
        document.querySelectorAll("[data-i18n]").forEach(el => {
            el.textContent = t(el.dataset.i18n);
        });

        // Buttons
        applyButtonLabels();

        // Presets
        updatePresets();

        // Rebuild existing telemetry panels
        for (const p of projectiles) {
            const panel = document.getElementById("telem-" + p.id);
            if (!panel) continue;
            const labels = panel.querySelectorAll(".telem-label");
            if (labels[0]) labels[0].textContent = t("telemVelocity");
            if (labels[1]) labels[1].textContent = t("telemAltitude");
            const closeBtn = panel.querySelector(".telem-close");
            if (closeBtn) closeBtn.title = t("telemRemove");
        }

        // Toggle button label
        langToggle.textContent = t("langLabel");
    }

    langToggle.addEventListener("click", () => {
        const idx = LANG_CYCLE.indexOf(currentLocale);
        const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
        setLocale(next);
    });

    // Initialize locale
    setLocale(currentLocale);

    const trailColors = [
        "#3b82f6", "#22c55e", "#eab308", "#ef4444",
        "#a855f7", "#ec4899", "#06b6d4", "#f97316",
    ];
    let colorIdx = 0;

    function launch() {
        const speed_km = parseFloat(speedSlider.value);         // km/s
        const alt_km   = parseFloat(altSlider.value);           // km

        const speed = speed_km * 1000;                          // m/s
        const alt   = alt_km * 1000;                            // m
        const r     = R + alt;

        // Position: top of planet (y-axis up)
        const x = 0;
        const y = r;

        // Velocity: rotated by launch angle from tangent at top
        const angleDeg = parseFloat(dirSlider.value);
        const angleRad = angleDeg * Math.PI / 180;
        const vx = speed * Math.cos(angleRad);
        const vy = speed * Math.sin(angleRad);

        const color = trailColors[colorIdx % trailColors.length];
        colorIdx++;

        const id = nextProjectileId++;
        const name = pickName();
        projectiles.push({
            id, name, x, y, vx, vy,
            trail: [{ x, y }],
            alive: true,
            color,
            age: 0,
            maxTrail: 80000,
        });

        telemetrySection.style.display = "";
    }

    function resetAngle() {
        dirSlider.value = 0;
        updateSliderDisplays();
    }

    function clearTraces()
    {
        projectiles.length = 0;
        nextProjectileId = 1;
        usedNames.clear();
        telemetryContainer.innerHTML = "";
        telemetrySection.style.display = "none";
    }

    // ── Mobile panel toggle ──
    const panelToggle = document.getElementById("panelToggle");
    const controlsPanel = document.getElementById("controls");

    function closePanelIfMobile() {
        if (isMobile()) {
            controlsPanel.classList.add("collapsed");
            panelToggle.textContent = "☰";
        }
    }

    panelToggle.addEventListener("click", () => {
        const collapsed = controlsPanel.classList.toggle("collapsed");
        panelToggle.textContent = collapsed ? "☰" : "✕";
    });

    // Start collapsed on mobile
    if (isMobile()) {
        controlsPanel.classList.add("collapsed");
    }

    launchBtn.addEventListener("click", () => { launch(); closePanelIfMobile(); });
    clearAllBtn.addEventListener("click", clearTraces);

    // Keyboard shortcuts
    const paramLabel = document.getElementById("param-label");
    let activeParam = null; // active parameter name (e.g. "speed")
    let activeParamKey = null; // the key code that activated it

    // Parameter definitions by name (driven by SLIDER_CONFIG)
    const PARAMS = {
        speed: {
            labelKey: "labelSpeed",
            slider: speedSlider,
            format(v) { return parseFloat(v).toFixed(1) + UNIT_SPEED; },
            onchange() { unselectPresets(); },
        },
        altitude: {
            labelKey: "labelAltitude",
            slider: altSlider,
            format(v) { return parseInt(v).toLocaleString() + UNIT_ALTITUDE; },
            onchange() { updatePresets(); unselectPresets(); },
        },
        direction: {
            labelKey: "labelDirection",
            slider: dirSlider,
            format(v) { return v + UNIT_DIRECTION; },
        },
        timeScale: {
            labelKey: "labelTimeScale",
            slider: timeScaleSlider,
            format(v) { return getTimeScale() + UNIT_TIMESCALE; },
        },
    };

    // Generic increase/decrease using SLIDER_CONFIG
    for (const [name, def] of Object.entries(PARAMS)) {
        const cfg = SLIDER_CONFIG[name];
        def.value = function() { return def.format(def.slider.value); };
        def.increase = function() {
            def.slider.value = Math.min(cfg.max, parseFloat(def.slider.value) + cfg.keyStep);
            updateSliderDisplays();
            if (def.onchange) def.onchange();
        };
        def.decrease = function() {
            def.slider.value = Math.max(cfg.min, parseFloat(def.slider.value) - cfg.keyStep);
            updateSliderDisplays();
            if (def.onchange) def.onchange();
        };
    }

    // ── Keymap ──
    const KEYS = {
        // Parameter modifiers (hold + direction to adjust)
        paramSpeed:     ["KeyR"],
        paramAltitude:  ["KeyV"],
        paramDirection: ["KeyU"],
        paramTimeScale: ["KeyK"],
        // Direction keys for parameter adjustment & scale bar rotation
        increase:       ["ArrowRight", "ArrowUp"],
        decrease:       ["ArrowLeft",  "ArrowDown"],
        rotateRight:    ["ArrowRight", "KeyD"],
        rotateLeft:     ["ArrowLeft",  "KeyA"],
        // Standalone actions
        launch:         ["Space"],
        resetAngle:     ["KeyO"],
        resetView:      ["KeyC"],
    };

    function keyIn(code, group) { return KEYS[group].includes(code); }

    // Build param key map from KEYS
    const PARAM_KEY_MAP = {};
    for (const [param, group] of [["speed","paramSpeed"],["altitude","paramAltitude"],["direction","paramDirection"],["timeScale","paramTimeScale"]]) {
        for (const code of KEYS[group]) PARAM_KEY_MAP[code] = param;
    }

    function updateParamLabel(def, activeArrow) {
        const arrows = [
            { cls: "arrow-left",  ch: "◀", codes: KEYS.decrease },
            { cls: "arrow-right", ch: "▶", codes: KEYS.increase },
            { cls: "arrow-up",    ch: "▲", codes: KEYS.increase },
            { cls: "arrow-down",  ch: "▼", codes: KEYS.decrease },
        ];
        const arrowHtml = arrows.map(a => {
            const active = activeArrow && a.codes.includes(activeArrow);
            return '<span class="param-arrow' + (active ? ' arrow-active' : '') + '">' + a.ch + '</span>';
        }).join(' ');
        paramLabel.innerHTML =
            '<div class="param-name">' + t(def.labelKey) + '</div>' +
            '<div class="param-arrows">' + arrowHtml + '</div>' +
            '<div class="param-value">' + def.value() + '</div>';
    }

    function showParamLabel(def) {
        updateParamLabel(def, null);
        paramLabel.classList.add("visible");
    }

    function hideParamLabel() {
        paramLabel.classList.remove("visible");
    }

    window.addEventListener("keydown", e => {
        // Rotate scale bar while dragging it
        if (scaleBarDragging && (keyIn(e.code, "rotateLeft") || keyIn(e.code, "rotateRight"))) {
            e.preventDefault();
            const step = Math.PI / 36; // 5 degrees
            scaleBarAngle += keyIn(e.code, "rotateRight") ? step : -step;
            return;
        }

        // Modifier key pressed — activate parameter mode
        const paramName = PARAM_KEY_MAP[e.code];
        if (paramName && activeParam !== paramName) {
            e.preventDefault();
            activeParam = paramName;
            activeParamKey = e.code;
            showParamLabel(PARAMS[paramName]);
            return;
        }

        // Arrow keys while a parameter modifier is held
        if (activeParam && PARAMS[activeParam]) {
            const def = PARAMS[activeParam];
            if (keyIn(e.code, "increase")) {
                e.preventDefault();
                def.increase();
                updateParamLabel(def, e.code);
                return;
            }
            if (keyIn(e.code, "decrease")) {
                e.preventDefault();
                def.decrease();
                updateParamLabel(def, e.code);
                return;
            }
        }

        // Standalone shortcuts (only when no modifier held)
        if (!activeParam) {
            if (keyIn(e.code, "launch"))     { e.preventDefault(); launch(); }
            if (keyIn(e.code, "resetAngle")) { e.preventDefault(); resetAngle(); }
            if (keyIn(e.code, "resetView"))  { e.preventDefault(); resetView(); }
        }
    });

    window.addEventListener("keyup", e => {
        if (e.code === activeParamKey) {
            activeParam = null;
            activeParamKey = null;
            hideParamLabel();
        }
        // Remove green highlight when arrow key is released
        if (activeParam && (keyIn(e.code, "increase") || keyIn(e.code, "decrease"))) {
            updateParamLabel(PARAMS[activeParam], null);
        }
    });

    // ── Physics step (Velocity-Verlet) ──
    function physicsStep(p, dt) {
        // acceleration at current position
        let r2 = p.x * p.x + p.y * p.y;
        let r  = Math.sqrt(r2);
        let ax = -GM * p.x / (r2 * r);
        let ay = -GM * p.y / (r2 * r);

        // half-step velocity
        let vxHalf = p.vx + ax * dt * 0.5;
        let vyHalf = p.vy + ay * dt * 0.5;

        // full-step position
        p.x += vxHalf * dt;
        p.y += vyHalf * dt;

        // acceleration at new position
        r2 = p.x * p.x + p.y * p.y;
        r  = Math.sqrt(r2);
        ax = -GM * p.x / (r2 * r);
        ay = -GM * p.y / (r2 * r);

        // full-step velocity
        p.vx = vxHalf + ax * dt * 0.5;
        p.vy = vyHalf + ay * dt * 0.5;

        // collision with planet
        if (r < R) {
            p.alive = false;
            // push to surface
            p.x *= R / r;
            p.y *= R / r;
        }

        p.age += dt;
    }

    // ── Starfield (cached) ──
    const stars = [];
    for (let i = 0; i < 400; i++) {
        stars.push({
            x: Math.random() * 4000 - 2000,
            y: Math.random() * 4000 - 2000,
            r: Math.random() * 1.2 + 0.3,
            a: Math.random() * 0.6 + 0.2,
        });
    }

    // ── Atmosphere glow layers ──
    function drawAtmosphere(scrX, scrY, scrR) {
        const layers = [
            { scale: 1.12, color: "rgba(100,180,255,0.06)" },
            { scale: 1.08, color: "rgba(100,180,255,0.08)" },
            { scale: 1.04, color: "rgba(100,180,255,0.1)" },
        ];
        for (const l of layers) {
            ctx.beginPath();
            ctx.arc(scrX, scrY, scrR * l.scale, 0, Math.PI * 2);
            ctx.fillStyle = l.color;
            ctx.fill();
        }
    }

    // ── Draw planet ──
    function drawPlanet() {
        const [sx, sy] = worldToScreen(0, 0);
        const sr = R * viewScale;

        // Atmosphere
        drawAtmosphere(sx, sy, sr);

        // Planet gradient
        const grad = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
        grad.addColorStop(0,   "#4ade80");
        grad.addColorStop(0.4, "#166534");
        grad.addColorStop(0.8, "#14532d");
        grad.addColorStop(1,   "#052e16");
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Surface line
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(74,222,128,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ── Draw cannon indicator ──
    function drawCannon() {
        const alt = parseFloat(altSlider.value) * 1000;
        const r = R + alt;
        const [cx, cy] = worldToScreen(0, r);

        // Cannon base
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.fill();

        // Direction arrow (scales with speed, rotated by launch angle)
        const speed_km = parseFloat(speedSlider.value);
        const maxSpeed = parseFloat(speedSlider.max);
        const angleDeg = parseFloat(dirSlider.value);
        const angleRad = angleDeg * Math.PI / 180;
        const len = 15 + 45 * (speed_km / maxSpeed);
        // screen coords: +x right, +y down; world angle: 0=right, positive=up
        const dx =  Math.cos(angleRad) * len;
        const dy = -Math.sin(angleRad) * len;
        const ex = cx + dx;
        const ey = cy + dy;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.stroke();

        // arrowhead
        const aLen = 8;
        const aHalf = 5;
        const ux = dx / len;
        const uy = dy / len;
        const px = -uy;
        const py =  ux;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - ux * aLen + px * aHalf, ey - uy * aLen + py * aHalf);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - ux * aLen - px * aHalf, ey - uy * aLen - py * aHalf);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = "#fbbf24";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(t("cannon"), cx, cy - 12);
    }

    // ── Cannon dragging ──
    let cannonDragging = false;

    function cannonHitTest(mx, my) {
        const alt = parseFloat(altSlider.value) * 1000;
        const r = R + alt;
        const [cx, cy] = worldToScreen(0, r);
        const dx = mx - cx;
        const dy = my - cy;
        return dx * dx + dy * dy <= 20 * 20;
    }

    function updateCannonFromMouse(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        const [wx, wy] = screenToWorld(mx, my);
        const dist = Math.sqrt(wx * wx + wy * wy);
        let alt_km = (dist - R) / 1000;
        alt_km = Math.max(parseFloat(altSlider.min), Math.min(parseFloat(altSlider.max), alt_km));
        const step = parseFloat(altSlider.step);
        alt_km = Math.round(alt_km / step) * step;
        altSlider.value = alt_km;
        updateSliderDisplays();
        updatePresets();
        unselectPresets();
    }

    // ── Arrow tip dragging (speed + direction) ──
    let arrowTipDragging = false;

    function getCannonScreenPos() {
        const alt = parseFloat(altSlider.value) * 1000;
        const r = R + alt;
        return worldToScreen(0, r);
    }

    function getArrowTipScreenPos() {
        const [cx, cy] = getCannonScreenPos();
        const speed_km = parseFloat(speedSlider.value);
        const maxSpeed = parseFloat(speedSlider.max);
        const angleDeg = parseFloat(dirSlider.value);
        const angleRad = angleDeg * Math.PI / 180;
        const len = 15 + 45 * (speed_km / maxSpeed);
        return [cx + Math.cos(angleRad) * len, cy - Math.sin(angleRad) * len];
    }

    function arrowTipHitTest(mx, my) {
        const [tx, ty] = getArrowTipScreenPos();
        const dx = mx - tx;
        const dy = my - ty;
        return dx * dx + dy * dy <= 14 * 14;
    }

    function snapToStep(value, cfg) {
        const clamped = Math.max(cfg.min, Math.min(cfg.max, value));
        return Math.round(clamped / cfg.step) * cfg.step;
    }

    function updateArrowFromMouse(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        const [cx, cy] = getCannonScreenPos();
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Angle: screen y is flipped, so negate dy
        let angleDeg = Math.atan2(-dy, dx) * 180 / Math.PI;
        angleDeg = snapToStep(angleDeg, SLIDER_CONFIG.direction);
        dirSlider.value = angleDeg;

        // Speed: reverse len = 15 + 45 * (speed_km / maxSpeed)
        const maxSpeed = parseFloat(speedSlider.max);
        let speed_km = Math.max(0, (dist - 15) / 45) * maxSpeed;
        speed_km = snapToStep(speed_km, SLIDER_CONFIG.speed);
        speedSlider.value = speed_km;

        updateSliderDisplays();
        unselectPresets();
    }

    // ── Draw trails & projectiles ──
    function drawProjectiles() {
        for (const p of projectiles) {
            // Trail
            if (p.trail.length > 1) {
                ctx.beginPath();
                const [sx0, sy0] = worldToScreen(p.trail[0].x, p.trail[0].y);
                ctx.moveTo(sx0, sy0);
                for (let i = 1; i < p.trail.length; i++) {
                    const [sx, sy] = worldToScreen(p.trail[i].x, p.trail[i].y);
                    ctx.lineTo(sx, sy);
                }
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.8;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Projectile dot
            if (p.alive) {
                const [sx, sy] = worldToScreen(p.x, p.y);
                ctx.beginPath();
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.fillStyle = "#fff";
                ctx.fill();

                // glow
                ctx.beginPath();
                ctx.arc(sx, sy, 8, 0, Math.PI * 2);
                const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 8);
                glow.addColorStop(0, p.color);
                glow.addColorStop(1, "transparent");
                ctx.fillStyle = glow;
                ctx.fill();

                // Name label
                ctx.fillStyle = p.color;
                ctx.font = "bold 11px system-ui";
                ctx.textAlign = "left";
                ctx.fillText(p.name, sx + 10, sy - 6);
            } else {
                // Impact / escape marker
                const last = p.trail[p.trail.length - 1];
                const [sx, sy] = worldToScreen(last.x, last.y);
                ctx.beginPath();
                ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.fill();

                // Name label (dimmed)
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.font = "bold 11px system-ui";
                ctx.textAlign = "left";
                ctx.fillText(p.name, sx + 8, sy - 4);
            }
        }
    }

    // ── Draw background stars ──
    function drawStars() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.fillStyle = "#fff";
        for (const s of stars) {
            const sx = ((s.x + viewCenterX * viewScale * 0.0001) % w + w) % w;
            const sy = ((s.y - viewCenterY * viewScale * 0.0001) % h + h) % h;
            ctx.globalAlpha = s.a;
            ctx.beginPath();
            ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ── Draw scale indicator (draggable) ──
    let scaleBarOffsetX = 0;
    let scaleBarOffsetY = 0;
    let scaleBarAngle = 0; // radians
    let scaleBarDragging = false;
    let scaleBarDragStartX = 0;
    let scaleBarDragStartY = 0;
    let scaleBarTween = null; // {startX, startY, startAngle, startTime, duration}

    function getScaleBarMetrics() {
        const targetLen = 120;
        const worldLen = targetLen / viewScale;
        const exponent = Math.floor(Math.log10(worldLen));
        const base = Math.pow(10, exponent);
        let niceLen;
        if (worldLen / base < 2) niceLen = base;
        else if (worldLen / base < 5) niceLen = 2 * base;
        else niceLen = 5 * base;
        const barPx = niceLen * viewScale;
        const defaultX = canvas.clientWidth - 20 - barPx;
        const defaultY = canvas.clientHeight - 30;
        return { niceLen, barPx, defaultX, defaultY };
    }

    function scaleBarHitTest(mx, my) {
        const { barPx, defaultX, defaultY } = getScaleBarMetrics();
        const cx = defaultX + scaleBarOffsetX + barPx / 2;
        const cy = defaultY + scaleBarOffsetY;
        // rotate mouse point into scale bar's local frame
        const cos = Math.cos(-scaleBarAngle);
        const sin = Math.sin(-scaleBarAngle);
        const dx = mx - cx;
        const dy = my - cy;
        const lx = dx * cos - dy * sin + barPx / 2;
        const ly = dx * sin + dy * cos;
        const pad = 12;
        return lx >= -pad && lx <= barPx + pad && ly >= -16 && ly <= pad;
    }

    function cannonIndicatorHitTest(mx, my) {
        if (!cannonIndicatorPos) return false;
        const dx = mx - cannonIndicatorPos.x;
        const dy = my - cannonIndicatorPos.y;
        return dx * dx + dy * dy <= 20 * 20;
    }

    canvas.addEventListener("mousedown", e => {
        if (arrowTipHitTest(e.offsetX, e.offsetY)) {
            arrowTipDragging = true;
            e.stopPropagation();
            return;
        }
        if (cannonHitTest(e.offsetX, e.offsetY)) {
            cannonDragging = true;
            e.stopPropagation();
            return;
        }
        if (cannonIndicatorHitTest(e.offsetX, e.offsetY)) {
            resetView();
            e.stopPropagation();
            return;
        }
        if (scaleBarHitTest(e.offsetX, e.offsetY)) {
            scaleBarDragging = true;
            scaleBarDragStartX = e.offsetX - scaleBarOffsetX;
            scaleBarDragStartY = e.offsetY - scaleBarOffsetY;
            scaleBarTween = null;
            e.stopPropagation();
            return;
        }
    }, true);

    window.addEventListener("mousemove", e => {
        if (arrowTipDragging) {
            updateArrowFromMouse(e.clientX, e.clientY);
            return;
        }
        if (cannonDragging) {
            updateCannonFromMouse(e.clientX, e.clientY);
            return;
        }
        if (!scaleBarDragging) return;
        const rect = canvas.getBoundingClientRect();
        scaleBarOffsetX = (e.clientX - rect.left) - scaleBarDragStartX;
        scaleBarOffsetY = (e.clientY - rect.top) - scaleBarDragStartY;
    });

    window.addEventListener("mouseup", () => {
        if (arrowTipDragging) {
            arrowTipDragging = false;
        }
        if (cannonDragging) {
            cannonDragging = false;
        }
        if (scaleBarDragging) {
            scaleBarDragging = false;
            if (scaleBarOffsetX !== 0 || scaleBarOffsetY !== 0 || scaleBarAngle !== 0) {
                scaleBarTween = {
                    startX: scaleBarOffsetX,
                    startY: scaleBarOffsetY,
                    startAngle: scaleBarAngle,
                    startTime: performance.now(),
                    duration: 300,
                };
            }
        }
    });

    function updateScaleBarTween() {
        if (!scaleBarTween) return;
        const elapsed = performance.now() - scaleBarTween.startTime;
        const t = Math.min(elapsed / scaleBarTween.duration, 1);
        // ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        scaleBarOffsetX = scaleBarTween.startX * (1 - ease);
        scaleBarOffsetY = scaleBarTween.startY * (1 - ease);
        scaleBarAngle   = scaleBarTween.startAngle * (1 - ease);
        if (t >= 1) {
            scaleBarOffsetX = 0;
            scaleBarOffsetY = 0;
            scaleBarAngle   = 0;
            scaleBarTween = null;
        }
    }

    function drawScaleBar() {
        updateScaleBarTween();

        const { niceLen, barPx, defaultX, defaultY } = getScaleBarMetrics();
        const x = defaultX + scaleBarOffsetX;
        const y = defaultY + scaleBarOffsetY;

        const alpha = scaleBarDragging ? 0.85 : 0.5;

        ctx.save();
        ctx.translate(x + barPx / 2, y);
        ctx.rotate(scaleBarAngle);
        ctx.translate(-barPx / 2, 0);

        ctx.strokeStyle = "rgba(255,255,255," + alpha + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(0, 4);
        ctx.moveTo(0, 0); ctx.lineTo(barPx, 0);
        ctx.moveTo(barPx, -4); ctx.lineTo(barPx, 4);
        ctx.stroke();

        let label;
        if (niceLen >= 1e3) label = (niceLen / 1e3).toLocaleString() + UNIT_ALTITUDE;
        else label = niceLen.toFixed(0) + " m";

        ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(label, barPx / 2, -8);

        ctx.restore();
    }

    // ── Off-screen indicator arrows ──
    // Returns the indicator screen position if drawn, or null if on-screen
    function drawOffscreenArrow(sx, sy, color) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const margin = 40;

        // Already on-screen — nothing to draw
        if (sx >= -10 && sx <= w + 10 && sy >= -10 && sy <= h + 10) return null;

        const centerX = w / 2;
        const centerY = h / 2;
        const dx = sx - centerX;
        const dy = sy - centerY;
        const angle = Math.atan2(dy, dx);

        // Find intersection with screen edge (inset by margin)
        const edgeW = w / 2 - margin;
        const edgeH = h / 2 - margin;
        const scale = Math.min(
            Math.abs(edgeW / (dx || 1e-9)),
            Math.abs(edgeH / (dy || 1e-9))
        );
        const ix = centerX + dx * scale;
        const iy = centerY + dy * scale;

        // Blinking alpha (soft sine pulse)
        const pulse = 0.45 + 0.35 * Math.sin(performance.now() / 400);

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.translate(ix, iy);
        ctx.rotate(angle);

        // Arrow triangle
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6, -7);
        ctx.lineTo(-6, 7);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.restore();
        return { x: ix, y: iy };
    }

    let cannonIndicatorPos = null; // last drawn indicator position

    function drawCannonIndicator() {
        const alt = parseFloat(altSlider.value) * 1000;
        const r = R + alt;
        const [cx, cy] = worldToScreen(0, r);
        cannonIndicatorPos = drawOffscreenArrow(cx, cy, "#fbbf24");
    }

    function drawProjectileIndicators() {
        for (const p of projectiles) {
            if (!p.alive) continue;
            const [sx, sy] = worldToScreen(p.x, p.y);
            drawOffscreenArrow(sx, sy, p.color);
        }
    }

    canvas.addEventListener("mousemove", e => {
        if (arrowTipDragging || cannonDragging || scaleBarDragging) {
            canvas.style.cursor = "grabbing";
        } else if (arrowTipHitTest(e.offsetX, e.offsetY)) {
            canvas.style.cursor = "crosshair";
        } else if (cannonHitTest(e.offsetX, e.offsetY)) {
            canvas.style.cursor = "ns-resize";
        } else if (cannonIndicatorHitTest(e.offsetX, e.offsetY)) {
            canvas.style.cursor = "pointer";
            canvas.title = t("tipIndicatorRecenter");
        } else if (scaleBarHitTest(e.offsetX, e.offsetY)) {
            canvas.style.cursor = "grab";
            canvas.title = "";
        } else {
            canvas.style.cursor = "";
            canvas.title = "";
        }
    });

    // ── Telemetry update ──
    function ensureTelemPanel(p) {
        let panel = document.getElementById("telem-" + p.id);
        if (panel) return panel;
        panel = document.createElement("div");
        panel.id = "telem-" + p.id;
        panel.className = "telem-panel";
        panel.style.borderLeftColor = p.color;
        panel.innerHTML =
            '<div class="telem-panel-header" style="color:' + p.color + '">' +
                '<span class="telem-name">' + p.name + '</span>' +
                '<button class="telem-close" title="' + t("telemRemove") + '">&times;</button>' +
            '</div>' +
            '<div class="telem-panel-row"><span class="telem-label">' + t("telemVelocity") + '</span><span class="telem-value" id="telemVel-' + p.id + '">—</span></div>' +
            '<div class="telem-panel-row"><span class="telem-label">' + t("telemAltitude") + '</span><span class="telem-value" id="telemAlt-' + p.id + '">—</span></div>';
        panel.querySelector(".telem-close").addEventListener("click", () => {
            const idx = projectiles.findIndex(proj => proj.id === p.id);
            if (idx !== -1) {
                usedNames.delete(p.name);
                projectiles.splice(idx, 1);
            }
            panel.remove();
            if (projectiles.length === 0) {
                telemetrySection.style.display = "none";
            }
        });
        telemetryContainer.appendChild(panel);
        return panel;
    }

    function updateTelemetry() {
        for (const p of projectiles) {
            ensureTelemPanel(p);
            const v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const r = Math.sqrt(p.x * p.x + p.y * p.y);
            const alt = r - R;

            const velEl = document.getElementById("telemVel-" + p.id);
            const altEl = document.getElementById("telemAlt-" + p.id);
            velEl.textContent = (v / 1000).toFixed(2) + UNIT_SPEED;
            altEl.textContent = (alt / 1000).toFixed(0) + UNIT_ALTITUDE;

            const panel = document.getElementById("telem-" + p.id);
            panel.style.opacity = p.alive ? "1" : "0.45";
        }

        // Sort telemetry panels: alive first, then by creation order (id)
        const sorted = [...projectiles].sort((a, b) => {
            if (a.alive !== b.alive) return a.alive ? -1 : 1;
            return a.id - b.id;
        });
        const children = telemetryContainer.children;
        for (let i = 0; i < sorted.length; i++) {
            const panel = document.getElementById("telem-" + sorted[i].id);
            if (panel && children[i] !== panel) {
                telemetryContainer.insertBefore(panel, children[i]);
            }
        }
    }

    // ── Main loop ──
    let lastTime = null;

    function frame(timestamp) {
        requestAnimationFrame(frame);

        const dt_real = lastTime ? Math.min((timestamp - lastTime) / 1000, 1 / 30) : 0;
        lastTime = timestamp;

        const timeScale = getTimeScale();
        const dt_sim = dt_real * timeScale;

        // Physics substeps for stability
        const substeps = Math.max(1, Math.ceil(dt_sim / 5));
        const subDt = dt_sim / substeps;

        for (const p of projectiles) {
            if (!p.alive) continue;
            for (let i = 0; i < substeps; i++) {
                physicsStep(p, subDt);
                if (!p.alive) break;
            }
            // Record trail
            const last = p.trail[p.trail.length - 1];
            const dx = p.x - last.x;
            const dy = p.y - last.y;
            const dist2 = dx * dx + dy * dy;
            // Adaptive trail resolution based on zoom
            const minDist = Math.max(R * 0.005, 2 / viewScale);
            if (dist2 > minDist * minDist) {
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > p.maxTrail) {
                    p.trail.shift();
                }
            }
        }

        // ── Render ──
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = var_bg;
        ctx.fillRect(0, 0, w, h);

        drawStars();
        drawPlanet();
        drawCannon();
        drawCannonIndicator();
        drawProjectiles();
        drawProjectileIndicators();
        drawScaleBar();
        updateTelemetry();
    }

    const var_bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();

    requestAnimationFrame(frame);
})();

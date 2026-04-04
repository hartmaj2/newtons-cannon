(() => {
    "use strict";

    // ── Constants (SI units) ──
    const G  = 6.674e-11;          // gravitational constant
    const M  = 5.972e24;           // Earth mass (kg)
    const GM = G * M;              // standard gravitational parameter
    const R  = 6.371e6;            // Earth radius (m)

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

    function resetView() {
        viewCenterX = 0;
        viewCenterY = 0;
        const minDim = Math.min(canvas.clientWidth, canvas.clientHeight);
        viewScale = minDim / (3.5 * R);   // planet takes ~57% of smallest dim
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

    // ── UI elements ──
    const speedSlider     = document.getElementById("speed");
    const altSlider       = document.getElementById("altitude");
    const timeScaleSlider = document.getElementById("timeScale");

    const speedVal     = document.getElementById("speedValue");
    const altVal       = document.getElementById("altitudeValue");
    const timeScaleVal = document.getElementById("timeScaleValue");

    const launchBtn = document.getElementById("launchBtn");
    const clearBtn  = document.getElementById("clearBtn");
    const resetBtn  = document.getElementById("resetBtn");

    const telemetryContainer = document.getElementById("telemetryContainer");
    const telemetrySection   = document.getElementById("telemetrySection");
    const orbitLabel  = document.getElementById("orbit-label");

    function updateSliderDisplays() {
        speedVal.textContent     = parseFloat(speedSlider.value).toFixed(1) + " km/s";
        altVal.textContent       = parseInt(altSlider.value).toLocaleString() + " km";
        timeScaleVal.textContent = timeScaleSlider.value + "×";
    }

    [speedSlider, altSlider, timeScaleSlider].forEach(s =>
        s.addEventListener("input", updateSliderDisplays)
    );
    updateSliderDisplays();

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
        launch: "🚀",
        clear:  "🧹",
        reset:  "🎯",
    };

    const PRESET_ICONS = {
        "suborbital":      "🏔️",
        "v1":              "🛰️",
        "v2":              "☄️",
        "elliptical-low":  "📉",
        "elliptical-high": "📈",
    };

    const PRESET_LABELS = {
        "suborbital":      "Suborbital",
        "v1":              "Circular",
        "v2":              "Parabolic",
        "elliptical-low":  "Elliptical (low)",
        "elliptical-high": "Elliptical (high)",
    };

    const presetDescriptions = {
        "suborbital":     "Half of orbital velocity",
        "v1":             "Circular orbit at this altitude",
        "v2":             "Escape velocity at this altitude",
        "elliptical-low": "Periapsis at planet surface",
        "elliptical-high":"Apoapsis at 2× launch radius",
    };

    // Apply icons to buttons
    launchBtn.textContent = BUTTON_ICONS.launch + " Launch";
    clearBtn.textContent  = BUTTON_ICONS.clear  + " Clear Traces";
    resetBtn.textContent  = BUTTON_ICONS.reset  + " Reset View";

    function updatePresets() {
        const alt_km = parseFloat(altSlider.value);
        const r = R + alt_km * 1000;
        document.querySelectorAll(".preset").forEach(btn => {
            const type = btn.dataset.type;
            const speed_ms = computePresetSpeed(type, r);
            const speed_km = speed_ms / 1000;
            btn.dataset.speed = speed_km.toFixed(2);
            btn.querySelector("strong").textContent =
                PRESET_ICONS[type] + " " + PRESET_LABELS[type];
            btn.querySelector("span").textContent =
                speed_km.toFixed(1) + " km/s — " + presetDescriptions[type];
        });
    }

    altSlider.addEventListener("input", updatePresets);
    updatePresets();

    // Presets
    document.querySelectorAll(".preset").forEach(btn => {
        btn.addEventListener("click", () => {
            speedSlider.value = btn.dataset.speed;
            updateSliderDisplays();
            document.querySelectorAll(".preset").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });

    // ── Projectile simulation ──
    const projectiles = [];   // each: { id, trail, x, y, vx, vy, alive, color, label }
    let nextProjectileId = 1;

    const trailColors = [
        "#3b82f6", "#22c55e", "#eab308", "#ef4444",
        "#a855f7", "#ec4899", "#06b6d4", "#f97316",
    ];
    let colorIdx = 0;

    function classifyOrbit(speed_km, alt_km) {
        const r = R + alt_km * 1000;
        const v1 = Math.sqrt(GM / r) / 1000;
        const v2 = Math.sqrt(2 * GM / r) / 1000;
        if (speed_km < v1 * 0.65) return { label: "Suborbital", color: "#ef4444" };
        if (speed_km < v1 * 0.95) return { label: "Low elliptical orbit", color: "#f97316" };
        if (speed_km < v1 * 1.05) return { label: "Near-circular orbit", color: "#22c55e" };
        if (speed_km < v2 * 0.95) return { label: "Elliptical orbit", color: "#eab308" };
        if (speed_km < v2 * 1.01) return { label: "Near-escape trajectory", color: "#a855f7" };
        if (speed_km < v2 * 1.05) return { label: "Escape — parabolic", color: "#3b82f6" };
        return { label: "Hyperbolic escape", color: "#ec4899" };
    }

    function launch() {
        const speed_km = parseFloat(speedSlider.value);         // km/s
        const alt_km   = parseFloat(altSlider.value);           // km

        const speed = speed_km * 1000;                          // m/s
        const alt   = alt_km * 1000;                            // m
        const r     = R + alt;

        // Position: top of planet (y-axis up)
        const x = 0;
        const y = r;

        // Velocity: always horizontal (tangent at top)
        const vx = speed;
        const vy = 0;

        const cls = classifyOrbit(speed_km, alt_km);
        const color = trailColors[colorIdx % trailColors.length];
        colorIdx++;

        const id = nextProjectileId++;
        projectiles.push({
            id, x, y, vx, vy,
            trail: [{ x, y }],
            alive: true,
            color,
            label: cls.label,
            labelColor: cls.color,
            age: 0,
            maxTrail: 80000,
        });

        // Show orbit label
        orbitLabel.textContent = cls.label + "  (" + speed_km.toFixed(1) + " km/s)";
        orbitLabel.style.color = cls.color;
        orbitLabel.classList.add("visible");
        clearTimeout(orbitLabel._timer);
        orbitLabel._timer = setTimeout(() => orbitLabel.classList.remove("visible"), 3000);

        telemetrySection.style.display = "";
    }

    function clearTraces()
    {
        projectiles.length = 0;
        nextProjectileId = 1;
        telemetryContainer.innerHTML = "";
        telemetrySection.style.display = "none";
    }

    launchBtn.addEventListener("click", launch);
    clearBtn.addEventListener("click", clearTraces);
    resetBtn.addEventListener("click", resetView);

    // Keyboard shortcuts
    const KEY_STEP_MULTIPLIER = 5;

    const keyActions = {
        speedUp()   { speedSlider.value = Math.min(parseFloat(speedSlider.max), parseFloat(speedSlider.value) + parseFloat(speedSlider.step || 0.1) * KEY_STEP_MULTIPLIER).toFixed(1); updateSliderDisplays(); },
        speedDown() { speedSlider.value = Math.max(parseFloat(speedSlider.min), parseFloat(speedSlider.value) - parseFloat(speedSlider.step || 0.1) * KEY_STEP_MULTIPLIER).toFixed(1); updateSliderDisplays(); },
        altUp()     { altSlider.value = Math.min(parseFloat(altSlider.max), parseFloat(altSlider.value) + parseFloat(altSlider.step || 10) * KEY_STEP_MULTIPLIER); updateSliderDisplays(); updatePresets(); },
        altDown()   { altSlider.value = Math.max(parseFloat(altSlider.min), parseFloat(altSlider.value) - parseFloat(altSlider.step || 10) * KEY_STEP_MULTIPLIER); updateSliderDisplays(); updatePresets(); },
    };

    const keyMap = {
        KeyR : resetView,
        KeyC : clearTraces,
        Space:      launch,
        ArrowRight: keyActions.speedUp,
        ArrowLeft:  keyActions.speedDown,
        ArrowUp:    keyActions.altUp,
        ArrowDown:  keyActions.altDown,
        KeyD:       keyActions.speedUp,
        KeyA:       keyActions.speedDown,
        KeyW:       keyActions.altUp,
        KeyS:       keyActions.altDown,
    };

    window.addEventListener("keydown", e => {
        const action = keyMap[e.code];
        if (action) { e.preventDefault(); action(); }
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

        // escape detection (very far away)
        if (r > R * 50) {
            p.alive = false;
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

        // Direction arrow (scales with speed)
        const speed_km = parseFloat(speedSlider.value);
        const maxSpeed = parseFloat(speedSlider.max);
        const len = 15 + 45 * (speed_km / maxSpeed);
        const ex = cx + len;
        const ey = cy;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.stroke();

        // arrowhead
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 8, ey - 5);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 8, ey + 5);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = "#fbbf24";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Cannon", cx, cy - 12);
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

                // ID label
                ctx.fillStyle = p.color;
                ctx.font = "bold 11px system-ui";
                ctx.textAlign = "left";
                ctx.fillText("#" + p.id, sx + 10, sy - 6);
            } else {
                // Impact / escape marker
                const last = p.trail[p.trail.length - 1];
                const [sx, sy] = worldToScreen(last.x, last.y);
                ctx.beginPath();
                ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.fill();

                // ID label (dimmed)
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.font = "bold 11px system-ui";
                ctx.textAlign = "left";
                ctx.fillText("#" + p.id, sx + 8, sy - 4);
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

    // ── Draw scale indicator ──
    function drawScaleBar() {
        const targetLen = 120; // target bar length in pixels
        const worldLen = targetLen / viewScale; // corresponding world length

        // find a nice round number
        const exponent = Math.floor(Math.log10(worldLen));
        const base = Math.pow(10, exponent);
        let niceLen;
        if (worldLen / base < 2) niceLen = base;
        else if (worldLen / base < 5) niceLen = 2 * base;
        else niceLen = 5 * base;

        const barPx = niceLen * viewScale;
        const x = canvas.clientWidth - 20 - barPx;
        const y = canvas.clientHeight - 30;

        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
        ctx.moveTo(x, y); ctx.lineTo(x + barPx, y);
        ctx.moveTo(x + barPx, y - 4); ctx.lineTo(x + barPx, y + 4);
        ctx.stroke();

        let label;
        if (niceLen >= 1e6) label = (niceLen / 1e6).toFixed(0) + " Mm";
        else if (niceLen >= 1e3) label = (niceLen / 1e3).toFixed(0) + " km";
        else label = niceLen.toFixed(0) + " m";

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(label, x + barPx / 2, y - 8);
    }

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
                '#' + p.id +
                '<button class="telem-close" title="Remove">&times;</button>' +
            '</div>' +
            '<div class="telem-panel-row"><span class="telem-label">Velocity</span><span class="telem-value" id="telemVel-' + p.id + '">—</span></div>' +
            '<div class="telem-panel-row"><span class="telem-label">Altitude</span><span class="telem-value" id="telemAlt-' + p.id + '">—</span></div>';
        panel.querySelector(".telem-close").addEventListener("click", () => {
            const idx = projectiles.findIndex(proj => proj.id === p.id);
            if (idx !== -1) projectiles.splice(idx, 1);
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
            velEl.textContent = (v / 1000).toFixed(2) + " km/s";
            altEl.textContent = (alt / 1000).toFixed(0) + " km";

            const panel = document.getElementById("telem-" + p.id);
            panel.style.opacity = p.alive ? "1" : "0.45";
        }
    }

    // ── Main loop ──
    let lastTime = null;

    function frame(timestamp) {
        requestAnimationFrame(frame);

        const dt_real = lastTime ? Math.min((timestamp - lastTime) / 1000, 1 / 30) : 0;
        lastTime = timestamp;

        const timeScale = parseInt(timeScaleSlider.value);
        const dt_sim = dt_real * timeScale * 100;      // speed up for visibility

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
        drawProjectiles();
        drawScaleBar();
        updateTelemetry();
    }

    const var_bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();

    requestAnimationFrame(frame);
})();

(() => {
  const NS = "mx-foundry-bridge";
  let lastControl = null;

  const log = (...a) => console.log(`[${NS}]`, ...a);
  const warn = (...a) => console.warn(`[${NS}]`, ...a);

  const CYCLE_INCLUDE = {
    "tokens": { names: ["select", "target", "ruler"], labels: ["Select Tokens", "Select Targets", "Measure Distance"] },
    "templates": { names: ["select", "circle", "cone", "rect", "ray", "rectangle"], labels: ["Select", "Circle Template", "Cone Template", "Rectangle Template", "Ray Template"] },
    "tiles": { names: ["select", "tile"], labels: ["Select Tiles", "Place Tile"] },
    "drawings": { names: ["select", "rect", "ellipse", "polygon", "freehand", "text"], labels: ["Select Drawings", "Draw Rectangle", "Draw Ellipse", "Draw Polygon", "Draw Freehand", "Draw Text"] },
    "walls": { names: ["select", "wall", "terrain", "invisible", "ethereal", "door", "secret", "window"], labels: ["Rectangular Select Walls", "Basic Walls", "Terrain Walls", "Invisible Walls", "Ethereal Walls", "Draw Doors", "Secret Doors", "Window Walls"] },
    "lighting": { names: ["light", "select"], labels: ["Draw Light Source", "Select"] },
    "sounds": { names: ["select", "sound"], labels: ["Select", "Draw Ambient Sound"] },
    "regions": { names: ["select", "rect", "ellipse", "polygon"], labels: ["Select Regions", "Draw Rectangle", "Draw Ellipse", "Draw Polygon"] },
    "notes": { names: ["select", "note"], labels: ["Select Notes", "Create Map Note"] }
  };

  const mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", (ev) => { mouse.x = ev.clientX; mouse.y = ev.clientY; }, { passive: true });

  let popupEl = null;
  let styleInjected = false;

  // state
  let popupVisible = false;
  let popupKey = "";
  let collapseTimer = null;
  let hideTimer = null;

  // Timing constants (must match CSS for accurate scheduling)
  const TRANSFORM_MS = 620;          // transform duration
  const STAGGER_FAN_MS = 34;         // per-tile fan delay
  const STAGGER_COLLAPSE_MS = 26;    // per-tile collapse delay (reverse)
  const HIDE_BUFFER_MS = 40;         // small buffer for render/timers

  function activeControlName() { return ui?.controls?.control?.name ?? null; }
  function activeToolName() { return ui?.controls?.tool?.name ?? null; }

  function toArray(maybe) {
    if (!maybe) return [];
    if (Array.isArray(maybe)) return maybe;
    if (typeof maybe.values === "function") { try { return Array.from(maybe.values()); } catch (_) {} }
    if (Array.isArray(maybe.contents)) return maybe.contents;
    if (typeof maybe === "object") return Object.values(maybe);
    return [];
  }

  function getAllControlDefs() { return toArray(ui?.controls?.controls ?? ui?.controls?._controls); }

  function getControlDefByName(name) {
    if (!name) return null;
    const active = ui?.controls?.control;
    if (active?.name === name) return active;
    return getAllControlDefs().find(c => c?.name === name) ?? null;
  }

  function controlIconClass(controlName) {
    const ctrl = getControlDefByName(controlName);
    const icon = ctrl?.icon;
    if (typeof icon === "string" && icon.trim().length) return icon.trim();
    const iconClass = ctrl?.iconClass;
    if (typeof iconClass === "string" && iconClass.trim().length) return iconClass.trim();
    return "fa-solid fa-layer-group";
  }

  function toolLabel(tool) {
    const title = tool?.title;
    if (!title) return tool?.name ?? "";
    try {
      const localized = game?.i18n?.localize ? game.i18n.localize(title) : title;
      return localized || title || (tool?.name ?? "");
    } catch (_) { return title || (tool?.name ?? ""); }
  }

  function toolIconClass(tool) {
    const icon = tool?.icon;
    if (typeof icon === "string" && icon.trim().length) return icon.trim();
    const iconClass = tool?.iconClass;
    if (typeof iconClass === "string" && iconClass.trim().length) return iconClass.trim();
    return "fa-solid fa-circle";
  }

  function normalize(s) { return (s ?? "").toString().trim().toLowerCase(); }

  function isIncluded(controlName, tool) {
    const cfg = CYCLE_INCLUDE[controlName];
    if (!cfg) return true;
    const n = normalize(tool?.name);
    const label = normalize(toolLabel(tool));
    const names = (cfg.names ?? []).map(normalize);
    const labels = (cfg.labels ?? []).map(normalize);
    return (n && names.includes(n)) || (label && labels.includes(label));
  }

  function cycleTools(controlName) {
    const ctrl = getControlDefByName(controlName);
    const toolsArr = toArray(ctrl?.tools);
    const base = toolsArr.filter(t => t?.name && t?.visible !== false && t?.disabled !== true && t?.toggle !== true);
    return base.filter(t => isIncluded(controlName, t));
  }

  async function activate(control, tool) {
    if (!ui?.controls?.activate) return false;
    try { await ui.controls.activate({ control, tool }); return true; }
    catch (e) { warn("activate failed", { control, tool, e }); return false; }
  }

  function injectStylesOnce() {
    if (styleInjected) return;
    styleInjected = true;

    const style = document.createElement("style");
    style.id = "mxfb-style";
    style.textContent = `
      /* Transparent wrapper: icons only */
      #mxfb-cycle-popup {
        position: fixed;
        transform: translate(-50%, -100%);
        padding: 0;
        background: transparent;
        border-radius: 0;
        box-shadow: none;
        pointer-events: none;
        z-index: 100000;
        display: none;
      }

      #mxfb-cycle-popup .mxfb-track {
        position: relative;
        height: 34px;
      }

      #mxfb-cycle-popup .mxfb-chip {
        position: absolute;
        top: 0;
        left: 0;
        width: 34px;
        height: 34px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;

        background: rgba(20, 20, 20, 0.22);
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 10px 18px rgba(0,0,0,0.28);
        backdrop-filter: blur(2px);

        opacity: 0;
        transform: translateX(0px) translateY(18px) scale(0.45);
        will-change: transform, opacity;
      }
      #mxfb-cycle-popup .mxfb-chip i {
        font-size: 16px;
        opacity: 0.96;
        text-shadow: 0 1px 8px rgba(0,0,0,0.55);
      }

      /* Floaty/elastic feel: same speed both directions */
      #mxfb-cycle-popup.mxfb-animate .mxfb-chip {
        transition:
          transform 620ms cubic-bezier(.18, 1.35, .26, 1),
          opacity 620ms ease;
      }

      /* Staggered delays for fan-out */
      #mxfb-cycle-popup.mxfb-animate.mxfb-expanded .mxfb-chip {
        transition-delay: calc(var(--mxfb-i, 0) * 34ms);
      }

      /* Reverse stagger for collapse (right-to-left) */
      #mxfb-cycle-popup.mxfb-animate.mxfb-collapsing .mxfb-chip {
        transition-delay: calc((var(--mxfb-count, 1) - var(--mxfb-i, 0) - 1) * 26ms);
      }

      /* Expanded slots */
      #mxfb-cycle-popup.mxfb-expanded .mxfb-chip {
        opacity: 1;
        transform: translateX(var(--mxfb-x, 0px)) translateY(0px) scale(1);
      }

      /* Collapsing back under cursor */
      #mxfb-cycle-popup.mxfb-collapsing .mxfb-chip {
        opacity: 0;
        transform: translateX(0px) translateY(18px) scale(0.45);
      }

      /* Active tool: bigger + lifted ~1/3 height */
      #mxfb-cycle-popup .mxfb-chip.mxfb-active {
        border: 2px solid var(--color-border-highlight, var(--color-border-highlight-alt, #ff6400));
        background: rgba(28, 28, 28, 0.28);
        box-shadow: 0 14px 26px rgba(0,0,0,0.42);
        opacity: 1;
      }
      #mxfb-cycle-popup.mxfb-expanded .mxfb-chip.mxfb-active {
        transform: translateX(var(--mxfb-x, 0px)) translateY(-12px) scale(1.50);
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePopup() {
    if (popupEl) return popupEl;
    injectStylesOnce();
    popupEl = document.createElement("div");
    popupEl.id = "mxfb-cycle-popup";
    document.body.appendChild(popupEl);
    return popupEl;
  }

  function clearTimers() {
    if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  function hidePopupImmediate() {
    clearTimers();
    popupVisible = false;
    popupKey = "";
    if (popupEl) {
      popupEl.classList.remove("mxfb-expanded", "mxfb-collapsing");
      popupEl.style.display = "none";
      popupEl.replaceChildren();
    }
  }

  function collapseTotalMs(chipCount) {
    // worst-case: last chip delay + transform duration
    const count = Math.max(1, Number(chipCount) || 1);
    return TRANSFORM_MS + (count - 1) * STAGGER_COLLAPSE_MS;
  }

  function startCollapseTimedToEndAt(delayMs, chipCount) {
    clearTimers();
    const totalMs = Math.max(200, Number(delayMs ?? 900));
    const collapseMs = collapseTotalMs(chipCount);

    // Start the collapse early enough that it FINISHES at totalMs.
    const startAt = Math.max(0, totalMs - collapseMs);

    collapseTimer = setTimeout(() => {
      if (!popupEl) return;
      popupEl.classList.remove("mxfb-expanded");
      popupEl.classList.add("mxfb-collapsing");
    }, startAt);

    // Hide right after the popup delay time elapses, with a tiny buffer so the last frame renders.
    hideTimer = setTimeout(() => hidePopupImmediate(), totalMs + HIDE_BUFFER_MS);
  }

  function buildPopup(controlName, tools, activeIdx, showLayerIcon) {
    const el = ensurePopup();
    const animate = !!game.settings.get(NS, "animatePopup");
    el.classList.toggle("mxfb-animate", animate);

    // anchor above current cursor and keep it there while cycling
    el.style.left = `${mouse.x}px`;
    el.style.top = `${mouse.y - 14}px`;
    el.style.display = "block";
    popupVisible = true;

    const chips = [];
    if (showLayerIcon) chips.push({ title: controlName, icon: controlIconClass(controlName) });
    tools.forEach(t => chips.push({ title: toolLabel(t) || t.name, icon: toolIconClass(t) }));

    el.style.setProperty("--mxfb-count", String(chips.length));

    const track = document.createElement("div");
    track.className = "mxfb-track";
    const gap = 6;
    const w = chips.length ? (chips.length * 34 + (chips.length - 1) * gap) : 34;
    track.style.width = `${w}px`;

    chips.forEach((c, i) => {
      const chip = document.createElement("div");
      chip.className = "mxfb-chip";
      chip.title = c.title;
      chip.style.setProperty("--mxfb-i", String(i));
      chip.style.setProperty("--mxfb-x", `${i * (34 + gap)}px`);

      const icon = document.createElement("i");
      icon.className = c.icon;
      chip.appendChild(icon);

      track.appendChild(chip);
    });

    el.replaceChildren(track);

    // start collapsed
    el.classList.remove("mxfb-expanded", "mxfb-collapsing");
    updatePopupHighlight(activeIdx, showLayerIcon);

    // fan-out next frame (floaty)
    if (animate) requestAnimationFrame(() => el.classList.add("mxfb-expanded"));
    else el.classList.add("mxfb-expanded");

    return chips.length;
  }

  function updatePopupHighlight(activeToolIdx, showLayerIcon) {
    if (!popupEl) return;
    const track = popupEl.querySelector(".mxfb-track");
    if (!track) return;

    const offset = showLayerIcon ? 1 : 0;
    const activeChipIdx = activeToolIdx + offset;

    const chips = track.querySelectorAll(".mxfb-chip");
    chips.forEach((c, idx) => c.classList.toggle("mxfb-active", idx === activeChipIdx));
  }

  function showOrUpdateCyclePopup(controlName, tools, activeIdx) {
    if (!game.settings.get(NS, "showPopup")) return;

    const showLayer = !!game.settings.get(NS, "showLayerIcon");
    const ms = Number(game.settings.get(NS, "popupMs") ?? 900);
    const key = `${controlName}|${tools.length}|${showLayer}`;

    let chipCount = 0;
    if (!popupVisible || popupKey !== key || !popupEl) {
      popupKey = key;
      chipCount = buildPopup(controlName, tools, activeIdx, showLayer);
    } else {
      updatePopupHighlight(activeIdx, showLayer);
      chipCount = Number(popupEl.style.getPropertyValue("--mxfb-count") || 0) || (tools.length + (showLayer ? 1 : 0));
      // If user cycles again during collapse window, re-expand and cancel collapse timing.
      popupEl.classList.remove("mxfb-collapsing");
      popupEl.classList.add("mxfb-expanded");
    }

    startCollapseTimedToEndAt(ms, chipCount);
  }

  async function resetToolIfEnabled(controlName) {
    if (!game.settings.get(NS, "resetOnChange")) return;
    const tools = cycleTools(controlName);
    if (!tools.length) return;
    const first = tools[0].name;
    if (activeToolName() === first) return;
    await activate(controlName, first);
  }

  async function activateLayer(controlName) {
    const tools = cycleTools(controlName);
    if (!tools.length) return;
    await activate(controlName, tools[0].name);
  }

  async function cycleTool(delta) {
    if (!game.settings.get(NS, "cycleEnabled")) return;
    const controlName = activeControlName();
    if (!controlName) return;

    const tools = cycleTools(controlName);
    if (!tools.length) return;

    const current = activeToolName();
    let idx = tools.findIndex(t => t.name === current);
    if (idx < 0) idx = 0;

    let next = (idx + delta) % tools.length;
    if (next < 0) next = tools.length - 1;

    showOrUpdateCyclePopup(controlName, tools, next);
    await activate(controlName, tools[next].name);
  }

  function regKeybinding(id, nameKey, defaultKey, handler) {
    game.keybindings.register(NS, id, {
      name: nameKey,
      hint: "MXFB.Hint",
      editable: [{ key: defaultKey, modifiers: ["Control", "Alt"] }],
      precedence: 1000,
      onDown: () => {
        try {
          const p = handler();
          if (p?.catch) p.catch(e => warn("handler failed", id, e));
        } catch (e) { warn("handler threw", id, e); }
        return true;
      }
    });
  }

  Hooks.once("init", () => {
    game.settings.register(NS, "cycleEnabled", { name: "MXFB.SettingCycle", hint: "MXFB.SettingCycleHint", scope: "world", config: true, type: Boolean, default: true });
    game.settings.register(NS, "resetOnChange", { name: "MXFB.SettingReset", hint: "MXFB.SettingResetHint", scope: "world", config: true, type: Boolean, default: true });
    game.settings.register(NS, "showPopup", { name: "MXFB.SettingPopup", hint: "MXFB.SettingPopupHint", scope: "world", config: true, type: Boolean, default: true });
    game.settings.register(NS, "popupMs", { name: "MXFB.SettingPopupMs", hint: "MXFB.SettingPopupMsHint", scope: "world", config: true, type: Number, default: 900, range: { min: 200, max: 3000, step: 100 } });
    game.settings.register(NS, "showLayerIcon", { name: "MXFB.SettingPopupLayerIcon", hint: "MXFB.SettingPopupLayerIconHint", scope: "world", config: true, type: Boolean, default: false });
    game.settings.register(NS, "animatePopup", { name: "MXFB.SettingPopupAnimate", hint: "MXFB.SettingPopupAnimateHint", scope: "world", config: true, type: Boolean, default: true });

    regKeybinding("layerTokens", "MXFB.LayerTokens", "KeyT", () => activateLayer("tokens"));
    regKeybinding("layerTemplates", "MXFB.LayerTemplates", "KeyM", () => activateLayer("templates"));
    regKeybinding("layerTiles", "MXFB.LayerTiles", "KeyI", () => activateLayer("tiles"));
    regKeybinding("layerDrawings", "MXFB.LayerDrawings", "KeyD", () => activateLayer("drawings"));
    regKeybinding("layerWalls", "MXFB.LayerWalls", "KeyW", () => activateLayer("walls"));
    regKeybinding("layerLighting", "MXFB.LayerLighting", "KeyL", () => activateLayer("lighting"));
    regKeybinding("layerSounds", "MXFB.LayerSounds", "KeyS", () => activateLayer("sounds"));
    regKeybinding("layerRegions", "MXFB.LayerRegions", "KeyG", () => activateLayer("regions"));
    regKeybinding("layerNotes", "MXFB.LayerNotes", "KeyN", () => activateLayer("notes"));

    regKeybinding("cycleNext", "MXFB.CycleNext", "BracketRight", () => cycleTool(+1));
    regKeybinding("cyclePrev", "MXFB.CyclePrev", "BracketLeft",  () => cycleTool(-1));

    log("init: module loaded; version 1.0.5");
  });

  Hooks.on("renderSceneControls", async () => {
    const control = activeControlName();
    if (!control) return;
    if (control === lastControl) return;
    lastControl = control;
    hidePopupImmediate();
    await resetToolIfEnabled(control);
  });

  Hooks.once("ready", () => log("ready"));
})();

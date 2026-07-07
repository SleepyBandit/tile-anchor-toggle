const MODULE_ID = "tile-anchor-toggle";

const ANCHORS = {
  TOP_LEFT: {x: 0, y: 0, key: "topLeft"},
  CENTER: {x: 0.5, y: 0.5, key: "center"}
};

Hooks.once("init", () => {
  console.info(`${MODULE_ID} | Initializing Tile Anchor Toggle`);
});

Hooks.on("renderTileHUD", (app, element) => {
  if ( !game.user?.isGM ) return;

  const tile = app.object;
  if ( !tile?.document || tile.document.documentName !== "Tile" ) return;

  const root = normalizeElement(element) ?? app.element;
  if ( !root ) return;
  if ( root.querySelector?.(".tat-anchor-toggle") ) return;

  const targetColumn = root.querySelector?.(".col.left") ?? root.querySelector?.(".col.middle") ?? root.querySelector?.(".col.right") ?? root;
  const button = createAnchorButton(tile);
  button.addEventListener("click", event => onToggleAnchor(event, tile, app));
  targetColumn.appendChild(button);
});

function normalizeElement(element) {
  if ( element instanceof HTMLElement ) return element;
  if ( element?.[0] instanceof HTMLElement ) return element[0];
  if ( element?.element instanceof HTMLElement ) return element.element;
  return null;
}

function createAnchorButton(tile) {
  const current = getAnchorMode(tile.document);
  const next = current === ANCHORS.TOP_LEFT.key ? ANCHORS.CENTER : ANCHORS.TOP_LEFT;
  const currentLabel = game.i18n.localize(`TILEANCHORTOGGLE.Anchor.${current}`);
  const nextLabel = game.i18n.localize(`TILEANCHORTOGGLE.Anchor.${next.key}`);

  const button = document.createElement("button");
  button.type = "button";
  button.className = `control-icon tat-anchor-toggle tat-anchor-toggle--${current}`;
  button.dataset.tooltip = "";
  button.setAttribute("aria-label", game.i18n.format("TILEANCHORTOGGLE.HUD.ToggleLabel", {current: currentLabel, next: nextLabel}));
  button.setAttribute("data-tooltip-text", game.i18n.format("TILEANCHORTOGGLE.HUD.ToggleTooltip", {current: currentLabel, next: nextLabel}));

  const icon = document.createElement("i");
  icon.className = current === ANCHORS.TOP_LEFT.key
    ? "fa-solid fa-arrow-up-left"
    : "fa-solid fa-crosshairs";
  icon.setAttribute("inert", "");
  button.appendChild(icon);

  return button;
}

async function onToggleAnchor(event, tile, app) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const document = tile?.document;
  if ( !document ) return;
  if ( document.locked ) {
    ui.notifications?.warn(game.i18n.localize("TILEANCHORTOGGLE.Warn.Locked"));
    return;
  }

  const current = getAnchorMode(document);
  const next = current === ANCHORS.TOP_LEFT.key ? ANCHORS.CENTER : ANCHORS.TOP_LEFT;
  const update = buildAnchorUpdate(document, next.x, next.y);

  try {
    await document.update(update);
    ui.notifications?.info(game.i18n.format("TILEANCHORTOGGLE.Info.Updated", {
      anchor: game.i18n.localize(`TILEANCHORTOGGLE.Anchor.${next.key}`)
    }));
    app?.render?.({force: true});
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to update tile anchor`, err);
    ui.notifications?.error(game.i18n.localize("TILEANCHORTOGGLE.Error.UpdateFailed"));
  }
}

function getAnchorMode(document) {
  const ax = Number(document.texture?.anchorX ?? 0.5);
  const ay = Number(document.texture?.anchorY ?? 0.5);
  if ( nearlyEqual(ax, 0) && nearlyEqual(ay, 0) ) return ANCHORS.TOP_LEFT.key;
  if ( nearlyEqual(ax, 0.5) && nearlyEqual(ay, 0.5) ) return ANCHORS.CENTER.key;
  return "custom";
}

function buildAnchorUpdate(document, newAnchorX, newAnchorY) {
  const oldAnchorX = Number(document.texture?.anchorX ?? 0.5);
  const oldAnchorY = Number(document.texture?.anchorY ?? 0.5);
  const width = Number(document.width ?? 0);
  const height = Number(document.height ?? 0);
  const rotation = Number(document.rotation ?? 0);
  const radians = Math.toRadians ? Math.toRadians(rotation) : (rotation * Math.PI / 180);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const deltaAnchorX = newAnchorX - oldAnchorX;
  const deltaAnchorY = newAnchorY - oldAnchorY;
  const dx = (deltaAnchorX * width * cos) + (deltaAnchorY * height * -sin);
  const dy = (deltaAnchorX * width * sin) + (deltaAnchorY * height * cos);

  return {
    x: Math.round(Number(document.x ?? 0) + dx),
    y: Math.round(Number(document.y ?? 0) + dy),
    "texture.anchorX": newAnchorX,
    "texture.anchorY": newAnchorY
  };
}

function nearlyEqual(a, b) {
  return Math.abs(a - b) <= 1e-6;
}

window.TileAnchorToggle = Object.freeze({
  MODULE_ID,
  buildAnchorUpdate,
  getAnchorMode
});

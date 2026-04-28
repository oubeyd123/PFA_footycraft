(function () {
  "use strict";

  const RARITY_COLORS = {
    common: "#c0a060",
    rare: "#4fc3f7",
    epic: "#ce93d8",
    legend: "#FFD700",
    icon: "#ff9500",
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  }

  function rarityColor(rarity) {
    return RARITY_COLORS[String(rarity || "").toLowerCase()] || "#aaa";
  }

  function faceUrl(player) {
    if (!player || typeof player !== "object") return "";
    return String(
      player.image_url ||
        player.imageUrl ||
        player.player_image_url ||
        player.playerImageUrl ||
        player.face_url ||
        player.faceUrl ||
        "",
    ).trim();
  }

  function shortName(player) {
    const raw = String(player?.name || player?.player || "PLAYER").trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    return (parts[parts.length - 1] || raw || "PLAYER").toUpperCase();
  }

  function render(player, options = {}) {
    const p = player || {};
    const size = Number(options.size || 60);
    const accent = options.accent || rarityColor(p.rarity);
    const name = options.name || shortName(p);
    const overall = p.overall ?? p.ovr ?? p.rating ?? "--";
    const position = p.position || p.pos || p.slot_code || p.slotCode || "";
    const img = faceUrl(p);
    const classes = [
      "fc-mini-player-card",
      options.className || "",
      size <= 44 ? "fc-mini-player-card--sm" : "",
      size >= 120 ? "fc-mini-player-card--lg" : "",
      options.flat ? "fc-mini-player-card--flat" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const alt = escapeHtml(p.name || p.player || name);
    const fallback = escapeHtml(position || overall || "?");

    return `<div class="${classes}" style="--fc-card-width:${size}px;--fc-card-accent:${escapeHtml(accent)};" aria-label="${alt}">
        <div class="fc-mini-player-card__rating">${escapeHtml(overall)}</div>
        <div class="fc-mini-player-card__portrait">
          ${
            img
              ? `<img src="${escapeHtml(img)}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();">`
              : `<span class="fc-mini-player-card__fallback">${fallback}</span>`
          }
        </div>
        <div class="fc-mini-player-card__name">${escapeHtml(name)}</div>
        <div class="fc-mini-player-card__pos">${escapeHtml(position)}</div>
      </div>`;
  }

  window.FCPlayerCard = {
    escapeHtml,
    faceUrl,
    rarityColor,
    render,
    shortName,
  };
})();

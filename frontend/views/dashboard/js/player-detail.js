(function () {
  "use strict";
  const RARITY_COLORS = {
    common: "#c0a060",
    rare: "#4fc3f7",
    epic: "#ce93d8",
    legend: "#FFD700",
    icon: "#ff9500",
  };
  const RARITY_GLOW = {
    common: "rgba(192,160,96,0.25)",
    rare: "rgba(79,195,247,0.25)",
    epic: "rgba(206,147,216,0.3)",
    legend: "rgba(255,215,0,0.3)",
    icon: "rgba(255,149,0,0.35)",
  };
  function statBar(label, value) {
    value = value || 0;
    const color =
      value >= 85
        ? "#6f6"
        : value >= 75
          ? "#FFD700"
          : value >= 60
            ? "#4fc3f7"
            : "#f66";
    const pct = Math.min(100, Math.round((value / 99) * 100));
    return `\n        <div style="margin-bottom:8px;">\n            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">\n                <span style="font-size:11px;color:#888;font-weight:600;letter-spacing:0.5px;">${label}</span>\n                <span style="font-size:14px;font-weight:900;color:${color};">${value}</span>\n            </div>\n            <div style="height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">\n                <div class="stat-bar-fill" style="height:100%;width:0%;background:${color};border-radius:3px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1);" data-pct="${pct}"></div>\n            </div>\n        </div>`;
  }
  function rarityBadge(rarity) {
    const c = RARITY_COLORS[rarity] || "#aaa";
    if (rarity === "icon")
      return `<span style="padding:3px 10px;border-radius:12px;background:linear-gradient(90deg,#ff6b00,#ffd700,#ff6b00);color:#000;font-weight:900;font-size:11px;">ICON</span>`;
    return `<span style="padding:3px 10px;border-radius:12px;background:${c}22;color:${c};border:1px solid ${c}55;font-weight:700;font-size:11px;">${rarity.toUpperCase()}</span>`;
  }
  function getStatEntries(player) {
    return [
      { label: "Pace", value: Number(player.pace) || 0 },
      { label: "Shooting", value: Number(player.shooting) || 0 },
      { label: "Passing", value: Number(player.passing) || 0 },
      { label: "Dribbling", value: Number(player.dribbling) || 0 },
      { label: "Defending", value: Number(player.defending) || 0 },
      { label: "Physical", value: Number(player.physical) || 0 },
    ];
  }
  function getRoleLabel(position, topStat) {
    const roles = {
      GK: "shot-stopping anchor",
      CB: "front-foot defender",
      LB: "overlapping fullback",
      RB: "overlapping fullback",
      LWB: "touchline engine",
      RWB: "touchline engine",
      CDM: "defensive screen",
      CM: "two-way midfielder",
      CAM: "chance creator",
      LM: "wide progressor",
      RM: "wide progressor",
      LW: "direct wide threat",
      RW: "direct wide threat",
      ST: "penalty-box finisher",
      CF: "link-up forward",
    };
    return roles[position] || `${topStat.label.toLowerCase()} specialist`;
  }
  function buildWalkthrough(player) {
    const stats = getStatEntries(player).sort((a, b) => b.value - a.value);
    const strongest = stats.slice(0, 3);
    const weakest = stats.slice(-2).reverse();
    const topStat = strongest[0] || { label: "Balance", value: 0 };
    const secondStat = strongest[1] || topStat;
    const chemistryFit =
      [player.club, player.league, player.nation].filter(Boolean).join(" / ") ||
      "Flexible links";
    const role = getRoleLabel(player.position, topStat);
    const summary = `${player.name} profiles as a ${role} built around ${topStat.label.toLowerCase()} (${topStat.value}) and ${secondStat.label.toLowerCase()} (${secondStat.value}).`;
    const usage =
      player.position === "GK"
        ? "Best used behind a compact back line so the keeper can dominate central shots and second balls."
        : ["CB", "LB", "RB", "LWB", "RWB", "CDM"].includes(player.position)
          ? "Best used with close support so defensive wins quickly turn into safe exits and counters."
          : ["CM", "CAM", "LM", "RM"].includes(player.position)
            ? "Best used with runners ahead so the strongest stats translate into progression and chance creation."
            : "Best used with quick support and regular service into dangerous areas.";
    return {
      role: role,
      summary: summary,
      usage: usage,
      strongest: strongest,
      weakest: weakest,
      chemistryFit: chemistryFit,
    };
  }
  function insightChip(label, value, tone) {
    const palette =
      tone === "good"
        ? {
            bg: "rgba(111,255,111,0.1)",
            border: "rgba(111,255,111,0.28)",
            text: "#8bff8b",
          }
        : {
            bg: "rgba(255,107,107,0.1)",
            border: "rgba(255,107,107,0.24)",
            text: "#ff9a9a",
          };
    return `<span style="padding:6px 10px;border-radius:999px;background:${palette.bg};border:1px solid ${palette.border};color:${palette.text};font-size:11px;font-weight:700;">${label} ${value}</span>`;
  }
  function infoCell(label, value) {
    return `<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:8px 10px;border:1px solid rgba(255,255,255,0.06);">\n            <div style="font-size:9px;color:#555;margin-bottom:2px;font-weight:600;">${label}</div>\n            <div style="font-size:12px;color:#ccc;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value || "-"}</div>\n        </div>`;
  }
  function showPlayerDetail(player) {
    const existing = document.getElementById("fc-player-detail-modal");
    if (existing) existing.remove();
    const c = RARITY_COLORS[player.rarity] || "#aaa";
    const glow = RARITY_GLOW[player.rarity] || "rgba(255,255,255,0.1)";
    const displayName =
      player.full_name && player.full_name.trim()
        ? player.full_name
        : player.name;
    const alts = player.alt_positions
      ? player.alt_positions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const walkthrough = buildWalkthrough(player);
    const modal = document.createElement("div");
    modal.id = "fc-player-detail-modal";
    modal.style.cssText = `\n            position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:10000;\n            display:flex;align-items:center;justify-content:center;padding:16px;\n            animation:fdIn 0.2s ease;backdrop-filter:blur(6px);\n        `;
    modal.onclick = (event) => {
      if (event.target === modal) modal.remove();
    };
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") modal.remove();
    });
    const cardImgHtml = window.FCPlayerCard
      ? window.FCPlayerCard.render(player, { size: 170, accent: c })
      : `<div style="width:180px;height:252px;border-radius:10px;background:rgba(255,255,255,0.04);border:2px solid ${c};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;margin:0 auto;">\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:52px;color:${c};line-height:1;">${player.overall}</div>\n                <div style="font-size:14px;color:#888;font-weight:700;">${player.position}</div>\n               </div>`;
    const faceHtml = player.image_url
      ? `<img src="${player.image_url}" alt="${displayName}" referrerpolicy="no-referrer" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid ${c};flex-shrink:0;" onerror="this.style.display='none'">`
      : "";
    modal.innerHTML = `\n        <style>\n            @keyframes fdIn { from { opacity:0;transform:scale(0.95); } to { opacity:1;transform:scale(1); } }\n        </style>\n        <div style="background:linear-gradient(135deg,#111,#0d0d0d);border:1.5px solid ${c}44;border-radius:18px;\n                    width:100%;max-width:860px;max-height:90vh;overflow-y:auto;box-shadow:0 0 60px ${glow};\n                    display:flex;flex-direction:column;gap:0;">\n\n            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">\n                <div style="display:flex;align-items:center;gap:10px;">\n                    ${faceHtml}\n                    <div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${c};line-height:1.1;">${displayName}</div>\n                        <div style="font-size:11px;color:#666;margin-top:1px;">${player.name !== displayName ? player.name : ""}</div>\n                    </div>\n                </div>\n                <button id="fc-player-detail-close" onclick="document.getElementById('fc-player-detail-modal').remove()"\n                    style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#888;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">X</button>\n            </div>\n\n            <div style="display:flex;gap:20px;padding:20px;flex-wrap:wrap;">\n                <div style="flex-shrink:0;width:200px;text-align:center;">\n                    ${cardImgHtml}\n                    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;align-items:center;">\n                        ${rarityBadge(player.rarity)}\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:${c};line-height:1;">${player.overall} OVR</div>\n                        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">\n                            <span style="padding:2px 8px;border-radius:8px;background:${c}22;color:${c};font-size:11px;font-weight:700;border:1px solid ${c}44;">${player.position}</span>\n                            ${alts.map((alt) => `<span style="padding:2px 8px;border-radius:8px;background:rgba(255,255,255,0.05);color:#888;font-size:10px;border:1px solid rgba(255,255,255,0.08);">${alt}</span>`).join("")}\n                        </div>\n                    </div>\n                </div>\n\n                <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:16px;">\n                    <div style="background:linear-gradient(135deg,${c}18,rgba(255,255,255,0.03));border:1px solid ${c}33;border-radius:14px;padding:14px 16px;">\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:${c};letter-spacing:1px;margin-bottom:8px;">PLAYER WALKTHROUGH</div>\n                        <div style="font-size:16px;color:#fff;font-weight:700;line-height:1.35;">${walkthrough.summary}</div>\n                        <div style="font-size:13px;color:#a8a8a8;line-height:1.55;margin-top:8px;">${walkthrough.usage}</div>\n                        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">\n                            <span style="padding:6px 10px;border-radius:999px;background:${c}20;border:1px solid ${c}35;color:${c};font-size:11px;font-weight:800;">Role: ${walkthrough.role.toUpperCase()}</span>\n                            <span style="padding:6px 10px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#d7d7d7;font-size:11px;font-weight:700;">Chemistry fit: ${walkthrough.chemistryFit}</span>\n                        </div>\n                    </div>\n\n                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">\n                        ${infoCell("Club", player.club)}\n                        ${infoCell("Nation", player.nation)}\n                        ${infoCell("League", player.league)}\n                        ${infoCell("Card", (player.card_type || "").toUpperCase())}\n                    </div>\n\n                    <div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:#555;letter-spacing:1px;margin-bottom:10px;">STATISTICS</div>\n                        ${statBar("PACE", player.pace)}\n                        ${statBar("SHOOTING", player.shooting)}\n                        ${statBar("PASSING", player.passing)}\n                        ${statBar("DRIBBLING", player.dribbling)}\n                        ${statBar("DEFENDING", player.defending)}\n                        ${statBar("PHYSICAL", player.physical)}\n                    </div>\n\n                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">\n                        <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px;border:1px solid rgba(255,255,255,0.06);">\n                            <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:#6f6;letter-spacing:1px;margin-bottom:10px;">STRONG POINTS</div>\n                            <div style="display:flex;flex-wrap:wrap;gap:8px;">${walkthrough.strongest.map((stat) => insightChip(stat.label, stat.value, "good")).join("")}</div>\n                        </div>\n                        <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px;border:1px solid rgba(255,255,255,0.06);">\n                            <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:#ff8d8d;letter-spacing:1px;margin-bottom:10px;">WATCH AREAS</div>\n                            <div style="display:flex;flex-wrap:wrap;gap:8px;">${walkthrough.weakest.map((stat) => insightChip(stat.label, stat.value, "warn")).join("")}</div>\n                        </div>\n                    </div>\n                </div>\n            </div>\n        </div>`;
    document.body.appendChild(modal);
    modal.setAttribute("tabindex", "-1");
    modal.focus();
    modal.querySelector("#fc-player-detail-close")?.focus();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.querySelectorAll(".stat-bar-fill").forEach((el) => {
          el.style.width = el.dataset.pct + "%";
        });
      });
    });
  }
  window.FC_showPlayerDetail = showPlayerDetail;
})();

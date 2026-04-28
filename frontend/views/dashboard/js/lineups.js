(function () {
  "use strict";
  let myLineups = [];
  let activeLineupId = null;
  let editingLineupId = null;
  let inventoryPlayers = [];
  let currentSlotTarget = null;
  let selectedSlotCode = null;
  let _lastChemData = null;
  let _builderState = null;
  let _swapSource = null;
  let _dragItem = null;
  let _metaPulseState = { items: [], activeFormation: "", lineups: [] };
  let _squadSpotlightState = { items: [], activeLineupId: null };
  const PITCH_CARD_WIDTH = 77;
  const PITCH_CARD_FALLBACK_WIDTH = 60;
  const PITCH_EMPTY_SIZE = 50;
  const FORMATIONS = {
    "4-3-3": [
      "GK",
      "LB",
      "CB1",
      "CB2",
      "RB",
      "LCM",
      "CM",
      "RCM",
      "LW",
      "ST",
      "RW",
    ],
    "4-4-2": [
      "GK",
      "LB",
      "CB1",
      "CB2",
      "RB",
      "LM",
      "LCM",
      "RCM",
      "RM",
      "ST1",
      "ST2",
    ],
    "4-2-3-1": [
      "GK",
      "LB",
      "CB1",
      "CB2",
      "RB",
      "CDM1",
      "CDM2",
      "LAM",
      "CAM",
      "RAM",
      "ST",
    ],
    "3-5-2": [
      "GK",
      "CB1",
      "CB2",
      "CB3",
      "LWB",
      "LCM",
      "CM",
      "RCM",
      "RWB",
      "ST1",
      "ST2",
    ],
    "3-4-3": [
      "GK",
      "CB1",
      "CB2",
      "CB3",
      "LM",
      "LCM",
      "RCM",
      "RM",
      "LW",
      "ST",
      "RW",
    ],
    "4-1-2-1-2": [
      "GK",
      "LB",
      "CB1",
      "CB2",
      "RB",
      "CDM",
      "LCM",
      "RCM",
      "CAM",
      "ST1",
      "ST2",
    ],
    "5-3-2": [
      "GK",
      "LWB",
      "CB1",
      "CB2",
      "CB3",
      "RWB",
      "LCM",
      "CM",
      "RCM",
      "ST1",
      "ST2",
    ],
    "4-5-1": [
      "GK",
      "LB",
      "CB1",
      "CB2",
      "RB",
      "LM",
      "LCM",
      "CM",
      "RCM",
      "RM",
      "ST",
    ],
    "4-3-2-1": [
      "GK",
      "LB",
      "CB1",
      "CB2",
      "RB",
      "LCM",
      "CM",
      "RCM",
      "LAM",
      "RAM",
      "ST",
    ],
    "4-2-2-2": [
      "GK",
      "LB",
      "CB1",
      "CB2",
      "RB",
      "CDM1",
      "CDM2",
      "LAM",
      "RAM",
      "ST1",
      "ST2",
    ],
  };
  const PITCH_POSITIONS = {
    GK: { x: 50, y: 88 },
    LB: { x: 15, y: 72 },
    CB1: { x: 34, y: 73 },
    CB2: { x: 56, y: 73 },
    CB3: { x: 65, y: 73 },
    RB: { x: 85, y: 72 },
    LWB: { x: 10, y: 60 },
    RWB: { x: 90, y: 60 },
    CDM: { x: 50, y: 58 },
    CDM1: { x: 36, y: 58 },
    CDM2: { x: 64, y: 58 },
    LCM: { x: 23, y: 48 },
    CM: { x: 50, y: 50 },
    RCM: { x: 77, y: 48 },
    LM: { x: 10, y: 45 },
    RM: { x: 90, y: 45 },
    CAM: { x: 50, y: 37 },
    LAM: { x: 28, y: 38 },
    RAM: { x: 72, y: 38 },
    LW: { x: 16, y: 24 },
    ST: { x: 50, y: 16 },
    RW: { x: 84, y: 24 },
    ST1: { x: 35, y: 16 },
    ST2: { x: 65, y: 16 },
  };
  const FORMATION_LINES = {
    "4-3-3": [
      ["GK", "CB1"],
      ["GK", "CB2"],
      ["LB", "CB1"],
      ["LB", "LCM"],
      ["CB1", "CM"],
      ["CB2", "CM"],
      ["CB2", "RB"],
      ["RB", "RCM"],
      ["LCM", "CM"],
      ["LCM", "LW"],
      ["CM", "RCM"],
      ["CM", "ST"],
      ["RCM", "RW"],
      ["LW", "ST"],
      ["ST", "RW"],
    ],
    "4-4-2": [
      ["GK", "CB1"],
      ["GK", "CB2"],
      ["LB", "CB1"],
      ["LB", "LM"],
      ["CB1", "LCM"],
      ["CB2", "RCM"],
      ["CB2", "RB"],
      ["RB", "RM"],
      ["LM", "LCM"],
      ["LM", "ST1"],
      ["LCM", "RCM"],
      ["RCM", "RM"],
      ["RM", "ST2"],
      ["ST1", "ST2"],
    ],
    "4-2-3-1": [
      ["GK", "CB1"],
      ["GK", "CB2"],
      ["LB", "CB1"],
      ["LB", "CDM1"],
      ["CB1", "CDM1"],
      ["CB2", "CDM2"],
      ["CB2", "RB"],
      ["RB", "CDM2"],
      ["CDM1", "CDM2"],
      ["CDM1", "CAM"],
      ["CDM2", "CAM"],
      ["CAM", "LAM"],
      ["CAM", "RAM"],
      ["CAM", "ST"],
      ["LAM", "ST"],
      ["RAM", "ST"],
    ],
    "3-5-2": [
      ["GK", "CB2"],
      ["CB1", "CB2"],
      ["CB1", "LWB"],
      ["CB1", "LCM"],
      ["CB2", "CB3"],
      ["CB2", "CM"],
      ["CB3", "RWB"],
      ["CB3", "RCM"],
      ["LWB", "LCM"],
      ["LCM", "CM"],
      ["LCM", "ST1"],
      ["CM", "RCM"],
      ["CM", "ST1"],
      ["CM", "ST2"],
      ["RCM", "ST2"],
      ["RWB", "RCM"],
      ["ST1", "ST2"],
    ],
    "3-4-3": [
      ["GK", "CB2"],
      ["CB1", "CB2"],
      ["CB1", "LM"],
      ["CB2", "CB3"],
      ["CB2", "CM"],
      ["CB3", "RM"],
      ["LM", "CM"],
      ["LM", "LW"],
      ["RM", "CM"],
      ["RM", "RW"],
      ["CM", "ST"],
      ["LW", "ST"],
      ["ST", "RW"],
    ],
    "4-1-2-1-2": [
      ["GK", "CB1"],
      ["GK", "CB2"],
      ["LB", "CB1"],
      ["LB", "LCM"],
      ["CB1", "CDM"],
      ["CB2", "CDM"],
      ["CB2", "RB"],
      ["RB", "RCM"],
      ["CDM", "LCM"],
      ["CDM", "RCM"],
      ["LCM", "CAM"],
      ["RCM", "CAM"],
      ["CAM", "ST1"],
      ["CAM", "ST2"],
      ["ST1", "ST2"],
    ],
    "5-3-2": [
      ["GK", "CB2"],
      ["CB1", "CB2"],
      ["CB1", "LWB"],
      ["CB1", "LCM"],
      ["CB2", "CB3"],
      ["CB2", "CM"],
      ["CB3", "RWB"],
      ["CB3", "RCM"],
      ["LWB", "LCM"],
      ["LCM", "CM"],
      ["LCM", "ST1"],
      ["CM", "RCM"],
      ["RCM", "ST2"],
      ["RWB", "RCM"],
      ["ST1", "ST2"],
    ],
    "4-5-1": [
      ["GK", "CB1"],
      ["GK", "CB2"],
      ["LB", "CB1"],
      ["LB", "LM"],
      ["CB1", "LCM"],
      ["CB2", "RCM"],
      ["CB2", "RB"],
      ["RB", "RM"],
      ["LM", "LCM"],
      ["LM", "ST"],
      ["LCM", "CM"],
      ["CM", "RCM"],
      ["CM", "ST"],
      ["RCM", "RM"],
      ["RM", "ST"],
    ],
    "4-3-2-1": [
      ["GK", "CB1"],
      ["GK", "CB2"],
      ["LB", "CB1"],
      ["LB", "LCM"],
      ["CB1", "CM"],
      ["CB2", "CM"],
      ["CB2", "RB"],
      ["RB", "RCM"],
      ["LCM", "CM"],
      ["LCM", "LAM"],
      ["CM", "RCM"],
      ["CM", "ST"],
      ["RCM", "RAM"],
      ["LAM", "ST"],
      ["ST", "RAM"],
    ],
    "4-2-2-2": [
      ["GK", "CB1"],
      ["GK", "CB2"],
      ["LB", "CB1"],
      ["LB", "LAM"],
      ["CB1", "CDM1"],
      ["CB2", "CDM2"],
      ["CB2", "RB"],
      ["RB", "RAM"],
      ["CDM1", "CDM2"],
      ["CDM1", "LAM"],
      ["CDM2", "RAM"],
      ["LAM", "RAM"],
      ["LAM", "ST1"],
      ["RAM", "ST2"],
      ["ST1", "ST2"],
    ],
  };
  function getFormationLines(formation) {
    return FORMATION_LINES[formation] || FORMATION_LINES["4-3-3"];
  }
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
  function getLineupDisplayName(lineup) {
    const name = String(lineup?.name || "").trim();
    return name || "My Lineup";
  }
  function getLineupFormation(lineup) {
    return String(lineup?.formation || "4-3-3");
  }
  function rarityColor(r) {
    return (
      {
        common: "#c0a060",
        rare: "#4fc3f7",
        epic: "#ce93d8",
        legend: "#FFD700",
        icon: "#ff9500",
      }[r] || "#aaa"
    );
  }
  function getPlayerImageData(player) {
    if (!player) return { src: "", fallback: "" };
    return { src: player.image_url || "", fallback: "" };
  }
  function getBenchPlayers(lineup) {
    const selectedIds = new Set(
      (lineup.slots || []).map((slot) => slot.player_id).filter(Boolean),
    );
    return inventoryPlayers
      .filter((player) => !selectedIds.has(player.id))
      .sort(
        (a, b) =>
          (b.overall || 0) - (a.overall || 0) ||
          String(a.name || "").localeCompare(String(b.name || "")),
      );
  }
  function activatePlayerTab() {
    const tabP = document.getElementById("fc-tab-player");
    const tabC = document.getElementById("fc-tab-chem");
    if (tabP) {
      tabP.removeAttribute("disabled");
      tabP.style.background = "rgba(255,200,0,0.2)";
      tabP.style.borderColor = "rgba(255,200,0,0.4)";
      tabP.style.color = "#FFD700";
    }
    if (tabC) {
      tabC.style.background = "rgba(255,255,255,0.04)";
      tabC.style.borderColor = "rgba(255,255,255,0.1)";
      tabC.style.color = "#555";
    }
  }
  function clearBuilderSelections() {
    document
      .querySelectorAll(".fc-classic-card")
      .forEach((el) =>
        el.classList.remove("selected-slot", "drop-target", "dragging"),
      );
    document
      .querySelectorAll(".fc-bench-row")
      .forEach((el) =>
        el.classList.remove("selected-bench", "drop-target", "dragging"),
      );
  }
  function getDragPayload(event) {
    if (_dragItem) return _dragItem;
    try {
      const raw = event?.dataTransfer?.getData("text/plain");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function getBuilderSlot(code) {
    return (
      _builderState?.bySlot?.[code] || _lastChemData?.bySlot?.[code] || null
    );
  }
  function getDisplayStats(player) {
    const labels =
      player?.position === "GK"
        ? ["DIV", "HAN", "KIC", "REF", "SPD", "POS"]
        : ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
    const rawValues =
      player?.position === "GK"
        ? [
            player?.gk_diving,
            player?.gk_handling,
            player?.gk_kicking,
            player?.gk_reflexes,
            player?.gk_speed,
            player?.gk_positioning,
          ]
        : [
            player?.pace,
            player?.shooting,
            player?.passing,
            player?.dribbling,
            player?.defending,
            player?.physical,
          ];
    const values = rawValues.map((value) =>
      Number.isFinite(Number(value)) ? Number(value) : null,
    );
    const allMissing = values.every((value) => value === null);
    const allSame = values.every((value) => value === values[0]);
    const looksPlaceholder =
      !allMissing && allSame && (values[0] === 50 || values[0] === 70);
    return {
      stats: labels.map((label, index) => [label, values[index]]),
      statsUnavailable: allMissing,
      statsWarning: looksPlaceholder
        ? "These face stats look like fallback import values and may not match the original card exactly."
        : "",
    };
  }
  function formatCompactNumber(value) {
    const num = Number(value || 0);
    if (num >= 1e6) return `${(num / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
    return String(Math.round(num));
  }
  function getSlotsByCode(lineup) {
    const byCode = {};
    const slots = Array.isArray(lineup?.slots) ? lineup.slots : [];
    slots.forEach((slot) => {
      if (slot?.slot_code) byCode[slot.slot_code] = slot;
    });
    return byCode;
  }
  function getFormationProfile(formation) {
    const profiles = {
      "4-3-3": {
        title: "Wide pressure",
        style: "Explodes through the wings and keeps the striker fed early.",
        strength:
          "Natural width, easy passing triangles, good for elite wingers.",
        weakness:
          "Can leave the single striker isolated if midfield quality drops.",
        ideal: ["Fast wingers", "Attacking fullbacks", "Mobile striker"],
        difficulty: "Balanced",
        accent: "#ffb703",
        shapeNote: "Best when your wide players are your main creators.",
      },
      "4-4-2": {
        title: "Direct balance",
        style: "Stable defensive shell with two-striker transitions.",
        strength: "Simple pressing shape and reliable central coverage.",
        weakness: "Can lose midfield control against technical trios.",
        ideal: [
          "Two complementary strikers",
          "Hard-working wide mids",
          "Disciplined back line",
        ],
        difficulty: "Easy",
        accent: "#80ed99",
        shapeNote: "Great if you want structure without heavy tactical risk.",
      },
      "4-2-3-1": {
        title: "Control hub",
        style: "Built around a central creator protected by double pivots.",
        strength: "Excellent CAM usage and safer rest defence.",
        weakness: "Needs high-IQ CDMs or the build-up becomes slow.",
        ideal: ["Creative CAM", "Defensive midfield pair", "Inside forwards"],
        difficulty: "Advanced",
        accent: "#90e0ef",
        shapeNote:
          "Strong meta option when you want control and counters together.",
      },
      "3-5-2": {
        title: "Central overload",
        style: "Floods midfield and creates constant inside combinations.",
        strength: "Massive central presence and flexible attacking lanes.",
        weakness:
          "Wing-backs must cover huge distances or the flanks collapse.",
        ideal: ["Two-way wing-backs", "Aggressive CMs", "Two strikers"],
        difficulty: "Advanced",
        accent: "#f72585",
        shapeNote:
          "Deadly for users who know how to rotate midfield triangles.",
      },
      "3-4-3": {
        title: "Front-foot chaos",
        style: "Commits numbers high and overwhelms slow defences quickly.",
        strength: "Direct chance volume and immediate width.",
        weakness: "Transitions behind the wing midfielders are dangerous.",
        ideal: ["Fast front three", "Recovery pace at CB", "Brave pressing"],
        difficulty: "High risk",
        accent: "#fb8500",
        shapeNote: "Rewarding when you want pure momentum instead of control.",
      },
      "4-1-2-1-2": {
        title: "Diamond rhythm",
        style:
          "Narrow shape that attacks through central progression and runners.",
        strength: "Sharp passing lanes into the forwards and CAM.",
        weakness: "Naturally short on width unless fullbacks provide it.",
        ideal: ["Elite CAM", "Ball-winning CDM", "Overlapping fullbacks"],
        difficulty: "Balanced",
        accent: "#c77dff",
        shapeNote: "Excellent if your best cards live in the center.",
      },
      "5-3-2": {
        title: "Low-block launch",
        style: "Absorbs pressure and attacks with quick vertical exits.",
        strength: "Protects the box well and helps weaker defenders survive.",
        weakness: "Can become passive without adventurous wing-backs.",
        ideal: ["Strong CBs", "Counter strikers", "Endurance on the wings"],
        difficulty: "Balanced",
        accent: "#8ecae6",
        shapeNote:
          "Useful if you want safer chemistry and cleaner defensive spacing.",
      },
      "4-5-1": {
        title: "Midfield blanket",
        style:
          "Uses density in midfield to slow the game and recycle possession.",
        strength: "Solid ball retention and strong second-ball control.",
        weakness: "Single striker can disappear without support runners.",
        ideal: ["Workhorse midfield", "Creative wide mids", "Link striker"],
        difficulty: "Balanced",
        accent: "#ffd166",
        shapeNote: "Works best when your midfield is deeper than your attack.",
      },
      "4-3-2-1": {
        title: "Christmas press",
        style:
          "Narrow front shape with fast inside combinations around the striker.",
        strength: "Creates central overloads and dangerous half-space entries.",
        weakness: "Needs aggressive fullbacks to stretch the pitch.",
        ideal: [
          "Technical inside forwards",
          "Athletic fullbacks",
          "Link striker",
        ],
        difficulty: "Advanced",
        accent: "#06d6a0",
        shapeNote: "Strong if you like compact build-up and direct box access.",
      },
      "4-2-2-2": {
        title: "Box attack",
        style:
          "Two strikers plus tucked creators overwhelm the final third quickly.",
        strength: "Relentless central combinations and two-box presence.",
        weakness: "Can feel narrow when the fullbacks are passive.",
        ideal: ["Dual strikers", "Explosive CAMs", "Secure pivots"],
        difficulty: "Advanced",
        accent: "#ef476f",
        shapeNote:
          "A high-ceiling shape when your attacking cards are all central.",
      },
    };
    return (
      profiles[formation] || {
        title: "Flexible setup",
        style: "Adaptable shape with room for your own squad identity.",
        strength: "Stable baseline structure.",
        weakness: "Needs the right player mix to stand out.",
        ideal: ["Balanced squad core"],
        difficulty: "Balanced",
        accent: "#ffd700",
        shapeNote: "Use chemistry and player strengths to define the identity.",
      }
    );
  }
  function getLineupTagline(lineup, index) {
    const reasons = [
      "Most copied this week",
      "High chemistry favorite",
      "Fastest rising setup",
      "Elite attacking shell",
      "Safe weekend build",
      "Budget-efficient trend",
    ];
    if ((lineup.chemistry || 0) >= 31) return "Chem monster";
    if ((lineup.likes_count || 0) >= 120) return "Community favorite";
    if ((lineup.views_count || 0) >= 300) return "Heavy traffic build";
    return reasons[index % reasons.length];
  }
  function buildPitchPreviewHTML(formation, bySlot, options = {}) {
    const width = options.width || 520;
    const height = options.height || 620;
    const cardWidth = options.cardWidth || 62;
    const showNames = options.showNames !== false;
    const minimal = !!options.minimal;
      const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];
    const lines = getFormationLines(formation);
    const lineSvg = lines
      .map(([a, b]) => {
        const posA = PITCH_POSITIONS[a];
        const posB = PITCH_POSITIONS[b];
        if (!posA || !posB) return "";
        return `<line x1="${posA.x}" y1="${posA.y}" x2="${posB.x}" y2="${posB.y}" stroke="rgba(255,255,255,0.12)" stroke-width="0.35" stroke-linecap="round" />`;
      })
      .join("");
    const nodes = slots
      .map((code) => {
        const pos = PITCH_POSITIONS[code] || { x: 50, y: 50 };
        const slot = bySlot[code];
        const hasPlayer = !!slot?.name;
        const color = hasPlayer
          ? rarityColor(slot.rarity)
          : "rgba(255,255,255,0.2)";
        const image = slot?.image_url || "";
        const lastName = hasPlayer
          ? escapeHtml(String(slot.name).split(" ").pop())
          : code;
        const overall = hasPlayer ? escapeHtml(slot.overall || "--") : "";
        const sizeStyle = minimal
          ? `width:${cardWidth}px;min-height:${Math.round(cardWidth * 1.18)}px;`
          : `width:${cardWidth}px;min-height:${Math.round(cardWidth * 1.38)}px;`;
        if (!hasPlayer) {
          return `<div style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%);width:${minimal ? 30 : 38}px;height:${minimal ? 30 : 38}px;border-radius:50%;border:1px dashed rgba(255,255,255,0.25);background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:10px;font-weight:900;z-index:2;">${code}</div>`;
        }
        return `<div style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%);z-index:3;${sizeStyle}padding:6px 4px 8px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03));border:1px solid ${color}55;box-shadow:0 14px 28px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.16);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;">\n                <div style="font-size:${minimal ? 14 : 16}px;font-weight:900;color:${color};line-height:1;">${overall}</div>\n                ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(slot.name)}" referrerpolicy="no-referrer" style="width:${Math.round(cardWidth * 0.56)}px;height:${Math.round(cardWidth * 0.56)}px;border-radius:50%;object-fit:cover;border:2px solid ${color};background:rgba(0,0,0,0.2);" onerror="this.style.display='none'">` : `<div style="width:${Math.round(cardWidth * 0.56)}px;height:${Math.round(cardWidth * 0.56)}px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%, rgba(255,255,255,0.18), rgba(255,255,255,0.05) 55%, rgba(0,0,0,0.12) 100%);border:2px solid ${color};color:${color};font-size:10px;font-weight:900;">${escapeHtml(slot.position || code)}</div>`}\n                ${showNames ? `<div style="font-size:${minimal ? 9 : 10}px;font-weight:900;color:#fff;letter-spacing:0.04em;text-transform:uppercase;text-align:center;line-height:1.05;">${lastName}</div>` : ""}\n            </div>`;
      })
      .join("");
    return `\n            <div style="position:relative;width:${width}px;height:${height}px;max-width:100%;border-radius:28px;overflow:hidden;background:radial-gradient(circle at 50% 34%, #1f6d33 0%, #124723 48%, #091a10 100%);border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 0 120px rgba(0,0,0,0.35), 0 26px 54px rgba(0,0,0,0.35);">\n                <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0.04),transparent 18%, transparent 82%, rgba(255,255,255,0.03));"></div>\n                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;">\n                    <rect x="6" y="4" width="88" height="92" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.26"/>\n                    <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(255,255,255,0.13)" stroke-width="0.24"/>\n                    <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.13)" stroke-width="0.24"/>\n                    <rect x="28" y="4" width="44" height="14" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.24"/>\n                    <rect x="28" y="82" width="44" height="14" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.24"/>\n                    ${lineSvg}\n                </svg>\n                ${nodes}\n            </div>`;
  }
  async function fetchPublicLineupDataset(sort, recent, detailLimit = 6) {
    const res = await FC.lineups.public(sort, recent ? "true" : "false", 20);
    let lineups = [];
    if (
      res.success &&
      Array.isArray(res.data?.lineups) &&
      res.data.lineups.length
    ) {
      lineups = res.data.lineups;
    }
    const top = lineups.slice(0, detailLimit);
    const detailResults = await Promise.allSettled(
      top.map((lineup) => FC.lineups.view(lineup.id)),
    );
    const detailMap = new Map();
    detailResults.forEach((result, index) => {
      if (
        result.status === "fulfilled" &&
        result.value?.success &&
        result.value.data?.lineup
      ) {
        detailMap.set(top[index].id, result.value.data.lineup);
      }
    });
    return lineups.map((lineup, index) => ({
      ...lineup,
      detail: detailMap.get(lineup.id) || null,
      tagline: getLineupTagline(lineup, index),
    }));
  }
  function renderMetaPulse() {
    const root = document.getElementById("fc-meta-pulse");
    if (!root) return;
    const items = _metaPulseState.items || [];
    const active =
      items.find(
        (item) => item.formation === _metaPulseState.activeFormation,
      ) || items[0];
    if (!active) {
      root.innerHTML =
        '<div style="padding:40px;color:#888;text-align:center;">No formation data available yet.</div>';
      return;
    }
    const profile = getFormationProfile(active.formation);
    const topSquads = active.topLineups || [];
    const idealRoles = profile.ideal
      .map(
        (role) =>
          `<span style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);font-size:12px;color:#e7ecf7;">${escapeHtml(role)}</span>`,
      )
      .join("");
    root.innerHTML = `\n            <div style="height:100%;display:grid;grid-template-columns:280px 1fr 360px;background:radial-gradient(circle at top, rgba(255,183,3,0.08), transparent 28%), #06090f;color:#fff;">\n                <aside style="border-right:1px solid rgba(255,255,255,0.08);padding:26px 18px 22px;overflow:auto;background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0));">\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:1px;">META PULSE</div>\n                    <div style="margin-top:4px;color:#8d98ab;font-size:13px;line-height:1.5;">Understand what formations are actually rising, why they work, and which squads are carrying them.</div>\n                    <div style="margin-top:22px;display:flex;flex-direction:column;gap:10px;">\n                        ${items
      .map((item, index) => {
        const selected = item.formation === active.formation;
        const itemProfile = getFormationProfile(item.formation);
        return `<button onclick="FC_LINEUPS.selectMetaFormation('${item.formation}')" style="text-align:left;border:1px solid ${selected ? itemProfile.accent + "66" : "rgba(255,255,255,0.08)"};background:${selected ? "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))" : "rgba(255,255,255,0.03)"};border-radius:18px;padding:14px 14px 12px;color:#fff;cursor:pointer;">\n                                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">\n                                    <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:0.06em;">${item.formation}</div>\n                                    <span style="padding:5px 10px;border-radius:999px;background:${selected ? itemProfile.accent + "22" : "rgba(255,255,255,0.06)"};color:${selected ? itemProfile.accent : "#cbd3e0"};font-size:11px;font-weight:900;">#${index + 1}</span>\n                                </div>\n                                <div style="margin-top:6px;color:#aab3c2;font-size:12px;">${escapeHtml(item.title)}</div>\n                                <div style="margin-top:9px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;font-size:11px;color:#cfd6e2;">\n                                    <div><div style="color:#6f7b91;">Usage</div><div style="font-weight:800;">${item.usageShare}%</div></div>\n                                    <div><div style="color:#6f7b91;">Chem</div><div style="font-weight:800;">${item.avgChem}</div></div>\n                                    <div><div style="color:#6f7b91;">OVR</div><div style="font-weight:800;">${item.avgRating}</div></div>\n                                </div>\n                            </button>`;
      })
      .join(
        "",
      )}\n                    </div>\n                </aside>\n                <section style="padding:28px 30px 24px;overflow:auto;">\n                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;">\n                        <div>\n                            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">\n                                <div style="font-family:'Bebas Neue',sans-serif;font-size:64px;letter-spacing:0.05em;color:${profile.accent};line-height:0.95;">${active.formation}</div>\n                                <span style="padding:8px 14px;border-radius:999px;background:${profile.accent}22;border:1px solid ${profile.accent}55;color:${profile.accent};font-size:12px;font-weight:900;">${escapeHtml(profile.difficulty)}</span>\n                            </div>\n                            <div style="margin-top:8px;font-size:18px;font-weight:800;color:#f7f9fc;">${escapeHtml(profile.title)}</div>\n                            <div style="margin-top:8px;max-width:760px;color:#9aa4b6;font-size:15px;line-height:1.65;">${escapeHtml(profile.style)}</div>\n                        </div>\n                        <div style="display:flex;gap:10px;flex-wrap:wrap;">\n                            <button onclick="FC_LINEUPS.createLineup('${active.formation}')" style="background:${profile.accent};color:#071018;border:none;padding:12px 18px;border-radius:14px;font-size:12px;font-weight:900;cursor:pointer;">TRY THIS FORMATION</button>\n                            ${topSquads[0] ? `<button onclick="FC_LINEUPS.viewCommunity(${topSquads[0].id})" style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.12);padding:12px 18px;border-radius:14px;font-size:12px;font-weight:900;cursor:pointer;">SEE TOP SQUAD</button>` : ""}\n                        </div>\n                    </div>\n\n                    <div style="margin-top:24px;display:grid;grid-template-columns:minmax(420px, 1fr) minmax(280px, 340px);gap:22px;align-items:start;">\n                        <div style="padding:22px;border-radius:28px;background:linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);">\n                            ${buildPitchPreviewHTML(active.formation, {}, { width: 680, height: 760, cardWidth: 58, showNames: false, minimal: true })}\n                        </div>\n                        <div style="display:flex;flex-direction:column;gap:14px;">\n                            <div style="padding:18px;border-radius:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                                <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.18em;">FORMATION INSIGHT</div>\n                                <div style="margin-top:10px;font-size:14px;color:#e8edf5;line-height:1.7;">${escapeHtml(profile.shapeNote)}</div>\n                            </div>\n                            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">\n                                <div style="padding:16px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:10px;color:#738198;letter-spacing:0.14em;">USAGE SHARE</div><div style="margin-top:6px;font-family:'Bebas Neue',sans-serif;font-size:38px;color:#fff;">${active.usageShare}%</div></div>\n                                <div style="padding:16px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:10px;color:#738198;letter-spacing:0.14em;">AVG CHEM</div><div style="margin-top:6px;font-family:'Bebas Neue',sans-serif;font-size:38px;color:#fff;">${active.avgChem}</div></div>\n                                <div style="padding:16px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:10px;color:#738198;letter-spacing:0.14em;">AVG OVR</div><div style="margin-top:6px;font-family:'Bebas Neue',sans-serif;font-size:38px;color:#fff;">${active.avgRating}</div></div>\n                                <div style="padding:16px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:10px;color:#738198;letter-spacing:0.14em;">ENGAGEMENT</div><div style="margin-top:6px;font-family:'Bebas Neue',sans-serif;font-size:38px;color:#fff;">${formatCompactNumber(active.engagement)}</div></div>\n                            </div>\n                        </div>\n                    </div>\n\n                    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">\n                        <div style="padding:22px;border-radius:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.16em;">IDEAL PLAYER TYPES</div>\n                            <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;">${idealRoles}</div>\n                            <div style="margin-top:18px;display:grid;grid-template-columns:1fr;gap:10px;">\n                                <div style="padding:14px;border-radius:18px;background:rgba(111,255,170,0.06);border:1px solid rgba(111,255,170,0.14);"><div style="font-size:10px;color:#80ed99;font-weight:900;letter-spacing:0.14em;">STRENGTH</div><div style="margin-top:6px;font-size:13px;color:#e7edf5;line-height:1.6;">${escapeHtml(profile.strength)}</div></div>\n                                <div style="padding:14px;border-radius:18px;background:rgba(255,180,80,0.06);border:1px solid rgba(255,180,80,0.14);"><div style="font-size:10px;color:#ffb703;font-weight:900;letter-spacing:0.14em;">WATCH OUT</div><div style="margin-top:6px;font-size:13px;color:#e7edf5;line-height:1.6;">${escapeHtml(profile.weakness)}</div></div>\n                            </div>\n                        </div>\n                        <div style="padding:22px;border-radius:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">\n                                <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.16em;">TOP SQUADS USING ${active.formation}</div>\n                                <span style="font-size:12px;color:#95a0b2;">${topSquads.length} featured</span>\n                            </div>\n                            <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">\n                                ${topSquads.length ? topSquads.map((lineup) => `<button onclick="FC_LINEUPS.viewCommunity(${lineup.id})" style="text-align:left;padding:14px 16px;border-radius:18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#fff;cursor:pointer;">\n                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">\n                                        <div>\n                                            <div style="font-size:15px;font-weight:800;">${escapeHtml(getLineupDisplayName(lineup))}</div>\n                                            <div style="margin-top:4px;font-size:12px;color:#97a2b4;">@${escapeHtml(lineup.username || "Unknown")}  -  ${escapeHtml(lineup.tagline || "")}</div>\n                                        </div>\n                                        <div style="text-align:right;">\n                                            <div style="font-size:12px;color:#97a2b4;">Chem ${Math.round(lineup.chemistry || 0)}</div>\n                                            <div style="font-size:12px;color:#97a2b4;">Views ${formatCompactNumber(lineup.views_count || 0)}</div>\n                                        </div>\n                                    </div>\n                                </button>`).join("") : '<div style="color:#888;font-size:13px;">No public squads in this formation yet.</div>'}\n                            </div>\n                        </div>\n                    </div>\n                </section>\n                <aside style="border-left:1px solid rgba(255,255,255,0.08);padding:26px 22px;overflow:auto;background:linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0));">\n                    <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.18em;">WHY IT MATTERS</div>\n                    <div style="margin-top:12px;font-size:15px;line-height:1.7;color:#dfe5ef;">Meta Pulse separates formations by usefulness, not just popularity. You can see whether a shape is safe, explosive, chemistry-friendly, or technically demanding before you commit time building around it.</div>\n                    <div style="margin-top:20px;padding:18px;border-radius:22px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                        <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.16em;">ACTIVE READ</div>\n                        <div style="margin-top:8px;font-size:22px;font-weight:900;color:#fff;">${active.formation}</div>\n                        <div style="margin-top:8px;font-size:13px;color:#a6b0c0;line-height:1.7;">${escapeHtml(profile.style)}</div>\n                    </div>\n                    <div style="margin-top:18px;display:flex;flex-direction:column;gap:10px;">\n                        <div style="padding:16px;border-radius:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:10px;color:#6f7b91;font-weight:900;letter-spacing:0.14em;">BEST FOR</div>\n                            <div style="margin-top:8px;font-size:13px;color:#e8edf5;">${escapeHtml(profile.title)}</div>\n                        </div>\n                        <div style="padding:16px;border-radius:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:10px;color:#6f7b91;font-weight:900;letter-spacing:0.14em;">COMMUNITY SIGNAL</div>\n                            <div style="margin-top:8px;font-size:13px;color:#e8edf5;">${topSquads[0] ? `${escapeHtml(getLineupDisplayName(topSquads[0]))} is currently the strongest public reference for this system.` : "This shape still needs more public squads to stabilize its signal."}</div>\n                        </div>\n                    </div>\n                </aside>\n            </div>`;
  }
  async function loadMetaPulse() {
    const root = document.getElementById("fc-meta-pulse");
    if (!root) return;
    root.innerHTML =
      '<div style="padding:40px;color:#888;text-align:center;">Loading Meta Pulse...</div>';
    const res = await FC.lineups.metaPulse("true", 8, 3);
    const items = (res.success && Array.isArray(res.data?.formations)
      ? res.data.formations
      : []
    ).map((entry) => {
      const profile = getFormationProfile(entry.formation || "4-3-3");
      const topLineups = Array.isArray(entry.top_lineups)
        ? entry.top_lineups.map((lineup, index) => ({
            ...lineup,
            tagline: getLineupTagline(lineup, index),
          }))
        : [];
      return {
        formation: entry.formation || "4-3-3",
        title: profile.title,
        count: Number(entry.lineup_count || 0),
        usageShare: Number(entry.usage_share || 0),
        avgChem: Number(entry.avg_chem || 0).toFixed(1),
        avgRating: Number(entry.avg_rating || 0).toFixed(1),
        engagement: Number(entry.engagement || 0),
        topLineups: topLineups,
      };
    });
    _metaPulseState = {
      items: items,
      activeFormation: items[0]?.formation || "",
      lineups: [],
    };
    renderMetaPulse();
  }
  function selectMetaFormation(formation) {
    _metaPulseState.activeFormation = formation;
    renderMetaPulse();
  }
  function renderSquadSpotlight() {
    const root = document.getElementById("fc-squad-spotlight");
    if (!root) return;
    const items = _squadSpotlightState.items || [];
    const active =
      items.find((item) => item.id === _squadSpotlightState.activeLineupId) ||
      items[0];
    if (!active) {
      root.innerHTML =
        '<div style="padding:40px;color:#888;text-align:center;">No public lineups available yet.</div>';
      return;
    }
    const detail = active.detail || active;
    const bySlot = getSlotsByCode(detail);
    const slots = Object.values(bySlot).filter((slot) => slot?.name);
    const standouts = slots
      .slice()
      .sort((a, b) => Number(b.overall || 0) - Number(a.overall || 0))
      .slice(0, 3);
    const profile = getFormationProfile(active.formation);
    const activeMine =
      myLineups.find((lineup) => lineup.id === activeLineupId) || null;
    const myFormation = activeMine?.formation || null;
    const myChem = Math.round(activeMine?.chemistry || 0);
    const myRating = Math.round(activeMine?.rating || 0);
    const compareFormation = myFormation
      ? myFormation === active.formation
        ? "Same shape as your active squad"
        : `Different from your ${myFormation}`
      : "No active lineup selected yet";
    root.innerHTML = `\n            <div style="height:100%;display:grid;grid-template-columns:290px minmax(0,1fr) 360px;background:radial-gradient(circle at top, rgba(79,195,247,0.08), transparent 28%), #05070c;color:#fff;">\n                <aside style="border-right:1px solid rgba(255,255,255,0.08);padding:26px 18px 22px;overflow:auto;">\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:1px;">SQUAD SPOTLIGHT</div>\n                    <div style="margin-top:4px;color:#8d98ab;font-size:13px;line-height:1.5;">Featured public squads with a full-window preview, standout cards, and quick actions you can actually use.</div>\n                    <div style="margin-top:22px;display:flex;flex-direction:column;gap:10px;">\n                        ${items
      .map((item, index) => {
        const selected = item.id === active.id;
        return `<button onclick="FC_LINEUPS.selectSpotlightLineup(${item.id})" style="text-align:left;border:1px solid ${selected ? "#4fc3f766" : "rgba(255,255,255,0.08)"};background:${selected ? "linear-gradient(135deg, rgba(79,195,247,0.12), rgba(255,255,255,0.03))" : "rgba(255,255,255,0.03)"};border-radius:18px;padding:14px;color:#fff;cursor:pointer;">\n                                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">\n                                    <div style="font-size:15px;font-weight:800;">${escapeHtml(getLineupDisplayName(item))}</div>\n                                    <span style="font-size:11px;color:${selected ? "#4fc3f7" : "#95a0b2"};font-weight:900;">#${index + 1}</span>\n                                </div>\n                                <div style="margin-top:6px;font-size:12px;color:#95a0b2;">@${escapeHtml(item.username || "Unknown")}  -  ${escapeHtml(item.formation || "4-3-3")}</div>\n                                <div style="margin-top:8px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;font-size:11px;color:#dfe5ef;">\n                                    <div><div style="color:#6f7b91;">OVR</div><div style="font-weight:800;">${Math.round(item.rating || 0) || "--"}</div></div>\n                                    <div><div style="color:#6f7b91;">Chem</div><div style="font-weight:800;">${Math.round(item.chemistry || 0)}</div></div>\n                                    <div><div style="color:#6f7b91;">Views</div><div style="font-weight:800;">${formatCompactNumber(item.views_count || 0)}</div></div>\n                                </div>\n                                <div style="margin-top:8px;font-size:11px;color:#4fc3f7;font-weight:800;">${escapeHtml(item.tagline || "")}</div>\n                            </button>`;
      })
      .join(
        "",
      )}\n                    </div>\n                </aside>\n                <section style="padding:28px 30px 24px;overflow:auto;">\n                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;">\n                        <div>\n                            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">\n                                <div style="font-family:'Bebas Neue',sans-serif;font-size:58px;letter-spacing:0.04em;line-height:0.95;">${escapeHtml(getLineupDisplayName(active))}</div>\n                                <span style="padding:8px 14px;border-radius:999px;background:rgba(79,195,247,0.14);border:1px solid rgba(79,195,247,0.36);color:#4fc3f7;font-size:12px;font-weight:900;">${escapeHtml(active.tagline || "Trending now")}</span>\n                            </div>\n                            <div style="margin-top:10px;color:#a1acbd;font-size:15px;line-height:1.6;max-width:760px;">@${escapeHtml(active.username || "Unknown")}  -  ${escapeHtml(profile.title)}  -  ${escapeHtml(profile.style)}</div>\n                        </div>\n                        <div style="display:flex;gap:10px;flex-wrap:wrap;">\n                            <button onclick="FC_LINEUPS.viewCommunity(${active.id})" style="background:#fff;color:#071018;border:none;padding:12px 18px;border-radius:14px;font-size:12px;font-weight:900;cursor:pointer;">OPEN FULL PREVIEW</button>\n                            <button onclick="FC_LINEUPS.createLineup('${active.formation}')" style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.12);padding:12px 18px;border-radius:14px;font-size:12px;font-weight:900;cursor:pointer;">BUILD SIMILAR SHAPE</button>\n                        </div>\n                    </div>\n\n                    <div style="margin-top:24px;display:grid;grid-template-columns:minmax(420px, 1fr) minmax(260px, 320px);gap:22px;align-items:start;">\n                        <div style="padding:22px;border-radius:28px;background:linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);">\n                            ${buildPitchPreviewHTML(active.formation, bySlot, { width: 680, height: 760, cardWidth: 70, showNames: true, minimal: false })}\n                        </div>\n                        <div style="display:flex;flex-direction:column;gap:12px;">\n                            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">\n                                <div style="padding:16px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:10px;color:#738198;letter-spacing:0.14em;">FORMATION</div><div style="margin-top:6px;font-family:'Bebas Neue',sans-serif;font-size:34px;">${escapeHtml(active.formation)}</div></div>\n                                <div style="padding:16px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:10px;color:#738198;letter-spacing:0.14em;">CHEMISTRY</div><div style="margin-top:6px;font-family:'Bebas Neue',sans-serif;font-size:34px;">${Math.round(active.chemistry || 0)}</div></div>\n                                <div style="padding:16px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:10px;color:#738198;letter-spacing:0.14em;">RATING</div><div style="margin-top:6px;font-family:'Bebas Neue',sans-serif;font-size:34px;">${Math.round(active.rating || 0) || "--"}</div></div>\n                                <div style="padding:16px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:10px;color:#738198;letter-spacing:0.14em;">REACTION</div><div style="margin-top:6px;font-family:'Bebas Neue',sans-serif;font-size:34px;">${formatCompactNumber((active.likes_count || 0) + (active.views_count || 0))}</div></div>\n                            </div>\n                            <div style="padding:18px;border-radius:22px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                                <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.16em;">STANDOUTS</div>\n                                <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">\n                                    ${standouts.length ? standouts.map((player) => `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,0.04);">\n                                        ${window.FCPlayerCard ? window.FCPlayerCard.render(player, { size: 42, accent: rarityColor(player.rarity), flat: true }) : player.image_url ? `<img src="${escapeHtml(player.image_url)}" alt="${escapeHtml(player.name)}" referrerpolicy="no-referrer" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid ${rarityColor(player.rarity)};" onerror="this.style.display='none'">` : `<div style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.07);border:1px solid ${rarityColor(player.rarity)};color:${rarityColor(player.rarity)};font-size:10px;font-weight:900;">${escapeHtml(player.position || "--")}</div>`}\n                                        <div style="flex:1;min-width:0;">\n                                            <div style="font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(player.name)}</div>\n                                            <div style="margin-top:4px;font-size:12px;color:#95a0b2;">${escapeHtml(player.club || "Free Agent")}  -  ${escapeHtml(player.position || "--")}</div>\n                                        </div>\n                                        <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:${rarityColor(player.rarity)};">${escapeHtml(player.overall || "--")}</div>\n                                    </div>`).join("") : '<div style="color:#888;font-size:13px;">No standout player data available for this squad.</div>'}\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n\n                    <div style="margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">\n                        <div style="padding:20px;border-radius:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.16em;">WHY THIS SQUAD TRENDS</div>\n                            <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;">\n                                <span style="padding:8px 12px;border-radius:999px;background:rgba(79,195,247,0.12);border:1px solid rgba(79,195,247,0.3);font-size:12px;">${escapeHtml(active.tagline || "Community favorite")}</span>\n                                <span style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);font-size:12px;">${escapeHtml(profile.title)}</span>\n                                <span style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);font-size:12px;">${slots.length || 0} starters visible</span>\n                            </div>\n                            <div style="margin-top:14px;font-size:14px;color:#dfe5ef;line-height:1.7;">This squad is useful because it turns a trending formation into a real build you can inspect immediately: the shape, the standout cards, the chemistry ceiling, and the style signal are all visible in one place.</div>\n                        </div>\n                        <div style="padding:20px;border-radius:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.16em;">COMPARE TO YOUR ACTIVE SQUAD</div>\n                            <div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">\n                                <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);"><div style="font-size:10px;color:#6f7b91;">SHAPE</div><div style="margin-top:6px;font-size:13px;color:#fff;line-height:1.5;">${escapeHtml(compareFormation)}</div></div>\n                                <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);"><div style="font-size:10px;color:#6f7b91;">CHEM DELTA</div><div style="margin-top:6px;font-size:13px;color:#fff;">${activeMine ? `${Math.round(active.chemistry || 0) - myChem >= 0 ? "+" : ""}${Math.round(active.chemistry || 0) - myChem}` : "--"}</div></div>\n                                <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);"><div style="font-size:10px;color:#6f7b91;">OVR DELTA</div><div style="margin-top:6px;font-size:13px;color:#fff;">${activeMine ? `${Math.round(active.rating || 0) - myRating >= 0 ? "+" : ""}${Math.round(active.rating || 0) - myRating}` : "--"}</div></div>\n                                <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);"><div style="font-size:10px;color:#6f7b91;">NEXT MOVE</div><div style="margin-top:6px;font-size:13px;color:#fff;">${activeMine ? "Try the shape, then compare chemistry." : "Set an active lineup to unlock direct comparison."}</div></div>\n                            </div>\n                        </div>\n                    </div>\n                </section>\n                <aside style="border-left:1px solid rgba(255,255,255,0.08);padding:26px 22px;overflow:auto;">\n                    <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.18em;">FEATURED NOTE</div>\n                    <div style="margin-top:12px;font-size:15px;line-height:1.7;color:#dfe5ef;">Squad Spotlight is for inspiration with context. You are not just seeing likes and views; you are seeing why a squad is attractive, what shape it uses, and which cards define it.</div>\n                    <div style="margin-top:20px;padding:18px;border-radius:22px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                        <div style="font-size:11px;color:#6f7b91;font-weight:900;letter-spacing:0.16em;">OWNER</div>\n                        <div style="margin-top:8px;font-size:24px;font-weight:900;">@${escapeHtml(active.username || "Unknown")}</div>\n                        <div style="margin-top:8px;font-size:13px;color:#95a0b2;line-height:1.6;">${escapeHtml(active.tagline || "")}</div>\n                    </div>\n                    <div style="margin-top:18px;display:flex;flex-direction:column;gap:10px;">\n                        <div style="padding:16px;border-radius:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:10px;color:#6f7b91;font-weight:900;letter-spacing:0.14em;">FORMATION ROLE</div>\n                            <div style="margin-top:8px;font-size:13px;color:#e8edf5;line-height:1.6;">${escapeHtml(profile.shapeNote)}</div>\n                        </div>\n                        <div style="padding:16px;border-radius:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:10px;color:#6f7b91;font-weight:900;letter-spacing:0.14em;">QUICK ACTIONS</div>\n                            <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">\n                                <button onclick="FC_LINEUPS.viewCommunity(${active.id})" style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.12);padding:10px 12px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;">View complete squad</button>\n                                <button onclick="FC_LINEUPS.createLineup('${active.formation}')" style="background:rgba(79,195,247,0.14);color:#4fc3f7;border:1px solid rgba(79,195,247,0.32);padding:10px 12px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;">Start from this shape</button>\n                            </div>\n                        </div>\n                    </div>\n                </aside>\n            </div>`;
  }
  async function loadSquadSpotlight() {
    const root = document.getElementById("fc-squad-spotlight");
    if (!root) return;
    root.innerHTML =
      '<div style="padding:40px;color:#888;text-align:center;">Loading Squad Spotlight...</div>';
    const lineups = await fetchPublicLineupDataset("views", false, 8);
    _squadSpotlightState = {
      items: lineups.slice(0, 8),
      activeLineupId: lineups[0]?.id || null,
    };
    renderSquadSpotlight();
  }
  function selectSpotlightLineup(lineupId) {
    _squadSpotlightState.activeLineupId = lineupId;
    renderSquadSpotlight();
  }
  async function loadMyLineups() {
    const res = await FC.lineups.my();
    if (!res.success) return;
    myLineups = res.data.lineups;
    const list = document.getElementById("fc-lineup-list");
    if (!list) return;
    const userRes = await FC.auth.me();
    if (userRes.success) {
      const user = userRes.data?.user || userRes.data || {};
      activeLineupId = Number(user.active_lineup_id || 0) || null;
    }
    if (!myLineups.length) {
      list.innerHTML =
        '<div style="color:#888;padding:20px;text-align:center;">No lineups yet.</div>';
      return;
    }
    renderLineupList();
  }
  async function loadPublicLineups(sort, recent) {
    const container = document.getElementById("fc-explore-lineups");
    if (!container) return;
    container.innerHTML =
      '<div style="color:#555;padding:20px;text-align:center;font-size:12px;">Loading...</div>';
    const res = await FC.lineups.public(sort, recent ? "true" : "false", 20);
    let lineups = [];
    if (
      res.success &&
      res.data &&
      res.data.lineups &&
      res.data.lineups.length
    ) {
      lineups = res.data.lineups;
    }
    if (!lineups.length) {
      container.innerHTML =
        '<div style="color:#777;padding:20px;text-align:center;font-size:12px;">No public lineups available yet.</div>';
      const trending = document.querySelector(".trending-formations");
      if (trending) {
        trending.innerHTML =
          '<div style="color:#666;font-size:12px;">No live formation data yet.</div>';
      }
      return;
    }
    container.innerHTML = lineups
      .map((l) => {
        const cards = (l.preview_cards || []).filter(Boolean);
        const displayName = escapeHtml(getLineupDisplayName(l));
        const formation = escapeHtml(getLineupFormation(l));
        const username = escapeHtml(l.username || "Unknown");
        const previewHtml = cards.length
          ? `<div style="display:flex;gap:3px;align-items:center;margin:6px 0;">\n                    ${cards
              .slice(0, 5)
              .map(
                (url) =>
                  `<img src="${url}" loading="lazy" referrerpolicy="no-referrer" style="width:32px;height:45px;object-fit:contain;border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'">`,
              )
              .join("")}\n                  </div>`
          : `<div style="height:45px;display:flex;align-items:center;margin:6px 0;"><span style="color:#444;font-size:10px;">No players yet</span></div>`;
        return `\n            <div class="community-item" style="cursor:pointer;" onclick="FC_LINEUPS.viewCommunity(${l.id},this)">\n                <p class="community-name" style="margin:0 0 2px;">@${username}'s <strong>${displayName}</strong> <span style="font-size:10px;color:#888;">${formation}</span></p>\n                ${previewHtml}\n                <div class="community-stats">\n                    <span>Likes ${l.likes_count}</span><span>Views ${l.views_count}</span>\n                    <span>Chem ${l.chemistry || 0}/33</span>\n                    <button class="fc-btn-sm" onclick="event.stopPropagation();FC.lineups.like(${l.id}).then(r=>r.success&&(this.textContent='Liked'))">Like</button>\n                </div>\n            </div>`;
      })
      .join("");
    const formations = {};
    lineups.forEach((l) => {
      formations[l.formation] = (formations[l.formation] || 0) + 1;
    });
    const trending = document.querySelector(".trending-formations");
    if (trending) {
      const sorted = Object.entries(formations).sort((a, b) => b[1] - a[1]);
      trending.innerHTML = sorted
        .slice(0, 5)
        .map(
          (f, i) =>
            `\n                <div class="formation-badge"><span class="formation-num">${f[0]}</span>\n                <span class="formation-trend">${["Hot", "Rising", "Meta", "Trending", "Sharp"][i] || "-"} ${["Most Used", "Rising", "Popular", "Trending", "Hot"][i] || ""}</span></div>`,
        )
        .join("");
    }
  }
  async function viewCommunity(lineupId, el) {
    if (el) {
      el.style.opacity = "0.6";
    }
    const res = await FC.lineups.view(lineupId);
    if (el) {
      el.style.opacity = "1";
    }
    if (!res.success) return;
    const lineup = res.data.lineup;
    const displayName = escapeHtml(getLineupDisplayName(lineup));
    const formation = escapeHtml(getLineupFormation(lineup));
    const username = escapeHtml(lineup.username || "Unknown");
    const existing = document.getElementById("fc-community-viewer");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.id = "fc-community-viewer";
    modal.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);";
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    const slots = lineup.slots || [];
    const bySlot = {};
    slots.forEach((s) => {
      bySlot[s.slot_code] = s;
    });
    const formationSlots = FORMATIONS[lineup.formation] || FORMATIONS["4-3-3"];
    const filledSlots = formationSlots
      .map((code) => bySlot[code])
      .filter((s) => s && s.name);
    const playerRows = filledSlots
      .map((s) => {
        const c = rarityColor(s.rarity);
        const sImg = s.image_url || "";
        return `<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;border-left:2px solid ${c};">\n                ${sImg ? `<img src="${sImg}" referrerpolicy="no-referrer" style="width:28px;height:${"28px"};object-fit:cover;border-radius:${"50%"};flex-shrink:0;border:1px solid ${c};" onerror="this.style.display='none'">` : `<div style="width:28px;height:28px;border-radius:50%;background:${c}22;border:1px solid ${c};display:flex;align-items:center;justify-content:center;font-size:10px;color:${c};font-weight:900;">${s.overall}</div>`}\n                <div style="flex:1;min-width:0;">\n                    <div style="font-size:12px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.name}</div>\n                    <div style="font-size:9px;color:#555;">${s.slot_code}  -  ${s.club || ""}</div>\n                </div>\n                <div style="font-size:13px;font-weight:900;color:${c};">${s.overall}</div>\n            </div>`;
      })
      .join("");
    modal.innerHTML = `\n        <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 0 60px rgba(0,0,0,0.8);">\n            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);">\n                <div>\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:#fff;">${displayName}</div>\n                    <div style="font-size:11px;color:#555;">@${username} - ${formation} - Chem ${lineup.chemistry || 0}/33</div>\n                </div>\n                <button onclick="document.getElementById('fc-community-viewer').remove()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#888;width:30px;height:30px;border-radius:50%;font-size:14px;cursor:pointer;">X</button>\n            </div>\n            <div style="padding:12px 16px;display:flex;flex-direction:column;gap:6px;">\n                ${playerRows || '<div style="color:#555;padding:20px;text-align:center;">No players in this lineup.</div>'}\n            </div>\n            <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:8px;justify-content:space-between;align-items:center;">\n                <div style="display:flex;gap:12px;font-size:12px;color:#555;">\n                    <span>Likes ${lineup.likes_count || 0}</span>\n                    <span>Views ${lineup.views_count || 0}</span>\n                    <span style="color:${(lineup.rating || 0) >= 80 ? "#6f6" : "#aaa"};">Rating ${parseFloat(lineup.rating || 0).toFixed(1)} OVR</span>\n                </div>\n                <button onclick="FC.lineups.like(${lineup.id}).then(r=>r.success&&(this.textContent='Liked!')).catch(()=>{})" style="background:rgba(255,80,80,0.1);border:1px solid rgba(255,80,80,0.3);color:#f88;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">Like</button>\n            </div>\n        </div>`;
    document.body.appendChild(modal);
  }
  async function openTeamBuilder(lineupId) {
    editingLineupId = lineupId;
    const builder = document.getElementById("fc-team-builder");
    if (!builder) {
      showTeamBuilderModal(lineupId);
      return;
    }
    builder.style.display = "block";
    await loadBuilderData(lineupId);
  }
  async function showTeamBuilderModal(lineupId) {
    let modal = document.getElementById("fc-builder-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fc-builder-modal";
      modal.style.cssText =
        "position:fixed;inset:0;background:#000;z-index:9999;overflow:hidden;display:flex;flex-direction:column;";
      document.body.appendChild(modal);
    }
    modal.innerHTML =
      '<div id="fc-builder-inner" style="width:100%;flex:1;min-height:0;display:flex;flex-direction:column;"><div style="color:#888;text-align:center;padding:40px;font-size:14px;">Loading team builder...</div></div>';
    try {
      const innerDiv = modal.querySelector("#fc-builder-inner");
      if (!innerDiv) {
        modal.innerHTML =
          '<div style="color:#f66;text-align:center;padding:40px;">Error: Failed to initialize builder</div>';
        return;
      }
      await loadBuilderData(lineupId, innerDiv);
    } catch (err) {
      console.error("Builder load error:", err);
      modal.innerHTML =
        '<div style="color:#f66;text-align:center;padding:40px;">Error loading team builder:<br>' +
        (err.message || "Unknown error") +
        "</div>";
    }
  }
  async function loadBuilderData(lineupId, container) {
    try {
      const [lineupsRes, inventoryRes] = await Promise.all([
        FC.lineups.my(),
        FC.inventory.list({ limit: 500, sort: "overall" }),
      ]);
      if (!lineupsRes.success) {
        if (container)
          container.innerHTML =
            '<div style="color:#f66;text-align:center;padding:40px;">Error: Failed to load lineups</div>';
        return;
      }
      const lineup = lineupsRes.data.lineups.find((l) => l.id === lineupId);
      if (!lineup) {
        if (container)
          container.innerHTML =
            '<div style="color:#f66;text-align:center;padding:40px;">Error: Lineup not found</div>';
        return;
      }
      inventoryPlayers = inventoryRes.success ? inventoryRes.data.players : [];
      const target =
        container ||
        document.getElementById("fc-builder-inner") ||
        document.getElementById("fc-team-builder");
      if (!target) {
        console.error("Target container not found for renderBuilder");
        return;
      }
      renderBuilder(target, lineup);
    } catch (err) {
      console.error("loadBuilderData error:", err);
      if (container) {
        container.innerHTML =
          '<div style="color:#f66;text-align:center;padding:40px;">Error loading builder:<br>' +
          err.message +
          "</div>";
      }
    }
  }
  function renderBuilder(target, lineup) {
    try {
      const slots = lineup.slots || [];
      const bySlot = {};
      slots.forEach((s) => {
        bySlot[s.slot_code] = s;
      });
      const formationSlots =
        FORMATIONS[lineup.formation] || FORMATIONS["4-3-3"];
      const chemistry = lineup.chemistry || 0;
      const rating = lineup.rating ? Math.round(lineup.rating) : 0;
      const benchPlayers = getBenchPlayers(lineup);
      const displayName = getLineupDisplayName(lineup);
      const displayNameHtml = escapeHtml(displayName);
      const displayNameUpperHtml = escapeHtml(displayName.toUpperCase());
      const displayInitial = escapeHtml(displayName.charAt(0).toUpperCase());
      const formationHtml = escapeHtml(getLineupFormation(lineup));
      _builderState = {
        lineupId: lineup.id,
        formation: lineup.formation,
        bySlot: bySlot,
      };
      _lastChemData = {
        chemistry: chemistry,
        rating: rating,
        slotChem: {},
        formation: lineup.formation,
        bySlot: bySlot,
      };
      target.innerHTML = `\n        \x3c!-- TOP EXIT BAR --\x3e\n        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:rgba(8,12,20,0.9);border-bottom:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(20px);z-index:100;position:relative;box-shadow:0 4px 30px rgba(0,0,0,0.5);">\n            <div style="display:flex;align-items:center;gap:20px;">\n                <button data-tour="exit-builder" onclick="FC_LINEUPS.closeBuilder()" style="display:flex;align-items:center;gap:10px;background:rgba(255,50,50,0.1);border:1px solid rgba(255,50,50,0.3);color:#ff6b6b;padding:8px 20px;border-radius:10px;font-size:12px;cursor:pointer;font-weight:900;letter-spacing:1px;transition:0.2s;" onmouseenter="this.style.background='rgba(255,50,50,0.2)';this.style.borderColor='#ff6b6b';this.style.transform='translateX(-3px)'" onmouseleave="this.style.background='rgba(255,50,50,0.1)';this.style.borderColor='rgba(255,50,50,0.3)';this.style.transform='translateX(0)'">\n                    <span style="font-size:18px;"><-</span> EXIT BUILDER\n                </button>\n                <div style="height:24px;width:1px;background:rgba(255,255,255,0.1);"></div>\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:#FFD700;letter-spacing:2px;text-shadow:0 0 15px rgba(255,215,0,0.25);">${displayNameUpperHtml}</div>\n            </div>\n            <div style="display:flex;align-items:center;gap:30px;">\n                <div style="text-align:right;">\n                    <div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;letter-spacing:1px;">CHEMISTRY</div>\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:#00d4ff;margin-top:-2px;">${chemistry}/33</div>\n                </div>\n                <div style="text-align:right;">\n                    <div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;letter-spacing:1px;">TEAM RATING</div>\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:#fff;margin-top:-2px;">${rating} <span style="font-size:12px;opacity:0.5;color:#888;"> -  ${formationHtml}</span></div>\n                </div>\n            </div>\n        </div>\n\n        <div style="display:flex;width:100%;flex:1;min-height:0;background:#06080b;overflow:hidden;">\n\n            \x3c!-- LEFT SIDEBAR --\x3e\n            <div style="width:260px;flex-shrink:0;background:linear-gradient(180deg,rgba(10,14,20,0.95),rgba(5,7,12,0.98));backdrop-filter:blur(30px);border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;z-index:40;box-shadow:20px 0 60px rgba(0,0,0,0.6);">\n                <div style="padding:20px;border-bottom:1px solid rgba(255,255,255,0.06);">\n                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">\n                        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#FFD700,#ff9500);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:22px;color:#000;box-shadow:0 8px 16px rgba(255,149,0,0.25);">${displayInitial}</div>\n                        <div style="flex:1;">\n                            <div style="font-weight:800;font-size:14px;color:#fff;letter-spacing:0.5px;">${displayNameHtml}</div>\n                            <div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-top:2px;">SQUAD MANAGEMENT</div>\n                        </div>\n                    </div>\n                    <div style="margin-top:10px;">\n                        <div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.5);font-weight:900;letter-spacing:1px;margin-bottom:6px;">\n                            <span>TEAM CHEMISTRY</span>\n                            <span style="color:#00d4ff;">${chemistry}/33</span>\n                        </div>\n                        <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;">\n                            <div style="height:100%;background:linear-gradient(90deg,#00d4ff,#2afff2);width:${Math.min(100, (chemistry / 33) * 100)}%;box-shadow:0 0 10px rgba(0,212,255,0.5);transition:width 0.8s cubic-bezier(.16,1,.3,1);"></div>\n                        </div>\n                    </div>\n                </div>\n\n                \x3c!-- SELECTORS --\x3e\n                <div data-tour="formation-controls" style="padding:15px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid rgba(255,255,255,0.06);">\n                    <div style="display:flex;gap:8px;">\n                        <select id="fc-formation-select" data-tour="formation-select" style="flex:1;background:#14171d;color:#fff;border:1px solid rgba(255,255,255,0.1);padding:8px 12px;border-radius:8px;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;outline:none;">\n                            ${Object.keys(
        FORMATIONS,
      )
        .map(
          (f) =>
            `<option value="${f}" ${f === lineup.formation ? "selected" : ""}>${f}</option>`,
        )
        .join(
          "",
        )}\n                        </select>\n                        <button onclick="FC_LINEUPS.changeFormation(${lineup.id})" style="background:linear-gradient(135deg,#00d4ff,#009fbf);color:#000;border:none;padding:8px 16px;border-radius:8px;font-size:10px;font-weight:900;cursor:pointer;letter-spacing:1px;box-shadow:0 4px 12px rgba(0,212,255,0.2);">APPLY</button>\n                    </div>\n                    <div style="display:flex;gap:6px;">\n                        <button data-tour="auto-build" onclick="FC_LINEUPS.autoBuild(${lineup.id})" style="flex:1;background:#1a4d2e;color:#bfffcf;border:1px solid #2a6d3e;padding:8px;border-radius:8px;font-size:10px;font-weight:900;cursor:pointer;letter-spacing:1px;" onmouseenter="this.style.background='#22663d'" onmouseleave="this.style.background='#1a4d2e'">AUTO BUILD</button>\n                        <button onclick="FC_LINEUPS.getAdvice(${lineup.id})" style="flex:1;background:#1a1e4d;color:#ccd5ff;border:1px solid #2a2e6d;padding:8px;border-radius:8px;font-size:10px;font-weight:900;cursor:pointer;letter-spacing:1px;" onmouseenter="this.style.background='#222866'" onmouseleave="this.style.background='#1a1e4d'">AI ADVICE</button>\n                        <button onclick="FC_LINEUPS.togglePublic(${lineup.id}, ${!lineup.is_public})" style="background:#14171d;color:#666;border:1px solid rgba(255,255,255,0.1);padding:8px 12px;border-radius:8px;cursor:pointer;">${lineup.is_public ? "PUBLIC" : "PRIVATE"}</button>\n                    </div>\n                </div>\n\n                \x3c!-- BENCH LIST --\x3e\n                <div data-tour="reserves" style="flex:1;overflow-y:auto;padding:10px;scrollbar-width:none;-ms-overflow-style:none;" id="fc-left-player-list">\n                    <style>#fc-left-player-list::-webkit-scrollbar { display: none; }</style>\n                    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 4px 10px 4px;">\n                        <div>\n                            <div style="font-size:10px;color:rgba(255,255,255,0.42);font-weight:900;letter-spacing:1.1px;">BENCH</div>\n                            <div style="font-size:11px;color:rgba(255,255,255,0.24);margin-top:3px;">Drag to the pitch to replace a starter</div>\n                        </div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:#fff;">${benchPlayers.length}</div>\n                    </div>\n                    ${
        benchPlayers.length
          ? benchPlayers
              .map((player) => {
                const color = rarityColor(player.rarity);
                const imageData = getPlayerImageData(player);
                const benchImg = imageData.src;
                return `<div class="fc-bench-row" data-player-id="${player.id}" draggable="true"\n                        onclick="FC_LINEUPS._showBenchPlayer(${player.id})"\n                        ondragstart="FC_LINEUPS._handleBenchDragStart(event, ${player.id}, ${lineup.id})"\n                        ondragend="FC_LINEUPS._handleDragEnd(event)"\n                        ondragover="FC_LINEUPS._handleBenchDragOver(event)"\n                        ondragleave="FC_LINEUPS._handleBenchDragLeave(event)"\n                        ondrop="FC_LINEUPS._handleBenchDrop(event, ${player.id}, ${lineup.id})"\n                        style="padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.03);display:flex;align-items:center;gap:10px;border-radius:10px;cursor:grab;transition:background 0.15s ease,border-color 0.15s ease,transform 0.15s ease;">\n                        ${benchImg ? `<div style="width:34px;height:${"34px"};display:flex;align-items:center;justify-content:center;flex-shrink:0;"><img src="${benchImg}" alt="${player.name}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:${"50%"};border:2px solid ${color};" onerror="this.style.display='none'"></div>` : `<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.03);border:1px dashed ${color};display:flex;align-items:center;justify-content:center;font-size:14px;color:${color};">${player.overall || "?"}</div>`}\n                        <div style="flex:1;min-width:0;">\n                            <div style="font-size:12px;font-weight:800;color:#fff;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${player.name}</div>\n                            <div style="font-size:10px;color:rgba(255,255,255,0.3);font-weight:700;">${player.position} - ${player.overall || "--"} OVR</div>\n                        </div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${color};opacity:0.9;">${player.overall || "--"}</div>\n                    </div>`;
              })
              .join("")
          : `<div style="color:#666;padding:18px 10px;text-align:center;font-size:12px;">No bench players available.<br><span style="font-size:10px;color:#444;">Open chests to add more options.</span></div>`
      }\n                    ${formationSlots
        .map((code) => {
          const s = bySlot[code];
          const hasP = s && s.name;
          const c = hasP ? rarityColor(s.rarity) : "#555";
          const sImg2 = hasP ? s.image_url || "" : "";
          return `<div class="fc-pl-row" id="plrow-${code}" onclick="FC_LINEUPS.openPicker('${code}', ${lineup.id})" style="display:none;padding:10px;border-bottom:1px solid rgba(255,255,255,0.03);align-items:center;gap:12px;">\n                        ${hasP && sImg2 ? `<div style="width:34px;height:34px;border-radius:50%;border:2px solid ${c};padding:1px;"><img src="${sImg2}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>` : `<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:14px;color:rgba(255,255,255,0.15);">+</div>`}\n                        <div style="flex:1;">\n                            <div style="font-size:12px;font-weight:800;color:${hasP ? "#fff" : "rgba(255,255,255,0.2)"};text-transform:uppercase;">${hasP ? s.name : "Select Player"}</div>\n                            <div style="font-size:10px;color:rgba(255,255,255,0.3);font-weight:700;">${code}${hasP ? "  -  " + s.overall + " OVR" : ""}</div>\n                        </div>\n                        ${hasP ? `<div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${c}; opacity:0.8;">${s.overall}</div>` : ""}\n                    </div>`;
        })
        .join(
          "",
        )}\n                </div>\n\n                \x3c!-- ID RESTORED: AI Advice box (Sidebar Home) --\x3e\n                <div id="fc-advice-box" style="display:none;padding:15px;background:rgba(0,180,255,0.05);backdrop-filter:blur(20px);border-top:1px solid rgba(0,212,255,0.3);font-size:11px;color:#ddd;max-height:220px;overflow-y:auto;line-height:1.5;scrollbar-width:none;-ms-overflow-style:none;">\n                    <style>#fc-advice-box::-webkit-scrollbar { display: none; }</style>\n                </div>\n            </div>\n\n            \x3c!-- CENTER PITCH AREA --\x3e\n            <div data-tour="lineup-pitch" style="flex:1;position:relative;background:#080a0f;overflow:hidden;perspective:1000px;" id="fc-pitch-bg">\n                \x3c!-- PITCH BACKGROUND ELEMENTS --\x3e\n                <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%, #1a5c2a 0%, #0d3a18 40%, #071d0c 100%);"></div>\n                \x3c!-- VIGNETTE --\x3e\n                <div style="position:absolute;inset:0;box-shadow:inset 0 0 150px rgba(0,0,0,0.8);"></div>\n                \n                \x3c!-- STADIUM LIGHTS GLOW --\x3e\n                <div style="position:absolute;top:-50px;left:-50px;width:300px;height:300px;background:radial-gradient(circle,rgba(255,255,255,0.03) 0%,transparent 70%);filter:blur(30px);"></div>\n                <div style="position:absolute;top:-50px;right:-50px;width:300px;height:300px;background:radial-gradient(circle,rgba(255,255,255,0.03) 0%,transparent 70%);filter:blur(30px);"></div>\n\n                \x3c!-- Pitch markings SVG --\x3e\n                <svg style="position:absolute;inset:4% 6%;width:88%;height:92%;pointer-events:none;" viewBox="0 0 100 100" preserveAspectRatio="none">\n                    <defs>\n                        <filter id="markGlow" x="-50%" y="-50%" width="200%" height="200%">\n                            <feGaussianBlur stdDeviation="0.4" result="blur"/>\n                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>\n                        </filter>\n                    </defs>\n                    \x3c!-- Borders and lines --\x3e\n                    <rect x="0" y="0" width="100" height="100" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.3" filter="url(#markGlow)"/>\n                    <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.2)" stroke-width="0.3" filter="url(#markGlow)"/>\n                    <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.3" filter="url(#markGlow)"/>\n                    <rect x="25" y="0" width="50" height="16" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>\n                    <rect x="25" y="84" width="50" height="16" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>\n                    <circle cx="50" cy="11" r="0.5" fill="rgba(255,255,255,0.25)"/>\n                    <circle cx="50" cy="89" r="0.5" fill="rgba(255,255,255,0.25)"/>\n                </svg>\n\n                \x3c!-- Chemistry lines --\x3e\n                <svg id="fc-chem-lines" viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;"></svg>\n\n                \x3c!-- PLAYER SLOTS (Classic Vertical Cards) --\x3e\n        ${formationSlots
        .map((code) => {
          const pos = PITCH_POSITIONS[code] || { x: 50, y: 50 };
          const slot = bySlot[code];
          const hasPlayer = !!(slot && slot.name);
          const imageData = hasPlayer
            ? getPlayerImageData(slot)
            : { src: "", fallback: "" };
          const slotImg = imageData.src;
          const slotImgFallback = imageData.fallback;
          const hasCardArt = false;
          const c = hasPlayer
            ? rarityColor(slot.rarity)
            : "rgba(255,255,255,0.1)";
          return `\n                <div class="fc-classic-card ${hasPlayer ? "full" : "empty"} ${hasCardArt ? "has-art" : "fallback"}" data-slot="${code}"\n                     onclick="FC_LINEUPS._handleSlotClick(event,'${code}',${lineup.id},${hasPlayer})"\n                     draggable="${hasPlayer ? "true" : "false"}"\n                     ondragstart="${hasPlayer ? `FC_LINEUPS._handleSlotDragStart(event,'${code}',${lineup.id})` : ""}"\n                     ondragend="FC_LINEUPS._handleDragEnd(event)"\n                     ondragover="FC_LINEUPS._handleSlotDragOver(event)"\n                     ondragleave="FC_LINEUPS._handleSlotDragLeave(event)"\n                     ondrop="FC_LINEUPS._handleSlotDrop(event,'${code}',${lineup.id})"\n                     style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%);z-index:10;width:${hasCardArt ? PITCH_CARD_WIDTH : hasPlayer ? PITCH_CARD_FALLBACK_WIDTH : PITCH_EMPTY_SIZE}px;min-height:${hasCardArt ? Math.round(PITCH_CARD_WIDTH * 1.42) : hasPlayer ? 72 : PITCH_EMPTY_SIZE}px;">\n\n                     ${hasCardArt && slotImg ? `\n                        <img class="fc-classic-card-art" src="${slotImg}" ${slotImgFallback ? `data-fallback-src="${slotImgFallback}"` : ""} onerror="if(this.dataset.fallbackSrc && this.src !== this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;delete this.dataset.fallbackSrc;return;}this.style.display='none';" style="width:${PITCH_CARD_WIDTH}px;max-width:${PITCH_CARD_WIDTH}px;height:auto;">\n                        <div class="fc-classic-card-meta">\n                            <div class="fc-classic-slot-tag">${code}</div>\n                            <div id="chem-dots-${code}" class="fc-classic-chem-dots">\n                                <div class="fc-chem-dot" style="width:4px;height:4px;"></div><div class="fc-chem-dot" style="width:4px;height:4px;"></div><div class="fc-chem-dot" style="width:4px;height:4px;"></div>\n                            </div>\n                        </div>\n                     ` : hasPlayer ? `\n                        <div class="fc-fallback-player" style="width:${PITCH_CARD_FALLBACK_WIDTH}px;border-color:${c};box-shadow:0 14px 24px ${c}22;">\n                            <div class="fc-fallback-rating" style="color:${c};">${slot.overall || ""}</div>\n                            ${slotImg ? `\n                            <img class="fc-fallback-face" src="${slotImg}" ${slotImgFallback ? `data-fallback-src="${slotImgFallback}"` : ""} onerror="if(this.dataset.fallbackSrc && this.src !== this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;delete this.dataset.fallbackSrc;return;}this.outerHTML='<div class=&quot;fc-fallback-face-placeholder&quot; style=&quot;width:${Math.round(PITCH_CARD_FALLBACK_WIDTH * 0.7)}px;height:${Math.round(PITCH_CARD_FALLBACK_WIDTH * 0.7)}px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%, rgba(255,255,255,0.18), rgba(255,255,255,0.05) 55%, rgba(0,0,0,0.12) 100%);border:2px solid ${c};color:${c};font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;&quot;>${(slot.position || code || "").toUpperCase()}</div>';" style="width:${Math.round(PITCH_CARD_FALLBACK_WIDTH * 0.7)}px;height:${Math.round(PITCH_CARD_FALLBACK_WIDTH * 0.7)}px;">\n                            ` : `\n                            <div class="fc-fallback-face-placeholder" style="width:${Math.round(PITCH_CARD_FALLBACK_WIDTH * 0.7)}px;height:${Math.round(PITCH_CARD_FALLBACK_WIDTH * 0.7)}px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%, rgba(255,255,255,0.18), rgba(255,255,255,0.05) 55%, rgba(0,0,0,0.12) 100%);border:2px solid ${c};color:${c};font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">${(slot.position || code || "").toUpperCase()}</div>\n                            `}\n                            <div class="fc-fallback-name">${slot.name.split(" ").pop().toUpperCase()}</div>\n                            <div id="chem-dots-${code}" class="fc-classic-chem-dots">\n                                <div class="fc-chem-dot" style="width:4px;height:4px;"></div><div class="fc-chem-dot" style="width:4px;height:4px;"></div><div class="fc-chem-dot" style="width:4px;height:4px;"></div>\n                            </div>\n                        </div>\n                     ` : `\n                        <div class="fc-empty-slot-ring" style="width:${PITCH_EMPTY_SIZE}px;height:${PITCH_EMPTY_SIZE}px;border-color:${c};color:${c};">\n                            <span>+</span>\n                            <small>${code}</small>\n                        </div>\n                     `}\n                </div>`;
        })
        .join(
          "",
        )}\n\n                \x3c!-- FORMATION LABEL --\x3e\n                <div style="position:absolute;bottom:30px;left:50%;transform:translateX(-50%);font-family:'Bebas Neue',sans-serif;font-size:100px;color:rgba(255,255,255,0.03);letter-spacing:10px;pointer-events:none;">\n                    ${formationHtml}\n                </div>\n            </div>\n\n            \x3c!-- RIGHT CONTROL PANEL --\x3e\n            <div style="width:280px;flex-shrink:0;background:linear-gradient(180deg,rgba(10,14,20,0.95),rgba(5,7,12,0.98));backdrop-filter:blur(30px);border-left:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;z-index:40;">\n                <div style="padding:20px 20px 10px;border-bottom:1px solid rgba(255,255,255,0.06);">\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:#aaa;letter-spacing:2px;margin-bottom:10px;">TEAM ANALYSIS</div>\n                    <div id="fc-right-tabs" style="display:flex;padding:3px;background:rgba(0,0,0,0.3);border-radius:8px;">\n                        <button id="fc-tab-chem" onclick="FC_LINEUPS._showChemTab()" style="flex:1;background:#00d4ff;color:#000;border:none;padding:8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:900;">CHEMISTRY</button>\n                        <button id="fc-tab-player" style="flex:1;background:transparent;color:#555;border:none;padding:8px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:900;" disabled>PLAYER</button>\n                    </div>\n                </div>\n                <div id="fc-selected-player" style="flex:1;overflow-y:auto;padding:20px;"></div>\n            </div>\n        </div>`;
      requestAnimationFrame(async () => {
        drawChemLines(lineup.formation, bySlot, {});
        const chemRes = await FC.team.chemistry(lineup.id);
        if (chemRes.success) {
          const {
            chemistry: chemistry,
            rating: rating,
            slot_chemistry: slot_chemistry,
          } = chemRes.data;
          _lastChemData = {
            chemistry: chemistry,
            rating: rating,
            slotChem: slot_chemistry || {},
            formation: lineup.formation,
            bySlot: bySlot,
          };
          drawChemLines(lineup.formation, bySlot, slot_chemistry || {});
          updateChemDots(slot_chemistry || {});
          showChemStats(
            chemistry,
            rating,
            slot_chemistry || {},
            lineup.formation,
            bySlot,
          );
        }
        window.dispatchEvent(
          new CustomEvent("fc:lineup-builder-mounted", {
            detail: {
              lineup_id: lineup.id,
            },
          }),
        );
      });
      if (_swapSource) {
        const src = target.querySelector(
          `.fc-slot-shield-card[data-slot="${_swapSource.code}"]`,
        );
        if (src)
          src.style.filter = "brightness(1.3) drop-shadow(0 0 10px #f90)";
      }
    } catch (err) {
      console.error("renderBuilder error:", err);
      target.innerHTML =
        '<div style="color:#f66;text-align:center;padding:40px;">Error rendering builder:<br>' +
        err.message +
        "</div>";
    }
  }
  function showSelectedPlayer(slot) {
    const panel = document.getElementById("fc-selected-player");
    if (!panel) return;
    const c = rarityColor(slot.rarity);
    const imageData = getPlayerImageData(slot, false);
    const positionLabel = slot.position_required || slot.position || "--";
    const {
      stats: stats,
      statsUnavailable: statsUnavailable,
      statsWarning: statsWarning,
    } = getDisplayStats(slot);
    panel.innerHTML = `\n            <div style="display:flex;gap:15px;margin-bottom:20px;position:relative;">\n                <div style="border-left:3px solid ${c}; padding-left:12px;">\n                    <img src="${imageData.src}" ${imageData.fallback ? `data-fallback-src="${imageData.fallback}"` : ""} onerror="if(this.dataset.fallbackSrc && this.src !== this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;delete this.dataset.fallbackSrc;return;}this.style.display='none';" style="width:60px;height:60px;object-fit:cover;border-radius:50%;border:2px solid ${c};padding:2px;display:block;margin-bottom:8px;">\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:#fff;line-height:1;">${slot.name.toUpperCase()}</div>\n                    <div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;margin-top:2px;">${slot.club}  -  ${slot.nation}</div>\n                    <div style="display:inline-block;margin-top:8px;padding:2px 8px;background:${c}22;border:1px solid ${c}44;border-radius:20px;font-size:9px;font-weight:900;color:${c};">${slot.rarity.toUpperCase()}</div>\n                </div>\n                <div style="flex:1;text-align:right;display:flex;flex-direction:column;justify-content:center;">\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:${c};line-height:1;margin-top:-5px;">${slot.overall}</div>\n                    <div style="font-size:11px;color:rgba(255,255,255,0.3);font-weight:900;margin-top:4px;text-transform:uppercase;letter-spacing:1.5px;">${positionLabel}</div>\n                </div>\n            </div>\n\n            \x3c!-- STAT BLOCK STACK --\x3e\n            <div style="display:flex;flex-direction:column;gap:8px;">\n                ${stats
      .map(([lbl, val]) => {
        const statC =
          val == null
            ? "#777"
            : val >= 85
              ? "#00ffa3"
              : val >= 75
                ? "#FFD700"
                : val >= 60
                  ? "#4fc3f7"
                  : "#ff4d4d";
        return `\n                    <div style="background:rgba(255,255,255,0.03);padding:10px 15px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">\n                        <span style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:900;letter-spacing:1px;">${lbl}</span>\n                        <div style="display:flex;align-items:center;gap:12px;">\n                           <div style="width:40px;height:2px;background:rgba(255,255,255,0.05);border-radius:1px;overflow:hidden;">\n                                <div style="height:100%;width:${val == null ? 0 : Math.round(Math.min(100, (val / 99) * 100))}%;background:${statC};"></div>\n                           </div>\n                           <span style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:${statC};width:25px;text-align:right;">${val == null ? "--" : val}</span>\n                        </div>\n                    </div>`;
      })
      .join(
        "",
      )}\n            </div>\n\n            ${statsUnavailable ? `<div style="margin-top:10px;font-size:10px;color:#777;line-height:1.5;">This card does not have face stats in the current dataset yet.</div>` : ""}\n            ${!statsUnavailable && statsWarning ? `<div style="margin-top:10px;font-size:10px;color:#777;line-height:1.5;">${statsWarning}</div>` : ""}\n\n            <button data-tour="player-stats" onclick="FC_PLAYERS.showDetail(${slot.player_id})" style="width:100%;margin-top:20px;background:#fff;color:#000;border:none;padding:14px;border-radius:10px;font-size:12px;cursor:pointer;font-weight:900;letter-spacing:1px;transition:0.2s;text-transform:uppercase;" onmouseenter="this.style.transform='scale(1.02)'" onmouseleave="this.style.transform='scale(1)'">View Full Breakdown</button>\n        `;
  }
  function drawChemLines(formation, bySlot, slotChem) {
    const svg = document.getElementById("fc-chem-lines");
    if (!svg) return;
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    const lines = getFormationLines(formation);
    let svgContent = "";
    lines.forEach(([a, b]) => {
      const posA = PITCH_POSITIONS[a];
      const posB = PITCH_POSITIONS[b];
      if (!posA || !posB) return;
      const slotA = bySlot[a];
      const slotB = bySlot[b];
      let hasLink = false;
      let lineColor = "rgba(255,255,255,0.12)";
      let lineWidth = "0.35";
      let glowFilter = "";
      if (slotA && slotA.name && slotB && slotB.name) {
        hasLink = true;
        if (slotA.club && slotA.club === slotB.club) {
          lineColor = "#00ffa3";
          lineWidth = "0.8";
          glowFilter = "url(#chemGlow)";
        } else if (slotA.nation && slotA.nation === slotB.nation) {
          lineColor = "#FFD700";
          lineWidth = "0.6";
          glowFilter = "url(#chemGlow)";
        } else if (slotA.league && slotA.league === slotB.league) {
          lineColor = "#00d4ff";
          lineWidth = "0.5";
          glowFilter = "url(#chemGlow)";
        } else {
          lineColor = "rgba(255,255,255,0.15)";
          lineWidth = "0.3";
          glowFilter = "";
        }
      } else {
        lineColor = "rgba(255,255,255,0.06)";
        lineWidth = "0.25";
      }
      const x1 = posA.x;
      const y1 = posA.y;
      const x2 = posB.x;
      const y2 = posB.y;
      svgContent += `\n                <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"\n                    stroke="${lineColor}" stroke-width="${lineWidth}"\n                    stroke-linecap="round"\n                    filter="${glowFilter || "none"}"/>`;
    });
    svg.innerHTML = `\n            <defs>\n                <filter id="chemGlow" x="-100%" y="-100%" width="300%" height="300%">\n                    <feGaussianBlur stdDeviation="0.6" result="blur"/>\n                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>\n                </filter>\n            </defs>\n            <g>${svgContent}</g>`;
  }
  function updateChemDots(slotChem) {
    Object.entries(slotChem).forEach(([code, val]) => {
      const dots = document.getElementById(`chem-dots-${code}`);
      if (!dots) return;
      const dotEls = dots.children;
      const color = val >= 3 ? "#00ffa3" : val >= 1 ? "#FFD700" : "#ff4d4d";
      const glow =
        val >= 3
          ? "0 0 8px rgba(0,255,163,0.6)"
          : val >= 1
            ? "0 0 8px rgba(255,215,0,0.5)"
            : "none";
      for (let i = 0; i < 3; i++) {
        const dot = dotEls[i];
        if (!dot) continue;
        if (i < val) {
          dot.style.background = color;
          dot.style.boxShadow = glow;
          dot.style.opacity = "1";
        } else {
          dot.style.background = "rgba(255,255,255,0.1)";
          dot.style.boxShadow = "none";
          dot.style.opacity = "0.3";
        }
      }
    });
  }
  function showChemStats(chemistry, rating, slotChem, formation, bySlot) {
    const panel = document.getElementById("fc-selected-player");
    if (!panel) return;
    const formationSlots = FORMATIONS[formation] || FORMATIONS["4-3-3"];
    const total = Math.round(chemistry);
    const maxChem = 33;
    const chemPct = Math.round(Math.min(100, (total / maxChem) * 100));
    const chemColor =
      total >= 30
        ? "#6f6"
        : total >= 20
          ? "#FFD700"
          : total >= 10
            ? "#fa0"
            : "#f44";
    let greenLinks = 0,
      goldLinks = 0,
      cyanLinks = 0;
    const lines = getFormationLines(formation);
    lines.forEach(([a, b]) => {
      const sA = bySlot[a],
        sB = bySlot[b];
      if (!sA?.name || !sB?.name) return;
      if (sA.club && sA.club === sB.club) greenLinks++;
      else if (sA.nation && sA.nation === sB.nation) goldLinks++;
      else if (sA.league && sA.league === sB.league) cyanLinks++;
    });
    panel.innerHTML = `\n            \x3c!-- Chemistry overview header --\x3e\n            <div style="text-align:center;padding:8px 0 12px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:10px;">\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:11px;color:#888;letter-spacing:1px;margin-bottom:6px;">TEAM CHEMISTRY</div>\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:${chemColor};line-height:1;text-shadow:0 0 20px ${chemColor}66;">${total}</div>\n                <div style="font-size:10px;color:#555;margin-top:2px;">/ ${maxChem} MAX</div>\n                <div style="margin-top:8px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;">\n                    <div style="height:100%;width:${chemPct}%;background:${chemColor};border-radius:2px;box-shadow:0 0 8px ${chemColor};transition:width 0.5s;"></div>\n                </div>\n            </div>\n\n            \x3c!-- Rating --\x3e\n            <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);margin-bottom:8px;">\n                <span style="font-size:10px;color:#888;font-weight:700;text-transform:uppercase;">Team Rating</span>\n                <span style="font-size:16px;font-weight:900;color:#4fc3f7;">${Math.round(rating)}</span>\n            </div>\n\n            \x3c!-- Chemistry link breakdown --\x3e\n            <div style="margin-bottom:10px;">\n                <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">Chemistry Links</div>\n                <div style="display:flex;gap:4px;justify-content:space-between;">\n                    <div style="flex:1;background:rgba(80,255,120,0.1);border:1px solid rgba(80,255,120,0.25);border-radius:6px;padding:5px;text-align:center;">\n                        <div style="font-size:14px;font-weight:900;color:#50ff78;">${greenLinks}</div>\n                        <div style="font-size:8px;color:#555;">Club</div>\n                    </div>\n                    <div style="flex:1;background:rgba(255,210,0,0.1);border:1px solid rgba(255,210,0,0.25);border-radius:6px;padding:5px;text-align:center;">\n                        <div style="font-size:14px;font-weight:900;color:#FFD700;">${goldLinks}</div>\n                        <div style="font-size:8px;color:#555;">Nation</div>\n                    </div>\n                    <div style="flex:1;background:rgba(0,180,255,0.1);border:1px solid rgba(0,180,255,0.25);border-radius:6px;padding:5px;text-align:center;">\n                        <div style="font-size:14px;font-weight:900;color:#00b4ff;">${cyanLinks}</div>\n                        <div style="font-size:8px;color:#555;">League</div>\n                    </div>\n                </div>\n            </div>\n\n            \x3c!-- Per-player chemistry --\x3e\n            <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">Player Chemistry</div>\n            <div style="display:flex;flex-direction:column;gap:3px;">\n                ${formationSlots
      .map((code) => {
        const slot = bySlot[code];
        if (!slot?.name) return "";
        const val = slotChem[code] || 0;
        const c =
          val >= 3 ? "#6f6" : val >= 2 ? "#FFD700" : val >= 1 ? "#fa0" : "#f44";
        return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;">\n                        <div style="font-size:9px;color:#555;width:30px;flex-shrink:0;">${code}</div>\n                        <div style="font-size:9px;color:#aaa;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${slot.name.split(" ").pop()}</div>\n                        <div style="display:flex;gap:2px;">\n                            ${[0, 1, 2].map((i) => `<div style="width:7px;height:7px;border-radius:50%;background:${i < val ? c : "rgba(255,255,255,0.1)"};border:1px solid ${i < val ? c : "rgba(255,255,255,0.15)"};box-shadow:${i < val ? "0 0 4px " + c : "none"};"></div>`).join("")}\n                        </div>\n                        <div style="font-size:9px;font-weight:900;color:${c};width:10px;">${val}</div>\n                    </div>`;
      })
      .filter(Boolean)
      .join(
        "",
      )}\n            </div>\n\n            \x3c!-- Legend --\x3e\n            <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);font-size:8px;color:#444;line-height:1.6;">\n                <div style="color:#50ff78;">* Club link</div>\n                <div style="color:#FFD700;">* Nation link</div>\n                <div style="color:#00b4ff;">* League link</div>\n            </div>\n        `;
  }
  async function refreshChemistry(lineupId) {
    const res = await FC.team.chemistry(lineupId);
    if (!res.success) return;
    const {
      chemistry: chemistry,
      rating: rating,
      slot_chemistry: slot_chemistry,
    } = res.data;
    const chemVal = document.getElementById("fc-chem-value");
    const chemBar = document.getElementById("fc-chem-bar");
    const ratingVal = document.getElementById("fc-rating-value");
    if (chemVal) chemVal.textContent = chemistry;
    if (chemBar) chemBar.style.width = chemistry + "%";
    if (ratingVal) ratingVal.textContent = Math.round(rating) || 0;
  }
  function _handleSlotClick(event, code, lineupId, hasPlayer) {
    event.stopPropagation();
    clearBuilderSelections();
    if (!hasPlayer) {
      _showChemTab();
      return;
    }
    const slot = getBuilderSlot(code);
    if (slot) {
      showSelectedPlayer(slot);
      activatePlayerTab();
      const el = document.querySelector(
        `.fc-classic-card[data-slot="${code}"]`,
      );
      if (el) el.classList.add("selected-slot");
    }
  }
  function _showBenchPlayer(playerId) {
    const player = inventoryPlayers.find((p) => p.id === playerId);
    if (!player) return;
    clearBuilderSelections();
    showSelectedPlayer({ ...player, position_required: player.position });
    activatePlayerTab();
    const el = document.querySelector(
      `.fc-bench-row[data-player-id="${playerId}"]`,
    );
    if (el) el.classList.add("selected-bench");
  }
  function _handleSlotDragStart(event, code, lineupId) {
    const slot = getBuilderSlot(code);
    if (!slot?.player_id) {
      event.preventDefault();
      return;
    }
    _dragItem = {
      type: "slot",
      slotCode: code,
      lineupId: lineupId,
      playerId: slot.player_id,
    };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(_dragItem));
    event.currentTarget?.classList.add("dragging");
  }
  function _handleBenchDragStart(event, playerId, lineupId) {
    _dragItem = { type: "bench", playerId: playerId, lineupId: lineupId };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(_dragItem));
    event.currentTarget?.classList.add("dragging");
  }
  function _handleDragEnd(event) {
    event?.currentTarget?.classList.remove("dragging");
    clearBuilderSelections();
    _dragItem = null;
  }
  function _handleSlotDragOver(event) {
    const payload = getDragPayload(event);
    if (!payload) return;
    event.preventDefault();
    event.currentTarget?.classList.add("drop-target");
  }
  function _handleSlotDragLeave(event) {
    event.currentTarget?.classList.remove("drop-target");
  }
  async function _handleSlotDrop(event, slotCode, lineupId) {
    event.preventDefault();
    const payload = getDragPayload(event);
    event.currentTarget?.classList.remove("drop-target");
    if (!payload) return;
    if (payload.type === "slot") {
      if (payload.slotCode !== slotCode)
        await _executeSwap(payload.slotCode, slotCode, lineupId);
    } else if (payload.type === "bench" && payload.playerId) {
      await _replaceSlotPlayer(lineupId, slotCode, payload.playerId);
    }
    _dragItem = null;
  }
  function _handleBenchDragOver(event) {
    const payload = getDragPayload(event);
    if (!payload || payload.type !== "slot") return;
    event.preventDefault();
    event.currentTarget?.classList.add("drop-target");
  }
  function _handleBenchDragLeave(event) {
    event.currentTarget?.classList.remove("drop-target");
  }
  async function _handleBenchDrop(event, playerId, lineupId) {
    event.preventDefault();
    const payload = getDragPayload(event);
    event.currentTarget?.classList.remove("drop-target");
    if (!payload || payload.type !== "slot" || !payload.slotCode) return;
    await _replaceSlotPlayer(lineupId, payload.slotCode, playerId);
    _dragItem = null;
  }
  async function _replaceSlotPlayer(lineupId, slotCode, playerId) {
    try {
      const res = await FC.lineups.update({
        lineup_id: lineupId,
        slots: [{ slot_code: slotCode, player_id: playerId }],
      });
      showChallengeUpdates(res);
      if (editingLineupId) await loadBuilderData(editingLineupId);
    } catch (e) {
      console.error("Replace failed", e);
    }
  }
  function _showContextMenu(event, code, lineupId) {
    const menu = document.createElement("div");
    menu.id = "fc-ctx-menu";
    menu.style.cssText = `\n            position:fixed;z-index:99999;\n            background:linear-gradient(145deg,#1a1a2e,#16213e);\n            border:1px solid rgba(255,215,0,0.3);border-radius:10px;\n            box-shadow:0 8px 32px rgba(0,0,0,0.7);\n            padding:6px 0;min-width:165px;\n            font-family:'Inter',sans-serif;font-size:13px;\n        `;
    const x = Math.min(event.clientX, window.innerWidth - 180);
    const y = Math.min(event.clientY, window.innerHeight - 160);
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    const items = [
      {
        icon: "EDIT",
        label: "Change Player",
        action: () => {
          _closeContextMenu();
          openPicker(code, lineupId);
        },
      },
      {
        icon: "SWAP",
        label: "Swap Position",
        action: () => {
          _closeContextMenu();
          _enterSwapMode(code, lineupId);
        },
      },
      {
        icon: "DELETE",
        label: "Remove Player",
        action: () => {
          _closeContextMenu();
          clearSlot(code, lineupId);
        },
      },
    ];
    items.forEach((item) => {
      const btn = document.createElement("div");
      btn.innerHTML = `<span style="margin-right:8px;">${item.icon}</span>${item.label}`;
      btn.style.cssText =
        "padding:9px 16px;cursor:pointer;color:#ddd;display:flex;align-items:center;transition:background 0.1s;";
      btn.onmouseenter = () => (btn.style.background = "rgba(255,215,0,0.1)");
      btn.onmouseleave = () => (btn.style.background = "");
      btn.onclick = (e) => {
        e.stopPropagation();
        item.action();
      };
      menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    setTimeout(
      () =>
        document.addEventListener("click", _closeContextMenu, { once: true }),
      10,
    );
  }
  function _closeContextMenu() {
    const m = document.getElementById("fc-ctx-menu");
    if (m) m.remove();
  }
  function _enterSwapMode(code, lineupId) {
    const data = _lastChemData;
    const player_id =
      data && data.bySlot && data.bySlot[code]
        ? data.bySlot[code].player_id
        : null;
    _swapSource = { code: code, player_id: player_id, lineupId: lineupId };
    document.querySelectorAll(".fc-slot-card").forEach((s) => {
      s.style.filter =
        s.dataset.slot === code
          ? "brightness(1.3) drop-shadow(0 0 12px #f90)"
          : "brightness(0.75)";
    });
    const toast = document.createElement("div");
    toast.id = "fc-swap-toast";
    toast.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:linear-gradient(90deg,#f90,#ffd700);color:#000;font-weight:700;font-size:13px;padding:10px 22px;border-radius:50px;z-index:99998;box-shadow:0 4px 20px rgba(255,150,0,0.5);pointer-events:none;";
    toast.textContent = "SWAP Select a position to swap with  (Esc to cancel)";
    document.body.appendChild(toast);
  }
  function _cancelSwap() {
    _swapSource = null;
    document
      .querySelectorAll(".fc-slot-card")
      .forEach((s) => (s.style.filter = ""));
    const t = document.getElementById("fc-swap-toast");
    if (t) t.remove();
  }
  async function _executeSwap(codeA, codeB, lineupId) {
    _dragItem = null;
    clearBuilderSelections();
    const slotA = getBuilderSlot(codeA);
    const slotB = getBuilderSlot(codeB);
    if (!slotA && !slotB) return;
    const pidA = (slotA && slotA.player_id) || null;
    const pidB = (slotB && slotB.player_id) || null;
    try {
      const res = await FC.lineups.update({
        lineup_id: lineupId,
        slots: [
          { slot_code: codeA, player_id: pidB },
          { slot_code: codeB, player_id: pidA },
        ],
      });
      showChallengeUpdates(res);
      if (editingLineupId) await loadBuilderData(editingLineupId);
    } catch (e) {
      console.error("Swap failed", e);
    }
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      _closeContextMenu();
      if (_swapSource) _cancelSwap();
    }
  });
  function openPicker(slotCode, lineupId) {
    currentSlotTarget = { slotCode: slotCode, lineupId: lineupId };
    let modal = document.getElementById("fc-picker-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fc-picker-modal";
      modal.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;";
      document.body.appendChild(modal);
    }
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    const posGroup = getPositionGroup(slotCode);
    const relevant = inventoryPlayers
      .filter((p) => posGroup.includes(p.position) || posGroup.length === 0)
      .sort((a, b) => b.overall - a.overall);
    modal.innerHTML = `\n        <div style="background:#0d1520;border:1px solid rgba(0,212,255,0.25);border-radius:16px;width:100%;max-width:640px;max-height:82vh;overflow-y:auto;padding:20px;box-shadow:0 0 40px rgba(0,212,255,0.1);">\n            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">\n                <div>\n                    <h3 style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:#00d4ff;margin:0;">SELECT PLAYER</h3>\n                    <div style="font-size:11px;color:#555;margin-top:2px;">Slot: ${slotCode}  -  ${relevant.length} available</div>\n                </div>\n                <div style="display:flex;gap:8px;">\n                    <button style="background:#2a0a0a;color:#f66;border:1px solid #4a1a1a;padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;" onclick="FC_LINEUPS.clearSlot('${slotCode}', ${lineupId})">Clear Slot</button>\n                    <button style="background:#1a1a1a;color:#888;border:1px solid #333;padding:6px 12px;border-radius:6px;cursor:pointer;" onclick="document.getElementById('fc-picker-modal').remove()">X</button>\n                </div>\n            </div>\n            <input id="fc-picker-search" type="text" placeholder="Search by name..." style="width:100%;background:#111;border:1px solid rgba(0,212,255,0.2);color:#fff;padding:8px 12px;border-radius:8px;margin-bottom:12px;font-size:13px;box-sizing:border-box;" oninput="FC_LINEUPS.filterPickerList(this.value)">\n            <div id="fc-picker-list" style="display:flex;flex-direction:column;gap:6px;">\n                ${relevant.length === 0 ? '<div style="color:#555;padding:30px;text-align:center;font-size:13px;">No players in inventory for this position.<br><span style="color:#888;font-size:11px;">Open chests or use Auto-Build to add players.</span></div>' : relevant.map((p) => pickerRow(p, slotCode, lineupId)).join("")}\n            </div>\n        </div>`;
  }
  function pickerRow(p, slotCode, lineupId) {
    const color = rarityColor(p.rarity);
    const pImg = p.image_url || "";
    const thumbHtml = pImg
      ? `<img src="${pImg}" alt="${p.name}" loading="lazy" referrerpolicy="no-referrer" style="width:44px;height:${"44px"};object-fit:cover;border-radius:${"50%"};flex-shrink:0;border:1px solid ${color};" onerror="this.style.display='none'">`
      : `<div style="width:44px;height:62px;border-radius:4px;background:rgba(255,255,255,0.04);border:1px solid ${color};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;"><div style="font-size:16px;font-weight:900;color:${color};line-height:1;">${p.overall}</div><div style="font-size:8px;color:#888;">${p.position}</div></div>`;
    return `<div class="picker-row" data-name="${p.name.toLowerCase()}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:8px;cursor:pointer;transition:background 0.12s;border-left:2px solid ${color};" onmouseenter="this.style.background='rgba(0,212,255,0.07)'" onmouseleave="this.style.background='rgba(255,255,255,0.03)'" onclick="FC_LINEUPS.selectPlayer(${p.id}, '${slotCode}', ${lineupId})">\n            ${thumbHtml}\n            <div style="flex:1;min-width:0;">\n                <div style="font-weight:700;font-size:13px;color:#fff;">${p.name}</div>\n                <div style="font-size:10px;color:#666;">${p.club}  -  ${p.nation}</div>\n            </div>\n            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;font-size:9px;text-align:center;color:#aaa;flex-shrink:0;">\n                <div><div style="color:#ddd;font-weight:700;">${p.pace}</div><div style="color:#555;">PAC</div></div>\n                <div><div style="color:#ddd;font-weight:700;">${p.shooting}</div><div style="color:#555;">SHO</div></div>\n                <div><div style="color:#ddd;font-weight:700;">${p.passing}</div><div style="color:#555;">PAS</div></div>\n            </div>\n            <button onclick="event.stopPropagation();FC_PLAYERS.showDetail(${p.id})" title="Full details"\n                style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);color:#00d4ff;width:26px;height:26px;border-radius:50%;font-size:12px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;">i</button>\n        </div>`;
  }
  function filterPickerList(query) {
    document.querySelectorAll(".picker-row").forEach((row) => {
      row.style.display = row.dataset.name.includes(query.toLowerCase())
        ? ""
        : "none";
    });
  }
  async function selectPlayer(playerId, slotCode, lineupId) {
    const res = await FC.lineups.update({
      lineup_id: lineupId,
      slots: [{ slot_code: slotCode, player_id: playerId }],
    });
    showChallengeUpdates(res);
    document.getElementById("fc-picker-modal")?.remove();
    if (res.success) await loadBuilderData(lineupId, null);
  }
  async function clearSlot(slotCode, lineupId) {
    const res = await FC.lineups.update({
      lineup_id: lineupId,
      slots: [{ slot_code: slotCode, player_id: null }],
    });
    showChallengeUpdates(res);
    document.getElementById("fc-picker-modal")?.remove();
    await loadBuilderData(lineupId, null);
  }
  function getPositionGroup(slotCode) {
    const map = {
      GK: ["GK"],
      LB: ["LB", "LWB"],
      RB: ["RB", "RWB"],
      CB1: ["CB"],
      CB2: ["CB"],
      CB3: ["CB"],
      LWB: ["LWB", "LB"],
      RWB: ["RWB", "RB"],
      CDM: ["CDM", "CM"],
      CDM1: ["CDM", "CM"],
      CDM2: ["CDM", "CM"],
      LCM: ["CM", "CAM", "CDM"],
      CM: ["CM", "CAM", "CDM"],
      RCM: ["CM", "CAM", "CDM"],
      LM: ["LM", "LW"],
      RM: ["RM", "RW"],
      CAM: ["CAM", "CM"],
      LAM: ["CAM", "CM"],
      RAM: ["CAM", "CM"],
      LW: ["LW", "LM"],
      RW: ["RW", "RM"],
      ST: ["ST"],
      ST1: ["ST"],
      ST2: ["ST"],
    };
    return map[slotCode] || [];
  }
  async function changeFormation(lineupId) {
    const sel = document.getElementById("fc-formation-select");
    if (!sel) return;
    const res = await FC.lineups.update({
      lineup_id: lineupId,
      formation: sel.value,
    });
    showChallengeUpdates(res);
    editLineup(lineupId);
  }
  async function autoBuild(lineupId) {
    const btn = document.querySelector('[onclick*="autoBuild"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Building...";
    }
    const res = await FC.team.autobuild(lineupId);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Auto Build";
    }
    if (res.success) {
      showBuilderNotification("Squad auto-built! Chem: " + res.data.chemistry);
      showChallengeUpdates(res);
      await loadBuilderData(lineupId, null);
    }
  }
  async function getAdvice(lineupId) {
    const res = await FC.team.advice(lineupId);
    const box = document.getElementById("fc-advice-box");
    if (!box) return;
    if (res.success) {
      box.style.display = "block";
      box.innerHTML = `\n                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid rgba(0,212,255,0.2);padding-bottom:8px;">\n                    <div style="font-family:'Bebas Neue',sans-serif;color:#00d4ff;font-size:16px;letter-spacing:1px;display:flex;align-items:center;gap:8px;">\n                        <span style="font-size:20px;">AI</span> AI TACTICAL ADVICE\n                    </div>\n                    <button onclick="this.closest('#fc-advice-box').style.display='none'" style="background:rgba(255,255,255,0.05);border:none;color:#aaa;cursor:pointer;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:0.2s;" onmouseenter="this.style.background='rgba(255,50,50,0.2)';this.style.color='#f66'">X</button>\n                </div>\n                <div style="display:flex;flex-direction:column;gap:10px;">\n                    ${res.data.tips.map((t) => `\n                        <div style="display:flex;gap:10px;font-size:11px;color:#eee;background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">\n                            <span style="color:#00d4ff;font-weight:900;">-></span>\n                            <span>${t}</span>\n                        </div>\n                    `).join("")}\n                </div>\n                <div style="margin-top:12px;font-size:9px;color:rgba(255,255,255,0.3);text-align:center;">AI-generated insights based on team chemistry & formation.</div>`;
    }
  }
  async function togglePublic(lineupId, makePublic) {
    const res = await FC.lineups.update({
      lineup_id: lineupId,
      is_public: makePublic,
    });
    showChallengeUpdates(res);
    showBuilderNotification(
      makePublic ? "Lineup is now public!" : "Lineup is now private",
    );
    editLineup(lineupId);
  }
  function createLineup(preferredFormation = "4-3-3") {
    return new Promise((resolve) => {
      let modal = document.getElementById("fc-create-modal");
      if (modal) modal.remove();
      modal = document.createElement("div");
      modal.id = "fc-create-modal";
      modal.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:10002;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);padding:16px;";
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve();
        }
      };
      const formationNames = Object.keys(FORMATIONS);
      function buildPitchDots(formation) {
        const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];
        return slots
          .map((code) => {
            const pos = PITCH_POSITIONS[code] || { x: 50, y: 50 };
            return `<div style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.65);border:2px dashed rgba(255,255,255,0.55);display:flex;align-items:center;justify-content:center;font-size:8px;color:rgba(255,255,255,0.7);font-weight:700;box-shadow:0 0-8px rgba(255,215,0,0.25);">+</div>`;
          })
          .join("");
      }
      const initialFormation = FORMATIONS[preferredFormation]
        ? preferredFormation
        : "4-3-3";
      modal.innerHTML = `\n            <style>\n                @keyframes fcModalIn { from{transform:scale(0.94) translateY(16px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }\n                #fc-create-modal .fc-chip {\n                    padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);\n                    background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.65);\n                    font-size:12px;font-weight:700;cursor:pointer;transition:all 0.18s;\n                    font-family:'Inter',sans-serif;letter-spacing:0.3px;white-space:nowrap;\n                }\n                #fc-create-modal .fc-chip:hover { background:rgba(255,215,0,0.15);border-color:rgba(255,215,0,0.4);color:#fff; }\n                #fc-create-modal .fc-chip.active {\n                    background:linear-gradient(135deg,rgba(255,215,0,0.25),rgba(255,165,0,0.18));\n                    border-color:rgba(255,215,0,0.7);color:#FFD700;\n                    box-shadow:0 0 12px rgba(255,215,0,0.25);\n                }\n                .fc-create-name {\n                    width:100%;background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.15);\n                    color:#fff;padding:14px 18px;border-radius:10px;font-size:16px;font-weight:600;\n                    box-sizing:border-box;outline:none;transition:all 0.25s;\n                    font-family:'Inter',sans-serif;caret-color:#FFD700;\n                }\n                .fc-create-name:focus { border-color:rgba(255,215,0,0.6);box-shadow:0 0 0 3px rgba(255,215,0,0.12); }\n                .fc-create-name::placeholder { color:rgba(255,255,255,0.35); }\n            </style>\n\n            <div style="\n                display:flex;width:100%;max-width:820px;min-height:460px;\n                background:linear-gradient(145deg,#0c0f14 0%,#111620 60%,#0e1219 100%);\n                border:1px solid rgba(255,255,255,0.1);border-radius:20px;\n                box-shadow:0 24px 80px rgba(0,0,0,0.9),0 0 60px rgba(255,215,0,0.06),inset 0 1px 0 rgba(255,255,255,0.07);\n                animation:fcModalIn 0.28s cubic-bezier(0.16,1,0.3,1);overflow:hidden;\n            ">\n                \x3c!-- LEFT: MINI PITCH PREVIEW --\x3e\n                <div style="flex:0 0 300px;position:relative;overflow:hidden;min-height:460px;background:radial-gradient(ellipse at 50% 30%,#1a5c2a 0%,#0d3a18 40%,#071d0c 100%);border-right:1px solid rgba(255,255,255,0.07);">\n                    <svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" viewBox="0 0 100 100" preserveAspectRatio="none">\n                        <defs><pattern id="fcStripes" x="0" y="0" width="100" height="8" patternUnits="userSpaceOnUse"><rect width="100" height="4" fill="rgba(255,255,255,0.025)"/></pattern></defs>\n                        <rect width="100" height="100" fill="url(#fcStripes)"/>\n                        <rect x="6" y="3" width="88" height="94" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>\n                        <line x1="6" y1="50" x2="94" y2="50" stroke="rgba(255,255,255,0.18)" stroke-width="0.35"/>\n                        <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.35"/>\n                        <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.4)"/>\n                        <rect x="25" y="3" width="50" height="16" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.3"/>\n                        <rect x="36" y="3" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.3"/>\n                        <circle cx="50" cy="12" r="0.6" fill="rgba(255,255,255,0.3)"/>\n                        <rect x="25" y="81" width="50" height="16" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.3"/>\n                        <rect x="36" y="89" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.3"/>\n                        <circle cx="50" cy="88" r="0.6" fill="rgba(255,255,255,0.3)"/>\n                        <rect x="42" y="2" width="16" height="2" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.4"/>\n                        <rect x="42" y="96" width="16" height="2" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.4"/>\n                    </svg>\n                    <div id="fc-pitch-preview" style="position:absolute;inset:0;">${buildPitchDots(initialFormation)}</div>\n                    <div id="fc-pitch-label" style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-family:'Bebas Neue',sans-serif;font-size:26px;color:rgba(255,255,255,0.45);letter-spacing:3px;text-shadow:0 2px 8px #000;pointer-events:none;">${initialFormation}</div>\n                    <div style="position:absolute;top:0;inset-x:0;padding:18px 16px;background:linear-gradient(180deg,rgba(0,0,0,0.7) 0%,transparent 100%);">\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:13px;color:rgba(255,215,0,0.8);letter-spacing:2px;">PREVIEW</div>\n                    </div>\n                </div>\n\n                \x3c!-- RIGHT: FORM PANEL --\x3e\n                <div style="flex:1;display:flex;flex-direction:column;padding:28px 28px 24px;">\n                    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;">\n                        <div>\n                            <div style="font-size:11px;color:rgba(255,215,0,0.7);font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:'Inter',sans-serif;margin-bottom:4px;">FOOTYCRAFT</div>\n                            <h2 style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:#fff;margin:0;line-height:1;letter-spacing:1px;">CREATE LINEUP</h2>\n                            <p style="font-size:12px;color:rgba(255,255,255,0.35);margin:5px 0 0;font-family:'Inter',sans-serif;">Name your squad and pick a formation</p>\n                        </div>\n                        <button id="fc-btn-create-close" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);width:34px;height:34px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s;">X</button>\n                    </div>\n\n                    <div style="margin-bottom:22px;">\n                        <label style="display:block;font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;font-family:'Inter',sans-serif;">Squad Name</label>\n                        <input type="text" id="fc-new-lineup-name" data-tour="lineup-name" class="fc-create-name" maxlength="30" placeholder="e.g. My Ultimate Team" value="My Lineup" autocomplete="off" />\n                    </div>\n\n                    <div style="flex:1;">\n                        <label style="display:block;font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;font-family:'Inter',sans-serif;">Formation</label>\n                        <div data-tour="formation-select" style="display:flex;flex-wrap:wrap;gap:8px;">\n                            ${formationNames.map((f) => `<div class="fc-chip${f === initialFormation ? " active" : ""}" data-tour="formation-select" data-f="${f}">${f}</div>`).join("")}\n                        </div>\n                    </div>\n\n                    <div style="display:flex;gap:10px;margin-top:24px;">\n                        <button id="fc-btn-create-cancel" style="flex:1;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.1);padding:14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;">Cancel</button>\n                        <button id="fc-btn-create-submit" data-tour="enter-builder" style="flex:3;background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);color:#000;border:none;padding:14px 24px;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;text-transform:uppercase;letter-spacing:1.2px;font-family:'Inter',sans-serif;box-shadow:0 4px 20px rgba(255,215,0,0.3);">Build Squad</button>\n                    </div>\n                </div>\n            </div>`;
      document.body.appendChild(modal);
      modal.querySelectorAll(".fc-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          modal
            .querySelectorAll(".fc-chip")
            .forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          const f = chip.dataset.f;
          const preview = document.getElementById("fc-pitch-preview");
          const label = document.getElementById("fc-pitch-label");
          if (preview) {
            preview.style.opacity = "0";
            preview.style.transition = "opacity 0.15s";
            setTimeout(() => {
              preview.innerHTML = buildPitchDots(f);
              preview.style.opacity = "1";
            }, 150);
          }
          if (label) label.textContent = f;
        });
      });
      const closeBtn = document.getElementById("fc-btn-create-close");
      closeBtn.addEventListener("mouseenter", () => {
        closeBtn.style.background = "rgba(255,80,80,0.15)";
        closeBtn.style.color = "#ff6666";
      });
      closeBtn.addEventListener("mouseleave", () => {
        closeBtn.style.background = "rgba(255,255,255,0.06)";
        closeBtn.style.color = "rgba(255,255,255,0.6)";
      });
      const submitBtn = document.getElementById("fc-btn-create-submit");
      submitBtn.addEventListener("mouseenter", () => {
        submitBtn.style.transform = "translateY(-1px)";
        submitBtn.style.boxShadow = "0 8px 28px rgba(255,215,0,0.5)";
      });
      submitBtn.addEventListener("mouseleave", () => {
        submitBtn.style.transform = "none";
        submitBtn.style.boxShadow = "0 4px 20px rgba(255,215,0,0.3)";
      });
      const nameInput = document.getElementById("fc-new-lineup-name");
      setTimeout(() => {
        nameInput.focus();
        nameInput.select();
      }, 80);
      closeBtn.onclick = () => {
        modal.remove();
        resolve();
      };
      document.getElementById("fc-btn-create-cancel").onclick = () => {
        modal.remove();
        resolve();
      };
      submitBtn.onclick = async () => {
        const name = nameInput.value.trim() || "My Lineup";
        const activeChip = modal.querySelector(".fc-chip.active");
        const formation = activeChip ? activeChip.dataset.f : "4-3-3";
        submitBtn.innerHTML = "Creating...";
        submitBtn.style.pointerEvents = "none";
        submitBtn.style.opacity = "0.75";
        const res = await FC.lineups.create({
          name: name,
          formation: formation,
        });
        modal.remove();
        if (res.success) {
          // If this is the first lineup, set it as active automatically
          if (myLineups.length === 0) {
            await FC.lineups.setActive(res.data.lineup_id);
          }
          
          window.dispatchEvent(
            new CustomEvent("fc:lineup-created", {
              detail: {
                lineup_id: res.data?.lineup_id || null,
                formation: formation,
                name: name,
              },
            }),
          );
          await loadMyLineups();
          await editLineup(res.data.lineup_id);
        }
        resolve(res);
      };
    });
  }
  async function editLineup(lineupId) {
    await openTeamBuilder(lineupId);
    await loadMyLineups();
  }
  function applyLineupActiveVisualState(lineupId, isActive) {
    const id = String(lineupId);
    document.querySelectorAll(`[data-lineup-card="${id}"]`).forEach((card) => {
      card.style.borderLeft = isActive
        ? "3px solid #FFD700"
        : "3px solid rgba(255,255,255,0.1)";
    });
    document
      .querySelectorAll(`[data-lineup-formation="${id}"]`)
      .forEach((badge) => {
        badge.style.background = isActive ? "#FFD700" : "rgba(255,255,255,0.1)";
        badge.style.color = isActive ? "#000" : "#fff";
      });
    document
      .querySelectorAll(`[data-lineup-active-badge="${id}"]`)
      .forEach((badge) => {
        badge.style.display = isActive ? "inline" : "none";
      });
    const roots = new Set(
      Array.from(document.querySelectorAll(`[data-lineup-card="${id}"]`)),
    );
    document
      .querySelectorAll(
        `[data-lineup-activate="${id}"], button[onclick*="FC_LINEUPS.setActive(${id})"]`,
      )
      .forEach((button) => {
        const root =
          button.closest("[data-lineup-card]") || button.parentElement?.parentElement;
        if (root) roots.add(root);
        button.textContent = isActive ? "DEACTIVATE" : "SET ACTIVE";
        button.disabled = false;
        button.setAttribute(
          "onclick",
          isActive ? "FC_LINEUPS.deactivate()" : `FC_LINEUPS.setActive(${id})`,
        );
        button.style.background = isActive
          ? "rgba(255,215,0,0.15)"
          : "transparent";
        button.style.color = isActive ? "#FFD700" : "#fff";
        button.style.borderColor = isActive
          ? "rgba(255,215,0,0.3)"
          : "rgba(255,255,255,0.2)";
        button.style.opacity = isActive ? "0.9" : "1";
        button.style.fontWeight = isActive ? "900" : "700";
        button.style.cursor = "pointer";
      });
    roots.forEach((card) => {
      const formationBadge =
        card.querySelector(`[data-lineup-formation="${id}"]`) ||
        card.firstElementChild;
      if (formationBadge) {
        formationBadge.style.background = isActive
          ? "#FFD700"
          : "rgba(255,255,255,0.1)";
        formationBadge.style.color = isActive ? "#000" : "#fff";
      }
      let activeBadge = card.querySelector(`[data-lineup-active-badge="${id}"]`);
      const nameRow =
        card.querySelector(".lineup-name") ||
        card.children?.[1]?.firstElementChild ||
        null;
      if (!activeBadge && nameRow) {
        activeBadge = nameRow.querySelector(".fc-lineup-active-badge");
        if (!activeBadge) {
          activeBadge = document.createElement("span");
          activeBadge.className = "fc-lineup-active-badge";
          activeBadge.style.color = "#FFD700";
          activeBadge.style.fontSize = "10px";
          activeBadge.style.marginLeft = "6px";
          activeBadge.textContent = "* ACTIVE";
          nameRow.appendChild(activeBadge);
        }
      }
      if (activeBadge) activeBadge.style.display = isActive ? "inline" : "none";
    });
  }
  async function setActive(lineupId) {
    const oldActiveId = activeLineupId;
    activeLineupId = lineupId;
    if (oldActiveId) applyLineupActiveVisualState(oldActiveId, false);
    applyLineupActiveVisualState(lineupId, true);
    
    try {
      const res = await FC.lineups.setActive(lineupId);
      if (res.success) {
        const activeLineup =
          myLineups.find((lineup) => Number(lineup.id) === Number(lineupId)) ||
          null;
        const activeName = activeLineup
          ? getLineupDisplayName(activeLineup)
          : "Lineup";
        showBuilderNotification(`${activeName} is now your active lineup.`);
        showChallengeUpdates(res);
        setTimeout(() => {
          if (window.FC_HOME) window.FC_HOME.load();
        }, 300);
        renderLineupList();
        return res;
      } else {
        // Revert on failure
        activeLineupId = oldActiveId;
        applyLineupActiveVisualState(lineupId, false);
        if (oldActiveId) applyLineupActiveVisualState(oldActiveId, true);
        renderLineupList();
        showBuilderNotification(res.error || "Could not activate this lineup.");
        return res;
      }
    } catch (err) {
      // Revert on error
      activeLineupId = oldActiveId;
      applyLineupActiveVisualState(lineupId, false);
      if (oldActiveId) applyLineupActiveVisualState(oldActiveId, true);
      renderLineupList();
      console.error("Failed to set active lineup:", err);
      showBuilderNotification("Could not activate this lineup.");
      return {
        success: false,
        error: err?.message || "Could not activate this lineup.",
      };
    }
  }

  async function deactivate() {
    const oldActiveId = activeLineupId;
    activeLineupId = null;
    if (oldActiveId) applyLineupActiveVisualState(oldActiveId, false);
    
    try {
      const res = await FC.lineups.deactivate();
      if (res.success) {
        showBuilderNotification("Lineup deactivated.");
        setTimeout(() => {
          if (window.FC_HOME) window.FC_HOME.load();
        }, 300);
        renderLineupList();
        return res;
      } else {
        activeLineupId = oldActiveId;
        if (oldActiveId) applyLineupActiveVisualState(oldActiveId, true);
        renderLineupList();
        showBuilderNotification(res.error || "Could not deactivate lineup.");
        return res;
      }
    } catch (err) {
      activeLineupId = oldActiveId;
      if (oldActiveId) applyLineupActiveVisualState(oldActiveId, true);
      renderLineupList();
      console.error("Failed to deactivate lineup:", err);
      showBuilderNotification("Could not deactivate lineup.");
      return { success: false, error: err?.message };
    }
  }
  
  function renderLineupList() {
    const list = document.getElementById("fc-lineup-list");
    if (!list || !myLineups.length) return;
    
    list.innerHTML = myLineups
      .map((l) => {
        const isActive = Number(l.id) === Number(activeLineupId);
        const displayName = escapeHtml(getLineupDisplayName(l));
        const formation = escapeHtml(getLineupFormation(l));
        const activeButtonStyle = isActive 
          ? 'opacity:0.9; background:rgba(255,215,0,0.15); color:#FFD700; border-color:rgba(255,215,0,0.3); font-weight:900; cursor:not-allowed;' 
          : 'background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.2);';
        const activeButtonDisabled = '';
        const activeButtonText = isActive ? 'DEACTIVATE' : 'SET ACTIVE';
        return `<div class="lineup-item" data-lid="${l.id}" data-lineup-card="${l.id}" style="border-left:3px solid ${isActive ? "#FFD700" : "rgba(255,255,255,0.1)"};">\n                <div class="lineup-formation" data-lineup-formation="${l.id}" style="background:${isActive ? "#FFD700" : "rgba(255,255,255,0.1)"};color:${isActive ? "#000" : "#fff"};">${formation}</div>\n                <div class="lineup-info">\n                    <p class="lineup-name">${displayName} <span data-lineup-active-badge="${l.id}" style="color:#FFD700;font-size:10px;display:${isActive ? "inline" : "none"};">* ACTIVE</span></p>\n                    <p class="lineup-meta">${l.rating ? Math.round(l.rating) + " OVR" : "--"}  -  Chem ${l.chemistry || 0}</p>\n                </div>\n                <div style="display:flex;gap:6px;">\n                    <button class="lineup-btn" onclick="FC_LINEUPS.editLineup(${l.id})">EDIT</button>\n                    <button class="lineup-btn" data-lineup-activate="${l.id}" style="${activeButtonStyle}" onclick="isActive ? FC_LINEUPS.deactivate() : FC_LINEUPS.setActive(${l.id})" ${activeButtonDisabled}>${activeButtonText}</button>\n                    <button class="lineup-btn" style="color:#f66;" onclick="FC_LINEUPS.deleteLineup(${l.id})">DEL</button>\n                </div>\n            </div>`;
      })
      .join("");
  }
  function renderLineupList() {
    const list = document.getElementById("fc-lineup-list");
    if (!list || !myLineups.length) return;

    const emptySelectionNotice = activeLineupId
      ? ""
      : `<div style="margin-bottom:12px;padding:12px 14px;border-radius:12px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);color:#f1d36a;font-size:12px;font-weight:700;line-height:1.5;">No active lineup selected. Kick Off requires a valid active lineup.</div>`;

    list.innerHTML =
      emptySelectionNotice +
      myLineups
        .map((l) => {
          const isActive = Number(l.id) === Number(activeLineupId);
          const displayName = escapeHtml(getLineupDisplayName(l));
          const formation = escapeHtml(getLineupFormation(l));
          const activeButtonStyle = isActive
            ? 'opacity:0.9; background:rgba(255,215,0,0.15); color:#FFD700; border:1px solid rgba(255,215,0,0.3); font-weight:900; cursor:pointer;'
            : 'background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.2);';
          const activeButtonText = isActive ? "DEACTIVATE" : "SET ACTIVE";
          const activeButtonAction = isActive
            ? "FC_LINEUPS.deactivate()"
            : `FC_LINEUPS.setActive(${l.id})`;
          return `<div class="lineup-item" data-lid="${l.id}" data-lineup-card="${l.id}" style="border-left:3px solid ${isActive ? "#FFD700" : "rgba(255,255,255,0.1)"};">\n                <div class="lineup-formation" data-lineup-formation="${l.id}" style="background:${isActive ? "#FFD700" : "rgba(255,255,255,0.1)"};color:${isActive ? "#000" : "#fff"};">${formation}</div>\n                <div class="lineup-info">\n                    <p class="lineup-name">${displayName} <span data-lineup-active-badge="${l.id}" style="color:#FFD700;font-size:10px;display:${isActive ? "inline" : "none"};">* ACTIVE</span></p>\n                    <p class="lineup-meta">${l.rating ? Math.round(l.rating) + " OVR" : "--"}  -  Chem ${l.chemistry || 0}</p>\n                </div>\n                <div style="display:flex;gap:6px;">\n                    <button class="lineup-btn" onclick="FC_LINEUPS.editLineup(${l.id})">EDIT</button>\n                    <button class="lineup-btn" data-lineup-activate="${l.id}" style="${activeButtonStyle}" onclick="${activeButtonAction}">${activeButtonText}</button>\n                    <button class="lineup-btn" style="color:#f66;" onclick="FC_LINEUPS.deleteLineup(${l.id})">DEL</button>\n                </div>\n            </div>`;
        })
        .join("");
  }
  async function deleteLineup(lineupId) {
    const ok = await FC_MODALS.confirmDelete({
      title: "DELETE LINEUP",
      message: "Delete this lineup? This action cannot be undone.",
    });
    if (!ok) return;
    await FC.lineups.delete(lineupId);
    await loadMyLineups();
  }
  function closeBuilder() {
    document.getElementById("fc-builder-modal")?.remove();
    const tb = document.getElementById("fc-team-builder");
    if (tb) tb.style.display = "none";
    editingLineupId = null;
    _builderState = null;
    _lastChemData = null;
    window.dispatchEvent(new CustomEvent("fc:lineup-builder-exited"));
    loadMyLineups();
  }
  function showBuilderNotification(msg) {
    let n = document.getElementById("fc-notif");
    if (!n) {
      n = document.createElement("div");
      n.id = "fc-notif";
      n.style.cssText =
        "position:fixed;top:80px;right:20px;background:#0a3a1a;border:1px solid #1a7a3a;color:#6f6;padding:10px 18px;border-radius:8px;z-index:99999;font-size:13px;font-weight:700;box-shadow:0 4px 20px rgba(0,255,100,0.2);transition:opacity 0.3s;";
      document.body.appendChild(n);
    }
    n.textContent = msg;
    n.style.opacity = "1";
    setTimeout(() => {
      n.style.opacity = "0";
    }, 3e3);
  }
  function showChallengeUpdates(res) {
    const updates =
      res && res.success && Array.isArray(res.data?.challenge_updates)
        ? res.data.challenge_updates
        : [];
    if (!updates.length) return;
    const titles = updates
      .map((update) => update.title)
      .filter(Boolean)
      .slice(0, 2)
      .join(", ");
    showBuilderNotification(
      `Challenge reward ready: ${titles || "Claim your reward"}`,
    );
    if (
      window.FC_CHALLENGES &&
      typeof window.FC_CHALLENGES.notifyClaimable === "function"
    ) {
      window.FC_CHALLENGES.notifyClaimable(updates);
    }
    if (
      window.FC_CHALLENGES &&
      typeof window.FC_CHALLENGES.refresh === "function" &&
      document.getElementById("fc-challenges-list")
    ) {
      window.FC_CHALLENGES.refresh();
    }
  }
  function setBuilderActionState(trigger, isBusy, idleText, busyText) {
    if (!trigger) return;
    trigger.disabled = !!isBusy;
    trigger.textContent = isBusy ? busyText : idleText;
  }
  async function autoBuild(lineupId, btn) {
    const trigger = btn || document.querySelector('[onclick*="autoBuild"]');
    setBuilderActionState(trigger, true, "AUTO", "BUILDING...");
    const res = await FC.team.autobuild(lineupId);
    setBuilderActionState(trigger, false, "AUTO", "BUILDING...");
    if (!res.success) {
      showBuilderNotification(res.error || "Auto-build failed");
      return;
    }
    showBuilderNotification(`Squad auto-built! Chem: ${res.data.chemistry}/33`);
    showChallengeUpdates(res);
    await loadBuilderData(lineupId, null);
    window.dispatchEvent(
      new CustomEvent("fc:lineup-autobuilt", {
        detail: {
          lineup_id: lineupId,
          chemistry: res.data?.chemistry ?? null,
        },
      }),
    );
  }
  async function getAdvice(lineupId, btn) {
    const trigger = btn || document.querySelector('[onclick*="getAdvice"]');
    setBuilderActionState(trigger, true, "AI ADVICE", "LOADING...");
    const res = await FC.team.advice(lineupId);
    setBuilderActionState(trigger, false, "AI ADVICE", "LOADING...");
    const box = document.getElementById("fc-advice-box");
    if (!box) return;
    if (!res.success) {
      box.style.display = "none";
      showBuilderNotification(res.error || "AI advice failed");
      return;
    }
    const tips = Array.isArray(res.data?.tips) ? res.data.tips : [];
    box.style.display = "block";
    box.innerHTML = `\n            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid rgba(0,212,255,0.2);padding-bottom:8px;">\n                <div style="font-family:'Bebas Neue',sans-serif;color:#00d4ff;font-size:16px;letter-spacing:1px;display:flex;align-items:center;gap:8px;">\n                    <span style="font-size:20px;">AI</span> TACTICAL ADVICE\n                </div>\n                <button onclick="this.closest('#fc-advice-box').style.display='none'" style="background:rgba(255,255,255,0.05);border:none;color:#aaa;cursor:pointer;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:0.2s;" onmouseenter="this.style.background='rgba(255,50,50,0.2)';this.style.color='#f66'">X</button>\n            </div>\n            <div style="display:flex;flex-direction:column;gap:10px;">\n                ${tips.length ? tips.map((t) => `\n                    <div style="display:flex;gap:10px;font-size:11px;color:#eee;background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">\n                        <span style="color:#00d4ff;font-weight:900;">></span>\n                        <span>${t}</span>\n                    </div>\n                `).join("") : `<div style="font-size:11px;color:#bbb;background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">No advice available for this lineup yet.</div>`}\n            </div>\n            <div style="margin-top:12px;font-size:9px;color:rgba(255,255,255,0.3);text-align:center;">Generated from the current squad chemistry and formation.</div>`;
  }
  function _showChemTab() {
    if (!_lastChemData) return;
    const {
      chemistry: chemistry,
      rating: rating,
      slotChem: slotChem,
      formation: formation,
      bySlot: bySlot,
    } = _lastChemData;
    showChemStats(chemistry, rating, slotChem, formation, bySlot);
    const tabC = document.getElementById("fc-tab-chem");
    const tabP = document.getElementById("fc-tab-player");
    if (tabC) {
      tabC.style.background = "rgba(0,212,255,0.2)";
      tabC.style.borderColor = "rgba(0,212,255,0.4)";
      tabC.style.color = "#00d4ff";
    }
    if (tabP) {
      tabP.style.background = "rgba(255,255,255,0.04)";
      tabP.style.borderColor = "rgba(255,255,255,0.1)";
      tabP.style.color = "#555";
    }
    clearBuilderSelections();
  }
  window.FC_LINEUPS = {
    init: async function () {
      await loadMyLineups();
      await loadPublicLineups("views", false);
    },
    editLineup: editLineup,
    setActive: setActive,
    deactivate: deactivate,
    deleteLineup: deleteLineup,
    createLineup: createLineup,
    openPicker: openPicker,
    selectPlayer: selectPlayer,
    clearSlot: clearSlot,
    filterPickerList: filterPickerList,
    changeFormation: changeFormation,
    autoBuild: autoBuild,
    getAdvice: getAdvice,
    togglePublic: togglePublic,
    closeBuilder: closeBuilder,
    loadPublicLineups: loadPublicLineups,
    viewCommunity: viewCommunity,
    _showChemTab: _showChemTab,
    loadMetaPulse: loadMetaPulse,
    loadSquadSpotlight: loadSquadSpotlight,
    selectMetaFormation: selectMetaFormation,
    selectSpotlightLineup: selectSpotlightLineup,
    _handleSlotClick: _handleSlotClick,
    _cancelSwap: _cancelSwap,
    _showBenchPlayer: _showBenchPlayer,
    _handleSlotDragStart: _handleSlotDragStart,
    _handleBenchDragStart: _handleBenchDragStart,
    _handleDragEnd: _handleDragEnd,
    _handleSlotDragOver: _handleSlotDragOver,
    _handleSlotDragLeave: _handleSlotDragLeave,
    _handleSlotDrop: _handleSlotDrop,
    _handleBenchDragOver: _handleBenchDragOver,
    _handleBenchDragLeave: _handleBenchDragLeave,
    _handleBenchDrop: _handleBenchDrop,
    loadTrending: () => loadPublicLineups("likes", true),
  };
})();


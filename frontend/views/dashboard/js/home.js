(function () {
  "use strict";
  const FORMATION_SLOTS = {
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
  let currentActiveLineupId = null;
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
  function normalizeSlotCode(slotCode) {
    return String(slotCode || "")
      .trim()
      .toUpperCase();
  }
  function getStarterSlots(lineup) {
    const expected =
      FORMATION_SLOTS[String(lineup?.formation || "4-3-3")] ||
      FORMATION_SLOTS["4-3-3"];
    const source = Array.isArray(lineup?.slots) ? lineup.slots : [];
    const byCode = new Map();
    source.forEach((slot) => {
      const code = normalizeSlotCode(slot?.slot_code);
      if (!code) return;
      const prev = byCode.get(code);
      if (!prev) {
        byCode.set(code, { ...slot, slot_code: code });
        return;
      }
      const prevFilled = Boolean(prev?.name);
      const nextFilled = Boolean(slot?.name);
      if (!prevFilled && nextFilled) {
        byCode.set(code, { ...slot, slot_code: code });
      }
    });
    const starters = expected.map(
      (code) =>
        byCode.get(code) || { slot_code: code, name: "", overall: null },
    );
    return starters.slice(0, 11);
  }
  async function loadHomeSection() {
    const res = await FC.home.summary();
    if (!res.success) return;
    const {
      user: user,
      active_lineup: active_lineup,
      stats: stats,
      division_name: division_name,
    } = res.data;
    currentActiveLineupId = active_lineup?.id || null;
    document.querySelectorAll(".fc-username").forEach((el) => {
      el.textContent = user.username;
    });
    document.querySelectorAll(".fc-division").forEach((el) => {
      el.textContent = division_name;
    });
    if (active_lineup) {
      const pill = document.querySelector('[data-grid="top-left"] .pill-label');
      if (pill) pill.textContent = active_lineup.formation || "4-3-3";
      const title = document.querySelector(
        '[data-grid="top-left"] .card-title',
      );
      if (title) title.textContent = getLineupDisplayName(active_lineup);
      renderMiniPitch(active_lineup);
      
      const ovrEl = document.querySelector('.mini-stat-val[data-stat="ovr"]');
      const chemEl = document.querySelector('.mini-stat-val[data-stat="chem"]');
      const plEl = document.querySelector('.mini-stat-val[data-stat="players"]');
      
      if (ovrEl) ovrEl.textContent = active_lineup.rating ? Math.round(active_lineup.rating) : "--";
      if (chemEl) chemEl.textContent = active_lineup.chemistry || "--";
      const filled = getStarterSlots(active_lineup).filter((s) => s.name).length;
      if (plEl) plEl.textContent = filled + "/11";
    } else {
      const title = document.querySelector('[data-grid="top-left"] .card-title');
      if (title) title.textContent = "No Active Squad";
      const pill = document.querySelector('[data-grid="top-left"] .pill-label');
      if (pill) pill.textContent = "---";
      renderMiniPitch(null);
      
      document.querySelectorAll('.mini-stat-val').forEach(el => el.textContent = "--");
    }
    loadFeaturedPlayer();
    loadPublicLineupsPreview();
  }
  function renderMiniPitch(lineup) {
    const pitch = document.querySelector(".mini-pitch .pitch-bg");
    if (!pitch) return;
    const formationPositions = {
      GK: { x: 50, y: 90 },
      LB: { x: 15, y: 70 },
      CB1: { x: 35, y: 73 },
      CB2: { x: 55, y: 73 },
      CB3: { x: 65, y: 73 },
      RB: { x: 85, y: 70 },
      LWB: { x: 12, y: 58 },
      RWB: { x: 88, y: 58 },
      CDM: { x: 50, y: 58 },
      CDM1: { x: 38, y: 58 },
      CDM2: { x: 62, y: 58 },
      LCM: { x: 25, y: 48 },
      CM: { x: 50, y: 50 },
      RCM: { x: 75, y: 48 },
      LM: { x: 12, y: 45 },
      RM: { x: 88, y: 45 },
      CAM: { x: 50, y: 38 },
      LAM: { x: 28, y: 38 },
      RAM: { x: 72, y: 38 },
      LW: { x: 20, y: 25 },
      ST: { x: 50, y: 18 },
      RW: { x: 80, y: 25 },
      ST1: { x: 35, y: 18 },
      ST2: { x: 65, y: 18 },
    };
    const markings = pitch.querySelectorAll(".pitch-marking");
    const existingPlayers = pitch.querySelectorAll(".player-mini");
    existingPlayers.forEach((p) => p.remove());
    const starters = getStarterSlots(lineup);
    starters.forEach((slot) => {
      const pos = formationPositions[slot.slot_code];
      if (!pos) return;
      const div = document.createElement("div");
      div.className = "player-mini";
      div.style.cssText = `--x: ${pos.x}%; --y: ${pos.y}%`;
      div.innerHTML = `\n                <div class="player-rating">${slot.overall || "?"}</div>\n                <div class="player-name">${slot.name ? slot.name.split(" ").pop().toUpperCase() : slot.slot_code}</div>\n            `;
      pitch.appendChild(div);
    });
  }
  async function loadFeaturedPlayer() {
    const res = await FC.players.featured();
    if (!res.success) return;
    const p = res.data.player;
    const card = document.querySelector(".featured-player");
    if (!card) return;
    const rarityColors = {
      common: "#c0a060",
      rare: "#4fc3f7",
      epic: "#ce93d8",
      legend: "#FFD700",
    };
    const color = rarityColors[p.rarity] || "#FFD700";
    card.querySelector(".featured-rating").textContent = p.overall;
    card.querySelector(".featured-name").textContent = p.name
      .split(" ")
      .pop()
      .toUpperCase();
    card.querySelector(".featured-position").textContent = p.position;
    card.querySelector(".featured-position").style.color = color;
    const statRows = card.querySelectorAll(".stat-row");
    const stats = [
      { label: "PAC", val: p.pace },
      { label: "SHO", val: p.shooting },
      { label: "PAS", val: p.passing },
      { label: "DRI", val: p.dribbling },
      { label: "DEF", val: p.defending },
      { label: "PHY", val: p.physical },
    ];
    statRows.forEach((row, i) => {
      if (!stats[i]) return;
      row.querySelector(".stat-label").textContent = stats[i].label;
      row.querySelector(".stat-val").textContent = stats[i].val;
      const fill = row.querySelector(".stat-fill");
      if (fill) fill.style.width = stats[i].val + "%";
    });
    const pillLabel = document.querySelector(
      '[data-grid="center"] .pill-label',
    );
    if (pillLabel) {
      pillLabel.textContent = p.rarity.toUpperCase();
      pillLabel.style.background = color;
      pillLabel.style.color = "#000";
    }
  }
  async function loadPublicLineupsPreview() {
    const res = await FC.lineups.public("views", false, 20);
    if (!res.success) return;
    const lineups = res.data.lineups.slice(0, 2);
    const container = document.querySelector(".community-lineups");
    if (!container || !lineups.length) return;
    container.innerHTML = lineups
      .map(
        (l) =>
          `<div class="community-item">\n                <p class="community-name">@${escapeHtml(l.username || "Unknown")}'s ${escapeHtml(getLineupDisplayName(l))}</p>\n                <div class="community-stats">\n                    <span>❤️ ${l.likes_count}</span>\n                    <span>👁️ ${l.views_count}</span>\n                </div>\n            </div>`,
      )
      .join("");
  }
  function bindCardPanelOpen(
    cardSelector,
    panelId,
    panelTitle,
    tabName,
    openDelayMs = 180,
  ) {
    const card = document.querySelector(cardSelector);
    if (!card) return;
    const openPanelAfterTab = () => {
      if (tabName) {
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabBtn) {
          tabBtn.click();
          setTimeout(() => {
            if (typeof window.openPanel === "function") {
              window.openPanel(panelId, panelTitle);
            }
          }, openDelayMs);
          return;
        }
      }
      if (typeof window.openPanel === "function") {
        window.openPanel(panelId, panelTitle);
      }
    };
    card.style.cursor = "pointer";
    card.addEventListener("click", openPanelAfterTab);
    const btn = card.querySelector(".cta-btn-bento");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPanelAfterTab();
      });
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const resumeCard = document.querySelector('[data-grid="top-left"]');
    const openResumeTeamBuilder = () => {
      const lineupsTabBtn = document.querySelector('[data-tab="lineups"]');
      if (lineupsTabBtn) lineupsTabBtn.click();
      setTimeout(() => {
        if (
          currentActiveLineupId &&
          window.FC_LINEUPS &&
          typeof window.FC_LINEUPS.editLineup === "function"
        ) {
          window.FC_LINEUPS.editLineup(currentActiveLineupId);
          return;
        }
        if (typeof window.openPanel === "function") {
          window.openPanel("my-lineups", "MY LINEUPS");
        }
      }, 360);
    };
    if (resumeCard) {
      resumeCard.style.cursor = "pointer";
      resumeCard.addEventListener("click", openResumeTeamBuilder);
      const resumeBtn = resumeCard.querySelector(".cta-btn-bento");
      if (resumeBtn) {
        resumeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openResumeTeamBuilder();
        });
      }
    }
    bindCardPanelOpen(
      '[data-grid="top-right"]',
      "my-lineups",
      "MY LINEUPS",
      "lineups",
      340,
    );
    const newsCard = document.querySelector('[data-grid="bottom-right"]');
    if (newsCard) {
      const openNewsSearch = () => {
        if (
          window.FootyCraft &&
          typeof window.FootyCraft.openNews === "function"
        ) {
          window.FootyCraft.openNews();
        }
      };
      newsCard.style.cursor = "pointer";
      newsCard.addEventListener("click", openNewsSearch);
      const newsBtn = newsCard.querySelector(".cta-btn-bento");
      if (newsBtn) {
        newsBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openNewsSearch();
        });
      }
    }
  });
  window.FC_HOME = { load: loadHomeSection };
})();

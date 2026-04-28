(function () {
  "use strict";
  let currentPage = 1;
  let currentSearchPage = 1;
  let currentSearchPages = 1;
  let currentSearchQuery = "";
  let currentSearchTotal = 0;
  let currentFilters = {};
  let searchTimer = null;
  let lastSearchRequestId = 0;
  let trendingRefreshTimer = null;
  let trendingSelectedId = null;
  const playerCache = new Map();
  const searchCache = new Map();
  const RARITY_COLORS = {
    common: "#c0a060",
    rare: "#4fc3f7",
    epic: "#ce93d8",
    legend: "#FFD700",
    icon: "#ff9500",
  };
  function rarityColor(r) {
    return RARITY_COLORS[r] || "#aaa";
  }
  function statColor(v) {
    if (v >= 85) return "#6f6";
    if (v >= 75) return "#FFD700";
    return "#ddd";
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
  function formatNumber(value, digits) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0";
    if (typeof digits === "number") return num.toFixed(digits);
    return num.toLocaleString();
  }
  function getPlatformMetrics(player) {
    return player?.platform_metrics || {};
  }
  function rarityBadge(rarity) {
    if (rarity === "icon")
      return '<span style="font-size:9px;padding:2px 6px;border-radius:10px;background:linear-gradient(90deg,#ff6b00,#ffd700,#ff6b00);color:#000;font-weight:900;">ICON</span>';
    const c = rarityColor(rarity);
    return `<span style="font-size:9px;padding:2px 6px;border-radius:10px;background:${c}22;color:${c};border:1px solid ${c}44;font-weight:700;">${escapeHtml(String(rarity || "").toUpperCase())}</span>`;
  }
  function cachePlayers(players) {
    (players || []).forEach((player) => {
      if (!player || player.id === undefined || player.id === null) return;
      playerCache.set(String(player.id), player);
    });
  }
  function playerCard(p) {
    const c = rarityColor(p.rarity);
    const isIcon = p.rarity === "icon";
    const bg = isIcon ? "rgba(255,149,0,0.06)" : "rgba(255,255,255,0.03)";
    const cardImg = window.FCPlayerCard
      ? window.FCPlayerCard.render(p, { size: 60, accent: c })
      : `<div style="width:60px;height:84px;border-radius:10px;background:rgba(255,255,255,0.06);border:2px solid ${c};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;gap:2px;">\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:${c};line-height:1;">${escapeHtml(p.overall)}</div>\n                <div style="font-size:9px;color:#888;">${escapeHtml(p.position)}</div>\n               </div>`;
    return `<div onclick="FC_PLAYERS.showDetail(${Number(p.id)})" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:${bg};border-radius:8px;border-left:3px solid ${isIcon ? "#ff9500" : c};cursor:pointer;transition:background 0.15s;" onmouseenter="this.style.background='rgba(255,255,255,0.06)'" onmouseleave="this.style.background='${bg}'">\n            ${cardImg}\n            <div style="flex:1;min-width:0;">\n                <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${isIcon ? "#ffd700" : "#fff"};">${escapeHtml(p.name)}</div>\n                <div style="font-size:11px;color:#666;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.club)} · ${escapeHtml(p.nation)}</div>\n                <div style="margin-top:3px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">\n                    ${rarityBadge(p.rarity)}\n                    <span style="font-size:9px;color:#444;">${escapeHtml(p.league || "")}</span>\n                </div>\n            </div>\n            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font-size:10px;text-align:center;color:#888;flex-shrink:0;">\n                <div><div style="color:${statColor(p.pace)};font-weight:700;font-size:12px;">${escapeHtml(p.pace || "—")}</div><div style="font-size:8px;">PAC</div></div>\n                <div><div style="color:${statColor(p.shooting)};font-weight:700;font-size:12px;">${escapeHtml(p.shooting || "—")}</div><div style="font-size:8px;">SHO</div></div>\n                <div><div style="color:${statColor(p.passing)};font-weight:700;font-size:12px;">${escapeHtml(p.passing || "—")}</div><div style="font-size:8px;">PAS</div></div>\n                <div><div style="color:${statColor(p.dribbling)};font-weight:700;font-size:12px;">${escapeHtml(p.dribbling || "—")}</div><div style="font-size:8px;">DRI</div></div>\n                <div><div style="color:${statColor(p.defending)};font-weight:700;font-size:12px;">${escapeHtml(p.defending || "—")}</div><div style="font-size:8px;">DEF</div></div>\n                <div><div style="color:${statColor(p.physical)};font-weight:700;font-size:12px;">${escapeHtml(p.physical || "—")}</div><div style="font-size:8px;">PHY</div></div>\n            </div>\n        </div>`;
  }
  function getFilters() {
    const f = {};
    const pos = document.getElementById("fc-filter-position");
    const rarity = document.getElementById("fc-filter-rarity");
    const league = document.getElementById("fc-filter-league");
    const nation = document.getElementById("fc-filter-nation");
    const club = document.getElementById("fc-filter-club");
    const minOvr = document.getElementById("fc-filter-min-ovr");
    const maxOvr = document.getElementById("fc-filter-max-ovr");
    const sort = document.getElementById("fc-filter-sort");
    if (pos && pos.value) f.position = pos.value;
    if (rarity && rarity.value) f.rarity = rarity.value;
    if (league && league.value) f.league = league.value;
    if (nation && nation.value.trim()) f.nation = nation.value.trim();
    if (club && club.value.trim()) f.club = club.value.trim();
    if (minOvr && minOvr.value) f.min_overall = minOvr.value;
    if (maxOvr && maxOvr.value) f.max_overall = maxOvr.value;
    if (sort && sort.value && sort.value !== "best_match") f.sort = sort.value;
    return f;
  }
  function buildSearchCacheKey(params) {
    return JSON.stringify(params);
  }
  function renderPagerButtons(current, totalPages, handlerName) {
    if (totalPages <= 1) return "";
    const windowStart = Math.max(1, current - 2);
    const windowEnd = Math.min(totalPages, windowStart + 4);
    const start = Math.max(1, windowEnd - 4);
    const buttons = [];
    for (let page = start; page <= windowEnd; page++) {
      buttons.push(
        `<button class="fc-btn-sm" style="min-width:34px;${page === current ? "background:#FFD700;color:#000;border-color:#FFD700;" : ""}" onclick="${handlerName}(${page})">${page}</button>`,
      );
    }
    return buttons.join("");
  }
  function renderSearchPagination(total, pages, page) {
    const pagination = document.getElementById("fc-search-pagination");
    if (!pagination) return;
    if (!total) {
      pagination.innerHTML = "";
      return;
    }
    pagination.innerHTML = `\n            <button class="fc-btn-sm" ${page <= 1 ? "disabled" : ""} onclick="FC_PLAYERS.prevSearchPage()">< Prev</button>\n            ${renderPagerButtons(page, pages, "FC_PLAYERS.searchPage")}\n            <span style="color:#888;font-size:12px;padding:0 6px;">Page ${page} / ${pages} - ${Number(total || 0).toLocaleString()} results</span>\n            <button class="fc-btn-sm" ${page >= pages ? "disabled" : ""} onclick="FC_PLAYERS.nextSearchPage()">Next ></button>\n        `;
  }
  function ensureSearchControls() {
    const searchInput = document.getElementById("fc-player-search-input");
    const filtersRow = document.getElementById("fc-filter-position")?.parentElement;
    const results = document.getElementById("fc-search-results");
    const filterBtn = document.getElementById("fc-apply-filters");
    const minOvr = document.getElementById("fc-filter-min-ovr");
    if (!searchInput || !filtersRow || !results || !filterBtn) return;

    searchInput.placeholder =
      "Search player, club, nation, league, position...";
    searchInput.autocomplete = "off";

    const buildInput = (id, placeholder, width, type = "text") => {
      const input = document.createElement("input");
      input.id = id;
      input.type = type;
      input.placeholder = placeholder;
      input.autocomplete = "off";
      input.style.cssText = `background:#111;color:#fff;border:1px solid #333;padding:6px 8px;border-radius:6px;font-size:12px;width:${width};`;
      if (type === "number") {
        input.min = "40";
        input.max = "99";
      }
      return input;
    };
    const buildSelect = (id, options, width = "132px") => {
      const select = document.createElement("select");
      select.id = id;
      select.style.cssText = `background:#111;color:#fff;border:1px solid #333;padding:6px 10px;border-radius:6px;font-size:12px;width:${width};`;
      options.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });
      return select;
    };

    if (!document.getElementById("fc-filter-sort")) {
      const sort = buildSelect(
        "fc-filter-sort",
        [
          ["best_match", "Best Match"],
          ["overall_desc", "Highest OVR"],
          ["overall_asc", "Lowest OVR"],
          ["pace_desc", "Highest Pace"],
          ["shooting_desc", "Highest Shooting"],
          ["passing_desc", "Highest Passing"],
          ["dribbling_desc", "Highest Dribbling"],
          ["defending_desc", "Highest Defending"],
          ["physical_desc", "Highest Physical"],
          ["name_asc", "Name A-Z"],
        ],
        "138px",
      );
      filtersRow.insertBefore(sort, minOvr || filterBtn);
    }
    if (!document.getElementById("fc-filter-nation")) {
      filtersRow.insertBefore(
        buildInput("fc-filter-nation", "Nation", "110px"),
        filterBtn,
      );
    }
    if (!document.getElementById("fc-filter-club")) {
      filtersRow.insertBefore(
        buildInput("fc-filter-club", "Club", "132px"),
        filterBtn,
      );
    }
    if (!document.getElementById("fc-filter-max-ovr")) {
      filtersRow.insertBefore(
        buildInput("fc-filter-max-ovr", "Max OVR", "82px", "number"),
        filterBtn,
      );
    }
    if (!document.getElementById("fc-clear-filters")) {
      const clearBtn = document.createElement("button");
      clearBtn.id = "fc-clear-filters";
      clearBtn.className = "fc-sm-btn";
      clearBtn.textContent = "Clear";
      clearBtn.style.cssText =
        "background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.12);font-weight:700;";
      filtersRow.appendChild(clearBtn);
    }
    if (!document.getElementById("fc-search-pagination")) {
      const pagination = document.createElement("div");
      pagination.id = "fc-search-pagination";
      pagination.style.cssText =
        "display:flex;gap:8px;align-items:center;justify-content:center;margin-top:12px;flex-wrap:wrap;";
      results.insertAdjacentElement("afterend", pagination);
    }
  }
  async function loadPlayersList(page) {
    const container = document.getElementById("fc-players-list");
    if (!container) return;
    currentPage = page || currentPage;
    container.innerHTML =
      '<div style="color:#888;padding:20px;text-align:center;">Loading...</div>';
    const res = await FC.players.list({
      ...currentFilters,
      page: currentPage,
      per_page: 20,
    });
    let players = [];
    let total = 0;
    let pages = 1;
    if (
      res.success &&
      res.data &&
      res.data.players &&
      res.data.players.length
    ) {
      players = res.data.players;
      total = res.data.total || players.length;
      pages = res.data.pages || 1;
    } else {
      players = getMockTrendingPlayers();
      total = players.length;
      pages = 1;
    }
    cachePlayers(players);
    if (!players.length) {
      container.innerHTML =
        '<div style="color:#888;padding:20px;text-align:center;">No players found for these filters.</div>';
      return;
    }
    container.innerHTML = players.map((p) => playerCard(p)).join("");
    const pag = document.getElementById("fc-players-pagination");
    if (pag) {
      pag.innerHTML = `\n                <button class="fc-btn-sm" ${currentPage <= 1 ? "disabled" : ""} onclick="FC_PLAYERS.prevPage()">← Prev</button>\n                <span style="color:#888;font-size:12px;padding:0 6px;">Page ${currentPage} / ${pages} · ${Number(total || 0).toLocaleString()} players</span>\n                <button class="fc-btn-sm" ${currentPage >= pages ? "disabled" : ""} onclick="FC_PLAYERS.nextPage()">Next →</button>\n            `;
    }
  }
  async function loadSearchResults(q, page = 1) {
    const container = document.getElementById("fc-search-results");
    if (!container) return;
    const trimmedQuery = String(q || "").trim();
    const filters = getFilters();
    const activeFilters = { ...filters };
    delete activeFilters.sort;
    const hasFilters = Object.keys(activeFilters).length > 0;
    currentSearchQuery = trimmedQuery;
    currentSearchPage = Math.max(1, Number(page) || 1);
    currentFilters = filters;
    if (!trimmedQuery && !hasFilters) {
      container.innerHTML =
        '<div style="color:#888;text-align:center;padding:20px;">Type a name or pick filters above.</div>';
      renderSearchPagination(0, 1, 1);
      return;
    }
    container.innerHTML =
      '<div style="color:#888;padding:10px;text-align:center;">Searching...</div>';
    const params = { ...filters, page: currentSearchPage, per_page: 24 };
    if (trimmedQuery) params.q = trimmedQuery;
    const cacheKey = buildSearchCacheKey(params);
    const requestId = ++lastSearchRequestId;
    let payload = searchCache.get(cacheKey);
    if (!payload) {
      const res = await FC.get(
        `${window.location.protocol}//${window.location.hostname}:5000/backend/php/controllers/players/search?` +
          new URLSearchParams(params).toString(),
      );
      if (requestId !== lastSearchRequestId) return;
      if (!res.success || !res.data) {
        container.innerHTML =
          '<div style="color:#f08f8f;padding:10px;text-align:center;">Search is unavailable right now.</div>';
        renderSearchPagination(0, 1, 1);
        return;
      }
      payload = res.data;
      searchCache.set(cacheKey, payload);
    }
    const players = Array.isArray(payload.players) ? payload.players : [];
    const total = Number(payload.total || 0);
    const pages = Math.max(1, Number(payload.pages || 1));
    const activePage = Math.max(1, Number(payload.page || currentSearchPage));
    currentSearchPages = pages;
    currentSearchPage = activePage;
    currentSearchTotal = total;
    cachePlayers(players);
    container.innerHTML = players.length
      ? `<div style="color:#666;font-size:11px;margin-bottom:6px;">${Number(total || 0).toLocaleString()} result${Number(total) === 1 ? "" : "s"}${trimmedQuery ? ` for "${escapeHtml(trimmedQuery)}"` : ""}</div>` +
        players.map((p) => playerCard(p)).join("")
      : '<div style="color:#888;padding:10px;text-align:center;">No players found.</div>';
    renderSearchPagination(total, pages, activePage);
  }
  function buildMockMetrics(player, index) {
    const baseOwners = 70 - index * 7;
    return {
      total_pickups: baseOwners + 24,
      recent_pickups: Math.max(4, 15 - index),
      unique_owners: Math.max(8, baseOwners),
      active_lineups: Math.max(6, 32 - index * 3),
      lineup_users: Math.max(5, 24 - index * 2),
      matches_played: Math.max(10, 84 - index * 6),
      recent_matches: Math.max(3, 16 - index),
      goals: Math.max(0, player.position === "GK" ? 0 : 26 - index * 2),
      recent_goals: Math.max(0, player.position === "GK" ? 0 : 7 - index),
      assists: Math.max(0, 16 - index * 2),
      recent_assists: Math.max(0, 5 - Math.floor(index / 2)),
      avg_rating: Math.max(6.4, 8.2 - index * 0.14),
      avg_shots: Math.max(0.2, 4.8 - index * 0.35),
      avg_xg: Math.max(0.08, 1.28 - index * 0.09),
      avg_passes: Math.max(14, 35 - index * 1.5),
      avg_accuracy: Math.max(70, 89 - index * 1.2),
      avg_touches: Math.max(24, 58 - index * 2),
      avg_dribbles: Math.max(0.3, 4.4 - index * 0.32),
      favorite_position: player.position,
      usage_positions: [
        { position: player.position, count: Math.max(6, 26 - index * 2) },
        {
          position:
            String(player.alt_positions || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)[0] || player.position,
          count: Math.max(2, 9 - index),
        },
      ],
      current_lineup_positions: [
        { position: player.position, count: Math.max(4, 18 - index) },
      ],
      trending_score: Math.max(48, 96 - index * 6.5),
      trending_reason_short:
        index < 2 ? "Locked into squads" : "Heavy match usage",
      trending_reason: `${player.name} is trending because managers keep using the card in matches, especially at ${player.position}, and the production numbers remain strong.`,
    };
  }
  function getMockTrendingPlayers() {
    const players = [
      {
        id: 1,
        name: "Erling Haaland",
        club: "Manchester City",
        nation: "Norway",
        league: "Premier League",
        rarity: "legend",
        overall: 91,
        position: "ST",
        pace: 89,
        shooting: 93,
        passing: 65,
        dribbling: 80,
        defending: 45,
        physical: 88,
        alt_positions: "CF",
      },
      {
        id: 2,
        name: "Kylian Mbappe",
        club: "Real Madrid",
        nation: "France",
        league: "La Liga",
        rarity: "legend",
        overall: 91,
        position: "ST",
        pace: 97,
        shooting: 89,
        passing: 80,
        dribbling: 92,
        defending: 36,
        physical: 77,
        alt_positions: "LW,CF",
      },
      {
        id: 3,
        name: "Jude Bellingham",
        club: "Real Madrid",
        nation: "England",
        league: "La Liga",
        rarity: "epic",
        overall: 88,
        position: "CM",
        pace: 76,
        shooting: 80,
        passing: 83,
        dribbling: 84,
        defending: 78,
        physical: 82,
        alt_positions: "CAM,CDM",
      },
      {
        id: 4,
        name: "Vinicius Jr",
        club: "Real Madrid",
        nation: "Brazil",
        league: "La Liga",
        rarity: "epic",
        overall: 89,
        position: "LW",
        pace: 95,
        shooting: 84,
        passing: 81,
        dribbling: 94,
        defending: 35,
        physical: 70,
        alt_positions: "RW,ST",
      },
      {
        id: 5,
        name: "Bukayo Saka",
        club: "Arsenal",
        nation: "England",
        league: "Premier League",
        rarity: "rare",
        overall: 86,
        position: "RW",
        pace: 85,
        shooting: 82,
        passing: 83,
        dribbling: 86,
        defending: 65,
        physical: 74,
        alt_positions: "RM,LW",
      },
      {
        id: 6,
        name: "Florian Wirtz",
        club: "Bayer Leverkusen",
        nation: "Germany",
        league: "Bundesliga",
        rarity: "rare",
        overall: 87,
        position: "CAM",
        pace: 78,
        shooting: 82,
        passing: 87,
        dribbling: 89,
        defending: 55,
        physical: 68,
        alt_positions: "CM,LW",
      },
    ];
    return players.map((player, index) => {
      const platform = buildMockMetrics(player, index);
      return {
        ...player,
        platform_metrics: platform,
        pickup_count: platform.recent_pickups,
        trend_score: platform.trending_score,
        trend_reason: platform.trending_reason,
        trend_reason_short: platform.trending_reason_short,
        favorite_position: platform.favorite_position,
      };
    });
  }
  async function loadTrendingPlayers() {
    const container = document.getElementById("fc-trending-players");
    if (!container) return;
    const res = await FC.players.trending();
    let players = [];
    if (
      res.success &&
      res.data &&
      res.data.players &&
      res.data.players.length
    ) {
      players = res.data.players;
    }
    if (!players.length) {
      players = getMockTrendingPlayers();
    }
    cachePlayers(players);
    container.innerHTML = players.map((p) => playerCard(p)).join("");
  }
  async function loadMyPlayers() {
    const container = document.getElementById("fc-my-players");
    if (!container) return;
    const res = await FC.inventory.list();
    if (!res.success) return;
    const pl = res.data.players;
    if (!pl.length) {
      container.innerHTML =
        '<div style="color:#888;padding:20px;text-align:center;">No players yet. Open chests to get started!</div>';
      return;
    }
    cachePlayers(pl);
    container.innerHTML = pl.map((p) => playerCard(p)).join("");
  }
  function metricTile(label, value, accent, subtext) {
    return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:14px 16px;min-height:92px;">\n            <div style="font-size:11px;letter-spacing:0.8px;text-transform:uppercase;color:#747474;margin-bottom:8px;">${escapeHtml(label)}</div>\n            <div style="font-size:28px;font-weight:900;color:${accent || "#fff"};line-height:1;">${escapeHtml(value)}</div>\n            <div style="font-size:12px;color:#9d9d9d;margin-top:8px;line-height:1.45;">${escapeHtml(subtext || "")}</div>\n        </div>`;
  }
  function trendUsageChip(item, accent) {
    return `<span style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:${accent}16;border:1px solid ${accent}33;color:#f4f4f4;font-size:12px;font-weight:700;">\n            <span style="color:${accent};">${escapeHtml(item.position)}</span>\n            <span style="color:#9e9e9e;">${escapeHtml(item.count)}</span>\n        </span>`;
  }
  function trendListItem(player, selected) {
    const c = rarityColor(player.rarity);
    const platform = getPlatformMetrics(player);
    const isIcon = player.rarity === "icon";
    const imageSrc = player.image_url || "";
    const bg = selected ? `${c}1f` : "rgba(255,255,255,0.025)";
    const border = selected ? `${c}66` : "rgba(255,255,255,0.06)";
    const favorite =
      platform.favorite_position || player.position || "Flexible";
    const momentum = platform.trending_reason_short || "Platform momentum";
    return `<button type="button" onclick="FC_PLAYERS.selectTrendingPlayer(${Number(player.id)})"\n            style="width:100%;text-align:left;border:1px solid ${border};background:${bg};border-radius:18px;padding:14px;display:flex;gap:12px;align-items:flex-start;cursor:pointer;transition:transform 0.18s ease,border-color 0.18s ease,background 0.18s ease;"\n            onmouseenter="this.style.transform='translateY(-2px)';this.style.borderColor='${c}88';"\n            onmouseleave="this.style.transform='translateY(0)';this.style.borderColor='${selected ? c + "66" : "rgba(255,255,255,0.06)"}';">\n            <div style="flex-shrink:0;width:72px;height:72px;border-radius:18px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid ${c}33;">\n                ${imageSrc ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(player.name)}" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:${"cover"};" onerror="this.style.display='none'">` : `<div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:${c};">${escapeHtml(player.overall)}</div>`}\n            </div>\n            <div style="flex:1;min-width:0;">\n                <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">\n                    <div>\n                        <div style="font-size:18px;font-weight:900;color:${isIcon ? "#ffe28a" : "#fff"};line-height:1.1;">${escapeHtml(player.name)}</div>\n                        <div style="font-size:12px;color:#8f8f8f;margin-top:5px;">${escapeHtml(player.club)} · ${escapeHtml(player.nation)}</div>\n                    </div>\n                    <div style="text-align:right;flex-shrink:0;">\n                        <div style="font-size:22px;font-weight:900;color:${c};line-height:1;">${escapeHtml(formatNumber(player.trend_score || platform.trending_score || 0, 1))}</div>\n                        <div style="font-size:10px;color:#777;letter-spacing:1px;text-transform:uppercase;">Trend score</div>\n                    </div>\n                </div>\n                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">\n                    ${rarityBadge(player.rarity)}\n                    <span style="padding:4px 9px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.06);font-size:11px;color:#d7d7d7;">Best at ${escapeHtml(favorite)}</span>\n                    <span style="padding:4px 9px;border-radius:999px;background:rgba(111,255,111,0.08);border:1px solid rgba(111,255,111,0.18);font-size:11px;color:#99ff99;">${escapeHtml(momentum)}</span>\n                </div>\n                <div style="margin-top:10px;font-size:12px;color:#a8a8a8;line-height:1.5;">${escapeHtml(player.trend_reason || platform.trending_reason || "Managers keep using this player across the platform.")}</div>\n            </div>\n        </button>`;
  }
  function statStrip(player) {
    const stats = [
      ["PAC", player.pace],
      ["SHO", player.shooting],
      ["PAS", player.passing],
      ["DRI", player.dribbling],
      ["DEF", player.defending],
      ["PHY", player.physical],
    ];
    return stats
      .map(([label, value]) => {
        const safeValue = Number(value) || 0;
        return `<div style="background:rgba(255,255,255,0.03);border-radius:14px;padding:14px 12px;border:1px solid rgba(255,255,255,0.06);">\n                <div style="font-size:11px;color:#7f7f7f;letter-spacing:1px;text-transform:uppercase;">${label}</div>\n                <div style="font-size:30px;font-weight:900;color:${statColor(safeValue)};line-height:1;margin-top:8px;">${safeValue}</div>\n            </div>`;
      })
      .join("");
  }
  function renderTrendingHero(player) {
    const c = rarityColor(player.rarity);
    const platform = getPlatformMetrics(player);
    const usage = Array.isArray(platform.usage_positions)
      ? platform.usage_positions.slice(0, 6)
      : [];
    const lineupUsage = Array.isArray(platform.current_lineup_positions)
      ? platform.current_lineup_positions.slice(0, 4)
      : [];
    const alts = String(player.alt_positions || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const visual = player.image_url || "";
    return `\n            <div style="padding:28px 30px 34px;background:\n                radial-gradient(circle at top right, ${c}2d, transparent 34%),\n                linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));\n                border-bottom:1px solid rgba(255,255,255,0.06);">\n                <div id="fc-trending-hero-grid" style="display:grid;grid-template-columns:minmax(220px,280px) minmax(0,1fr);gap:26px;align-items:start;">\n                    <div style="background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));border:1px solid ${c}33;border-radius:28px;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,0.32);">\n                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">\n                            ${rarityBadge(player.rarity)}\n                            <span style="padding:6px 12px;border-radius:999px;background:${c}1c;border:1px solid ${c}33;color:${c};font-size:12px;font-weight:900;">${escapeHtml(player.position)}</span>\n                        </div>\n                        <div style="margin-top:18px;display:flex;align-items:center;justify-content:center;min-height:260px;">\n                            ${visual ? `<img src="${escapeHtml(visual)}" alt="${escapeHtml(player.name)}" referrerpolicy="no-referrer" style="max-width:100%;max-height:290px;object-fit:contain;filter:drop-shadow(0 18px 32px rgba(0,0,0,0.55));" onerror="this.style.display='none'">` : `<div style="width:180px;height:240px;border-radius:24px;border:2px solid ${c};display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.02);">\n                                    <div style="font-family:'Bebas Neue',sans-serif;font-size:62px;color:${c};line-height:1;">${escapeHtml(player.overall)}</div>\n                                    <div style="font-size:13px;color:#8e8e8e;font-weight:700;">${escapeHtml(player.position)}</div>\n                                </div>`}\n                        </div>\n                        <div style="margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;text-align:center;">\n                            <div><div style="font-size:11px;color:#737373;letter-spacing:1px;text-transform:uppercase;">OVR</div><div style="font-size:30px;font-weight:900;color:${c};line-height:1;margin-top:8px;">${escapeHtml(player.overall)}</div></div>\n                            <div><div style="font-size:11px;color:#737373;letter-spacing:1px;text-transform:uppercase;">Goals</div><div style="font-size:30px;font-weight:900;color:#fff;line-height:1;margin-top:8px;">${escapeHtml(platform.goals || 0)}</div></div>\n                            <div><div style="font-size:11px;color:#737373;letter-spacing:1px;text-transform:uppercase;">Assists</div><div style="font-size:30px;font-weight:900;color:#fff;line-height:1;margin-top:8px;">${escapeHtml(platform.assists || 0)}</div></div>\n                        </div>\n                    </div>\n                    <div style="display:flex;flex-direction:column;gap:20px;">\n                        <div>\n                            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">\n                                <div>\n                                    <div style="font-family:'Bebas Neue',sans-serif;font-size:72px;line-height:0.9;color:#fff;letter-spacing:1px;">${escapeHtml(player.name)}</div>\n                                    <div style="margin-top:10px;font-size:18px;color:#9e9e9e;">${escapeHtml(player.club)} · ${escapeHtml(player.league)} · ${escapeHtml(player.nation)}</div>\n                                </div>\n                                <div style="display:flex;gap:10px;flex-wrap:wrap;">\n                                    <span style="padding:10px 14px;border-radius:999px;background:${c}20;border:1px solid ${c}36;color:${c};font-size:12px;font-weight:900;">Trending ${escapeHtml(formatNumber(player.trend_score || platform.trending_score || 0, 1))}</span>\n                                    <span style="padding:10px 14px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#dcdcdc;font-size:12px;font-weight:800;">Favourite role ${escapeHtml(platform.favorite_position || player.position)}</span>\n                                </div>\n                            </div>\n                            <div style="margin-top:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:18px 20px;">\n                                <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${c};font-weight:900;">Why this player is trending</div>\n                                <div style="font-size:18px;color:#fff;line-height:1.55;margin-top:10px;font-weight:700;">${escapeHtml(player.trend_reason || platform.trending_reason || "Platform activity is building around this player.")}</div>\n                                <div style="font-size:14px;color:#9e9e9e;line-height:1.7;margin-top:10px;">\n                                    Managers own this card ${escapeHtml(platform.unique_owners || 0)} times across the platform, with ${escapeHtml(platform.active_lineups || 0)} active lineup slots and ${escapeHtml(platform.matches_played || 0)} tracked match appearances.\n                                </div>\n                            </div>\n                        </div>\n\n                        <div id="fc-trending-metrics-grid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;">\n                            ${metricTile("Owners", formatNumber(platform.unique_owners || 0), "#ffd870", `${formatNumber(platform.recent_pickups || 0)} new pickups in the last 7 days`)}\n                            ${metricTile("Live lineups", formatNumber(platform.active_lineups || 0), "#7fffb2", `${formatNumber(platform.lineup_users || 0)} managers currently deploy this card`)}\n                            ${metricTile("Match rating", formatNumber(platform.avg_rating || 0, 1), "#6ec8ff", `${formatNumber(platform.recent_matches || 0)} recent appearances tracked`)}\n                            ${metricTile("End product", `${formatNumber(platform.goals || 0)}G / ${formatNumber(platform.assists || 0)}A`, "#ff9f7a", `${formatNumber(platform.recent_goals || 0)} recent goals and ${formatNumber(platform.recent_assists || 0)} recent assists`)}\n                        </div>\n\n                        <div id="fc-trending-stat-grid" style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;">\n                            ${statStrip(player)}\n                        </div>\n\n                        <div id="fc-trending-bottom-grid" style="display:grid;grid-template-columns:1.15fr 0.85fr;gap:18px;">\n                            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:18px 20px;">\n                                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">\n                                    <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#7f7f7f;">Where users deploy this player</div>\n                                    <div style="font-size:12px;color:#b1b1b1;">Primary slot: <span style="color:${c};font-weight:900;">${escapeHtml(platform.favorite_position || player.position)}</span></div>\n                                </div>\n                                <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;">\n                                    ${usage.length ? usage.map((item) => trendUsageChip(item, c)).join("") : '<span style="color:#8f8f8f;font-size:13px;">Usage data will appear as soon as matches and squads include this player.</span>'}\n                                </div>\n                                <div style="margin-top:18px;font-size:14px;color:#a5a5a5;line-height:1.7;">\n                                    Alt positions:\n                                    ${alts.length ? alts.map((pos) => `<span style="display:inline-block;margin:4px 6px 0 0;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.07);color:#ececec;font-size:12px;">${escapeHtml(pos)}</span>`).join("") : '<span style="color:#7d7d7d;">No alternate positions registered.</span>'}\n                                </div>\n                            </div>\n                            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:18px 20px;">\n                                <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#7f7f7f;">Platform production</div>\n                                <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px;">\n                                    ${metricTile("Shots", formatNumber(platform.avg_shots || 0, 1), "#fff", "Average per tracked appearance")}\n                                    ${metricTile("xG", formatNumber(platform.avg_xg || 0, 2), "#fff", "Expected goals per appearance")}\n                                    ${metricTile("Passes", formatNumber(platform.avg_passes || 0, 1), "#fff", "Average passes per appearance")}\n                                    ${metricTile("Accuracy", `${formatNumber(platform.avg_accuracy || 0, 1)}%`, "#fff", "Average pass accuracy")}\n                                    ${metricTile("Touches", formatNumber(platform.avg_touches || 0, 1), "#fff", "Average touches")}\n                                    ${metricTile("Dribbles", formatNumber(platform.avg_dribbles || 0, 1), "#fff", "Average take-ons")}\n                                </div>\n                                <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">\n                                    <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#7f7f7f;">Current lineup slots</div>\n                                    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;">\n                                        ${lineupUsage.length ? lineupUsage.map((item) => trendUsageChip(item, "#8fd9ff")).join("") : '<span style="color:#8f8f8f;font-size:13px;">No current lineups are using this player yet.</span>'}\n                                    </div>\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            </div>\n        `;
  }
  function renderTrendingShell(container) {
    container.innerHTML = `\n            <style>\n                @media (max-width: 1080px) {\n                    #fc-trending-live-grid { grid-template-columns: 1fr !important; }\n                    #fc-trending-hero-grid { grid-template-columns: 1fr !important; }\n                    #fc-trending-metrics-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }\n                    #fc-trending-stat-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }\n                    #fc-trending-bottom-grid { grid-template-columns: 1fr !important; }\n                }\n                @media (max-width: 720px) {\n                    #fc-trending-metrics-grid { grid-template-columns: 1fr !important; }\n                    #fc-trending-stat-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }\n                }\n            </style>\n            <div style="height:100%;display:flex;flex-direction:column;background:\n                radial-gradient(circle at top left, rgba(255,215,0,0.10), transparent 25%),\n                linear-gradient(180deg, #071018 0%, #05070c 100%);">\n                <div style="padding:24px 30px 20px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;gap:14px;align-items:flex-end;flex-wrap:wrap;">\n                    <div>\n                        <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#ffd700;font-weight:900;">Live platform intelligence</div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:54px;line-height:0.95;color:#fff;margin-top:8px;">Trending Players</div>\n                        <div style="font-size:15px;color:#9f9f9f;max-width:760px;margin-top:10px;line-height:1.6;">\n                            Open any trending player to see full card stats, live platform usage, favourite positions, goals, assists, and why managers are leaning on the card right now.\n                        </div>\n                    </div>\n                    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">\n                        <button type="button" onclick="FC_PLAYERS.refreshTrendingNow()" style="border:none;border-radius:999px;padding:10px 16px;background:#ffd700;color:#121212;font-weight:900;cursor:pointer;">Refresh live</button>\n                        <div id="fc-trending-updated-at" style="padding:10px 14px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#d0d0d0;font-size:12px;font-weight:700;">Waiting for data...</div>\n                    </div>\n                </div>\n                <div id="fc-trending-live-grid" style="flex:1;display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr);min-height:0;">\n                    <aside style="border-right:1px solid rgba(255,255,255,0.06);padding:22px 18px 26px;overflow:auto;">\n                        <div id="fc-trending-live-list" style="display:flex;flex-direction:column;gap:12px;">\n                            <div style="color:#8f8f8f;padding:30px;text-align:center;">Loading live trend board...</div>\n                        </div>\n                    </aside>\n                    <section id="fc-trending-live-detail" style="overflow:auto;">\n                        <div style="color:#8f8f8f;padding:40px;text-align:center;">Select a player to inspect the live trend breakdown.</div>\n                    </section>\n                </div>\n            </div>\n        `;
  }
  function trendingPlayersFromCache() {
    return Array.from(playerCache.values())
      .filter(
        (player) =>
          player?.trend_score || player?.platform_metrics?.trending_score,
      )
      .sort(
        (a, b) =>
          Number(b.trend_score || b.platform_metrics?.trending_score || 0) -
          Number(a.trend_score || a.platform_metrics?.trending_score || 0),
      );
  }
  function renderTrendingBoard(players) {
    const listEl = document.getElementById("fc-trending-live-list");
    if (!listEl) return;
    listEl.innerHTML = players
      .map((player) =>
        trendListItem(player, String(player.id) === String(trendingSelectedId)),
      )
      .join("");
  }
  function renderTrendingDetail(player) {
    const detailEl = document.getElementById("fc-trending-live-detail");
    if (!detailEl) return;
    if (!player) {
      detailEl.innerHTML =
        '<div style="color:#8f8f8f;padding:40px;text-align:center;">No player selected.</div>';
      return;
    }
    detailEl.innerHTML = renderTrendingHero(player);
  }
  async function fetchTrendingPlayers() {
    const res = await FC.players.trending();
    if (
      res.success &&
      res.data &&
      res.data.players &&
      res.data.players.length
    ) {
      return {
        players: res.data.players,
        updatedAt: res.data.updated_at || null,
      };
    }
    return { players: getMockTrendingPlayers(), updatedAt: null };
  }
  async function refreshTrendingExperience() {
    const root = document.getElementById("fc-trending-players-view");
    if (!root) {
      stopTrendingExperience();
      return;
    }
    const { players: players, updatedAt: updatedAt } =
      await fetchTrendingPlayers();
    cachePlayers(players);
    if (!players.length) return;
    if (
      !trendingSelectedId ||
      !players.some(
        (player) => String(player.id) === String(trendingSelectedId),
      )
    ) {
      trendingSelectedId = players[0].id;
    }
    const selected =
      players.find(
        (player) => String(player.id) === String(trendingSelectedId),
      ) || players[0];
    renderTrendingBoard(players);
    renderTrendingDetail(selected);
    const updatedEl = document.getElementById("fc-trending-updated-at");
    if (updatedEl) {
      updatedEl.textContent = updatedAt
        ? `Live sync ${new Date(updatedAt).toLocaleString()}`
        : `Updated ${new Date().toLocaleTimeString()}`;
    }
  }
  async function selectTrendingPlayer(playerId) {
    trendingSelectedId = String(playerId);
    renderTrendingBoard(trendingPlayersFromCache());
    const detailEl = document.getElementById("fc-trending-live-detail");
    if (detailEl) {
      detailEl.innerHTML =
        '<div style="color:#8f8f8f;padding:40px;text-align:center;">Loading player trend breakdown...</div>';
    }
    const cached = playerCache.get(String(playerId));
    const res = await FC.players.detail(playerId, { context: "trending" });
    let player = cached || null;
    if (res.success && res.data && res.data.player) {
      player = { ...(cached || {}), ...res.data.player };
      cachePlayers([player]);
    }
    renderTrendingDetail(player);
    renderTrendingBoard(trendingPlayersFromCache());
  }
  function stopTrendingExperience() {
    if (trendingRefreshTimer) {
      clearInterval(trendingRefreshTimer);
      trendingRefreshTimer = null;
    }
  }
  async function renderTrendingExperience(containerId) {
    stopTrendingExperience();
    const container = document.getElementById(containerId);
    if (!container) return;
    renderTrendingShell(container);
    await refreshTrendingExperience();
    trendingRefreshTimer = setInterval(() => {
      if (!document.getElementById(containerId)) {
        stopTrendingExperience();
        return;
      }
      refreshTrendingExperience();
    }, 3e4);
  }
  async function openPlayer(playerId) {
    const cached = playerCache.get(String(playerId));
    const hadCached = Boolean(cached);
    if (hadCached && typeof FC_showPlayerDetail === "function") {
      FC_showPlayerDetail(cached);
    }
    const res = await FC.players.detail(playerId);
    if (res.success && res.data && res.data.player) {
      const merged = { ...(cached || {}), ...res.data.player };
      cachePlayers([merged]);
      if (!hadCached && typeof FC_showPlayerDetail === "function") {
        FC_showPlayerDetail(merged);
      }
      return;
    }
    if (!cached && typeof window.alert === "function") {
      window.alert("Unable to load player details right now.");
    }
  }
  function scheduleSearch(page = 1) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const searchInput = document.getElementById("fc-player-search-input");
      loadSearchResults(searchInput ? searchInput.value : currentSearchQuery, page);
    }, 220);
  }
  function resetFilters() {
    [
      "fc-filter-position",
      "fc-filter-rarity",
      "fc-filter-league",
      "fc-filter-nation",
      "fc-filter-club",
      "fc-filter-min-ovr",
      "fc-filter-max-ovr",
      "fc-filter-sort",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = "";
    });
    const searchInput = document.getElementById("fc-player-search-input");
    if (searchInput) searchInput.value = "";
    currentSearchQuery = "";
    currentSearchPage = 1;
    scheduleSearch(1);
  }
  function applyFilters() {
    currentFilters = getFilters();
    currentPage = 1;
    const searchInput = document.getElementById("fc-player-search-input");
    if (searchInput && searchInput.value.trim()) {
      loadSearchResults(searchInput.value.trim(), 1);
    } else if (searchInput) {
      loadSearchResults("", 1);
    } else {
      loadPlayersList(1);
    }
  }
  window.FC_PLAYERS = {
    init() {
      ensureSearchControls();
      const searchInput = document.getElementById("fc-player-search-input");
      if (!searchInput) {
        currentFilters = {};
        currentPage = 1;
      }
      loadPlayersList(1);
      loadTrendingPlayers();
      loadMyPlayers();
      if (searchInput) {
        searchInput.addEventListener("input", () => {
          scheduleSearch(1);
        });
        searchInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            clearTimeout(searchTimer);
            loadSearchResults(searchInput.value, 1);
          }
        });
      }
      const filterBtn = document.getElementById("fc-apply-filters");
      if (filterBtn) filterBtn.addEventListener("click", applyFilters);
      const clearBtn = document.getElementById("fc-clear-filters");
      if (clearBtn) clearBtn.addEventListener("click", resetFilters);
      [
        "fc-filter-position",
        "fc-filter-rarity",
        "fc-filter-league",
        "fc-filter-sort",
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el)
          el.addEventListener("change", () =>
            loadSearchResults(searchInput ? searchInput.value : currentSearchQuery, 1),
          );
      });
      [
        "fc-filter-nation",
        "fc-filter-club",
        "fc-filter-min-ovr",
        "fc-filter-max-ovr",
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener("input", () => scheduleSearch(1));
          el.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              clearTimeout(searchTimer);
              loadSearchResults(
                currentSearchQuery || (searchInput ? searchInput.value : ""),
                1,
              );
            }
          });
        }
      });
    },
    nextPage() {
      currentPage++;
      loadPlayersList();
    },
    prevPage() {
      currentPage = Math.max(1, currentPage - 1);
      loadPlayersList();
    },
    nextSearchPage() {
      if (currentSearchPage >= currentSearchPages) return;
      loadSearchResults(currentSearchQuery, currentSearchPage + 1);
    },
    prevSearchPage() {
      if (currentSearchPage <= 1) return;
      loadSearchResults(currentSearchQuery, currentSearchPage - 1);
    },
    searchPage(page) {
      loadSearchResults(currentSearchQuery, page);
    },
    cachePlayers: cachePlayers,
    openPlayer: openPlayer,
    showDetail(playerId) {
      return openPlayer(playerId);
    },
    renderTrendingExperience: renderTrendingExperience,
    stopTrendingExperience: stopTrendingExperience,
    selectTrendingPlayer: selectTrendingPlayer,
    refreshTrendingNow() {
      return refreshTrendingExperience();
    },
    applyFilters: applyFilters,
    resetFilters: resetFilters,
  };
})();

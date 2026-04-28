const FC_MODALS = {
  confirmDelete: function (options = {}) {
    return new Promise((resolve) => {
      const title = options.title || "CONFIRM ACTION";
      const message = options.message || "Are you sure you want to proceed?";
      const confirmText = options.confirmText || "DELETE";
      const cancelText = options.cancelText || "CANCEL";
      let modal = document.getElementById("fc-confirm-modal");
      if (modal) modal.remove();
      modal = document.createElement("div");
      modal.id = "fc-confirm-modal";
      modal.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:20000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);padding:20px;";
      modal.innerHTML = `\n                    <style>\n                        @keyframes fcConfirmIn { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }\n                        @keyframes fcPulseRed { 0%,100%{box-shadow:0 0 15px rgba(255,80,80,0.4);border-color:rgba(255,80,80,0.6)} 50%{box-shadow:0 0 35px rgba(255,80,80,0.6);border-color:rgba(255,80,80,1)} }\n                    </style>\n                    <div style="    \n                        width:100%;max-width:420px;background:linear-gradient(135deg,#121620,#0b0e14);\n                        border:1px solid rgba(255,255,255,0.1);border-radius:22px;\n                        box-shadow:0 30px 80px rgba(0,0,0,0.8), 0 0 40px rgba(255,80,80,0.05);\n                        animation:fcConfirmIn 0.25s cubic-bezier(0.16,1,0.3,1);overflow:hidden;\n                    ">\n                        <div style="height:4px;background:linear-gradient(90deg,#ff5050,#ff8080);"></div>\n                        <div style="padding:32px 28px;text-align:center;">\n                            \x3c!-- RED CARD ICON --\x3e\n                            <div style="\n                                width:56px;height:74px;background:#ff4d4d;border-radius:6px;margin:0 auto 20px;\n                                display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(255,77,77,0.3);\n                                position:relative;animation:fcPulseRed 2s ease infinite;\n                            ">\n                                <span style="font-size:32px;transform:rotate(12deg);">⚠️</span>\n                            </div>\n                            <h2 style="font-family:'Bebas Neue',sans-serif;font-size:34px;color:#fff;margin:0;letter-spacing:1px;text-transform:uppercase;">${title}</h2>\n                            <p style="font-size:14px;color:rgba(255,255,255,0.5);margin:12px 0 28px;line-height:1.6;font-family:'Inter',sans-serif;">${message}</p>\n\n                            <div style="display:flex;gap:12px;">\n                                <button id="fc-confirm-cancel" style="\n                                    flex:1;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);\n                                    border:1px solid rgba(255,255,255,0.1);padding:14px;border-radius:12px;\n                                    font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:0.5px;\n                                ">${cancelText}</button>\n                                <button id="fc-confirm-submit" style="\n                                    flex:1.4;background:linear-gradient(135deg,#ff4d4d,#d32f2f);color:#fff;\n                                    border:none;padding:14px;border-radius:12px;\n                                    font-size:13px;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif;\n                                    letter-spacing:1px;box-shadow:0 4px 15px rgba(211,47,47,0.35);text-transform:uppercase;\n                                ">${confirmText}</button>\n                            </div>\n                        </div>\n                    </div>`;
      document.body.appendChild(modal);
      const cancelBtn = document.getElementById("fc-confirm-cancel");
      const confirmBtn = document.getElementById("fc-confirm-submit");
      cancelBtn.onclick = () => {
        modal.remove();
        resolve(false);
      };
      confirmBtn.onclick = () => {
        modal.remove();
        resolve(true);
      };
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve(false);
        }
      };
    });
  },
};
const _panelEl = document.getElementById("fc-panel");
const _panelOverlay = document.getElementById("fc-panel-overlay");
const _panelTitle = document.getElementById("fc-panel-title");
const _panelBody = document.getElementById("fc-panel-body");
function _setPanelLayout(id) {
  const fullscreen =
    id === "division" ||
    id === "challenges" ||
    id === "matches" ||
    id === "trending-players" ||
    id === "explore-lineups" ||
    id === "trending-lineups" ||
    id === "account";
  _panelEl.dataset.panelMode = fullscreen ? "fullscreen" : "drawer";
  _panelEl.dataset.panelFeature = id;
  _panelEl.style.top = "0";
  _panelEl.style.right = "0";
  _panelEl.style.height = "100vh";
  _panelEl.style.transition = fullscreen
    ? "transform 0.48s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease"
    : "transform 0.35s cubic-bezier(0.4,0,0.2,1)";
  _panelEl.style.opacity = "1";
  _panelEl.style.left = fullscreen ? "0" : "auto";
  _panelEl.style.width = fullscreen ? "100vw" : "min(680px,100vw)";
  _panelEl.style.maxWidth = fullscreen ? "none" : "";
  _panelEl.style.background = fullscreen ? "#05070c" : "#0b0b0f";
  _panelEl.style.borderLeft = fullscreen
    ? "none"
    : "1px solid rgba(255,255,255,0.08)";
  _panelEl.style.borderTop = fullscreen
    ? "1px solid rgba(255,255,255,0.08)"
    : "none";
  _panelEl.style.boxShadow = fullscreen ? "0 0 80px rgba(0,0,0,0.85)" : "none";
  _panelEl.style.transform = fullscreen
    ? "translateY(24px) scale(0.985)"
    : "translateX(100%)";
  _panelOverlay.style.background = fullscreen
    ? "rgba(0,0,0,0.78)"
    : "rgba(0,0,0,0.6)";
  _panelOverlay.style.backdropFilter = fullscreen ? "blur(10px)" : "blur(4px)";
  _panelBody.style.padding = fullscreen ? "0" : "20px";
  _panelBody.style.background = fullscreen ? "#05070c" : "";
}
function openPanel(id, title) {
  if (
    window.FC_PLAYERS &&
    typeof FC_PLAYERS.stopTrendingExperience === "function"
  ) {
    FC_PLAYERS.stopTrendingExperience();
  }
  _setPanelLayout(id);
  _panelTitle.textContent = title || id;
  _panelBody.innerHTML =
    '<div style="color:#888;text-align:center;padding:40px;">Loading...</div>';
  _panelOverlay.style.display = "block";
  _panelEl.style.display = "flex";
  requestAnimationFrame(() => {
    _panelEl.style.transform =
      _panelEl.dataset.panelMode === "fullscreen"
        ? "translateY(0) scale(1)"
        : "translateX(0)";
  });
  document.body.style.overflow = "hidden";
  _loadPanelContent(id);
}
function showSpecialPackComingSoon() {
  let modal = document.getElementById("fc-special-pack-coming-soon");
  if (modal) modal.remove();
  modal = document.createElement("div");
  modal.id = "fc-special-pack-coming-soon";
  modal.style.cssText =
    "position:fixed;inset:0;z-index:21000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.78);backdrop-filter:blur(10px);";
  modal.innerHTML = `\n    <style>\n      @keyframes fcSpecialPackIn { from { opacity:0; transform:translateY(18px) scale(.96); } to { opacity:1; transform:none; } }\n      @keyframes fcSpecialPackShine { from { transform:translateX(-120%) skewX(-16deg); } to { transform:translateX(140%) skewX(-16deg); } }\n    </style>\n    <div class="card" role="alertdialog" aria-modal="true" aria-labelledby="fc-special-pack-title" style="\n      width:min(430px, 100%);border:1px solid rgba(255,215,0,.28);border-radius:22px;overflow:hidden;\n      background:linear-gradient(145deg, rgba(14,16,12,.98), rgba(5,8,10,.98));\n      box-shadow:0 30px 90px rgba(0,0,0,.72), 0 0 42px rgba(255,193,7,.16);\n      color:#fff;animation:fcSpecialPackIn .24s cubic-bezier(.16,1,.3,1);position:relative;\n    ">\n      <div style="height:4px;background:linear-gradient(90deg,#067a35,#ffe16a,#d9411e);"></div>\n      <div style="position:relative;height:150px;background:url('/frontend/assets/images/ui/specialcardsgrid.png') center/cover no-repeat;overflow:hidden;">\n        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,10,.72),rgba(5,7,10,.18));"></div>\n        <div style="position:absolute;inset:0 auto 0 -45%;width:42%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);animation:fcSpecialPackShine 1.6s ease .15s both;"></div>\n        <img src="/frontend/assets/images/ui/special.png" alt="" style="position:absolute;right:12px;bottom:-34px;height:180px;object-fit:contain;filter:drop-shadow(0 18px 28px rgba(0,0,0,.55));">\n      </div>\n      <div class="card-body" style="padding:24px 24px 22px;">\n        <div style="font-family:'Inter',sans-serif;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#ffe16a;margin-bottom:8px;">Special Pack</div>\n        <h2 id="fc-special-pack-title" style="font-family:'Bebas Neue',sans-serif;font-size:42px;line-height:.95;letter-spacing:1px;margin:0;color:#fff;">WORLD CUP PACK</h2>\n        <p style="font-family:'Inter',sans-serif;font-size:13px;line-height:1.6;color:rgba(255,255,255,.62);margin:12px 0 22px;">This pack is being prepared and will be available soon.</p>\n        <button id="fc-special-pack-close" type="button" style="\n          width:100%;border:0;border-radius:12px;padding:13px 16px;background:#FFD700;color:#050505;\n          font-family:'Inter',sans-serif;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase;cursor:pointer;\n          box-shadow:0 10px 28px rgba(255,215,0,.26);\n        ">Coming Soon</button>\n      </div>\n    </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector("#fc-special-pack-close")?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener(
    "keydown",
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      document.removeEventListener("keydown", onKeyDown);
      close();
    },
    { once: true },
  );
}
function closePanel() {
  if (
    _panelEl.dataset.panelFeature === "trending-players" &&
    window.FC_PLAYERS &&
    typeof FC_PLAYERS.stopTrendingExperience === "function"
  ) {
    FC_PLAYERS.stopTrendingExperience();
  }
  const fullscreen = _panelEl.dataset.panelMode === "fullscreen";
  _panelEl.style.transform = fullscreen
    ? "translateY(24px) scale(0.985)"
    : "translateX(100%)";
  if (fullscreen) _panelEl.style.opacity = "0";
  setTimeout(
    () => {
      _panelEl.style.display = "none";
      _panelOverlay.style.display = "none";
      document.body.style.overflow = "";
      if (fullscreen) {
        _panelEl.style.opacity = "1";
        _setPanelLayout("drawer");
      }
    },
    fullscreen ? 500 : 350,
  );
}
function _panelHTML(html) {
  _panelBody.innerHTML = html;
}
async function _loadPanelContent(id) {
  switch (id) {
    case "my-lineups": {
      _panelHTML(
        '<div id="fc-lineup-list" style="display:flex;flex-direction:column;gap:8px;"><div style="color:#888;text-align:center;padding:30px;">Loading...</div></div><div style="margin-top:16px;"><button class="fc-cta-btn" onclick="FC_LINEUPS.createLineup()">+ CREATE NEW LINEUP</button></div>',
      );
      const r = await FC.lineups.my();
      const u = await FC.auth.me();
      const authUser = u.success ? u.data?.user || u.data || {} : {};
      const activeId = Number(authUser.active_lineup_id || 0) || null;
      const el = document.getElementById("fc-lineup-list");
      if (!r.success || !r.data.lineups.length) {
        el.innerHTML =
          '<div style="color:#888;padding:20px;text-align:center;">No lineups yet. Create your first one!</div>';
        break;
      }
      const emptySelectionNotice = activeId
        ? ""
        : '<div style="margin-bottom:10px;padding:12px 14px;border-radius:10px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);color:#f1d36a;font-size:12px;font-weight:700;line-height:1.45;">No active lineup selected. Kick Off requires a valid active lineup.</div>';
      el.innerHTML = emptySelectionNotice + r.data.lineups
        .map((l) => {
          const isActive = Number(l.id) === Number(activeId);
          const esc = (v) =>
            String(v | "").replace(
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
          const displayName = esc(String(l.name || "").trim() || "My Lineup");
          const formation = esc(l.formation || "4-3-3");
          return `<div style="display:flex;align-items:center;gap:10px;padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid ${isActive ? "#FFD700" : "rgba(255,255,255,0.1)"};">\n                    <div style="background:${isActive ? "#FFD700" : "rgba(255,255,255,0.1)"};color:${isActive ? "#000" : "#fff"};font-weight:900;font-size:12px;padding:4px 8px;border-radius:5px;min-width:50px;text-align:center;">${formation}</div>\n                    <div style="flex:1;"><div style="font-weight:700;font-size:14px;">${displayName} ${isActive ? '<span style="color:#FFD700;font-size:10px;">★ ACTIVE</span>' : ""}</div><div style="font-size:11px;color:#888;">${l.rating ? Math.round(l.rating) + " OVR" : "-- OVR"} • Chem: ${l.chemistry || 0} • ${l.is_public ? "🌍" : "🔒"}</div></div>\n                        <div style="display:flex;gap:6px;flex-wrap:wrap;">\n                            <button class="fc-sm-btn" onclick="FC_LINEUPS.editLineup(${l.id})">EDIT</button>\n                            <button class="fc-sm-btn" ${isActive ? 'style="opacity:0.9; background:rgba(255,215,0,0.15); color:#FFD700; border-color:rgba(255,215,0,0.3);"' : ""} onclick="${isActive ? "FC_LINEUPS.deactivate()" : `FC_LINEUPS.setActive(${l.id})`}.then(()=>openPanel('my-lineups','MY LINEUPS'))">${isActive ? "DEACTIVATE" : "SET ACTIVE"}</button>\n                            <button class="fc-sm-btn" style="color:#f66;" onclick="FC_MODALS.confirmDelete({title:'DELETE LINEUP',message:'This squad will be permanently removed. Are you sure?'}).then(ok => {if(ok){FC.lineups.delete(${l.id}).then(()=>openPanel('my-lineups','MY LINEUPS'))}})">DEL</button>\n                        </div>\n                </div>`;
        })
        .join("");
      break;
    }
    case "explore-lineups": {
      _panelHTML(
        '<div id="fc-squad-spotlight" style="height:100%;"><div style="color:#888;padding:40px;text-align:center;">Loading Squad Spotlight...</div></div>',
      );
      await FC_LINEUPS.loadSquadSpotlight();
      break;
    }
    case "trending-lineups": {
      _panelHTML(
        '<div id="fc-meta-pulse" style="height:100%;"><div style="color:#888;padding:40px;text-align:center;">Loading Meta Pulse...</div></div>',
      );
      await FC_LINEUPS.loadMetaPulse();
      break;
    }
    case "my-players": {
      _panelHTML(
        '<div id="fc-my-players" style="display:flex;flex-direction:column;gap:6px;"><div style="color:#888;padding:20px;text-align:center;">Loading your squad...</div></div>',
      );
      const r = await FC.inventory.list();
      const el = document.getElementById("fc-my-players");
      let players = [];
      if (r.success && r.data && r.data.players && r.data.players.length) {
        players = r.data.players;
      } else {
        players = [
          {
            id: 101,
            name: "Your Striker",
            club: "Your Club",
            nation: "England",
            league: "Premier League",
            rarity: "rare",
            overall: 82,
            position: "ST",
            pace: 85,
            shooting: 84,
            passing: 72,
            dribbling: 80,
            defending: 45,
            physical: 78,
          },
          {
            id: 102,
            name: "Your Winger",
            club: "Your Club",
            nation: "France",
            league: "Premier League",
            rarity: "rare",
            overall: 80,
            position: "LW",
            pace: 88,
            shooting: 76,
            passing: 78,
            dribbling: 85,
            defending: 40,
            physical: 72,
          },
          {
            id: 103,
            name: "Your Midfielder",
            club: "Your Club",
            nation: "Spain",
            league: "Premier League",
            rarity: "common",
            overall: 78,
            position: "CM",
            pace: 72,
            shooting: 70,
            passing: 82,
            dribbling: 80,
            defending: 68,
            physical: 75,
          },
          {
            id: 104,
            name: "Your Defender",
            club: "Your Club",
            nation: "Germany",
            league: "Premier League",
            rarity: "common",
            overall: 79,
            position: "CB",
            pace: 68,
            shooting: 45,
            passing: 70,
            dribbling: 65,
            defending: 82,
            physical: 80,
          },
          {
            id: 105,
            name: "Your Keeper",
            club: "Your Club",
            nation: "Italy",
            league: "Premier League",
            rarity: "common",
            overall: 77,
            position: "GK",
            pace: 50,
            shooting: 45,
            passing: 60,
            dribbling: 55,
            defending: 78,
            physical: 75,
          },
        ];
      }
      if (window.FC_PLAYERS && typeof FC_PLAYERS.cachePlayers === "function") {
        FC_PLAYERS.cachePlayers(players);
      }
      el.innerHTML = players.map((p) => _playerRow(p, true)).join("");
      break;
    }
    case "search-players": {
      _panelHTML(
        `\n            <input id="fc-player-search-input" type="text" placeholder="Search player, club, nation, league..." style="width:100%;background:#111;color:#fff;border:1px solid #333;padding:10px 14px;border-radius:8px;font-size:14px;margin-bottom:10px;">\n            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">\n                <select id="fc-filter-position" style="background:#111;color:#fff;border:1px solid #333;padding:6px 10px;border-radius:6px;font-size:12px;">\n                    <option value="">All Positions</option>\n                    <option value="GK">GK</option><option value="CB">CB</option><option value="LB">LB</option><option value="RB">RB</option>\n                    <option value="LWB">LWB</option><option value="RWB">RWB</option>\n                    <option value="CDM">CDM</option><option value="CM">CM</option><option value="CAM">CAM</option>\n                    <option value="LM">LM</option><option value="RM">RM</option>\n                    <option value="LW">LW</option><option value="RW">RW</option><option value="ST">ST</option><option value="CF">CF</option>\n                </select>\n                <select id="fc-filter-rarity" style="background:#111;color:#fff;border:1px solid #333;padding:6px 10px;border-radius:6px;font-size:12px;">\n                    <option value="">All Rarities</option><option value="common">Common</option><option value="rare">Rare</option><option value="epic">Epic</option><option value="legend">Legend</option><option value="icon">⭐ Icon</option>\n                </select>\n                <select id="fc-filter-league" style="background:#111;color:#fff;border:1px solid #333;padding:6px 10px;border-radius:6px;font-size:12px;">\n                    <option value="">All Leagues</option>\n                    <option value="Premier League">Premier League</option>\n                    <option value="La Liga">La Liga</option>\n                    <option value="Bundesliga">Bundesliga</option>\n                    <option value="Serie A">Serie A</option>\n                    <option value="Ligue 1">Ligue 1</option>\n                    <option value="Eredivisie">Eredivisie</option>\n                    <option value="Liga Portugal">Liga Portugal</option>\n                    <option value="Major League Soccer">MLS</option>\n                </select>\n                <input id="fc-filter-min-ovr" type="number" placeholder="Min OVR" min="40" max="99" style="background:#111;color:#fff;border:1px solid #333;padding:6px 8px;border-radius:6px;font-size:12px;width:80px;">\n                <button id="fc-apply-filters" class="fc-sm-btn" style="background:#FFD700;color:#000;border:none;font-weight:700;">Search</button>\n            </div>\n            <div id="fc-search-results" style="display:flex;flex-direction:column;gap:6px;"><div style="color:#888;text-align:center;padding:20px;">Type a name or pick filters to search.</div></div>`,
      );
      FC_PLAYERS.init();
      break;
    }
    case "trending-players": {
      _panelHTML(
        '<div id="fc-trending-players-view" style="height:100%;min-height:calc(100vh - 80px);"></div>',
      );
      if (
        window.FC_PLAYERS &&
        typeof FC_PLAYERS.renderTrendingExperience === "function"
      ) {
        await FC_PLAYERS.renderTrendingExperience("fc-trending-players-view");
      } else {
        document.getElementById("fc-trending-players-view").innerHTML =
          '<div style="color:#888;padding:40px;text-align:center;">Trending players is unavailable right now.</div>';
      }
      break;
    }
    case "all-players": {
      _panelHTML(
        '<div id="fc-players-list" style="display:flex;flex-direction:column;gap:6px;"><div style="color:#888;padding:20px;text-align:center;">Loading...</div></div><div id="fc-players-pagination" style="display:flex;gap:8px;align-items:center;justify-content:center;margin-top:12px;flex-wrap:wrap;"></div>',
      );
      FC_PLAYERS.init();
      break;
    }
    case "kickoff": {
      _panelHTML(
        `\n            <style>\n            @keyframes goalFlash { 0%{background:rgba(255,215,0,0.35)} 100%{background:transparent} }\n            @keyframes eventSlide { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:none} }\n            @keyframes progressPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }\n            @keyframes scoreWiggle { 0%,100%{transform:scale(1)} 25%{transform:scale(1.3)} 75%{transform:scale(1.1)} }\n            @keyframes fcMatchScan { 0%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }\n            .match-event { animation: eventSlide 0.4s ease both; }\n            .goal-flash  { animation: goalFlash 1.2s ease both; }\n            </style>\n            <div id="fc-pre-kickoff" style="padding:20px;">\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:#aaa;text-align:center;margin-bottom:12px;letter-spacing:2px;">SELECT MODE</div>\n                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">\n                    <div class="fc-play-mode-card" data-mode="quickmatch" onclick="FC_PLAY.selectMode('quickmatch')"\n                         style="border:2px solid #FFD700;background:rgba(255,215,0,0.15);border-radius:10px;padding:12px 8px;text-align:center;cursor:pointer;color:#FFD700;transition:all 0.15s;">\n                        <div style="font-size:22px;margin-bottom:4px;">⚽</div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:1px;">Quick Match</div>\n                    </div>\n                    <div class="fc-play-mode-card" data-mode="tournament" onclick="FC_PLAY.selectMode('tournament')"\n                         style="border:2px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);border-radius:10px;padding:12px 8px;text-align:center;cursor:pointer;color:#888;transition:all 0.15s;">\n                        <div style="font-size:22px;margin-bottom:4px;">🏆</div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:1px;">Tournament</div>\n                    </div>\n                    <div class="fc-play-mode-card" data-mode="season" onclick="FC_PLAY.selectMode('season')"\n                         style="border:2px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);border-radius:10px;padding:12px 8px;text-align:center;cursor:pointer;color:#888;transition:all 0.15s;">\n                        <div style="font-size:22px;margin-bottom:4px;">📅</div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:1px;">Season</div>\n                    </div>\n                    <div class="fc-play-mode-card" data-mode="shootout" onclick="FC_PLAY.selectMode('shootout')"\n                         style="border:2px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);border-radius:10px;padding:12px 8px;text-align:center;cursor:pointer;color:#888;transition:all 0.15s;">\n                        <div style="font-size:22px;margin-bottom:4px;">🎯</div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:1px;">Shootout</div>\n                    </div>\n                </div>\n                <div id="fc-mode-desc" style="text-align:center;color:#666;font-size:12px;margin-bottom:16px;min-height:16px;">Your active lineup faces a random opponent. 80% skill, 20% luck.</div>\n                <button id="fc-play-btn" class="fc-cta-btn" style="font-size:18px;padding:12px 36px;width:100%;">KICK OFF ▶</button>\n            </div>\n            <div id="fc-match-live" style="display:none;flex-direction:column;height:100%;">\n                \x3c!-- Scoreboard --\x3e\n                <div id="fc-scoreboard" style="background:linear-gradient(135deg,#0a0a14,#12121e);border-bottom:1px solid rgba(255,255,255,0.08);padding:16px 20px;flex-shrink:0;">\n                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">\n                        <div style="text-align:center;flex:1;min-width:0;">\n                            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">YOU</div>\n                            <div style="font-family:'Bebas Neue',sans-serif;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">MY TEAM</div>\n                        </div>\n                        <div style="text-align:center;flex-shrink:0;">\n                            <div id="fc-live-score" style="font-family:'Bebas Neue',sans-serif;font-size:48px;color:#FFD700;line-height:1;min-width:100px;">0 - 0</div>\n                            <div id="fc-live-minute" style="font-size:11px;color:#888;margin-top:2px;animation:progressPulse 2s ease infinite;">⏱ 0'</div>\n                        </div>\n                        <div style="text-align:center;flex:1;min-width:0;">\n                            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">OPP</div>\n                            <div id="fc-opp-name" style="font-family:'Bebas Neue',sans-serif;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">OPPONENT</div>\n                        </div>\n                    </div>\n                    \x3c!-- Mini progress bar --\x3e\n                    <div style="background:rgba(255,255,255,0.06);border-radius:2px;height:3px;margin-top:10px;overflow:hidden;">\n                        <div id="fc-progress-bar" style="height:100%;background:#FFD700;width:0%;transition:width 0.5s linear;"></div>\n                    </div>\n                </div>\n                \x3c!-- Event feed --\x3e\n                <div id="fc-event-feed" style="flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:6px;"></div>\n                \x3c!-- Final result (hidden until end) --\x3e\n                <div id="fc-final-result" style="display:none;flex-shrink:0;padding:16px;border-top:1px solid rgba(255,255,255,0.08);">\n                </div>\n            </div>`,
      );
      FC_PLAY.init();
      const MATCH_PITCH_POSITIONS = {
        GK: { x: 6, y: 50 },
        LB: { x: 18, y: 84 },
        CB1: { x: 17, y: 62 },
        CB2: { x: 17, y: 38 },
        CB3: { x: 18, y: 16 },
        RB: { x: 18, y: 16 },
        LWB: { x: 22, y: 86 },
        RWB: { x: 22, y: 14 },
        CDM: { x: 29, y: 50 },
        CDM1: { x: 29, y: 64 },
        CDM2: { x: 29, y: 36 },
        LCM: { x: 34, y: 72 },
        CM: { x: 35, y: 50 },
        RCM: { x: 34, y: 28 },
        LM: { x: 34, y: 86 },
        RM: { x: 34, y: 14 },
        CAM: { x: 40, y: 50 },
        LAM: { x: 41, y: 70 },
        RAM: { x: 41, y: 30 },
        LW: { x: 45, y: 84 },
        ST: { x: 46, y: 50 },
        RW: { x: 45, y: 16 },
        ST1: { x: 46, y: 66 },
        ST2: { x: 46, y: 34 },
      };
      function fcMatchEsc(value) {
        return String(value | "").replace(
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
      function fcStatValue(value, suffix = "") {
        if (value === undefined || value === null || value === "") return "--";
        return `${value}${suffix}`;
      }
      function fcComparisonBar(label, home, away, suffix = "") {
        const h = Number(home) || 0;
        const a = Number(away) || 0;
        const total = Math.max(1, h + a);
        const left = Math.max(6, Math.min(94, (h / total) * 100));
        return `\n                            <div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">\n                                <div style="display:grid;grid-template-columns:52px 1fr 52px;gap:10px;align-items:center;margin-bottom:6px;font-size:12px;">\n                                    <strong style="color:#fff;text-align:right;">${fcStatValue(home, suffix)}</strong>\n                                    <span style="color:#aaa;text-align:center;font-weight:800;letter-spacing:.4px;text-transform:uppercase;">${label}</span>\n                                    <strong style="color:#fff;">${fcStatValue(away, suffix)}</strong>\n                                </div>\n                                <div style="display:flex;height:8px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,0.08);">\n                                    <div style="width:${left}%;background:#FFD700;"></div>\n                                    <div style="flex:1;background:rgba(255,255,255,0.22);"></div>\n                                </div>\n                            </div>`;
      }
      function fcRenderSummary(m, msg, col) {
        const stats = m.stats || {};
        const title = stats.forfeit
          ? stats.forfeit_label || "Forfeit Win (3-0)"
          : msg;
        const closeLabel =
          stats.mode && stats.mode !== "quickmatch"
            ? "QUIT MODE"
            : "PLAY AGAIN ▶";
        const opponentLine = stats.stage
          ? `${fcMatchEsc(stats.stage)} · vs ${fcMatchEsc(m.opponent)}`
          : `vs ${fcMatchEsc(m.opponent)}`;
        return `\n                            <div style="background:rgba(255,255,255,0.04);border:2px solid ${col};border-radius:12px;padding:16px;text-align:center;">\n                                <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:${col};letter-spacing:2px;">${title}</div>\n                                <div style="font-size:40px;font-weight:900;color:#fff;margin:4px 0;">${m.score_for} - ${m.score_against}</div>\n                                <div style="color:#888;font-size:12px;margin-bottom:12px;">${opponentLine}</div>\n                                ${stats.forfeit ? '<div style="color:#f66;font-size:12px;font-weight:800;margin-bottom:12px;">Match abandoned before full time. Opponent awarded a 3-0 win.</div>' : ""}\n                                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:11px;text-align:center;margin-bottom:12px;">\n                                    <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:8px;"><div style="font-size:18px;font-weight:900;color:#fff;">${fcStatValue(stats.possession, "%")}</div><div style="color:#666;">POSS</div></div>\n                                    <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:8px;"><div style="font-size:18px;font-weight:900;color:#fff;">${fcStatValue(stats.shots)}</div><div style="color:#666;">SHOTS</div></div>\n                                    <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:8px;"><div style="font-size:18px;font-weight:900;color:#fff;">${fcStatValue(stats.xg_for)}</div><div style="color:#666;">xG</div></div>\n                                    <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:8px;"><div style="font-size:18px;font-weight:900;color:${m.dp_change >= 0 ? "#6f6" : "#f66"}">${m.dp_change >= 0 ? "+" : ""}${fcStatValue(m.dp_change)}</div><div style="color:#666;">DP</div></div>\n                                </div>\n                                <button class="fc-cta-btn" style="width:100%;" onclick="FC_KICKOFF_CENTER.closeFullMatch()">${closeLabel}</button>\n                            </div>`;
      }
      function fcRenderStats(m) {
        const s = m.stats || {};
        const oppPoss = s.opp_possession | 100 - (Number(s.possession) || 0);
        const homeTeam = s.lineups?.home?.team || s.home_team || "YOU";
        const awayTeam =
          s.lineups?.away?.team || s.away_team || m.opponent || "OPPONENT";
        return `\n                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">\n                                <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:8px;">\n                                    <div style="color:#FFD700;font-weight:900;font-size:12px;text-align:right;">${fcMatchEsc(homeTeam)}</div>\n                                    <div style="font-family:'Bebas Neue',sans-serif;color:#aaa;font-size:18px;letter-spacing:1px;">MATCH STATS</div>\n                                    <div style="color:#ddd;font-weight:900;font-size:12px;">${fcMatchEsc(awayTeam)}</div>\n                                </div>\n                                ${fcComparisonBar("Possession", s.possession, oppPoss, "%")}\n                                ${fcComparisonBar("Shots", s.shots, s.opp_shots)}\n                                ${fcComparisonBar("Shots on target", s.shots_on_target, s.opp_shots_on_target)}\n                                ${fcComparisonBar("xG", s.xg_for, s.xg_against)}\n                                ${fcComparisonBar("Pass accuracy", s.pass_accuracy, s.opp_pass_accuracy, "%")}\n                                ${fcComparisonBar("Corners", s.corners, s.opp_corners)}\n                                ${fcComparisonBar("Cards", s.cards, s.opp_cards)}\n                            </div>`;
      }
      function fcRenderPitchPlayer(player, side) {
        const base = MATCH_PITCH_POSITIONS[player.slot_code] || {
          x: 50,
          y: 50,
        };
        const x = side === "away" ? 100 - base.x : base.x;
        const y = base.y;
        const color = side === "away" ? "#ff8a00" : "#88d81a";
        const image = player.image_url || "";
        const ratingColor =
          Number(player.rating) >= 7
            ? "#88d81a"
            : Number(player.rating) >= 6.3
              ? "#ff9f00"
              : "#ff3b30";
        return `\n                            <div title="${fcMatchEsc(player.name)}" style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:70px;height:68px;text-align:center;">\n                                ${image ? `<img src="${fcMatchEsc(image)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'" style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:40px;height:48px;object-fit:contain;z-index:2;filter:drop-shadow(0 5px 6px rgba(0,0,0,0.8));">` : `<div style="position:absolute;left:50%;top:7px;transform:translateX(-50%);width:32px;height:32px;border-radius:50%;background:#111;border:2px solid ${color};z-index:2;"></div>`}\n                                <div style="position:absolute;left:50%;top:46px;transform:translateX(-50%);width:68px;height:15px;padding:2px 4px;background:rgba(0,0,0,0.72);border:1px solid rgba(255,255,255,0.18);border-radius:4px;color:#fff;font-size:8.5px;font-weight:900;line-height:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;z-index:3;">\n                                    ${player.overall ? `<span style="color:#aaa;margin-right:3px;">${player.overall}</span>` : ""}${fcMatchEsc(player.name)}\n                                </div>\n                                <div style="position:absolute;top:25px;right:5px;background:${ratingColor};color:#fff;border-radius:4px;padding:1px 4px;font-size:9.5px;font-weight:900;z-index:4;box-shadow:0 2px 5px rgba(0,0,0,0.6);">${fcStatValue(player.rating)}</div>\n                            </div>`;
      }
      function fcRenderLineups(m) {
        const stats = m.stats || {};
        const lineups = stats.lineups || {};
        const home = lineups.home || { players: [] };
        const away = lineups.away || { players: [] };
        const subs = stats.substitutions || [];
        const homeMatchRating = home.match_rating | home.overall;
        const awayMatchRating = away.match_rating | away.overall;
        const subRatingBadge = (rating, cls) => {
          if (rating === undefined || rating === null || rating === "")
            return "";
          const bg =
            cls === "good" ? "#88d81a" : cls === "bad" ? "#ff3b30" : "#ff9f00";
          return `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:18px;padding:0 5px;border-radius:5px;background:${bg};color:#fff;font-size:10px;font-weight:900;line-height:1;">${fcStatValue(rating)}</span>`;
        };
        return `\n                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;">\n                                <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-bottom:10px;background:rgba(0,212,255,0.08);border-radius:6px;padding:8px 10px;font-size:12px;color:#fff;font-weight:900;text-transform:uppercase;letter-spacing:1px;">\n                                    <span style="text-align:left;">${fcMatchEsc(home.formation || "")}</span>\n                                    <span>FORMATION</span>\n                                    <span style="text-align:right;">${fcMatchEsc(away.formation || "")}</span>\n                                </div>\n                                <div style="position:relative;height:clamp(520px,62dvh,680px);border-radius:8px;overflow:hidden;background:#04232b;border:1px solid rgba(0,212,255,0.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.03);">\n                                    <div style="position:absolute;inset:20px;border:2px solid rgba(255,255,255,0.2);"></div>\n                                    <div style="position:absolute;left:50%;top:20px;bottom:20px;width:2px;background:rgba(255,255,255,0.2);"></div>\n                                    <div style="position:absolute;left:50%;top:50%;width:92px;height:92px;border:2px solid rgba(255,255,255,0.18);border-radius:50%;transform:translate(-50%,-50%);"></div>\n                                    <div style="position:absolute;left:20px;top:34%;width:46px;height:32%;border:2px solid rgba(255,255,255,0.18);border-left:none;"></div>\n                                    <div style="position:absolute;right:20px;top:34%;width:46px;height:32%;border:2px solid rgba(255,255,255,0.18);border-right:none;"></div>\n                                    <div title="Average match rating" style="position:absolute;top:12px;left:14px;background:#88d81a;color:#fff;border-radius:7px;padding:5px 9px;font-size:13px;font-weight:900;">Ø ${fcStatValue(homeMatchRating)}</div>\n                                    <div title="Average match rating" style="position:absolute;top:12px;right:14px;background:#ff8a00;color:#fff;border-radius:7px;padding:5px 9px;font-size:13px;font-weight:900;">Ø ${fcStatValue(awayMatchRating)}</div>\n                                    ${(home.players || []).map((p) => fcRenderPitchPlayer(p, "home")).join("")}\n                                    ${(away.players || []).map((p) => fcRenderPitchPlayer(p, "away")).join("")}\n                                </div>\n                                <div style="margin-top:12px;">\n                                    <div style="font-family:'Bebas Neue',sans-serif;color:#aaa;font-size:16px;letter-spacing:1px;margin-bottom:6px;">SUBSTITUTIONS</div>\n                                    ${subs.length ? subs.map((s) => `\n                                        <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:5px;font-size:12px;">\n                                            <span style="color:#FFD700;font-weight:900;min-width:34px;">${s.minute}'</span>\n                                            <span style="color:${s.team === "user" ? "#FFD700" : "#ddd"};font-weight:800;min-width:68px;text-transform:uppercase;">${s.team === "user" ? "You" : "Opp"}</span>\n                                            <span style="display:inline-flex;align-items:center;gap:5px;color:#f66;">${fcMatchEsc(s.player_out)} ${subRatingBadge(s.player_out_rating, s.player_out_rating_class)}</span>\n                                            <span style="color:#888;">→</span>\n                                            <span style="display:inline-flex;align-items:center;gap:5px;color:#6f6;">${fcMatchEsc(s.player_in)} ${subRatingBadge(s.player_in_rating, s.player_in_rating_class)}</span>\n                                        </div>`).join("") : '<div style="color:#666;font-size:12px;padding:8px;">No substitutions recorded.</div>'}\n                                </div>\n                            </div>`;
      }
      function fcPlayerFace(player, size = 36, color = "#FFD700") {
        const image = player?.image_url || player?.player_image_url || "";
        const name = player?.name || player?.player || "Player";
        const initials =
          String(name)
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase() || "FC";
        return `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 50% 28%,${color}33,rgba(255,255,255,0.05));border:1px solid ${color}66;overflow:hidden;box-shadow:0 8px 18px rgba(0,0,0,0.32);flex:0 0 auto;">\n                            ${image ? `<img src="${fcMatchEsc(image)}" alt="${fcMatchEsc(name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" style="width:100%;height:100%;object-fit:cover;object-position:top center;">` : ""}\n                            <span style="display:${image ? "none" : "inline-flex"};position:absolute;inset:0;align-items:center;justify-content:center;color:${color};font-size:${Math.max(9, Math.round(size * 0.28))}px;font-weight:900;">${fcMatchEsc(initials)}</span>\n                        </span>`;
      }
      function fcEnrichMatchPlayers(match) {
        const stats = match?.stats || {};
        const rows = Array.isArray(stats.player_stats)
          ? stats.player_stats
          : [];
        const homePlayers = stats.lineups?.home?.players || [];
        const awayPlayers = stats.lineups?.away?.players || [];
        const lookup = new Map();
        const add = (team, player) => {
          if (!player) return;
          if (player.slot_code)
            lookup.set(`${team}:slot:${player.slot_code}`, player);
          if (player.name)
            lookup.set(
              `${team}:name:${String(player.name).toLowerCase()}`,
              player,
            );
        };
        homePlayers.forEach((player) => add("user", player));
        awayPlayers.forEach((player) => add("opponent", player));
        return rows.map((player) => {
          const team = player.team || "";
          const matchBySlot = lookup.get(
            `${team}:slot:${player.slot_code || ""}`,
          );
          const matchByName = lookup.get(
            `${team}:name:${String(player.name || "").toLowerCase()}`,
          );
          const source = matchBySlot || matchByName || {};
          return {
            ...source,
            ...player,
            image_url: player.image_url || source.image_url || "",
            overall: player.overall || source.overall || null,
          };
        });
      }
      function fcRenderPlayerStats(m) {
        const rows = fcEnrichMatchPlayers(m);
        return `\n                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;overflow:auto;">\n                                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px;">\n                                    <div style="font-family:'Bebas Neue',sans-serif;color:#aaa;font-size:18px;letter-spacing:1px;">PLAYER STATS</div>\n                                    <select onchange="FC_KICKOFF_CENTER.filterPlayers(this.value)" style="background:#111;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:6px 8px;font-size:12px;">\n                                        <option value="all">All teams</option>\n                                        <option value="user">You</option>\n                                        <option value="opponent">Opponent</option>\n                                    </select>\n                                </div>\n                                <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:760px;">\n                                    <thead><tr style="color:#888;border-bottom:1px solid rgba(255,255,255,0.12);">\n                                        ${["Face", "Name", "Rating", "Shots", "xG", "Passes", "Accuracy", "Touches", "Dribbles"].map((h) => `<th style="text-align:left;padding:8px 6px;">${h}</th>`).join("")}\n                                    </tr></thead>\n                                    <tbody>\n                                        ${rows.map((p) => `\n                                            <tr class="fc-player-stat-row" data-team="${p.team}" onclick="FC_KICKOFF_CENTER.togglePlayer(this)" style="border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;">\n                                                <td style="padding:8px 6px;">${fcPlayerFace(p, 38, p.team === "user" ? "#88d81a" : "#ff8a00")}</td>\n                                                <td style="padding:8px 6px;color:#fff;font-weight:800;">${fcMatchEsc(p.name)} <span style="color:#666;font-size:10px;">${fcMatchEsc(p.slot_code)}</span></td>\n                                                <td style="padding:8px 6px;color:#FFD700;font-weight:900;">${fcStatValue(p.rating)}</td>\n                                                <td style="padding:8px 6px;">${fcStatValue(p.shots)}</td>\n                                                <td style="padding:8px 6px;">${fcStatValue(p.xg)}</td>\n                                                <td style="padding:8px 6px;">${fcStatValue(p.passes)}</td>\n                                                <td style="padding:8px 6px;">${fcStatValue(p.accuracy, "%")}</td>\n                                                <td style="padding:8px 6px;">${fcStatValue(p.touches)}</td>\n                                                <td style="padding:8px 6px;">${fcStatValue(p.dribbles)}</td>\n                                            </tr>\n                                            <tr class="fc-player-detail-row" data-team="${p.team}" style="display:none;background:rgba(255,215,0,0.05);">\n                                                <td colspan="9" style="padding:9px 10px;color:#aaa;">\n                                                    <div style="display:flex;align-items:center;gap:10px;">\n                                                        ${fcPlayerFace(p, 42, p.team === "user" ? "#88d81a" : "#ff8a00")}\n                                                        <span>${fcMatchEsc(p.name)} completed ${fcStatValue(p.passes)} passes at ${fcStatValue(p.accuracy, "%")} accuracy, produced ${fcStatValue(p.xg)} xG, and finished with a ${fcStatValue(p.rating)} match rating.</span>\n                                                    </div>\n                                                </td>\n                                            </tr>`).join("")}\n                                    </tbody>\n                                </table>\n                            </div>`;
      }
      function fcRenderCommentary(m) {
        const events = m.events || [];
        return `<div style="display:flex;flex-direction:column;gap:6px;">${events.map((ev) => `\n                            <div style="display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:9px 10px;">\n                                <div style="font-family:'Bebas Neue',sans-serif;color:#FFD700;min-width:34px;">${ev.minute}'</div>\n                                <div style="flex:1;color:#ddd;font-size:12px;line-height:1.35;">${fcMatchEsc(ev.commentary || "")}</div>\n                            </div>`).join("")}</div>`;
      }
      function fcRenderMatchCenter(m, msg, col) {
        return `\n                            <div id="fc-match-center" style="display:flex;flex-direction:column;gap:12px;">\n                                <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;">\n                                    ${["summary", "stats", "lineups", "players", "commentary"].map((tab, i) => `\n                                        <button class="fc-match-tab" data-tab="${tab}" onclick="FC_KICKOFF_CENTER.setTab('${tab}')" style="background:${i === 0 ? "#FFD700" : "rgba(255,255,255,0.06)"};color:${i === 0 ? "#000" : "#aaa"};border:1px solid ${i === 0 ? "#FFD700" : "rgba(255,255,255,0.12)"};padding:8px 12px;border-radius:8px;font-size:11px;font-weight:900;white-space:nowrap;cursor:pointer;text-transform:uppercase;">${tab === "players" ? "Player Stats" : tab}</button>`).join("")}\n                                </div>\n                                <div class="fc-match-panel" data-panel="summary">${fcRenderSummary(m, msg, col)}</div>\n                                <div class="fc-match-panel" data-panel="stats" style="display:none;">${fcRenderStats(m)}</div>\n                                <div class="fc-match-panel" data-panel="lineups" style="display:none;">${fcRenderLineups(m)}</div>\n                                <div class="fc-match-panel" data-panel="players" style="display:none;">${fcRenderPlayerStats(m)}</div>\n                                <div class="fc-match-panel" data-panel="commentary" style="display:none;">${fcRenderCommentary(m)}</div>\n                            </div>`;
      }
      function fcMatchResultColor(result, stats = {}) {
        if (stats.forfeit) return "#f66";
        return result === "W" ? "#6f6" : result === "D" ? "#FFD700" : "#f66";
      }
      function fcMatchResultText(result, stats = {}) {
        if (stats.forfeit) return stats.forfeit_label || "FORFEIT WIN (3-0)";
        return result === "W" ? "VICTORY!" : result === "D" ? "DRAW" : "DEFEAT";
      }
      function fcRenderTournamentHub(data, playedCount = 3) {
        const scoreRow = (match, index) => {
          const played = index < playedCount;
          const hWin = match.winner === match.home;
          return `<button ${played ? `onclick="FC_KICKOFF_CENTER.showStoredMatch(${index})"` : ""} style="width:100%;display:grid;grid-template-columns:2fr 58px 58px 2fr;align-items:center;gap:8px;padding:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;margin-bottom:8px;cursor:${played ? "pointer" : "default"};color:#fff;opacity:${played ? 1 : 0.55};">\n                                <span style="text-align:right;font-size:12px;font-weight:${played && hWin ? "900" : "600"};color:${played && hWin ? "#FFD700" : "#ddd"};">${fcMatchEsc(match.home)}</span>\n                                <span style="text-align:center;font-size:18px;font-weight:900;">${played ? fcStatValue(match.score_home) : "-"}</span>\n                                <span style="text-align:center;font-size:18px;font-weight:900;">${played ? fcStatValue(match.score_away) : "-"}</span>\n                                <span style="text-align:left;font-size:12px;font-weight:${played && !hWin ? "900" : "600"};color:${played && !hWin ? "#FFD700" : "#ddd"};">${fcMatchEsc(match.away)}</span>\n                            </button>`;
        };
        return `\n                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,215,0,0.18);border-radius:12px;padding:14px;margin-bottom:12px;">\n                                <div style="font-family:'Bebas Neue',sans-serif;color:#FFD700;font-size:24px;letter-spacing:1px;text-align:center;margin-bottom:10px;">4 TEAM TOURNAMENT</div>\n                                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Semi-finals</div>\n                                ${scoreRow(data.sf1, 0)}\n                                ${scoreRow(data.sf2, 1)}\n                                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px;">Final</div>\n                                ${scoreRow(data.final, 2)}\n                                <div style="text-align:center;color:#FFD700;font-weight:900;margin-top:8px;">Winner: ${playedCount >= 3 ? fcMatchEsc(data.final?.winner || "--") : "Pending"}</div>\n                            </div>\n                            <div id="fc-mode-match-slot"></div>`;
      }
      function fcRenderSeasonHub(data, playedCount = 5) {
        const rows = playedCount >= 5 ? data.standings || [] : [];
        const visibleMatches = (data.matches || []).slice(0, playedCount);
        return `\n                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,215,0,0.18);border-radius:12px;padding:14px;margin-bottom:12px;">\n                                <div style="font-family:'Bebas Neue',sans-serif;color:#FFD700;font-size:24px;letter-spacing:1px;text-align:center;margin-bottom:6px;">5 MATCH SEASON</div>\n                                <div style="text-align:center;color:#aaa;font-size:12px;margin-bottom:12px;">${playedCount >= 5 ? `Current position: <strong style="color:#fff;">#${fcStatValue(data.current_position)}</strong>` : `Matches completed: <strong style="color:#fff;">${playedCount}/5</strong>`}</div>\n                                <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;">\n                                    ${visibleMatches.map((m, i) => `<button onclick="FC_KICKOFF_CENTER.showStoredMatch(${i})" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:${fcMatchResultColor(m.result, m.stats)};font-size:11px;font-weight:900;white-space:nowrap;cursor:pointer;">M${i + 1} ${m.score_for}-${m.score_against}</button>`).join("") || '<span style="color:#777;font-size:12px;">No matches completed yet.</span>'}\n                                </div>\n                                ${playedCount < 5 ? '<div style="color:#777;text-align:center;font-size:12px;padding:12px;">Final standings unlock after Match 5.</div>' : `\n                                <table style="width:100%;border-collapse:collapse;font-size:12px;">\n                                    <thead><tr style="color:#888;border-bottom:1px solid rgba(255,255,255,0.12);"><th style="text-align:left;padding:6px;">#</th><th style="text-align:left;padding:6px;">Team</th><th style="text-align:right;padding:6px;">P</th><th style="text-align:right;padding:6px;">GD</th><th style="text-align:right;padding:6px;">Pts</th></tr></thead>\n                                    <tbody>${rows.map((r) => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);color:#ddd;"><td style="padding:6px;color:#888;">${r.position}</td><td style="padding:6px;font-weight:800;">${fcMatchEsc(r.team)}</td><td style="padding:6px;text-align:right;">${r.played}</td><td style="padding:6px;text-align:right;">${r.gd}</td><td style="padding:6px;text-align:right;color:#FFD700;font-weight:900;">${r.points}</td></tr>`).join("")}</tbody>\n                                </table>`}\n                            </div>\n                            <div id="fc-mode-match-slot"></div>`;
      }
      function fcRenderShootoutHub(data) {
        const kickCell = (scored) =>
          `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${scored ? "rgba(102,255,102,.18)" : "rgba(255,80,80,.18)"};color:${scored ? "#6f6" : "#f66"};font-weight:900;">${scored ? "✓" : "×"}</span>`;
        return `\n                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,215,0,0.18);border-radius:12px;padding:16px;">\n                                <div style="text-align:center;font-family:'Bebas Neue',sans-serif;font-size:34px;color:${data.result === "W" ? "#6f6" : "#f66"};">${data.result === "W" ? "SHOOTOUT WIN" : "SHOOTOUT LOSS"}</div>\n                                <div style="text-align:center;font-size:44px;font-weight:900;color:#fff;">${data.user_score} - ${data.opp_score}</div>\n                                <div style="text-align:center;color:#888;font-size:12px;margin-bottom:14px;">vs ${fcMatchEsc(data.opponent || "Opponent")}</div>\n                                <div style="display:flex;flex-direction:column;gap:7px;max-width:720px;margin:0 auto;">\n                                    ${(data.kicks || []).map((k) => `<div style="display:grid;grid-template-columns:70px 1fr 42px 1fr 42px;gap:8px;align-items:center;background:rgba(255,255,255,0.03);border-radius:8px;padding:8px 10px;font-size:12px;">\n                                        <span style="color:#888;">${k.sudden ? "SD" : "R"} ${k.round}</span>\n                                        <span style="text-align:right;color:#fff;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fcMatchEsc(k.player || "Player")}</span>\n                                        ${kickCell(k.user_scored)}\n                                        <span style="text-align:right;color:#aaa;font-weight:800;">${k.user_total} - ${k.opp_total}</span>\n                                        ${kickCell(k.opp_scored)}\n                                    </div>`).join("")}\n                                </div>\n                                <button class="fc-cta-btn" style="width:100%;margin-top:16px;" onclick="FC_KICKOFF_CENTER.closeFullMatch()">PLAY AGAIN ▶</button>\n                            </div>`;
      }
      function fcRenderShootoutHub(data) {
        const kicks = data.kicks || [];
        const totalKicks = Number(data.total_kicks || kicks.length);
        const complete = data.complete | kicks.length >= totalKicks;
        const lastKick = kicks[kicks.length - 1] || {};
        const runningUserScore = complete
          ? data.user_score
          : (lastKick.user_total | 0);
        const runningOppScore = complete
          ? data.opp_score
          : (lastKick.opp_total | 0);
        const title = complete
          ? data.result === "W"
            ? "SHOOTOUT WIN"
            : "SHOOTOUT LOSS"
          : lastKick.sudden
            ? "SUDDEN DEATH"
            : `PENALTY ${Math.max(1, kicks.length)} / ${Math.max(5, Math.min(totalKicks, 5))}`;
        const titleColor = complete
          ? data.result === "W"
            ? "#6f6"
            : "#f66"
          : "#FFD700";
        const kickCell = (scored) =>
          `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${scored ? "rgba(102,255,102,.18)" : "rgba(255,80,80,.18)"};color:${scored ? "#6f6" : "#f66"};font-weight:900;">${scored ? "✓" : "×"}</span>`;
        return `\n                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,215,0,0.18);border-radius:12px;padding:16px;">\n                                <div style="text-align:center;font-family:'Bebas Neue',sans-serif;font-size:34px;color:${titleColor};">${title}</div>\n                                <div style="text-align:center;font-size:44px;font-weight:900;color:#fff;">${runningUserScore} - ${runningOppScore}</div>\n                                <div style="text-align:center;color:#888;font-size:12px;margin-bottom:14px;">${complete ? "Final score" : "Live shootout score"} vs ${fcMatchEsc(data.opponent || "Opponent")}</div>\n                                <div style="display:flex;flex-direction:column;gap:7px;max-width:720px;margin:0 auto;">\n                                    ${kicks.map((k) => `<div style="display:grid;grid-template-columns:70px minmax(0,1fr) 42px 72px 42px minmax(0,1fr);gap:8px;align-items:center;background:rgba(255,255,255,0.03);border-radius:8px;padding:8px 10px;font-size:12px;">\n                                        <span style="color:#888;">${k.sudden ? "SD" : "R"} ${k.round}</span>\n                                        <span style="display:flex;align-items:center;justify-content:flex-end;gap:8px;text-align:right;color:#fff;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fcMatchEsc(k.player || "Player")} ${fcPlayerFace({ name: k.player, image_url: k.player_image_url }, 34, "#88d81a")}</span>\n                                        ${kickCell(k.user_scored)}\n                                        <span style="text-align:right;color:#aaa;font-weight:800;">${k.user_total} - ${k.opp_total}</span>\n                                        ${kickCell(k.opp_scored)}\n                                        <span style="display:flex;align-items:center;gap:8px;color:#aaa;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fcPlayerFace({ name: k.opp_player, image_url: k.opp_player_image_url }, 34, "#ff8a00")} ${fcMatchEsc(k.opp_player || "Opponent")}</span>\n                                    </div>`).join("")}\n                                </div>\n                                ${complete ? '<button class="fc-cta-btn" style="width:100%;margin-top:16px;" onclick="FC_KICKOFF_CENTER.closeFullMatch()">PLAY AGAIN ▶</button>' : ""}\n                            </div>`;
      }
      function fcRenderShootoutPicker(data) {
        const shooters = data.shooters || [];
        const oppShooters = data.opponent_shooters || [];
        window.FC_KICKOFF_CENTER.shootoutPicks = {};
        const selectedIds = shooters.slice(0, 5).map((s) => s.player_id || 0);
        const playerLine = (s, i, color = "#FFD700") => {
          const image = s.image_url || "";
          return `<div style="display:flex;align-items:center;gap:8px;width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px;color:#fff;text-align:left;">\n                                <span style="color:#888;font-size:10px;width:18px;">#${i + 1}</span>\n                                ${fcPlayerFace({ name: s.name, image_url: image }, 34, color)}\n                                <span style="flex:1;min-width:0;font-size:11px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fcMatchEsc(s.name)}</span>\n                                <span style="color:${color};font-weight:900;font-size:12px;">${fcStatValue(s.shooting)}</span>\n                            </div>`;
        };
        return `\n                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,215,0,0.18);border-radius:12px;padding:16px;">\n                                <div style="text-align:center;font-family:'Bebas Neue',sans-serif;font-size:34px;color:#FFD700;letter-spacing:2px;">PENALTY SHOOTOUT</div>\n                                <div style="text-align:center;color:#888;font-size:12px;margin-bottom:14px;">Readjust your taker order with UP / DOWN. Empty or repeated slots are auto-filled by the system.</div>\n                                <div style="display:grid;grid-template-columns:minmax(260px,1fr) minmax(220px,.8fr);gap:14px;">\n                                    <div style="background:rgba(0,0,0,0.2);border:1px solid rgba(136,216,26,0.22);border-radius:10px;padding:10px;">\n                                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">\n                                            <span style="font-family:'Bebas Neue',sans-serif;color:#88d81a;font-size:20px;">YOUR ORDER</span>\n                                            <button onclick="FC_KICKOFF_CENTER.autoFillShootoutOrder()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#aaa;font-size:10px;font-weight:900;padding:4px 6px;cursor:pointer;">BEST ORDER</button>\n                                        </div>\n                                        <div id="fc-shootout-order" style="display:flex;flex-direction:column;gap:7px;">\n                                            ${[0, 1, 2, 3, 4].map((round) => `<div style="display:grid;grid-template-columns:64px 1fr auto auto;gap:7px;align-items:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:7px;">\n                                                <span style="font-family:'Bebas Neue',sans-serif;color:#FFD700;font-size:18px;">PEN ${round + 1}</span>\n                                                <select data-shootout-order="${round}" onchange="FC_KICKOFF_CENTER.setShootoutPick(${round}, this.value)" style="background:#111;color:#fff;border:1px solid rgba(255,255,255,0.14);border-radius:7px;padding:7px;font-size:12px;min-width:0;">\n                                                    <option value="">AUTO</option>\n                                                    ${shooters.map((s) => `<option value="${s.player_id}" ${Number(selectedIds[round]) === Number(s.player_id) ? "selected" : ""}>${fcMatchEsc(s.name)} · SHO ${fcStatValue(s.shooting)}</option>`).join("")}\n                                                </select>\n                                                <button onclick="FC_KICKOFF_CENTER.moveShootoutPick(${round}, -1)" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#fff;padding:5px 7px;cursor:pointer;">UP</button>\n                                                <button onclick="FC_KICKOFF_CENTER.moveShootoutPick(${round}, 1)" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#fff;padding:5px 7px;cursor:pointer;">DOWN</button>\n                                            </div>`).join("")}\n                                        </div>\n                                    </div>\n                                    <div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,138,0,0.22);border-radius:10px;padding:10px;">\n                                        <div style="font-family:'Bebas Neue',sans-serif;color:#ff8a00;font-size:20px;margin-bottom:8px;">${fcMatchEsc(data.opponent || "OPPONENT")} BEST SHOOTERS</div>\n                                        <div style="display:flex;flex-direction:column;gap:7px;">${oppShooters.map((s, i) => playerLine(s, i, "#ff8a00")).join("") || '<div style="color:#777;font-size:12px;">No opponent shooter data.</div>'}</div>\n                                    </div>\n                                </div>\n                                <button class="fc-cta-btn" style="width:100%;margin-top:14px;" onclick="FC_KICKOFF_CENTER.startShootoutFromPicks()">START SHOOTOUT ▶</button>\n                            </div>`;
      }
      function fcPreviewBar(label, home, away) {
        const h = Number(home) || 0;
        const a = Number(away) || 0;
        const max = Math.max(1, h, a);
        return `\n                            <div style="display:grid;grid-template-columns:54px 1fr 70px 1fr 54px;gap:10px;align-items:center;margin:10px 0;">\n                                <strong style="text-align:right;color:#fff;">${fcStatValue(home)}</strong>\n                                <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;"><div style="height:100%;width:${(h / max) * 100}%;background:#88d81a;float:right;"></div></div>\n                                <div style="text-align:center;color:#aaa;font-size:11px;font-weight:900;letter-spacing:1px;">${label}</div>\n                                <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;"><div style="height:100%;width:${(a / max) * 100}%;background:#ff8a00;"></div></div>\n                                <strong style="color:#fff;">${fcStatValue(away)}</strong>\n                            </div>`;
      }
      function fcTopPlayers(players) {
        return [...(players || [])]
          .filter((p) => p && p.name)
          .sort(
            (a, b) =>
              (Number(b.overall) || 0) - (Number(a.overall) || 0) ||
              (Number(b.rating) || 0) - (Number(a.rating) || 0),
          )
          .slice(0, 3);
      }
      function fcRenderSpotlightPlayer(player, side, index) {
        const image = player.image_url || "";
        const color = side === "home" ? "#88d81a" : "#ff8a00";
        return `\n                            <div style="animation:fcMatchCardIn .7s ease ${1.8 + index * 0.25}s both;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border:1px solid ${color}55;border-radius:10px;padding:9px;">\n                                ${fcPlayerFace({ name: player.name, image_url: image }, 44, color)}\n                                <div style="min-width:0;flex:1;">\n                                    <div style="font-size:12px;color:#fff;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fcMatchEsc(player.name)}</div>\n                                    <div style="font-size:10px;color:#888;">${fcMatchEsc(player.slot_code || player.position || "")}</div>\n                                </div>\n                                <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${color};">${fcStatValue(player.overall)}</div>\n                            </div>`;
      }
      function fcMatchSfx(kind = "tick") {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          const ctx =
            window.__fcMatchAudio || (window.__fcMatchAudio = new AudioCtx());
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const now = ctx.currentTime;
          osc.type = kind === "start" ? "sawtooth" : "sine";
          osc.frequency.setValueAtTime(kind === "start" ? 140 : 420, now);
          osc.frequency.exponentialRampToValueAtTime(
            kind === "start" ? 62 : 220,
            now + 0.22,
          );
          gain.gain.setValueAtTime(1e-4, now);
          gain.gain.exponentialRampToValueAtTime(
            kind === "start" ? 0.08 : 0.035,
            now + 0.02,
          );
          gain.gain.exponentialRampToValueAtTime(1e-4, now + 0.28);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        } catch (e) {}
      }
      function fcNotifyChallengeUpdates(payload) {
        const updates = Array.isArray(payload?.challenge_updates)
          ? payload.challenge_updates
          : [];
        if (!updates.length) return;
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
      function fcRenderKickoffIntro(m) {
        const stats = m.stats || {};
        const preview = stats.preview || {};
        const user = preview.user || {};
        const opp = preview.opponent || {};
        const draw = Number(preview.draw_chance) || 0;
        const homeWin = Number(user.win_chance) || 0;
        const awayWin =
          Number(opp.win_chance) || Math.max(0, 100 - draw - homeWin);
        const lineups = stats.lineups || {};
        const homeName = lineups.home?.team || stats.home_team || "YOU";
        const awayName =
          lineups.away?.team || stats.away_team || m.opponent || "OPPONENT";
        const homeStars = fcTopPlayers(lineups.home?.players);
        const awayStars = fcTopPlayers(lineups.away?.players);
        return `\n                            <div id="fc-kickoff-intro" style="flex:1;min-height:0;display:flex;align-items:flex-start;justify-content:center;padding:clamp(54px,7vh,82px) 28px 28px;background:radial-gradient(circle at 50% 10%,rgba(255,215,0,0.15),transparent 42%),#05070c;overflow:auto;box-sizing:border-box;">\n                                <style>\n                                    @keyframes fcMatchFadeUp { from{opacity:0;transform:translateY(22px) scale(.98)} to{opacity:1;transform:none} }\n                                    @keyframes fcMatchScan { 0%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }\n                                    @keyframes fcMatchCardIn { from{opacity:0;transform:translateY(18px) rotateX(12deg)} to{opacity:1;transform:none} }\n                                </style>\n                                <div style="width:min(1120px,100%);display:grid;grid-template-columns:1fr;gap:18px;margin:0 auto;">\n                                    <div style="text-align:center;animation:fcMatchFadeUp .7s ease both;">\n                                        <div style="font-family:'Bebas Neue',sans-serif;font-size:clamp(12px,1.2vw,15px);letter-spacing:4px;color:#FFD700;">MATCH PREVIEW</div>\n                                        <div style="font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,4.6vw,64px);line-height:1;color:#fff;letter-spacing:2px;margin-top:8px;overflow-wrap:anywhere;word-break:break-word;">${fcMatchEsc(homeName)} VS ${fcMatchEsc(awayName)}</div>\n                                        <div style="color:#777;font-size:12px;margin-top:8px;text-transform:uppercase;letter-spacing:2px;overflow-wrap:anywhere;">${fcMatchEsc(lineups.home?.formation || "")} against ${fcMatchEsc(lineups.away?.formation || "")}</div>\n                                    </div>\n                                    <div style="position:relative;overflow:hidden;border-radius:14px;background:rgba(255,215,0,0.04);border:1px solid rgba(255,215,0,0.18);padding:9px 12px;color:#FFD700;font-size:11px;font-weight:900;letter-spacing:2px;text-align:center;animation:fcMatchFadeUp .7s ease .45s both;">\n                                        SCOUTING REPORT · CALCULATING TEAM SHAPE · LOCKING KEY PLAYERS\n                                        <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);animation:fcMatchScan 2.2s linear infinite;"></div>\n                                    </div>\n                                    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;animation:fcMatchFadeUp .7s ease .9s both;">\n                                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(136,216,26,0.25);border-radius:14px;padding:18px;text-align:right;">\n                                            <div style="font-size:11px;color:#88d81a;font-weight:900;letter-spacing:2px;">${fcMatchEsc(homeName)}</div>\n                                            <div style="font-family:'Bebas Neue',sans-serif;font-size:48px;color:#fff;">Ø ${fcStatValue(lineups.home?.overall)}</div>\n                                        </div>\n                                        <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:#FFD700;">VS</div>\n                                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,138,0,0.25);border-radius:14px;padding:18px;">\n                                            <div style="font-size:11px;color:#ff8a00;font-weight:900;letter-spacing:2px;">${fcMatchEsc(awayName)}</div>\n                                            <div style="font-family:'Bebas Neue',sans-serif;font-size:48px;color:#fff;">Ø ${fcStatValue(lineups.away?.overall)}</div>\n                                        </div>\n                                    </div>\n                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;animation:fcMatchFadeUp .7s ease 1.35s both;">\n                                        <div style="display:flex;flex-direction:column;gap:8px;">\n                                            <div style="font-size:11px;color:#88d81a;font-weight:900;letter-spacing:2px;">${fcMatchEsc(homeName)} TOP THREE</div>\n                                            ${homeStars.map((p, i) => fcRenderSpotlightPlayer(p, "home", i)).join("") || '<div style="color:#777;font-size:12px;">No lineup stars found.</div>'}\n                                        </div>\n                                        <div style="display:flex;flex-direction:column;gap:8px;">\n                                            <div style="font-size:11px;color:#ff8a00;font-weight:900;letter-spacing:2px;text-align:right;">${fcMatchEsc(awayName)} TOP THREE</div>\n                                            ${awayStars.map((p, i) => fcRenderSpotlightPlayer(p, "away", i)).join("") || '<div style="color:#777;font-size:12px;text-align:right;">No lineup stars found.</div>'}\n                                        </div>\n                                    </div>\n                                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:18px;animation:fcMatchFadeUp .7s ease 2.2s both;">\n                                        ${fcPreviewBar("ATTACK", user.attack, opp.attack)}\n                                        ${fcPreviewBar("MIDFIELD", user.midfield, opp.midfield)}\n                                        ${fcPreviewBar("DEFENSE", user.defense, opp.defense)}\n                                        <div style="margin-top:18px;">\n                                            <div style="display:flex;height:18px;border-radius:999px;overflow:hidden;background:#111;border:1px solid rgba(255,255,255,0.12);">\n                                                <div style="width:${homeWin}%;background:#88d81a;"></div>\n                                                <div style="width:${draw}%;background:#FFD700;"></div>\n                                                <div style="width:${awayWin}%;background:#ff8a00;"></div>\n                                            </div>\n                                            <div style="display:flex;justify-content:space-between;color:#aaa;font-size:11px;font-weight:900;margin-top:8px;">\n                                                <span style="color:#88d81a;">${fcMatchEsc(homeName)} ${homeWin}%</span>\n                                                <span style="color:#FFD700;">DRAW ${draw}%</span>\n                                                <span style="color:#ff8a00;">${fcMatchEsc(awayName)} ${awayWin}%</span>\n                                            </div>\n                                        </div>\n                                    </div>\n                                    <button class="fc-cta-btn" style="width:100%;font-size:18px;padding:14px;animation:fcMatchFadeUp .7s ease 3.1s both;" onclick="FC_KICKOFF_CENTER.startPendingMatch()">START MATCH ▶</button>\n                                </div>\n                            </div>`;
      }
      function fcEnterFullMatchStage(liveEl) {
        liveEl.dataset.fcFullscreenMatch = "1";
        document.body.appendChild(liveEl);
        liveEl.style.cssText =
          "position:fixed;inset:0;z-index:2147483000;background:#05070c;display:flex;flex-direction:column;height:100dvh;width:100dvw;max-width:none;max-height:none;overflow:hidden;margin:0;padding:0;transform:none;";
        document.body.style.overflow = "hidden";
        const close = document.createElement("button");
        close.textContent = "×";
        close.style.cssText =
          "position:absolute;top:14px;right:16px;z-index:3;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.55);color:#fff;font-size:24px;cursor:pointer;";
        close.onclick = () => window.FC_KICKOFF_CENTER.closeFullMatch();
        liveEl.appendChild(close);
      }
      function fcPrepareFullResultStage() {
        document.getElementById("fc-pre-kickoff").style.display = "none";
        const liveEl = document.getElementById("fc-match-live");
        fcEnterFullMatchStage(liveEl);
        const scoreboardEl = document.getElementById("fc-scoreboard");
        const feed = document.getElementById("fc-event-feed");
        const finalResultEl = document.getElementById("fc-final-result");
        if (scoreboardEl) scoreboardEl.style.display = "none";
        if (feed) feed.style.display = "none";
        if (finalResultEl) {
          finalResultEl.style.display = "block";
          finalResultEl.style.flex = "1";
          finalResultEl.style.overflowY = "auto";
          finalResultEl.style.padding = "16px";
        }
        return finalResultEl;
      }
      function fcSetLiveStageVisible() {
        const feed = document.getElementById("fc-event-feed");
        const scoreboardEl = document.getElementById("fc-scoreboard");
        const finalResultEl = document.getElementById("fc-final-result");
        if (scoreboardEl) scoreboardEl.style.display = "block";
        if (feed) {
          feed.innerHTML = "";
          feed.style.display = "flex";
        }
        if (finalResultEl) {
          finalResultEl.style.display = "none";
          finalResultEl.innerHTML = "";
        }
        return {
          feed: feed,
          scoreboardEl: scoreboardEl,
          finalResultEl: finalResultEl,
        };
      }
      function fcAppendLiveEvent(feed, ev) {
        if (!feed) return;
        const EVENT_ICONS = {
          goal: "⚽",
          save: "🧤",
          miss: "💨",
          yellow_card: "🟨",
          corner: "🚩",
          atmosphere: "📣",
          halftime: "🍊",
          fulltime: "🏁",
        };
        const isGoal = ev.type === "goal";
        const isOppGoal = isGoal && ev.team === "opponent";
        const isUserGoal = isGoal && ev.team === "user";
        const isHalf = ev.type === "halftime";
        const isFull = ev.type === "fulltime";
        let bgColor = "rgba(255,255,255,0.03)";
        let borderCol = "rgba(255,255,255,0.07)";
        let minuteCol = "#555";
        if (isUserGoal) {
          bgColor = "rgba(100,255,100,0.08)";
          borderCol = "rgba(100,255,100,0.3)";
          minuteCol = "#6f6";
        } else if (isOppGoal) {
          bgColor = "rgba(255,80,80,0.08)";
          borderCol = "rgba(255,80,80,0.3)";
          minuteCol = "#f66";
        } else if (isHalf || isFull) {
          bgColor = "rgba(255,215,0,0.06)";
          borderCol = "rgba(255,215,0,0.25)";
          minuteCol = "#FFD700";
        } else if (ev.type === "yellow_card") {
          bgColor = "rgba(255,215,0,0.05)";
          borderCol = "rgba(255,215,0,0.2)";
          minuteCol = "#FFD700";
        }
        const row = document.createElement("div");
        row.className = `match-event ${isUserGoal || isOppGoal ? "goal-flash" : ""}`;
        row.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;background:${bgColor};border:1px solid ${borderCol};`;
        row.innerHTML = `\n                            <div style="font-size:18px;flex-shrink:0;margin-top:1px;">${EVENT_ICONS[ev.type] || "•"}</div>\n                            <div style="flex:1;min-width:0;">\n                                <div style="font-size:13px;color:#ddd;line-height:1.4;">${fcMatchEsc(ev.commentary || "")}</div>\n                                ${ev.player ? `<div style="font-size:11px;color:#888;margin-top:3px;">${fcMatchEsc(ev.player)}</div>` : ""}\n                            </div>\n                            <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:${minuteCol};flex-shrink:0;">${ev.minute}'</div>`;
        feed.appendChild(row);
        feed.scrollTop = feed.scrollHeight;
      }
      function fcRunLiveMatch(m, options = {}) {
        return new Promise((resolve) => {
          const { feed: feed, finalResultEl: finalResultEl } =
            fcSetLiveStageVisible();
          const scoreEl = document.getElementById("fc-live-score");
          const minuteEl = document.getElementById("fc-live-minute");
          const progressEl = document.getElementById("fc-progress-bar");
          const oppNameEl = document.getElementById("fc-opp-name");
          if (oppNameEl)
            oppNameEl.textContent = (m.opponent || "OPPONENT").toUpperCase();
          if (scoreEl) scoreEl.textContent = "0 - 0";
          if (minuteEl) minuteEl.textContent = "⏱ 0'";
          if (progressEl) {
            progressEl.style.width = "0%";
            progressEl.style.background = "#FFD700";
          }
          window.FC_KICKOFF_CENTER.activeMatch = m;
          window.FC_KICKOFF_CENTER.matchComplete = false;
          window.FC_KICKOFF_CENTER.cancelCurrentMatch = false;
          let uGoals = 0,
            oGoals = 0;
          const SCALE = options.scale || 52e3 / 90;
          const startTime = Date.now();
          const sortedEvents = [...(m.events || [])].sort(
            (a, b) => a.minute - b.minute,
          );
          const minuteInterval = setInterval(() => {
            if (window.FC_KICKOFF_CENTER.cancelCurrentMatch) {
              clearInterval(minuteInterval);
              resolve(false);
              return;
            }
            const elapsed = (Date.now() - startTime) / SCALE;
            const displayMin = Math.min(90, Math.round(elapsed));
            if (minuteEl) minuteEl.textContent = `⏱ ${displayMin}'`;
            if (progressEl)
              progressEl.style.width = `${(displayMin / 90) * 100}%`;
            if (displayMin >= 90) clearInterval(minuteInterval);
          }, 500);
          sortedEvents.forEach((ev) => {
            const delay = Math.max(800, ev.minute * SCALE);
            setTimeout(() => {
              if (window.FC_KICKOFF_CENTER.cancelCurrentMatch) return;
              if (ev.type === "goal") {
                if (ev.team === "user") uGoals++;
                else oGoals++;
                if (scoreEl) {
                  scoreEl.textContent = `${uGoals} - ${oGoals}`;
                  scoreEl.style.animation = "none";
                  requestAnimationFrame(() => {
                    scoreEl.style.animation = "scoreWiggle 0.5s ease";
                  });
                }
              }
              if (ev.type !== "fulltime") fcAppendLiveEvent(feed, ev);
              if (ev.type === "fulltime") {
                clearInterval(minuteInterval);
                if (minuteEl) minuteEl.textContent = "⏱ 90' FT";
                if (progressEl) {
                  progressEl.style.width = "100%";
                  progressEl.style.background = fcMatchResultColor(
                    m.result,
                    m.stats || {},
                  );
                }
                if (feed) feed.style.display = "none";
                if (finalResultEl) {
                  const col = fcMatchResultColor(m.result, m.stats || {});
                  const msg =
                    options.title || fcMatchResultText(m.result, m.stats || {});
                  finalResultEl.style.display = "block";
                  finalResultEl.style.flex = "1";
                  finalResultEl.style.overflowY = "auto";
                  finalResultEl.innerHTML = fcRenderMatchCenter(m, msg, col);
                  if (options.continueLabel) {
                    finalResultEl.insertAdjacentHTML(
                      "beforeend",
                      `<button class="fc-cta-btn" style="width:100%;margin-top:12px;" onclick="FC_KICKOFF_CENTER.continueModeSequence()">${options.continueLabel}</button>`,
                    );
                  }
                  if (options.quitLabel) {
                    finalResultEl.insertAdjacentHTML(
                      "beforeend",
                      `<button class="fc-cta-btn" style="width:100%;margin-top:8px;background:rgba(255,255,255,0.08);color:#fff;" onclick="FC_KICKOFF_CENTER.closeFullMatch()">${options.quitLabel}</button>`,
                    );
                  }
                  fcNotifyChallengeUpdates(m);
                }
                window.FC_KICKOFF_CENTER.matchComplete = true;
                window.FC_KICKOFF_CENTER.activeMatch = null;
                resolve(true);
              }
            }, delay);
          });
        });
      }
      async function fcShowModeResults(mode, data) {
        const finalEl = fcPrepareFullResultStage();
        if (!finalEl) return;
        if (mode === "shootout") {
          window.FC_KICKOFF_CENTER.shootoutSetup = data;
          finalEl.innerHTML = fcRenderShootoutPicker(data);
          return;
        }
        const matches = data.matches || [];
        window.FC_KICKOFF_CENTER.modeMatches = matches;
        window.FC_KICKOFF_CENTER.modeData = data;
        window.FC_KICKOFF_CENTER.modeType = mode;
        window.FC_KICKOFF_CENTER.modeIndex = 0;
        window.FC_KICKOFF_CENTER.continueModeSequence = async () => {
          const idx = window.FC_KICKOFF_CENTER.modeIndex || 0;
          const match = matches[idx];
          if (!match) {
            window.FC_KICKOFF_CENTER.matchComplete = true;
            finalEl.innerHTML =
              mode === "tournament"
                ? fcRenderTournamentHub(data, matches.length)
                : fcRenderSeasonHub(data, matches.length);
            window.FC_KICKOFF_CENTER.showStoredMatch(0);
            return;
          }
          window.FC_KICKOFF_CENTER.startPendingMatch = () =>
            window.FC_KICKOFF_CENTER.beginCurrentModeMatch();
          finalEl.innerHTML = fcRenderKickoffIntro(match);
          return;
          finalEl.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;text-align:center;">\n                                <div style="color:#FFD700;font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:2px;">${fcMatchEsc(match.stage || `MATCH ${idx + 1}`)}</div>\n                                <div style="color:#888;font-size:12px;font-weight:900;letter-spacing:2px;">${fcMatchEsc(match.stats?.lineups?.home?.team || "Home")} VS ${fcMatchEsc(match.stats?.lineups?.away?.team || match.opponent || "Opponent")}</div>\n                                <button class="fc-cta-btn" style="width:min(420px,80vw);" onclick="FC_KICKOFF_CENTER.beginCurrentModeMatch()">START MATCH ▶</button>\n                            </div>`;
        };
        window.FC_KICKOFF_CENTER.beginCurrentModeMatch = async () => {
          const idx = window.FC_KICKOFF_CENTER.modeIndex || 0;
          const match = matches[idx];
          if (!match) return;
          const hasNext = idx < matches.length - 1;
          const userEliminatedSemi =
            mode === "tournament" && idx === 0 && match.result === "L";
          await fcRunLiveMatch(match, {
            title: match.stage || `Match ${idx + 1}`,
            continueLabel: userEliminatedSemi
              ? "WATCH OTHER SEMI ▶"
              : hasNext
                ? "NEXT MATCH ▶"
                : "VIEW FINAL TABLE ▶",
            quitLabel: userEliminatedSemi ? "QUIT TO DASHBOARD" : "",
          });
          window.FC_KICKOFF_CENTER.modeIndex = idx + 1;
        };
        window.FC_KICKOFF_CENTER.continueModeSequence();
      }
      window.FC_KICKOFF_CENTER = {
        activeMatch: null,
        matchComplete: true,
        cancelCurrentMatch: false,
        modeMatches: [],
        closeFullMatch() {
          if (this.activeMatch && !this.matchComplete) {
            this.forfeitActiveMatch();
            return;
          }
          const liveEl = document.querySelector(
            '[data-fc-fullscreen-match="1"]',
          );
          if (liveEl) liveEl.remove();
          document.body.style.overflow = "";
          openPanel("kickoff", "KICK OFF");
        },
        async forfeitActiveMatch() {
          const m = this.activeMatch || {};
          this.matchComplete = true;
          this.cancelCurrentMatch = true;
          document.getElementById("fc-kickoff-intro")?.remove();
          try {
            const r = await FC.play.forfeit({
              opponent: m.opponent || "",
              opponent_user_id: m.opponent_user_id || "",
              opponent_lineup_id: m.opponent_lineup_id || "",
              mode: m.stats?.mode || "quickmatch",
            });
            const forfeitMatch = r.success
              ? r.data
              : {
                  result: "L",
                  score_for: 0,
                  score_against: 3,
                  opponent: m.opponent || "Opponent",
                  stats: {
                    forfeit: true,
                    forfeit_label: "Forfeit Win (3-0)",
                    dp_change: 0,
                    player_stats: [],
                    lineups: { home: { players: [] }, away: { players: [] } },
                    substitutions: [],
                  },
                  events: [
                    {
                      minute: 0,
                      commentary:
                        "Forfeit confirmed. Opponent awarded a 3-0 win.",
                    },
                  ],
                  dp_change: 0,
                };
            const scoreboardEl = document.getElementById("fc-scoreboard");
            const feed = document.getElementById("fc-event-feed");
            const finalEl = document.getElementById("fc-final-result");
            if (scoreboardEl) scoreboardEl.style.display = "none";
            if (feed) feed.style.display = "none";
            if (finalEl) {
              finalEl.style.display = "block";
              finalEl.style.flex = "1";
              finalEl.style.overflowY = "auto";
              finalEl.innerHTML = fcRenderMatchCenter(
                forfeitMatch,
                "FORFEIT",
                "#f66",
              );
              fcNotifyChallengeUpdates(forfeitMatch);
            }
            this.activeMatch = null;
          } catch (e) {
            this.activeMatch = null;
            this.closeFullMatch();
          }
        },
        showStoredMatch(index) {
          const match = this.modeMatches?.[index];
          const slot = document.getElementById("fc-mode-match-slot");
          if (!match || !slot) return;
          const col = fcMatchResultColor(match.result, match.stats || {});
          const msg =
            match.stage || fcMatchResultText(match.result, match.stats || {});
          slot.innerHTML = fcRenderMatchCenter(match, msg, col);
        },
        setShootoutPick(round, playerId) {
          this.shootoutPicks = this.shootoutPicks || {};
          if (playerId) this.shootoutPicks[round] = playerId;
          else delete this.shootoutPicks[round];
          const select = document.querySelector(
            `[data-shootout-order="${round}"]`,
          );
          if (select && String(select.value) !== String(playerId || ""))
            select.value = playerId || "";
        },
        moveShootoutPick(round, dir) {
          const from = document.querySelector(
            `[data-shootout-order="${round}"]`,
          );
          const to = document.querySelector(
            `[data-shootout-order="${round + dir}"]`,
          );
          if (!from || !to) return;
          const tmp = from.value;
          from.value = to.value;
          to.value = tmp;
          this.setShootoutPick(round, from.value);
          this.setShootoutPick(round + dir, to.value);
        },
        autoFillShootoutOrder() {
          const shooters = this.shootoutSetup?.shooters || [];
          [0, 1, 2, 3, 4].forEach((round) =>
            this.setShootoutPick(round, shooters[round]?.player_id || ""),
          );
        },
        async startShootoutFromPicks() {
          const picks = [0, 1, 2, 3, 4].map((i) => {
            const select = document.querySelector(
              `[data-shootout-order="${i}"]`,
            );
            return select?.value || this.shootoutPicks?.[i] || null;
          });
          const finalEl = document.getElementById("fc-final-result");
          if (finalEl) {
            finalEl.innerHTML =
              "<div style=\"height:100%;display:flex;align-items:center;justify-content:center;color:#FFD700;font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:2px;\">LOCKING TAKERS...</div>";
          }
          const r = await FC.play.shootout({ shooters: picks });
          if (!r.success) {
            if (finalEl)
              finalEl.innerHTML = `<div style="color:#f66;text-align:center;padding:40px;">${fcMatchEsc(r.error || "Failed to start shootout")}</div>`;
            return;
          }
          await this.animateShootout(r.data);
          fcNotifyChallengeUpdates(r.data);
          FC_PLAY.loadMatchHistory();
          FC_PLAY.loadDivisionStatus();
        },
        async animateShootout(data) {
          const finalEl = document.getElementById("fc-final-result");
          if (!finalEl) return;
          const shown = [];
          const kicks = data.kicks || [];
          const showKick = (index) => {
            const kick = kicks[index];
            if (!kick) {
              finalEl.innerHTML = fcRenderShootoutHub({
                ...data,
                total_kicks: kicks.length,
                complete: true,
              });
              return;
            }
            shown.push(kick);
            fcMatchSfx(kick.user_scored ? "reveal" : "start");
            finalEl.innerHTML = fcRenderShootoutHub({
              ...data,
              kicks: shown,
              total_kicks: kicks.length,
              complete: false,
            });
            if (index < kicks.length - 1) {
              finalEl.insertAdjacentHTML(
                "beforeend",
                `<button class="fc-cta-btn" style="width:100%;margin-top:12px;" onclick="FC_KICKOFF_CENTER.nextShootoutKick(${index + 1})">NEXT PENALTY ▶</button>`,
              );
            } else {
              finalEl.innerHTML = fcRenderShootoutHub({
                ...data,
                total_kicks: kicks.length,
                complete: true,
              });
            }
          };
          this.nextShootoutKick = showKick;
          showKick(0);
        },
        setTab(tab) {
          document
            .querySelectorAll("#fc-match-center .fc-match-tab")
            .forEach((btn) => {
              const active = btn.dataset.tab === tab;
              btn.style.background = active
                ? "#FFD700"
                : "rgba(255,255,255,0.06)";
              btn.style.color = active ? "#000" : "#aaa";
              btn.style.borderColor = active
                ? "#FFD700"
                : "rgba(255,255,255,0.12)";
            });
          document
            .querySelectorAll("#fc-match-center .fc-match-panel")
            .forEach((panel) => {
              panel.style.display =
                panel.dataset.panel === tab ? "block" : "none";
            });
        },
        filterPlayers(team) {
          document
            .querySelectorAll("#fc-match-center [data-team]")
            .forEach((row) => {
              row.style.display =
                team === "all" || row.dataset.team === team ? "" : "none";
              if (
                row.classList.contains("fc-player-detail-row") &&
                row.style.display !== "none"
              )
                row.style.display = "none";
            });
        },
        togglePlayer(row) {
          const detail = row.nextElementSibling;
          if (!detail || !detail.classList.contains("fc-player-detail-row"))
            return;
          detail.style.display =
            detail.style.display === "none" ? "table-row" : "none";
        },
      };
      document
        .getElementById("fc-play-btn")
        .addEventListener("click", async () => {
          const btn = document.getElementById("fc-play-btn");
          const mode = btn?.dataset?.mode || "quickmatch";
          if (mode !== "quickmatch") {
            btn.disabled = true;
            btn.textContent =
              mode === "tournament"
                ? "Building bracket..."
                : mode === "season"
                  ? "Generating season..."
                  : "Loading shootout...";
            const r =
              mode === "tournament"
                ? await FC.play.tournament()
                : mode === "season"
                  ? await FC.play.season()
                  : await FC.play.shootout({ preview: 1 });
            btn.disabled = false;
            if (!r.success) {
              _panelBody.insertAdjacentHTML(
                "beforeend",
                `<div style="color:#f66;text-align:center;padding:10px;">${r.error || "Failed to start mode"}</div>`,
              );
              FC_PLAY.selectMode(mode);
              return;
            }
            await fcShowModeResults(mode, r.data);
            fcNotifyChallengeUpdates(r.data);
            FC_PLAY.loadMatchHistory();
            FC_PLAY.loadDivisionStatus();
            return;
          }
          document.getElementById("fc-play-btn").disabled = true;
          document.getElementById("fc-play-btn").textContent =
            "Loading match...";
          const r = await FC.play.kickoff();
          if (!r.success) {
            document.getElementById("fc-play-btn").disabled = false;
            document.getElementById("fc-play-btn").textContent = "KICK OFF ▶";
            _panelBody.insertAdjacentHTML(
              "beforeend",
              `<div style="color:#f66;text-align:center;padding:10px;">${r.error || "Failed to start match"}</div>`,
            );
            return;
          }
          const m = r.data;
          window.FC_KICKOFF_CENTER.activeMatch = m;
          window.FC_KICKOFF_CENTER.matchComplete = false;
          window.FC_KICKOFF_CENTER.cancelCurrentMatch = false;
          document.getElementById("fc-pre-kickoff").style.display = "none";
          const liveEl = document.getElementById("fc-match-live");
          fcEnterFullMatchStage(liveEl);
          document.getElementById("fc-opp-name").textContent =
            m.opponent.toUpperCase();
          const feed = document.getElementById("fc-event-feed");
          const scoreEl = document.getElementById("fc-live-score");
          const minuteEl = document.getElementById("fc-live-minute");
          const progressEl = document.getElementById("fc-progress-bar");
          const scoreboardEl = document.getElementById("fc-scoreboard");
          const finalResultEl = document.getElementById("fc-final-result");
          if (scoreboardEl) scoreboardEl.style.display = "none";
          if (feed) feed.style.display = "none";
          if (finalResultEl) finalResultEl.style.display = "none";
          liveEl.insertAdjacentHTML("afterbegin", fcRenderKickoffIntro(m));
          let uGoals = 0,
            oGoals = 0;
          const events = m.events || [];
          const SCALE = 52e3 / 90;
          const EVENT_ICONS = {
            goal: "⚽",
            save: "🧤",
            miss: "💨",
            yellow_card: "🟨",
            corner: "🚩",
            atmosphere: "📣",
            halftime: "🍊",
            fulltime: "🏁",
          };
          function appendEvent(ev) {
            const isGoal = ev.type === "goal";
            const isOppGoal = isGoal && ev.team === "opponent";
            const isUserGoal = isGoal && ev.team === "user";
            const isHalf = ev.type === "halftime";
            const isFull = ev.type === "fulltime";
            const iconStr = EVENT_ICONS[ev.type] || "•";
            let bgColor = "rgba(255,255,255,0.03)";
            let borderCol = "rgba(255,255,255,0.07)";
            let minuteCol = "#555";
            if (isUserGoal) {
              bgColor = "rgba(100,255,100,0.08)";
              borderCol = "rgba(100,255,100,0.3)";
              minuteCol = "#6f6";
            } else if (isOppGoal) {
              bgColor = "rgba(255,80,80,0.08)";
              borderCol = "rgba(255,80,80,0.3)";
              minuteCol = "#f66";
            } else if (isHalf || isFull) {
              bgColor = "rgba(255,215,0,0.06)";
              borderCol = "rgba(255,215,0,0.25)";
              minuteCol = "#FFD700";
            } else if (ev.type === "yellow_card") {
              bgColor = "rgba(255,215,0,0.05)";
              borderCol = "rgba(255,215,0,0.2)";
              minuteCol = "#FFD700";
            }
            const row = document.createElement("div");
            row.className = `match-event ${isUserGoal || isOppGoal ? "goal-flash" : ""}`;
            row.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;background:${bgColor};border:1px solid ${borderCol};`;
            row.innerHTML = `\n                        <div style="font-size:18px;flex-shrink:0;margin-top:1px;">${iconStr}</div>\n                        <div style="flex:1;min-width:0;">\n                            <div style="font-size:13px;color:#ddd;line-height:1.4;">${ev.commentary || ""}</div>\n                            ${ev.player ? `<div style="font-size:11px;color:#888;margin-top:3px;">${ev.player}</div>` : ""}\n                        </div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:${minuteCol};flex-shrink:0;">${ev.minute}'</div>\n                    `;
            feed.appendChild(row);
            feed.scrollTop = feed.scrollHeight;
          }
          let matchStarted = false;
          window.FC_KICKOFF_CENTER.startPendingMatch = () => {
            if (matchStarted) return;
            matchStarted = true;
            fcMatchSfx("start");
            document.getElementById("fc-kickoff-intro")?.remove();
            if (scoreboardEl) scoreboardEl.style.display = "block";
            if (feed) feed.style.display = "flex";
            beginLiveMatch();
          };
          fcMatchSfx("reveal");
          setTimeout(
            () => window.FC_KICKOFF_CENTER.startPendingMatch?.(),
            11500,
          );
          function beginLiveMatch() {
            const startTime = Date.now();
            const sortedEvents = [...events].sort(
              (a, b) => a.minute - b.minute,
            );
            const minuteInterval = setInterval(() => {
              if (window.FC_KICKOFF_CENTER.cancelCurrentMatch) {
                clearInterval(minuteInterval);
                return;
              }
              const elapsed = (Date.now() - startTime) / SCALE;
              const displayMin = Math.min(90, Math.round(elapsed));
              minuteEl.textContent = `⏱ ${displayMin}'`;
              progressEl.style.width = `${(displayMin / 90) * 100}%`;
              if (displayMin >= 90) clearInterval(minuteInterval);
            }, 500);
            sortedEvents.forEach((ev) => {
              const delay = Math.max(800, ev.minute * SCALE);
              setTimeout(() => {
                if (window.FC_KICKOFF_CENTER.cancelCurrentMatch) return;
                if (ev.type === "goal") {
                  if (ev.team === "user") uGoals++;
                  else oGoals++;
                  scoreEl.textContent = `${uGoals} - ${oGoals}`;
                  scoreEl.style.animation = "none";
                  requestAnimationFrame(() => {
                    scoreEl.style.animation = "scoreWiggle 0.5s ease";
                  });
                }
                if (ev.type !== "fulltime") appendEvent(ev);
                if (ev.type === "fulltime") {
                  clearInterval(minuteInterval);
                  minuteEl.textContent = "⏱ 90' FT";
                  progressEl.style.width = "100%";
                  progressEl.style.background =
                    m.result === "W"
                      ? "#6f6"
                      : m.result === "D"
                        ? "#FFD700"
                        : "#f66";
                  const col =
                    m.result === "W"
                      ? "#6f6"
                      : m.result === "D"
                        ? "#FFD700"
                        : "#f66";
                  const msg =
                    m.result === "W"
                      ? "VICTORY!"
                      : m.result === "D"
                        ? "DRAW"
                        : "DEFEAT";
                  const finalEl = document.getElementById("fc-final-result");
                  if (!finalEl) return;
                  feed.style.display = "none";
                  finalEl.style.display = "block";
                  finalEl.style.flex = "1";
                  finalEl.style.overflowY = "auto";
                  finalEl.innerHTML = fcRenderMatchCenter(m, msg, col);
                  fcNotifyChallengeUpdates(m);
                  window.FC_KICKOFF_CENTER.matchComplete = true;
                  window.FC_KICKOFF_CENTER.activeMatch = null;
                  appendEvent({ ...ev, type: "fulltime" });
                }
              }, delay);
            });
          }
        });
      break;
    }
    case "matches": {
      _panelHTML(
        `\n                    <div class="fc-matches-fullscreen">\n                        <div class="fc-matches-ambient"></div>\n                        <div id="fc-match-history">\n                            <div class="fc-division-loading">Loading match center...</div>\n                        </div>\n                    </div>`,
      );
      await FC_PLAY.loadMatchHistory();
      break;
    }
    case "division": {
      _panelHTML(
        `\n                    <div class="fc-division-fullscreen">\n                        <div class="fc-division-ambient"></div>\n                        <section class="fc-division-hero">\n                            <div class="fc-division-kicker">Competitive Division Center</div>\n                            <div id="fc-division-status">\n                                <div class="fc-division-loading">Loading division status...</div>\n                            </div>\n                        </section>\n                        <section class="fc-division-board-shell">\n                            <div class="fc-division-section-head">\n                                <div>\n                                    <div class="fc-division-kicker">Ranked table</div>\n                                    <h3>Division leaderboard</h3>\n                                </div>\n                                <span>Tabs separate every division</span>\n                            </div>\n                            <div id="fc-leaderboard">\n                                <div class="fc-division-loading">Loading leaderboard...</div>\n                            </div>\n                        </section>\n                    </div>`,
      );
      const status = await FC.play.divisionStatus();
      FC_PLAY.loadDivisionStatus();
      FC_PLAY.loadLeaderboard(status.success ? status.data.division_level : 5);
      break;
    }
    case "challenges": {
      _panelHTML(
        `\n                    <div class="fc-challenges-fullscreen">\n                        <div class="fc-challenges-ambient"></div>\n                        <div id="fc-challenges-list">\n                            <div class="fc-division-loading">Loading challenges...</div>\n                        </div>\n                    </div>`,
      );
      await FC_CHALLENGES.init();
      break;
    }
    case "chest-bronze":
      await _openChestPanel(
        "bronze",
        "#cd7f32",
        "/frontend/assets/images/ui/Gemini_Generated_Image_895eev895eev895e (1).png",
      );
      break;
    case "chest-silver":
      await _openChestPanel(
        "silver",
        "#c0c0c0",
        "/frontend/assets/images/ui/Gemini_Generated_Image_l8jbs9l8jbs9l8jb (1) (1).png",
      );
      break;
    case "chest-gold":
      await _openChestPanel(
        "gold",
        "#FFD700",
        "/frontend/assets/images/ui/Gemini_Generated_Image_bm31l3bm31l3bm31 (1).png",
      );
      break;
    case "account": {
      _panelHTML(
        `\n            <div id="fc-settings-content" style="min-height:calc(100vh - 82px);background:radial-gradient(circle at top right, rgba(255,204,0,0.08), transparent 24%),radial-gradient(circle at bottom left, rgba(255,120,0,0.08), transparent 22%),linear-gradient(180deg,#06080d,#0b1017 32%,#080b11 100%);color:#fff;padding:28px 30px 38px;box-sizing:border-box;">\n                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:22px;">\n                    <div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:1px;line-height:0.95;">ACCOUNT CENTER</div>\n                        <div style="margin-top:8px;color:#8f98aa;font-size:14px;line-height:1.6;max-width:760px;">Manage your identity, credentials, and account safety from one cleaner dashboard. Email updates, password changes, and destructive actions are separated so the page is easier to scan and safer to use.</div>\n                    </div>\n                    <button onclick="FC_SETTINGS.logout()" style="background:linear-gradient(135deg,#ffb000,#ff8c00);color:#0b1017;border:none;padding:12px 18px;border-radius:14px;font-size:12px;font-weight:900;cursor:pointer;letter-spacing:0.08em;">LOG OUT</button>\n                </div>\n\n                <div id="fc-settings-msg-wrap" style="min-height:0;margin-bottom:16px;"></div>\n\n                <div style="display:grid;grid-template-columns:minmax(320px,0.95fr) minmax(420px,1.25fr);gap:20px;align-items:start;">\n                    <section style="display:flex;flex-direction:column;gap:18px;">\n                        <div style="padding:24px;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025));border:1px solid rgba(255,255,255,0.08);box-shadow:0 24px 48px rgba(0,0,0,0.28);">\n                            <div style="display:flex;align-items:center;gap:16px;">\n                                <div id="fc-settings-avatar" style="width:78px;height:78px;border-radius:24px;background:linear-gradient(135deg,#ffcc00,#ff8c00);display:flex;align-items:center;justify-content:center;color:#111;font-family:'Bebas Neue',sans-serif;font-size:40px;letter-spacing:0.06em;box-shadow:0 12px 30px rgba(255,170,0,0.28);">-</div>\n                                <div style="min-width:0;">\n                                    <div id="fc-settings-username" style="font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:0.04em;line-height:0.95;">-</div>\n                                    <div id="fc-settings-email" style="margin-top:8px;color:#a7b1c2;font-size:15px;line-height:1.5;word-break:break-word;">-</div>\n                                    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">\n                                        <span id="fc-settings-provider" style="padding:7px 12px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);font-size:11px;font-weight:900;color:#dfe5ef;">LOCAL ACCOUNT</span>\n                                        <span id="fc-settings-member-since" style="padding:7px 12px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);font-size:11px;font-weight:900;color:#dfe5ef;">MEMBER</span>\n                                    </div>\n                                </div>\n                            </div>\n                            <div style="margin-top:20px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">\n                                <div style="padding:16px;border-radius:18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);">\n                                    <div style="font-size:10px;color:#718097;font-weight:900;letter-spacing:0.16em;">DIVISION POINTS</div>\n                                    <div id="fc-settings-points" style="margin-top:8px;font-family:'Bebas Neue',sans-serif;font-size:40px;color:#ffcc00;line-height:1;">-</div>\n                                </div>\n                                <div style="padding:16px;border-radius:18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);">\n                                    <div style="font-size:10px;color:#718097;font-weight:900;letter-spacing:0.16em;">ACTIVE LINEUP</div>\n                                    <div id="fc-settings-lineup" style="margin-top:8px;font-family:'Bebas Neue',sans-serif;font-size:40px;color:#fff;line-height:1;">-</div>\n                                </div>\n                            </div>\n                        </div>\n\n                        <div style="padding:20px;border-radius:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:11px;color:#75829a;font-weight:900;letter-spacing:0.18em;">SAFETY SUMMARY</div>\n                            <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">\n                                <div style="padding:12px 14px;border-radius:16px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;gap:12px;"><span style="font-size:13px;color:#dfe5ef;">Email identity loaded</span><strong style="font-size:12px;color:#80ed99;letter-spacing:0.08em;">ACTIVE</strong></div>\n                                <div style="padding:12px 14px;border-radius:16px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;gap:12px;"><span style="font-size:13px;color:#dfe5ef;">Password reset available</span><strong style="font-size:12px;color:#4fc3f7;letter-spacing:0.08em;">READY</strong></div>\n                                <div style="padding:12px 14px;border-radius:16px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;gap:12px;"><span style="font-size:13px;color:#dfe5ef;">Danger zone isolated</span><strong style="font-size:12px;color:#ff9f1c;letter-spacing:0.08em;">PROTECTED</strong></div>\n                            </div>\n                        </div>\n\n                        <div style="padding:20px;border-radius:24px;background:linear-gradient(180deg,rgba(255,204,0,0.09),rgba(255,255,255,0.03));border:1px solid rgba(255,204,0,0.16);">\n                            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">\n                                <div>\n                                    <div style="font-size:11px;color:#f3c14b;font-weight:900;letter-spacing:0.18em;">GUIDED TOUR</div>\n                                    <div id="fc-settings-onboarding-copy" style="margin-top:6px;color:#d6deea;font-size:13px;line-height:1.6;max-width:540px;">New managers get this guided walkthrough once. You can also replay it manually from this account panel.</div>\n                                </div>\n                                <div style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);font-size:11px;font-weight:900;letter-spacing:0.12em;">\n                                    STATUS:\n                                    <span id="fc-settings-onboarding-status" style="color:#ffd166;">READY FOR FIRST RUN</span>\n                                </div>\n                            </div>\n                            <div style="margin-top:16px;display:flex;justify-content:flex-start;">\n                                <button id="fc-settings-onboarding-btn" style="background:linear-gradient(135deg,#ffcc00,#ff8c00);color:#0b1017;border:none;padding:14px 18px;border-radius:14px;font-size:12px;font-weight:900;cursor:pointer;letter-spacing:0.08em;" onclick="FC_SETTINGS.replayOnboarding()">REPLAY TUTORIAL</button>\n                            </div>\n                        </div>\n                    </section>\n\n                    <section style="display:flex;flex-direction:column;gap:18px;">\n                        <div style="padding:22px;border-radius:26px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:11px;color:#75829a;font-weight:900;letter-spacing:0.18em;">UPDATE EMAIL</div>\n                            <div style="margin-top:6px;color:#a5b0c1;font-size:13px;line-height:1.6;">Change your login email. Confirm with your current password before saving.</div>\n                            <div style="margin-top:16px;display:grid;grid-template-columns:1fr;gap:10px;">\n                                <input id="fc-new-email" type="email" placeholder="New email address" style="width:100%;background:#0f131a;color:#fff;border:1px solid rgba(255,255,255,0.12);padding:14px 16px;border-radius:14px;font-size:14px;outline:none;box-sizing:border-box;">\n                                <input id="fc-email-password" type="password" placeholder="Current password" style="width:100%;background:#0f131a;color:#fff;border:1px solid rgba(255,255,255,0.12);padding:14px 16px;border-radius:14px;font-size:14px;outline:none;box-sizing:border-box;">\n                                <button id="fc-settings-email-btn" style="margin-top:4px;background:linear-gradient(135deg,#ffffff,#dfe6f2);color:#0a0f16;border:none;padding:14px 16px;border-radius:14px;font-size:13px;font-weight:900;cursor:pointer;letter-spacing:0.06em;" onclick="FC_SETTINGS.changeEmail()">SAVE NEW EMAIL</button>\n                            </div>\n                        </div>\n\n                        <div style="padding:22px;border-radius:26px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);">\n                            <div style="font-size:11px;color:#75829a;font-weight:900;letter-spacing:0.18em;">PASSWORD SECURITY</div>\n                            <div style="margin-top:6px;color:#a5b0c1;font-size:13px;line-height:1.6;">Use a new password that you do not reuse elsewhere. The confirmation field must match exactly.</div>\n                            <div style="margin-top:16px;display:grid;grid-template-columns:1fr;gap:10px;">\n                                <input id="fc-current-password" type="password" placeholder="Current password" style="width:100%;background:#0f131a;color:#fff;border:1px solid rgba(255,255,255,0.12);padding:14px 16px;border-radius:14px;font-size:14px;outline:none;box-sizing:border-box;">\n                                <input id="fc-new-password" type="password" placeholder="New password" style="width:100%;background:#0f131a;color:#fff;border:1px solid rgba(255,255,255,0.12);padding:14px 16px;border-radius:14px;font-size:14px;outline:none;box-sizing:border-box;">\n                                <input id="fc-confirm-password" type="password" placeholder="Confirm new password" style="width:100%;background:#0f131a;color:#fff;border:1px solid rgba(255,255,255,0.12);padding:14px 16px;border-radius:14px;font-size:14px;outline:none;box-sizing:border-box;">\n                                <button id="fc-settings-password-btn" style="margin-top:4px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.12);padding:14px 16px;border-radius:14px;font-size:13px;font-weight:900;cursor:pointer;letter-spacing:0.06em;" onclick="FC_SETTINGS.changePassword()">UPDATE PASSWORD</button>\n                            </div>\n                        </div>\n\n                        <div style="padding:22px;border-radius:26px;background:linear-gradient(180deg,rgba(255,90,90,0.07),rgba(255,255,255,0.02));border:1px solid rgba(255,90,90,0.18);">\n                            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">\n                                <div>\n                                    <div style="font-size:11px;color:#ff8b8b;font-weight:900;letter-spacing:0.18em;">DANGER ZONE</div>\n                                    <div style="margin-top:6px;color:#d7a9a9;font-size:13px;line-height:1.6;max-width:640px;">Deleting your account permanently removes your profile, progress, and stored data. This cannot be undone.</div>\n                                </div>\n                                <button onclick="FC_SETTINGS.logout()" style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.12);padding:12px 16px;border-radius:14px;font-size:12px;font-weight:900;cursor:pointer;letter-spacing:0.06em;">LOG OUT INSTEAD</button>\n                            </div>\n                            <div style="margin-top:16px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">\n                                <input id="fc-delete-password" type="password" placeholder="Enter password to delete account" style="width:100%;background:#130d10;color:#fff;border:1px solid rgba(255,90,90,0.2);padding:14px 16px;border-radius:14px;font-size:14px;outline:none;box-sizing:border-box;">\n                                <button id="fc-settings-delete-btn" style="background:transparent;color:#ff6b6b;border:1px solid rgba(255,107,107,0.45);padding:14px 18px;border-radius:14px;font-size:12px;font-weight:900;cursor:pointer;letter-spacing:0.06em;white-space:nowrap;" onclick="FC_SETTINGS.deleteAccount()">DELETE ACCOUNT</button>\n                            </div>\n                        </div>\n                    </section>\n                </div>\n            </div>`,
      );
      FC_SETTINGS.init();
      break;
    }
    default:
      _panelBody.innerHTML =
        '<div style="color:#888;padding:40px;text-align:center;">Coming soon</div>';
  }
}
async function _openChestPanel(type, color, image) {
  const COOLDOWN = { bronze: "24h", silver: "5 days", gold: "7 days" };
  const PLAYERS = { bronze: 3, silver: 5, gold: 8 };
  const ICON_ODDS = {
    bronze: "No icons",
    silver: "0.5% icon chance",
    gold: "2.5% icon chance",
  };
  _panelHTML(
    `\n            <style>\n                @keyframes fcFloatingIcon { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }\n                @keyframes fcGlowSpin { 0%{transform:rotate(0deg);opacity:0.6} 50%{opacity:1} 100%{transform:rotate(360deg);opacity:0.6} }\n                .fc-chest-glow {\n                    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);\n                    width:160px;height:160px;background:radial-gradient(circle, ${color}33 0%, transparent 70%);\n                    z-index:-1;filter:blur(20px);animation:fcGlowSpin 4s linear infinite;\n                }\n            </style>\n            <div style="text-align:center;padding:40px 10px;position:relative;">\n                <div class="fc-chest-glow"></div>\n                <div id="fc-chest-icon" style="height:140px;margin-bottom:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;animation:fcFloatingIcon 2.4s ease-in-out infinite;">\n                    <img src="${image}" style="max-height:100%;object-fit:contain;filter:drop-shadow(0 12px 24px rgba(0,0,0,0.5));">\n                </div>\n                <div id="fc-chest-status-text" style="color:rgba(255,255,255,0.4);font-size:13px;font-weight:700;letter-spacing:1px;margin-bottom:28px;text-transform:uppercase;">Checking availability...</div>\n                <button id="fc-open-chest-btn" class="fc-cta-btn" style="background:${color};color:#000;font-size:18px;padding:16px 48px;border-radius:12px;box-shadow:0 12px 32px ${color}33;" onclick="_doOpenChest('${type}','${color}','${image}')">OPEN CHEST</button>\n                <div style="margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">\n                    <p style="color:rgba(255,255,255,0.3);font-size:11px;margin-bottom:6px;font-family:'Inter',sans-serif;">Cooldown: ${COOLDOWN[type]} • Rewards: ${PLAYERS[type]} players</p>\n                    <p style="font-size:10px;font-weight:900;letter-spacing:1px;color:${type === "gold" ? "#ffcc00" : type === "silver" ? "#aaa" : "#888"};text-transform:uppercase;">${ICON_ODDS[type]}</p>\n                </div>\n            </div>`,
  );
  const r = await FC.chests.status();
  const btn = document.getElementById("fc-open-chest-btn");
  const txt = document.getElementById("fc-chest-status-text");
  if (r.success) {
    const s = r.data[type];
    if (s.available) {
      txt.textContent = "✅ READY FOR OPENING";
      txt.style.color = "#6f6";
    } else {
      const h = Math.floor(s.seconds_remaining / 3600),
        m = Math.floor((s.seconds_remaining % 3600) / 60);
      txt.textContent = `⏳ AVAILABLE IN ${h}h ${m}m`;
      btn.disabled = true;
      btn.style.opacity = "0.35";
      btn.style.cursor = "not-allowed";
    }
  }
}
async function _doOpenChest(type, color, image) {
  if (window.__fcChestOpeningBusy) return;
  window.__fcChestOpeningBusy = true;
  const btn = document.getElementById("fc-open-chest-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML =
      '<span style="display:flex;align-items:center;gap:8px;">OPENING...</span>';
    btn.style.opacity = "0.7";
  }
  let r;
  try {
    r = await FC.chests.open(type);
  } catch (e) {
    alert("Could not open chest");
    _openChestPanel(type, color, image);
    window.__fcChestOpeningBusy = false;
    return;
  }
  if (!r.success) {
    alert(r.error || "Could not open chest");
    _openChestPanel(type, color, image);
    window.__fcChestOpeningBusy = false;
    return;
  }
  const rewards = r.data.rewards;
  window.dispatchEvent(
    new CustomEvent("fc:chest-opened", {
      detail: {
        type: type,
        rewards_count: Array.isArray(rewards) ? rewards.length : 0,
      },
    }),
  );
  const ensureFreshChestAnimator = async () => {
    const expectedVersion = "20260426j";
    const ready = !!(
      window.FC_CHESTS &&
      typeof window.FC_CHESTS.showAnimation === "function" &&
      window.FC_CHESTS.__version === expectedVersion
    );
    if (ready) return true;
    try {
      await import(`/frontend/views/dashboard/js/chests.js?v=${expectedVersion}`);
    } catch (_) {}
    return !!(
      window.FC_CHESTS && typeof window.FC_CHESTS.showAnimation === "function"
    );
  };
  if (await ensureFreshChestAnimator()) {
    closePanel();
    await window.FC_CHESTS.showAnimation(rewards, type);
    window.dispatchEvent(
      new CustomEvent("fc:chest-flow-complete", {
        detail: {
          type: type,
          rewards_count: Array.isArray(rewards) ? rewards.length : 0,
        },
      }),
    );
    window.__fcChestOpeningBusy = false;
    return;
  }
  _panelHTML(
    `\n            <div style="text-align:center;margin-bottom:28px;">\n                <div style="height:60px;margin-bottom:12px;">\n                    <img src="${image}" style="max-height:100%;opacity:0.3;filter:blur(1px) grayscale(0.5);">\n                </div>\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">CHEST OPENED</div>\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;background:linear-gradient(135deg,#fff 0%,${color} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;margin-bottom:12px;">YOU GOT ${rewards.length} PLAYERS!</div>\n                <div style="height:2px;width:60px;background:${color};margin:0 auto;box-shadow:0 0 10px ${color}"></div>\n            </div>\n            <style>\n                @keyframes cardReveal { from{opacity:0;transform:translateY(30px) scale(0.8)} to{opacity:1;transform:translateY(0) scale(1)} }\n                @keyframes iconShine { 0%,100%{box-shadow:0 0 20px #ff9500,0 0 40px #ffd700} 50%{box-shadow:0 0 40px #ff9500,0 0 80px #ffd700,0 0 100px #ff6b00} }\n            </style>\n            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:16px;margin-bottom:30px;padding:4px;">\n                ${rewards
      .map((p, i) => {
        const isIcon = p.rarity === "icon";
        const c =
          {
            common: "#c0a060",
            rare: "#4fc3f7",
            epic: "#ce93d8",
            legend: "#FFD700",
            icon: "#ff9500",
          }[p.rarity] || "#aaa";
        const visual = p.image_url || "";
        const hasExactCard = false;
        const cardStyle = isIcon
          ? `background:linear-gradient(145deg,#211800,#111111);border:2px solid #ffcc00;border-radius:14px;padding:16px 10px;text-align:center;animation:cardReveal 0.5s ease ${i * 0.15}s both, iconShine 2s ease infinite;box-shadow:0 8px 20px rgba(0,0,0,0.4);`
          : `background:linear-gradient(145deg,#111111,#0d0d0d);border:1px solid ${c}66;border-radius:14px;padding:16px 10px;text-align:center;animation:cardReveal 0.4s ease ${i * 0.1}s both;box-shadow:0 6px 16px rgba(0,0,0,0.4);`;
        return `<div style="${cardStyle} position:relative;overflow:hidden;">\n                        ${isIcon ? `\n                        <div style="position:absolute;top:0;left:0;right:0;height:100%;background:linear-gradient(45deg,transparent 45%,rgba(255,255,255,0.08) 50%,transparent 55%);background-size:200% 200%;animation:fcGlowSpin 3s linear infinite;"></div>\n                        <div style="font-size:9px;color:#ffcc00;font-weight:900;letter-spacing:1px;margin-bottom:6px;font-family:'Inter',sans-serif;">SUPREME ICON</div>\n                        ` : ""}\n                        ${visual ? `<img src="${visual}" loading="lazy" alt="${p.name}" style="width:${hasExactCard ? "86px" : "70px"};height:${hasExactCard ? "126px" : "70px"};border-radius:${hasExactCard ? "8px" : "50%"};object-fit:${hasExactCard ? "contain" : "cover"};border:${hasExactCard ? "none" : "2px solid " + (isIcon ? "#ffcc00" : c)};margin:0 auto 10px;display:block;background:#1a1a1a;box-shadow:0 8px 18px rgba(0,0,0,0.35);" onerror="this.style.display='none'">` : ""}\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;font-weight:900;color:${c};line-height:0.9;">${p.overall}</div>\n                        <div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;margin:4px 0;">${p.position}</div>\n                        <div style="font-size:12px;font-weight:800;color:${isIcon ? "#ffd700" : "#fff"};margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.2px;">${p.name.toUpperCase()}</div>\n                        <div style="font-size:9px;color:rgba(255,255,255,0.3);margin-bottom:8px;">${p.club}</div>\n                        <div style="font-size:9px;padding:3px 8px;border-radius:10px;background:${isIcon ? "linear-gradient(90deg,#ffcc00,#ff8000)" : c + "22"};color:${isIcon ? "#000" : c};font-weight:900;border:${isIcon ? "none" : "1px solid " + c + "44"};display:inline-block;">${p.rarity.toUpperCase()}</div>\n                    </div>`;
      })
      .join(
        "",
      )}\n            </div>\n            <button class="fc-cta-btn" style="width:100%;padding:18px;font-size:16px;letter-spacing:2px;" onclick="closePanel()">AWESOME! CONTINUE</button>`,
  );
  window.__fcChestOpeningBusy = false;
}
function _playChestOpenSfx(type, phase = "charge") {
  return;
}
function _playChestThreeReveal(type, color, image) {
  return new Promise((resolve) => {
    if (!window.THREE) {
      resolve();
      return;
    }
    const variantMap = {
      bronze: {
        ambient: 0.65,
        keyLight: 1.2,
        rimLight: 0.9,
        particles: 170,
        particleSize: 0.055,
        speedMin: 0.012,
        speedMax: 0.034,
        yLift: 0.0013,
        ringOpacity: 0.32,
        spin: 1.8,
        camPush: 0.8,
        duration: 1200,
      },
      silver: {
        ambient: 0.8,
        keyLight: 1.7,
        rimLight: 1.35,
        particles: 260,
        particleSize: 0.045,
        speedMin: 0.024,
        speedMax: 0.07,
        yLift: 4e-4,
        ringOpacity: 0.44,
        spin: 2.6,
        camPush: 1.1,
        duration: 1180,
      },
      gold: {
        ambient: 0.9,
        keyLight: 2.3,
        rimLight: 1.9,
        particles: 340,
        particleSize: 0.065,
        speedMin: 0.028,
        speedMax: 0.09,
        yLift: 0.001,
        ringOpacity: 0.6,
        spin: 3.4,
        camPush: 1.45,
        duration: 1260,
      },
    };
    const variant = variantMap[type] || variantMap.gold;
    let rafId = 0;
    let done = false;
    let renderer = null;
    let overlay = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (rafId) cancelAnimationFrame(rafId);
      try {
        if (renderer) renderer.dispose();
      } catch (e) {}
      if (overlay && overlay.parentNode)
        overlay.parentNode.removeChild(overlay);
      resolve();
    };
    try {
      const THREE = window.THREE;
      overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:20990;pointer-events:none;background:radial-gradient(circle at 50% 55%, rgba(255,255,255,0.06), transparent 58%);";
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "width:100%;height:100%;display:block;";
      overlay.appendChild(canvas);
      document.body.appendChild(overlay);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / Math.max(1, window.innerHeight),
        0.1,
        100,
      );
      camera.position.set(0, 0.2, 6.8);
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(window.innerWidth, window.innerHeight);
      scene.add(new THREE.AmbientLight(16777215, variant.ambient));
      const key = new THREE.PointLight(16777215, variant.keyLight, 20);
      key.position.set(2.4, 3.2, 5.5);
      scene.add(key);
      const rim = new THREE.PointLight(16766839, variant.rimLight, 18);
      rim.position.set(-2.8, -1.2, 3.5);
      scene.add(rim);
      let pulse = null;
      if (type === "gold") {
        pulse = new THREE.PointLight(16772761, 0, 30);
        pulse.position.set(0, 1.2, 4.4);
        scene.add(pulse);
      }
      const group = new THREE.Group();
      scene.add(group);
      const chestGeo = new THREE.BoxGeometry(2.1, 1.5, 1.5);
      const chestMat = new THREE.MeshStandardMaterial({
        color: 16777215,
        roughness: 0.4,
        metalness: 0.35,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.1,
      });
      const chest = new THREE.Mesh(chestGeo, chestMat);
      group.add(chest);
      const ringGeo = new THREE.TorusGeometry(2.2, 0.08, 16, 90);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: variant.ringOpacity,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      const rays = [];
      const rayCount = type === "gold" ? 12 : type === "silver" ? 9 : 7;
      const rayColor =
        type === "silver" ? 14674431 : new THREE.Color(color).getHex();
      for (let i = 0; i < rayCount; i++) {
        const rayGeo = new THREE.ConeGeometry(
          type === "gold" ? 0.18 : 0.13,
          type === "gold" ? 5.4 : 4.6,
          10,
          1,
          true,
        );
        const rayMat = new THREE.MeshBasicMaterial({
          color: rayColor,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ray = new THREE.Mesh(rayGeo, rayMat);
        ray.position.set(0, 0.15, 0);
        ray.rotation.z = Math.PI;
        ray.rotation.y = (i / rayCount) * Math.PI * 2;
        ray.rotation.x = -0.22 + (Math.random() - 0.5) * 0.18;
        scene.add(ray);
        rays.push(ray);
      }
      const particlesCount = variant.particles;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particlesCount * 3);
      const velocities = new Float32Array(particlesCount * 3);
      for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        positions[i3 + 0] = (Math.random() - 0.5) * 0.3;
        positions[i3 + 1] = (Math.random() - 0.5) * 0.3;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed =
          variant.speedMin +
          Math.random() * (variant.speedMax - variant.speedMin);
        velocities[i3 + 0] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
        velocities[i3 + 2] = Math.cos(phi) * speed;
      }
      particleGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const particleMat = new THREE.PointsMaterial({
        color: new THREE.Color(type === "silver" ? "#dfe9ff" : color),
        size: variant.particleSize,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);
      let shardLines = null;
      if (type === "silver") {
        const shardCount = 28;
        const shardPos = new Float32Array(shardCount * 6);
        for (let i = 0; i < shardCount; i++) {
          const i6 = i * 6;
          const a = (i / shardCount) * Math.PI * 2;
          const r = 0.12 + Math.random() * 0.18;
          const x = Math.cos(a) * r;
          const y = (Math.random() - 0.5) * 0.14;
          const z = Math.sin(a) * r;
          shardPos[i6 + 0] = x;
          shardPos[i6 + 1] = y;
          shardPos[i6 + 2] = z;
          shardPos[i6 + 3] = x * 1.7;
          shardPos[i6 + 4] = y * 1.7;
          shardPos[i6 + 5] = z * 1.7;
        }
        const shardGeo = new THREE.BufferGeometry();
        shardGeo.setAttribute(
          "position",
          new THREE.BufferAttribute(shardPos, 3),
        );
        const shardMat = new THREE.LineBasicMaterial({
          color: 15200255,
          transparent: true,
          opacity: 0.8,
        });
        shardLines = new THREE.LineSegments(shardGeo, shardMat);
        scene.add(shardLines);
      }
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        image,
        (tx) => {
          chestMat.map = tx;
          chestMat.needsUpdate = true;
        },
        undefined,
        () => {},
      );
      const start = performance.now();
      const duration = variant.duration;
      const endAt = start + duration;
      const animate = (ts) => {
        const t = Math.max(0, Math.min(1, (ts - start) / duration));
        const easeOut = 1 - Math.pow(1 - t, 3);
        group.rotation.y = easeOut * Math.PI * variant.spin;
        group.rotation.x = Math.sin(t * Math.PI) * 0.18;
        const s = 0.9 + easeOut * 0.5;
        group.scale.set(s, s, s);
        group.position.y = Math.sin(t * Math.PI) * 0.25;
        ring.scale.setScalar(0.8 + t * (type === "gold" ? 1.8 : 1.2));
        ringMat.opacity = variant.ringOpacity * (1 - t);
        chestMat.emissiveIntensity =
          0.12 + Math.sin(t * Math.PI) * (type === "gold" ? 1 : 0.7);
        const posAttr = particleGeo.getAttribute("position");
        const arr = posAttr.array;
        for (let i = 0; i < particlesCount; i++) {
          const i3 = i * 3;
          arr[i3 + 0] += velocities[i3 + 0];
          arr[i3 + 1] += velocities[i3 + 1] + variant.yLift;
          arr[i3 + 2] += velocities[i3 + 2];
        }
        posAttr.needsUpdate = true;
        particleMat.opacity = Math.max(0, 0.95 - t * 1.1);
        if (shardLines) {
          shardLines.scale.setScalar(1 + t * 1.3);
          shardLines.material.opacity = Math.max(0, 0.8 - t * 1.2);
          shardLines.rotation.y += 0.045;
        }
        for (let i = 0; i < rays.length; i++) {
          const ray = rays[i];
          const wobble = Math.sin(t * 8 + i) * 0.06;
          ray.rotation.y += 0.006 + i * 5e-4;
          ray.rotation.x = -0.2 + wobble;
          const scale = 0.6 + t * (type === "gold" ? 2 : 1.5);
          ray.scale.set(1, scale, 1);
          ray.material.opacity = Math.max(
            0,
            (type === "gold" ? 0.28 : 0.2) * (1 - t),
          );
        }
        camera.position.z = 6.8 - easeOut * variant.camPush;
        if (type === "gold") {
          key.intensity = variant.keyLight + Math.sin(t * 28) * 0.7 * (1 - t);
          rim.intensity = variant.rimLight + Math.sin(t * 22) * 0.45 * (1 - t);
          if (pulse) {
            pulse.intensity =
              Math.max(0, 0.35 + Math.sin(t * 34) * 0.35) * (1 - t * 0.6);
          }
        }
        renderer.render(scene, camera);
        if (ts < endAt && !done) {
          rafId = requestAnimationFrame(animate);
        } else {
          finish();
        }
      };
      rafId = requestAnimationFrame(animate);
      setTimeout(finish, 1500);
    } catch (e) {
      finish();
    }
  });
}
function _rarityColor(rarity) {
  return (
    {
      common: "#c0a060",
      rare: "#4fc3f7",
      epic: "#ce93d8",
      legend: "#FFD700",
      icon: "#ff9500",
    }[rarity] || "#aaa"
  );
}
function _rarityBadge(rarity) {
  if (rarity === "icon")
    return `<span style="font-size:9px;padding:2px 6px;border-radius:10px;background:linear-gradient(90deg,#ff6b00,#ffd700,#ff6b00);color:#000;font-weight:900;letter-spacing:0.5px;">⭐ ICON</span>`;
  const c = _rarityColor(rarity);
  return `<span style="font-size:9px;padding:2px 6px;border-radius:10px;background:${c}22;color:${c};border:1px solid ${c}44;font-weight:700;">${rarity.toUpperCase()}</span>`;
}
function _playerRow(p, interactive) {
  const c = _rarityColor(p.rarity);
  const isIcon = p.rarity === "icon";
  const imgSrc = p.image_url || "";
  const canOpen =
    !!interactive &&
    window.FC_PLAYERS &&
    typeof FC_PLAYERS.openPlayer === "function";
  const safeName = String(p.name || "player").replace(/"/g, "&quot;");
  const avatarHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${p.name}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid ${isIcon ? "#ff9500" : c};background:#1a1a1a;flex-shrink:0;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : "";
  const fallbackHtml = `<div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.06);border:2px solid ${c};display:${imgSrc ? "none" : "flex"};align-items:center;justify-content:center;flex-shrink:0;font-family:'Bebas Neue',sans-serif;font-size:16px;color:${c};">${p.overall}</div>`;
  const borderStyle = isIcon
    ? "border-left:3px solid #ff9500;"
    : `border-left:3px solid ${c};`;
  const bg = isIcon ? "rgba(255,149,0,0.06)" : "rgba(255,255,255,0.03)";
  const wrapperAttrs = canOpen
    ? `role="button" tabindex="0" aria-label="Open ${safeName} details" onclick="FC_PLAYERS.openPlayer(${Number(p.id)})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();FC_PLAYERS.openPlayer(${Number(p.id)})}" onmouseenter="this.style.background='rgba(255,255,255,0.07)';this.style.transform='translateX(-4px)'" onmouseleave="this.style.background='${bg}';this.style.transform='translateX(0)'" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:${bg};border-radius:8px;${borderStyle}cursor:pointer;transition:background 0.18s ease,transform 0.18s ease;"`
    : `style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:${bg};border-radius:8px;${borderStyle}"`;
  return `<div ${wrapperAttrs}>\n            ${avatarHtml}${fallbackHtml}\n            <div style="flex:1;min-width:0;">\n                <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${isIcon ? "#ffd700" : "#fff"};">${p.name}</div>\n                <div style="font-size:11px;color:#666;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.club} · ${p.nation}</div>\n                <div style="margin-top:3px;display:flex;gap:4px;flex-wrap:wrap;">${_rarityBadge(p.rarity)}<span style="font-size:9px;color:#555;">${p.league || ""}</span></div>\n            </div>\n            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font-size:10px;text-align:center;color:#888;flex-shrink:0;">\n                <div><div style="color:${p.pace >= 85 ? "#6f6" : p.pace >= 75 ? "#FFD700" : "#ddd"};font-weight:700;font-size:12px;">${p.pace}</div><div style="font-size:8px;">PAC</div></div>\n                <div><div style="color:${p.shooting >= 85 ? "#6f6" : p.shooting >= 75 ? "#FFD700" : "#ddd"};font-weight:700;font-size:12px;">${p.shooting}</div><div style="font-size:8px;">SHO</div></div>\n                <div><div style="color:${p.passing >= 85 ? "#6f6" : p.passing >= 75 ? "#FFD700" : "#ddd"};font-weight:700;font-size:12px;">${p.passing}</div><div style="font-size:8px;">PAS</div></div>\n                <div><div style="color:${p.dribbling >= 85 ? "#6f6" : p.dribbling >= 75 ? "#FFD700" : "#ddd"};font-weight:700;font-size:12px;">${p.dribbling || "—"}</div><div style="font-size:8px;">DRI</div></div>\n                <div><div style="color:${p.defending >= 85 ? "#6f6" : p.defending >= 75 ? "#FFD700" : "#ddd"};font-weight:700;font-size:12px;">${p.defending || "—"}</div><div style="font-size:8px;">DEF</div></div>\n                <div><div style="color:${p.physical >= 85 ? "#6f6" : p.physical >= 75 ? "#FFD700" : "#ddd"};font-weight:700;font-size:12px;">${p.physical || "—"}</div><div style="font-size:8px;">PHY</div></div>\n            </div>\n        </div>`;
}
(async function init() {
  try {
    const res = await FC.auth.me();
    if (res.success) {
      document
        .querySelectorAll(".fc-username")
        .forEach((el) => (el.textContent = res.data.username));
    }
    await FC_HOME.load();
  } catch (error) {
    console.error("Dashboard content bootstrap failed", error);
  } finally {
    window.dispatchEvent(new CustomEvent("footycraft:dashboard-content-ready"));
  }
})();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

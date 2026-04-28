(function () {
  "use strict";
  let _selectedMode = "quickmatch";
  async function loadDivisionStatus() {
    const res = await FC.play.divisionStatus();
    if (!res.success) return;
    const d = res.data;
    const el = document.getElementById("fc-division-status");
    if (!el) return;
    const form = (d.form || []).slice(-5);
    const formHtml = form.length
      ? form
          .map((r) => {
            const color = r === "W" ? "#6f6" : r === "D" ? "#FFD700" : "#f66";
            return `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:${color};font-weight:900;font-size:12px;">${r}</span>`;
          })
          .join("")
      : '<span style="color:#666;font-size:12px;">No form yet</span>';
    const statusColor =
      d.status === "Promotion zone" || d.status === "Title pace"
        ? "#6f6"
        : d.status === "Relegation risk"
          ? "#f66"
          : "#FFD700";
    const points = d.division_points ?? d.points ?? 0;
    const promotion = d.promotion_points ?? d.next_threshold ?? 1;
    const played = d.matches_played ?? 0;
    const matchLimit = d.match_limit ?? 10;
    const gd = d.goal_difference ?? 0;
    const progress =
      d.progress ??
      Math.min(100, Math.round((points / Math.max(1, promotion)) * 100));
    const cinematic = !!el.closest(".fc-division-fullscreen");
    if (cinematic) {
      const wins = d.wins ?? d.division_wins ?? 0;
      const draws = d.draws ?? d.division_draws ?? 0;
      const losses = d.losses ?? d.division_losses ?? 0;
      el.innerHTML = `\n            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:clamp(16px,3vw,34px);align-items:end;">\n                <div>\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:clamp(64px,10vw,132px);color:#FFD700;line-height:0.9;letter-spacing:1px;text-shadow:0 18px 44px rgba(0,0,0,0.45);">${d.division_name}</div>\n                    <div style="font-size:13px;color:${statusColor};font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-top:12px;">${d.status || "On track"}</div>\n                    <div style="max-width:720px;margin-top:22px;">\n                        <div style="display:flex;justify-content:space-between;gap:12px;color:rgba(255,255,255,0.58);font-size:12px;text-transform:uppercase;font-weight:900;letter-spacing:1px;margin-bottom:8px;">\n                            <span>Promotion progress</span><span>${points}/${promotion}</span>\n                        </div>\n                        <div style="height:14px;border-radius:8px;background:rgba(255,255,255,0.08);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">\n                            <div class="fc-division-progress-fill" style="height:100%;border-radius:8px;background:linear-gradient(90deg,#FFD700,#ff8c00);width:${progress}%;box-shadow:0 0 24px rgba(255,215,0,0.35);"></div>\n                        </div>\n                        <div style="display:flex;justify-content:space-between;color:rgba(255,255,255,0.38);font-size:11px;margin-top:8px;">\n                            <span>Stay: ${d.minimum_points ?? 0}</span><span>Promote: ${promotion}</span>\n                        </div>\n                    </div>\n                </div>\n                <div style="display:grid;gap:10px;">\n                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">\n                        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;"><div style="font-size:34px;font-weight:900;color:#fff;">${points}</div><div style="font-size:10px;color:#888;font-weight:900;letter-spacing:1px;">POINTS</div></div>\n                        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;"><div style="font-size:34px;font-weight:900;color:#fff;">${played}/${matchLimit}</div><div style="font-size:10px;color:#888;font-weight:900;letter-spacing:1px;">MATCHES</div></div>\n                    </div>\n                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">\n                        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;"><div style="font-size:34px;font-weight:900;color:${gd >= 0 ? "#6f6" : "#f66"};">${gd >= 0 ? "+" : ""}${gd}</div><div style="font-size:10px;color:#888;font-weight:900;letter-spacing:1px;">GOAL DIFF</div></div>\n                        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;"><div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">${wins}-${draws}-${losses}</div><div style="font-size:10px;color:#888;font-weight:900;letter-spacing:1px;">RECORD</div></div>\n                    </div>\n                    <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">\n                        <span style="font-size:11px;color:#888;text-transform:uppercase;font-weight:900;letter-spacing:1px;">Last five</span>\n                        <span style="display:flex;gap:6px;">${formHtml}</span>\n                    </div>\n                </div>\n            </div>`;
      return;
    }
    el.innerHTML = `\n        <div style="text-align:center; margin-bottom:14px;">\n            <div style="font-family:'Bebas Neue',sans-serif; font-size:38px; color:#FFD700;line-height:1;">${d.division_name}</div>\n            <div style="font-size:12px; color:${statusColor};font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${d.status || "On track"}</div>\n        </div>\n        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">\n            <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#fff;">${points}</div><div style="font-size:10px;color:#888;">POINTS</div></div>\n            <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#fff;">${played}/${matchLimit}</div><div style="font-size:10px;color:#888;">MATCHES</div></div>\n            <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:22px;font-weight:900;color:${gd >= 0 ? "#6f6" : "#f66"};">${gd >= 0 ? "+" : ""}${gd}</div><div style="font-size:10px;color:#888;">GD</div></div>\n        </div>\n        <div style="margin-bottom:12px;">\n            <div style="display:flex; justify-content:space-between; font-size:11px; color:#888; margin-bottom:5px;">\n                <span>Promotion progress</span><span>${points}/${promotion}</span>\n            </div>\n            <div style="background:#222; border-radius:4px; height:8px;">\n                <div style="background: linear-gradient(90deg, #FFD700, #ff8c00); height:100%; border-radius:4px; width:${progress}%; transition:width 0.5s;"></div>\n            </div>\n            <div style="display:flex;justify-content:space-between;font-size:10px;color:#666;margin-top:5px;">\n                <span>Stay: ${d.minimum_points ?? 0}</span><span>Promote: ${promotion}</span>\n            </div>\n        </div>\n        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(255,255,255,0.03);border-radius:8px;padding:10px;">\n            <span style="font-size:11px;color:#888;text-transform:uppercase;font-weight:800;">Form</span>\n            <span style="display:flex;gap:5px;">${formHtml}</span>\n        </div>`;
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
  function matchColor(result) {
    return result === "W" ? "#6f6" : result === "D" ? "#FFD700" : "#f66";
  }
  function matchLabel(result) {
    return result === "W" ? "Win" : result === "D" ? "Draw" : "Loss";
  }
  function modeLabel(mode) {
    return String(mode || "quickmatch")
      .replace(/_/g, " ")
      .toUpperCase();
  }
  function statValue(value, fallback = "--") {
    return value === undefined || value === null || value === ""
      ? fallback
      : value;
  }
  function statNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  function eventTypeLabel(type) {
    return (
      {
        goal: "GOAL",
        save: "SAVE",
        miss: "MISS",
        yellow_card: "YELLOW",
        corner: "CORNER",
        halftime: "HT",
        fulltime: "FT",
        atmosphere: "PRESSURE",
      }[type] || String(type || "EVENT").toUpperCase()
    );
  }
  function playerPhotoHtml(player, teamColor, size = 46) {
    const img = player?.image_url || player?.player_image_url || "";
    const label = escapeHtml(
      player?.slot_code || player?.position || player?.shooting || "--",
    );
    const alt = escapeHtml(player?.name || player?.player || "Player");
    return `<div style="position:relative;width:${size}px;height:${size + 8}px;border-radius:8px;background:${teamColor}18;border:1px solid ${teamColor}55;display:flex;align-items:center;justify-content:center;overflow:hidden;">\n            ${img ? `<img src="${escapeHtml(img)}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ""}\n            <div style="display:${img ? "none" : "flex"};position:absolute;inset:0;align-items:center;justify-content:center;color:${teamColor};font-size:10px;font-weight:900;">${label}</div>\n        </div>`;
  }
  function enrichPlayerStats(statsRows, lineupRows) {
    const lineup = Array.isArray(lineupRows) ? lineupRows : [];
    const bySlot = new Map();
    const byName = new Map();
    lineup.forEach((p) => {
      if (p?.slot_code) bySlot.set(String(p.slot_code), p);
      if (p?.name) byName.set(String(p.name).toLowerCase(), p);
    });
    const rows =
      Array.isArray(statsRows) && statsRows.length ? statsRows : lineup;
    return rows.map((p) => {
      const match =
        bySlot.get(String(p?.slot_code || "")) ||
        byName.get(String(p?.name || "").toLowerCase()) ||
        {};
      return {
        ...match,
        ...p,
        card_url: p?.card_url || match.card_url || "",
        image_url: p?.image_url || match.image_url || "",
        overall: p?.overall || match.overall || null,
      };
    });
  }
  function renderCompareStat(label, home, away, suffix = "") {
    const h = statNumber(home);
    const a = statNumber(away);
    const total = Math.max(1, h + a);
    const hPct = Math.max(4, Math.round((h / total) * 100));
    const aPct = Math.max(4, Math.round((a / total) * 100));
    return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;">\n            <div style="display:grid;grid-template-columns:70px 1fr 70px;gap:10px;align-items:center;font-size:12px;">\n                <strong style="color:#fff;text-align:left;">${statValue(home)}${suffix}</strong>\n                <span style="color:#888;text-align:center;font-weight:900;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(label)}</span>\n                <strong style="color:#fff;text-align:right;">${statValue(away)}${suffix}</strong>\n            </div>\n            <div style="display:grid;grid-template-columns:${hPct}% ${aPct}%;gap:4px;margin-top:8px;height:7px;">\n                <div style="background:#4fc3f7;border-radius:999px;"></div>\n                <div style="background:#f66;border-radius:999px;"></div>\n            </div>\n        </div>`;
  }
  function playerRows(players, teamColor) {
    const sorted = [...(players || [])].sort(
      (a, b) => statNumber(b.rating) - statNumber(a.rating),
    );
    if (!sorted.length)
      return '<div style="color:#888;padding:16px;text-align:center;">No player performance data stored for this match.</div>';
    return sorted
      .map((p) => {
        const rating = statNumber(p.rating);
        const ratingColor =
          rating >= 7.5 ? "#6f6" : rating >= 6.5 ? "#FFD700" : "#f66";
        return `<div style="display:grid;grid-template-columns:58px minmax(150px,1fr) repeat(5,minmax(54px,auto));gap:10px;align-items:center;padding:10px;border-bottom:1px solid rgba(255,255,255,0.06);">\n                ${playerPhotoHtml(p, teamColor)}\n                <div style="min-width:0;">\n                    <div style="color:#fff;font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.name || "Player")}</div>\n                    <div style="color:#777;font-size:10px;">${escapeHtml(p.position || "--")} ${p.overall ? "OVR " + escapeHtml(p.overall) : ""}</div>\n                </div>\n                <div style="text-align:right;color:${ratingColor};font-weight:900;">${rating ? rating.toFixed(1) : "--"}</div>\n                <div style="text-align:right;color:#bbb;">${statValue(p.shots)}</div>\n                <div style="text-align:right;color:#bbb;">${statValue(p.xg)}</div>\n                <div style="text-align:right;color:#bbb;">${statValue(p.passes)}</div>\n                <div style="text-align:right;color:#bbb;">${statValue(p.accuracy)}%</div>\n            </div>`;
      })
      .join("");
  }
  function renderTimeline(events) {
    const rows = [...(events || [])].sort(
      (a, b) => statNumber(a.minute) - statNumber(b.minute),
    );
    if (!rows.length)
      return '<div style="color:#888;padding:16px;text-align:center;">No timeline events stored.</div>';
    return rows
      .map((e) => {
        const teamColor =
          e.team === "user"
            ? "#4fc3f7"
            : e.team === "opponent"
              ? "#f66"
              : "#FFD700";
        return `<div style="display:grid;grid-template-columns:46px 82px minmax(0,1fr);gap:10px;align-items:start;padding:10px;border-bottom:1px solid rgba(255,255,255,0.06);">\n                <div style="color:#fff;font-weight:900;">${statValue(e.minute, 0)}'</div>\n                <div style="color:${teamColor};font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">${eventTypeLabel(e.type)}</div>\n                <div>\n                    <div style="color:#ddd;font-size:12px;line-height:1.45;">${escapeHtml(e.commentary || e.player || "Match event")}</div>\n                    ${e.player ? `<div style="color:#777;font-size:10px;margin-top:3px;">${escapeHtml(e.player)}</div>` : ""}\n                </div>\n            </div>`;
      })
      .join("");
  }
  function renderSubstitutions(subs) {
    const rows = subs || [];
    if (!rows.length)
      return '<div style="color:#888;padding:16px;text-align:center;">No substitutions stored.</div>';
    return rows
      .map((s) => {
        const color = s.team === "user" ? "#4fc3f7" : "#f66";
        return `<div style="display:grid;grid-template-columns:46px minmax(0,1fr) 70px;gap:10px;align-items:center;padding:10px;border-bottom:1px solid rgba(255,255,255,0.06);">\n                <strong style="color:#fff;">${statValue(s.minute)}'</strong>\n                <div style="min-width:0;">\n                    <div style="color:${color};font-weight:900;font-size:12px;">${escapeHtml(String(s.team || "").toUpperCase())}</div>\n                    <div style="color:#ddd;font-size:12px;">${escapeHtml(s.player_in || "Player in")} for ${escapeHtml(s.player_out || "Player out")}</div>\n                </div>\n                <div style="text-align:right;color:#FFD700;font-weight:900;">${statValue(s.player_in_rating)}</div>\n            </div>`;
      })
      .join("");
  }
  async function loadMatchHistory() {
    const el = document.getElementById("fc-match-history");
    if (!el) return;
    el.innerHTML =
      '<div style="color:#888; padding:20px; text-align:center;">Loading...</div>';
    const res = await FC.play.history();
    if (!res.success) {
      el.innerHTML = '<div style="color:#f66;">Failed to load matches</div>';
      return;
    }
    const matches = res.data.matches;
    if (!matches.length) {
      el.innerHTML =
        '<div style="color:#888; padding:20px; text-align:center;">No matches played yet. Kick off your first match!</div>';
      return;
    }
    const wCount = matches.filter((m) => m.result === "W").length;
    const dCount = matches.filter((m) => m.result === "D").length;
    const lCount = matches.filter((m) => m.result === "L").length;
    el.innerHTML = `\n        <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">\n            <div style="background:rgba(0,200,0,0.1); border:1px solid rgba(0,200,0,0.3); border-radius:8px; padding:10px 18px; text-align:center;">\n                <div style="font-size:22px; font-weight:900; color:#6f6;">${wCount}</div>\n                <div style="font-size:11px; color:#888;">Wins</div>\n            </div>\n            <div style="background:rgba(200,200,0,0.1); border:1px solid rgba(200,200,0,0.3); border-radius:8px; padding:10px 18px; text-align:center;">\n                <div style="font-size:22px; font-weight:900; color:#FFD700;">${dCount}</div>\n                <div style="font-size:11px; color:#888;">Draws</div>\n            </div>\n            <div style="background:rgba(200,0,0,0.1); border:1px solid rgba(200,0,0,0.3); border-radius:8px; padding:10px 18px; text-align:center;">\n                <div style="font-size:22px; font-weight:900; color:#f66;">${lCount}</div>\n                <div style="font-size:11px; color:#888;">Losses</div>\n            </div>\n        </div>\n        <div style="display:flex; flex-direction:column; gap:8px;">\n            ${matches
      .map((m) => {
        const rc =
          m.result === "W" ? "#6f6" : m.result === "D" ? "#FFD700" : "#f66";
        const mode = (m.mode || m.stats?.mode || "quickmatch").replace(
          /_/g,
          " ",
        );
        const stage = m.stage || m.stats?.stage || "";
        return `\n                <div style="background:rgba(255,255,255,0.04); border-radius:8px; padding:10px 14px; display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="FC_PLAY.showMatchDetail(${m.id})">\n                    <div style="font-family:'Bebas Neue',sans-serif; font-size:24px; color:${rc}; min-width:24px;">${m.result}</div>\n                    <div style="flex:1;">\n                        <div style="font-weight:700; font-size:14px;">vs ${m.opponent_username || "AI Opponent"}</div>\n                        <div style="font-size:11px; color:#888;">${new Date(m.created_at).toLocaleDateString()} • ${mode.toUpperCase()}${stage ? " • " + stage : ""}${m.forfeit ? " • FORFEIT" : ""}</div>\n                    </div>\n                    <div style="font-size:18px; font-weight:900; color:#fff;">${m.score_for} - ${m.score_against}</div>\n                </div>`;
      })
      .join("")}\n        </div>`;
  }
  async function showMatchDetail(matchId) {
    const res = await FC.play.detail(matchId);
    if (!res.success) return;
    const m = res.data.match;
    const stats = m.stats || {};
    const events = m.events || [];
    const rc =
      m.result === "W" ? "#6f6" : m.result === "D" ? "#FFD700" : "#f66";
    let modal = document.getElementById("fc-match-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fc-match-modal";
      modal.style.cssText =
        "position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:9999; overflow-y:auto; padding:20px; display:flex; align-items:center; justify-content:center;";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `\n        <div style="background:#111; border:1px solid #333; border-radius:12px; width:100%; max-width:580px; padding:24px;">\n            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">\n                <h3 style="font-family:'Bebas Neue',sans-serif; font-size:24px; color:#FFD700; margin:0;">Match Report</h3>\n                <button class="lineup-btn" style="background:#333;" onclick="document.getElementById('fc-match-modal').remove()">✕</button>\n            </div>\n            <div style="text-align:center; margin-bottom:20px; padding:16px; background:rgba(255,255,255,0.04); border-radius:8px;">\n                <div style="font-size:42px; font-weight:900; color:${rc};">${m.score_for} - ${m.score_against}</div>\n                <div style="font-size:13px; color:#888;">vs ${m.opponent_username || "AI Opponent"} • ${m.result === "W" ? "WIN" : m.result === "D" ? "DRAW" : "LOSS"}</div>\n            </div>\n            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">\n                ${[
      ["xG For", stats.xg_for],
      ["xG Against", stats.xg_against],
      ["Possession", (stats.possession || 0) + "%"],
      ["Shots", stats.shots],
      ["Shots on Target", stats.shots_on_target],
      ["Corners", stats.corners],
    ]
      .map(
        ([label, val]) =>
          `\n                    <div style="background:rgba(255,255,255,0.03); border-radius:6px; padding:8px 12px;">\n                        <div style="font-size:11px; color:#888;">${label}</div>\n                        <div style="font-size:18px; font-weight:700; color:#fff;">${val ?? "--"}</div>\n                    </div>`,
      )
      .join(
        "",
      )}\n            </div>\n            <div>\n                <div style="font-family:'Bebas Neue',sans-serif; color:#aaa; margin-bottom:8px; font-size:14px;">MATCH TIMELINE</div>\n                <div style="display:flex; flex-direction:column; gap:6px; max-height:200px; overflow-y:auto;">\n                    ${events
      .map((e) => {
        const icon =
          e.type === "goal" ? "⚽" : e.type === "yellow_card" ? "🟨" : "🔴";
        return `<div style="display:flex; align-items:center; gap:8px; font-size:12px; padding:4px 8px; background:rgba(255,255,255,0.02); border-radius:4px;">\n                            <span style="color:#888; min-width:28px;">${e.minute}'</span>\n                            <span>${icon}</span>\n                            <span style="color:${e.team === "user" ? "#4fc3f7" : "#f66"};">${e.team === "user" ? "→" : "←"} ${e.player}</span>\n                        </div>`;
      })
      .join("")}\n                </div>\n            </div>\n        </div>`;
  }
  async function loadMatchHistory() {
    const el = document.getElementById("fc-match-history");
    if (!el) return;
    el.innerHTML =
      '<div style="color:#888; padding:20px; text-align:center;">Loading match center...</div>';
    const res = await FC.play.history(250);
    if (!res.success) {
      el.innerHTML = '<div style="color:#f66;">Failed to load matches</div>';
      return;
    }
    const matches = res.data.matches || [];
    if (!matches.length) {
      el.innerHTML =
        '<div style="color:#888; padding:20px; text-align:center;">No matches played yet. Kick off your first match!</div>';
      return;
    }
    const wCount = matches.filter((m) => m.result === "W").length;
    const dCount = matches.filter((m) => m.result === "D").length;
    const lCount = matches.filter((m) => m.result === "L").length;
    const goalsFor = matches.reduce(
      (sum, m) => sum + statNumber(m.score_for),
      0,
    );
    const goalsAgainst = matches.reduce(
      (sum, m) => sum + statNumber(m.score_against),
      0,
    );
    const dpTotal = matches.reduce(
      (sum, m) => sum + statNumber(m.dp_change ?? m.stats?.dp_change),
      0,
    );
    const latest = matches[0];
    el.innerHTML = `\n        <section style="position:relative;overflow:hidden;min-height:min(42vh,380px);display:flex;flex-direction:column;justify-content:center;margin-bottom:18px;padding:clamp(22px,4vw,50px);border-radius:18px;background:linear-gradient(135deg,rgba(79,195,247,0.16),rgba(255,255,255,0.045));border:1px solid rgba(79,195,247,0.18);box-shadow:0 26px 70px rgba(0,0,0,0.42);">\n            <div style="font-size:11px;color:rgba(79,195,247,0.86);font-weight:900;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Match Analysis Center</div>\n            <div style="font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,9vw,116px);color:#fff;line-height:0.9;letter-spacing:1px;text-shadow:0 18px 44px rgba(0,0,0,0.45);">Match History</div>\n            <div style="max-width:760px;font-size:14px;color:#aaa;margin-top:18px;line-height:1.55;">Open any match for a full report with team stats, timeline, lineup ratings, player performance, and substitutions. W-D-L means wins, draws, and losses.</div>\n            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:24px;">\n                ${[
      ["Matches", matches.length, "#fff"],
      ["W-D-L", `${wCount}-${dCount}-${lCount}`, "#FFD700"],
      [
        "Goals",
        `${goalsFor}-${goalsAgainst}`,
        goalsFor >= goalsAgainst ? "#6f6" : "#f66",
      ],
      ["Division Pts", dpTotal >= 0 ? `+${dpTotal}` : dpTotal, "#4fc3f7"],
    ]
      .map(
        ([label, value, color]) =>
          `\n                    <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:14px;">\n                        <div style="font-size:28px;font-weight:900;color:${color};">${value}</div>\n                        <div style="font-size:10px;color:#888;font-weight:900;letter-spacing:1px;text-transform:uppercase;">${label}</div>\n                    </div>`,
      )
      .join(
        "",
      )}\n            </div>\n        </section>\n        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px;align-items:start;">\n            <section style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;">\n                <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px;">\n                    <div>\n                        <div style="font-size:11px;color:#4fc3f7;font-weight:900;letter-spacing:2px;text-transform:uppercase;">All matches</div>\n                        <h3 style="font-family:'Bebas Neue',sans-serif;color:#fff;font-size:38px;margin:4px 0 0;line-height:1;">Analysis Archive</h3>\n                    </div>\n                    <span style="color:#888;font-size:11px;font-weight:900;text-transform:uppercase;">Click a match</span>\n                </div>\n                <div style="display:grid;gap:10px;">\n                    ${matches
      .map((m, i) => {
        const rc = matchColor(m.result);
        const mode = modeLabel(m.mode || m.stats?.mode || "quickmatch");
        const stage = m.stage || m.stats?.stage || "";
        const date = m.created_at
          ? new Date(m.created_at).toLocaleString()
          : "";
        const xg = `${statValue(m.stats?.xg_for)} - ${statValue(m.stats?.xg_against)}`;
        return `<button type="button" onclick="FC_PLAY.showMatchDetail(${m.id})" style="text-align:left;width:100%;cursor:pointer;background:linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025));border:1px solid rgba(255,255,255,0.1);border-left:4px solid ${rc};border-radius:12px;padding:14px;display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:12px;align-items:center;animation:fcDivisionReveal 0.38s cubic-bezier(0.16,1,0.3,1) ${Math.min(i, 12) * 0.025}s both;">\n                            <div style="font-family:'Bebas Neue',sans-serif;font-size:34px;color:${rc};line-height:1;">${escapeHtml(m.result)}</div>\n                            <div style="min-width:0;">\n                                <div style="color:#fff;font-weight:900;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">vs ${escapeHtml(m.opponent_username || "AI Opponent")}</div>\n                                <div style="color:#888;font-size:11px;margin-top:4px;">${escapeHtml(mode)}${stage ? " | " + escapeHtml(stage) : ""}${m.forfeit ? " | FORFEIT" : ""}</div>\n                                <div style="color:#666;font-size:10px;margin-top:4px;">${escapeHtml(date)} | xG ${escapeHtml(xg)}</div>\n                            </div>\n                            <div style="text-align:right;">\n                                <div style="font-size:24px;font-weight:900;color:#fff;">${m.score_for} - ${m.score_against}</div>\n                                <div style="font-size:10px;color:${statNumber(m.dp_change) >= 0 ? "#6f6" : "#f66"};font-weight:900;">DP ${statNumber(m.dp_change) >= 0 ? "+" : ""}${statValue(m.dp_change, 0)}</div>\n                            </div>\n                        </button>`;
      })
      .join(
        "",
      )}\n                </div>\n            </section>\n            <aside style="position:sticky;top:16px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;">\n                <div style="font-size:11px;color:#FFD700;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Latest result</div>\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:48px;color:${matchColor(latest.result)};line-height:1;margin-top:8px;">${matchLabel(latest.result)}</div>\n                <div style="font-size:42px;font-weight:900;color:#fff;">${latest.score_for} - ${latest.score_against}</div>\n                <div style="color:#888;font-size:12px;margin-bottom:14px;">vs ${escapeHtml(latest.opponent_username || "AI Opponent")}</div>\n                <button class="fc-cta-btn" style="width:100%;" onclick="FC_PLAY.showMatchDetail(${latest.id})">OPEN LATEST REPORT</button>\n                <div style="margin-top:16px;display:grid;gap:8px;">\n                    <div style="display:flex;justify-content:space-between;color:#aaa;font-size:12px;"><span>xG</span><strong>${statValue(latest.stats?.xg_for)} - ${statValue(latest.stats?.xg_against)}</strong></div>\n                    <div style="display:flex;justify-content:space-between;color:#aaa;font-size:12px;"><span>Shots</span><strong>${statValue(latest.stats?.shots)} - ${statValue(latest.stats?.opp_shots)}</strong></div>\n                    <div style="display:flex;justify-content:space-between;color:#aaa;font-size:12px;"><span>Possession</span><strong>${statValue(latest.stats?.possession)}%</strong></div>\n                </div>\n            </aside>\n        </div>`;
  }
  async function showMatchDetail(matchId) {
    const res = await FC.play.detail(matchId);
    if (!res.success) return;
    const m = res.data.match;
    const stats = m.stats || {};
    const events = m.events || [];
    const rc = matchColor(m.result);
    const mode = modeLabel(m.mode || stats.mode || "quickmatch");
    const stage = m.stage || stats.stage || "";
    const lineups = stats.lineups || {};
    const home = lineups.home || {};
    const away = lineups.away || {};
    const playerStats = Array.isArray(stats.player_stats)
      ? stats.player_stats
      : [];
    const userPlayers = playerStats.filter((p) => p.team === "user");
    const oppPlayers = playerStats.filter((p) => p.team === "opponent");
    const homePlayers = enrichPlayerStats(userPlayers, home.players);
    const awayPlayers = enrichPlayerStats(oppPlayers, away.players);
    const topUser = [...homePlayers].sort(
      (a, b) => statNumber(b.rating) - statNumber(a.rating),
    )[0];
    const topOpp = [...awayPlayers].sort(
      (a, b) => statNumber(b.rating) - statNumber(a.rating),
    )[0];
    let modal = document.getElementById("fc-match-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fc-match-modal";
      document.body.appendChild(modal);
    }
    modal.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.94);z-index:12000;overflow-y:auto;padding:18px;backdrop-filter:blur(10px);";
    modal.innerHTML = `\n        <style>\n            @keyframes fcMatchPanelIn { from{opacity:0;transform:translateY(28px) scale(0.985)} to{opacity:1;transform:translateY(0) scale(1)} }\n            @media (max-width: 880px) {\n                #fc-match-analysis-grid { grid-template-columns:1fr !important; }\n                #fc-match-players-grid { grid-template-columns:1fr !important; }\n            }\n            @media (max-width: 720px) {\n                #fc-match-modal .fc-player-table { min-width:720px; }\n            }\n        </style>\n        <div style="max-width:1280px;margin:0 auto;animation:fcMatchPanelIn 0.45s cubic-bezier(0.16,1,0.3,1) both;">\n            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;">\n                <div>\n                    <div style="font-size:11px;color:#4fc3f7;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Full Match Analysis</div>\n                    <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:#FFD700;line-height:1;">${escapeHtml(mode)}${stage ? " | " + escapeHtml(stage) : ""}</div>\n                </div>\n                <button class="lineup-btn" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);font-size:14px;padding:10px 14px;" onclick="document.getElementById('fc-match-modal').remove()">CLOSE</button>\n            </div>\n            <section style="position:relative;overflow:hidden;border-radius:20px;background:linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.12);box-shadow:0 28px 80px rgba(0,0,0,0.5);padding:clamp(18px,3vw,38px);margin-bottom:16px;">\n                <div style="display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:18px;align-items:center;text-align:center;">\n                    <div>\n                        <div style="color:#4fc3f7;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(home.team || "You")}</div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:#fff;">${escapeHtml(home.formation || "--")}</div>\n                        <div style="color:#888;font-size:12px;">OVR ${statValue(home.overall)} | Rating ${statValue(home.match_rating)}</div>\n                    </div>\n                    <div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:clamp(70px,11vw,132px);color:${rc};line-height:0.85;">${m.score_for} - ${m.score_against}</div>\n                        <div style="font-size:13px;color:${rc};font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-top:10px;">${matchLabel(m.result)}</div>\n                    </div>\n                    <div>\n                        <div style="color:#f66;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(away.team || m.opponent_username || "Opponent")}</div>\n                        <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:#fff;">${escapeHtml(away.formation || "--")}</div>\n                        <div style="color:#888;font-size:12px;">OVR ${statValue(away.overall)} | Rating ${statValue(away.match_rating)}</div>\n                    </div>\n                </div>\n            </section>\n\n            <div id="fc-match-analysis-grid" style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,0.75fr);gap:16px;align-items:start;">\n                <section style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;">\n                    <h3 style="font-family:'Bebas Neue',sans-serif;color:#fff;font-size:34px;margin:0 0 12px;">Team Stats</h3>\n                    <div style="display:grid;gap:10px;">\n                        ${renderCompareStat("Possession", stats.possession, stats.opp_possession ?? 100 - statNumber(stats.possession), "%")}\n                        ${renderCompareStat("xG", stats.xg_for, stats.xg_against)}\n                        ${renderCompareStat("Shots", stats.shots, stats.opp_shots)}\n                        ${renderCompareStat("On Target", stats.shots_on_target, stats.opp_shots_on_target)}\n                        ${renderCompareStat("Pass Accuracy", stats.pass_accuracy, stats.opp_pass_accuracy, "%")}\n                        ${renderCompareStat("Corners", stats.corners, stats.opp_corners)}\n                        ${renderCompareStat("Fouls", stats.fouls, stats.opp_fouls)}\n                        ${renderCompareStat("Cards", stats.cards, stats.opp_cards)}\n                    </div>\n                </section>\n\n                <aside style="display:grid;gap:16px;">\n                    <section style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;">\n                        <h3 style="font-family:'Bebas Neue',sans-serif;color:#fff;font-size:30px;margin:0 0 10px;">Key Notes</h3>\n                        <div style="display:grid;gap:8px;">\n                            <div style="color:#aaa;font-size:12px;background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;display:flex;align-items:center;gap:10px;">${playerPhotoHtml(topUser || topOpp || {}, "#FFD700", 34)}<span>Best performer: <strong style="color:#FFD700;">${escapeHtml(topUser?.name || topOpp?.name || "No rating")}</strong> ${topUser?.rating || topOpp?.rating ? "(" + statValue(topUser?.rating || topOpp?.rating) + ")" : ""}</span></div>\n                            <div style="color:#aaa;font-size:12px;background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;">Chance quality: <strong style="color:#fff;">${statNumber(stats.xg_for) >= statNumber(stats.xg_against) ? "You created the better xG" : "Opponent created the better xG"}</strong></div>\n                            <div style="color:#aaa;font-size:12px;background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;">Division points: <strong style="color:${statNumber(m.dp_change) >= 0 ? "#6f6" : "#f66"};">${statNumber(m.dp_change) >= 0 ? "+" : ""}${statValue(m.dp_change, 0)}</strong></div>\n                        </div>\n                    </section>\n                    <section style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;max-height:390px;overflow:auto;">\n                        <h3 style="font-family:'Bebas Neue',sans-serif;color:#fff;font-size:30px;margin:0 0 10px;">Timeline</h3>\n                        ${renderTimeline(events)}\n                    </section>\n                </aside>\n            </div>\n\n            <div id="fc-match-players-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">\n                <section style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;overflow-x:auto;">\n                    <h3 style="font-family:'Bebas Neue',sans-serif;color:#4fc3f7;font-size:32px;margin:0 0 10px;">Your Players</h3>\n                    <div class="fc-player-table" style="min-width:720px;">\n                        <div style="display:grid;grid-template-columns:58px minmax(150px,1fr) repeat(5,minmax(54px,auto));gap:10px;padding:0 10px 8px;color:#777;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">\n                            <span>Photo</span><span>Player</span><span style="text-align:right;">Rat</span><span style="text-align:right;">Sh</span><span style="text-align:right;">xG</span><span style="text-align:right;">Pass</span><span style="text-align:right;">Acc</span>\n                        </div>\n                        ${playerRows(homePlayers, "#4fc3f7")}\n                    </div>\n                </section>\n                <section style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;overflow-x:auto;">\n                    <h3 style="font-family:'Bebas Neue',sans-serif;color:#f66;font-size:32px;margin:0 0 10px;">Opponent Players</h3>\n                    <div class="fc-player-table" style="min-width:720px;">\n                        <div style="display:grid;grid-template-columns:58px minmax(150px,1fr) repeat(5,minmax(54px,auto));gap:10px;padding:0 10px 8px;color:#777;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">\n                            <span>Photo</span><span>Player</span><span style="text-align:right;">Rat</span><span style="text-align:right;">Sh</span><span style="text-align:right;">xG</span><span style="text-align:right;">Pass</span><span style="text-align:right;">Acc</span>\n                        </div>\n                        ${playerRows(awayPlayers, "#f66")}\n                    </div>\n                </section>\n            </div>\n\n            <section style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;margin-top:16px;">\n                <h3 style="font-family:'Bebas Neue',sans-serif;color:#fff;font-size:32px;margin:0 0 10px;">Substitutions</h3>\n                ${renderSubstitutions(stats.substitutions || [])}\n            </section>\n        </div>`;
  }
  function selectMode(mode) {
    _selectedMode = mode;
    document.querySelectorAll(".fc-play-mode-card").forEach((card) => {
      const active = card.dataset.mode === mode;
      card.style.border = active
        ? "2px solid #FFD700"
        : "2px solid rgba(255,255,255,0.1)";
      card.style.background = active
        ? "rgba(255,215,0,0.15)"
        : "rgba(255,255,255,0.04)";
      card.style.color = active ? "#FFD700" : "#888";
    });
    const btn = document.getElementById("fc-play-btn");
    const desc = document.getElementById("fc-mode-desc");
    const labels = {
      quickmatch: {
        label: "KICK OFF ▶",
        desc: "Single match vs AI opponent. 80% skill, 20% luck.",
      },
      tournament: {
        label: "START TOURNAMENT ▶",
        desc: "4-team knockout bracket. Beat 2 opponents to lift the trophy.",
      },
      season: {
        label: "START SEASON ▶",
        desc: "5 consecutive matches — earn a season rating and division points.",
      },
      shootout: {
        label: "START SHOOTOUT ▶",
        desc: "5-kick penalty shootout. Sudden death if tied.",
      },
    };
    if (btn) {
      btn.textContent = labels[mode]?.label || "PLAY ▶";
      btn.dataset.mode = mode;
    }
    if (desc) desc.textContent = labels[mode]?.desc || "";
  }
  async function kickoff() {
    const btn = document.getElementById("fc-play-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "SIMULATING...";
    }
    const res = await FC.play.kickoff();
    if (btn) {
      btn.disabled = false;
      selectMode(_selectedMode);
    }
    if (!res.success) {
      alert(res.error || "Pick a valid active lineup first.");
      return;
    }
    const m = res.data;
    const rc =
      m.result === "W" ? "#6f6" : m.result === "D" ? "#FFD700" : "#f66";
    _showResultModal(
      `\n            <div style="font-family:'Bebas Neue',sans-serif;font-size:48px;color:${rc};margin-bottom:4px;">${m.result === "W" ? "VICTORY!" : m.result === "D" ? "DRAW" : "DEFEAT"}</div>\n            <div style="font-size:52px;font-weight:900;color:#fff;margin:8px 0;">${m.score_for} - ${m.score_against}</div>\n            <div style="color:#888;margin-bottom:16px;">vs ${m.opponent}</div>\n            <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;margin-bottom:16px;">\n                <div style="font-size:12px;color:#aaa;margin-bottom:6px;">STATS</div>\n                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;text-align:left;">\n                    <div>xG: <strong>${m.stats.xg_for}</strong></div><div>Possession: <strong>${m.stats.possession}%</strong></div>\n                    <div>Shots: <strong>${m.stats.shots}</strong></div><div>On Target: <strong>${m.stats.shots_on_target}</strong></div>\n                </div>\n            </div>\n            <div style="color:${m.dp_change >= 0 ? "#6f6" : "#f66"};font-size:14px;margin-bottom:16px;">\n                Division Points: ${m.dp_change >= 0 ? "+" : ""}${m.dp_change} (Total: ${m.new_points})\n            </div>`,
      [
        {
          label: "View History",
          fn: () => {
            loadMatchHistory();
            loadDivisionStatus();
          },
        },
        { label: "Play Again", gold: true, fn: () => setTimeout(kickoff, 300) },
      ],
    );
    loadMatchHistory();
    loadDivisionStatus();
  }
  async function playTournament() {
    const btn = document.getElementById("fc-play-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "SIMULATING...";
    }
    const res = await FC.play.tournament();
    if (btn) {
      btn.disabled = false;
      selectMode(_selectedMode);
    }
    if (!res.success) {
      alert(res.error || "Pick a valid active lineup first.");
      return;
    }
    const d = res.data;
    function scoreRow(match) {
      const wStyle = "font-weight:900;color:#FFD700;";
      const h_win = match.winner === match.home;
      return `\n            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 2fr;align-items:center;gap:6px;padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:8px;">\n                <div style="text-align:right;font-size:13px;${h_win ? wStyle : ""}">${match.home}</div>\n                <div style="text-align:center;font-size:18px;font-weight:900;color:#fff;">${match.score_home ?? "?"}</div>\n                <div style="text-align:center;font-size:18px;font-weight:900;color:#fff;">${match.score_away ?? "?"}</div>\n                <div style="text-align:left;font-size:13px;${!h_win ? wStyle : ""}">${match.away}</div>\n            </div>`;
    }
    const trophy = d.user_won_tournament
      ? "🏆 TOURNAMENT WINNER!"
      : d.user_in_final
        ? "Finalist"
        : "Eliminated in Semi-Finals";
    const trophyColor = d.user_won_tournament
      ? "#FFD700"
      : d.user_in_final
        ? "#4fc3f7"
        : "#f66";
    _showResultModal(
      `\n            <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:${trophyColor};margin-bottom:16px;">${trophy}</div>\n            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Semi-Finals</div>\n            ${scoreRow(d.sf1)}${scoreRow(d.sf2)}\n            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;margin:10px 0 6px;">Final</div>\n            ${scoreRow(d.final)}\n            <div style="color:${d.dp_change >= 0 ? "#6f6" : "#f66"};font-size:13px;margin-top:12px;">\n                Division Points: ${d.dp_change >= 0 ? "+" : ""}${d.dp_change} (Total: ${d.new_points})\n            </div>`,
      [
        {
          label: "Close",
          fn: () => {
            loadMatchHistory();
            loadDivisionStatus();
          },
        },
        {
          label: "New Tournament",
          gold: true,
          fn: () => setTimeout(playTournament, 300),
        },
      ],
    );
    loadMatchHistory();
    loadDivisionStatus();
  }
  async function playSeason() {
    const btn = document.getElementById("fc-play-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "SEASON IN PROGRESS...";
    }
    const results = [];
    for (let i = 0; i < 5; i++) {
      const res = await FC.play.kickoff();
      if (res.success) results.push(res.data);
      else break;
    }
    if (btn) {
      btn.disabled = false;
      selectMode(_selectedMode);
    }
    if (!results.length) {
      alert("Pick a valid active lineup first.");
      return;
    }
    const wins = results.filter((r) => r.result === "W").length;
    const draws = results.filter((r) => r.result === "D").length;
    const losses = results.filter((r) => r.result === "L").length;
    const gf = results.reduce((a, r) => a + r.score_for, 0);
    const ga = results.reduce((a, r) => a + r.score_against, 0);
    const totalDp = results.reduce((a, r) => a + r.dp_change, 0);
    const finalPts = results[results.length - 1]?.new_points ?? 0;
    const rating =
      wins >= 4
        ? "S"
        : wins === 3
          ? "A"
          : wins === 2
            ? "B"
            : wins === 1
              ? "C"
              : "D";
    const ratingColor = {
      S: "#FFD700",
      A: "#6f6",
      B: "#4fc3f7",
      C: "#f90",
      D: "#f66",
    }[rating];
    _showResultModal(
      `\n            <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:#aaa;margin-bottom:4px;">SEASON COMPLETE</div>\n            <div style="font-family:'Bebas Neue',sans-serif;font-size:80px;color:${ratingColor};line-height:1;">${rating}</div>\n            <div style="font-size:13px;color:#888;margin-bottom:16px;">Season Rating</div>\n            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">\n                <div style="background:rgba(0,200,0,0.1);border:1px solid rgba(0,200,0,0.3);border-radius:8px;padding:8px;text-align:center;">\n                    <div style="font-size:24px;font-weight:900;color:#6f6;">${wins}</div><div style="font-size:10px;color:#888;">W</div></div>\n                <div style="background:rgba(200,200,0,0.1);border:1px solid rgba(200,200,0,0.3);border-radius:8px;padding:8px;text-align:center;">\n                    <div style="font-size:24px;font-weight:900;color:#FFD700;">${draws}</div><div style="font-size:10px;color:#888;">D</div></div>\n                <div style="background:rgba(200,0,0,0.1);border:1px solid rgba(200,0,0,0.3);border-radius:8px;padding:8px;text-align:center;">\n                    <div style="font-size:24px;font-weight:900;color:#f66;">${losses}</div><div style="font-size:10px;color:#888;">L</div></div>\n            </div>\n            <div style="font-size:13px;color:#888;margin-bottom:8px;">Goals: <strong style="color:#fff;">${gf} - ${ga}</strong></div>\n            <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px;max-height:130px;overflow-y:auto;">\n                ${results
        .map((r, i) => {
          const rc =
            r.result === "W" ? "#6f6" : r.result === "D" ? "#FFD700" : "#f66";
          return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 8px;background:rgba(255,255,255,0.03);border-radius:4px;">\n                        <span style="color:#888;">Match ${i + 1}</span>\n                        <span style="color:${rc};font-weight:700;">${r.result}</span>\n                        <span>${r.score_for}-${r.score_against}</span>\n                        <span style="color:#888;font-size:10px;">vs ${r.opponent}</span>\n                    </div>`;
        })
        .join(
          "",
        )}\n            </div>\n            <div style="color:${totalDp >= 0 ? "#6f6" : "#f66"};font-size:13px;">\n                Division Points: ${totalDp >= 0 ? "+" : ""}${totalDp} (Total: ${finalPts})\n            </div>`,
      [
        {
          label: "View History",
          fn: () => {
            loadMatchHistory();
            loadDivisionStatus();
          },
        },
        {
          label: "New Season",
          gold: true,
          fn: () => setTimeout(playSeason, 300),
        },
      ],
    );
    loadMatchHistory();
    loadDivisionStatus();
  }
  async function playShootout() {
    const btn = document.getElementById("fc-play-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "SIMULATING...";
    }
    const res = await FC.play.shootout();
    if (btn) {
      btn.disabled = false;
      selectMode(_selectedMode);
    }
    if (!res.success) {
      alert(res.error || "Pick a valid active lineup first.");
      return;
    }
    const d = res.data;
    const rc = d.result === "W" ? "#6f6" : "#f66";
    function kickRow(k) {
      const uDot = k.user_scored ? "🟢" : "🔴";
      const oDot = k.opp_scored ? "🔴" : "⚫";
      const sd = k.sudden
        ? '<span style="font-size:9px;color:#f90;margin-left:4px;">SD</span>'
        : "";
      return `<div style="display:grid;grid-template-columns:auto 1fr auto 1fr auto;align-items:center;gap:4px;font-size:12px;padding:5px 8px;background:rgba(255,255,255,0.03);border-radius:4px;">\n                <span style="color:#888;font-size:10px;">#${k.round}${k.sudden ? " SD" : ""}</span>\n                <span style="text-align:right;color:#4fc3f7;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${k.player}</span>\n                <span style="font-size:16px;text-align:center;">${uDot}</span>\n                <span style="text-align:center;font-size:11px;color:#aaa;">${k.user_total} - ${k.opp_total}</span>\n                <span style="font-size:16px;text-align:right;">${oDot}</span>\n            </div>`;
    }
    const kickRowWithPhotos = (k) => {
      const userDot = k.user_scored ? "#6f6" : "#f66";
      const oppDot = k.opp_scored ? "#f66" : "#6f6";
      const userKick = {
        player: k.player,
        name: k.player,
        player_card_url: k.player_card_url,
        player_image_url: k.player_image_url,
      };
      const oppKick = {
        player: k.opp_player,
        name: k.opp_player,
        player_card_url: k.opp_player_card_url,
        player_image_url: k.opp_player_image_url,
      };
      return `<div style="display:grid;grid-template-columns:auto minmax(0,1fr) 24px 58px 24px minmax(0,1fr);align-items:center;gap:6px;font-size:12px;padding:7px 8px;background:rgba(255,255,255,0.03);border-radius:6px;">\n                <span style="color:#888;font-size:10px;">#${k.round}${k.sudden ? " SD" : ""}</span>\n                <span style="display:flex;align-items:center;justify-content:flex-end;gap:6px;min-width:0;text-align:right;color:#4fc3f7;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(k.player)} ${playerPhotoHtml(userKick, "#4fc3f7", 30)}</span>\n                <span style="width:12px;height:12px;border-radius:999px;background:${userDot};justify-self:center;box-shadow:0 0 14px ${userDot};"></span>\n                <span style="text-align:center;font-size:11px;color:#aaa;">${k.user_total} - ${k.opp_total}</span>\n                <span style="width:12px;height:12px;border-radius:999px;background:${oppDot};justify-self:center;box-shadow:0 0 14px ${oppDot};"></span>\n                <span style="display:flex;align-items:center;gap:6px;min-width:0;color:#f66;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${playerPhotoHtml(oppKick, "#f66", 30)} ${escapeHtml(k.opp_player || "Opponent")}</span>\n            </div>`;
    };
    const normalKicks = d.kicks.filter((k) => !k.sudden);
    const sdKicks = d.kicks.filter((k) => k.sudden);
    _showResultModal(
      `\n            <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:${rc};margin-bottom:4px;">${d.result === "W" ? "SHOOTOUT WIN!" : "SHOOTOUT LOSS"}</div>\n            <div style="font-size:48px;font-weight:900;color:#fff;margin:4px 0;">${d.user_score} - ${d.opp_score}</div>\n            <div style="color:#888;margin-bottom:14px;font-size:13px;">vs ${d.opponent}</div>\n            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;color:#666;margin-bottom:6px;">\n                <div style="text-align:center;color:#4fc3f7;">YOU</div>\n                <div></div>\n                <div></div>\n                <div style="text-align:center;color:#f66;">OPP</div>\n            </div>\n            <div style="display:flex;flex-direction:column;gap:3px;max-height:160px;overflow-y:auto;margin-bottom:8px;">\n                ${normalKicks.map(kickRowWithPhotos).join("")}\n                ${sdKicks.length ? `<div style="font-size:10px;color:#f90;text-align:center;padding:4px;">— SUDDEN DEATH —</div>${sdKicks.map(kickRowWithPhotos).join("")}` : ""}\n            </div>\n            <div style="color:${d.dp_change >= 0 ? "#6f6" : "#f66"};font-size:13px;margin-top:8px;">\n                Division Points: ${d.dp_change >= 0 ? "+" : ""}${d.dp_change} (Total: ${d.new_points})\n            </div>`,
      [
        {
          label: "Close",
          fn: () => {
            loadMatchHistory();
            loadDivisionStatus();
          },
        },
        {
          label: "Rematch",
          gold: true,
          fn: () => setTimeout(playShootout, 300),
        },
      ],
    );
    loadMatchHistory();
    loadDivisionStatus();
  }
  function _showResultModal(bodyHtml, actions) {
    let modal = document.getElementById("fc-result-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fc-result-modal";
      modal.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;";
      document.body.appendChild(modal);
    }
    const btnHtml = actions
      .map(
        (a) =>
          `<button class="lineup-btn" style="${a.gold ? "background:#FFD700;color:#000;" : ""}" onclick="(${a.fn.toString()})(); document.getElementById('fc-result-modal').remove();">${a.label}</button>`,
      )
      .join("");
    modal.innerHTML = `\n        <div style="background:#111;border:1px solid #FFD700;border-radius:16px;width:100%;max-width:480px;padding:28px;text-align:center;max-height:90vh;overflow-y:auto;">\n            ${bodyHtml}\n            <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap;">${btnHtml}</div>\n        </div>`;
  }
  function renderFormBadges(form) {
    const rows = Array.isArray(form) ? form.slice(-5) : [];
    if (!rows.length)
      return '<span style="color:#666;font-size:11px;">-</span>';
    return rows
      .map((r) => {
        const color = r === "W" ? "#6f6" : r === "D" ? "#FFD700" : "#f66";
        return `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:${color};font-size:10px;font-weight:900;">${r}</span>`;
      })
      .join("");
  }
  function zoneBadge(row) {
    if (row.zone === "promotion")
      return '<span style="color:#6f6;font-size:10px;font-weight:900;">PROMO</span>';
    if (row.zone === "title")
      return '<span style="color:#FFD700;font-size:10px;font-weight:900;">TITLE</span>';
    if (row.zone === "relegation")
      return '<span style="color:#f66;font-size:10px;font-weight:900;">RISK</span>';
    return '<span style="color:#666;font-size:10px;">SAFE</span>';
  }
  async function loadLeaderboard(division) {
    const el = document.getElementById("fc-leaderboard");
    if (!el) return;
    const selected = division || Number(el.dataset.division || 0) || 0;
    const res = await FC.play.leaderboard(selected);
    if (!res.success) return;
    const activeDivision = res.data.division || selected || 5;
    const rows = res.data.leaderboard || [];
    const cinematic = !!el.closest(".fc-division-fullscreen");
    el.dataset.division = activeDivision;
    if (cinematic) {
      el.innerHTML = `\n            <div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:18px;padding-bottom:4px;">\n                ${[1, 2, 3, 4, 5].map((d) => `<button onclick="FC_PLAY.loadLeaderboard(${d})" style="background:${d === activeDivision ? "#FFD700" : "rgba(255,255,255,0.07)"};color:${d === activeDivision ? "#000" : "#d8d8d8"};border:1px solid ${d === activeDivision ? "#FFD700" : "rgba(255,255,255,0.13)"};border-radius:8px;padding:11px 16px;font-size:12px;font-weight:900;white-space:nowrap;cursor:pointer;letter-spacing:0.5px;">Division ${d}</button>`).join("")}\n            </div>\n            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">\n                <div style="font-family:'Bebas Neue',sans-serif;color:#FFD700;font-size:clamp(32px,5vw,58px);line-height:1;">${res.data.division_name || `Division ${activeDivision}`}</div>\n                <div style="font-size:11px;color:rgba(255,255,255,0.45);font-weight:900;text-transform:uppercase;letter-spacing:1px;">Ranked by division points</div>\n            </div>\n            <div style="overflow-x:auto;border:1px solid rgba(255,255,255,0.1);border-radius:14px;background:rgba(255,255,255,0.035);">\n                <table style="width:100%;min-width:760px;border-collapse:collapse;font-size:14px;">\n                    <thead><tr style="color:#888;font-size:11px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.1);letter-spacing:1px;">\n                        <th style="padding:12px;text-align:left;">#</th>\n                        <th style="padding:12px;text-align:left;">Player</th>\n                        <th style="padding:12px;text-align:right;">Points</th>\n                        <th style="padding:12px;text-align:right;">Matches</th>\n                        <th style="padding:12px;text-align:right;">Form</th>\n                        <th style="padding:12px;text-align:right;">Zone</th>\n                    </tr></thead>\n                    <tbody>${rows.map((r, i) => `\n                        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);background:${r.is_current_user ? "rgba(255,215,0,0.16)" : "rgba(255,255,255,0.01)"};animation:fcDivisionReveal 0.42s cubic-bezier(0.16,1,0.3,1) ${Math.min(i, 8) * 0.035}s both;">\n                            <td style="padding:13px 12px;color:#888;font-weight:900;">${r.position || i + 1}</td>\n                            <td style="padding:13px 12px;font-weight:800;color:${r.is_current_user ? "#FFD700" : "#fff"};">${r.username}${r.is_current_user ? ' <span style="font-size:10px;color:#FFD700;letter-spacing:1px;">YOU</span>' : ""}</td>\n                            <td style="padding:13px 12px;text-align:right;color:#FFD700;font-weight:900;">${r.division_points}</td>\n                            <td style="padding:13px 12px;text-align:right;color:#ddd;">${r.matches_played ?? r.division_matches_played ?? 0}/10</td>\n                            <td style="padding:13px 12px;text-align:right;"><span style="display:inline-flex;gap:4px;justify-content:flex-end;">${renderFormBadges(r.form)}</span></td>\n                            <td style="padding:13px 12px;text-align:right;">${zoneBadge(r)}</td>\n                        </tr>`).join("") || `<tr><td colspan="6" style="padding:22px;text-align:center;color:#888;">No players in this division yet.</td></tr>`}\n                    </tbody>\n                </table>\n            </div>`;
      return;
    }
    el.innerHTML = `\n        <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:2px;">\n            ${[1, 2, 3, 4, 5].map((d) => `<button onclick="FC_PLAY.loadLeaderboard(${d})" style="background:${d === activeDivision ? "#FFD700" : "rgba(255,255,255,0.06)"};color:${d === activeDivision ? "#000" : "#aaa"};border:1px solid ${d === activeDivision ? "#FFD700" : "rgba(255,255,255,0.12)"};border-radius:8px;padding:8px 10px;font-size:11px;font-weight:900;white-space:nowrap;cursor:pointer;">Division ${d}</button>`).join("")}\n        </div>\n        <div style="font-family:'Bebas Neue',sans-serif;color:#FFD700;font-size:22px;text-align:center;margin-bottom:8px;">${res.data.division_name || `Division ${activeDivision}`}</div>\n        <table style="width:100%; border-collapse:collapse; font-size:13px;">\n            <thead><tr style="color:#888; font-size:11px; text-transform:uppercase; border-bottom:1px solid #333;">\n                <th style="padding:6px; text-align:left;">#</th>\n                <th style="padding:6px; text-align:left;">Player</th>\n                <th style="padding:6px; text-align:right;">Points</th>\n                <th style="padding:6px; text-align:right;">Matches</th>\n                <th style="padding:6px; text-align:right;">Form</th>\n                <th style="padding:6px; text-align:right;">Zone</th>\n            </tr></thead>\n            <tbody>${rows.map((r, i) => `\n                <tr style="border-bottom:1px solid #1a1a1a;background:${r.is_current_user ? "rgba(255,215,0,0.12)" : "transparent"};">\n                    <td style="padding:6px; color:#888;">${r.position || i + 1}</td>\n                    <td style="padding:6px; font-weight:600;color:${r.is_current_user ? "#FFD700" : "#fff"};">${r.username}${r.is_current_user ? ' <span style="font-size:10px;color:#FFD700;">YOU</span>' : ""}</td>\n                    <td style="padding:6px; text-align:right; color:#FFD700;">${r.division_points}</td>\n                    <td style="padding:6px; text-align:right; color:#aaa;">${r.matches_played ?? r.division_matches_played ?? 0}/10</td>\n                    <td style="padding:6px; text-align:right;"><span style="display:inline-flex;gap:3px;justify-content:flex-end;">${renderFormBadges(r.form)}</span></td>\n                    <td style="padding:6px; text-align:right;">${zoneBadge(r)}</td>\n                </tr>`).join("") || `<tr><td colspan="6" style="padding:16px;text-align:center;color:#888;">No players in this division yet.</td></tr>`}\n            </tbody>\n        </table>`;
  }
  window.FC_PLAY = {
    init: function () {
      loadDivisionStatus();
      loadMatchHistory();
      loadLeaderboard();
      selectMode("quickmatch");
    },
    kickoff: kickoff,
    selectMode: selectMode,
    playTournament: playTournament,
    playSeason: playSeason,
    playShootout: playShootout,
    showMatchDetail: showMatchDetail,
    loadMatchHistory: loadMatchHistory,
    loadDivisionStatus: loadDivisionStatus,
    loadLeaderboard: loadLeaderboard,
  };
})();

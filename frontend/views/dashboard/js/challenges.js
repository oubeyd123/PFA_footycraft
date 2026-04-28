(function () {
  "use strict";
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
  function typeColor(type) {
    return (
      {
        event: "#ff3d7f",
        sbc: "#FFD700",
        easy: "#6f6",
        daily: "#4fc3f7",
        weekly: "#b388ff",
        hard: "#ff8c00",
        special: "#ff66aa",
      }[type] || "#aaa"
    );
  }
  function sectionMeta(type) {
    return (
      {
        event: {
          title: "Event Challenges",
          subtitle: "Limited rewards like icons and themed player packs",
          color: "#ff3d7f",
        },
        sbc: {
          title: "SBC Challenges",
          subtitle: "Lineup puzzles that validate instantly",
          color: "#FFD700",
        },
        daily: {
          title: "Daily Challenges",
          subtitle: "Short objectives for today",
          color: "#4fc3f7",
        },
        weekly: {
          title: "Weekly Challenges",
          subtitle: "Longer objectives across modes",
          color: "#b388ff",
        },
        hard: {
          title: "Hard Challenges",
          subtitle: "Higher difficulty objectives",
          color: "#ff8c00",
        },
        special: {
          title: "Special Challenges",
          subtitle: "Limited-time objectives and rewards",
          color: "#ff66aa",
        },
        easy: {
          title: "Easy Challenges",
          subtitle: "Starter objectives for steady rewards",
          color: "#6f6",
        },
      }[type] || {
        title: `${type.charAt(0).toUpperCase()}${type.slice(1)} Challenges`,
        subtitle: "Active objectives",
        color: typeColor(type),
      }
    );
  }
  function safeIdPart(value) {
    return String(value || "section")
      .replace(/[^a-z0-9_-]/gi, "-")
      .toLowerCase();
  }
  function renderChecks(challenge) {
    const checks = Array.isArray(challenge.sbc_checks)
      ? challenge.sbc_checks
      : [];
    if (!checks.length) return "";
    return `\n        <div style="display:flex;flex-direction:column;gap:5px;margin:10px 0 8px;">\n            ${checks
      .map((check) => {
        const passed = !!check.passed;
        return `<div style="display:flex;align-items:center;gap:7px;font-size:11px;color:${passed ? "#bfffcf" : "#aaa"};">\n                    <span style="width:16px;height:16px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;background:${passed ? "rgba(102,255,102,0.12)" : "rgba(255,255,255,0.06)"};border:1px solid ${passed ? "rgba(102,255,102,0.32)" : "rgba(255,255,255,0.12)"};color:${passed ? "#6f6" : "#777"};font-weight:900;">${passed ? "OK" : "-"}</span>\n                    <span>${escapeHtml(check.label || "Condition")}</span>\n                </div>`;
      })
      .join("")}\n        </div>`;
  }
  function renderChallengeCard(ch) {
    const type = String(ch.type || "easy").toLowerCase();
    const color = typeColor(type);
    const progress = Math.max(0, Number(ch.progress || 0));
    const required = Math.max(1, Number(ch.required || 1));
    const pct = Math.min(100, Math.round((progress / required) * 100));
    const completed = !!ch.completed || ch.completed_at != null;
    const claimed = !!ch.reward_claimed;
    const claimable = completed && !claimed;
    const status = claimable
      ? "Reward ready"
      : completed
        ? "Claimed"
        : "In progress";
    const reward = ch.reward_label || "Reward";
    const condition =
      ch.condition_label || ch.description || "Challenge objective";
    return `\n        <article style="position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025));border:1px solid ${claimable ? "rgba(255,215,0,0.75)" : completed ? "rgba(102,255,102,0.36)" : "rgba(255,255,255,0.1)"};border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:${claimable ? "0 0 32px rgba(255,215,0,0.14)" : completed ? "0 0 22px rgba(102,255,102,0.06)" : "none"};">\n            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${claimable ? "linear-gradient(90deg,#FFD700,#ff3d7f,#4fc3f7)" : completed ? "linear-gradient(90deg,#6f6,#88d81a)" : color};opacity:${completed ? 1 : 0.75};"></div>\n            <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;">\n                <div style="min-width:0;">\n                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;">\n                        <span style="font-size:10px;color:${color};font-weight:900;letter-spacing:1px;text-transform:uppercase;border:1px solid ${color}55;background:${color}16;border-radius:999px;padding:4px 8px;">${escapeHtml(type)}</span>\n                        <span style="font-size:10px;color:${claimable ? "#FFD700" : completed ? "#6f6" : "#aaa"};font-weight:900;text-transform:uppercase;letter-spacing:1px;">${status}</span>\n                    </div>\n                    <h3 style="font-size:16px;color:${claimable ? "#FFD700" : "#fff"};margin:0;font-weight:900;">${escapeHtml(ch.title || "Challenge")}</h3>\n                    <p style="font-size:12px;color:#888;margin:5px 0 0;line-height:1.5;">${escapeHtml(ch.description || "")}</p>\n                </div>\n                <div style="flex:0 0 auto;text-align:right;min-width:118px;">\n                    <div style="font-size:10px;color:#777;text-transform:uppercase;font-weight:900;letter-spacing:1px;">Reward</div>\n                    <div style="font-size:12px;color:#FFD700;font-weight:900;margin-top:3px;">${escapeHtml(reward)}</div>\n                    ${claimable ? `<button onclick="FC_CHALLENGES.claim(${Number(ch.id) || Number(ch.challenge_id) || 0}, this)" style="margin-top:8px;background:#FFD700;color:#050505;border:0;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:900;letter-spacing:1px;cursor:pointer;">CLAIM</button>` : completed ? `<div style="font-size:10px;color:#6f6;font-weight:900;margin-top:6px;">CLAIMED</div>` : ""}\n                </div>\n            </div>\n\n            <div style="background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px;margin-bottom:10px;">\n                <div style="font-size:10px;color:#777;text-transform:uppercase;font-weight:900;letter-spacing:1px;margin-bottom:4px;">Condition</div>\n                <div style="font-size:12px;color:#ddd;line-height:1.45;">${escapeHtml(condition)}</div>\n                ${renderChecks(ch)}\n            </div>\n\n            <div>\n                <div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;color:#888;margin-bottom:5px;font-weight:800;">\n                    <span>${progress} / ${required}</span>\n                    <span>${pct}%</span>\n                </div>\n                <div style="height:8px;border-radius:5px;background:rgba(255,255,255,0.08);overflow:hidden;border:1px solid rgba(255,255,255,0.07);">\n                    <div style="height:100%;border-radius:5px;background:${completed ? "linear-gradient(90deg,#FFD700,#ff8c00)" : `linear-gradient(90deg,${color},#1976d2)`};width:${pct}%;transition:width 0.45s ease;"></div>\n                </div>\n            </div>\n        </article>`;
  }
  function renderChallengeSection(type, items) {
    const meta = sectionMeta(type);
    return `\n        <section id="fc-challenge-section-${safeIdPart(type)}" style="position:relative;margin-top:20px;padding:18px;border-radius:16px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 60px rgba(0,0,0,0.24);animation:fcDivisionReveal 0.45s cubic-bezier(0.16,1,0.3,1) both;scroll-margin-top:20px;">\n            <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px;flex-wrap:wrap;">\n                <div>\n                    <div style="font-size:11px;color:${meta.color};font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:5px;">${escapeHtml(type)}</div>\n                    <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(28px,4vw,46px);line-height:1;color:#fff;margin:0;letter-spacing:1px;">${escapeHtml(meta.title)}</h2>\n                    <div style="font-size:12px;color:rgba(255,255,255,0.48);margin-top:4px;">${escapeHtml(meta.subtitle)}</div>\n                </div>\n                <span style="font-size:11px;color:${meta.color};font-weight:900;border:1px solid ${meta.color}55;background:${meta.color}16;border-radius:999px;padding:6px 10px;">${items.length} active</span>\n            </div>\n            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:12px;">\n                ${items.map(renderChallengeCard).join("")}\n            </div>\n        </section>`;
  }
  function rewardPlayerFace(player) {
    const image = player?.image_url || "";
    const name = player?.name || "Player";
    const initials =
      String(name)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase() || "FC";
    return `<span style="position:relative;width:46px;height:46px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at 50% 25%,rgba(255,215,0,0.34),rgba(255,255,255,0.06));border:1px solid rgba(255,215,0,0.55);box-shadow:0 12px 26px rgba(0,0,0,0.35);">\n            ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" style="width:100%;height:100%;object-fit:cover;object-position:top center;">` : ""}\n            <span style="display:${image ? "none" : "inline-flex"};position:absolute;color:#FFD700;font-size:12px;font-weight:900;">${escapeHtml(initials)}</span>\n        </span>`;
  }
  function showChallengeClaimNotification(items) {
    const claimable = (items || []).filter(
      (ch) =>
        (!!ch.completed || ch.completed_at != null || ch.claimable) &&
        !ch.reward_claimed,
    );
    if (!claimable.length) return;
    const key = claimable
      .map((ch) => ch.challenge_id || ch.id)
      .sort()
      .join(",");
    if (
      window.__fcChallengeClaimKey === key &&
      document.getElementById("fc-challenge-claim-toast")
    )
      return;
    window.__fcChallengeClaimKey = key;
    let toast = document.getElementById("fc-challenge-claim-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "fc-challenge-claim-toast";
      document.body.appendChild(toast);
    }
    const first = claimable[0];
    toast.style.cssText =
      "position:fixed;right:22px;bottom:22px;z-index:2147483600;width:min(420px,calc(100vw - 28px));overflow:hidden;border-radius:18px;background:linear-gradient(135deg,rgba(12,14,22,.98),rgba(28,22,8,.98));border:1px solid rgba(255,215,0,.38);box-shadow:0 28px 90px rgba(0,0,0,.55),0 0 45px rgba(255,215,0,.12);padding:16px;color:#fff;animation:fcChallengeToastIn .45s cubic-bezier(.16,1,.3,1) both;";
    toast.innerHTML = `\n            <style>@keyframes fcChallengeToastIn{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:none}} @keyframes fcChallengeSweep{from{transform:translateX(-120%)}to{transform:translateX(120%)}}</style>\n            <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);animation:fcChallengeSweep 2.6s linear infinite;pointer-events:none;"></div>\n            <button aria-label="Close" onclick="document.getElementById('fc-challenge-claim-toast')?.remove()" style="position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.35);color:#fff;cursor:pointer;">x</button>\n            <div style="font-size:10px;color:#FFD700;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Reward unlocked</div>\n            <div style="font-family:'Bebas Neue',sans-serif;font-size:38px;line-height:1;color:#fff;letter-spacing:1px;">Challenge Complete</div>\n            <div style="color:#aaa;font-size:12px;line-height:1.45;margin:8px 34px 14px 0;">${escapeHtml(first.title || "Challenge reward")} is ready to claim. Rewards are no longer silently granted.</div>\n            <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px;margin-bottom:12px;">\n                <div style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,215,0,.12);border:1px solid rgba(255,215,0,.34);color:#FFD700;font-weight:900;">${claimable.length}</div>\n                <div style="min-width:0;flex:1;">\n                    <div style="color:#fff;font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(first.title || "Challenge")}</div>\n                    <div style="color:#FFD700;font-weight:900;font-size:11px;margin-top:2px;">${escapeHtml(first.reward_label || "Reward")}</div>\n                </div>\n            </div>\n            <div style="display:flex;gap:8px;">\n                <button onclick="FC_CHALLENGES.claim(${Number(first.challenge_id || first.id) || 0}, this)" style="flex:1;background:#FFD700;color:#050505;border:0;border-radius:10px;padding:11px 12px;font-size:12px;font-weight:900;letter-spacing:1px;cursor:pointer;">CLAIM REWARD</button>\n                <button onclick="openPanel('challenges','CHALLENGES'); document.getElementById('fc-challenge-claim-toast')?.remove();" style="background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:11px 12px;font-size:12px;font-weight:900;cursor:pointer;">VIEW</button>\n            </div>`;
  }
  function showRewardReveal(res) {
    const grant = res?.data?.grant || {};
    const reward = res?.data?.reward || {};
    const players = [
      ...(grant.reward_player ? [grant.reward_player] : []),
      ...(Array.isArray(grant.reward_players) ? grant.reward_players : []),
    ];
    let modal = document.getElementById("fc-challenge-reward-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fc-challenge-reward-modal";
      document.body.appendChild(modal);
    }
    modal.style.cssText =
      "position:fixed;inset:0;z-index:2147483650;background:radial-gradient(circle at 50% 18%,rgba(255,215,0,.18),rgba(0,0,0,.94) 48%);display:flex;align-items:center;justify-content:center;padding:20px;color:#fff;";
    modal.innerHTML = `\n            <style>@keyframes fcRewardIn{from{opacity:0;transform:translateY(28px) scale(.96)}to{opacity:1;transform:none}}</style>\n            <div style="width:min(680px,100%);border-radius:22px;background:linear-gradient(135deg,rgba(20,22,32,.98),rgba(28,18,4,.98));border:1px solid rgba(255,215,0,.42);box-shadow:0 34px 120px rgba(0,0,0,.65);padding:clamp(22px,4vw,38px);text-align:center;animation:fcRewardIn .5s cubic-bezier(.16,1,.3,1) both;">\n                <div style="font-size:11px;color:#FFD700;font-weight:900;letter-spacing:3px;text-transform:uppercase;">Reward Claimed</div>\n                <div style="font-family:'Bebas Neue',sans-serif;font-size:clamp(54px,9vw,96px);line-height:.9;color:#fff;margin:10px 0;">Unlocked</div>\n                <div style="color:#aaa;font-size:13px;margin-bottom:18px;">${escapeHtml(res?.data?.message || "Reward added to your club.")}</div>\n                <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:18px;">\n                    ${
      players.length
        ? players
            .slice(0, 8)
            .map(
              (player) =>
                `<div style="width:88px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px;">${rewardPlayerFace(player)}<div style="font-size:10px;color:#fff;font-weight:900;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(player.name || "Player")}</div><div style="font-size:10px;color:#FFD700;font-weight:900;">${escapeHtml(player.overall || player.rarity || "")}</div></div>`,
            )
            .join("")
        : `<div style="color:#FFD700;font-size:18px;font-weight:900;">${escapeHtml(grant.division_points ? `+${grant.division_points} Division Points` : reward.chest ? `${reward.chest} Chest` : "Reward added")}</div>`
    }\n                </div>\n                <button onclick="document.getElementById('fc-challenge-reward-modal')?.remove()" style="background:#FFD700;color:#050505;border:0;border-radius:10px;padding:12px 18px;font-size:12px;font-weight:900;letter-spacing:1px;cursor:pointer;">CONTINUE</button>\n            </div>`;
  }
  async function loadChallenges() {
    const el = document.getElementById("fc-challenges-list");
    if (!el) return;
    el.innerHTML =
      '<div style="color:#888;padding:20px;text-align:center;">Loading challenges...</div>';
    const res = await FC.challenges.list();
    if (!res.success) {
      el.innerHTML = '<div style="color:#f66;">Failed to load challenges</div>';
      return;
    }
    const challenges = res.data.challenges || [];
    if (!challenges.length) {
      el.innerHTML =
        '<div style="color:#888; padding:20px; text-align:center;">No active challenges right now.</div>';
      return;
    }
    const sbcCount = challenges.filter(
      (ch) => String(ch.type || "").toLowerCase() === "sbc",
    ).length;
    const completedCount = challenges.filter(
      (ch) => !!ch.completed || ch.completed_at != null,
    ).length;
    const claimable = challenges.filter(
      (ch) => (!!ch.completed || ch.completed_at != null) && !ch.reward_claimed,
    );
    const grouped = challenges.reduce((acc, ch) => {
      const type = String(ch.type || "easy").toLowerCase();
      if (!acc[type]) acc[type] = [];
      acc[type].push(ch);
      return acc;
    }, {});
    const preferredOrder = [
      "daily",
      "sbc",
      "event",
      "special",
      "weekly",
      "hard",
      "easy",
    ];
    const orderedTypes = [
      ...preferredOrder.filter((type) => grouped[type]?.length),
      ...Object.keys(grouped)
        .filter((type) => !preferredOrder.includes(type))
        .sort(),
    ];
    const sectionTabs = orderedTypes
      .map((type) => {
        const meta = sectionMeta(type);
        return `<a href="#fc-challenge-section-${safeIdPart(type)}" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;background:${meta.color}16;color:${meta.color};border:1px solid ${meta.color}66;border-radius:999px;padding:10px 14px;font-size:12px;font-weight:900;letter-spacing:0.7px;text-transform:uppercase;white-space:nowrap;box-shadow:0 8px 22px ${meta.color}18;">\n                <span>${escapeHtml(meta.title.replace(" Challenges", ""))}</span>\n                <span style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:999px;background:rgba(0,0,0,0.28);color:#fff;font-size:11px;">${grouped[type].length}</span>\n            </a>`;
      })
      .join("");
    el.innerHTML = `\n        <section style="position:relative;overflow:hidden;min-height:min(38vh,340px);display:flex;flex-direction:column;justify-content:center;margin-bottom:20px;padding:clamp(22px,4vw,48px);border-radius:18px;background:linear-gradient(135deg,rgba(255,215,0,0.14),rgba(255,255,255,0.045));border:1px solid rgba(255,215,0,0.18);box-shadow:0 26px 70px rgba(0,0,0,0.42);">\n            <div style="font-size:11px;color:rgba(255,215,0,0.76);font-weight:900;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Challenge Center</div>\n            <div style="font-family:'Bebas Neue',sans-serif;font-size:clamp(58px,9vw,118px);color:#FFD700;line-height:0.9;letter-spacing:1px;text-shadow:0 18px 44px rgba(0,0,0,0.45);">Challenge Hub</div>\n            <div style="max-width:720px;font-size:14px;color:#aaa;margin-top:18px;line-height:1.55;">Match objectives update after games. SBC objectives validate instantly from your lineup.</div>\n            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">\n                <span style="font-size:12px;color:#ddd;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:7px 12px;font-weight:800;">${completedCount}/${challenges.length} completed</span>\n                <span style="font-size:12px;color:#FFD700;background:rgba(255,215,0,0.11);border:1px solid rgba(255,215,0,0.2);border-radius:999px;padding:7px 12px;font-weight:800;">${sbcCount} SBC</span>\n                <span style="font-size:12px;color:${claimable.length ? "#050505" : "#ddd"};background:${claimable.length ? "#FFD700" : "rgba(255,255,255,0.08)"};border:1px solid rgba(255,215,0,0.2);border-radius:999px;padding:7px 12px;font-weight:900;">${claimable.length} ready to claim</span>\n                <span style="font-size:12px;color:#ddd;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:7px 12px;font-weight:800;">${orderedTypes.length} sections</span>\n            </div>\n            <div style="display:flex;gap:10px;overflow-x:auto;margin-top:24px;padding-bottom:4px;">\n                ${sectionTabs}\n            </div>\n        </section>\n        ${orderedTypes.map((type) => renderChallengeSection(type, grouped[type])).join("")}`;
    showChallengeClaimNotification(claimable);
  }
  async function claimReward(challengeId, btn) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Granting...";
    }
    const res = await FC.challenges.claim(challengeId);
    if (res.success) {
      showRewardReveal(res);
      document.getElementById("fc-challenge-claim-toast")?.remove();
      window.__fcChallengeClaimKey = "";
      await loadChallenges();
    } else {
      alert(res.error || "Could not grant reward");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Grant Reward";
      }
    }
  }
  window.FC_CHALLENGES = {
    init: loadChallenges,
    refresh: loadChallenges,
    notifyClaimable: showChallengeClaimNotification,
    claim: claimReward,
  };
})();

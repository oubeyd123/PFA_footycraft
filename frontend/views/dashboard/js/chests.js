(function () {
  "use strict";
  const CHEST_INFO = {
    bronze: {
      label: "Bronze Chest",
      color: "#cd7f32",
      emoji: "📦",
      cooldown: "24 hours",
      players: 3,
    },
    silver: {
      label: "Silver Chest",
      color: "#c0c0c0",
      emoji: "🎁",
      cooldown: "5 days",
      players: 5,
    },
    gold: {
      label: "Gold Chest",
      color: "#FFD700",
      emoji: "💰",
      cooldown: "7 days",
      players: 8,
    },
  };
  const CHESTS_UI_VERSION = "20260426j";
  let threePackModulePromise = null;
  const THREE_PACK_MODULE_VERSION = CHESTS_UI_VERSION;
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
    return (
      {
        common: "#c0a060",
        rare: "#4fc3f7",
        epic: "#ce93d8",
        legend: "#FFD700",
      }[rarity] || "#aaa"
    );
  }
  function getRewardCardClass(rarity) {
    if (rarity === "icon") return "icon-rare";
    if (rarity === "common") return "silver-rare";
    return "gold-rare";
  }
  function ensureRewardCardStyles() {
    if (document.getElementById("fc-pack-reward-card-styles")) return;
    const style = document.createElement("style");
    style.id = "fc-pack-reward-card-styles";
    style.textContent = `
      @keyframes fcRewardCardFloat {
        0%, 100% {
          transform: translateY(0) scale(var(--fc-reward-shell-scale, 1.30));
        }
        50% {
          transform: translateY(-10px) scale(var(--fc-reward-shell-scale, 1.30));
        }
      }
      @keyframes fcRewardCardSwitchIn {
        0% {
          opacity: 0;
          transform: translateX(var(--fc-reward-switch-offset, 0px)) translateY(34px) scale(calc(var(--fc-reward-shell-scale, 1.30) * 0.82)) rotateY(var(--fc-reward-switch-tilt, 0deg));
          filter: blur(2px) saturate(1.22) brightness(1.08);
        }
        55% {
          opacity: 1;
          transform: translateX(0) translateY(-8px) scale(calc(var(--fc-reward-shell-scale, 1.30) * 1.045)) rotateY(calc(var(--fc-reward-switch-tilt, 0deg) * -0.22));
          filter: saturate(1.05) brightness(1.02);
        }
        100% {
          opacity: 1;
          transform: translateX(0) translateY(0) scale(var(--fc-reward-shell-scale, 1.30)) rotateY(0deg);
          filter: none;
        }
      }
      @keyframes fcRewardCardSwitchOut {
        0% {
          opacity: 1;
          transform: translateX(0) translateY(0) scale(var(--fc-reward-shell-scale, 1.30)) rotateY(0deg);
          filter: none;
        }
        100% {
          opacity: 0;
          transform: translateX(var(--fc-reward-switch-out-offset, 0px)) translateY(-16px) scale(calc(var(--fc-reward-shell-scale, 1.30) * 0.9)) rotateY(var(--fc-reward-switch-out-tilt, 0deg));
          filter: blur(2px) saturate(0.9) brightness(0.96);
        }
      }
      #fc-reward-card-layer {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 3;
        pointer-events: none;
        width: min(92vw, 284px);
        perspective: 1100px;
      }
      #fc-reward-card-layer .fc-pack-reward-card-shell {
        --fc-reward-shell-scale: 1.30;
        --fc-reward-switch-offset: 0px;
        --fc-reward-switch-out-offset: 0px;
        --fc-reward-switch-tilt: 0deg;
        --fc-reward-switch-out-tilt: 0deg;
        width: 100%;
        display: flex;
        justify-content: center;
        transform: translateY(0) scale(var(--fc-reward-shell-scale));
        transform-origin: center center;
        box-shadow: none !important;
        animation:
          fcRewardCardSwitchIn 0.56s cubic-bezier(0.12, 0.84, 0.24, 1) both,
          fcRewardCardFloat 3.2s ease-in-out 0.56s infinite;
        backface-visibility: hidden;
        transform-style: preserve-3d;
        will-change: transform, opacity, filter;
      }
      #fc-reward-card-layer .fc-fut-card {
        --card-accent: #7f6318;
        position: relative;
        width: 214px;
        aspect-ratio: 401 / 578;
        background: transparent;
        display: flex;
        flex-direction: column;
        padding: 12px 12px 16px;
        overflow: hidden;
        margin: 0 auto;
        color: #2f2711;
        box-shadow: none;
      }
      #fc-reward-card-layer .fc-fut-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url('/frontend/assets/images/cards/cardbackground.png');
        background-size: 100% 100%;
        background-position: center;
        background-repeat: no-repeat;
        z-index: 0;
        pointer-events: none;
      }
      #fc-reward-card-layer .fc-fut-card.gold-rare { --card-accent: #7f6318; }
      #fc-reward-card-layer .fc-fut-card.silver-rare { --card-accent: #49505f; }
      #fc-reward-card-layer .fc-fut-card.icon-rare { --card-accent: #67551d; }
      #fc-reward-card-layer .fc-fut-card,
      #fc-reward-card-layer .fc-fut-card * {
        text-shadow: 0 0 0 rgba(0, 0, 0, 0) !important;
      }
      #fc-reward-card-layer .fc-card-top {
        position: relative;
        z-index: 2;
        min-height: 54px;
        padding-top: 28px;
        padding-left: 10px;
      }
      #fc-reward-card-layer .fc-card-stats-left {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 40px;
        font-family: 'Bebas Neue', Arial, sans-serif;
        color: var(--card-accent);
      }
      #fc-reward-card-layer .fc-card-ovr {
        font-size: 29px;
        line-height: 0.9;
      }
      #fc-reward-card-layer .fc-card-pos {
        font-size: 20px;
        line-height: 1;
        font-weight: 700;
        margin-top: 8px;
        margin-left: 10px;
      }
      #fc-reward-card-layer .fc-card-meta {
        font-size: 10px;
        line-height: 1.15;
        font-family: 'Inter', Arial, sans-serif;
        font-weight: 700;
        opacity: 0.85;
        margin-top: 15px;
        margin-left: 10px;
      }
      #fc-reward-card-layer .fc-card-portrait {
        position: relative;
        z-index: 2;
        height: 108px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        margin-top: -35px;
      }
      #fc-reward-card-layer .fc-card-portrait-img {
        width: 106px;
        height: 102px;
        object-fit: cover;
        object-position: top center;
        display: block;
      }
      #fc-reward-card-layer .fc-card-portrait-fallback {
        width: 120px;
        height: 120px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Bebas Neue', Arial, sans-serif;
        font-size: 44px;
        color: var(--card-accent);
        background: rgba(255, 255, 255, 0.36);
        border: 2px solid rgba(127, 99, 24, 0.35);
      }
      #fc-reward-card-layer .fc-card-name {
        text-align: center;
        font-family: 'Bebas Neue', Arial, sans-serif;
        font-size: 22px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0.2px;
        margin-top: 2px;
        padding-bottom: 30px;
        color: #3a2f13;
        text-transform: uppercase;
        z-index: 2;
        position: relative;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #fc-reward-card-layer .fc-card-attributes-premium {
        margin-top: auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2px;
        z-index: 2;
        position: relative;
        font-family: 'Bebas Neue', Arial, sans-serif;
        color: #2f2711;
        width: 84%;
        margin-left: 30px;
        margin-right: auto;
        padding: 0 0 24px;
      }
      #fc-reward-card-layer .fc-stats-col {
        font-size: 12px;
        line-height: 0.98;
        font-weight: 700;
      }
      #fc-reward-card-layer .fc-attr-val {
        font-size: 17px;
        font-weight: 700;
        display: inline-block;
        width: 22px;
        text-align: right;
        margin-right: 2px;
        color: #3b2f13;
      }
      @media (max-width: 720px) {
        #fc-reward-card-layer {
          width: min(92vw, 276px);
        }
        #fc-reward-card-layer .fc-fut-card {
          width: 214px;
          padding: 12px 12px 16px;
        }
        #fc-reward-card-layer .fc-pack-reward-card-shell {
          --fc-reward-shell-scale: 1.25;
        }
        #fc-reward-card-layer .fc-card-top {
          min-height: 54px;
          padding-top: 28px;
          padding-left: 10px;
        }
        #fc-reward-card-layer .fc-card-stats-left {
          width: 40px;
        }
        #fc-reward-card-layer .fc-card-ovr {
          font-size: 29px;
        }
        #fc-reward-card-layer .fc-card-pos {
          font-size: 20px;
          margin-top: 8px;
        }
        #fc-reward-card-layer .fc-card-meta {
          font-size: 10px;
          margin-top: 15px;
        }
        #fc-reward-card-layer .fc-card-portrait {
          height: 108px;
          margin-top: -35px;
        }
        #fc-reward-card-layer .fc-card-portrait-img {
          width: 106px;
          height: 102px;
        }
        #fc-reward-card-layer .fc-card-portrait-fallback {
          width: 120px;
          height: 120px;
          font-size: 44px;
        }
        #fc-reward-card-layer .fc-card-name {
          font-size: 22px;
          padding-bottom: 30px;
        }
        #fc-reward-card-layer .fc-card-attributes-premium {
          width: 84%;
          margin-left: 30px;
          padding-bottom: 24px;
        }
        #fc-reward-card-layer .fc-stats-col {
          font-size: 12px;
        }
        #fc-reward-card-layer .fc-attr-val {
          font-size: 17px;
          width: 22px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  function formatTime(seconds) {
    if (seconds <= 0) return "Available now";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 24) return Math.floor(h / 24) + "d " + (h % 24) + "h";
    return h + "h " + m + "m";
  }
  function normalizeRewardForScene(reward, index) {
    const r = reward && typeof reward === "object" ? reward : { id: reward };
    const text = (value, fallback = "") => {
      const out = String(value ?? fallback).trim();
      return out;
    };
    const toSceneImageUrl = (value) => {
      const raw = text(value, "");
      if (!raw) return "";
      if (/^https?:\/\//i.test(raw)) {
        return `/backend/php/controllers/players/image?src=${encodeURIComponent(raw)}`;
      }
      if (raw.startsWith("//")) {
        return `/backend/php/controllers/players/image?src=${encodeURIComponent(window.location.protocol + raw)}`;
      }
      return raw;
    };
    const id = r.id ?? r.player_id ?? r.playerId ?? index + 1;
    const name = text(
      r.name || r.player_name || r.full_name,
      `PLAYER ${index + 1}`,
    );
    const club = text(r.club || r.team || r.club_name, "FREE AGENT");
    const position = text(r.position || r.pos || r.slot_code, "");
    const overall = text(
      r.overall ?? r.ovr ?? r.rating ?? r.player_overall,
      "--",
    );
    const nation = text(r.nation || r.country || "", "");
    const league = text(r.league || r.competition || "", "");
    const rarity = text(
      r.rarity || r.card_type || "common",
      "common",
    ).toLowerCase();
    const normalized = {
      id: id,
      name: name,
      club: club,
      position: position,
      overall: overall,
      nation: nation,
      league: league,
      rarity: rarity,
      pac: text(r.pac ?? r.pace ?? r.PAC, ""),
      sho: text(r.sho ?? r.shooting ?? r.SHO, ""),
      pas: text(r.pas ?? r.passing ?? r.PAS, ""),
      dri: text(r.dri ?? r.dribbling ?? r.DRI, ""),
      def: text(r.def ?? r.defending ?? r.DEF, ""),
      phy: text(r.phy ?? r.physical ?? r.PHY, ""),
      image_url: toSceneImageUrl(
        r.image_url || r.imageUrl || r.player_image_url || r.playerImageUrl,
      ),
      card_url: "",
      __rewardIndex: index,
    };
    normalized.__identity = [
      String(normalized.id ?? ""),
      normalized.name.toUpperCase(),
      normalized.overall,
      normalized.position.toUpperCase(),
      normalized.club.toUpperCase(),
      String(normalized.__rewardIndex),
    ].join("|");
    return normalized;
  }
  function preloadRewardImages(cards) {
    if (!Array.isArray(cards) || !cards.length) return;
    const seen = new Set();
    for (const card of cards) {
      const src = String(card && card.image_url ? card.image_url : "").trim();
      if (!src || seen.has(src)) continue;
      seen.add(src);
      const img = new Image();
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.src = src;
    }
  }
  async function preloadPackImage(imageUrl, timeoutMs = 1400) {
    const primary = String(imageUrl || "").trim();
    if (!primary) return false;
    const candidates = [primary];
    if (primary.startsWith("/assets/")) {
      candidates.push("/frontend" + primary);
    } else if (primary.startsWith("/frontend/assets/")) {
      candidates.push(primary.replace("/frontend", ""));
    }
    const uniqueCandidates = candidates.filter(
      (value, idx, arr) => value && arr.indexOf(value) === idx,
    );
    const tryCandidate = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        let settled = false;
        const done = (ok) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };
        img.onload = () => done(true);
        img.onerror = () => done(false);
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        try {
          img.fetchPriority = "high";
        } catch (_) {}
        img.src = src;
        if (img.complete) {
          done(true);
        }
      });
    const warmup = (async () => {
      for (const src of uniqueCandidates) {
        const ok = await tryCandidate(src);
        if (ok) return true;
      }
      return false;
    })();
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve(false), timeoutMs),
    );
    return Promise.race([warmup, timeout]);
  }
  async function loadChestStatus() {
    const el = document.getElementById("fc-chests-container");
    if (!el) return;
    const res = await FC.chests.status();
    if (!res.success) {
      el.innerHTML =
        '<div style="color:#f66;">Failed to load chest status</div>';
      return;
    }
    el.innerHTML = Object.entries(CHEST_INFO)
      .map(([type, info]) => {
        const status = res.data[type] || {
          available: true,
          seconds_remaining: 0,
        };
        return `\n            <div class="chest-card" style="background:rgba(255,255,255,0.04); border:1px solid ${info.color}33; border-radius:12px; padding:20px; text-align:center; transition:all 0.2s;">\n                <div style="font-size:44px; margin-bottom:8px;">${info.emoji}</div>\n                <div style="font-family:'Bebas Neue',sans-serif; font-size:20px; color:${info.color}; margin-bottom:4px;">${info.label}</div>\n                <div style="font-size:12px; color:#888; margin-bottom:4px;">Cooldown: ${info.cooldown} • ${info.players} players</div>\n                <div style="font-size:12px; margin-bottom:12px; color:${status.available ? "#6f6" : "#888"};">\n                    ${status.available ? "✅ Ready to open!" : "⏳ " + formatTime(status.seconds_remaining)}\n                </div>\n                <button id="fc-chest-btn-${type}" class="cta-button" style="background:${status.available ? info.color : "#333"}; color:${status.available ? "#000" : "#888"}; padding:10px 20px; border-radius:8px; font-family:'Bebas Neue',sans-serif; font-size:16px; cursor:${status.available ? "pointer" : "not-allowed"}; border:none; width:100%; transition:all 0.2s;" ${status.available ? "" : "disabled"} onclick="FC_CHESTS.open('${type}')">\n                    ${status.available ? "OPEN CHEST" : "NOT AVAILABLE"}\n                </button>\n            </div>`;
      })
      .join("");
  }
  async function openChest(chestType) {
    const btn = document.getElementById("fc-chest-btn-" + chestType);
    if (btn) {
      btn.disabled = true;
      btn.textContent = "OPENING...";
    }
    const res = await FC.chests.open(chestType);
    if (!res.success) {
      alert(res.error || "Could not open chest");
      await loadChestStatus();
      return;
    }
    const rewards = res.data.rewards;
    window.dispatchEvent(
      new CustomEvent("fc:chest-opened", {
        detail: {
          type: chestType,
          rewards_count: Array.isArray(rewards) ? rewards.length : 0,
        },
      }),
    );
    await showRewardAnimation(rewards, chestType);
    window.dispatchEvent(
      new CustomEvent("fc:chest-flow-complete", {
        detail: {
          type: chestType,
          rewards_count: Array.isArray(rewards) ? rewards.length : 0,
        },
      }),
    );
    await loadChestStatus();
  }
  async function ensureThreePackModule() {
    if (!threePackModulePromise) {
      threePackModulePromise = import(
        `/frontend/views/dashboard/js/three-pack-opening.js?v=${THREE_PACK_MODULE_VERSION}`
      ).catch((error) => {
        threePackModulePromise = null;
        throw error;
      });
    }
    return threePackModulePromise;
  }
  function createRewardNavigationUI(overlay, chestType, totalCount) {
    const info = CHEST_INFO[chestType] || { color: "#4fc3f7" };
    const nav = document.createElement("div");
    nav.id = "fc-reward-nav-layer";
    nav.style.cssText =
      "position:absolute;left:50%;bottom:max(6px, env(safe-area-inset-bottom));transform:translateX(-50%);z-index:4;display:none;flex-direction:column;align-items:center;gap:8px;pointer-events:auto;";
    nav.innerHTML = `\n            <div style="display:flex;align-items:center;gap:9px;background:rgba(6,12,22,0.72);border:1px solid rgba(255,255,255,0.16);border-radius:999px;padding:7px 9px;backdrop-filter:blur(6px);">\n                <button type="button" id="fc-prev-reward" style="border:1px solid rgba(255,255,255,0.2);background:rgba(20,28,42,0.8);color:#fff;border-radius:999px;width:34px;height:34px;font-size:17px;font-weight:900;cursor:pointer;">&#8592;</button>\n                <div id="fc-reward-index" style="min-width:84px;text-align:center;color:#fff;font-size:12px;font-weight:900;letter-spacing:0.08em;">1 / ${totalCount}</div>\n                <button type="button" id="fc-next-reward" style="border:1px solid rgba(255,255,255,0.2);background:rgba(20,28,42,0.8);color:#fff;border-radius:999px;width:34px;height:34px;font-size:17px;font-weight:900;cursor:pointer;">&#8594;</button>\n            </div>\n            <button type="button" id="fc-close-3d-reward" style="border:0;border-radius:12px;padding:11px 28px;background:${info.color};color:#000;font-weight:900;font-size:15px;letter-spacing:0.08em;cursor:pointer;box-shadow:0 8px 20px ${info.color}66;">CONTINUE</button>`;
    overlay.appendChild(nav);
    return {
      layer: nav,
      prevBtn: nav.querySelector("#fc-prev-reward"),
      nextBtn: nav.querySelector("#fc-next-reward"),
      indexEl: nav.querySelector("#fc-reward-index"),
      closeBtn: nav.querySelector("#fc-close-3d-reward"),
    };
  }
  function createRewardCardLayer(overlay) {
    const layer = document.createElement("div");
    layer.id = "fc-reward-card-layer";
    layer.style.cssText =
      "position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);z-index:3;pointer-events:none;width:min(88vw,560px);";
    overlay.appendChild(layer);
    const esc = (value) =>
      String(value ?? "").replace(
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
    const rarityBadge = (rarity) => {
      const map = {
        common: { bg: "rgba(185,150,90,0.2)", color: "#c0a060" },
        rare: { bg: "rgba(79,195,247,0.2)", color: "#4fc3f7" },
        epic: { bg: "rgba(206,147,216,0.24)", color: "#ce93d8" },
        legend: { bg: "rgba(255,215,0,0.24)", color: "#FFD700" },
        icon: { bg: "rgba(255,149,0,0.24)", color: "#ff9500" },
      };
      return (
        map[String(rarity || "").toLowerCase()] || {
          bg: "rgba(185,150,90,0.2)",
          color: "#c0a060",
        }
      );
    };
    const statValue = (value) => {
      if (value === "" || value === null || value === undefined) return "--";
      return String(value);
    };
    const render = (reward) => {
      const r = reward || {};
      const badge = rarityBadge(r.rarity);
      const image = r.image_url || "";
      const name = esc((r.name || "PLAYER").toUpperCase());
      const club = esc(r.club || "FREE AGENT");
      const position = esc(r.position || "");
      const overall = esc(r.overall || "--");
      const rarity = esc(String(r.rarity || "common").toUpperCase());
      const meta = [r.nation, r.league].filter(Boolean).map(esc).join(" • ");
      const stats = [
        ["PAC", r.pac],
        ["SHO", r.sho],
        ["PAS", r.pas],
        ["DRI", r.dri],
        ["DEF", r.def],
        ["PHY", r.phy],
      ];
      layer.innerHTML = `\n                <div style="position:relative;aspect-ratio:2/3;border-radius:32px;overflow:hidden;border:3px solid rgba(238,244,255,0.95);background:linear-gradient(160deg,#6f5425 0%,#d8bf84 36%,#f3e2b5 58%,#81642f 100%);box-shadow:0 30px 62px rgba(0,0,0,0.58), inset 0 2px 0 rgba(255,255,255,0.5);padding:18px;display:flex;flex-direction:column;gap:10px;">\n                    <div style="position:absolute;inset:8px;border-radius:26px;border:2px solid rgba(130,146,181,0.8);pointer-events:none;"></div>\n                    <div style="position:absolute;inset:12px;border-radius:22px;border:1px solid rgba(255,234,171,0.62);pointer-events:none;"></div>\n                    <div style="position:absolute;inset:0;opacity:0.12;background-image:linear-gradient(rgba(255,255,255,0.28) 1px, transparent 1px);background-size:100% 16px;pointer-events:none;"></div>\n\n                    <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start;min-height:120px;z-index:1;">\n                        <div>\n                            <div style="font-size:112px;line-height:0.85;font-weight:900;color:rgba(117,88,30,0.95);font-family:'Arial Black',Arial,sans-serif;">${overall}</div>\n                            <div style="font-size:38px;line-height:1;font-weight:900;color:rgba(110,83,28,0.95);font-family:Arial,sans-serif;margin-top:-2px;">${position}</div>\n                        </div>\n                        <div style="padding:8px 18px;border-radius:999px;border:1px solid ${badge.color};background:${badge.bg};color:${badge.color};font-size:21px;font-weight:900;letter-spacing:0.08em;box-shadow:inset 0 1px 0 rgba(255,255,255,0.45);">${rarity}</div>\n                    </div>\n\n                    <div style="position:relative;flex:1;min-height:0;border:3px solid rgba(220,234,255,0.9);background:linear-gradient(135deg,rgba(210,234,255,0.46),rgba(250,227,242,0.3));clip-path:polygon(0% 30%,43% 0%,100% 0%,100% 100%,0% 100%);overflow:hidden;display:flex;align-items:flex-end;justify-content:center;z-index:1;">\n                        ${image ? `<img src="${esc(image)}" alt="${name}" referrerpolicy="no-referrer" style="width:90%;height:100%;object-fit:contain;filter:drop-shadow(0 14px 18px rgba(0,0,0,0.35));" onerror="this.style.display='none'">` : `<div style="width:82%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(20,34,60,0.55);font-size:18px;font-weight:900;letter-spacing:0.08em;">NO IMAGE</div>`}\n                        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.36),rgba(0,0,0,0) 50%);pointer-events:none;"></div>\n                    </div>\n\n                    <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:6px;">\n                        <div style="font-size:56px;line-height:1;font-weight:900;text-align:center;color:#d6efff;letter-spacing:0.01em;text-shadow:0 2px 8px rgba(20,29,55,0.5);font-family:'Arial Black',Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>\n                        <div style="font-size:38px;line-height:1.04;font-weight:700;text-align:center;color:rgba(120,88,26,0.98);font-family:Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${club}</div>\n                        ${meta ? `<div style="font-size:15px;line-height:1.1;font-weight:800;text-align:center;color:rgba(80,60,24,0.92);letter-spacing:0.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${meta}</div>` : ""}\n                    </div>\n\n                    <div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;">\n                        ${stats.map(([label, value]) => `\n                            <div style="border-radius:16px;background:linear-gradient(168deg,rgba(9,19,40,0.96),rgba(17,33,60,0.96));border:1px solid rgba(172,210,255,0.52);padding:6px 2px 8px;text-align:center;">\n                                <div style="font-size:12px;font-weight:900;color:#a9c9ff;letter-spacing:0.05em;">${label}</div>\n                                <div style="font-size:25px;font-weight:900;color:#ffffff;line-height:1;margin-top:2px;">${esc(statValue(value))}</div>\n                            </div>\n                        `).join("")}\n                    </div>\n                </div>`;
    };
    return { layer: layer, render: render };
  }
  function createAdminRewardCardLayer(overlay) {
    ensureRewardCardStyles();
    const layer = document.createElement("div");
    layer.id = "fc-reward-card-layer";
    overlay.appendChild(layer);
    const statValue = (value) => {
      if (value === "" || value === null || value === undefined) return "--";
      return String(value);
    };
    const render = (reward) => {
      const r = reward || {};
      const image = r.image_url || "";
      const name = escapeHtml(r.name || "PLAYER");
      const position = escapeHtml(r.position || "--");
      const overall = escapeHtml(r.overall || "--");
      const nation = escapeHtml(
        String(r.nation || "").slice(0, 3).toUpperCase() || "NAT",
      );
      const club = escapeHtml(
        String(r.club || "").slice(0, 3).toUpperCase() || "CLB",
      );
      const initials = escapeHtml(
        String(r.name || "PL")
          .split(" ")
          .map((part) => part.charAt(0))
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      );
      const cardClass = getRewardCardClass(String(r.rarity || "").toLowerCase());
      layer.innerHTML = `
        <div class="fc-pack-reward-card-shell">
          <div class="fc-fut-card premium-shield ${cardClass}">
            <div class="fc-card-top">
              <div class="fc-card-stats-left">
                <span class="fc-card-ovr">${overall}</span>
                <span class="fc-card-pos">${position}</span>
                <span class="fc-card-meta">${nation}</span>
                <span class="fc-card-meta">${club}</span>
              </div>
            </div>
            <div class="fc-card-portrait">
              ${
                image
                  ? `<img src="${escapeHtml(image)}" alt="${name}" loading="eager" decoding="async" fetchpriority="high" referrerpolicy="no-referrer" class="fc-card-portrait-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                  : ""
              }
              <div class="fc-card-portrait-fallback" style="display:${image ? "none" : "flex"};">${initials}</div>
            </div>
            <div class="fc-card-name">${name}</div>
            <div class="fc-card-attributes-premium">
              <div class="fc-stats-col">
                <div><span class="fc-attr-val">${escapeHtml(statValue(r.pac))}</span> PAC</div>
                <div><span class="fc-attr-val">${escapeHtml(statValue(r.sho))}</span> SHO</div>
                <div><span class="fc-attr-val">${escapeHtml(statValue(r.pas))}</span> PAS</div>
              </div>
              <div class="fc-stats-col">
                <div><span class="fc-attr-val">${escapeHtml(statValue(r.dri))}</span> DRI</div>
                <div><span class="fc-attr-val">${escapeHtml(statValue(r.def))}</span> DEF</div>
                <div><span class="fc-attr-val">${escapeHtml(statValue(r.phy))}</span> PHY</div>
              </div>
            </div>
          </div>
        </div>`;
    };
    return { layer, render };
  }
  async function showRewardAnimation(rewards, chestType) {
    const info = CHEST_INFO[chestType] || { label: "Chest", color: "#4fc3f7" };
    const packImageMap = {
      bronze: "/frontend/assets/images/ui/bronze.png",
      silver: "/frontend/assets/images/ui/silver.png",
      gold: "/frontend/assets/images/ui/gold.png",
    };
    const packTheme =
      chestType === "bronze" || chestType === "silver" ? chestType : "gold";
    const packImageUrl = packImageMap[packTheme] || packImageMap.gold;
    const packWarmupPromise = preloadPackImage(packImageUrl, 1400);
    const modulePromise = ensureThreePackModule();
    const rawRewardList =
      Array.isArray(rewards) && rewards.length ? rewards.slice() : [{}];
    const cardsData = rawRewardList.map((item, index) =>
      normalizeRewardForScene(item, index),
    );
    preloadRewardImages(cardsData);
    let currentIndex = 0;
    let isSwitching = false;
    let scene = null;
    let nav = null;
    let rewardCardLayer = null;
    const mod = await modulePromise;
    await packWarmupPromise;
    const rewardIdentity = (reward) => {
      const r = reward || {};
      if (r.__identity) return String(r.__identity);
      return [
        String(r.id ?? r.player_id ?? ""),
        String(r.name || "").toUpperCase(),
        String(r.overall || ""),
        String(r.club || "").toUpperCase(),
        String(r.position || "").toUpperCase(),
        String(r.__rewardIndex ?? ""),
      ].join("|");
    };
    const findNextDistinctIndex = (start, delta) => {
      const fromKey = rewardIdentity(cardsData[start]);
      let idx = start + delta;
      while (idx >= 0 && idx < cardsData.length) {
        if (rewardIdentity(cardsData[idx]) !== fromKey) {
          return idx;
        }
        idx += delta;
      }
      return -1;
    };
    const buildCardPayload = (index) => {
      const card = cardsData[index] || {};
      return { ...card, __rewardIndex: index, rewardIndex: index };
    };
    const syncBackgroundCards = () => {
      if (!scene) return;
      if (typeof scene.setRewardStackIndex === "function") {
        scene.setRewardStackIndex(currentIndex);
      }
    };
    const forceMainCardNow = (payload) => {
      if (!scene) return;
      if (typeof scene.hardSetMainRewardData === "function") {
        scene.hardSetMainRewardData(payload);
        return;
      }
      if (typeof scene.hardSetRewardData === "function") {
        scene.hardSetRewardData(payload);
        return;
      }
      if (typeof scene.setMainRewardData === "function") {
        scene.setMainRewardData(payload);
      } else if (typeof scene.setRewardData === "function") {
        scene.setRewardData(payload);
      }
      if (typeof scene.ensureRewardVisible === "function") {
        scene.ensureRewardVisible();
      }
    };
    const overlay = document.createElement("div");
    overlay.id = "fc-reward-modal";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:12000;background:#000;";
    overlay.tabIndex = -1;
    document.body.appendChild(overlay);
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try {
      overlay.focus({ preventScroll: true });
    } catch (_) {}
    const root = document.createElement("div");
    root.style.cssText = "position:absolute;inset:0;";
    overlay.appendChild(root);
    rewardCardLayer = createAdminRewardCardLayer(overlay);
    rewardCardLayer.layer.style.display = "none";
    const hud = document.createElement("div");
    hud.textContent = info.label + " OPENING";
    hud.style.cssText =
      "position:absolute;left:50%;top:20px;transform:translateX(-50%);z-index:2;color:rgba(235,242,255,0.9);font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;";
    overlay.appendChild(hud);
    const setRevealHudText = () => {
      if (cardsData.length > 1) {
        hud.textContent = `REWARD ${currentIndex + 1} / ${cardsData.length}`;
        return;
      }
      hud.textContent = "REWARD REVEALED";
    };
    const updateNavState = () => {
      if (!nav) return;
      nav.indexEl.textContent = `${currentIndex + 1} / ${cardsData.length}`;
      nav.prevBtn.disabled = currentIndex <= 0;
      nav.nextBtn.disabled = currentIndex >= cardsData.length - 1;
      nav.prevBtn.style.opacity = nav.prevBtn.disabled ? "0.4" : "1";
      nav.nextBtn.style.opacity = nav.nextBtn.disabled ? "0.4" : "1";
      nav.prevBtn.style.cursor = nav.prevBtn.disabled
        ? "not-allowed"
        : "pointer";
      nav.nextBtn.style.cursor = nav.nextBtn.disabled
        ? "not-allowed"
        : "pointer";
    };
    const setCardSwitchDirection = (delta) => {
      if (!rewardCardLayer || !rewardCardLayer.layer) return;
      const offsetIn = delta > 0 ? "56px" : delta < 0 ? "-56px" : "0px";
      const offsetOut =
        delta > 0 ? "-48px" : delta < 0 ? "48px" : "0px";
      const tiltIn = delta > 0 ? "9deg" : delta < 0 ? "-9deg" : "0deg";
      const tiltOut = delta > 0 ? "-7deg" : delta < 0 ? "7deg" : "0deg";
      rewardCardLayer.layer.style.setProperty(
        "--fc-reward-switch-offset",
        offsetIn,
      );
      rewardCardLayer.layer.style.setProperty(
        "--fc-reward-switch-out-offset",
        offsetOut,
      );
      rewardCardLayer.layer.style.setProperty("--fc-reward-switch-tilt", tiltIn);
      rewardCardLayer.layer.style.setProperty(
        "--fc-reward-switch-out-tilt",
        tiltOut,
      );
    };
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const playCardSwitchOut = async () => {
      if (!rewardCardLayer || !rewardCardLayer.layer) return;
      const shell = rewardCardLayer.layer.querySelector(
        ".fc-pack-reward-card-shell",
      );
      if (!shell) return;
      shell.style.animation =
        "fcRewardCardSwitchOut 0.19s cubic-bezier(0.55, 0.06, 0.68, 0.19) both";
      await wait(170);
    };
    const moveReward = async (delta) => {
      if (!scene || isSwitching) return;
      let nextIndex = currentIndex + delta;
      if (nextIndex < 0 || nextIndex >= cardsData.length) return;
      if (
        rewardIdentity(cardsData[currentIndex]) ===
        rewardIdentity(cardsData[nextIndex])
      ) {
        const distinctIndex = findNextDistinctIndex(currentIndex, delta);
        if (distinctIndex !== -1) {
          nextIndex = distinctIndex;
        }
      }
      isSwitching = true;
      const payload = buildCardPayload(nextIndex);
      try {
        currentIndex = nextIndex;
        setRevealHudText();
        updateNavState();
        if (rewardCardLayer) {
          setCardSwitchDirection(delta);
          await playCardSwitchOut();
          rewardCardLayer.render(payload);
        }
        if (typeof scene.transitionReward === "function") {
          await scene.transitionReward(payload, delta > 0 ? 1 : -1, {
            updateStack: false,
          });
        }
      } catch (_) {
      } finally {
        forceMainCardNow(payload);
        syncBackgroundCards();
        isSwitching = false;
      }
    };
    const onKeyDown = (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      if (!nav || nav.layer.style.display === "none") return;
      if (event.key === "ArrowRight") {
        void moveReward(1);
      } else if (event.key === "ArrowLeft") {
        void moveReward(-1);
      }
    };
    const cleanup = (resolve) => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousBodyOverflow;
      if (overlay.parentNode) overlay.remove();
      resolve();
    };
    scene = new mod.PackOpening3D(root, {
      rewardTitle: "REWARD",
      rewardValue: "??",
      rewardColor: rarityColor((cardsData[0] || {}).rarity),
      packImageUrl: packImageUrl,
      packTheme: packTheme,
      rewardData: cardsData[0],
      rewardStackData: cardsData,
      disableBuiltInRewardVisual: true,
      autoStart: true,
      onReveal: () => {
        setRevealHudText();
        if (scene) {
          if (typeof scene.setRewardMeshVisible === "function") {
            scene.setRewardMeshVisible(false);
          } else if (scene.rewardGroup) {
            scene.rewardGroup.visible = false;
          }
        }
        if (rewardCardLayer) {
          setCardSwitchDirection(0);
          rewardCardLayer.render(buildCardPayload(currentIndex));
          rewardCardLayer.layer.style.display = "block";
        }
      },
      onComplete: () => {
        hud.textContent = "USE LEFT / RIGHT TO BROWSE";
        if (scene) {
          if (typeof scene.setRewardMeshVisible === "function") {
            scene.setRewardMeshVisible(false);
          } else if (scene.rewardGroup) {
            scene.rewardGroup.visible = false;
          }
        }
        if (scene) {
          const activePayload = buildCardPayload(currentIndex);
          forceMainCardNow(activePayload);
          syncBackgroundCards();
          if (rewardCardLayer) {
            setCardSwitchDirection(0);
            rewardCardLayer.render(activePayload);
          }
        }
        if (rewardCardLayer) {
          rewardCardLayer.layer.style.display = "block";
        }
        nav = createRewardNavigationUI(overlay, chestType, cardsData.length);
        updateNavState();
        nav.layer.style.display = "flex";
        nav.prevBtn.onclick = () => {
          void moveReward(-1);
        };
        nav.nextBtn.onclick = () => {
          void moveReward(1);
        };
      },
    });
    return new Promise((resolve) => {
      document.addEventListener("keydown", onKeyDown, true);
      const waitForContinue = new MutationObserver(() => {
        const closeBtn = overlay.querySelector("#fc-close-3d-reward");
        if (!closeBtn) return;
        closeBtn.onclick = () => {
          waitForContinue.disconnect();
          cleanup(resolve);
        };
      });
      waitForContinue.observe(overlay, { childList: true, subtree: true });
    });
  }
  window.FC_CHESTS = {
    __version: CHESTS_UI_VERSION,
    init: loadChestStatus,
    open: openChest,
    showAnimation: showRewardAnimation,
  };
})();

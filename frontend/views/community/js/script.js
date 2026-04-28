document.addEventListener("DOMContentLoaded", async () => {
  const widgetContainer = document.getElementById("createPostWidget");
  const postInput = document.getElementById("postInputExpander");
  const submitPostBtn = document.getElementById("submitPostBtn");
  const formationSelectBtn = document.getElementById("formationSelectBtn");
  const selectedFormationInfo = document.getElementById(
    "selectedFormationInfo",
  );
  const postsListContainer = document.querySelector(".posts-list");
  const postModal = document.getElementById("postModal");
  const postModalBody = document.getElementById("postModalBody");
  const closePostModal = document.getElementById("closePostModal");
  const postModalOverlay = document.getElementById("postModalOverlay");
  if (document.body.dataset.dashboardShell === "community") {
    const dashboardContainer = document.getElementById("dashboard");
    const navTabs = document.querySelectorAll(".nav-tab");
    navTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        const dest = tab.getAttribute("data-tab");
        if (!dest) return;
        if (!dashboardContainer) {
          window.location.href = `/frontend/views/dashboard/index.html#${dest}`;
          return;
        }
        const currentTab = document.querySelector(".nav-tab.active");
        const currentIndex = Array.from(navTabs).indexOf(currentTab);
        const targetIndex = Array.from(navTabs).indexOf(tab);
        const direction =
          targetIndex > currentIndex ? "slide-left" : "slide-right";
        dashboardContainer.classList.add("page-exit", direction);
        setTimeout(() => {
          sessionStorage.setItem("fc_internal_nav", "true");
          window.location.href = `/frontend/views/dashboard/index.html#${dest}`;
        }, 300);
      });
    });
    const brandCapsule = document.querySelector(".brand-capsule");
    if (brandCapsule) {
      brandCapsule.addEventListener("click", (e) => {
        e.preventDefault();
        if (dashboardContainer) {
          dashboardContainer.classList.add("page-exit", "fade");
          setTimeout(() => {
            sessionStorage.setItem("fc_internal_nav", "true");
            window.location.href = "/frontend/views/dashboard/index.html#home";
          }, 300);
        } else {
          window.location.href = "/frontend/views/dashboard/index.html#home";
        }
      });
    }
  }
  const userStr = localStorage.getItem("fc_user");
  let currentUser = null;
  let token = "";
  if (userStr) {
    try {
      currentUser = JSON.parse(userStr);
    } catch (e) {}
  }
  if (currentUser && currentUser.session_token) {
    token = currentUser.session_token;
  }
  const API_BASE = "/backend/php/controllers/community";
  const API_HEADERS = {
    "Content-Type": "application/json",
    "X-FC-Session": token,
  };
  const FORMATION_API_BASE = "/backend/php/controllers";
  function buildApiUrl(path) {
    if (typeof path !== "string") return path;
    if (/^https?:\/\//i.test(path)) return path;
    const origin =
      window.location.origin ||
      `${window.location.protocol}//${window.location.host}`;
    return `${origin}${path}`;
  }
  async function apiFetch(path, options = {}) {
    const headers = {
      ...API_HEADERS,
      ...(window.FCSessionActivity?.getHeaders?.() || {}),
      ...(options.headers || {}),
    };
    const response = await fetch(buildApiUrl(path), {
      credentials: "include",
      ...options,
      headers: headers,
    });
    // Don't throw on non-ok status - let caller handle the response
    return response;
  }
  let violationMessageTimer = null;
  function dismissViolationMessage(delay = 0) {
    const messageBox = document.getElementById("violationMessageBox");
    if (!messageBox) return;
    if (violationMessageTimer) {
      clearTimeout(violationMessageTimer);
      violationMessageTimer = null;
    }
    const removeMessage = () => {
      messageBox.remove();
    };
    if (delay > 0) {
      violationMessageTimer = setTimeout(removeMessage, delay);
      return;
    }
    messageBox.style.opacity = "0";
    messageBox.style.transform = "translate(-50%, -50%) scale(0.96)";
    violationMessageTimer = setTimeout(removeMessage, 260);
  }

  // Display styled violation message with auto-logout
  function showViolationMessage(message) {
    const isRedCard = message.includes("RED CARD");
    const isYellowCard = message.includes("YELLOW CARD");

    if (violationMessageTimer) {
      clearTimeout(violationMessageTimer);
      violationMessageTimer = null;
    }

    // Remove any existing violation message
    const existing = document.getElementById("violationMessageBox");
    if (existing) existing.remove();

    // Create styled message box
    const messageBox = document.createElement("div");
    messageBox.id = "violationMessageBox";
    messageBox.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      padding: 30px 40px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
      transition: opacity 0.22s ease, transform 0.22s ease;
    `;

    if (isRedCard) {
      messageBox.style.background = "rgba(220, 38, 38, 0.95)";
      messageBox.style.color = "#fff";
      messageBox.style.borderLeft = "5px solid #dc2626";
    } else if (isYellowCard) {
      messageBox.style.background = "rgba(234, 179, 8, 0.95)";
      messageBox.style.color = "#1f2937";
      messageBox.style.borderLeft = "5px solid #eab308";
    } else {
      messageBox.style.background = "rgba(59, 130, 246, 0.95)";
      messageBox.style.color = "#fff";
      messageBox.style.borderLeft = "5px solid #3b82f6";
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Dismiss warning");
    closeBtn.textContent = "x";
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.12);
      color: inherit;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
    `;
    closeBtn.addEventListener("click", () => dismissViolationMessage());

    const messageText = document.createElement("div");
    messageText.style.paddingRight = "18px";
    messageText.textContent = message;

    messageBox.appendChild(closeBtn);
    messageBox.appendChild(messageText);
    document.body.appendChild(messageBox);

    // Add animation style if not exists
    if (!document.getElementById("violationMessageStyle")) {
      const style = document.createElement("style");
      style.id = "violationMessageStyle";
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    if (isRedCard) {
      // Auto-logout after 5 seconds if red card
      setTimeout(() => {
        // Call logout endpoint and redirect
        fetch("/backend/php/controllers/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-FC-Session": token,
          },
        })
          .then(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/frontend/views/home/index.html";
          })
          .catch((err) => {
            console.error("Logout error:", err);
            // Still redirect even if logout fails
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/frontend/views/home/index.html";
          });
      }, 5000);
    } else {
      violationMessageTimer = setTimeout(() => {
        dismissViolationMessage();
      }, 4500);
    }
  }

  function showCommunityConfirmCard(options = {}) {
    const title = String(options.title || "Delete post");
    const message = String(
      options.message || "Are you sure you want to delete this post?",
    );
    const confirmText = String(options.confirmText || "Delete post");
    const cancelText = String(options.cancelText || "Cancel");

    return new Promise((resolve) => {
      const existing = document.getElementById("communityConfirmOverlay");
      if (existing) existing.remove();

      const overlay = document.createElement("div");
      overlay.id = "communityConfirmOverlay";
      overlay.className = "community-confirm-overlay active";
      overlay.innerHTML = `
        <div class="community-confirm-card card" role="alertdialog" aria-modal="true" aria-labelledby="communityConfirmTitle">
          <div class="community-confirm-accent"></div>
          <div class="community-confirm-body card-body">
            <div class="community-confirm-kicker">Community</div>
            <h3 id="communityConfirmTitle" class="community-confirm-title">${escapeHtml(title)}</h3>
            <p class="community-confirm-text">${escapeHtml(message)}</p>
            <div class="community-confirm-actions">
              <button type="button" class="community-confirm-btn community-confirm-btn-secondary" data-confirm-cancel="true">${escapeHtml(cancelText)}</button>
              <button type="button" class="community-confirm-btn community-confirm-btn-danger" data-confirm-submit="true">${escapeHtml(confirmText)}</button>
            </div>
          </div>
        </div>
      `;

      const close = (result) => {
        overlay.remove();
        resolve(result);
      };

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close(false);
      });
      overlay
        .querySelector("[data-confirm-cancel='true']")
        ?.addEventListener("click", () => close(false));
      overlay
        .querySelector("[data-confirm-submit='true']")
        ?.addEventListener("click", () => close(true));

      document.body.appendChild(overlay);
    });
  }
  
  const CATEGORY_MAP = {
    all: "all",
    tactics: "tactics",
    announcement: "announcement",
    general: "general",
  };
  const communityNavButtons = document.querySelectorAll(
    "[data-community-filter]",
  );
  let myLineupsCache = [];
  let selectedLineup = null;
  if (currentUser) {
    fetchMyLineupsWithCurrent().catch((err) => {
      console.error("Failed to preload lineups:", err);
    });
  }
  if (postsListContainer) {
    postsListContainer.innerHTML =
      '<div style="color:#888; text-align:center; padding: 40px;">Loading posts...</div>';
    await loadPosts("general");
  }
  async function loadPosts(filter = "general") {
    try {
      const url =
        filter === "all"
          ? `${API_BASE}/posts`
          : `${API_BASE}/posts?category=${filter}`;
      const res = await apiFetch(url);
      const data = await res.json();
      if (data.success) {
        renderPosts(data.data.posts);
        if (data.data.top_contributors) {
          renderTopContributors(data.data.top_contributors);
        }
      } else {
        postsListContainer.innerHTML = `<div style="color:#f66; padding:20px; text-align:center;">Error: ${data.error}</div>`;
      }
    } catch (err) {
      console.error("Load posts error:", err);
      postsListContainer.innerHTML = `<div style="color:#f66; padding:20px; text-align:center;">Failed to connect to server.</div>`;
    }
  }
  function renderSelectedFormationInfo() {
    if (!selectedFormationInfo) return;
    if (!selectedLineup) {
      selectedFormationInfo.style.display = "none";
      selectedFormationInfo.textContent = "";
      return;
    }
    const name = selectedLineup.name || "Lineup";
    const formation = selectedLineup.formation || "N/A";
    selectedFormationInfo.style.display = "block";
    selectedFormationInfo.innerHTML = `Selected formation: <strong>${escapeHtml(name)}</strong> (${escapeHtml(formation)})`;
  }
  function buildFormationPreview(formation) {
    const segments = String(formation || "4-3-3")
      .split("-")
      .map((value) => parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value > 0);
    const rows = [1, ...segments];
    const playerHtml = [];
    rows.forEach((count, rowIndex) => {
      const y = 10 + (rowIndex / (rows.length - 1)) * 78;
      if (count === 1) {
        playerHtml.push(
          `<div class="player-mini" style="--x:50%; --y:${y}%"><div class="player-rating">--</div><div class="player-name">GK</div></div>`,
        );
        return;
      }
      for (let idx = 0; idx < count; idx += 1) {
        const x = ((idx + 1) / (count + 1)) * 100;
        playerHtml.push(
          `<div class="player-mini" style="--x:${x}%; --y:${y}%"><div class="player-rating">--</div><div class="player-name">${idx + 1}</div></div>`,
        );
      }
    });
    return `\n            <div class="community-formation-pitch">\n                <div class="pitch-bg">\n                    <div class="pitch-marking center-line"></div>\n                    <div class="pitch-marking center-circle"></div>\n                    ${playerHtml.join("")}\n                </div>\n            </div>\n        `;
  }
  const lineupDetailsCache = new Map();
  function rarityColor(rarity) {
    return (
      {
        common: "#c0a060",
        rare: "#4fc3f7",
        epic: "#ce93d8",
        legend: "#FFD700",
        icon: "#ff9500",
      }[String(rarity || "").toLowerCase()] || "#aeb7c8"
    );
  }
  function getPlayerImageData(player) {
    if (!player) return { src: "", fallback: "" };
    return { src: player.image_url || "", fallback: "" };
  }
  function normalizeLineupSlot(slot) {
    if (!slot || typeof slot !== "object") {
      return {
        slot_code: "",
        position_required: "",
        player_id: 0,
        name: "",
        overall: null,
        position: "",
        rarity: "",
        card_type: "",
        card_url: "",
        image_url: "",
      };
    }
    return {
      ...slot,
      slot_code: normalizeSlotCode(slot.slot_code),
      position_required: String(slot.position_required || ""),
      player_id: Number(slot.player_id || 0),
      name: String(slot.name || ""),
      overall: Number.isFinite(Number(slot.overall))
        ? Number(slot.overall)
        : null,
      position: String(slot.position || ""),
      rarity: String(slot.rarity || ""),
      card_type: String(slot.card_type || ""),
      card_url: String(slot.card_url || ""),
      image_url: String(slot.image_url || ""),
    };
  }
  function normalizeLineupSnapshot(snapshot) {
    if (!snapshot) return null;
    let parsed = snapshot;
    if (typeof snapshot === "string") {
      try {
        parsed = JSON.parse(snapshot);
      } catch (err) {
        console.error("Failed to parse lineup snapshot:", err);
        return null;
      }
    }
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...parsed,
      id: Number(parsed.id || 0),
      name: String(parsed.name || "My Lineup"),
      formation: String(parsed.formation || "4-3-3"),
      slots: Array.isArray(parsed.slots)
        ? parsed.slots.map(normalizeLineupSlot)
        : [],
    };
  }
  function normalizeSlotCode(slotCode) {
    return String(slotCode || "")
      .trim()
      .toUpperCase();
  }
  function getStarterSlots(lineup) {
    const formations = {
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
    const expected =
      formations[String(lineup?.formation || "4-3-3")] || formations["4-3-3"];
    const source = Array.isArray(lineup?.slots) ? lineup.slots : [];
    const byCode = new Map();
    source.forEach((slot) => {
      const code = normalizeSlotCode(slot?.slot_code);
      if (!code) return;
      const existing = byCode.get(code);
      if (!existing) {
        byCode.set(code, { ...slot, slot_code: code });
        return;
      }
      const existingFilled = Boolean(existing?.name);
      const nextFilled = Boolean(slot?.name);
      if (!existingFilled && nextFilled) {
        byCode.set(code, { ...slot, slot_code: code });
      }
    });
    return expected
      .map(
        (code) =>
          byCode.get(code) || { slot_code: code, name: "", overall: null },
      )
      .slice(0, 11);
  }
  function getFormationPositions() {
    return {
      GK: { x: 50, y: 85 },
      LB: { x: 14, y: 70 },
      CB1: { x: 36, y: 71 },
      CB2: { x: 64, y: 71 },
      RB: { x: 86, y: 70 },
      LWB: { x: 10, y: 60 },
      RWB: { x: 90, y: 60 },
      CDM: { x: 50, y: 58 },
      CDM1: { x: 40, y: 58 },
      CDM2: { x: 60, y: 58 },
      LCM: { x: 28, y: 48 },
      CM: { x: 50, y: 47 },
      RCM: { x: 72, y: 48 },
      LM: { x: 12, y: 42 },
      RM: { x: 88, y: 42 },
      CAM: { x: 50, y: 34 },
      LAM: { x: 32, y: 35 },
      RAM: { x: 68, y: 35 },
      LW: { x: 18, y: 19 },
      ST: { x: 50, y: 15 },
      RW: { x: 82, y: 19 },
      ST1: { x: 38, y: 17 },
      ST2: { x: 62, y: 17 },
    };
  }
  function renderLineupCardHtml(lineup) {
    const starters = getStarterSlots(lineup);
    const positions = getFormationPositions();
    const playersHtml = starters
      .map((rawSlot) => {
        try {
          const slot = normalizeLineupSlot(rawSlot);
          const pos = positions[slot.slot_code] || { x: 50, y: 50 };
          const hasPlayer = Boolean(slot.name);
          const positionLabel = String(
            slot.position_required || slot.position || slot.slot_code || "--",
          ).toUpperCase();
          if (!hasPlayer) {
            return `\n                        <div class="post-lineup-node empty" style="--x:${pos.x}%; --y:${pos.y}%">\n                            <div class="post-lineup-empty-slot">${escapeHtml(positionLabel)}</div>\n                        </div>\n                    `;
          }
          const playerName = String(slot.name).split(" ").pop().toUpperCase();
          const overall =
            slot.overall !== null ? escapeHtml(slot.overall) : "--";
          const imageData = getPlayerImageData(slot);
          const accent = rarityColor(slot.rarity);
          const portraitHtml = imageData.src
            ? `\n                        <img\n                            class="post-lineup-portrait"\n                            src="${escapeHtml(imageData.src)}"\n                            alt="${escapeHtml(slot.name)}"\n                            ${imageData.fallback ? `data-fallback-src="${escapeHtml(imageData.fallback)}"` : ""}\n                            referrerpolicy="no-referrer"\n                            onerror="if(this.dataset.fallbackSrc && this.src !== this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;delete this.dataset.fallbackSrc;return;}this.style.display='none';"\n                        >\n                    `
            : `<div class="post-lineup-portrait fallback">${escapeHtml(positionLabel)}</div>`;
          return `\n                    <div class="post-lineup-node" style="--x:${pos.x}%; --y:${pos.y}%; --accent:${accent}">\n                        <div class="post-lineup-player-shell">\n                            <div class="post-lineup-overall">${overall}</div>\n                            ${portraitHtml}\n                            <div class="post-lineup-player-name">${escapeHtml(playerName)}</div>\n                            <div class="post-lineup-player-pos">${escapeHtml(positionLabel)}</div>\n                        </div>\n                    </div>\n                `;
        } catch (err) {
          console.error("Failed to render lineup slot preview:", err, rawSlot);
          const slotCode = normalizeSlotCode(rawSlot?.slot_code || "--");
          const pos = positions[slotCode] || { x: 50, y: 50 };
          return `\n                    <div class="post-lineup-node empty" style="--x:${pos.x}%; --y:${pos.y}%">\n                        <div class="post-lineup-empty-slot">${escapeHtml(slotCode || "--")}</div>\n                    </div>\n                `;
        }
      })
      .join("");
    return `\n            <div class="post-lineup-card">\n                <div class="post-lineup-header">\n                    <div>\n                        <div class="post-lineup-title">${escapeHtml(lineup.name || "My Lineup")}</div>\n                        <div class="post-lineup-subtitle">Exact lineup preview</div>\n                    </div>\n                    <span class="formation-badge-modal">${escapeHtml(lineup.formation || "4-3-3")}</span>\n                </div>\n                <div class="mini-pitch">\n                    <div class="pitch-bg">\n                        <div class="pitch-marking center-line"></div>\n                        <div class="pitch-marking center-circle"></div>\n                        ${playersHtml}\n                    </div>\n                </div>\n            </div>\n        `;
  }
  async function buildCreatePostPreview(lineup) {
    const snapshot = normalizeLineupSnapshot(lineup?.lineup_snapshot);
    if (snapshot) {
      return renderLineupCardHtml(snapshot);
    }
    if (Array.isArray(lineup?.slots) && lineup.slots.length) {
      return renderLineupCardHtml(lineup);
    }
    if (lineup?.id) {
      const details = await fetchLineupDetails(lineup.id);
      if (details) {
        return renderLineupCardHtml(details);
      }
    }
    return buildFormationPreview(lineup?.formation || "4-3-3");
  }
  async function updateModalPreview(lineup) {
    const previewHolder = document.getElementById("modalPreviewHolder");
    if (!previewHolder) return;
    previewHolder.innerHTML = await buildCreatePostPreview(lineup);
  }
  async function fetchLineupDetails(lineupId, options = {}) {
    const forceRefresh = Boolean(options?.forceRefresh);
    if (!lineupId) return null;
    if (!forceRefresh && lineupDetailsCache.has(lineupId))
      return lineupDetailsCache.get(lineupId);
    try {
      const res = await apiFetch(`${FORMATION_API_BASE}/lineups/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: `lineup_id=${encodeURIComponent(lineupId)}`,
      });
      const data = await res.json();
      if (data.success && data.data?.lineup) {
        const lineup = normalizeLineupSnapshot(data.data.lineup);
        lineupDetailsCache.set(lineupId, lineup);
        return lineup;
      }
    } catch (err) {
      console.error("Failed to load lineup preview:", err);
    }
    return null;
  }
  async function hydrateLineupForPreview(lineup) {
    if (!lineup?.id) return lineup || null;
    const hasSlots =
      Array.isArray(lineup.slots) && lineup.slots.some((slot) => slot?.name);
    const hasAssets =
      hasSlots &&
      lineup.slots.some((slot) => slot?.image_url || slot?.image_url);
    if (hasSlots && hasAssets) {
      lineupDetailsCache.set(Number(lineup.id), lineup);
      return lineup;
    }
    const details = await fetchLineupDetails(Number(lineup.id), {
      forceRefresh: true,
    });
    if (!details) return lineup;
    return { ...lineup, ...details, id: Number(details.id || lineup.id) };
  }
  async function loadPostLineupPreview(postId, lineupId, snapshot = null) {
    const placeholder = document.querySelector(
      `.post-lineup-placeholder[data-post-id="${postId}"]`,
    );
    if (!placeholder) return;
    const lineup =
      normalizeLineupSnapshot(snapshot) || (await fetchLineupDetails(lineupId));
    if (!lineup) {
      placeholder.innerHTML = "";
      return;
    }
    placeholder.innerHTML = renderLineupCardHtml(lineup);
  }
  async function openCreatePostModal() {
    if (!postModal || !postModalBody) return;
    const currentMeta =
      selectedLineup ||
      myLineupsCache.find((l) => l.is_active) ||
      myLineupsCache[0];
    let current = currentMeta;
    if (currentMeta?.id) {
      current =
        (await fetchLineupDetails(Number(currentMeta.id), {
          forceRefresh: true,
        })) || currentMeta;
    }
    if (current) {
      selectedLineup = current;
      renderSelectedFormationInfo();
    }
    const description = escapeHtml(postInput?.value?.trim?.() || "");
    let previewHtml = buildFormationPreview(current?.formation || "4-3-3");
    try {
      previewHtml = current
        ? await buildCreatePostPreview(current)
        : buildFormationPreview("4-3-3");
    } catch (err) {
      console.error("Formation preview render failed:", err, current);
    }
    const optionsHtml = [
      `\n            <button type="button" class="formation-option ${current ? "" : "selected"}" data-lineup-id="0">\n                <span class="formation-option-title">No formation</span>\n                <span class="formation-option-meta">Post without lineup</span>\n            </button>\n        `,
    ]
      .concat(
        myLineupsCache.map((lineup) => {
          const isSelected = current && lineup.id === current.id;
          return `\n                <button type="button" class="formation-option ${isSelected ? "selected" : ""}" data-lineup-id="${lineup.id}">\n                    <span class="formation-option-title">${escapeHtml(lineup.name)}</span>\n                    <span class="formation-option-meta">${escapeHtml(lineup.formation)}${lineup.is_active ? " • Current" : ""}</span>\n                </button>\n            `;
        }),
      )
      .join("");
    postModalBody.innerHTML = `\n            <div class="community-post-modal-body">\n                <div class="modal-summary-card">\n                    <div class="modal-summary-header">\n                        <div>\n                            <p class="modal-summary-label">Formation post preview</p>\n                            <h3>${escapeHtml(current?.name || "No formation selected")}</h3>\n                        </div>\n                        <span class="formation-badge-modal">${escapeHtml(current?.formation || "No formation")}</span>\n                    </div>\n                    <div id="modalPreviewHolder">${previewHtml}</div>\n                </div>\n                <div class="modal-section">\n                    <p class="modal-section-title">Choose a lineup</p>\n                    <div class="formation-options-grid">${optionsHtml}</div>\n                </div>\n                <div class="modal-section">\n                    <label for="modalPostTextarea" class="modal-section-title">Description</label>\n                    <textarea id="modalPostTextarea" class="modal-post-textarea" placeholder="Write your post description...">${description}</textarea>\n                </div>\n                <div class="modal-actions-row">\n                    <button type="button" id="cancelPostModal" class="ghost-button">Cancel</button>\n                    <button type="button" id="sharePostBtn" class="share-post-btn">Share</button>\n                </div>\n            </div>\n        `;
    postModal.classList.add("show");
    postModal.setAttribute("aria-hidden", "false");
  }
  function closeCreatePostModal() {
    if (!postModal) return;
    postModal.classList.remove("show");
    postModal.setAttribute("aria-hidden", "true");
  }
  async function createCommunityPost(
    content,
    category = "general",
    lineupId = null,
    imageData = null,
  ) {
    if (!currentUser) {
      alert("Please log in to post.");
      return { success: false, error: "Please log in to post." };
    }
    const payload = {
      content: content,
      category: normalizeCategoryFilter(category) || "general",
    };
    if (payload.category === "all") payload.category = "general";
    if (lineupId) payload.lineup_id = lineupId;
    if (imageData) payload.image_data = imageData;
    try {
      const res = await apiFetch(`${API_BASE}/posts`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        // Return both success and error for handling
        return { success: false, error: data.error || "Failed to create post" };
      }
      return { success: true, error: null };
    } catch (err) {
      console.error("Create post error:", err);
      return { success: false, error: "Connection error while sharing post." };
    }
  }
  async function fetchMyLineupsWithCurrent() {
    const lineupsRes = await apiFetch(`${FORMATION_API_BASE}/lineups/my`);
    const lineupsData = await lineupsRes.json();
    if (!lineupsData.success) {
      throw new Error(lineupsData.error || "Failed to load lineups");
    }
    let activeId = Number(
      currentUser?.active_lineup_id || selectedLineup?.id || 0,
    );
    try {
      const summaryRes = await apiFetch(`${FORMATION_API_BASE}/home/summary`);
      const summaryData = await summaryRes.json();
      activeId = Number(summaryData?.data?.active_lineup?.id || activeId || 0);
    } catch (err) {
      console.warn("Falling back to lineups-only community preload:", err);
    }
    const lineups = Array.isArray(lineupsData.data?.lineups)
      ? lineupsData.data.lineups
      : [];
    myLineupsCache = lineups.map((lineup) => {
      const normalized = {
        ...lineup,
        id: Number(lineup.id),
        name: String(lineup.name || "My Lineup"),
        formation: String(lineup.formation || "4-3-3"),
        slots: Array.isArray(lineup.slots) ? lineup.slots : [],
        is_active: Number(lineup.id) === activeId,
      };
      lineupDetailsCache.set(normalized.id, normalized);
      return normalized;
    });
    myLineupsCache = await Promise.all(
      myLineupsCache.map((lineup) => hydrateLineupForPreview(lineup)),
    );
    if (!selectedLineup && myLineupsCache.length) {
      const active = myLineupsCache.find((l) => l.is_active);
      selectedLineup = active || myLineupsCache[0];
      renderSelectedFormationInfo();
    }
  }
  async function openFormationPicker() {
    if (!currentUser) {
      alert("Please log in to select a formation.");
      return;
    }
    if (!myLineupsCache.length) {
      await fetchMyLineupsWithCurrent();
    }
    if (myLineupsCache.length) {
      myLineupsCache = await Promise.all(
        myLineupsCache.map((lineup) => hydrateLineupForPreview(lineup)),
      );
      if (selectedLineup?.id) {
        selectedLineup =
          myLineupsCache.find(
            (lineup) => Number(lineup.id) === Number(selectedLineup.id),
          ) || selectedLineup;
      }
    }
    if (!myLineupsCache.length) {
      alert("No lineups found. Create one in My Lineups first.");
      return;
    }
    await openCreatePostModal();
  }
  function renderTopContributors(contributors) {
    const listEls = document.querySelectorAll("#topContributorsList");
    if (!listEls.length) return;
    let html = "";
    if (!contributors || contributors.length === 0) {
      html =
        '<li class="text-center text-muted py-3">No contributors found yet.</li>';
    } else {
      contributors.forEach((c, index) => {
        const name = escapeHtml(c.username || "User");
        const initials = name.substring(0, 2).toUpperCase();
        const rep = c.rep || 0;
        const isTop = index === 0;
        const bgColors = ["d4af37", "c0c0c0", "cd7f32", "1e212b", "1e212b"];
        const bgColor = bgColors[index] || "1e212b";
        const textColors = index < 3 ? "000" : "fff";
        const starClass = isTop
          ? "text-warning"
          : index < 3
            ? "text-secondary"
            : "text-muted";
        html += `\n                <li style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;">\n                    <div style="position: relative; margin-right: 15px;">\n                        <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #${bgColor}; color: #${textColors}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">\n                            ${initials}\n                        </div>\n                        ${isTop ? '<span style="position: absolute; bottom: 0; right: -2px; width: 10px; height: 10px; background-color: #198754; border: 2px solid #1a1c23; border-radius: 50%;"></span>' : ""}\n                    </div>\n                    <div style="display: flex; flex-direction: column; justify-content: center;">\n                        <span style="color: #fff; font-weight: 600; font-size: 14px; margin-bottom: 2px; line-height: 1;">${name}</span>\n                        <span style="color: #6c757d; font-size: 12px; display: flex; align-items: center; gap: 4px;">\n                            <i class="fa-solid fa-star ${starClass}" style="font-size: 10px;"></i> ${rep} rep\n                        </span>\n                    </div>\n                </li>`;
      });
    }
    listEls.forEach((el) => {
      el.innerHTML = html;
    });
  }
  function renderPosts(posts) {
    if (!posts || posts.length === 0) {
      postsListContainer.innerHTML =
        '<div style="color:#888; text-align:center; padding: 40px;">No posts yet. Be the first to share your tactics!</div>';
      return;
    }
    postsListContainer.innerHTML = "";
    posts.forEach((post) => {
      const timeAgo = getTimeAgo(post.created_at);
      const imageUrlHtml = post.image_url
        ? `<img src="${post.image_url}" alt="" style="margin-top:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); width:100%; height:auto; display:block;" />`
        : "";
      const commentsHtml = renderComments(
        post.comments,
        post.comment_count,
        post.id,
      );
      const isMine =
        currentUser && String(currentUser.id) === String(post.user_id);
      const categoryLabel = getCategoryLabel(post.category);
      const lineupSnapshot = normalizeLineupSnapshot(post.lineup_snapshot);
      const hasFormation = Boolean(
        lineupSnapshot ||
        (Number(post.lineup_id || 0) > 0 &&
          String(post.lineup_formation || "").trim() !== ""),
      );
      const formationHtml = hasFormation
        ? `<div class="post-lineup-placeholder" data-post-id="${post.id}"></div>`
        : "";
      const isAnnouncement =
        post.category === "announcement" || post.content?.includes("<strong>");
      const displayContent = isAnnouncement
        ? post.content.replace(/<strong>[\s\S]*?<\/strong>\s*/i, "").trim()
        : post.content;
      const categoryBadge = isAnnouncement
        ? `<span class="badge glass-pill announcement-badge" style="border-color: #00bcd4;">\n                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">\n                            <path d="M12 3l8 4v5c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V7l8-4z"></path>\n                        </svg>\n                        ${escapeHtml("Announcement")}\n                    </span>`
        : `<span class="badge glass-pill" style="border-color: #55ff55;">${escapeHtml(categoryLabel)}</span>`;
      const editedLabel =
        post.updated_at && post.updated_at !== post.created_at
          ? `<span class="edited-label">edited ${getTimeAgo(post.updated_at)}</span>`
          : "";
      const optionsMenu = isMine
        ? `\n                <div class="post-options-container">\n                    <button class="post-menu-btn" data-post-id="${post.id}" aria-label="Post options">···</button>\n                    <div class="post-dropdown-menu" id="dropdown-${post.id}">\n                        <button class="dropdown-item post-edit-btn" data-id="${post.id}">\n                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>\n                            Edit post\n                        </button>\n                        <button class="dropdown-item danger post-delete-btn" data-id="${post.id}">\n                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>\n                            Delete post\n                        </button>\n                    </div>\n                </div>\n            `
        : `\n                <div class="post-options-container">\n                    <button class="post-menu-btn" data-post-id="${post.id}" aria-label="Post options">···</button>\n                    <div class="post-dropdown-menu" id="dropdown-${post.id}">\n                        <button class="dropdown-item report-btn" data-type="post" data-id="${post.id}">\n                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>\n                            Report\n                        </button>\n                    </div>\n                </div>\n            `;
      const postHtml = `\n            <div class="glass-bento-card golden-shimmer-lift" data-post-id="${post.id}">\n                <div class="card-header-post">\n                    <div class="author-meta">\n                        <div class="author-avatar" style="background: ${isAnnouncement ? "#00bcd4" : "rgba(255, 255, 255, 0.08)"}; border: 1px solid ${isAnnouncement ? "rgba(0, 188, 212, 0.3)" : "rgba(255, 255, 255, 0.15)"}; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; color: ${isAnnouncement ? "#ffffff" : "rgba(255, 255, 255, 0.6)"}; font-weight: 700; font-size: 14px;">${post.username.substring(0, 2).toUpperCase()}</div>\n                        <div class="author-info">\n                            <span class="author-name">${escapeHtml(post.username)}</span>\n                            <span class="post-timestamp">${timeAgo}</span>\n                        </div>\n                    </div>\n                    <div class="post-header-right">\n                        ${categoryBadge}\n                        ${optionsMenu}\n                    </div>\n                </div>\n                <div class="card-body-post">\n                    <p class="post-content-text" style="font-size:15px; color:rgba(255,255,255,0.9); white-space:pre-wrap; margin-bottom:4px;">${escapeHtml(displayContent)}</p>\n                    ${formationHtml}\n                    ${editedLabel}\n                    ${imageUrlHtml}\n                </div>\n                \n                <div class="card-actions-post">\n                    <div class="actions-left">\n                        <div class="voting-actions">\n                            <button class="vote-btn flame-btn post-like-btn ${post.liked_by_me ? "active" : ""}" data-id="${post.id}" aria-label="Upvote">\n                                <svg class="flame-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">\n                                    <path d="M12 2C12 2 5 8 5 14C5 18 8 22 12 22C16 22 19 18 19 14C19 8 12 2 12 2ZM12 18C10.5 18 9.5 16.5 9.5 15C9.5 13.5 12 10 12 10C12 10 14.5 13.5 14.5 15C14.5 16.5 13.5 18 12 18Z" stroke-width="1.5" stroke-linejoin="round"/>\n                                </svg>\n                                <span class="vote-count">${post.likes}</span>\n                            </button>\n                        </div>\n                        <button class="ghost-button comments-toggle-btn" data-target="comments-${post.id}" aria-expanded="false">\n                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\n                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>\n                            </svg>\n                            <span>Comments <span class="comment-count">${post.comment_count}</span></span>\n                        </button>\n                    </div>\n                </div>\n\n                <div class="comments-section" id="comments-${post.id}">\n                    ${post.comment_count > post.comments.length ? `<div class="view-more-text comments-toggle-btn" data-target="comments-${post.id}">View all ${post.comment_count} comments</div>` : ""}\n                    <div class="comments-thread">${commentsHtml}</div>\n                    <div class="new-comment-row">\n                        <div class="comment-avatar" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; color: rgba(255, 255, 255, 0.6); font-weight: 700; font-size: 12px;">${(currentUser?.username || "U").substring(0, 2).toUpperCase()}</div>\n                        <input type="text" class="new-comment-input" data-post-id="${post.id}" placeholder="Add a comment…">\n                        <button class="reply-send-btn submit-comment-btn" data-post-id="${post.id}" aria-label="Post comment">\n                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\n                                <line x1="22" y1="2" x2="11" y2="13"></line>\n                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>\n                            </svg>\n                        </button>\n                    </div>\n                </div>\n            </div>`;
      postsListContainer.insertAdjacentHTML("beforeend", postHtml);
      if (hasFormation) {
        loadPostLineupPreview(post.id, post.lineup_id, lineupSnapshot);
      }
    });
  }
  function renderComments(comments, totalCount, postId) {
    if (!comments || comments.length === 0) return "";
    const roots = [];
    const childrenMap = {};
    comments.forEach((c) => {
      if (c.parent_id) {
        if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = [];
        childrenMap[c.parent_id].push(c);
      } else {
        roots.push(c);
      }
    });
    function renderNode(comment, isNested = false) {
      const timeAgo = getTimeAgo(comment.created_at);
      const isMyComment =
        currentUser && String(currentUser.id) === String(comment.user_id);
      const commentOptions = isMyComment
        ? `\n                <div class="post-options-container" style="display:inline-block; vertical-align:middle; margin-left:4px;">\n                    <button class="post-menu-btn comment-menu-btn" data-comment-id="${comment.id}" style="font-size:16px; padding:0 6px;">···</button>\n                    <div class="post-dropdown-menu" id="comment-dropdown-${comment.id}">\n                        <button class="dropdown-item comment-edit-btn" data-id="${comment.id}">\n                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>\n                            Edit\n                        </button>\n                        <button class="dropdown-item danger comment-delete-btn" data-id="${comment.id}">\n                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>\n                            Delete\n                        </button>\n                    </div>\n                </div>\n            `
        : `\n                <div class="post-options-container" style="display:inline-block; vertical-align:middle; margin-left:4px;">\n                    <button class="post-menu-btn comment-menu-btn" data-comment-id="${comment.id}" style="font-size:16px; padding:0 6px;">···</button>\n                    <div class="post-dropdown-menu" id="comment-dropdown-${comment.id}">\n                        <button class="dropdown-item report-btn" data-type="comment" data-id="${comment.id}">\n                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>\n                            Report\n                        </button>\n                    </div>\n                </div>\n            `;
      const displayContent = escapeHtml(comment.content).replace(
        /@(\w+)/g,
        '<span style="color:var(--coral); font-weight:600;">@$1</span>',
      );
      const itemHtml = `\n            <div class="comment-item" data-comment-id="${comment.id}" ${isNested ? 'style="margin-left:24px; border-left:2px solid rgba(255,255,255,0.05); padding-left:12px; margin-top:8px;"' : ""}>\n                <div style="display:flex; gap:10px;">\n                    <div class="comment-avatar" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; color: rgba(255, 255, 255, 0.6); font-weight: 700; font-size: 11px; flex-shrink:0;">${comment.username.substring(0, 2).toUpperCase()}</div>\n                    <div class="comment-content" style="flex:1;">\n                        <div class="comment-bubble" style="padding:6px 12px;">\n                            <div style="display:flex; align-items:center; justify-content:space-between;">\n                                <span class="comment-author">${escapeHtml(comment.username)}</span>\n                                ${commentOptions}\n                            </div>\n                            <p class="comment-body-text" style="margin:4px 0 0;">${displayContent}</p>\n                        </div>\n                        <div class="comment-meta" style="margin-left:6px; margin-top:4px;">\n                            <span>${timeAgo}</span>\n                            <button class="comment-like-btn ${comment.liked_by_me ? "liked" : ""}" data-id="${comment.id}" ${comment.liked_by_me ? 'style="color:var(--coral)"' : ""}>♥ <span class="c-likes-count">${comment.likes}</span></button>\n                            ${!isNested ? `<button class="comment-reply-toggle">Reply</button>` : ""}\n                        </div>\n                        <div class="comment-reply-row">\n                            <input type="text" class="comment-reply-input" data-parent-id="${comment.id}" placeholder="Reply to ${escapeHtml(comment.username)}…">\n                            <button class="reply-send-btn submit-comment-btn" data-post-id="${postId}" aria-label="Send reply">\n                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\n                                    <line x1="22" y1="2" x2="11" y2="13"></line>\n                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>\n                                </svg>\n                            </button>\n                        </div>\n                    </div>\n                </div>\n            `;
      let childrenHtml = "";
      if (childrenMap[comment.id]) {
        childrenHtml =
          `<div class="nested-comments">` +
          childrenMap[comment.id]
            .map((child) => renderNode(child, true))
            .join("") +
          `</div>`;
      }
      return itemHtml + childrenHtml + `</div>`;
    }
    return roots.map((c) => renderNode(c, false)).join("");
  }
  if (postInput && widgetContainer) {
    postInput.addEventListener("focus", () => {
      postInput.style.minHeight = "60px";
      widgetContainer.style.borderColor = "rgba(212, 175, 55, 0.4)";
      widgetContainer.style.boxShadow = "0 8px 32px rgba(212, 175, 55, 0.15)";
    });
    document.addEventListener("click", (e) => {
      if (
        !widgetContainer.contains(e.target) &&
        postInput.value.trim() === ""
      ) {
        postInput.style.minHeight = "24px";
        widgetContainer.style.borderColor = "rgba(255, 255, 255, 0.06)";
        widgetContainer.style.boxShadow = "var(--card-shadow)";
      }
    });
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    widgetContainer.appendChild(fileInput);
    const mediaBtn = document.querySelector('.action-icon-btn[title="Media"]');
    if (mediaBtn) {
      mediaBtn.addEventListener("click", () => fileInput.click());
    }
    if (formationSelectBtn) {
      formationSelectBtn.addEventListener("click", async () => {
        try {
          await openFormationPicker();
        } catch (err) {
          console.error(err);
          alert(`Failed to load your formations.\n${err?.message || err}`);
        }
      });
    }
    if (closePostModal) {
      closePostModal.addEventListener("click", closeCreatePostModal);
    }
    if (postModalOverlay) {
      postModalOverlay.addEventListener("click", (e) => {
        if (e.target === postModalOverlay) {
          closeCreatePostModal();
        }
      });
    }
    let selectedImageData = null;
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          selectedImageData = evt.target.result;
          let preview = document.getElementById("postImgPreview");
          if (!preview) {
            preview = document.createElement("img");
            preview.id = "postImgPreview";
            preview.style.cssText =
              "height:40px; border-radius:4px; margin-top:8px; margin-left:4px;";
            postInput.parentNode.appendChild(preview);
          }
          preview.src = selectedImageData;
        };
        reader.readAsDataURL(file);
      }
    });
    if (submitPostBtn) {
      submitPostBtn.addEventListener("click", async () => {
        const content = postInput.value.trim();
        if (!content) return;
        if (!currentUser) {
          alert("Please log in to post.");
          return;
        }
        submitPostBtn.style.opacity = "0.5";
        submitPostBtn.disabled = true;
        const originalBtnContent = submitPostBtn.innerHTML;
        submitPostBtn.innerHTML =
          '<span style="display:flex;align-items:center;gap:8px;"><svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> VAR-AI Checking...</span>';
        if (!document.getElementById("spinnerAnim")) {
          const style = document.createElement("style");
          style.id = "spinnerAnim";
          style.textContent =
            "@keyframes spin{100%{transform:rotate(360deg)}}.spinner{animation:spin 1s linear infinite}";
          document.head.appendChild(style);
        }
        try {
          const activeFilter = document.querySelector(
            ".glass-pill-container .glass-pill.active",
          );
          const reqBody = {
            content: content,
            category: normalizeCategoryFilter(
              activeFilter?.textContent || "General",
            ),
          };
          if (reqBody.category === "all") reqBody.category = "general";
          if (selectedImageData) reqBody.image_data = selectedImageData;
          if (selectedLineup && selectedLineup.id)
            reqBody.lineup_id = selectedLineup.id;
          const result = await createCommunityPost(
            content,
            reqBody.category,
            reqBody.lineup_id,
            selectedImageData,
          );
          if (result.success) {
            postInput.value = "";
            postInput.blur();
            postInput.style.minHeight = "24px";
            widgetContainer.style.borderColor = "rgba(255, 255, 255, 0.06)";
            widgetContainer.style.boxShadow = "var(--card-shadow)";
            selectedImageData = null;
            const preview = document.getElementById("postImgPreview");
            if (preview) preview.remove();
            fileInput.value = "";
            await loadPosts();
          } else {
            if (result.error && (result.error.includes('CARD') || result.error.includes('🟡') || result.error.includes('🔴'))) {
              showViolationMessage(result.error);
            } else {
              alert(result.error || "Failed to create post");
            }
          }
        } catch (e) {
          alert("Connection error: " + e.message);
          console.error(e);
        } finally {
          submitPostBtn.style.opacity = "1";
          submitPostBtn.disabled = false;
          submitPostBtn.innerHTML = originalBtnContent;
        }
      });
    }
  }
  document.addEventListener("click", async (e) => {
    const postLikeBtn = e.target.closest(".post-like-btn");
    if (postLikeBtn) {
      if (!currentUser) {
        alert("Please log in to like.");
        return;
      }
      try {
        const res = await apiFetch(
          `${API_BASE}/posts/${postLikeBtn.dataset.id}/like`,
          { method: "POST" },
        );
        const data = await res.json();
        if (data.success) {
          postLikeBtn.classList.toggle("active", data.data.liked);
          postLikeBtn.querySelector(".vote-count").textContent =
            data.data.likes;
        }
      } catch (err) {
        console.error(err);
      }
    }
    const menuBtn = e.target.closest(".post-menu-btn");
    if (menuBtn) {
      const postId = menuBtn.dataset.postId;
      const commentId = menuBtn.dataset.commentId;
      const dropdownId = commentId
        ? `comment-dropdown-${commentId}`
        : `dropdown-${postId}`;
      document.querySelectorAll(".post-dropdown-menu.show").forEach((m) => {
        if (m.id !== dropdownId) m.classList.remove("show");
      });
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) dropdown.classList.toggle("show");
      e.stopPropagation();
      return;
    }
    if (!e.target.closest(".post-options-container")) {
      document
        .querySelectorAll(".post-dropdown-menu.show")
        .forEach((m) => m.classList.remove("show"));
    }
    const cancelPostBtn = e.target.closest("#cancelPostModal");
    if (cancelPostBtn) {
      closeCreatePostModal();
      return;
    }
    const sharePostBtn = e.target.closest("#sharePostBtn");
    if (sharePostBtn) {
      const textarea = document.getElementById("modalPostTextarea");
      if (!textarea) return;
      const content = textarea.value.trim();
      if (!content) {
        alert("Please write a description before sharing.");
        return;
      }
      sharePostBtn.disabled = true;
      sharePostBtn.textContent = "Sharing...";
      const category =
        document.querySelector(".glass-pill-container .glass-pill.active")
          ?.textContent || "general";
      const lineupId = selectedLineup?.id || null;
      const success = await createCommunityPost(content, category, lineupId);
      sharePostBtn.disabled = false;
      sharePostBtn.textContent = "Share";
      if (success) {
        postInput.value = "";
        closeCreatePostModal();
        await loadPosts();
      }
      return;
    }
    const formationOption = e.target.closest(".formation-option");
    if (formationOption) {
      const selectedId = Number(formationOption.dataset.lineupId || 0);
      if (selectedId === 0) {
        selectedLineup = null;
      } else {
        const found = myLineupsCache.find((l) => l.id === selectedId);
        if (found) {
          selectedLineup = await hydrateLineupForPreview(found);
        }
      }
      renderSelectedFormationInfo();
      const options = document.querySelectorAll(".formation-option");
      options.forEach((btn) =>
        btn.classList.toggle(
          "selected",
          Number(btn.dataset.lineupId || 0) === selectedId,
        ),
      );
      const badge = document.querySelector(".formation-badge-modal");
      if (badge) {
        badge.textContent = selectedLineup
          ? selectedLineup.formation
          : "No formation";
      }
      const summaryTitle = document.querySelector(".modal-summary-card h3");
      if (summaryTitle) {
        summaryTitle.textContent = selectedLineup
          ? selectedLineup.name
          : "No formation selected";
      }
      if (selectedLineup?.id) {
        selectedLineup =
          (await fetchLineupDetails(Number(selectedLineup.id), {
            forceRefresh: true,
          })) || selectedLineup;
      }
      await updateModalPreview(selectedLineup);
      return;
    }
    const editBtn = e.target.closest(".post-edit-btn");
    if (editBtn) {
      const postId = editBtn.dataset.id;
      const postCard = document.querySelector(
        `.glass-bento-card[data-post-id="${postId}"]`,
      );
      if (!postCard) return;
      document.getElementById(`dropdown-${postId}`)?.classList.remove("show");
      const contentP = postCard.querySelector(".post-content-text");
      const editedEl = postCard.querySelector(".edited-label");
      if (!contentP || postCard.querySelector(".edit-post-textarea")) return;
      const originalText = contentP.textContent;
      const textarea = document.createElement("textarea");
      textarea.className = "edit-post-textarea";
      textarea.value = originalText;
      const editActions = document.createElement("div");
      editActions.className = "edit-actions";
      editActions.innerHTML = `<button class="edit-cancel-btn">Cancel</button><button class="edit-save-btn" data-post-id="${postId}">Save</button>`;
      contentP.style.display = "none";
      contentP.insertAdjacentElement("afterend", editActions);
      contentP.insertAdjacentElement("afterend", textarea);
      textarea.focus();
      textarea.selectionStart = textarea.value.length;
      editActions
        .querySelector(".edit-cancel-btn")
        .addEventListener("click", () => {
          textarea.remove();
          editActions.remove();
          contentP.style.display = "";
        });
      editActions
        .querySelector(".edit-save-btn")
        .addEventListener("click", async () => {
          const newContent = textarea.value.trim();
          if (!newContent) return;
          const saveBtn = editActions.querySelector(".edit-save-btn");
          saveBtn.disabled = true;
          saveBtn.textContent = "VAR-AI...";
          try {
            const res = await apiFetch(`${API_BASE}/posts/${postId}`, {
              method: "PUT",
              body: JSON.stringify({ content: newContent }),
            });
            const data = await res.json();
            if (data.success) {
              contentP.textContent = newContent;
              contentP.style.display = "";
              textarea.remove();
              editActions.remove();
              if (editedEl) editedEl.textContent = "edited just now";
              else {
                const label = document.createElement("span");
                label.className = "edited-label";
                label.textContent = "edited just now";
                contentP.insertAdjacentElement("afterend", label);
              }
            } else {
              if (data.error && (data.error.includes('CARD') || data.error.includes('🟡') || data.error.includes('🔴'))) {
                showViolationMessage(data.error);
              } else {
                alert(data.error || "Failed to edit post");
              }
              saveBtn.disabled = false;
              saveBtn.textContent = "Save";
            }
          } catch (err) {
            console.error(err);
            alert("Connection error");
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
          }
        });
      return;
    }
    const commentLikeBtn = e.target.closest(".comment-like-btn");
    if (commentLikeBtn) {
      if (!currentUser) {
        alert("Please log in to like.");
        return;
      }
      try {
        const res = await apiFetch(
          `${API_BASE}/comments/${commentLikeBtn.dataset.id}/like`,
          { method: "POST" },
        );
        const data = await res.json();
        if (data.success) {
          commentLikeBtn.classList.toggle("liked", data.data.liked);
          commentLikeBtn.style.color = data.data.liked ? "var(--coral)" : "";
          commentLikeBtn.querySelector(".c-likes-count").textContent =
            data.data.likes;
        }
      } catch (err) {
        console.error(err);
      }
    }
    const submitCommentBtn = e.target.closest(".submit-comment-btn");
    if (submitCommentBtn) {
      if (!currentUser) {
        alert("Please log in to comment.");
        return;
      }
      const postId = submitCommentBtn.dataset.postId;
      let inputEl =
        e.target
          .closest(".new-comment-row")
          ?.querySelector(".new-comment-input") ||
        e.target
          .closest(".comment-reply-row")
          ?.querySelector(".comment-reply-input");
      if (!inputEl) return;
      const content = inputEl.value.trim();
      const parentId = inputEl.dataset.parentId || null;
      if (!content) return;
      submitCommentBtn.style.opacity = "0.5";
      submitCommentBtn.disabled = true;
      const originalBtnContent = submitCommentBtn.innerHTML;
      submitCommentBtn.innerHTML =
        '<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>';
      if (!document.getElementById("spinnerAnim")) {
        const style = document.createElement("style");
        style.id = "spinnerAnim";
        style.textContent =
          "@keyframes spin{100%{transform:rotate(360deg)}}.spinner{animation:spin 1s linear infinite}";
        document.head.appendChild(style);
      }
      try {
        const reqBody = { content: content };
        if (parentId) reqBody.parent_id = parentId;
        const res = await apiFetch(`${API_BASE}/posts/${postId}/comments`, {
          method: "POST",
          body: JSON.stringify(reqBody),
        });
        const data = await res.json();
        if (data.success) {
          inputEl.value = "";
          await loadPosts();
        } else {
          if (data.error && (data.error.includes('CARD') || data.error.includes('🟡') || data.error.includes('🔴'))) {
            showViolationMessage(data.error);
          } else {
            alert(data.error || "Failed to post comment");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        submitCommentBtn.style.opacity = "1";
        submitCommentBtn.disabled = false;
        submitCommentBtn.innerHTML = originalBtnContent;
      }
    }
    const commentsToggleBtn = e.target.closest(".comments-toggle-btn");
    if (commentsToggleBtn) {
      const targetId = commentsToggleBtn.dataset.target;
      const commentsSection = document.getElementById(targetId);
      if (commentsSection) {
        const isExpanded =
          commentsToggleBtn.getAttribute("aria-expanded") === "true";
        commentsToggleBtn.setAttribute("aria-expanded", !isExpanded);
        commentsSection.style.display = isExpanded ? "none" : "block";
      }
    }
    const replyToggle = e.target.closest(".comment-reply-toggle");
    if (replyToggle) {
      const replyRow = replyToggle
        .closest(".comment-content")
        ?.querySelector(".comment-reply-row");
      if (replyRow) {
        const isVisible = replyRow.classList.contains("visible");
        replyRow.classList.toggle("visible", !isVisible);
        if (!isVisible) replyRow.querySelector("input")?.focus();
      }
    }
    const postDeleteBtn = e.target.closest(".post-delete-btn");
    if (postDeleteBtn) {
      if (!currentUser) return;
      const postId = postDeleteBtn.dataset.id;
      const confirmed = await showCommunityConfirmCard({
        title: "Delete post",
        message: "Are you sure you want to delete this post?",
        confirmText: "Delete post",
      });
      if (!confirmed) return;
      try {
        const res = await apiFetch(`${API_BASE}/posts/${postId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          const postCard = document.querySelector(
            `.glass-bento-card[data-post-id="${postId}"]`,
          );
          if (postCard) {
            postCard.style.transition = "opacity 0.3s ease";
            postCard.style.opacity = "0";
            setTimeout(() => postCard.remove(), 300);
          }
        } else {
          if (data.error && (data.error.includes('CARD') || data.error.includes('🟡') || data.error.includes('🔴'))) {
            showViolationMessage(data.error);
          } else {
            alert(data.error || "Failed to delete post");
          }
        }
      } catch (err) {
        console.error(err);
        alert("Connection error while deleting.");
      }
    }
    const commentDeleteBtn = e.target.closest(".comment-delete-btn");
    if (commentDeleteBtn) {
      const commentId = commentDeleteBtn.dataset.id;
      document
        .getElementById(`comment-dropdown-${commentId}`)
        ?.classList.remove("show");
      const confirmed = window.showAppConfirm
        ? await window.showAppConfirm({
            title: "Delete comment",
            message: "Are you sure you want to delete this comment?",
            confirmText: "Delete comment",
          })
        : confirm("Delete this comment?");
      if (!confirmed) return;
      try {
        const res = await apiFetch(`${API_BASE}/comments/${commentId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          const commentEl = document.querySelector(
            `.comment-item[data-comment-id="${commentId}"]`,
          );
          if (commentEl) {
            commentEl.style.transition = "opacity 0.3s ease";
            commentEl.style.opacity = "0";
            setTimeout(() => commentEl.remove(), 300);
          }
        } else {
          if (data.error && (data.error.includes('CARD') || data.error.includes('🟡') || data.error.includes('🔴'))) {
            showViolationMessage(data.error);
          } else {
            alert(data.error || "Failed to delete comment");
          }
        }
      } catch (err) {
        console.error(err);
        alert("Connection error");
      }
    }
    const commentEditBtn = e.target.closest(".comment-edit-btn");
    if (commentEditBtn) {
      const commentId = commentEditBtn.dataset.id;
      document
        .getElementById(`comment-dropdown-${commentId}`)
        ?.classList.remove("show");
      const commentEl = document.querySelector(
        `.comment-item[data-comment-id="${commentId}"]`,
      );
      if (!commentEl) return;
      const bodyP = commentEl.querySelector(".comment-body-text");
      if (!bodyP || commentEl.querySelector(".edit-comment-input")) return;
      const originalText = bodyP.textContent;
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.className = "new-comment-input edit-comment-input";
      inputEl.value = originalText;
      inputEl.style.cssText = "width:100%; margin-top:6px;";
      const actionsEl = document.createElement("div");
      actionsEl.className = "edit-actions";
      actionsEl.style.marginTop = "6px";
      actionsEl.innerHTML = `<button class="edit-cancel-btn" style="font-size:12px; padding:4px 12px;">Cancel</button><button class="edit-save-comment-btn" data-comment-id="${commentId}" style="font-size:12px; padding:4px 12px; background:var(--gold); color:#111; border:none; border-radius:20px; font-weight:700; cursor:pointer;">Save</button>`;
      bodyP.style.display = "none";
      bodyP.insertAdjacentElement("afterend", actionsEl);
      bodyP.insertAdjacentElement("afterend", inputEl);
      inputEl.focus();
      actionsEl
        .querySelector(".edit-cancel-btn")
        .addEventListener("click", () => {
          inputEl.remove();
          actionsEl.remove();
          bodyP.style.display = "";
        });
      actionsEl
        .querySelector(".edit-save-comment-btn")
        .addEventListener("click", async () => {
          const newContent = inputEl.value.trim();
          if (!newContent) return;
          const saveBtn = actionsEl.querySelector(".edit-save-comment-btn");
          saveBtn.disabled = true;
          saveBtn.textContent = "VAR-AI...";
          try {
            const res = await apiFetch(`${API_BASE}/comments/${commentId}`, {
              method: "PUT",
              body: JSON.stringify({ content: newContent }),
            });
            const data = await res.json();
            if (data.success) {
              bodyP.textContent = newContent;
              bodyP.style.display = "";
              inputEl.remove();
              actionsEl.remove();
            } else {
              if (data.error && (data.error.includes('CARD') || data.error.includes('🟡') || data.error.includes('🔴'))) {
                showViolationMessage(data.error);
              } else {
                alert(data.error || "Failed to edit comment");
              }
              saveBtn.disabled = false;
              saveBtn.textContent = "Save";
            }
          } catch (err) {
            console.error(err);
            alert("Connection error");
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
          }
        });
    }
    const reportBtn = e.target.closest(".report-btn");
    if (reportBtn) {
      document
        .querySelectorAll(".post-dropdown-menu.show")
        .forEach((m) => m.classList.remove("show"));
      openReportModal(reportBtn.dataset.type, reportBtn.dataset.id);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.classList.contains("new-comment-input") && e.key === "Enter") {
      e.preventDefault();
      const btn = e.target
        .closest(".new-comment-row")
        ?.querySelector(".submit-comment-btn");
      if (btn) btn.click();
    }
    if (
      e.target.classList.contains("comment-reply-input") &&
      e.key === "Enter"
    ) {
      e.preventDefault();
      const btn = e.target
        .closest(".comment-reply-row")
        ?.querySelector(".reply-send-btn");
      if (btn) btn.click();
    }
  });
  const filterPills = document.querySelectorAll(
    ".glass-pill-container .glass-pill",
  );
  function setActiveCommunityFilter(filter) {
    const normalized = normalizeCategoryFilter(filter);
    filterPills.forEach((pill) => {
      pill.classList.toggle(
        "active",
        normalizeCategoryFilter(pill.textContent) === normalized,
      );
    });
    communityNavButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        normalizeCategoryFilter(button.dataset.communityFilter || "all") ===
          normalized,
      );
    });
  }
  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const filter = normalizeCategoryFilter(pill.textContent);
      setActiveCommunityFilter(filter);
      loadPosts(filter);
    });
  });
  communityNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = normalizeCategoryFilter(
        button.dataset.communityFilter || "all",
      );
      setActiveCommunityFilter(filter);
      loadPosts(filter);
      document
        .querySelector(".community-left-feed")
        ?.scrollTo({ top: 0, behavior: "smooth" });
      
      // Update the glowing flare in the dashboard shell
      if (window.updateFlarePosition) window.updateFlarePosition();
    });
  });
  const mentionPopup = document.createElement("div");
  mentionPopup.className = "mention-popup glass-tile";
  mentionPopup.style.cssText =
    "position:absolute; display:none; border-radius:8px; z-index:100; max-height:150px; overflow-y:auto; min-width:150px; padding:4px 0;";
  document.body.appendChild(mentionPopup);
  let mentionTargetInput = null;
  let mentionStartIndex = -1;
  let mentionSearchTerm = "";
  document.addEventListener("input", async (e) => {
    if (
      e.target.matches(
        "#postInputExpander, .new-comment-input, .comment-reply-input, .edit-post-textarea, .edit-comment-input",
      )
    ) {
      const input = e.target;
      const val = input.value;
      const cursorStart = input.selectionStart;
      const textBeforeCursor = val.substring(0, cursorStart);
      const match = textBeforeCursor.match(/(?:^|\s)@(\w*)$/);
      if (match) {
        const search = match[1];
        mentionSearchTerm = search;
        mentionTargetInput = input;
        mentionStartIndex = cursorStart - search.length;
        const rect = input.getBoundingClientRect();
        mentionPopup.style.left = rect.left + "px";
        mentionPopup.style.top = rect.bottom + window.scrollY + "px";
        try {
          const res = await apiFetch(
            `${API_BASE}/users?q=${encodeURIComponent(search)}`,
          );
          const data = await res.json();
          if (data.success && data.data.users.length > 0) {
            mentionPopup.innerHTML = data.data.users
              .map(
                (u) =>
                  `<div class="mention-item" style="padding:8px 12px; cursor:pointer; color:#fff; transition:background 0.2s; font-size:14px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">${escapeHtml(u)}</div>`,
              )
              .join("");
            mentionPopup.style.display = "block";
          } else {
            mentionPopup.style.display = "none";
          }
        } catch (e) {}
      } else {
        mentionPopup.style.display = "none";
        mentionTargetInput = null;
      }
    }
  });
  mentionPopup.addEventListener("click", (e) => {
    const item = e.target.closest(".mention-item");
    if (item && mentionTargetInput) {
      const username = item.textContent;
      const val = mentionTargetInput.value;
      mentionTargetInput.value =
        val.substring(0, mentionStartIndex) +
        username +
        " " +
        val.substring(mentionTargetInput.selectionStart);
      mentionTargetInput.focus();
      mentionPopup.style.display = "none";
      mentionTargetInput = null;
    }
  });
  document.addEventListener("click", (e) => {
    if (!mentionPopup.contains(e.target)) {
      mentionPopup.style.display = "none";
    }
  });
  function escapeHtml(unsafe) {
    return String(unsafe ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function normalizeCategoryFilter(label) {
    const normalized = String(label || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    return CATEGORY_MAP[normalized] || "general";
  }
  function getCategoryLabel(category) {
    switch (category) {
      case "tactics":
        return "Tactics";
      case "announcement":
        return "Announcement";
      case "general":
      default:
        return "General";
    }
  }
  function getTimeAgo(dateStr) {
    let safeDateStr = dateStr.replace(" ", "T");
    if (!safeDateStr.endsWith("Z")) safeDateStr += "Z";
    const date = new Date(safeDateStr);
    const seconds = Math.floor((new Date() - date) / 1e3);
    if (seconds < 0) return "just now";
    let interval = seconds / 31536e3;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592e3;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  }
  const REPORT_CATEGORIES = [
    "Spam",
    "Nudity or sexual activity",
    "Hate speech or symbols",
    "Violence or dangerous organizations",
    "Bullying or harassment",
    "Scam or fraud",
  ];
  (function buildReportModal() {
    const el = document.createElement("div");
    el.id = "reportModalOverlay";
    el.className = "report-modal-overlay";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `\n            <div class="report-modal" role="dialog" aria-modal="true" aria-labelledby="reportModalTitle">\n                <div class="report-modal-header">\n                    <button class="report-modal-back" id="reportModalBack" aria-label="Back">\n                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>\n                    </button>\n                    <h2 id="reportModalTitle">Report</h2>\n                    <button class="report-modal-close" id="reportModalClose" aria-label="Close">\n                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>\n                    </button>\n                </div>\n                <p class="report-modal-subtitle">Why are you reporting this?</p>\n                <ul class="report-category-list" id="reportCategoryList">\n                    ${REPORT_CATEGORIES.map((cat) => `\n                    <li>\n                        <button class="report-category-item" data-category="${cat}">\n                            <span>${cat}</span>\n                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>\n                        </button>\n                    </li>`).join("")}\n                </ul>\n                <div class="report-modal-footer">\n                    <button class="report-submit-btn" id="reportSubmitBtn" disabled>Submit report</button>\n                </div>\n            </div>`;
    document.body.appendChild(el);
  })();
  let _reportTarget = { type: null, id: null };
  let _selectedCategory = null;
  function openReportModal(type, id) {
    _reportTarget = { type: type, id: id };
    _selectedCategory = null;
    document
      .querySelectorAll(".report-category-item")
      .forEach((b) => b.classList.remove("selected"));
    document.getElementById("reportSubmitBtn").disabled = true;
    const overlay = document.getElementById("reportModalOverlay");
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.add("active");
  }
  function closeReportModal() {
    const overlay = document.getElementById("reportModalOverlay");
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }
  document
    .getElementById("reportModalClose")
    .addEventListener("click", closeReportModal);
  document
    .getElementById("reportModalBack")
    .addEventListener("click", closeReportModal);
  document
    .getElementById("reportModalOverlay")
    .addEventListener("click", (e) => {
      if (e.target === document.getElementById("reportModalOverlay"))
        closeReportModal();
    });
  document
    .getElementById("reportCategoryList")
    .addEventListener("click", (e) => {
      const item = e.target.closest(".report-category-item");
      if (!item) return;
      document
        .querySelectorAll(".report-category-item")
        .forEach((b) => b.classList.remove("selected"));
      item.classList.add("selected");
      _selectedCategory = item.dataset.category;
      document.getElementById("reportSubmitBtn").disabled = false;
    });
  document
    .getElementById("reportSubmitBtn")
    .addEventListener("click", async () => {
      if (!_selectedCategory || !_reportTarget.id) return;
      const btn = document.getElementById("reportSubmitBtn");
      btn.disabled = true;
      btn.textContent = "Submitting…";
      try {
        const res = await fetch(`${API_BASE}/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...API_HEADERS },
          body: JSON.stringify({
            target_type: _reportTarget.type,
            target_id: parseInt(_reportTarget.id),
            category: _selectedCategory,
          }),
        });
        const data = await res.json();
        if (data.success) {
          closeReportModal();
          btn.textContent = "Submit report";
        } else {
          if (data.error && (data.error.includes('CARD') || data.error.includes('🟡') || data.error.includes('🔴'))) {
            showViolationMessage(data.error);
          } else {
            alert(data.error || "Failed to submit report");
          }
          btn.disabled = false;
          btn.textContent = "Submit report";
        }
      } catch (err) {
        alert("Connection error");
        btn.disabled = false;
        btn.textContent = "Submit report";
      }
    });

    window.FC_COMMUNITY = {
        loadPosts: loadPosts,
        setActiveFilter: setActiveCommunityFilter,
    };
});

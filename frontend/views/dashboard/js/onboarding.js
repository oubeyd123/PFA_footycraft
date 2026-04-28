(function () {
  "use strict";

  /* ── Driver.js availability check ────────────────────────────── */
  const DRIVER_READY = () =>
    typeof window.driver !== "undefined" &&
    window.driver.js &&
    typeof window.driver.js.driver === "function";

  const LEGACY_CACHE_KEY = "fc_onboarding_complete";

  /* ── Selectors used by the tour steps ────────────────────────── */
  const SELECTORS = {
    tabHome: '[data-tab="home"]',
    tabLineups: '[data-tab="lineups"]',
    tabPlayers: '[data-tab="players"]',
    tabPlay: '[data-tab="play"]',
    tabChests: '[data-tab="chests"]',
    tabSettings: '[data-tab="settings"]',
    homeSection: "#home-section",
    activeSquadCard: '[data-grid="top-left"]',
    lineupCard: '[data-grid="top-right"]',
    featuredCard: '[data-grid="center"]',
    communityCard: ".community-grid-card",
    chestsSection: "#chests-section",
    bronzeChest: ".bronze-grid-image",
    silverChest: ".silver-grid-image",
    goldChest: ".gold-grid-image",
    chestOpenButton: "#fc-open-chest-btn",
    lineupsSection: "#lineups-section",
    createLineupTile: ".Create-line-grid-imag",
    createLineupEntry: '[data-tour="create-lineup"], .Create-line-grid-imag',
    lineupNameInput: '#fc-create-modal [data-tour="lineup-name"]',
    lineupFormationOptions:
      '#fc-create-modal [data-tour="formation-select"][data-f]',
    enterBuilderButton:
      '#fc-create-modal [data-tour="enter-builder"], #fc-create-modal #fc-btn-create-submit',
    createLineupSubmit: "#fc-create-modal #fc-btn-create-submit",
    formationControls: '[data-tour="formation-controls"]',
    autoBuildButton:
      '[data-tour="auto-build"], #fc-builder-modal [onclick*="autoBuild"]',
    lineupPitch: '[data-tour="lineup-pitch"]',
    reserves: '[data-tour="reserves"]',
    playerStatsButton: '[data-tour="player-stats"]',
    exitBuilder: '[data-tour="exit-builder"]',
    builderModal: "#fc-builder-modal",
  };

  /* ── Module-level state ──────────────────────────────────────── */
  let driverInstance = null;
  let completionRequest = null;
  let autoStartAttempted = false;
  let startScheduled = false;
  let startedThisPage = false;
  let finalStepReached = false;
  let pauseInProgress = false;

  /** Index of the step to resume from after an interactive pause. */
  let resumeAfterStepIndex = -1;

  /** Cleanup callback for whichever event we are currently waiting for. */
  let stepWaitCleanup = null;

  /** Listeners for progress tracking. */
  let chestProgressListener = null;
  let lineupProgressListener = null;
  let lineupAutoBuildListener = null;

  const onboardingProgress = {
    openedChests: new Set(),
    firstLineupCreated: false,
    firstLineupId: null,
    autoBuiltLineups: new Set(),
  };

  function resolveStepIndex(stepRef) {
    if (typeof stepRef === "number" && Number.isFinite(stepRef)) {
      return stepRef;
    }
    if (typeof stepRef !== "string" || !stepRef) {
      return -1;
    }
    const steps = buildSteps();
    return steps.findIndex((step) => step && step.id === stepRef);
  }

  /* ── User cache helpers ──────────────────────────────────────── */
  function getCachedUser() {
    try {
      return JSON.parse(localStorage.getItem("fc_user") || "null");
    } catch (_) {
      return null;
    }
  }
  function mergeCachedUser(patch) {
    try {
      const cached = getCachedUser() || {};
      localStorage.setItem("fc_user", JSON.stringify({ ...cached, ...patch }));
    } catch (_) {}
  }
  function resolveUserPayload(response) {
    return response && response.data
      ? response.data.user || response.data
      : null;
  }
  function hasCompleted(user) {
    return !!(user && user.onboarding_completed_at);
  }
  function markLegacyComplete() {
    try {
      localStorage.setItem(LEGACY_CACHE_KEY, "true");
    } catch (_) {}
  }

  /* ── API helpers ─────────────────────────────────────────────── */
  async function fetchCurrentUser() {
    const cachedUser = getCachedUser();
    if (!(window.FC && FC.auth && typeof FC.auth.me === "function")) {
      return cachedUser;
    }
    try {
      const response = await FC.auth.me();
      if (!response || !response.success) {
        return cachedUser;
      }
      const user = resolveUserPayload(response) || cachedUser;
      if (user) {
        mergeCachedUser(user);
      }
      return user;
    } catch (_) {
      return cachedUser;
    }
  }

  async function persistCompletion() {
    if (completionRequest) {
      return completionRequest;
    }
    completionRequest = (async () => {
      let completedAt = new Date().toISOString();
      if (
        window.FC &&
        FC.settings &&
        typeof FC.settings.completeOnboarding === "function"
      ) {
        try {
          const response = await FC.settings.completeOnboarding();
          if (
            response &&
            response.success &&
            response.data &&
            response.data.completed_at
          ) {
            completedAt = response.data.completed_at;
          }
        } catch (_) {}
      }
      mergeCachedUser({ onboarding_completed_at: completedAt });
      markLegacyComplete();
      completionRequest = null;
      return completedAt;
    })();
    return completionRequest;
  }

  /* ── DOM helpers ─────────────────────────────────────────────── */
  function isElementVisible(selector) {
    const element = document.querySelector(selector);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function waitForElement(selector, timeout = 1e4, requireVisible = false) {
    return new Promise((resolve) => {
      const pick = () => {
        const candidate = document.querySelector(selector);
        if (!candidate) return null;
        if (!requireVisible) return candidate;
        return isElementVisible(selector) ? candidate : null;
      };

      const existing = pick();
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const found = pick();
        if (found) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(found);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(pick());
      }, timeout);
    });
  }

  function waitForElementToDisappear(selector, timeout = 1e4) {
    return new Promise((resolve) => {
      if (!document.querySelector(selector)) {
        resolve(true);
        return;
      }
      const observer = new MutationObserver(() => {
        if (!document.querySelector(selector)) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(true);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(!document.querySelector(selector));
      }, timeout);
    });
  }

  function scrollIntoViewIfNeeded(element) {
    if (!element || typeof element.scrollIntoView !== "function") return;
    try {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_) {
      element.scrollIntoView();
    }
  }

  function waitForClick(selector, onMatchedClick) {
    clearWaitListenerOnly();
    const handler = (event) => {
      const target = event.target && event.target.closest(selector);
      if (!target) return;
      window.removeEventListener("click", handler, true);
      stepWaitCleanup = null;
      if (typeof onMatchedClick === "function") {
        void onMatchedClick(target);
      }
    };
    window.addEventListener("click", handler, true);
    stepWaitCleanup = () => {
      window.removeEventListener("click", handler, true);
    };
  }

  function waitForInput(selector, shouldResolve) {
    clearWaitListenerOnly();
    const input = document.querySelector(selector);
    if (!input) return;

    if (typeof shouldResolve === "function" && shouldResolve(input)) {
      resumeDriverFromNextStep();
      return;
    }

    const done = () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onInput);
      stepWaitCleanup = null;
      resumeDriverFromNextStep();
    };

    const onInput = () => {
      if (typeof shouldResolve === "function" && !shouldResolve(input)) {
        return;
      }
      done();
    };

    input.addEventListener("input", onInput);
    input.addEventListener("change", onInput);
    stepWaitCleanup = () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onInput);
    };
  }

  function waitForTabVisible(tabName, timeout = 6e3) {
    return new Promise((resolve) => {
      const tab = document.querySelector(`[data-tab="${tabName}"]`);
      const sectionId =
        (tab && tab.getAttribute("aria-controls")) || `${tabName}-section`;

      const isReady = () => {
        const section = document.getElementById(sectionId);
        if (!section) return false;
        return section.getAttribute("aria-hidden") !== "true";
      };

      if (isReady()) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        if (isReady()) {
          observer.disconnect();
          clearTimeout(timer);
          resolve();
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-hidden", "class", "style"],
      });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeout);
    });
  }

  function switchToTab(tabName) {
    return new Promise(async (resolve) => {
      if (
        window.FootyCraft &&
        typeof window.FootyCraft.switchTab === "function"
      ) {
        window.FootyCraft.switchTab(tabName);
      } else {
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        if (tab) tab.click();
      }
      await waitForTabVisible(tabName);
      resolve();
    });
  }

  /* ── Chest panel opener ──────────────────────────────────────── */
  function openChestPanel(type) {
    if (typeof window.openPanel !== "function") {
      return;
    }
    const panelMap = {
      bronze: { key: "chest-bronze", title: "BRONZE CHEST" },
      silver: { key: "chest-silver", title: "SILVER CHEST" },
      gold: { key: "chest-gold", title: "GOLD CHEST" },
    };
    const panel = panelMap[String(type || "").toLowerCase()];
    if (!panel) return;
    window.openPanel(panel.key, panel.title);
  }

  async function ensureChestPanelReady(type) {
    const normalizedType = String(type || "").toLowerCase();
    openChestPanel(normalizedType);
    let openBtn = await waitForElement(SELECTORS.chestOpenButton, 2200);
    if (!openBtn) {
      openChestPanel(normalizedType);
      openBtn = await waitForElement(SELECTORS.chestOpenButton, 2800);
    }
    return openBtn;
  }

  /* ── Cleanup & state management ──────────────────────────────── */
  function ensureCleanState() {
    if (driverInstance && typeof driverInstance.destroy === "function") {
      driverInstance.destroy();
      return;
    }
    if (typeof window.closePanel === "function") {
      try {
        window.closePanel();
      } catch (_) {}
    }
    const notifPanel = document.getElementById("notif-panel");
    if (notifPanel) {
      notifPanel.setAttribute("aria-hidden", "true");
    }
  }

  function clearStepWaiter() {
    if (typeof stepWaitCleanup === "function") {
      stepWaitCleanup();
    }
    stepWaitCleanup = null;
    removeInstructionBanner();
  }

  function clearWaitListenerOnly() {
    if (typeof stepWaitCleanup === "function") {
      stepWaitCleanup();
    }
    stepWaitCleanup = null;
  }

  /* ── Progress tracking ───────────────────────────────────────── */
  function stopProgressTracking() {
    if (chestProgressListener) {
      window.removeEventListener("fc:chest-opened", chestProgressListener);
      chestProgressListener = null;
    }
    if (lineupProgressListener) {
      window.removeEventListener(
        "fc:lineup-created",
        lineupProgressListener,
      );
      lineupProgressListener = null;
    }
    if (lineupAutoBuildListener) {
      window.removeEventListener(
        "fc:lineup-autobuilt",
        lineupAutoBuildListener,
      );
      lineupAutoBuildListener = null;
    }
  }

  function resetProgressTracking() {
    onboardingProgress.openedChests.clear();
    onboardingProgress.firstLineupCreated = false;
    onboardingProgress.firstLineupId = null;
    onboardingProgress.autoBuiltLineups.clear();
    finalStepReached = false;
    clearStepWaiter();
    stopProgressTracking();
  }

  function startProgressTracking() {
    stopProgressTracking();
    chestProgressListener = (event) => {
      const type = String(event?.detail?.type || "").toLowerCase();
      if (type === "bronze" || type === "silver" || type === "gold") {
        onboardingProgress.openedChests.add(type);
      }
    };
    lineupProgressListener = (event) => {
      onboardingProgress.firstLineupCreated = true;
      onboardingProgress.firstLineupId =
        Number(event?.detail?.lineup_id) || onboardingProgress.firstLineupId;
    };
    lineupAutoBuildListener = (event) => {
      const lineupId = Number(event?.detail?.lineup_id) || 0;
      if (lineupId > 0) {
        onboardingProgress.autoBuiltLineups.add(lineupId);
      }
    };
    window.addEventListener("fc:chest-opened", chestProgressListener);
    window.addEventListener("fc:lineup-created", lineupProgressListener);
    window.addEventListener("fc:lineup-autobuilt", lineupAutoBuildListener);
  }

  /* ═══════════════════════════════════════════════════════════════
     INSTRUCTION BANNER — premium floating banner shown while
     Driver.js is paused and the user must perform an action.
     ═══════════════════════════════════════════════════════════════ */
  const BANNER_ID = "fc-onboarding-live-banner";

  function showInstructionBanner(message, subtext) {
    removeInstructionBanner();
    const banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.style.cssText = [
      "position:fixed",
      "left:50%",
      "top:max(18px, env(safe-area-inset-top))",
      "transform:translateX(-50%)",
      "z-index:2147483647",
      "background:linear-gradient(135deg,rgba(8,12,22,0.95),rgba(14,18,28,0.95))",
      "border:1px solid rgba(255,183,3,0.55)",
      "border-radius:16px",
      "padding:14px 22px",
      "max-width:min(480px, 92vw)",
      "text-align:center",
      "box-shadow:0 18px 48px rgba(0,0,0,0.6),0 0 28px rgba(255,183,3,0.12)",
      "backdrop-filter:blur(16px)",
      "animation:fcBannerIn 0.35s cubic-bezier(0.16,1,0.3,1)",
      "pointer-events:none",
    ].join(";");

    const title = document.createElement("div");
    title.style.cssText =
      "color:#ffb703;font-weight:900;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;line-height:1.3;";
    title.textContent = message || "COMPLETE THE ACTION TO CONTINUE";

    banner.appendChild(title);

    if (subtext) {
      const sub = document.createElement("div");
      sub.style.cssText =
        "color:rgba(255,255,255,0.55);font-size:11px;font-weight:600;margin-top:5px;line-height:1.4;letter-spacing:0.04em;";
      sub.textContent = subtext;
      banner.appendChild(sub);
    }

    document.body.appendChild(banner);
  }

  function removeInstructionBanner() {
    const existing = document.getElementById(BANNER_ID);
    if (existing) existing.remove();
  }

  /* ═══════════════════════════════════════════════════════════════
     PAUSE / RESUME DRIVER — the core fix.
     Instead of trying to hack Driver.js overlays to allow clicks,
     we destroy it entirely, let the user interact freely, then
     re-create and resume from the next step.

     CRITICAL: Driver.js ignores destroy() when called synchronously
     inside onHighlightStarted because it is mid-render. We MUST
     defer destruction to the next tick and force-nuke any leftover
     Driver.js DOM nodes.
     ═══════════════════════════════════════════════════════════════ */

  /**
   * Force-remove ALL Driver.js DOM elements from the page.
   * Needed as a safety net because destroy() can silently fail.
   */
  function nukeDriverDOM() {
    document.querySelectorAll(
      ".driver-overlay, .driver-popover, .driver-active-element"
    ).forEach((el) => {
      el.remove();
    });
    document.querySelectorAll(".driver-active-element").forEach((el) => {
      el.classList.remove("driver-active-element");
    });
    /* Driver.js also sets overflow:hidden on body */
    document.body.style.overflow = "";
    document.body.classList.remove("driver-active");
  }

  /**
   * Destroy the current driver instance so ALL overlays are removed
   * and the user can interact with the full page.
   *
   * @param {number} nextStepIndex — step to resume from after the action
   * @param {Function} afterPause — called once driver is fully gone
   */
  function pauseDriverForInteraction(nextStepIndex, afterPause) {
    resumeAfterStepIndex = resolveStepIndex(nextStepIndex);
    pauseInProgress = true;

    /* Schedule destruction on next tick so Driver.js finishes rendering */
    setTimeout(() => {
      if (driverInstance && typeof driverInstance.destroy === "function") {
        try { driverInstance.destroy(); } catch (_) {}
      }
      driverInstance = null;

      /* Belt-and-suspenders: nuke any leftover DOM */
      nukeDriverDOM();

      /* Now run the follow-up action */
      if (typeof afterPause === "function") {
        afterPause();
      }
    }, 60);
  }

  /**
   * After the user completes the interactive action, re-create driver
   * and drive from the saved step index.
   */
  function resumeDriverFromNextStep() {
    removeInstructionBanner();
    clearStepWaiter();

    if (resumeAfterStepIndex < 0) return;

    const targetStep = resumeAfterStepIndex;
    resumeAfterStepIndex = -1;

    /* Small delay to let any panel animations finish.
       Do NOT close panels, builder, or create modals here —
       later steps need them. Each step handles its own cleanup
       in onHighlightStarted. */
    setTimeout(() => {
      const steps = buildSteps();
      if (targetStep >= steps.length) {
        /* We were at the last step, nothing to resume */
        return;
      }

      if (!DRIVER_READY()) {
        console.warn("[FC Onboarding] Driver.js unavailable for resume.");
        return;
      }

      const instance = window.driver.js.driver({
        steps: steps,
        animate: true,
        smoothScroll: false,
        overlayColor: "#04060c",
        overlayOpacity: 0.82,
        stagePadding: 12,
        stageRadius: 14,
        popoverOffset: 14,
        allowClose: true,
        allowKeyboardControl: false,
        disableActiveInteraction: false,
        showProgress: true,
        progressText: "Step {{current}} of {{total}}",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Finish",
        popoverClass: "fc-onboarding",
        showButtons: ["next", "previous", "close"],
        onDestroyed: handleDriverDestroyed,
      });

      driverInstance = instance;
      startProgressTracking();
      instance.drive(targetStep);
    }, 600);
  }

  /* ═══════════════════════════════════════════════════════════════
     INTERACTIVE STEP HELPERS — wait for events, then resume.
     ═══════════════════════════════════════════════════════════════ */

  /**
   * Wait for a specific chest flow to complete, then resume driver.
   */
  function waitForChestAndResume(chestType) {
    const normalizedType = String(chestType || "").toLowerCase();
    clearWaitListenerOnly();

    const handler = (event) => {
      const type = String(event?.detail?.type || "").toLowerCase();
      if (type !== normalizedType) return;
      window.removeEventListener("fc:chest-flow-complete", handler);
      stepWaitCleanup = null;
      resumeDriverFromNextStep();
    };
    window.addEventListener("fc:chest-flow-complete", handler);
    stepWaitCleanup = () => {
      window.removeEventListener("fc:chest-flow-complete", handler);
    };
  }

  /**
   * Wait for lineup creation, then resume driver.
   */
  function waitForLineupAndResume() {
    clearWaitListenerOnly();
    const handler = () => {
      window.removeEventListener("fc:lineup-created", handler);
      stepWaitCleanup = null;
      resumeDriverFromNextStep();
    };
    window.addEventListener("fc:lineup-created", handler);
    stepWaitCleanup = () => {
      window.removeEventListener("fc:lineup-created", handler);
    };
  }

  /**
   * Wait for auto-build completion, then resume driver.
   */
  function waitForAutoBuildAndResume(lineupId) {
    const normalizedId = Number(lineupId) || 0;
    clearWaitListenerOnly();
    const handler = (event) => {
      const builtId = Number(event?.detail?.lineup_id) || 0;
      if (normalizedId > 0 && builtId !== normalizedId) return;
      window.removeEventListener("fc:lineup-autobuilt", handler);
      stepWaitCleanup = null;
      resumeDriverFromNextStep();
    };
    window.addEventListener("fc:lineup-autobuilt", handler);
    stepWaitCleanup = () => {
      window.removeEventListener("fc:lineup-autobuilt", handler);
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     STEP DEFINITIONS
     ═══════════════════════════════════════════════════════════════ */

  function buildSteps() {
    return [
      /* ─── 0: Welcome ──────────────────────────────────────── */
      {
        id: "welcome",
        popover: {
          title: "WELCOME TO FOOTYCRAFT",
          description: [
            "<p>Your club starts here. This short walkthrough covers the parts that matter first:</p>",
            "<p><strong>packs, lineups, players, and match modes.</strong></p>",
            '<p style="margin-top:8px;color:rgba(255,204,0,0.82);font-weight:700;">Takes about a minute.</p>',
          ].join(""),
          popoverClass: "fc-onboarding fc-onboarding-welcome",
          showButtons: ["next", "close"],
          nextBtnText: "Start Tour",
        },
        onHighlightStarted: async () => {
          if (typeof window.closePanel === "function") {
            try {
              window.closePanel();
            } catch (_) {}
          }
          await switchToTab("home");
        },
      },

      /* ─── 1: Active Squad ─────────────────────────────────── */
      {
        id: "active-squad",
        element: SELECTORS.activeSquadCard,
        popover: {
          title: "ACTIVE SQUAD",
          description:
            "This card is your snapshot. Come here to jump back into squad building fast.",
          popoverClass: "fc-onboarding",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: async () => {
          await switchToTab("home");
          await waitForElement(SELECTORS.activeSquadCard, 2e3);
        },
      },

      /* ─── 2: My Lineup ────────────────────────────────────── */
      {
        id: "my-lineup",
        element: SELECTORS.lineupCard,
        popover: {
          title: "MY LINEUP",
          description:
            "Your current lineup, chemistry, and quick access to formation work live here.",
          popoverClass: "fc-onboarding",
          side: "left",
          align: "start",
        },
        onHighlightStarted: async () => {
          await switchToTab("home");
          await waitForElement(SELECTORS.lineupCard, 2e3);
        },
      },

      /* ─── 3: Chests Tab ───────────────────────────────────── */
      {
        id: "chests-overview",
        element: SELECTORS.tabChests,
        popover: {
          title: "CHESTS",
          description:
            "Open packs here to grow your club. New accounts should usually start here before building a lineup.",
          popoverClass: "fc-onboarding",
          side: "bottom",
          align: "center",
        },
      },

      /* ─── 4: OPEN BRONZE — Interactive (pause driver) ─────── */
      {
        id: "open-bronze",
        element: SELECTORS.tabChests,
        popover: {
          title: "OPEN BRONZE PACK",
          description:
            "Opening the Bronze chest panel for you...",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "bottom",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          /* Defer everything: destroy driver THEN open panel */
          pauseDriverForInteraction("open-silver", async () => {
            await switchToTab("chests");
            await ensureChestPanelReady("bronze");
            showInstructionBanner(
              "🟤 OPEN THE BRONZE PACK",
              "Press the OPEN CHEST button below. The tutorial will continue automatically.",
            );
            waitForChestAndResume("bronze");
          });
        },
      },

      /* ─── 5: OPEN SILVER — Interactive (pause driver) ─────── */
      {
        id: "open-silver",
        element: SELECTORS.tabChests,
        popover: {
          title: "OPEN SILVER PACK",
          description:
            "Opening the Silver chest panel for you...",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "bottom",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          pauseDriverForInteraction("open-gold", async () => {
            await switchToTab("chests");
            await ensureChestPanelReady("silver");
            showInstructionBanner(
              "⚪ OPEN THE SILVER PACK",
              "Press the OPEN CHEST button below. The tutorial will continue automatically.",
            );
            waitForChestAndResume("silver");
          });
        },
      },

      /* ─── 6: OPEN GOLD — Interactive (pause driver) ──────── */
      {
        id: "open-gold",
        element: SELECTORS.tabChests,
        popover: {
          title: "OPEN GOLD PACK",
          description:
            "Opening the Gold chest panel for you...",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "bottom",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          pauseDriverForInteraction("lineups-overview", async () => {
            await switchToTab("chests");
            await ensureChestPanelReady("gold");
            showInstructionBanner(
              "🟡 OPEN THE GOLD PACK",
              "Press the OPEN CHEST button below. The tutorial will continue automatically.",
            );
            waitForChestAndResume("gold");
          });
        },
      },

      /* ─── 7: Lineups Tab ──────────────────────────────────── */
      {
        id: "lineups-overview",
        element: SELECTORS.createLineupEntry,
        popover: {
          title: "LINEUPS",
          description:
            "This area is where you create and manage your squads. Start here by creating your first lineup.",
          popoverClass: "fc-onboarding",
          side: "bottom",
          align: "center",
        },
        onHighlightStarted: async () => {
          try {
            if (typeof window.closePanel === "function") {
              window.closePanel();
            }
          } catch (_) {}
          await switchToTab("lineups");
          const entry = await waitForElement(SELECTORS.createLineupEntry, 8e3, true);
          if (entry) scrollIntoViewIfNeeded(entry);
        },
      },

      /* ─── 8: CREATE LINEUP ENTRY — user-gated click ──────── */
      {
        id: "create-lineup-entry",
        element: SELECTORS.createLineupEntry,
        popover: {
          title: "CREATE YOUR FIRST LINEUP",
          description:
            "Click Create Lineup to open the creator.",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "bottom",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          pauseDriverForInteraction("lineup-name", async () => {
            await switchToTab("lineups");
            const entry = await waitForElement(SELECTORS.createLineupEntry, 8e3, true);
            if (entry) scrollIntoViewIfNeeded(entry);

            if (document.querySelector(SELECTORS.lineupNameInput)) {
              resumeDriverFromNextStep();
              return;
            }

            showInstructionBanner(
              "📋 CREATE YOUR FIRST LINEUP",
              "Click the Create Lineup tile. The tutorial will continue when the creator opens.",
            );

            waitForClick(SELECTORS.createLineupEntry, async () => {
              const nameInput = await waitForElement(
                SELECTORS.lineupNameInput,
                12e3,
                true,
              );
              if (nameInput) {
                resumeDriverFromNextStep();
              }
            });
          });
        },
      },

      /* ─── 9: Lineup Name — waits for real user input ──────── */
      {
        id: "lineup-name",
        element: SELECTORS.lineupNameInput,
        popover: {
          title: "NAME YOUR LINEUP",
          description:
            "Type a lineup name. The tour waits for your input before moving on.",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "bottom",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          // The creator modal mounts asynchronously, so we pause Driver and
          // wait for a concrete input event instead of using fixed delays.
          pauseDriverForInteraction("lineup-formation", async () => {
            const input = await waitForElement(
              SELECTORS.lineupNameInput,
              12e3,
              true,
            );
            if (!input) {
              resumeAfterStepIndex = resolveStepIndex("lineup-formation");
              resumeDriverFromNextStep();
              return;
            }
            scrollIntoViewIfNeeded(input);
            showInstructionBanner(
              "✍️ NAME THE LINEUP",
              "Edit the lineup name. The tutorial continues after you type.",
            );
            waitForInput(SELECTORS.lineupNameInput, (el) => {
              const value = String(el.value || "").trim();
              return value.length > 0 && value !== "My Lineup";
            });
          });
        },
      },

      /* ─── 10: Formation — waits for user selection ────────── */
      {
        id: "lineup-formation",
        element: SELECTORS.lineupFormationOptions,
        popover: {
          title: "PICK A FORMATION",
          description:
            "Choose a formation for this lineup. The tour waits for your selection.",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "bottom",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          pauseDriverForInteraction("enter-builder", async () => {
            const option = await waitForElement(
              SELECTORS.lineupFormationOptions,
              12e3,
              true,
            );
            if (!option) {
              resumeAfterStepIndex = resolveStepIndex("enter-builder");
              resumeDriverFromNextStep();
              return;
            }
            scrollIntoViewIfNeeded(option);
            showInstructionBanner(
              "📐 SELECT A FORMATION",
              "Click any formation chip to continue.",
            );
            waitForClick(SELECTORS.lineupFormationOptions, () => {
              resumeDriverFromNextStep();
            });
          });
        },
      },

      /* ─── 11: Enter Builder — waits for full mount ────────── */
      {
        id: "enter-builder",
        element: SELECTORS.enterBuilderButton,
        popover: {
          title: "OPEN THE BUILDER",
          description:
            "Submit creation to enter the builder. The tour resumes only after the builder UI is mounted.",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "bottom",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          pauseDriverForInteraction("builder-formation-controls", async () => {
            const submit = await waitForElement(
              SELECTORS.enterBuilderButton,
              12e3,
              true,
            );
            if (!submit) {
              resumeAfterStepIndex = resolveStepIndex("builder-formation-controls");
              resumeDriverFromNextStep();
              return;
            }
            scrollIntoViewIfNeeded(submit);
            showInstructionBanner(
              "🚀 ENTER THE BUILDER",
              "Click Build Squad. The tutorial waits for the builder to fully load.",
            );

            waitForClick(SELECTORS.enterBuilderButton, async () => {
              const mounted = await Promise.race([
                waitForElement(SELECTORS.formationControls, 15e3, true),
                waitForElement(SELECTORS.autoBuildButton, 15e3, true),
                new Promise((resolve) => {
                  const once = (event) => {
                    window.removeEventListener("fc:lineup-builder-mounted", once);
                    resolve(event);
                  };
                  window.addEventListener("fc:lineup-builder-mounted", once);
                }),
              ]);
              if (mounted) {
                resumeDriverFromNextStep();
              }
            });
          });
        },
      },

      /* ─── 12: Formation Controls in Builder ───────────────── */
      {
        id: "builder-formation-controls",
        element: SELECTORS.formationControls,
        popover: {
          title: "FORMATION CONTROLS",
          description:
            "You can change formation here any time and apply it in the builder.",
          popoverClass: "fc-onboarding",
          side: "right",
          align: "start",
        },
        onHighlightStarted: async () => {
          const controls = await waitForElement(
            SELECTORS.formationControls,
            12e3,
            true,
          );
          if (controls) scrollIntoViewIfNeeded(controls);
        },
      },

      /* ─── 13: AUTO BUILD — waits for completion event ─────── */
      {
        id: "builder-auto-build",
        element: SELECTORS.autoBuildButton,
        popover: {
          title: "AUTO BUILD THIS LINEUP",
          description:
            "The builder is open. Press the ⚡ Auto button to auto-fill your lineup.",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "over",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          pauseDriverForInteraction("lineup-pitch-overview", async () => {
            const autoBtn = await waitForElement(
              SELECTORS.autoBuildButton,
              12e3,
              true,
            );
            if (autoBtn) {
              scrollIntoViewIfNeeded(autoBtn);
              showInstructionBanner(
                "🤖 AUTO BUILD YOUR LINEUP",
                "Press the ⚡ Auto button in the builder. The tutorial continues automatically.",
              );

              waitForClick(SELECTORS.autoBuildButton, () => {
                waitForAutoBuildAndResume(onboardingProgress.firstLineupId || 0);
              });
            } else {
              resumeAfterStepIndex = resolveStepIndex("lineup-pitch-overview");
              resumeDriverFromNextStep();
            }
          });
        },
      },

      /* ─── 14: Built Pitch ─────────────────────────────────── */
      {
        id: "lineup-pitch-overview",
        element: SELECTORS.lineupPitch,
        popover: {
          title: "BUILT LINEUP",
          description:
            "This pitch area shows your completed lineup after auto-build.",
          popoverClass: "fc-onboarding",
          side: "top",
          align: "center",
        },
        onHighlightStarted: async () => {
          const pitch = await waitForElement(SELECTORS.lineupPitch, 12e3, true);
          if (pitch) scrollIntoViewIfNeeded(pitch);
        },
      },

      /* ─── 15: Reserves / Bench ────────────────────────────── */
      {
        id: "reserves-overview",
        element: SELECTORS.reserves,
        popover: {
          title: "RESERVES",
          description:
            "Your bench and substitutes are here. Drag them to replace starters.",
          popoverClass: "fc-onboarding",
          side: "right",
          align: "start",
        },
        onHighlightStarted: async () => {
          const reserves = await waitForElement(SELECTORS.reserves, 12e3, true);
          if (reserves) scrollIntoViewIfNeeded(reserves);
        },
      },

      /* ─── 16: Player Stats action (user-gated) ────────────── */
      {
        id: "player-stats-overview",
        popover: {
          title: "PLAYER STATS",
          description:
            "Select a player and open View Full Breakdown to inspect stats.",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "over",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          pauseDriverForInteraction("exit-builder-step", async () => {
            showInstructionBanner(
              "📊 OPEN PLAYER STATS",
              "Click any player then use View Full Breakdown. The tour continues after that click.",
            );
            waitForClick(SELECTORS.playerStatsButton, () => {
              resumeDriverFromNextStep();
            });
          });
        },
      },

      /* ─── 17: Exit Builder (user-gated) ───────────────────── */
      {
        id: "exit-builder-step",
        element: SELECTORS.exitBuilder,
        popover: {
          title: "EXIT BUILDER",
          description:
            "Exit the builder when ready. The tutorial will continue on the remaining sections.",
          popoverClass: "fc-onboarding fc-onboarding-action",
          side: "bottom",
          align: "center",
          showButtons: [],
        },
        onHighlightStarted: () => {
          pauseDriverForInteraction("players-overview", async () => {
            const exitBtn = await waitForElement(SELECTORS.exitBuilder, 12e3, true);
            if (!exitBtn) {
              resumeAfterStepIndex = resolveStepIndex("players-overview");
              resumeDriverFromNextStep();
              return;
            }
            scrollIntoViewIfNeeded(exitBtn);
            showInstructionBanner(
              "↩ EXIT THE BUILDER",
              "Click Exit Builder. The walkthrough resumes on the remaining tabs.",
            );
            waitForClick(SELECTORS.exitBuilder, async () => {
              await Promise.race([
                waitForElementToDisappear(SELECTORS.builderModal, 1e4),
                new Promise((resolve) => {
                  const once = () => {
                    window.removeEventListener("fc:lineup-builder-exited", once);
                    resolve(true);
                  };
                  window.addEventListener("fc:lineup-builder-exited", once);
                }),
              ]);
              resumeDriverFromNextStep();
            });
          });
        },
      },

      /* ─── 18: Players Tab ─────────────────────────────────── */
      {
        id: "players-overview",
        element: SELECTORS.tabPlayers,
        popover: {
          title: "PLAYERS",
          description:
            "Browse your full club here, inspect ratings, and search for the right pieces when rebuilding.",
          popoverClass: "fc-onboarding",
          side: "bottom",
          align: "center",
        },
        onHighlightStarted: async () => {
          /* Ensure builder/panels are closed so tabs are visible */
          try { document.getElementById("fc-builder-modal")?.remove(); } catch(_) {}
          try { if (typeof window.closePanel === "function") window.closePanel(); } catch(_) {}
          await switchToTab("players");
        },
      },

      /* ─── 11: Play Tab ────────────────────────────────────── */
      {
        id: "play-overview",
        element: SELECTORS.tabPlay,
        popover: {
          title: "PLAY",
          description:
            "Quick matches, tournaments, seasons, and other match modes are all launched from this tab.",
          popoverClass: "fc-onboarding",
          side: "bottom",
          align: "center",
        },
        onHighlightStarted: async () => {
          await switchToTab("play");
        },
      },

      /* ─── 12: Settings Tab ────────────────────────────────── */
      {
        id: "settings-overview",
        element: SELECTORS.tabSettings,
        popover: {
          title: "SETTINGS",
          description:
            "If you ever want the walkthrough again, open <strong>Account</strong> inside Settings and use <strong>Replay Tutorial</strong> there.",
          popoverClass: "fc-onboarding",
          side: "bottom",
          align: "center",
        },
        onHighlightStarted: async () => {
          await switchToTab("settings");
        },
      },

      /* ─── 13: Finish ──────────────────────────────────────── */
      {
        id: "finish",
        popover: {
          title: "YOU ARE SET",
          description: [
            "<p>Your fast start:</p>",
            '<ol style="padding-left:18px;margin:10px 0 0;">',
            "<li>Open available packs</li>",
            "<li>Create a lineup</li>",
            "<li>Check your players</li>",
            "<li>Start playing</li>",
            "</ol>",
          ].join(""),
          popoverClass: "fc-onboarding fc-onboarding-celebrate",
          showButtons: ["previous", "next"],
          nextBtnText: "Finish",
          doneBtnText: "Finish",
        },
        onHighlightStarted: async () => {
          finalStepReached = true;
          await switchToTab("home");
        },
      },
    ].filter(
      (step) =>
        !step.element ||
        isElementVisible(step.element) ||
        typeof step.onHighlightStarted === "function",
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     DRIVER CREATION
     ═══════════════════════════════════════════════════════════════ */

  /**
   * Common onDestroyed handler for all driver instances.
   */
  function handleDriverDestroyed() {
    clearStepWaiter();
    stopProgressTracking();
    removeInstructionBanner();

    /* Check if this destroy was a pause triggered by onboarding. */
    const wasPaused = pauseInProgress;
    pauseInProgress = false;

    driverInstance = null;
    startScheduled = false;
    startedThisPage = true;

    if (wasPaused) {
      /* Don't switch tabs or persist — we're resuming soon. */
      return;
    }

    /* Normal close / finish */
    if (finalStepReached) {
      void persistCompletion().finally(() => {
        void switchToTab("home");
      });
    } else {
      void switchToTab("home");
    }
  }

  function createDriver() {
    if (!DRIVER_READY()) {
      console.warn("[FC Onboarding] Driver.js is not available.");
      return null;
    }
    const instance = window.driver.js.driver({
      steps: buildSteps(),
      animate: true,
      smoothScroll: false,
      overlayColor: "#04060c",
      overlayOpacity: 0.82,
      stagePadding: 12,
      stageRadius: 14,
      popoverOffset: 14,
      allowClose: true,
      allowKeyboardControl: false,
      disableActiveInteraction: false,
      showProgress: true,
      progressText: "Step {{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Finish",
      popoverClass: "fc-onboarding",
      showButtons: ["next", "previous", "close"],
      onDestroyed: handleDriverDestroyed,
    });
    return instance;
  }

  /* ═══════════════════════════════════════════════════════════════
     SCHEDULING & PUBLIC API
     ═══════════════════════════════════════════════════════════════ */

  function scheduleStart(delay = 800) {
    if (startedThisPage || startScheduled || driverInstance) {
      return;
    }
    startScheduled = true;
    setTimeout(() => {
      startScheduled = false;
      if (startedThisPage || driverInstance) {
        return;
      }
      ensureCleanState();
      resetProgressTracking();
      driverInstance = createDriver();
      if (driverInstance) {
        startProgressTracking();
        startedThisPage = true;
        driverInstance.drive();
      }
    }, delay);
  }

  async function start() {
    const user = await fetchCurrentUser();
    if (!user || hasCompleted(user)) {
      return;
    }
    scheduleStart(800);
  }

  function restart() {
    if (driverInstance && typeof driverInstance.destroy === "function") {
      driverInstance.destroy();
    }

    startedThisPage = false;
    finalStepReached = false;
    resumeAfterStepIndex = -1;
    removeInstructionBanner();
    clearStepWaiter();

    if (typeof window.closePanel === "function") {
      try {
        window.closePanel();
      } catch (_) {}
    }
    const notifPanel = document.getElementById("notif-panel");
    if (notifPanel) {
      notifPanel.setAttribute("aria-hidden", "true");
    }
    scheduleStart(500);
  }

  async function shouldStartOnboarding() {
    const user = await fetchCurrentUser();
    return !!user && !hasCompleted(user);
  }

  function waitForLoaderToFinish(maxWait = 6e3) {
    return new Promise((resolve) => {
      const loader = document.getElementById("loader");
      if (
        !loader ||
        loader.style.display === "none" ||
        loader.classList.contains("hidden")
      ) {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        resolve();
      };
      const observer = new MutationObserver(() => {
        if (
          loader.style.display === "none" ||
          loader.classList.contains("hidden")
        ) {
          finish();
        }
      });
      observer.observe(loader, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
      setTimeout(finish, maxWait);
    });
  }

  async function attemptAutoStart() {
    if (autoStartAttempted) {
      return;
    }
    autoStartAttempted = true;
    await waitForLoaderToFinish();
    if (await shouldStartOnboarding()) {
      scheduleStart(1e3);
    }
  }

  /* ── Expose public API ───────────────────────────────────────── */
  window.FC_ONBOARDING = {
    start: start,
    restart: restart,
    isComplete: async () => {
      const user = await fetchCurrentUser();
      return hasCompleted(user);
    },
    shouldStartOnboarding: shouldStartOnboarding,
  };

  /* ── Auto-start on page load ─────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void attemptAutoStart();
    });
  } else {
    void attemptAutoStart();
  }
})();

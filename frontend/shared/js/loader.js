(function () {
  "use strict";
  const LOADER_MIN_VISIBLE_MS = 900;
  const LOADER_MAX_WAIT_MS = 12e3;
  const FULLSCREEN_EXIT_TOLERANCE_PX = 4;
  const STORAGE_KEY_LAST_TAB = "footycraft_last_tab";
  const STORAGE_KEY_FORCE_HOME_ONCE = "footycraft_force_home_once";
  const loader = document.getElementById("loader");
  const dashboard = document.getElementById("dashboard");
  const loaderHint = document.getElementById("loaderHint");
  const fullscreenWarning = document.getElementById("fullscreenWarning");
  const fullscreenReturnBtn = document.getElementById("fullscreenReturnBtn");
  const fullscreenSignOutBtn = document.getElementById("fullscreenSignOutBtn");
  let dashboardOpened = false;
  let shellReady = false;
  let contentReady = false;
  let pageLoaded = document.readyState === "complete";
  let forceOpenTimer = null;
  let pendingOpenTimer = null;
  const loaderStartedAt = Date.now();
  function hideLoader() {
    if (!loader || !dashboard || dashboardOpened) return;
    dashboardOpened = true;
    if (forceOpenTimer) {
      window.clearTimeout(forceOpenTimer);
      forceOpenTimer = null;
    }
    if (pendingOpenTimer) {
      window.clearTimeout(pendingOpenTimer);
      pendingOpenTimer = null;
    }
    loader.classList.add("hidden");
    setTimeout(() => {
      dashboard.classList.add("loaded");
      setTimeout(() => {
        if (loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      }, 600);
    }, 100);
  }
  function getRemainingMinVisibleMs() {
    return Math.max(0, LOADER_MIN_VISIBLE_MS - (Date.now() - loaderStartedAt));
  }
  function isFullscreenActive() {
    const hasFullscreenElement = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement,
    );
    if (hasFullscreenElement) return true;
    const widthDiff = Math.abs(window.innerWidth - window.screen.width);
    const heightDiff = Math.abs(window.innerHeight - window.screen.height);
    return (
      widthDiff <= FULLSCREEN_EXIT_TOLERANCE_PX &&
      heightDiff <= FULLSCREEN_EXIT_TOLERANCE_PX
    );
  }
  function showFullscreenWarning() {
    if (!fullscreenWarning) return;
    fullscreenWarning.classList.add("is-visible");
    fullscreenWarning.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function hideFullscreenWarning() {
    if (!fullscreenWarning) return;
    fullscreenWarning.classList.remove("is-visible");
    fullscreenWarning.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function updateLoaderHint(text) {
    if (loaderHint) {
      loaderHint.textContent = text;
    }
  }
  function updateLoaderStage() {
    if (dashboardOpened) return;
    if (!shellReady) {
      updateLoaderHint("Loading dashboard shell...");
      return;
    }
    if (!contentReady) {
      updateLoaderHint("Loading your squad and dashboard data...");
      return;
    }
    if (!pageLoaded) {
      updateLoaderHint("Finalizing dashboard assets...");
      return;
    }
    updateLoaderHint("Opening dashboard...");
  }
  async function signOutToHome() {
    try {
      if (window.FC?.auth?.logout) {
        await window.FC.auth.logout();
      } else {
        await fetch("/backend/php/controllers/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      }
    } catch (_) {
    } finally {
      localStorage.removeItem("fc_user");
      localStorage.removeItem(STORAGE_KEY_LAST_TAB);
      localStorage.setItem(STORAGE_KEY_FORCE_HOME_ONCE, "true");
      window.location.href = "/";
    }
  }
  function maybeOpenDashboard(force = false) {
    if (dashboardOpened) return;
    updateLoaderStage();
    if (!force && (!shellReady || !contentReady || !pageLoaded)) {
      return;
    }
    const open = () => {
      if (dashboardOpened) return;
      hideLoader();
      window.setTimeout(syncFullscreenState, 0);
    };
    const remaining = getRemainingMinVisibleMs();
    if (remaining > 0) {
      if (pendingOpenTimer) {
        window.clearTimeout(pendingOpenTimer);
      }
      pendingOpenTimer = window.setTimeout(() => {
        pendingOpenTimer = null;
        open();
      }, remaining);
      return;
    }
    open();
  }
  function markShellReady() {
    shellReady = true;
    maybeOpenDashboard();
  }
  function markContentReady() {
    contentReady = true;
    maybeOpenDashboard();
  }
  function markPageLoaded() {
    pageLoaded = true;
    maybeOpenDashboard();
  }
  function requestDashboardFullscreen() {
    const root = document.documentElement;
    if (!root) return;
    if (root.requestFullscreen) {
      root.requestFullscreen().catch(() => {});
      return;
    }
    if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
      return;
    }
    if (root.msRequestFullscreen) {
      root.msRequestFullscreen();
    }
  }
  function syncFullscreenState() {
    const fullscreen = isFullscreenActive();
    if (!dashboardOpened) {
      if (!fullscreen) {
        updateLoaderHint("Press F11 to enter fullscreen");
        return;
      }
      updateLoaderStage();
      return;
    }
    if (fullscreen) {
      hideFullscreenWarning();
      return;
    }
    showFullscreenWarning();
  }
  function init() {
    if (!loader || !dashboard) {
      console.error("Loader or dashboard element not found");
      return;
    }
    syncFullscreenState();
    window.addEventListener("resize", syncFullscreenState);
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    window.addEventListener("load", markPageLoaded, { once: true });
    window.addEventListener("footycraft:dashboard-shell-ready", markShellReady);
    window.addEventListener(
      "footycraft:dashboard-content-ready",
      markContentReady,
    );
    document.addEventListener("keydown", function onKeyDown(event) {
      if (event.key === "F11") {
        window.setTimeout(syncFullscreenState, 120);
      }
    });
    document.addEventListener("click", function onClick() {
      if (!dashboardOpened) {
        requestDashboardFullscreen();
        maybeOpenDashboard();
      }
    });
    forceOpenTimer = window.setTimeout(() => {
      updateLoaderHint(
        "Dashboard took longer than expected. Opening anyway...",
      );
      maybeOpenDashboard(true);
    }, LOADER_MAX_WAIT_MS);
    if (fullscreenSignOutBtn) {
      fullscreenSignOutBtn.addEventListener("click", function () {
        signOutToHome();
      });
    }
    if (fullscreenReturnBtn) {
      fullscreenReturnBtn.addEventListener("click", function () {
        requestDashboardFullscreen();
        window.setTimeout(syncFullscreenState, 180);
      });
    }
    maybeOpenDashboard();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

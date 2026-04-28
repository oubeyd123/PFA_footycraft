(function () {
  "use strict";
  const STORAGE_KEY_LAST_TAB = "footycraft_last_tab";
  const STORAGE_KEY_FORCE_HOME_ONCE = "footycraft_force_home_once";
  function resolveUserPayload(res) {
    return res?.data?.user || res?.data || {};
  }
  function formatProvider(provider) {
    const value = String(provider || "local")
      .trim()
      .toLowerCase();
    if (!value) return "LOCAL ACCOUNT";
    return `${value.toUpperCase()} ACCOUNT`;
  }
  function formatMemberSince(createdAt) {
    if (!createdAt) return "MEMBER";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "MEMBER";
    return `MEMBER SINCE ${date.toLocaleDateString(undefined, { month: "short", year: "numeric" }).toUpperCase()}`;
  }
  function setButtonBusy(id, busy, idleText, busyText) {
    const button = document.getElementById(id);
    if (!button) return;
    button.disabled = !!busy;
    button.textContent = busy ? busyText : idleText;
    button.style.opacity = busy ? "0.7" : "1";
    button.style.cursor = busy ? "progress" : "pointer";
  }
  function syncCachedUser(user) {
    try {
      const cached = JSON.parse(localStorage.getItem("fc_user") || "{}");
      const merged = { ...cached, ...user };
      localStorage.setItem("fc_user", JSON.stringify(merged));
    } catch (_) {}
  }
  function syncOnboardingStatus(user) {
    const statusEl = document.getElementById("fc-settings-onboarding-status");
    const copyEl = document.getElementById("fc-settings-onboarding-copy");
    if (!statusEl && !copyEl) return;
    let completedAt = null;
    if (user && user.onboarding_completed_at) {
      let dateStr = String(user.onboarding_completed_at).replace(" ", "T");
      if (!dateStr.endsWith("Z")) {
        dateStr += "Z";
      }
      completedAt = new Date(dateStr);
    }
    const isComplete = completedAt && !Number.isNaN(completedAt.getTime());
    if (statusEl) {
      statusEl.textContent = isComplete ? "COMPLETED" : "READY FOR FIRST RUN";
      statusEl.style.color = isComplete ? "#80ed99" : "#ffd166";
    }
    if (copyEl) {
      copyEl.textContent = isComplete
        ? `Completed ${completedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}. Replay it here whenever you want a refresh.`
        : "New managers get this guided walkthrough once. You can also replay it manually from this account panel.";
    }
  }
  async function loadUserInfo() {
    const res = await FC.auth.me();
    if (!res.success) {
      window.location.href = "/";
      return;
    }
    const user = resolveUserPayload(res);
    syncCachedUser(user);
    const emailEl = document.getElementById("fc-settings-email");
    const usernameEl = document.getElementById("fc-settings-username");
    const pointsEl = document.getElementById("fc-settings-points");
    const avatarEl = document.getElementById("fc-settings-avatar");
    const providerEl = document.getElementById("fc-settings-provider");
    const memberSinceEl = document.getElementById("fc-settings-member-since");
    const lineupEl = document.getElementById("fc-settings-lineup");
    const username = String(user.username || "Unknown User");
    const email = String(user.email || "No email available");
    const divisionPoints = Number.isFinite(Number(user.division_points))
      ? Number(user.division_points)
      : 0;
    const activeLineup = user.active_lineup_id
      ? `#${user.active_lineup_id}`
      : "NONE";
    if (emailEl) emailEl.textContent = email;
    if (usernameEl) usernameEl.textContent = username.toUpperCase();
    if (pointsEl) pointsEl.textContent = `${divisionPoints} PTS`;
    if (avatarEl)
      avatarEl.textContent = username.charAt(0).toUpperCase() || "?";
    if (providerEl) providerEl.textContent = formatProvider(user.auth_provider);
    if (memberSinceEl)
      memberSinceEl.textContent = formatMemberSince(user.created_at);
    if (lineupEl) lineupEl.textContent = activeLineup;
    syncOnboardingStatus(user);
    const newEmailInput = document.getElementById("fc-new-email");
    if (newEmailInput && !newEmailInput.value) newEmailInput.value = email;
  }
  async function changeEmail() {
    const email =
      document.getElementById("fc-new-email") &&
      document.getElementById("fc-new-email").value.trim();
    const password =
      document.getElementById("fc-email-password") &&
      document.getElementById("fc-email-password").value.trim();
    if (!email || !password) {
      showSettingsMsg("Fill in all fields", "error");
      return;
    }
    setButtonBusy("fc-settings-email-btn", true, "SAVE NEW EMAIL", "SAVING...");
    const res = await FC.settings.changeEmail(email, password);
    setButtonBusy(
      "fc-settings-email-btn",
      false,
      "SAVE NEW EMAIL",
      "SAVING...",
    );
    showSettingsMsg(
      res.success ? "Email updated!" : res.error || "Failed",
      res.success ? "success" : "error",
    );
    if (res.success) {
      const passwordInput = document.getElementById("fc-email-password");
      if (passwordInput) passwordInput.value = "";
      loadUserInfo();
    }
  }
  async function changePassword() {
    const current =
      document.getElementById("fc-current-password") &&
      document.getElementById("fc-current-password").value.trim();
    const newPw =
      document.getElementById("fc-new-password") &&
      document.getElementById("fc-new-password").value.trim();
    const confirmPw =
      document.getElementById("fc-confirm-password") &&
      document.getElementById("fc-confirm-password").value.trim();
    if (!current || !newPw) {
      showSettingsMsg("Fill in all fields", "error");
      return;
    }
    if (newPw !== confirmPw) {
      showSettingsMsg("Passwords do not match", "error");
      return;
    }
    setButtonBusy(
      "fc-settings-password-btn",
      true,
      "UPDATE PASSWORD",
      "UPDATING...",
    );
    const res = await FC.settings.changePassword(current, newPw);
    setButtonBusy(
      "fc-settings-password-btn",
      false,
      "UPDATE PASSWORD",
      "UPDATING...",
    );
    showSettingsMsg(
      res.success ? "Password updated!" : res.error || "Failed",
      res.success ? "success" : "error",
    );
    if (res.success) {
      ["fc-current-password", "fc-new-password", "fc-confirm-password"].forEach(
        (id) => {
          const input = document.getElementById(id);
          if (input) input.value = "";
        },
      );
    }
  }
  async function deleteAccount() {
    const deleteInput = document.getElementById("fc-delete-password");
    const password = deleteInput
      ? deleteInput.value.trim()
      : window.showAppPrompt
        ? await window.showAppPrompt({
            title: "Delete account",
            message: "Enter your password to confirm account deletion.",
            confirmText: "Continue",
            cancelText: "Cancel",
            inputType: "password",
            placeholder: "Password",
            tone: "danger",
          })
        : prompt("Enter your password to confirm account deletion:");
    if (!password) return;
    const ok = await FC_MODALS.confirmDelete({
      title: "DELETE ACCOUNT",
      message:
        "This will permanently delete your account and all your data. This action is irreversible!",
      confirmText: "DELETE ACCOUNT",
    });
    if (!ok) return;
    setButtonBusy(
      "fc-settings-delete-btn",
      true,
      "DELETE ACCOUNT",
      "DELETING...",
    );
    const res = await FC.settings.deleteAccount(password);
    setButtonBusy(
      "fc-settings-delete-btn",
      false,
      "DELETE ACCOUNT",
      "DELETING...",
    );
    if (res.success) {
      alert("Account deleted. Goodbye!");
      window.location.href = "/";
    } else {
      showSettingsMsg(res.error || "Could not delete account", "error");
    }
  }
  async function logout() {
    try {
      await FC.auth.logout();
    } finally {
      localStorage.removeItem("fc_user");
      localStorage.removeItem(STORAGE_KEY_LAST_TAB);
      localStorage.setItem(STORAGE_KEY_FORCE_HOME_ONCE, "true");
      window.location.href = "/";
    }
  }
  function replayOnboarding() {
    if (
      !window.FC_ONBOARDING ||
      typeof window.FC_ONBOARDING.restart !== "function"
    ) {
      showSettingsMsg("Tutorial is unavailable right now", "error");
      return;
    }
    window.FC_ONBOARDING.restart();
  }
  function showSettingsMsg(msg, type) {
    let el = document.getElementById("fc-settings-msg");
    if (!el) {
      el = document.createElement("div");
      el.id = "fc-settings-msg";
      el.style.cssText =
        "padding:14px 16px;border-radius:16px;font-size:13px;text-align:center;font-weight:700;letter-spacing:0.02em;";
      const container =
        document.getElementById("fc-settings-msg-wrap") ||
        document.getElementById("fc-settings-content");
      if (container) container.appendChild(el);
    }
    el.style.background =
      type === "success"
        ? "rgba(42, 157, 93, 0.18)"
        : "rgba(220, 76, 100, 0.16)";
    el.style.color = type === "success" ? "#9df0bd" : "#ff9ab0";
    el.style.border =
      "1px solid " +
      (type === "success"
        ? "rgba(72, 212, 131, 0.35)"
        : "rgba(255, 107, 129, 0.35)");
    el.style.boxShadow =
      type === "success"
        ? "0 12px 28px rgba(42,157,93,0.12)"
        : "0 12px 28px rgba(220,76,100,0.12)";
    el.textContent = msg;
    setTimeout(() => {
      el.textContent = "";
    }, 5e3);
  }
  window.FC_SETTINGS = {
    init: loadUserInfo,
    changeEmail: changeEmail,
    changePassword: changePassword,
    deleteAccount: deleteAccount,
    logout: logout,
    replayOnboarding: replayOnboarding,
  };
})();

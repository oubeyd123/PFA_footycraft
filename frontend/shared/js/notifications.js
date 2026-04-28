function initNotifications() {
  const notifBtn = document.getElementById("notif-btn");
  const notifPanel = document.getElementById("notif-panel");
  const notifBadge = document.getElementById("notif-badge");
  const notifList = document.getElementById("notif-list");
  const notifUnreadCount = document.getElementById("notif-unread-count");
  const markReadBtn = document.getElementById("notif-mark-read");
  const clearAllBtn = document.getElementById("notif-clear-all");
  const notifLogoutBtn = document.getElementById("notif-logout");
  const notifFilters = document.getElementById("notif-filters");
  const STORAGE_KEY_LAST_TAB = "footycraft_last_tab";
  const STORAGE_KEY_FORCE_HOME_ONCE = "footycraft_force_home_once";
  let unreadCount = 0;
  let lastKnownCount = 0;
  let activeFilter = "all";
  let panelOpen = false;
  function getAuthHeaders() {
    try {
      const raw = localStorage.getItem("fc_user");
      if (!raw) return {};
      const user = JSON.parse(raw);
      if (user && user.session_token) {
        return {
          "X-FC-Session": user.session_token,
          ...(window.FCSessionActivity?.getHeaders?.() || {}),
        };
      }
    } catch (err) {}
    return {};
  }
  async function notifFetch(url, options = {}) {
    const headers = { ...(options.headers || {}), ...getAuthHeaders() };
    return fetch(url, { credentials: "include", ...options, headers: headers });
  }
  const NOTIF_TYPES = {
    admin: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`, color: "#FFD700", label: "Admin" },
    announcement: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`, color: "#FFD700", label: "Announcement" },
    challenge: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>`, color: "#FF8C00", label: "Challenge" },
    chest: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>`, color: "#B388FF", label: "Chest" },
    match: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 12l3-2.5-1-4-4 1v4z"></path><path d="M12 12l-3 3-3-1v-4"></path><path d="M12 12l2 4 4-1v-3"></path></svg>`, color: "#4FC3F7", label: "Match" },
    division: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`, color: "#66FF66", label: "Division" },
    mention: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>`, color: "#28a745", label: "Mention" },
    reaction: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`, color: "#E83E8C", label: "Reaction" },
    yellow_card: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" ry="2"></rect></svg>`, color: "#FFD700", label: "Yellow Card" },
    red_card: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" ry="2"></rect></svg>`, color: "#DC3545", label: "Red Card" },
    system: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`, color: "#888888", label: "System" },
    support: { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`, color: "#00D4FF", label: "Support" },
  };
  function getTypeConfig(type) {
    return NOTIF_TYPES[type] || NOTIF_TYPES.system;
  }
  function timeAgo(dateStr) {
    const diff = Math.max(
      0,
      Math.round((Date.now() - new Date(dateStr).getTime()) / 1e3),
    );
    if (diff < 60) return "just now";
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }
  function esc(str) {
    return String(str || "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function renderEmpty(message) {
    if (!notifList) return;
    notifList.innerHTML = `\n                <div class="fc-notif-empty">\n                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5">\n                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>\n                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>\n                    </svg>\n                    <p>${message}</p>\n                </div>`;
  }
  function isUnreadNotif(notif) {
    return (
      !notif.is_read && notif.is_read !== "true" && notif.is_read !== true
    );
  }
  function getNotifSortTime(notif) {
    return new Date(notif.created_at || 0).getTime() || 0;
  }
  function getNotifGroupLabel(dateStr) {
    const when = new Date(dateStr || 0);
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const startOfYesterday = startOfToday - 864e5;
    const stamp = when.getTime() || 0;
    if (stamp >= startOfToday) return "Today";
    if (stamp >= startOfYesterday) return "Yesterday";
    return "Earlier";
  }
  function renderNotifications(notifs) {
    if (!notifs || notifs.length === 0) {
      renderEmpty("No notifications yet");
      return;
    }
    const sorted = [...notifs].sort((a, b) => {
      const unreadDelta = Number(isUnreadNotif(b)) - Number(isUnreadNotif(a));
      if (unreadDelta !== 0) return unreadDelta;
      return getNotifSortTime(b) - getNotifSortTime(a);
    });
    const groups = [];
    sorted.forEach((notif) => {
      const label = getNotifGroupLabel(notif.created_at);
      const current = groups[groups.length - 1];
      if (!current || current.label !== label) {
        groups.push({ label: label, items: [notif] });
        return;
      }
      current.items.push(notif);
    });
    notifList.innerHTML = groups
      .map((group) => {
        const itemsHtml = group.items
          .map((n, i) => {
        const cfg = getTypeConfig(n.type);
        const isUnread = isUnreadNotif(n);
        const time = timeAgo(n.created_at);
        return `
                <div class="fc-notif-item ${isUnread ? "unread" : ""}"
                     data-id="${n.id}" data-link="${n.link || ""}"
                     style="--notif-accent: ${cfg.color}; --notif-bg: ${cfg.color}16; --notif-border: ${cfg.color}33; animation-delay: ${i * 0.04}s;">
                    <div class="fc-notif-icon">${cfg.icon}</div>
                    <div class="fc-notif-main">
                        <div class="fc-notif-meta">
                            <span class="fc-notif-type-label">${cfg.label}</span>
                            <span class="fc-notif-time">${time}</span>
                        </div>
                        <p class="fc-notif-text">${esc(n.content)}</p>
                    </div>
                    <button class="fc-notif-delete" data-delete-id="${n.id}" title="Delete" onclick="event.stopPropagation();">X</button>
                </div>`;
          })
          .join("");
        return `\n                <div class="fc-notif-group">\n                    <div class="fc-notif-group-label">${group.label}</div>\n                    <div class="fc-notif-group-items">${itemsHtml}</div>\n                </div>`;
      })
      .join("");
    notifList.querySelectorAll(".fc-notif-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        const item = btn.closest(".fc-notif-item");
        if (item) {
          item.classList.add("removing");
          setTimeout(() => item.remove(), 300);
        }
        try {
          await notifFetch("/backend/php/controllers/notifications/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: id }),
          });
        } catch (e) {}
        setTimeout(fetchNotifications, 500);
      });
    });
  }
  function updateBadge(count) {
    unreadCount = count;
    if (notifBadge) {
      if (count > 0) {
        notifBadge.textContent = count > 99 ? "99+" : count;
        notifBadge.style.display = "flex";
        notifBtn?.classList.add("has-unread");
      } else {
        notifBadge.style.display = "none";
        notifBtn?.classList.remove("has-unread");
      }
    }
    if (notifUnreadCount) {
      if (count > 0) {
        notifUnreadCount.textContent = `${count} new`;
        notifUnreadCount.classList.add("visible");
      } else {
        notifUnreadCount.classList.remove("visible");
      }
    }
  }
  function showToast(notif) {
    document.getElementById("fc-notif-toast")?.remove();
    const cfg = getTypeConfig(notif.type);
    const toast = document.createElement("div");
    toast.id = "fc-notif-toast";
    toast.className = "fc-notif-toast";
    toast.innerHTML = `\n                <div class="fc-notif-toast-icon" style="background: ${cfg.color}16; border-color: ${cfg.color}33;">${cfg.icon}</div>\n                <div class="fc-notif-toast-body">\n                    <div class="fc-notif-toast-title">${cfg.label}</div>\n                    <div class="fc-notif-toast-text">${esc(notif.content)}</div>\n                </div>\n                <button class="fc-notif-toast-close" aria-label="Dismiss">&times;</button>`;
    toast.addEventListener("click", (e) => {
      if (e.target.closest(".fc-notif-toast-close")) {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 350);
      } else {
        toast.remove();
        notifBtn?.click();
      }
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 350);
      }
    }, 5e3);
  }
  function shakeBell() {
    if (!notifBtn) return;
    notifBtn.classList.add("shake");
    setTimeout(() => notifBtn.classList.remove("shake"), 900);
  }
  async function logoutFromNotifications() {
    try {
      if (window.FC?.auth?.logout) {
        await window.FC.auth.logout();
      } else {
        await fetch("/backend/php/controllers/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      }
    } finally {
      localStorage.removeItem("fc_user");
      localStorage.removeItem(STORAGE_KEY_LAST_TAB);
      localStorage.setItem(STORAGE_KEY_FORCE_HOME_ONCE, "true");
      window.location.href = "/";
    }
  }
  async function fetchNotifications() {
    try {
      const filterParam =
        activeFilter !== "all" ? `?filter=${activeFilter}` : "";
      const res = await notifFetch(
        "/backend/php/controllers/notifications" + filterParam,
      );
      const data = await res.json();
      if (data.success) {
        const newCount = data.data.unread_count;
        updateBadge(newCount);
        if (newCount > lastKnownCount && lastKnownCount >= 0 && !panelOpen) {
          const notifs = data.data.notifications || [];
          if (notifs.length > 0) {
            const newest = notifs[0];
            if (!newest.is_read) {
              if (newest.type !== "challenge") {
                showToast(newest);
              }
              shakeBell();
            }
          }
        }
        lastKnownCount = newCount;
        if (panelOpen) {
          renderNotifications(data.data.notifications);
        }
      } else {
        updateBadge(0);
        if (panelOpen) {
          renderEmpty("Notifications are unavailable right now.");
        }
      }
    } catch (err) {
      updateBadge(0);
      if (panelOpen) {
        renderEmpty("Notifications are unavailable right now.");
      }
    }
  }
  function openPanel() {
    panelOpen = true;
    notifPanel.classList.add("open");
    notifPanel.setAttribute("aria-hidden", "false");
    renderEmpty("Loading...");
    fetchNotifications();
  }
  function closePanel() {
    panelOpen = false;
    notifPanel.classList.remove("open");
    notifPanel.setAttribute("aria-hidden", "true");
  }
  if (notifBtn) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panelOpen) {
        closePanel();
      } else {
        openPanel();
      }
    });
  }
  if (notifFilters) {
    notifFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".fc-notif-filter");
      if (!btn) return;
      e.stopPropagation();
      activeFilter = btn.dataset.filter || "all";
      notifFilters
        .querySelectorAll(".fc-notif-filter")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderEmpty("Loading...");
      fetchNotifications();
    });
  }
  if (markReadBtn) {
    markReadBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      updateBadge(0);
      await notifFetch("/backend/php/controllers/notifications/mark_read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      fetchNotifications();
    });
  }
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await notifFetch("/backend/php/controllers/notifications/clear_all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      fetchNotifications();
    });
  }
  document.addEventListener("click", (e) => {
    if (
      panelOpen &&
      notifPanel &&
      !notifPanel.contains(e.target) &&
      notifBtn &&
      !notifBtn.contains(e.target)
    ) {
      closePanel();
    }
  });
  if (notifList) {
    notifList.addEventListener("click", async (e) => {
      const item = e.target.closest(".fc-notif-item");
      if (!item || e.target.closest(".fc-notif-delete")) return;
      const id = item.dataset.id;
      const link = item.dataset.link;
      item.classList.remove("unread");
      notifFetch("/backend/php/controllers/notifications/mark_read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id }),
      });
      if (link) {
        if (link === "#community" || link === "community") {
          window.FootyCraft?.openCommunity?.();
        } else if (link === "#news" || link === "news") {
          window.FootyCraft?.openNews?.();
        } else if (link === "#challenges") {
          window.FootyCraft?.switchTab?.("chests");
        } else if (link.startsWith("#")) {
          window.FootyCraft?.switchTab?.(link.replace("#", ""));
        } else {
          window.location.href = link;
        }
      }
      closePanel();
      fetchNotifications();
    });
  }
  if (notifLogoutBtn) {
    notifLogoutBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await logoutFromNotifications();
    });
  }
  fetchNotifications();
  setInterval(fetchNotifications, 3e4);
}
window.initNotifications = initNotifications;

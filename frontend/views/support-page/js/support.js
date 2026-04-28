document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Admin panel initializing...");
  console.log("FC object available?", typeof window.FC !== "undefined");
  if (typeof window.FC === "undefined") {
    alert(
      "Error: API wrapper not loaded. Make sure api.js is included before admin.js",
    );
    return;
  }
  console.log("✅ FC object loaded:", window.FC);
  const user = JSON.parse(localStorage.getItem("fc_user") || "{}");
  console.log("🔐 User from localStorage:", user);
  console.log("📍 Token available?", !!user.session_token);
  console.log(
    "📍 Token value:",
    user.session_token ? user.session_token.substring(0, 30) + "..." : "NONE",
  );
  if (!user.role || (user.role !== "admin" && user.role !== "support")) {
    alert("Access denied. Support/Admin only.");
    window.location.href = "/frontend/views/home/index.html";
    return;
  }
  const normalizedRole = String(user.role || "").toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const allowedPages = isAdmin
    ? new Set(["dashboard", "users", "community", "support", "reports", "settings"])
    : new Set(["users", "support", "reports"]);
  console.log("✅ Support authorized:", user.username);
  document.querySelector(".fc-profile-name").textContent =
    user.username || "Support User";
  document.querySelector(".fc-profile-role").textContent = (
    user.role || "support"
  ).toUpperCase();
  const initials = (user.username || "SU").substring(0, 2).toUpperCase();
  document.querySelector(".fc-admin-profile div:first-child").textContent =
    initials;
  const navItems = document.querySelectorAll(".fc-nav-item[data-target]");
  const pageSections = document.querySelectorAll(".fc-page-section");
  const pageTitle = document.getElementById("pageTitle");
  let activePageId = isAdmin ? "dashboard" : "support";
  function canAccessPage(pageId) {
    return allowedPages.has(pageId);
  }
  navItems.forEach((item) => {
    const targetId = item.getAttribute("data-target") || "";
    if (!canAccessPage(targetId)) {
      item.style.display = "none";
    }
  });
  pageSections.forEach((section) => {
    if (!canAccessPage(section.id)) {
      section.classList.remove("active");
      section.style.display = "none";
    }
  });
  if (!isAdmin) {
    const usersTable = document.getElementById("usersTable");
    const actionHeader = usersTable?.querySelector("thead th:last-child");
    if (actionHeader) actionHeader.textContent = "Access";
  }
  function switchPage(targetId) {
    if (!canAccessPage(targetId)) {
      showNotification("You do not have permission to open this section", "danger");
      return;
    }
    console.log("🔄 Switching to page:", targetId);
    activePageId = targetId;
    if (targetId === "support") {
      startSupportLiveUpdates();
    } else {
      stopSupportLiveUpdates();
    }
    navItems.forEach((item) => {
      if (item.getAttribute("data-target") === targetId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
    pageSections.forEach((section) => {
      if (section.id === targetId) {
        section.classList.add("active");
        if (targetId === "dashboard") loadDashboard();
        if (targetId === "users") loadUsers();
        if (targetId === "players") loadPlayers();
        if (targetId === "community") loadCommunity();
        if (targetId === "support") loadSupport();
        if (targetId === "reports") loadReports();
      } else {
        section.classList.remove("active");
      }
    });
    const label = document.querySelector(
      `.fc-nav-item[data-target="${targetId}"] .fc-nav-label`,
    );
    if (label) pageTitle.textContent = label.textContent;
  }
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetId = item.getAttribute("data-target");
      switchPage(targetId);
    });
  });
  function showNotification(message, type = "success") {
    const alert = document.createElement("div");
    alert.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
    alert.style.zIndex = "9999";
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3e3);
  }
  const supportTicketListEl = document.getElementById("adminSupportTicketList");
  const supportStatusEl = document.getElementById("adminSupportStatus");
  const supportTitleEl = document.getElementById("adminSupportTitle");
  const supportMetaEl = document.getElementById("adminSupportMeta");
  const supportMessagesEl = document.getElementById("adminSupportMessages");
  const supportReplyForm = document.getElementById("adminSupportReplyForm");
  const supportReplyInput = document.getElementById("adminSupportReplyInput");
  const supportSendBtn = document.getElementById("adminSupportSendBtn");
  const supportResolveBtn = document.getElementById("adminResolveTicketBtn");
  let supportTickets = [];
  let activeSupportTicketId = null;
  let supportLiveTimer = null;
  let supportLiveBusy = false;
  let supportLastMessageId = 0;
  function supportFormatTime(raw) {
    if (!raw) return "Unknown time";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString();
  }
  function supportEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function supportSetComposerEnabled(enabled) {
    if (supportReplyInput) supportReplyInput.disabled = !enabled;
    if (supportSendBtn) supportSendBtn.disabled = !enabled;
    if (supportResolveBtn) supportResolveBtn.disabled = !enabled;
  }
  function startSupportLiveUpdates() {
    stopSupportLiveUpdates();
    supportLiveTimer = setInterval(() => {
      supportLiveRefresh();
    }, 2500);
  }
  function stopSupportLiveUpdates() {
    if (!supportLiveTimer) return;
    clearInterval(supportLiveTimer);
    supportLiveTimer = null;
  }
  function supportRenderTicketList() {
    if (!supportTicketListEl) return;
    if (!supportTickets.length) {
      supportTicketListEl.innerHTML =
        '<div class="text-muted text-center py-4">No tickets found for this filter.</div>';
      return;
    }
    supportTicketListEl.innerHTML = supportTickets
      .map((ticket) => {
        const activeClass =
          Number(ticket.id) === Number(activeSupportTicketId) ? " active" : "";
        const resolvedClass = ticket.status === "closed" ? " resolved" : "";
        const latest = ticket.latest_message
          ? supportEscape(ticket.latest_message)
          : "No messages yet";
        return `\n                <div class="fc-ticket-card${activeClass}${resolvedClass}" data-ticket-id="${ticket.id}">\n                    <div class="fc-ticket-header">\n                        <span class="fc-ticket-id">#TK-${ticket.id}</span>\n                        <span class="fc-badge-status ${ticket.status === "closed" ? "fc-status-closed" : "fc-status-open"}">${ticket.status === "closed" ? "Closed" : "Open"}</span>\n                    </div>\n                    <h4 class="fc-ticket-subject">${supportEscape(ticket.subject || "No subject")}</h4>\n                    <p class="fc-ticket-excerpt">${latest}</p>\n                    <small class="fc-ticket-time">${supportEscape(ticket.username || "Unknown user")} · ${supportFormatTime(ticket.last_message_at || ticket.created_at)}</small>\n                </div>\n            `;
      })
      .join("");
    supportTicketListEl.querySelectorAll("[data-ticket-id]").forEach((card) => {
      card.addEventListener("click", async () => {
        const ticketId = Number(card.getAttribute("data-ticket-id"));
        if (!ticketId) return;
        await supportOpenTicket(ticketId);
      });
    });
  }
  function supportRenderMessages(messages) {
    if (!supportMessagesEl) return;
    if (!Array.isArray(messages) || !messages.length) {
      supportMessagesEl.innerHTML = `\n                <div class="fc-message-bubble system">\n                    <div class="fc-msg-content">\n                        <p>No messages yet.</p>\n                    </div>\n                </div>\n            `;
      return;
    }
    supportMessagesEl.innerHTML = messages
      .map((msg) => {
        const role =
          msg.sender_role === "admin"
            ? "admin"
            : msg.sender_role === "system"
              ? "system"
              : "client";
        if (role === "system") {
          return `\n                    <div class="fc-message-bubble system">\n                        <div class="fc-msg-content">\n                            <p>${supportEscape(msg.message || "")}</p>\n                            <span class="fc-msg-time">${supportFormatTime(msg.created_at)}</span>\n                        </div>\n                    </div>\n                `;
        }
        const initials = (
          msg.sender_name || (role === "admin" ? "Support" : "User")
        )
          .slice(0, 2)
          .toUpperCase();
        return `\n                <div class="fc-message-bubble ${role}">\n                    <div class="fc-msg-avatar"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${role === "admin" ? "0dcaf0" : "1e212b"}&color=fff&rounded=true" alt="${supportEscape(msg.sender_name || "")}"></div>\n                    <div class="fc-msg-content">\n                        <p>${supportEscape(msg.message || "")}</p>\n                        <span class="fc-msg-time">${supportEscape(msg.sender_name || (role === "admin" ? "Support" : "User"))} · ${supportFormatTime(msg.created_at)}</span>\n                    </div>\n                </div>\n            `;
      })
      .join("");
    supportMessagesEl.scrollTop = supportMessagesEl.scrollHeight;
    supportLastMessageId = Number(messages[messages.length - 1]?.id || 0);
  }
  async function supportOpenTicket(ticketId, options = {}) {
    const { silent: silent = false } = options;
    const res = await FC.support.adminDetail(ticketId);
    if (!res?.success) {
      if (!silent) {
        showNotification(
          res?.error || "Failed to load ticket detail",
          "danger",
        );
      }
      return;
    }
    const ticket = res.data?.ticket || {};
    activeSupportTicketId = Number(ticket.id || ticketId);
    if (supportTitleEl) {
      supportTitleEl.textContent = `#TK-${ticket.id}: ${ticket.subject || "No subject"}`;
    }
    if (supportMetaEl) {
      supportMetaEl.innerHTML = `Reported by: <strong>${supportEscape(ticket.user_username || "Unknown user")}</strong> · Status: <strong>${supportEscape(ticket.status || "open")}</strong>`;
    }
    supportRenderMessages(res.data?.messages || []);
    const isClosed = (ticket.status || "open") === "closed";
    supportSetComposerEnabled(!isClosed);
    if (supportReplyInput) {
      supportReplyInput.placeholder = isClosed
        ? "Ticket is resolved. Messaging is disabled."
        : "Type your reply...";
    }
    if (supportResolveBtn) {
      supportResolveBtn.disabled = ticket.status === "closed";
    }
    supportRenderTicketList();
  }
  async function supportLiveRefresh() {
    if (activePageId !== "support" || supportLiveBusy) return;
    supportLiveBusy = true;
    try {
      await loadSupport(true);
    } finally {
      supportLiveBusy = false;
    }
  }
  async function loadSupport(silent = false) {
    if (!supportTicketListEl) return;
    const status = supportStatusEl?.value || "open";
    const res = await FC.support.adminList(status);
    if (!res?.success) {
      supportTicketListEl.innerHTML =
        '<div class="text-danger text-center py-4">Failed to load tickets.</div>';
      if (!silent) {
        showNotification(
          res?.error || "Failed to load support tickets",
          "danger",
        );
      }
      return;
    }
    supportTickets = Array.isArray(res.data?.tickets) ? res.data.tickets : [];
    if (!supportTickets.length) {
      activeSupportTicketId = null;
      supportRenderTicketList();
      supportSetComposerEnabled(false);
      if (supportTitleEl) supportTitleEl.textContent = "No tickets available";
      if (supportMetaEl) supportMetaEl.textContent = "No ticket selected";
      if (supportMessagesEl) {
        supportMessagesEl.innerHTML =
          '<div class="fc-message-bubble system"><div class="fc-msg-content"><p>No tickets in this view.</p></div></div>';
      }
      return;
    }
    const exists = supportTickets.some(
      (t) => Number(t.id) === Number(activeSupportTicketId),
    );
    if (!exists) {
      activeSupportTicketId = Number(supportTickets[0].id);
    }
    supportRenderTicketList();
    if (silent) {
      const detailRes = await FC.support.adminDetail(activeSupportTicketId);
      if (detailRes?.success) {
        const messages = detailRes.data?.messages || [];
        const latestMessageId = Number(messages[messages.length - 1]?.id || 0);
        if (latestMessageId !== supportLastMessageId) {
          supportRenderMessages(messages);
        }
        const ticket = detailRes.data?.ticket || {};
        if (supportTitleEl) {
          supportTitleEl.textContent = `#TK-${ticket.id}: ${ticket.subject || "No subject"}`;
        }
        if (supportMetaEl) {
          supportMetaEl.innerHTML = `Reported by: <strong>${supportEscape(ticket.user_username || "Unknown user")}</strong> · Status: <strong>${supportEscape(ticket.status || "open")}</strong>`;
        }
        const isClosed = (ticket.status || "open") === "closed";
        supportSetComposerEnabled(!isClosed);
        if (supportReplyInput) {
          supportReplyInput.placeholder = isClosed
            ? "Ticket is resolved. Messaging is disabled."
            : "Type your reply...";
        }
        if (supportResolveBtn) {
          supportResolveBtn.disabled = ticket.status === "closed";
        }
      }
      return;
    }
    await supportOpenTicket(activeSupportTicketId);
  }
  supportStatusEl?.addEventListener("change", () => {
    loadSupport();
  });
  supportReplyForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeSupportTicketId) return;
    const message = (supportReplyInput?.value || "").trim();
    if (!message) return;
    if (supportSendBtn) {
      supportSendBtn.disabled = true;
      supportSendBtn.innerHTML =
        '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';
    }
    try {
      const res = await FC.support.adminSend(activeSupportTicketId, message);
      if (!res?.success) {
        showNotification(res?.error || "Failed to send reply", "danger");
        return;
      }
      supportReplyInput.value = "";
      await supportOpenTicket(activeSupportTicketId);
      await loadSupport();
    } finally {
      if (supportSendBtn) {
        supportSendBtn.disabled = false;
        supportSendBtn.innerHTML =
          '<i class="fa-regular fa-paper-plane"></i> Send Reply';
      }
    }
  });
  supportResolveBtn?.addEventListener("click", async () => {
    if (!activeSupportTicketId) return;
    const confirmed = window.showAppConfirm
      ? await window.showAppConfirm({
          title: "Resolve ticket",
          message: "Mark this ticket as resolved?",
          confirmText: "Resolve",
        })
      : confirm("Mark this ticket as resolved?");
    if (!confirmed) return;
    supportResolveBtn.disabled = true;
    supportResolveBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> Resolving...';
    try {
      const res = await FC.support.adminResolve(activeSupportTicketId);
      if (!res?.success) {
        showNotification(res?.error || "Failed to resolve ticket", "danger");
        return;
      }
      showNotification("Ticket resolved", "success");
      await loadSupport();
    } finally {
      supportResolveBtn.disabled = false;
      supportResolveBtn.innerHTML =
        '<i class="fa-solid fa-check"></i> Resolve Ticket';
    }
  });
  async function loadDashboard() {
    console.log("📊 Loading dashboard...");
    if (!FC || !FC.admin || !FC.admin.dashboard) {
      console.error("❌ FC.admin.dashboard not available!");
      showNotification("Error: API not properly loaded", "danger");
      return;
    }
    try {
      console.log("🔄 Calling FC.admin.dashboard");
      const res = await FC.admin.dashboard();
      console.log("✅ Dashboard response:", res);
      if (!res || !res.success) {
        console.error("❌ Dashboard error:", res?.error);
        showNotification("Failed to load dashboard", "danger");
        return;
      }
      const data = res.data;
      console.log("📊 Dashboard data:", data);
      const stats = [
        { id: "stat-total-users", value: data.total_users },
        { id: "stat-active-players", value: data.active_players },
        { id: "stat-total-matches", value: data.total_matches },
        { id: "stat-pending-reports", value: data.pending_reports },
      ];
      stats.forEach((stat) => {
        const el = document.getElementById(stat.id);
        if (el) {
          el.textContent = (stat.value || 0).toLocaleString();
          console.log(`✅ Updated ${stat.id}:`, stat.value);
        } else {
          console.warn(`⚠️ Element ${stat.id} not found`);
        }
      });
      const topContributorsList = document.getElementById(
        "topContributorsList",
      );
      if (topContributorsList && data.top_contributors) {
        if (data.top_contributors.length === 0) {
          topContributorsList.innerHTML =
            '<div class="text-center text-muted py-3">No contributors yet.</div>';
        } else {
          topContributorsList.innerHTML = "";
          data.top_contributors.forEach((contributor, index) => {
            const name = contributor.username || "User";
            const initials = name.substring(0, 2).toUpperCase();
            const rep = contributor.rep || 0;
            const bgColors = ["d4af37", "c0c0c0", "cd7f32", "1e212b", "1e212b"];
            const bgColor = bgColors[index] || "1e212b";
            const textColors = index < 3 ? "000" : "fff";
            topContributorsList.innerHTML += `\n                            <div class="d-flex align-items-center justify-content-between p-2 rounded transition" style="background: rgba(255,255,255,0.02); cursor: pointer;">\n                                <div class="d-flex align-items-center gap-3">\n                                    <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #${bgColor}; color: #${textColors}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">\n                                        ${initials}\n                                    </div>\n                                    <div>\n                                        <h5 class="mb-0 text-white" style="font-size: 14px;">${name}</h5>\n                                        <small class="text-muted" style="font-size: 12px;"><i class="fa-solid fa-star" style="font-size: 10px;"></i> ${rep} rep</small>\n                                    </div>\n                                </div>\n                            </div>\n                        `;
          });
        }
      }
      const chartContainer = document.getElementById("activityChartContainer");
      if (chartContainer && data.platform_activity) {
        chartContainer.innerHTML = "";
        const maxActivity = data.max_activity || 1;
        const activities = data.platform_activity;
        activities.forEach((item, index) => {
          const heightPercent = Math.max((item.count / maxActivity) * 100, 2);
          const isToday = index === activities.length - 1;
          const barClass = isToday ? "fc-bar active-bar" : "fc-bar";
          const textClass = isToday ? "fc-neon-text fw-bold" : "";
          chartContainer.innerHTML += `\n                        <div class="fc-bar-wrap" title="${item.count} activities">\n                            <div class="${barClass}" style="height: ${heightPercent}%"></div>\n                            <span class="${textClass}">${item.day}</span>\n                        </div>\n                    `;
        });
      }
      loadLiveFeed();
      setInterval(loadLiveFeed, 1e4);
      console.log("✅ Dashboard loaded successfully");
    } catch (err) {
      console.error("❌ Dashboard error:", err);
      console.error("Error stack:", err.stack);
      showNotification("Error loading dashboard: " + err.message, "danger");
    }
  }
  let usersSearchTerm = "";
  let usersStatusFilter = "all";
  async function loadUsers(page = 1, search = null, status = null) {
    if (search !== null) {
      usersSearchTerm = search;
    }
    if (status !== null) {
      usersStatusFilter = status;
    }
    console.log("📋 Loading users...", {
      page: page,
      search: usersSearchTerm,
      status: usersStatusFilter,
    });
    if (!FC || !FC.admin || !FC.admin.usersList) {
      console.error("❌ FC.admin.usersList not available!");
      showNotification("Error: API not properly loaded", "danger");
      return;
    }
    try {
      const res = await FC.admin.usersList({
        page: page,
        search: usersSearchTerm,
        status: usersStatusFilter,
      });
      console.log("✅ Users response received:", res);
      if (!res.success) {
        console.error("❌ API returned error:", res.error);
        showNotification(
          "API Error: " + (res.error || "Unknown error"),
          "danger",
        );
        return;
      }
      const tbody = document.querySelector("#users tbody");
      if (!tbody) {
        console.error("❌ Users table body not found");
        showNotification("Error: Table structure not found", "danger");
        return;
      }
      tbody.innerHTML = "";
      const users = res.data?.users || [];
      console.log("📊 Users to display:", users);
      if (users.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-center text-muted py-4">No users found</td></tr>';
        return;
      }
      users.forEach((u) => {
        const row = document.createElement("tr");
        const roleDisplay = u.role
          ? u.role.charAt(0).toUpperCase() + u.role.slice(1)
          : "Player";
        const statusClass = (u.status || "active").toLowerCase();
        const statusDisplay = (u.status || "active").toUpperCase();
        let timeoutDisplay = "";
        if (u.status === "timeout" && u.timeout_until) {
          const timeoutDate = new Date(u.timeout_until);
          const now = new Date();
          if (timeoutDate > now) {
            const hoursLeft = Math.ceil((timeoutDate - now) / (1e3 * 60 * 60));
            timeoutDisplay = `<small class="d-block text-muted">(${hoursLeft}h remaining)</small>`;
          }
        }
        const actionCellHtml = isAdmin
          ? `<div class="fc-action-btns">\n                            <button class="fc-btn-icon user-edit-btn" data-user-id="${u.id}" data-role="${u.role}" title="Edit"><i class="fa-solid fa-pen"></i></button>\n                            ${u.status === "banned" || u.status === "timeout" ? `<button class="fc-btn-icon fc-text-green user-unban-btn" data-user-id="${u.id}" title="Unban/Remove Timeout"><i class="fa-solid fa-unlock"></i></button>` : `<button class="fc-btn-icon fc-text-orange user-timeout-btn" data-user-id="${u.id}" title="Timeout"><i class="fa-solid fa-clock"></i></button>\n                                   <button class="fc-btn-icon fc-text-red user-ban-btn" data-user-id="${u.id}" title="Ban"><i class="fa-solid fa-ban"></i></button>`}\n                            <button class="fc-btn-icon fc-text-red user-delete-btn" data-user-id="${u.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>\n                        </div>`
          : '<span class="text-muted">Read only</span>';
        row.innerHTML = `\n                    <td>#${u.id}</td>\n                    <td>\n                        <div class="fc-table-user">\n                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=1e212b&color=fff&rounded=true" alt="avatar">\n                            <span>${u.username}</span>\n                        </div>\n                    </td>\n                    <td>${u.email}</td>\n                    <td><span class="badge bg-info">${roleDisplay}</span></td>\n                    <td>\n                        <span class="fc-badge-status fc-status-${statusClass}">${statusDisplay}</span>\n                        ${timeoutDisplay}\n                    </td>\n                    <td>${actionCellHtml}</td>\n                `;
        tbody.appendChild(row);
        if (isAdmin) {
          row
            .querySelector(".user-edit-btn")
            .addEventListener("click", () => editUser(u.id, u.role));
          if (u.status === "banned" || u.status === "timeout") {
            row
              .querySelector(".user-unban-btn")
              ?.addEventListener("click", () => unbanUser(u.id));
          } else {
            row
              .querySelector(".user-timeout-btn")
              ?.addEventListener("click", () => timeoutUser(u.id));
            row
              .querySelector(".user-ban-btn")
              .addEventListener("click", () => banUser(u.id));
          }
          row
            .querySelector(".user-delete-btn")
            .addEventListener("click", () => deleteUser(u.id));
        }
      });
      console.log(`✅ Successfully loaded ${users.length} users`);
    } catch (err) {
      console.error("❌ Error in loadUsers:", err);
      showNotification("Error loading users: " + err.message, "danger");
    }
  }
  window.editUser = async (userId, currentRole) => {
    const modal = document.getElementById("editRoleModal");
    const usernameInput = document.getElementById("editRoleUsername");
    const roleSelect = document.getElementById("editRoleSelect");
    if (!modal) return;
    modal.dataset.userId = userId;
    if (usernameInput) usernameInput.value = `User #${userId}`;
    if (roleSelect)
      roleSelect.value =
        (currentRole &&
          currentRole.charAt(0).toUpperCase() + currentRole.slice(1)) ||
        "Administrator";
    modal.classList.add("active");
  };
  window.timeoutUser = async (userId) => {
    document.getElementById("timeoutHours").dataset.userId = userId;
    document.getElementById("timeoutUserModal").classList.add("active");
  };
  window.banUser = async (userId) => {
    document.getElementById("banUserModal").dataset.userId = userId;
    document.getElementById("banUserModal").classList.add("active");
  };
  window.deleteUser = async (userId) => {
    document.getElementById("deleteUserModal").dataset.userId = userId;
    document.getElementById("deleteUserModal").classList.add("active");
  };
  window.unbanUser = async (userId) => {
    document.getElementById("unbanUserModal").dataset.userId = userId;
    document.getElementById("unbanUserModal").classList.add("active");
  };
  const timeoutUserModal = document.getElementById("timeoutUserModal");
  const confirmTimeoutBtn = document.getElementById("confirmTimeoutBtn");
  const cancelTimeoutBtn = document.getElementById("cancelTimeoutBtn");
  cancelTimeoutBtn?.addEventListener("click", () => {
    timeoutUserModal?.classList.remove("active");
  });
  confirmTimeoutBtn?.addEventListener("click", async () => {
    const userId = parseInt(
      document.getElementById("timeoutHours").dataset.userId,
    );
    const hours = parseInt(document.getElementById("timeoutHours").value);
    if (!hours || hours < 1) {
      showNotification("Please enter valid hours (1-8760)", "danger");
      return;
    }
    confirmTimeoutBtn.disabled = true;
    confirmTimeoutBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> Applying...';
    try {
      const res = await FC.admin.usersTimeout(userId, hours);
      if (res.success) {
        showNotification(
          `✅ User timed out for ${hours} hours until ${res.data?.timeout_until}`,
          "success",
        );
        timeoutUserModal?.classList.remove("active");
        document.getElementById("timeoutHours").value = "24";
        loadUsers();
      } else {
        showNotification(
          res.data?.message || res.error || "Failed to timeout user",
          "danger",
        );
      }
    } catch (err) {
      console.error("Timeout user error:", err);
      showNotification(
        "Error: " + (err?.message || "Failed to timeout user"),
        "danger",
      );
    }
    confirmTimeoutBtn.disabled = false;
    confirmTimeoutBtn.innerHTML = "Apply Timeout";
  });
  const banUserModal = document.getElementById("banUserModal");
  const confirmBanBtn = document.getElementById("confirmBanBtn");
  const cancelBanBtn = document.getElementById("cancelBanBtn");
  cancelBanBtn?.addEventListener("click", () => {
    banUserModal?.classList.remove("active");
  });
  confirmBanBtn?.addEventListener("click", async () => {
    const userId = parseInt(banUserModal.dataset.userId);
    confirmBanBtn.disabled = true;
    confirmBanBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> Banning...';
    try {
      const res = await FC.admin.usersBan(userId);
      if (res.success) {
        showNotification("✅ User has been permanently banned", "success");
        banUserModal?.classList.remove("active");
        loadUsers();
      } else {
        showNotification(
          res.data?.message || res.error || "Failed to ban user",
          "danger",
        );
      }
    } catch (err) {
      console.error("Ban user error:", err);
      showNotification(
        "Error: " + (err?.message || "Failed to ban user"),
        "danger",
      );
    }
    confirmBanBtn.disabled = false;
    confirmBanBtn.innerHTML = "Ban User";
  });
  const deleteUserModal = document.getElementById("deleteUserModal");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  cancelDeleteBtn?.addEventListener("click", () => {
    deleteUserModal?.classList.remove("active");
  });
  confirmDeleteBtn?.addEventListener("click", async () => {
    const userId = parseInt(deleteUserModal.dataset.userId);
    confirmDeleteBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> Deleting...';
    const res = await FC.admin.usersDelete(userId);
    if (res.success) {
      showNotification("✅ User has been deleted", "success");
      deleteUserModal?.classList.remove("active");
      loadUsers();
    } else {
      showNotification(res.error || "Failed to delete user", "danger");
    }
    confirmDeleteBtn.innerHTML = "Delete User";
  });
  timeoutUserModal?.addEventListener("click", (e) => {
    if (e.target === timeoutUserModal)
      timeoutUserModal.classList.remove("active");
  });
  banUserModal?.addEventListener("click", (e) => {
    if (e.target === banUserModal) banUserModal.classList.remove("active");
  });
  deleteUserModal?.addEventListener("click", (e) => {
    if (e.target === deleteUserModal)
      deleteUserModal.classList.remove("active");
  });
  const unbanUserModal = document.getElementById("unbanUserModal");
  const confirmUnbanBtn = document.getElementById("confirmUnbanBtn");
  const cancelUnbanBtn = document.getElementById("cancelUnbanBtn");
  cancelUnbanBtn?.addEventListener("click", () => {
    unbanUserModal?.classList.remove("active");
  });
  confirmUnbanBtn?.addEventListener("click", async () => {
    const userId = parseInt(unbanUserModal.dataset.userId);
    confirmUnbanBtn.disabled = true;
    confirmUnbanBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> Removing...';
    try {
      const res = await FC.admin.usersUnban(userId);
      if (res.success) {
        showNotification("Restriction removed successfully", "success");
        unbanUserModal?.classList.remove("active");
        loadUsers();
      } else {
        showNotification(
          res.data?.message || res.error || "Failed to remove restriction",
          "danger",
        );
      }
    } catch (err) {
      console.error("Unban user error:", err);
      showNotification(
        "Error: " + (err?.message || "Failed to remove restriction"),
        "danger",
      );
    }
    confirmUnbanBtn.disabled = false;
    confirmUnbanBtn.innerHTML = "Unban";
  });
  unbanUserModal?.addEventListener("click", (e) => {
    if (e.target === unbanUserModal) unbanUserModal.classList.remove("active");
  });
  const editRoleModal = document.getElementById("editRoleModal");
  const cancelEditRoleBtn = document.getElementById("cancelEditRoleBtn");
  const confirmEditRoleBtn = document.getElementById("confirmEditRoleBtn");
  cancelEditRoleBtn?.addEventListener("click", () => {
    editRoleModal?.classList.remove("active");
  });
  editRoleModal?.addEventListener("click", (e) => {
    if (e.target === editRoleModal) editRoleModal.classList.remove("active");
  });
  confirmEditRoleBtn?.addEventListener("click", async () => {
    const userId = parseInt(editRoleModal.dataset.userId);
    const newRole = document.getElementById("editRoleSelect")?.value;
    if (!newRole) return;
    confirmEditRoleBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
    try {
      const res = await FC.admin.usersEdit(userId, newRole.toLowerCase());
      if (res.success) {
        showNotification(`✅ Role updated to ${newRole}`, "success");
        editRoleModal?.classList.remove("active");
        loadUsers();
      } else {
        showNotification(res.error || "Failed to update role", "danger");
      }
    } catch (err) {
      console.error("Edit role error:", err);
      showNotification("Error updating role", "danger");
    }
    confirmEditRoleBtn.innerHTML = "Save Role";
  });
  setTimeout(() => {
    const searchInput = document.querySelector("#users .fc-search-input");
    const statusSelect = document.getElementById("usersStatusFilter");
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value;
        searchTimeout = setTimeout(() => {
          console.log("🔍 Searching users:", searchTerm);
          loadUsers(1, searchTerm, statusSelect?.value || usersStatusFilter);
        }, 300);
      });
      console.log("✅ Users search setup complete");
    }
    statusSelect?.addEventListener("change", (e) => {
      const selectedStatus = e.target.value || "all";
      loadUsers(1, searchInput?.value || usersSearchTerm, selectedStatus);
    });
  }, 100);
  const addPlayerModal = document.getElementById("addPlayerModal");
  const addPlayerForm = document.getElementById("addPlayerForm");
  const savePlayerBtn = document.getElementById("savePlayerBtn");
  const openAddPlayerBtn = document.getElementById("openAddPlayerModal");
  const closeAddPlayerBtn = document.getElementById("closeAddPlayerModal");
  const cancelAddPlayerBtn = document.getElementById("cancelAddPlayer");
  const closeModal = () => {
    addPlayerModal?.classList.remove("active");
    addPlayerForm?.reset();
  };
  openAddPlayerBtn?.addEventListener("click", () => {
    addPlayerModal?.classList.add("active");
  });
  closeAddPlayerBtn?.addEventListener("click", closeModal);
  cancelAddPlayerBtn?.addEventListener("click", closeModal);
  savePlayerBtn?.addEventListener("click", async () => {
    const formData = new FormData(addPlayerForm);
    const data = Object.fromEntries(formData);
    savePlayerBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
    const res = await FC.admin.playersAdd(data);
    if (res.success) {
      showNotification("Player added successfully");
      closeModal();
      loadPlayers(1);
    } else {
      showNotification(res.error || "Failed to add player", "danger");
    }
    savePlayerBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Player';
  });
  const playersSearchInput = document.getElementById("playersSearchInput");
  const playersFilterPosition = document.getElementById(
    "playersFilterPosition",
  );
  const playersFilterRarity = document.getElementById("playersFilterRarity");
  const playersFilterLeague = document.getElementById("playersFilterLeague");
  const playersFilterMinOverall = document.getElementById(
    "playersFilterMinOverall",
  );
  const playersApplyFilters = document.getElementById("playersApplyFilters");
  const playersResetFilters = document.getElementById("playersResetFilters");
  const playersPagination = document.getElementById("playersPagination");
  let playerSearchTimeout;
  let currentPlayersPage = 1;
  let currentPlayersPages = 1;
  let currentPlayersTotal = 0;
  let currentPlayersById = new Map();
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function getPlayersFilters() {
    const filters = {};
    if (playersFilterPosition?.value)
      filters.position = playersFilterPosition.value;
    if (playersFilterRarity?.value) filters.rarity = playersFilterRarity.value;
    if (playersFilterLeague?.value) filters.league = playersFilterLeague.value;
    if (playersFilterMinOverall?.value)
      filters.min_overall = playersFilterMinOverall.value;
    return filters;
  }
  function getPlayerCardClass(rarity) {
    if (rarity === "icon") return "icon-rare";
    if (rarity === "common") return "silver-rare";
    return "gold-rare";
  }
  function renderPlayersPagination(page, pages, total) {
    if (!playersPagination) return;
    if (pages <= 1) {
      playersPagination.innerHTML = `<span class="fc-admin-pagination-summary">${total.toLocaleString()} players</span>`;
      return;
    }
    const items = [];
    const addPageButton = (
      targetPage,
      label = String(targetPage),
      active = false,
    ) => {
      items.push(
        `<button type="button" class="fc-admin-page-btn${active ? " active" : ""}" data-page="${targetPage}">${label}</button>`,
      );
    };
    addPageButton(Math.max(1, page - 1), "←");
    const visiblePages = new Set(
      [1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages),
    );
    const orderedPages = Array.from(visiblePages).sort((a, b) => a - b);
    orderedPages.forEach((pageNumber, index) => {
      const previous = orderedPages[index - 1];
      if (previous && pageNumber - previous > 1) {
        items.push('<span class="fc-admin-page-ellipsis">...</span>');
      }
      addPageButton(pageNumber, String(pageNumber), pageNumber === page);
    });
    addPageButton(Math.min(pages, page + 1), "→");
    items.push(
      `<span class="fc-admin-pagination-summary">Page ${page} / ${pages} · ${total.toLocaleString()} players</span>`,
    );
    playersPagination.innerHTML = items.join("");
    playersPagination.querySelectorAll("[data-page]").forEach((button) => {
      const targetPage = Number(button.getAttribute("data-page"));
      const isArrow = button.textContent === "←" || button.textContent === "→";
      if (
        (button.textContent === "←" && page <= 1) ||
        (button.textContent === "→" && page >= pages)
      ) {
        button.disabled = true;
        return;
      }
      if (!isArrow && targetPage === page) return;
      button.addEventListener("click", () => {
        if (targetPage !== page) loadPlayers(targetPage);
      });
    });
  }
  async function loadPlayers(page = 1) {
    currentPlayersPage = page;
    const search = playersSearchInput?.value.trim() || "";
    const params = {
      page: page,
      per_page: 20,
      search: search,
      ...getPlayersFilters(),
    };
    console.log("📋 Loading players...", params);
    const res = await FC.admin.playersList(params);
    console.log("✅ Players response:", res);
    if (!res.success) {
      console.error("❌ API Error:", res.error);
      showNotification(
        "Failed to load players: " + (res.error || "Unknown error"),
        "danger",
      );
      return;
    }
    const grid = document.querySelector(".fc-players-grid");
    if (!grid) {
      console.error("❌ Grid element not found");
      return;
    }
    grid.innerHTML = "";
    const players = res.data.players || [];
    currentPlayersPages = Number(res.data.pages || 1);
    currentPlayersTotal = Number(res.data.total || players.length);
    currentPlayersById = new Map(
      players.map((player) => [Number(player.id), player]),
    );
    if (!players.length) {
      grid.innerHTML =
        '<div class="col-12 text-center text-muted py-5">No players found for the selected search and filters.</div>';
      renderPlayersPagination(1, 1, 0);
      return;
    }
    players.forEach((p) => {
      const card = document.createElement("div");
      const imageSrc = p.image_url || "";
      const fallbackSrc = "";
      const cardClass = getPlayerCardClass(p.rarity);
      card.className = "col-12 col-md-6 col-xl-3 d-flex justify-content-center";
      card.innerHTML = `\n                <div class="fc-fut-card premium-shield ${cardClass} glow-hover mx-auto" data-player-id="${p.id}" style="position: relative; overflow: hidden;">\n                    <div class="fc-card-glare"></div>\n                    ${imageSrc ? `\n                        <div class="fc-admin-player-chip">\n                            <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(p.name)}" loading="lazy" referrerpolicy="no-referrer" class="fc-admin-player-chip-img" onerror="this.parentElement.style.display='none'">\n                            <span class="fc-admin-player-chip-badge">${escapeHtml(p.overall ?? 0)}</span>\n                        </div>\n                    ` : ""}\n                    <div class="fc-card-top" style="position: relative; z-index: 2;">\n                        <div class="fc-card-stats-left">\n                            <span class="fc-card-ovr">${p.overall ?? 0}</span>\n                            <span class="fc-card-pos">${escapeHtml(p.position || "--")}</span>\n                        </div>\n                    </div>\n                    <div class="fc-card-name" style="position: relative; z-index: 2;">${escapeHtml(p.name)}</div>\n                    <div style="position: relative; z-index: 2; text-align: center; font-size: 11px; color: rgba(0,0,0,0.75); margin-top: -2px;">\n                        ${escapeHtml(p.club || "Unknown Club")} · ${escapeHtml(p.league || "Unknown League")}\n                    </div>\n                    <div class="fc-card-attributes-premium" style="position: relative; z-index: 2;">\n                        <div class="row text-center px-2">\n                            <div class="col-6 border-end border-dark border-opacity-25 py-1">\n                                <div><span class="fc-attr-val">${p.pace ?? 0}</span> PAC</div>\n                                <div><span class="fc-attr-val">${p.shooting ?? 0}</span> SHO</div>\n                                <div><span class="fc-attr-val">${p.passing ?? 0}</span> PAS</div>\n                            </div>\n                            <div class="col-6 py-1">\n                                <div><span class="fc-attr-val">${p.dribbling ?? 0}</span> DRI</div>\n                                <div><span class="fc-attr-val">${p.defending ?? 0}</span> DEF</div>\n                                <div><span class="fc-attr-val">${p.physical ?? 0}</span> PHY</div>\n                            </div>\n                        </div>\n                    </div>\n                    <div class="fc-card-hover-actions">\n                        <button class="fc-btn-icon" onclick="editPlayer(${p.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>\n                        <button class="fc-btn-icon fc-text-red" onclick="deletePlayer(${p.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>\n                    </div>\n                </div>\n            `;
      grid.appendChild(card);
    });
    grid.querySelectorAll(".fc-admin-player-art").forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          const fallback = img.getAttribute("data-fallback-src");
          if (fallback && img.src !== fallback) {
            img.src = fallback;
          } else {
            img.style.display = "none";
          }
        },
        { once: true },
      );
    });
    renderPlayersPagination(
      currentPlayersPage,
      currentPlayersPages,
      currentPlayersTotal,
    );
  }
  window.editPlayer = async (playerId) => {
    console.log("🔍 Fetching player data for ID:", playerId);
    const player = currentPlayersById.get(Number(playerId));
    if (!player) {
      showNotification(
        "Player not found on this page. Refresh and try again.",
        "danger",
      );
      return;
    }
    const editModal = document.getElementById("editPlayerModal");
    document.getElementById("editPlayerId").value = player.id;
    document.getElementById("editPlayerName").value = player.name || "";
    document.getElementById("editPlayerOverall").value = player.overall || 0;
    document.getElementById("editPlayerPosition").value =
      player.position || "ST";
    document.getElementById("editPlayerRarity").value = player.rarity || "gold";
    document.getElementById("editPlayerNation").value = player.nation || "";
    document.getElementById("editPlayerClub").value = player.club || "";
    document.getElementById("editPlayerImage").value = player.image_url || "";
    document.getElementById("editPlayerPace").value = player.pace || 0;
    document.getElementById("editPlayerShooting").value = player.shooting || 0;
    document.getElementById("editPlayerPassing").value = player.passing || 0;
    document.getElementById("editPlayerDribbling").value =
      player.dribbling || 0;
    document.getElementById("editPlayerDefending").value =
      player.defending || 0;
    document.getElementById("editPlayerPhysical").value = player.physical || 0;
    console.log("📝 Form populated with player data");
    editModal?.classList.add("active");
  };
  window.deletePlayer = async (playerId) => {
    const confirmed = window.showAppConfirm
      ? await window.showAppConfirm({
          title: "Delete player",
          message: "Delete this player?",
          confirmText: "Delete",
        })
      : confirm("Delete this player?");
    if (!confirmed) return;
    const res = await FC.admin.playersDelete(playerId);
    if (res.success) {
      showNotification("✅ Player deleted");
      loadPlayers(currentPlayersPage);
    } else {
      showNotification(res.error || "Failed to delete player", "danger");
    }
  };
  const editPlayerModal = document.getElementById("editPlayerModal");
  const editPlayerForm = document.getElementById("editPlayerForm");
  const updatePlayerBtn = document.getElementById("updatePlayerBtn");
  const closeEditPlayerBtn = document.getElementById("closeEditPlayerModal");
  const cancelEditPlayerBtn = document.getElementById("cancelEditPlayer");
  const closeEditModal = () => {
    editPlayerModal?.classList.remove("active");
    editPlayerForm?.reset();
  };
  closeEditPlayerBtn?.addEventListener("click", closeEditModal);
  cancelEditPlayerBtn?.addEventListener("click", closeEditModal);
  updatePlayerBtn?.addEventListener("click", async () => {
    const formData = new FormData(editPlayerForm);
    const data = Object.fromEntries(formData);
    data.player_id = parseInt(data.player_id);
    data.overall = parseInt(data.overall);
    data.pace = parseInt(data.pace);
    data.shooting = parseInt(data.shooting);
    data.passing = parseInt(data.passing);
    data.dribbling = parseInt(data.dribbling);
    data.defending = parseInt(data.defending);
    data.physical = parseInt(data.physical);
    updatePlayerBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> Updating...';
    const res = await FC.admin.playersEdit(data);
    if (res.success) {
      showNotification("✅ Player updated successfully");
      closeEditModal();
      loadPlayers(currentPlayersPage);
    } else {
      showNotification(res.error || "Failed to update player", "danger");
    }
    updatePlayerBtn.innerHTML =
      '<i class="fa-solid fa-check"></i> Update Player';
  });
  if (playersSearchInput) {
    playersSearchInput.addEventListener("input", (e) => {
      clearTimeout(playerSearchTimeout);
      playerSearchTimeout = setTimeout(() => {
        loadPlayers(1);
      }, 300);
    });
    playersSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(playerSearchTimeout);
        loadPlayers(1);
      }
    });
  }
  playersApplyFilters?.addEventListener("click", () => loadPlayers(1));
  playersResetFilters?.addEventListener("click", () => {
    if (playersSearchInput) playersSearchInput.value = "";
    if (playersFilterPosition) playersFilterPosition.value = "";
    if (playersFilterRarity) playersFilterRarity.value = "";
    if (playersFilterLeague) playersFilterLeague.value = "";
    if (playersFilterMinOverall) playersFilterMinOverall.value = "";
    loadPlayers(1);
  });
  const announcementModal = document.getElementById("newAnnouncementModal");
  const openAnnBtn = document.getElementById("openNewAnnouncementModal");
  const closeAnnBtn = document.getElementById("closeNewAnnouncementModal");
  const cancelAnnBtn = document.getElementById("cancelNewAnnouncement");
  const postAnnBtn = document.getElementById("postAnnouncementBtn");
  openAnnBtn?.addEventListener("click", () => {
    announcementModal?.classList.add("active");
  });
  closeAnnBtn?.addEventListener("click", () => {
    announcementModal?.classList.remove("active");
  });
  cancelAnnBtn?.addEventListener("click", () => {
    announcementModal?.classList.remove("active");
  });
  announcementModal?.addEventListener("click", (e) => {
    if (e.target === announcementModal)
      announcementModal.classList.remove("active");
  });
  const categoryDropdown = document.getElementById("announcementCategory");
  const categoryText = document.getElementById("categoryText");
  const categoryIcon = document.getElementById("categoryIcon");
  categoryDropdown?.addEventListener("change", (e) => {
    const categoryMap = {
      "fa-server": { text: "Server & Maintenance", icon: "fa-server" },
      "fa-trophy": { text: "Events & Promos", icon: "fa-trophy" },
      "fa-gamepad": { text: "Gameplay Updates", icon: "fa-gamepad" },
    };
    const selected = categoryMap[e.target.value];
    if (categoryText) categoryText.textContent = selected.text;
    if (categoryIcon) {
      categoryIcon.className = `fa-solid ${selected.icon}`;
    }
  });
  postAnnBtn?.addEventListener("click", async () => {
    const title =
      document.getElementById("announcementTitle")?.value?.trim() || "";
    const content =
      document.getElementById("announcementBody")?.value?.trim() || "";
    if (!title || !content)
      return showNotification("Fill in all fields", "danger");
    postAnnBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> Posting...';
    const res = await FC.admin.announcementsAdd(title, content);
    if (res.success) {
      showNotification("✅ Announcement posted", "success");
      announcementModal?.classList.remove("active");
      document.getElementById("newAnnouncementForm")?.reset();
      loadCommunity();
    } else {
      showNotification(res.error || "Failed to post announcement", "danger");
    }
    postAnnBtn.innerHTML = "Post Announcement";
  });
  let currentCommunityFilter = "all";
  const feedFilterBtns = document.querySelectorAll(".fc-feed-filters button");
  feedFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.textContent.includes("All Posts")) {
        currentCommunityFilter = "all";
      } else if (btn.textContent.includes("Reported")) {
        currentCommunityFilter = "reported";
      } else if (btn.textContent.includes("Announcements")) {
        currentCommunityFilter = "announcements";
      }
      loadCommunityWithFilter(currentCommunityFilter);
    });
  });
  async function loadCommunityWithFilter(filter = "all") {
    try {
      let res;
      if (filter === "reported") {
        res = await FC.admin.communityReportsList({
          page: 1,
          per_page: 1e3,
          status: "open",
        });
        if (res.success) {
          renderCommunityPosts(res.data?.posts || []);
        } else {
          showNotification("Failed to load reported posts", "danger");
        }
      } else if (filter === "announcements") {
        res = await FC.admin.communityPostsList({ page: 1, per_page: 1e3 });
        if (res.success) {
          const allPosts = res.data?.posts || [];
          const announcements = allPosts.filter(
            (p) => p.category === "announcement",
          );
          renderCommunityPosts(announcements);
        } else {
          showNotification("Failed to load announcements", "danger");
        }
      } else {
        res = await FC.admin.communityPostsList({ page: 1, per_page: 1e3 });
        if (res.success) {
          const allPosts = res.data?.posts || [];
          const announcements = allPosts.filter(
            (p) => p.category === "announcement",
          );
          const regularPosts = allPosts.filter(
            (p) => p.category !== "announcement",
          );
          renderCommunityPosts([...announcements, ...regularPosts]);
        } else {
          showNotification("Failed to load community posts", "danger");
        }
      }
    } catch (err) {
      console.error("❌ Error loading filtered community posts:", err);
      showNotification("Error loading posts", "danger");
    }
  }
  async function updateReportedCountBadge() {
    try {
      const res = await FC.admin.communityReportsList({
        page: 1,
        per_page: 1,
        status: "open",
      });
      if (res.success && res.data?.pagination) {
        const reportCount = res.data.pagination.total || 0;
        const reportedBtn = Array.from(feedFilterBtns).find((btn) =>
          btn.textContent.includes("Reported"),
        );
        if (reportedBtn) {
          let badge = reportedBtn.querySelector(".badge");
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "badge bg-danger ms-1";
            reportedBtn.appendChild(badge);
          }
          badge.textContent = reportCount;
        }
      }
    } catch (err) {
      console.error("Error updating report count:", err);
    }
  }
  async function loadLiveFeed() {
    try {
      const container = document.getElementById("liveFeedContainer");
      if (!container) return;
      let posts = [];
      let users = [];
      try {
        const postsRes = await FC.admin.communityPostsList({
          page: 1,
          per_page: 5,
        });
        if (postsRes?.success) {
          posts = postsRes.data?.posts || [];
          console.log("✅ Loaded community posts:", posts.length);
        }
      } catch (e) {
        console.warn("⚠️ Could not fetch posts for live feed:", e);
      }
      try {
        const usersRes = await FC.admin.usersList({ page: 1, per_page: 5 });
        if (usersRes?.success) {
          users = usersRes.data?.users || [];
          console.log("✅ Loaded users:", users.length);
        }
      } catch (e) {
        console.warn("⚠️ Could not fetch users for live feed:", e);
      }
      const events = [];
      posts.forEach((post) => {
        events.push({
          type: "post",
          icon: "message",
          iconClass: "text-info",
          timestamp: post.created_at,
          message: `<strong>${post.username}</strong> posted in <em>${post.category || "General"}</em>`,
          priority: 2,
        });
      });
      users.forEach((user) => {
        events.push({
          type: "user",
          icon: "user-plus",
          iconClass: "text-success",
          timestamp: user.created_at || new Date(),
          message: `<strong>${user.username}</strong> created an account`,
          priority: 1,
        });
      });
      events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      let html = "";
      if (events.length === 0) {
        html =
          '<div class="text-muted text-center py-3" style="font-size: 13px;">📭 No activity yet</div>';
      } else {
        events.slice(0, 8).forEach((event) => {
          const timeAgo = getTimeAgo(new Date(event.timestamp));
          html += `\n                        <div class="fc-timeline-item" style="animation: slideInTimeline 0.4s ease;">\n                            <div class="fc-t-icon ${event.iconClass}">\n                                <i class="fa-solid fa-${event.icon}"></i>\n                            </div>\n                            <div class="fc-t-content">\n                                <p>${event.message}</p>\n                                <small>${timeAgo}</small>\n                            </div>\n                        </div>\n                    `;
        });
      }
      container.innerHTML = html;
      console.log(`📊 Live feed updated with ${events.length} real events`);
    } catch (err) {
      console.error("❌ Error loading live feed:", err);
    }
  }
  async function loadCommunity(page = 1) {
    console.log("📢 Loading community posts...");
    try {
      const res = await FC.admin.communityPostsList({ page: 1, per_page: 1e3 });
      console.log("✅ Community posts response:", res);
      if (!res.success) {
        console.error("❌ API Error:", res.error);
        showNotification(`Failed: ${res.error}`, "danger");
        return;
      }
      const posts = res.data?.posts || [];
      console.log("📢 Posts loaded:", posts.length);
      const announcements = posts.filter((p) => p.category === "announcement");
      const regularPosts = posts.filter((p) => p.category !== "announcement");
      renderCommunityPosts([...announcements, ...regularPosts]);
      await updateReportedCountBadge();
    } catch (err) {
      console.error("❌ Error loading community posts:", err);
      showNotification("Error loading community posts", "danger");
    }
  }
  function renderCommunityPosts(posts) {
    const feedContainer = document.querySelector(".fc-community-feed");
    if (!feedContainer) {
      console.error("❌ .fc-community-feed not found");
      return;
    }
    feedContainer.innerHTML = "";
    if (!posts || posts.length === 0) {
      feedContainer.innerHTML =
        '<div class="alert alert-info w-100">No community posts yet</div>';
      return;
    }
    posts.forEach((post) => {
      const postEl = createPostElement(post);
      feedContainer.appendChild(postEl);
    });
  }
  function createPostElement(post) {
    const postDiv = document.createElement("div");
    const createdDate = new Date(post.created_at);
    const timeAgo = getTimeAgo(createdDate);
    const isAnnouncement = post.category === "announcement";
    const contentMatch = isAnnouncement
      ? post.content.match(/<strong>(.*?)<\/strong>\n\n([\s\S]*)/)
      : null;
    const title = contentMatch
      ? contentMatch[1]
      : isAnnouncement
        ? "Announcement"
        : null;
    const bodyText = contentMatch ? contentMatch[2] : post.content;
    const avatarBg = isAnnouncement ? "0dcaf0" : "1a1d27";
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.username)}&background=${avatarBg}&color=fff&rounded=true&bold=true`;
    postDiv.className = "glass-bento-card";
    postDiv.dataset.postId = post.id;
    const categoryLabel = post.category
      ? post.category.charAt(0).toUpperCase() + post.category.slice(1)
      : "General";
    postDiv.innerHTML = `\n            \x3c!-- Post Header --\x3e\n            <div class="card-header-post">\n                <div class="author-meta">\n                    <div class="author-avatar">\n                        <img src="${avatarUrl}" alt="${post.username}" />\n                    </div>\n                    <div class="author-info">\n                        <div class="author-name">${post.username}</div>\n                        <div class="post-timestamp">${timeAgo}</div>\n                    </div>\n                </div>\n                <div class="post-header-right">\n                    <span style="color: rgba(255, 255, 255, 0.6); font-size: 14px; font-weight: 500; margin-right: 12px; display: flex; align-items: center; gap: 6px;">\n                        ${isAnnouncement ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 3l8 4v5c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V7l8-4z"></path></svg>' : ""}\n                        ${categoryLabel}\n                    </span>\n                    <div class="post-options-container">\n                        <button class="post-menu-btn" title="More options">⋯</button>\n                        <div class="post-dropdown-menu">\n                            <button class="dropdown-item" onclick="deletePost(${post.id})">\n                                <i class="fa-solid fa-trash"></i> Delete\n                            </button>\n                            <button class="dropdown-item" onclick="editPost(${post.id})">\n                                <i class="fa-solid fa-edit"></i> Edit\n                            </button>\n                            <button class="dropdown-item danger" onclick="flagPost(${post.id})">\n                                <i class="fa-solid fa-flag"></i> Flag Post\n                            </button>\n                        </div>\n                    </div>\n                </div>\n            </div>\n\n            \x3c!-- Post Body --\x3e\n            <div class="card-body-post">\n                <p>${bodyText?.replace(/\n/g, "<br>") || post.content}</p>\n                ${post.image_url ? `<img src="${post.image_url}" style="width: 100%; border-radius: 12px; margin-top: 16px; border: 1px solid rgba(255, 255, 255, 0.06);" alt="post image" onerror="this.style.display='none'">` : ""}\n            </div>\n\n            \x3c!-- Post Actions --\x3e\n            <div class="card-actions-post">\n                <div class="actions-left">\n                    <div class="voting-actions">\n                        <button class="vote-btn flame-btn" title="Like" onclick="likePost(${post.id}, this)">\n                            <svg class="flame-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">\n                                <path d="M12 2C12 2 5 8 5 14C5 18 8 22 12 22C16 22 19 18 19 14C19 8 12 2 12 2ZM12 18C10.5 18 9.5 16.5 9.5 15C9.5 13.5 12 10 12 10C12 10 14.5 13.5 14.5 15C14.5 16.5 13.5 18 12 18Z" />\n                            </svg>\n                        </button>\n                        <span class="vote-count">${post.likes_count || 0}</span>\n                    </div>\n                    <button class="ghost-button">\n                        <i class="fa-solid fa-comment"></i>\n                        ${post.comment_count || 0} Comments\n                    </button>\n                </div>\n            </div>\n\n            \x3c!-- Comments Section - Always Visible --\x3e\n            ${renderCommentsBlockNew(post.comments)}\n        `;
    return postDiv;
  }
  function renderCommentsBlockNew(comments) {
    if (!comments || comments.length === 0) {
      return `<div class="comments-section">\n                <div class="new-comment-row" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.06); display: flex; align-items: center; gap: 12px;">\n                    <img src="https://ui-avatars.com/api/?name=Admin&background=d4af37&color=000&rounded=true&size=32" alt="Admin" style="width: 32px; height: 32px; border-radius: 50%;" />\n                    <input type="text" class="new-comment-input" placeholder="Add a comment..." style="flex: 1; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 20px; color: #f0f0f2; padding: 8px 16px; font-family: inherit; font-size: 13px; outline: none;" />\n                    <button class="comment-submit-btn" style="background: none; border: none; color: rgba(255, 255, 255, 0.5); cursor: pointer; font-size: 18px; transition: color 0.2s;">\n                        <i class="fa-solid fa-paper-plane"></i>\n                    </button>\n                </div>\n            </div>`;
    }
    let html = `<div class="comments-section">`;
    comments.forEach((comment) => {
      const commentTimeAgo = getTimeAgo(new Date(comment.created_at));
      const cAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.username)}&background=1a1d27&color=fff&rounded=true&size=34`;
      html += `\n                <div class="comment-item">\n                    <div class="comment-avatar">\n                        <img src="${cAvatar}" alt="${comment.username}" />\n                    </div>\n                    <div class="comment-content">\n                        <div class="comment-bubble">\n                            <span class="comment-author">${comment.username}</span>\n                            <p class="comment-body">${comment.content}</p>\n                        </div>\n                        <div class="comment-meta">\n                            <span>${commentTimeAgo}</span>\n                            <button class="comment-like-btn">Like</button>\n                            <button class="comment-reply-toggle">Reply</button>\n                            <button class="comment-like-btn danger" onclick="deleteComment(${comment.id})" style="color:#ff6b6b;">Delete</button>\n                        </div>\n                    </div>\n                </div>\n            `;
    });
    html += `\n            <div class="new-comment-row" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.06); display: flex; align-items: center; gap: 12px;">\n                <img src="https://ui-avatars.com/api/?name=Admin&background=d4af37&color=000&rounded=true&size=32" alt="Admin" style="width: 32px; height: 32px; border-radius: 50%;" />\n                <input type="text" class="new-comment-input" placeholder="Add a comment..." style="flex: 1; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 20px; color: #f0f0f2; padding: 8px 16px; font-family: inherit; font-size: 13px; outline: none;" />\n                <button class="comment-submit-btn" style="background: none; border: none; color: rgba(255, 255, 255, 0.5); cursor: pointer; font-size: 18px; transition: color 0.2s;">\n                    <i class="fa-solid fa-paper-plane"></i>\n                </button>\n            </div>\n        `;
    html += `</div>`;
    return html;
  }
  function toggleComments(btn) {
    const card = btn.closest(".glass-bento-card");
    const commentsSection = card.querySelector(".comments-section");
    if (commentsSection) {
      commentsSection.style.display =
        commentsSection.style.display === "none" ? "flex" : "none";
      btn.classList.toggle("active");
    }
  }
  function editPost(postId) {
    showNotification("Edit functionality coming soon", "info");
  }
  function flagPost(postId) {
    showNotification("Post flagged for review", "warning");
  }
  window.likePost = async (postId, btn) => {
    try {
      const response = await FC.admin.communityPostsLike(postId);
      if (!response.success) {
        console.error("Failed to like post:", response.error);
        showNotification(`Failed to like post: ${response.error}`, "danger");
        return;
      }
      btn.classList.toggle("active");
      const countSpan = btn
        .closest(".voting-actions")
        .querySelector(".vote-count");
      countSpan.textContent = response.data?.likes || 0;
      console.log("✅ Post liked:", {
        liked: response.data?.liked,
        likes: response.data?.likes,
      });
    } catch (error) {
      console.error("Error liking post:", error);
      showNotification("Error liking post", "danger");
    }
  };
  function getTimeAgo(date) {
    if (typeof date === "string") {
      date = new Date(date);
    }
    if (!(date instanceof Date) || isNaN(date)) {
      return "just now";
    }
    const now = new Date();
    const seconds = Math.floor((now - date) / 1e3);
    if (seconds < 30) return "just now";
    let interval = seconds / 60;
    if (interval < 1) return Math.floor(seconds) + " seconds ago";
    if (interval < 2) return "1 minute ago";
    if (interval < 60) return Math.floor(interval) + " minutes ago";
    interval = seconds / 3600;
    if (interval < 1) return Math.floor(seconds / 60) + " minutes ago";
    if (interval < 2) return "1 hour ago";
    if (interval < 24) return Math.floor(interval) + " hours ago";
    interval = seconds / 86400;
    if (interval < 1) return Math.floor(seconds / 3600) + " hours ago";
    if (interval < 2) return "1 day ago";
    if (interval < 7) return Math.floor(interval) + " days ago";
    interval = seconds / 604800;
    if (interval < 1) return Math.floor(seconds / 86400) + " days ago";
    if (interval < 2) return "1 week ago";
    if (interval < 4) return Math.floor(interval) + " weeks ago";
    interval = seconds / 2629800;
    if (interval < 1) return Math.floor(seconds / 604800) + " weeks ago";
    if (interval < 2) return "1 month ago";
    return Math.floor(interval) + " months ago";
  }
  window.deletePost = async (postId) => {
    const confirmed = window.showAppConfirm
      ? await window.showAppConfirm({
          title: "Delete post",
          message: "Are you sure you want to delete this post?",
          confirmText: "Delete post",
        })
      : confirm("Are you sure you want to delete this post?");
    if (!confirmed) return;
    const res = await FC.admin.communityPostsDelete(postId);
    if (res.success) {
      showNotification("✅ Post deleted", "success");
      loadCommunity();
    } else {
      showNotification(res.error || "Failed to delete post", "danger");
    }
  };
  window.deleteComment = async (commentId) => {
    const confirmed = window.showAppConfirm
      ? await window.showAppConfirm({
          title: "Delete comment",
          message: "Are you sure you want to delete this comment?",
          confirmText: "Delete comment",
        })
      : confirm("Are you sure you want to delete this comment?");
    if (!confirmed) return;
    const res = await FC.admin.communityCommentsDelete(commentId);
    if (res.success) {
      showNotification("✅ Comment deleted", "success");
      loadCommunity();
    } else {
      showNotification(res.error || "Failed to delete comment", "danger");
    }
  };
  window.filterCommunityPosts = (filter) => {
    const filterBtns = document.querySelectorAll(".glass-pill");
    filterBtns.forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");
    loadCommunityWithFilter(filter);
  };
  function attachPostEventListeners() {
    document.querySelectorAll(".post-menu-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const menu = btn.nextElementSibling;
        if (menu && menu.classList.contains("post-dropdown-menu")) {
          document.querySelectorAll(".post-dropdown-menu.show").forEach((m) => {
            if (m !== menu) m.classList.remove("show");
          });
          menu.classList.toggle("show");
        }
      });
    });
    document.querySelectorAll(".new-comment-row").forEach((row) => {
      const input = row.querySelector(".new-comment-input");
      const submitBtn = row.querySelector(".comment-submit-btn");
      if (input && submitBtn) {
        const user = JSON.parse(localStorage.getItem("fc_user") || "{}");
        const adminName = user.username || "Admin";
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=d4af37&color=000&rounded=true&size=34`;
        submitBtn.addEventListener("click", async () => {
          if (input.value.trim()) {
            const commentText = input.value.trim();
            submitBtn.disabled = true;
            const originalColor = submitBtn.style.color;
            submitBtn.style.color = "rgba(255, 255, 255, 0.3)";
            try {
              const postContainer = row.closest(".glass-bento-card");
              const postId = postContainer?.dataset.postId;
              if (!postId) {
                console.error("Post ID not found on container");
                showNotification("Error: Could not find post", "danger");
                submitBtn.disabled = false;
                submitBtn.style.color = originalColor;
                return;
              }
              const response = await FC.admin.communityCommentsCreate(
                postId,
                commentText,
              );
              if (!response.success) {
                console.error("Failed to save comment:", response.error);
                showNotification(
                  `❌ Failed to post comment: ${response.error || "Unknown error"}`,
                  "danger",
                );
                submitBtn.disabled = false;
                submitBtn.style.color = originalColor;
                return;
              }
              const commentHTML = `\n                                <div class="comment-item" style="animation: slideInComment 0.3s ease;">\n                                    <div class="comment-avatar">\n                                        <img src="${avatarUrl}" alt="${adminName}" />\n                                    </div>\n                                    <div class="comment-content">\n                                        <div class="comment-bubble">\n                                            <span class="comment-author">${adminName}</span>\n                                            <p class="comment-body">${commentText}</p>\n                                        </div>\n                                        <div class="comment-meta">\n                                            <span>just now</span>\n                                            <button class="comment-like-btn">Like</button>\n                                            <button class="comment-reply-toggle">Reply</button>\n                                            <button class="comment-like-btn danger" style="color:#ff6b6b;">Delete</button>\n                                        </div>\n                                    </div>\n                                </div>\n                            `;
              row.insertAdjacentHTML("beforebegin", commentHTML);
              attachCommentEventListeners();
              showNotification("✅ Comment posted successfully", "success");
              input.value = "";
            } catch (error) {
              console.error("Error posting comment:", error);
              showNotification("❌ Error posting comment", "danger");
            } finally {
              submitBtn.disabled = false;
              submitBtn.style.color = originalColor;
            }
          }
        });
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter" && input.value.trim()) {
            submitBtn.click();
          }
        });
        input.addEventListener("focus", () => {
          submitBtn.style.color = "rgba(255, 255, 255, 0.8)";
        });
        input.addEventListener("blur", () => {
          submitBtn.style.color = "rgba(255, 255, 255, 0.5)";
        });
      }
    });
    document.querySelectorAll(".comment-reply-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        btn.classList.toggle("active");
        showNotification("Reply functionality available", "info");
      });
    });
    document.querySelectorAll(".comment-like-btn").forEach((btn) => {
      if (!btn.classList.contains("danger")) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          btn.style.color = "var(--coral)";
          setTimeout(() => {
            btn.style.color = "var(--text-muted)";
          }, 300);
        });
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".post-options-container")) {
        document.querySelectorAll(".post-dropdown-menu.show").forEach((m) => {
          m.classList.remove("show");
        });
      }
    });
  }
  function attachCommentEventListeners() {
    document.querySelectorAll(".comment-reply-toggle").forEach((btn) => {
      if (!btn.dataset.listenerAttached) {
        btn.dataset.listenerAttached = "true";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          btn.classList.toggle("active");
          showNotification("Reply functionality available", "info");
        });
      }
    });
    document.querySelectorAll(".comment-like-btn").forEach((btn) => {
      if (!btn.classList.contains("danger") && !btn.dataset.listenerAttached) {
        btn.dataset.listenerAttached = "true";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          btn.style.color = "var(--coral)";
          setTimeout(() => {
            btn.style.color = "var(--text-muted)";
          }, 300);
        });
      }
    });
  }
  const originalRenderCommunityPosts = renderCommunityPosts;
  renderCommunityPosts = function (posts) {
    originalRenderCommunityPosts(posts);
    setTimeout(() => attachPostEventListeners(), 100);
  };
  async function refreshPendingReportsStat() {
    const statEl = document.getElementById("stat-pending-reports");
    if (!statEl) return;
    try {
      const countRes = await FC.admin.communityReportsList({
        page: 1,
        per_page: 1,
        status: "open",
      });
      if (countRes?.success) {
        const total = countRes.data?.pagination?.total || 0;
        statEl.textContent = Number(total).toLocaleString();
      }
    } catch (err) {
      console.error("Could not refresh pending report stat:", err);
    }
  }
  async function loadReports(page = 1) {
    const tbody =
      document.getElementById("reportsTableBody") ||
      document.querySelector("#reports tbody");
    if (!tbody) return;
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center text-muted py-4">Loading moderation queue...</td></tr>';
    let res;
    try {
      res = await FC.admin.communityReportsList({
        page: page,
        per_page: 25,
        status: "open",
      });
    } catch (err) {
      console.error("loadReports network error:", err);
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-danger py-4">Failed to load reports.</td></tr>';
      showNotification("Failed to load reports", "danger");
      return;
    }
    if (!res.success) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-danger py-4">Failed to load reports.</td></tr>';
      showNotification(res.error || "Failed to load reports", "danger");
      return;
    }
    const reports = res.data?.posts || [];
    if (!reports.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-4">No open reports right now.</td></tr>';
      await refreshPendingReportsStat();
      return;
    }
    tbody.innerHTML = "";
    reports.forEach((reportPost) => {
      const content = reportPost.content || "";
      const shortContent =
        content.length > 140 ? `${content.slice(0, 140)}...` : content;
      const reason = reportPost.report_reason || "Content reported by users";
      const reporter =
        reportPost.reporter_username ||
        (reportPost.report_count
          ? `${reportPost.report_count} user(s)`
          : "User");
      const banUserButton = isAdmin
        ? `<button class="fc-btn fc-btn-danger fc-btn-sm report-ban-btn" data-user-id="${reportPost.user_id}" title="Ban User" style="font-size: 11px;">BAN USER</button>`
        : "";
      const row = document.createElement("tr");
      if ((reportPost.report_count || 0) >= 3) {
        row.classList.add("fc-priority-high");
      }
      row.innerHTML = `\n                <td>${escapeHtml(shortContent)}</td>\n                <td><span class="fc-tag comment">Post</span></td>\n                <td><span class="fc-text-red">${escapeHtml(reason)}</span></td>\n                <td>${escapeHtml(reporter)}</td>\n                <td>\n                    <div class="fc-action-btns">\n                        <button class="fc-btn-icon report-dismiss-btn" data-post-id="${reportPost.id}" title="Dismiss Report"><i class="fa-solid fa-check"></i></button>\n                        <button class="fc-btn-icon fc-text-red report-delete-btn" data-post-id="${reportPost.id}" title="Delete Post"><i class="fa-solid fa-trash"></i></button>\n                        ${banUserButton}\n                    </div>\n                </td>\n            `;
      tbody.appendChild(row);
    });
    tbody.querySelectorAll(".report-dismiss-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const postId = Number(btn.getAttribute("data-post-id"));
        if (!postId) return;
        const confirmed = window.showAppConfirm
          ? await window.showAppConfirm({
              title: "Dismiss report",
              message: "Dismiss this report and keep the post live?",
              confirmText: "Dismiss",
            })
          : confirm("Dismiss this report and keep the post live?");
        if (!confirmed) return;
        btn.disabled = true;
        const resDismiss = await FC.admin.communityReportsResolve(
          postId,
          "dismiss",
        );
        if (resDismiss.success) {
          showNotification("Report dismissed", "success");
          await loadReports(page);
        } else {
          showNotification(
            resDismiss.error || "Failed to dismiss report",
            "danger",
          );
        }
        await refreshPendingReportsStat();
        btn.disabled = false;
      });
    });
    tbody.querySelectorAll(".report-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const postId = Number(btn.getAttribute("data-post-id"));
        if (!postId) return;
        const confirmed = window.showAppConfirm
          ? await window.showAppConfirm({
              title: "Delete reported post",
              message: "Delete this post and resolve its reports?",
              confirmText: "Delete post",
            })
          : confirm("Delete this post and resolve its reports?");
        if (!confirmed) return;
        btn.disabled = true;
        const resDelete = await FC.admin.communityReportsResolve(
          postId,
          "delete",
        );
        if (resDelete.success) {
          showNotification("Post deleted and report resolved", "success");
          await loadReports(page);
        } else {
          showNotification(
            resDelete.error || "Failed to delete post",
            "danger",
          );
        }
        await refreshPendingReportsStat();
        btn.disabled = false;
      });
    });
    if (isAdmin) {
      tbody.querySelectorAll(".report-ban-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const userId = Number(btn.getAttribute("data-user-id"));
          if (!userId) return;
          const confirmed = window.showAppConfirm
            ? await window.showAppConfirm({
                title: "Ban user",
                message: "Ban the user who created this post?",
                confirmText: "Ban user",
              })
            : confirm("Ban the user who created this post?");
          if (!confirmed) return;
          btn.disabled = true;
          const resBan = await FC.admin.usersBan(userId);
          if (resBan.success) {
            showNotification("User banned successfully", "success");
          } else {
            showNotification(resBan.error || "Failed to ban user", "danger");
          }
          btn.disabled = false;
        });
      });
    }
    await refreshPendingReportsStat();
  }
  const logoutBtn = document.querySelector(".logout-btn");
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("fc_user");
    window.location.href = "/frontend/views/home/index.html";
  });
  const themeToggle = document.getElementById("themeToggle");
  themeToggle?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
    }
  });
  window.refreshDashboard = loadDashboard;
  window.refreshUsers = loadUsers;
  console.log("🎯 Initializing dashboard view...");
  switchPage(activePageId);
  console.log("✅ Admin panel ready!");
});

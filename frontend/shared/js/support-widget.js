(function () {
  "use strict";
  const fab = document.getElementById("support-fab");
  const panel = document.getElementById("support-panel");
  const closeBtn = document.getElementById("support-close");
  const ticketSelect = document.getElementById("support-ticket-select");
  const newTicketBtn = document.getElementById("support-new-ticket-btn");
  const createForm = document.getElementById("support-create-form");
  const subjectInput = document.getElementById("support-subject");
  const firstMessageInput = document.getElementById("support-first-message");
  const messagesEl = document.getElementById("support-messages");
  const replyForm = document.getElementById("support-reply-form");
  const replyInput = document.getElementById("support-reply-input");
  const replySubmitBtn = replyForm
    ? replyForm.querySelector('button[type="submit"]')
    : null;
  if (
    !fab ||
    !panel ||
    !closeBtn ||
    !ticketSelect ||
    !createForm ||
    !messagesEl ||
    !replyForm ||
    !replyInput
  ) {
    return;
  }
  let tickets = [];
  let activeTicketId = null;
  let panelOpen = false;
  let refreshTimer = null;
  let lastRenderedMessageId = 0;
  let keepCreateMode = false;
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function formatTime(raw) {
    if (!raw) return "";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  }
  function setPanelOpen(open) {
    panelOpen = open;
    panel.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      loadTickets();
      startLiveRefresh();
    } else {
      stopLiveRefresh();
    }
  }
  function startLiveRefresh() {
    stopLiveRefresh();
    refreshTimer = setInterval(async () => {
      if (!panelOpen) return;
      await liveRefresh();
    }, 2500);
  }
  function stopLiveRefresh() {
    if (!refreshTimer) return;
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  function setCreateMode(enabled) {
    createForm.style.display = enabled ? "flex" : "none";
    replyForm.style.display = enabled ? "none" : "flex";
    if (enabled) {
      setTimeout(() => subjectInput.focus(), 50);
    } else {
      setTimeout(() => replyInput.focus(), 50);
    }
  }
  function renderCreateModeHint(text) {
    messagesEl.innerHTML = `<div class="support-msg system"><p>${escapeHtml(text)}</p></div>`;
  }
  function setReplyEnabled(enabled) {
    replyInput.disabled = !enabled;
    if (replySubmitBtn) replySubmitBtn.disabled = !enabled;
  }
  function appendMessageBubble(message) {
    const role =
      message.sender_role === "admin"
        ? "admin"
        : message.sender_role === "system"
          ? "system"
          : "user";
    const wrap = document.createElement("div");
    wrap.className = `support-msg ${role}`;
    wrap.innerHTML = `\n            <p>${escapeHtml(message.message || "")}</p>\n            <span>${escapeHtml(message.sender_name || (role === "admin" ? "Support" : "You"))} · ${escapeHtml(formatTime(message.created_at))}</span>\n        `;
    messagesEl.appendChild(wrap);
  }
  function renderMessages(messages) {
    messagesEl.innerHTML = "";
    if (!messages || !messages.length) {
      messagesEl.innerHTML = `\n                <div class="support-msg system">\n                    <p>No replies yet. Send a message and support will respond shortly.</p>\n                </div>\n            `;
      return;
    }
    messages.forEach(appendMessageBubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    const last = messages[messages.length - 1];
    lastRenderedMessageId = Number(last?.id || 0);
  }
  function renderTicketOptions() {
    const options = ['<option value="">Choose ticket...</option>'];
    tickets.forEach((ticket) => {
      const label = `#TK-${ticket.id} - ${ticket.subject} (${ticket.status})`;
      options.push(
        `<option value="${ticket.id}">${escapeHtml(label)}</option>`,
      );
    });
    ticketSelect.innerHTML = options.join("");
    if (activeTicketId) {
      ticketSelect.value = String(activeTicketId);
    }
  }
  async function loadTicketDetail(ticketId) {
    const res = await FC.support.myDetail(ticketId);
    if (!res?.success) {
      messagesEl.innerHTML =
        '<div class="support-msg system"><p>Failed to load ticket conversation.</p></div>';
      return;
    }
    const ticket = res.data?.ticket;
    activeTicketId = ticket ? Number(ticket.id) : Number(ticketId);
    renderMessages(res.data?.messages || []);
    if (ticket && ticket.status === "closed") {
      replyInput.placeholder =
        "Ticket is closed. Create a new ticket for another issue.";
      setReplyEnabled(false);
    } else {
      replyInput.placeholder = "Write your message to support...";
      setReplyEnabled(true);
    }
    setCreateMode(false);
  }
  async function liveRefresh() {
    if (!activeTicketId) {
      const listRes = await FC.support.myList();
      if (listRes?.success) {
        tickets = Array.isArray(listRes.data?.tickets)
          ? listRes.data.tickets
          : [];
        const selected = ticketSelect.value;
        renderTicketOptions();
        if (selected) {
          ticketSelect.value = selected;
        }
      }
      return;
    }
    const detailRes = await FC.support.myDetail(activeTicketId);
    if (detailRes?.success) {
      const messages = detailRes.data?.messages || [];
      const newestId = Number(messages[messages.length - 1]?.id || 0);
      if (newestId !== lastRenderedMessageId) {
        renderMessages(messages);
      }
      const ticket = detailRes.data?.ticket;
      if (ticket && ticket.status === "closed") {
        replyInput.placeholder =
          "Ticket is closed. Create a new ticket for another issue.";
        setReplyEnabled(false);
      } else {
        replyInput.placeholder = "Write your message to support...";
        setReplyEnabled(true);
      }
    }
    const listRes = await FC.support.myList();
    if (listRes?.success) {
      tickets = Array.isArray(listRes.data?.tickets)
        ? listRes.data.tickets
        : [];
      const selected = ticketSelect.value;
      renderTicketOptions();
      if (selected) {
        ticketSelect.value = selected;
      }
    }
  }
  async function loadTickets() {
    try {
      const res = await FC.support.myList();
      if (!res?.success) {
        ticketSelect.innerHTML =
          '<option value="">Unable to load tickets</option>';
        setCreateMode(true);
        keepCreateMode = true;
        renderCreateModeHint(
          "Unable to load tickets right now. You can still create a new one.",
        );
        return;
      }
      tickets = Array.isArray(res.data?.tickets) ? res.data.tickets : [];
      renderTicketOptions();
      if (!tickets.length) {
        activeTicketId = null;
        setCreateMode(true);
        setReplyEnabled(false);
        keepCreateMode = true;
        renderCreateModeHint("No tickets yet. Create one to contact support.");
        return;
      }
      if (keepCreateMode && !activeTicketId) {
        setCreateMode(true);
        setReplyEnabled(false);
        renderCreateModeHint(
          "Create a new ticket and support will reply here.",
        );
        return;
      }
      const targetId = activeTicketId || Number(tickets[0].id);
      ticketSelect.value = String(targetId);
      await loadTicketDetail(targetId);
    } catch (err) {
      console.error("Support widget loadTickets failed:", err);
      ticketSelect.innerHTML = '<option value="">Support unavailable</option>';
      setCreateMode(true);
      setReplyEnabled(false);
      keepCreateMode = true;
      renderCreateModeHint(
        "Support is currently unavailable. Try again later.",
      );
    }
  }
  fab.addEventListener("click", () => setPanelOpen(true));
  closeBtn.addEventListener("click", () => setPanelOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setPanelOpen(false);
    }
  });
  newTicketBtn.addEventListener("click", () => {
    activeTicketId = null;
    keepCreateMode = true;
    ticketSelect.value = "";
    setCreateMode(true);
    setReplyEnabled(false);
    renderCreateModeHint("Create a new ticket and support will reply here.");
  });
  ticketSelect.addEventListener("change", async (e) => {
    const ticketId = Number(e.target.value || 0);
    if (!ticketId) {
      activeTicketId = null;
      keepCreateMode = true;
      setCreateMode(true);
      setReplyEnabled(false);
      renderCreateModeHint(
        "Choose a ticket to continue an existing conversation, or create a new ticket.",
      );
      return;
    }
    keepCreateMode = false;
    await loadTicketDetail(ticketId);
  });
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const subject = (subjectInput.value || "").trim();
    const message = (firstMessageInput.value || "").trim();
    if (!subject || !message) return;
    const submitBtn = createForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const res = await FC.support.create(subject, message);
      if (!res?.success) {
        renderCreateModeHint("Could not create ticket. Please try again.");
        return;
      }
      subjectInput.value = "";
      firstMessageInput.value = "";
      keepCreateMode = false;
      await loadTickets();
    } catch (err) {
      console.error("Support create ticket failed:", err);
      renderCreateModeHint("Could not create ticket. Please try again.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
  replyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = (replyInput.value || "").trim();
    if (!message || !activeTicketId) return;
    const submitBtn = replyForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const res = await FC.support.send(activeTicketId, message);
      if (!res?.success) {
        return;
      }
      replyInput.value = "";
      await loadTicketDetail(activeTicketId);
      await loadTickets();
    } catch (err) {
      console.error("Support send message failed:", err);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();

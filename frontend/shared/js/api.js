(function (window) {
  "use strict";
  function getPhpApiBase() {
    const {
      protocol: protocol,
      hostname: hostname,
      port: port,
    } = window.location;
    const phpOrigin =
      port === "5000"
        ? `${protocol}//${hostname}:5000`
        : `${protocol}//${hostname}:5000`;
    return `${phpOrigin}/backend/php/controllers`;
  }
  const PHP_API_BASE = getPhpApiBase();
  function getPythonApiBase() {
    const { protocol: protocol, hostname: hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }
  const PYTHON_API_BASE = getPythonApiBase();
  function toFormData(body) {
    const formData = new FormData();
    Object.entries(body || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
        return;
      }
      if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
        return;
      }
      formData.append(key, String(value));
    });
    return formData;
  }

  function cleanServerText(text) {
    return String(text || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function parseApiResponse(res, path) {
    const text = await res.text();
    if (!text.trim()) {
      return {
        success: res.ok,
        data: null,
        error: res.ok ? null : res.statusText || `HTTP ${res.status}`,
      };
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      const message = cleanServerText(text);
      return {
        success: false,
        data: null,
        error:
          message ||
          `Server returned a non-JSON response for ${path} (HTTP ${res.status})`,
      };
    }
  }

  async function request(method, path, body) {
    const opts = { method: method, credentials: "include", headers: {} };
    try {
      const userData = JSON.parse(localStorage.getItem("fc_user") || "{}");
      if (userData.session_token) {
        opts.headers["X-FC-Session"] = userData.session_token;
        Object.assign(opts.headers, getSessionActivityHeaders());
        console.log(
          `[API] Sending token for ${method} ${path}:`,
          userData.session_token.substring(0, 20) + "...",
        );
      } else {
        console.warn("[API] No session token in localStorage for", path);
      }
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }
    if (method === "POST" && body) {
      opts.body = toFormData(body);
    }
    try {
      console.log(`[API] ${method} ${path}`, {
        headers: opts.headers,
        hasBody: !!opts.body,
      });
      const res = await fetch(path, opts);
      console.log(`[API] Response status: ${res.status} for ${path}`);
      if (!res.ok) {
        console.error(`[API] HTTP ${res.status}:`, res.statusText);
      }
      const data = await res.json();
      console.log("[API] Response data:", data);
      if (res.status === 503 && data.error && (data.error === 'MAINTENANCE_MODE' || data.error.includes('maintenance'))) {
          localStorage.removeItem("fc_user");
          document.cookie = "fc_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          window.location.href = "/frontend/views/home/index.html?maintenance=1";
          return new Promise(() => {}); // Prevent caller from continuing
      }
      return data;
    } catch (e) {
      console.error("[API] Request error:", e);
      console.error("Error stack:", e.stack);
      return {
        success: false,
        data: null,
        error: "Network error: " + e.message,
      };
    }
  }
  const FC = {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    auth: {
      me: () => FC.get(`${PHP_API_BASE}/auth/me`),
      logout: () => FC.post(`${PHP_API_BASE}/auth/logout`),
    },
    home: { summary: () => FC.get(`${PHP_API_BASE}/home/summary?t=` + Date.now()) },
    players: {
      list: (params) =>
        FC.get(
          `${PHP_API_BASE}/players/list?` + new URLSearchParams(params || {}),
        ),
      search: (q) =>
        FC.get(`${PHP_API_BASE}/players/search?q=` + encodeURIComponent(q)),
      trending: () => FC.get(`${PHP_API_BASE}/players/trending`),
      featured: () => FC.get(`${PHP_API_BASE}/players/featured`),
      detail: (id, params) =>
        FC.get(
          `${PHP_API_BASE}/players/detail?` +
            new URLSearchParams({ id: id, ...(params || {}) }),
        ),
    },
    news: {
      search: (params) =>
        FC.get(
          `${PYTHON_API_BASE}/api/news/search?` +
            new URLSearchParams(params || {}),
        ),
      list: (params) =>
        FC.get(
          `${PYTHON_API_BASE}/api/news/list?` +
            new URLSearchParams(params || {}),
        ),
      detail: (id) =>
        FC.get(
          `${PYTHON_API_BASE}/api/news/detail?` +
            new URLSearchParams({ id: id }),
        ),
    },
    inventory: {
      list: (params) =>
        FC.get(
          `${PHP_API_BASE}/inventory/list` +
            (params && Object.keys(params).length
              ? "?" + new URLSearchParams(params)
              : ""),
        ),
    },
    lineups: {
      my: () => FC.get(`${PHP_API_BASE}/lineups/my`),
      create: (data) => FC.post(`${PHP_API_BASE}/lineups/create`, data),
      update: (data) => FC.post(`${PHP_API_BASE}/lineups/update`, data),
      delete: (lineup_id) =>
        FC.post(`${PHP_API_BASE}/lineups/delete`, { lineup_id: lineup_id }),
      setActive: (lineup_id) =>
        FC.post(`${PHP_API_BASE}/lineups/set_active`, { lineup_id: lineup_id }),
      deactivate: () => FC.post(`${PHP_API_BASE}/lineups/deactivate`),
      duplicate: (lineup_id) =>
        FC.post(`${PHP_API_BASE}/lineups/duplicate`, { lineup_id: lineup_id }),
      public: (sort, recent, limit) =>
        FC.get(
          `${PHP_API_BASE}/lineups/public?sort=` +
            (sort || "views") +
            "&recent=" +
            (recent || "false") +
            "&limit=" +
            Math.max(1, Math.min(20, Number(limit) || 10)),
        ),
      metaPulse: (recent, limit, topPerFormation) =>
        FC.get(
          `${PHP_API_BASE}/lineups/meta_pulse?recent=` +
            (recent || "true") +
            "&limit=" +
            Math.max(1, Math.min(20, Number(limit) || 10)) +
            "&top_per_formation=" +
            Math.max(1, Math.min(5, Number(topPerFormation) || 3)),
        ),
      view: (lineup_id) =>
        FC.post(`${PHP_API_BASE}/lineups/view`, { lineup_id: lineup_id }),
      like: (lineup_id) =>
        FC.post(`${PHP_API_BASE}/lineups/like`, { lineup_id: lineup_id }),
    },
    team: {
      chemistry: (lineup_id) =>
        FC.post(`${PHP_API_BASE}/team/chemistry`, { lineup_id: lineup_id }),
      advice: (lineup_id) =>
        FC.post(`${PHP_API_BASE}/team/advice`, { lineup_id: lineup_id }),
      autobuild: (lineup_id) =>
        FC.post(`${PHP_API_BASE}/team/autobuild`, { lineup_id: lineup_id }),
    },
    chests: {
      status: () => FC.get(`${PHP_API_BASE}/chests/status`),
      open: (chest_type) =>
        FC.post(`${PHP_API_BASE}/chests/open`, { chest_type: chest_type }),
    },
    play: {
      kickoff: () => FC.post(`${PHP_API_BASE}/play/kickoff`),
      tournament: () => FC.post(`${PHP_API_BASE}/play/tournament`),
      season: () => FC.post(`${PHP_API_BASE}/play/season`),
      shootout: (data) => FC.post(`${PHP_API_BASE}/play/shootout`, data || {}),
      forfeit: (data) => FC.post(`${PHP_API_BASE}/play/forfeit`, data || {}),
      history: (limit) =>
        FC.get(
          `${PHP_API_BASE}/matches/history` +
            (limit ? `?limit=${encodeURIComponent(limit)}` : ""),
        ),
      detail: (id) => FC.get(`${PHP_API_BASE}/matches/detail?id=` + id),
      divisionStatus: () => FC.get(`${PHP_API_BASE}/division/status`),
      leaderboard: (division) =>
        FC.get(
          `${PHP_API_BASE}/division/leaderboard` +
            (division ? `?division=${encodeURIComponent(division)}` : ""),
        ),
    },
    challenges: {
      list: () => FC.get(`${PHP_API_BASE}/challenges/list`),
      claim: (challenge_id) =>
        FC.post(`${PHP_API_BASE}/challenges/claim`, {
          challenge_id: challenge_id,
        }),
    },
    settings: {
      changeEmail: (email, password) =>
        FC.post(`${PHP_API_BASE}/settings/change_email`, {
          email: email,
          password: password,
        }),
      changePassword: (current_password, new_password) =>
        FC.post(`${PHP_API_BASE}/settings/change_password`, {
          current_password: current_password,
          new_password: new_password,
        }),
      deleteAccount: (password) =>
        FC.post(`${PHP_API_BASE}/settings/delete_account`, {
          password: password,
        }),
      completeOnboarding: () =>
        FC.post(`${PHP_API_BASE}/settings/complete_onboarding`, {}),
    },
    support: {
      myList: () => FC.get(`${PHP_API_BASE}/support/my_list`),
      myDetail: (ticket_id) =>
        FC.get(
          `${PHP_API_BASE}/support/my_detail?` +
            new URLSearchParams({ ticket_id: ticket_id }),
        ),
      create: (subject, message) =>
        FC.post(`${PHP_API_BASE}/support/create`, {
          subject: subject,
          message: message,
        }),
      send: (ticket_id, message) =>
        FC.post(`${PHP_API_BASE}/support/send`, {
          ticket_id: ticket_id,
          message: message,
        }),
      adminList: (status = "open") =>
        FC.get(
          `${PHP_API_BASE}/support/admin_list?` +
            new URLSearchParams({ status: status }),
        ),
      adminDetail: (ticket_id) =>
        FC.get(
          `${PHP_API_BASE}/support/admin_detail?` +
            new URLSearchParams({ ticket_id: ticket_id }),
        ),
      adminSend: (ticket_id, message) =>
        FC.post(`${PHP_API_BASE}/support/admin_send`, {
          ticket_id: ticket_id,
          message: message,
        }),
      adminResolve: (ticket_id) =>
        FC.post(`${PHP_API_BASE}/support/admin_resolve`, {
          ticket_id: ticket_id,
        }),
    },
    admin: {
      dashboard: () => FC.get(`${PHP_API_BASE}/admin/dashboard`),
      usersList: (params) =>
        FC.get(
          `${PHP_API_BASE}/admin/users_list?` +
            new URLSearchParams(params || {}),
        ),
      usersBan: (user_id) =>
        FC.post(`${PHP_API_BASE}/admin/users_ban`, { user_id: user_id }),
      usersUnban: (user_id) =>
        FC.post(`${PHP_API_BASE}/admin/users_unban`, { user_id: user_id }),
      usersTimeout: (user_id, hours) =>
        FC.post(`${PHP_API_BASE}/admin/users_timeout`, {
          user_id: user_id,
          hours: hours,
        }),
      usersDelete: (user_id) =>
        FC.post(`${PHP_API_BASE}/admin/users_delete`, { user_id: user_id }),
      usersEdit: (user_id, role, reason) =>
        FC.post(`${PHP_API_BASE}/admin/users_edit`, {
          user_id: user_id,
          role: role,
          reason: reason,
        }),
      playersList: (params) =>
        FC.get(
          `${PHP_API_BASE}/admin/players_list?` +
            new URLSearchParams(params || {}),
        ),
      playersAdd: (data) => FC.post(`${PHP_API_BASE}/admin/players_add`, data),
      playersEdit: (data) =>
        FC.post(`${PHP_API_BASE}/admin/players_edit`, data),
      playersDelete: (player_id) =>
        FC.post(`${PHP_API_BASE}/admin/players_delete`, {
          player_id: player_id,
        }),
      announcementsList: (params) =>
        FC.get(
          `${PHP_API_BASE}/admin/announcements_list?` +
            new URLSearchParams(params || {}),
        ),
      announcementsAdd: (title, content) =>
        FC.post(`${PHP_API_BASE}/admin/announcements_add`, {
          title: title,
          content: content,
        }),
      announcementsDelete: (announcement_id) =>
        FC.post(`${PHP_API_BASE}/admin/announcements_delete`, {
          announcement_id: announcement_id,
        }),
      reportsList: (params) =>
        FC.get(
          `${PHP_API_BASE}/admin/reports_list?` +
            new URLSearchParams(params || {}),
        ),
      rolesList: () => FC.get(`${PHP_API_BASE}/admin/roles_list`),
      rolesAssign: (user_id, role) =>
        FC.post(`${PHP_API_BASE}/admin/roles_assign`, {
          user_id: user_id,
          role: role,
        }),
      roleRequestsList: (params) =>
        FC.get(
          `${PHP_API_BASE}/admin/role_requests_list?` +
            new URLSearchParams(params || {}),
        ),
      roleRequestApprove: (request_id, review_note) =>
        FC.post(`${PHP_API_BASE}/admin/role_requests_approve`, {
          request_id: request_id,
          review_note: review_note,
        }),
      roleRequestReject: (request_id, review_note) =>
        FC.post(`${PHP_API_BASE}/admin/role_requests_reject`, {
          request_id: request_id,
          review_note: review_note,
        }),
      communityPostsList: (params) =>
        FC.get(
          `${PHP_API_BASE}/admin/community_posts_list?` +
            new URLSearchParams(params || {}),
        ),
      communityPostsDelete: (post_id) =>
        FC.post(`${PHP_API_BASE}/admin/community_posts_delete`, {
          post_id: post_id,
        }),
      communityPostsLike: (post_id) =>
        FC.post(`${PHP_API_BASE}/community/posts/${post_id}/like`, {}),
      communityCommentsCreate: (post_id, content) =>
        FC.post(`${PHP_API_BASE}/community/posts/${post_id}/comments`, {
          content: content,
        }),
      communityCommentsDelete: (comment_id) =>
        FC.post(`${PHP_API_BASE}/admin/community_comments_delete`, {
          comment_id: comment_id,
        }),
      communityReportsList: (params) =>
        FC.get(
          `${PHP_API_BASE}/admin/community_reports_list?` +
            new URLSearchParams(params || {}),
        ),
      communityReportsCreate: (post_id, reason, description) =>
        FC.post(`${PHP_API_BASE}/admin/community_reports_create`, {
          post_id: post_id,
          reason: reason,
          description: description,
        }),
      communityReportsResolve: (post_id, action) =>
        FC.post(`${PHP_API_BASE}/admin/community_reports_resolve`, {
          post_id: post_id,
          action: action,
        }),
      sendNotification: (data) =>
        FC.post(`${PHP_API_BASE}/admin/send_notification`, data),
      settingsGet: () => FC.get(`${PHP_API_BASE}/admin/settings_get`),
      settingsUpdate: (key, value) => FC.post(`${PHP_API_BASE}/admin/settings_update`, { key, value }),
    },
    notifications: {
      list: (filter) =>
        FC.get(
          `${PHP_API_BASE}/notifications` +
            (filter ? `?filter=${encodeURIComponent(filter)}` : ""),
        ),
      markRead: (id) =>
        FC.post(
          `${PHP_API_BASE}/notifications/mark_read`,
          id ? { id: id } : {},
        ),
      delete: (id) =>
        FC.post(`${PHP_API_BASE}/notifications/delete`, { id: id }),
      clearAll: () => FC.post(`${PHP_API_BASE}/notifications/clear_all`, {}),
    },
  };
  window.FC = FC;
})(window);

(function () {
  "use strict";

  const NATIVE_ALERT = window.alert ? window.alert.bind(window) : null;
  const NATIVE_CONFIRM = window.confirm ? window.confirm.bind(window) : null;
  const NATIVE_PROMPT = window.prompt ? window.prompt.bind(window) : null;
  const STACK_ID = "fc-alert-stack";
  const STYLE_ID = "fc-alert-style";
  const DIALOG_ID = "fc-dialog-overlay";
  const MAX_VISIBLE_ALERTS = 4;
  const AUTO_DISMISS_MS = 5200;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${STACK_ID} {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 20000;
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: min(420px, calc(100vw - 32px));
        pointer-events: none;
      }

      #${STACK_ID} .fc-alert-card {
        pointer-events: auto;
        border-radius: 18px;
        overflow: hidden;
        backdrop-filter: blur(20px);
        box-shadow: 0 24px 55px rgba(0, 0, 0, 0.34);
        animation: fcAlertSlideIn 220ms ease-out;
      }

      #${STACK_ID} .fc-alert-card.is-hiding {
        animation: fcAlertFadeOut 180ms ease-in forwards;
      }

      #${STACK_ID} .fc-alert-card .card-body {
        padding: 16px 18px;
        font-family: "Inter", sans-serif;
      }

      #${STACK_ID} .fc-alert-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      #${STACK_ID} .fc-alert-meta {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        min-width: 0;
      }

      #${STACK_ID} .fc-alert-icon {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        font-weight: 800;
        flex-shrink: 0;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
      }

      #${STACK_ID} .fc-alert-copy {
        min-width: 0;
      }

      #${STACK_ID} .fc-alert-title {
        margin: 0;
        font-family: "Bebas Neue", "Sora", "Inter", sans-serif;
        font-size: 1.45rem;
        font-weight: 400;
        letter-spacing: 0.08em;
        line-height: 0.95;
        text-transform: uppercase;
      }

      #${STACK_ID} .fc-alert-message {
        margin: 6px 0 0;
        font-family: "Inter", sans-serif;
        font-size: 0.95rem;
        line-height: 1.45;
        white-space: pre-line;
        opacity: 0.92;
        word-break: break-word;
      }

      #${STACK_ID} .fc-alert-close {
        border: 0;
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
        font-family: "Inter", sans-serif;
        width: 34px;
        height: 34px;
        border-radius: 12px;
        font-size: 1.1rem;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background-color 0.18s ease, transform 0.18s ease;
      }

      #${STACK_ID} .fc-alert-close:hover {
        background: rgba(255, 255, 255, 0.16);
        transform: translateY(-1px);
      }

      @keyframes fcAlertSlideIn {
        from {
          opacity: 0;
          transform: translate3d(0, -10px, 0) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
      }

      @keyframes fcAlertFadeOut {
        from {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        to {
          opacity: 0;
          transform: translate3d(0, -8px, 0) scale(0.98);
        }
      }

      #${DIALOG_ID} {
        position: fixed;
        inset: 0;
        z-index: 25000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(3, 7, 12, 0.72);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      #${DIALOG_ID} .fc-dialog-card {
        width: min(460px, calc(100vw - 32px));
        border-radius: 22px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: linear-gradient(
          160deg,
          rgba(18, 22, 30, 0.98),
          rgba(8, 10, 16, 0.98)
        );
        color: #fff;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.58);
        animation: fcDialogIn 220ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #${DIALOG_ID} .fc-dialog-card.is-danger .fc-dialog-accent {
        background: linear-gradient(90deg, #ff7b7b, #ffd54a);
      }

      #${DIALOG_ID} .fc-dialog-accent {
        height: 4px;
        background: linear-gradient(90deg, #4fc3f7, #ffd54a, #ff6b6b);
      }

      #${DIALOG_ID} .fc-dialog-body {
        padding: 24px 24px 22px;
        font-family: "Inter", sans-serif;
      }

      #${DIALOG_ID} .fc-dialog-kicker {
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #ffd54a;
      }

      #${DIALOG_ID} .fc-dialog-title {
        margin: 10px 0 0;
        font-family: "Bebas Neue", "Sora", "Inter", sans-serif;
        font-size: 2.2rem;
        line-height: 0.95;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #fff;
      }

      #${DIALOG_ID} .fc-dialog-message {
        margin: 14px 0 0;
        font-size: 0.95rem;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.76);
        white-space: pre-line;
      }

      #${DIALOG_ID} .fc-dialog-input {
        width: 100%;
        margin-top: 18px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
        padding: 13px 14px;
        font-family: "Inter", sans-serif;
        font-size: 0.95rem;
        outline: none;
      }

      #${DIALOG_ID} .fc-dialog-input:focus {
        border-color: rgba(255, 215, 0, 0.45);
        box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.12);
      }

      #${DIALOG_ID} .fc-dialog-actions {
        display: flex;
        gap: 12px;
        margin-top: 22px;
      }

      #${DIALOG_ID} .fc-dialog-btn {
        flex: 1;
        border-radius: 12px;
        padding: 12px 14px;
        font-family: "Inter", sans-serif;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition: transform 0.15s ease, background-color 0.15s ease;
      }

      #${DIALOG_ID} .fc-dialog-btn:hover {
        transform: translateY(-1px);
      }

      #${DIALOG_ID} .fc-dialog-btn-secondary {
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.86);
      }

      #${DIALOG_ID} .fc-dialog-btn-primary {
        border: 1px solid rgba(255, 215, 0, 0.2);
        background: linear-gradient(135deg, #ffd54a, #ffbf00);
        color: #111;
        box-shadow: 0 10px 26px rgba(255, 191, 0, 0.18);
      }

      #${DIALOG_ID} .fc-dialog-card.is-danger .fc-dialog-btn-primary {
        border-color: rgba(255, 107, 107, 0.28);
        background: linear-gradient(135deg, #ff6b6b, #d63d3d);
        color: #fff;
        box-shadow: 0 10px 26px rgba(214, 61, 61, 0.24);
      }

      @keyframes fcDialogIn {
        from {
          opacity: 0;
          transform: translateY(14px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-width: 576px) {
        #${STACK_ID} {
          top: 12px;
          right: 12px;
          left: 12px;
          width: auto;
        }

        #${DIALOG_ID} .fc-dialog-actions {
          flex-direction: column;
        }

        #${DIALOG_ID} .fc-dialog-title {
          font-size: 1.9rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureStack() {
    let stack = document.getElementById(STACK_ID);
    if (stack) return stack;
    stack = document.createElement("div");
    stack.id = STACK_ID;
    stack.setAttribute("aria-live", "polite");
    stack.setAttribute("aria-atomic", "false");
    document.body.appendChild(stack);
    return stack;
  }

  function getAlertConfig(message) {
    const text = String(message || "").toLowerCase();
    if (/success|saved|updated|deleted|granted|created|goodbye/.test(text)) {
      return {
        title: "Success",
        cardClass:
          "bg-success-subtle border border-success-subtle text-success-emphasis",
        iconClass: "bg-success text-white",
        icon: "OK",
      };
    }
    if (
      /error|failed|fail|unable|denied|unavailable|could not|connection error|access denied|not loaded|unknown error/.test(
        text,
      )
    ) {
      return {
        title: "Error",
        cardClass:
          "bg-danger-subtle border border-danger-subtle text-danger-emphasis",
        iconClass: "bg-danger text-white",
        icon: "!",
      };
    }
    if (
      /warning|please|must|required|set an active lineup|log in|no lineups|select|confirm|first/.test(
        text,
      )
    ) {
      return {
        title: "Warning",
        cardClass:
          "bg-warning-subtle border border-warning-subtle text-warning-emphasis",
        iconClass: "bg-warning text-dark",
        icon: "!",
      };
    }
    return {
      title: "Notice",
      cardClass: "bg-info-subtle border border-info-subtle text-info-emphasis",
      iconClass: "bg-info text-dark",
      icon: "i",
    };
  }

  function dismissAlert(card) {
    if (!card || card.classList.contains("is-hiding")) return;
    card.classList.add("is-hiding");
    window.setTimeout(() => {
      card.remove();
    }, 180);
  }

  function trimStack(stack) {
    while (stack.children.length > MAX_VISIBLE_ALERTS) {
      stack.removeChild(stack.lastElementChild);
    }
  }

  function normalizeDialogOptions(input, defaults) {
    if (typeof input === "string") {
      return { ...defaults, message: input };
    }
    return { ...defaults, ...(input || {}) };
  }

  function removeDialogOverlay() {
    document.getElementById(DIALOG_ID)?.remove();
  }

  function createDialogElements(options) {
    ensureStyles();
    removeDialogOverlay();

    const overlay = document.createElement("div");
    overlay.id = DIALOG_ID;

    const card = document.createElement("section");
    card.className = `card fc-dialog-card${options.tone === "danger" ? " is-danger" : ""}`;
    card.setAttribute("role", "alertdialog");
    card.setAttribute("aria-modal", "true");

    const accent = document.createElement("div");
    accent.className = "fc-dialog-accent";

    const body = document.createElement("div");
    body.className = "fc-dialog-body card-body";

    const kicker = document.createElement("div");
    kicker.className = "fc-dialog-kicker";
    kicker.textContent = options.kicker || "FootyCraft";

    const title = document.createElement("h2");
    title.className = "fc-dialog-title";
    title.textContent = options.title || "Confirm action";

    const message = document.createElement("p");
    message.className = "fc-dialog-message";
    message.textContent =
      options.message || "Are you sure you want to continue?";

    body.appendChild(kicker);
    body.appendChild(title);
    body.appendChild(message);

    let input = null;
    if (options.input) {
      input = document.createElement("input");
      input.className = "fc-dialog-input";
      input.type = options.inputType || "text";
      input.placeholder = options.placeholder || "";
      input.value = options.defaultValue || "";
      input.autocomplete = options.inputAutocomplete || "off";
      body.appendChild(input);
    }

    const actions = document.createElement("div");
    actions.className = "fc-dialog-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "fc-dialog-btn fc-dialog-btn-secondary";
    cancelButton.textContent = options.cancelText || "Cancel";

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "fc-dialog-btn fc-dialog-btn-primary";
    confirmButton.textContent = options.confirmText || "Confirm";

    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);
    body.appendChild(actions);

    card.appendChild(accent);
    card.appendChild(body);
    overlay.appendChild(card);

    return {
      overlay: overlay,
      input: input,
      cancelButton: cancelButton,
      confirmButton: confirmButton,
    };
  }

  function showCardAlert(message) {
    if (!document.body) {
      if (NATIVE_ALERT) NATIVE_ALERT(message);
      return;
    }
    ensureStyles();
    const stack = ensureStack();
    const config = getAlertConfig(message);
    const card = document.createElement("section");
    card.className = `card fc-alert-card ${config.cardClass}`;
    card.setAttribute("role", "alert");
    card.innerHTML = `
      <div class="card-body">
        <div class="fc-alert-head">
          <div class="fc-alert-meta">
            <span class="fc-alert-icon ${config.iconClass}" aria-hidden="true">${config.icon}</span>
            <div class="fc-alert-copy">
              <h2 class="fc-alert-title">${config.title}</h2>
              <p class="fc-alert-message"></p>
            </div>
          </div>
          <button type="button" class="fc-alert-close" aria-label="Dismiss notification">&times;</button>
        </div>
      </div>
    `;
    const messageEl = card.querySelector(".fc-alert-message");
    messageEl.textContent = String(message || "Something happened.");
    const closeButton = card.querySelector(".fc-alert-close");
    closeButton.addEventListener("click", () => dismissAlert(card));
    stack.prepend(card);
    trimStack(stack);
    window.setTimeout(() => dismissAlert(card), AUTO_DISMISS_MS);
  }

  function showAppConfirm(input) {
    const options = normalizeDialogOptions(input, {
      kicker: "FootyCraft",
      title: "Confirm action",
      message: "Are you sure you want to continue?",
      confirmText: "Confirm",
      cancelText: "Cancel",
      tone: "danger",
    });

    if (!document.body) {
      return Promise.resolve(
        NATIVE_CONFIRM ? NATIVE_CONFIRM(options.message) : true,
      );
    }

    return new Promise((resolve) => {
      const elements = createDialogElements(options);
      const overlay = elements.overlay;

      const finish = (result) => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
        resolve(result);
      };

      const onKeyDown = (event) => {
        if (event.key === "Escape") finish(false);
        if (event.key === "Enter") finish(true);
      };

      elements.cancelButton.addEventListener("click", () => finish(false));
      elements.confirmButton.addEventListener("click", () => finish(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish(false);
      });

      document.body.appendChild(overlay);
      document.addEventListener("keydown", onKeyDown);
      elements.confirmButton.focus();
    });
  }

  function showAppPrompt(input) {
    const options = normalizeDialogOptions(input, {
      kicker: "FootyCraft",
      title: "Input required",
      message: "Enter a value to continue.",
      confirmText: "Continue",
      cancelText: "Cancel",
      input: true,
      inputType: "text",
      inputAutocomplete: "off",
      tone: "info",
    });

    if (!document.body) {
      return Promise.resolve(
        NATIVE_PROMPT
          ? NATIVE_PROMPT(options.message, options.defaultValue || "")
          : null,
      );
    }

    return new Promise((resolve) => {
      const elements = createDialogElements({ ...options, input: true });
      const overlay = elements.overlay;
      const inputEl = elements.input;

      const finish = (result) => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
        resolve(result);
      };

      const submit = () => {
        finish(inputEl ? inputEl.value : "");
      };

      const onKeyDown = (event) => {
        if (event.key === "Escape") finish(null);
        if (event.key === "Enter") submit();
      };

      elements.cancelButton.addEventListener("click", () => finish(null));
      elements.confirmButton.addEventListener("click", submit);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish(null);
      });

      document.body.appendChild(overlay);
      document.addEventListener("keydown", onKeyDown);
      inputEl?.focus();
      if (inputEl && typeof inputEl.select === "function") {
        inputEl.select();
      }
    });
  }

  window.showAppAlert = showCardAlert;
  window.showAppConfirm = showAppConfirm;
  window.showAppPrompt = showAppPrompt;
  window.__nativeAlert = NATIVE_ALERT;
  window.__nativeConfirm = NATIVE_CONFIRM;
  window.__nativePrompt = NATIVE_PROMPT;
  window.alert = showCardAlert;
})();

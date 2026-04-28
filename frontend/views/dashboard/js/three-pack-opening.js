import * as THREE from "https://unpkg.com/three@0.163.0/build/three.module.js";
const EASING = {
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};
export class PackOpening3D {
  constructor(root, options = {}) {
    this.root = root;
    this.options = {
      rewardTitle: options.rewardTitle || "ICON",
      rewardValue: options.rewardValue || "92",
      rewardColor: options.rewardColor || "#f5cd4c",
      packImageUrl: options.packImageUrl || "/assets/images/ui/gold.png",
      rewardData: options.rewardData || null,
      rewardStackData: Array.isArray(options.rewardStackData)
        ? options.rewardStackData
        : [],
      disableBuiltInRewardVisual: !!options.disableBuiltInRewardVisual,
      packTheme: String(options.packTheme || "gold").toLowerCase(),
      autoStart: !!options.autoStart,
      onReveal:
        typeof options.onReveal === "function" ? options.onReveal : null,
      onComplete:
        typeof options.onComplete === "function" ? options.onComplete : null,
    };
    this.theme = this._resolveThemePalette(this.options.packTheme);
    this.isAnimating = false;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.baseExposure = 1.05;
    this.darknessLevel = 0;
    this.isRewardTransitioning = false;
    this.packDebrisLocked = false;
    this._portraitImageCache = new Map();
    this._packTextureReady = false;
    this._packTextureReadyResolve = null;
    this._packTextureReadyPromise = Promise.resolve();
    this.stageBeams = [];
    this.stagePillars = [];
    this.stageRunwaySegments = [];
    this.openedPackFloat = {
      active: false,
      rootBaseX: 0,
      rootBaseY: 1.35,
      rootBaseZ: -0.12,
      leftBasePos: new THREE.Vector3(-1.82, -0.03, -0.82),
      rightBasePos: new THREE.Vector3(1.82, -0.03, -0.82),
      leftBaseRot: new THREE.Euler(0, -0.98, -0.34),
      rightBaseRot: new THREE.Euler(0, 0.98, 0.34),
      yAmp: 0.028,
      xAmp: 0.038,
      zAmp: 0.018,
      rotYAmp: 0.05,
      rotZAmp: 0.028,
      speed: 0.9,
    };
    this._setupScene();
    this._setupStage();
    this._setupPack();
    this._setupReward();
    this._setupParticles();
    this._setupInteraction();
    this._animate();
    if (this.options.autoStart) {
      requestAnimationFrame(() => this.start());
    }
  }
  async start() {
    if (this.isAnimating) return;
    await this._waitForPackTexture(950);
    if (this.isAnimating) return;
    this._runOpeningSequence();
  }
  _markPackTextureReady() {
    if (this._packTextureReady) return;
    this._packTextureReady = true;
    if (typeof this._packTextureReadyResolve === "function") {
      this._packTextureReadyResolve();
      this._packTextureReadyResolve = null;
    }
  }
  async _waitForPackTexture(timeoutMs = 900) {
    const waitForReady = this._packTextureReadyPromise || Promise.resolve();
    const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
    try {
      await Promise.race([waitForReady, timeout]);
    } catch (_) {}
  }
  _resolveThemePalette(themeKey) {
    const palettes = {
      gold: {
        floorColor: 592137,
        fillLightColor: 16765562,
        rimLightColor: 16769959,
        ringColor: "#ffb84a",
        shadowColor: "#ffbf54",
        shadowGradientStops: [
          "rgba(255,233,173,0.95)",
          "rgba(255,204,94,0.62)",
          "rgba(210,132,28,0.24)",
          "rgba(0,0,0,0)",
        ],
        stackBgStops: ["#2b1f0d", "#6b4b1f", "#1a1208"],
        stackOuterBorder: "rgba(255,236,182,0.88)",
        stackInnerBorder: "rgba(255,214,128,0.42)",
        stackGlowStops: ["rgba(255,228,162,0.35)", "rgba(0,0,0,0)"],
        stackOverallColor: "rgba(255,232,184,0.92)",
        stackPositionColor: "rgba(255,214,130,0.94)",
        stackNameColor: "#fff3d4",
        stackClubColor: "rgba(255,217,144,0.9)",
        stackBadgeTextColor: "#ffe8b1",
        stackBadgeStroke: "rgba(255,228,170,0.72)",
        cardBaseStops: ["#6a4f22", "#d9c38a", "#f4e3b8", "#84672f"],
        cardGlowStops: ["rgba(255,252,235,0.8)", "rgba(255,255,255,0)"],
        cardFrameOuter: "rgba(232,240,255,0.96)",
        cardFrameMid: "rgba(131,143,171,0.85)",
        cardFrameInner: "rgba(255,235,170,0.45)",
        cardRarityStart: "#f4e3a6",
        cardRarityStroke: "rgba(120,92,39,0.72)",
        cardRarityText: "rgba(110,84,35,0.95)",
        cardOverallText: "rgba(118,88,30,0.98)",
        cardPositionText: "rgba(112,84,31,0.98)",
        cardHoloStops: [
          "rgba(220,235,255,0.58)",
          "rgba(188,226,255,0.42)",
          "rgba(255,221,243,0.38)",
          "rgba(228,246,255,0.52)",
        ],
        cardFrameEdge: "rgba(229,239,255,0.9)",
        cardNameGradStops: ["#9ed3ff", "#ffffff", "#d4f2ff"],
        cardClubText: "rgba(116,87,30,0.98)",
        cardMetaText: "rgba(75,58,24,0.98)",
        cardFooterText: "rgba(70,53,20,0.96)",
        runwayCore: "#ffcf72",
        runwayEdge: "rgba(255,198,74,0.36)",
        portalGlowStops: [
          "rgba(255,238,188,0.95)",
          "rgba(255,188,74,0.48)",
          "rgba(0,0,0,0)",
        ],
        beamColor: "#ffe6a9",
        beamEdge: "rgba(255,245,215,0.72)",
        pillarCore: 10317613,
        pillarGlow: 16764020,
      },
      silver: {
        floorColor: 527121,
        fillLightColor: 12109791,
        rimLightColor: 14083327,
        ringColor: "#c6d7f0",
        shadowColor: "#bfcde6",
        shadowGradientStops: [
          "rgba(236,244,255,0.95)",
          "rgba(192,212,244,0.6)",
          "rgba(102,129,171,0.26)",
          "rgba(0,0,0,0)",
        ],
        stackBgStops: ["#1b212c", "#4d5c73", "#171c25"],
        stackOuterBorder: "rgba(226,236,255,0.9)",
        stackInnerBorder: "rgba(173,196,233,0.45)",
        stackGlowStops: ["rgba(210,228,255,0.32)", "rgba(0,0,0,0)"],
        stackOverallColor: "rgba(234,244,255,0.95)",
        stackPositionColor: "rgba(194,214,247,0.95)",
        stackNameColor: "#eef5ff",
        stackClubColor: "rgba(198,219,255,0.9)",
        stackBadgeTextColor: "#f1f6ff",
        stackBadgeStroke: "rgba(193,210,236,0.75)",
        cardBaseStops: ["#2f3949", "#9eaec6", "#dde6f5", "#47546b"],
        cardGlowStops: ["rgba(233,242,255,0.78)", "rgba(255,255,255,0)"],
        cardFrameOuter: "rgba(232,240,255,0.96)",
        cardFrameMid: "rgba(134,151,179,0.9)",
        cardFrameInner: "rgba(194,218,255,0.55)",
        cardRarityStart: "#dce6f5",
        cardRarityStroke: "rgba(86,103,133,0.72)",
        cardRarityText: "rgba(66,86,120,0.95)",
        cardOverallText: "rgba(72,93,129,0.98)",
        cardPositionText: "rgba(76,97,133,0.98)",
        cardHoloStops: [
          "rgba(222,236,255,0.64)",
          "rgba(188,214,246,0.48)",
          "rgba(207,222,255,0.42)",
          "rgba(224,238,255,0.58)",
        ],
        cardFrameEdge: "rgba(226,238,255,0.94)",
        cardNameGradStops: ["#cbe5ff", "#ffffff", "#d9e9ff"],
        cardClubText: "rgba(77,101,137,0.98)",
        cardMetaText: "rgba(59,80,115,0.98)",
        cardFooterText: "rgba(58,76,106,0.96)",
        runwayCore: "#dce9ff",
        runwayEdge: "rgba(182,204,242,0.34)",
        portalGlowStops: [
          "rgba(245,250,255,0.95)",
          "rgba(194,218,255,0.46)",
          "rgba(0,0,0,0)",
        ],
        beamColor: "#edf4ff",
        beamEdge: "rgba(228,238,255,0.76)",
        pillarCore: 5596543,
        pillarGlow: 14806527,
      },
      bronze: {
        floorColor: 854279,
        fillLightColor: 14065775,
        rimLightColor: 14727309,
        ringColor: "#d48949",
        shadowColor: "#c7783f",
        shadowGradientStops: [
          "rgba(255,221,182,0.95)",
          "rgba(220,151,88,0.62)",
          "rgba(135,79,45,0.26)",
          "rgba(0,0,0,0)",
        ],
        stackBgStops: ["#26170f", "#6a3e28", "#1c120d"],
        stackOuterBorder: "rgba(255,218,188,0.88)",
        stackInnerBorder: "rgba(215,156,114,0.46)",
        stackGlowStops: ["rgba(255,205,162,0.33)", "rgba(0,0,0,0)"],
        stackOverallColor: "rgba(255,227,201,0.94)",
        stackPositionColor: "rgba(242,182,133,0.95)",
        stackNameColor: "#ffe9d4",
        stackClubColor: "rgba(239,195,155,0.9)",
        stackBadgeTextColor: "#fff0de",
        stackBadgeStroke: "rgba(236,189,147,0.74)",
        cardBaseStops: ["#5b301f", "#ba7b55", "#e6b089", "#6b3a26"],
        cardGlowStops: ["rgba(255,224,198,0.74)", "rgba(255,255,255,0)"],
        cardFrameOuter: "rgba(255,222,198,0.93)",
        cardFrameMid: "rgba(171,117,85,0.86)",
        cardFrameInner: "rgba(255,195,146,0.46)",
        cardRarityStart: "#e3b18d",
        cardRarityStroke: "rgba(125,75,45,0.72)",
        cardRarityText: "rgba(114,66,41,0.95)",
        cardOverallText: "rgba(130,75,46,0.98)",
        cardPositionText: "rgba(124,71,44,0.98)",
        cardHoloStops: [
          "rgba(255,218,194,0.54)",
          "rgba(241,196,169,0.44)",
          "rgba(255,205,186,0.38)",
          "rgba(255,224,206,0.5)",
        ],
        cardFrameEdge: "rgba(255,225,205,0.9)",
        cardNameGradStops: ["#ffd8bc", "#fff2e7", "#ffe3cf"],
        cardClubText: "rgba(125,76,49,0.98)",
        cardMetaText: "rgba(96,58,38,0.98)",
        cardFooterText: "rgba(86,53,34,0.96)",
        runwayCore: "#efb789",
        runwayEdge: "rgba(215,134,77,0.34)",
        portalGlowStops: [
          "rgba(255,230,210,0.95)",
          "rgba(216,145,93,0.46)",
          "rgba(0,0,0,0)",
        ],
        beamColor: "#ffd9bc",
        beamEdge: "rgba(255,230,210,0.7)",
        pillarCore: 7948849,
        pillarGlow: 15776395,
      },
    };
    return palettes[themeKey] || palettes.gold;
  }
  setRewardData(reward) {
    const normalized = this.setMainRewardData(reward);
    if (
      typeof normalized.rewardIndex === "number" &&
      Number.isFinite(normalized.rewardIndex)
    ) {
      this._setRewardStackIndex(normalized.rewardIndex);
    }
    return normalized;
  }
  setMainRewardData(reward) {
    const normalized = this._normalizeReward(reward);
    this.options.rewardData = { ...normalized };
    try {
      this._drawRewardCard(normalized);
    } catch (_) {
      this._drawFallbackRewardCard(normalized);
    }
    this._markRewardTextureDirty();
    return normalized;
  }
  setRewardStackIndex(index) {
    this._setRewardStackIndex(index);
  }
  hardSetRewardData(reward) {
    const payload =
      reward && typeof reward === "object" ? { ...reward } : reward;
    this.setRewardData(payload);
    this.ensureRewardVisible();
    requestAnimationFrame(() => {
      this.setRewardData(payload);
      requestAnimationFrame(() => {
        this._markRewardTextureDirty();
        this.ensureRewardVisible();
      });
    });
  }
  hardSetMainRewardData(reward) {
    const payload =
      reward && typeof reward === "object" ? { ...reward } : reward;
    this.setMainRewardData(payload);
    this.ensureRewardVisible();
    requestAnimationFrame(() => {
      this.setMainRewardData(payload);
      requestAnimationFrame(() => {
        this._markRewardTextureDirty();
        this.ensureRewardVisible();
      });
    });
  }
  ensureRewardVisible() {
    if (!this.rewardCard) return;
    this.isRewardTransitioning = false;
    this.rewardCard.rotation.y = 0;
    this.rewardCard.rotation.x = 0;
    this.rewardCard.scale.setScalar(1);
    this._setRewardCardOpacity(1);
    this._markRewardTextureDirty();
  }
  setRewardMeshVisible(visible) {
    if (!this.rewardGroup) return;
    if (this.options.disableBuiltInRewardVisual) {
      this.rewardGroup.visible = false;
      this._setRewardStackVisible(false);
      return;
    }
    this.rewardGroup.visible = !!visible;
  }
  async transitionReward(reward, direction = 1, options = {}) {
    const updateStack = !options || options.updateStack !== false;
    if (this.isAnimating || this.isRewardTransitioning) return;
    if (!this.rewardGroup || !this.rewardGroup.visible || !this.rewardCardMat) {
      if (updateStack) {
        this.setRewardData(reward);
      } else {
        this.setMainRewardData(reward);
      }
      return;
    }
    const dir = direction < 0 ? -1 : 1;
    const nextReward =
      reward && typeof reward === "object" ? { ...reward } : reward;
    const nextNormalized = this._normalizeReward(nextReward);
    this.isRewardTransitioning = true;
    try {
      await this._tween(250, (t) => {
        const k = EASING.easeInOutCubic(t);
        this.rewardCard.rotation.y = -dir * 0.55 * k;
        this.rewardCard.rotation.x = 0.04 * k;
        this.rewardCard.scale.setScalar(1 - 0.1 * k);
        this._setRewardCardOpacity(1 - k);
      });
      this.rewardCard.rotation.y = dir * 0.55;
      this.rewardCard.rotation.x = 0.04;
      this.rewardCard.scale.setScalar(0.9);
      this._setRewardCardOpacity(0);
      this.setMainRewardData(nextNormalized);
      if (
        updateStack &&
        typeof nextNormalized.rewardIndex === "number" &&
        Number.isFinite(nextNormalized.rewardIndex)
      ) {
        this._setRewardStackIndex(nextNormalized.rewardIndex);
      }
      await this._tween(270, (t) => {
        const k = EASING.easeInOutCubic(t);
        this.rewardCard.rotation.y = dir * 0.55 * (1 - k);
        this.rewardCard.rotation.x = 0.04 * (1 - k);
        this.rewardCard.scale.setScalar(0.9 + 0.1 * k);
        this._setRewardCardOpacity(Math.min(1, k));
      });
    } catch (_) {
      if (updateStack) {
        this.setRewardData(nextNormalized);
      } else {
        this.setMainRewardData(nextNormalized);
      }
    } finally {
      this.rewardCard.rotation.y = 0;
      this.rewardCard.rotation.x = 0;
      this.rewardCard.scale.setScalar(1);
      this._setRewardCardOpacity(1);
      if (
        updateStack &&
        typeof nextNormalized.rewardIndex === "number" &&
        Number.isFinite(nextNormalized.rewardIndex)
      ) {
        this._setRewardStackIndex(nextNormalized.rewardIndex);
      }
      this.isRewardTransitioning = false;
    }
  }
  _normalizeReward(reward) {
    if (!reward || typeof reward !== "object") {
      return {
        overall: String(this.options.rewardValue || "??"),
        name: String(this.options.rewardTitle || "REWARD"),
        club: "",
        rarity: "reward",
        position: "",
        nation: "",
        league: "",
        pac: "",
        sho: "",
        pas: "",
        dri: "",
        def: "",
        phy: "",
        imageUrl: "",
        cardUrl: "",
        color: this.options.rewardColor,
      };
    }
    const rawImageUrl =
      reward.image_url ||
      reward.imageUrl ||
      reward.player_image_url ||
      reward.playerImageUrl ||
      reward.face_url ||
      reward.faceUrl ||
      reward.image ||
      "";
    const parsedRewardIndex = Number(
      reward.__rewardIndex ?? reward.rewardIndex ?? reward.index ?? Number.NaN,
    );
    return {
      overall: String(reward.overall || "--"),
      name: String(reward.name || "UNKNOWN PLAYER"),
      club: String(reward.club || ""),
      rarity: String(reward.rarity || "reward"),
      position: String(reward.position || ""),
      nation: String(reward.nation || ""),
      league: String(reward.league || ""),
      pac: String(reward.pac ?? reward.pace ?? ""),
      sho: String(reward.sho ?? reward.shooting ?? ""),
      pas: String(reward.pas ?? reward.passing ?? ""),
      dri: String(reward.dri ?? reward.dribbling ?? ""),
      def: String(reward.def ?? reward.defending ?? ""),
      phy: String(reward.phy ?? reward.physical ?? ""),
      imageUrl: this._normalizePortraitUrl(rawImageUrl),
      cardUrl: "",
      color: this._rarityColor(reward.rarity),
      rewardIndex: Number.isFinite(parsedRewardIndex)
        ? parsedRewardIndex
        : null,
    };
  }
  _normalizePortraitUrl(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) return "";
    let url = value.replace(/\\/g, "/");
    if (/^(https?:)/i.test(url)) {
      return `/backend/php/controllers/players/image?src=${encodeURIComponent(url)}`;
    }
    if (/^(data:|blob:)/i.test(url)) {
      return url;
    }
    if (url.startsWith("//")) {
      return `/backend/php/controllers/players/image?src=${encodeURIComponent(window.location.protocol + url)}`;
    }
    if (/^[a-zA-Z]:\//.test(url)) {
      const lower = url.toLowerCase();
      const frontendIdx = lower.indexOf("/frontend/");
      if (frontendIdx >= 0) {
        return url.slice(frontendIdx);
      }
      const assetsIdx = lower.indexOf("/assets/");
      if (assetsIdx >= 0) {
        return url.slice(assetsIdx);
      }
      return "";
    }
    if (url.startsWith("frontend/") || url.startsWith("assets/")) {
      return "/" + url;
    }
    if (url.startsWith("./")) {
      url = url.slice(1);
    }
    if (!url.startsWith("/")) {
      return "/" + url;
    }
    return url;
  }
  _normalizeCardUrl(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) return "";
    let url = value.replace(/\\/g, "/");
    if (/^(data:|blob:)/i.test(url)) {
      return url;
    }
    if (/^(https?:)/i.test(url)) {
      return `/backend/php/controllers/players/image?src=${encodeURIComponent(url)}`;
    }
    if (url.startsWith("//")) {
      return `/backend/php/controllers/players/image?src=${encodeURIComponent(window.location.protocol + url)}`;
    }
    if (/^[a-zA-Z]:\//.test(url)) {
      const lower = url.toLowerCase();
      const frontendIdx = lower.indexOf("/frontend/");
      if (frontendIdx >= 0) {
        return url.slice(frontendIdx);
      }
      const assetsIdx = lower.indexOf("/assets/");
      if (assetsIdx >= 0) {
        return url.slice(assetsIdx);
      }
      return "";
    }
    if (url.startsWith("frontend/") || url.startsWith("assets/")) {
      return "/" + url;
    }
    if (url.startsWith("./")) {
      url = url.slice(1);
    }
    if (!url.startsWith("/")) {
      return "/" + url;
    }
    return url;
  }
  _rarityColor(rarity) {
    return (
      {
        common: "#c0a060",
        rare: "#4fc3f7",
        epic: "#ce93d8",
        legend: "#ffd700",
        icon: "#ff9500",
      }[String(rarity || "").toLowerCase()] || this.options.rewardColor
    );
  }
  _setRewardCardOpacity(opacity) {
    if (this.options.disableBuiltInRewardVisual) {
      if (this.rewardCardMat) {
        this.rewardCardMat.opacity = 0;
      }
      if (this.rewardTextMat) {
        this.rewardTextMat.opacity = 0;
      }
      return;
    }
    const clamped = Math.max(0, Math.min(1, opacity));
    if (this.rewardCardMat) {
      this.rewardCardMat.opacity = 0;
    }
    if (this.rewardTextMat) {
      this.rewardTextMat.opacity = clamped;
    }
  }
  _loadPortraitImage(url) {
    const src = String(url || "").trim();
    if (!src) {
      return Promise.reject(new Error("Empty portrait url"));
    }
    const cached = this._portraitImageCache?.get(src);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
    const attemptLoad = (crossOriginValue) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        if (crossOriginValue) {
          img.crossOrigin = crossOriginValue;
        }
        img.onload = () => {
          if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
            reject(new Error("Portrait image has invalid dimensions"));
            return;
          }
          this._portraitImageCache.set(src, img);
          resolve(img);
        };
        img.onerror = () => reject(new Error("Portrait image failed to load"));
        img.src = src;
      });
    if (/^https?:/i.test(src)) {
      return attemptLoad("anonymous").catch(() => attemptLoad(null));
    }
    return attemptLoad(null);
  }
  _createGoldenShadowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    const stops = this.theme?.shadowGradientStops || [
      "rgba(255,233,173,0.95)",
      "rgba(255,204,94,0.62)",
      "rgba(210,132,28,0.24)",
      "rgba(0,0,0,0)",
    ];
    const gradient = ctx.createRadialGradient(128, 128, 26, 128, 128, 128);
    gradient.addColorStop(0, stops[0]);
    gradient.addColorStop(0.3, stops[1]);
    gradient.addColorStop(0.62, stops[2]);
    gradient.addColorStop(1, stops[3]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }
  _createPortalGlowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    const stops = this.theme?.portalGlowStops || [
      "rgba(255,238,188,0.95)",
      "rgba(255,188,74,0.48)",
      "rgba(0,0,0,0)",
    ];
    const radial = ctx.createRadialGradient(256, 220, 36, 256, 256, 236);
    radial.addColorStop(0, stops[0]);
    radial.addColorStop(0.45, stops[1]);
    radial.addColorStop(1, stops[2]);
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }
  _createBeamTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    const beam = ctx.createLinearGradient(128, 0, 128, 1024);
    beam.addColorStop(0, "rgba(255,255,255,0)");
    beam.addColorStop(0.18, this.theme?.beamEdge || "rgba(255,245,215,0.72)");
    beam.addColorStop(0.5, this.theme?.beamColor || "#ffe6a9");
    beam.addColorStop(0.82, this.theme?.beamEdge || "rgba(255,245,215,0.72)");
    beam.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const fade = ctx.createRadialGradient(128, 700, 30, 128, 700, 240);
    fade.addColorStop(0, "rgba(255,255,255,0.7)");
    fade.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }
  _createRunwayTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const edge = this.theme?.runwayEdge || "rgba(255,198,74,0.36)";
    const core = this.theme?.runwayCore || "#ffcf72";
    const stripes = [0.12, 0.28, 0.5, 0.72, 0.88];
    stripes.forEach((stop, index) => {
      const stripe = ctx.createLinearGradient(
        canvas.width * stop,
        0,
        canvas.width * stop,
        canvas.height,
      );
      stripe.addColorStop(0, "rgba(255,255,255,0)");
      stripe.addColorStop(0.18, edge);
      stripe.addColorStop(0.5, index === 2 ? core : edge);
      stripe.addColorStop(0.82, edge);
      stripe.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = stripe;
      ctx.fillRect(canvas.width * stop - 20, 0, 40, canvas.height);
    });
    const sweep = ctx.createLinearGradient(0, 0, canvas.width, 0);
    sweep.addColorStop(0, "rgba(255,255,255,0)");
    sweep.addColorStop(0.5, "rgba(255,255,255,0.28)");
    sweep.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 96, canvas.width, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }
  _hasExactCardArt(data) {
    return false;
  }
  _createStackCardTexture(reward) {
    const theme = this.theme || this._resolveThemePalette("gold");
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    const rarity = String((reward && reward.rarity) || "common").toLowerCase();
    const rarityColor = this._rarityColor(rarity);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, theme.stackBgStops[0]);
    bg.addColorStop(0.5, theme.stackBgStops[1]);
    bg.addColorStop(1, theme.stackBgStops[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = theme.stackOuterBorder;
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    ctx.strokeStyle = theme.stackInnerBorder;
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
    const glow = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.4,
      40,
      canvas.width * 0.5,
      canvas.height * 0.4,
      260,
    );
    glow.addColorStop(0, theme.stackGlowStops[0]);
    glow.addColorStop(1, theme.stackGlowStops[1]);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const badgeW = 168;
    const badgeH = 48;
    ctx.fillStyle = rarityColor;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(canvas.width - badgeW - 34, 46, badgeW, badgeH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.stackBadgeStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - badgeW - 34, 46, badgeW, badgeH);
    ctx.fillStyle = theme.stackBadgeTextColor;
    ctx.font = "900 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      String(rarity || "COMMON").toUpperCase(),
      canvas.width - badgeW * 0.5 - 34,
      78,
    );
    const shield = ctx.createLinearGradient(150, 170, 392, 520);
    shield.addColorStop(0, "rgba(255,255,255,0.12)");
    shield.addColorStop(1, "rgba(255,255,255,0.02)");
    ctx.fillStyle = shield;
    ctx.beginPath();
    ctx.moveTo(164, 168);
    ctx.lineTo(348, 168);
    ctx.lineTo(392, 244);
    ctx.lineTo(366, 468);
    ctx.lineTo(256, 554);
    ctx.lineTo(146, 468);
    ctx.lineTo(120, 244);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    for (let y = 130; y < 560; y += 18) {
      ctx.beginPath();
      ctx.moveTo(104, y);
      ctx.lineTo(408, y);
      ctx.stroke();
    }
    ctx.fillStyle = theme.stackOverallColor;
    ctx.font = "900 34px Arial";
    ctx.textAlign = "center";
    ctx.fillText("REWARD", canvas.width * 0.5, 620);
    ctx.fillStyle = theme.stackClubColor;
    ctx.font = "800 22px Arial";
    ctx.fillText("UNREVEALED", canvas.width * 0.5, 654);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }
  _setupRewardStack() {
    const rawStack = this.options.rewardStackData;
    this.rewardStackEntries = [];
    this.rewardStackIndex = 0;
    if (!Array.isArray(rawStack) || rawStack.length <= 1) {
      this.rewardStackGroup = null;
      return;
    }
    this.rewardStackGroup = new THREE.Group();
    this.rewardStackGroup.position.set(0, -0.03, -0.64);
    this.rewardStackGroup.visible = false;
    this.rewardGroup.add(this.rewardStackGroup);
    const stackGeo = new THREE.PlaneGeometry(
      this.cardWidth * 0.74,
      this.cardHeight * 0.74,
    );
    rawStack.forEach((item, index) => {
      const texture = this._createStackCardTexture(item);
      const matOptions = {
        color: 16777215,
        transparent: true,
        opacity: 0,
        metalness: 0.08,
        roughness: 0.62,
        emissive: new THREE.Color(1182210),
        emissiveIntensity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
      };
      if (texture) {
        matOptions.map = texture;
      }
      const mat = new THREE.MeshStandardMaterial(matOptions);
      const mesh = new THREE.Mesh(stackGeo, mat);
      mesh.renderOrder = 8;
      mesh.position.set(0, 0, -0.3 - index * 0.04);
      mesh.scale.setScalar(0.64);
      mesh.visible = false;
      this.rewardStackGroup.add(mesh);
      this.rewardStackEntries.push({
        index: index,
        mesh: mesh,
        texture: texture,
        targetPosition: mesh.position.clone(),
        targetScale: 0.64,
        targetRotY: 0,
        targetOpacity: 0,
        targetVisible: false,
      });
    });
    this._updateRewardStackLayout();
  }
  _setRewardStackVisible(visible) {
    if (!this.rewardStackGroup) return;
    this.rewardStackGroup.visible = !!visible;
    if (!visible) {
      this.rewardStackEntries.forEach((entry) => {
        entry.targetOpacity = 0;
        entry.targetVisible = false;
        entry.mesh.material.opacity = 0;
        entry.mesh.visible = false;
      });
    }
  }
  _setRewardStackIndex(index) {
    if (!this.rewardStackEntries || !this.rewardStackEntries.length) return;
    const max = this.rewardStackEntries.length - 1;
    const next = Math.max(0, Math.min(max, Number(index) || 0));
    this.rewardStackIndex = next;
    this._updateRewardStackLayout();
  }
  _updateRewardStackLayout() {
    if (!this.rewardStackEntries || !this.rewardStackEntries.length) return;
    const active = Math.max(
      0,
      Math.min(this.rewardStackEntries.length - 1, this.rewardStackIndex || 0),
    );
    this.rewardStackEntries.forEach((entry) => {
      const delta = entry.index - active;
      const abs = Math.abs(delta);
      if (delta === 0 || abs > 3) {
        entry.targetVisible = false;
        entry.targetOpacity = 0;
        entry.targetScale = 0.42;
        entry.targetRotY = 0;
        entry.targetPosition.set(
          delta < 0 ? -1.6 : 1.6,
          -0.16,
          -1.5 - abs * 0.2,
        );
        return;
      }
      const side = Math.sign(delta);
      entry.targetVisible = true;
      entry.targetOpacity = Math.max(0.24, 0.92 - abs * 0.22);
      entry.targetScale = Math.max(0.44, 0.8 - abs * 0.1);
      entry.targetRotY = -side * (0.28 + (abs - 1) * 0.06);
      entry.targetPosition.set(
        side * (0.56 + (abs - 1) * 0.34),
        -0.04 - abs * 0.02,
        -0.48 - abs * 0.2,
      );
    });
  }
  _updateRewardStackAnimation() {
    if (!this.rewardStackEntries || !this.rewardStackEntries.length) return;
    this.rewardStackEntries.forEach((entry) => {
      const mesh = entry.mesh;
      const mat = mesh.material;
      mesh.position.x += (entry.targetPosition.x - mesh.position.x) * 0.16;
      mesh.position.y += (entry.targetPosition.y - mesh.position.y) * 0.16;
      mesh.position.z += (entry.targetPosition.z - mesh.position.z) * 0.16;
      mesh.rotation.y += (entry.targetRotY - mesh.rotation.y) * 0.16;
      const nextScale =
        mesh.scale.x + (entry.targetScale - mesh.scale.x) * 0.16;
      mesh.scale.setScalar(nextScale);
      mat.opacity += (entry.targetOpacity - mat.opacity) * 0.18;
      const shouldShow =
        this.rewardStackGroup &&
        this.rewardStackGroup.visible &&
        (entry.targetVisible || mat.opacity > 0.03);
      mesh.visible = !!shouldShow;
      if (!entry.targetVisible && mat.opacity < 0.02) {
        mesh.visible = false;
      }
    });
  }
  _createRewardSurface() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1536;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { canvas: canvas, ctx: ctx, texture: texture };
  }
  _markRewardTextureDirty() {
    if (!this.rewardTexture) return;
    if (this.rewardCanvas) {
      this.rewardTexture.image = this.rewardCanvas;
    }
    this.rewardTexture.needsUpdate = true;
    if (this.rewardTextMat) {
      this.rewardTextMat.map = this.rewardTexture;
      this.rewardTextMat.needsUpdate = true;
    }
  }
  _rebuildRewardSurface() {
    if (!this.rewardTextMat) return;
    const surface = this._createRewardSurface();
    if (!surface) return;
    const oldTexture = this.rewardTexture;
    this.rewardCanvas = surface.canvas;
    this.rewardCtx = surface.ctx;
    this.rewardTexture = surface.texture;
    this.rewardTextMat.map = this.rewardTexture;
    this.rewardTextMat.needsUpdate = true;
    if (oldTexture && oldTexture !== this.rewardTexture) {
      oldTexture.dispose();
    }
  }
  _drawFallbackRewardCard(reward) {
    if (!this.rewardCtx || !this.rewardCanvas) return;
    const theme = this.theme || this._resolveThemePalette("gold");
    const data = this._normalizeReward(reward);
    const ctx = this.rewardCtx;
    const w = this.rewardCanvas.width;
    const h = this.rewardCanvas.height;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, theme.cardBaseStops[2]);
    bg.addColorStop(1, theme.cardBaseStops[0]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = theme.cardFrameOuter;
    ctx.lineWidth = 20;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.fillStyle = theme.cardOverallText;
    ctx.font = "900 220px Arial";
    ctx.textAlign = "left";
    ctx.fillText(String(data.overall || "--"), 80, 280);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "900 84px Arial";
    ctx.fillText(String(data.name || "PLAYER").toUpperCase(), w / 2, 1080);
    ctx.fillStyle = theme.cardClubText;
    ctx.font = "700 56px Arial";
    ctx.fillText(String(data.club || "FREE AGENT"), w / 2, 1160);
    this._markRewardTextureDirty();
  }
  _loadPackTexture() {
    if (!this.leftHalfMat || !this.rightHalfMat) {
      this._markPackTextureReady();
      return;
    }
    const loader = new THREE.TextureLoader();
    const applyTexture = (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const zoomX = 1.42;
      const zoomY = 1.18;
      const cropOffsetX = (1 - 1 / zoomX) * 0.5;
      const cropOffsetY = (1 - 1 / zoomY) * 0.5;
      const halfSpanX = 0.5 / zoomX;
      const spanY = 1 / zoomY;
      const leftTexture = texture.clone();
      leftTexture.needsUpdate = true;
      leftTexture.repeat.set(halfSpanX, spanY);
      leftTexture.offset.set(cropOffsetX, cropOffsetY);
      const rightTexture = texture.clone();
      rightTexture.needsUpdate = true;
      rightTexture.repeat.set(halfSpanX, spanY);
      rightTexture.offset.set(cropOffsetX + halfSpanX, cropOffsetY);
      this.leftHalfMat.map = leftTexture;
      this.rightHalfMat.map = rightTexture;
      this.leftHalfMat.needsUpdate = true;
      this.rightHalfMat.needsUpdate = true;
      this._markPackTextureReady();
    };
    const primaryPath =
      this.options.packImageUrl || "/frontend/assets/images/ui/gold.png";
    const candidates = [primaryPath];
    if (primaryPath.startsWith("/assets/")) {
      candidates.push("/frontend" + primaryPath);
    } else if (primaryPath.startsWith("/frontend/assets/")) {
      candidates.push(primaryPath.replace("/frontend", ""));
    }
    candidates.push("/frontend/assets/images/ui/gold.png");
    const uniqueCandidates = candidates.filter(
      (value, idx, arr) => value && arr.indexOf(value) === idx,
    );
    const tryLoad = (index) => {
      if (index >= uniqueCandidates.length) {
        this._markPackTextureReady();
        return;
      }
      loader.load(
        uniqueCandidates[index],
        (texture) => applyTexture(texture),
        undefined,
        () => tryLoad(index + 1),
      );
    };
    tryLoad(0);
  }
  _drawRewardCard(reward) {
    if (!this.rewardCtx || !this.rewardTexture) return;
    const theme = this.theme || this._resolveThemePalette("gold");
    const data = this._normalizeReward(reward);
    const ctx = this.rewardCtx;
    const w = this.rewardCanvas.width;
    const h = this.rewardCanvas.height;
    const nameText = String(data.name || "PLAYER").toUpperCase();
    const clubText = String(data.club || "FREE AGENT");
    const rarityText = String(data.rarity || "REWARD").toUpperCase();
    const positionText = String(data.position || "").toUpperCase();
    const overallText = String(data.overall || "--");
    const nationText = String(data.nation || "").toUpperCase();
    const leagueText = String(data.league || "");
    const visualCandidates = [{ url: data.imageUrl, kind: "portrait" }].filter(({ url: url }, idx, arr) => {
      if (!url) return false;
      return arr.findIndex((entry) => entry.url === url) === idx;
    });
    const drawToken = (this._rewardDrawToken =
      (this._rewardDrawToken || 0) + 1);
    const rarityFill = data.color || "#ffd700";
    const drawRoundedRect = (x, y, rectW, rectH, radius) => {
      const r = Math.min(radius, rectW * 0.5, rectH * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + rectW - r, y);
      ctx.quadraticCurveTo(x + rectW, y, x + rectW, y + r);
      ctx.lineTo(x + rectW, y + rectH - r);
      ctx.quadraticCurveTo(x + rectW, y + rectH, x + rectW - r, y + rectH);
      ctx.lineTo(x + r, y + rectH);
      ctx.quadraticCurveTo(x, y + rectH, x, y + rectH - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };
    const drawPremiumCardPath = (x, y, width, height) => {
      const shoulderInset = Math.max(54, width * 0.08);
      const crownLift = Math.max(24, height * 0.028);
      const sideCurve = Math.max(94, height * 0.11);
      const bottomLift = Math.max(28, height * 0.03);
      const taperWidth = Math.max(120, width * 0.2);
      ctx.beginPath();
      ctx.moveTo(x + shoulderInset, y + 34);
      ctx.quadraticCurveTo(
        x + width * 0.5,
        y - crownLift,
        x + width - shoulderInset,
        y + 34,
      );
      ctx.bezierCurveTo(
        x + width - 14,
        y + 92,
        x + width - 16,
        y + sideCurve,
        x + width - 24,
        y + height - 176,
      );
      ctx.quadraticCurveTo(
        x + width - 20,
        y + height - 74,
        x + width - taperWidth,
        y + height - 44,
      );
      ctx.lineTo(x + width * 0.62, y + height - 44);
      ctx.quadraticCurveTo(
        x + width * 0.5,
        y + height + bottomLift,
        x + width * 0.38,
        y + height - 44,
      );
      ctx.lineTo(x + taperWidth, y + height - 44);
      ctx.quadraticCurveTo(x + 20, y + height - 74, x + 24, y + height - 176);
      ctx.bezierCurveTo(
        x + 16,
        y + sideCurve,
        x + 14,
        y + 92,
        x + shoulderInset,
        y + 34,
      );
      ctx.closePath();
    };
    const drawPortraitMaskPath = (x, y, width, height) => {
      ctx.beginPath();
      ctx.moveTo(x + 54, y + 106);
      ctx.quadraticCurveTo(x + width * 0.5, y - 14, x + width - 54, y + 106);
      ctx.lineTo(x + width - 38, y + height - 110);
      ctx.quadraticCurveTo(
        x + width * 0.8,
        y + height - 12,
        x + width * 0.5,
        y + height + 12,
      );
      ctx.quadraticCurveTo(
        x + width * 0.2,
        y + height - 12,
        x + 38,
        y + height - 110,
      );
      ctx.closePath();
    };
    const renderExactCard = (cardImg = null) => {
      ctx.clearRect(0, 0, w, h);
      const outerGlow = ctx.createRadialGradient(
        w * 0.5,
        h * 0.48,
        80,
        w * 0.5,
        h * 0.52,
        w * 0.62,
      );
      outerGlow.addColorStop(
        0,
        (theme.portalGlowStops && theme.portalGlowStops[0]) ||
          "rgba(255,238,188,0.95)",
      );
      outerGlow.addColorStop(
        0.34,
        (theme.portalGlowStops && theme.portalGlowStops[1]) ||
          "rgba(255,188,74,0.48)",
      );
      outerGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "rgba(4,8,16,0.98)");
      bg.addColorStop(0.46, "rgba(7,10,18,0.95)");
      bg.addColorStop(1, "rgba(2,3,8,0.99)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      if (cardImg && cardImg.width > 0 && cardImg.height > 0) {
        const insetX = 28;
        const insetY = 26;
        const drawWMax = w - insetX * 2;
        const drawHMax = h - insetY * 2;
        const scale = Math.min(
          drawWMax / cardImg.width,
          drawHMax / cardImg.height,
        );
        const drawW = cardImg.width * scale;
        const drawH = cardImg.height * scale;
        const drawX = (w - drawW) * 0.5;
        const drawY = (h - drawH) * 0.5;
        ctx.save();
        drawRoundedRect(drawX - 10, drawY - 10, drawW + 20, drawH + 20, 62);
        ctx.clip();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(cardImg, drawX, drawY, drawW, drawH);
        ctx.restore();
        drawRoundedRect(drawX - 10, drawY - 10, drawW + 20, drawH + 20, 62);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      this._markRewardTextureDirty();
    };
    const renderDesignedCard = (portraitImg = null) => {
      ctx.clearRect(0, 0, w, h);
      const cardX = 52;
      const cardY = 28;
      const cardW = w - 104;
      const cardH = h - 72;
      const portraitX = 170;
      const portraitY = 214;
      const portraitW = 684;
      const portraitH = 706;
      const statsX = 166;
      const statsY = 1204;
      const statsW = 692;
      const statsH = 170;
      const fitText = (text, maxWidth, fontSize, weight = 900) => {
        let size = fontSize;
        while (size > 32) {
          ctx.font = `${weight} ${size}px Arial`;
          if (ctx.measureText(text).width <= maxWidth) return size;
          size -= 2;
        }
        return size;
      };
      const withPath = (pathDrawer, drawFn) => {
        ctx.save();
        pathDrawer();
        ctx.clip();
        drawFn();
        ctx.restore();
      };
      const drawSilhouetteStroke = (inset, lineWidth, strokeStyle) => {
        drawPremiumCardPath(
          cardX + inset,
          cardY + inset,
          cardW - inset * 2,
          cardH - inset * 2,
        );
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
      };
      const drawStatLine = (x, y, label, value) => {
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 44px Arial";
        ctx.fillText(String(value || "--"), x, y);
        ctx.fillStyle = theme.cardMetaText;
        ctx.font = "900 24px Arial";
        ctx.fillText(label, x + 62, y);
      };
      const backgroundGlow = ctx.createRadialGradient(
        w * 0.5,
        h * 0.48,
        100,
        w * 0.5,
        h * 0.48,
        w * 0.62,
      );
      backgroundGlow.addColorStop(
        0,
        (theme.portalGlowStops && theme.portalGlowStops[0]) ||
          "rgba(255,238,188,0.92)",
      );
      backgroundGlow.addColorStop(
        0.36,
        (theme.portalGlowStops && theme.portalGlowStops[1]) ||
          "rgba(255,188,74,0.42)",
      );
      backgroundGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = backgroundGlow;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.42)";
      ctx.shadowBlur = 34;
      ctx.shadowOffsetY = 16;
      drawPremiumCardPath(cardX, cardY, cardW, cardH);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fill();
      ctx.restore();
      withPath(
        () => drawPremiumCardPath(cardX, cardY, cardW, cardH),
        () => {
          const base = ctx.createLinearGradient(
            cardX,
            cardY,
            cardX + cardW,
            cardY + cardH,
          );
          base.addColorStop(0, theme.cardBaseStops[0]);
          base.addColorStop(0.26, theme.cardBaseStops[1]);
          base.addColorStop(0.58, theme.cardBaseStops[2]);
          base.addColorStop(1, theme.cardBaseStops[3]);
          ctx.fillStyle = base;
          ctx.fillRect(cardX - 6, cardY - 6, cardW + 12, cardH + 12);
          const metallic = ctx.createLinearGradient(
            cardX,
            cardY,
            cardX,
            cardY + cardH,
          );
          metallic.addColorStop(0, "rgba(255,255,255,0.26)");
          metallic.addColorStop(0.18, "rgba(255,255,255,0.06)");
          metallic.addColorStop(0.52, "rgba(255,255,255,0)");
          metallic.addColorStop(0.82, "rgba(255,255,255,0.12)");
          metallic.addColorStop(1, "rgba(255,255,255,0.02)");
          ctx.fillStyle = metallic;
          ctx.fillRect(cardX - 6, cardY - 6, cardW + 12, cardH + 12);
          ctx.strokeStyle = "rgba(255,255,255,0.09)";
          ctx.lineWidth = 2;
          for (let i = -220; i < cardW + 260; i += 64) {
            ctx.beginPath();
            ctx.moveTo(cardX + i, cardY + 40);
            ctx.lineTo(cardX + i + 260, cardY + cardH - 90);
            ctx.stroke();
          }
          ctx.strokeStyle = "rgba(255,255,255,0.1)";
          ctx.lineWidth = 3;
          for (let r = 180; r < 860; r += 90) {
            ctx.beginPath();
            ctx.arc(
              cardX + cardW * 0.2,
              cardY + cardH * 0.18,
              r,
              Math.PI * 0.08,
              Math.PI * 1.18,
            );
            ctx.stroke();
          }
          const sweep = ctx.createLinearGradient(
            cardX,
            cardY,
            cardX + cardW,
            cardY + cardH,
          );
          sweep.addColorStop(0.14, "rgba(255,255,255,0)");
          sweep.addColorStop(0.42, "rgba(255,255,255,0.2)");
          sweep.addColorStop(0.56, "rgba(255,255,255,0.06)");
          sweep.addColorStop(0.72, "rgba(255,255,255,0)");
          ctx.fillStyle = sweep;
          ctx.fillRect(cardX - 60, cardY - 80, cardW + 120, cardH + 160);
          const crownGlow = ctx.createRadialGradient(
            cardX + cardW * 0.54,
            cardY + 170,
            40,
            cardX + cardW * 0.54,
            cardY + 170,
            440,
          );
          crownGlow.addColorStop(0, theme.cardGlowStops[0]);
          crownGlow.addColorStop(1, theme.cardGlowStops[1]);
          ctx.fillStyle = crownGlow;
          ctx.fillRect(cardX - 10, cardY - 10, cardW + 20, cardH + 20);
        },
      );
      drawSilhouetteStroke(0, 20, theme.cardFrameOuter);
      drawSilhouetteStroke(18, 7, theme.cardFrameMid);
      drawSilhouetteStroke(34, 3.5, theme.cardFrameInner);
      const rarityX = 706;
      const rarityY = 88;
      drawRoundedRect(rarityX, rarityY, 224, 84, 34);
      const rarityGrad = ctx.createLinearGradient(
        rarityX,
        rarityY,
        rarityX + 224,
        rarityY + 84,
      );
      rarityGrad.addColorStop(0, theme.cardRarityStart);
      rarityGrad.addColorStop(1, rarityFill);
      ctx.fillStyle = rarityGrad;
      ctx.fill();
      ctx.strokeStyle = theme.cardRarityStroke;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = theme.cardRarityText;
      ctx.font = "900 42px Arial";
      ctx.textAlign = "center";
      ctx.fillText(rarityText, rarityX + 112, rarityY + 56);
      ctx.textAlign = "left";
      ctx.fillStyle = theme.cardOverallText;
      ctx.font = "900 188px Arial";
      ctx.fillText(overallText, 110, 254);
      if (positionText) {
        ctx.fillStyle = theme.cardPositionText;
        ctx.font = "900 58px Arial";
        ctx.fillText(positionText, 118, 318);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(118, 340);
      ctx.lineTo(252, 340);
      ctx.stroke();
      withPath(
        () => drawPortraitMaskPath(portraitX, portraitY, portraitW, portraitH),
        () => {
          const portraitBase = ctx.createLinearGradient(
            portraitX,
            portraitY,
            portraitX + portraitW,
            portraitY + portraitH,
          );
          portraitBase.addColorStop(0, "rgba(16,21,34,0.98)");
          portraitBase.addColorStop(0.45, "rgba(34,45,64,0.84)");
          portraitBase.addColorStop(1, "rgba(16,22,36,0.96)");
          ctx.fillStyle = portraitBase;
          ctx.fillRect(
            portraitX - 2,
            portraitY - 2,
            portraitW + 4,
            portraitH + 4,
          );
          const holo = ctx.createLinearGradient(
            portraitX,
            portraitY,
            portraitX + portraitW,
            portraitY + portraitH,
          );
          holo.addColorStop(0, theme.cardHoloStops[0]);
          holo.addColorStop(0.34, theme.cardHoloStops[1]);
          holo.addColorStop(0.72, theme.cardHoloStops[2]);
          holo.addColorStop(1, theme.cardHoloStops[3]);
          ctx.fillStyle = holo;
          ctx.fillRect(
            portraitX - 2,
            portraitY - 2,
            portraitW + 4,
            portraitH + 4,
          );
          if (portraitImg && portraitImg.width > 0 && portraitImg.height > 0) {
            ctx.save();
            ctx.filter = "blur(26px) brightness(0.72) saturate(1.08)";
            ctx.globalAlpha = 0.46;
            const bgScale = Math.max(
              portraitW / portraitImg.width,
              portraitH / portraitImg.height,
            );
            const bgW = portraitImg.width * bgScale;
            const bgH = portraitImg.height * bgScale;
            const bgX = portraitX + (portraitW - bgW) * 0.5;
            const bgY = portraitY + (portraitH - bgH) * 0.18;
            ctx.drawImage(portraitImg, bgX, bgY, bgW, bgH);
            ctx.restore();
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            const mainScale =
              Math.max(
                (portraitW - 54) / portraitImg.width,
                (portraitH - 34) / portraitImg.height,
              ) * 1.02;
            const drawW = portraitImg.width * mainScale;
            const drawH = portraitImg.height * mainScale;
            const drawX = portraitX + (portraitW - drawW) * 0.5;
            const drawY = portraitY + (portraitH - drawH) * 0.18;
            ctx.drawImage(portraitImg, drawX, drawY, drawW, drawH);
            ctx.restore();
          } else {
            const placeholder = ctx.createRadialGradient(
              portraitX + portraitW * 0.5,
              portraitY + portraitH * 0.36,
              36,
              portraitX + portraitW * 0.5,
              portraitY + portraitH * 0.48,
              portraitW * 0.48,
            );
            placeholder.addColorStop(0, "rgba(255,255,255,0.3)");
            placeholder.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = placeholder;
            ctx.fillRect(portraitX, portraitY, portraitW, portraitH);
          }
          const lowerFade = ctx.createLinearGradient(
            0,
            portraitY + portraitH * 0.48,
            0,
            portraitY + portraitH,
          );
          lowerFade.addColorStop(0, "rgba(0,0,0,0)");
          lowerFade.addColorStop(0.7, "rgba(12,14,24,0.2)");
          lowerFade.addColorStop(1, "rgba(12,14,24,0.68)");
          ctx.fillStyle = lowerFade;
          ctx.fillRect(
            portraitX - 2,
            portraitY - 2,
            portraitW + 4,
            portraitH + 4,
          );
          const portraitSweep = ctx.createLinearGradient(
            portraitX + 20,
            portraitY,
            portraitX + portraitW - 20,
            portraitY + portraitH,
          );
          portraitSweep.addColorStop(0.1, "rgba(255,255,255,0)");
          portraitSweep.addColorStop(0.42, "rgba(255,255,255,0.18)");
          portraitSweep.addColorStop(0.55, "rgba(255,255,255,0.05)");
          portraitSweep.addColorStop(0.7, "rgba(255,255,255,0)");
          ctx.fillStyle = portraitSweep;
          ctx.fillRect(
            portraitX - 2,
            portraitY - 2,
            portraitW + 4,
            portraitH + 4,
          );
        },
      );
      drawPortraitMaskPath(portraitX, portraitY, portraitW, portraitH);
      ctx.strokeStyle = theme.cardFrameEdge;
      ctx.lineWidth = 7;
      ctx.stroke();
      drawPortraitMaskPath(
        portraitX + 16,
        portraitY + 16,
        portraitW - 32,
        portraitH - 32,
      );
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      ctx.stroke();
      const fitName =
        nameText.length > 20 ? nameText.slice(0, 19) + "..." : nameText;
      const nameGrad = ctx.createLinearGradient(188, 0, 836, 0);
      nameGrad.addColorStop(0, theme.cardNameGradStops[0]);
      nameGrad.addColorStop(0.42, theme.cardNameGradStops[1]);
      nameGrad.addColorStop(1, theme.cardNameGradStops[2]);
      ctx.fillStyle = nameGrad;
      ctx.textAlign = "center";
      const finalNameSize = fitText(fitName, 740, 74);
      ctx.font = `900 ${finalNameSize}px Arial`;
      ctx.shadowColor = "rgba(18,28,46,0.48)";
      ctx.shadowBlur = 9;
      ctx.shadowOffsetY = 2;
      ctx.fillText(fitName, w * 0.5, 1022);
      ctx.shadowColor = "rgba(0,0,0,0)";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      const fitClub =
        clubText.length > 24 ? clubText.slice(0, 23) + "..." : clubText;
      ctx.fillStyle = theme.cardClubText;
      ctx.font = "800 50px Arial";
      ctx.fillText(fitClub, w * 0.5, 1092);
      const metaItems = [nationText, leagueText].filter(Boolean);
      if (metaItems.length) {
        const metaText = metaItems.join("  •  ");
        ctx.fillStyle = theme.cardMetaText;
        ctx.font = "900 28px Arial";
        ctx.fillText(metaText, w * 0.5, 1140);
      }
      drawRoundedRect(statsX, statsY, statsW, statsH, 32);
      const statsPanel = ctx.createLinearGradient(
        statsX,
        statsY,
        statsX,
        statsY + statsH,
      );
      statsPanel.addColorStop(0, "rgba(255,255,255,0.18)");
      statsPanel.addColorStop(0.2, "rgba(255,255,255,0.09)");
      statsPanel.addColorStop(1, "rgba(8,12,22,0.2)");
      ctx.fillStyle = statsPanel;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(statsX + statsW * 0.5, statsY + 22);
      ctx.lineTo(statsX + statsW * 0.5, statsY + statsH - 22);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let i = 1; i < 3; i += 1) {
        const y = statsY + (statsH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(statsX + 24, y);
        ctx.lineTo(statsX + statsW - 24, y);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const statRowsLeft = [
        ["PAC", data.pac],
        ["SHO", data.sho],
        ["PAS", data.pas],
      ];
      const statRowsRight = [
        ["DRI", data.dri],
        ["DEF", data.def],
        ["PHY", data.phy],
      ];
      const baseRowY = statsY + 48;
      const rowGap = 52;
      statRowsLeft.forEach(([label, value], index) => {
        drawStatLine(statsX + 38, baseRowY + index * rowGap, label, value);
      });
      statRowsRight.forEach(([label, value], index) => {
        drawStatLine(
          statsX + statsW * 0.5 + 28,
          baseRowY + index * rowGap,
          label,
          value,
        );
      });
      ctx.fillStyle = theme.cardFooterText;
      ctx.font = "900 34px Arial";
      ctx.fillText("PRESS LEFT / RIGHT TO SWITCH", w * 0.5, 1432);
      this._markRewardTextureDirty();
    };
    if (this._hasExactCardArt(data)) {
      renderExactCard(null);
    } else {
      renderDesignedCard(null);
    }
    const loadVisual = (index) => {
      if (index >= visualCandidates.length) {
        if (drawToken !== this._rewardDrawToken) return;
        renderDesignedCard(null);
        return;
      }
      const candidateEntry = visualCandidates[index] || {};
      const candidate = String(candidateEntry.url || "").trim();
      if (!candidate) {
        loadVisual(index + 1);
        return;
      }
      const normalizedCandidate =
        /^\/backend\/php\/api\/players\/image\?src=/i.test(candidate)
          ? candidate
          : /^(data:|blob:)/i.test(candidate)
            ? candidate
            : encodeURI(candidate);
      this._loadPortraitImage(normalizedCandidate)
        .then((img) => {
          if (drawToken !== this._rewardDrawToken) return;
          if (candidateEntry.kind === "card" && this._hasExactCardArt(data)) {
            renderExactCard(img);
            return;
          }
          renderDesignedCard(img);
        })
        .catch(() => {
          if (drawToken !== this._rewardDrawToken) return;
          fetch(normalizedCandidate, {
            credentials: "same-origin",
            cache: "force-cache",
          })
            .then((res) => {
              if (!res.ok) throw new Error("fetch failed");
              return res.blob();
            })
            .then((blob) => {
              if (drawToken !== this._rewardDrawToken) return;
              const blobUrl = URL.createObjectURL(blob);
              this._loadPortraitImage(blobUrl)
                .then((img) => {
                  URL.revokeObjectURL(blobUrl);
                  if (drawToken !== this._rewardDrawToken) return;
                  if (
                    candidateEntry.kind === "card" &&
                    this._hasExactCardArt(data)
                  ) {
                    renderExactCard(img);
                    return;
                  }
                  renderDesignedCard(img);
                })
                .catch(() => {
                  URL.revokeObjectURL(blobUrl);
                  if (drawToken !== this._rewardDrawToken) return;
                  loadVisual(index + 1);
                });
            })
            .catch(() => {
              if (drawToken !== this._rewardDrawToken) return;
              loadVisual(index + 1);
            });
        });
    };
    if (visualCandidates.length) {
      loadVisual(0);
    }
  }
  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(329485, 8, 30);
    this.camera = new THREE.PerspectiveCamera(
      52,
      this.root.clientWidth / this.root.clientHeight,
      0.1,
      100,
    );
    this.camera.position.set(0, 1.8, 8.2);
    this.cameraLookTarget = new THREE.Vector3(0, 1.25, 0);
    this.cameraBasePosition = this.camera.position.clone();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.root.clientWidth, this.root.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.baseExposure;
    this.root.appendChild(this.renderer.domElement);
    this.ambientLight = new THREE.AmbientLight(16777215, 0.56);
    this.keyLight = new THREE.DirectionalLight(16773583, 1.1);
    this.keyLight.position.set(-3.5, 5.5, 4.8);
    this.fillLight = new THREE.PointLight(
      this.theme.fillLightColor,
      0.46,
      26,
      2,
    );
    this.fillLight.position.set(2.4, 1.8, 2.8);
    this.rimLight = new THREE.PointLight(this.theme.rimLightColor, 0.38, 24, 2);
    this.rimLight.position.set(0, 3.4, -3);
    this.flashLight = new THREE.PointLight(16777215, 0, 40, 1.4);
    this.flashLight.position.set(0, 1.4, 0.3);
    this.scene.add(
      this.ambientLight,
      this.keyLight,
      this.fillLight,
      this.rimLight,
      this.flashLight,
    );
    window.addEventListener("resize", () => this._onResize());
  }
  _setupStage() {
    const floorGeo = new THREE.CircleGeometry(7.5, 96);
    const floorMat = new THREE.MeshStandardMaterial({
      color: this.theme.floorColor,
      roughness: 0.9,
      metalness: 0.08,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI * 0.5;
    floor.position.y = 0;
    this.scene.add(floor);
    const ringGeo = new THREE.TorusGeometry(1.25, 0.02, 14, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.theme.ringColor,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.energyRing = new THREE.Mesh(ringGeo, ringMat);
    this.energyRing.rotation.x = Math.PI * 0.5;
    this.energyRing.position.y = 0.04;
    this.scene.add(this.energyRing);
    const shadowTexture = this._createGoldenShadowTexture();
    const shadowMaterialOptions = {
      color: this.theme.shadowColor,
      transparent: true,
      opacity: 0.44,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    };
    if (shadowTexture) {
      shadowMaterialOptions.map = shadowTexture;
    }
    const shadowGeo = new THREE.CircleGeometry(2.55, 96);
    const shadowMat = new THREE.MeshBasicMaterial(shadowMaterialOptions);
    this.goldenShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.goldenShadow.rotation.x = -Math.PI * 0.5;
    this.goldenShadow.position.y = 0.012;
    this.goldenShadow.renderOrder = 3;
    this.scene.add(this.goldenShadow);
    const veilGeo = new THREE.SphereGeometry(20, 48, 32);
    const veilMat = new THREE.MeshBasicMaterial({
      color: 0,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.darkVeil = new THREE.Mesh(veilGeo, veilMat);
    this.scene.add(this.darkVeil);
    const portalTexture = this._createPortalGlowTexture();
    const portalMat = new THREE.MeshBasicMaterial({
      color: 16777215,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    if (portalTexture) {
      portalMat.map = portalTexture;
    }
    this.portalAura = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 80),
      portalMat,
    );
    this.portalAura.position.set(0, 1.65, -2.8);
    this.portalAura.renderOrder = 2;
    this.scene.add(this.portalAura);
    const portalRingMat = new THREE.MeshBasicMaterial({
      color: this.theme.ringColor,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.36, 0.06, 18, 110),
      portalRingMat,
    );
    this.portalRing.position.set(0, 1.66, -2.72);
    this.portalRing.renderOrder = 4;
    this.scene.add(this.portalRing);
    const beamTexture = this._createBeamTexture();
    const beamGeo = new THREE.PlaneGeometry(0.82, 5.2);
    const beamOffsets = [-2.2, -0.9, 0.9, 2.2];
    beamOffsets.forEach((offset, index) => {
      const beamMat = new THREE.MeshBasicMaterial({
        color: 16777215,
        transparent: true,
        opacity: index % 2 === 0 ? 0.2 : 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      if (beamTexture) {
        beamMat.map = beamTexture;
      }
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(offset, 2, -2.25 - Math.abs(offset) * 0.15);
      beam.rotation.z = offset < 0 ? 0.32 : -0.32;
      beam.renderOrder = 1;
      beam.userData.baseX = offset;
      beam.userData.baseY = beam.position.y;
      beam.userData.seed = index * 0.7 + 0.3;
      this.stageBeams.push(beam);
      this.scene.add(beam);
    });
    const runwayTexture = this._createRunwayTexture();
    const runwayGeo = new THREE.PlaneGeometry(4.8, 6.2);
    const runwayMat = new THREE.MeshBasicMaterial({
      color: 16777215,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    if (runwayTexture) {
      runwayMat.map = runwayTexture;
    }
    this.runway = new THREE.Mesh(runwayGeo, runwayMat);
    this.runway.rotation.x = -Math.PI * 0.5;
    this.runway.position.set(0, 0.03, -0.9);
    this.runway.renderOrder = 2;
    this.scene.add(this.runway);
    const segmentGeo = new THREE.PlaneGeometry(0.26, 1.35);
    [-1.42, -0.48, 0.48, 1.42].forEach((x, index) => {
      const segMat = new THREE.MeshBasicMaterial({
        color: this.theme.runwayCore,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const segment = new THREE.Mesh(segmentGeo, segMat);
      segment.rotation.x = -Math.PI * 0.5;
      segment.position.set(x, 0.04, -0.95);
      segment.renderOrder = 3;
      segment.userData.seed = index * 0.8;
      this.stageRunwaySegments.push(segment);
      this.scene.add(segment);
    });
    const pillarGeo = new THREE.BoxGeometry(0.24, 3.8, 0.24);
    [-3.05, 3.05].forEach((x) => {
      const pillarMat = new THREE.MeshStandardMaterial({
        color: this.theme.pillarCore,
        metalness: 0.68,
        roughness: 0.28,
        emissive: new THREE.Color(this.theme.pillarGlow),
        emissiveIntensity: 0.22,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 1.95, -1.9);
      pillar.userData.baseY = pillar.position.y;
      pillar.userData.seed = x < 0 ? 0.4 : 1.2;
      this.stagePillars.push(pillar);
      this.scene.add(pillar);
    });
  }
  _setupPack() {
    this.packRoot = new THREE.Group();
    this.packRoot.position.set(0, 1.35, 0);
    this.packRoot.scale.set(1.16, 1.16, 1);
    this._packTextureReady = false;
    this._packTextureReadyPromise = new Promise((resolve) => {
      this._packTextureReadyResolve = resolve;
    });
    const halfGeo = new THREE.PlaneGeometry(0.89, 2.64);
    this.leftHalfMat = new THREE.MeshStandardMaterial({
      color: 16774104,
      metalness: 0.72,
      roughness: 0.28,
      emissive: new THREE.Color(1183496),
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 1,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    });
    this.rightHalfMat = this.leftHalfMat.clone();
    this.leftHalf = new THREE.Mesh(halfGeo, this.leftHalfMat);
    this.rightHalf = new THREE.Mesh(halfGeo, this.rightHalfMat);
    this.leftHalf.position.set(-0.445, 0, 0.01);
    this.rightHalf.position.set(0.445, 0, 0.01);
    const seamGeo = new THREE.PlaneGeometry(0.04, 2.58);
    this.centerSeamMat = new THREE.MeshBasicMaterial({
      color: 16766720,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.centerSeam = new THREE.Mesh(seamGeo, this.centerSeamMat);
    this.centerSeam.position.set(0, 0, 0.012);
    this.packRoot.add(this.leftHalf, this.rightHalf, this.centerSeam);
    this.scene.add(this.packRoot);
    this._loadPackTexture();
  }
  _setupReward() {
    this.rewardGroup = new THREE.Group();
    this.rewardGroup.position.set(0, 1.34, -1.2);
    this.rewardGroup.visible = false;
    const initialSurface = this._createRewardSurface();
    if (!initialSurface) {
      throw new Error("Unable to create reward surface");
    }
    this.rewardCanvas = initialSurface.canvas;
    this.rewardCtx = initialSurface.ctx;
    this.rewardTexture = initialSurface.texture;
    const cardHeight = 2.16;
    const cardWidth =
      cardHeight * (this.rewardCanvas.width / this.rewardCanvas.height);
    this.cardWidth = cardWidth;
    this.cardHeight = cardHeight;
    const cardGeo = new THREE.PlaneGeometry(cardWidth, cardHeight);
    const cardMat = new THREE.MeshStandardMaterial({
      color: 16777215,
      metalness: 0,
      roughness: 1,
      emissive: new THREE.Color(0),
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
    });
    this.rewardCardMat = cardMat;
    this.rewardCard = new THREE.Mesh(cardGeo, cardMat);
    this.rewardCard.scale.set(0.02, 0.02, 0.02);
    const textMat = new THREE.MeshBasicMaterial({
      map: this.rewardTexture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    this.rewardTextMat = textMat;
    this._drawRewardCard(null);
    if (this.options.disableBuiltInRewardVisual) {
      this.rewardTextMat.opacity = 0;
    }
    const textOverlay = new THREE.Mesh(cardGeo, textMat);
    this.rewardTextOverlay = textOverlay;
    textOverlay.position.z = 0.02;
    textOverlay.renderOrder = 40;
    this.rewardCard.renderOrder = 20;
    this.rewardCard.add(textOverlay);
    this.rewardGroup.add(this.rewardCard);
    this._setupRewardStack();
    this.scene.add(this.rewardGroup);
  }
  _setupParticles() {
    const count = 620;
    this.particleCount = count;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = 1.35;
      positions[i * 3 + 2] = 0;
      const theta = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 3.2;
      const lift = 1.2 + Math.random() * 2.4;
      velocities[i * 3 + 0] = Math.cos(theta) * speed;
      velocities[i * 3 + 1] = lift;
      velocities[i * 3 + 2] = Math.sin(theta) * speed;
    }
    this.particleVelocities = velocities;
    this.particleBirthTime = -1;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.055,
      color: 12967423,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }
  _setupInteraction() {
    this.clickableMeshes = [this.leftHalf, this.rightHalf, this.centerSeam];
    this.renderer.domElement.addEventListener("pointerdown", (event) => {
      if (this.isAnimating || (this.rewardGroup && this.rewardGroup.visible))
        return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.clickableMeshes, false);
      if (hit.length > 0) {
        this.start();
      }
    });
  }
  async _runOpeningSequence() {
    this.isAnimating = true;
    this.packDebrisLocked = false;
    this.openedPackFloat.active = false;
    this._setRewardStackVisible(false);
    const camStart = this.camera.position.clone();
    const camMid = new THREE.Vector3(0.2, 1.72, 5.4);
    const camEnd = new THREE.Vector3(0.02, 1.56, 3.52);
    this.packRoot.visible = true;
    this.leftHalfMat.opacity = 1;
    this.rightHalfMat.opacity = 1;
    this.centerSeamMat.opacity = 0;
    this.leftHalfMat.emissiveIntensity = 0.48;
    this.rightHalfMat.emissiveIntensity = 0.48;
    await this._tween(700, (t) => {
      const k = EASING.easeInOutCubic(t);
      this.camera.position.lerpVectors(camStart, camMid, k);
      this.cameraLookTarget.set(0, 1.28, 0);
      this.packRoot.rotation.y = 0.08 * k;
      this.energyRing.material.opacity = 0.14 + 0.12 * k;
      this.energyRing.scale.setScalar(1 + 0.12 * k);
      if (this.goldenShadow) {
        this.goldenShadow.material.opacity = 0.22 + 0.24 * k;
        this.goldenShadow.scale.setScalar(1 + 0.36 * k);
      }
      if (this.portalAura) {
        this.portalAura.material.opacity = 0.22 + 0.18 * k;
        this.portalAura.scale.setScalar(0.92 + 0.18 * k);
      }
      if (this.portalRing) {
        this.portalRing.material.opacity = 0.14 + 0.18 * k;
        this.portalRing.scale.setScalar(0.95 + 0.12 * k);
      }
      if (this.runway) {
        this.runway.material.opacity = 0.3 + 0.18 * k;
      }
      this.renderer.toneMappingExposure = this.baseExposure + 0.25 * k;
    });
    this.packRoot.position.set(0, 1.35, 0);
    this.packRoot.rotation.z = 0;
    this.camera.position.copy(camMid);
    this._emitBurst();
    await this._tween(740, (t) => {
      const k = EASING.easeOutCubic(t);
      const split = 1.52 * k;
      this.leftHalf.position.x = -0.445 - split;
      this.rightHalf.position.x = 0.445 + split;
      this.leftHalf.position.z = -0.48 * k;
      this.rightHalf.position.z = -0.48 * k;
      this.leftHalf.rotation.y = -0.92 * k;
      this.rightHalf.rotation.y = 0.92 * k;
      this.leftHalf.rotation.z = -0.36 * k;
      this.rightHalf.rotation.z = 0.36 * k;
      this.centerSeam.scale.y = Math.max(0.04, 1 - 0.96 * k);
      const seamPulse = Math.sin(Math.PI * Math.min(1, k * 1.2));
      this.centerSeamMat.opacity = seamPulse * (1 - k * 0.7);
      const fade = 0.56 + (1 - k) * 0.44;
      this.leftHalfMat.opacity = fade;
      this.rightHalfMat.opacity = fade;
      this.camera.position.lerpVectors(camMid, camEnd, k);
      this.cameraLookTarget.set(0, 1.28, 0.32 * k);
      this.flashLight.intensity = 2.2 + 8 * (1 - Math.abs(0.5 - k) * 2);
      this.energyRing.scale.setScalar(1.18 + 0.88 * k);
      this.energyRing.material.opacity = 0.34 - 0.12 * k;
      if (this.goldenShadow) {
        this.goldenShadow.material.opacity = 0.42 + 0.22 * k;
        this.goldenShadow.scale.setScalar(1.22 + 1.08 * k);
      }
      if (this.portalAura) {
        this.portalAura.material.opacity =
          0.4 + 0.18 * (1 - Math.abs(0.5 - k) * 2);
        this.portalAura.scale.setScalar(1.08 + 0.48 * k);
      }
      if (this.portalRing) {
        this.portalRing.material.opacity = 0.2 + 0.24 * (1 - k * 0.4);
        this.portalRing.scale.setScalar(1.06 + 0.42 * k);
      }
      if (this.runway) {
        this.runway.material.opacity = 0.42 + 0.18 * (1 - k * 0.5);
      }
      this.renderer.toneMappingExposure =
        this.baseExposure + 0.8 * Math.sin(Math.PI * k);
    });
    this.packDebrisLocked = true;
    this.openedPackFloat.active = true;
    this.packRoot.visible = true;
    this.packRoot.position.set(
      this.openedPackFloat.rootBaseX,
      this.openedPackFloat.rootBaseY,
      this.openedPackFloat.rootBaseZ,
    );
    this.packRoot.rotation.set(0, 0, 0);
    this.leftHalf.position.copy(this.openedPackFloat.leftBasePos);
    this.rightHalf.position.copy(this.openedPackFloat.rightBasePos);
    this.leftHalf.rotation.copy(this.openedPackFloat.leftBaseRot);
    this.rightHalf.rotation.copy(this.openedPackFloat.rightBaseRot);
    this.leftHalfMat.opacity = 0.46;
    this.rightHalfMat.opacity = 0.46;
    this.leftHalfMat.emissiveIntensity = 0.14;
    this.rightHalfMat.emissiveIntensity = 0.14;
    this.darknessLevel = 0.5;
    this.darkVeil.material.opacity = this.darknessLevel;
    if (this.options.disableBuiltInRewardVisual) {
      this.rewardGroup.visible = false;
      this._setRewardStackVisible(false);
    }
    this.setRewardData(this.options.rewardData);
    if (this.options.onReveal) {
      try {
        this.options.onReveal(this.options.rewardData || null);
      } catch (e) {}
    }
    if (!this.options.disableBuiltInRewardVisual) {
      this.rewardGroup.visible = true;
      this._setRewardStackVisible(true);
    }
    await this._tween(820, (t) => {
      const k = EASING.easeOutBack(t);
      const dramaticScale = 0.02 + 1.12 * k;
      this.rewardCard.scale.setScalar(dramaticScale);
      this.rewardGroup.position.y = 1.34 + (1 - k) * 0.34;
      this.rewardGroup.position.z = -1.2 + k * 2;
      this.flashLight.intensity = 6 * (1 - t);
      if (this.portalAura) {
        this.portalAura.material.opacity = 0.46 + 0.12 * (1 - t);
      }
      if (this.portalRing) {
        this.portalRing.material.opacity = 0.28 + 0.1 * (1 - t);
      }
      this.renderer.toneMappingExposure = this.baseExposure + 0.35 * (1 - t);
    });
    this.renderer.toneMappingExposure = this.baseExposure;
    this.isAnimating = false;
    if (this.options.onComplete) {
      try {
        this.options.onComplete();
      } catch (e) {}
    }
  }
  _emitBurst() {
    const posAttr = this.particles.geometry.getAttribute("position");
    for (let i = 0; i < this.particleCount; i += 1) {
      posAttr.array[i * 3 + 0] = 0;
      posAttr.array[i * 3 + 1] = 1.35;
      posAttr.array[i * 3 + 2] = 0;
      const theta = Math.random() * Math.PI * 2;
      const speed = 1.7 + Math.random() * 3.3;
      const lift = 1.25 + Math.random() * 2.5;
      this.particleVelocities[i * 3 + 0] = Math.cos(theta) * speed;
      this.particleVelocities[i * 3 + 1] = lift;
      this.particleVelocities[i * 3 + 2] = Math.sin(theta) * speed;
    }
    posAttr.needsUpdate = true;
    this.particleBirthTime = this.clock.getElapsedTime();
    this.particles.material.opacity = 1;
  }
  _updateOpenedPackFloat(time) {
    if (!this.packDebrisLocked || !this.openedPackFloat.active) return;
    if (!this.packRoot || !this.leftHalf || !this.rightHalf) return;
    const cfg = this.openedPackFloat;
    const speed = cfg.speed;
    const yWave = Math.sin(time * speed);
    const sideWave = Math.sin(time * speed * 0.77 + 0.9);
    const driftX = sideWave * cfg.xAmp;
    const leftY =
      yWave * cfg.yAmp +
      Math.sin(time * speed * 1.12 + 1.4) * (cfg.yAmp * 0.26);
    const rightY =
      -yWave * cfg.yAmp * 0.82 +
      Math.sin(time * speed * 1.08 + 2.35) * (cfg.yAmp * 0.24);
    this.packRoot.position.x = cfg.rootBaseX;
    this.packRoot.position.y =
      cfg.rootBaseY + Math.sin(time * speed * 0.35 + 0.2) * 0.01;
    this.packRoot.position.z = cfg.rootBaseZ;
    this.leftHalf.position.x = cfg.leftBasePos.x + driftX;
    this.rightHalf.position.x = cfg.rightBasePos.x - driftX * 0.92;
    this.leftHalf.position.y = cfg.leftBasePos.y + leftY;
    this.rightHalf.position.y = cfg.rightBasePos.y + rightY;
    this.leftHalf.position.z =
      cfg.leftBasePos.z + Math.sin(time * speed * 0.63 + 0.45) * cfg.zAmp;
    this.rightHalf.position.z =
      cfg.rightBasePos.z + Math.sin(time * speed * 0.61 + 2.18) * cfg.zAmp;
    this.leftHalf.rotation.y =
      cfg.leftBaseRot.y + Math.sin(time * speed * 0.52 + 0.4) * cfg.rotYAmp;
    this.rightHalf.rotation.y =
      cfg.rightBaseRot.y - Math.sin(time * speed * 0.49 + 1.1) * cfg.rotYAmp;
    this.leftHalf.rotation.z =
      cfg.leftBaseRot.z + Math.sin(time * speed * 0.58 + 1.8) * cfg.rotZAmp;
    this.rightHalf.rotation.z =
      cfg.rightBaseRot.z + Math.sin(time * speed * 0.56 + 3) * cfg.rotZAmp;
  }
  _updateParticles() {
    if (this.particleBirthTime < 0) return;
    const elapsed = this.clock.getElapsedTime() - this.particleBirthTime;
    const lifetime = 1.6;
    if (elapsed > lifetime) {
      this.particleBirthTime = -1;
      this.particles.material.opacity = 0;
      return;
    }
    const drag = 0.86;
    const gravity = 2.7;
    const posAttr = this.particles.geometry.getAttribute("position");
    const dt = Math.min(this.clock.getDelta(), 0.033);
    for (let i = 0; i < this.particleCount; i += 1) {
      const px = i * 3;
      let vx = this.particleVelocities[px + 0];
      let vy = this.particleVelocities[px + 1];
      let vz = this.particleVelocities[px + 2];
      vx *= 1 - (1 - drag) * dt * 3;
      vy -= gravity * dt;
      vz *= 1 - (1 - drag) * dt * 3;
      this.particleVelocities[px + 0] = vx;
      this.particleVelocities[px + 1] = vy;
      this.particleVelocities[px + 2] = vz;
      posAttr.array[px + 0] += vx * dt;
      posAttr.array[px + 1] += vy * dt;
      posAttr.array[px + 2] += vz * dt;
    }
    posAttr.needsUpdate = true;
    this.particles.material.opacity = Math.max(0, 1 - elapsed / lifetime);
  }
  _animate() {
    requestAnimationFrame(() => this._animate());
    const t = this.clock.getElapsedTime();
    if (!this.isAnimating && this.packRoot.visible && !this.packDebrisLocked) {
      this.packRoot.position.y = 1.35 + Math.sin(t * 1.8) * 0.06;
      this.packRoot.rotation.y = Math.sin(t * 0.85) * 0.26;
      this.packRoot.rotation.z = Math.sin(t * 1.15) * 0.03;
    }
    if (!this.isAnimating && this.packRoot.visible && this.packDebrisLocked) {
      this._updateOpenedPackFloat(t);
    }
    if (this.rewardGroup.visible && !this.isRewardTransitioning) {
      this.rewardCard.rotation.y = Math.sin(t * 1.1) * 0.08;
      this.rewardCard.rotation.x = Math.sin(t * 0.65) * 0.032;
    }
    if (this.rewardGroup.visible && !this.isAnimating) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
      this.energyRing.material.opacity = 0.2 + pulse * 0.14;
      this.energyRing.scale.setScalar(2.06 + pulse * 0.06);
      if (this.goldenShadow) {
        this.goldenShadow.material.opacity = 0.5 + pulse * 0.18;
        this.goldenShadow.scale.setScalar(2.34 + pulse * 0.2);
      }
    }
    if (this.portalAura) {
      const auraPulse = 0.5 + 0.5 * Math.sin(t * 1.2 + 0.4);
      this.portalAura.material.opacity = 0.24 + auraPulse * 0.26;
      this.portalAura.scale.setScalar(1.04 + auraPulse * 0.12);
    }
    if (this.portalRing) {
      const ringPulse = 0.5 + 0.5 * Math.sin(t * 1.55 + 0.2);
      this.portalRing.material.opacity = 0.14 + ringPulse * 0.18;
      this.portalRing.rotation.z += 0.003;
      this.portalRing.scale.setScalar(1.02 + ringPulse * 0.06);
    }
    if (this.runway) {
      const runwayPulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      this.runway.material.opacity = 0.3 + runwayPulse * 0.22;
    }
    this.stageRunwaySegments.forEach((segment, index) => {
      const flicker =
        0.5 + 0.5 * Math.sin(t * 3.4 + (segment.userData.seed || index));
      segment.material.opacity = 0.14 + flicker * 0.24;
      segment.position.z =
        -0.95 + Math.sin(t * 1.1 + (segment.userData.seed || index)) * 0.04;
    });
    this.stageBeams.forEach((beam, index) => {
      const pulse =
        0.5 + 0.5 * Math.sin(t * 1.6 + (beam.userData.seed || index));
      beam.material.opacity = 0.08 + pulse * 0.18;
      beam.position.y =
        (beam.userData.baseY || 2) + Math.sin(t * 0.9 + index) * 0.08;
      beam.rotation.z += (index % 2 === 0 ? 1 : -1) * 8e-4;
    });
    this.stagePillars.forEach((pillar, index) => {
      const pulse =
        0.5 + 0.5 * Math.sin(t * 1.7 + (pillar.userData.seed || index));
      pillar.position.y =
        (pillar.userData.baseY || 1.95) + Math.sin(t * 0.75 + index) * 0.03;
      pillar.material.emissiveIntensity = 0.16 + pulse * 0.22;
    });
    this.energyRing.rotation.z += 0.004;
    this.darkVeil.material.opacity +=
      (this.darknessLevel - this.darkVeil.material.opacity) * 0.08;
    this.ambientLight.intensity =
      0.56 * (1 - this.darkVeil.material.opacity * 0.5);
    this.fillLight.intensity =
      0.46 * (1 - this.darkVeil.material.opacity * 0.55);
    this._updateRewardStackAnimation();
    this._updateParticles();
    this.camera.lookAt(this.cameraLookTarget);
    this.renderer.render(this.scene, this.camera);
  }
  _onResize() {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
  _tween(durationMs, update) {
    const start = performance.now();
    return new Promise((resolve) => {
      const step = () => {
        const now = performance.now();
        const t = Math.min((now - start) / durationMs, 1);
        update(t);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      step();
    });
  }
  _nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }
}
const root = document.getElementById("pack-opening-root");
if (root) {
  new PackOpening3D(root, {
    rewardTitle: "ICON",
    rewardValue: "93",
    rewardColor: "#ffd95a",
  });
}

(function () {
  "use strict";
  const TABS = ["home", "lineups", "players", "play", "chests", "settings"];
  const STORAGE_KEY_LAST_TAB = "footycraft_last_tab";
  const STORAGE_KEY_FORCE_HOME_ONCE = "footycraft_force_home_once";
  const STORAGE_KEY_LAST_ACTIVITY = "footycraft_last_activity";
  const STORAGE_KEY_SOUND_SETTINGS = "footycraft_sound_settings";
  const STORAGE_KEY_SOUNDTRACK_RUNTIME = "footycraft_soundtrack_runtime";
  const SMART_DJ_PRELOAD_SECONDS = 12;
  const SMART_DJ_CROSSFADE_MS = 900;
  const DEFAULT_COVER = "/frontend/assets/images/ui/logo.png";
  const AUTOPLAY_UNMUTE_DELAY_MS = 450;
  const FALLBACK_SONG_FILES = [
    {
      fileName: "Don't You Worry Child - Radio Edit.mp3",
      url: "/frontend/assets/songs/Don't%20You%20Worry%20Child%20-%20Radio%20Edit.mp3",
      title: "Don't You Worry Child - Radio Edit",
      artist: "Swedish House Mafia, John Martin",
      cover:
        "/frontend/assets/songs/covers/Don_t_You_Worry_Child_-_Radio_Edit.jpg",
    },
    {
      fileName: "Fire - Official UEFA EURO 2024 Song.mp3",
      url: "/frontend/assets/songs/Fire%20-%20Official%20UEFA%20EURO%202024%20Song.mp3",
      title: "Fire - Official UEFA EURO 2024 Song",
      artist: "MEDUZA, OneRepublic, Leony",
      cover:
        "/frontend/assets/songs/covers/Fire_-_Official_UEFA_EURO_2024_Song.jpg",
    },
    {
      fileName:
        "Get Lucky (Radio Edit) [feat. Pharrell Williams and Nile Rodgers].mp3",
      url: "/frontend/assets/songs/Get%20Lucky%20(Radio%20Edit)%20%5Bfeat.%20Pharrell%20Williams%20and%20Nile%20Rodgers%5D.mp3",
      title:
        "Get Lucky (Radio Edit) [feat. Pharrell Williams and Nile Rodgers]",
      artist: "Daft Punk, Pharrell Williams, Nile Rodgers",
      cover:
        "/frontend/assets/songs/covers/Get_Lucky_Radio_Edit_feat_Pharrell_Williams_and_Nile_Rodgers.jpg",
    },
    {
      fileName: "Heat Waves.mp3",
      url: "/frontend/assets/songs/Heat%20Waves.mp3",
      title: "Heat Waves",
      artist: "Glass Animals",
      cover: "/frontend/assets/songs/covers/Heat_Waves.jpg",
    },
    {
      fileName: "I'm Not Alone - 2009 Remaster.mp3",
      url: "/frontend/assets/songs/I'm%20Not%20Alone%20-%202009%20Remaster.mp3",
      title: "I'm Not Alone - 2009 Remaster",
      artist: "Calvin Harris",
      cover: "/frontend/assets/songs/covers/I_m_Not_Alone_-_2009_Remaster.jpg",
    },
    {
      fileName: "Light It Up.mp3",
      url: "/frontend/assets/songs/Light%20It%20Up.mp3",
      title: "Light It Up (feat. Nyla & Fuse ODG) [Remix]",
      artist: "Major Lazer, Nyla, Fuse ODG",
      cover: "/frontend/assets/songs/covers/Light_It_Up.jpg",
    },
    {
      fileName: "Love Me Again.mp3",
      url: "/frontend/assets/songs/Love%20Me%20Again.mp3",
      title: "Love Me Again",
      artist: "John Newman",
      cover: "/frontend/assets/songs/covers/Love_Me_Again.jpg",
    },
    {
      fileName: "Midnight City.mp3",
      url: "/frontend/assets/songs/Midnight%20City.mp3",
      title: "Midnight City",
      artist: "M83",
      cover: "/frontend/assets/songs/covers/Midnight_City.jpg",
    },
    {
      fileName: "Oh Qué Será.mp3",
      url: "/frontend/assets/songs/Oh%20Qu%C3%A9%20Ser%C3%A1.mp3",
      title: "Oh Qué Será?",
      artist: "Willie Colón",
      cover: "/frontend/assets/songs/covers/Oh_Que_Sera.jpg",
    },
    {
      fileName: "One More Time.mp3",
      url: "/frontend/assets/songs/One%20More%20Time.mp3",
      title: "One More Time",
      artist: "Daft Punk",
      cover: "/frontend/assets/songs/covers/One_More_Time.jpg",
    },
    {
      fileName: "Pjanoo - Club Mix.mp3",
      url: "/frontend/assets/songs/Pjanoo%20-%20Club%20Mix.mp3",
      title: "Pjanoo - Club Mix",
      artist: "Eric Prydz",
      cover: "/frontend/assets/songs/covers/Pjanoo_-_Club_Mix.jpg",
    },
    {
      fileName: "Rapture - Avicii New Generation Radio Edit.mp3",
      url: "/frontend/assets/songs/Rapture%20-%20Avicii%20New%20Generation%20Radio%20Edit.mp3",
      title: "Rapture - Avicii New Generation Radio Edit",
      artist: "Nadia Ali, Avicii",
      cover:
        "/frontend/assets/songs/covers/Rapture_-_Avicii_New_Generation_Radio_Edit.jpg",
    },
    {
      fileName: "Samba de Janeiro.mp3",
      url: "/frontend/assets/songs/Samba%20de%20Janeiro.mp3",
      title: "Samba de Janeiro",
      artist: "Bellini",
      cover: "/frontend/assets/songs/covers/Samba_de_Janeiro.jpg",
    },
    {
      fileName: "Song 2 - 2012 Remaster.mp3",
      url: "/frontend/assets/songs/Song%202%20-%202012%20Remaster.mp3",
      title: "Song 2 - 2012 Remaster",
      artist: "Blur",
      cover: "/frontend/assets/songs/covers/Song_2_-_2012_Remaster.jpg",
    },
    {
      fileName: "Summer.mp3",
      url: "/frontend/assets/songs/Summer.mp3",
      title: "Summer",
      artist: "Calvin Harris",
      cover: "/frontend/assets/songs/covers/Summer.jpg",
    },
    {
      fileName: "The Nights.mp3",
      url: "/frontend/assets/songs/The%20Nights.mp3",
      title: "The Nights",
      artist: "Avicii",
      cover: "/frontend/assets/songs/covers/The_Nights.jpg",
    },
    {
      fileName: "UEFA Champions League Legacy Anthem - Full Version.mp3",
      url: "/frontend/assets/songs/UEFA%20Champions%20League%20Legacy%20Anthem%20-%20Full%20Version.mp3",
      title: "UEFA Champions League Legacy Anthem - Full Version",
      artist: "UEFA, Tony Britten",
      cover:
        "/frontend/assets/songs/covers/UEFA_Champions_League_Legacy_Anthem_-_Full_Version.jpg",
    },
    {
      fileName: "Veridis Quo.mp3",
      url: "/frontend/assets/songs/Veridis%20Quo.mp3",
      title: "Veridis Quo",
      artist: "Daft Punk",
      cover: "/frontend/assets/songs/covers/Veridis_Quo.jpg",
    },
    {
      fileName:
        "Waka Waka (This Time for Africa) [The Official 2010 FIFA World Cup (TM) Song].mp3",
      url: "/frontend/assets/songs/Waka%20Waka%20(This%20Time%20for%20Africa)%20%5BThe%20Official%202010%20FIFA%20World%20Cup%20(TM)%20Song%5D.mp3",
      title:
        "Waka Waka (This Time for Africa) [The Official 2010 FIFA World Cup (TM) Song] (feat. Freshlyground)",
      artist: "Shakira, Freshlyground",
      cover:
        "/frontend/assets/songs/covers/Waka_Waka_This_Time_for_Africa_The_Official_2010_FIFA_World_Cup_TM_Song.jpg",
    },
    {
      fileName:
        "We Are One (Ole Ola) [The Official 2014 FIFA World Cup Song] (feat. Jennifer Lopez & Claudia Leitte).mp3",
      url: "/frontend/assets/songs/We%20Are%20One%20(Ole%20Ola)%20%5BThe%20Official%202014%20FIFA%20World%20Cup%20Song%5D%20(feat.%20Jennifer%20Lopez%20%26%20Claudia%20Leitte).mp3",
      title:
        "We Are One (Ole Ola) [The Official 2014 FIFA World Cup Song] (feat. Jennifer Lopez & Claudia Leitte)",
      artist: "Pitbull, Jennifer Lopez, Claudia Leitte",
      cover:
        "/frontend/assets/songs/covers/We_Are_One_Ole_Ola_The_Official_2014_FIFA_World_Cup_Song_feat_Jennifer_Lopez_Cla.jpg",
    },
  ];
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabSections = document.querySelectorAll(".tab-section");
  const navFlare = document.querySelector(".nav-flare");
  const dashboardRoot = document.getElementById("dashboard");
  const communitySection = document.getElementById("community-section");
  const newsSection = document.getElementById("news-section");
  const communityNavButtons = document.querySelectorAll(".dashboard-community-nav .community-shell-link");
  const newsNavButtons = document.querySelectorAll(".dashboard-news-nav .community-shell-link");
  const communityHomeButtons = document.querySelectorAll(
    '[data-community-home="true"]',
  );
  const newsHomeButtons = document.querySelectorAll('[data-news-home="true"]');
  const lastActivityText = document.getElementById("lastActivityText");
  const soundtrackWidget = document.getElementById("soundtrackWidget");
  const soundtrackPlayBtn = document.getElementById("soundtrackPlayBtn");
  const soundtrackNextBtn = document.getElementById("soundtrackNextBtn");
  const soundtrackTitle = document.getElementById("soundtrackTitle");
  const soundtrackArtist = document.getElementById("soundtrackArtist");
  const soundtrackCover = document.getElementById("soundtrackCover");
  const soundtrackChip = document.getElementById("soundtrackChip");
  const soundtrackHoverTitle = document.getElementById("soundtrackHoverTitle");
  const soundtrackHoverArtist = document.getElementById(
    "soundtrackHoverArtist",
  );
  const soundSettingsTile = document.querySelector(".sound-settings-tile");
  const masterVolumeSlider = document.getElementById("masterVolumeSlider");
  const masterVolumeValue = document.getElementById("masterVolumeValue");
  const musicVolumeSlider = document.getElementById("musicVolumeSlider");
  const musicVolumeValue = document.getElementById("musicVolumeValue");
  const sfxVolumeSlider = document.getElementById("sfxVolumeSlider");
  const sfxVolumeValue = document.getElementById("sfxVolumeValue");
  const soundtrackEnabledToggle = document.getElementById(
    "soundtrackEnabledToggle",
  );
  const focusModeToggle = document.getElementById("focusModeToggle");
  const soundSettingsModal = document.getElementById("sound-settings-modal");
  const soundSettingsBackdrop = document.getElementById(
    "sound-settings-backdrop",
  );
  const soundSettingsClose = document.getElementById("sound-settings-close");
  const legalTile = document.querySelector(".legal-tile");
  const legalModal = document.getElementById("legal-modal");
  const legalBackdrop = document.getElementById("legal-backdrop");
  const legalClose = document.getElementById("legal-close");
  const creditsTile = document.querySelector(".credits-tile");
  const creditsModal = document.getElementById("credits-modal");
  const creditsBackdrop = document.getElementById("credits-backdrop");
  const creditsClose = document.getElementById("credits-close");
  const isDashboardShell = tabSections.length > 0;
  let currentTab = "home";
  let currentTabIndex = 0;
  let soundtrackTracks = [];
  let currentTrackIndex = -1;
  let nextTrackIndex = -1;
  let pendingStartupTrackIndex = -1;
  let soundtrackReady = false;
  let isSmartDjPreparing = false;
  let smartDjReady = false;
  let handoffInProgress = false;
  let autoplayRetryTimer = null;
  let autoplayBootstrapPending = false;
  let bufferingRecoveryTimer = null;
  let autoMixInProgress = false;
  let communityOpen = false;
  let newsOpen = false;
  let soundSettings = {
    master: 80,
    music: 60,
    sfx: 90,
    soundtrackEnabled: true,
    focusMode: false,
  };
  const audioA = new Audio();
  const audioB = new Audio();
  let activeAudio = audioA;
  let standbyAudio = audioB;
  [audioA, audioB].forEach((audio) => {
    audio.preload = "auto";
  });
  function setRoute(route, replace = false) {
    if (!route) return;
    if (
      window.history &&
      typeof window.history[replace ? "replaceState" : "pushState"] ===
        "function"
    ) {
      window.history[replace ? "replaceState" : "pushState"](
        null,
        "",
        `#${route}`,
      );
    } else {
      window.location.hash = route;
    }
  }
  function consumeForceHomeFlag() {
    try {
      const shouldForceHome =
        localStorage.getItem(STORAGE_KEY_FORCE_HOME_ONCE) === "true";
      if (shouldForceHome) {
        localStorage.removeItem(STORAGE_KEY_FORCE_HOME_ONCE);
      }
      return shouldForceHome;
    } catch (error) {
      return false;
    }
  }
  function syncShellHeader(mode) {
    if (!dashboardRoot) return;
    const isCommunityOpen = mode === "community";
    const isNewsOpen = mode === "news";
    dashboardRoot.classList.toggle("community-mode", isCommunityOpen);
    dashboardRoot.classList.toggle("news-mode", isNewsOpen);
    if (communitySection) {
      communitySection.setAttribute(
        "aria-hidden",
        isCommunityOpen ? "false" : "true",
      );
    }
    if (newsSection) {
      newsSection.setAttribute("aria-hidden", isNewsOpen ? "false" : "true");
    }
  }
  function openCommunity(updateHistory = true) {
    communityOpen = true;
    newsOpen = false;
    syncShellHeader("community");
    updateFlarePosition();
    if (updateHistory) {
      setRoute("community");
    }
  }
  function closeCommunity(targetTab = currentTab, updateHistory = true) {
    communityOpen = false;
    syncShellHeader(null);
    if (targetTab && TABS.includes(targetTab) && targetTab !== currentTab) {
      switchTab(targetTab, { updateHistory: false });
    }
    updateFlarePosition();
    if (updateHistory) {
      setRoute(targetTab || currentTab || "home");
    }
  }
  function openNews(updateHistory = true) {
    newsOpen = true;
    communityOpen = false;
    syncShellHeader("news");
    updateFlarePosition();
    window.FC_NEWS?.focusSearch?.();
    if (updateHistory) {
      setRoute("news");
    }
  }
  function closeNews(targetTab = currentTab, updateHistory = true) {
    newsOpen = false;
    syncShellHeader(null);
    if (targetTab && TABS.includes(targetTab) && targetTab !== currentTab) {
      switchTab(targetTab, { updateHistory: false });
    }
    updateFlarePosition();
    if (updateHistory) {
      setRoute(targetTab || currentTab || "home");
    }
  }
  function switchTab(tabName, options = {}) {
    const { updateHistory: updateHistory = true } = options;
    if (!TABS.includes(tabName)) {
      console.warn(`Invalid tab: ${tabName}`);
      return;
    }
    const newTabIndex = TABS.indexOf(tabName);
    if (tabName === currentTab && document.querySelector(".tab-section.active"))
      return;
    const prevTab = currentTab;
    currentTab = tabName;
    currentTabIndex = newTabIndex;
    if (communityOpen || newsOpen) {
      communityOpen = false;
      newsOpen = false;
      syncShellHeader(null);
    }
    if (updateHistory) {
      setRoute(tabName);
    }
    navTabs.forEach((tab) => {
      const tabData = tab.getAttribute("data-tab");
      if (tabData === tabName) {
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
      } else {
        tab.classList.remove("active");
        tab.setAttribute("aria-selected", "false");
      }
    });
    const oldSection = document.getElementById(`${prevTab}-section`);
    const newSection = document.getElementById(`${tabName}-section`);
    tabSections.forEach((section) => {
      if (section === newSection) {
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });
    const slider = document.getElementById("dashboardSlider");
    if (slider) {
      slider.style.transform = `translateX(-${newTabIndex * 100}%)`;
    }
    updateFlarePosition();
    localStorage.setItem(STORAGE_KEY_LAST_TAB, tabName);
  }
  function updateFlarePosition() {
    // 1. Handle Main Nav Flare
    const mainFlare = document.querySelector(".dashboard-nav .nav-flare");
    if (mainFlare) {
      if (communityOpen || newsOpen) {
        mainFlare.style.opacity = "0";
      } else {
        const activeTab = document.querySelector(".nav-tab.active");
        const pillContainer = document.querySelector(".nav-tabs-custom");
        if (activeTab && pillContainer) {
          const containerRect = pillContainer.getBoundingClientRect();
          const tabRect = activeTab.getBoundingClientRect();
          mainFlare.style.left = `${tabRect.left - containerRect.left}px`;
          mainFlare.style.width = `${tabRect.width}px`;
          mainFlare.style.opacity = "1";
        } else {
          mainFlare.style.opacity = "0";
        }
      }
    }

    // 2. Handle Community Nav Flare
    const commFlare = document.querySelector(".dashboard-community-nav .nav-flare");
    if (commFlare) {
      if (!communityOpen) {
        commFlare.style.opacity = "0";
      } else {
        const activeLink = document.querySelector(".dashboard-community-nav .community-shell-link.active");
        const navContainer = document.querySelector(".dashboard-community-nav");
        if (activeLink && navContainer) {
          const containerRect = navContainer.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();
          commFlare.style.left = `${linkRect.left - containerRect.left}px`;
          commFlare.style.width = `${linkRect.width}px`;
          commFlare.style.opacity = "1";
        } else {
          commFlare.style.opacity = "0";
        }
      }
    }

    // 3. Handle News Nav Flare
    const newsFlare = document.querySelector(".dashboard-news-nav .nav-flare");
    if (newsFlare) {
      if (!newsOpen) {
        newsFlare.style.opacity = "0";
      } else {
        const activeLink = document.querySelector(".dashboard-news-nav .community-shell-link.active");
        const navContainer = document.querySelector(".dashboard-news-nav");
        if (activeLink && navContainer) {
          const containerRect = navContainer.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();
          newsFlare.style.left = `${linkRect.left - containerRect.left}px`;
          newsFlare.style.width = `${linkRect.width}px`;
          newsFlare.style.opacity = "1";
        } else {
          newsFlare.style.opacity = "0";
        }
      }
    }
  }
  function nextTab() {
    const nextIndex = (currentTabIndex + 1) % TABS.length;
    switchTab(TABS[nextIndex]);
  }
  function prevTab() {
    const prevIndex = (currentTabIndex - 1 + TABS.length) % TABS.length;
    switchTab(TABS[prevIndex]);
  }

  function navigateSubNav(selector, direction) {
    const nav = document.querySelector(selector);
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll(".community-shell-link"));
    if (!links.length) return;
    const activeIndex = links.findIndex((l) => l.classList.contains("active"));
    // If no active, default to index 0 or fallback
    let current = activeIndex === -1 ? 0 : activeIndex;
    let nextIndex = current + direction;
    if (nextIndex < 0) nextIndex = links.length - 1;
    if (nextIndex >= links.length) nextIndex = 0;
    links[nextIndex].click();
  }
  function initLastActivity() {
    if (!lastActivityText) return;
    const storedActivity = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);
    if (storedActivity) {
      try {
        const activity = JSON.parse(storedActivity);
        lastActivityText.textContent = `${activity.action} at ${activity.time}`;
      } catch (e) {
        console.error("Failed to parse stored activity:", e);
      }
    } else {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const defaultActivity = {
        action: "You updated lineup: 4-3-3",
        time: time,
      };
      localStorage.setItem(
        STORAGE_KEY_LAST_ACTIVITY,
        JSON.stringify(defaultActivity),
      );
      lastActivityText.textContent = `${defaultActivity.action} at ${defaultActivity.time}`;
    }
  }
  function updateLastActivity(action) {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const activity = { action: action, time: time };
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, JSON.stringify(activity));
    if (lastActivityText) {
      lastActivityText.textContent = `${action} at ${time}`;
    }
  }
  function setSoundtrackChip(text) {
    if (soundtrackChip) soundtrackChip.textContent = text;
  }
  function getTargetSoundtrackVolume() {
    if (!soundSettings.soundtrackEnabled) return 0;
    const masterFactor = Math.max(0, Math.min(1, soundSettings.master / 100));
    const musicFactor = soundSettings.focusMode
      ? 0
      : Math.max(0, Math.min(1, soundSettings.music / 100));
    return masterFactor * musicFactor;
  }
  function saveSoundSettings() {
    localStorage.setItem(
      STORAGE_KEY_SOUND_SETTINGS,
      JSON.stringify(soundSettings),
    );
  }
  function saveSoundtrackRuntime() {
    if (
      !soundtrackReady ||
      currentTrackIndex < 0 ||
      !activeAudio ||
      !activeAudio.src
    )
      return;
    try {
      localStorage.setItem(
        STORAGE_KEY_SOUNDTRACK_RUNTIME,
        JSON.stringify({
          currentTrackIndex: currentTrackIndex,
          currentTime: Number.isFinite(activeAudio.currentTime)
            ? activeAudio.currentTime
            : 0,
          paused: activeAudio.paused,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {}
  }
  function loadSoundtrackRuntime() {
    const raw = localStorage.getItem(STORAGE_KEY_SOUNDTRACK_RUNTIME);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (
        !Number.isInteger(parsed.currentTrackIndex) ||
        parsed.currentTrackIndex < 0
      ) {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }
  function loadSoundSettings() {
    const raw = localStorage.getItem(STORAGE_KEY_SOUND_SETTINGS);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      soundSettings = { ...soundSettings, ...parsed };
    } catch (error) {}
  }
  function syncSoundSettingsUi() {
    if (masterVolumeSlider)
      masterVolumeSlider.value = String(soundSettings.master);
    if (musicVolumeSlider)
      musicVolumeSlider.value = String(soundSettings.music);
    if (sfxVolumeSlider) sfxVolumeSlider.value = String(soundSettings.sfx);
    if (masterVolumeValue)
      masterVolumeValue.textContent = `${soundSettings.master}%`;
    if (musicVolumeValue)
      musicVolumeValue.textContent = `${soundSettings.music}%`;
    if (sfxVolumeValue) sfxVolumeValue.textContent = `${soundSettings.sfx}%`;
    if (soundtrackEnabledToggle)
      soundtrackEnabledToggle.checked = soundSettings.soundtrackEnabled;
    if (focusModeToggle) focusModeToggle.checked = soundSettings.focusMode;
    if (musicVolumeSlider) musicVolumeSlider.disabled = soundSettings.focusMode;
  }
  function applySoundSettingsToAudio() {
    const targetVolume = getTargetSoundtrackVolume();
    const shouldMute =
      !soundSettings.soundtrackEnabled || autoplayBootstrapPending;
    [audioA, audioB].forEach((audio) => {
      audio.volume = targetVolume;
      audio.muted = shouldMute;
    });
    if (!soundSettings.soundtrackEnabled) {
      [audioA, audioB].forEach((audio) => {
        audio.pause();
      });
      setPlayButtonIcon(false);
      setSoundtrackChip("SOUND OFF");
    } else if (soundSettings.focusMode) {
      setSoundtrackChip("FOCUS MODE");
    }
  }
  function setPlayButtonIcon(isPlaying) {
    if (!soundtrackPlayBtn) return;
    const icon = soundtrackPlayBtn.querySelector(".soundtrack-play-icon");
    if (icon) icon.textContent = isPlaying ? "||" : ">";
    soundtrackPlayBtn.setAttribute(
      "aria-label",
      isPlaying ? "Pause soundtrack" : "Play soundtrack",
    );
  }
  function formatSongTitle(fileName) {
    return fileName.replace(/\.[^/.]+$/, "").trim();
  }
  function escapeSvg(text) {
    return encodeURIComponent(text).replace(/'/g, "%27").replace(/"/g, "%22");
  }
  function buildFallbackCover(title, artist) {
    const cleanTitle = (title || "Track").slice(0, 26);
    const cleanArtist = (artist || "Unknown").slice(0, 26);
    const seed = `${cleanTitle}${cleanArtist}`
      .split("")
      .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const hueA = seed % 360;
    const hueB = (seed + 72) % 360;
    const svg = `\n            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>\n                <defs>\n                    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>\n                        <stop offset='0%' stop-color='hsl(${hueA} 70% 38%)'/>\n                        <stop offset='100%' stop-color='hsl(${hueB} 70% 26%)'/>\n                    </linearGradient>\n                </defs>\n                <rect width='256' height='256' rx='24' fill='url(#g)'/>\n                <circle cx='128' cy='96' r='42' fill='rgba(255,255,255,0.16)'/>\n                <circle cx='128' cy='96' r='14' fill='rgba(0,0,0,0.35)'/>\n                <rect x='56' y='154' width='144' height='14' rx='7' fill='rgba(255,255,255,0.22)'/>\n                <rect x='56' y='176' width='108' height='12' rx='6' fill='rgba(255,255,255,0.14)'/>\n            </svg>\n        `;
    return `data:image/svg+xml;charset=utf-8,${escapeSvg(svg)}`;
  }
  function animateTrackTransition() {
    if (!soundtrackWidget) return;
    soundtrackWidget.classList.remove("song-transition");
    void soundtrackWidget.offsetWidth;
    soundtrackWidget.classList.add("song-transition");
    setTimeout(() => {
      soundtrackWidget.classList.remove("song-transition");
    }, 520);
  }
  function decodeTextFrame(frame) {
    if (!frame || frame.length <= 1) return "";
    const encoding = frame[0];
    const payload = frame.slice(1);
    try {
      let decoded = "";
      if (encoding === 1 || encoding === 2) {
        decoded = new TextDecoder("utf-16").decode(payload);
      } else {
        decoded = new TextDecoder(encoding === 3 ? "utf-8" : "latin1").decode(
          payload,
        );
      }
      return decoded.replace(/\u0000/g, "").trim();
    } catch (err) {
      return "";
    }
  }
  function parseApicFrame(frame) {
    if (!frame || frame.length < 10) return null;
    const encoding = frame[0];
    let cursor = 1;
    let mimeEnd = cursor;
    while (mimeEnd < frame.length && frame[mimeEnd] !== 0) mimeEnd += 1;
    const mime =
      new TextDecoder("latin1").decode(frame.slice(cursor, mimeEnd)) ||
      "image/jpeg";
    cursor = mimeEnd + 1;
    cursor += 1;
    if (encoding === 1 || encoding === 2) {
      while (
        cursor + 1 < frame.length &&
        !(frame[cursor] === 0 && frame[cursor + 1] === 0)
      )
        cursor += 2;
      cursor += 2;
    } else {
      while (cursor < frame.length && frame[cursor] !== 0) cursor += 1;
      cursor += 1;
    }
    if (cursor >= frame.length) return null;
    const imageBytes = frame.slice(cursor);
    const blob = new Blob([imageBytes], { type: mime });
    return URL.createObjectURL(blob);
  }
  function parseId3Metadata(buffer, fallbackTitle) {
    const bytes = new Uint8Array(buffer);
    const metadata = {
      title: fallbackTitle,
      artist: "Unknown Artist",
      coverUrl: null,
    };
    if (bytes.length < 10) return metadata;
    if (String.fromCharCode(bytes[0], bytes[1], bytes[2]) !== "ID3")
      return metadata;
    const version = bytes[3];
    const tagSize =
      ((bytes[6] & 127) << 21) |
      ((bytes[7] & 127) << 14) |
      ((bytes[8] & 127) << 7) |
      (bytes[9] & 127);
    const end = Math.min(bytes.length, 10 + tagSize);
    let offset = 10;
    while (offset + 10 <= end) {
      const frameId = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
      );
      if (!/^[A-Z0-9]{4}$/.test(frameId)) break;
      let frameSize = 0;
      if (version === 4) {
        frameSize =
          ((bytes[offset + 4] & 127) << 21) |
          ((bytes[offset + 5] & 127) << 14) |
          ((bytes[offset + 6] & 127) << 7) |
          (bytes[offset + 7] & 127);
      } else {
        frameSize =
          (bytes[offset + 4] << 24) |
          (bytes[offset + 5] << 16) |
          (bytes[offset + 6] << 8) |
          bytes[offset + 7];
      }
      if (frameSize <= 0 || offset + 10 + frameSize > end) break;
      const frameData = bytes.slice(offset + 10, offset + 10 + frameSize);
      if (frameId === "TIT2") {
        const title = decodeTextFrame(frameData);
        if (title) metadata.title = title;
      } else if (frameId === "TPE1") {
        const artist = decodeTextFrame(frameData);
        if (artist) metadata.artist = artist;
      } else if (frameId === "APIC" && !metadata.coverUrl) {
        metadata.coverUrl = parseApicFrame(frameData);
      }
      offset += 10 + frameSize;
    }
    return metadata;
  }
  async function ensureTrackMetadata(track) {
    if (!track || track.metadataLoaded) return;
    try {
      const response = await fetch(track.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      const parsed = parseId3Metadata(buffer, track.title);
      track.title = parsed.title || track.title;
      track.artist = parsed.artist || track.artist;
      if (parsed.coverUrl) track.coverUrl = parsed.coverUrl;
      track.metadataLoaded = true;
    } catch (error) {
      track.metadataLoaded = true;
    }
  }
  function updateTrackUi(track) {
    if (!track) return;
    if (soundtrackTitle)
      soundtrackTitle.textContent = track.title || "Unknown Title";
    if (soundtrackArtist)
      soundtrackArtist.textContent = track.artist || "Unknown Artist";
    if (soundtrackHoverTitle)
      soundtrackHoverTitle.textContent = track.title || "Unknown Title";
    if (soundtrackHoverArtist)
      soundtrackHoverArtist.textContent = track.artist || "Unknown Artist";
    if (soundtrackCover)
      soundtrackCover.src =
        track.coverUrl || buildFallbackCover(track.title, track.artist);
    animateTrackTransition();
  }
  function getRandomTrackIndex(excludeIndices = []) {
    if (soundtrackTracks.length === 0) return -1;
    const excluded = new Set(
      excludeIndices.filter((index) => Number.isInteger(index) && index >= 0),
    );
    const available = soundtrackTracks
      .map((_, index) => index)
      .filter((index) => !excluded.has(index));
    if (available.length === 0) return -1;
    return available[Math.floor(Math.random() * available.length)];
  }
  function getNextOrderedTrackIndex() {
    if (soundtrackTracks.length === 0) return -1;
    if (currentTrackIndex < 0)
      return Math.floor(Math.random() * soundtrackTracks.length);
    return (currentTrackIndex + 1) % soundtrackTracks.length;
  }
  function waitForAudioReady(audio, timeoutMs = 7e3) {
    return new Promise((resolve, reject) => {
      let finished = false;
      const cleanup = () => {
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("loadeddata", onReady);
        audio.removeEventListener("error", onError);
        clearTimeout(timer);
      };
      const onReady = () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve();
      };
      const onError = () => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error("Audio failed to load"));
      };
      const timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve();
      }, timeoutMs);
      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.addEventListener("loadeddata", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
    });
  }
  function crossfadeAudio(outgoingAudio, incomingAudio, durationMs) {
    return new Promise((resolve) => {
      const steps = Math.max(1, Math.floor(durationMs / 60));
      let step = 0;
      const targetVolume = getTargetSoundtrackVolume();
      const interval = setInterval(() => {
        step += 1;
        const progress = Math.min(1, step / steps);
        if (outgoingAudio) outgoingAudio.volume = targetVolume * (1 - progress);
        incomingAudio.volume = targetVolume * progress;
        if (progress >= 1) {
          clearInterval(interval);
          if (outgoingAudio) {
            outgoingAudio.pause();
            outgoingAudio.currentTime = 0;
          }
          incomingAudio.volume = targetVolume;
          resolve();
        }
      }, 60);
    });
  }
  async function preloadNextRandomTrack() {
    if (
      !soundtrackReady ||
      soundtrackTracks.length < 2 ||
      isSmartDjPreparing ||
      smartDjReady ||
      handoffInProgress
    )
      return;
    isSmartDjPreparing = true;
    nextTrackIndex = getNextOrderedTrackIndex();
    if (nextTrackIndex < 0) {
      isSmartDjPreparing = false;
      return;
    }
    const nextTrack = soundtrackTracks[nextTrackIndex];
    standbyAudio.src = nextTrack.url;
    standbyAudio.currentTime = 0;
    standbyAudio.load();
    try {
      await waitForAudioReady(standbyAudio, 8e3);
      smartDjReady = true;
      setSoundtrackChip("AUTO MIX READY");
    } catch (error) {
      smartDjReady = false;
    } finally {
      isSmartDjPreparing = false;
    }
  }
  async function startTrack(index, smooth = false, startTime = 0) {
    if (!soundtrackReady || index < 0 || index >= soundtrackTracks.length)
      return false;
    const track = soundtrackTracks[index];
    handoffInProgress = true;
    await ensureTrackMetadata(track);
    updateTrackUi(track);
    const incomingAudio = standbyAudio;
    incomingAudio.src = track.url;
    incomingAudio.currentTime = 0;
    incomingAudio.volume = smooth ? 0 : getTargetSoundtrackVolume();
    incomingAudio.muted =
      autoplayBootstrapPending || !soundSettings.soundtrackEnabled;
    if (startTime > 0 && Number.isFinite(startTime)) {
      try {
        await waitForAudioReady(incomingAudio, 4e3);
        incomingAudio.currentTime = startTime;
      } catch (error) {
        incomingAudio.currentTime = 0;
      }
    }
    try {
      await incomingAudio.play();
    } catch (error) {
      incomingAudio.pause();
      incomingAudio.currentTime = 0;
      incomingAudio.removeAttribute("src");
      incomingAudio.load();
      handoffInProgress = false;
      setPlayButtonIcon(false);
      setSoundtrackChip("TAP PLAY");
      return false;
    }
    if (smooth && activeAudio && !activeAudio.paused) {
      await crossfadeAudio(activeAudio, incomingAudio, SMART_DJ_CROSSFADE_MS);
    } else if (activeAudio && activeAudio !== incomingAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    currentTrackIndex = index;
    activeAudio = incomingAudio;
    standbyAudio = activeAudio === audioA ? audioB : audioA;
    smartDjReady = false;
    nextTrackIndex = -1;
    handoffInProgress = false;
    setPlayButtonIcon(true);
    setSoundtrackChip("AUTO MIX");
    if (autoplayBootstrapPending) {
      setTimeout(() => {
        activeAudio.muted = false;
        autoplayBootstrapPending = false;
        applySoundSettingsToAudio();
      }, AUTOPLAY_UNMUTE_DELAY_MS);
    }
    applySoundSettingsToAudio();
    saveSoundtrackRuntime();
    preloadNextRandomTrack();
    return true;
  }
  async function playRandomTrack(smooth = false) {
    const nextIndex =
      currentTrackIndex < 0 && pendingStartupTrackIndex >= 0
        ? pendingStartupTrackIndex
        : getNextOrderedTrackIndex();
    if (nextIndex < 0) return false;
    const started = await startTrack(nextIndex, smooth);
    if (started && nextIndex === pendingStartupTrackIndex) {
      pendingStartupTrackIndex = -1;
    }
    return started;
  }
  async function autoMixToNextTrack(smooth = false) {
    if (
      !soundtrackReady ||
      handoffInProgress ||
      autoMixInProgress ||
      !soundSettings.soundtrackEnabled
    )
      return;
    autoMixInProgress = true;
    try {
      let started = false;
      if (smartDjReady && nextTrackIndex >= 0) {
        started = await startTrack(nextTrackIndex, smooth);
      } else {
        started = await playRandomTrack(smooth);
      }
      if (!started) {
        setSoundtrackChip("AUTO RETRY");
        setTimeout(() => {
          autoMixToNextTrack(false);
        }, 900);
      }
    } catch (error) {
      setSoundtrackChip("AUTO RETRY");
      setTimeout(() => {
        autoMixToNextTrack(false);
      }, 900);
    } finally {
      autoMixInProgress = false;
    }
  }
  function monitorSmartDj() {
    if (!soundtrackReady || handoffInProgress || activeAudio.paused) return;
    const duration = activeAudio.duration;
    const timeLeft = duration - activeAudio.currentTime;
    if (!Number.isFinite(timeLeft)) return;
    if (timeLeft <= SMART_DJ_PRELOAD_SECONDS && !smartDjReady) {
      preloadNextRandomTrack();
    }
  }
  function buildTrackList(items) {
    soundtrackTracks = items
      .map((item) => {
        if (typeof item === "string") {
          const title = formatSongTitle(item);
          return {
            fileName: item,
            url: `/frontend/assets/songs/${encodeURIComponent(item)}`,
            title: title,
            artist: "Unknown Artist",
            coverUrl: buildFallbackCover(title, "Unknown Artist"),
            metadataLoaded: false,
          };
        }
        const fileName = item.fileName || item.name || "";
        const title = (
          item.title || formatSongTitle(fileName || "Track")
        ).trim();
        const artist = (item.artist || "Unknown Artist").trim();
        const url =
          item.url || `/frontend/assets/songs/${encodeURIComponent(fileName)}`;
        const coverUrl =
          item.cover || item.coverUrl || buildFallbackCover(title, artist);
        return {
          fileName: fileName,
          url: url,
          title: title,
          artist: artist,
          coverUrl: coverUrl,
          metadataLoaded: Boolean(
            item.title || item.artist || item.cover || item.coverUrl,
          ),
        };
      })
      .filter((track) => track.url && track.fileName);
  }
  async function loadSongManifest() {
    if (
      Array.isArray(window.FOOTYCRAFT_SONGS) &&
      window.FOOTYCRAFT_SONGS.length > 0
    ) {
      buildTrackList(window.FOOTYCRAFT_SONGS);
      return;
    }
    buildTrackList(FALLBACK_SONG_FILES);
  }
  async function initSoundtrack() {
    if (!soundtrackPlayBtn || !soundtrackNextBtn) return;
    try {
      await loadSongManifest();
      soundtrackReady = soundtrackTracks.length > 0;
    } catch (error) {
      soundtrackReady = false;
      setSoundtrackChip("NO SONGS");
      return;
    }
    if (!soundtrackReady) {
      setSoundtrackChip("NO SONGS");
      return;
    }
    const persistedRuntime = loadSoundtrackRuntime();
    const lastTrackIndex = persistedRuntime?.currentTrackIndex;
    const excludedStartupTracks =
      Number.isInteger(lastTrackIndex) &&
      lastTrackIndex >= 0 &&
      lastTrackIndex < soundtrackTracks.length
        ? [lastTrackIndex]
        : [];
    const previewIndex = getRandomTrackIndex(excludedStartupTracks);
    pendingStartupTrackIndex =
      previewIndex >= 0 ? previewIndex : (excludedStartupTracks[0] ?? -1);
    if (previewIndex >= 0) {
      const previewTrack = soundtrackTracks[previewIndex];
      await ensureTrackMetadata(previewTrack);
      updateTrackUi(previewTrack);
    } else if (pendingStartupTrackIndex >= 0) {
      const previewTrack = soundtrackTracks[pendingStartupTrackIndex];
      await ensureTrackMetadata(previewTrack);
      updateTrackUi(previewTrack);
    }
    setSoundtrackChip("AUTOSTART");
    setPlayButtonIcon(false);
    attemptAutoplayStart();
    const recoverAutoplay = () => {
      if (currentTrackIndex < 0 || activeAudio.paused) {
        attemptAutoplayStart();
      }
    };
    document.addEventListener("pointerdown", recoverAutoplay, { once: true });
    document.addEventListener("keydown", recoverAutoplay, { once: true });
  }
  function clearAutoplayRetry() {
    if (!autoplayRetryTimer) return;
    clearTimeout(autoplayRetryTimer);
    autoplayRetryTimer = null;
  }
  function clearBufferingRecovery() {
    if (!bufferingRecoveryTimer) return;
    clearTimeout(bufferingRecoveryTimer);
    bufferingRecoveryTimer = null;
  }
  async function recoverFromBuffering() {
    if (!soundtrackReady || handoffInProgress) return;
    setSoundtrackChip("RECOVERING");
    await playRandomTrack(false);
  }
  async function attemptAutoplayStart() {
    if (!soundtrackReady) return;
    if (!soundSettings.soundtrackEnabled) return;
    try {
      if (currentTrackIndex < 0) {
        autoplayBootstrapPending = true;
        const started = await playRandomTrack(false);
        if (!started) throw new Error("autoplay start failed");
      } else {
        activeAudio.muted = true;
        await activeAudio.play();
        setTimeout(() => {
          activeAudio.muted = false;
          applySoundSettingsToAudio();
        }, AUTOPLAY_UNMUTE_DELAY_MS);
        setPlayButtonIcon(true);
        setSoundtrackChip("AUTO MIX");
        preloadNextRandomTrack();
      }
      clearAutoplayRetry();
    } catch (error) {
      setSoundtrackChip("AUTO RETRY");
      clearAutoplayRetry();
      autoplayRetryTimer = setTimeout(attemptAutoplayStart, 2500);
    }
  }
  function initVolumeSliders() {
    const sliders = document.querySelectorAll(".volume-slider");
    sliders.forEach((slider) => {
      const updateValue = () => {
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains("volume-value")) {
          valueDisplay.textContent = `${slider.value}%`;
        }
      };
      slider.addEventListener("input", updateValue);
      updateValue();
    });
  }
  function initSoundSettingsControls() {
    loadSoundSettings();
    syncSoundSettingsUi();
    applySoundSettingsToAudio();
    if (masterVolumeSlider) {
      masterVolumeSlider.addEventListener("input", () => {
        soundSettings.master = Number(masterVolumeSlider.value);
        syncSoundSettingsUi();
        applySoundSettingsToAudio();
        saveSoundSettings();
      });
    }
    if (musicVolumeSlider) {
      musicVolumeSlider.addEventListener("input", () => {
        soundSettings.music = Number(musicVolumeSlider.value);
        syncSoundSettingsUi();
        applySoundSettingsToAudio();
        saveSoundSettings();
      });
    }
    if (sfxVolumeSlider) {
      sfxVolumeSlider.addEventListener("input", () => {
        soundSettings.sfx = Number(sfxVolumeSlider.value);
        syncSoundSettingsUi();
        saveSoundSettings();
      });
    }
    if (soundtrackEnabledToggle) {
      soundtrackEnabledToggle.addEventListener("change", async () => {
        soundSettings.soundtrackEnabled = soundtrackEnabledToggle.checked;
        syncSoundSettingsUi();
        applySoundSettingsToAudio();
        saveSoundSettings();
        if (soundSettings.soundtrackEnabled) {
          if (currentTrackIndex < 0 || activeAudio.paused) {
            await attemptAutoplayStart();
          } else {
            await activeAudio.play();
            setPlayButtonIcon(true);
            setSoundtrackChip(
              soundSettings.focusMode ? "FOCUS MODE" : "AUTO MIX",
            );
          }
        }
      });
    }
    if (focusModeToggle) {
      focusModeToggle.addEventListener("change", () => {
        soundSettings.focusMode = focusModeToggle.checked;
        syncSoundSettingsUi();
        applySoundSettingsToAudio();
        saveSoundSettings();
      });
    }
  }
  function initSoundSettingsPanel() {
    if (!soundSettingsTile) return;
    const openModal = () => {
      if (!soundSettingsModal || !soundSettingsBackdrop) return;
      soundSettingsModal.classList.add("show");
      soundSettingsBackdrop.classList.add("show");
      soundSettingsModal.setAttribute("aria-hidden", "false");
      soundSettingsBackdrop.setAttribute("aria-hidden", "false");
      soundSettingsTile.setAttribute("aria-expanded", "true");
    };
    const closeModal = () => {
      if (!soundSettingsModal || !soundSettingsBackdrop) return;
      soundSettingsModal.classList.remove("show");
      soundSettingsBackdrop.classList.remove("show");
      soundSettingsModal.setAttribute("aria-hidden", "true");
      soundSettingsBackdrop.setAttribute("aria-hidden", "true");
      soundSettingsTile.setAttribute("aria-expanded", "false");
    };
    soundSettingsTile.addEventListener("click", openModal);
    soundSettingsTile.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openModal();
    });
    if (soundSettingsClose) {
      soundSettingsClose.addEventListener("click", closeModal);
    }
    if (soundSettingsBackdrop) {
      soundSettingsBackdrop.addEventListener("click", closeModal);
    }
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!soundSettingsModal || !soundSettingsModal.classList.contains("show"))
        return;
      closeModal();
    });
  }
  function initLegalPanel() {
    if (!legalTile) return;
    const openModal = () => {
      if (!legalModal || !legalBackdrop) return;
      legalModal.classList.add("show");
      legalBackdrop.classList.add("show");
      legalModal.setAttribute("aria-hidden", "false");
      legalBackdrop.setAttribute("aria-hidden", "false");
      legalTile.setAttribute("aria-expanded", "true");
    };
    const closeModal = () => {
      if (!legalModal || !legalBackdrop) return;
      legalModal.classList.remove("show");
      legalBackdrop.classList.remove("show");
      legalModal.setAttribute("aria-hidden", "true");
      legalBackdrop.setAttribute("aria-hidden", "true");
      legalTile.setAttribute("aria-expanded", "false");
    };
    legalTile.addEventListener("click", openModal);
    legalTile.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openModal();
    });
    if (legalClose) {
      legalClose.addEventListener("click", closeModal);
    }
    if (legalBackdrop) {
      legalBackdrop.addEventListener("click", closeModal);
    }
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!legalModal || !legalModal.classList.contains("show")) return;
      closeModal();
    });
  }
  function initCreditsPanel() {
    if (!creditsTile) return;
    const openModal = () => {
      if (!creditsModal || !creditsBackdrop) return;
      creditsModal.classList.add("show");
      creditsBackdrop.classList.add("show");
      creditsModal.setAttribute("aria-hidden", "false");
      creditsBackdrop.setAttribute("aria-hidden", "false");
      creditsTile.setAttribute("aria-expanded", "true");
    };
    const closeModal = () => {
      if (!creditsModal || !creditsBackdrop) return;
      creditsModal.classList.remove("show");
      creditsBackdrop.classList.remove("show");
      creditsModal.setAttribute("aria-hidden", "true");
      creditsBackdrop.setAttribute("aria-hidden", "true");
      creditsTile.setAttribute("aria-expanded", "false");
    };
    creditsTile.addEventListener("click", openModal);
    creditsTile.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openModal();
    });
    if (creditsClose) {
      creditsClose.addEventListener("click", closeModal);
    }
    if (creditsBackdrop) {
      creditsBackdrop.addEventListener("click", closeModal);
    }
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!creditsModal || !creditsModal.classList.contains("show")) return;
      closeModal();
    });
  }
  function initEventListeners() {
    if (isDashboardShell) {
      navTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const tabName = tab.getAttribute("data-tab");
          switchTab(tabName);
        });
      });
      document.addEventListener("keydown", (e) => {
        if (
          e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.tagName === "SELECT"
        ) {
          return;
        }
        if (communityOpen) {
          switch (e.key) {
            case "ArrowRight":
              e.preventDefault();
              navigateSubNav(".dashboard-community-nav", 1);
              break;
            case "ArrowLeft":
              e.preventDefault();
              navigateSubNav(".dashboard-community-nav", -1);
              break;
          }
          return;
        }
        if (newsOpen) {
          switch (e.key) {
            case "ArrowRight":
              e.preventDefault();
              navigateSubNav(".dashboard-news-nav", 1);
              break;
            case "ArrowLeft":
              e.preventDefault();
              navigateSubNav(".dashboard-news-nav", -1);
              break;
          }
          return;
        }
        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            nextTab();
            break;
          case "ArrowLeft":
            e.preventDefault();
            prevTab();
            break;
        }
      });
      window.addEventListener("hashchange", () => {
        const hash = window.location.hash.substring(1);
        if (hash === "community") {
          openCommunity(false);
        } else if (hash === "news") {
          openNews(false);
        } else if (hash && TABS.includes(hash)) {
          if (communityOpen) {
            closeCommunity(hash, false);
          } else if (newsOpen) {
            closeNews(hash, false);
          } else {
            switchTab(hash, { updateHistory: false });
          }
        }
      });
      window.addEventListener("resize", () => {
        updateFlarePosition();
      });
    }
    communityHomeButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        closeCommunity("home");
      });
    });
    newsHomeButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        closeNews("home");
      });
    });
    window.addEventListener("pagehide", saveSoundtrackRuntime);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        saveSoundtrackRuntime();
      }
    });
    if (soundtrackPlayBtn) {
      soundtrackPlayBtn.addEventListener("click", async () => {
        if (!soundtrackReady) return;
        clearAutoplayRetry();
        autoplayBootstrapPending = false;
        applySoundSettingsToAudio();
        if (currentTrackIndex < 0 || !activeAudio.src) {
          await playRandomTrack(false);
          return;
        }
        if (activeAudio.paused) {
          try {
            await activeAudio.play();
            setPlayButtonIcon(true);
            setSoundtrackChip("AUTO MIX");
            preloadNextRandomTrack();
          } catch (error) {
            setSoundtrackChip("TAP PLAY");
          }
        } else {
          activeAudio.pause();
          saveSoundtrackRuntime();
          setPlayButtonIcon(false);
          setSoundtrackChip("PAUSED");
        }
      });
    }
    if (soundtrackNextBtn) {
      soundtrackNextBtn.addEventListener("click", async () => {
        if (!soundtrackReady) return;
        await autoMixToNextTrack(true);
      });
    }
    [audioA, audioB].forEach((audio) => {
      audio.addEventListener("timeupdate", () => {
        if (audio !== activeAudio) return;
        monitorSmartDj();
      });
      audio.addEventListener("ended", () => {
        if (audio !== activeAudio) return;
        autoMixToNextTrack(false);
      });
      audio.addEventListener("playing", () => {
        if (audio !== activeAudio) return;
        clearBufferingRecovery();
        setPlayButtonIcon(true);
        if (!soundSettings.soundtrackEnabled) {
          setSoundtrackChip("SOUND OFF");
        } else if (soundSettings.focusMode) {
          setSoundtrackChip("FOCUS MODE");
        } else {
          setSoundtrackChip("AUTO MIX");
        }
        saveSoundtrackRuntime();
      });
      audio.addEventListener("waiting", () => {
        if (audio !== activeAudio) return;
        setSoundtrackChip("BUFFERING");
        clearBufferingRecovery();
        bufferingRecoveryTimer = setTimeout(() => {
          recoverFromBuffering();
        }, 4500);
      });
      audio.addEventListener("canplay", () => {
        if (audio !== activeAudio) return;
        clearBufferingRecovery();
      });
      audio.addEventListener("stalled", () => {
        if (audio !== activeAudio) return;
        clearBufferingRecovery();
        bufferingRecoveryTimer = setTimeout(() => {
          recoverFromBuffering();
        }, 2e3);
      });
    });
  }
  function init() {
    try {
      initEventListeners();
      initLastActivity();
      initVolumeSliders();
      initSoundSettingsControls();
      initSoundSettingsPanel();
      initLegalPanel();
      initCreditsPanel();
      initSoundtrack();
      initNotifications();
      if (isDashboardShell) {
        const forceHomeTab = consumeForceHomeFlag();
        const urlHash = forceHomeTab ? "" : window.location.hash.substring(1);
        const savedTab = forceHomeTab
          ? null
          : localStorage.getItem(STORAGE_KEY_LAST_TAB);
        const shouldOpenCommunity = urlHash === "community";
        const shouldOpenNews = urlHash === "news";
        let initialTab = "home";
        if (!forceHomeTab && urlHash && TABS.includes(urlHash)) {
          initialTab = urlHash;
        } else if (!forceHomeTab && savedTab && TABS.includes(savedTab)) {
          initialTab = savedTab;
        }
        switchTab(initialTab, {
          updateHistory:
            forceHomeTab || !(shouldOpenCommunity || shouldOpenNews),
        });
        if (!forceHomeTab && shouldOpenCommunity) {
          openCommunity(false);
        } else if (!forceHomeTab && shouldOpenNews) {
          openNews(false);
        }
        setTimeout(updateFlarePosition, 100);
      }
      console.log("FootyCraft Dashboard initialized");
    } finally {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.dispatchEvent(
            new CustomEvent("footycraft:dashboard-shell-ready"),
          );
        });
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.FootyCraft = {
    openCommunity: openCommunity,
    closeCommunity: closeCommunity,
    openNews: openNews,
    closeNews: closeNews,
    switchTab: switchTab,
    updateLastActivity: updateLastActivity,
  };
  async function renderTrendingLineups() {
    const container = document.querySelector(
      "#lineups-section .trending-formations",
    );
    if (!container) return;
    container.innerHTML =
      '<div style="color:#666;font-size:12px;">Loading live formations...</div>';
    const labels = ["Most Used", "Rising", "Popular", "Hot", "Watch"];
    const res = await FC.lineups.metaPulse("true", 5, 1);
    const items =
      res.success && Array.isArray(res.data?.formations)
        ? res.data.formations
        : [];
    if (!items.length) {
      container.innerHTML =
        '<div style="color:#666;font-size:12px;">No live formation data yet.</div>';
      return;
    }
    container.innerHTML = "";
    items.forEach((item, index) => {
      const badge = document.createElement("div");
      badge.classList.add("formation-badge");
      badge.innerHTML = `\n          <span class="formation-num">${item.formation}</span>\n          <span class="formation-trend">${item.trend}</span>\n        `;
      badge.addEventListener("click", () => {
        alert(`Show squads using ${item.formation}`);
      });
      badge.querySelector(".formation-trend").textContent =
        labels[index] || `#${index + 1}`;
      container.appendChild(badge);
    });
  }
  const originalSwitchTab = switchTab;
  switchTab = function (tabName) {
    originalSwitchTab(tabName);
    if (tabName === "lineups") {
      renderTrendingLineups();
    }
    if (tabName === "home" && window.FC_HOME) {
      window.FC_HOME.load();
    }
    if (tabName === "community" && window.FC_COMMUNITY) {
      window.FC_COMMUNITY.loadPosts("general");
    }
    if (tabName === "news" && window.FC_NEWS) {
      window.FC_NEWS.load();
    }
  };

  // Add listeners for community/news sub-nav flares
  document.querySelectorAll(".community-shell-link").forEach(link => {
    link.addEventListener("click", () => {
      // Small timeout to allow active class to be swapped by other scripts
      setTimeout(updateFlarePosition, 10);
    });
  });

  // Export updateFlarePosition so sub-modules can trigger it
  window.updateFlarePosition = updateFlarePosition;

  // Listeners for 'Dashboard Home' buttons in sub-navs
  communityHomeButtons.forEach((btn) => {
    btn.addEventListener("click", () => closeCommunity("home"));
  });
  newsHomeButtons.forEach((btn) => {
    btn.addEventListener("click", () => closeNews("home"));
  });
})();



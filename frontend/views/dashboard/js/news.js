(function () {
  "use strict";
  const phrases = [
    "transfer waves in Europe",
    "injury updates before kickoff",
    "tactical shifts behind the headlines",
    "player momentum across the football world",
  ];
  let typeTimer = null;
  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }
  function initTypewriter(target) {
    if (!target) return;
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    const tick = () => {
      const phrase = phrases[phraseIndex] || "";
      charIndex = deleting
        ? Math.max(0, charIndex - 1)
        : Math.min(phrase.length, charIndex + 1);
      target.textContent = phrase.slice(0, charIndex);
      if (!deleting && charIndex === phrase.length) {
        deleting = true;
        typeTimer = window.setTimeout(tick, 1400);
        return;
      }
      if (deleting && charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typeTimer = window.setTimeout(tick, 220);
        return;
      }
      typeTimer = window.setTimeout(tick, deleting ? 34 : 64);
    };
    tick();
  }
  function formatDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  function formatNumber(value) {
    return Number(value || 0).toLocaleString();
  }
  function getSearchScorePercent(article) {
    const explicitPercent = Number(article?.search_score_percent);
    if (Number.isFinite(explicitPercent)) {
      return Math.max(0, Math.min(100, explicitPercent));
    }
    const rawScore = Number(article?.search_score);
    if (!Number.isFinite(rawScore) || rawScore <= 0) {
      return 0;
    }
    if (rawScore <= 1) {
      return Math.max(0, Math.min(100, rawScore * 100));
    }
    return Math.max(0, Math.min(100, rawScore));
  }
  function formatSearchScorePercent(article) {
    const percent = getSearchScorePercent(article);
    if (percent <= 0) {
      return "0%";
    }
    return `${percent.toFixed(percent >= 10 ? 0 : 1)}%`;
  }
  function fixMojibake(value) {
    const text = String(value || "");
    if (!/[\u00c2\u00c3\u00e2\u20ac]/.test(text)) {
      return text;
    }
    try {
      return decodeURIComponent(escape(text));
    } catch (error) {
      return text
        .replace(/\u00e2\u20ac\u2122/g, "'")
        .replace(/\u00e2\u20ac\u0153/g, '"')
        .replace(/\u00e2\u20ac/g, '"')
        .replace(/\u00e2\u20ac\u201c/g, "-")
        .replace(/\u00e2\u20ac\u201d/g, "-")
        .replace(/\u00c2\u00a3/g, "\u00a3")
        .replace(/\u00c2\u20ac/g, "\u20ac")
        .replace(/\u00c2/g, "");
    }
  }
  function paragraphize(article) {
    if (Array.isArray(article?.paragraphs) && article.paragraphs.length) {
      return article.paragraphs;
    }
    const raw = fixMojibake(article?.content || article?.excerpt || "").trim();
    if (!raw) {
      return ["No article body available in the imported dataset."];
    }
    const blocks = raw
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    if (blocks.length > 1) {
      return blocks;
    }
    const sentences = raw
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"])/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    if (sentences.length <= 4) {
      return [raw];
    }
    const paragraphs = [];
    for (let index = 0; index < sentences.length; index += 3) {
      paragraphs.push(sentences.slice(index, index + 3).join(" "));
    }
    return paragraphs;
  }
  function setLoading(shell, loading) {
    if (!shell) return;
    shell.classList.toggle("is-loading", Boolean(loading));
    shell.setAttribute("aria-busy", loading ? "true" : "false");
  }
  function renderEmptyList(resultsList, message) {
    resultsList.innerHTML = `<div class="news-results-empty">${escapeHtml(message)}</div>`;
  }
  function renderReaderEmpty(articleView, message) {
    articleView.innerHTML = `<div class="news-article-empty">${escapeHtml(message)}</div>`;
  }
  function renderReaderLoading(articleView, title) {
    articleView.innerHTML = `\n            <div class="news-article-loading">\n                <div class="news-article-loading-inner">\n                    <span class="news-loading-spinner" aria-hidden="true"></span>\n                    <div>${escapeHtml(title || "Loading article dossier...")}</div>\n                </div>\n            </div>\n        `;
  }
  function resultCard(article, active) {
    const image =
      article.image_url ||
      article.display_image ||
      "/frontend/assets/images/ui/news.png";
    const scorePercent = getSearchScorePercent(article);
    const matchedTerms = Array.isArray(article.matched_terms)
      ? article.matched_terms.length
      : 0;
    const source = fixMojibake(article.source_name || "Football News");
    const excerpt = fixMojibake(article.excerpt || "No excerpt available.");
    return `\n            <button class="news-result-card ${active ? "is-active" : ""}" type="button" data-news-article-id="${escapeHtml(article.id)}">\n                <div class="news-result-image">\n                    <img src="${escapeHtml(image)}" alt="${escapeHtml(article.title || "Article image")}" loading="lazy"\n                        onerror="this.onerror=null;this.src='/frontend/assets/images/ui/news.png';">\n                </div>\n                <div class="news-result-body">\n                    <div class="news-result-topline">\n                        <span class="news-result-source">${escapeHtml(source)}</span>\n                        <span class="news-result-date">${escapeHtml(formatDate(article.published_at || article.published_raw || ""))}</span>\n                    </div>\n                    <h4 class="news-result-heading">${escapeHtml(fixMojibake(article.title || "Untitled article"))}</h4>\n                    <p class="news-result-excerpt">${escapeHtml(excerpt)}</p>\n                    <div class="news-result-footer">\n                        <span class="news-result-score">${escapeHtml(scorePercent > 0 ? `Match ${formatSearchScorePercent(article)}` : "Latest import")}</span>\n                        <span class="news-result-match">${matchedTerms > 0 ? `${matchedTerms} matched term${matchedTerms === 1 ? "" : "s"}` : "Latest imported article"}</span>\n                    </div>\n                </div>\n            </button>\n        `;
  }
  function renderResultsList(resultsList, state) {
    if (!state.results.length) {
      renderEmptyList(
        resultsList,
        "Search the corpus to retrieve the most relevant articles.",
      );
      return;
    }
    resultsList.innerHTML = state.results
      .map((article) =>
        resultCard(article, Number(article.id) === Number(state.selectedId)),
      )
      .join("");
  }
  function renderArticle(articleView, article, state) {
    const image =
      article.image_url ||
      article.display_image ||
      "/frontend/assets/images/ui/news.png";
    const paragraphs = paragraphize(article);
    const selectedIndex = Math.max(
      0,
      state.results.findIndex(
        (entry) => Number(entry.id) === Number(article.id),
      ),
    );
    const isSearchMode = state.currentQuery.trim() !== "";
    const matchedTerms = Array.isArray(article.matched_terms)
      ? article.matched_terms
      : [];
    const source = fixMojibake(article.source_name || "Football News");
    const author = fixMojibake(article.author || "Unknown author");
    const scorePercent = getSearchScorePercent(article);
    const total = state.results.length;
    const bodyHtml = paragraphs
      .map(
        (paragraph) =>
          `\n            <p class="news-article-paragraph">${escapeHtml(fixMojibake(paragraph))}</p>\n        `,
      )
      .join("");
    articleView.innerHTML = `\n            <div class="news-article-scroll">\n                <div class="news-article-hero">\n                    <img src="${escapeHtml(image)}" alt="${escapeHtml(fixMojibake(article.title || "Article image"))}"\n                        onerror="this.onerror=null;this.src='/frontend/assets/images/ui/news.png';">\n                    <div class="news-article-hero-meta">\n                        <div class="news-article-source-row">\n                            <span class="news-article-source-badge">${escapeHtml(source)}</span>\n                            ${isSearchMode ? `<span class="news-article-query-badge">Query: ${escapeHtml(state.currentQuery)}</span>` : ""}\n                        </div>\n                        <div class="news-article-controls">\n                            <div class="news-article-nav-wrap">\n                                <button class="news-article-nav" type="button" data-news-nav="prev" ${selectedIndex <= 0 ? "disabled" : ""}>Previous</button>\n                                <button class="news-article-nav" type="button" data-news-nav="next" ${selectedIndex >= total - 1 ? "disabled" : ""}>Next</button>\n                            </div>\n                            <span class="news-article-source-badge">${escapeHtml(`${selectedIndex + 1} / ${Math.max(total, 1)}`)}</span>\n                        </div>\n                        <h3 class="news-article-title">${escapeHtml(fixMojibake(article.title || "Untitled article"))}</h3>\n                        <div class="news-article-subline">\n                            <span>${escapeHtml(formatDate(article.published_at || article.published_raw || ""))}</span>\n                            <span>${escapeHtml(author)}</span>\n                            <span>${escapeHtml(source)}</span>\n                        </div>\n                    </div>\n                </div>\n\n                <div class="news-article-content">\n                    <div class="news-article-summary">${escapeHtml(fixMojibake(article.excerpt || "No article summary available."))}</div>\n\n                    <div class="news-article-taxonomy">\n                        <span class="news-article-chip is-highlight">${escapeHtml(scorePercent > 0 ? `Search Relevance ${formatSearchScorePercent(article)}` : "Latest import article")}</span>\n                        <span class="news-article-chip">${escapeHtml(`${paragraphs.length} reading block${paragraphs.length === 1 ? "" : "s"}`)}</span>\n                        <span class="news-article-chip">${escapeHtml(`${(article.source_domain || "source").replace(/^www\./, "")}`)}</span>\n                        ${matchedTerms
      .slice(0, 6)
      .map(
        (term) => `<span class="news-article-chip">${escapeHtml(term)}</span>`,
      )
      .join(
        "",
      )}\n                    </div>\n\n                    <div class="news-article-body">\n                        ${bodyHtml}\n                    </div>\n\n                    <div class="news-article-meta-grid">\n                        <div class="news-article-meta-card">\n                            <span class="news-article-meta-label">Ranking Position</span>\n                            <div class="news-article-meta-value">${escapeHtml(`${selectedIndex + 1} of ${Math.max(total, 1)} visible results`)}</div>\n                        </div>\n                        <div class="news-article-meta-card">\n                            <span class="news-article-meta-label">Matched Terms</span>\n                            <div class="news-article-meta-value">${escapeHtml(matchedTerms.length ? matchedTerms.join(", ") : "Latest imported article")}</div>\n                        </div>\n                        <div class="news-article-meta-card">\n                            <span class="news-article-meta-label">Source Link Stored</span>\n                            <div class="news-article-meta-value">${escapeHtml(article.link || "Unavailable")}</div>\n                        </div>\n                    </div>\n                </div>\n            </div>\n        `;
  }
  async function loadArticle(articleId, elements, state, options = {}) {
    const articleView = elements.articleView;
    const baseArticle = state.results.find(
      (entry) => Number(entry.id) === Number(articleId),
    );
    if (!baseArticle) {
      renderReaderEmpty(
        articleView,
        "This article is no longer available in the current result set.",
      );
      return;
    }
    state.selectedId = Number(articleId);
    renderResultsList(elements.resultsList, state);
    const cached = state.articleCache.get(state.selectedId);
    if (cached && !options.force) {
      renderArticle(articleView, cached, state);
      return;
    }
    renderReaderLoading(
      articleView,
      "Loading full article inside FootyCraft...",
    );
    const requestId = ++state.articleRequestId;
    const response = await FC.news.detail(state.selectedId);
    if (requestId !== state.articleRequestId) {
      return;
    }
    if (!response.success) {
      renderReaderEmpty(
        articleView,
        response.error || "Failed to load the full article.",
      );
      return;
    }
    const article = Object.assign(
      {},
      baseArticle,
      response.data?.article || {},
    );
    if (!Array.isArray(article.matched_terms)) {
      article.matched_terms = Array.isArray(baseArticle.matched_terms)
        ? baseArticle.matched_terms
        : [];
    }
    if (
      state.currentQuery.trim() &&
      Number(baseArticle.search_score || 0) > 0
    ) {
      article.search_score = baseArticle.search_score;
      article.search_score_percent = baseArticle.search_score_percent || 0;
    } else if (article.search_score == null) {
      article.search_score = baseArticle.search_score || 0;
      article.search_score_percent = baseArticle.search_score_percent || 0;
    }
    state.articleCache.set(state.selectedId, article);
    renderArticle(articleView, article, state);
  }
  async function runSearch(query, elements, state, options = {}) {
    const trimmed = String(query || "").trim();
    const isInitialLoad = Boolean(options.initialLoad);
    const requestId = ++state.searchRequestId;
    if (!trimmed && !isInitialLoad) {
      elements.status.textContent =
        "Start with a player, club, transfer, injury, or tactics query. The probabilistic reader will rank and open the best matching article here.";
      elements.resultsMeta.textContent = "Corpus idle";
      state.currentQuery = "";
      state.results = [];
      state.selectedId = null;
      state.articleCache.clear();
      renderEmptyList(
        elements.resultsList,
        "Search the corpus to retrieve the most relevant articles.",
      );
      renderReaderEmpty(
        elements.articleView,
        "Select an article from the retrieved list to read it inside FootyCraft.",
      );
      return;
    }
    setLoading(elements.resultsShell, true);
    elements.status.textContent = trimmed
      ? `Searching the indexed corpus for "${trimmed}"...`
      : "Loading the latest imported football articles...";
    elements.resultsMeta.textContent = "Running probabilistic ranking...";
    const response = trimmed
      ? await FC.news.search({ q: trimmed, limit: 14, model: "probabilistic" })
      : await FC.news.list({ limit: 14 });
    if (requestId !== state.searchRequestId) {
      return;
    }
    if (!response.success) {
      state.currentQuery = trimmed;
      state.results = [];
      state.selectedId = null;
      elements.status.textContent = response.error || "News search failed.";
      elements.resultsMeta.textContent = "Corpus unavailable";
      renderEmptyList(
        elements.resultsList,
        "The news corpus is not ready yet. Import the datasets and rebuild the probabilistic index first.",
      );
      renderReaderEmpty(
        elements.articleView,
        "No readable article is available because the retrieval request failed.",
      );
      setLoading(elements.resultsShell, false);
      return;
    }
    const articles = (response.data?.articles || []).map((article) => ({
      ...article,
      matched_terms: Array.isArray(article.matched_terms)
        ? article.matched_terms
        : [],
      excerpt: fixMojibake(article.excerpt || ""),
    }));
    const total = Number(response.data?.total || articles.length || 0);
    const corpusSize = Number(response.data?.corpus_size || 0);
    const modelLabel = response.data?.model_label || "Probabilistic model";
    state.currentQuery = trimmed;
    state.results = articles;
    state.selectedId = articles[0]?.id ?? null;
    state.articleCache.clear();
    elements.status.innerHTML = trimmed
      ? `<strong>${escapeHtml(modelLabel)}:</strong> retrieved ${escapeHtml(String(total))} article${total === 1 ? "" : "s"} and opened the highest-ranked match for "${escapeHtml(trimmed)}".`
      : `<strong>Latest import:</strong> showing ${escapeHtml(String(articles.length))} recent article${articles.length === 1 ? "" : "s"} from the indexed corpus.`;
    elements.resultsMeta.textContent =
      corpusSize > 0
        ? `${formatNumber(corpusSize)} indexed articles · ${formatNumber(total)} ranked result${total === 1 ? "" : "s"}`
        : `${formatNumber(total)} article${total === 1 ? "" : "s"} ready`;
    renderResultsList(elements.resultsList, state);
    if (!articles.length) {
      renderReaderEmpty(
        elements.articleView,
        trimmed
          ? `No indexed articles matched "${trimmed}".`
          : "No imported articles were found in the news corpus.",
      );
      setLoading(elements.resultsShell, false);
      return;
    }
    if (elements.input && trimmed) {
      elements.input.value = trimmed;
    }
    await loadArticle(state.selectedId, elements, state);
    setLoading(elements.resultsShell, false);
  }
  function initNewsSearch() {
    const typedText = document.getElementById("news-typed-text");
    const form = document.getElementById("news-search-form");
    const input = document.getElementById("news-search-input");
    const status = document.getElementById("news-search-status");
    const chips = document.querySelectorAll(".news-search-chip[data-query]");
    const resultsShell = document.querySelector(".news-results-shell");
    const resultsList = document.getElementById("news-results-list");
    const resultsMeta = document.getElementById("news-results-meta");
    const articleView = document.getElementById("news-article-view");
    if (
      !typedText ||
      !form ||
      !input ||
      !status ||
      !resultsShell ||
      !resultsList ||
      !resultsMeta ||
      !articleView
    ) {
      return;
    }
    const elements = {
      status: status,
      resultsShell: resultsShell,
      resultsList: resultsList,
      resultsMeta: resultsMeta,
      articleView: articleView,
      input: input,
    };
    const state = {
      currentQuery: "",
      results: [],
      selectedId: null,
      articleCache: new Map(),
      searchRequestId: 0,
      articleRequestId: 0,
    };
    initTypewriter(typedText);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await runSearch(input.value, elements, state);
    });
    chips.forEach((chip) => {
      chip.addEventListener("click", async () => {
        const query = chip.getAttribute("data-query") || "";
        input.value = query;
        input.focus();
        await runSearch(query, elements, state);
      });
    });
    resultsList.addEventListener("click", async (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest("[data-news-article-id]")
          : null;
      if (!target) return;
      const articleId = Number(target.getAttribute("data-news-article-id"));
      if (!articleId || articleId === Number(state.selectedId)) {
        return;
      }
      await loadArticle(articleId, elements, state);
    });
    articleView.addEventListener("click", async (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest("[data-news-nav]")
          : null;
      if (!target) return;
      const currentIndex = state.results.findIndex(
        (entry) => Number(entry.id) === Number(state.selectedId),
      );
      if (currentIndex < 0) return;
      const direction = target.getAttribute("data-news-nav");
      const nextIndex =
        direction === "prev" ? currentIndex - 1 : currentIndex + 1;
      const nextArticle = state.results[nextIndex];
      if (!nextArticle) return;
      await loadArticle(nextArticle.id, elements, state);
    });
    runSearch("", elements, state, { initialLoad: true });
    window.FC_NEWS = {
      focusSearch() {
        window.setTimeout(() => {
          if (input) {
            input.focus();
            input.select();
          }
          if (window.updateFlarePosition) window.updateFlarePosition();
        }, 120);
      },
      search(query) {
        return runSearch(query, elements, state);
      },
      load() {
        return runSearch("", elements, state, { initialLoad: true });
      }
    };
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNewsSearch);
  } else {
    initNewsSearch();
  }
})();

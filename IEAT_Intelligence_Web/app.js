const DATA_URL = "./data/latest.json";

const CATEGORY_ORDER = [
  "Energy",
  "Supply Chain and Logistics",
  "Technology and Digital Infrastructure",
  "Public Health and Biosecurity",
  "Geopolitics and Trade",
  "Policy and Regulation",
  "Environment and Sustainability",
  "Investment and FDI",
  "Labor and Human Capital",
  "Competitive Landscape"
];

const VALID_CATEGORIES = new Set(CATEGORY_ORDER);
const HOME_CATEGORY_ORDER = [...CATEGORY_ORDER];
const WATCHLIST_CATEGORY_ORDER = [...CATEGORY_ORDER];

const LEGACY_CATEGORY_MAP = {
  "Supply Chain": "Supply Chain and Logistics",
  Geopolitics: "Geopolitics and Trade",
  "Technology & Digital Infrastructure": "Technology and Digital Infrastructure",
  "Public Health & Biosecurity": "Public Health and Biosecurity",
  Domestic: "Policy and Regulation"
};

const VALID_RISK_LEVELS = new Set(["Low", "Medium", "High", "Critical"]);
const VALID_DIRECTIONS = new Set(["Rising", "Stable", "Easing", "Unknown"]);
let briefingData = null;
let currentCategory = "";
let newsDetailOrigin = "home";
let menuCloseTimer = null;

const CATEGORY_META = {
  Energy: {
    icon: '<path d="M13 2 5 13h6l-1 9 8-12h-6l1-8Z"></path>',
    color: "#b7791f",
    background: "#fff6df",
    border: "#efd89a"
  },
  "Supply Chain and Logistics": {
    icon: '<path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>',
    color: "#6d55b3",
    background: "#f3efff",
    border: "#dbd2ff"
  },
  "Technology and Digital Infrastructure": {
    icon: '<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M20 9h3M1 15h3M20 15h3"></path>',
    color: "#177f78",
    background: "#e8f7f5",
    border: "#c4e7e2"
  },
  "Public Health and Biosecurity": {
    icon: '<path d="M20.8 9.2c0 5.6-8.8 10.2-8.8 10.2S3.2 14.8 3.2 9.2A4.6 4.6 0 0 1 12 7.1a4.6 4.6 0 0 1 8.8 2.1Z"></path><path d="M7.2 12h2l1.2-2.3 2.1 4.5 1.3-2.2h3"></path>',
    color: "#b94e66",
    background: "#fff0f3",
    border: "#f1c8d0"
  },
  "Geopolitics and Trade": {
    icon: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"></path>',
    color: "#3268be",
    background: "#edf4ff",
    border: "#c9dbf8"
  },
  "Policy and Regulation": {
    icon: '<path d="M7 3h8l4 4v14H7z"></path><path d="M15 3v5h5M10 12h7M10 16h7"></path>',
    color: "#51677f",
    background: "#f0f5f9",
    border: "#d5e0ea"
  },
  "Environment and Sustainability": {
    icon: '<path d="M5 20c8-1 13-7 14-16-8 1-14 6-14 14v2Z"></path><path d="M5 18c4-4 7-6 13-9"></path>',
    color: "#2d8752",
    background: "#eaf8ef",
    border: "#c8e8d2"
  },
  "Investment and FDI": {
    icon: '<path d="M4 19h16M6 16l4-4 3 3 5-7"></path><path d="M15 8h3v3"></path>',
    color: "#b86b20",
    background: "#fff3e7",
    border: "#efd2b1"
  },
  "Labor and Human Capital": {
    icon: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM15 21v-2a6 6 0 0 0-12 0v2"></path><path d="M17 11a3 3 0 1 0 0-6M21 21v-2a5 5 0 0 0-4-4.9"></path>',
    color: "#5b5fb8",
    background: "#f0f1ff",
    border: "#d6d8fa"
  },
  "Competitive Landscape": {
    icon: '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z"></path><path d="M9 4v14M15 6v14"></path>',
    color: "#536b83",
    background: "#f1f5f9",
    border: "#d8e1ea"
  }
};

function safeText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeLink(value) {
  const link = safeText(value, "");
  return /^https?:\/\//i.test(link) ? link : "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeCategory(category) {
  const value = safeText(category, "");
  if (!value) return "";
  return LEGACY_CATEGORY_MAP[value] || value;
}

function getPrimaryCategory(item) {
  return normalizeCategory(item?.primary_category || item?.category) || "Geopolitics and Trade";
}

function parseJoinedList(value) {
  return safeText(value, "")
    .split("|")
    .map((item) => normalizeCategory(item))
    .filter(Boolean);
}

function getRelatedCategories(item) {
  const primaryCategory = getPrimaryCategory(item);
  return [...new Set(parseJoinedList(item?.related_categories_joined))]
    .filter((category) => category !== primaryCategory);
}

function parseRelatedCategories(item) {
  return getRelatedCategories(item);
}

function itemTouchesCategory(item, selectedCategory) {
  const category = normalizeCategory(selectedCategory);
  if (!category) return false;

  return getPrimaryCategory(item) === category || getRelatedCategories(item).includes(category);
}

function getCategoryMatchPriority(item, selectedCategory) {
  const category = normalizeCategory(selectedCategory);
  if (getPrimaryCategory(item) === category) return 0;
  if (getRelatedCategories(item).includes(category)) return 1;
  return 2;
}

function newsDedupeKey(item) {
  return (
    safeText(item?.theme_id, "") ||
    safeText(item?.news_key, "") ||
    safeText(item?.headline_short, "")
  );
}

function dedupeNewsItems(items) {
  const seen = new Set();

  return items.filter((item, index) => {
    const key = newsDedupeKey(item) || `news-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function categoryOrderIndex(category) {
  const index = CATEGORY_ORDER.indexOf(normalizeCategory(category));
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function safeCategory(value) {
  return normalizeCategory(value) || "Geopolitics and Trade";
}

function getCategoryMeta(category) {
  const displayCategory = normalizeCategory(category);
  return CATEGORY_META[displayCategory] || CATEGORY_META["Geopolitics and Trade"];
}

function safeRisk(value) {
  return VALID_RISK_LEVELS.has(value) ? value : "Medium";
}

function safeDirection(value) {
  return VALID_DIRECTIONS.has(value) ? value : "Unknown";
}

function className(value) {
  return String(value).toLowerCase().replaceAll(" ", "-").replaceAll("&", "and");
}

function formatThaiDate(dateValue) {
  if (!dateValue) return "ไม่ระบุวันที่";

  const parsedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return safeText(dateValue, "ไม่ระบุวันที่");

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parsedDate);
}

function formatReportDate(dateValue) {
  if (!dateValue) return "DATE NOT AVAILABLE";

  const parsedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return safeText(dateValue, "DATE NOT AVAILABLE");

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
    .format(parsedDate)
    .toUpperCase();
}

function renderBriefMeta(data) {
  const reportDate = document.querySelector("#report-date");
  const summary = document.querySelector("#executive-summary");
  const updatedTime = document.querySelector("#updated-time");

  reportDate.textContent = formatReportDate(data.report_date);
  reportDate.dateTime = safeText(data.report_date, "");
  summary.textContent = safeText(
    data.executive_summary,
    "ยังไม่มีบทสรุปผู้บริหารสำหรับรายงานฉบับนี้"
  );
  if (updatedTime) {
    updatedTime.textContent = safeText(data.updated_time, "--:-- น.");
  }
}

function createCategoryIcon(category) {
  const meta = getCategoryMeta(category);
  return `
    <span class="category-icon" style="--icon-bg:${meta.background};--icon-color:${meta.color}" aria-hidden="true">
      <svg viewBox="0 0 24 24">${meta.icon}</svg>
    </span>
  `;
}

function directionLabel(direction) {
  return {
    Rising: "Risk Increased",
    Easing: "Risk Decreased",
    Stable: "Stable Risk",
    Unknown: "No Recent Signal"
  }[direction] || "No Recent Signal";
}

function createCategoryChip(category, options = {}) {
  const displayCategory = normalizeCategory(category);
  if (!displayCategory) return "";

  const meta = getCategoryMeta(displayCategory);
  const kind = options.primary ? "primary" : "related";
  return `
    <span
      class="category-chip category-chip-${kind}"
      style="--category-chip-bg:${meta.background};--category-chip-color:${meta.color};--category-chip-border:${meta.border}"
    >${escapeHtml(displayCategory)}</span>
  `;
}

function createCategoryChipRow(item, options = {}) {
  const primaryCategory = getPrimaryCategory(item);
  const categories = [primaryCategory, ...parseRelatedCategories(item)];
  const uniqueCategories = [...new Set(categories)].filter(Boolean);
  if (uniqueCategories.length === 0) return "";

  return `
    <span class="category-chip-row${options.compact ? " category-chip-row-compact" : ""}" aria-label="Categories">
      ${uniqueCategories
        .map((category, index) => createCategoryChip(category, { primary: index === 0 }))
        .join("")}
    </span>
  `;
}

function renderRiskOverview(items) {
  const container = document.querySelector("#risk-overview");
  const visibleItems = Array.isArray(items)
    ? [...items]
        .map((item) => ({
          ...item,
          category: getPrimaryCategory(item)
        }))
        .sort((a, b) => {
          const orderA = Number.isFinite(Number(a.category_order))
            ? Number(a.category_order)
            : categoryOrderIndex(a.category) + 100;
          const orderB = Number.isFinite(Number(b.category_order))
            ? Number(b.category_order)
            : categoryOrderIndex(b.category) + 100;
          return orderA - orderB || categoryOrderIndex(a.category) - categoryOrderIndex(b.category);
        })
    : [];

  if (visibleItems.length === 0) {
    container.innerHTML = '<div class="loading-card">ยังไม่มีข้อมูลความเสี่ยงรายหมวดหมู่</div>';
    return;
  }

  container.innerHTML = visibleItems
    .map((item) => {
      const category = safeCategory(item.category);
      const riskLevel = safeRisk(item.risk_level);
      const direction = safeDirection(item.risk_direction);

      return `
        <button class="risk-row" type="button" data-category="${escapeHtml(category)}" aria-label="ดูข่าวหมวด ${escapeHtml(category)}">
          <div class="risk-main">
            ${createCategoryIcon(category)}
            <div class="category-copy">
              <h3 class="category-name">${escapeHtml(category)}</h3>
              <p class="category-subtitle">${escapeHtml(safeText(item.subtitle_th, "ไม่มีรายละเอียดเพิ่มเติม"))}</p>
            </div>
          </div>
          <div class="risk-signal">
            <span class="direction direction-${className(direction)}">${directionLabel(direction)}</span>
            <span class="direction-note">จากเมื่อวาน</span>
          </div>
          <div class="risk-level-cell">
            <span class="risk-badge risk-${className(riskLevel)}">${riskLevel}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function findCategorySummary(category) {
  return briefingData?.risk_overview?.find((item) => getPrimaryCategory(item) === category) || {
    category,
    subtitle_th: "ไม่มีรายละเอียดเพิ่มเติม",
    risk_level: "Medium",
    risk_direction: "Unknown"
  };
}

function renderCategoryNews(category) {
  const list = document.querySelector("#category-news-list");
  const count = document.querySelector("#category-news-count");
  const selectedCategory = normalizeCategory(category);
  const newsItems = Array.isArray(briefingData?.web_category_news)
    ? dedupeNewsItems(
        briefingData.web_category_news.filter((item) => itemTouchesCategory(item, selectedCategory))
      )
        .sort((a, b) => {
          const dateOrder = safeText(b.report_date, "").localeCompare(safeText(a.report_date, ""));
          if (dateOrder) return dateOrder;

          const matchOrder =
            getCategoryMatchPriority(a, selectedCategory) -
            getCategoryMatchPriority(b, selectedCategory);
          if (matchOrder) return matchOrder;

          return Number(a.news_rank || 999) - Number(b.news_rank || 999);
        })
    : [];

  count.textContent = String(newsItems.length);

  if (newsItems.length === 0) {
    list.innerHTML = '<div class="empty-news-card">ยังไม่มีข่าวย้อนหลังสำหรับหมวดหมู่นี้</div>';
    return;
  }

  list.innerHTML = newsItems
    .map((item) => {
      const riskLevel = safeRisk(item.risk_level);
      const direction = safeDirection(item.risk_direction);
      const watchpoint = safeText(item.watchpoint_short, "");
      const themeId = safeText(item.theme_id, "");
      const categoryChips = createCategoryChipRow(item, { compact: true });

      return `
        <button class="category-news-card" type="button" data-news-theme="${escapeHtml(themeId)}">
          <div class="news-card-topline">
            <time datetime="${escapeHtml(safeText(item.report_date, ""))}">
              ${escapeHtml(formatThaiDate(item.report_date))}
            </time>
            <div class="news-card-risk">
              <span class="direction direction-${className(direction)}">${direction}</span>
              <span class="risk-badge risk-${className(riskLevel)}">${riskLevel}</span>
            </div>
          </div>
          ${categoryChips}
          <h3>${escapeHtml(safeText(item.headline_short, "ไม่มีชื่อประเด็นข่าว"))}</h3>
          <p class="news-detail">${escapeHtml(safeText(item.headline_detail, "ไม่มีรายละเอียดข่าวเพิ่มเติม"))}</p>
          ${
            watchpoint
              ? `<div class="news-watchpoint">
                  <span>WATCHPOINT</span>
                  <p>${escapeHtml(watchpoint)}</p>
                </div>`
              : ""
          }
          <span class="news-card-open">อ่านรายละเอียด <span aria-hidden="true">→</span></span>
        </button>
      `;
    })
    .join("");
}

function showCategoryDetail(category, updateHash = true) {
  const selectedCategory = normalizeCategory(category);
  if (!selectedCategory || !briefingData) return;

  const summary = findCategorySummary(selectedCategory);
  const riskLevel = safeRisk(summary.risk_level);
  const direction = safeDirection(summary.risk_direction);

  document.querySelector("#category-detail-icon").innerHTML = createCategoryIcon(selectedCategory);
  document.querySelector("#category-detail-title").textContent = selectedCategory;
  document.querySelector("#category-detail-subtitle").textContent = safeText(
    summary.subtitle_th,
    "ไม่มีรายละเอียดเพิ่มเติม"
  );

  const directionElement = document.querySelector("#category-detail-direction");
  directionElement.className = `direction direction-${className(direction)}`;
  directionElement.textContent = direction;

  const badge = document.querySelector("#category-detail-badge");
  badge.className = `risk-badge risk-${className(riskLevel)}`;
  badge.textContent = riskLevel;

  renderCategoryNews(selectedCategory);
  currentCategory = selectedCategory;
  document.querySelector("#home-view").hidden = true;
  document.querySelector("#category-view").hidden = false;
  document.querySelector("#today-headlines-view").hidden = true;
  document.querySelector("#news-detail-view").hidden = true;
  document.querySelector("#watchlist-view").hidden = true;
  document.body.classList.add("detail-open");
  setActiveNav("");
  document.title = `${selectedCategory} | IEAT Intelligence`;
  window.scrollTo({ top: 0, behavior: "auto" });

  if (updateHash) {
    history.pushState({ category: selectedCategory }, "", `#category=${encodeURIComponent(selectedCategory)}`);
  }
}

function showHome(updateHash = true) {
  document.querySelector("#category-view").hidden = true;
  document.querySelector("#today-headlines-view").hidden = true;
  document.querySelector("#news-detail-view").hidden = true;
  document.querySelector("#watchlist-view").hidden = true;
  document.querySelector("#home-view").hidden = false;
  document.body.classList.remove("detail-open");
  setActiveNav("home");
  document.title = "IEAT Intelligence";
  window.scrollTo({ top: 0, behavior: "auto" });

  if (updateHash) {
    history.pushState({}, "", `${window.location.pathname}${window.location.search}`);
  }
}

function getWebCategoryNews() {
  return Array.isArray(briefingData?.web_category_news) ? briefingData.web_category_news : [];
}

function findFullNews(item) {
  if (!item) return null;

  const themeId = safeText(item.theme_id, "");
  if (!themeId) return item;

  return getWebCategoryNews().find((news) => news.theme_id === themeId) || item;
}

function findNewsByTheme(themeId) {
  return getWebCategoryNews().find((item) => item.theme_id === themeId) || null;
}

function getTodayHeadlineItems() {
  const webTopHeadlines = Array.isArray(briefingData?.web_top_headlines)
    ? briefingData.web_top_headlines.map(findFullNews).filter(Boolean)
    : [];
  const categoryNews = getWebCategoryNews();
  const combinedNews = [...webTopHeadlines, ...categoryNews];
  const latestDate = combinedNews.reduce(
    (latest, item) => (safeText(item.report_date, "") > latest ? item.report_date : latest),
    ""
  );
  const seen = new Set();

  return combinedNews
    .filter((item) => item.report_date === latestDate)
    .filter((item) => {
      const key = safeText(item.theme_id, "") || safeText(item.headline_short, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(a.news_rank || 0) - Number(b.news_rank || 0));
}

function renderTodayHeadlines() {
  const list = document.querySelector("#today-headlines-list");
  const date = document.querySelector("#today-headlines-date");
  const items = getTodayHeadlineItems();
  const latestDate = items[0]?.report_date || briefingData?.report_date;

  date.textContent = formatThaiDate(latestDate);

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-news-card">ยังไม่มีข่าวสำหรับวันนี้</div>';
    return;
  }

  list.innerHTML = items
    .map((item, index) => {
      const riskLevel = safeRisk(item.risk_level);
      const direction = safeDirection(item.risk_direction);
      const themeId = safeText(item.theme_id, "");
      const categoryChips = createCategoryChipRow(item);

      return `
        <button class="today-headline-card" type="button" data-today-index="${index}" data-news-theme="${escapeHtml(themeId)}">
          <div class="today-headline-number">${String(index + 1).padStart(2, "0")}</div>
          <div class="today-headline-copy">
            ${categoryChips}
            <h2>${escapeHtml(safeText(item.headline_short, "ไม่มีชื่อประเด็นข่าว"))}</h2>
            <p>${escapeHtml(safeText(item.headline_detail, "ไม่มีรายละเอียดข่าวเพิ่มเติม"))}</p>
            <div class="today-headline-meta">
              <span class="direction direction-${className(direction)}">${direction}</span>
              <span class="risk-badge risk-${className(riskLevel)}">${riskLevel}</span>
            </div>
          </div>
          <span class="headline-chevron" aria-hidden="true">›</span>
        </button>
      `;
    })
    .join("");
}

function showTodayHeadlines() {
  renderTodayHeadlines();
  document.querySelector("#home-view").hidden = true;
  document.querySelector("#category-view").hidden = true;
  document.querySelector("#news-detail-view").hidden = true;
  document.querySelector("#watchlist-view").hidden = true;
  document.querySelector("#today-headlines-view").hidden = false;
  document.body.classList.add("detail-open");
  setActiveNav("");
  document.title = "ข่าวทั้งหมดวันนี้ | IEAT Intelligence";
  window.scrollTo({ top: 0, behavior: "auto" });
}

function getNewsSources(news) {
  const sourcesJson = safeText(news.sources_json, "");

  if (sourcesJson) {
    try {
      const parsedSources = JSON.parse(sourcesJson);
      if (Array.isArray(parsedSources) && parsedSources.length > 0) {
        const normalizedSources = parsedSources
          .filter((source) => source && typeof source === "object")
          .map((source) => ({
            name: safeText(source.source_name, "Source"),
            link: safeLink(source.source_link)
          }));

        if (normalizedSources.length > 0) return normalizedSources;
      }
    } catch {}
  }

  const joinedNames = safeText(news.source_names_joined, "");
  const joinedLinks = safeText(news.source_links_joined, "");

  if (joinedNames || joinedLinks) {
    const names = joinedNames ? joinedNames.split(" | ") : [];
    const links = joinedLinks ? joinedLinks.split(" | ") : [];
    const sourceTotal = Math.max(names.length, links.length);

    return Array.from({ length: sourceTotal }, (_, index) => ({
      name: safeText(names[index], "Source"),
      link: safeLink(links[index])
    }));
  }

  const primarySource = safeText(news.primary_source, "");
  const primaryLink = safeLink(news.primary_link);

  return primarySource || primaryLink
    ? [{ name: safeText(primarySource, "Source"), link: primaryLink }]
    : [];
}

function renderSourceList(sources) {
  if (sources.length === 0) {
    return '<p class="article-source-empty">ไม่พบข้อมูลแหล่งข่าวอ้างอิง</p>';
  }

  return `
    <ol class="article-source-list">
      ${sources
        .map(
          (source) => `
            <li>
              ${
                source.link
                  ? `<a href="${escapeHtml(source.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a>`
                  : `<span>${escapeHtml(source.name)}</span>`
              }
            </li>
          `
        )
        .join("")}
    </ol>
  `;
}

function getKeySignals(news = {}) {
  const signalsJson = safeText(news.key_signals_json, "");

  if (signalsJson) {
    try {
      const parsedSignals = JSON.parse(signalsJson);
      if (Array.isArray(parsedSignals)) {
        const signals = parsedSignals
          .map((signal) => safeText(signal, ""))
          .filter(Boolean);

        if (signals.length > 0) return signals;
      }
    } catch {}
  }

  const joinedSignals = safeText(news.key_signals_joined, "");
  if (!joinedSignals) return [];

  return joinedSignals
    .split("|")
    .map((signal) => safeText(signal, ""))
    .filter(Boolean);
}

function renderKeySignals(signals) {
  if (signals.length === 0) return "";

  return `
    <section class="article-briefing-section article-key-signals">
      <p class="section-kicker">KEY SIGNALS</p>
      <h2>สัญญาณสำคัญจากข่าว</h2>
      <ul class="article-signal-list">
        ${signals.map((signal) => `<li>${escapeHtml(signal)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderNewsDetail(item) {
  const container = document.querySelector("#news-detail-content");
  const news = findFullNews(item) || {};
  const riskLevel = safeRisk(news.risk_level);
  const direction = safeDirection(news.risk_direction);
  const headline = safeText(
    news.headline_full,
    safeText(news.headline_short, "ไม่มีชื่อประเด็นข่าว")
  );
  const intro = safeText(
    news.headline_detail_full,
    safeText(news.headline_detail, "")
  );
  const executiveTakeaway = safeText(news.executive_takeaway_full, "");
  const keySignals = getKeySignals(news);
  const thailandImpact = safeText(news.thailand_impact_full, "");
  const ieatRelevance = safeText(news.ieat_relevance_full, "");
  const watchpoint = safeText(
    news.watchpoint_full,
    safeText(news.watchpoint_short, "")
  );
  const sources = getNewsSources(news);
  const sourceCount =
    news.source_count !== undefined &&
    news.source_count !== null &&
    Number.isFinite(Number(news.source_count))
      ? Number(news.source_count)
      : null;

  container.innerHTML = `
    <header class="news-article-header">
      ${createCategoryChipRow(news)}
      <time datetime="${escapeHtml(safeText(news.report_date, ""))}">
        ${escapeHtml(formatThaiDate(news.report_date || briefingData?.report_date))}
      </time>
      <div class="news-article-risk">
        <span class="direction direction-${className(direction)}">${direction}</span>
        <span class="risk-badge risk-${className(riskLevel)}">${riskLevel}</span>
      </div>
      <h1 id="news-detail-title">${escapeHtml(headline)}</h1>
      ${intro ? `<p class="news-article-lead">${escapeHtml(intro)}</p>` : ""}
    </header>
    ${
      executiveTakeaway
        ? `<section class="article-briefing-section article-summary">
            <p class="section-kicker">EXECUTIVE SUMMARY</p>
            <h2>สรุปประเด็น</h2>
            <p>${escapeHtml(executiveTakeaway)}</p>
          </section>`
        : ""
    }
    ${renderKeySignals(keySignals)}
    ${
      thailandImpact
        ? `<section class="article-briefing-section">
            <p class="section-kicker">THAILAND IMPACT</p>
            <h2>ผลกระทบต่อไทย</h2>
            <p>${escapeHtml(thailandImpact)}</p>
          </section>`
        : ""
    }
    ${
      ieatRelevance
        ? `<section class="article-briefing-section">
            <p class="section-kicker">IEAT RELEVANCE</p>
            <h2>ความเกี่ยวข้องกับ กนอ.</h2>
            <p>${escapeHtml(ieatRelevance)}</p>
          </section>`
        : ""
    }
    ${
      watchpoint
        ? `<section class="article-watchpoint">
            <p class="section-kicker">EXECUTIVE WATCHPOINT</p>
            <h2>ประเด็นที่ต้องติดตาม</h2>
            <p>${escapeHtml(watchpoint)}</p>
          </section>`
        : ""
    }
    <section class="article-source">
      <p class="section-kicker">REFERENCE</p>
      <h2>แหล่งข่าวอ้างอิง</h2>
      ${sourceCount !== null ? `<p class="article-source-count">${sourceCount} แหล่งข่าวประกอบ</p>` : ""}
      ${renderSourceList(sources)}
    </section>
  `;
}

function showNewsDetail(item, origin) {
  if (!item) return;

  newsDetailOrigin = origin;
  renderNewsDetail(item);
  document.querySelector("#home-view").hidden = true;
  document.querySelector("#category-view").hidden = true;
  document.querySelector("#today-headlines-view").hidden = true;
  document.querySelector("#watchlist-view").hidden = true;
  document.querySelector("#news-detail-view").hidden = false;
  document.body.classList.add("detail-open");
  setActiveNav("");
  const news = findFullNews(item) || item;
  document.title = `${safeText(
    news.headline_full,
    safeText(news.headline_short, "News Detail")
  )} | IEAT Intelligence`;
  window.scrollTo({ top: 0, behavior: "auto" });
}

function backFromNewsDetail() {
  if (newsDetailOrigin === "category" && currentCategory) {
    showCategoryDetail(currentCategory, false);
    return;
  }

  if (newsDetailOrigin === "today") {
    showTodayHeadlines();
    return;
  }

  if (newsDetailOrigin === "watchlist") {
    showWatchlist();
    return;
  }

  showHome(false);
}

function setActiveNav(activeView) {
  const home = document.querySelector("#nav-home");
  const watchlist = document.querySelector("#nav-watchlist");

  home.classList.toggle("active", activeView === "home");
  watchlist.classList.toggle("active", activeView === "watchlist");

  if (activeView === "home") {
    home.setAttribute("aria-current", "page");
  } else {
    home.removeAttribute("aria-current");
  }

  if (activeView === "watchlist") {
    watchlist.setAttribute("aria-current", "page");
  } else {
    watchlist.removeAttribute("aria-current");
  }
}

function getWatchlistItems() {
  const categoryNews = getWebCategoryNews();
  const sourceItems =
    categoryNews.length > 0
      ? categoryNews
      : Array.isArray(briefingData?.web_watchlist)
        ? briefingData.web_watchlist
        : [];

  return sourceItems
    .map((item) => ({
      ...item,
      category: getPrimaryCategory(item),
      text: safeText(item.watchpoint_full, safeText(item.watchpoint_short, "")),
      rank: Number(item.news_rank ?? item.watch_rank ?? 0)
    }))
    .filter((item) => WATCHLIST_CATEGORY_ORDER.includes(item.category))
    .filter((item) => item.text)
    .sort((a, b) => {
      const categoryOrder =
        WATCHLIST_CATEGORY_ORDER.indexOf(a.category) -
        WATCHLIST_CATEGORY_ORDER.indexOf(b.category);
      const dateOrder = safeText(b.report_date, "").localeCompare(safeText(a.report_date, ""));
      return categoryOrder || dateOrder || a.rank - b.rank;
    });
}

function findWatchlistNews(item) {
  const themeId = safeText(item.theme_id, "");
  const newsKey = safeText(item.news_key, safeText(item.watch_key, ""));

  return (
    getWebCategoryNews().find(
      (news) =>
        (themeId && news.theme_id === themeId) ||
        (newsKey && news.news_key === newsKey)
    ) || null
  );
}

function renderWatchlist() {
  const container = document.querySelector("#watchlist-items");
  const items = getWatchlistItems();

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-news-card">ยังไม่มีประเด็นที่ต้องติดตาม</div>';
    return;
  }

  container.innerHTML = WATCHLIST_CATEGORY_ORDER.map((category) => {
    const categoryItems = items.filter((item) => item.category === category);
    if (categoryItems.length === 0) return "";

    const dates = [...new Set(categoryItems.map((item) => item.report_date))];

    return `
      <section class="watchlist-category" aria-labelledby="watchlist-${className(category)}">
        <h2 id="watchlist-${className(category)}">${escapeHtml(category)}</h2>
        ${dates
          .map((reportDate) => {
            const dateItems = categoryItems.filter((item) => item.report_date === reportDate);

            return `
              <div class="watchlist-date-group">
                <h3>${escapeHtml(formatThaiDate(reportDate))}</h3>
                <ul>
                  ${dateItems
                    .map((item) => {
                      const news = findWatchlistNews(item);
                      const categoryChips = createCategoryChipRow(item, { compact: true });
                      const content = `<span>${categoryChips}<span>${escapeHtml(item.text)}</span></span>`;

                      return `
                        <li>
                          ${
                            news
                              ? `<button type="button" data-watchlist-theme="${escapeHtml(news.theme_id)}">${content}<span class="watchlist-link-mark" aria-hidden="true">›</span></button>`
                              : `<p>${content}</p>`
                          }
                        </li>
                      `;
                    })
                    .join("")}
                </ul>
              </div>
            `;
          })
          .join("")}
      </section>
    `;
  }).join("");
}

function showWatchlist() {
  renderWatchlist();
  document.querySelector("#home-view").hidden = true;
  document.querySelector("#category-view").hidden = true;
  document.querySelector("#today-headlines-view").hidden = true;
  document.querySelector("#news-detail-view").hidden = true;
  document.querySelector("#watchlist-view").hidden = false;
  document.body.classList.remove("detail-open");
  setActiveNav("watchlist");
  document.title = "Watchpoint Today | IEAT Intelligence";
  window.scrollTo({ top: 0, behavior: "auto" });
}

function openMenu() {
  const menu = document.querySelector("#app-menu");
  const backdrop = document.querySelector("#menu-backdrop");
  const toggle = document.querySelector("#menu-toggle");

  window.clearTimeout(menuCloseTimer);
  menu.hidden = false;
  backdrop.hidden = false;

  requestAnimationFrame(() => {
    menu.classList.add("open");
    backdrop.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  });
}

function closeMenu() {
  const menu = document.querySelector("#app-menu");
  const backdrop = document.querySelector("#menu-backdrop");
  const toggle = document.querySelector("#menu-toggle");

  menu.classList.remove("open");
  backdrop.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
  toggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");

  window.clearTimeout(menuCloseTimer);
  menuCloseTimer = window.setTimeout(() => {
    menu.hidden = true;
    backdrop.hidden = true;
  }, 220);
}

function categoryFromHash() {
  const match = window.location.hash.match(/^#category=(.+)$/);
  if (!match) return "";

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

function bindNavigation() {
  document.querySelector("#risk-overview").addEventListener("click", (event) => {
    const row = event.target.closest("[data-category]");
    if (row) showCategoryDetail(row.dataset.category);
  });

  document.querySelector("#category-back").addEventListener("click", () => {
    showHome(false);
    history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
  });

  document.querySelector("#category-news-list").addEventListener("click", (event) => {
    const card = event.target.closest("[data-news-theme]");
    if (!card) return;

    showNewsDetail(findNewsByTheme(card.dataset.newsTheme), "category");
  });

  document.querySelector("#headlines-list").addEventListener("click", (event) => {
    const row = event.target.closest("[data-headline-index]");
    if (!row) return;

    const item = briefingData?.top_headlines?.[Number(row.dataset.headlineIndex)];
    showNewsDetail(findFullNews(item), "home");
  });

  document.querySelector("#headlines-list").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const row = event.target.closest("[data-headline-index]");
    if (!row) return;

    event.preventDefault();
    row.click();
  });

  document.querySelector("#view-all-headlines").addEventListener("click", showTodayHeadlines);
  document.querySelector("#today-headlines-back").addEventListener("click", () => showHome(false));
  document.querySelector("#news-detail-back").addEventListener("click", backFromNewsDetail);
  document.querySelector("#watchlist-back").addEventListener("click", () => showHome(false));
  document.querySelector("#nav-home").addEventListener("click", () => showHome(false));
  document.querySelector("#nav-watchlist").addEventListener("click", showWatchlist);
  document.querySelector("#watchpoint-list").addEventListener("click", (event) => {
    if (!event.target.closest(".watchpoint-card")) return;

    showWatchlist();
  });
  document.querySelector("#watchpoint-list").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!event.target.closest(".watchpoint-card")) return;

    event.preventDefault();
    showWatchlist();
  });

  document.querySelector("#watchlist-items").addEventListener("click", (event) => {
    const item = event.target.closest("[data-watchlist-theme]");
    if (!item) return;

    showNewsDetail(findNewsByTheme(item.dataset.watchlistTheme), "watchlist");
  });

  document.querySelector("#today-headlines-list").addEventListener("click", (event) => {
    const card = event.target.closest("[data-today-index]");
    if (!card) return;

    const item = getTodayHeadlineItems()[Number(card.dataset.todayIndex)];
    showNewsDetail(findFullNews(item), "today");
  });

  document.querySelector("#menu-toggle").addEventListener("click", openMenu);
  document.querySelector("#menu-close").addEventListener("click", closeMenu);
  document.querySelector("#menu-backdrop").addEventListener("click", closeMenu);

  document.querySelector("#app-menu").addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-menu-category]");
    if (categoryButton) {
      closeMenu();
      showCategoryDetail(categoryButton.dataset.menuCategory);
      return;
    }

    const actionButton = event.target.closest("[data-menu-action]");
    if (!actionButton) return;

    closeMenu();
    if (actionButton.dataset.menuAction === "today") {
      showTodayHeadlines();
    } else if (actionButton.dataset.menuAction === "watchpoint") {
      showWatchlist();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.querySelector("#app-menu").classList.contains("open")) {
      closeMenu();
    }
  });

  window.addEventListener("popstate", () => {
    const category = categoryFromHash();
    if (category) {
      showCategoryDetail(category, false);
    } else {
      showHome(false);
    }
  });
}

function renderHeadlines(items) {
  const list = document.querySelector("#headlines-list");

  if (!Array.isArray(items) || items.length === 0) {
    list.innerHTML = '<li class="loading-card">ยังไม่มีประเด็นข่าวสำคัญในขณะนี้</li>';
    return;
  }

  list.innerHTML = items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .slice(0, 3)
    .map(({ item, originalIndex }, index) => {
      const fullItem = findFullNews(item) || item;
      const categoryChips = createCategoryChipRow(fullItem, { compact: true });
      const riskLevel = safeRisk(item.risk_level);

      return `
        <li class="headline-item" data-headline-index="${originalIndex}" tabindex="0" role="button">
          <span class="headline-rank">${index + 1}</span>
          <div class="headline-copy">
            <h3 class="headline-title">${safeText(item.headline_short, "ไม่มีชื่อประเด็นข่าว")}</h3>
            <div class="headline-meta">
              ${categoryChips}
              <span class="headline-risk text-${className(riskLevel)}">
                Risk: ${riskLevel}
              </span>
            </div>
          </div>
          <span class="headline-chevron" aria-hidden="true">›</span>
        </li>
      `;
    })
    .join("");
}

function getHomepageWatchpoints(value) {
  const reportDate = safeText(briefingData?.report_date, "");
  const watchlistItems = Array.isArray(briefingData?.web_watchlist)
    ? briefingData.web_watchlist
    : [];
  const currentWatchpoints = watchlistItems
    .filter((item) => !reportDate || safeText(item.report_date, "") === reportDate)
    .map((item) => ({
      category: getPrimaryCategory(item),
      text: safeText(item.watchpoint_detail, safeText(item.watchpoint_short, ""))
    }))
    .filter((item) => item.text);

  if (currentWatchpoints.length > 0) return currentWatchpoints;

  return [
    {
      category: "",
      text: safeText(
        value,
        "ยังไม่มีประเด็นเฝ้าระวังเพิ่มเติมสำหรับวันนี้"
      )
    }
  ];
}

function renderWatchpoint(value) {
  const watchpointList = document.querySelector("#watchpoint-list");
  const watchpoints = getHomepageWatchpoints(value);

  watchpointList.innerHTML = watchpoints
    .map((item, index) => `
      <article class="watchpoint-card" role="button" tabindex="0" aria-label="เปิด Watchpoint Today">
        <div class="watchpoint-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
            <circle cx="12" cy="12" r="2.5"></circle>
          </svg>
        </div>
        <div>
          <p class="section-kicker">${escapeHtml(item.category || "WATCHPOINT TODAY")}</p>
          <p${index === 0 ? ' id="watchpoint-text"' : ' class="watchpoint-text"'}>${escapeHtml(item.text)}</p>
        </div>
        <span class="card-chevron" aria-hidden="true">›</span>
      </article>
    `)
    .join("");
}
function firstRecord(value) {
  if (Array.isArray(value)) return value[0] || {};
  return value && typeof value === "object" ? value : {};
}

function normalizeBriefingData(data) {
  const home = firstRecord(data.web_home_daily);
  const categoryStatus = Array.isArray(data.web_category_status)
    ? data.web_category_status
    : [];
  const topHeadlines = Array.isArray(data.web_top_headlines)
    ? data.web_top_headlines
    : [];
  const watchlist = Array.isArray(data.web_watchlist) ? data.web_watchlist : [];

  return {
    ...data,
    report_date: data.report_date || home.report_date,
    updated_time: data.updated_time || home.last_updated,
    executive_summary:
      data.executive_summary ||
      home.executive_summary_short ||
      home.page_subtitle,
    risk_overview:
      (Array.isArray(data.risk_overview) && data.risk_overview.length > 0
        ? data.risk_overview
        : categoryStatus
      ).map((item) => ({
        ...item,
        category: getPrimaryCategory(item),
        subtitle_th:
          item.subtitle_th ||
          item.category_subtitle_th ||
          item.category_th
      })),
    top_headlines:
      Array.isArray(data.top_headlines) && data.top_headlines.length > 0
        ? data.top_headlines
        : topHeadlines,
    watchpoint:
      data.watchpoint ||
      home.main_watchpoint ||
      watchlist[0]?.watchpoint_detail ||
      watchlist[0]?.watchpoint_short ||
      ""
  };
}

function showLoadError() {
  document.querySelector("#data-error").hidden = false;
  renderBriefMeta({});
  renderRiskOverview([]);
  renderHeadlines([]);
  renderWatchpoint("");
}

async function loadBriefing() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);

    const raw = await response.json();
    const rawRoot = Array.isArray(raw) ? raw[0] || {} : raw;
    const data = rawRoot.latest_json || rawRoot;

    console.log("latest.json loaded:", {
      web_home_daily: Boolean(data.web_home_daily),
      web_category_status: Array.isArray(data.web_category_status),
      web_top_headlines: Array.isArray(data.web_top_headlines),
      web_watchlist: Array.isArray(data.web_watchlist),
      web_reports_index: Boolean(data.web_reports_index),
      web_category_news: Array.isArray(data.web_category_news)
    });

    const briefing = normalizeBriefingData(data);
    briefingData = briefing;
    renderBriefMeta(briefing);
    renderRiskOverview(briefing.risk_overview);
    renderHeadlines(briefing.top_headlines);
    renderWatchpoint(briefing.watchpoint);
    bindNavigation();

    const initialCategory = categoryFromHash();
    if (initialCategory) showCategoryDetail(initialCategory, false);
  } catch (error) {
    console.error(`Failed to load ${DATA_URL}:`, error);
    showLoadError();
  }
}

loadBriefing();

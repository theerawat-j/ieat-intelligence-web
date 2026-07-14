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
let kriDetailReturnView = "home";
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
  document.querySelector("#reports-view").hidden = true;
  document.querySelector("#kri-dashboard-view").hidden = true;
  document.querySelector("#kri-detail-view").hidden = true;
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
  document.querySelector("#reports-view").hidden = true;
  document.querySelector("#kri-dashboard-view").hidden = true;
  document.querySelector("#kri-detail-view").hidden = true;
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
  document.querySelector("#reports-view").hidden = true;
  document.querySelector("#kri-dashboard-view").hidden = true;
  document.querySelector("#kri-detail-view").hidden = true;
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
  document.querySelector("#reports-view").hidden = true;
  document.querySelector("#kri-dashboard-view").hidden = true;
  document.querySelector("#kri-detail-view").hidden = true;
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
  const erm = document.querySelector("#nav-erm");
  const reports = document.querySelector("#nav-reports");
  const watchlist = document.querySelector("#nav-watchlist");

  home.classList.toggle("active", activeView === "home");
  erm.classList.toggle("active", activeView === "erm");
  reports.classList.toggle("active", activeView === "reports");
  watchlist.classList.toggle("active", activeView === "watchlist");

  if (activeView === "home") {
    home.setAttribute("aria-current", "page");
  } else {
    home.removeAttribute("aria-current");
  }

  if (activeView === "erm") {
    erm.setAttribute("aria-current", "page");
  } else {
    erm.removeAttribute("aria-current");
  }

  if (activeView === "reports") {
    reports.setAttribute("aria-current", "page");
  } else {
    reports.removeAttribute("aria-current");
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
  document.querySelector("#reports-view").hidden = true;
  document.querySelector("#kri-dashboard-view").hidden = true;
  document.querySelector("#kri-detail-view").hidden = true;
  document.querySelector("#watchlist-view").hidden = false;
  document.body.classList.remove("detail-open");
  setActiveNav("watchlist");
  document.title = "Watchpoint Today | IEAT Intelligence";
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showReports() {
  document.querySelector("#home-view").hidden = true;
  document.querySelector("#category-view").hidden = true;
  document.querySelector("#today-headlines-view").hidden = true;
  document.querySelector("#news-detail-view").hidden = true;
  document.querySelector("#watchlist-view").hidden = true;
  document.querySelector("#reports-view").hidden = false;
  document.querySelector("#kri-dashboard-view").hidden = true;
  document.querySelector("#kri-detail-view").hidden = true;
  document.body.classList.remove("detail-open");
  setActiveNav("reports");
  document.title = "Reports | IEAT Intelligence";
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showKriDashboard() {
  renderKriDashboard();
  document.querySelector("#home-view").hidden = true;
  document.querySelector("#category-view").hidden = true;
  document.querySelector("#today-headlines-view").hidden = true;
  document.querySelector("#news-detail-view").hidden = true;
  document.querySelector("#watchlist-view").hidden = true;
  document.querySelector("#reports-view").hidden = true;
  document.querySelector("#kri-dashboard-view").hidden = false;
  document.querySelector("#kri-detail-view").hidden = true;
  document.body.classList.add("detail-open");
  setActiveNav("erm");
  document.title = "ERM Dashboard | IEAT Intelligence";
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showKriDetail(kriCode, returnView = "home") {
  const item = getKriItemByCode(kriCode);
  if (!item) return;

  kriDetailReturnView = returnView;
  renderKriDetail(item);
  document.querySelector("#home-view").hidden = true;
  document.querySelector("#category-view").hidden = true;
  document.querySelector("#today-headlines-view").hidden = true;
  document.querySelector("#news-detail-view").hidden = true;
  document.querySelector("#watchlist-view").hidden = true;
  document.querySelector("#reports-view").hidden = true;
  document.querySelector("#kri-dashboard-view").hidden = true;
  document.querySelector("#kri-detail-view").hidden = false;
  document.body.classList.add("detail-open");
  setActiveNav("erm");
  document.title = `${safeText(item.kri_code, "KRI")} | IEAT Intelligence`;
  window.scrollTo({ top: 0, behavior: "auto" });
}

function backFromKriDetail() {
  if (kriDetailReturnView === "kri-dashboard") {
    showKriDashboard();
    return;
  }

  showHome(false);
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
  document.querySelector("#reports-back").addEventListener("click", () => showHome(false));
  document.querySelector("#kri-dashboard-back").addEventListener("click", () => showHome(false));
  document.querySelector("#view-kri-dashboard").addEventListener("click", showKriDashboard);
  document.querySelector("#kri-detail-back").addEventListener("click", backFromKriDetail);
  document.querySelector("#nav-home").addEventListener("click", () => showHome(false));
  document.querySelector("#nav-erm").addEventListener("click", showKriDashboard);
  document.querySelector("#nav-reports").addEventListener("click", showReports);
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

  document.querySelector("#kri-snapshot-list").addEventListener("click", (event) => {
    const tile = event.target.closest("[data-kri-code]");
    if (!tile) return;

    showKriDetail(tile.dataset.kriCode, "home");
  });

  document.querySelector("#kri-snapshot-list").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const tile = event.target.closest("[data-kri-code]");
    if (!tile) return;

    event.preventDefault();
    showKriDetail(tile.dataset.kriCode, "home");
  });

  document.querySelector("#kri-overview-list").addEventListener("click", (event) => {
    const row = event.target.closest("[data-kri-code]");
    if (!row) return;

    showKriDetail(row.dataset.kriCode, "kri-dashboard");
  });

  document.querySelector("#kri-overview-list").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const row = event.target.closest("[data-kri-code]");
    if (!row) return;

    event.preventDefault();
    showKriDetail(row.dataset.kriCode, "kri-dashboard");
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
    } else if (actionButton.dataset.menuAction === "erm") {
      showKriDashboard();
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
          <svg class="radar-eye-icon" viewBox="0 0 24 24">
            <path class="radar-orbit" d="M5.2 7.7a8.8 8.8 0 0 1 13.6 0"></path>
            <path class="radar-orbit" d="M5.2 16.3a8.8 8.8 0 0 0 13.6 0"></path>
            <path d="M3.8 12s3.1-4.4 8.2-4.4 8.2 4.4 8.2 4.4-3.1 4.4-8.2 4.4S3.8 12 3.8 12Z"></path>
            <circle cx="12" cy="12" r="2.6"></circle>
            <circle class="radar-dot" cx="12" cy="5.2" r="0.7"></circle>
            <circle class="radar-dot" cx="18.9" cy="8" r="0.55"></circle>
            <circle class="radar-dot" cx="18.9" cy="16" r="0.55"></circle>
            <circle class="radar-dot" cx="12" cy="18.8" r="0.7"></circle>
            <circle class="radar-dot" cx="5.1" cy="16" r="0.55"></circle>
            <circle class="radar-dot" cx="5.1" cy="8" r="0.55"></circle>
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

const KRI_RISK_COLOR_MAP = {
  green: "#00B050",
  yellow: "#EAB308",
  orange: "#ED7D31",
  red: "#C00000",
  low: "#00B050",
  medium: "#EAB308",
  high: "#ED7D31",
  very_high: "#C00000",
  extreme: "#C00000"
};

const KRI_RISK_LEVEL_META = {
  low: {
    label: "Low",
    accent: "#16A34A",
    background: "rgba(22, 163, 74, 0.1)",
    border: "rgba(22, 163, 74, 0.26)",
    matrix: "linear-gradient(135deg, #BFEFD8 0%, #76CFA1 100%)"
  },
  medium: {
    label: "Medium",
    accent: "#D97706",
    background: "rgba(234, 179, 8, 0.11)",
    border: "rgba(234, 179, 8, 0.28)",
    matrix: "linear-gradient(135deg, #FFF0B8 0%, #FFD66B 100%)"
  },
  high: {
    label: "High",
    accent: "#F97316",
    background: "rgba(249, 115, 22, 0.1)",
    border: "rgba(249, 115, 22, 0.28)",
    matrix: "linear-gradient(135deg, #FFD5A8 0%, #FFA14D 100%)"
  },
  extreme: {
    label: "Extreme",
    accent: "#DC2626",
    background: "rgba(220, 38, 38, 0.1)",
    border: "rgba(220, 38, 38, 0.28)",
    matrix: "linear-gradient(135deg, #FFB6B6 0%, #F95F67 100%)"
  }
};

const KRI_HOME_ORDER = [
  "S1",
  "S2",
  "S3",
  "F1",
  "F2",
  "O1",
  "O2",
  "O3",
  "O4",
  "O5"
];

const KRI_PERFORMANCE_ORDER = ["appetite", "tolerance", "in_progress", "not_meet"];

const KRI_PERFORMANCE_COPY = {
  appetite: {
    label: "Risk Appetite",
    summary: "บรรลุเป้าหมาย",
    insight: "จำนวนที่บรรลุ Risk Appetite"
  },
  tolerance: {
    label: "Risk Tolerance",
    summary: "อยู่ในระดับที่ยอมรับได้",
    insight: "จำนวนที่อยู่ใน Risk Tolerance"
  },
  in_progress: {
    label: "On Track",
    summary: "ดำเนินงานได้ตามแผน",
    insight: "จำนวนที่ดำเนินงานได้ตามแผน"
  },
  not_meet: {
    label: "Not Meet",
    summary: "ไม่บรรลุเป้าหมาย RA / RT",
    insight: "จำนวนที่ไม่บรรลุ RA / RT"
  }
};

function safeHexColor(value) {
  const color = safeText(value, "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^[0-9a-f]{6}$/i.test(color)) return `#${color}`;
  return "";
}

function hexToRgba(hex, alpha) {
  const normalized = safeHexColor(hex);
  if (!normalized) return `rgba(102, 51, 163, ${alpha})`;

  const value = normalized.slice(1);
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getKriRiskColor(item) {
  const hexColor = safeHexColor(item.color_hex);
  if (hexColor) return hexColor;

  const riskColor = safeText(item.risk_color, "").toLowerCase();
  return KRI_RISK_COLOR_MAP[riskColor] || "#6633A3";
}

function getKriRiskColorByName(riskColor) {
  const normalized = safeText(riskColor, "").toLowerCase();
  return KRI_RISK_COLOR_MAP[normalized] || "#6633A3";
}

function normalizeKriRiskKey(value) {
  const raw = safeText(value, "").trim();
  const thaiMap = {
    "ต่ำ": "low",
    "ปานกลาง": "medium",
    "สูง": "high",
    "สูงมาก": "extreme"
  };
  if (thaiMap[raw]) return thaiMap[raw];

  const key = raw.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  const keyMap = {
    green: "low",
    yellow: "medium",
    orange: "high",
    red: "extreme",
    very_high: "extreme",
    extreme: "extreme",
    low: "low",
    medium: "medium",
    high: "high"
  };
  return keyMap[key] || "";
}

function inferKriRiskKeyFromColor(color) {
  const normalized = safeHexColor(color).toUpperCase();
  if (!normalized) return "";

  if (["#00B050", "#16A34A", "#1F9D74", "#42B883"].includes(normalized)) return "low";
  if (["#FFFF00", "#FFF200", "#FFD966", "#F2C94C", "#EAB308", "#D97706"].includes(normalized)) return "medium";
  if (["#ED7D31", "#F97316", "#F58220", "#DF6A3E"].includes(normalized)) return "high";
  if (["#C00000", "#DC2626", "#C53B51", "#F95F67"].includes(normalized)) return "extreme";
  return "";
}

function getKriRiskKey(item) {
  return (
    normalizeKriRiskKey(item.risk_zone) ||
    normalizeKriRiskKey(item.risk_label) ||
    normalizeKriRiskKey(item.risk_color) ||
    inferKriRiskKeyFromColor(item.color_hex) ||
    "medium"
  );
}

function getKriRiskLevelMeta(item) {
  return KRI_RISK_LEVEL_META[getKriRiskKey(item)] || KRI_RISK_LEVEL_META.medium;
}

function normalizeKriRiskVisualColor(color) {
  const normalized = safeHexColor(color).toUpperCase();
  if (!normalized) return "#6633A3";

  if (["#FFFF00", "#FFF200", "#FFD966", "#F2C94C"].includes(normalized)) {
    return "#EAB308";
  }

  return normalized;
}

function getKriRiskVisual(item) {
  const accent = normalizeKriRiskVisualColor(getKriRiskColor(item));
  return {
    accent,
    background: hexToRgba(accent, 0.075),
    border: hexToRgba(accent, 0.3),
    marker: hexToRgba(accent, 0.72)
  };
}

function getKriRiskVisualFromFields(colorHex, riskColor) {
  const key =
    normalizeKriRiskKey(riskColor) ||
    inferKriRiskKeyFromColor(colorHex) ||
    "medium";
  const meta = KRI_RISK_LEVEL_META[key] || KRI_RISK_LEVEL_META.medium;

  return {
    accent: meta.accent,
    background: meta.matrix,
    border: meta.border,
    marker: hexToRgba(meta.accent, 0.72)
  };
}

function normalizePerformanceLevel(value) {
  const level = safeText(value, "in_progress").toLowerCase();
  return ["appetite", "tolerance", "not_meet", "in_progress"].includes(level)
    ? level
    : "in_progress";
}

function kriPerformanceIcon(level) {
  if (level === "appetite") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 18.5 6v5.2c0 4.1-2.6 7.8-6.5 9.3-3.9-1.5-6.5-5.2-6.5-9.3V6L12 3.5Z"></path><path d="m9.2 12 1.8 1.8 3.9-4.2"></path></svg>';
  }

  if (level === "tolerance") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 18.5 6v5.2c0 4.1-2.6 7.8-6.5 9.3-3.9-1.5-6.5-5.2-6.5-9.3V6L12 3.5Z"></path><path d="M12 7.2 15.6 8.6v2.9c0 2.1-1.4 4.2-3.6 5.2-2.2-1-3.6-3.1-3.6-5.2V8.6L12 7.2Z"></path></svg>';
  }

  if (level === "not_meet") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 10 18H2L12 3Z"></path><path d="M12 9v4M12 17h.01"></path></svg>';
  }

  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>';
}

function getCompactPerformanceLabel(level, fallbackLabel) {
  const labels = {
    appetite: "Risk Appetite",
    tolerance: "Risk Tolerance",
    in_progress: "On Track",
    not_meet: "Not Meet"
  };
  return labels[level] || safeText(fallbackLabel, "On Track");
}

function getThaiPerformanceLabel(level, fallbackLabel) {
  const labels = {
    appetite: "บรรลุเป้าหมาย",
    tolerance: "อยู่ในระดับที่ยอมรับได้",
    in_progress: "ดำเนินงานได้ตามแผน",
    not_meet: "ไม่บรรลุเป้าหมาย RA / RT"
  };
  return labels[level] || safeText(fallbackLabel, "ไม่ระบุ");
}

function getKriItems() {
  return Array.isArray(briefingData?.kri?.items) ? briefingData.kri.items : [];
}

function normalizeKriCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function getKriItemByCode(kriCode) {
  const code = normalizeKriCode(kriCode);
  if (!code) return null;

  return getKriItems().find((item) => normalizeKriCode(item.kri_code) === code) || null;
}

function getKriActionsForItem(item) {
  if (!item) return [];

  if (Array.isArray(item.actions) && item.actions.length > 0) {
    return item.actions;
  }

  const code = normalizeKriCode(item.kri_code);
  const actions = Array.isArray(briefingData?.kri?.actions) ? briefingData.kri.actions : [];

  return actions.filter((action) => normalizeKriCode(action.kri_code) === code);
}

function getGroupedKriActions(item) {
  return getKriActionsForItem(item)
    .filter((action) => safeText(action?.action_text, ""))
    .sort((a, b) => Number(a.display_order || 999) - Number(b.display_order || 999))
    .reduce((groups, action) => {
      const actionType = safeText(action.action_type, "Other");
      if (!groups[actionType]) groups[actionType] = [];
      groups[actionType].push(action);
      return groups;
    }, {});
}

function getKriRiskMatrix() {
  return Array.isArray(briefingData?.kri?.risk_matrix)
    ? briefingData.kri.risk_matrix
    : [];
}

function getKriHomeOrderedItems() {
  const items = getKriItems();
  const usedItems = new Set();
  const itemByCode = items.reduce((lookup, item) => {
    const code = safeText(item.kri_code, "").toUpperCase();
    if (code && !lookup[code]) lookup[code] = item;
    return lookup;
  }, {});

  const orderedItems = KRI_HOME_ORDER
    .map((code) => {
      const item = itemByCode[code];
      if (item) usedItems.add(item);
      return item;
    })
    .filter(Boolean);

  const remainingItems = items.filter((item) => !usedItems.has(item));
  return [...orderedItems, ...remainingItems];
}

function getKriSnapshotItems() {
  const items = Array.isArray(briefingData?.kri?.items)
    ? briefingData.kri.items
    : [];

  const itemByCode = items.reduce((lookup, item) => {
    const code = safeText(item.kri_code, "").toUpperCase();
    if (code && !lookup[code]) lookup[code] = item;
    return lookup;
  }, {});

  const orderedItems = KRI_HOME_ORDER
    .map((code) => itemByCode[code])
    .filter(Boolean);

  if (orderedItems.length > 0) return orderedItems;

  return items;
}

function getKriPerformanceCounts(items) {
  return items.reduce(
    (counts, item) => {
      const level = normalizePerformanceLevel(item.performance_level);
      counts[level] += 1;
      return counts;
    },
    { appetite: 0, tolerance: 0, in_progress: 0, not_meet: 0 }
  );
}

function formatKriLastUpdate(value) {
  if (value === null || value === undefined || value === "") return "ไม่ระบุ";

  const numericValue = typeof value === "number" ? value : Number(String(value).trim());
  if (Number.isFinite(numericValue) && numericValue > 20000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsed = new Date(excelEpoch + numericValue * 86400000);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
  }

  const stringValue = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return formatThaiDate(stringValue.slice(0, 10));
  }

  const parsed = new Date(stringValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  return stringValue || "ไม่ระบุ";
}

function getKriTrendMeta(value) {
  const trend = safeText(value, "unknown").toLowerCase();
  const trendMap = {
    improving: { label: "Improving", icon: "↑", className: "improving" },
    stable: { label: "Stable", icon: "→", className: "stable" },
    worsening: { label: "Worsening", icon: "↓", className: "worsening" },
    unknown: { label: "Unknown", icon: "–", className: "unknown" }
  };
  return trendMap[trend] || trendMap.unknown;
}

function getKriRiskLevelLabel(item) {
  return getKriRiskLevelMeta(item).label;
}

function formatNumberedText(value, fallback) {
  const text = safeText(value, fallback);
  return escapeHtml(text)
    .replace(/\s+(?=\d+\.\s)/g, "<br>")
    .replace(/\s+(?=\d+\)\s)/g, "<br>")
    .replace(/\s+(?=-\s)/g, "<br>");
}

function toMetricNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  const number = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : NaN;
}

function formatMetricValue(value, unit = "") {
  const number = toMetricNumber(value);
  if (!Number.isFinite(number)) return "ไม่ระบุ";

  const decimals = Math.abs(number) >= 100 ? 2 : 2;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(number);
}

function formatMetricValueWithUnit(value, unit = "") {
  const formattedValue = formatMetricValue(value);
  const cleanUnit = safeText(unit, "");
  if (!cleanUnit || formattedValue === "ไม่ระบุ") return escapeHtml(formattedValue);

  const escapedValue = escapeHtml(formattedValue);
  const escapedUnit = escapeHtml(cleanUnit);
  const spacer = cleanUnit === "%" ? "" : " ";
  return `<span class="financial-metric-value-number">${escapedValue}</span>${spacer}<span class="financial-metric-value-unit">${escapedUnit}</span>`;
}

function getMetricStatusDisplay(metric) {
  const rawStatus = safeText(metric.status, "").toLowerCase();
  const status = ["appetite", "tolerance", "not_meet", "in_progress"].includes(rawStatus)
    ? rawStatus
    : "unknown";
  const fallback =
    status === "unknown"
      ? { label: "Unknown", summary: "ไม่ระบุ" }
      : KRI_PERFORMANCE_COPY[status] || KRI_PERFORMANCE_COPY.in_progress;
  return {
    status,
    label: safeText(metric.status_label, fallback.label),
    labelTh: safeText(metric.status_label_th, fallback.summary)
  };
}

function getMetricChartScale(metric) {
  const actual = toMetricNumber(metric.actual_value);
  const appetite = toMetricNumber(metric.risk_appetite_value);
  const tolerance = toMetricNumber(metric.risk_tolerance_value);
  const values = [actual, appetite, tolerance].filter(Number.isFinite);
  if (values.length < 3) return null;

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin || Math.max(Math.abs(rawMax), 1);
  const min = Math.max(0, rawMin - range * 0.35);
  const max = rawMax + range * 0.35;
  const span = max - min || 1;
  const pct = (value) => Math.max(0, Math.min(100, ((value - min) / span) * 100));

  return {
    actual,
    appetite,
    tolerance,
    min,
    max,
    actualPct: pct(actual),
    appetitePct: pct(appetite),
    tolerancePct: pct(tolerance)
  };
}

function getMetricIcon(metricKey) {
  const key = safeText(metricKey, "").toLowerCase();
  if (key.includes("revenue")) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9"></path><path d="M10 19V5"></path><path d="M16 19v-7"></path><path d="M21 19H3"></path><path d="m14 7 3-3 3 3"></path></svg>';
  }
  if (key.includes("ebitda") || key.includes("margin")) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9h9"></path><path d="M19.1 16.7A8 8 0 1 1 7.3 4.9"></path><path d="M7 17 17 7"></path></svg>';
  }
  if (key.includes("cost")) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5 5 19"></path><circle cx="7.5" cy="7.5" r="2.5"></circle><circle cx="16.5" cy="16.5" r="2.5"></circle></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"></path><path d="M6 16l4-4 3 3 5-7"></path><path d="M18 8h-4"></path><path d="M18 8v4"></path></svg>';
}

function renderFinancialMetricChart(metric) {
  const scale = getMetricChartScale(metric);
  if (!scale) {
    return '<div class="financial-chart-empty">ไม่พบข้อมูลกราฟ</div>';
  }

  const direction = safeText(metric.direction, "higher_is_better");
  const lowerIsBetter = direction === "lower_is_better";
  const first = lowerIsBetter ? scale.appetitePct : scale.tolerancePct;
  const second = lowerIsBetter ? scale.tolerancePct : scale.appetitePct;
  const thresholdDistance = Math.abs(scale.appetitePct - scale.tolerancePct);
  const closeThresholdClass = thresholdDistance < 12 ? " financial-threshold-chart-close" : "";
  const segments = [
    { className: lowerIsBetter ? "zone-appetite" : "zone-not-meet", width: Math.max(first, 0) },
    { className: "zone-tolerance", width: Math.max(second - first, 0) },
    { className: lowerIsBetter ? "zone-not-meet" : "zone-appetite", width: Math.max(100 - second, 0) }
  ];

  return `
    <div class="financial-threshold-chart${closeThresholdClass}" style="--actual-pct:${scale.actualPct}%;--ra-pct:${scale.appetitePct}%;--rt-pct:${scale.tolerancePct}%">
      <div class="financial-threshold-markers" aria-hidden="true">
        <span class="threshold-marker threshold-marker-rt" style="left:${scale.tolerancePct}%">RT ${escapeHtml(formatMetricValue(scale.tolerance))}</span>
        <span class="threshold-marker threshold-marker-ra" style="left:${scale.appetitePct}%">RA ${escapeHtml(formatMetricValue(scale.appetite))}</span>
      </div>
      <div class="financial-threshold-bar">
        ${segments
          .map((segment) => `<span class="${segment.className}" style="width:${segment.width}%"></span>`)
          .join("")}
      </div>
      <div class="financial-current-track">
        <span class="financial-current-value" style="width:${scale.actualPct}%"></span>
      </div>
      <div class="financial-axis">
        <span>${escapeHtml(formatMetricValue(scale.min))}</span>
        <span>${escapeHtml(formatMetricValue(scale.max))}</span>
      </div>
    </div>
  `;
}

function renderFinancialMetricRow(metric, index) {
  const status = getMetricStatusDisplay(metric);
  const unit = safeText(metric.unit, "");
  return `
    <article class="financial-metric-row">
      <div class="financial-metric-heading">
        <span class="financial-metric-icon">${getMetricIcon(metric.metric_key)}</span>
        <div>
          <h3>${index + 1}. ${escapeHtml(safeText(metric.metric_name, "Metric"))}</h3>
        </div>
      </div>
      <strong class="financial-metric-value">${formatMetricValueWithUnit(metric.actual_value, unit)}</strong>
      ${renderFinancialMetricChart(metric)}
      <div class="financial-status financial-status-${status.status}">
        <strong>${escapeHtml(status.label)}</strong>
        <span>${escapeHtml(status.labelTh)}</span>
      </div>
    </article>
  `;
}

function renderFinancialThresholdCard(item) {
  const code = normalizeKriCode(item.kri_code);
  const metrics = Array.isArray(item.metrics) ? item.metrics : [];
  if (code !== "F1" || metrics.length === 0) return "";

  const sortedMetrics = [...metrics].sort(
    (a, b) => Number(a.display_order || 999) - Number(b.display_order || 999)
  );

  return `
    <section class="kri-detail-card financial-threshold-card" aria-labelledby="financial-threshold-heading">
      <div class="financial-threshold-header">
        <h2 id="financial-threshold-heading">FINANCIAL THRESHOLD STATUS (F1)</h2>
        <p>สถานะผลดำเนินงานเทียบกับ Risk Appetite (RA) และ Risk Tolerance (RT)</p>
      </div>
      <div class="financial-metric-list">
        ${sortedMetrics.map((metric, index) => renderFinancialMetricRow(metric, index)).join("")}
      </div>
      <div class="financial-threshold-legend" aria-label="Financial threshold legend">
        <span><i class="legend-appetite"></i>อยู่ในระดับ Risk Appetite</span>
        <span><i class="legend-tolerance"></i>อยู่ในระดับ Risk Tolerance</span>
        <span><i class="legend-not-meet"></i>ไม่บรรลุระดับที่ยอมรับได้</span>
        <span><i class="legend-current"></i>ค่าปัจจุบัน</span>
      </div>
    </section>
  `;
}

function getFallbackMatrixRiskColor(impact, likelihood) {
  const score = Number(impact) * Number(likelihood);
  if (score <= 4) return "green";
  if (score <= 9) return "yellow";
  if (score <= 16) return "orange";
  return "red";
}

function findKriMatrixCell(matrix, impact, likelihood) {
  return matrix.find(
    (cell) => Number(cell.impact) === Number(impact) && Number(cell.likelihood) === Number(likelihood)
  );
}

function renderKriSummary(container, items, variant = "header") {
  if (!container) return;

  const counts = getKriPerformanceCounts(items);
  container.innerHTML = KRI_PERFORMANCE_ORDER
    .map((level) => {
      const copy = KRI_PERFORMANCE_COPY[level];
      return `
        <article class="kri-summary-card kri-performance-${level}">
          <span class="kri-summary-value">${counts[level]}</span>
          <span class="kri-summary-label">${escapeHtml(copy.label)}</span>
          ${variant === "insight" ? `<p>${escapeHtml(copy.summary)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderKriMatrix(items) {
  const matrixContainer = document.querySelector("#kri-risk-matrix");
  if (!matrixContainer) return;

  const matrix = getKriRiskMatrix();
  const likelihoodLabels = {
    5: "สูงมาก",
    4: "ค่อนข้างสูง",
    3: "ปานกลาง",
    2: "ค่อนข้างต่ำ",
    1: "น้อยมาก"
  };
  const impactLabels = {
    1: "น้อยมาก",
    2: "ค่อนข้างต่ำ",
    3: "ปานกลาง",
    4: "ค่อนข้างสูง",
    5: "สูงมาก"
  };

  const cells = [];
  cells.push('<div class="kri-matrix-corner"></div>');

  for (let impact = 1; impact <= 5; impact += 1) {
    cells.push(`<div class="kri-matrix-top-label">${impact}</div>`);
  }

  for (let likelihood = 5; likelihood >= 1; likelihood -= 1) {
    cells.push(`
      <div class="kri-matrix-row-label">
        <strong>${likelihood}</strong>
        <span>${likelihoodLabels[likelihood]}</span>
      </div>
    `);

    for (let impact = 1; impact <= 5; impact += 1) {
      const cell = findKriMatrixCell(matrix, impact, likelihood);
      const riskColor = cell?.risk_color || getFallbackMatrixRiskColor(impact, likelihood);
      const visual = getKriRiskVisualFromFields(cell?.color_hex, riskColor);
      const markers = items
        .filter((item) => Number(item.impact) === impact && Number(item.likelihood) === likelihood)
        .map((item) => {
          const level = normalizePerformanceLevel(item.performance_level);
          return `
            <span class="kri-matrix-marker kri-performance-${level}" title="${escapeHtml(safeText(item.risk_name, ""))}">
              ${escapeHtml(safeText(item.kri_code, "KRI"))}
            </span>
          `;
        })
        .join("");

      cells.push(`
        <div class="kri-matrix-cell" style="--cell-bg:${visual.background};--cell-border:${visual.border};--cell-accent:${visual.accent}">
          <div class="kri-matrix-markers">${markers}</div>
        </div>
      `);
    }
  }

  cells.push('<div class="kri-matrix-axis-spacer"><span>LIKELIHOOD</span></div>');
  for (let impact = 1; impact <= 5; impact += 1) {
    cells.push(`
      <div class="kri-matrix-bottom-label">
        <strong>${impact}</strong>
        <span>${impactLabels[impact]}</span>
      </div>
    `);
  }

  matrixContainer.innerHTML = `
    <div class="kri-matrix-grid">${cells.join("")}</div>
    <div class="kri-matrix-impact-label">IMPACT</div>
  `;
}

function hasKriMatrixPosition(item) {
  const impact = Number(item?.impact);
  const likelihood = Number(item?.likelihood);

  return (
    Number.isFinite(impact) &&
    Number.isFinite(likelihood) &&
    impact >= 1 &&
    impact <= 5 &&
    likelihood >= 1 &&
    likelihood <= 5
  );
}

function renderKriDetailMiniMatrix(item) {
  if (!hasKriMatrixPosition(item)) {
    return '<div class="kri-detail-mini-matrix-empty">ยังไม่มีตำแหน่ง Risk Matrix สำหรับ KRI นี้</div>';
  }

  const matrix = getKriRiskMatrix();
  const currentImpact = Number(item.impact);
  const currentLikelihood = Number(item.likelihood);
  const likelihoodLabels = {
    5: "สูงมาก",
    4: "ค่อนข้างสูง",
    3: "ปานกลาง",
    2: "ค่อนข้างต่ำ",
    1: "น้อยมาก"
  };
  const impactLabels = {
    1: "น้อยมาก",
    2: "ค่อนข้างต่ำ",
    3: "ปานกลาง",
    4: "ค่อนข้างสูง",
    5: "สูงมาก"
  };

  const cells = [];
  cells.push('<div class="kri-matrix-corner"></div>');

  for (let impact = 1; impact <= 5; impact += 1) {
    cells.push(`<div class="kri-matrix-top-label">${impact}</div>`);
  }

  for (let likelihood = 5; likelihood >= 1; likelihood -= 1) {
    cells.push(`
      <div class="kri-matrix-row-label">
        <strong>${likelihood}</strong>
        <span>${likelihoodLabels[likelihood]}</span>
      </div>
    `);

    for (let impact = 1; impact <= 5; impact += 1) {
      const cell = findKriMatrixCell(matrix, impact, likelihood);
      const riskColor = cell?.risk_color || getFallbackMatrixRiskColor(impact, likelihood);
      const visual = getKriRiskVisualFromFields(cell?.color_hex, riskColor);
      const marker =
        impact === currentImpact && likelihood === currentLikelihood
          ? `<span class="kri-matrix-marker kri-performance-${normalizePerformanceLevel(item.performance_level)}" title="${escapeHtml(safeText(item.risk_name, ""))}">
              ${escapeHtml(safeText(item.kri_code, "KRI"))}
            </span>`
          : "";

      cells.push(`
        <div class="kri-matrix-cell" style="--cell-bg:${visual.background};--cell-border:${visual.border};--cell-accent:${visual.accent}">
          <div class="kri-matrix-markers">${marker}</div>
        </div>
      `);
    }
  }

  cells.push('<div class="kri-matrix-axis-spacer"><span>LIKELIHOOD</span></div>');
  for (let impact = 1; impact <= 5; impact += 1) {
    cells.push(`
      <div class="kri-matrix-bottom-label">
        <strong>${impact}</strong>
        <span>${impactLabels[impact]}</span>
      </div>
    `);
  }

  return `
    <div class="kri-risk-matrix" aria-label="Current KRI risk matrix position">
      <div class="kri-matrix-grid">${cells.join("")}</div>
      <div class="kri-matrix-impact-label">IMPACT</div>
    </div>
  `;
}

function renderKriPerformanceLegend() {
  const container = document.querySelector("#kri-performance-legend-list");
  if (!container) return;

  container.innerHTML = KRI_PERFORMANCE_ORDER
    .map((level) => {
      const copy = KRI_PERFORMANCE_COPY[level];
      return `
        <div class="kri-legend-item kri-performance-${level}">
          <span class="kri-performance-icon">${kriPerformanceIcon(level)}</span>
          <div>
            <strong>${escapeHtml(copy.label)}</strong>
            <p>${escapeHtml(copy.summary)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderKriOverviewList(items) {
  const container = document.querySelector("#kri-overview-list");
  if (!container) return;

  container.innerHTML = `
    <div class="kri-overview-row kri-overview-head">
      <span>KRI Code</span>
      <span>KRI Name</span>
      <span>Risk Type</span>
      <span>Risk Level</span>
      <span>Performance Level</span>
      <span>Trend</span>
      <span>Last Update</span>
    </div>
    ${items
      .map((item) => {
        const riskMeta = getKriRiskLevelMeta(item);
        const level = normalizePerformanceLevel(item.performance_level);
        const performanceLabel = getThaiPerformanceLabel(level, item.performance_label);
        const trend = getKriTrendMeta(item.trend);
        const kriCode = safeText(item.kri_code, "KRI");
        const riskName = safeText(item.risk_name, "ไม่มีชื่อความเสี่ยง");
        return `
          <div class="kri-overview-row" role="button" tabindex="0" data-kri-code="${escapeHtml(kriCode)}" aria-label="เปิดรายละเอียด KRI ${escapeHtml(kriCode)} ${escapeHtml(riskName)}">
            <span><b class="kri-code">${escapeHtml(kriCode)}</b></span>
            <span class="kri-overview-name">${escapeHtml(riskName)}</span>
            <span>${escapeHtml(safeText(item.risk_type, "ไม่ระบุ"))}</span>
            <span>
              <b class="kri-risk-pill kri-risk-${getKriRiskKey(item)}" style="--kri-risk-color:${riskMeta.accent};--kri-risk-bg:${riskMeta.background};--kri-risk-border:${riskMeta.border}">
                ${escapeHtml(getKriRiskLevelLabel(item))}
              </b>
            </span>
            <span>
              <b class="kri-performance-pill kri-performance-${level}">
                <span class="kri-performance-icon">${kriPerformanceIcon(level)}</span>
                ${escapeHtml(performanceLabel)}
              </b>
            </span>
            <span>
              <b class="kri-trend kri-trend-${trend.className}">
                <span aria-hidden="true">${trend.icon}</span>
                ${trend.label}
              </b>
            </span>
            <span>${escapeHtml(formatKriLastUpdate(item.last_update))}</span>
          </div>
        `;
      })
      .join("")}
  `;
}

function renderKriInsights(items) {
  const container = document.querySelector("#kri-insights-summary");
  if (!container) return;

  const counts = getKriPerformanceCounts(items);
  container.innerHTML = KRI_PERFORMANCE_ORDER
    .map((level) => {
      const copy = KRI_PERFORMANCE_COPY[level];
      return `
        <article class="kri-insight-card kri-performance-${level}">
          <span class="kri-performance-icon">${kriPerformanceIcon(level)}</span>
          <div>
            <strong>${counts[level]} ตัว</strong>
            <h3>${escapeHtml(copy.label)}</h3>
            <p>${escapeHtml(copy.summary)}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderKriDashboard() {
  const items = getKriHomeOrderedItems();
  const empty = document.querySelector("#kri-dashboard-empty");
  const content = document.querySelector("#kri-dashboard-content");

  renderKriSummary(document.querySelector("#kri-dashboard-summary"), items);

  if (items.length === 0) {
    empty.hidden = false;
    content.hidden = true;
    return;
  }

  empty.hidden = true;
  content.hidden = false;
  renderKriMatrix(items);
  renderKriPerformanceLegend();
  renderKriOverviewList(items);
  renderKriInsights(items);
}

function renderKriDetail(item) {
  const content = document.querySelector("#kri-detail-content");
  const backLabel = document.querySelector("#kri-detail-back-label");
  if (!content || !item) return;

  const kriCode = safeText(item.kri_code, "KRI");
  const riskName = safeText(item.risk_name, "ไม่มีชื่อความเสี่ยง");
  const riskType = safeText(item.risk_type, "ไม่ระบุประเภทความเสี่ยง");
  const riskMeta = getKriRiskLevelMeta(item);
  const riskKey = getKriRiskKey(item);
  const riskLabel = getKriRiskLevelLabel(item);
  const performanceLevel = normalizePerformanceLevel(item.performance_level);
  const performanceLabel = getCompactPerformanceLabel(performanceLevel, item.performance_label);
  const trend = getKriTrendMeta(item.trend);
  const impact = item.impact === null || item.impact === undefined || item.impact === "" ? "ไม่ระบุ" : String(item.impact);
  const likelihood =
    item.likelihood === null || item.likelihood === undefined || item.likelihood === ""
      ? "ไม่ระบุ"
      : String(item.likelihood);
  const riskOwner = safeText(item.risk_owner, "ไม่ระบุ");
  const lastUpdate = formatKriLastUpdate(item.last_update);
  const groupedActions = getGroupedKriActions(item);
  const actionGroupOrder = ["Existing Control", "Mitigation Plan"];
  const actionGroups = Object.entries(groupedActions).sort(([a], [b]) => {
    const orderA = actionGroupOrder.includes(a) ? actionGroupOrder.indexOf(a) : 99;
    const orderB = actionGroupOrder.includes(b) ? actionGroupOrder.indexOf(b) : 99;
    return orderA - orderB || a.localeCompare(b);
  });

  if (backLabel) {
    backLabel.textContent =
      kriDetailReturnView === "kri-dashboard" ? "กลับหน้า KRI Dashboard" : "กลับหน้าหลัก";
  }

  const metricItems = [
    {
      label: "Risk Level",
      value: `<b class="kri-risk-pill kri-risk-${riskKey}" style="--kri-risk-color:${riskMeta.accent};--kri-risk-bg:${riskMeta.background};--kri-risk-border:${riskMeta.border}">${escapeHtml(riskLabel)}</b>`
    },
    { label: "Impact", value: escapeHtml(impact) },
    {
      label: "Trend",
      value: `<b class="kri-trend kri-trend-${trend.className}"><span aria-hidden="true">${trend.icon}</span>${escapeHtml(trend.label)}</b>`
    },
    { label: "Likelihood", value: escapeHtml(likelihood) },
    { label: "Last Update", value: escapeHtml(lastUpdate) },
    { label: "Risk Owner", value: escapeHtml(riskOwner) }
  ];
  const miniMatrix = renderKriDetailMiniMatrix(item);
  const updateText = safeText(item.update, "");
  const updateSection = updateText
    ? `
      <section class="kri-detail-card kri-detail-update" aria-labelledby="kri-update-heading">
        <p class="section-kicker">PROGRESS UPDATE</p>
        <h2 id="kri-update-heading">Update</h2>
        <p class="kri-formatted-text kri-update-text">${formatNumberedText(item.update, "")}</p>
      </section>
    `
    : "";
  const financialThresholdSection = renderFinancialThresholdCard(item);
  const updateAndFinancialSection = financialThresholdSection
    ? `
      <div class="kri-detail-update-financial-grid">
        ${updateSection}
        ${financialThresholdSection}
      </div>
    `
    : updateSection;

  const actionContent =
    actionGroups.length > 0
      ? actionGroups
          .map(
            ([actionType, actions]) => `
              <article class="kri-action-card">
                <h3>${escapeHtml(actionType)}</h3>
                <ul class="kri-action-list">
                  ${actions
                    .map(
                      (action) => `
                        <li class="kri-action-item">
                          <span class="kri-action-dot" aria-hidden="true"></span>
                          <p>${escapeHtml(safeText(action.action_text, "ไม่ระบุ"))}</p>
                        </li>
                      `
                    )
                    .join("")}
                </ul>
              </article>
            `
          )
          .join("")
      : '<div class="kri-detail-card kri-action-empty">ไม่มีข้อมูลมาตรการสำหรับ KRI นี้</div>';

  const executiveNote = `${kriCode} สะท้อนประเด็น "${riskName}" โดยผลการดำเนินงานปัจจุบันอยู่ในระดับ ${performanceLabel} และมีระดับความเสี่ยง ${riskLabel}.`;

  content.innerHTML = `
    <header class="kri-detail-header">
      <div class="kri-detail-copy">
        <p class="kri-detail-kicker">ENTERPRISE RISK INDICATOR</p>
        <h1 id="kri-detail-title" class="kri-detail-title">${escapeHtml(kriCode)}: ${escapeHtml(riskName)}</h1>
        <p class="kri-detail-subtitle">${escapeHtml(riskType)}</p>
      </div>
    </header>

    <div class="kri-detail-top-grid">
      <section class="kri-detail-mini-matrix-card" aria-labelledby="kri-detail-matrix-heading">
        <div class="section-heading">
          <div>
            <h2 id="kri-detail-matrix-heading">Risk Matrix Position</h2>
            <p class="section-subtitle">ตำแหน่งของ KRI นี้ใน Risk Matrix</p>
          </div>
        </div>
        <div class="kri-detail-mini-matrix">${miniMatrix}</div>
      </section>

      <div class="kri-detail-side-panel">
        <aside class="kri-detail-status-card kri-performance-${performanceLevel}" aria-label="KRI performance level">
          <span class="kri-performance-icon">${kriPerformanceIcon(performanceLevel)}</span>
          <span>Performance Level</span>
          <strong>${escapeHtml(performanceLabel)}</strong>
          <p>${escapeHtml(KRI_PERFORMANCE_COPY[performanceLevel]?.summary || "")}</p>
        </aside>
        <section class="kri-detail-metrics" aria-label="KRI context metrics">
          ${metricItems
            .map(
              (metric) => `
                <article class="kri-detail-metric">
                  <span>${escapeHtml(metric.label)}</span>
                  <strong>${metric.value}</strong>
                </article>
              `
            )
            .join("")}
        </section>
      </div>
    </div>

    <section class="kri-detail-card kri-detail-description" aria-labelledby="kri-description-heading">
      <p class="section-kicker">KRI PROFILE</p>
      <h2 id="kri-description-heading">KRI Description</h2>
      <p class="kri-formatted-text">${formatNumberedText(item.kri_description, "ไม่มีรายละเอียด KRI")}</p>
    </section>

    ${updateAndFinancialSection}

    <section class="kri-criteria-grid" aria-label="Risk criteria">
      <article class="kri-criteria-card kri-criteria-appetite">
        <span class="kri-performance-icon">${kriPerformanceIcon("appetite")}</span>
        <div>
          <p class="section-kicker">TARGET THRESHOLD</p>
          <h2>Risk Appetite</h2>
          <span>เป้าหมายที่ต้องการ</span>
          <p class="kri-formatted-text">${formatNumberedText(item.risk_appetite, "ไม่ระบุ")}</p>
        </div>
        <svg class="kri-threshold-watermark" viewBox="0 0 120 120" aria-hidden="true">
          <path d="M60 16 92 28v25c0 23.8-13.1 42.6-32 51-18.9-8.4-32-27.2-32-51V28l32-12Z"></path>
          <path d="m45 61 10.5 10.5L77 48"></path>
        </svg>
      </article>
      <article class="kri-criteria-card kri-criteria-tolerance">
        <span class="kri-performance-icon">${kriPerformanceIcon("tolerance")}</span>
        <div>
          <p class="section-kicker">ACCEPTABLE THRESHOLD</p>
          <h2>Risk Tolerance</h2>
          <span>ระดับที่ยอมรับได้</span>
          <p class="kri-formatted-text">${formatNumberedText(item.risk_tolerance, "ไม่ระบุ")}</p>
        </div>
        <svg class="kri-threshold-watermark" viewBox="0 0 120 120" aria-hidden="true">
          <path d="M60 15 94 28v25.5c0 24.5-13.8 43.8-34 52.5-20.2-8.7-34-28-34-52.5V28l34-13Z"></path>
          <path d="M60 40 77 47v13c0 12.4-6.9 22-17 27-10.1-5-17-14.6-17-27V47l17-7Z"></path>
        </svg>
      </article>
    </section>

    <section class="kri-detail-card kri-actions-section" aria-labelledby="kri-actions-heading">
      <div class="section-heading">
        <h2 id="kri-actions-heading">Controls and Mitigation</h2>
      </div>
      <div class="kri-actions-grid">${actionContent}</div>
    </section>

    <aside class="kri-executive-note">
      <p>${escapeHtml(executiveNote)}</p>
    </aside>
  `;
}

function renderKriSnapshot() {
  const list = document.querySelector("#kri-snapshot-list");
  if (!list) return;

  const items = getKriSnapshotItems();
  if (items.length === 0) {
    list.innerHTML = '<div class="loading-card">ยังไม่มีข้อมูล KRI สำหรับรอบนี้</div>';
    return;
  }

  list.innerHTML = items
    .map((item) => {
      const riskVisual = getKriRiskVisual(item);
      const performanceLevel = normalizePerformanceLevel(item.performance_level);
      const performanceLabel = safeText(
        item.performance_label,
        "อยู่ระหว่างติดตาม"
      );
      const compactPerformanceLabel = getThaiPerformanceLabel(
        performanceLevel,
        performanceLabel
      );
      const kriCode = safeText(item.kri_code, "KRI");
      const riskName = safeText(item.risk_name, "ไม่มีชื่อความเสี่ยง");
      const riskLabel = getKriRiskLevelLabel(item);

      return `
        <article class="kri-tile" role="button" tabindex="0" data-kri-code="${escapeHtml(kriCode)}" aria-label="เปิดรายละเอียด KRI ${escapeHtml(kriCode)} ${escapeHtml(riskName)}" style="--kri-risk-color:${riskVisual.accent};--kri-risk-bg:${riskVisual.background};--kri-risk-border:${riskVisual.border};--kri-risk-accent:${riskVisual.marker}">
          <div class="kri-tile-top">
            <span class="kri-code">${escapeHtml(kriCode)}</span>
            <span class="kri-risk-indicator" aria-label="Risk level ${escapeHtml(riskLabel)}">
              <span class="kri-risk-label">${escapeHtml(riskLabel)}</span>
              <span class="kri-risk-dot" aria-hidden="true"></span>
            </span>
          </div>
          <h3 class="kri-name">${escapeHtml(riskName)}</h3>
          <div class="kri-performance kri-performance-${performanceLevel}">
            <span class="kri-performance-icon">${kriPerformanceIcon(performanceLevel)}</span>
            <span>${escapeHtml(compactPerformanceLabel)}</span>
          </div>
        </article>
      `;
    })
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
  renderKriSnapshot();
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
    renderKriSnapshot();
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

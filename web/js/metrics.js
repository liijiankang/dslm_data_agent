(function () {
const { paginationButtons, qs, qsa } = window.UI;

const PAGE_SIZE = 4;
const state = {
  keyword: "",
  domain: "all",
  status: "all",
  page: 1,
};

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function filteredSystems() {
  const keyword = state.keyword.trim().toLowerCase();
  return qsa("[data-metric-system-card]").filter((card) => {
    const text = `${card.dataset.systemKeywords || ""} ${card.textContent || ""}`.toLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesDomain = state.domain === "all" || card.dataset.systemDomain === state.domain;
    const matchesStatus = state.status === "all" || card.dataset.systemStatus === state.status;
    return matchesKeyword && matchesDomain && matchesStatus;
  });
}

function bindMetricHotTooltip() {
  const chart = qs(".metric-hot-line-chart");
  const tooltip = qs("#metricHotTooltip");
  const points = qsa("[data-hot-point]");
  if (!chart || !tooltip || points.length === 0) return;

  const positionTooltip = (clientX, clientY) => {
    const rect = chart.getBoundingClientRect();
    const offset = 14;
    const maxX = Math.max(8, rect.width - tooltip.offsetWidth - 8);
    const maxY = Math.max(8, rect.height - tooltip.offsetHeight - 8);
    const x = Math.min(Math.max(8, clientX - rect.left + offset), maxX);
    const y = Math.min(Math.max(8, clientY - rect.top + offset), maxY);
    tooltip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };

  const showTooltip = (point, clientX, clientY) => {
    tooltip.innerHTML = `
      <strong>${escapeHtml(point.dataset.hotName)}</strong>
      <span>调用次数：${escapeHtml(point.dataset.hotValue)} 次</span>
      <span>业务主题：${escapeHtml(point.dataset.hotDomain)}</span>
      <span>场景标签：${escapeHtml(point.dataset.hotSet)}</span>
      <span>负责人：${escapeHtml(point.dataset.hotOwner)}</span>
    `;
    tooltip.hidden = false;
    positionTooltip(clientX, clientY);
  };

  const hideTooltip = () => {
    tooltip.hidden = true;
  };

  points.forEach((point) => {
    point.addEventListener("mouseenter", (event) => {
      showTooltip(point, event.clientX, event.clientY);
    });
    point.addEventListener("mousemove", (event) => {
      positionTooltip(event.clientX, event.clientY);
    });
    point.addEventListener("mouseleave", hideTooltip);
    point.addEventListener("focus", () => {
      const rect = point.getBoundingClientRect();
      showTooltip(point, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    point.addEventListener("blur", hideTooltip);
  });
}

function renderMetricSystems() {
  const rows = filteredSystems();
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * PAGE_SIZE;
  const pagedRows = rows.slice(start, start + PAGE_SIZE);

  qsa("[data-metric-system-card]").forEach((card) => {
    card.hidden = !pagedRows.includes(card);
  });

  const empty = qs("#metricSystemEmptyState");
  if (empty) empty.hidden = rows.length > 0;

  const from = rows.length === 0 ? 0 : start + 1;
  const to = start + pagedRows.length;
  const summary = `每页 ${PAGE_SIZE} 个，共 ${rows.length} 个，当前 ${from}-${to}`;
  const headSummary = qs("#metricSystemListSummary");
  const paginationSummary = qs("#metricSystemPaginationSummary");
  if (headSummary) headSummary.textContent = summary;
  if (paginationSummary) paginationSummary.textContent = summary;

  const controls = qs("#metricSystemPaginationControls");
  if (!controls) return;
  controls.innerHTML = rows.length
    ? `
      <button class="page-button" data-metric-system-page="prev" type="button" ${state.page === 1 ? "disabled" : ""}>上一页</button>
      ${paginationButtons(state.page, totalPages, "data-metric-system-page")}
      <button class="page-button" data-metric-system-page="next" type="button" ${state.page === totalPages ? "disabled" : ""}>下一页</button>
    `
    : "";
  qsa("[data-metric-system-page]", controls).forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.metricSystemPage;
      if (target === "prev") state.page = Math.max(1, state.page - 1);
      else if (target === "next") state.page = Math.min(totalPages, state.page + 1);
      else state.page = Number(target);
      renderMetricSystems();
    });
  });
}

function bindMetricSystemFilters() {
  const search = qs("#metricSystemSearch");
  const domain = qs("#metricSystemDomainFilter");
  const status = qs("#metricSystemStatusFilter");
  const reset = qs("#resetMetricSystemFilters");
  const apply = () => {
    state.keyword = search?.value || "";
    state.domain = domain?.value || "all";
    state.status = status?.value || "all";
    state.page = 1;
    renderMetricSystems();
  };

  search?.addEventListener("input", apply);
  domain?.addEventListener("change", apply);
  status?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (domain) domain.value = "all";
    if (status) status.value = "all";
    apply();
  });
}

function bindMetricSystemCards() {
  qsa("[data-metric-system-card]").forEach((card) => {
    const openDetail = () => {
      const systemId = card.dataset.systemId || "order";
      window.location.href = `metric-system-detail.html?theme=${encodeURIComponent(systemId)}`;
    };
    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, select, textarea, label")) return;
      openDetail();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDetail();
    });
  });
}

bindMetricHotTooltip();
bindMetricSystemFilters();
bindMetricSystemCards();
renderMetricSystems();
})();

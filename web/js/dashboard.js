(function () {
const { dashboardStats, dataSources, sourceTypeStats } = window.MockData;
const { bindRowNavigation, paginationButtons, qs, statusPill } = window.UI;
const pageSize = 10;
const state = {
  page: 1,
  keyword: "",
  category: "all",
  connector: "all",
  status: "all",
};

function toneColor(tone) {
  return {
    green: "var(--green)",
    blue: "var(--primary)",
    amber: "var(--amber)",
    red: "var(--red)",
    violet: "var(--violet)",
  }[tone] || "var(--primary)";
}

function renderMetrics() {
  const node = qs("#dashboardMetrics");
  if (!node) return;
  node.innerHTML = `
    <div class="metric"><div class="metric-label">数据源</div><div class="metric-value">${dashboardStats.sources}</div></div>
    <div class="metric"><div class="metric-label">资产总数</div><div class="metric-value">${dashboardStats.assets}</div></div>
    <div class="metric"><div class="metric-label">可构建资产</div><div class="metric-value">${dashboardStats.buildableAssets}</div></div>
    <div class="metric"><div class="metric-label">已构建资产</div><div class="metric-value">${dashboardStats.builtAssets}</div></div>
    <div class="metric"><div class="metric-label">待重建资产</div><div class="metric-value">${dashboardStats.staleAssets}</div></div>
  `;
}

function renderBars() {
  const node = qs("#sourceTypeBars");
  if (!node) return;
  node.innerHTML = sourceTypeStats
    .map((item) => {
      const width = Math.max(4, Math.round((item.value / item.total) * 100));
      return `
        <div class="chart-row">
          <div class="chart-label">${item.label}</div>
          <div class="chart-track"><span class="chart-fill" style="width:${width}%;background:${toneColor(item.tone)}"></span></div>
          <strong>${item.value}%</strong>
        </div>
      `;
    })
    .join("");
}

function renderLegend() {
  const node = qs("#sourceDonutLegend");
  if (!node) return;
  node.innerHTML = `
    <div class="legend-item"><span class="legend-dot" style="background:var(--green)"></span><span>可用</span><strong>12</strong></div>
    <div class="legend-item"><span class="legend-dot" style="background:var(--amber)"></span><span>待处理变更</span><strong>4</strong></div>
    <div class="legend-item"><span class="legend-dot" style="background:var(--red)"></span><span>异常</span><strong>1</strong></div>
    <div class="legend-item"><span class="legend-dot" style="background:var(--primary)"></span><span>盘点中</span><strong>1</strong></div>
  `;
}

function uniqueValues(key) {
  return Array.from(new Set(dataSources.map((source) => source[key]))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function fillFilterOptions() {
  const configs = [
    ["#categoryFilter", uniqueValues("category"), "全部分类"],
    ["#connectorFilter", uniqueValues("connector"), "全部类型"],
    ["#statusFilter", uniqueValues("status"), "全部状态"],
  ];
  configs.forEach(([selector, values, label]) => {
    const select = qs(selector);
    if (!select) return;
    select.innerHTML = [`<option value="all">${label}</option>`, ...values.map((value) => `<option value="${value}">${value}</option>`)].join("");
  });
}

function filteredSources() {
  const keyword = state.keyword.trim().toLowerCase();
  return dataSources.filter((source) => {
    const text = [source.name, source.category, source.connector, source.owner, source.status, source.maintenanceScope, source.changeState]
      .join(" ")
      .toLowerCase();
    return (
      (!keyword || text.includes(keyword)) &&
      (state.category === "all" || source.category === state.category) &&
      (state.connector === "all" || source.connector === state.connector) &&
      (state.status === "all" || source.status === state.status)
    );
  });
}

function renderDataSources() {
  const body = qs("#dataSourceRows");
  if (!body) return;
  const rows = filteredSources();
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * pageSize;
  const pagedRows = rows.slice(start, start + pageSize);
  body.innerHTML = pagedRows.length
    ? pagedRows
    .map(
      (source) => `
        <tr data-href="${source.href}">
          <td><a href="${source.href}"><strong>${source.name}</strong></a></td>
          <td>${source.category}</td>
          <td>${source.connector}</td>
          <td>${source.owner}</td>
          <td>${statusPill(source.status, source.statusTone)}</td>
          <td>${statusPill(source.maintenanceScope || "未构建", source.maintenanceTone || "amber")}</td>
          <td>${source.assets}</td>
          <td>${source.buildable}</td>
          <td>${source.built}</td>
          <td>${source.stale}</td>
          <td>${source.lastInventory}</td>
          <td>${source.changeState}</td>
        </tr>
      `,
    )
    .join("")
    : `<tr><td colspan="12" class="empty-state">没有符合条件的数据源</td></tr>`;
  renderPagination(rows.length, totalPages, start, pagedRows.length);
  bindRowNavigation();
}

function renderPagination(total, totalPages, start, currentCount) {
  const summary = qs("#sourceListSummary");
  const controls = qs("#paginationControls");
  if (summary) {
    const from = total === 0 ? 0 : start + 1;
    const to = start + currentCount;
    summary.textContent = `每页 ${pageSize} 条，共 ${total} 条，当前 ${from}-${to}`;
  }
  if (!controls) return;
  controls.innerHTML = `
    <button class="page-button" data-page="prev" type="button" ${state.page === 1 ? "disabled" : ""}>上一页</button>
    ${paginationButtons(state.page, totalPages, "data-page")}
    <button class="page-button" data-page="next" type="button" ${state.page === totalPages ? "disabled" : ""}>下一页</button>
    <span class="pagination-jump">
      跳至
      <input class="pagination-input" data-page-jump-input type="number" min="1" max="${totalPages}" value="${state.page}" aria-label="跳转页码">
      页
      <button class="page-button" data-page-jump type="button" ${totalPages <= 1 ? "disabled" : ""}>确定</button>
    </span>
  `;
  const jumpInput = controls.querySelector("[data-page-jump-input]");
  const jumpToPage = () => {
    const page = Number.parseInt(jumpInput?.value || "", 10);
    if (!Number.isFinite(page)) {
      if (jumpInput) jumpInput.value = state.page;
      return;
    }
    state.page = Math.min(totalPages, Math.max(1, page));
    renderDataSources();
  };
  controls.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.page;
      if (target === "prev") state.page = Math.max(1, state.page - 1);
      else if (target === "next") state.page = Math.min(totalPages, state.page + 1);
      else state.page = Number(target);
      renderDataSources();
    });
  });
  controls.querySelector("[data-page-jump]")?.addEventListener("click", jumpToPage);
  jumpInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToPage();
  });
}

function bindFilters() {
  const search = qs("#sourceSearch");
  const category = qs("#categoryFilter");
  const connector = qs("#connectorFilter");
  const status = qs("#statusFilter");
  const reset = qs("#resetSourceFilters");
  const apply = () => {
    state.keyword = search?.value || "";
    state.category = category?.value || "all";
    state.connector = connector?.value || "all";
    state.status = status?.value || "all";
    state.page = 1;
    renderDataSources();
  };
  search?.addEventListener("input", apply);
  category?.addEventListener("change", apply);
  connector?.addEventListener("change", apply);
  status?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (category) category.value = "all";
    if (connector) connector.value = "all";
    if (status) status.value = "all";
    apply();
  });
}

renderMetrics();
renderBars();
renderLegend();
fillFilterOptions();
renderDataSources();
bindFilters();
})();

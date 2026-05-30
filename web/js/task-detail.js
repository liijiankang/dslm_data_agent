(function () {
const { buildTaskDetails, buildTasks, createdBuildTask } = window.DataAssetsApi.getBuildTaskData();
const { bindModalTriggers, escapeHtml, paginationButtons, qs, statusPill, taskRuntimeAction } = window.UI;
const params = new URLSearchParams(window.location.search);
const fallbackTask = createdBuildTask || buildTasks[0];
const taskId = params.get("id") || fallbackTask.id;
const listTask = [createdBuildTask, ...buildTasks].filter(Boolean).find((item) => item.id === taskId) || fallbackTask;
const detail = buildTaskDetails[taskId] || buildTaskDetails[listTask.id] || buildTaskDetails["build-001"];
const assetState = {
  keyword: "",
  page: 1,
  pageSize: 5,
  stage: "all",
  status: "all",
  type: "all",
};

function toneByStageStatus(status) {
  return {
    已完成: "green",
    运行中: "blue",
    未开始: "amber",
    已停止: "amber",
    失败: "red",
  }[status] || "blue";
}

function renderHeader() {
  document.title = `${listTask.name} · 构建任务详情`;
  qs("#taskTitle").textContent = listTask.name;
  qs("#taskMeta").innerHTML = `
    ${statusPill(listTask.status, listTask.tone)}
    ${statusPill(listTask.scope, listTask.scopeTone)}
    <span class="tag">${escapeHtml(detail.parseStrategy)}</span>
    <span class="tag">${escapeHtml(listTask.source)}</span>
    <span class="tag">创建：${escapeHtml(listTask.createdAt)}</span>
  `;
  renderTaskActions();
}

function renderTaskActions() {
  const node = qs("#taskActions");
  if (!node) return;
  const action = taskRuntimeAction(listTask.status);
  const actionLabel = action?.label.includes("资产") ? action.label : `${action?.label || ""}任务`;
  node.innerHTML = `
    <a class="button" href="local-upload-detail.html#tasks">返回任务列表</a>
    ${action ? `<button class="button ${action.tone || ""}" data-task-runtime-action type="button">${actionLabel}</button>` : ""}
  `;
  qs("[data-task-runtime-action]")?.addEventListener("click", () => openTaskRuntimeModal());
}

function openTaskRuntimeModal() {
  const action = taskRuntimeAction(listTask.status);
  if (!action) return;
  const failedAssets = detail.metrics.failedAssets || 0;
  const runningAssets = detail.metrics.runningAssets || 0;
  const completedAssets = detail.metrics.completedAssets || 0;
  const pendingAssets = Math.max(0, detail.metrics.totalAssets - completedAssets - runningAssets - failedAssets);
  const confirm = qs("#confirmTaskRuntimeAction");
  qs("#taskRuntimeTitle").textContent = `${action.title} · ${listTask.name}`;
  qs("#taskRuntimeSummary").textContent = action.summary;
  qs("#taskRuntimeImpact").innerHTML = `
    <li><span>当前状态</span><strong>${escapeHtml(listTask.status)}</strong></li>
    <li><span>构建范围</span><strong>${escapeHtml(listTask.scope)}</strong></li>
    <li><span>已完成资产</span><strong>${completedAssets}</strong></li>
    <li><span>运行中资产</span><strong>${runningAssets}</strong></li>
    <li><span>待处理资产</span><strong>${pendingAssets}</strong></li>
    <li><span>失败资产</span><strong>${failedAssets}</strong></li>
  `;
  qs("#taskRuntimeHint").textContent = "该操作会写入操作记录；页面当前为交互原型，点击确认后只模拟提交结果。";
  if (confirm) {
    confirm.textContent = action.submitLabel;
    confirm.className = `button ${action.tone || "primary"}`;
    confirm.dataset.runtimeResult = action.result;
    confirm.disabled = false;
  }
  qs("#taskRuntimeModal")?.classList.add("open");
}

function bindTaskRuntimeConfirm() {
  qs("#confirmTaskRuntimeAction")?.addEventListener("click", (event) => {
    qs("#taskRuntimeHint").textContent = event.currentTarget.dataset.runtimeResult || "已模拟提交：任务操作请求已发送。";
    event.currentTarget.disabled = true;
  });
}

function renderMetrics() {
  const node = qs("#taskMetricGrid");
  if (!node) return;
  const metrics = [
    ["资产总数", detail.metrics.totalAssets],
    ["已完成", detail.metrics.completedAssets],
    ["运行中", detail.metrics.runningAssets],
    ["失败", detail.metrics.failedAssets],
    ["切片数", detail.metrics.chunks],
    ["向量数", detail.metrics.vectors],
  ];
  node.innerHTML = metrics
    .map(([label, value]) => `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div></div>`)
    .join("");
}

function stageProgress(stage) {
  const total = Math.max(1, stage.done + stage.running + stage.pending + stage.failed);
  return Math.round(((stage.done + stage.failed) / total) * 100);
}

function renderStages() {
  const rail = qs("#taskStageRail");
  if (!rail) return;
  rail.innerHTML = detail.stages
    .map(
      (stage) => `
        <div class="task-stage ${stage.statusClass}">
          <div class="pipeline-marker-row">
            <div class="pipeline-circle">${stage.order}</div>
            ${stage.order < detail.stages.length ? '<div class="pipeline-arrow" aria-hidden="true"></div>' : ""}
          </div>
          <div class="pipeline-content">
            <div class="task-stage-title">
              <span>${stage.title}</span>
              ${statusPill(stage.status, toneByStageStatus(stage.status))}
            </div>
            <div class="stage-progress"><span style="width:${stageProgress(stage)}%"></span></div>
            <div class="stage-counts">
              <span>完成 <strong>${stage.done}</strong></span>
              <span>运行 <strong>${stage.running}</strong></span>
              <span>未开始 <strong>${stage.pending}</strong></span>
              <span>失败 <strong>${stage.failed}</strong></span>
            </div>
          </div>
        </div>
      `,
    )
    .join("");
}

function uniqueValues(rows, key) {
  return Array.from(new Set(rows.map((row) => row[key]))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function fillFilter(selector, values, label) {
  const select = qs(selector);
  if (!select) return;
  select.innerHTML = [`<option value="all">${escapeHtml(label)}</option>`, ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)].join("");
}

function filteredAssets() {
  const keyword = assetState.keyword.trim().toLowerCase();
  return detail.assets.filter((asset) => {
    const text = [asset.name, asset.type, asset.status, asset.stage].join(" ").toLowerCase();
    return (
      (!keyword || text.includes(keyword)) &&
      (assetState.type === "all" || asset.type === assetState.type) &&
      (assetState.status === "all" || asset.status === assetState.status) &&
      (assetState.stage === "all" || asset.stage === assetState.stage)
    );
  });
}

function progressCell(asset) {
  return `
    <div class="inline-progress">
      <span><i style="width:${asset.progress}%"></i></span>
      <strong>${asset.progress}%</strong>
    </div>
  `;
}

function renderAssetPagination(total, totalPages, start, currentCount) {
  const summary = qs("#taskAssetListSummary");
  const controls = qs("#taskAssetPaginationControls");
  if (summary) {
    const from = total === 0 ? 0 : start + 1;
    const to = start + currentCount;
    summary.textContent = `每页 ${assetState.pageSize} 条，共 ${total} 条，当前 ${from}-${to}`;
  }
  if (!controls) return;
  controls.innerHTML = `
    <button class="page-button" data-task-asset-page="prev" type="button" ${assetState.page === 1 ? "disabled" : ""}>上一页</button>
    ${paginationButtons(assetState.page, totalPages, "data-task-asset-page")}
    <button class="page-button" data-task-asset-page="next" type="button" ${assetState.page === totalPages ? "disabled" : ""}>下一页</button>
    <span class="pagination-jump">
      跳至
      <input class="pagination-input" data-task-asset-page-jump-input type="number" min="1" max="${totalPages}" value="${assetState.page}" aria-label="跳转页码">
      页
      <button class="page-button" data-task-asset-page-jump type="button" ${totalPages <= 1 ? "disabled" : ""}>确定</button>
    </span>
  `;
  const jumpInput = controls.querySelector("[data-task-asset-page-jump-input]");
  const jumpToPage = () => {
    const page = Number.parseInt(jumpInput?.value || "", 10);
    if (!Number.isFinite(page)) {
      if (jumpInput) jumpInput.value = assetState.page;
      return;
    }
    assetState.page = Math.min(totalPages, Math.max(1, page));
    renderAssets();
  };
  controls.querySelectorAll("[data-task-asset-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.taskAssetPage;
      if (target === "prev") assetState.page = Math.max(1, assetState.page - 1);
      else if (target === "next") assetState.page = Math.min(totalPages, assetState.page + 1);
      else assetState.page = Number(target);
      renderAssets();
    });
  });
  controls.querySelector("[data-task-asset-page-jump]")?.addEventListener("click", jumpToPage);
  jumpInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToPage();
  });
}

function renderAssets() {
  const body = qs("#taskAssetRows");
  if (!body) return;
  const rows = filteredAssets();
  const totalPages = Math.max(1, Math.ceil(rows.length / assetState.pageSize));
  if (assetState.page > totalPages) assetState.page = totalPages;
  const start = (assetState.page - 1) * assetState.pageSize;
  const pagedRows = rows.slice(start, start + assetState.pageSize);
  body.innerHTML = pagedRows.length
    ? pagedRows
      .map(
        (asset) => `
          <tr>
            <td><strong>${escapeHtml(asset.name)}</strong></td>
            <td>${escapeHtml(asset.type)}</td>
            <td>${statusPill(asset.status, asset.tone)}</td>
            <td>${escapeHtml(asset.stage)}</td>
            <td>${progressCell(asset)}</td>
            <td>${escapeHtml(asset.chunks)}</td>
            <td>${escapeHtml(asset.vectors)}</td>
            <td>${escapeHtml(asset.duration)}</td>
            <td>${escapeHtml(asset.updatedAt)}</td>
            <td><a class="button small" href="asset-detail.html?id=${escapeHtml(asset.assetId)}">资产详情</a></td>
          </tr>
        `,
      )
      .join("")
    : `<tr><td colspan="10" class="empty-state">没有符合条件的解析资产</td></tr>`;
  renderAssetPagination(rows.length, totalPages, start, pagedRows.length);
}

function bindFilters() {
  const search = qs("#taskAssetSearch");
  const type = qs("#taskAssetTypeFilter");
  const status = qs("#taskAssetStatusFilter");
  const stage = qs("#taskAssetStageFilter");
  const reset = qs("#resetTaskAssetFilters");
  const apply = () => {
    assetState.keyword = search?.value || "";
    assetState.type = type?.value || "all";
    assetState.status = status?.value || "all";
    assetState.stage = stage?.value || "all";
    assetState.page = 1;
    renderAssets();
  };
  search?.addEventListener("input", apply);
  type?.addEventListener("change", apply);
  status?.addEventListener("change", apply);
  stage?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (type) type.value = "all";
    if (status) status.value = "all";
    if (stage) stage.value = "all";
    apply();
  });
}

renderHeader();
renderMetrics();
renderStages();
fillFilter("#taskAssetTypeFilter", uniqueValues(detail.assets, "type"), "全部类型");
fillFilter("#taskAssetStatusFilter", uniqueValues(detail.assets, "status"), "全部状态");
fillFilter("#taskAssetStageFilter", uniqueValues(detail.assets, "stage"), "全部阶段");
renderAssets();
bindFilters();
bindModalTriggers();
bindTaskRuntimeConfirm();
})();

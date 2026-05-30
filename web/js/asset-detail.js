(function () {
const { assets, assetDetails = {}, auditEvents, databaseAssets = [], dataSources = [] } = window.DataAssetsApi.getAssetDetailData();
const { bindModalTriggers, escapeHtml, paginationButtons, qs, statusPill } = window.UI;
const params = new URLSearchParams(window.location.search);
const allAssets = [...assets, ...databaseAssets];
const asset = allAssets.find((item) => item.id === params.get("id")) || assets[0];
const detail = assetDetails[asset.id] || createDefaultDetail(asset);
const listState = {
  chunks: { keyword: "", page: 1, pageSize: 5, type: "all" },
  vectors: { keyword: "", page: 1, pageSize: 5, type: "all" },
};

function isDatabaseAsset(item = asset) {
  return databaseAssets.some((databaseAsset) => databaseAsset.id === item.id);
}

function hasBuildArtifacts(item = asset) {
  return (item.chunks || 0) > 0 || (item.vectors || 0) > 0 || ["已构建", "已是最新", "待重建"].includes(item.buildStatus);
}

function sourceForAsset(item = asset) {
  return dataSources.find((source) => source.id === item.sourceId);
}

function createDefaultDetail(item) {
  if (isDatabaseAsset(item)) return createDatabaseDetail(item);
  const safePath = (item.relativePath || item.name).replace(/\s+/g, "-").toLowerCase();
  return {
    assetId: item.id,
    sourceType: "文件系统",
    connectorType: "本地上传",
    minioObjectPath: `minio://dslm-data/raw/source-local-upload-sales/2026/05/27/${safePath}`,
    parsedMarkdownPath: `minio://dslm-data/parsed/source-local-upload-sales/${item.id}/knowledge/latest/document.md`,
    contentListPath: `minio://dslm-data/parsed/source-local-upload-sales/${item.id}/knowledge/latest/content_list.json`,
    contentStructure: [
      { label: "正文", count: item.chunks || 0 },
      { label: "标题", count: Math.min(8, item.chunks || 0) },
      { label: "表格", count: item.type === "Excel" ? 6 : 1 },
      { label: "图片", count: item.type === "Image" || item.type === "PPT" ? 4 : 0 },
      { label: "公式", count: 0 },
      { label: "列表", count: 2 },
    ],
    vectorSummaries: [
      { sliceType: "正文", collection: "sales_docs_body_vectors", model: "bge-m3-enterprise", dimension: 1024 },
      { sliceType: "摘要", collection: "sales_docs_summary_vectors", model: "bge-m3-enterprise", dimension: 1024 },
    ],
    vectors: Array.from({ length: Math.max(1, item.vectors || 4) }, (_, index) => ({
      id: `vec-${item.id}-${String(index + 1).padStart(3, "0")}`,
      sliceType: index % 5 === 0 ? "摘要" : "正文",
      collection: index % 5 === 0 ? "sales_docs_summary_vectors" : "sales_docs_body_vectors",
      model: "bge-m3-enterprise",
      dimension: 1024,
      chunkId: `chunk-${item.id}-${String(index + 1).padStart(3, "0")}`,
      page: index + 1,
      preview: `${item.name} 的向量内容预览 ${index + 1}，由后端返回。`,
    })),
    chunks: Array.from({ length: Math.max(1, item.chunks || 4) }, (_, index) => ({
      id: `chunk-${item.id}-${String(index + 1).padStart(3, "0")}`,
      sliceType: index % 5 === 0 ? "摘要" : "正文",
      titlePath: `${item.name} / 内容段落 ${index + 1}`,
      page: index + 1,
      tokens: 220 + index * 17,
      status: item.vectors ? "已向量化" : "待构建",
      preview: `${item.name} 的切片内容预览 ${index + 1}。`,
    })),
  };
}

function createDatabaseDetail(item) {
  const source = sourceForAsset(item);
  const basePath = `minio://dslm-data/parsed/${item.sourceId}/${item.id}/knowledge/latest`;
  const built = hasBuildArtifacts(item);
  const columns = databaseColumnsFor(item);
  return {
    assetId: item.id,
    sourceType: "数据库",
    connectorType: source?.connector || "关系数据库",
    parsedMarkdownPath: built ? `${basePath}/schema.md` : "",
    contentListPath: built ? `${basePath}/schema_profile.json` : "",
    structureFingerprint: `sha256: ${String(item.id).slice(-10)}...${String(item.fieldCount || 0).padStart(4, "0")}`,
    columns,
    indexes: [
      { name: item.primaryKey ? `pk_${item.name}` : `idx_${item.name}_lookup`, columns: item.primaryKey || columns[0]?.name || "-", unique: Boolean(item.primaryKey), type: "btree" },
      { name: `idx_${item.name}_updated_at`, columns: "updated_at", unique: false, type: "btree" },
    ],
    relations: Array.from({ length: Math.max(1, item.relationCount || 0) }, (_, index) => ({
      type: index % 2 === 0 ? "引用" : "被引用",
      sourceColumn: item.primaryKey || columns[0]?.name || "-",
      targetObject: index % 2 === 0 ? "crm_customer" : "crm_opportunity",
      targetColumn: index % 2 === 0 ? "customer_id" : "opportunity_id",
    })),
    contentStructure: [
      { label: "字段", count: item.fieldCount || 0 },
      { label: "主键", count: item.primaryKey ? item.primaryKey.split(",").length : 0 },
      { label: "关联关系", count: item.relationCount || 0 },
      { label: "索引", count: Math.max(1, Math.round((item.fieldCount || 0) / 8)) },
      { label: "约束", count: Math.max(1, Math.round((item.relationCount || 0) / 2)) },
      { label: "注释覆盖", count: item.comment ? 1 : 0 },
    ],
    vectorSummaries: built ? [
      { sliceType: "正文", collection: "db_schema_body_vectors", model: "bge-m3-enterprise", dimension: 1024 },
      { sliceType: "摘要", collection: "db_schema_summary_vectors", model: "bge-m3-enterprise", dimension: 1024 },
    ] : [],
    vectors: built ? Array.from({ length: Math.max(1, item.vectors || 4) }, (_, index) => ({
      id: `vec-${item.id}-${String(index + 1).padStart(3, "0")}`,
      sliceType: index % 5 === 0 ? "摘要" : "正文",
      collection: index % 5 === 0 ? "db_schema_summary_vectors" : "db_schema_body_vectors",
      model: "bge-m3-enterprise",
      dimension: 1024,
      chunkId: `chunk-${item.id}-${String(index + 1).padStart(3, "0")}`,
      page: 0,
      preview: `${item.name} 的库表结构向量预览 ${index + 1}，包含字段、主键、关系和业务说明。`,
    })) : [],
    chunks: built ? Array.from({ length: Math.max(1, item.chunks || 4) }, (_, index) => ({
      id: `chunk-${item.id}-${String(index + 1).padStart(3, "0")}`,
      sliceType: index % 5 === 0 ? "摘要" : "正文",
      titlePath: `${item.name} / ${index % 5 === 0 ? "对象摘要" : "字段与关系说明"} ${index + 1}`,
      page: 0,
      tokens: 180 + index * 21,
      status: item.vectors ? "已向量化" : "待构建",
      preview: `${item.name} 的结构切片预览 ${index + 1}。对象类型：${item.type}；字段数：${item.fieldCount}；主键：${item.primaryKey || "无"}；说明：${item.comment}`,
    })) : [],
  };
}

function databaseColumnsFor(item) {
  const pk = item.primaryKey?.split(",")[0]?.trim();
  const baseColumns = [
    { name: pk || `${item.name.replace(/^(crm_|dim_|vw_|mv_)/, "")}_id`, type: "bigint", primaryKey: Boolean(pk), nullable: false, defaultValue: "", comment: pk ? "主键字段" : "业务标识", changeStatus: "无变更" },
    { name: "name", type: "varchar(256)", primaryKey: false, nullable: false, defaultValue: "", comment: "名称或标题", changeStatus: "无变更" },
    { name: "status", type: "varchar(64)", primaryKey: false, nullable: true, defaultValue: "'active'", comment: "业务状态", changeStatus: item.changeStatus === "字段变更" ? "类型变化" : "无变更" },
    { name: "owner_id", type: "bigint", primaryKey: false, nullable: true, defaultValue: "", comment: "负责人或归属组织", changeStatus: "无变更" },
    { name: "created_at", type: "timestamp", primaryKey: false, nullable: false, defaultValue: "now()", comment: "创建时间", changeStatus: "无变更" },
    { name: "updated_at", type: "timestamp", primaryKey: false, nullable: false, defaultValue: "now()", comment: "更新时间", changeStatus: item.changeStatus === "新增字段" ? "新增字段" : "无变更" },
  ];
  return baseColumns.slice(0, Math.min(baseColumns.length, Math.max(4, item.fieldCount || 4)));
}

function pathValue(value) {
  return `<code class="path-value">${escapeHtml(value)}</code>`;
}

function renderAsset() {
  const source = sourceForAsset();
  const database = isDatabaseAsset();
  const built = hasBuildArtifacts();
  const buildLink = document.querySelector(".header-actions a[href^='build-task']");
  const deleteButton = document.querySelector("[data-open-modal='deleteAssetModal']");
  const sourceCrumb = document.querySelector(".breadcrumb a[href^='local-upload-detail']");
  const assetKindCrumb = document.querySelector(".breadcrumb span:last-child");
  const parseInfoCard = qs("#parseInfoCard");
  const vectorSection = qs("#vectorSection");
  const chunkSection = qs("#chunkSection");
  const structureTitle = qs("#assetStructureTitle");
  if (buildLink) buildLink.href = `build-task.html?sourceId=${asset.sourceId || source?.id || "source-local-upload-sales"}`;
  if (sourceCrumb && source) {
    sourceCrumb.href = `local-upload-detail.html?sourceId=${source.id}`;
    sourceCrumb.textContent = source.name;
  }
  if (assetKindCrumb) assetKindCrumb.textContent = database ? "数据库资产" : "文件资产";
  if (deleteButton) deleteButton.hidden = database;
  if (structureTitle) structureTitle.textContent = database ? "字段结构" : "资产结构";
  if (database) {
    if (parseInfoCard) parseInfoCard.hidden = !built;
    if (vectorSection) vectorSection.hidden = !built;
    if (chunkSection) chunkSection.hidden = !built;
  } else {
    if (parseInfoCard) parseInfoCard.hidden = false;
    if (vectorSection) vectorSection.hidden = false;
    if (chunkSection) chunkSection.hidden = false;
  }
  document.title = `${asset.name} · ${database ? "数据库资产详情" : "文件资产详情"}`;
  qs("#assetTitle").textContent = asset.name;
  qs("#assetStatus").innerHTML = `${statusPill(asset.buildability, asset.buildabilityTone)} ${statusPill(asset.buildStatus, asset.buildTone)}`;
  qs("#assetInfo").innerHTML = database
    ? `
      <div class="config-row"><div class="config-label">数据源类型</div><div>${escapeHtml(detail.sourceType)}</div></div>
      <div class="config-row"><div class="config-label">接入方式</div><div>${escapeHtml(detail.connectorType)}</div></div>
      <div class="config-row"><div class="config-label">所属数据源</div><div>${escapeHtml(source?.name || "-")}</div></div>
      <div class="config-row"><div class="config-label">数据库 / Schema</div><div>${escapeHtml(asset.database)} / ${escapeHtml(asset.schema)}</div></div>
      <div class="config-row"><div class="config-label">对象名称</div><div>${escapeHtml(asset.name)}</div></div>
      <div class="config-row"><div class="config-label">对象类型</div><div>${escapeHtml(asset.type)}</div></div>
      <div class="config-row"><div class="config-label">业务说明</div><div>${escapeHtml(asset.comment)}</div></div>
      <div class="config-row"><div class="config-label">字段数</div><div>${escapeHtml(asset.fieldCount)}</div></div>
      <div class="config-row"><div class="config-label">主键</div><div>${escapeHtml(asset.primaryKey || "-")}</div></div>
      <div class="config-row"><div class="config-label">关联关系</div><div>${escapeHtml(asset.relationCount)} 个</div></div>
      <div class="config-row"><div class="config-label">结构指纹</div><div>${escapeHtml(detail.structureFingerprint)}</div></div>
      <div class="config-row"><div class="config-label">变更状态</div><div>${statusPill(asset.changeStatus, asset.changeTone)}</div></div>
      <div class="config-row"><div class="config-label">构建状态</div><div>${statusPill(asset.buildStatus, asset.buildTone)}</div></div>
      <div class="config-row"><div class="config-label">最近盘点</div><div>${escapeHtml(asset.lastInventoryAt)}</div></div>
    `
    : `
      <div class="config-row"><div class="config-label">数据源类型</div><div>${escapeHtml(detail.sourceType)}</div></div>
      <div class="config-row"><div class="config-label">接入方式</div><div>${escapeHtml(detail.connectorType)}</div></div>
      <div class="config-row"><div class="config-label">文件名</div><div>${escapeHtml(asset.name)}</div></div>
      <div class="config-row"><div class="config-label">相对路径</div><div>${pathValue(asset.relativePath || asset.name)}</div></div>
      <div class="config-row"><div class="config-label">资产身份</div><div>${pathValue(asset.identity || asset.relativePath || asset.name)}</div></div>
      <div class="config-row"><div class="config-label">文件类型</div><div>${escapeHtml(asset.type)}</div></div>
      <div class="config-row"><div class="config-label">文件大小</div><div>${escapeHtml(asset.size)}</div></div>
      <div class="config-row"><div class="config-label">资产指纹</div><div>${escapeHtml(asset.hash)}</div></div>
      <div class="config-row"><div class="config-label">上传时间</div><div>${escapeHtml(asset.uploadedAt)}</div></div>
      <div class="config-row"><div class="config-label">上传人</div><div>${escapeHtml(asset.uploadedBy)}</div></div>
      <div class="config-row"><div class="config-label">MinIO 原始文件路径</div><div>${pathValue(detail.minioObjectPath)}</div></div>
    `;
  qs("#parseInfo").innerHTML = `
    <div class="config-row"><div class="config-label">解析策略</div><div>知识</div></div>
    <div class="config-row"><div class="config-label">解析对象</div><div>${database ? "库表结构元数据" : "文件内容"}</div></div>
    <div class="config-row"><div class="config-label">解析状态</div><div>${asset.chunks > 0 ? statusPill("已解析", "green") : statusPill("待解析", "amber")}</div></div>
    <div class="config-row"><div class="config-label">${database ? "结构文档路径" : "Markdown 路径"}</div><div>${pathValue(detail.parsedMarkdownPath)}</div></div>
    <div class="config-row"><div class="config-label">${database ? "结构元数据路径" : "content_list 路径"}</div><div>${pathValue(detail.contentListPath)}</div></div>
  `;
}

function renderDeleteModal() {
  const check = qs("#assetDeleteConfirmCheck");
  const confirm = qs("#assetDeleteConfirm");
  const hint = qs("#assetDeleteHint");
  qs("#assetDeleteTitle").textContent = `确认删除文件资产 · ${asset.name}`;
  qs("#assetDeleteSummary").textContent = "删除会标记资产元数据，并清理该资产当前关联的解析产物、切片、embedding 和向量映射。";
  qs("#assetDeleteImpact").innerHTML = `
    <li><span>资产身份</span><strong>${escapeHtml(asset.identity || asset.relativePath || asset.name)}</strong></li>
    <li><span>构建状态</span><strong>${escapeHtml(asset.buildStatus)}</strong></li>
    <li><span>切片</span><strong>${escapeHtml(asset.chunks || 0)}</strong></li>
    <li><span>向量记录</span><strong>${escapeHtml(asset.vectors || 0)}</strong></li>
    <li><span>审计日志</span><strong>保留</strong></li>
  `;
  document.querySelector("[data-open-modal='deleteAssetModal']")?.addEventListener("click", () => {
    if (check) check.checked = false;
    if (confirm) confirm.disabled = true;
    if (hint) hint.textContent = "删除提交后会进入异步清理流程，页面保留操作记录。";
  });
  check?.addEventListener("change", () => {
    if (confirm) confirm.disabled = !check.checked;
  });
  confirm?.addEventListener("click", () => {
    if (hint) hint.textContent = "已模拟提交：资产删除请求已进入异步清理流程，操作记录会保留。";
    confirm.disabled = true;
  });
}

function renderStructure() {
  const body = qs("#assetStructureRows");
  if (!body) return;
  if (isDatabaseAsset()) {
    body.innerHTML = `
      <tr><th>字段名</th><th>类型</th><th>主键</th><th>可空</th><th>默认值</th><th>注释</th><th>变更状态</th></tr>
      ${detail.columns
        .map(
          (column) => `
            <tr>
              <td><strong>${column.name}</strong></td>
              <td>${column.type}</td>
              <td>${column.primaryKey ? "是" : "否"}</td>
              <td>${column.nullable ? "是" : "否"}</td>
              <td>${column.defaultValue || "-"}</td>
              <td>${column.comment}</td>
              <td>${statusPill(column.changeStatus, column.changeStatus === "无变更" ? "green" : "blue")}</td>
            </tr>
          `,
        )
        .join("")}
    `;
    return;
  }
  body.innerHTML = `
    <tr>${detail.contentStructure.map((item) => `<th>${item.label}</th>`).join("")}</tr>
    <tr>${detail.contentStructure.map((item) => `<td><strong>${item.count}</strong></td>`).join("")}</tr>
  `;
}

function renderVectorSummary() {
  const body = qs("#vectorSummaryRows");
  if (!body) return;
  body.innerHTML = detail.vectorSummaries
    .map(
      (item) => `
        <tr>
          <td>${item.sliceType}</td>
          <td>${item.collection}</td>
          <td>${item.model}</td>
          <td>${item.dimension}</td>
        </tr>
      `,
    )
    .join("");
}

function uniqueValues(rows, key) {
  return Array.from(new Set(rows.map((row) => row[key]))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function fillOptionList(selector, values) {
  const select = qs(selector);
  if (!select) return;
  select.innerHTML = [`<option value="all">全部类型</option>`, ...values.map((value) => `<option value="${value}">${value}</option>`)].join("");
}

function filteredRows(rows, state, fields) {
  const keyword = state.keyword.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesType = state.type === "all" || row.sliceType === state.type;
    const matchesKeyword = !keyword || fields.map((field) => row[field]).join(" ").toLowerCase().includes(keyword);
    return matchesType && matchesKeyword;
  });
}

function renderPagination(kind, total, totalPages, start, currentCount) {
  const state = listState[kind];
  const summary = qs(`#${kind === "vectors" ? "vector" : "chunk"}ListSummary`);
  const controls = qs(`#${kind === "vectors" ? "vector" : "chunk"}PaginationControls`);
  if (summary) {
    const from = total === 0 ? 0 : start + 1;
    const to = start + currentCount;
    summary.textContent = `每页 ${state.pageSize} 条，共 ${total} 条，当前 ${from}-${to}`;
  }
  if (!controls) return;
  controls.innerHTML = `
    <button class="page-button" data-page="prev" data-kind="${kind}" type="button" ${state.page === 1 ? "disabled" : ""}>上一页</button>
    ${paginationButtons(state.page, totalPages, "data-page", `data-kind="${kind}"`)}
    <button class="page-button" data-page="next" data-kind="${kind}" type="button" ${state.page === totalPages ? "disabled" : ""}>下一页</button>
    <span class="pagination-jump">
      跳至
      <input class="pagination-input" data-page-jump-input data-kind="${kind}" type="number" min="1" max="${totalPages}" value="${state.page}" aria-label="跳转页码">
      页
      <button class="page-button" data-page-jump data-kind="${kind}" type="button" ${totalPages <= 1 ? "disabled" : ""}>确定</button>
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
    if (kind === "vectors") renderVectors();
    else renderChunks();
  };
  controls.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.page;
      if (target === "prev") state.page = Math.max(1, state.page - 1);
      else if (target === "next") state.page = Math.min(totalPages, state.page + 1);
      else state.page = Number(target);
      if (kind === "vectors") renderVectors();
      else renderChunks();
    });
  });
  controls.querySelector("[data-page-jump]")?.addEventListener("click", jumpToPage);
  jumpInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToPage();
  });
}

function renderVectors() {
  const body = qs("#vectorRows");
  if (!body) return;
  const state = listState.vectors;
  const rows = filteredRows(detail.vectors, state, ["id", "chunkId", "collection", "model", "preview"]);
  const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  const pagedRows = rows.slice(start, start + state.pageSize);
  body.innerHTML = pagedRows.length
    ? pagedRows
      .map(
        (item) => `
          <tr>
            <td>${item.id}</td>
            <td>${item.sliceType}</td>
            <td>${item.collection}</td>
            <td>${item.model}</td>
            <td>${item.dimension}</td>
            <td>${item.chunkId}</td>
            <td>${item.page}</td>
            <td><button class="button small" data-preview-title="向量预览 ${item.id}" data-preview-content="${encodeURIComponent(item.preview)}" type="button">预览</button></td>
          </tr>
        `,
      )
      .join("")
    : `<tr><td colspan="8" class="empty-state">没有符合条件的向量</td></tr>`;
  renderPagination("vectors", rows.length, totalPages, start, pagedRows.length);
  bindPreviewButtons();
}

function renderChunks() {
  const body = qs("#chunkRows");
  if (!body) return;
  const state = listState.chunks;
  const rows = filteredRows(detail.chunks, state, ["id", "titlePath", "status", "preview"]);
  const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  const pagedRows = rows.slice(start, start + state.pageSize);
  body.innerHTML = pagedRows.length
    ? pagedRows
      .map(
        (item) => `
          <tr>
            <td>${item.id}</td>
            <td>${item.sliceType}</td>
            <td>${item.titlePath}</td>
            <td>${item.page}</td>
            <td>${item.tokens}</td>
            <td>${item.status}</td>
            <td><button class="button small" data-preview-title="切片预览 ${item.id}" data-preview-content="${encodeURIComponent(item.preview)}" type="button">预览</button></td>
          </tr>
        `,
      )
      .join("")
    : `<tr><td colspan="7" class="empty-state">没有符合条件的切片</td></tr>`;
  renderPagination("chunks", rows.length, totalPages, start, pagedRows.length);
  bindPreviewButtons();
}

function bindPreviewButtons() {
  document.querySelectorAll("[data-preview-content]").forEach((button) => {
    if (button.dataset.previewBound === "true") return;
    button.dataset.previewBound = "true";
    button.addEventListener("click", () => {
      qs("#previewTitle").textContent = button.dataset.previewTitle || "内容预览";
      qs("#previewContent").textContent = decodeURIComponent(button.dataset.previewContent || "");
      qs("#previewModal")?.classList.add("open");
    });
  });
}

function bindFilters() {
  const vectorSearch = qs("#vectorSearch");
  const vectorType = qs("#vectorTypeFilter");
  const chunkSearch = qs("#chunkSearch");
  const chunkType = qs("#chunkTypeFilter");
  qs("#resetVectorFilters")?.addEventListener("click", () => {
    if (vectorSearch) vectorSearch.value = "";
    if (vectorType) vectorType.value = "all";
    listState.vectors = { ...listState.vectors, keyword: "", page: 1, type: "all" };
    renderVectors();
  });
  qs("#resetChunkFilters")?.addEventListener("click", () => {
    if (chunkSearch) chunkSearch.value = "";
    if (chunkType) chunkType.value = "all";
    listState.chunks = { ...listState.chunks, keyword: "", page: 1, type: "all" };
    renderChunks();
  });
  vectorSearch?.addEventListener("input", () => {
    listState.vectors.keyword = vectorSearch.value;
    listState.vectors.page = 1;
    renderVectors();
  });
  vectorType?.addEventListener("change", () => {
    listState.vectors.type = vectorType.value;
    listState.vectors.page = 1;
    renderVectors();
  });
  chunkSearch?.addEventListener("input", () => {
    listState.chunks.keyword = chunkSearch.value;
    listState.chunks.page = 1;
    renderChunks();
  });
  chunkType?.addEventListener("change", () => {
    listState.chunks.type = chunkType.value;
    listState.chunks.page = 1;
    renderChunks();
  });
}

function renderAudit() {
  qs("#assetAudit").innerHTML = auditEvents
    .map(
      (event) => `
        <div class="timeline-item">
          <div class="hint">${event.time}</div>
          <div>
            <strong>${event.action}</strong>
            <div class="hint">${event.actor} · ${event.detail}</div>
          </div>
        </div>
      `,
    )
    .join("");
}

renderAsset();
renderDeleteModal();
renderStructure();
renderVectorSummary();
fillOptionList("#vectorTypeFilter", uniqueValues(detail.vectors, "sliceType"));
fillOptionList("#chunkTypeFilter", uniqueValues(detail.chunks, "sliceType"));
renderVectors();
renderChunks();
renderAudit();
bindFilters();
bindModalTriggers();
})();

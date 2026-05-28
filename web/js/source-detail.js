(function () {
const { artifactSummary, assets, auditEvents, buildArtifacts, buildTaskDetails, buildTasks, changeEvents, databaseAssets = [], databaseRelations = [], dataSources, sourceStats } = window.MockData;
const { bindModalTriggers, bindRowNavigation, bindTabs, paginationButtons, qs, statusPill, taskRuntimeAction } = window.UI;
const params = new URLSearchParams(window.location.search);
const selectedSource =
  dataSources.find((source) => source.id === params.get("sourceId")) ||
  dataSources.find((source) => source.id === "source-local-upload-sales") ||
  dataSources[0];
const assetListState = {
  keyword: "",
  page: 1,
  pageSize: 5,
  status: "all",
  type: "all",
};
const artifactListState = {
  keyword: "",
  page: 1,
  pageSize: 10,
  status: "all",
  type: "all",
};
const modelGraphState = {
  buildStatus: "all",
  fieldWorkbenchOpen: false,
  keyword: "",
  relationType: "all",
  schema: "all",
  selectedId: null,
  selectedKind: "summary",
  type: "all",
};

function isDatabaseSource() {
  return selectedSource?.category === "数据库";
}

function currentAssets() {
  if (!isDatabaseSource()) return assets;
  const matched = databaseAssets.filter((asset) => asset.sourceId === selectedSource.id);
  return matched.length ? matched : databaseAssets;
}

function currentRelations() {
  if (!isDatabaseSource()) return [];
  const sourceRelations = databaseRelations.filter((relation) => relation.sourceId === selectedSource.id);
  return sourceRelations.length ? sourceRelations : databaseRelations;
}

function renderSourceHeader() {
  if (!selectedSource) return;
  const page = qs("main.page");
  if (page) page.dataset.sourceId = selectedSource.id;
  document.title = `${selectedSource.name} · 数据源详情`;
  const breadcrumb = qs("#sourceBreadcrumbName");
  const title = qs("#sourceTitle");
  const meta = qs("#sourceMeta");
  const uploadLink = qs("#uploadFileLink");
  const buildTaskLink = qs("#buildTaskLink");
  const openFullGraphLink = qs("#openFullGraphLink");
  const coverageScopePill = qs("#coverageScopePill");
  const coverageScopeValue = qs("#coverageScopeValue");
  const coverageAssetsValue = qs("#coverageAssetsValue");
  const disableSourceCopy = qs("#disableSourceCopy");
  const deleteSourceAssetLabel = qs("#deleteSourceAssetLabel");
  const deleteSourceAssetCount = qs("#deleteSourceAssetCount");
  const deleteSourceBuiltCount = qs("#deleteSourceBuiltCount");
  const deleteSourceArtifactCount = qs("#deleteSourceArtifactCount");
  if (breadcrumb) breadcrumb.textContent = selectedSource.name;
  if (title) title.textContent = selectedSource.name;
  if (meta) {
    meta.innerHTML = `
      ${statusPill(selectedSource.status, selectedSource.statusTone)}
      <span class="tag">${selectedSource.category}</span>
      <span class="tag">${selectedSource.connector}</span>
      <span class="tag">负责人：${selectedSource.owner}</span>
      <span class="tag">最近盘点：${selectedSource.lastInventory}</span>
    `;
  }
  if (uploadLink) {
    uploadLink.href = `local-upload-create.html?sourceId=${selectedSource.id}`;
    uploadLink.hidden = selectedSource.connector !== "本地上传";
  }
  if (buildTaskLink) buildTaskLink.href = `build-task.html?sourceId=${selectedSource.id}`;
  if (openFullGraphLink) openFullGraphLink.href = `database-model-graph.html?sourceId=${selectedSource.id}`;
  if (coverageScopePill) coverageScopePill.outerHTML = statusPill(selectedSource.maintenanceScope || "未构建", selectedSource.maintenanceTone || "amber").replace("<span", '<span id="coverageScopePill"');
  if (coverageScopeValue) coverageScopeValue.textContent = selectedSource.maintenanceScope || "未构建";
  if (coverageAssetsValue) {
    coverageAssetsValue.textContent = isDatabaseSource()
      ? `${selectedSource.buildable} 个可构建模型对象中，${selectedSource.built} 个已有构建结果`
      : `${selectedSource.buildable} 个可构建资产中，${selectedSource.built} 个已有构建结果`;
  }
  if (disableSourceCopy) {
    disableSourceCopy.textContent = isDatabaseSource()
      ? "禁用后将暂停数据库元数据盘点、变更感知和新构建任务；已有表/视图资产、构建记录、向量记录和审计日志会保留。"
      : "禁用后将阻止上传新文件和创建新构建任务；已有资产、构建记录、向量记录和审计日志会保留。";
  }
  if (deleteSourceAssetLabel) deleteSourceAssetLabel.textContent = isDatabaseSource() ? "表 / 视图资产" : "文件资产";
  if (deleteSourceAssetCount) deleteSourceAssetCount.textContent = `${selectedSource.assets} 个`;
  if (deleteSourceBuiltCount) deleteSourceBuiltCount.textContent = `${selectedSource.built} 个`;
  if (deleteSourceArtifactCount) deleteSourceArtifactCount.textContent = `${selectedSource.built} 个资产关联产物`;
}

function renderMetrics() {
  const node = qs("#metricGrid");
  if (!node) return;
  const stats = selectedSource
    ? {
      totalAssets: selectedSource.assets,
      buildableAssets: selectedSource.buildable,
      builtAssets: selectedSource.built,
      staleAssets: selectedSource.stale,
    }
    : sourceStats;
  const labels = isDatabaseSource()
    ? ["模型对象", "可构建模型", "已构建模型", "待重建对象"]
    : ["资产总数", "可构建", "已构建", "待重建资产"];
  node.innerHTML = `
    <div class="metric"><div class="metric-label">${labels[0]}</div><div class="metric-value">${stats.totalAssets}</div></div>
    <div class="metric"><div class="metric-label">${labels[1]}</div><div class="metric-value">${stats.buildableAssets}</div></div>
    <div class="metric"><div class="metric-label">${labels[2]}</div><div class="metric-value">${stats.builtAssets}</div></div>
    <div class="metric"><div class="metric-label">${labels[3]}</div><div class="metric-value">${stats.staleAssets ?? sourceStats.failedAssets}</div></div>
  `;
}

function configureDetailLayout() {
  const graphSection = qs("#modelRelationSection");
  const assetTab = qs('[data-tab-target="assets"]');
  const assetPanel = qs('[data-tab-panel="assets"]');
  if (graphSection) graphSection.hidden = !isDatabaseSource();
  if (!assetTab || !assetPanel) return;
  if (isDatabaseSource()) {
    assetTab.hidden = true;
    assetPanel.hidden = true;
    assetTab.classList.remove("active");
    assetPanel.classList.remove("active");
    const tasksTab = qs('[data-tab-target="tasks"]');
    const tasksPanel = qs('[data-tab-panel="tasks"]');
    tasksTab?.classList.add("active");
    tasksPanel?.classList.add("active");
  } else {
    assetTab.hidden = false;
    assetPanel.hidden = false;
  }
}

function uniqueModelValues(rows, key) {
  return Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function fillSelectOptions(selector, allLabel, values) {
  const select = qs(selector);
  if (!select) return;
  select.innerHTML = [`<option value="all">${allLabel}</option>`, ...values.map((value) => `<option value="${value}">${value}</option>`)].join("");
}

function fillModelGraphFilters() {
  if (!isDatabaseSource()) return;
  const nodes = currentAssets();
  const relations = currentRelations();
  fillSelectOptions("#modelSchemaFilter", "全部 Schema", uniqueModelValues(nodes, "schema"));
  fillSelectOptions("#modelTypeFilter", "全部对象", uniqueModelValues(nodes, "type"));
  fillSelectOptions("#modelBuildFilter", "全部状态", uniqueModelValues(nodes, "buildStatus"));
  fillSelectOptions("#relationTypeFilter", "全部关系", uniqueModelValues(relations, "type"));
}

function filteredGraphNodes() {
  const keyword = modelGraphState.keyword.trim().toLowerCase();
  return currentAssets().filter((asset) => {
    const text = [asset.name, asset.displayName, asset.type, asset.schema, asset.comment, asset.primaryKey, asset.buildStatus, asset.changeStatus].join(" ").toLowerCase();
    return (
      (!keyword || text.includes(keyword)) &&
      (modelGraphState.schema === "all" || asset.schema === modelGraphState.schema) &&
      (modelGraphState.type === "all" || asset.type === modelGraphState.type) &&
      (modelGraphState.buildStatus === "all" || asset.buildStatus === modelGraphState.buildStatus)
    );
  });
}

function filteredGraphRelations(nodes) {
  const visibleIds = new Set(nodes.map((node) => node.id));
  return currentRelations().filter((relation) => {
    return (
      visibleIds.has(relation.from) &&
      visibleIds.has(relation.to) &&
      (modelGraphState.relationType === "all" || relation.type === modelGraphState.relationType)
    );
  });
}

const fallbackGraphPositions = [
  { x: 48, y: 16 },
  { x: 26, y: 30 },
  { x: 67, y: 31 },
  { x: 47, y: 45 },
  { x: 18, y: 58 },
  { x: 77, y: 58 },
  { x: 38, y: 70 },
  { x: 58, y: 72 },
  { x: 48, y: 86 },
  { x: 84, y: 22 },
];

function graphPosition(asset, index) {
  const fallback = fallbackGraphPositions[index % fallbackGraphPositions.length];
  return {
    x: asset.graphX ?? fallback.x,
    y: asset.graphY ?? fallback.y,
  };
}

function graphEdgeClass(type) {
  if (type.includes("依赖")) return "dependency";
  if (type.includes("推断")) return "inferred";
  return "foreign-key";
}

function graphPath(from, to) {
  const startX = from.x * 10;
  const startY = from.y * 6.2;
  const endX = to.x * 10;
  const endY = to.y * 6.2;
  const delta = Math.max(90, Math.abs(endX - startX) * 0.35);
  return `M ${startX} ${startY} C ${startX + delta} ${startY}, ${endX - delta} ${endY}, ${endX} ${endY}`;
}

function graphNodeTone(asset) {
  if (asset.buildStatus === "待重建") return "blue";
  if (asset.buildStatus === "未构建") return "amber";
  return asset.buildTone || "green";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function fieldDisplayName(fieldName, tableLabel) {
  const generated = fieldName.match(/_attr_(\d+)$/);
  if (generated) return `${tableLabel}属性${Number(generated[1])}`;
  const dictionary = {
    activity_id: "活动ID",
    amount: "金额",
    contract_id: "合同ID",
    created_at: "创建时间",
    customer_id: "客户ID",
    customer_name: "客户名称",
    industry: "行业",
    name: "名称",
    opportunity_id: "商机ID",
    owner_id: "负责人ID",
    product_id: "产品ID",
    region_id: "区域ID",
    status: "状态",
    tag_id: "标签ID",
    ticket_id: "工单ID",
    updated_at: "更新时间",
  };
  return dictionary[fieldName] || `${tableLabel}字段`;
}

function fieldBusinessMeaning(fieldName, tableLabel) {
  const generated = fieldName.match(/_attr_(\d+)$/);
  if (generated) return `补充描述${tableLabel}的业务属性 ${Number(generated[1])}。`;
  const dictionary = {
    activity_id: "用于唯一标识一次销售活动记录。",
    amount: "记录业务对象对应的金额或收入值。",
    contract_id: "用于关联合同台账中的合同记录。",
    created_at: "记录该数据行首次创建的时间。",
    customer_id: "用于唯一标识客户，并关联客户相关业务数据。",
    customer_name: "记录客户在业务系统中的展示名称。",
    industry: "描述客户所属行业，用于客户分层和分析。",
    name: `记录${tableLabel}的名称或标题。`,
    opportunity_id: "用于唯一标识销售机会，并关联商机过程数据。",
    owner_id: "记录该业务对象的负责人或归属组织。",
    product_id: "用于关联产品维表中的产品记录。",
    region_id: "用于关联销售区域维表中的区域记录。",
    status: "表示当前业务对象的生命周期状态。",
    tag_id: "用于关联客户标签或业务标签。",
    ticket_id: "用于唯一标识客服工单。",
    updated_at: "记录该数据行最近一次更新的时间。",
  };
  return dictionary[fieldName] || `描述${tableLabel}相关业务属性。`;
}

function generatedFieldsForNode(node) {
  const tableLabel = node.displayName || node.name;
  const primaryKeys = (node.primaryKey || "").split(",").map((key) => key.trim()).filter(Boolean);
  const baseName = node.name.replace(/^(crm_|dim_|vw_|mv_|cs_)/, "").replace(/_summary$/, "");
  const identityField = primaryKeys[0] || `${baseName}_id`;
  const names = [identityField, "name", "status", "owner_id", "created_at", "updated_at"];
  if (node.name.includes("customer")) names.splice(2, 0, "industry", "region_id");
  if (node.name.includes("opportunity")) names.splice(2, 0, "customer_id", "product_id", "amount");
  if (node.name.includes("contract")) names.splice(2, 0, "customer_id", "amount");
  const fieldNames = Array.from(new Set(names));
  const targetCount = Math.min(Math.max(Number(node.fieldCount) || fieldNames.length, fieldNames.length), 80);
  while (fieldNames.length < targetCount) {
    fieldNames.push(`${baseName}_attr_${String(fieldNames.length + 1).padStart(2, "0")}`);
  }
  return fieldNames.map((name) => ({
    businessMeaning: fieldBusinessMeaning(name, tableLabel),
    changeStatus: node.changeStatus === "新增字段" && name === "updated_at" ? "新增字段" : "无变更",
    dataType: name.endsWith("_at") ? "timestamp" : name.endsWith("_id") ? "bigint" : name === "amount" ? "numeric(18,2)" : "varchar(256)",
    defaultValue: name === "status" ? "'active'" : name.endsWith("_at") ? "now()" : "",
    displayName: fieldDisplayName(name, tableLabel),
    name,
    nullable: !primaryKeys.includes(name) && !["created_at", "updated_at"].includes(name),
    primaryKey: primaryKeys.includes(name),
  }));
}

function ensureNodeFields(node) {
  if (!Array.isArray(node.fields) || !node.fields.length) node.fields = generatedFieldsForNode(node);
  return node.fields;
}

function fieldChangeCount(node) {
  return ensureNodeFields(node).filter((field) => field.changeStatus && field.changeStatus !== "无变更").length;
}

function renderFieldMetadataTable(node) {
  const fields = ensureNodeFields(node);
  return `
    <div class="model-fields-wrap">
      <table class="field-metadata-table">
        <thead><tr><th>字段名称</th><th>中文名称</th><th>字段类型</th><th>主键</th><th>可空</th><th>默认值</th><th>业务含义</th><th>变更</th></tr></thead>
        <tbody>
          ${fields
            .map((field, index) => {
              const searchText = [field.name, field.displayName, field.dataType, field.businessMeaning, field.changeStatus].join(" ").toLowerCase();
              return `
                <tr data-field-row data-field-search="${escapeAttribute(searchText)}" data-field-change="${escapeAttribute(field.changeStatus || "无变更")}">
                  <td><code>${escapeHtml(field.name)}</code></td>
                  <td><input class="input field-inline-input" data-field-index="${index}" data-field-edit="displayName" value="${escapeAttribute(field.displayName || "")}" placeholder="中文名称"></td>
                  <td>${escapeHtml(field.dataType)}</td>
                  <td>${field.primaryKey ? "是" : "否"}</td>
                  <td>${field.nullable ? "是" : "否"}</td>
                  <td>${field.defaultValue ? escapeHtml(field.defaultValue) : "-"}</td>
                  <td><textarea class="textarea field-meaning-input" data-field-index="${index}" data-field-edit="businessMeaning" placeholder="业务含义">${escapeHtml(field.businessMeaning || "")}</textarea></td>
                  <td>${statusPill(field.changeStatus || "无变更", field.changeStatus === "无变更" ? "green" : "blue")}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function saveFieldMetadataFrom(root, node) {
  if (!root) return;
  const fields = ensureNodeFields(node);
  const primaryKeys = node.primaryKey.split(",").map((key) => key.trim()).filter(Boolean);
  fields.forEach((field, index) => {
    const displayNameInput = root.querySelector(`[data-field-index="${index}"][data-field-edit="displayName"]`);
    const meaningInput = root.querySelector(`[data-field-index="${index}"][data-field-edit="businessMeaning"]`);
    if (displayNameInput) field.displayName = displayNameInput.value.trim();
    if (meaningInput) field.businessMeaning = meaningInput.value.trim();
    field.primaryKey = primaryKeys.includes(field.name);
    if (field.primaryKey) field.nullable = false;
  });
}

function bindFieldWorkbench(workbench, node) {
  const search = workbench.querySelector("[data-field-search-input]");
  const summary = workbench.querySelector("[data-field-visible-summary]");
  const applyFilter = () => {
    const keyword = search?.value.trim().toLowerCase() || "";
    let visible = 0;
    workbench.querySelectorAll("[data-field-row]").forEach((row) => {
      const matchesKeyword = !keyword || row.dataset.fieldSearch.includes(keyword);
      row.hidden = !matchesKeyword;
      if (!row.hidden) visible += 1;
    });
    if (summary) summary.textContent = `显示 ${visible} / ${ensureNodeFields(node).length} 个字段`;
  };
  search?.addEventListener("input", applyFilter);
  workbench.querySelector("[data-close-field-workbench]")?.addEventListener("click", () => {
    modelGraphState.fieldWorkbenchOpen = false;
    renderModelFieldWorkbench(node);
  });
  workbench.querySelector("[data-save-field-metadata]")?.addEventListener("click", () => {
    saveFieldMetadataFrom(workbench, node);
    const hint = workbench.querySelector("[data-field-save-hint]");
    if (hint) hint.textContent = "字段信息已保存到当前页面状态。";
  });
  applyFilter();
}

function renderModelFieldWorkbench(node) {
  const workbench = qs("#modelFieldWorkbench");
  if (!workbench) return;
  if (!node || !modelGraphState.fieldWorkbenchOpen) {
    workbench.hidden = true;
    workbench.innerHTML = "";
    return;
  }
  const fields = ensureNodeFields(node);
  const changed = fieldChangeCount(node);
  workbench.hidden = false;
  workbench.innerHTML = `
    <div class="field-workbench-header">
      <div>
        <h3>字段管理 · ${node.name}</h3>
        <p class="card-subtitle">${node.displayName || "未设置中文名称"}，共 ${fields.length} 个字段，${changed} 个字段存在变更。</p>
      </div>
      <div class="header-actions">
        <button class="button small primary" data-save-field-metadata type="button">保存字段</button>
        <button class="button small" data-close-field-workbench type="button">收起</button>
      </div>
    </div>
    <div class="field-workbench-toolbar">
      <label class="field"><span class="label">搜索字段</span><input class="input" data-field-search-input placeholder="字段名、中文名、类型、业务含义"></label>
      <span class="hint" data-field-visible-summary></span>
      <span class="hint" data-field-save-hint></span>
    </div>
    ${renderFieldMetadataTable(node)}
  `;
  bindFieldWorkbench(workbench, node);
}

function renderGraphSvg(nodes, relations, positionMap) {
  const relationPaths = relations
    .map((relation) => {
      const from = positionMap.get(relation.from);
      const to = positionMap.get(relation.to);
      if (!from || !to) return "";
      const path = graphPath(from, to);
      const labelX = ((from.x + to.x) / 2) * 10;
      const labelY = ((from.y + to.y) / 2) * 6.2 - 8;
      const active = modelGraphState.selectedKind === "relation" && modelGraphState.selectedId === relation.id ? " active" : "";
      const kind = graphEdgeClass(relation.type);
      return `
        <path class="graph-edge ${kind}${active}" d="${path}" marker-end="url(#graphArrow)"></path>
        <path class="graph-edge-hit" d="${path}" data-graph-relation="${relation.id}"></path>
        <text class="graph-edge-label" x="${labelX}" y="${labelY}" text-anchor="middle">${relation.type}</text>
      `;
    })
    .join("");
  return `
    <svg class="model-graph-svg" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="graphArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#8a99aa"></path>
        </marker>
      </defs>
      ${relationPaths}
    </svg>
  `;
}

function renderGraphNodes(nodes, positionMap) {
  return nodes
    .map((asset) => {
      const position = positionMap.get(asset.id);
      const active = modelGraphState.selectedKind === "node" && modelGraphState.selectedId === asset.id ? " active" : "";
      const tone = graphNodeTone(asset);
      const displayName = asset.displayName ? `<span class="graph-node-cn">${asset.displayName}</span>` : "";
      return `
        <button class="graph-node${active}" data-graph-node="${asset.id}" type="button" style="left:${position.x}%;top:${position.y}%">
          <span class="graph-node-title"><strong>${asset.name}</strong><span>${asset.type}</span></span>
          <span class="graph-node-meta">
            ${displayName}
            <span>${asset.schema} · ${asset.fieldCount} 字段</span>
          </span>
          <span class="graph-node-build ${tone}" aria-hidden="true"></span>
        </button>
      `;
    })
    .join("");
}

function renderModelGraphDetail(nodes, relations) {
  const panel = qs("#modelGraphDetail");
  if (!panel) return;
  const selectedNode = modelGraphState.selectedKind === "node" ? nodes.find((node) => node.id === modelGraphState.selectedId) : null;
  const selectedRelation = modelGraphState.selectedKind === "relation" ? relations.find((relation) => relation.id === modelGraphState.selectedId) : null;
  if (selectedNode) {
    panel.innerHTML = `
      <h3 class="graph-detail-title">${selectedNode.name}</h3>
      <div class="config-list">
        <div class="config-row"><div class="config-label">对象类型</div><div>${selectedNode.type}</div></div>
        <div class="config-row"><div class="config-label">Schema</div><div>${selectedNode.schema}</div></div>
        <div class="config-row"><div class="config-label">中文名称</div><div><input class="input" data-model-edit="displayName" value="${escapeAttribute(selectedNode.displayName || "")}" placeholder="输入表中文名称"></div></div>
        <div class="config-row"><div class="config-label">业务说明</div><div><textarea class="textarea" data-model-edit="comment" placeholder="输入业务说明">${escapeHtml(selectedNode.comment || "")}</textarea></div></div>
        <div class="config-row"><div class="config-label">主键</div><div><input class="input" data-model-edit="primaryKey" value="${escapeAttribute(selectedNode.primaryKey || "")}" placeholder="例如 customer_id"></div></div>
        <div class="config-row"><div class="config-label">字段数</div><div>${selectedNode.fieldCount}</div></div>
        <div class="config-row"><div class="config-label">变更字段</div><div>${fieldChangeCount(selectedNode)} 个</div></div>
        <div class="config-row"><div class="config-label">变更状态</div><div>${statusPill(selectedNode.changeStatus, selectedNode.changeTone)}</div></div>
        <div class="config-row"><div class="config-label">构建状态</div><div>${statusPill(selectedNode.buildStatus, selectedNode.buildTone)}</div></div>
        <div class="config-row"><div class="config-label">最近盘点</div><div>${selectedNode.lastInventoryAt}</div></div>
      </div>
      <div class="graph-detail-actions">
        <button class="button small primary" data-save-model-metadata type="button">保存</button>
        <button class="button small" data-open-field-workbench type="button">字段管理</button>
      </div>
      <p class="hint" id="modelMetadataHint"></p>
    `;
    bindModelMetadataEditor(panel, selectedNode);
    return;
  }
  if (selectedRelation) {
    const from = nodes.find((node) => node.id === selectedRelation.from) || currentAssets().find((node) => node.id === selectedRelation.from);
    const to = nodes.find((node) => node.id === selectedRelation.to) || currentAssets().find((node) => node.id === selectedRelation.to);
    panel.innerHTML = `
      <h3 class="graph-detail-title">${selectedRelation.type}</h3>
      <div class="config-list">
        <div class="config-row"><div class="config-label">来源对象</div><div>${from?.name || selectedRelation.from}</div></div>
        <div class="config-row"><div class="config-label">目标对象</div><div>${to?.name || selectedRelation.to}</div></div>
        <div class="config-row"><div class="config-label">字段映射</div><div>${selectedRelation.fromField} → ${selectedRelation.toField}</div></div>
        <div class="config-row"><div class="config-label">来源依据</div><div>${selectedRelation.evidence}</div></div>
      </div>
    `;
    return;
  }
  const schemas = new Set(nodes.map((node) => node.schema));
  const stale = nodes.filter((node) => node.buildStatus === "待重建").length;
  const unbuilt = nodes.filter((node) => node.buildStatus === "未构建").length;
  panel.innerHTML = `
    <h3 class="graph-detail-title">图统计</h3>
    <div class="graph-detail-summary">
      <div class="graph-detail-metric"><strong>${nodes.length}</strong><span>模型对象</span></div>
      <div class="graph-detail-metric"><strong>${relations.length}</strong><span>关系</span></div>
      <div class="graph-detail-metric"><strong>${schemas.size}</strong><span>Schema</span></div>
      <div class="graph-detail-metric"><strong>${stale + unbuilt}</strong><span>待处理</span></div>
    </div>
    <div class="config-list">
      <div class="config-row"><div class="config-label">当前数据源</div><div>${selectedSource.name}</div></div>
      <div class="config-row"><div class="config-label">数据库类型</div><div>${selectedSource.connector}</div></div>
      <div class="config-row"><div class="config-label">最近盘点</div><div>${selectedSource.lastInventory}</div></div>
    </div>
  `;
}

function bindModelMetadataEditor(panel, node) {
  panel.querySelector("[data-open-field-workbench]")?.addEventListener("click", () => {
    modelGraphState.fieldWorkbenchOpen = true;
    renderModelFieldWorkbench(node);
    qs("#modelFieldWorkbench")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  panel.querySelector("[data-save-model-metadata]")?.addEventListener("click", () => {
    saveFieldMetadataFrom(qs("#modelFieldWorkbench"), node);
    node.displayName = panel.querySelector("[data-model-edit='displayName']")?.value.trim() || "";
    node.comment = panel.querySelector("[data-model-edit='comment']")?.value.trim() || "";
    node.primaryKey = panel.querySelector("[data-model-edit='primaryKey']")?.value.trim() || "";
    const fields = ensureNodeFields(node);
    const primaryKeys = node.primaryKey.split(",").map((key) => key.trim()).filter(Boolean);
    fields.forEach((field) => {
      field.primaryKey = primaryKeys.includes(field.name);
      if (field.primaryKey) field.nullable = false;
    });
    renderModelRelationGraph();
  });
}

function renderModelRelationGraph() {
  const canvas = qs("#modelGraphCanvas");
  if (!canvas || !isDatabaseSource()) return;
  const nodes = filteredGraphNodes();
  const relations = filteredGraphRelations(nodes);
  const positionMap = new Map(nodes.map((node, index) => [node.id, graphPosition(node, index)]));
  if (modelGraphState.selectedKind === "node" && !nodes.some((node) => node.id === modelGraphState.selectedId)) {
    modelGraphState.selectedKind = "summary";
    modelGraphState.selectedId = null;
  }
  if (modelGraphState.selectedKind === "relation" && !relations.some((relation) => relation.id === modelGraphState.selectedId)) {
    modelGraphState.selectedKind = "summary";
    modelGraphState.selectedId = null;
  }
  canvas.innerHTML = nodes.length
    ? `${renderGraphSvg(nodes, relations, positionMap)}${renderGraphNodes(nodes, positionMap)}`
    : `<div class="graph-empty">没有符合条件的模型关系</div>`;
  renderModelGraphDetail(nodes, relations);
  const selectedNode = modelGraphState.selectedKind === "node" ? nodes.find((node) => node.id === modelGraphState.selectedId) : null;
  if (!selectedNode) modelGraphState.fieldWorkbenchOpen = false;
  renderModelFieldWorkbench(selectedNode);
  canvas.querySelectorAll("[data-graph-node]").forEach((button) => {
    button.addEventListener("click", () => {
      modelGraphState.selectedKind = "node";
      modelGraphState.selectedId = button.dataset.graphNode;
      renderModelRelationGraph();
    });
  });
  canvas.querySelectorAll("[data-graph-relation]").forEach((path) => {
    path.addEventListener("click", () => {
      modelGraphState.selectedKind = "relation";
      modelGraphState.selectedId = path.dataset.graphRelation;
      renderModelRelationGraph();
    });
  });
}

function uniqueAssetValues(key) {
  return Array.from(new Set(currentAssets().map((asset) => asset[key]).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function fillAssetFilterOptions() {
  const search = qs("#assetSearch");
  const searchLabel = qs("#assetSearchLabel");
  const typeLabel = qs("#assetTypeFilterLabel");
  const type = qs("#assetTypeFilter");
  const status = qs("#buildStatusFilter");
  if (searchLabel) searchLabel.textContent = isDatabaseSource() ? "搜索表 / 视图" : "搜索文件";
  if (typeLabel) typeLabel.textContent = isDatabaseSource() ? "对象类型" : "文件类型";
  if (search) search.placeholder = isDatabaseSource() ? "对象名、Schema、业务说明、主键" : "文件名、类型、指纹";
  if (type) {
    const allLabel = isDatabaseSource() ? "全部对象" : "全部类型";
    type.innerHTML = [`<option value="all">${allLabel}</option>`, ...uniqueAssetValues("type").map((value) => `<option value="${value}">${value}</option>`)].join("");
  }
  if (status) {
    status.innerHTML = [`<option value="all">全部</option>`, ...uniqueAssetValues("buildStatus").map((value) => `<option>${value}</option>`)].join("");
  }
}

function renderAssetTableHead() {
  const head = qs("#assetTableHead");
  if (!head) return;
  head.innerHTML = isDatabaseSource()
    ? `<tr><th>对象名称</th><th>类型</th><th>库 / Schema</th><th>业务说明</th><th>字段数</th><th>主键</th><th>关联关系</th><th>变更状态</th><th>构建状态</th><th>最近盘点</th><th>操作</th></tr>`
    : `<tr><th>文件名</th><th>类型</th><th>大小</th><th>上传时间</th><th>上传人</th><th>构建状态</th><th>最近构建</th><th>操作</th></tr>`;
}

function filteredAssets() {
  const keyword = assetListState.keyword.trim().toLowerCase();
  return currentAssets().filter((asset) => {
    const searchableFields = isDatabaseSource()
      ? [asset.name, asset.type, asset.database, asset.schema, asset.comment, asset.primaryKey, asset.changeStatus, asset.buildStatus]
      : [asset.name, asset.type, asset.uploadedBy, asset.hash];
    const matchesKeyword = !keyword || searchableFields.join(" ").toLowerCase().includes(keyword);
    const matchesType = assetListState.type === "all" || asset.type === assetListState.type;
    const matchesStatus = assetListState.status === "all" || asset.buildStatus === assetListState.status;
    return matchesKeyword && matchesType && matchesStatus;
  });
}

function renderFileAssetRow(asset) {
  const buildState =
    asset.buildability === "可构建"
      ? statusPill(asset.buildStatus, asset.buildTone)
      : statusPill(asset.buildability, asset.buildabilityTone);
  const href = `asset-detail.html?id=${asset.id}`;
  return `
    <tr data-href="${href}">
      <td><a href="${href}"><strong>${asset.name}</strong></a></td>
      <td>${asset.type}</td>
      <td>${asset.size}</td>
      <td>${asset.uploadedAt}</td>
      <td>${asset.uploadedBy}</td>
      <td>${buildState}</td>
      <td>${asset.lastBuiltAt}</td>
      <td>
        <span class="row-actions">
          <a class="button small" href="${href}">详情</a>
          <a class="button small" href="build-task.html?sourceId=${selectedSource.id}">构建</a>
          <button class="button small danger" data-delete-asset="${asset.id}" type="button">删除</button>
        </span>
      </td>
    </tr>
  `;
}

function renderDatabaseAssetRow(asset) {
  const href = `asset-detail.html?id=${asset.id}`;
  return `
    <tr data-href="${href}">
      <td><a href="${href}"><strong>${asset.name}</strong></a></td>
      <td>${asset.type}</td>
      <td>${asset.database} / ${asset.schema}</td>
      <td><span class="hint">${asset.comment}</span></td>
      <td>${asset.fieldCount}</td>
      <td>${asset.primaryKey || "-"}</td>
      <td>${asset.relationCount} 个</td>
      <td>${statusPill(asset.changeStatus, asset.changeTone)}</td>
      <td>${statusPill(asset.buildStatus, asset.buildTone)}</td>
      <td>${asset.lastInventoryAt}</td>
      <td>
        <span class="row-actions">
          <a class="button small" href="${href}">查看结构</a>
          <a class="button small" href="build-task.html?sourceId=${selectedSource.id}">构建</a>
        </span>
      </td>
    </tr>
  `;
}

function renderAssets() {
  const body = qs("#assetRows");
  if (!body) return;
  renderAssetTableHead();
  const rows = filteredAssets();
  const totalPages = Math.max(1, Math.ceil(rows.length / assetListState.pageSize));
  if (assetListState.page > totalPages) assetListState.page = totalPages;
  const start = (assetListState.page - 1) * assetListState.pageSize;
  const pagedRows = rows.slice(start, start + assetListState.pageSize);
  body.innerHTML = pagedRows.length
    ? pagedRows
    .map((asset) => (isDatabaseSource() ? renderDatabaseAssetRow(asset) : renderFileAssetRow(asset)))
    .join("")
    : `<tr><td colspan="${isDatabaseSource() ? 11 : 8}" class="empty-state">没有符合条件的资产</td></tr>`;
  renderAssetPagination(rows.length, totalPages, start, pagedRows.length);
  bindDeleteAssetButtons();
  bindRowNavigation();
}

function renderAssetPagination(total, totalPages, start, currentCount) {
  const summary = qs("#assetListSummary");
  const controls = qs("#assetPaginationControls");
  if (summary) {
    const from = total === 0 ? 0 : start + 1;
    const to = start + currentCount;
    summary.textContent = `每页 ${assetListState.pageSize} 条，共 ${total} 条，当前 ${from}-${to}`;
  }
  if (!controls) return;
  controls.innerHTML = `
    <button class="page-button" data-asset-page="prev" type="button" ${assetListState.page === 1 ? "disabled" : ""}>上一页</button>
    ${paginationButtons(assetListState.page, totalPages, "data-asset-page")}
    <button class="page-button" data-asset-page="next" type="button" ${assetListState.page === totalPages ? "disabled" : ""}>下一页</button>
    <span class="pagination-jump">
      跳至
      <input class="pagination-input" data-asset-page-jump-input type="number" min="1" max="${totalPages}" value="${assetListState.page}" aria-label="跳转页码">
      页
      <button class="page-button" data-asset-page-jump type="button" ${totalPages <= 1 ? "disabled" : ""}>确定</button>
    </span>
  `;
  const jumpInput = controls.querySelector("[data-asset-page-jump-input]");
  const jumpToPage = () => {
    const page = Number.parseInt(jumpInput?.value || "", 10);
    if (!Number.isFinite(page)) {
      if (jumpInput) jumpInput.value = assetListState.page;
      return;
    }
    assetListState.page = Math.min(totalPages, Math.max(1, page));
    renderAssets();
  };
  controls.querySelectorAll("[data-asset-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.assetPage;
      if (target === "prev") assetListState.page = Math.max(1, assetListState.page - 1);
      else if (target === "next") assetListState.page = Math.min(totalPages, assetListState.page + 1);
      else assetListState.page = Number(target);
      renderAssets();
    });
  });
  controls.querySelector("[data-asset-page-jump]")?.addEventListener("click", jumpToPage);
  jumpInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToPage();
  });
}

function renderBuildTasks() {
  const body = qs("#taskRows");
  if (!body) return;
  const params = new URLSearchParams(window.location.search);
  const rows = params.get("createdTask") === "1" ? [window.MockData.createdBuildTask, ...buildTasks] : buildTasks;
  body.innerHTML = rows
    .map(
      (task) => {
        const href = task.href || `task-detail.html?id=${task.id}`;
        return `
        <tr data-href="${href}">
          <td><a href="${href}"><strong>${task.name}</strong></a></td>
          <td>${statusPill(task.scope, task.scopeTone)}</td>
          <td>${task.source}</td>
          <td>${task.createdAt}</td>
          <td>${statusPill(task.status, task.tone)}</td>
          <td>${task.assets}</td>
          <td>${task.chunks}</td>
          <td>${task.vectors}</td>
          <td>${taskActionsCell(task, href)}</td>
        </tr>
      `;
      },
    )
    .join("");
  bindRowNavigation();
  bindTaskRuntimeButtons(rows);
  bindDeleteTaskButtons(rows);
}

function taskActionsCell(task, href) {
  const action = taskRuntimeAction(task.status);
  const actionButton = action
    ? `<button class="button small ${action.tone || ""}" data-task-runtime-action="${task.id}" type="button">${action.label}</button>`
    : "";
  const canDelete = taskCanDelete(task);
  const deleteButton = canDelete
    ? `<button class="button small danger" data-delete-task="${task.id}" type="button">删除</button>`
    : "";
  return `
    <span class="row-actions">
      <a class="button small" href="${href}">详情</a>
      ${actionButton}
      ${deleteButton}
    </span>
  `;
}

function taskCanDelete(task) {
  return !["运行中", "排队中", "停止中"].includes(task.status);
}

function taskArtifactImpact(task) {
  const detail = buildTaskDetails?.[task.id];
  const parsed = detail?.metrics?.completedAssets || 0;
  const chunks = task.chunks || detail?.metrics?.chunks || 0;
  const vectors = task.vectors || detail?.metrics?.vectors || 0;
  const currentEffectiveAssets = task.status === "成功" ? parsed : 0;
  return {
    chunks,
    currentEffectiveAssets,
    hasArtifacts: parsed > 0 || chunks > 0 || vectors > 0,
    parsed,
    vectors,
  };
}

function bindDeleteTaskButtons(rows) {
  document.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", () => {
      const task = rows.find((item) => item.id === button.dataset.deleteTask);
      if (task) openDeleteTaskModal(task);
    });
  });
}

function bindTaskRuntimeButtons(rows) {
  document.querySelectorAll("[data-task-runtime-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const task = rows.find((item) => item.id === button.dataset.taskRuntimeAction);
      if (task) openTaskRuntimeModal(task);
    });
  });
}

function openTaskRuntimeModal(task) {
  const action = taskRuntimeAction(task.status);
  if (!action) return;
  const detail = buildTaskDetails?.[task.id];
  const failedAssets = detail?.metrics?.failedAssets || 0;
  const runningAssets = detail?.metrics?.runningAssets || 0;
  const completedAssets = detail?.metrics?.completedAssets || 0;
  const pendingAssets = Math.max(0, (detail?.metrics?.totalAssets || task.assets || 0) - completedAssets - runningAssets - failedAssets);
  const confirm = qs("#confirmTaskRuntimeAction");
  qs("#taskRuntimeTitle").textContent = `${action.title} · ${task.name}`;
  qs("#taskRuntimeSummary").textContent = action.summary;
  qs("#taskRuntimeImpact").innerHTML = `
    <li><span>当前状态</span><strong>${task.status}</strong></li>
    <li><span>任务范围</span><strong>${task.scope}</strong></li>
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

function deleteTaskOption(value, title, copy, checked = false, disabled = false) {
  return `
    <label class="delete-option ${disabled ? "disabled" : ""}">
      <input type="radio" name="deleteTaskMode" value="${value}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span>
        <strong>${title}</strong>
        <em>${copy}</em>
      </span>
    </label>
  `;
}

function openDeleteTaskModal(task) {
  const impact = taskArtifactImpact(task);
  const canDelete = taskCanDelete(task);
  qs("#deleteTaskTitle").textContent = `删除构建任务 · ${task.name}`;
  qs("#deleteTaskSummary").textContent = canDelete
    ? "系统会根据任务是否有关联产物决定可选删除方式。删除操作会写入操作记录。"
    : "当前任务仍在排队或运行中，暂不能删除。请等待任务结束后再删除。";
  qs("#deleteTaskImpact").innerHTML = `
    <li><span>任务状态</span><strong>${task.status}</strong></li>
    <li><span>解析产物</span><strong>${impact.parsed}</strong></li>
    <li><span>切片</span><strong>${impact.chunks}</strong></li>
    <li><span>向量记录</span><strong>${impact.vectors}</strong></li>
    <li><span>当前有效资产</span><strong>${impact.currentEffectiveAssets}</strong></li>
  `;
  const confirm = qs("#confirmDeleteTask");
  if (confirm) confirm.disabled = !canDelete;
  if (!canDelete) {
    qs("#deleteTaskOptions").innerHTML = "";
    qs("#deleteTaskHint").textContent = "运行中或排队中的任务需要先结束，避免构建产物处于不一致状态。";
  } else if (!impact.hasArtifacts) {
    qs("#deleteTaskOptions").innerHTML = deleteTaskOption("record", "删除任务记录", "从构建任务列表中移除该任务，不涉及构建产物。", true);
    qs("#deleteTaskHint").textContent = "该任务没有关联解析产物、切片或向量记录。";
  } else {
    qs("#deleteTaskOptions").innerHTML = [
      deleteTaskOption("record", "仅删除任务记录", "从列表中移除任务，不影响资产详情、构建产物和向量映射。", true),
      deleteTaskOption("record-and-artifacts", "删除任务及产物", "同时删除该任务生成的解析产物、切片、embedding 和向量映射。"),
    ].join("");
    qs("#deleteTaskHint").textContent = impact.currentEffectiveAssets > 0
      ? "该任务产物仍被部分资产作为当前有效结果使用，删除产物后这些资产会变为待重建。"
      : "该任务有关联产物，但不是当前有效结果，可按需一并清理。";
  }
  qs("#deleteTaskModal")?.classList.add("open");
}

function bindDeleteTaskConfirm() {
  qs("#confirmDeleteTask")?.addEventListener("click", () => {
    const mode = qs("input[name='deleteTaskMode']:checked")?.value || "record";
    qs("#deleteTaskHint").textContent = mode === "record-and-artifacts"
      ? "已模拟提交：删除任务记录及关联产物。实际系统会异步清理解析产物、切片和向量映射。"
      : "已模拟提交：仅删除任务记录。构建产物、资产状态和审计记录保持不变。";
  });
}

function bindDeleteAssetButtons() {
  document.querySelectorAll("[data-delete-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      const asset = currentAssets().find((item) => item.id === button.dataset.deleteAsset);
      if (asset) openDeleteAssetModal(asset);
    });
  });
}

function openDeleteAssetModal(asset) {
  const modal = qs("#deleteFileModal");
  const confirm = qs("#confirmDeleteFile");
  const check = qs("#deleteFileConfirmCheck");
  qs("#deleteFileTitle").textContent = `删除文件资产 · ${asset.name}`;
  qs("#deleteFileSummary").textContent = "删除会标记资产为已删除，并清理该资产当前关联的解析产物、切片、embedding 和向量映射。";
  qs("#deleteFileIdentity").textContent = asset.relativePath;
  qs("#deleteFileArtifacts").textContent = asset.chunks > 0 ? `清理 ${asset.chunks} 个切片及解析产物` : "无当前产物";
  qs("#deleteFileVectors").textContent = asset.vectors > 0 ? `清理 ${asset.vectors} 条向量映射` : "无当前向量";
  qs("#deleteFileHint").textContent = "请先确认风险，删除提交后系统会异步清理并写入操作记录。";
  if (check) check.checked = false;
  if (confirm) confirm.disabled = true;
  modal?.classList.add("open");
}

function bindDeleteAssetConfirm() {
  const check = qs("#deleteFileConfirmCheck");
  const confirm = qs("#confirmDeleteFile");
  check?.addEventListener("change", () => {
    if (confirm) confirm.disabled = !check.checked;
  });
  confirm?.addEventListener("click", () => {
    qs("#deleteFileHint").textContent = "已模拟提交：资产删除请求已进入异步清理流程，操作记录会保留。";
    confirm.disabled = true;
  });
}

function renderChangeEvents() {
  const body = qs("#changeRows");
  if (!body) return;
  body.innerHTML = changeEvents
    .map(
      (item) => {
        const taskLink = item.relatedTaskHref
          ? `<a href="${item.relatedTaskHref}"><strong>${item.relatedTask}</strong></a>`
          : `<span class="hint">${item.relatedTask}</span>`;
        return `
        <tr>
          <td>${item.type}</td>
          <td><button class="count-link" data-change-detail="${item.id}" type="button">${item.count}</button></td>
          <td>${taskLink}</td>
          <td>${item.action}</td>
          <td>${statusPill(item.status, item.statusTone)}</td>
        </tr>
      `;
      },
    )
    .join("");
  bindChangeDetailButtons();
}

function uniqueArtifactValues(key) {
  return Array.from(new Set(buildArtifacts.map((artifact) => artifact[key]))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function renderArtifactSummary() {
  const node = qs("#artifactSummaryGrid");
  if (!node) return;
  node.innerHTML = `
    <div class="metric"><div class="metric-label">解析产物</div><div class="metric-value">${artifactSummary.parsed}</div></div>
    <div class="metric"><div class="metric-label">切片总数</div><div class="metric-value">${artifactSummary.chunks}</div></div>
    <div class="metric"><div class="metric-label">向量写入</div><div class="metric-value">${artifactSummary.vectors}</div></div>
  `;
}

function fillArtifactFilterOptions() {
  const type = qs("#artifactTypeFilter");
  const status = qs("#artifactStatusFilter");
  if (type) {
    type.innerHTML = [`<option value="all">全部类型</option>`, ...uniqueArtifactValues("type").map((value) => `<option value="${value}">${value}</option>`)].join("");
  }
  if (status) {
    status.innerHTML = [`<option value="all">全部状态</option>`, ...uniqueArtifactValues("status").map((value) => `<option value="${value}">${value}</option>`)].join("");
  }
}

function filteredArtifacts() {
  const keyword = artifactListState.keyword.trim().toLowerCase();
  return buildArtifacts.filter((artifact) => {
    const text = [artifact.id, artifact.name, artifact.assetName, artifact.subtype, artifact.location, artifact.status]
      .join(" ")
      .toLowerCase();
    return (
      (!keyword || text.includes(keyword)) &&
      (artifactListState.type === "all" || artifact.type === artifactListState.type) &&
      (artifactListState.status === "all" || artifact.status === artifactListState.status)
    );
  });
}

function renderArtifactPagination(total, totalPages, start, currentCount) {
  const summary = qs("#artifactListSummary");
  const controls = qs("#artifactPaginationControls");
  if (summary) {
    const from = total === 0 ? 0 : start + 1;
    const to = start + currentCount;
    summary.textContent = `每页 ${artifactListState.pageSize} 条，共 ${total} 条，当前 ${from}-${to}`;
  }
  if (!controls) return;
  controls.innerHTML = `
    <button class="page-button" data-artifact-page="prev" type="button" ${artifactListState.page === 1 ? "disabled" : ""}>上一页</button>
    ${paginationButtons(artifactListState.page, totalPages, "data-artifact-page")}
    <button class="page-button" data-artifact-page="next" type="button" ${artifactListState.page === totalPages ? "disabled" : ""}>下一页</button>
    <span class="pagination-jump">
      跳至
      <input class="pagination-input" data-artifact-page-jump-input type="number" min="1" max="${totalPages}" value="${artifactListState.page}" aria-label="跳转页码">
      页
      <button class="page-button" data-artifact-page-jump type="button" ${totalPages <= 1 ? "disabled" : ""}>确定</button>
    </span>
  `;
  const jumpInput = controls.querySelector("[data-artifact-page-jump-input]");
  const jumpToPage = () => {
    const page = Number.parseInt(jumpInput?.value || "", 10);
    if (!Number.isFinite(page)) {
      if (jumpInput) jumpInput.value = artifactListState.page;
      return;
    }
    artifactListState.page = Math.min(totalPages, Math.max(1, page));
    renderArtifacts();
  };
  controls.querySelectorAll("[data-artifact-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.artifactPage;
      if (target === "prev") artifactListState.page = Math.max(1, artifactListState.page - 1);
      else if (target === "next") artifactListState.page = Math.min(totalPages, artifactListState.page + 1);
      else artifactListState.page = Number(target);
      renderArtifacts();
    });
  });
  controls.querySelector("[data-artifact-page-jump]")?.addEventListener("click", jumpToPage);
  jumpInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToPage();
  });
}

function renderArtifacts() {
  const body = qs("#artifactRows");
  if (!body) return;
  const rows = filteredArtifacts();
  const totalPages = Math.max(1, Math.ceil(rows.length / artifactListState.pageSize));
  if (artifactListState.page > totalPages) artifactListState.page = totalPages;
  const start = (artifactListState.page - 1) * artifactListState.pageSize;
  const pagedRows = rows.slice(start, start + artifactListState.pageSize);
  body.innerHTML = pagedRows.length
    ? pagedRows
      .map(
        (artifact) => `
          <tr>
            <td>${artifact.type}</td>
            <td><strong>${artifact.name}</strong></td>
            <td>${artifact.assetName}</td>
            <td>${artifact.subtype}</td>
            <td><code class="path-value">${artifact.location}</code></td>
            <td>${statusPill(artifact.status, artifact.statusTone)}</td>
            <td>${artifact.updatedAt}</td>
            <td><button class="button small" data-artifact-preview="${artifact.id}" type="button">预览</button></td>
          </tr>
        `,
      )
      .join("")
    : `<tr><td colspan="8" class="empty-state">没有符合条件的构建产物</td></tr>`;
  renderArtifactPagination(rows.length, totalPages, start, pagedRows.length);
  bindArtifactPreviewButtons();
}

function bindArtifactPreviewButtons() {
  document.querySelectorAll("[data-artifact-preview]").forEach((button) => {
    button.addEventListener("click", () => {
      const artifact = buildArtifacts.find((item) => item.id === button.dataset.artifactPreview);
      if (!artifact) return;
      qs("#artifactPreviewTitle").textContent = `${artifact.type}预览 · ${artifact.name}`;
      qs("#artifactPreviewContent").textContent = artifact.preview;
      qs("#artifactPreviewModal")?.classList.add("open");
    });
  });
}

function renderFingerprintChange(detail) {
  const before = detail.beforeFingerprint || "-";
  const after = detail.afterFingerprint || "-";
  return `<span class="fingerprint-flow"><code>${before}</code><span>→</span><code>${after}</code></span>`;
}

function bindChangeDetailButtons() {
  document.querySelectorAll("[data-change-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      const event = changeEvents.find((item) => item.id === button.dataset.changeDetail);
      if (!event) return;
      const taskLink = event.relatedTaskHref ? `关联任务：${event.relatedTask}` : `关联任务：${event.relatedTask || "无"}`;
      qs("#changeDetailTitle").textContent = `${event.type}明细`;
      qs("#changeDetailSummary").textContent = `${event.count} 个变更资产，${event.action}，当前状态：${event.status}。${taskLink}`;
      qs("#changeDetailRows").innerHTML = event.details?.length
        ? event.details
          .map(
            (detail) => `
              <tr>
                <td><strong>${detail.name}</strong></td>
                <td>${detail.type}</td>
                <td>${detail.change}</td>
                <td><code class="path-value">${detail.sourcePath}</code></td>
                <td>${renderFingerprintChange(detail)}</td>
                <td>${detail.detectedAt}</td>
              </tr>
            `,
          )
          .join("")
        : `<tr><td colspan="6" class="empty-state">没有变更明细</td></tr>`;
      qs("#changeDetailModal")?.classList.add("open");
    });
  });
}

function renderAudit() {
  const node = qs("#auditTimeline");
  if (!node) return;
  node.innerHTML = auditEvents
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

function bindFilters() {
  const search = qs("#assetSearch");
  const status = qs("#buildStatusFilter");
  const type = qs("#assetTypeFilter");
  const reset = qs("#resetAssetFilters");
  const apply = () => {
    assetListState.keyword = search?.value || "";
    assetListState.status = status?.value || "all";
    assetListState.type = type?.value || "all";
    assetListState.page = 1;
    renderAssets();
  };
  search?.addEventListener("input", apply);
  status?.addEventListener("change", apply);
  type?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (status) status.value = "all";
    if (type) type.value = "all";
    apply();
  });
}

function bindModelGraphFilters() {
  if (!isDatabaseSource()) return;
  const search = qs("#modelSearch");
  const schema = qs("#modelSchemaFilter");
  const type = qs("#modelTypeFilter");
  const buildStatus = qs("#modelBuildFilter");
  const relationType = qs("#relationTypeFilter");
  const apply = () => {
    modelGraphState.keyword = search?.value || "";
    modelGraphState.schema = schema?.value || "all";
    modelGraphState.type = type?.value || "all";
    modelGraphState.buildStatus = buildStatus?.value || "all";
    modelGraphState.relationType = relationType?.value || "all";
    renderModelRelationGraph();
  };
  search?.addEventListener("input", apply);
  schema?.addEventListener("change", apply);
  type?.addEventListener("change", apply);
  buildStatus?.addEventListener("change", apply);
  relationType?.addEventListener("change", apply);
  qs("#resetModelGraphFilters")?.addEventListener("click", () => {
    if (search) search.value = "";
    if (schema) schema.value = "all";
    if (type) type.value = "all";
    if (buildStatus) buildStatus.value = "all";
    if (relationType) relationType.value = "all";
    modelGraphState.keyword = "";
    modelGraphState.schema = "all";
    modelGraphState.type = "all";
    modelGraphState.buildStatus = "all";
    modelGraphState.relationType = "all";
    modelGraphState.selectedKind = "summary";
    modelGraphState.selectedId = null;
    renderModelRelationGraph();
  });
}

function bindArtifactFilters() {
  const search = qs("#artifactSearch");
  const type = qs("#artifactTypeFilter");
  const status = qs("#artifactStatusFilter");
  const reset = qs("#resetArtifactFilters");
  const apply = () => {
    artifactListState.keyword = search?.value || "";
    artifactListState.type = type?.value || "all";
    artifactListState.status = status?.value || "all";
    artifactListState.page = 1;
    renderArtifacts();
  };
  search?.addEventListener("input", apply);
  type?.addEventListener("change", apply);
  status?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (type) type.value = "all";
    if (status) status.value = "all";
    apply();
  });
}

function activateTab(target) {
  if (!target) return;
  const tab = qs(`[data-tab-target="${target}"]`);
  const panel = qs(`[data-tab-panel="${target}"]`);
  if (!tab || !panel) return;
  if (tab.hidden || panel.hidden) return;
  document.querySelectorAll("[data-tab-target]").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll("[data-tab-panel]").forEach((item) => item.classList.remove("active"));
  tab.classList.add("active");
  panel.classList.add("active");
  tab.closest(".card")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindHashTab() {
  const apply = () => activateTab(window.location.hash.replace("#", ""));
  apply();
  window.addEventListener("hashchange", apply);
}

renderSourceHeader();
renderMetrics();
configureDetailLayout();
fillModelGraphFilters();
renderModelRelationGraph();
renderAssetTableHead();
fillAssetFilterOptions();
renderAssets();
renderBuildTasks();
renderChangeEvents();
renderArtifactSummary();
fillArtifactFilterOptions();
renderArtifacts();
renderAudit();
bindTabs();
bindHashTab();
bindFilters();
bindModelGraphFilters();
bindArtifactFilters();
bindModalTriggers();
bindDeleteTaskConfirm();
bindTaskRuntimeConfirm();
bindDeleteAssetConfirm();
})();

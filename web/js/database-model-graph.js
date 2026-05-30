(function () {
const { dataSources, databaseAssets = [], databaseRelations = [] } = window.DataAssetsApi.getModelGraphData();
const { bindModalTriggers, qs, statusPill } = window.UI;
const params = new URLSearchParams(window.location.search);
const selectedSource =
  dataSources.find((source) => source.id === params.get("sourceId")) ||
  dataSources.find((source) => source.category === "数据库") ||
  dataSources[0];

const graphSize = { width: 1800, height: 1120 };
const state = {
  buildStatus: "all",
  dragging: false,
  fieldWorkbenchOpen: false,
  keyword: "",
  panX: 0,
  panY: 0,
  relationType: "all",
  schema: "all",
  selectedId: null,
  selectedKind: "summary",
  type: "all",
  viewScope: "all",
  zoom: 0.72,
};

const positionMap = {
  "db-asset-crm-customer": { x: 890, y: 470 },
  "db-asset-crm-opportunity": { x: 610, y: 250 },
  "db-asset-crm-contact": { x: 580, y: 500 },
  "db-asset-sales-order-view": { x: 310, y: 245 },
  "db-asset-contract": { x: 630, y: 760 },
  "db-asset-product": { x: 1040, y: 230 },
  "db-asset-region": { x: 1190, y: 490 },
  "db-asset-customer-tag": { x: 1110, y: 735 },
  "db-asset-sales-funnel-view": { x: 245, y: 560 },
  "db-asset-activity": { x: 1420, y: 470 },
  "db-asset-ticket-case": { x: 760, y: 430 },
  "db-asset-ticket-sla": { x: 1050, y: 430 },
};

function nodesForSource() {
  const rows = databaseAssets.filter((asset) => asset.sourceId === selectedSource.id);
  return rows.length ? rows : databaseAssets;
}

function relationsForSource() {
  const rows = databaseRelations.filter((relation) => relation.sourceId === selectedSource.id);
  return rows.length ? rows : databaseRelations;
}

function uniqueValues(rows, key) {
  return Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function fillSelect(selector, allLabel, values) {
  const select = qs(selector);
  if (!select) return;
  select.innerHTML = [`<option value="all">${escapeHtml(allLabel)}</option>`, ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)].join("");
}

function renderHeader() {
  document.title = `${selectedSource.name} · 资产关系图`;
  qs("main.page").dataset.sourceId = selectedSource.id;
  qs("#graphTitle").textContent = `${selectedSource.name} · 资产关系图`;
  qs("#graphMeta").innerHTML = `
    ${statusPill(selectedSource.status, selectedSource.statusTone)}
    <span class="tag">${escapeHtml(selectedSource.connector)}</span>
    <span class="tag">负责人：${escapeHtml(selectedSource.owner)}</span>
    <span class="tag">最近盘点：${escapeHtml(selectedSource.lastInventory)}</span>
  `;
  qs("#sourceDetailLink").textContent = selectedSource.name;
  qs("#sourceDetailLink").href = `local-upload-detail.html?sourceId=${selectedSource.id}`;
  qs("#backToSource").href = `local-upload-detail.html?sourceId=${selectedSource.id}`;
}

function fillFilters() {
  const nodes = nodesForSource();
  const relations = relationsForSource();
  fillSelect("#fullModelSchemaFilter", "全部 Schema", uniqueValues(nodes, "schema"));
  fillSelect("#fullModelTypeFilter", "全部对象", uniqueValues(nodes, "type"));
  fillSelect("#fullModelBuildFilter", "全部状态", uniqueValues(nodes, "buildStatus"));
  fillSelect("#fullRelationTypeFilter", "全部关系", uniqueValues(relations, "type"));
}

function baseFilteredNodes() {
  const keyword = state.keyword.trim().toLowerCase();
  return nodesForSource().filter((asset) => {
    const text = [asset.name, asset.displayName, asset.type, asset.schema, asset.comment, asset.primaryKey, asset.buildStatus, asset.changeStatus]
      .join(" ")
      .toLowerCase();
    return (
      (!keyword || text.includes(keyword)) &&
      (state.schema === "all" || asset.schema === state.schema) &&
      (state.type === "all" || asset.type === state.type) &&
      (state.buildStatus === "all" || asset.buildStatus === state.buildStatus)
    );
  });
}

function visibleNodes() {
  const base = baseFilteredNodes();
  if (state.viewScope !== "one-hop" || state.selectedKind !== "node" || !state.selectedId) return base;
  const relatedIds = new Set([state.selectedId]);
  relationsForSource().forEach((relation) => {
    if (relation.from === state.selectedId) relatedIds.add(relation.to);
    if (relation.to === state.selectedId) relatedIds.add(relation.from);
  });
  return base.filter((node) => relatedIds.has(node.id));
}

function visibleRelations(nodes) {
  const visibleIds = new Set(nodes.map((node) => node.id));
  return relationsForSource().filter((relation) => {
    return (
      visibleIds.has(relation.from) &&
      visibleIds.has(relation.to) &&
      (state.relationType === "all" || relation.type === state.relationType)
    );
  });
}

function nodePosition(node, index) {
  if (positionMap[node.id]) return positionMap[node.id];
  const angle = (Math.PI * 2 * index) / Math.max(1, nodesForSource().length);
  return {
    x: graphSize.width / 2 + Math.cos(angle) * 520,
    y: graphSize.height / 2 + Math.sin(angle) * 330,
  };
}

function edgeClass(type) {
  if (type.includes("依赖")) return "dependency";
  if (type.includes("推断")) return "inferred";
  return "foreign-key";
}

function edgePath(from, to) {
  const dx = Math.abs(to.x - from.x);
  const curve = Math.max(120, dx * 0.35);
  return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;
}

function nodeTone(node) {
  if (node.buildStatus === "待重建") return "blue";
  if (node.buildStatus === "未构建") return "amber";
  return node.buildTone || "green";
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
    state.fieldWorkbenchOpen = false;
    renderFieldWorkbench(node);
  });
  workbench.querySelector("[data-save-field-metadata]")?.addEventListener("click", () => {
    saveFieldMetadataFrom(workbench, node);
    const hint = workbench.querySelector("[data-field-save-hint]");
    if (hint) hint.textContent = "字段信息已保存到当前页面状态。";
  });
  applyFilter();
}

function renderFieldWorkbench(node) {
  const workbench = qs("#graphFieldWorkbench");
  const workspace = qs("#graphWorkspace");
  if (!workbench) return;
  if (!node || !state.fieldWorkbenchOpen) {
    workbench.hidden = true;
    workbench.innerHTML = "";
    workspace?.classList.remove("has-field-workbench");
    return;
  }
  const fields = ensureNodeFields(node);
  const changed = fieldChangeCount(node);
  workbench.hidden = false;
  workspace?.classList.add("has-field-workbench");
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


function renderEdges(relations, positions) {
  return relations
    .map((relation) => {
      const from = positions.get(relation.from);
      const to = positions.get(relation.to);
      if (!from || !to) return "";
      const path = edgePath(from, to);
      const active = state.selectedKind === "relation" && state.selectedId === relation.id ? " active" : "";
      const labelX = (from.x + to.x) / 2;
      const labelY = (from.y + to.y) / 2 - 12;
      return `
        <path class="graph-edge ${edgeClass(relation.type)}${active}" d="${path}" marker-end="url(#fullGraphArrow)"></path>
        <path class="graph-edge-hit" d="${path}" data-graph-relation="${relation.id}"></path>
        <text class="graph-edge-label" x="${labelX}" y="${labelY}" text-anchor="middle">${relation.type}</text>
      `;
    })
    .join("");
}

function renderNodes(nodes, positions) {
  return nodes
    .map((node) => {
      const position = positions.get(node.id);
      const active = state.selectedKind === "node" && state.selectedId === node.id ? " active" : "";
      const displayName = node.displayName ? `<span class="graph-node-cn">${node.displayName}</span>` : "";
      return `
        <button class="graph-node full-graph-node${active}" data-graph-node="${node.id}" type="button" style="left:${position.x}px;top:${position.y}px">
          <span class="graph-node-title"><strong>${node.name}</strong><span>${node.type}</span></span>
          <span class="graph-node-meta">
            ${displayName}
            <span>${node.schema} · ${node.fieldCount} 字段</span>
          </span>
          <span class="graph-node-build ${nodeTone(node)}" aria-hidden="true"></span>
        </button>
      `;
    })
    .join("");
}

function renderInspector(nodes, relations) {
  const panel = qs("#graphRightPanel");
  const selectedNode = state.selectedKind === "node" ? nodesForSource().find((node) => node.id === state.selectedId) : null;
  const selectedRelation = state.selectedKind === "relation" ? relationsForSource().find((relation) => relation.id === state.selectedId) : null;
  if (selectedNode) {
    panel.innerHTML = `
      <div class="graph-panel-header"><h2 class="card-title">${selectedNode.name}</h2></div>
      <div class="config-list">
        <div class="config-row"><div class="config-label">对象类型</div><div>${selectedNode.type}</div></div>
        <div class="config-row"><div class="config-label">Schema</div><div>${selectedNode.schema}</div></div>
        <div class="config-row"><div class="config-label">中文名称</div><div><input class="input" data-model-edit="displayName" value="${escapeAttribute(selectedNode.displayName || "")}" placeholder="输入表中文名称"></div></div>
        <div class="config-row"><div class="config-label">业务说明</div><div><textarea class="textarea" data-model-edit="comment" placeholder="输入业务说明">${escapeHtml(selectedNode.comment || "")}</textarea></div></div>
        <div class="config-row"><div class="config-label">主键</div><div><input class="input" data-model-edit="primaryKey" value="${escapeAttribute(selectedNode.primaryKey || "")}" placeholder="例如 customer_id"></div></div>
        <div class="config-row"><div class="config-label">字段数</div><div>${selectedNode.fieldCount}</div></div>
        <div class="config-row"><div class="config-label">变更字段</div><div>${fieldChangeCount(selectedNode)} 个</div></div>
        <div class="config-row"><div class="config-label">关系数</div><div>${selectedNode.relationCount} 个</div></div>
        <div class="config-row"><div class="config-label">变更状态</div><div>${statusPill(selectedNode.changeStatus, selectedNode.changeTone)}</div></div>
        <div class="config-row"><div class="config-label">构建状态</div><div>${statusPill(selectedNode.buildStatus, selectedNode.buildTone)}</div></div>
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
    const from = nodesForSource().find((node) => node.id === selectedRelation.from);
    const to = nodesForSource().find((node) => node.id === selectedRelation.to);
    panel.innerHTML = `
      <div class="graph-panel-header"><h2 class="card-title">${selectedRelation.type}</h2></div>
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
    <div class="graph-panel-header"><h2 class="card-title">图统计</h2></div>
    <div class="graph-detail-summary">
      <div class="graph-detail-metric"><strong>${nodes.length}</strong><span>资产对象</span></div>
      <div class="graph-detail-metric"><strong>${relations.length}</strong><span>关系</span></div>
      <div class="graph-detail-metric"><strong>${schemas.size}</strong><span>Schema</span></div>
      <div class="graph-detail-metric"><strong>${stale + unbuilt}</strong><span>待处理</span></div>
    </div>
    <div class="config-list">
      <div class="config-row"><div class="config-label">数据源</div><div>${selectedSource.name}</div></div>
      <div class="config-row"><div class="config-label">数据库类型</div><div>${selectedSource.connector}</div></div>
      <div class="config-row"><div class="config-label">最近盘点</div><div>${selectedSource.lastInventory}</div></div>
    </div>
  `;
}

function bindModelMetadataEditor(panel, node) {
  panel.querySelector("[data-open-field-workbench]")?.addEventListener("click", () => {
    state.fieldWorkbenchOpen = true;
    renderFieldWorkbench(node);
  });
  panel.querySelector("[data-save-model-metadata]")?.addEventListener("click", () => {
    saveFieldMetadataFrom(qs("#graphFieldWorkbench"), node);
    node.displayName = panel.querySelector("[data-model-edit='displayName']")?.value.trim() || "";
    node.comment = panel.querySelector("[data-model-edit='comment']")?.value.trim() || "";
    node.primaryKey = panel.querySelector("[data-model-edit='primaryKey']")?.value.trim() || "";
    const fields = ensureNodeFields(node);
    const primaryKeys = node.primaryKey.split(",").map((key) => key.trim()).filter(Boolean);
    fields.forEach((field) => {
      field.primaryKey = primaryKeys.includes(field.name);
      if (field.primaryKey) field.nullable = false;
    });
    renderGraph();
  });
}

function applyTransform() {
  const viewport = qs("#fullGraphViewport");
  if (!viewport) return;
  viewport.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  qs("#graphZoomLabel").textContent = `${Math.round(state.zoom * 100)}%`;
}

function renderGraph() {
  const viewport = qs("#fullGraphViewport");
  const nodes = visibleNodes();
  const relations = visibleRelations(nodes);
  const positions = new Map(nodes.map((node, index) => [node.id, nodePosition(node, index)]));
  if (state.selectedKind === "node" && !nodesForSource().some((node) => node.id === state.selectedId)) {
    state.selectedKind = "summary";
    state.selectedId = null;
  }
  if (state.selectedKind === "relation" && !relationsForSource().some((relation) => relation.id === state.selectedId)) {
    state.selectedKind = "summary";
    state.selectedId = null;
  }
  viewport.style.width = `${graphSize.width}px`;
  viewport.style.height = `${graphSize.height}px`;
  viewport.innerHTML = nodes.length
    ? `
      <svg class="model-graph-svg full-model-graph-svg" viewBox="0 0 ${graphSize.width} ${graphSize.height}" aria-hidden="true">
        <defs>
          <marker id="fullGraphArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#8a99aa"></path>
          </marker>
        </defs>
        ${renderEdges(relations, positions)}
      </svg>
      ${renderNodes(nodes, positions)}
    `
    : `<div class="graph-empty">没有符合条件的资产关系</div>`;
  renderInspector(nodes, relations);
  const selectedNode = state.selectedKind === "node" ? nodesForSource().find((node) => node.id === state.selectedId) : null;
  if (!selectedNode) state.fieldWorkbenchOpen = false;
  renderFieldWorkbench(selectedNode);
  applyTransform();
  viewport.querySelectorAll("[data-graph-node]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedKind = "node";
      state.selectedId = button.dataset.graphNode;
      renderGraph();
    });
  });
  viewport.querySelectorAll("[data-graph-relation]").forEach((path) => {
    path.addEventListener("click", () => {
      state.selectedKind = "relation";
      state.selectedId = path.dataset.graphRelation;
      renderGraph();
    });
  });
}

function fitGraph() {
  const canvas = qs("#fullGraphCanvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  state.zoom = Math.min(1, Math.max(0.42, Math.min((rect.width - 80) / graphSize.width, (rect.height - 80) / graphSize.height)));
  state.panX = Math.round((rect.width - graphSize.width * state.zoom) / 2);
  state.panY = Math.round((rect.height - graphSize.height * state.zoom) / 2);
  applyTransform();
}

function zoomBy(delta) {
  const canvas = qs("#fullGraphCanvas");
  const rect = canvas.getBoundingClientRect();
  const oldZoom = state.zoom;
  const nextZoom = Math.min(1.6, Math.max(0.34, state.zoom + delta));
  const ratio = nextZoom / oldZoom;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  state.panX = centerX - (centerX - state.panX) * ratio;
  state.panY = centerY - (centerY - state.panY) * ratio;
  state.zoom = nextZoom;
  applyTransform();
}

function bindFilters() {
  const search = qs("#fullModelSearch");
  const schema = qs("#fullModelSchemaFilter");
  const type = qs("#fullModelTypeFilter");
  const build = qs("#fullModelBuildFilter");
  const relation = qs("#fullRelationTypeFilter");
  const scope = qs("#fullGraphScope");
  const apply = () => {
    state.keyword = search?.value || "";
    state.schema = schema?.value || "all";
    state.type = type?.value || "all";
    state.buildStatus = build?.value || "all";
    state.relationType = relation?.value || "all";
    state.viewScope = scope?.value || "all";
    renderGraph();
  };
  search?.addEventListener("input", apply);
  schema?.addEventListener("change", apply);
  type?.addEventListener("change", apply);
  build?.addEventListener("change", apply);
  relation?.addEventListener("change", apply);
  scope?.addEventListener("change", apply);
  qs("#resetGraphFilters")?.addEventListener("click", () => {
    if (search) search.value = "";
    [schema, type, build, relation, scope].forEach((select) => {
      if (select) select.value = "all";
    });
    state.keyword = "";
    state.schema = "all";
    state.type = "all";
    state.buildStatus = "all";
    state.relationType = "all";
    state.viewScope = "all";
    state.selectedKind = "summary";
    state.selectedId = null;
    renderGraph();
  });
}

function bindToolbar() {
  qs("#zoomOutGraph")?.addEventListener("click", () => zoomBy(-0.12));
  qs("#zoomInGraph")?.addEventListener("click", () => zoomBy(0.12));
  qs("#fitGraph")?.addEventListener("click", fitGraph);
  qs("#toggleLeftPanel")?.addEventListener("click", () => qs("#graphWorkspace")?.classList.toggle("left-collapsed"));
  qs("#toggleRightPanel")?.addEventListener("click", () => qs("#graphWorkspace")?.classList.toggle("right-collapsed"));
}

function bindPan() {
  const canvas = qs("#fullGraphCanvas");
  if (!canvas) return;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;
  canvas.addEventListener("mousedown", (event) => {
    if (event.target.closest(".graph-node, .graph-edge-hit, button, a, input, select, textarea, label")) return;
    state.dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startPanX = state.panX;
    startPanY = state.panY;
    canvas.classList.add("dragging");
  });
  document.addEventListener("mousemove", (event) => {
    if (!state.dragging) return;
    state.panX = startPanX + event.clientX - startX;
    state.panY = startPanY + event.clientY - startY;
    applyTransform();
  });
  document.addEventListener("mouseup", () => {
    state.dragging = false;
    canvas.classList.remove("dragging");
  });
  canvas.addEventListener("dblclick", fitGraph);
}

renderHeader();
fillFilters();
renderGraph();
bindFilters();
bindToolbar();
bindPan();
bindModalTriggers();
requestAnimationFrame(fitGraph);
})();

(function () {
const { paginationButtons, qs, statusPill } = window.UI;

const DIRECTION_PAGE_SIZE = 4;

const state = {
  activeOutputAssetKey: "",
  directionKeyword: "",
  directionPriority: "all",
  directionStatus: "all",
  directionPage: 1,
};

const metricMockData = window.DataMetricsApi.getThemeDetailData();
const THEMES = metricMockData.themes || {};
const TRADE_DIRECTION_META = metricMockData.tradeDirectionMeta || {};
const TRADE_DIRECTION_METRICS = metricMockData.tradeDirectionMetrics || {};
const TRADE_DIRECTION_DIMENSIONS = metricMockData.tradeDirectionDimensions || {};

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function setText(id, value) {
  const node = qs(`#${id}`);
  if (node) node.textContent = value;
}

function setHref(id, value) {
  const node = qs(`#${id}`);
  if (node) node.setAttribute("href", value);
}

function currentThemeKey(params = new URLSearchParams(window.location.search)) {
  const key = params.get("theme") || params.get("system") || "trade";
  return THEMES[key] ? key : "trade";
}

function directionHref(themeKey, directionName) {
  return `metric-direction-detail.html?theme=${encodeURIComponent(themeKey)}&direction=${encodeURIComponent(directionName)}`;
}

function outputAssetHref(themeKey, directionName, assetKey) {
  return `metric-output-asset-detail.html?theme=${encodeURIComponent(themeKey)}&direction=${encodeURIComponent(directionName)}&asset=${encodeURIComponent(assetKey)}`;
}

function themeHref(themeKey) {
  return `metric-system-detail.html?theme=${encodeURIComponent(themeKey)}`;
}

function directionLogicalAssetName(direction) {
  return direction.name.replace("分析", "结果");
}

function renderRows(id, rows) {
  const node = qs(`#${id}`);
  if (!node) return;
  node.innerHTML = rows.map((row) => `
    <tr>
      ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
    </tr>
  `).join("");
}

function statusTone(value) {
  if (/通过|成功|正常|已生成|已确认|可复用/.test(value)) return "green";
  if (/待|需|风险|冲突|复核|确认/.test(value)) return "amber";
  return "blue";
}

function metricCode(name) {
  return {
    成交金额: "gmv",
    订单数: "order_count",
    客单价: "avg_order_value",
    支付成功率: "pay_success_rate",
    渠道贡献率: "channel_gmv_share",
    退款金额: "refund_amount",
    退款影响金额: "refund_amount",
    退款率: "refund_rate",
    回款金额: "payment_received_amount",
    应收余额: "ar_balance",
    回款率: "collection_rate",
    新增客户数: "new_customer_count",
    活跃客户数: "active_customer_count",
    复购率: "repurchase_rate",
    会员转化率: "member_conversion_rate",
  }[name] || name.toLowerCase().replace(/\s+/g, "_");
}

function metricDirection(name, index = 0) {
  if (/支付/.test(name)) return "支付转化分析";
  if (/退款/.test(name)) return "退款影响分析";
  if (/渠道/.test(name)) return "渠道结构变化分析";
  if (/客单价|毛利|余额|回款|复购|会员/.test(name)) return "客单价变化分析";
  return ["订单量变化分析", "经营核心分析", "结构变化分析"][index % 3];
}

function metricReuseState(name, status) {
  if (/已生成|已确认/.test(status)) return "可复用";
  if (/待复核|待确认/.test(status)) return "需人工确认";
  if (/退款|支付/.test(name)) return "相似指标待处理";
  return "新建版本";
}

function renderMetricRows(rows) {
  const node = qs("#detailMetricRows");
  if (!node) return;
  node.innerHTML = rows.map(([name, type, desc, status], index) => {
    const reuse = metricReuseState(name, status);
    const dslStatus = /待|复核|确认/.test(status) ? "DSL 待复核" : "DSL 通过";
    return `
      <tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(metricCode(name))}</td>
        <td>${escapeHtml(type)}</td>
        <td>${escapeHtml(metricDirection(name, index))}</td>
        <td>${statusPill(escapeHtml(reuse), statusTone(reuse))}</td>
        <td>${escapeHtml(desc)}</td>
        <td>${statusPill(escapeHtml(dslStatus), statusTone(dslStatus))}</td>
      </tr>
    `;
  }).join("");
}

function themeDirections(theme) {
  if (theme.name === "交易经营") {
    return [
      { name: "订单量变化分析", priority: "核心", status: "待确认", metricSet: "订单量变化指标集", metrics: 8, dimensions: 5, output: "ads_metric_order_daily", task: "task_metric_order_daily" },
      { name: "客单价变化分析", priority: "核心", status: "待确认", metricSet: "客单价变化指标集", metrics: 9, dimensions: 5, output: "ads_metric_order_daily", task: "task_metric_order_daily" },
      { name: "支付转化分析", priority: "核心", status: "待确认", metricSet: "支付转化指标集", metrics: 7, dimensions: 4, output: "ads_metric_payment_daily", task: "task_metric_payment_daily" },
      { name: "渠道结构变化分析", priority: "扩展", status: "已确认", metricSet: "渠道结构指标集", metrics: 6, dimensions: 4, output: "ads_metric_order_daily", task: "task_metric_order_daily" },
      { name: "退款影响分析", priority: "扩展", status: "待处理", metricSet: "退款影响指标集", metrics: 5, dimensions: 3, output: "ads_metric_refund_daily", task: "task_metric_refund_daily" },
    ];
  }
  return theme.setRows.map(([setName, metrics, scene, status], index) => ({
    name: setName.replace("主指标集", "分析").replace("场景标签", "分析"),
    priority: index < 2 ? "核心" : "扩展",
    status,
    metricSet: setName,
    metrics: Number(String(metrics).match(/\d+/)?.[0] || 4),
    dimensions: Math.max(3, Math.min(8, theme.dimensions - index)),
    output: index === 0 ? `${theme.outputTable}`.replace("*", "core_daily") : `${theme.outputTable}`.replace("*", `asset_${index}_daily`),
    task: `task_${theme.name}_${index + 1}`.replace(/\s+/g, "_"),
    scene,
  }));
}

function themeOutputAssets(theme) {
  if (theme.name === "交易经营") {
    return [
      {
        key: "trade_order",
        name: "ads_metric_order_daily",
        relation: "共享物理资产",
        computeMode: "离线周期计算",
        task: "task_metric_order_daily",
        directions: ["订单量变化分析", "客单价变化分析", "渠道结构变化分析"],
        logicalAssets: ["订单量变化结果", "客单价变化结果", "渠道结构变化结果"],
        sources: [["dwd_order_detail", "订单、渠道、商品"], ["dwd_payment_detail", "支付状态、支付金额"], ["dwd_refund_detail", "退款状态、退款金额"]],
        join: "订单交易宽表",
        joinDesc: "订单、支付、渠道和退款关联",
        compute: "共享经营指标计算",
        computeDesc: "订单量、客单价、渠道结构",
        outputDesc: "3 个逻辑资产共享，独立血缘和运行状态",
        sql: `-- compiled from Metric DSL: order_count, gmv, avg_order_value, channel_gmv_share
SELECT
  dt,
  channel,
  product_category,
  COUNT(DISTINCT order_id) AS order_count,
  SUM(pay_amount) AS gmv,
  SUM(pay_amount) / NULLIF(COUNT(DISTINCT order_id), 0) AS avg_order_value,
  SUM(pay_amount) / SUM(SUM(pay_amount)) OVER (PARTITION BY dt) AS channel_gmv_share
FROM dwd_order_payment_detail
WHERE pay_status = 'success'
GROUP BY dt, channel, product_category;`,
      },
      {
        key: "trade_payment",
        name: "ads_metric_payment_daily",
        relation: "独立产出",
        computeMode: "离线周期计算",
        task: "task_metric_payment_daily",
        directions: ["支付转化分析"],
        logicalAssets: ["支付转化结果"],
        sources: [["dwd_order_detail", "订单提交"], ["dwd_payment_detail", "支付状态、失败原因"]],
        join: "支付转化明细",
        joinDesc: "订单提交与支付流水关联",
        compute: "支付转化指标计算",
        computeDesc: "支付成功率、失败订单数",
        outputDesc: "支付转化分析独立产出",
        sql: `-- compiled from Metric DSL: pay_success_rate
SELECT
  dt,
  channel,
  COUNT(DISTINCT order_id) AS submitted_orders,
  COUNT(DISTINCT CASE WHEN pay_status = 'success' THEN order_id END) AS paid_orders,
  COUNT(DISTINCT CASE WHEN pay_status = 'success' THEN order_id END) / NULLIF(COUNT(DISTINCT order_id), 0) AS pay_success_rate
FROM dwd_order_payment_detail
GROUP BY dt, channel;`,
      },
      {
        key: "trade_refund",
        name: "ads_metric_refund_daily",
        relation: "独立产出",
        computeMode: "离线周期计算",
        task: "task_metric_refund_daily",
        directions: ["退款影响分析"],
        logicalAssets: ["退款影响结果"],
        sources: [["dwd_refund_detail", "退款状态、退款金额"]],
        join: "退款明细聚合",
        joinDesc: "按退款成功记录统计退款金额",
        compute: "退款影响指标计算",
        computeDesc: "退款影响金额、退款订单数",
        outputDesc: "退款影响分析独立产出",
        sql: `-- compiled from Metric DSL: refund_amount
SELECT
  dt,
  channel,
  product_category,
  COUNT(DISTINCT order_id) AS refund_order_count,
  SUM(refund_amount) AS refund_amount
FROM dwd_refund_detail
WHERE refund_status = 'success'
GROUP BY dt, channel, product_category;`,
      },
    ];
  }
  const directions = themeDirections(theme);
  return directions.slice(0, Math.min(3, directions.length)).map((direction, index) => ({
    key: `asset_${index}`,
    name: direction.output,
    relation: index === 0 && directions.length > 1 ? "共享物理资产" : "独立产出",
    computeMode: theme.computeMode,
    task: direction.task,
    directions: index === 0 && directions.length > 1 ? directions.slice(0, 2).map((item) => item.name) : [direction.name],
    logicalAssets: index === 0 && directions.length > 1 ? directions.slice(0, 2).map((item) => item.name.replace("分析", "结果")) : [direction.name.replace("分析", "结果")],
    sources: theme.dagSources,
    join: theme.dagJoin,
    joinDesc: theme.dagJoinDesc,
    compute: theme.dagCompute,
    computeDesc: theme.dagComputeDesc,
    outputDesc: theme.dagOutputDesc,
    sql: `-- compiled from Metric DSL: ${theme.name}
SELECT
  dt,
  business_key,
  COUNT(1) AS event_count,
  SUM(metric_value) AS metric_value
FROM semantic_${theme.name}_wide
GROUP BY dt, business_key;`,
  }));
}

function currentOutputAsset(theme) {
  const assets = themeOutputAssets(theme);
  let asset = assets.find((item) => item.key === state.activeOutputAssetKey);
  if (!asset) {
    state.activeOutputAssetKey = assets[0]?.key || "";
    asset = assets[0];
  }
  return asset || {};
}

function filteredDirections(theme) {
  const keyword = state.directionKeyword.trim().toLowerCase();
  return themeDirections(theme).filter((item) => {
    const text = `${item.name} ${item.priority} ${item.status} ${item.metricSet} ${item.output} ${item.task}`.toLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPriority = state.directionPriority === "all" || item.priority === state.directionPriority;
    const matchesStatus = state.directionStatus === "all" || item.status === state.directionStatus;
    return matchesKeyword && matchesPriority && matchesStatus;
  });
}

function bindDirectionFilters(theme, themeKey) {
  const search = qs("#directionSearch");
  const priority = qs("#directionPriorityFilter");
  const status = qs("#directionStatusFilter");
  const reset = qs("#resetDirectionFilters");
  if (!search || search.dataset.directionFilterBound === "true") return;
  search.dataset.directionFilterBound = "true";

  const apply = () => {
    state.directionKeyword = search.value || "";
    state.directionPriority = priority?.value || "all";
    state.directionStatus = status?.value || "all";
    state.directionPage = 1;
    renderDirectionCards(theme, themeKey);
  };

  search.addEventListener("input", apply);
  priority?.addEventListener("change", apply);
  status?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    search.value = "";
    if (priority) priority.value = "all";
    if (status) status.value = "all";
    apply();
  });
}

function renderDirectionCards(theme, themeKey = "trade") {
  const allDirections = themeDirections(theme);
  const directions = filteredDirections(theme);
  const node = qs("#detailDirectionCards");
  if (!node) return;
  const totalPages = Math.max(1, Math.ceil(directions.length / DIRECTION_PAGE_SIZE));
  if (state.directionPage > totalPages) state.directionPage = totalPages;
  const start = (state.directionPage - 1) * DIRECTION_PAGE_SIZE;
  const pagedDirections = directions.slice(start, start + DIRECTION_PAGE_SIZE);

  node.innerHTML = pagedDirections.map((item) => {
    const href = directionHref(themeKey, item.name);
    return `
    <article class="analysis-direction-card" data-direction-card data-href="${escapeHtml(href)}" role="link" tabindex="0">
      <div class="analysis-direction-head">
        ${statusPill(escapeHtml(item.priority), item.priority === "核心" ? "green" : "blue")}
        ${statusPill(escapeHtml(item.status), statusTone(item.status))}
      </div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.metricSet)}，输出到 ${escapeHtml(item.output)}。</p>
      <div class="analysis-direction-stats">
        <div><span>指标</span><strong>${escapeHtml(item.metrics)}</strong></div>
        <div><span>维度</span><strong>${escapeHtml(item.dimensions)}</strong></div>
        <div><span>计算任务</span><strong>${escapeHtml(item.task)}</strong></div>
      </div>
      <span class="analysis-direction-card-action">查看详情</span>
    </article>
  `;
  }).join("");
  const empty = qs("#directionEmptyState");
  if (empty) empty.hidden = directions.length > 0;
  node.querySelectorAll("[data-direction-card]").forEach((card) => {
    const openDetail = () => {
      window.location.href = card.dataset.href;
    };
    card.addEventListener("click", openDetail);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDetail();
    });
  });
  const from = directions.length === 0 ? 0 : start + 1;
  const to = start + pagedDirections.length;
  const summary = `共 ${directions.length} 个，当前 ${from}-${to}`;
  setText("detailDirectionSummary", `${allDirections.length} 个分析方向，核心 ${allDirections.filter((item) => item.priority === "核心").length} 个`);
  setText("directionPaginationSummary", summary);

  const controls = qs("#directionPaginationControls");
  if (!controls) return;
  controls.innerHTML = directions.length
    ? `
      <button class="page-button" data-direction-page="prev" type="button" ${state.directionPage === 1 ? "disabled" : ""}>上一页</button>
      ${paginationButtons(state.directionPage, totalPages, "data-direction-page")}
      <button class="page-button" data-direction-page="next" type="button" ${state.directionPage === totalPages ? "disabled" : ""}>下一页</button>
    `
    : "";
  controls.querySelectorAll("[data-direction-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.directionPage;
      if (target === "prev") state.directionPage = Math.max(1, state.directionPage - 1);
      else if (target === "next") state.directionPage = Math.min(totalPages, state.directionPage + 1);
      else state.directionPage = Number(target);
      renderDirectionCards(theme, themeKey);
    });
  });
}

function renderAssetMap(theme) {
  const rows = themeOutputAssets(theme);
  const node = qs("#detailAssetMapRows");
  if (!node) return;
  node.innerHTML = rows.map((asset) => `
    <tr>
      <td><strong>${escapeHtml(asset.name)}</strong></td>
      <td>${escapeHtml(asset.directions.join("、"))}</td>
      <td>${escapeHtml(asset.logicalAssets.join("、"))}</td>
      <td>${escapeHtml(asset.task)}</td>
      <td>${escapeHtml(asset.computeMode)}</td>
      <td>${statusPill(escapeHtml(asset.relation), asset.relation === "共享物理资产" ? "green" : "blue")}</td>
    </tr>
  `).join("");
  const sharedCount = rows.filter((row) => row.relation === "共享物理资产").length;
  setText("detailAssetMapSummary", sharedCount ? `${rows.length} 个物理资产，${sharedCount} 个共享` : `${rows.length} 个物理资产，方向独立`);
}

function renderOutputAssetTabs(theme) {
  const assets = themeOutputAssets(theme);
  const active = currentOutputAsset(theme);
  const node = qs("#detailOutputAssetTabs");
  if (!node) return;
  node.innerHTML = assets.map((asset) => `
    <button class="output-asset-tab ${asset.key === active.key ? "active" : ""}" data-detail-output-asset="${escapeHtml(asset.key)}" type="button">
      ${statusPill(escapeHtml(asset.relation), asset.relation === "共享物理资产" ? "green" : "blue")}
      <strong>${escapeHtml(asset.name)}</strong>
      <em>${escapeHtml(asset.directions.join("、"))}</em>
    </button>
  `).join("");
  node.querySelectorAll("[data-detail-output-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeOutputAssetKey = button.dataset.detailOutputAsset;
      renderOutputAssetTabs(theme);
      renderSelectedOutputAsset(theme);
    });
  });
}

function renderSelectedOutputAsset(theme) {
  const asset = currentOutputAsset(theme);
  setText("detailSelectedOutputAsset", asset.name);
  setText("detailSelectedOutputDirections", asset.directions?.join("、") || "-");
  setText("detailSelectedLogicalAssets", asset.logicalAssets?.join("、") || "-");
  setText("detailSelectedComputeTask", asset.task || "-");
  setText("detailDagJoin", asset.join || theme.dagJoin);
  setText("detailDagJoinDesc", asset.joinDesc || theme.dagJoinDesc);
  setText("detailDagCompute", asset.compute || theme.dagCompute);
  setText("detailDagComputeDesc", asset.computeDesc || theme.dagComputeDesc);
  setText("detailDagOutput", asset.name || theme.outputTable);
  setText("detailDagOutputDesc", asset.outputDesc || "逻辑资产独立，物理资产可共享计算");
  const sql = qs("#detailGeneratedSql");
  if (sql) sql.value = asset.sql || "";
  renderDagSources(asset.sources || theme.dagSources);
}

function renderMetricSetRows(theme) {
  const directions = themeDirections(theme);
  const node = qs("#detailSetRows");
  if (!node) return;
  node.innerHTML = directions.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.metricSet)}</strong></td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(`${item.metrics} 个`)}</td>
      <td>${escapeHtml(item.output)}</td>
      <td>${statusPill(escapeHtml(item.status), statusTone(item.status))}</td>
    </tr>
  `).join("");
}

function renderDimensionRows(rows) {
  const node = qs("#detailDimensionRows");
  if (!node) return;
  node.innerHTML = rows.map(([name, field, level, status], index) => {
    const type = /时间|日期/.test(name) ? "公共维度" : index < 2 ? "公共维度" : "方向特有维度";
    const scope = type === "公共维度" ? "全部分析方向" : metricDirection(name, index);
    return `
      <tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(field)}</td>
        <td>${statusPill(escapeHtml(type), type === "公共维度" ? "green" : "blue")}</td>
        <td>${escapeHtml(scope)} · ${escapeHtml(level)}</td>
        <td>${statusPill(escapeHtml(status), statusTone(status))}</td>
      </tr>
    `;
  }).join("");
}

function renderDslRows(theme) {
  const node = qs("#detailDslRows");
  if (!node) return;
  const derivedCount = theme.metricRows.filter(([name, type]) => type === "派生指标" || /率|客单价|占比/.test(name)).length;
  const assets = themeOutputAssets(theme);
  const rows = [
    ["Metric DSL", `${theme.metrics} 个指标定义`, "编码、业务口径、表达式、过滤条件、时间字段、粒度和测试规则已沉淀为机器协议。", "green"],
    ["聚合规则", `${derivedCount} 个比率/不可加指标`, "比率、客单价和余额类指标按可加性规则重算，不允许跨维度简单平均。", "green"],
    ["SQL 编译", `${assets.length} 个输出资产可编译`, "每个物理输出资产均可由 DSL 编译生成 SQL、DAG、字段血缘和质量测试。", "green"],
    ["冲突检测", theme.status.tone === "amber" ? "存在待处理项" : "无阻断冲突", "基于名称、业务定义、表达式、来源字段和过滤条件综合评分。", theme.status.tone === "amber" ? "amber" : "green"],
  ];
  node.innerHTML = rows.map(([label, value, desc, tone]) => `
    <div><span class="status ${tone}">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(desc)}</em></div>
  `).join("");
  setText("detailDslSummary", `${theme.metrics} 个 DSL 定义，${assets.length} 个输出资产可编译`);
}

function renderDagSourcesTo(id, items) {
  const node = qs(`#${id}`);
  if (!node) return;
  node.innerHTML = items.map(([name, desc]) => `
    <div class="dag-node source">
      <span>输入表</span>
      <strong>${escapeHtml(name)}</strong>
      <em>${escapeHtml(desc)}</em>
    </div>
  `).join("");
}

function renderDagSources(items) {
  renderDagSourcesTo("detailDagSources", items);
}

function findDirection(theme, directionName) {
  const directions = themeDirections(theme);
  return directions.find((item) => item.name === directionName) || directions[0];
}

function outputAssetsForDirection(theme, direction) {
  const assets = themeOutputAssets(theme).filter((asset) => asset.directions.includes(direction.name) || asset.name === direction.output);
  if (assets.length) return assets;
  return [{
    key: "direction_asset",
    name: direction.output,
    relation: "独立产出",
    computeMode: theme.computeMode,
    task: direction.task,
    directions: [direction.name],
    logicalAssets: [directionLogicalAssetName(direction)],
    sources: theme.dagSources,
    join: theme.dagJoin,
    joinDesc: theme.dagJoinDesc,
    compute: theme.dagCompute,
    computeDesc: theme.dagComputeDesc,
    outputDesc: `${direction.name}独立产出`,
    sql: `-- compiled from Metric DSL: ${direction.name}
SELECT
  dt,
  business_key,
  COUNT(1) AS event_count,
  SUM(metric_value) AS metric_value
FROM semantic_${theme.name}_wide
GROUP BY dt, business_key;`,
  }];
}

function directionGoal(theme, direction) {
  return TRADE_DIRECTION_META[direction.name]?.goal || `围绕${direction.name}沉淀可复用指标、维度和输出资产。`;
}

function directionBoundary(theme, direction) {
  return TRADE_DIRECTION_META[direction.name]?.boundary || `${theme.boundary}，按当前方向确认口径、时间字段和可分析维度。`;
}

function directionMetricRows(theme, direction) {
  if (theme.name === "交易经营" && TRADE_DIRECTION_METRICS[direction.name]) return TRADE_DIRECTION_METRICS[direction.name];
  const matched = theme.metricRows.filter(([name], index) => metricDirection(name, index) === direction.name);
  return matched.length ? matched : theme.metricRows.slice(0, Math.max(3, Math.min(5, direction.metrics)));
}

function directionDimensionRows(theme, direction) {
  if (theme.name === "交易经营" && TRADE_DIRECTION_DIMENSIONS[direction.name]) return TRADE_DIRECTION_DIMENSIONS[direction.name];
  return theme.dimensionRows.slice(0, Math.max(3, Math.min(5, direction.dimensions))).map(([name, field, level, status], index) => {
    const type = /时间|日期/.test(name) || index < 2 ? "公共维度" : "方向特有维度";
    return [name, field, type, status || "已确认"];
  });
}

function directionMetricSets(direction, metrics) {
  const rows = [[direction.metricSet, "主指标集", `${metrics.length} 个`, direction.output, direction.status]];
  if (direction.name === "客单价变化分析") {
    rows.push(["客单价归因指标集", "扩展指标集", "4 个", direction.output, "已确认"]);
  }
  return rows;
}

function currentDirectionAsset(assets) {
  let asset = assets.find((item) => item.key === state.activeOutputAssetKey);
  if (!asset) {
    state.activeOutputAssetKey = assets[0]?.key || "";
    asset = assets[0];
  }
  return asset || {};
}

function renderDirectionAssetRows(direction, assets) {
  const node = qs("#directionAssetMapRows");
  if (!node) return;
  node.innerHTML = assets.map((asset) => {
    const logical = asset.logicalAssets.includes(directionLogicalAssetName(direction))
      ? directionLogicalAssetName(direction)
      : asset.logicalAssets.join("、");
    return `
      <tr>
        <td><strong>${escapeHtml(asset.name)}</strong></td>
        <td>${escapeHtml(logical)}</td>
        <td>${escapeHtml(asset.task)}</td>
        <td>${escapeHtml(asset.computeMode)}</td>
        <td>${statusPill(escapeHtml(asset.relation), asset.relation === "共享物理资产" ? "green" : "blue")}</td>
        <td>${escapeHtml(asset.directions.join("、"))}</td>
      </tr>
    `;
  }).join("");
  const sharedCount = assets.filter((asset) => asset.relation === "共享物理资产").length;
  setText("directionAssetMapSummary", sharedCount ? `当前方向关联 ${assets.length} 个输出资产，含共享资产` : `当前方向关联 ${assets.length} 个输出资产`);
}

function renderDirectionOutputAssetCards(themeKey, direction, assets) {
  const node = qs("#directionOutputAssetCards");
  if (!node) return;
  node.innerHTML = assets.map((asset) => {
    const logical = asset.logicalAssets.includes(directionLogicalAssetName(direction))
      ? directionLogicalAssetName(direction)
      : asset.logicalAssets.join("、");
    const href = outputAssetHref(themeKey, direction.name, asset.key);
    return `
      <article class="output-asset-card" data-output-asset-card data-href="${escapeHtml(href)}" role="link" tabindex="0">
        <div class="analysis-direction-head">
          ${statusPill(escapeHtml(asset.relation), asset.relation === "共享物理资产" ? "green" : "blue")}
          ${statusPill(escapeHtml(asset.computeMode), "blue")}
        </div>
        <h3>${escapeHtml(asset.name)}</h3>
        <p>${escapeHtml(asset.outputDesc || `${direction.name}输出资产`)}</p>
        <div class="output-asset-card-meta">
          <div><span>逻辑资产</span><strong>${escapeHtml(logical)}</strong></div>
          <div><span>计算任务</span><strong>${escapeHtml(asset.task)}</strong></div>
          <div><span>同时承载方向</span><strong>${escapeHtml(asset.directions.join("、"))}</strong></div>
        </div>
        <span class="analysis-direction-card-action">查看资产详情</span>
      </article>
    `;
  }).join("");
  node.querySelectorAll("[data-output-asset-card]").forEach((card) => {
    const openDetail = () => {
      window.location.href = card.dataset.href;
    };
    card.addEventListener("click", openDetail);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDetail();
    });
  });
  const sharedCount = assets.filter((asset) => asset.relation === "共享物理资产").length;
  setText("directionAssetMapSummary", sharedCount ? `${assets.length} 个输出资产，含共享资产` : `${assets.length} 个输出资产`);
}

function renderDirectionOutputAssetTabs(theme, direction, assets) {
  const active = currentDirectionAsset(assets);
  const node = qs("#directionOutputAssetTabs");
  if (!node) return;
  node.innerHTML = assets.map((asset) => `
    <button class="output-asset-tab ${asset.key === active.key ? "active" : ""}" data-direction-output-asset="${escapeHtml(asset.key)}" type="button">
      ${statusPill(escapeHtml(asset.relation), asset.relation === "共享物理资产" ? "green" : "blue")}
      <strong>${escapeHtml(asset.name)}</strong>
      <em>${escapeHtml(asset.directions.join("、"))}</em>
    </button>
  `).join("");
  node.querySelectorAll("[data-direction-output-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeOutputAssetKey = button.dataset.directionOutputAsset;
      renderDirectionOutputAssetTabs(theme, direction, assets);
      renderDirectionSelectedOutputAsset(theme, direction, assets);
    });
  });
}

function renderDirectionSelectedOutputAsset(theme, direction, assets) {
  const asset = currentDirectionAsset(assets);
  const logical = asset.logicalAssets?.includes(directionLogicalAssetName(direction))
    ? directionLogicalAssetName(direction)
    : asset.logicalAssets?.join("、") || "-";
  setText("directionSelectedOutputAsset", asset.name);
  setText("directionSelectedOutputDirections", asset.directions?.join("、") || "-");
  setText("directionSelectedLogicalAssets", logical);
  setText("directionSelectedComputeTask", asset.task || "-");
  setText("directionDagJoin", asset.join || theme.dagJoin);
  setText("directionDagJoinDesc", asset.joinDesc || theme.dagJoinDesc);
  setText("directionDagCompute", asset.compute || theme.dagCompute);
  setText("directionDagComputeDesc", asset.computeDesc || theme.dagComputeDesc);
  setText("directionDagOutput", asset.name || direction.output);
  setText("directionDagOutputDesc", asset.outputDesc || "逻辑资产独立，物理资产可共享计算");
  const sql = qs("#directionGeneratedSql");
  if (sql) sql.value = asset.sql || "";
  renderDagSourcesTo("directionDagSources", asset.sources || theme.dagSources);
}

function renderDirectionMetricSetRows(rows) {
  const node = qs("#directionSetRows");
  if (!node) return;
  node.innerHTML = rows.map(([name, type, metricCount, output, status]) => `
    <tr>
      <td><strong>${escapeHtml(name)}</strong></td>
      <td>${statusPill(escapeHtml(type), type === "主指标集" ? "green" : "blue")}</td>
      <td>${escapeHtml(metricCount)}</td>
      <td>${escapeHtml(output)}</td>
      <td>${statusPill(escapeHtml(status), statusTone(status))}</td>
    </tr>
  `).join("");
}

function renderDirectionMetricRows(rows) {
  const node = qs("#directionMetricRows");
  if (!node) return;
  node.innerHTML = rows.map(([name, type, desc, status]) => {
    const reuse = metricReuseState(name, status);
    const dslStatus = /待|复核|确认|处理/.test(status) ? "DSL 待确认" : "DSL 通过";
    return `
      <tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(metricCode(name))}</td>
        <td>${escapeHtml(type)}</td>
        <td>${statusPill(escapeHtml(reuse), statusTone(reuse))}</td>
        <td>${escapeHtml(desc)}</td>
        <td>${statusPill(escapeHtml(dslStatus), statusTone(dslStatus))}</td>
      </tr>
    `;
  }).join("");
}

function renderDirectionDimensionRows(rows, direction) {
  const node = qs("#directionDimensionRows");
  if (!node) return;
  node.innerHTML = rows.map(([name, field, type, status]) => {
    const scope = type === "公共维度" ? "当前主题公共复用" : direction.name;
    return `
      <tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(field)}</td>
        <td>${statusPill(escapeHtml(type), type === "公共维度" ? "green" : "blue")}</td>
        <td>${escapeHtml(scope)}</td>
        <td>${statusPill(escapeHtml(status), statusTone(status))}</td>
      </tr>
    `;
  }).join("");
}

function renderDirectionDslRows(theme, direction, metrics, assets) {
  const node = qs("#directionDslRows");
  if (!node) return;
  const derivedCount = metrics.filter(([name, type]) => type === "派生指标" || /率|价|占比/.test(name)).length;
  const pendingCount = metrics.filter(([, , , status]) => /待|复核|确认|处理/.test(status)).length;
  const rows = [
    ["Metric DSL", `${metrics.length} 个指标定义`, "已沉淀编码、业务口径、计算表达式、过滤条件、时间字段和统计粒度。", "green"],
    ["聚合规则", `${derivedCount} 个派生/比率指标`, "比率、客单价和占比类指标按分子分母重新计算，不跨维度简单平均。", "green"],
    ["SQL 编译", `${assets.length} 个输出资产可编译`, "当前方向可由 DSL 编译生成 SQL、DAG 和字段血缘。", "green"],
    ["存量处理", pendingCount ? `${pendingCount} 个待确认项` : "全部已确认", "相似指标、口径差异和复用建议会保留在当前方向下。", pendingCount ? "amber" : "green"],
  ];
  node.innerHTML = rows.map(([label, value, desc, tone]) => `
    <div><span class="status ${tone}">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(desc)}</em></div>
  `).join("");
  setText("directionDslSummary", `${metrics.length} 个 DSL 定义，${assets.length} 个输出资产可编译`);
}

function renderDirectionDetail() {
  const params = new URLSearchParams(window.location.search);
  const themeKey = currentThemeKey(params);
  const theme = THEMES[themeKey] || THEMES.trade;
  const direction = findDirection(theme, params.get("direction"));
  const assets = outputAssetsForDirection(theme, direction);
  const metrics = directionMetricRows(theme, direction);
  const dimensions = directionDimensionRows(theme, direction);
  const metricSets = directionMetricSets(direction, metrics);
  const themeBackHref = themeHref(themeKey);
  state.activeOutputAssetKey = assets[0]?.key || "";

  document.title = `${direction.name} · Data Metrics`;
  setHref("directionThemeCrumb", themeBackHref);
  setHref("directionThemeBack", themeBackHref);

  const status = qs("#directionStatus");
  if (status) {
    status.className = `status ${statusTone(direction.status)}`;
    status.textContent = direction.status;
  }

  setText("directionTitle", direction.name);
  setText("directionSubtitle", `${theme.name} / ${direction.priority}方向。围绕当前方向查看相关输出资产、计算任务、Metric DSL、指标集、指标和维度。`);
  setText("directionMetricSetCount", metricSets.length);
  setText("directionOutputCount", assets.length);
  setText("directionMetricCount", metrics.length);
  setText("directionDimensionCount", dimensions.length);
  setText("directionTaskCount", new Set(assets.map((asset) => asset.task)).size);
  setText("directionAssetRelation", assets.some((asset) => asset.relation === "共享物理资产") ? "共享" : "独立");
  setText("directionPriority", `${direction.priority}方向`);
  setText("directionThemeName", theme.name);
  setText("directionGoal", directionGoal(theme, direction));
  setText("directionBoundary", directionBoundary(theme, direction));
  setText("directionModels", `${theme.mainModel}、${theme.relatedModels}`);
  setText("directionLogicalAssets", directionLogicalAssetName(direction));
  const sharedDirections = assets[0]?.directions?.filter((name) => name !== direction.name) || [];
  setText("directionSharedDesc", assets.some((asset) => asset.relation === "共享物理资产") && sharedDirections.length ? `与 ${sharedDirections.join("、")} 共享物理输出资产。` : "当前方向独立产出物理输出资产。");
  renderDirectionOutputAssetCards(themeKey, direction, assets);
}

function renderOutputAssetDetail() {
  const params = new URLSearchParams(window.location.search);
  const themeKey = currentThemeKey(params);
  const theme = THEMES[themeKey] || THEMES.trade;
  const direction = findDirection(theme, params.get("direction"));
  const assets = outputAssetsForDirection(theme, direction);
  const selectedAsset = assets.find((asset) => asset.key === params.get("asset")) || assets[0];
  const selectedAssets = selectedAsset ? [selectedAsset] : assets.slice(0, 1);
  const metrics = directionMetricRows(theme, direction);
  const dimensions = directionDimensionRows(theme, direction);
  const metricSets = directionMetricSets(direction, metrics);
  const themeBackHref = themeHref(themeKey);
  const directionBackHref = directionHref(themeKey, direction.name);
  state.activeOutputAssetKey = selectedAsset?.key || selectedAssets[0]?.key || "";

  document.title = `${selectedAsset?.name || "输出资产"} · Data Metrics`;
  setHref("outputThemeCrumb", themeBackHref);
  setHref("outputDirectionCrumb", directionBackHref);
  setHref("outputDirectionBack", directionBackHref);

  const relationStatus = qs("#outputAssetRelationStatus");
  if (relationStatus && selectedAsset) {
    relationStatus.className = `status ${selectedAsset.relation === "共享物理资产" ? "green" : "blue"}`;
    relationStatus.textContent = selectedAsset.relation;
  }

  const logicalForDirection = selectedAsset?.logicalAssets?.includes(directionLogicalAssetName(direction))
    ? directionLogicalAssetName(direction)
    : selectedAsset?.logicalAssets?.join("、") || directionLogicalAssetName(direction);
  const taskCount = new Set(selectedAssets.map((asset) => asset.task)).size;

  setText("outputAssetTitle", selectedAsset?.name || direction.output);
  setText("outputAssetSubtitle", `${theme.name} / ${direction.name}。查看当前输出资产的计算任务、Metric DSL、计算逻辑、指标集、指标和维度。`);
  setText("outputLogicalAssetCount", selectedAsset?.logicalAssets?.length || 1);
  setText("outputDirectionCount", selectedAsset?.directions?.length || 1);
  setText("outputMetricCount", metrics.length);
  setText("outputDimensionCount", dimensions.length);
  setText("outputTaskCount", taskCount);
  setText("outputComputeMode", selectedAsset?.computeMode || theme.computeMode);
  setText("outputAssetScope", selectedAsset?.relation || "独立产出");
  setText("outputThemeName", theme.name);
  setText("outputDirectionName", direction.name);
  setText("outputPhysicalAsset", selectedAsset?.name || direction.output);
  setText("outputLogicalAssets", logicalForDirection);
  setText("outputComputeTask", selectedAsset?.task || direction.task);
  setText("outputAllDirections", selectedAsset?.directions?.join("、") || direction.name);
  setText("directionSetSummary", `${metricSets.length} 个指标集，当前资产关联`);
  setText("directionMetricSummary", `${metrics.length} 个指标`);
  setText("directionDimensionSummary", `${dimensions.length} 个维度`);

  renderDirectionAssetRows(direction, selectedAssets);
  renderDirectionDslRows(theme, direction, metrics, selectedAssets);
  renderDirectionSelectedOutputAsset(theme, direction, selectedAssets);
  renderDirectionMetricSetRows(metricSets);
  renderDirectionMetricRows(metrics);
  renderDirectionDimensionRows(dimensions, direction);
}

function renderDetail() {
  const params = new URLSearchParams(window.location.search);
  const themeKey = currentThemeKey(params);
  const theme = THEMES[themeKey] || THEMES.trade;
  state.activeOutputAssetKey = "";
  document.title = `${theme.name} · Data Metrics`;
  const directions = themeDirections(theme);
  const outputAssets = themeOutputAssets(theme);

  const status = qs("#detailStatus");
  if (status) {
    status.className = `status ${theme.status.tone}`;
    status.textContent = theme.status.label;
  }

  setText("detailTitle", theme.name);
  setText("detailSubtitle", theme.subtitle);
  setText("detailDirectionCount", directions.length);
  setText("detailSetCount", directions.length);
  setText("detailOutputCount", outputAssets.length);
  setText("detailMetricCount", theme.metrics);
  setText("detailDimensionCount", theme.dimensions);
  setText("detailTaskCount", outputAssets.length);
  setText("detailBoundary", theme.boundary);
  setText("detailRelatedThemes", theme.name === "交易经营" ? "营销增长、供应链履约" : "交易经营");
  setText("detailMainModel", theme.mainModel);
  setText("detailRelatedModels", theme.relatedModels);
  setText("detailCreateMode", theme.name === "交易经营" ? "按问题生成" : "按问题生成 / 资产补充");
  setText("detailOwner", theme.owner);
  setText("detailCreatedAt", theme.createdAt);
  setText("detailUpdatedAt", theme.updatedAt);
  setText("detailSetSummary", `${directions.length} 个主指标集，随分析方向自动沉淀`);
  setText("detailMetricSummary", `${theme.metricRows.length} 个核心指标`);
  setText("detailDimensionSummary", `${theme.dimensionRows.length} 个展示项，公共维度优先复用`);

  bindDirectionFilters(theme, themeKey);
  renderDirectionCards(theme, themeKey);
  renderMetricSetRows(theme);
  renderMetricRows(theme.metricRows);
  renderDimensionRows(theme.dimensionRows);
  renderAssetMap(theme);
  renderOutputAssetTabs(theme);
  renderSelectedOutputAsset(theme);
  renderDslRows(theme);
}

if (qs("#outputAssetDetailPage")) renderOutputAssetDetail();
else if (qs("#directionDetailPage")) renderDirectionDetail();
else renderDetail();
})();

(function () {
const { bindModalTriggers, paginationButtons, qs, qsa, statusPill } = window.UI;

const PROBLEM_TOTAL_STEPS = 8;
const PROBLEM_MODEL_PAGE_SIZE = 4;
const BUSINESS_THEME_PAGE_SIZE = 3;
const TOPIC_PAGE_SIZE = 4;
const DIMENSION_PAGE_SIZE = 4;
const METRIC_PAGE_SIZE = 4;
const PROBLEM_OFFLINE_COMPUTE_MODE = "离线周期计算";
const PROBLEM_QUERY_COMPUTE_MODE = "查询时计算";
const PROBLEM_OFFLINE_OUTPUT_TABLE = "ads_metric_order_daily";
const PROBLEM_QUERY_OUTPUT_ASSET = "vw_metric_deal_decline_query";
const state = {
  problemStep: 1,
  problemMaxStep: 1,
  problemPrimaryModel: "订单交易库",
  problemRecommendedModelPage: 1,
  problemRecommendedModelKeyword: "",
  problemRecommendedModelDomain: "all",
  problemRecommendedModelStatus: "all",
  problemOtherModelPage: 1,
  problemOtherModelKeyword: "",
  problemOtherModelDomain: "all",
  problemOtherModelStatus: "all",
  problemThemePage: 1,
  problemThemeKeyword: "",
  problemThemeDomain: "all",
  problemTopicPage: 1,
  problemTopicKeyword: "",
  problemTopicDomain: "all",
  problemTopicPriority: "all",
  problemDimensionPage: 1,
  problemDimensionKeyword: "",
  problemDimensionType: "all",
  problemDimensionStatus: "all",
  problemMetricPage: 1,
  problemMetricKeyword: "",
  problemMetricType: "all",
  problemMetricStatus: "all",
  sharedAssetAccepted: true,
  extensionMetricSetAccepted: true,
  metricConflictResolved: false,
  activeOutputAssetKey: "orderShared",
};

const metricMockData = window.DataMetricsApi.getGenerationData();
const problemModelPool = metricMockData.problemModelPool || [];
const problemDimensionDetails = metricMockData.problemDimensionDetails || {};
const problemMetricDetails = metricMockData.problemMetricDetails || {};
const problemMetricReuseCandidates = metricMockData.problemMetricReuseCandidates || {};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function metricTypeLabel(type) {
  return {
    atomic: "原子指标",
    derived: "派生指标",
    composite: "复合指标",
    comparison: "比较指标",
    diagnostic: "诊断指标",
    threshold: "运营阈值指标",
    warning: "运营阈值指标",
  }[type] || "原子指标";
}

function metricTypeValue(label) {
  return {
    原子指标: "atomic",
    派生指标: "derived",
    复合指标: "composite",
    比较指标: "comparison",
    诊断指标: "diagnostic",
    运营阈值指标: "threshold",
    预警指标: "threshold",
  }[label] || "atomic";
}

function recommendationTone(value) {
  return {
    可复用: "green",
    建议新建: "blue",
    用户补充: "green",
    口径需确认: "amber",
    相似指标: "amber",
    重复指标: "amber",
    口径冲突: "amber",
  }[value] || "blue";
}

function itemValue(detail, label) {
  const item = detail.items.find(([name]) => name === label);
  return item ? item[1] : "";
}

function additivityTone(value) {
  if (value === "完全可加") return "green";
  if (value === "半可加") return "amber";
  if (value === "不可加") return "red";
  return "blue";
}

function problemReuseActionLabel(action) {
  return {
    reuse: "复用已有指标",
    merge: "合并补充",
    version: "基于已有新建版本",
    manual: "人工确认",
    create: "新建指标",
  }[action] || "新建指标";
}

function problemReuseActionDefault(key, candidates) {
  const saved = itemValue(problemMetricDetails[key] || { items: [] }, "存量处理方式");
  if (saved) return saved;
  const first = candidates[0];
  return first?.action || "create";
}

function syncProblemMetricReuseHint() {
  const action = qs("#problemMetricReuseAction")?.value || "create";
  const select = qs("#problemMetricReuseSelect");
  const option = select?.selectedOptions?.[0];
  const hint = qs("#problemMetricReuseHint");
  if (!hint) return;
  if (action === "create" || !option?.value) {
    hint.textContent = "本指标将作为新指标进入 DSL 校验和生成确认，不复用存量指标。";
    return;
  }
  hint.textContent = `${problemReuseActionLabel(action)}：${option.textContent.trim()}。${option.dataset.desc || ""}`;
}

function renderProblemMetricConflictCheck() {
  const status = qs("#problemMetricConflictStatus");
  const desc = qs("#problemMetricConflictDesc");
  const action = qs("#resolveProblemMetricConflict");
  const detail = problemMetricDetails.refundImpact;
  if (!detail) {
    state.metricConflictResolved = true;
    if (status) {
      status.className = "status green";
      status.textContent = "已处理";
    }
    if (desc) desc.textContent = "相似指标已随推荐指标移除，本次生成不再生成退款影响金额。";
    if (action) action.hidden = true;
    return;
  }
  const reuseAction = itemValue(detail, "存量处理方式");
  const reuseMetric = itemValue(detail, "选择存量指标");
  const resolved = Boolean(state.metricConflictResolved || reuseAction);
  state.metricConflictResolved = resolved;
  if (action) action.hidden = false;
  if (status) {
    status.className = `status ${resolved ? "green" : "amber"}`;
    status.textContent = resolved ? "已处理" : "待处理";
  }
  if (desc) {
    const metricText = reuseAction && reuseAction !== "create" && reuseMetric ? `：${reuseMetric}` : "";
    desc.textContent = resolved
      ? `已选择${problemReuseActionLabel(reuseAction || "create")}${metricText}。相似指标处理结果会写入生成确认。`
      : "退款影响金额与存量退款金额相似度 78%，请先选择复用、合并补充、基于已有新建版本或新建指标。";
  }
  if (action) action.textContent = resolved ? "查看处理结果" : "去处理";
}

function openProblemMetricConflictResolution() {
  state.problemMetricKeyword = "";
  state.problemMetricType = "all";
  state.problemMetricStatus = "all";
  state.problemMetricPage = Math.max(1, Math.ceil(qsa("[data-problem-metric-detail]").length / METRIC_PAGE_SIZE));
  const search = qs("#problemMetricSearch");
  const type = qs("#problemMetricTypeFilter");
  const status = qs("#problemMetricStatusFilter");
  if (search) search.value = "";
  if (type) type.value = "all";
  if (status) status.value = "all";
  setProblemStep(6);
  renderProblemMetricSelector();
  setTimeout(() => openProblemMetricDetailModal("refundImpact"), 0);
}

function metricDslPreview(detail) {
  const code = itemValue(detail, "指标编码") || detail.title;
  const type = metricTypeValue(itemValue(detail, "指标类型"));
  const formula = itemValue(detail, "计算公式") || "待补充";
  const filters = (itemValue(detail, "过滤条件") || "待补充")
    .split(/;|；|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
  const dimensions = (itemValue(detail, "可用维度") || "待确认")
    .split(/、|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
  const grain = (itemValue(detail, "统计粒度") || "date")
    .split(/,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
  const dependencies = (itemValue(detail, "派生依赖") || "无")
    .split(/,|，|、/)
    .map((item) => item.trim())
    .filter((item) => item && item !== "无");
  return [
    "metric:",
    `  name: ${detail.title}`,
    `  code: ${code}`,
    `  type: ${type}`,
    `  business_definition: ${itemValue(detail, "业务定义") || "待补充"}`,
    `  semantic_model: ${itemValue(detail, "语义模型") || "order_payment"}`,
    "  measure:",
    `    expr: ${formula}`,
    `    agg: ${itemValue(detail, "默认聚合") || "sum"}`,
    "  filters:",
    ...(filters.length ? filters.map((filter) => `    - ${filter}`) : ["    - 待补充"]),
    `  time_dimension: ${itemValue(detail, "时间口径") || "待补充"}`,
    "  grain:",
    ...(grain.length ? grain.map((item) => `    - ${item}`) : ["    - date"]),
    "  available_dimensions:",
    ...(dimensions.length ? dimensions.map((item) => `    - ${item}`) : ["    - 待确认"]),
    `  additive_type: ${itemValue(detail, "可加性") || "待评估"}`,
    `  default_aggregation: ${itemValue(detail, "默认聚合") || "sum"}`,
    `  time_aggregation: ${itemValue(detail, "时间聚合") || "sum_by_day"}`,
    "  derived_from:",
    ...(dependencies.length ? dependencies.map((item) => `    - ${item}`) : ["    - []"]),
    "  tests:",
    "    - fields_exist",
    "    - aggregation_rule_valid",
    "    - sql_compile"
  ].join("\n");
}

function checkedValues(name) {
  return qsa(`input[name="${name}"]:checked`).map((item) => item.value);
}

function selectedRadioValue(name) {
  return qs(`input[name="${name}"]:checked`)?.value || "";
}

function selectedOptionText(selector, fallback = "") {
  const select = qs(selector);
  return select?.selectedOptions?.[0]?.textContent.trim() || fallback;
}

function scheduleDayText(value) {
  return value === "last" ? "月末" : `${value} 日`;
}

function buildProblemScheduleConfig() {
  const idPrefix = "problem";
  const frequency = qs(`#${idPrefix}ScheduleFrequency`)?.value || "daily";
  const frequencyLabel = selectedOptionText(`#${idPrefix}ScheduleFrequency`, "每日");

  if (frequency === "yearly") {
    const month = qs(`#${idPrefix}ScheduleYearMonth`)?.value || "1";
    const day = qs(`#${idPrefix}ScheduleYearDay`)?.value || "1";
    const time = qs(`#${idPrefix}ScheduleYearTime`)?.value || "03:00";
    const dateText = day === "last" ? `${month} 月末` : `${month} 月 ${day} 日`;
    return { frequency, frequencyLabel, month, day, time, summary: `每年 ${dateText} ${time} 运行` };
  }

  if (frequency === "monthly") {
    const day = qs(`#${idPrefix}ScheduleMonthDay`)?.value || "1";
    const time = qs(`#${idPrefix}ScheduleMonthTime`)?.value || "03:00";
    return { frequency, frequencyLabel, day, time, summary: `每月 ${scheduleDayText(day)} ${time} 运行` };
  }

  if (frequency === "weekly") {
    const weekday = qs(`#${idPrefix}ScheduleWeekday`)?.value || "一";
    const time = qs(`#${idPrefix}ScheduleWeekTime`)?.value || "03:00";
    return { frequency, frequencyLabel, weekday, time, summary: `每周${weekday} ${time} 运行` };
  }

  if (frequency === "hourly") {
    const minute = qs(`#${idPrefix}ScheduleHourMinute`)?.value || "0";
    return { frequency, frequencyLabel, minute, summary: `每小时第 ${minute} 分钟运行` };
  }

  if (frequency === "minutely") {
    const interval = qs(`#${idPrefix}ScheduleMinuteInterval`)?.value || "5";
    return { frequency, frequencyLabel, interval, summary: `每 ${interval} 分钟运行一次` };
  }

  const time = qs(`#${idPrefix}ScheduleDayTime`)?.value || "02:00";
  return { frequency: "daily", frequencyLabel: "每日", time, summary: `每天 ${time} 运行` };
}

function updateProblemSchedulePanels() {
  const frequency = qs("#problemScheduleFrequency")?.value || "daily";
  qsa("[data-problem-schedule-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.problemSchedulePanel !== frequency;
  });
  const preview = qs("#problemSchedulePreview");
  if (preview) preview.textContent = buildProblemScheduleConfig().summary;
}

function isProblemQueryComputeMode(mode = selectedRadioValue("problemComputeMode")) {
  return mode === PROBLEM_QUERY_COMPUTE_MODE;
}

function problemOutputAssetDefinitions() {
  const sharedOrderAsset = {
    key: "orderShared",
    name: "ads_metric_order_daily",
    relation: "共享物理资产",
    tone: "green",
    task: "task_metric_order_daily",
    taskLabel: "共享计算任务",
    directions: ["订单量变化分析", "客单价变化分析", "渠道结构变化分析"],
    logicalAssets: ["订单量变化结果", "客单价变化结果", "渠道结构变化结果"],
    metricSets: ["订单量变化指标集", "客单价变化指标集", "渠道结构指标集"],
    sources: [
      ["输入表", "dwd_order_detail", "订单、渠道、商品"],
      ["输入表", "dwd_payment_detail", "支付状态、支付金额"],
      ["输入表", "dwd_refund_detail", "退款状态、退款金额"],
    ],
    processName: "订单交易宽表",
    processDesc: "订单、支付、渠道和退款关联",
    metricDesc: "订单量、客单价、渠道结构",
    outputDesc: "3 个逻辑资产共享，独立血缘和监控",
    sql: `-- compiled from Metric DSL: order_count, gmv, avg_order_value, channel_gmv_share
SELECT
  dt,
  channel,
  product_category,
  COUNT(DISTINCT order_id) AS order_count,
  COUNT(DISTINCT customer_id) AS order_user_count,
  SUM(pay_amount) AS gmv,
  SUM(pay_amount) / NULLIF(COUNT(DISTINCT order_id), 0) AS avg_order_value,
  SUM(pay_amount) / SUM(SUM(pay_amount)) OVER (PARTITION BY dt) AS channel_gmv_share
FROM dwd_order_payment_detail
WHERE pay_status = 'success'
GROUP BY dt, channel, product_category;`,
  };

  const independentOrderAssets = [
    {
      key: "orderVolume",
      name: "ads_metric_order_volume_daily",
      relation: "独立产出",
      tone: "blue",
      task: "task_metric_order_volume_daily",
      taskLabel: "计算任务",
      directions: ["订单量变化分析"],
      logicalAssets: ["订单量变化结果"],
      metricSets: ["订单量变化指标集"],
      sources: [["输入表", "dwd_order_detail", "订单、渠道、商品"]],
      processName: "订单明细聚合",
      processDesc: "按日期、渠道和商品类目统计订单量",
      metricDesc: "订单数、下单用户数",
      outputDesc: "订单量变化分析独立产出",
      sql: `-- compiled from Metric DSL: order_count
SELECT
  dt,
  channel,
  product_category,
  COUNT(DISTINCT order_id) AS order_count,
  COUNT(DISTINCT customer_id) AS order_user_count
FROM dwd_order_detail
WHERE order_status != 'cancelled'
GROUP BY dt, channel, product_category;`,
    },
    {
      key: "aov",
      name: "ads_metric_aov_daily",
      relation: "独立产出",
      tone: "blue",
      task: "task_metric_aov_daily",
      taskLabel: "计算任务",
      directions: ["客单价变化分析"],
      logicalAssets: ["客单价变化结果"],
      metricSets: ["客单价变化指标集", "客单价归因指标集"],
      sources: [
        ["输入表", "dwd_order_detail", "订单、商品"],
        ["输入表", "dwd_payment_detail", "支付金额"],
      ],
      processName: "订单支付聚合",
      processDesc: "订单与支付按订单号关联后计算客单价",
      metricDesc: "成交金额、订单数、客单价",
      outputDesc: "客单价变化分析独立产出",
      sql: `-- compiled from Metric DSL: avg_order_value
SELECT
  dt,
  channel,
  product_category,
  SUM(pay_amount) AS gmv,
  COUNT(DISTINCT order_id) AS order_count,
  SUM(pay_amount) / NULLIF(COUNT(DISTINCT order_id), 0) AS avg_order_value
FROM dwd_order_payment_detail
WHERE pay_status = 'success'
GROUP BY dt, channel, product_category;`,
    },
    {
      key: "channel",
      name: "ads_metric_channel_mix_daily",
      relation: "独立产出",
      tone: "blue",
      task: "task_metric_channel_mix_daily",
      taskLabel: "计算任务",
      directions: ["渠道结构变化分析"],
      logicalAssets: ["渠道结构变化结果"],
      metricSets: ["渠道结构指标集"],
      sources: [
        ["输入表", "dwd_order_detail", "订单、渠道"],
        ["输入表", "dim_channel", "渠道层级、渠道类型"],
      ],
      processName: "渠道结构聚合",
      processDesc: "按渠道层级统计成交贡献和订单占比",
      metricDesc: "渠道成交贡献率、渠道订单占比",
      outputDesc: "渠道结构变化分析独立产出",
      sql: `-- compiled from Metric DSL: channel_gmv_share
SELECT
  dt,
  channel,
  channel_type,
  SUM(pay_amount) AS channel_gmv,
  SUM(pay_amount) / SUM(SUM(pay_amount)) OVER (PARTITION BY dt) AS channel_gmv_share
FROM dwd_order_payment_detail
WHERE pay_status = 'success'
GROUP BY dt, channel, channel_type;`,
    },
  ];

  const paymentAsset = {
    key: "payment",
    name: "ads_metric_payment_daily",
    relation: "独立产出",
    tone: "blue",
    task: "task_metric_payment_daily",
    taskLabel: "计算任务",
    directions: ["支付转化分析"],
    logicalAssets: ["支付转化结果"],
    metricSets: ["支付转化指标集"],
    sources: [
      ["输入表", "dwd_order_detail", "订单提交"],
      ["输入表", "dwd_payment_detail", "支付状态、失败原因"],
    ],
    processName: "支付转化明细",
    processDesc: "订单提交与支付流水关联，保留失败原因",
    metricDesc: "支付成功率、支付失败数",
    outputDesc: "支付转化分析独立产出",
    sql: `-- compiled from Metric DSL: pay_success_rate
SELECT
  dt,
  channel,
  COUNT(DISTINCT order_id) AS submitted_orders,
  COUNT(DISTINCT CASE WHEN pay_status = 'success' THEN order_id END) AS paid_orders,
  COUNT(DISTINCT CASE WHEN pay_status = 'success' THEN order_id END)
    / NULLIF(COUNT(DISTINCT order_id), 0) AS pay_success_rate
FROM dwd_order_payment_detail
GROUP BY dt, channel;`,
  };

  const refundAsset = {
    key: "refund",
    name: "ads_metric_refund_daily",
    relation: "独立产出",
    tone: "blue",
    task: "task_metric_refund_daily",
    taskLabel: "计算任务",
    directions: ["退款影响分析"],
    logicalAssets: ["退款影响结果"],
    metricSets: ["退款影响指标集"],
    sources: [["输入表", "dwd_refund_detail", "退款状态、退款金额"]],
    processName: "退款明细聚合",
    processDesc: "按退款成功记录统计退款金额和退款订单数",
    metricDesc: "退款影响金额、退款订单数",
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
  };

  return state.sharedAssetAccepted
    ? [sharedOrderAsset, paymentAsset, refundAsset]
    : [...independentOrderAssets, paymentAsset, refundAsset];
}

function currentProblemOutputAsset() {
  const assets = problemOutputAssetDefinitions();
  let asset = assets.find((item) => item.key === state.activeOutputAssetKey);
  if (!asset) {
    state.activeOutputAssetKey = assets[0]?.key || "";
    asset = assets[0];
  }
  return asset || {};
}

function problemComputeDisplayState() {
  const computeMode = selectedRadioValue("problemComputeMode") || PROBLEM_OFFLINE_COMPUTE_MODE;
  const isQuery = isProblemQueryComputeMode(computeMode);
  const scheduleConfig = buildProblemScheduleConfig();
  const activeAsset = currentProblemOutputAsset();
  const outputAsset = activeAsset.name || PROBLEM_OFFLINE_OUTPUT_TABLE;
  return {
    computeMode,
    isQuery,
    scheduleCycle: isQuery ? "无需任务调度" : scheduleConfig.summary,
    scheduleConfig: isQuery ? null : scheduleConfig,
    retryPolicy: isQuery ? "无需离线任务重试" : qs("#problemRetryPolicy")?.value || "失败后重试 3 次",
    outputAsset: isQuery ? PROBLEM_QUERY_OUTPUT_ASSET : outputAsset,
    outputLabel: isQuery ? "查询视图/语义服务" : activeAsset.relation || "物理输出资产",
    outputHint: isQuery
    ? "查询时计算会生成语义查询视图，不生成离线结果表，适合低频探索和实时口径校验。"
      : `${activeAsset.name || "当前输出资产"} 覆盖 ${activeAsset.directions?.join("、") || "当前分析方向"}，系统会保留对应指标集、血缘、权限和业务说明。`,
    dagOutputName: isQuery ? "成交下降语义查询视图" : outputAsset,
    dagOutputDesc: isQuery ? "查询视图、指标定义、计算配置" : activeAsset.outputDesc || "当前输出资产",
  };
}

function renderProblemOutputAssetDetail() {
  const asset = currentProblemOutputAsset();
  const display = problemComputeDisplayState();
  const tabs = qs("#problemOutputAssetTabs");
  const count = qs("#problemOutputAssetCount");
  const assetName = display.isQuery ? PROBLEM_QUERY_OUTPUT_ASSET : asset.name;
  const outputInput = qs("#problemOutputTable");
  const directions = qs("#problemOutputAssetDirections");
  const logicalAssets = qs("#problemOutputAssetLogical");
  const metricSets = qs("#problemOutputAssetMetricSets");
  const task = qs("#problemOutputAssetTask");
  const sources = qs("#problemDagSources");
  const processName = qs("#problemDagProcessName");
  const processDesc = qs("#problemDagProcessDesc");
  const computeLabel = qs("#problemDagComputeLabel");
  const computeTask = qs("#problemDagComputeTask");
  const computeDesc = qs("#problemDagComputeDesc");
  const outputName = qs("#problemDagOutputAssetName");
  const outputDesc = qs("#problemDagOutputAssetDesc");
  const sql = qs("#problemGeneratedSql");
  const assets = problemOutputAssetDefinitions();

  if (tabs) {
    tabs.innerHTML = assets.map((item) => `
      <button class="output-asset-tab ${item.key === asset.key ? "active" : ""}" data-output-asset-key="${escapeHtml(item.key)}" type="button">
        <span class="status ${escapeHtml(item.tone)}">${escapeHtml(item.relation)}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <em>${escapeHtml(item.directions.join("、"))}</em>
      </button>
    `).join("");
    qsa("[data-output-asset-key]", tabs).forEach((button) => {
      button.addEventListener("click", () => {
        state.activeOutputAssetKey = button.dataset.outputAssetKey;
        renderProblemOutputAssetDetail();
        renderProblemSummary();
      });
    });
  }

  if (count) count.textContent = `当前 ${assets.length} 个物理输出资产`;
  if (outputInput) outputInput.value = assetName || "";
  if (directions) directions.textContent = asset.directions?.join("、") || "-";
  if (logicalAssets) logicalAssets.textContent = asset.logicalAssets?.join("、") || "-";
  if (metricSets) metricSets.textContent = asset.metricSets?.join("、") || "-";
  if (task) task.textContent = display.isQuery ? "query_metric_deal_decline" : asset.task || "-";

  if (sources) {
    sources.innerHTML = (asset.sources || []).map(([label, name, desc]) => `
      <div class="dag-node source"><span>${escapeHtml(label)}</span><strong>${escapeHtml(name)}</strong><em>${escapeHtml(desc)}</em></div>
    `).join("");
  }
  if (processName) processName.textContent = display.isQuery ? "语义查询编译" : asset.processName || "-";
  if (processDesc) processDesc.textContent = display.isQuery ? "按用户查询动态生成 SQL，不落离线结果表" : asset.processDesc || "-";
  if (computeLabel) computeLabel.textContent = display.isQuery ? "查询编译任务" : asset.taskLabel || "计算任务";
  if (computeTask) computeTask.textContent = display.isQuery ? "query_metric_deal_decline" : asset.task || "-";
  if (computeDesc) computeDesc.textContent = display.isQuery ? "查询视图、语义服务、API" : asset.metricDesc || "-";
  if (outputName) outputName.textContent = assetName || "-";
  if (outputDesc) outputDesc.textContent = display.dagOutputDesc;
  if (sql) sql.value = display.isQuery
    ? `-- query-time compiled from Metric DSL: ${asset.metricDesc || "metrics"}
SELECT *
FROM semantic_metric_query(
  asset => '${asset.name || "metric_asset"}',
  dimensions => '${asset.directions?.join(", ") || "current_direction"}',
  filters => '按请求参数动态下推'
);`
    : asset.sql || "";
}

function syncProblemComputeMode() {
  const display = problemComputeDisplayState();
  const scheduleFields = qs("#problemScheduleFields");
  const scheduleHint = qs("#problemQueryScheduleHint");
  const scheduleBlock = qs("#problemScheduleBlock");
  const outputLabel = qs("#problemOutputAssetLabel");
  const outputHint = qs("#problemOutputAssetHint");

  if (scheduleFields) scheduleFields.hidden = display.isQuery;
  if (scheduleHint) scheduleHint.hidden = !display.isQuery;
  if (scheduleBlock) scheduleBlock.classList.toggle("is-query-compute", display.isQuery);
  if (outputLabel) outputLabel.textContent = display.outputLabel;
  if (outputHint) outputHint.textContent = display.outputHint;
  updateProblemSchedulePanels();
  renderProblemOutputAssetDetail();
  renderProblemSummary();
}

function syncProblemScheduleFrequency() {
  updateProblemSchedulePanels();
  renderProblemSummary();
}

function necessityTone(value) {
  return {
    高: "green",
    中: "amber",
    低: "blue",
    用户补充: "green",
  }[value] || "blue";
}

function inferProblemDimensionType(name, field, desc) {
  const text = `${name} ${field} ${desc}`.toLowerCase();
  if (/time|date|day|month|year|时间|日期|日|月|年|周期/.test(text)) return "time";
  if (/province|city|region|area|district|store|门店|地区|区域|省|市|大区/.test(text)) return "geo";
  if (/channel|source|渠道|来源|小程序|官网|app/.test(text)) return "channel";
  if (/product|sku|category|goods|商品|类目|品类/.test(text)) return "product";
  return "customer";
}

function problemDimensionState(row) {
  return row.dataset.problemDimensionState || "pending";
}

function problemDimensionStatusMarkup(stateValue) {
  const [label, tone] = {
    pending: ["待确认", "blue"],
    confirm: ["已确认", "green"],
  }[stateValue] || ["待确认", "blue"];
  return statusPill(label, tone);
}

function setDetailItem(detail, label, value) {
  const item = detail.items.find(([name]) => name === label);
  if (item) item[1] = value;
  else detail.items.push([label, value]);
}

function openModalById(id) {
  qs(`#${id}`)?.classList.add("open");
}

function closeModalById(id) {
  qs(`#${id}`)?.classList.remove("open");
}

function problemDimensionRowByKey(key) {
  return qs(`[data-problem-dimension-detail="${key}"]`);
}

function fillProblemDimensionDetailModal(key) {
  const detail = problemDimensionDetails[key];
  const modal = qs("#problemDimensionDetailModal");
  if (!detail || !modal) return;
  modal.dataset.problemDimensionKey = key;
  const title = qs("#problemDimensionDetailModalTitle");
  if (title) title.textContent = `维度详情 - ${detail.title}`;
  qs("#problemDimensionModalTitleInput").value = detail.title;
  qs("#problemDimensionModalFieldText").textContent = itemValue(detail, "来源字段");
  qs("#problemDimensionModalLevelInput").value = itemValue(detail, "维度层级");
  qs("#problemDimensionModalNecessityText").textContent = itemValue(detail, "必要程度") || "中";
  qs("#problemDimensionModalDescInput").value = itemValue(detail, "业务说明");
  qs("#problemDimensionModalTopicText").textContent = itemValue(detail, "适用分析方向");
  qs("#problemDimensionModalReasonText").textContent = itemValue(detail, "推荐原因");
}

function openProblemDimensionDetailModal(key) {
  if (!problemDimensionDetails[key]) return;
  fillProblemDimensionDetailModal(key);
  qsa("[data-problem-dimension-detail]").forEach((row) => row.classList.toggle("active", row.dataset.problemDimensionDetail === key));
  openModalById("problemDimensionDetailModal");
}

function filteredProblemDimensionRows() {
  const keyword = state.problemDimensionKeyword.trim().toLowerCase();
  return qsa("[data-problem-dimension-detail]").filter((row) => {
    const text = `${row.dataset.problemDimensionKeywords || ""} ${row.textContent || ""}`.toLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesType = state.problemDimensionType === "all" || row.dataset.problemDimensionType === state.problemDimensionType;
    const matchesStatus = state.problemDimensionStatus === "all" || problemDimensionState(row) === state.problemDimensionStatus;
    return matchesKeyword && matchesType && matchesStatus;
  });
}

function renderProblemDimensionSelector() {
  const rows = filteredProblemDimensionRows();
  const totalPages = Math.max(1, Math.ceil(rows.length / DIMENSION_PAGE_SIZE));
  if (state.problemDimensionPage > totalPages) state.problemDimensionPage = totalPages;

  const start = (state.problemDimensionPage - 1) * DIMENSION_PAGE_SIZE;
  const pagedRows = rows.slice(start, start + DIMENSION_PAGE_SIZE);
  qsa("[data-problem-dimension-detail]").forEach((row) => {
    row.hidden = !pagedRows.includes(row);
  });

  const empty = qs("#problemDimensionEmptyState");
  if (empty) empty.hidden = rows.length > 0;

  const summary = qs("#problemDimensionListSummary");
  if (summary) {
    const from = rows.length === 0 ? 0 : start + 1;
    const to = start + pagedRows.length;
    summary.textContent = `每页 ${DIMENSION_PAGE_SIZE} 条，共 ${rows.length} 条，当前 ${from}-${to}`;
  }

  const controls = qs("#problemDimensionPaginationControls");
  if (controls) {
    controls.innerHTML = rows.length
      ? `
        <button class="page-button" data-problem-dimension-page="prev" type="button" ${state.problemDimensionPage === 1 ? "disabled" : ""}>上一页</button>
        ${paginationButtons(state.problemDimensionPage, totalPages, "data-problem-dimension-page")}
        <button class="page-button" data-problem-dimension-page="next" type="button" ${state.problemDimensionPage === totalPages ? "disabled" : ""}>下一页</button>
      `
      : "";
    controls.querySelectorAll("[data-problem-dimension-page]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.problemDimensionPage;
        if (target === "prev") state.problemDimensionPage = Math.max(1, state.problemDimensionPage - 1);
        else if (target === "next") state.problemDimensionPage = Math.min(totalPages, state.problemDimensionPage + 1);
        else state.problemDimensionPage = Number(target);
        renderProblemDimensionSelector();
      });
    });
  }
}

function updateProblemDimensionRow(row, detail) {
  const title = qs("[data-problem-dimension-title]", row);
  const field = qs("[data-problem-dimension-field]", row);
  const level = qs("[data-problem-dimension-level]", row);
  const necessity = qs("[data-problem-dimension-necessity]", row);
  const reason = qs("[data-problem-dimension-reason]", row);
  const checkbox = qs('input[name="problemDimension"]', row);
  const necessityValue = itemValue(detail, "必要程度") || "中";
  if (title) title.textContent = detail.title;
  if (field) field.textContent = itemValue(detail, "来源字段");
  if (level) level.textContent = itemValue(detail, "维度层级");
  if (necessity) necessity.innerHTML = statusPill(necessityValue, necessityTone(necessityValue));
  if (reason) reason.textContent = itemValue(detail, "推荐原因");
  if (checkbox) checkbox.value = detail.title;
  row.dataset.problemDimensionKeywords = `${detail.title} ${itemValue(detail, "来源字段")} ${itemValue(detail, "维度层级")} ${itemValue(detail, "必要程度")} ${itemValue(detail, "业务说明")} ${itemValue(detail, "推荐原因")}`;
}

function applyProblemDimensionState(row, action) {
  const nextState = action;
  row.dataset.problemDimensionState = nextState;
  const checkbox = qs('input[name="problemDimension"]', row);
  if (checkbox) checkbox.checked = nextState === "confirm";
  const status = qs("[data-problem-dimension-status]", row);
  if (status) status.innerHTML = problemDimensionStatusMarkup(nextState);
  renderProblemDimensionSelector();
  renderProblemSummary();
}

function confirmProblemDimensionDetail() {
  const key = qs("#problemDimensionDetailModal")?.dataset.problemDimensionKey;
  const detail = problemDimensionDetails[key];
  const row = problemDimensionRowByKey(key);
  if (!detail || !row) return;
  const name = qs("#problemDimensionModalTitleInput")?.value.trim();
  if (!name) return;
  detail.title = name;
  setDetailItem(detail, "维度层级", qs("#problemDimensionModalLevelInput")?.value.trim() || "未设置");
  setDetailItem(detail, "业务说明", qs("#problemDimensionModalDescInput")?.value.trim() || "待补充");
  updateProblemDimensionRow(row, detail);
  applyProblemDimensionState(row, "confirm");
  closeModalById("problemDimensionDetailModal");
}

function removeProblemDimensionRow(row) {
  if (!row) return;
  const key = row.dataset.problemDimensionDetail;
  delete problemDimensionDetails[key];
  row.remove();
  closeModalById("problemDimensionDetailModal");
  renderProblemDimensionSelector();
  renderProblemSummary();
}

function problemMetricState(row) {
  return row.dataset.problemMetricState || "pending";
}

function problemMetricStatusMarkup(stateValue) {
  const [label, tone] = {
    pending: ["待确认", "blue"],
    confirm: ["已确认", "green"],
  }[stateValue] || ["待确认", "blue"];
  return statusPill(label, tone);
}

function problemMetricRowByKey(key) {
  return qs(`[data-problem-metric-detail="${key}"]`);
}

function fillProblemMetricDetailModal(key) {
  const detail = problemMetricDetails[key];
  const modal = qs("#problemMetricDetailModal");
  if (!detail || !modal) return;
  modal.dataset.problemMetricKey = key;
  const title = qs("#problemMetricDetailModalTitle");
  if (title) title.textContent = `指标详情 - ${detail.title}`;
  qs("#problemMetricModalTitleInput").value = detail.title;
  qs("#problemMetricModalCodeText").textContent = itemValue(detail, "指标编码") || "待生成";
  qs("#problemMetricModalTypeText").textContent = itemValue(detail, "指标类型");
  qs("#problemMetricModalAdditivityText").textContent = itemValue(detail, "可加性") || "待评估";
  qs("#problemMetricModalDefinitionInput").value = itemValue(detail, "业务定义");
  qs("#problemMetricModalScopeInput").value = itemValue(detail, "统计口径");
  qs("#problemMetricModalFormulaInput").value = itemValue(detail, "计算公式");
  qs("#problemMetricModalFilterInput").value = itemValue(detail, "过滤条件");
  qs("#problemMetricModalTimeInput").value = itemValue(detail, "时间口径");
  qs("#problemMetricModalAggText").textContent = itemValue(detail, "默认聚合") || "待评估";
  qs("#problemMetricModalTimeAggText").textContent = itemValue(detail, "时间聚合") || "待评估";
  qs("#problemMetricModalGrainText").textContent = itemValue(detail, "统计粒度") || "待评估";
  qs("#problemMetricModalSimilarityText").textContent = itemValue(detail, "相似度评分") || "未检测";
  qs("#problemMetricModalTipText").textContent = itemValue(detail, "处理提示");
  const candidates = problemMetricReuseCandidates[key] || [];
  const actionSelect = qs("#problemMetricReuseAction");
  const reuseSelect = qs("#problemMetricReuseSelect");
  if (actionSelect) {
    actionSelect.innerHTML = ["reuse", "merge", "version", "manual", "create"]
      .map((action) => `<option value="${action}">${problemReuseActionLabel(action)}</option>`)
      .join("");
    actionSelect.value = problemReuseActionDefault(key, candidates);
  }
  if (reuseSelect) {
    reuseSelect.innerHTML = candidates.length
      ? candidates.map((candidate) => `<option value="${escapeHtml(candidate.code)}" data-action="${escapeHtml(candidate.action)}" data-desc="${escapeHtml(candidate.desc)}">${escapeHtml(candidate.name)}（${escapeHtml(candidate.code)}，相似度 ${escapeHtml(candidate.similarity)}，${escapeHtml(candidate.owner)}）</option>`).join("")
      : `<option value="">无可复用候选指标</option>`;
    const savedMetric = itemValue(detail, "选择存量指标");
    if (savedMetric && candidates.some((candidate) => candidate.code === savedMetric)) reuseSelect.value = savedMetric;
    reuseSelect.disabled = !candidates.length;
  }
  qs("#problemMetricModalDimensionText").textContent = itemValue(detail, "可用维度");
  qs("#problemMetricModalSuggestionText").textContent = itemValue(detail, "处理建议") || "待确认";
  qs("#problemMetricModalDslPreview").value = metricDslPreview(detail);
  syncProblemMetricReuseHint();
}

function openProblemMetricDetailModal(key) {
  if (!problemMetricDetails[key]) return;
  fillProblemMetricDetailModal(key);
  qsa("[data-problem-metric-detail]").forEach((row) => row.classList.toggle("active", row.dataset.problemMetricDetail === key));
  openModalById("problemMetricDetailModal");
}

function filteredProblemMetricRows() {
  const keyword = state.problemMetricKeyword.trim().toLowerCase();
  return qsa("[data-problem-metric-detail]").filter((row) => {
    const text = `${row.dataset.problemMetricKeywords || ""} ${row.textContent || ""}`.toLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesType = state.problemMetricType === "all" || row.dataset.problemMetricType === state.problemMetricType;
    const matchesStatus = state.problemMetricStatus === "all" || problemMetricState(row) === state.problemMetricStatus;
    return matchesKeyword && matchesType && matchesStatus;
  });
}

function renderProblemMetricSelector() {
  const rows = filteredProblemMetricRows();
  const totalPages = Math.max(1, Math.ceil(rows.length / METRIC_PAGE_SIZE));
  if (state.problemMetricPage > totalPages) state.problemMetricPage = totalPages;

  const start = (state.problemMetricPage - 1) * METRIC_PAGE_SIZE;
  const pagedRows = rows.slice(start, start + METRIC_PAGE_SIZE);
  qsa("[data-problem-metric-detail]").forEach((row) => {
    row.hidden = !pagedRows.includes(row);
  });

  const empty = qs("#problemMetricEmptyState");
  if (empty) empty.hidden = rows.length > 0;

  const summary = qs("#problemMetricListSummary");
  if (summary) {
    const from = rows.length === 0 ? 0 : start + 1;
    const to = start + pagedRows.length;
    summary.textContent = `每页 ${METRIC_PAGE_SIZE} 条，共 ${rows.length} 条，当前 ${from}-${to}`;
  }

  const controls = qs("#problemMetricPaginationControls");
  if (controls) {
    controls.innerHTML = rows.length
      ? `
        <button class="page-button" data-problem-metric-page="prev" type="button" ${state.problemMetricPage === 1 ? "disabled" : ""}>上一页</button>
        ${paginationButtons(state.problemMetricPage, totalPages, "data-problem-metric-page")}
        <button class="page-button" data-problem-metric-page="next" type="button" ${state.problemMetricPage === totalPages ? "disabled" : ""}>下一页</button>
      `
      : "";
    controls.querySelectorAll("[data-problem-metric-page]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.problemMetricPage;
        if (target === "prev") state.problemMetricPage = Math.max(1, state.problemMetricPage - 1);
        else if (target === "next") state.problemMetricPage = Math.min(totalPages, state.problemMetricPage + 1);
        else state.problemMetricPage = Number(target);
        renderProblemMetricSelector();
      });
    });
  }
}

function updateProblemMetricRow(row, detail) {
  const title = qs("[data-problem-metric-title]", row);
  const code = qs("[data-problem-metric-code]", row);
  const type = qs("[data-problem-metric-type-label]", row);
  const formula = qs("[data-problem-metric-formula]", row);
  const scope = qs("[data-problem-metric-scope]", row);
  const tip = qs("[data-problem-metric-tip]", row);
  const checkbox = qs('input[name="problemMetric"]', row);
  const typeLabel = itemValue(detail, "指标类型");
  const additivityValue = itemValue(detail, "可加性") || "待评估";
  const tipValue = itemValue(detail, "处理提示") || "建议新建";
  if (title) title.textContent = detail.title;
  if (code) code.textContent = itemValue(detail, "指标编码") || "待生成";
  if (type) type.textContent = typeLabel;
  if (formula) formula.textContent = itemValue(detail, "计算公式");
  if (scope) scope.textContent = itemValue(detail, "统计口径");
  if (tip) tip.innerHTML = statusPill(tipValue, recommendationTone(tipValue));
  if (checkbox) checkbox.value = detail.title;
  row.dataset.problemMetricType = metricTypeValue(typeLabel);
  row.dataset.problemMetricKeywords = `${detail.title} ${itemValue(detail, "指标编码")} ${typeLabel} ${additivityValue} ${itemValue(detail, "业务定义")} ${itemValue(detail, "统计口径")} ${itemValue(detail, "计算公式")} ${itemValue(detail, "过滤条件")} ${itemValue(detail, "处理提示")}`;
}

function applyProblemMetricState(row, action) {
  row.dataset.problemMetricState = action;
  const checkbox = qs('input[name="problemMetric"]', row);
  if (checkbox) checkbox.checked = action === "confirm";
  const status = qs("[data-problem-metric-status]", row);
  if (status) status.innerHTML = problemMetricStatusMarkup(action);
  renderProblemMetricSelector();
  renderProblemSummary();
}

function confirmProblemMetricDetail() {
  const key = qs("#problemMetricDetailModal")?.dataset.problemMetricKey;
  const detail = problemMetricDetails[key];
  const row = problemMetricRowByKey(key);
  if (!detail || !row) return;
  const name = qs("#problemMetricModalTitleInput")?.value.trim();
  const formula = qs("#problemMetricModalFormulaInput")?.value.trim();
  if (!name || !formula) return;
  detail.title = name;
  setDetailItem(detail, "业务定义", qs("#problemMetricModalDefinitionInput")?.value.trim() || "待补充");
  setDetailItem(detail, "统计口径", qs("#problemMetricModalScopeInput")?.value.trim() || "待补充");
  setDetailItem(detail, "计算公式", formula);
  setDetailItem(detail, "过滤条件", qs("#problemMetricModalFilterInput")?.value.trim() || "待补充");
  setDetailItem(detail, "时间口径", qs("#problemMetricModalTimeInput")?.value.trim() || "待补充");
  const reuseAction = qs("#problemMetricReuseAction")?.value || "create";
  const reuseMetric = reuseAction === "create" ? "" : qs("#problemMetricReuseSelect")?.value || "";
  const reuseMetricLabel = reuseAction === "create" ? "" : qs("#problemMetricReuseSelect")?.selectedOptions?.[0]?.textContent.trim() || "";
  setDetailItem(detail, "存量处理方式", reuseAction);
  setDetailItem(detail, "选择存量指标", reuseMetric);
  setDetailItem(detail, "处理建议", reuseAction === "create"
    ? "用户选择新建指标，生成前进入 DSL 校验和相似度检测。"
    : `用户选择${problemReuseActionLabel(reuseAction)}：${reuseMetricLabel}`);
  if (key === "refundImpact") {
    state.metricConflictResolved = true;
    renderProblemMetricConflictCheck();
  }
  updateProblemMetricRow(row, detail);
  applyProblemMetricState(row, "confirm");
  closeModalById("problemMetricDetailModal");
}

function removeProblemMetricRow(row) {
  if (!row) return;
  const key = row.dataset.problemMetricDetail;
  delete problemMetricDetails[key];
  if (key === "refundImpact") {
    state.metricConflictResolved = true;
    renderProblemMetricConflictCheck();
  }
  row.remove();
  closeModalById("problemMetricDetailModal");
  renderProblemMetricSelector();
  renderProblemSummary();
}

function problemModelStatus(model) {
  return model.status === "attention" ? ["需注意准确性", "amber"] : ["可生成指标", "green"];
}

function problemModelMatches(model, type) {
  const prefix = type === "recommended" ? "problemRecommendedModel" : "problemOtherModel";
  const keyword = state[`${prefix}Keyword`].trim().toLowerCase();
  const domain = state[`${prefix}Domain`];
  const status = state[`${prefix}Status`];
  const text = `${model.name} ${model.role || ""} ${model.keywords} ${model.summary} ${model.coverage || ""} ${model.confidence || ""} ${model.missingFields || ""} ${model.qualityRisk || ""} ${model.tags.join(" ")}`.toLowerCase();
  return (!keyword || text.includes(keyword)) && (domain === "all" || model.domain === domain) && (status === "all" || model.status === status);
}

function filteredProblemModels(type) {
  return problemModelPool.filter((model) => model.recommended === (type === "recommended") && problemModelMatches(model, type));
}

function syncProblemPrimaryModel() {
  const recommendedModels = problemModelPool.filter((model) => model.recommended);
  const coreModel = recommendedModels.find((model) => model.role === "核心计算");
  if (coreModel) {
    state.problemPrimaryModel = coreModel.name;
    return;
  }
  if (recommendedModels.length) {
    recommendedModels[0].role = "核心计算";
    state.problemPrimaryModel = recommendedModels[0].name;
    return;
  }
  state.problemPrimaryModel = "";
}

function problemModelCardMarkup(model, type) {
  const [statusLabel, statusTone] = problemModelStatus(model);
  const isRecommended = type === "recommended";
  const isPrimary = model.name === state.problemPrimaryModel;
  const actions = isRecommended
    ? `
      <div class="problem-model-card-actions">
        <button class="button small" data-problem-model-action="remove" data-problem-model-name="${escapeHtml(model.name)}" type="button">移除推荐</button>
      </div>
    `
    : `
      <div class="problem-model-card-actions">
        <button class="button small primary" data-problem-model-action="add" data-problem-model-name="${escapeHtml(model.name)}" type="button">加入推荐</button>
      </div>
    `;

  return `
    <article class="wizard-model-card problem-model-card ${isPrimary ? "active" : ""}" data-problem-model-card="${escapeHtml(model.name)}">
      <div class="problem-model-card-kicker">
        ${statusPill(statusLabel, statusTone)}
        <span class="status blue">${escapeHtml(model.role || "补充分析")}</span>
      </div>
      <strong>${escapeHtml(model.name)}</strong>
      <p>${escapeHtml(model.summary)}</p>
      <div class="problem-model-evidence" aria-label="模型可信度信息">
        <div><span>覆盖度</span><strong>${escapeHtml(model.coverage || "待评估")}</strong></div>
        <div><span>可信度</span><strong>${escapeHtml(model.confidence || "待评估")}</strong></div>
        <div><span>新鲜度</span><strong>${escapeHtml(model.freshness || "待评估")}</strong></div>
        <div><span>数据状态</span><strong>${escapeHtml(model.qualityRisk || "待评估")}</strong></div>
      </div>
      <div class="problem-model-risk"><span>缺失字段</span><strong>${escapeHtml(model.missingFields || "无关键缺失")}</strong></div>
      <div class="wizard-tag-row">
        ${model.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${actions}
    </article>
  `;
}

function problemModelConfig(type) {
  const recommended = type === "recommended";
  return {
    listSelector: recommended ? "#problemRecommendedModelList" : "#problemOtherModelList",
    summarySelector: recommended ? "#problemRecommendedModelSummary" : "#problemOtherModelSummary",
    controlsSelector: recommended ? "#problemRecommendedModelPagination" : "#problemOtherModelPagination",
    pageKey: recommended ? "problemRecommendedModelPage" : "problemOtherModelPage",
    pageAttribute: recommended ? "data-problem-recommended-model-page" : "data-problem-other-model-page",
  };
}

function renderProblemModelList(type) {
  const config = problemModelConfig(type);
  const list = qs(config.listSelector);
  if (!list) return;

  syncProblemPrimaryModel();
  const rows = filteredProblemModels(type);
  const totalPages = Math.max(1, Math.ceil(rows.length / PROBLEM_MODEL_PAGE_SIZE));
  if (state[config.pageKey] > totalPages) state[config.pageKey] = totalPages;

  const start = (state[config.pageKey] - 1) * PROBLEM_MODEL_PAGE_SIZE;
  const pagedRows = rows.slice(start, start + PROBLEM_MODEL_PAGE_SIZE);
  list.innerHTML = pagedRows.length
    ? pagedRows.map((model) => problemModelCardMarkup(model, type)).join("")
    : `<div class="empty-state wizard-model-empty">${type === "recommended" ? "暂无符合条件的推荐数据模型" : "暂无符合条件的其他数据模型"}</div>`;

  const summary = qs(config.summarySelector);
  if (summary) {
    const from = rows.length === 0 ? 0 : start + 1;
    const to = start + pagedRows.length;
    summary.textContent = `每页 ${PROBLEM_MODEL_PAGE_SIZE} 个，共 ${rows.length} 个，当前 ${from}-${to}`;
  }

  const controls = qs(config.controlsSelector);
  if (controls) {
    controls.innerHTML = rows.length
      ? `
        <button class="page-button" ${config.pageAttribute}="prev" type="button" ${state[config.pageKey] === 1 ? "disabled" : ""}>上一页</button>
        ${paginationButtons(state[config.pageKey], totalPages, config.pageAttribute)}
        <button class="page-button" ${config.pageAttribute}="next" type="button" ${state[config.pageKey] === totalPages ? "disabled" : ""}>下一页</button>
      `
      : "";
    controls.querySelectorAll(`[${config.pageAttribute}]`).forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute(config.pageAttribute);
        if (target === "prev") state[config.pageKey] = Math.max(1, state[config.pageKey] - 1);
        else if (target === "next") state[config.pageKey] = Math.min(totalPages, state[config.pageKey] + 1);
        else state[config.pageKey] = Number(target);
        renderProblemModelList(type);
      });
    });
  }

  qsa("[data-problem-model-action]", list).forEach((button) => {
    button.addEventListener("click", () => updateProblemModelRecommendation(button.dataset.problemModelName, button.dataset.problemModelAction));
  });
}

function updateProblemModelCounts() {
  const recommendedCount = problemModelPool.filter((model) => model.recommended).length;
  const otherCount = problemModelPool.length - recommendedCount;
  const recommended = qs("#recommendedModelCount");
  const other = qs("#otherModelCount");
  if (recommended) recommended.textContent = `${recommendedCount} 个`;
  if (other) other.textContent = `${otherCount} 个`;
}

function renderProblemModelPools() {
  renderProblemModelList("recommended");
  renderProblemModelList("other");
  updateProblemModelCounts();
  renderProblemSummary();
}

function updateProblemModelRecommendation(modelName, action) {
  const model = problemModelPool.find((item) => item.name === modelName);
  if (!model) return;
  if (action === "add") {
    model.recommended = true;
    state.problemPrimaryModel ||= model.name;
    state.problemRecommendedModelPage = 1;
  }
  if (action === "remove") {
    const wasCore = model.role === "核心计算";
    model.recommended = false;
    if (wasCore) model.role = "补充分析";
    if (state.problemPrimaryModel === model.name) state.problemPrimaryModel = "";
    state.problemOtherModelPage = 1;
  }
  renderProblemModelPools();
}

function bindProblemModelFilters() {
  const configs = [
    ["recommended", "#problemRecommendedModelSearch", "#problemRecommendedModelDomainFilter", "#problemRecommendedModelStatusFilter", "#resetProblemRecommendedModelFilters"],
    ["other", "#problemOtherModelSearch", "#problemOtherModelDomainFilter", "#problemOtherModelStatusFilter", "#resetProblemOtherModelFilters"],
  ];
  configs.forEach(([type, searchSelector, domainSelector, statusSelector, resetSelector]) => {
    const prefix = type === "recommended" ? "problemRecommendedModel" : "problemOtherModel";
    const search = qs(searchSelector);
    const domain = qs(domainSelector);
    const status = qs(statusSelector);
    const reset = qs(resetSelector);
    const apply = () => {
      state[`${prefix}Keyword`] = search?.value || "";
      state[`${prefix}Domain`] = domain?.value || "all";
      state[`${prefix}Status`] = status?.value || "all";
      state[`${prefix}Page`] = 1;
      renderProblemModelList(type);
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
  });
}

function filteredBusinessThemeOptions() {
  const keyword = state.problemThemeKeyword.trim().toLowerCase();
  return qsa("[data-business-theme-option]").filter((card) => {
    const text = `${card.dataset.themeName || ""} ${card.dataset.themeBoundary || ""} ${card.dataset.themeDesc || ""} ${card.dataset.themeKeywords || ""} ${card.textContent || ""}`.toLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesDomain = state.problemThemeDomain === "all" || card.dataset.themeDomain === state.problemThemeDomain;
    return matchesKeyword && matchesDomain;
  });
}

function renderBusinessThemeOptions() {
  const cards = qsa("[data-business-theme-option]");
  const rows = filteredBusinessThemeOptions();
  const totalPages = Math.max(1, Math.ceil(rows.length / BUSINESS_THEME_PAGE_SIZE));
  if (state.problemThemePage > totalPages) state.problemThemePage = totalPages;

  const start = (state.problemThemePage - 1) * BUSINESS_THEME_PAGE_SIZE;
  const pagedRows = rows.slice(start, start + BUSINESS_THEME_PAGE_SIZE);
  cards.forEach((card) => {
    card.hidden = !pagedRows.includes(card);
  });

  const empty = qs("#businessThemeEmptyState");
  if (empty) empty.hidden = rows.length > 0;

  const summary = qs("#businessThemeSummary");
  if (summary) {
    const from = rows.length === 0 ? 0 : start + 1;
    const to = start + pagedRows.length;
    summary.textContent = `每页 ${BUSINESS_THEME_PAGE_SIZE} 个，共 ${rows.length} 个，当前 ${from}-${to}`;
  }

  const controls = qs("#businessThemePagination");
  if (controls) {
    controls.innerHTML = rows.length
      ? `
        <button class="page-button" data-business-theme-page="prev" type="button" ${state.problemThemePage === 1 ? "disabled" : ""}>上一页</button>
        ${paginationButtons(state.problemThemePage, totalPages, "data-business-theme-page")}
        <button class="page-button" data-business-theme-page="next" type="button" ${state.problemThemePage === totalPages ? "disabled" : ""}>下一页</button>
      `
      : "";
    controls.querySelectorAll("[data-business-theme-page]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.businessThemePage;
        if (target === "prev") state.problemThemePage = Math.max(1, state.problemThemePage - 1);
        else if (target === "next") state.problemThemePage = Math.min(totalPages, state.problemThemePage + 1);
        else state.problemThemePage = Number(target);
        renderBusinessThemeOptions();
      });
    });
  }
}

function bindProblemThemeFilters() {
  const search = qs("#problemThemeSearch");
  const domain = qs("#problemThemeDomainFilter");
  const reset = qs("#resetProblemThemeFilters");
  const apply = () => {
    state.problemThemeKeyword = search?.value || "";
    state.problemThemeDomain = domain?.value || "all";
    state.problemThemePage = 1;
    renderBusinessThemeOptions();
  };
  search?.addEventListener("input", apply);
  domain?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (domain) domain.value = "all";
    apply();
  });
}

function filteredProblemTopicCards() {
  const keyword = state.problemTopicKeyword.trim().toLowerCase();
  return qsa("[data-problem-topic-card]").filter((card) => {
    const text = `${card.dataset.problemTopicKeywords || ""} ${card.textContent || ""}`.toLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesDomain = state.problemTopicDomain === "all" || card.dataset.problemTopicDomain === state.problemTopicDomain;
    const matchesPriority = state.problemTopicPriority === "all" || card.dataset.problemTopicPriority === state.problemTopicPriority;
    return matchesKeyword && matchesDomain && matchesPriority;
  });
}

function activeProblemTopics() {
  return qsa("[data-problem-topic-card]")
    .filter((card) => card.dataset.problemTopicPriority !== "deferred")
    .map((card) => card.dataset.problemTopicName)
    .filter(Boolean);
}

function renderProblemTopicSelector() {
  const cards = qsa("[data-problem-topic-card]");
  const rows = filteredProblemTopicCards();
  const totalPages = Math.max(1, Math.ceil(rows.length / TOPIC_PAGE_SIZE));
  if (state.problemTopicPage > totalPages) state.problemTopicPage = totalPages;

  const start = (state.problemTopicPage - 1) * TOPIC_PAGE_SIZE;
  const pagedRows = rows.slice(start, start + TOPIC_PAGE_SIZE);
  cards.forEach((card) => {
    card.hidden = !pagedRows.includes(card);
  });

  const empty = qs("#problemTopicEmptyState");
  if (empty) empty.hidden = rows.length > 0;

  const summary = qs("#problemTopicListSummary");
  if (summary) {
    const from = rows.length === 0 ? 0 : start + 1;
    const to = start + pagedRows.length;
    summary.textContent = `每页 ${TOPIC_PAGE_SIZE} 个，共 ${rows.length} 个，当前 ${from}-${to}`;
  }

  const controls = qs("#problemTopicPaginationControls");
  if (controls) {
    controls.innerHTML = rows.length
      ? `
        <button class="page-button" data-problem-topic-page="prev" type="button" ${state.problemTopicPage === 1 ? "disabled" : ""}>上一页</button>
        ${paginationButtons(state.problemTopicPage, totalPages, "data-problem-topic-page")}
        <button class="page-button" data-problem-topic-page="next" type="button" ${state.problemTopicPage === totalPages ? "disabled" : ""}>下一页</button>
      `
      : "";
    controls.querySelectorAll("[data-problem-topic-page]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.problemTopicPage;
        if (target === "prev") state.problemTopicPage = Math.max(1, state.problemTopicPage - 1);
        else if (target === "next") state.problemTopicPage = Math.min(totalPages, state.problemTopicPage + 1);
        else state.problemTopicPage = Number(target);
        renderProblemTopicSelector();
      });
    });
  }
}

function removeProblemTopicCard(card) {
  if (!card) return;
  card.remove();
  const totalPages = Math.max(1, Math.ceil(filteredProblemTopicCards().length / TOPIC_PAGE_SIZE));
  state.problemTopicPage = Math.min(state.problemTopicPage, totalPages);
  renderProblemTopicSelector();
  renderProblemSummary();
}

function bindProblemTopicCards() {
  qsa("[data-problem-topic-card]").forEach((card) => {
    if (card.dataset.problemTopicBound === "true") return;
    card.dataset.problemTopicBound = "true";
    qs("[data-problem-topic-action='remove']", card)?.addEventListener("click", () => removeProblemTopicCard(card));
  });
}

function bindProblemTopicFilters() {
  const search = qs("#problemTopicSearch");
  const domain = qs("#problemTopicDomainFilter");
  const priority = qs("#problemTopicPriorityFilter");
  const reset = qs("#resetProblemTopicFilters");
  const apply = () => {
    state.problemTopicKeyword = search?.value || "";
    state.problemTopicDomain = domain?.value || "all";
    state.problemTopicPriority = priority?.value || "all";
    state.problemTopicPage = 1;
    renderProblemTopicSelector();
  };
  search?.addEventListener("input", apply);
  domain?.addEventListener("change", apply);
  priority?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (domain) domain.value = "all";
    if (priority) priority.value = "all";
    apply();
  });
}

function bindProblemDimensionFilters() {
  const search = qs("#problemDimensionSearch");
  const type = qs("#problemDimensionTypeFilter");
  const status = qs("#problemDimensionStatusFilter");
  const reset = qs("#resetProblemDimensionFilters");
  const apply = () => {
    state.problemDimensionKeyword = search?.value || "";
    state.problemDimensionType = type?.value || "all";
    state.problemDimensionStatus = status?.value || "all";
    state.problemDimensionPage = 1;
    renderProblemDimensionSelector();
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

function bindProblemMetricFilters() {
  const search = qs("#problemMetricSearch");
  const type = qs("#problemMetricTypeFilter");
  const status = qs("#problemMetricStatusFilter");
  const reset = qs("#resetProblemMetricFilters");
  const apply = () => {
    state.problemMetricKeyword = search?.value || "";
    state.problemMetricType = type?.value || "all";
    state.problemMetricStatus = status?.value || "all";
    state.problemMetricPage = 1;
    renderProblemMetricSelector();
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

function renderSharedAssetSuggestion() {
  const card = qs("#sharedAssetSuggestionCard");
  const stateText = qs("#assetMappingState");
  const physicalAssets = {
    order: "ads_metric_order_volume_daily",
    aov: "ads_metric_aov_daily",
    channel: "ads_metric_channel_mix_daily",
  };
  if (state.sharedAssetAccepted && ["orderVolume", "aov", "channel"].includes(state.activeOutputAssetKey)) {
    state.activeOutputAssetKey = "orderShared";
  }
  if (!state.sharedAssetAccepted && state.activeOutputAssetKey === "orderShared") {
    state.activeOutputAssetKey = "orderVolume";
  }
  qsa("[data-shared-asset-row]").forEach((row) => {
    const key = row.dataset.sharedAssetRow;
    const physical = qs("[data-physical-asset]", row);
    const task = qs("[data-compute-task]", row);
    const relation = row.lastElementChild;
    if (state.sharedAssetAccepted) {
      if (physical) physical.textContent = "ads_metric_order_daily";
      if (task) task.textContent = "task_metric_order_daily";
      if (relation) relation.innerHTML = statusPill("共享物理资产", "green");
    } else {
      if (physical) physical.textContent = physicalAssets[key] || "独立结果表";
      if (task) task.textContent = `task_${(physicalAssets[key] || "metric_independent").replace(/^ads_/, "")}`;
      if (relation) relation.innerHTML = statusPill("保持独立", "blue");
    }
  });
  if (stateText) stateText.textContent = state.sharedAssetAccepted ? "已接受共享 1 个物理资产" : "已保持方向独立产出";
  if (card) card.classList.toggle("accepted", state.sharedAssetAccepted);
  syncProblemComputeMode();
}

function bindSharedAssetSuggestion() {
  qsa("[data-shared-asset-action]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sharedAssetAccepted = button.dataset.sharedAssetAction === "accept";
      renderSharedAssetSuggestion();
    });
  });
}

function renderMetricSetSuggestion() {
  const card = qs("#metricSetSuggestionCard");
  const preview = qs("#publishExtensionSetPreview");
  const summary = qs("#problemPublishSummaryExtendedSets");
  if (card) card.classList.toggle("accepted", state.extensionMetricSetAccepted);
  if (preview) preview.textContent = state.extensionMetricSetAccepted ? "1 个，客单价归因指标集" : "0 个，保持在主指标集";
  if (summary) summary.textContent = state.extensionMetricSetAccepted ? "扩展指标集 1 个" : "扩展指标集 0 个";
}

function bindMetricSetSuggestion() {
  qsa("[data-metric-set-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      state.extensionMetricSetAccepted = button.dataset.metricSetSuggestion === "accept";
      renderMetricSetSuggestion();
      renderProblemSummary();
    });
  });
}

function renderProblemSummary() {
  const businessTheme = qs("#problemBusinessThemeName")?.value.trim() || "交易经营";
  const sceneTags = qs("#problemSceneTags")?.value.trim() || "经营诊断、交易分析";
  const customTopic = qs("#problemCustomTopic")?.value.trim();
  const topics = activeProblemTopics();
  const dimensions = checkedValues("problemDimension");
  const metrics = checkedValues("problemMetric");
  const computeDisplay = problemComputeDisplayState();
  const outputAssets = problemOutputAssetDefinitions();
  if (customTopic) topics.push(customTopic);

  const setText = (selector, value) => {
    const node = qs(selector);
    if (node) node.textContent = value;
  };

  setText("#problemPublishSummaryDimensions", `维度 ${dimensions.length} 个`);
  setText("#problemPublishSummaryMetrics", `指标 ${metrics.length} 个`);
  setText("#problemPublishComputePreview", `${computeDisplay.computeMode}，${computeDisplay.scheduleCycle}，${state.sharedAssetAccepted ? "共享物理资产" : "方向独立产出"}`);
  setText("#problemPublishSummaryPhysicalAssets", `物理输出资产 ${outputAssets.length} 个`);
  setText("#publishSharedAssetPreview", state.sharedAssetAccepted ? "ads_metric_order_daily（共享）" : "保持方向独立结果表");

  const computeSummary = computeDisplay.isQuery
    ? `并按${computeDisplay.computeMode}生成查询配置`
    : `并按${computeDisplay.computeMode}、${computeDisplay.scheduleCycle}生成调度配置`;
  setText("#publishModalSummary", `本次将生成「${businessTheme}」主题下的 ${topics.length} 个分析方向，场景标签为「${sceneTags}」，包含维度 ${dimensions.length} 个、指标 ${metrics.length} 个、主指标集 ${topics.length} 个、扩展指标集 ${state.extensionMetricSetAccepted ? 1 : 0} 个，${computeSummary}。`);
}

function renderProblemStep() {
  qsa("[data-problem-step-panel]").forEach((panel) => {
    panel.hidden = Number(panel.dataset.problemStepPanel) !== state.problemStep;
  });
  qsa("[data-problem-step-nav]").forEach((item) => {
    const step = Number(item.dataset.problemStepNav);
    const isActive = step === state.problemStep;
    const isDone = step < state.problemStep;
    const isLocked = step > state.problemMaxStep;
    item.classList.toggle("active", isActive);
    item.classList.toggle("done", isDone);
    item.classList.toggle("locked", isLocked);
    item.disabled = isLocked;
    if (isActive) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  const prev = qs("#prevProblemStep");
  const next = qs("#nextProblemStep");
  const actions = qs("#problemStepActions");
  const finalActions = qs("#problemPublishActions");
  if (actions) actions.hidden = state.problemStep === 1;
  if (prev) prev.disabled = state.problemStep === 1;
  if (next) next.hidden = state.problemStep === PROBLEM_TOTAL_STEPS;
  if (finalActions) finalActions.hidden = state.problemStep !== PROBLEM_TOTAL_STEPS;
  renderProblemMetricConflictCheck();
  renderProblemSummary();
}

function setProblemStep(step) {
  state.problemStep = Math.min(PROBLEM_TOTAL_STEPS, Math.max(1, step));
  state.problemMaxStep = Math.max(state.problemMaxStep, state.problemStep);
  renderProblemStep();
}

function pendingProblemDimensionRows() {
  return qsa("[data-problem-dimension-detail]").filter((row) => problemDimensionState(row) === "pending");
}

function pendingProblemMetricRows() {
  return qsa("[data-problem-metric-detail]").filter((row) => problemMetricState(row) === "pending");
}

function focusProblemPendingCandidates(type, count) {
  if (type === "dimension") {
    state.problemDimensionStatus = "pending";
    state.problemDimensionPage = 1;
    const status = qs("#problemDimensionStatusFilter");
    if (status) status.value = "pending";
    renderProblemDimensionSelector();
    qs("#problemDimensionCandidateRows")?.closest(".table-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.alert(`还有 ${count} 个推荐维度未确认，请确认或移除后再继续。`);
    return;
  }
  state.problemMetricStatus = "pending";
  state.problemMetricPage = 1;
  const status = qs("#problemMetricStatusFilter");
  if (status) status.value = "pending";
  renderProblemMetricSelector();
  qs("#problemMetricCandidateRows")?.closest(".table-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.alert(`还有 ${count} 个推荐指标未确认，请确认或移除后再继续。`);
}

function validateProblemStepBeforeNext(targetStep = state.problemStep + 1) {
  if (targetStep > 6) {
    const pending = pendingProblemDimensionRows();
    if (pending.length) {
      if (state.problemStep !== 6) setProblemStep(6);
      focusProblemPendingCandidates("dimension", pending.length);
      return false;
    }
  }
  if (targetStep > 6) {
    const pending = pendingProblemMetricRows();
    if (pending.length) {
      if (state.problemStep !== 6) setProblemStep(6);
      focusProblemPendingCandidates("metric", pending.length);
      return false;
    }
  }
  if (targetStep > 7 && !state.metricConflictResolved) {
    window.alert("相似指标处理还未完成，请先处理“退款影响金额”的存量指标选择。");
    if (state.problemStep !== 7) setProblemStep(7);
    qs("#problemMetricConflictCheck")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

function appendProblemMessage(role, label, text) {
  const list = qs("#problemChatList");
  if (!list || !text) return;
  const message = document.createElement("div");
  message.className = `problem-chat-message ${role}`;
  message.innerHTML = `<span>${escapeHtml(label)}</span><p>${escapeHtml(text)}</p>`;
  list.appendChild(message);
  list.scrollTop = list.scrollHeight;
}

function setProblemAnalysisState(text) {
  const node = qs("#problemAnalysisState");
  if (node) node.textContent = text;
}

function getProblemAnalysisState() {
  return qs("#problemAnalysisState")?.textContent || "";
}

function sendProblemMessage() {
  const input = qs("#problemMessageInput");
  const text = input?.value.trim();
  if (!text) return;
  appendProblemMessage("user", "补充信息", text);
  appendProblemMessage("assistant", "系统理解", "已记录补充口径。后续方案会优先按这些条件匹配指标、维度和数据模型。");
  setProblemAnalysisState("已补充对话，等待生成");
  if (input) input.value = "";
}

function bindProblemEntry() {
  qs("#sendProblemMessage")?.addEventListener("click", sendProblemMessage);
  qs("#problemMessageInput")?.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") sendProblemMessage();
  });
  qs("#analyzeProblem")?.addEventListener("click", () => {
    setProblemAnalysisState("已生成方案，逐步确认");
    setProblemStep(2);
  });
}

function bindProblemBusinessThemeOptions() {
  qsa("[data-business-theme-option]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.themeName || "";
      const boundary = button.dataset.themeBoundary || "";
      const desc = button.dataset.themeDesc || "";
      const nameInput = qs("#problemBusinessThemeName");
      const boundaryInput = qs("#problemBusinessThemeBoundary");
      const descInput = qs("#problemBusinessThemeDescription");
      if (nameInput) nameInput.value = name;
      if (boundaryInput) boundaryInput.value = boundary;
      if (descInput) descInput.value = desc;
      qsa("[data-business-theme-option]").forEach((item) => item.classList.toggle("active", item === button));
      renderProblemSummary();
    });
  });
}

function bindProblemStepper() {
  qsa("[data-problem-step-nav]").forEach((item) => {
    item.addEventListener("click", () => {
      const targetStep = Number(item.dataset.problemStepNav);
      if (targetStep === state.problemStep || targetStep > state.problemMaxStep) return;
      if (targetStep > state.problemStep && !validateProblemStepBeforeNext(targetStep)) return;
      setProblemStep(targetStep);
    });
  });
  qs("#prevProblemStep")?.addEventListener("click", () => setProblemStep(state.problemStep - 1));
  qs("#nextProblemStep")?.addEventListener("click", () => {
    if (state.problemStep === 1 && getProblemAnalysisState() === "等待生成方案") {
      setProblemAnalysisState("已生成方案，逐步确认");
    }
    const targetStep = state.problemStep + 1;
    if (!validateProblemStepBeforeNext(targetStep)) return;
    setProblemStep(targetStep);
  });
  qsa("#problemWizard input, #problemWizard select, #problemWizard textarea").forEach((control) => {
    control.addEventListener("change", renderProblemSummary);
    control.addEventListener("input", renderProblemSummary);
  });
  qs("#saveProblemDraft")?.addEventListener("click", () => {
    const result = qs("#problemPublishResult");
    if (!result) return;
    result.hidden = false;
    result.textContent = "已模拟暂存草稿：业务主题、分析方向、数据模型、维度指标、逻辑输出资产、共享物理资产建议和计算配置会保留在待确认状态。";
  });
}

function bindProblemComputeMode() {
  qsa('input[name="problemComputeMode"]').forEach((control) => {
    control.addEventListener("change", syncProblemComputeMode);
  });
}

function bindProblemScheduleFields() {
  qsa("#problemScheduleFields input, #problemScheduleFields select").forEach((control) => {
    control.addEventListener("change", syncProblemScheduleFrequency);
    control.addEventListener("input", syncProblemScheduleFrequency);
  });
}

function clearCustomInputs(selectors) {
  selectors.forEach((selector) => {
    const node = qs(selector);
    if (node) node.value = "";
  });
}

function addProblemCustomDimension() {
  const name = qs("#problemAddDimensionName")?.value.trim();
  const field = qs("#problemAddDimensionField")?.value.trim();
  const level = qs("#problemAddDimensionLevel")?.value.trim();
  const desc = qs("#problemAddDimensionDesc")?.value.trim();
  if (!name || !field) return;

  const type = inferProblemDimensionType(name, field, desc || "");
  const necessity = "用户补充";
  const reason = "系统根据维度名称、来源字段和业务说明自动识别分类，用户确认后纳入本次主指标集。";
  const key = `problemCustomDimension${Date.now()}`;
  problemDimensionDetails[key] = {
    title: name,
    items: [
      ["来源字段", field],
      ["维度层级", level || "未设置"],
      ["必要程度", necessity],
      ["业务说明", desc || "用户自定义补充维度。"],
      ["适用分析方向", "用户补充"],
      ["推荐原因", reason || "用户手工新增，进入本次主指标集候选维度。"],
    ],
  };

  const row = document.createElement("tr");
  row.dataset.problemDimensionDetail = key;
  row.dataset.problemDimensionType = type;
  row.dataset.problemDimensionKeywords = `${name} ${field} ${level || ""} ${necessity} ${desc || ""} ${reason}`;
  row.dataset.problemDimensionState = "confirm";
  row.dataset.problemDimensionRow = "";
  row.innerHTML = `
    <td><input type="checkbox" name="problemDimension" value="${escapeHtml(name)}" checked hidden><strong data-problem-dimension-title>${escapeHtml(name)}</strong></td>
    <td data-problem-dimension-field>${escapeHtml(field)}</td>
    <td data-problem-dimension-level>${escapeHtml(level || "未设置")}</td>
    <td data-problem-dimension-necessity>${statusPill(necessity, necessityTone(necessity))}</td>
    <td data-problem-dimension-reason>${escapeHtml(reason)}</td>
    <td data-problem-dimension-status>${problemDimensionStatusMarkup("confirm")}</td>
    <td><span class="row-actions"><button class="button small" data-problem-dimension-action="detail" type="button">详情</button><button class="button small" data-problem-dimension-action="remove" type="button">移除</button></span></td>
  `;
  qs("#problemDimensionEmptyState")?.before(row);
  clearCustomInputs(["#problemAddDimensionName", "#problemAddDimensionField", "#problemAddDimensionLevel", "#problemAddDimensionDesc"]);
  const search = qs("#problemDimensionSearch");
  const typeFilter = qs("#problemDimensionTypeFilter");
  const statusFilter = qs("#problemDimensionStatusFilter");
  if (search) search.value = "";
  if (typeFilter) typeFilter.value = "all";
  if (statusFilter) statusFilter.value = "all";
  state.problemDimensionKeyword = "";
  state.problemDimensionType = "all";
  state.problemDimensionStatus = "all";
  state.problemDimensionPage = Math.max(1, Math.ceil(qsa("[data-problem-dimension-detail]").length / DIMENSION_PAGE_SIZE));
  bindProblemDimensionRows();
  renderProblemDimensionSelector();
  closeModalById("problemDimensionAddModal");
  renderProblemSummary();
}

function addProblemCustomMetric() {
  const name = qs("#problemAddMetricName")?.value.trim();
  const type = qs("#problemAddMetricType")?.value || "atomic";
  const definition = qs("#problemAddMetricDefinition")?.value.trim();
  const scope = qs("#problemAddMetricScope")?.value.trim();
  const formula = qs("#problemAddMetricFormula")?.value.trim();
  const filter = qs("#problemAddMetricFilter")?.value.trim();
  const time = qs("#problemAddMetricTime")?.value.trim();
  const tip = qs("#problemAddMetricTip")?.value.trim() || "用户补充";
  const dimensions = qs("#problemAddMetricDimension")?.value.trim();
  if (!name || !formula) return;

  const key = `problemCustomMetric${Date.now()}`;
  const code = `custom_metric_${Date.now()}`;
  const additivity = type === "derived" || type === "composite" ? "不可加" : "待评估";
  const defaultAgg = type === "derived" || type === "composite" ? "ratio" : "sum";
  problemMetricDetails[key] = {
    title: name,
    items: [
      ["指标编码", code],
      ["指标类型", metricTypeLabel(type)],
      ["业务定义", definition || "用户自定义补充指标。"],
      ["统计口径", scope || "待补充"],
      ["计算公式", formula],
      ["过滤条件", filter || "待补充"],
      ["时间口径", time || "待补充"],
      ["语义模型", "用户补充"],
      ["可加性", additivity],
      ["默认聚合", defaultAgg],
      ["时间聚合", type === "derived" || type === "composite" ? "ratio_recalculate" : "sum_by_day"],
      ["统计粒度", "date"],
      ["派生依赖", type === "derived" || type === "composite" ? "待确认" : "无"],
      ["可用维度", dimensions || "待确认"],
      ["相似度评分", "未检测"],
      ["处理建议", "用户补充指标，生成前进入 DSL 校验和相似度检测。"],
      ["DSL校验", "待校验"],
      ["处理提示", tip],
    ],
  };

  const row = document.createElement("tr");
  row.dataset.problemMetricDetail = key;
  row.dataset.problemMetricType = type;
  row.dataset.problemMetricKeywords = `${name} ${metricTypeLabel(type)} ${definition || ""} ${scope || ""} ${formula} ${filter || ""} ${tip}`;
  row.dataset.problemMetricState = "confirm";
  row.dataset.problemMetricRow = "";
  row.innerHTML = `
    <td><input type="checkbox" name="problemMetric" value="${escapeHtml(name)}" checked hidden><strong data-problem-metric-title>${escapeHtml(name)}</strong></td>
    <td data-problem-metric-code>${escapeHtml(code)}</td>
    <td data-problem-metric-type-label>${metricTypeLabel(type)}</td>
    <td data-problem-metric-formula>${escapeHtml(formula)}</td>
    <td data-problem-metric-scope>${escapeHtml(scope || "待补充")}</td>
    <td data-problem-metric-tip>${statusPill(tip, recommendationTone(tip))}</td>
    <td data-problem-metric-status>${problemMetricStatusMarkup("confirm")}</td>
    <td><span class="row-actions"><button class="button small" data-problem-metric-action="detail" type="button">详情</button><button class="button small" data-problem-metric-action="remove" type="button">移除</button></span></td>
  `;
  qs("#problemMetricEmptyState")?.before(row);
  clearCustomInputs(["#problemAddMetricName", "#problemAddMetricDefinition", "#problemAddMetricScope", "#problemAddMetricFormula", "#problemAddMetricFilter", "#problemAddMetricTime", "#problemAddMetricTip", "#problemAddMetricDimension"]);
  const search = qs("#problemMetricSearch");
  const typeFilter = qs("#problemMetricTypeFilter");
  const statusFilter = qs("#problemMetricStatusFilter");
  if (search) search.value = "";
  if (typeFilter) typeFilter.value = "all";
  if (statusFilter) statusFilter.value = "all";
  state.problemMetricKeyword = "";
  state.problemMetricType = "all";
  state.problemMetricStatus = "all";
  state.problemMetricPage = Math.max(1, Math.ceil(qsa("[data-problem-metric-detail]").length / METRIC_PAGE_SIZE));
  bindProblemMetricRows();
  renderProblemMetricSelector();
  closeModalById("problemMetricAddModal");
  renderProblemSummary();
}

function bindCustomCandidates() {
  qs("#openProblemDimensionAddModal")?.addEventListener("click", () => {
    clearCustomInputs(["#problemAddDimensionName", "#problemAddDimensionField", "#problemAddDimensionLevel", "#problemAddDimensionDesc"]);
    openModalById("problemDimensionAddModal");
  });
  qs("#confirmProblemDimensionAdd")?.addEventListener("click", addProblemCustomDimension);
  qs("#confirmProblemDimensionDetail")?.addEventListener("click", confirmProblemDimensionDetail);
  qs("#openProblemMetricAddModal")?.addEventListener("click", () => {
    clearCustomInputs(["#problemAddMetricName", "#problemAddMetricDefinition", "#problemAddMetricScope", "#problemAddMetricFormula", "#problemAddMetricFilter", "#problemAddMetricTime", "#problemAddMetricDimension"]);
    const type = qs("#problemAddMetricType");
    const tip = qs("#problemAddMetricTip");
    if (type) type.value = "atomic";
    if (tip) tip.value = "用户补充";
    openModalById("problemMetricAddModal");
  });
  qs("#confirmProblemMetricAdd")?.addEventListener("click", addProblemCustomMetric);
  qs("#confirmProblemMetricDetail")?.addEventListener("click", confirmProblemMetricDetail);
  qs("#problemMetricReuseAction")?.addEventListener("change", syncProblemMetricReuseHint);
  qs("#problemMetricReuseSelect")?.addEventListener("change", syncProblemMetricReuseHint);
  qs("#resolveProblemMetricConflict")?.addEventListener("click", openProblemMetricConflictResolution);
}

function bindProblemDimensionRows() {
  qsa("[data-problem-dimension-row]").forEach((row) => {
    if (row.dataset.problemDimensionBound === "true") return;
    row.dataset.problemDimensionBound = "true";
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openProblemDimensionDetailModal(row.dataset.problemDimensionDetail);
    });
    qsa("[data-problem-dimension-action]", row).forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.problemDimensionAction;
        if (action === "detail") {
          openProblemDimensionDetailModal(row.dataset.problemDimensionDetail);
          return;
        }
        if (action === "remove") removeProblemDimensionRow(row);
      });
    });
  });
}

function bindProblemMetricRows() {
  qsa("[data-problem-metric-row]").forEach((row) => {
    if (row.dataset.problemMetricBound === "true") return;
    row.dataset.problemMetricBound = "true";
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openProblemMetricDetailModal(row.dataset.problemMetricDetail);
    });
    qsa("[data-problem-metric-action]", row).forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.problemMetricAction;
        if (action === "detail") {
          openProblemMetricDetailModal(row.dataset.problemMetricDetail);
          return;
        }
        if (action === "remove") removeProblemMetricRow(row);
      });
    });
  });
}

function bindPublishActions() {
  qs("#confirmPublish")?.addEventListener("click", () => {
    const payload = buildProblemPublishPayload();
    const button = qs("#confirmPublish");
    if (button) {
      button.disabled = true;
      button.textContent = "生成中";
    }
    qs("#publishModal")?.classList.remove("open");
    const result = qs("#problemPublishResult");
    if (result) {
      result.hidden = false;
      result.textContent = "生成成功，正在打开生成结果。";
    }
    savePublishPayload(payload);
    window.location.href = `metric-publish-result.html?publishId=${encodeURIComponent(payload.publishId)}`;
  });
}

function buildProblemPublishPayload() {
  const metricSetName = qs("#problemMetricSetName")?.value.trim() || "成交下降诊断指标资产";
  const businessTheme = qs("#problemBusinessThemeName")?.value.trim() || "交易经营";
  const businessThemeBoundary = qs("#problemBusinessThemeBoundary")?.value.trim() || "";
  const sceneTags = qs("#problemSceneTags")?.value.trim() || "经营诊断、交易分析";
  const businessThemeDescription = qs("#problemBusinessThemeDescription")?.value.trim() || "";
  const relatedThemes = qs("#problemRelatedThemes")?.value.trim() || "营销增长、供应链履约";
  const customTopic = qs("#problemCustomTopic")?.value.trim();
  const topics = activeProblemTopics();
  const dimensions = checkedValues("problemDimension").length;
  const metrics = checkedValues("problemMetric").length;
  const computeDisplay = problemComputeDisplayState();
  const outputAssets = problemOutputAssetDefinitions();
  if (customTopic) topics.push(customTopic);

  return {
    publishId: `METRIC-GEN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Date.now()).slice(-5)}`,
    status: "已生成",
    businessTheme,
    businessThemeBoundary,
    sceneTags: sceneTags.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
    relatedThemes: relatedThemes.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
    businessThemeDescription,
    metricSetName,
    model: state.problemPrimaryModel || "未选择",
    relatedModels: [],
    topics,
    scope: ["业务主题", "分析方向", "指标", "维度", "Metric DSL", "逻辑输出资产", "计算配置"],
    computeConfig: {
      mode: computeDisplay.computeMode,
      schedule: computeDisplay.scheduleCycle,
      scheduleConfig: computeDisplay.scheduleConfig,
      timeWindow: "根据指标定义自动推算",
      retryPolicy: computeDisplay.retryPolicy,
      outputAssetType: computeDisplay.outputLabel,
      outputTable: qs("#problemOutputTable")?.value.trim() || computeDisplay.outputAsset,
      sharedPhysicalAsset: state.sharedAssetAccepted,
      outputAssets: outputAssets.map((asset) => ({
        name: asset.name,
        relation: asset.relation,
        directions: asset.directions,
        logicalAssets: asset.logicalAssets,
        metricSets: asset.metricSets,
        computeTask: asset.task,
      })),
      physicalAssets: outputAssets.map((asset) => asset.name),
      logicalAssets: outputAssets.flatMap((asset) => asset.logicalAssets),
      computeTasks: outputAssets.map((asset) => asset.task),
      publishStrategy: "确认后生成资产",
      generatedSql: qs("#problemGeneratedSql")?.value || "",
      generatedSqlByAsset: Object.fromEntries(outputAssets.map((asset) => [asset.name, asset.sql])),
      sqlSource: "Metric DSL 编译生成",
    },
    dimensions,
    metrics,
    metricDslDefinitions: metrics || 5,
    dslValidation: {
      status: "通过",
      fieldChecks: 5,
      aggregationChecks: 5,
      dependencyChecks: 3,
      sqlCompileChecks: 3,
    },
    conflictResolution: {
      reusable: 1,
      mergeOrVersion: 2,
      manualReview: 1,
      newAssets: 1,
    },
    metricSets: topics.length || 5,
    primaryMetricSets: topics.length || 5,
    extensionMetricSets: state.extensionMetricSetAccepted ? 1 : 0,
    logicalAssets: 5,
    physicalAssets: outputAssets.length,
    sharedPhysicalAssets: state.sharedAssetAccepted ? 1 : 0,
    mergedComputeGroups: state.sharedAssetAccepted ? 1 : 0,
    question: "最近 30 天成交金额为什么下降了？",
    publishedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
  };
}

function savePublishPayload(payload) {
  try {
    sessionStorage.setItem("metricPublishResult", JSON.stringify(payload));
  } catch (error) {
    // The result page has fallback data when sessionStorage is unavailable.
  }
}

bindModalTriggers();
bindProblemEntry();
bindProblemBusinessThemeOptions();
bindProblemStepper();
bindProblemComputeMode();
bindProblemScheduleFields();
bindProblemModelFilters();
bindProblemThemeFilters();
bindProblemTopicFilters();
bindProblemTopicCards();
bindProblemDimensionFilters();
bindProblemMetricFilters();
bindCustomCandidates();
bindProblemDimensionRows();
bindProblemMetricRows();
bindSharedAssetSuggestion();
bindMetricSetSuggestion();
bindPublishActions();
renderProblemModelPools();
renderBusinessThemeOptions();
renderProblemTopicSelector();
renderProblemDimensionSelector();
renderProblemMetricSelector();
renderSharedAssetSuggestion();
renderMetricSetSuggestion();
syncProblemComputeMode();
renderProblemStep();
})();

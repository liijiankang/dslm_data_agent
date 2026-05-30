(function () {
const { bindModalTriggers, paginationButtons, qs, qsa, statusPill } = window.UI;

const PROBLEM_TOTAL_STEPS = 8;
const PROBLEM_MODEL_PAGE_SIZE = 4;
const BUSINESS_THEME_PAGE_SIZE = 3;
const TOPIC_PAGE_SIZE = 4;
const DIMENSION_PAGE_SIZE = 4;
const METRIC_PAGE_SIZE = 4;
const QUALITY_CHECKS = ["重复指标", "口径冲突", "相似指标"];
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
};

const problemModelPool = [
  {
    name: "订单交易库",
    domain: "trade",
    status: "ready",
    recommended: true,
    role: "核心计算",
    summary: "9 个资产对象，11 个关系，订单、支付、退款和商品语义已确认。",
    coverage: "96%",
    confidence: "高",
    missingFields: "无关键缺失",
    freshness: "T+0 02:10",
    qualityRisk: "近 30 天分区完整",
    tags: ["订单经营", "支付转化", "售后退款"],
    keywords: "订单 支付 退款 商品 订单经营 支付转化 售后退款 成交金额",
  },
  {
    name: "CRM 业务库",
    domain: "customer",
    status: "ready",
    recommended: true,
    role: "客户分层",
    summary: "12 个资产对象，18 个关系，客户、商机、合同和销售活动语义已确认。",
    coverage: "82%",
    confidence: "中",
    missingFields: "客户等级历史快照待补齐",
    freshness: "T+1 01:30",
    qualityRisk: "客户分层字段存在 3% 空值",
    tags: ["客户分析", "销售漏斗", "客户分层"],
    keywords: "CRM 客户 商机 合同 销售活动 客户分析 客户分层 成交归因",
  },
  {
    name: "营销活动库",
    domain: "marketing",
    status: "ready",
    recommended: true,
    role: "渠道归因",
    summary: "10 个资产对象，13 个关系，活动、触达、线索和转化事件语义已确认。",
    coverage: "88%",
    confidence: "高",
    missingFields: "部分投放素材标签待补齐",
    freshness: "T+0 03:20",
    qualityRisk: "渠道归因链路完整",
    tags: ["活动 ROI", "触达转化", "渠道分析"],
    keywords: "营销 活动 投放 触达 转化 ROI 客户分层 增长分析 渠道",
  },
  {
    name: "客服工单库",
    domain: "service",
    status: "attention",
    recommended: false,
    role: "售后解释",
    summary: "7 个资产对象，8 个关系，工单分类、SLA 和售后处理字段待补充。",
    coverage: "68%",
    confidence: "中",
    missingFields: "SLA 口径、工单分类语义待确认",
    freshness: "T+1 05:00",
    qualityRisk: "售后处理时长存在异常值",
    tags: ["服务质量", "售后分析", "满意度"],
    keywords: "客服 工单 SLA 售后 满意度 服务质量 售后分析",
  },
  {
    name: "财务回款库",
    domain: "finance",
    status: "ready",
    recommended: false,
    role: "财务校验",
    summary: "8 个资产对象，10 个关系，应收、发票、回款和合同映射语义已确认。",
    coverage: "79%",
    confidence: "中",
    missingFields: "收入确认口径需财务复核",
    freshness: "T+1 02:00",
    qualityRisk: "跨月回款分摊需审核",
    tags: ["回款分析", "应收账款", "收入确认"],
    keywords: "财务 回款 应收 发票 合同 收入 毛利 经营分析",
  },
  {
    name: "商品库存库",
    domain: "supply",
    status: "attention",
    recommended: true,
    role: "商品/履约解释",
    summary: "11 个资产对象，14 个关系，SKU、仓库和出入库字段已识别，成本口径待确认。",
    coverage: "74%",
    confidence: "中",
    missingFields: "成本口径、履约时效字段待确认",
    freshness: "T+0 04:10",
    qualityRisk: "部分仓库库存快照延迟",
    tags: ["库存周转", "SKU 分析", "补货预警"],
    keywords: "商品 库存 SKU 仓库 采购 入库 出库 周转 供应链 商品类目",
  },
  {
    name: "会员权益库",
    domain: "customer",
    status: "ready",
    recommended: false,
    role: "会员分层",
    summary: "6 个资产对象，9 个关系，会员等级、积分、权益领取和核销语义已确认。",
    coverage: "71%",
    confidence: "中",
    missingFields: "会员等级变更历史待补齐",
    freshness: "T+1 00:40",
    qualityRisk: "权益核销渠道存在缺失",
    tags: ["会员留存", "权益核销", "复购分析"],
    keywords: "会员 权益 积分 等级 客户 留存 复购 生命周期",
  },
  {
    name: "采购履约库",
    domain: "supply",
    status: "ready",
    recommended: false,
    role: "采购履约",
    summary: "9 个资产对象，12 个关系，供应商、采购订单、到货和结算语义已确认。",
    coverage: "77%",
    confidence: "中",
    missingFields: "到货异常原因语义待补充",
    freshness: "T+1 03:00",
    qualityRisk: "供应商编码存在历史合并",
    tags: ["供应商绩效", "到货及时率", "采购结算"],
    keywords: "采购 供应商 履约 到货 入库 结算 供应链",
  },
];

const problemDimensionDetails = {
  time: {
    title: "时间维度",
    items: [
      ["来源字段", "order.order_time"],
      ["维度层级", "年 > 月 > 日"],
      ["必要程度", "高"],
      ["业务说明", "用于按时间周期观察成交金额、订单数和支付转化趋势。"],
      ["适用分析方向", "订单经营分析、支付转化分析"],
      ["推荐原因", "用户问题关注最近 30 天成交变化，时间维度是趋势定位的基础维度。"],
    ],
  },
  channel: {
    title: "渠道维度",
    items: [
      ["来源字段", "order.channel"],
      ["维度层级", "渠道"],
      ["必要程度", "高"],
      ["业务说明", "用于比较小程序、门店等渠道的成交贡献和支付转化差异。"],
      ["适用分析方向", "渠道贡献分析、支付转化分析"],
      ["推荐原因", "用户明确要求重点看小程序和门店渠道，需要保留为核心分析维度。"],
    ],
  },
  customerSegment: {
    title: "客户分层",
    items: [
      ["来源字段", "customer.customer_level"],
      ["维度层级", "等级"],
      ["必要程度", "中"],
      ["业务说明", "用于分析不同客户层级的成交贡献、复购和转化表现。"],
      ["适用分析方向", "客户分层分析、订单经营分析"],
      ["推荐原因", "客户结构变化可能解释成交下降，但不是用户问题中显式要求的核心维度。"],
    ],
  },
  productCategory: {
    title: "商品类目",
    items: [
      ["来源字段", "product.category"],
      ["维度层级", "一级类目 > 二级类目"],
      ["必要程度", "中"],
      ["业务说明", "用于分析类目结构变化、重点商品下滑和成交金额贡献。"],
      ["适用分析方向", "商品结构分析、订单经营分析"],
      ["推荐原因", "类目结构可能影响成交金额，适合作为成交下降的辅助解释维度。"],
    ],
  },
  region: {
    title: "地区维度",
    items: [
      ["来源字段", "customer.province, customer.city"],
      ["维度层级", "省 > 市"],
      ["必要程度", "低"],
      ["业务说明", "用于观察不同区域、城市或门店所在地区的成交变化。"],
      ["适用分析方向", "地区差异分析"],
      ["推荐原因", "当前问题未明确强调地区，仅作为扩展分析维度保留。"],
    ],
  },
};

const problemMetricDetails = {
  orders: {
    title: "订单数",
    items: [
      ["指标编码", "order_count"],
      ["指标类型", "原子指标"],
      ["业务定义", "统计周期内产生的有效订单数量。"],
      ["统计口径", "排除取消订单。"],
      ["计算公式", "COUNT(order_id)"],
      ["过滤条件", "order.status != 'cancelled'"],
      ["时间口径", "按 order.order_time 统计"],
      ["语义模型", "order_payment"],
      ["可加性", "完全可加"],
      ["默认聚合", "count_distinct"],
      ["时间聚合", "sum_by_day"],
      ["统计粒度", "date, channel"],
      ["派生依赖", "无"],
      ["可用维度", "时间维度、渠道维度、客户分层、商品类目"],
      ["相似度评分", "91%"],
      ["处理建议", "推荐复用已有订单数指标，补充本次场景标签。"],
      ["DSL校验", "通过"],
      ["质量提示", "可复用"],
    ],
  },
  gmv: {
    title: "成交金额",
    items: [
      ["指标编码", "gmv"],
      ["指标类型", "原子指标"],
      ["业务定义", "用户完成支付后产生的订单支付金额总和。"],
      ["统计口径", "仅统计支付成功订单，不扣除退款。"],
      ["计算公式", "SUM(pay_amount)"],
      ["过滤条件", "payment.status = 'success'"],
      ["时间口径", "按 payment.pay_time 统计"],
      ["语义模型", "order_payment"],
      ["可加性", "完全可加"],
      ["默认聚合", "sum"],
      ["时间聚合", "sum_by_day"],
      ["统计粒度", "date, channel, product_category"],
      ["派生依赖", "无"],
      ["可用维度", "时间维度、渠道维度、商品类目、地区维度"],
      ["相似度评分", "86%"],
      ["处理建议", "与存量 GMV 口径接近，建议基于已有指标新建 v2 并记录不扣退款口径。"],
      ["DSL校验", "通过"],
      ["质量提示", "口径需确认"],
    ],
  },
  paySuccessRate: {
    title: "支付成功率",
    items: [
      ["指标编码", "pay_success_rate"],
      ["指标类型", "派生指标"],
      ["业务定义", "成功支付订单数占提交订单数的比例。"],
      ["统计口径", "按支付状态统计，排除取消订单。"],
      ["计算公式", "支付成功订单数 / 提交订单数"],
      ["过滤条件", "order.status in ('submitted', 'paid')"],
      ["时间口径", "按 order.create_time 和 payment.pay_time 统计"],
      ["语义模型", "order_payment"],
      ["可加性", "不可加"],
      ["默认聚合", "ratio"],
      ["时间聚合", "ratio_recalculate"],
      ["统计粒度", "date, channel"],
      ["派生依赖", "pay_success_order_count, pay_submit_order_count"],
      ["可用维度", "时间维度、渠道维度、地区维度"],
      ["相似度评分", "62%"],
      ["处理建议", "提示相似，需人工确认分母口径后再发布。"],
      ["DSL校验", "通过"],
      ["质量提示", "建议新建"],
    ],
  },
  channelContributionRate: {
    title: "渠道成交贡献率",
    items: [
      ["指标编码", "channel_gmv_share"],
      ["指标类型", "派生指标"],
      ["业务定义", "某渠道成交金额占全部成交金额的比例。"],
      ["统计口径", "按渠道分组统计支付成功订单成交金额。"],
      ["计算公式", "渠道成交金额 / 总成交金额"],
      ["过滤条件", "payment.status = 'success'"],
      ["时间口径", "按 payment.pay_time 统计"],
      ["语义模型", "order_payment"],
      ["可加性", "不可加"],
      ["默认聚合", "ratio"],
      ["时间聚合", "ratio_recalculate"],
      ["统计粒度", "date, channel"],
      ["派生依赖", "channel_gmv, total_gmv"],
      ["可用维度", "时间维度、渠道维度"],
      ["相似度评分", "48%"],
      ["处理建议", "允许新建，需绑定渠道维度和总成交金额依赖。"],
      ["DSL校验", "通过"],
      ["质量提示", "建议新建"],
    ],
  },
  refundImpact: {
    title: "退款影响金额",
    items: [
      ["指标编码", "refund_amount"],
      ["指标类型", "原子指标"],
      ["业务定义", "统计周期内退款成功产生的退款金额总和。"],
      ["统计口径", "仅统计退款成功记录。"],
      ["计算公式", "SUM(refund_amount)"],
      ["过滤条件", "refund.status = 'success'"],
      ["时间口径", "按 refund.refund_time 统计"],
      ["语义模型", "refund_detail"],
      ["可加性", "完全可加"],
      ["默认聚合", "sum"],
      ["时间聚合", "sum_by_day"],
      ["统计粒度", "date, channel, product_category"],
      ["派生依赖", "无"],
      ["可用维度", "时间维度、渠道维度、商品类目"],
      ["相似度评分", "78%"],
      ["处理建议", "与存量退款金额相似，建议合并或基于已有指标新建版本。"],
      ["DSL校验", "通过"],
      ["质量提示", "相似指标"],
    ],
  },
};

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
    quality: "质量指标",
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
    质量指标: "quality",
    运营阈值指标: "threshold",
    预警指标: "threshold",
  }[label] || "atomic";
}

function qualityTipTone(value) {
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

function problemComputeDisplayState() {
  const computeMode = selectedRadioValue("problemComputeMode") || PROBLEM_OFFLINE_COMPUTE_MODE;
  const isQuery = isProblemQueryComputeMode(computeMode);
  const scheduleConfig = buildProblemScheduleConfig();
  return {
    computeMode,
    isQuery,
    scheduleCycle: isQuery ? "无需任务调度" : scheduleConfig.summary,
    scheduleConfig: isQuery ? null : scheduleConfig,
    retryPolicy: isQuery ? "无需离线任务重试" : qs("#problemRetryPolicy")?.value || "失败后重试 3 次",
    outputAsset: isQuery ? PROBLEM_QUERY_OUTPUT_ASSET : PROBLEM_OFFLINE_OUTPUT_TABLE,
    outputLabel: isQuery ? "查询视图/语义服务" : state.sharedAssetAccepted ? "共享结果表" : "主结果表",
    outputHint: isQuery
      ? "查询时计算会发布语义查询视图，不生成离线结果表，适合低频探索和实时口径校验。"
      : state.sharedAssetAccepted
        ? "逻辑输出资产按分析方向独立治理，物理输出资产可共享，系统保留独立血缘、权限和消费说明。"
        : "每个分析方向生成独立物理结果表，治理边界清晰但会增加计算和存储成本。",
    dagOutputName: isQuery ? "成交下降语义查询视图" : state.sharedAssetAccepted ? "ads_metric_order_daily" : "方向独立结果表",
    dagOutputDesc: isQuery ? "语义查询、问数、API 服务" : state.sharedAssetAccepted ? "3 个逻辑资产共享，独立血缘和监控" : "每个方向独立物理资产",
    services: isQuery ? ["指标目录", "智能问数", "API 服务", "查询时计算"] : ["指标目录", "智能问数", "API 服务", "调度计算"],
  };
}

function syncProblemComputeMode() {
  const display = problemComputeDisplayState();
  const scheduleFields = qs("#problemScheduleFields");
  const scheduleHint = qs("#problemQueryScheduleHint");
  const scheduleBlock = qs("#problemScheduleBlock");
  const outputLabel = qs("#problemOutputAssetLabel");
  const outputInput = qs("#problemOutputTable");
  const outputHint = qs("#problemOutputAssetHint");
  const dagOutputName = qs("#problemDagOutputAssetName");
  const dagOutputDesc = qs("#problemDagOutputAssetDesc");
  const dagComputeTask = qs("#problemDagComputeTask");

  if (scheduleFields) scheduleFields.hidden = display.isQuery;
  if (scheduleHint) scheduleHint.hidden = !display.isQuery;
  if (scheduleBlock) scheduleBlock.classList.toggle("is-query-compute", display.isQuery);
  if (outputLabel) outputLabel.textContent = display.outputLabel;
  if (outputInput) {
    const currentValue = outputInput.value.trim();
    const isDefaultAsset = !currentValue || currentValue === PROBLEM_OFFLINE_OUTPUT_TABLE || currentValue === PROBLEM_QUERY_OUTPUT_ASSET;
    if (isDefaultAsset) outputInput.value = display.outputAsset;
  }
  if (outputHint) outputHint.textContent = display.outputHint;
  if (dagOutputName) dagOutputName.textContent = display.dagOutputName;
  if (dagOutputDesc) dagOutputDesc.textContent = display.dagOutputDesc;
  if (dagComputeTask) dagComputeTask.textContent = display.isQuery ? "query_metric_deal_decline" : state.sharedAssetAccepted ? "task_metric_order_daily" : "方向独立计算任务";
  updateProblemSchedulePanels();
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
  qs("#problemMetricModalTipText").textContent = itemValue(detail, "质量提示");
  qs("#problemMetricModalDimensionText").textContent = itemValue(detail, "可用维度");
  qs("#problemMetricModalSuggestionText").textContent = itemValue(detail, "处理建议") || "待确认";
  qs("#problemMetricModalDslPreview").value = metricDslPreview(detail);
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
  const additivity = qs("[data-problem-metric-additivity]", row);
  const formula = qs("[data-problem-metric-formula]", row);
  const scope = qs("[data-problem-metric-scope]", row);
  const tip = qs("[data-problem-metric-tip]", row);
  const checkbox = qs('input[name="problemMetric"]', row);
  const typeLabel = itemValue(detail, "指标类型");
  const additivityValue = itemValue(detail, "可加性") || "待评估";
  const tipValue = itemValue(detail, "质量提示") || "建议新建";
  if (title) title.textContent = detail.title;
  if (code) code.textContent = itemValue(detail, "指标编码") || "待生成";
  if (type) type.textContent = typeLabel;
  if (additivity) additivity.innerHTML = statusPill(additivityValue, additivityTone(additivityValue));
  if (formula) formula.textContent = itemValue(detail, "计算公式");
  if (scope) scope.textContent = itemValue(detail, "统计口径");
  if (tip) tip.innerHTML = statusPill(tipValue, qualityTipTone(tipValue));
  if (checkbox) checkbox.value = detail.title;
  row.dataset.problemMetricType = metricTypeValue(typeLabel);
  row.dataset.problemMetricKeywords = `${detail.title} ${itemValue(detail, "指标编码")} ${typeLabel} ${additivityValue} ${itemValue(detail, "业务定义")} ${itemValue(detail, "统计口径")} ${itemValue(detail, "计算公式")} ${itemValue(detail, "过滤条件")} ${itemValue(detail, "质量提示")}`;
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
  updateProblemMetricRow(row, detail);
  applyProblemMetricState(row, "confirm");
  closeModalById("problemMetricDetailModal");
}

function removeProblemMetricRow(row) {
  if (!row) return;
  const key = row.dataset.problemMetricDetail;
  delete problemMetricDetails[key];
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
        <div><span>质量风险</span><strong>${escapeHtml(model.qualityRisk || "待评估")}</strong></div>
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
  const outputInput = qs("#problemOutputTable");
  const physicalAssets = {
    order: "ads_metric_order_volume_daily",
    aov: "ads_metric_aov_daily",
    channel: "ads_metric_channel_mix_daily",
  };
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
  if (outputInput) outputInput.value = state.sharedAssetAccepted ? "ads_metric_order_daily" : "ads_metric_order_volume_daily";
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
  if (customTopic) topics.push(customTopic);

  const setText = (selector, value) => {
    const node = qs(selector);
    if (node) node.textContent = value;
  };

  setText("#problemPublishSummaryDimensions", `维度 ${dimensions.length} 个`);
  setText("#problemPublishSummaryMetrics", `指标 ${metrics.length} 个`);
  setText("#problemPublishComputePreview", `${computeDisplay.computeMode}，${computeDisplay.scheduleCycle}，${state.sharedAssetAccepted ? "共享物理资产" : "方向独立产出"}`);
  setText("#problemPublishSummaryPhysicalAssets", state.sharedAssetAccepted ? "物理输出资产 3 个" : "物理输出资产 5 个");
  setText("#publishSharedAssetPreview", state.sharedAssetAccepted ? "ads_metric_order_daily" : "保持方向独立结果表");

  const computeSummary = computeDisplay.isQuery
    ? `并按${computeDisplay.computeMode}生成查询配置`
    : `并按${computeDisplay.computeMode}、${computeDisplay.scheduleCycle}生成调度配置`;
  setText("#publishModalSummary", `本次将发布「${businessTheme}」主题下的 ${topics.length} 个分析方向，场景标签为「${sceneTags}」，包含维度 ${dimensions.length} 个、指标 ${metrics.length} 个、主指标集 ${topics.length} 个、扩展指标集 ${state.extensionMetricSetAccepted ? 1 : 0} 个，${computeSummary}。`);
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
    result.textContent = "已模拟暂存草稿：业务主题、分析方向、数据模型、维度指标、逻辑输出资产、共享物理资产建议和计算配置会保留在待发布状态。";
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
      ["处理建议", "用户补充指标，发布前进入 DSL 校验和相似度检测。"],
      ["DSL校验", "待校验"],
      ["质量提示", tip],
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
    <td data-problem-metric-additivity>${statusPill(additivity, additivityTone(additivity))}</td>
    <td data-problem-metric-formula>${escapeHtml(formula)}</td>
    <td data-problem-metric-scope>${escapeHtml(scope || "待补充")}</td>
    <td data-problem-metric-tip>${statusPill(tip, qualityTipTone(tip))}</td>
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
      button.textContent = "发布中";
    }
    qs("#publishModal")?.classList.remove("open");
    const result = qs("#problemPublishResult");
    if (result) {
      result.hidden = false;
      result.textContent = "发布成功，正在打开发布结果。";
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
  if (customTopic) topics.push(customTopic);

  return {
    publishId: `METRIC-PUB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Date.now()).slice(-5)}`,
    status: "已发布",
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
    qualityChecks: QUALITY_CHECKS,
    computeConfig: {
      mode: computeDisplay.computeMode,
      schedule: computeDisplay.scheduleCycle,
      scheduleConfig: computeDisplay.scheduleConfig,
      timeWindow: "根据指标定义自动推算",
      retryPolicy: computeDisplay.retryPolicy,
      outputAssetType: computeDisplay.outputLabel,
      outputTable: qs("#problemOutputTable")?.value.trim() || computeDisplay.outputAsset,
      sharedPhysicalAsset: state.sharedAssetAccepted,
      physicalAssets: state.sharedAssetAccepted
        ? ["ads_metric_order_daily", "ads_metric_payment_daily", "ads_metric_refund_daily"]
        : ["ads_metric_order_volume_daily", "ads_metric_aov_daily", "ads_metric_channel_mix_daily", "ads_metric_payment_daily", "ads_metric_refund_daily"],
      logicalAssets: ["订单量变化结果", "客单价变化结果", "渠道结构变化结果", "支付转化结果", "退款影响结果"],
      computeTasks: state.sharedAssetAccepted
        ? ["task_metric_order_daily", "task_metric_payment_daily", "task_metric_refund_daily"]
        : ["task_metric_order_volume_daily", "task_metric_aov_daily", "task_metric_channel_mix_daily", "task_metric_payment_daily", "task_metric_refund_daily"],
      publishStrategy: "立即正式发布",
      generatedSql: qs("#problemGeneratedSql")?.value || "",
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
    physicalAssets: state.sharedAssetAccepted ? 3 : 5,
    sharedPhysicalAssets: state.sharedAssetAccepted ? 1 : 0,
    mergedComputeGroups: state.sharedAssetAccepted ? 1 : 0,
    services: computeDisplay.services,
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

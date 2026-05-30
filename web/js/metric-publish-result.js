(function () {
const { qs, statusPill } = window.UI;

const fallback = {
  publishId: "METRIC-GEN-20260528-00001",
  status: "已生成",
  metricSetName: "成交下降诊断指标资产",
  businessTheme: "交易经营",
  relatedThemes: ["营销增长", "供应链履约"],
  sceneTags: ["经营诊断", "交易分析"],
  model: "订单交易库",
  relatedModels: ["支付明细库", "退款明细库", "商品库存库"],
  topics: ["订单量变化分析", "客单价变化分析", "支付转化分析", "渠道结构变化分析", "退款影响分析"],
  scope: ["业务主题", "分析方向", "指标", "维度", "Metric DSL", "逻辑输出资产", "计算配置"],
  dimensions: 8,
  metrics: 25,
  metricDslDefinitions: 5,
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
  metricSets: 5,
  primaryMetricSets: 5,
  extensionMetricSets: 1,
  logicalAssets: 5,
  physicalAssets: 3,
  sharedPhysicalAssets: 1,
  mergedComputeGroups: 1,
  computeConfig: {
    sharedPhysicalAsset: true,
    physicalAssets: ["ads_metric_order_daily", "ads_metric_payment_daily", "ads_metric_refund_daily"],
    logicalAssets: ["订单量变化结果", "客单价变化结果", "渠道结构变化结果", "支付转化结果", "退款影响结果"],
    computeTasks: ["task_metric_order_daily", "task_metric_payment_daily", "task_metric_refund_daily"],
  },
  publishedAt: "2026/5/28 19:40:00",
};

function loadResult() {
  try {
    const stored = JSON.parse(sessionStorage.getItem("metricPublishResult") || "null");
    if (stored && typeof stored === "object") return Object.assign({}, fallback, stored);
  } catch (error) {
    return fallback;
  }
  return fallback;
}

function renderText(selector, value) {
  const node = qs(selector);
  if (node) node.textContent = value;
}

function renderList(value) {
  return Array.isArray(value) && value.length ? value.join("、") : "-";
}

function renderAssets(result) {
  const node = qs("#publishAssets");
  if (!node) return;
  const rows = [
    ["维度", result.dimensions, "公共维度和方向特有维度"],
    ["指标", result.metrics, "指标定义、口径、编码和计算表达式"],
    ["Metric DSL", result.metricDslDefinitions || result.metrics || 0, "机器可执行定义、SQL 编译、测试和版本快照"],
    ["主指标集", result.primaryMetricSets || result.metricSets, "按分析方向自动生成"],
    ["扩展指标集", result.extensionMetricSets || 0, "归因和深度分析分组"],
    ["逻辑输出资产", result.logicalAssets || 0, "方向级血缘、权限和业务说明"],
    ["物理输出资产", result.physicalAssets || 0, "真实落地表或视图"],
    ["合并计算任务", result.mergedComputeGroups || 0, "共享计算链路，保留方向级监控"],
  ];
  node.innerHTML = rows
    .map(
      ([type, count, scope]) => `
        <tr>
          <td><strong>${type}</strong></td>
          <td>${count}</td>
          <td>${statusPill("已生成", "green")}</td>
          <td>${scope}</td>
        </tr>
      `
    )
    .join("");
}

function renderAssetMap(result) {
  const node = qs("#publishAssetMap");
  if (!node) return;
  const shared = result.computeConfig?.sharedPhysicalAsset !== false;
  const rows = shared
    ? [
        ["订单量变化分析", "订单量变化结果", "ads_metric_order_daily", "共享"],
        ["客单价变化分析", "客单价变化结果", "ads_metric_order_daily", "共享"],
        ["渠道结构变化分析", "渠道结构变化结果", "ads_metric_order_daily", "共享"],
        ["支付转化分析", "支付转化结果", "ads_metric_payment_daily", "独立"],
        ["退款影响分析", "退款影响结果", "ads_metric_refund_daily", "独立"],
      ]
    : [
        ["订单量变化分析", "订单量变化结果", "ads_metric_order_volume_daily", "独立"],
        ["客单价变化分析", "客单价变化结果", "ads_metric_aov_daily", "独立"],
        ["渠道结构变化分析", "渠道结构变化结果", "ads_metric_channel_mix_daily", "独立"],
        ["支付转化分析", "支付转化结果", "ads_metric_payment_daily", "独立"],
        ["退款影响分析", "退款影响结果", "ads_metric_refund_daily", "独立"],
      ];

  node.innerHTML = `
    <div class="table-wrap">
      <table class="table publish-asset-table">
        <thead>
          <tr>
            <th>分析方向</th>
            <th>逻辑输出资产</th>
            <th>物理输出资产</th>
            <th>关系</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              ([direction, logical, physical, relation]) => `
                <tr>
                  <td><strong>${escapeHtml(direction)}</strong></td>
                  <td>${escapeHtml(logical)}</td>
                  <td>${escapeHtml(physical)}</td>
                  <td>${statusPill(relation === "共享" ? "共享物理资产" : "独立产出", relation === "共享" ? "green" : "blue")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
  renderText("#publishSharedSummary", shared ? `${result.sharedPhysicalAssets || 1} 个共享物理资产` : "保持方向独立产出");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render() {
  const result = loadResult();
  renderText("#publishStatus", result.status);
  renderText("#publishHeroCopy", `${result.metricSetName} 已成为正式 Data Metrics 资产，指标定义、输出资产和计算链路已生成。`);
  renderText("#publishId", result.publishId);
  renderText("#publishMetricSets", result.primaryMetricSets || result.metricSets);
  renderText("#publishMetricDsl", result.metricDslDefinitions || result.metrics || 0);
  renderText("#publishLogicalAssets", result.logicalAssets || 0);
  renderText("#publishPhysicalAssets", result.physicalAssets || 0);
  renderText("#publishTime", result.publishedAt);
  renderText("#publishName", result.metricSetName);
  renderText("#publishBusinessTheme", result.businessTheme);
  renderText("#publishRelatedThemes", renderList(result.relatedThemes));
  renderText("#publishTopics", renderList(result.topics));
  renderText("#publishSceneTags", renderList(result.sceneTags));
  renderText("#publishDslValidation", `字段 ${result.dslValidation?.fieldChecks || 0} 项、聚合 ${result.dslValidation?.aggregationChecks || 0} 项、依赖 ${result.dslValidation?.dependencyChecks || 0} 项、SQL 编译 ${result.dslValidation?.sqlCompileChecks || 0} 项通过`);
  renderText("#publishConflictResolution", `${result.conflictResolution?.reusable || 0} 个复用，${result.conflictResolution?.mergeOrVersion || 0} 个合并/版本，${result.conflictResolution?.manualReview || 0} 个人工确认，${result.conflictResolution?.newAssets || 0} 个新建`);
  renderAssetMap(result);
  renderAssets(result);
}

render();
})();

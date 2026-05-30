(function () {
const { qs, statusPill } = window.UI;

const THEMES = {
  trade: {
    name: "交易经营",
    status: { label: "2 个待审核", tone: "amber" },
    subtitle: "围绕订单成交、支付转化、退款影响、渠道贡献和商品结构沉淀交易经营指标资产。",
    systems: 2,
    sets: 8,
    metrics: 60,
    dimensions: 14,
    qualityScore: "86%",
    calls: "7,336",
    version: "主题 v1.4",
    boundary: "订单、支付、退款、渠道、商品和成交趋势",
    mainModel: "订单交易库",
    relatedModels: "支付明细库、退款明细库、商品库存库、CRM 业务库",
    owner: "经营分析组",
    createdAt: "2026-05-21 09:30",
    updatedAt: "2026-05-29 13:18",
    runStatus: "治理中",
    computeMode: "离线周期计算为主",
    schedule: "每日 02:00 + 每小时补充",
    outputTable: "ads_metric_trade_*",
    lastRun: "2026-05-29 13:52 成功",
    qualitySummary: "4 项待处理",
    dagJoin: "交易经营宽表",
    dagJoinDesc: "订单、支付、退款、商品和渠道关联",
    dagCompute: "交易指标计算",
    dagComputeDesc: "成交金额、订单数、支付成功率、渠道贡献率",
    dagOutput: "交易经营指标资产",
    dagOutputDesc: "场景标签、主指标集、问数、API",
    dagSources: [
      ["dwd_order_detail", "订单、渠道、商品"],
      ["dwd_payment_detail", "支付状态、支付金额"],
      ["dwd_refund_detail", "退款状态、退款金额"],
    ],
    quality: [
      ["口径校验通过", "成交金额、订单数、客单价口径与历史资产一致。", "green"],
      ["血缘待确认", "支付明细库字段 pay_status 变更后需要确认影响范围。", "amber"],
      ["相似指标提示", "支付成功率与支付转化率存在相似命名。", "amber"],
    ],
    systemRows: [
      ["订单经营分析场景标签", "5 个", "成交趋势、客单价、订单结构", "待审核"],
      ["支付转化分析场景标签", "3 个", "支付漏斗、渠道质量、异常监控", "待审核"],
    ],
    setRows: [
      ["订单经营日报主指标集", "成交金额、订单数、客单价", "经营日报", "待审核"],
      ["支付转化分析主指标集", "支付成功率、支付金额、失败订单数", "转化诊断", "待审核"],
      ["退款影响分析主指标集", "退款金额、退款率、净成交金额", "售后分析", "已确认"],
    ],
    metricRows: [
      ["成交金额", "原子指标", "支付成功订单金额汇总，不扣除退款", "已确认"],
      ["订单数", "原子指标", "去重统计有效订单数", "已确认"],
      ["客单价", "派生指标", "成交金额 / 订单数", "已确认"],
      ["支付成功率", "派生指标", "支付成功订单数 / 提交订单数", "待复核"],
    ],
    dimensionRows: [
      ["渠道", "dwd_order_detail.channel", "一级维度", "已确认"],
      ["地区", "dwd_order_detail.region", "一级维度", "已确认"],
      ["商品类目", "dim_product.category_name", "二级维度", "已确认"],
      ["支付方式", "dwd_payment_detail.pay_method", "一级维度", "待复核"],
    ],
  },
  customer: {
    name: "客户经营",
    status: { label: "运行正常", tone: "green" },
    subtitle: "围绕客户分层、生命周期、复购、会员经营和客户贡献沉淀客户经营指标资产。",
    systems: 2,
    sets: 7,
    metrics: 43,
    dimensions: 11,
    qualityScore: "92%",
    calls: "5,126",
    version: "主题 v2.1",
    boundary: "客户分层、复购、生命周期、会员权益和客户贡献",
    mainModel: "CRM 业务库",
    relatedModels: "订单交易库、会员权益库、营销活动库",
    owner: "客户运营组",
    createdAt: "2026-05-18 10:16",
    updatedAt: "2026-05-28 18:02",
    runStatus: "运行正常",
    computeMode: "离线周期计算",
    schedule: "每日 01:30",
    outputTable: "ads_metric_customer_*",
    lastRun: "2026-05-29 01:32 成功",
    qualitySummary: "全部通过",
    dagJoin: "客户行为宽表",
    dagJoinDesc: "客户、会员、订单和权益行为关联",
    dagCompute: "客户指标计算",
    dagComputeDesc: "新增客户、活跃客户、复购率、会员转化率",
    dagOutput: "客户经营指标资产",
    dagOutputDesc: "指标目录、问数、看板",
    dagSources: [
      ["dim_customer", "客户等级、注册时间"],
      ["dwd_member_benefit", "会员等级、权益状态"],
      ["dwd_order_detail", "购买行为、复购周期"],
    ],
    quality: [
      ["服务已发布", "问数和 API 服务均已开通。", "green"],
      ["口径校验通过", "复购率、新增客户数与历史资产口径一致。", "green"],
      ["运行正常", "近 7 次调度均成功。", "green"],
    ],
    systemRows: [
      ["客户生命周期场景标签", "4 个", "新增、活跃、留存、复购", "已发布"],
      ["会员经营场景标签", "3 个", "会员转化、权益核销、会员贡献", "已发布"],
    ],
    setRows: [
      ["客户增长主指标集", "新增客户数、注册转化率", "增长分析", "已发布"],
      ["客户留存主指标集", "复购率、活跃客户数", "留存诊断", "已发布"],
      ["会员经营主指标集", "会员转化率、会员贡献率", "会员经营", "已发布"],
    ],
    metricRows: [
      ["新增客户数", "原子指标", "统计期内首次注册客户数", "已发布"],
      ["活跃客户数", "原子指标", "统计期内有访问或购买行为的客户数", "已发布"],
      ["复购率", "派生指标", "复购客户数 / 购买客户数", "已发布"],
      ["会员转化率", "派生指标", "新增会员数 / 新增客户数", "已发布"],
    ],
    dimensionRows: [
      ["客户等级", "dim_customer.level_name", "一级维度", "已发布"],
      ["生命周期阶段", "dim_customer.lifecycle_stage", "一级维度", "已发布"],
      ["注册渠道", "dim_customer.register_channel", "一级维度", "已发布"],
      ["会员类型", "dwd_member_benefit.member_type", "二级维度", "已发布"],
    ],
  },
  finance: {
    name: "财务经营",
    status: { label: "1 个待审核", tone: "amber" },
    subtitle: "围绕收入、回款、应收、发票、毛利和退款影响沉淀财务经营指标资产。",
    systems: 2,
    sets: 6,
    metrics: 42,
    dimensions: 10,
    qualityScore: "81%",
    calls: "3,142",
    version: "主题 v0.9",
    boundary: "收入、回款、应收、发票、毛利和成本费用",
    mainModel: "财务应收库",
    relatedModels: "合同库、发票库、客户库、订单交易库",
    owner: "财务分析组",
    createdAt: "2026-05-20 14:05",
    updatedAt: "2026-05-29 10:24",
    runStatus: "待审核",
    computeMode: "离线周期计算",
    schedule: "每日 03:00",
    outputTable: "ads_metric_finance_*",
    lastRun: "尚未发布运行",
    qualitySummary: "2 项待处理",
    dagJoin: "财务经营宽表",
    dagJoinDesc: "合同、发票、应收、回款和客户关联",
    dagCompute: "财务指标计算",
    dagComputeDesc: "回款金额、应收余额、逾期应收、毛利率",
    dagOutput: "财务经营指标资产",
    dagOutputDesc: "指标目录、风险看板",
    dagSources: [
      ["dwd_contract_detail", "合同金额、签约日期"],
      ["dwd_invoice_detail", "发票金额、开票状态"],
      ["dwd_receivable_detail", "应收、回款、逾期天数"],
    ],
    quality: [
      ["口径待复核", "逾期天数是否按自然日或工作日统计需要确认。", "amber"],
      ["调度已配置", "离线计算任务已配置，等待发布后生效。", "green"],
      ["API 待发布", "问数服务待审核通过后开通。", "amber"],
    ],
    systemRows: [
      ["回款与应收场景标签", "3 个", "回款效率、账龄结构、逾期风险", "待审核"],
      ["经营利润场景标签", "3 个", "收入、成本、毛利和利润率", "已确认"],
    ],
    setRows: [
      ["回款日报主指标集", "回款金额、回款率", "财务日报", "待审核"],
      ["应收风险主指标集", "逾期应收金额、账龄结构", "风险监控", "待审核"],
      ["合同履约主指标集", "合同金额、开票金额、回款金额", "履约分析", "已确认"],
    ],
    metricRows: [
      ["回款金额", "原子指标", "统计期内已确认到账金额", "已确认"],
      ["应收余额", "原子指标", "未结清应收金额余额", "已确认"],
      ["逾期应收金额", "原子指标", "超过约定账期的应收余额", "待复核"],
      ["回款率", "派生指标", "回款金额 / 应收金额", "已确认"],
    ],
    dimensionRows: [
      ["客户类型", "dim_customer.customer_type", "一级维度", "已确认"],
      ["合同类型", "dwd_contract_detail.contract_type", "一级维度", "已确认"],
      ["账龄区间", "dwd_receivable_detail.age_bucket", "一级维度", "待复核"],
      ["区域", "dim_customer.region", "一级维度", "已确认"],
    ],
  },
  service: {
    name: "售后服务",
    status: { label: "草稿", tone: "blue" },
    subtitle: "围绕退款、退货、工单、SLA、满意度和服务质量沉淀售后服务指标资产。",
    systems: 1,
    sets: 3,
    metrics: 19,
    dimensions: 5,
    qualityScore: "74%",
    calls: "648",
    version: "主题 v0.4",
    boundary: "退款、退货、工单、SLA、满意度和服务质量",
    mainModel: "客服工单库",
    relatedModels: "售后服务库、客户库、订单交易库",
    owner: "服务运营组",
    createdAt: "2026-05-28 15:20",
    updatedAt: "2026-05-29 09:10",
    runStatus: "草稿",
    computeMode: "查询时计算",
    schedule: "无需调度",
    outputTable: "query_metric_service_*",
    lastRun: "尚未发布",
    qualitySummary: "3 项待补充",
    dagJoin: "工单服务宽表",
    dagJoinDesc: "工单、客户、售后记录关联",
    dagCompute: "服务质量指标计算",
    dagComputeDesc: "SLA 达成率、响应时长、满意度",
    dagOutput: "售后服务指标资产",
    dagOutputDesc: "问数、看板建议",
    dagSources: [
      ["dwd_ticket_detail", "工单状态、响应时间"],
      ["dwd_after_sales_detail", "售后类型、处理结果"],
      ["dim_customer", "客户等级、所属区域"],
    ],
    quality: [
      ["字段语义待补充", "SLA 截止时间字段含义需要业务确认。", "amber"],
      ["口径待定", "满意度是否只统计已完结工单需要确认。", "amber"],
      ["草稿暂存", "尚未进入发布审核流程。", "blue"],
    ],
    systemRows: [
      ["服务质量场景标签", "3 个", "SLA、响应效率、满意度", "草稿"],
    ],
    setRows: [
      ["客服履约主指标集", "SLA 达成率、平均响应时长", "履约监控", "草稿"],
      ["售后效率主指标集", "工单解决率、处理时长", "效率分析", "草稿"],
      ["满意度分析主指标集", "满意度得分、差评率", "体验分析", "草稿"],
    ],
    metricRows: [
      ["SLA 达成率", "派生指标", "按时完成工单数 / 应完成工单数", "待确认"],
      ["平均响应时长", "原子指标", "首次响应耗时平均值", "已确认"],
      ["工单解决率", "派生指标", "已解决工单数 / 完结工单数", "待确认"],
      ["满意度得分", "原子指标", "已回收评价分数平均值", "待确认"],
    ],
    dimensionRows: [
      ["工单类型", "dwd_ticket_detail.ticket_type", "一级维度", "已确认"],
      ["服务渠道", "dwd_ticket_detail.service_channel", "一级维度", "已确认"],
      ["客户等级", "dim_customer.level_name", "一级维度", "待补充"],
      ["售后类型", "dwd_after_sales_detail.after_sales_type", "二级维度", "待补充"],
    ],
  },
  marketing: {
    name: "营销增长",
    status: { label: "已发布", tone: "green" },
    subtitle: "围绕活动触达、渠道转化、ROI、线索质量和获客成本沉淀营销增长指标资产。",
    systems: 2,
    sets: 5,
    metrics: 38,
    dimensions: 12,
    qualityScore: "90%",
    calls: "3,852",
    version: "主题 v1.6",
    boundary: "活动、渠道、触达、转化、ROI 和线索质量",
    mainModel: "营销活动库",
    relatedModels: "订单交易库、客户行为库、CRM 业务库",
    owner: "营销分析组",
    createdAt: "2026-05-18 11:25",
    updatedAt: "2026-05-28 20:11",
    runStatus: "运行正常",
    computeMode: "查询时计算",
    schedule: "无需调度",
    outputTable: "query_metric_marketing_*",
    lastRun: "2026-05-29 13:52 查询成功",
    qualitySummary: "全部通过",
    dagJoin: "营销归因宽表",
    dagJoinDesc: "活动、触达、渠道、订单和客户行为关联",
    dagCompute: "营销指标计算",
    dagComputeDesc: "触达率、转化率、ROI、获客成本",
    dagOutput: "营销增长指标资产",
    dagOutputDesc: "问数、看板、活动复盘",
    dagSources: [
      ["dwd_campaign_touch", "活动、触达、渠道"],
      ["dwd_user_behavior", "访问、点击、加购"],
      ["dwd_order_detail", "订单金额、成交状态"],
    ],
    quality: [
      ["看板已生成", "活动转化看板已同步到 BI 工作区。", "green"],
      ["归因口径确认", "默认使用末次点击归因。", "green"],
      ["查询时计算", "高频看板查询已启用缓存。", "green"],
    ],
    systemRows: [
      ["营销活动转化场景标签", "4 个", "活动触达、转化效果、ROI", "已发布"],
      ["渠道归因场景标签", "1 个", "渠道贡献、归因质量", "已发布"],
    ],
    setRows: [
      ["活动复盘主指标集", "转化率、ROI、获客成本", "活动复盘", "已发布"],
      ["渠道归因主指标集", "渠道贡献率、渠道成交金额", "渠道分析", "已发布"],
      ["触达效果主指标集", "触达率、点击率、转化率", "投放优化", "已发布"],
    ],
    metricRows: [
      ["活动转化率", "派生指标", "活动成交客户数 / 活动触达客户数", "已发布"],
      ["渠道贡献率", "派生指标", "渠道成交金额 / 总成交金额", "已发布"],
      ["ROI", "派生指标", "活动成交金额 / 活动成本", "已发布"],
      ["获客成本", "派生指标", "活动成本 / 新增客户数", "已发布"],
    ],
    dimensionRows: [
      ["活动", "dwd_campaign_touch.campaign_name", "一级维度", "已发布"],
      ["渠道", "dwd_campaign_touch.channel", "一级维度", "已发布"],
      ["触达方式", "dwd_campaign_touch.touch_type", "二级维度", "已发布"],
      ["商品类目", "dim_product.category_name", "二级维度", "已发布"],
    ],
  },
  supply: {
    name: "供应链履约",
    status: { label: "建设中", tone: "blue" },
    subtitle: "围绕库存、采购、入库、出库、履约、缺货和补货沉淀供应链履约指标资产。",
    systems: 1,
    sets: 2,
    metrics: 17,
    dimensions: 6,
    qualityScore: "78%",
    calls: "934",
    version: "主题 v0.3",
    boundary: "库存、采购、入库、出库、履约、缺货和补货",
    mainModel: "商品库存库",
    relatedModels: "采购履约库、订单交易库、供应商库",
    owner: "供应链分析组",
    createdAt: "2026-05-27 16:40",
    updatedAt: "2026-05-29 11:18",
    runStatus: "建设中",
    computeMode: "离线周期计算",
    schedule: "每日 04:00",
    outputTable: "ads_metric_supply_*",
    lastRun: "尚未发布运行",
    qualitySummary: "2 项待补充",
    dagJoin: "库存履约宽表",
    dagJoinDesc: "商品、库存、采购和订单履约关联",
    dagCompute: "供应链指标计算",
    dagComputeDesc: "库存周转、缺货率、履约及时率",
    dagOutput: "供应链履约指标资产",
    dagOutputDesc: "指标目录、补货建议",
    dagSources: [
      ["dwd_inventory_detail", "SKU、仓库、库存数量"],
      ["dwd_purchase_order", "采购订单、到货时间"],
      ["dwd_order_fulfillment", "发货、签收、履约状态"],
    ],
    quality: [
      ["成本口径待确认", "库存成本字段是否含税需要业务确认。", "amber"],
      ["血缘已识别", "库存与采购链路血缘已完成识别。", "green"],
      ["建设中", "缺货影响指标仍在补充口径。", "blue"],
    ],
    systemRows: [
      ["库存效率场景标签", "2 个", "库存周转、缺货影响、补货效率", "建设中"],
    ],
    setRows: [
      ["库存效率主指标集", "库存周转天数、库存金额", "库存运营", "建设中"],
      ["缺货影响主指标集", "缺货率、缺货影响订单数", "履约诊断", "建设中"],
    ],
    metricRows: [
      ["库存周转天数", "派生指标", "平均库存 / 日均出库成本", "待确认"],
      ["缺货率", "派生指标", "缺货 SKU 数 / 有效 SKU 数", "待确认"],
      ["履约及时率", "派生指标", "按时履约订单数 / 应履约订单数", "已确认"],
      ["补货满足率", "派生指标", "满足补货数量 / 计划补货数量", "待确认"],
    ],
    dimensionRows: [
      ["商品类目", "dim_product.category_name", "二级维度", "已确认"],
      ["仓库", "dim_warehouse.warehouse_name", "一级维度", "已确认"],
      ["供应商", "dim_supplier.supplier_name", "一级维度", "待补充"],
      ["履约方式", "dwd_order_fulfillment.fulfillment_type", "一级维度", "待补充"],
    ],
  },
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

function setText(id, value) {
  const node = qs(`#${id}`);
  if (node) node.textContent = value;
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

function metricCode(name) {
  return {
    成交金额: "gmv",
    订单数: "order_count",
    客单价: "avg_order_value",
    支付成功率: "pay_success_rate",
    退款金额: "refund_amount",
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

function metricAdditivity(type, name) {
  if (/率|客单价|占比|贡献/.test(name) || type === "派生指标") return "不可加";
  if (/余额|库存/.test(name)) return "半可加";
  return "完全可加";
}

function renderMetricRows(rows) {
  const node = qs("#detailMetricRows");
  if (!node) return;
  node.innerHTML = rows.map(([name, type, desc, status]) => {
    const additivity = metricAdditivity(type, name);
    const tone = status === "待复核" ? "amber" : "green";
    return `
      <tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(metricCode(name))}</td>
        <td>${escapeHtml(type)}</td>
        <td>${statusPill(additivity, additivity === "不可加" ? "red" : additivity === "半可加" ? "amber" : "green")}</td>
        <td>${escapeHtml(desc)}</td>
        <td>${statusPill(status === "待复核" ? "需复核" : "DSL 通过", tone)}</td>
      </tr>
    `;
  }).join("");
}

function renderDslRows(theme) {
  const node = qs("#detailDslRows");
  if (!node) return;
  const derivedCount = theme.metricRows.filter(([name, type]) => type === "派生指标" || /率|客单价|占比/.test(name)).length;
  const rows = [
    ["Metric DSL", `${theme.metrics} 个指标定义`, "编码、表达式、过滤条件、时间字段和粒度已沉淀为机器协议。", "green"],
    ["聚合治理", `${derivedCount} 个不可加指标`, "比率和客单价类指标按分子分母重算，不允许跨维度简单平均。", "green"],
    ["SQL 编译", `${theme.outputTable} 已生成`, "计算 SQL 由 DSL 编译，DAG 和字段血缘同步生成。", "green"],
    ["冲突检测", theme.status.tone === "amber" ? "存在待处理项" : "无阻断冲突", "基于名称、业务定义、表达式、来源字段和过滤条件评分。", theme.status.tone === "amber" ? "amber" : "green"],
  ];
  node.innerHTML = rows.map(([label, value, desc, tone]) => `
    <div><span class="status ${tone}">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(desc)}</em></div>
  `).join("");
  setText("detailDslSummary", `${theme.metrics} 个 DSL 定义，${derivedCount} 个不可加指标`);
}

function themeAssetMapRows(theme) {
  if (theme.name === "交易经营") {
    return [
      ["订单量变化分析", "订单量变化结果", "ads_metric_order_daily", "共享物理资产"],
      ["客单价变化分析", "客单价变化结果", "ads_metric_order_daily", "共享物理资产"],
      ["渠道结构变化分析", "渠道结构变化结果", "ads_metric_order_daily", "共享物理资产"],
      ["支付转化分析", "支付转化结果", "ads_metric_payment_daily", "独立产出"],
      ["退款影响分析", "退款影响结果", "ads_metric_refund_daily", "独立产出"],
    ];
  }
  const safeName = theme.name || "业务主题";
  return [
    [`${safeName}核心分析`, `${safeName}核心结果`, theme.outputTable || "ads_metric_theme_daily", "独立产出"],
    [`${safeName}扩展分析`, `${safeName}扩展结果`, theme.outputTable || "ads_metric_theme_daily", "共享物理资产"],
  ];
}

function renderAssetMap(theme) {
  const rows = themeAssetMapRows(theme);
  renderRows("detailAssetMapRows", rows);
  const sharedCount = rows.filter((row) => row[3] === "共享物理资产").length;
  setText("detailAssetMapSummary", sharedCount ? `${sharedCount} 个方向共享物理资产` : "方向独立产出");
}

function renderQuality(items) {
  const node = qs("#detailQualityList");
  if (!node) return;
  node.innerHTML = items.map(([label, desc, tone]) => `
    <div>
      ${statusPill(escapeHtml(label), tone)}
      <span>${escapeHtml(desc)}</span>
    </div>
  `).join("");
}

function renderDagSources(items) {
  const node = qs("#detailDagSources");
  if (!node) return;
  node.innerHTML = items.map(([name, desc]) => `
    <div class="dag-node source">
      <span>输入表</span>
      <strong>${escapeHtml(name)}</strong>
      <em>${escapeHtml(desc)}</em>
    </div>
  `).join("");
}

function renderDetail() {
  const params = new URLSearchParams(window.location.search);
  const theme = THEMES[params.get("theme")] || THEMES[params.get("system")] || THEMES.trade;
  document.title = `${theme.name} · Data Metrics`;

  const status = qs("#detailStatus");
  if (status) {
    status.className = `status ${theme.status.tone}`;
    status.textContent = theme.status.label;
  }

  setText("detailTitle", theme.name);
  setText("detailSubtitle", theme.subtitle);
  setText("detailSystemCount", theme.systems);
  setText("detailSetCount", theme.sets);
  setText("detailMetricCount", theme.metrics);
  setText("detailDimensionCount", theme.dimensions);
  setText("detailQualityScore", theme.qualityScore);
  setText("detailCallCount", theme.calls);
  setText("detailVersion", theme.version);
  setText("detailBoundary", theme.boundary);
  setText("detailMainModel", theme.mainModel);
  setText("detailRelatedModels", theme.relatedModels);
  setText("detailOwner", theme.owner);
  setText("detailCreatedAt", theme.createdAt);
  setText("detailUpdatedAt", theme.updatedAt);
  setText("detailRunStatus", theme.runStatus);
  setText("detailComputeMode", theme.computeMode);
  setText("detailSchedule", theme.schedule);
  setText("detailOutputTable", theme.outputTable);
  setText("detailLastRun", theme.lastRun);
  setText("detailQualitySummary", theme.qualitySummary);
  setText("detailDagJoin", theme.dagJoin);
  setText("detailDagJoinDesc", theme.dagJoinDesc);
  setText("detailDagCompute", theme.dagCompute);
  setText("detailDagComputeDesc", theme.dagComputeDesc);
  setText("detailDagOutput", theme.outputTable);
  setText("detailDagOutputDesc", "逻辑资产独立治理，物理资产可共享计算");
  setText("detailSystemSummary", `${theme.systemRows.length} 个场景标签`);
  setText("detailSetSummary", `${theme.setRows.length} 个主指标集`);
  setText("detailMetricSummary", `${theme.metricRows.length} 个核心指标`);
  setText("detailDimensionSummary", `${theme.dimensionRows.length} 个展示项`);

  renderQuality(theme.quality);
  renderDagSources(theme.dagSources);
  renderRows("detailSystemRows", theme.systemRows);
  renderRows("detailSetRows", theme.setRows);
  renderMetricRows(theme.metricRows);
  renderRows("detailDimensionRows", theme.dimensionRows);
  renderAssetMap(theme);
  renderDslRows(theme);
}

renderDetail();
})();

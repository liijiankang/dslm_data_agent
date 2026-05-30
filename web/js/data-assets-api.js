(function () {
const data = window.MockDataAssets || window.MockData || {};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceById(sourceId) {
  return data.dataSources?.find((source) => source.id === sourceId) || data.dataSources?.[0] || null;
}

function hasUnsupportedMineruAssets(assets) {
  const mineruDirectTypes = new Set(["PDF", "Image"]);
  return assets.some((asset) => !mineruDirectTypes.has(asset.type));
}

function filePipelineSteps({ assets, parseStrategy, source }) {
  const localUpload = source.connector === "本地上传";
  const needsConversion = hasUnsupportedMineruAssets(assets);
  const readTitle = localUpload ? "下载源文件" : "读取源文件";
  const readDescription = localUpload
    ? "从 MinIO 按资产对象路径下载本次需要构建的文件。"
    : `从 ${source.connector} 读取本次需要构建的文件和源端元数据。`;
  const steps = [
    { title: readTitle, description: readDescription, outputs: ["原始文件", "源端元数据"] },
  ];
  if (needsConversion) {
    steps.push({
      title: "格式转换",
      description: "PDF、图片等 MinerU 直接支持的文件进入解析；Office、文本、表格等文件先转换为可解析中间格式。",
      outputs: ["转换文件", "转换报告"],
    });
  }
  steps.push(
    {
      title: "文档解析",
      description: `使用 ${parseStrategy} 解析能力抽取正文、标题层级、表格、图片和来源定位。`,
      outputs: ["markdown", "content_list"],
    },
    {
      title: "切片",
      description: "按系统切片策略生成 chunk，并保留页码、标题路径和资产指纹。",
      outputs: ["chunk 文本", "chunk metadata"],
    },
    {
      title: "向量化",
      description: "调用系统 embedding 服务，为正文和摘要切片生成向量。",
      outputs: ["embedding", "模型信息"],
    },
    {
      title: "保存信息",
      description: "保存解析路径、切片、向量映射和任务执行结果。",
      outputs: ["产物索引", "任务报告"],
    },
  );
  return steps.map((step, index) => ({ ...step, order: index + 1 }));
}

function databasePipelineSteps({ parseStrategy }) {
  return [
    { title: "连接数据库", description: "使用已保存连接配置建立只读连接，并校验库表访问权限。", outputs: ["连接会话", "权限结果"] },
    { title: "读取结构", description: "读取库、表、字段、主外键、索引和样本统计信息。", outputs: ["Schema 元数据", "字段画像"] },
    { title: "结构解析", description: `使用 ${parseStrategy} 解析能力生成表字段语义、业务口径和结构化说明。`, outputs: ["结构化说明", "字段语义"] },
    { title: "切片", description: "按表、字段、业务对象和说明文本生成可向量化 chunk。", outputs: ["chunk 文本", "结构 metadata"] },
    { title: "向量化", description: "调用系统 embedding 服务生成结构化知识向量。", outputs: ["embedding", "模型信息"] },
    { title: "保存信息", description: "保存元数据快照、切片、向量映射和任务执行结果。", outputs: ["产物索引", "任务报告"] },
  ].map((step, index) => ({ ...step, order: index + 1 }));
}

function webPipelineSteps({ parseStrategy }) {
  return [
    { title: "抓取页面", description: "按 Sitemap、URL 列表或站点规则抓取本次需要构建的网页内容。", outputs: ["HTML", "抓取 metadata"] },
    { title: "正文抽取", description: "抽取正文、标题、链接、图片说明和页面来源定位。", outputs: ["正文文本", "页面结构"] },
    { title: "网页解析", description: `使用 ${parseStrategy} 解析能力生成可构建的网页知识内容。`, outputs: ["markdown", "content_list"] },
    { title: "切片", description: "按页面结构和标题层级生成 chunk，并保留 URL 与锚点定位。", outputs: ["chunk 文本", "网页 metadata"] },
    { title: "向量化", description: "调用系统 embedding 服务，为网页切片生成向量。", outputs: ["embedding", "模型信息"] },
    { title: "保存信息", description: "保存解析路径、切片、向量映射和任务执行结果。", outputs: ["产物索引", "任务报告"] },
  ].map((step, index) => ({ ...step, order: index + 1 }));
}

function pipelineStepsFor({ assets, parseStrategy, source }) {
  if (source.category === "数据库") return databasePipelineSteps({ parseStrategy });
  if (source.category === "网页") return webPipelineSteps({ parseStrategy });
  return filePipelineSteps({ assets, parseStrategy, source });
}

function previewBuildTask(payload) {
  const response = data.buildTaskPreviewResponses?.[payload.parseStrategy] || data.buildTaskPreviewResponses?.知识;
  const cloned = clone(response || {});
  const source = sourceById(payload.sourceId);
  const assets = data.buildTaskPreviewAssets?.[payload.parseStrategy] || data.buildTaskPreviewAssets?.知识 || [];
  const requestedIds = payload.buildScope === "all" || payload.assetIds === null ? null : new Set(payload.assetIds);
  cloned.assets = clone(assets).map((asset) => {
    const selected = Boolean(asset.canBuild && (payload.buildScope === "all" || requestedIds === null || requestedIds.has(asset.id)));
    return {
      ...asset,
      selected,
      selectable: Boolean(asset.canBuild && payload.buildScope !== "all"),
    };
  });
  const buildable = cloned.assets.filter((asset) => asset.canBuild).length;
  const selected = cloned.assets.filter((asset) => asset.selected).length;
  const selectedAssets = cloned.assets.filter((asset) => asset.selected);
  const blocked = cloned.assets.filter((asset) => asset.state === "不可构建").length;
  const skipped = cloned.assets.length - selected - blocked;
  const selectable = cloned.assets.filter((asset) => asset.selectable).length;
  cloned.steps = pipelineStepsFor({ assets: selectedAssets.length ? selectedAssets : cloned.assets.filter((asset) => asset.canBuild), parseStrategy: payload.parseStrategy, source });
  cloned.summary = `后端返回：${source.category} / ${source.connector} / ${payload.parseStrategy} 解析，共 ${cloned.steps.length} 个关键执行步骤。`;
  cloned.previewId = `preview-${source.id}-${payload.parseStrategy}-${payload.buildScope}`;
  cloned.selection = {
    allSelected: selectable > 0 && selected === buildable,
    blocked,
    buildable,
    selectable,
    selected,
    skipped,
    message:
      payload.buildScope === "all"
        ? `全部资产模式：后端将构建 ${selected} 个需要处理的资产，自动跳过 ${skipped} 个已是最新或不可重复构建的资产。`
        : `部分资产模式：后端允许选择 ${buildable} 个资产，当前已选择 ${selected} 个；已是最新的资产不可再次构建。`,
  };
  cloned.canCreate = selected > 0;
  return Promise.resolve(cloned);
}

function createBuildTask(payload) {
  const source = sourceById(payload.sourceId);
  const previewAssets = clone(data.buildTaskPreviewAssets?.[payload.parseStrategy] || data.buildTaskPreviewAssets?.知识 || []);
  const requestedIds = payload.buildScope === "all" || payload.assetIds === null ? null : new Set(payload.assetIds);
  const selected = previewAssets.filter((asset) => asset.canBuild && (payload.buildScope === "all" || requestedIds === null || requestedIds.has(asset.id))).length;
  if (selected === 0) {
    return Promise.resolve({
      statusLabel: "没有需要构建的资产",
      statusTone: "amber",
      message: "后端未创建任务：当前选择中没有未构建、已变更或构建失败的资产。",
    });
  }
  const response = clone(data.buildTaskCreateResponse || {});
  response.message = `后端已创建任务，将构建 ${selected} 个资产；已是最新或不可构建的资产不会进入任务。`;
  response.redirectUrl = `${source.href}&createdTask=1#tasks`;
  return Promise.resolve(response);
}

window.DataAssetsApi = {
  getAssetDetail(assetId) {
    return data.assetDetails?.[assetId] || null;
  },
  getAssetDetailData() {
    return {
      assets: data.assets || [],
      assetDetails: data.assetDetails || {},
      auditEvents: data.auditEvents || [],
      databaseAssets: data.databaseAssets || [],
      dataSources: data.dataSources || [],
    };
  },
  getBuildTaskData() {
    return {
      buildTaskDetails: data.buildTaskDetails || {},
      buildTasks: data.buildTasks || [],
      createdBuildTask: data.createdBuildTask,
    };
  },
  getDashboardData() {
    return {
      dashboardStats: data.dashboardStats || {},
      dataSources: data.dataSources || [],
      sourceTypeStats: data.sourceTypeStats || [],
    };
  },
  getSource(sourceId) {
    return sourceById(sourceId);
  },
  getSourceDetailData() {
    return {
      artifactSummary: data.artifactSummary || {},
      assets: data.assets || [],
      auditEvents: data.auditEvents || [],
      buildArtifacts: data.buildArtifacts || [],
      buildTaskDetails: data.buildTaskDetails || {},
      buildTasks: data.buildTasks || [],
      changeEvents: data.changeEvents || [],
      createdBuildTask: data.createdBuildTask,
      databaseAssets: data.databaseAssets || [],
      databaseRelations: data.databaseRelations || [],
      dataSources: data.dataSources || [],
      sourceStats: data.sourceStats || {},
    };
  },
  getUploadData() {
    return {
      uploadRows: data.uploadRows || [],
    };
  },
  getModelGraphData() {
    return {
      dataSources: data.dataSources || [],
      databaseAssets: data.databaseAssets || [],
      databaseRelations: data.databaseRelations || [],
    };
  },
  createBuildTask,
  previewBuildTask,
};

window.BackendApi = {
  createBuildTask,
  previewBuildTask,
};
})();

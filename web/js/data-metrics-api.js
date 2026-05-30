(function () {
const data = window.MockDataMetrics || {};

window.DataMetricsApi = {
  getGenerationData() {
    return {
      problemModelPool: data.problemModelPool || [],
      problemDimensionDetails: data.problemDimensionDetails || {},
      problemMetricDetails: data.problemMetricDetails || {},
      problemMetricReuseCandidates: data.problemMetricReuseCandidates || {},
    };
  },
  getTheme(themeKey = "trade") {
    return data.themes?.[themeKey] || data.themes?.trade || null;
  },
  getThemeDetailData() {
    return {
      themes: data.themes || {},
      tradeDirectionMeta: data.tradeDirectionMeta || {},
      tradeDirectionMetrics: data.tradeDirectionMetrics || {},
      tradeDirectionDimensions: data.tradeDirectionDimensions || {},
    };
  },
};
})();

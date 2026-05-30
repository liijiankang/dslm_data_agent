(function () {
// Backward-compatible entry point for pages that still load build-task-api.js.
// The actual data boundary lives in data-assets-api.js.
window.BackendApi = {
  createBuildTask: window.DataAssetsApi.createBuildTask,
  previewBuildTask: window.DataAssetsApi.previewBuildTask,
};
})();

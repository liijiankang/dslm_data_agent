(function () {
const { escapeHtml, qs, statusPill } = window.UI;
const page = qs("main.page");
const params = new URLSearchParams(window.location.search);
const sourceId = params.get("sourceId") || page?.dataset.sourceId || "source-local-upload-sales";
const source = window.DataAssetsApi.getSource(sourceId);
let scope = "partial";
let latestPreview = null;
let selectedIds = null;

function renderSourceBreadcrumb() {
  if (!source) return;
  if (page) page.dataset.sourceId = source.id;
  const sourceLink = document.querySelector('.breadcrumb a[href^="local-upload-detail"]');
  if (!sourceLink) return;
  sourceLink.textContent = source.name;
  sourceLink.href = source.href;
}

function previewPayload() {
  return {
    sourceId,
    buildScope: scope,
    assetIds: scope === "all" || selectedIds === null ? null : Array.from(selectedIds),
    parseStrategy: qs("input[name='parseStrategy']:checked")?.value || "知识",
  };
}

function renderSelectedAssets(response) {
  const body = qs("#selectedAssetRows");
  if (!body) return;
  selectedIds = new Set(response.assets.filter((asset) => asset.selected).map((asset) => asset.id));
  body.innerHTML = response.assets
    .map(
      (asset) => `
        <tr class="${asset.canBuild ? "" : "asset-row-disabled"}">
          <td><input type="checkbox" data-asset-checkbox="${escapeHtml(asset.id)}" ${asset.selected ? "checked" : ""} ${asset.selectable ? "" : "disabled"} aria-label="选择 ${escapeHtml(asset.name)}"></td>
          <td>${escapeHtml(asset.name)}</td>
          <td>${escapeHtml(asset.type)}</td>
          <td>${escapeHtml(asset.size)}</td>
          <td>${statusPill(asset.state, asset.tone)}</td>
          <td><span class="asset-fingerprint">${escapeHtml(asset.fingerprint)}</span></td>
          <td>${escapeHtml(asset.reason)}</td>
        </tr>
      `,
    )
    .join("");
  renderAssetSummary(response);
  bindAssetSelection();
  updateSelectionState(response);
}

function bindAssetSelection() {
  document.querySelectorAll("[data-asset-checkbox]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedIds.add(checkbox.dataset.assetCheckbox);
      else selectedIds.delete(checkbox.dataset.assetCheckbox);
      renderPipeline();
    });
  });
  const checkAll = qs("[data-check-all]");
  if (!checkAll || checkAll.dataset.checkAllBound === "true") return;
  checkAll.dataset.checkAllBound = "true";
  checkAll.addEventListener("change", (event) => {
    if (scope === "all") return;
    const checked = event.target.checked;
    document.querySelectorAll("[data-asset-checkbox]").forEach((checkbox) => {
      if (checkbox.disabled) return;
      checkbox.checked = checked;
      if (checked) selectedIds.add(checkbox.dataset.assetCheckbox);
      else selectedIds.delete(checkbox.dataset.assetCheckbox);
    });
    renderPipeline();
  });
}

function renderAssetSummary(response) {
  const node = qs("#buildPreviewSummary");
  if (!node) return;
  node.innerHTML = `
    <div class="summary-pill green"><strong>${response.selection.buildable}</strong><span>可构建</span></div>
    <div class="summary-pill blue"><strong>${response.selection.selected}</strong><span>已选择</span></div>
    <div class="summary-pill amber"><strong>${response.selection.skipped}</strong><span>跳过</span></div>
    <div class="summary-pill red"><strong>${response.selection.blocked}</strong><span>不可构建</span></div>
  `;
}

function updateSelectionState(response) {
  const checkAll = qs("[data-check-all]");
  if (checkAll) {
    checkAll.disabled = response.selection.selectable === 0 || scope === "all";
    checkAll.checked = response.selection.allSelected;
  }
  const hint = qs("#assetSelectionHint");
  if (!hint) return;
  hint.textContent = response.selection.message;
}

function renderPipelineResponse(response) {
  latestPreview = response;
  const context = qs("#pipelineContext");
  const rail = qs("#pipelineSteps");
  if (context) context.textContent = response.summary;
  if (rail) {
    rail.innerHTML = response.steps
      .map(
        (step) => `
          <div class="pipeline-step">
            <div class="pipeline-marker-row">
              <div class="pipeline-circle">${step.order}</div>
              ${step.order < response.steps.length ? '<div class="pipeline-arrow" aria-hidden="true"></div>' : ""}
            </div>
            <div class="pipeline-content">
              <div class="pipeline-title">${escapeHtml(step.title)}</div>
              <p>${escapeHtml(step.description)}</p>
              <div class="pipeline-output">产物：${escapeHtml(step.outputs.join("、"))}</div>
            </div>
          </div>
        `,
      )
      .join("");
  }
  renderSelectedAssets(response);
  const createButton = qs("#createTask");
  if (createButton) createButton.disabled = !response.canCreate;
}

async function renderPipeline() {
  const response = await window.DataAssetsApi.previewBuildTask(previewPayload());
  renderPipelineResponse(response);
}

function bindScopeOptions() {
  document.querySelectorAll("input[name='buildScope']").forEach((radio) => {
    radio.addEventListener("change", () => {
      scope = radio.value;
      document.querySelectorAll("[data-scope-card]").forEach((card) => {
        card.classList.toggle("active", card.dataset.scopeCard === scope);
      });
      qs("#assetSelectionCard")?.classList.toggle("selection-locked", scope === "all");
      selectedIds = null;
      renderPipeline();
    });
  });
}

function bindCreateTask() {
  qs("#createTask")?.addEventListener("click", async () => {
    const button = qs("#createTask");
    if (button) button.disabled = true;
    const response = await window.DataAssetsApi.createBuildTask({
      ...previewPayload(),
      previewId: latestPreview?.previewId,
    });
    if (response.redirectUrl) {
      window.location.href = response.redirectUrl;
      return;
    }
    qs("#taskResult").innerHTML = `
      <div class="card">
        <div class="card-body">
          ${statusPill(response.statusLabel, response.statusTone)}
          <p class="card-subtitle">${response.message}</p>
        </div>
      </div>
    `;
    if (button) button.disabled = !latestPreview?.canCreate;
  });
}

function bindParseStrategy() {
  document.querySelectorAll("input[name='parseStrategy']").forEach((radio) => {
    radio.addEventListener("change", () => {
      document.querySelectorAll("[data-strategy-option]").forEach((option) => {
        option.classList.toggle("active", option.dataset.strategyOption === radio.value);
      });
      selectedIds = null;
      renderPipeline();
    });
  });
}

renderSourceBreadcrumb();
renderPipeline();
bindScopeOptions();
bindParseStrategy();
bindCreateTask();
})();

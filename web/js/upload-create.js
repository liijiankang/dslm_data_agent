(function () {
const { uploadRows } = window.MockData;
const { paginationButtons, statusPill, qs } = window.UI;

const archiveExtensions = new Set(["zip", "rar", "7z", "tar", "gz", "bz2"]);
const supportedExtensions = new Map([
  ["pdf", "PDF"],
  ["doc", "Word"],
  ["docx", "Word"],
  ["ppt", "PPT"],
  ["pptx", "PPT"],
  ["xls", "Excel"],
  ["xlsx", "Excel"],
  ["md", "Markdown"],
  ["markdown", "Markdown"],
  ["txt", "TXT"],
  ["png", "Image"],
  ["jpg", "Image"],
  ["jpeg", "Image"],
  ["webp", "Image"],
  ["bmp", "Image"],
  ["tif", "Image"],
  ["tiff", "Image"],
]);

const currentRows = uploadRows.map((row, index) => normalizeRow(row, index));
const uploadListState = {
  keyword: "",
  page: 1,
  pageSize: 10,
  stage: "all",
  type: "all",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeRow(row, index) {
  const relativePath = row.relativePath || row.name;
  return {
    blocked: row.blocked || row.status === "已拦截" || row.status === "格式不支持",
    canCancel: row.canCancel ?? ["上传中", "登记资产中", "重传中", "继续上传中"].includes(row.status),
    canResume: row.canResume ?? row.status === "已取消",
    canRetry: row.canRetry ?? row.status === "上传失败",
    id: row.id || `upload-${index + 1}`,
    identity: row.identity || relativePath,
    progress: row.progress ?? defaultProgress(row.status),
    relativePath,
    stage: row.stage || defaultStage(row.status),
    ...row,
  };
}

function defaultStage(status) {
  if (status === "上传成功" || status === "已存在，已跳过") return "登记完成";
  if (status === "上传失败") return "上传中断";
  if (status === "已取消") return "上传已暂停";
  if (status === "格式不支持" || status === "已拦截") return "上传前校验";
  return status || "等待上传";
}

function defaultProgress(status) {
  if (status === "上传成功" || status === "已存在，已跳过") return 100;
  if (status === "登记资产中") return 92;
  if (status === "上传失败") return 64;
  if (status === "已取消") return 35;
  return 0;
}

function progressCell(row) {
  const progress = Math.min(100, Math.max(0, row.progress || 0));
  return `
    <div class="upload-progress-cell">
      <span class="progress-track"><i style="width:${progress}%"></i></span>
      <strong>${progress}%</strong>
    </div>
  `;
}

function actionButtons(row, index) {
  const buttons = [];
  if (row.canResume) buttons.push(`<button class="button small" data-upload-action="resume" data-row-index="${index}" type="button">继续上传</button>`);
  if (row.canRetry) buttons.push(`<button class="button small" data-upload-action="retry" data-row-index="${index}" type="button">重传</button>`);
  if (row.canCancel) buttons.push(`<button class="button small" data-upload-action="cancel" data-row-index="${index}" type="button">取消</button>`);
  buttons.push(`<button class="button small danger" data-upload-action="remove" data-row-index="${index}" type="button">删除</button>`);
  return buttons.join("");
}

function uniqueValues(rows, key) {
  return Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function fillSelect(selector, label, values, selected) {
  const select = qs(selector);
  if (!select) return;
  select.innerHTML = [
    `<option value="all">${label}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
  ].join("");
  select.value = values.includes(selected) ? selected : "all";
}

function fillUploadFilters() {
  const types = uniqueValues(currentRows, "type");
  const stages = uniqueValues(currentRows, "stage");
  if (uploadListState.type !== "all" && !types.includes(uploadListState.type)) uploadListState.type = "all";
  if (uploadListState.stage !== "all" && !stages.includes(uploadListState.stage)) uploadListState.stage = "all";
  fillSelect("#uploadTypeFilter", "全部类型", types, uploadListState.type);
  fillSelect("#uploadStageFilter", "全部阶段", stages, uploadListState.stage);
}

function filteredUploadRows() {
  const keyword = uploadListState.keyword.trim().toLowerCase();
  return currentRows
    .map((row, index) => ({ index, row }))
    .filter(({ row }) => {
      const text = [row.name, row.relativePath, row.type, row.stage, row.status, row.note].join(" ").toLowerCase();
      return (
        (!keyword || text.includes(keyword)) &&
        (uploadListState.type === "all" || row.type === uploadListState.type) &&
        (uploadListState.stage === "all" || row.stage === uploadListState.stage)
      );
    });
}

function renderUploadTable(rows) {
  const body = qs("#uploadRows");
  if (!body) return;
  body.innerHTML = rows.length
    ? rows
    .map(
      ({ row, index }) => `
        <tr>
          <td>
            <strong>${escapeHtml(row.name)}</strong>
            <div class="hint">${escapeHtml(row.relativePath || row.name)}</div>
          </td>
          <td>${escapeHtml(row.type)}</td>
          <td>${escapeHtml(row.size)}</td>
          <td>${statusPill(row.stage, row.tone)}<div class="hint">${escapeHtml(row.status)}</div></td>
          <td>${progressCell(row)}</td>
          <td>${escapeHtml(row.note)}</td>
          <td><span class="row-actions">${actionButtons(row, index)}</span></td>
        </tr>
      `,
    )
    .join("")
    : `<tr><td colspan="7" class="empty-state">没有符合条件的上传文件</td></tr>`;
  body.querySelectorAll("[data-upload-action]").forEach((button) => {
    button.addEventListener("click", () => {
      handleUploadAction(Number(button.dataset.rowIndex), button.dataset.uploadAction);
    });
  });
}

function renderUploadPagination(total, totalPages, start, currentCount) {
  const summary = qs("#uploadListSummary");
  const controls = qs("#uploadPaginationControls");
  if (summary) {
    const from = total === 0 ? 0 : start + 1;
    const to = start + currentCount;
    summary.textContent = `每页 ${uploadListState.pageSize} 条，共 ${total} 条，当前 ${from}-${to}`;
  }
  if (!controls) return;
  controls.innerHTML = `
    <button class="page-button" data-upload-page="prev" type="button" ${uploadListState.page === 1 ? "disabled" : ""}>上一页</button>
    ${paginationButtons(uploadListState.page, totalPages, "data-upload-page")}
    <button class="page-button" data-upload-page="next" type="button" ${uploadListState.page === totalPages ? "disabled" : ""}>下一页</button>
    <span class="pagination-jump">
      跳至
      <input class="pagination-input" data-upload-page-jump-input type="number" min="1" max="${totalPages}" value="${uploadListState.page}" aria-label="跳转页码">
      页
      <button class="page-button" data-upload-page-jump type="button" ${totalPages <= 1 ? "disabled" : ""}>确定</button>
    </span>
  `;
  const jumpInput = controls.querySelector("[data-upload-page-jump-input]");
  const jumpToPage = () => {
    const page = Number.parseInt(jumpInput?.value || "", 10);
    if (!Number.isFinite(page)) {
      if (jumpInput) jumpInput.value = uploadListState.page;
      return;
    }
    uploadListState.page = Math.min(totalPages, Math.max(1, page));
    renderUploadList();
  };
  controls.querySelectorAll("[data-upload-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.uploadPage;
      if (target === "prev") uploadListState.page = Math.max(1, uploadListState.page - 1);
      else if (target === "next") uploadListState.page = Math.min(totalPages, uploadListState.page + 1);
      else uploadListState.page = Number(target);
      renderUploadList();
    });
  });
  controls.querySelector("[data-upload-page-jump]")?.addEventListener("click", jumpToPage);
  jumpInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToPage();
  });
}

function renderUploadList() {
  fillUploadFilters();
  const rows = filteredUploadRows();
  const totalPages = Math.max(1, Math.ceil(rows.length / uploadListState.pageSize));
  if (uploadListState.page > totalPages) uploadListState.page = totalPages;
  const start = (uploadListState.page - 1) * uploadListState.pageSize;
  const pagedRows = rows.slice(start, start + uploadListState.pageSize);
  renderUploadTable(pagedRows);
  renderUploadPagination(rows.length, totalPages, start, pagedRows.length);
  renderBatchState(currentRows);
}

function handleUploadAction(index, action) {
  const row = currentRows[index];
  if (!row) return;
  if (action === "remove") {
    currentRows.splice(index, 1);
  } else if (action === "cancel") {
    Object.assign(row, {
      canCancel: false,
      canResume: true,
      canRetry: true,
      note: "已保留上传断点，可继续上传或重传",
      stage: "上传已暂停",
      status: "已取消",
      tone: "amber",
    });
  } else if (action === "resume" || action === "retry") {
    Object.assign(row, {
      canCancel: true,
      canResume: false,
      canRetry: false,
      note: action === "resume" ? "从断点继续上传，完成后登记资产" : "重新上传，完成后登记资产",
      progress: Math.max(row.progress || 0, action === "resume" ? 58 : 18),
      stage: "上传中",
      status: action === "resume" ? "继续上传中" : "重传中",
      tone: "blue",
    });
  }
  renderUploadList();
}

function renderBatchState(rows) {
  const status = qs("#uploadBatchStatus");
  const title = qs("#uploadBatchTitle");
  const summary = qs("#uploadBatchSummary");
  const stageList = qs("#uploadStageList");
  if (!status || !title || !summary || !stageList) return;
  const total = rows.length;
  const blocked = rows.filter((row) => row.blocked).length;
  const failed = rows.filter((row) => row.status === "上传失败").length;
  const running = rows.filter((row) => ["上传中", "重传中", "继续上传中"].includes(row.status)).length;
  const registering = rows.filter((row) => row.status === "登记资产中").length;
  const done = rows.filter((row) => ["上传成功", "已存在，已跳过"].includes(row.status)).length;
  const valid = total - blocked;
  const batchStatus = !total
    ? { label: "待上传", tone: "blue" }
    : running
      ? { label: "上传中", tone: "blue" }
      : registering
        ? { label: "登记资产中", tone: "blue" }
        : failed
          ? { label: "有失败", tone: "red" }
          : blocked
            ? { label: "有拦截", tone: "amber" }
            : { label: "可保存", tone: "green" };
  status.className = `status ${batchStatus.tone}`;
  status.textContent = batchStatus.label;
  title.textContent = total ? `${total} 个文件进入上传批次` : "上传批次";
  summary.textContent = total
    ? `可登记 ${valid} 个，已完成 ${done} 个，失败 ${failed} 个，上传前拦截 ${blocked} 个。`
    : "选择文件或目录后，系统会展示扫描、上传和登记资产状态。";
  const stages = [
    { label: "扫描中", state: total ? "done" : "pending" },
    { label: "上传前校验", state: blocked ? "warning" : total ? "done" : "pending" },
    { label: "上传中", state: running || failed ? "active" : done || registering ? "done" : "pending" },
    { label: "登记资产中", state: registering ? "active" : done ? "done" : "pending" },
  ];
  stageList.innerHTML = stages
    .map((item) => `<span class="upload-stage ${item.state}">${item.label}</span>`)
    .join("");
}

function fileExtension(name) {
  const ext = String(name || "").split(".").pop()?.toLowerCase();
  return ext && ext !== name.toLowerCase() ? ext : "";
}

function validateFile(file, relativePath) {
  const ext = fileExtension(relativePath);
  if (!file.size) return { message: "空文件不可选择", type: "未知" };
  if (archiveExtensions.has(ext)) return { message: "压缩包不可选择", type: ext.toUpperCase() };
  if (!supportedExtensions.has(ext)) return { message: "格式不支持", type: ext ? ext.toUpperCase() : "FILE" };
  return null;
}

function hasSameIdentity(identity) {
  return currentRows.some((row) => row.identity === identity && !row.blocked);
}

function displayName(relativePath) {
  return relativePath.split("/").pop() || relativePath;
}

function fileType(name) {
  const ext = fileExtension(name);
  return supportedExtensions.get(ext) || (ext ? ext.toUpperCase() : "FILE");
}

function fileSize(size) {
  return `${Math.max(size / 1024 / 1024, 0.01).toFixed(2)} MB`;
}

function rowsFromFiles(files, sourceLabel) {
  return Array.from(files || []).filter((file) => file && file.name).map((file, index) => {
    const relativePath = file.webkitRelativePath || file.relativePath || file.name;
    const validation = validateFile(file, relativePath);
    if (validation) {
      return {
        blocked: true,
        canCancel: false,
        canResume: false,
        canRetry: false,
        identity: relativePath,
        name: displayName(relativePath),
        note: validation.message,
        progress: 0,
        relativePath,
        size: fileSize(file.size || 0),
        stage: "上传前校验",
        status: "已拦截",
        tone: "red",
        type: validation.type,
      };
    }
    const duplicateIdentity = hasSameIdentity(relativePath);
    return {
      blocked: false,
      canCancel: true,
      canResume: false,
      canRetry: false,
      identity: relativePath,
      name: displayName(relativePath),
      note: duplicateIdentity
        ? "同路径资产，上传后比较 hash，变化则登记为更新"
        : sourceLabel === "directory" || relativePath.includes("/")
          ? "目录文件，保存相对路径并登记资产"
          : "新文件，保存后登记资产元数据",
      progress: sourceLabel === "directory" ? Math.min(42, 12 + index * 4) : Math.min(68, 28 + index * 8),
      relativePath,
      size: fileSize(file.size),
      stage: "上传中",
      status: "上传中",
      tone: "blue",
      type: fileType(relativePath),
    };
  });
}

function appendRows(rows) {
  currentRows.push(...rows.map((row, index) => normalizeRow(row, currentRows.length + index)));
  uploadListState.page = Math.max(1, Math.ceil(currentRows.length / uploadListState.pageSize));
  renderUploadList();
}

function readDirectory(directoryReader) {
  return new Promise((resolve, reject) => {
    directoryReader.readEntries(resolve, reject);
  });
}

async function traverseEntry(entry, prefix = "") {
  if (!entry) return [];
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file) => {
        file.relativePath = `${prefix}${file.name}`;
        resolve([file]);
      });
    });
  }
  if (!entry.isDirectory) return [];
  const reader = entry.createReader();
  const files = [];
  let batch = await readDirectory(reader);
  while (batch.length) {
    const nested = await Promise.all(batch.map((child) => traverseEntry(child, `${prefix}${entry.name}/`)));
    files.push(...nested.flat());
    batch = await readDirectory(reader);
  }
  return files;
}

async function filesFromDrop(event) {
  const items = Array.from(event.dataTransfer?.items || []);
  if (!items.length) return Array.from(event.dataTransfer?.files || []);
  const fileGroups = await Promise.all(
    items.map((item) => {
      const entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
      if (entry) return traverseEntry(entry);
      const file = item.getAsFile?.();
      return file ? [file] : [];
    }),
  );
  return fileGroups.flat();
}

function bindFilePicker() {
  const input = qs("#fileInput");
  const directoryInput = qs("#directoryInput");
  const button = qs("#pickFiles");
  const directoryButton = qs("#pickDirectory");
  const zone = qs("#uploadZone");
  button?.addEventListener("click", () => input?.click());
  directoryButton?.addEventListener("click", () => directoryInput?.click());
  input?.addEventListener("change", () => {
    appendRows(rowsFromFiles(input.files, "file"));
    input.value = "";
  });
  directoryInput?.addEventListener("change", () => {
    appendRows(rowsFromFiles(directoryInput.files, "directory"));
    directoryInput.value = "";
  });
  zone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("drag-active");
  });
  zone?.addEventListener("dragleave", () => {
    zone.classList.remove("drag-active");
  });
  zone?.addEventListener("drop", async (event) => {
    event.preventDefault();
    zone.classList.remove("drag-active");
    const files = await filesFromDrop(event);
    appendRows(rowsFromFiles(files, "drop"));
  });
}

function bindSave() {
  qs("#saveSource")?.addEventListener("click", () => {
    window.location.href = "local-upload-detail.html";
  });
}

function bindUploadFilters() {
  const search = qs("#uploadSearch");
  const type = qs("#uploadTypeFilter");
  const stage = qs("#uploadStageFilter");
  const reset = qs("#resetUploadFilters");
  const apply = () => {
    uploadListState.keyword = search?.value || "";
    uploadListState.type = type?.value || "all";
    uploadListState.stage = stage?.value || "all";
    uploadListState.page = 1;
    renderUploadList();
  };
  search?.addEventListener("input", apply);
  type?.addEventListener("change", apply);
  stage?.addEventListener("change", apply);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (type) type.value = "all";
    if (stage) stage.value = "all";
    apply();
  });
}

renderUploadList();
bindFilePicker();
bindUploadFilters();
bindSave();
})();

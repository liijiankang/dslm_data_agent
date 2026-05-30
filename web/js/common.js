(function () {
const ALLOWED_STATUS_TONES = new Set(["", "green", "blue", "amber", "red", "violet", "primary", "danger"]);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function safeTone(tone = "blue") {
  return ALLOWED_STATUS_TONES.has(tone) ? tone : "blue";
}

function statusPill(label, tone = "blue") {
  const className = safeTone(tone);
  return `<span class="status ${className}">${escapeHtml(label)}</span>`;
}

function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function compactPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, "ellipsis", totalPages];
  if (currentPage >= totalPages - 2) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

function paginationButtons(currentPage, totalPages, dataAttribute, extraAttributes = "") {
  const safeAttribute = /^[a-zA-Z0-9_-]+$/.test(dataAttribute) ? dataAttribute : "data-page";
  return compactPaginationItems(currentPage, totalPages)
    .map((item) => {
      if (item === "ellipsis") return `<span class="page-ellipsis" aria-hidden="true">…</span>`;
      return `<button class="page-button ${item === currentPage ? "active" : ""}" ${safeAttribute}="${item}" ${extraAttributes} type="button">${item}</button>`;
    })
    .join("");
}

function taskRuntimeAction(status) {
  return {
    待启动: {
      key: "start",
      label: "启动",
      tone: "primary",
      title: "启动构建任务",
      submitLabel: "确认启动",
      summary: "启动后任务进入调度队列，系统会按构建范围执行解析、切片、embedding 生成和结果写入。",
      result: "已模拟提交：任务启动请求已发送，任务将进入排队中。",
    },
    排队中: {
      key: "cancel",
      label: "取消",
      tone: "",
      title: "取消排队任务",
      submitLabel: "确认取消",
      summary: "取消后任务不再进入调度，已经生成的任务记录和操作记录会保留。",
      result: "已模拟提交：任务取消请求已发送，调度器不会再执行该任务。",
    },
    运行中: {
      key: "stop",
      label: "停止",
      tone: "danger",
      title: "停止构建任务",
      submitLabel: "确认停止",
      summary: "停止会以安全停止方式执行：不再派发新的资产处理，正在处理的资产会在可中断点停止或完成当前阶段后停止。",
      result: "已模拟提交：任务停止请求已发送，任务将进入停止中。",
    },
    已停止: {
      key: "resume",
      label: "继续",
      tone: "primary",
      title: "继续构建任务",
      submitLabel: "确认继续",
      summary: "继续会从未完成资产或未完成阶段恢复，已成功且资产 hash 未变化的结果不会重复构建。",
      result: "已模拟提交：任务继续请求已发送，系统将从未完成部分恢复执行。",
    },
    失败: {
      key: "retry",
      label: "重试",
      tone: "primary",
      title: "重试构建任务",
      submitLabel: "确认重试",
      summary: "重试会重新执行失败资产，已经成功且资产 hash 未变化的资产不会重复构建。",
      result: "已模拟提交：失败资产重试请求已发送。",
    },
    部分成功: {
      key: "retry",
      label: "重试失败资产",
      tone: "primary",
      title: "重试失败资产",
      submitLabel: "确认重试",
      summary: "系统只重试失败资产，已成功资产和未变化产物保持不变。",
      result: "已模拟提交：失败资产重试请求已发送。",
    },
  }[status] || null;
}

function bindTabs() {
  const tabs = qsa("[data-tab-target]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tabTarget;
      qsa("[data-tab-target]").forEach((item) => item.classList.remove("active"));
      qsa("[data-tab-panel]").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      qs(`[data-tab-panel="${target}"]`)?.classList.add("active");
    });
  });
}

function bindModalTriggers() {
  qsa("[data-open-modal]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      qs(`#${trigger.dataset.openModal}`)?.classList.add("open");
    });
  });
  qsa("[data-close-modal]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      trigger.closest(".modal-backdrop")?.classList.remove("open");
    });
  });
}

function syncCheckAll(tableSelector = "[data-check-all]") {
  qsa(tableSelector).forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const table = checkbox.closest("table");
      qsa('tbody input[type="checkbox"]', table).forEach((item) => {
        item.checked = checkbox.checked;
      });
    });
  });
}

function bindRowNavigation() {
  qsa("[data-href]").forEach((row) => {
    if (row.dataset.navigationBound === "true") return;
    row.dataset.navigationBound = "true";
    row.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, select, textarea, label")) return;
      window.location.href = row.dataset.href;
    });
    row.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      if (event.target.closest("a, button, input, select, textarea, label")) return;
      event.preventDefault();
      window.location.href = row.dataset.href;
    });
  });
}

window.UI = {
  bindModalTriggers,
  bindRowNavigation,
  bindTabs,
  escapeHtml,
  paginationButtons,
  qs,
  qsa,
  safeTone,
  statusPill,
  syncCheckAll,
  taskRuntimeAction,
};
})();

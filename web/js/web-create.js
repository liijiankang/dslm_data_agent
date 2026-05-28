(function () {
const { qs, qsa } = window.UI;

const authOptions = {
  crawl4ai: [
    { value: "none", label: "无需认证" },
    { value: "usernamePassword", label: "账号密码" },
    { value: "token", label: "Token" },
    { value: "cookie", label: "Cookie" },
  ],
  w3: [
    { value: "usernamePassword", label: "账号密码" },
  ],
  xwork: [
    { value: "none", label: "无需认证" },
    { value: "cookie", label: "Cookie" },
    { value: "usernamePassword", label: "账号密码" },
  ],
  feishu: [
    { value: "appCredential", label: "App 凭证" },
  ],
};

function setStatus(selector, label, tone) {
  const status = qs(selector);
  if (!status) return;
  status.className = `status ${tone}`;
  status.textContent = label;
}

function setConnectionStatus(label, tone) {
  setStatus("#connectionStatus", label, tone);
}

function parseWebUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function inferWebSubtype() {
  const parsed = parseWebUrl(qs("#entryUrl")?.value);
  const hostname = parsed?.hostname?.toLowerCase();
  if (hostname === "w3.xfusion.com") return "w3";
  if (hostname === "office.xfusion.com") return "xwork";
  if (hostname === "feishu.cn" || hostname?.endsWith(".feishu.cn")) return "feishu";
  return "crawl4ai";
}

function subtypeLabel(subtype) {
  return {
    crawl4ai: "通用网页",
    w3: "W3 门户",
    xwork: "协作空间",
    feishu: "飞书知识库",
  }[subtype] || "通用网页";
}

function authMode() {
  return qs("#authMode")?.value || "none";
}

function visibleAuthFields(mode) {
  if (mode === "usernamePassword") return new Set(["username", "password"]);
  if (mode === "token") return new Set(["token"]);
  if (mode === "cookie") return new Set(["cookie"]);
  if (mode === "appCredential") return new Set(["appId", "appSecret"]);
  return new Set();
}

function renderAuthOptions() {
  const select = qs("#authMode");
  if (!select) return;
  const subtype = inferWebSubtype();
  const options = authOptions[subtype] || authOptions.crawl4ai;
  const current = select.value;
  select.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
  select.value = options.some((option) => option.value === current) ? current : options[0].value;
  setStatus("#adapterStatus", subtypeLabel(subtype), subtype === "crawl4ai" ? "blue" : "green");
  syncAuthFields();
}

function syncAuthFields() {
  const visible = visibleAuthFields(authMode());
  qsa("[data-auth-field]").forEach((field) => {
    const key = field.dataset.authField;
    const show = visible.has(key);
    field.hidden = !show;
    field.querySelectorAll("input, textarea, select").forEach((input) => {
      input.disabled = !show;
    });
  });
}

function syncAttachmentFields() {
  const panel = qs("#attachmentTypes");
  const show = qs("#attachmentMode")?.value !== "仅页面";
  if (!panel) return;
  panel.hidden = !show;
  panel.querySelectorAll("input").forEach((input) => {
    input.disabled = !show;
  });
}

function trimmedValue(selector) {
  return qs(selector)?.value.trim() || "";
}

function checkedAttachmentTypes() {
  return qsa("[data-attachment-type]").filter((input) => input.checked).map((input) => input.dataset.attachmentType);
}

function validateRequiredFields() {
  if (!trimmedValue("#sourceName")) {
    setConnectionStatus("缺少数据源名称", "red");
    qs("#sourceName")?.focus();
    return false;
  }
  if (!parseWebUrl(trimmedValue("#entryUrl"))) {
    setConnectionStatus("入口 URL 不合法", "red");
    qs("#entryUrl")?.focus();
    return false;
  }
  const mode = authMode();
  if (mode === "usernamePassword" && (!trimmedValue("#username") || !trimmedValue("#password"))) {
    setConnectionStatus("缺少账号密码", "red");
    qs(!trimmedValue("#username") ? "#username" : "#password")?.focus();
    return false;
  }
  if (mode === "token" && !trimmedValue("#token")) {
    setConnectionStatus("缺少 Token", "red");
    qs("#token")?.focus();
    return false;
  }
  if (mode === "cookie" && !trimmedValue("#cookieValue")) {
    setConnectionStatus("缺少 Cookie", "red");
    qs("#cookieValue")?.focus();
    return false;
  }
  if (mode === "appCredential" && (!trimmedValue("#appId") || !trimmedValue("#appSecret"))) {
    setConnectionStatus("缺少 App 凭证", "red");
    qs(!trimmedValue("#appId") ? "#appId" : "#appSecret")?.focus();
    return false;
  }
  const depth = Number.parseInt(trimmedValue("#depth"), 10);
  if (!Number.isInteger(depth) || depth < 0 || depth > 6) {
    setConnectionStatus("爬取深度不合法", "red");
    qs("#depth")?.focus();
    return false;
  }
  const maxPages = Number.parseInt(trimmedValue("#maxPages"), 10);
  if (!Number.isInteger(maxPages) || maxPages <= 0) {
    setConnectionStatus("最大页面数不合法", "red");
    qs("#maxPages")?.focus();
    return false;
  }
  if (qs("#attachmentMode")?.value !== "仅页面" && !checkedAttachmentTypes().length) {
    setConnectionStatus("请选择附件类型", "red");
    return false;
  }
  return true;
}

function bindDirtyStatus() {
  qsa("input, textarea, select").forEach((input) => {
    input.addEventListener("input", () => setConnectionStatus("未测试", "blue"));
    input.addEventListener("change", () => setConnectionStatus("未测试", "blue"));
  });
}

function bindControls() {
  qs("#entryUrl")?.addEventListener("input", renderAuthOptions);
  qs("#authMode")?.addEventListener("change", syncAuthFields);
  qs("#attachmentMode")?.addEventListener("change", syncAttachmentFields);
  qs("#testConnection")?.addEventListener("click", () => {
    if (!validateRequiredFields()) return;
    setConnectionStatus("测试通过", "green");
  });
  qs("#saveWebSource")?.addEventListener("click", () => {
    if (!validateRequiredFields()) return;
    window.location.href = "local-upload-detail.html?sourceId=source-005";
  });
}

renderAuthOptions();
syncAttachmentFields();
bindControls();
bindDirtyStatus();
})();

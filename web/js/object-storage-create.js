(function () {
const { qs, qsa } = window.UI;

function setConnectionStatus(label, tone) {
  const status = qs("#connectionStatus");
  if (!status) return;
  status.className = `status ${tone}`;
  status.textContent = label;
}

function visibleCredentialFields(mode) {
  if (mode === "anonymous") return new Set();
  if (mode === "temporary") return new Set(["access", "secret", "token"]);
  return new Set(["access", "secret"]);
}

function syncCredentialFields() {
  const mode = qs("#credentialMode")?.value || "accessKey";
  const visible = visibleCredentialFields(mode);
  qsa("[data-credential-field]").forEach((field) => {
    const key = field.dataset.credentialField;
    const show = visible.has(key);
    field.hidden = !show;
    field.querySelectorAll("input, textarea, select").forEach((input) => {
      input.disabled = !show;
    });
  });
}

function trimmedValue(selector) {
  return qs(selector)?.value.trim() || "";
}

function validateRequiredFields() {
  const requiredFields = [
    { selector: "#sourceName", label: "数据源名称" },
    { selector: "#endpoint", label: "服务地址" },
    { selector: "#bucket", label: "Bucket" },
  ];
  const missing = requiredFields.filter((item) => !trimmedValue(item.selector));
  if (missing.length) {
    setConnectionStatus(`缺少${missing[0].label}`, "red");
    qs(missing[0].selector)?.focus();
    return false;
  }

  const mode = qs("#credentialMode")?.value;
  if (mode === "temporary" && !trimmedValue("#sessionToken")) {
    setConnectionStatus("缺少 Session Token", "red");
    qs("#sessionToken")?.focus();
    return false;
  }
  if (mode !== "anonymous" && (!trimmedValue("#accessKey") || !trimmedValue("#secretKey"))) {
    setConnectionStatus("缺少访问凭证", "red");
    qs(!trimmedValue("#accessKey") ? "#accessKey" : "#secretKey")?.focus();
    return false;
  }
  return true;
}

function bindCredentialMode() {
  qs("#credentialMode")?.addEventListener("change", syncCredentialFields);
  syncCredentialFields();
}

function bindDirtyStatus() {
  qsa("input, textarea, select").forEach((input) => {
    input.addEventListener("input", () => setConnectionStatus("未测试", "blue"));
    input.addEventListener("change", () => setConnectionStatus("未测试", "blue"));
  });
}

function bindProtocolSync() {
  qs("#protocol")?.addEventListener("change", () => {
    const endpoint = qs("#endpoint");
    const protocol = qs("#protocol")?.value.toLowerCase();
    if (!endpoint || !protocol) return;
    endpoint.value = endpoint.value.replace(/^https?:\/\//i, `${protocol}://`);
  });
}

function bindConnectionTest() {
  qs("#testConnection")?.addEventListener("click", () => {
    if (!validateRequiredFields()) return;
    setConnectionStatus("测试通过", "green");
  });
}

function bindSave() {
  qs("#saveStorageSource")?.addEventListener("click", () => {
    if (!validateRequiredFields()) return;
    window.location.href = "local-upload-detail.html?sourceId=source-002";
  });
}

bindCredentialMode();
bindProtocolSync();
bindConnectionTest();
bindSave();
bindDirtyStatus();
})();

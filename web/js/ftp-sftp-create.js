(function () {
const { qs, qsa } = window.UI;

const credentialOptions = {
  sftp: [
    { value: "usernamePassword", label: "用户名密码" },
    { value: "sshKey", label: "SSH 密钥" },
  ],
  ftp: [
    { value: "usernamePassword", label: "用户名密码" },
    { value: "anonymous", label: "匿名访问" },
  ],
};

function setConnectionStatus(label, tone) {
  const status = qs("#connectionStatus");
  if (!status) return;
  status.className = `status ${tone}`;
  status.textContent = label;
}

function protocolType() {
  return qs("#protocolType")?.value || "sftp";
}

function credentialMode() {
  return qs("#credentialMode")?.value || "usernamePassword";
}

function visibleCredentialFields(mode) {
  if (mode === "anonymous") return new Set();
  if (mode === "sshKey") return new Set(["username", "sshPrivateKey", "sshPassphrase"]);
  return new Set(["username", "password"]);
}

function renderCredentialOptions() {
  const select = qs("#credentialMode");
  if (!select) return;
  const options = credentialOptions[protocolType()] || credentialOptions.sftp;
  const current = select.value;
  select.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
  select.value = options.some((option) => option.value === current) ? current : options[0].value;
}

function syncProtocolFields() {
  const type = protocolType();
  const port = qs("#port");
  if (port && (port.value === "21" || port.value === "22" || !port.value.trim())) {
    port.value = type === "ftp" ? "21" : "22";
  }
  qsa("[data-ftp-only]").forEach((field) => {
    const show = type === "ftp";
    field.hidden = !show;
    field.querySelectorAll("input, textarea, select").forEach((input) => {
      input.disabled = !show;
    });
  });
  renderCredentialOptions();
  syncCredentialFields();
}

function syncCredentialFields() {
  const visible = visibleCredentialFields(credentialMode());
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
    { selector: "#host", label: "主机地址" },
    { selector: "#port", label: "端口" },
    { selector: "#rootPath", label: "根目录" },
  ];
  const missing = requiredFields.filter((item) => !trimmedValue(item.selector));
  if (missing.length) {
    setConnectionStatus(`缺少${missing[0].label}`, "red");
    qs(missing[0].selector)?.focus();
    return false;
  }

  const port = Number.parseInt(trimmedValue("#port"), 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    setConnectionStatus("端口不合法", "red");
    qs("#port")?.focus();
    return false;
  }

  const mode = credentialMode();
  if (mode === "usernamePassword" && (!trimmedValue("#username") || !trimmedValue("#password"))) {
    setConnectionStatus("缺少访问凭证", "red");
    qs(!trimmedValue("#username") ? "#username" : "#password")?.focus();
    return false;
  }
  if (mode === "sshKey" && (!trimmedValue("#username") || !trimmedValue("#sshPrivateKey"))) {
    setConnectionStatus("缺少 SSH 私钥", "red");
    qs(!trimmedValue("#username") ? "#username" : "#sshPrivateKey")?.focus();
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
  qs("#protocolType")?.addEventListener("change", syncProtocolFields);
  qs("#credentialMode")?.addEventListener("change", syncCredentialFields);
  qs("#testConnection")?.addEventListener("click", () => {
    if (!validateRequiredFields()) return;
    setConnectionStatus("测试通过", "green");
  });
  qs("#saveFtpSource")?.addEventListener("click", () => {
    if (!validateRequiredFields()) return;
    window.location.href = "local-upload-detail.html?sourceId=source-003";
  });
}

syncProtocolFields();
bindControls();
bindDirtyStatus();
})();

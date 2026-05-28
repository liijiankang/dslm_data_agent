(function () {
const { qs, qsa } = window.UI;

const databaseMeta = {
  mysql: {
    port: "3306",
    databaseLabel: "数据库名称",
    databaseValue: "crm_prod",
  },
  postgresql: {
    port: "5432",
    databaseLabel: "数据库名称",
    databaseValue: "crm_prod",
    schemaValue: "public",
  },
  oracle: {
    port: "1521",
    databaseLabel: "Service Name / SID",
    databaseValue: "ORCLPDB1",
    schemaValue: "CRM_OWNER",
  },
  sqlserver: {
    port: "1433",
    databaseLabel: "数据库名称",
    databaseValue: "crm_prod",
    schemaValue: "dbo",
  },
  mariadb: {
    port: "3306",
    databaseLabel: "数据库名称",
    databaseValue: "crm_prod",
  },
};
const knownPorts = new Set(Object.values(databaseMeta).map((item) => item.port));
const knownDatabaseValues = new Set(Object.values(databaseMeta).map((item) => item.databaseValue).filter(Boolean));
const knownSchemaValues = new Set(Object.values(databaseMeta).map((item) => item.schemaValue).filter(Boolean));

function setConnectionStatus(label, tone) {
  const status = qs("#connectionStatus");
  if (!status) return;
  status.className = `status ${tone}`;
  status.textContent = label;
}

function databaseType() {
  return qs("#databaseType")?.value || "mysql";
}

function credentialMode() {
  return qs("#credentialMode")?.value || "usernamePassword";
}

function fieldMatchesDatabase(field, type) {
  return (field.dataset.dbTypes || "").split(/\s+/).filter(Boolean).includes(type);
}

function syncTypedFields(type) {
  qsa("[data-db-types]").forEach((field) => {
    const show = fieldMatchesDatabase(field, type);
    field.hidden = !show;
    field.querySelectorAll("input, textarea, select").forEach((input) => {
      input.disabled = !show;
    });
  });
}

function syncDefaultValue(selector, value, knownValues) {
  const input = qs(selector);
  if (!input || !value) return;
  if (!input.value.trim() || knownValues.has(input.value.trim())) {
    input.value = value;
  }
}

function syncDatabaseNameLabel(current) {
  const label = qs("#databaseNameLabel");
  if (!label) return;
  label.textContent = current.databaseLabel;
}

function syncDatabaseType() {
  const type = databaseType();
  const current = databaseMeta[type] || databaseMeta.mysql;
  const port = qs("#port");
  if (port && (knownPorts.has(port.value) || !port.value.trim())) {
    port.value = current.port;
  }
  syncDefaultValue("#databaseName", current.databaseValue, knownDatabaseValues);
  syncDefaultValue("#schemaName", current.schemaValue, knownSchemaValues);
  syncTypedFields(type);
  syncDatabaseNameLabel(current);
}

function syncCredentialFields() {
  qsa("[data-credential-field]").forEach((field) => {
    const key = field.dataset.credentialField;
    const show = key === "username" || key === "password";
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
  const timeout = Number.parseInt(trimmedValue("#connectTimeout"), 10);
  if (!Number.isInteger(timeout) || timeout <= 0) {
    setConnectionStatus("连接超时不合法", "red");
    qs("#connectTimeout")?.focus();
    return false;
  }

  if (credentialMode() === "usernamePassword" && (!trimmedValue("#username") || !trimmedValue("#password"))) {
    setConnectionStatus("缺少访问凭证", "red");
    qs(!trimmedValue("#username") ? "#username" : "#password")?.focus();
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
  qs("#databaseType")?.addEventListener("change", syncDatabaseType);
  qs("#credentialMode")?.addEventListener("change", syncCredentialFields);
  qs("#testConnection")?.addEventListener("click", () => {
    if (!validateRequiredFields()) return;
    setConnectionStatus("测试通过", "green");
  });
  qs("#saveDatabaseSource")?.addEventListener("click", () => {
    if (!validateRequiredFields()) return;
    window.location.href = "local-upload-detail.html?sourceId=source-004";
  });
}

syncDatabaseType();
syncCredentialFields();
bindControls();
bindDirtyStatus();
})();

"use strict";

const APP_VERSION = "0.1.1";
const DB_NAME = "DialsLocalStore";
const DB_VERSION = 1;
const STORE_NAME = "app";
const DATA_RECORD_KEY = "encryptedData";
const SAFE_META_KEY = "safeMeta";
const LATEST_STATUS_STORAGE_KEY = "dialsLatestStatus";
const PREFIX_STORAGE_KEY = "dialsContactPrefix";
const PREFIX_ENABLED_STORAGE_KEY = "dialsContactPrefixEnabled";
const THEME_STORAGE_KEY = "dialsThemePreference";

const state = {
  encryptedText: "",
  encryptedPackage: null,
  safeMeta: null,
  payload: null,
  people: [],
  categories: [],
  currentView: { type: "home" },
  searchQuery: "",
  latestStatus: null,
  selectedPeople: new Set(),
  contactFilter: "",
  deferredInstallPrompt: null,
  themePreference: "system",
};

const el = {};

window.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  registerServiceWorker();
  initializeTheme();
  await loadLatestStatus();

  if (!window.crypto?.subtle || !window.indexedDB) {
    showStartState("unsupported");
    return;
  }

  try {
    const saved = await dbGet(DATA_RECORD_KEY);
    const meta = await dbGet(SAFE_META_KEY);
    if (saved?.text) {
      state.encryptedText = saved.text;
      state.encryptedPackage = parseAndValidateEncryptedPackage(saved.text);
      state.safeMeta = meta || null;
      showStartState("locked");
      updateStartMeta();
    } else {
      showStartState("empty");
    }
  } catch (error) {
    console.error(error);
    showStartState("empty");
    setUnlockMessage("브라우저에 저장된 데이터를 읽지 못했습니다. 새 데이터 파일을 연결해 주세요.", true);
  }
}

function cacheElements() {
  [
    "startView", "mainView", "contactExportView", "connectStateText", "connectStateBadge",
    "noDataActions", "lockedDataActions", "connectDataButton", "replaceDataStartButton",
    "dataFileInput", "unlockForm", "passwordInput", "unlockButton", "unlockMessage",
    "connectedFileName", "connectedMetaText", "directoryTitle", "dataDateLabel",
    "updateIndicator", "menuButton", "overflowMenu", "homeBrandButton", "globalSearchInput",
    "clearSearchButton", "contentView", "contactBackButton", "contactSearchInput",
    "selectedPeopleCount", "selectFilteredButton", "clearSelectionButton", "contactPeopleList",
    "includeMobileOption", "includeExtensionOption", "includeAffiliationOption", "includeJobOption",
    "prefixEnabledOption", "namePrefixInput", "prefixPreview", "createVcardButton", "vcardMessage",
    "modalBackdrop", "modalPanel", "modalTitle", "modalBody", "modalActions", "modalCloseButton",
    "themeMenuButton", "themeColorMeta",
  ].forEach((id) => { el[id] = document.getElementById(id); });
}

function bindEvents() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
  });
  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
  });

  el.connectDataButton.addEventListener("click", openFilePicker);
  el.replaceDataStartButton.addEventListener("click", openFilePicker);
  el.dataFileInput.addEventListener("change", handleDataFileSelection);
  el.unlockForm.addEventListener("submit", handleUnlock);

  el.homeBrandButton.addEventListener("click", () => {
    state.searchQuery = "";
    el.globalSearchInput.value = "";
    state.currentView = { type: "home" };
    renderContent();
  });

  el.globalSearchInput.addEventListener("input", () => {
    state.searchQuery = el.globalSearchInput.value.trim();
    el.clearSearchButton.classList.toggle("hidden", !state.searchQuery);
    renderContent();
  });
  el.clearSearchButton.addEventListener("click", () => {
    el.globalSearchInput.value = "";
    state.searchQuery = "";
    el.globalSearchInput.focus();
    el.clearSearchButton.classList.add("hidden");
    renderContent();
  });

  el.menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = el.overflowMenu.classList.contains("hidden");
    closeOverflowMenu();
    if (willOpen) {
      el.overflowMenu.classList.remove("hidden");
      el.menuButton.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", (event) => {
    if (!el.overflowMenu.contains(event.target) && event.target !== el.menuButton) closeOverflowMenu();
  });
  el.overflowMenu.addEventListener("click", handleMenuAction);
  el.updateIndicator.addEventListener("click", showUpdateNotice);
  window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change", () => {
    if (state.themePreference === "system") updateThemeMetaColor();
  });

  el.contactBackButton.addEventListener("click", leaveContactExport);
  el.contactSearchInput.addEventListener("input", () => {
    state.contactFilter = el.contactSearchInput.value.trim();
    renderContactPeople();
  });
  el.selectFilteredButton.addEventListener("click", selectFilteredPeople);
  el.clearSelectionButton.addEventListener("click", () => {
    state.selectedPeople.clear();
    renderContactPeople();
  });
  el.contactPeopleList.addEventListener("change", handleContactSelectionChange);
  el.prefixEnabledOption.addEventListener("change", updatePrefixControls);
  el.namePrefixInput.addEventListener("input", updatePrefixControls);
  el.createVcardButton.addEventListener("click", createVcardFile);

  el.modalCloseButton.addEventListener("click", closeModal);
  el.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === el.modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOverflowMenu();
      closeModal();
    }
  });
}

function showStartState(mode) {
  el.startView.classList.remove("hidden");
  el.mainView.classList.add("hidden");
  el.contactExportView.classList.add("hidden");
  el.noDataActions.classList.toggle("hidden", mode !== "empty");
  el.lockedDataActions.classList.toggle("hidden", mode !== "locked");

  if (mode === "unsupported") {
    el.noDataActions.classList.add("hidden");
    el.lockedDataActions.classList.add("hidden");
    el.connectStateText.textContent = "이 브라우저에서는 암호화 데이터 또는 로컬 저장 기능을 사용할 수 없습니다.";
    setBadge("지원 안 됨", "warning");
  } else if (mode === "locked") {
    el.connectStateText.textContent = "데이터가 연결되어 있습니다. 암호를 입력해 전화번호부를 여세요.";
    setBadge("연결됨", hasNewerData(state.safeMeta?.dataVersion) ? "warning" : "connected");
    el.passwordInput.value = "";
    window.setTimeout(() => el.passwordInput.focus(), 20);
  } else {
    el.connectStateText.textContent = "배포받은 Dials 데이터 파일을 연결해 주세요.";
    setBadge("미연결", "neutral");
  }
}

function setBadge(text, type) {
  el.connectStateBadge.textContent = text;
  el.connectStateBadge.className = `status-badge ${type}`;
}

function updateStartMeta() {
  if (!state.encryptedPackage) return;
  el.connectedFileName.textContent = state.safeMeta?.fileName || "Dials 데이터";
  const parts = [];
  if (state.safeMeta?.dataVersion) parts.push(`${formatDate(state.safeMeta.dataVersion)} 기준`);
  if (hasNewerData(state.safeMeta?.dataVersion)) parts.push("새 데이터 있음");
  el.connectedMetaText.textContent = parts.join(" · ");
}

function openFilePicker() {
  el.dataFileInput.value = "";
  el.dataFileInput.click();
}

async function handleDataFileSelection() {
  const file = el.dataFileInput.files?.[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    const packageData = parseAndValidateEncryptedPackage(text);
    state.encryptedText = text;
    state.encryptedPackage = packageData;
    state.safeMeta = { fileName: file.name, dataVersion: "", generatedAt: "", title: "" };
    await dbSet(DATA_RECORD_KEY, { text });
    await dbSet(SAFE_META_KEY, state.safeMeta);
    requestPersistentStorage();
    showStartState("locked");
    updateStartMeta();
    setUnlockMessage("데이터가 연결되었습니다. 암호를 입력해 주세요.", false, true);
  } catch (error) {
    console.error(error);
    showModal({
      title: "데이터를 불러올 수 없습니다",
      body: `<p>${escapeHtml(error.message || "지원하지 않는 Dials 데이터 파일입니다.")}</p>`,
      actions: [{ label: "확인", primary: true, onClick: closeModal }],
    });
  }
}

function readFileAsText(file) {
  if (file && typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("파일을 읽을 수 없습니다."));
    reader.readAsText(file);
  });
}

function parseAndValidateEncryptedPackage(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("파일 형식을 읽을 수 없습니다."); }
  if (!data || data.format !== "DialsEncryptedData") throw new Error("Dials 데이터 파일이 아닙니다.");
  if (Number(data.formatVersion) !== 1) throw new Error(`지원하지 않는 데이터 형식 버전입니다: ${data.formatVersion ?? "알 수 없음"}`);
  if (data.kdf?.name !== "PBKDF2-HMAC-SHA256" || !data.kdf?.salt || !data.kdf?.iterations) throw new Error("암호화 키 정보가 올바르지 않습니다.");
  if (data.cipher?.name !== "AES-256-GCM" || !data.cipher?.nonce || !data.cipher?.ciphertext) throw new Error("암호화 데이터가 올바르지 않습니다.");
  return data;
}

async function handleUnlock(event) {
  event.preventDefault();
  const password = el.passwordInput.value;
  if (!password) {
    setUnlockMessage("데이터 암호를 입력해 주세요.", true);
    return;
  }

  el.unlockButton.disabled = true;
  setUnlockMessage("암호화 데이터를 여는 중입니다…", false);
  try {
    const payload = await decryptDialsPackage(state.encryptedPackage, password);
    validatePayload(payload);
    state.payload = payload;
    prepareDirectoryData(payload);
    state.safeMeta = {
      fileName: state.safeMeta?.fileName || "Dials 데이터",
      dataVersion: String(payload.dataVersion || ""),
      generatedAt: String(payload.generatedAt || ""),
      title: String(payload.title || "전화번호부"),
      schemaVersion: String(payload.schemaVersion || ""),
    };
    await dbSet(SAFE_META_KEY, state.safeMeta);
    el.passwordInput.value = "";
    setUnlockMessage("", false);
    enterMainView();
  } catch (error) {
    console.error(error);
    setUnlockMessage("암호가 올바르지 않거나 데이터 파일이 손상되었습니다.", true);
  } finally {
    el.unlockButton.disabled = false;
  }
}

async function decryptDialsPackage(packageData, password) {
  const salt = base64ToBytes(packageData.kdf.salt);
  const iv = base64ToBytes(packageData.cipher.nonce);
  const ciphertext = base64ToBytes(packageData.cipher.ciphertext);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: Number(packageData.kdf.iterations),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plainBuffer));
}

function validatePayload(payload) {
  if (!payload || !Array.isArray(payload.categories)) throw new Error("전화번호부 데이터 내용이 올바르지 않습니다.");
  const schemaVersion = String(payload.schemaVersion || "");
  if (!schemaVersion.startsWith("1.")) throw new Error(`지원하지 않는 데이터 스키마입니다: ${schemaVersion || "알 수 없음"}`);
}

function prepareDirectoryData(payload) {
  state.categories = (payload.categories || []).map((category, categoryIndex) => ({
    id: String(category.id || `category-${categoryIndex}`),
    label: String(category.label || "기타"),
    organizations: (category.organizations || []).map((org, orgIndex) => ({
      major: String(org.major || ""),
      minor: String(org.minor || ""),
      categoryId: String(category.id || `category-${categoryIndex}`),
      categoryLabel: String(category.label || "기타"),
      orgIndex,
      people: (org.people || []).map((person, personIndex) => ({ ...person, _personIndex: personIndex })),
    })),
  }));

  state.people = buildUniquePeople(state.categories);
}

function buildUniquePeople(categories) {
  const peopleMap = new Map();
  let sourceIndex = 0;
  for (const category of categories) {
    for (const org of category.organizations) {
      for (const record of org.people) {
        const personKey = derivePersonKey(record, org, sourceIndex);
        if (!peopleMap.has(personKey)) {
          peopleMap.set(personKey, {
            key: personKey,
            name: String(record.name || "").trim(),
            sourceIndex,
            affiliations: [],
          });
        }
        const person = peopleMap.get(personKey);
        person.affiliations.push({
          categoryId: category.id,
          categoryLabel: category.label,
          major: org.major,
          minor: org.minor,
          title: String(record.title || ""),
          role: String(record.role || ""),
          job: String(record.job || formatJob(record.title, record.role)),
          extension: String(record.extension || ""),
          mobile: String(record.mobile || ""),
        });
        sourceIndex += 1;
      }
    }
  }
  return [...peopleMap.values()].sort((a, b) => a.sourceIndex - b.sourceIndex);
}

function derivePersonKey(record, org, sourceIndex) {
  const explicit = String(record.personKey || record.person_key || "").trim();
  if (explicit) return `id:${explicit}`;

  // personKey가 없는 비정상/구형 테스트 파일을 위한 보수적인 fallback입니다. 같은 이름+휴대폰이면 한 사람으로 묶고,
  // 휴대폰이 없으면 동명이인을 잘못 합치지 않기 위해 각 근무정보를 별도 사람으로 유지합니다.
  const name = normalizeText(record.name || "");
  const mobile = normalizePhoneKey(record.mobile || "");
  if (name && mobile) return `fallback:${name}|${mobile}`;
  return `assignment:${org.categoryId}|${org.major}|${org.minor}|${name}|${normalizePhoneKey(record.extension || "")}|${sourceIndex}`;
}

function enterMainView() {
  el.startView.classList.add("hidden");
  el.contactExportView.classList.add("hidden");
  el.mainView.classList.remove("hidden");
  el.directoryTitle.textContent = String(state.payload?.title || "전화번호부");
  el.dataDateLabel.textContent = state.payload?.dataVersion ? `${formatDate(state.payload.dataVersion)} 기준` : "";
  state.currentView = { type: "home" };
  state.searchQuery = "";
  el.globalSearchInput.value = "";
  el.clearSearchButton.classList.add("hidden");
  updateUpdateIndicator();
  renderContent();
}

function renderContent() {
  if (!state.payload) return;
  if (state.searchQuery) {
    renderSearchResults();
    return;
  }
  const view = state.currentView;
  if (view.type === "category") renderCategory(view.categoryId);
  else if (view.type === "organization") renderOrganization(view.categoryId, view.orgIndex);
  else renderHome();
}

function renderHome() {
  const cards = state.categories.map((category) => {
    const count = category.organizations.length;
    return `<button class="category-card" type="button" data-category-id="${escapeAttr(category.id)}">
      <strong>${escapeHtml(category.label)}</strong>
      <span>${count}개 소속 <span class="chevron">›</span></span>
    </button>`;
  }).join("");
  el.contentView.innerHTML = `
    <div class="page-heading">
      <h1>소속별 조회</h1>
      <p>소속을 선택하거나 위 검색창에서 이름·소속·번호를 바로 찾아보세요.</p>
    </div>
    <div class="category-grid">${cards || renderEmptyHtml("표시할 소속이 없습니다.")}</div>`;
  el.contentView.querySelectorAll("[data-category-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = { type: "category", categoryId: button.dataset.categoryId };
      renderContent();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderCategory(categoryId) {
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) { state.currentView = { type: "home" }; renderHome(); return; }
  const majorGroups = [];
  const groupMap = new Map();
  category.organizations.forEach((org, orgIndex) => {
    const major = org.major || category.label;
    if (!groupMap.has(major)) {
      const entry = { major, items: [] };
      groupMap.set(major, entry);
      majorGroups.push(entry);
    }
    groupMap.get(major).items.push({ org, orgIndex });
  });

  const groupsHtml = majorGroups.map((group) => {
    const rows = group.items.map(({ org, orgIndex }) => {
      const label = org.minor || org.major || "소속 없음";
      const count = org.people.length;
      return `<button class="organization-row" type="button" data-org-index="${orgIndex}">
        <span><strong>${escapeHtml(label)}</strong><br><small>${count}명</small></span><span class="chevron">›</span>
      </button>`;
    }).join("");
    const hideRepeatedMajor = group.items.length === 1 && (group.items[0].org.minor === "" || group.items[0].org.minor === group.major);
    if (hideRepeatedMajor) {
      const { org, orgIndex } = group.items[0];
      return `<div class="org-group"><div class="organization-list"><button class="organization-row" type="button" data-org-index="${orgIndex}">
        <span><strong>${escapeHtml(group.major)}</strong><br><small>${org.people.length}명</small></span><span class="chevron">›</span>
      </button></div></div>`;
    }
    return `<div class="org-group"><h2>${escapeHtml(group.major)}</h2><div class="organization-list">${rows}</div></div>`;
  }).join("");

  el.contentView.innerHTML = `
    ${breadcrumbsHtml([{ label: "처음으로", view: "home" }])}
    <div class="page-heading"><h1>${escapeHtml(category.label)}</h1><p>시트1 기준의 소속 순서로 표시됩니다.</p></div>
    ${groupsHtml || renderEmptyHtml("표시할 소속이 없습니다.")}`;

  el.contentView.querySelectorAll("[data-org-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = { type: "organization", categoryId, orgIndex: Number(button.dataset.orgIndex) };
      renderContent();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  bindBreadcrumbs();
}

function renderOrganization(categoryId, orgIndex) {
  const category = state.categories.find((item) => item.id === categoryId);
  const org = category?.organizations?.[orgIndex];
  if (!category || !org) { state.currentView = { type: "home" }; renderHome(); return; }
  const title = org.minor || org.major || category.label;
  const path = [org.major, org.minor].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(" / ");
  const peopleHtml = org.people.map((person) => personCardHtml(person)).join("");
  el.contentView.innerHTML = `
    ${breadcrumbsHtml([
      { label: "처음으로", view: "home" },
      { label: category.label, view: "category", categoryId },
    ])}
    <div class="page-heading"><h1>${escapeHtml(title)}</h1>${path && path !== title ? `<p>${escapeHtml(path)}</p>` : ""}</div>
    <div class="people-list">${peopleHtml || renderEmptyHtml("표시할 연락처가 없습니다.")}</div>`;
  bindBreadcrumbs();
}

function personCardHtml(person) {
  const job = String(person.job || formatJob(person.title, person.role));
  const lines = [];
  if (person.extension) lines.push(phoneLineHtml("내선번호", person.extension));
  if (person.mobile) lines.push(phoneLineHtml("개인번호", person.mobile));
  return `<article class="person-card">
    <div class="person-card-header"><span class="person-name">${escapeHtml(person.name || "이름 없음")}</span>${job ? `<span class="person-job">${escapeHtml(job)}</span>` : ""}</div>
    <div class="phone-lines">${lines.join("")}</div>
  </article>`;
}

function phoneLineHtml(label, number) {
  return `<div class="phone-line"><span>${escapeHtml(label)}</span><a href="tel:${escapeAttr(telHref(number))}">${escapeHtml(number)}</a></div>`;
}

function renderSearchResults() {
  const tokens = tokenize(state.searchQuery);
  const results = state.people.filter((person) => personMatchesTokens(person, tokens));
  const cards = results.map(searchPersonCardHtml).join("");
  el.contentView.innerHTML = `
    <div class="page-heading"><h1>검색 결과</h1><p>${results.length}명 · 여러 소속을 가진 사람은 한 카드에 함께 표시됩니다.</p></div>
    <div class="people-list">${cards || renderEmptyHtml("검색 결과가 없습니다.", "이름, 소속 또는 번호를 다른 방식으로 입력해 보세요.")}</div>`;
}

function searchPersonCardHtml(person) {
  const uniqueMobiles = unique(person.affiliations.map((a) => a.mobile).filter(Boolean));
  const commonMobile = uniqueMobiles.length === 1 ? uniqueMobiles[0] : "";
  const affiliationHtml = person.affiliations.map((a) => {
    const orgPath = affiliationPath(a);
    const phones = [];
    if (a.extension) phones.push(`<a href="tel:${escapeAttr(telHref(a.extension))}">내선 ${escapeHtml(a.extension)}</a>`);
    if (a.mobile && a.mobile !== commonMobile) phones.push(`<a href="tel:${escapeAttr(telHref(a.mobile))}">개인 ${escapeHtml(a.mobile)}</a>`);
    return `<div class="affiliation-item">
      <div class="affiliation-title"><strong>${escapeHtml(orgPath || a.categoryLabel)}</strong>${a.job ? `<span>${escapeHtml(a.job)}</span>` : ""}</div>
      ${phones.length ? `<div class="affiliation-phones">${phones.join("")}</div>` : ""}
    </div>`;
  }).join("");
  return `<article class="person-card search-result-card">
    <div class="person-card-header"><span class="person-name">${escapeHtml(person.name || "이름 없음")}</span></div>
    <div class="affiliation-stack">${affiliationHtml}</div>
    ${commonMobile ? `<div class="phone-line common-mobile"><span>개인번호</span><a href="tel:${escapeAttr(telHref(commonMobile))}">${escapeHtml(commonMobile)}</a></div>` : ""}
  </article>`;
}

function personMatchesTokens(person, tokens) {
  if (!tokens.length) return true;
  const textParts = [person.name];
  person.affiliations.forEach((a) => textParts.push(a.categoryLabel, a.major, a.minor, a.title, a.role, a.job, a.extension, a.mobile));
  const haystack = normalizeText(textParts.filter(Boolean).join(" "));
  const digits = textParts.filter(Boolean).join(" ").replace(/\D/g, "");
  return tokens.every((token) => {
    const normalized = normalizeText(token);
    const tokenDigits = token.replace(/\D/g, "");
    return haystack.includes(normalized) || (tokenDigits.length >= 2 && digits.includes(tokenDigits));
  });
}

function breadcrumbsHtml(items) {
  return `<nav class="breadcrumbs">${items.map((item, index) => `${index ? "<span>›</span>" : ""}<button type="button" data-breadcrumb='${escapeAttr(JSON.stringify(item))}'>${escapeHtml(item.label)}</button>`).join("")}</nav>`;
}

function bindBreadcrumbs() {
  el.contentView.querySelectorAll("[data-breadcrumb]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = JSON.parse(button.dataset.breadcrumb);
      if (item.view === "category") state.currentView = { type: "category", categoryId: item.categoryId };
      else state.currentView = { type: "home" };
      renderContent();
    });
  });
}

function renderEmptyHtml(title, text = "") {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong>${text ? `<span>${escapeHtml(text)}</span>` : ""}</div>`;
}

function handleMenuAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  closeOverflowMenu();
  const action = button.dataset.action;
  if (action === "data-info") showDataInfo();
  else if (action === "replace-data") openFilePicker();
  else if (action === "contact-export") enterContactExport();
  else if (action === "install-app") handleInstallRequest();
  else if (action === "theme") showThemeChooser();
  else if (action === "lock") lockApp();
}


function initializeTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  state.themePreference = ["light", "dark"].includes(saved) ? saved : "system";
  applyTheme(state.themePreference, false);
}

function applyTheme(mode, persist = true) {
  const normalized = ["light", "dark"].includes(mode) ? mode : "system";
  state.themePreference = normalized;
  document.documentElement.dataset.theme = normalized;
  if (persist) localStorage.setItem(THEME_STORAGE_KEY, normalized);
  updateThemeMenuLabel();
  updateThemeMetaColor();
}

function updateThemeMenuLabel() {
  if (!el.themeMenuButton) return;
  const label = state.themePreference === "light" ? "라이트" : state.themePreference === "dark" ? "다크" : "시스템";
  el.themeMenuButton.textContent = `화면 모드 · ${label}`;
}

function resolvedTheme() {
  if (state.themePreference === "light" || state.themePreference === "dark") return state.themePreference;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function updateThemeMetaColor() {
  if (!el.themeColorMeta) return;
  el.themeColorMeta.setAttribute("content", resolvedTheme() === "dark" ? "#111317" : "#efe6d7");
}

function showThemeChooser() {
  const current = state.themePreference;
  const option = (value, title, description) => `
    <button class="theme-choice${current === value ? " selected" : ""}" type="button" data-theme-choice="${value}">
      <span class="theme-choice-radio" aria-hidden="true"></span>
      <span><strong>${title}</strong><small>${description}</small></span>
    </button>`;
  showModal({
    title: "화면 모드",
    body: `<div class="theme-choice-list">
      ${option("system", "시스템 설정", "기기의 라이트/다크 모드를 자동으로 따릅니다.")}
      ${option("light", "라이트", "따뜻한 베이지와 은은한 종이 질감의 밝은 화면입니다.")}
      ${option("dark", "다크", "어두운 환경에 맞춘 화면입니다.")}
    </div>`,
    actions: [{ label: "닫기", onClick: closeModal }],
  });
  el.modalBody.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.themeChoice);
      closeModal();
    });
  });
}

function isStandaloneMode() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isIosLike() {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function handleInstallRequest() {
  if (isStandaloneMode()) {
    showModal({
      title: "바로가기 추가",
      body: `<p>Dials가 이미 홈 화면 또는 앱 모드로 실행되고 있습니다.</p>`,
      actions: [{ label: "확인", primary: true, onClick: closeModal }],
    });
    return;
  }

  if (state.deferredInstallPrompt) {
    const promptEvent = state.deferredInstallPrompt;
    state.deferredInstallPrompt = null;
    await promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result?.outcome === "accepted") return;
  }

  const body = isIosLike()
    ? `<div class="install-guide"><strong>iPhone / iPad</strong><ol><li>Safari의 <b>공유</b> 버튼을 누릅니다.</li><li><b>홈 화면에 추가</b>를 선택합니다.</li><li>추가하면 Dials를 앱처럼 바로 열 수 있습니다.</li></ol></div>`
    : `<div class="install-guide"><strong>브라우저에서 바로가기 추가</strong><p>브라우저 메뉴에서 <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 선택해 주세요. 지원되는 Chrome/Edge에서는 설치 조건이 충족되면 브라우저의 설치 안내도 사용할 수 있습니다.</p></div>`;
  showModal({
    title: "바로가기 추가",
    body,
    actions: [{ label: "확인", primary: true, onClick: closeModal }],
  });
}

function closeOverflowMenu() {
  el.overflowMenu.classList.add("hidden");
  el.menuButton.setAttribute("aria-expanded", "false");
}

function lockApp() {
  // 복호화된 payload와 암호를 브라우저 메모리에서 가장 확실하게 내려놓기 위해 새로고침합니다.
  window.location.reload();
}

async function loadLatestStatus() {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(LATEST_STATUS_STORAGE_KEY) || "null"); } catch { cached = null; }
  state.latestStatus = cached;
  try {
    const response = await fetch(`./data-status.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const status = await response.json();
    if (status && typeof status.latestDataVersion === "string") {
      state.latestStatus = status;
      localStorage.setItem(LATEST_STATUS_STORAGE_KEY, JSON.stringify(status));
    }
  } catch {
    // 오프라인에서는 마지막으로 확인한 공개 상태값을 사용합니다.
  }
}

function hasNewerData(currentVersion) {
  const current = String(currentVersion || "");
  const latest = String(state.latestStatus?.latestDataVersion || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(current) || !/^\d{4}-\d{2}-\d{2}$/.test(latest)) return false;
  return latest > current;
}

function updateUpdateIndicator() {
  el.updateIndicator.classList.toggle("hidden", !hasNewerData(state.payload?.dataVersion));
}

function showUpdateNotice() {
  if (!hasNewerData(state.payload?.dataVersion)) return;
  const current = formatDate(state.payload?.dataVersion);
  const latest = formatDate(state.latestStatus?.latestDataVersion);
  const message = String(state.latestStatus?.message || "새 전화번호부 데이터가 배포되었습니다.");
  showModal({
    title: "새 전화번호부 데이터",
    body: `<div class="update-callout"><strong>새 데이터가 있습니다.</strong>${escapeHtml(message)}</div>
      <dl class="info-grid" style="margin-top:16px"><dt>현재 기준일</dt><dd>${escapeHtml(current)}</dd><dt>최신 기준일</dt><dd>${escapeHtml(latest)}</dd></dl>
      <p class="muted">새로 배포받은 <code>.dials</code> 파일을 불러오면 현재 데이터가 교체됩니다.</p>`,
    actions: [
      { label: "나중에", onClick: closeModal },
      { label: "새 데이터 불러오기", primary: true, onClick: () => { closeModal(); openFilePicker(); } },
    ],
  });
}

function showDataInfo() {
  const current = formatDate(state.payload?.dataVersion) || "알 수 없음";
  const latestRaw = state.latestStatus?.latestDataVersion || "";
  const latest = latestRaw ? formatDate(latestRaw) : "확인할 수 없음";
  const isOld = hasNewerData(state.payload?.dataVersion);
  showModal({
    title: "전화번호부 데이터",
    body: `${isOld ? `<div class="update-callout"><strong>새 전화번호부 데이터가 있습니다.</strong>${escapeHtml(state.latestStatus?.message || "새 데이터 파일로 교체해 주세요.")}</div>` : ""}
      <dl class="info-grid" style="margin-top:${isOld ? 16 : 0}px">
        <dt>현재 기준일</dt><dd>${escapeHtml(current)}</dd>
        <dt>최신 기준일</dt><dd>${escapeHtml(latest)}</dd>
        <dt>기준월</dt><dd>${escapeHtml(state.payload?.period || "-")}</dd>
        <dt>데이터 생성</dt><dd>${escapeHtml(formatDateTime(state.payload?.generatedAt) || "-")}</dd>
        <dt>연결 파일</dt><dd>${escapeHtml(state.safeMeta?.fileName || "Dials 데이터")}</dd>
        <dt>웹앱</dt><dd>Dials ${APP_VERSION}</dd>
      </dl>`,
    actions: [
      { label: "닫기", onClick: closeModal },
      { label: "새 데이터 불러오기", primary: true, onClick: () => { closeModal(); openFilePicker(); } },
    ],
  });
}

function enterContactExport() {
  state.selectedPeople.clear();
  state.contactFilter = "";
  el.contactSearchInput.value = "";
  el.mainView.classList.add("hidden");
  el.contactExportView.classList.remove("hidden");
  restorePrefixSettings();
  renderContactPeople();
  setVcardMessage("");
  window.scrollTo({ top: 0 });
}

function leaveContactExport() {
  el.contactExportView.classList.add("hidden");
  el.mainView.classList.remove("hidden");
  window.scrollTo({ top: 0 });
}

function filteredContactPeople() {
  const tokens = tokenize(state.contactFilter);
  if (!tokens.length) return state.people;
  return state.people.filter((person) => personMatchesTokens(person, tokens));
}

function renderContactPeople() {
  const people = filteredContactPeople();
  el.contactPeopleList.innerHTML = people.map((person) => {
    const selected = state.selectedPeople.has(person.key);
    const affiliationText = summarizeAffiliations(person);
    return `<label class="contact-person-row">
      <input type="checkbox" value="${escapeAttr(person.key)}" ${selected ? "checked" : ""}>
      <span><strong>${escapeHtml(person.name || "이름 없음")}</strong><small>${escapeHtml(affiliationText || "소속 정보 없음")}</small></span>
    </label>`;
  }).join("") || renderEmptyHtml("검색 결과가 없습니다.");
  updateSelectedCount();
}

function handleContactSelectionChange(event) {
  const checkbox = event.target.closest('input[type="checkbox"]');
  if (!checkbox) return;
  if (checkbox.checked) state.selectedPeople.add(checkbox.value);
  else state.selectedPeople.delete(checkbox.value);
  updateSelectedCount();
}

function selectFilteredPeople() {
  filteredContactPeople().forEach((person) => state.selectedPeople.add(person.key));
  renderContactPeople();
}

function updateSelectedCount() {
  el.selectedPeopleCount.textContent = `${state.selectedPeople.size}명 선택`;
}

function summarizeAffiliations(person) {
  const paths = unique(person.affiliations.map(affiliationPath).filter(Boolean));
  if (paths.length <= 2) return paths.join(" · ");
  return `${paths[0]} · ${paths[1]} 외 ${paths.length - 2}개 소속`;
}

function restorePrefixSettings() {
  const savedPrefix = localStorage.getItem(PREFIX_STORAGE_KEY) || "";
  const enabled = localStorage.getItem(PREFIX_ENABLED_STORAGE_KEY) === "true";
  el.namePrefixInput.value = savedPrefix;
  el.prefixEnabledOption.checked = enabled;
  updatePrefixControls();
}

function updatePrefixControls() {
  const enabled = el.prefixEnabledOption.checked;
  el.namePrefixInput.disabled = !enabled;
  const prefix = el.namePrefixInput.value;
  el.prefixPreview.textContent = `미리보기: ${applyNamePrefix("홍길동", enabled ? prefix : "")}`;
  localStorage.setItem(PREFIX_STORAGE_KEY, prefix);
  localStorage.setItem(PREFIX_ENABLED_STORAGE_KEY, String(enabled));
}

function applyNamePrefix(name, prefix) {
  const cleanPrefix = String(prefix || "");
  if (!cleanPrefix) return name;
  return /\s$/.test(cleanPrefix) ? `${cleanPrefix}${name}` : `${cleanPrefix} ${name}`;
}

function createVcardFile() {
  const selected = state.people.filter((person) => state.selectedPeople.has(person.key));
  if (!selected.length) {
    setVcardMessage("저장할 사람을 한 명 이상 선택해 주세요.", true);
    return;
  }
  const options = {
    mobile: el.includeMobileOption.checked,
    extension: el.includeExtensionOption.checked,
    affiliation: el.includeAffiliationOption.checked,
    job: el.includeJobOption.checked,
    prefix: el.prefixEnabledOption.checked ? el.namePrefixInput.value : "",
  };
  const cards = selected.map((person) => makeVcard(person, options)).join("\r\n");
  const blob = new Blob(["\ufeff", cards], { type: "text/vcard;charset=utf-8" });
  const filename = `Dials_Contacts_${state.payload?.dataVersion || todayIso()}.vcf`;
  downloadBlob(blob, filename);
  setVcardMessage(`${selected.length}명의 연락처 파일을 만들었습니다. 기기의 연락처 앱에서 가져와 주세요.`, false, true);
}

function makeVcard(person, options) {
  const displayName = applyNamePrefix(person.name || "이름 없음", options.prefix);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardEscape(displayName)}`,
    `N:;${vcardEscape(displayName)};;;`,
  ];

  const mobiles = options.mobile ? unique(person.affiliations.map((a) => a.mobile).filter(Boolean)) : [];
  const extensions = options.extension ? unique(person.affiliations.map((a) => a.extension).filter(Boolean)) : [];
  extensions.forEach((number) => lines.push(`TEL;TYPE=WORK:${vcardEscape(number)}`));
  mobiles.forEach((number) => lines.push(`TEL;TYPE=CELL:${vcardEscape(number)}`));

  const first = person.affiliations[0];
  if (options.affiliation && first) {
    const organization = organizationName();
    const department = affiliationPath(first);
    if (organization || department) lines.push(`ORG:${vcardEscape(organization)};${vcardEscape(department)}`);
  }
  if (options.job && first?.job) lines.push(`TITLE:${vcardEscape(first.job)}`);

  const noteLines = ["Dials", `데이터 기준일: ${state.payload?.dataVersion || "알 수 없음"}`];
  if (options.affiliation) {
    noteLines.push("", "소속:");
    person.affiliations.forEach((a) => {
      const path = affiliationPath(a) || a.categoryLabel || "소속 없음";
      const job = options.job && a.job ? ` — ${a.job}` : "";
      noteLines.push(`- ${path}${job}`);
    });
  } else if (options.job) {
    const jobs = unique(person.affiliations.map((a) => a.job).filter(Boolean));
    if (jobs.length) noteLines.push("", `직책/역할: ${jobs.join(" / ")}`);
  }
  lines.push(`NOTE:${vcardEscape(noteLines.join("\n"))}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function organizationName() {
  const title = String(state.payload?.title || "").trim();
  return title.replace(/\s*전화번호부\s*$/, "").trim();
}

function vcardEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function setVcardMessage(message, isError = false, isSuccess = false) {
  el.vcardMessage.textContent = message;
  el.vcardMessage.className = `form-message${isError ? " error" : ""}${isSuccess ? " success" : ""}`;
}

function showModal({ title, body, actions = [] }) {
  el.modalTitle.textContent = title;
  el.modalBody.innerHTML = body;
  el.modalActions.innerHTML = "";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.primary ? "primary-button" : "secondary-button";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    el.modalActions.appendChild(button);
  });
  el.modalBackdrop.classList.remove("hidden");
  el.modalBackdrop.setAttribute("aria-hidden", "false");
  window.setTimeout(() => el.modalCloseButton.focus(), 10);
}

function closeModal() {
  el.modalBackdrop.classList.add("hidden");
  el.modalBackdrop.setAttribute("aria-hidden", "true");
}

function setUnlockMessage(message, isError = false, isSuccess = false) {
  el.unlockMessage.textContent = message;
  el.unlockMessage.className = `form-message${isError ? " error" : ""}${isSuccess ? " success" : ""}`;
}

function affiliationPath(a) {
  return unique([String(a.major || "").trim(), String(a.minor || "").trim()].filter(Boolean)).join(" / ");
}

function formatJob(title, role) {
  const t = String(title || "").trim();
  const r = String(role || "").trim();
  if (t && r) return `${t}(${r})`;
  return t || r;
}

function tokenize(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean);
}

function normalizeText(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
}

function normalizePhoneKey(value) {
  return String(value || "").replace(/\D/g, "");
}

function telHref(number) {
  return String(number || "").replace(/[^\d+]/g, "");
}

function unique(values) {
  return [...new Set(values)];
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function formatDate(value) {
  const text = String(value || "");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? `${match[1]}. ${match[2]}. ${match[3]}.` : text;
}

function formatDateTime(value) {
  const text = String(value || "");
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function requestPersistentStorage() {
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(key) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

async function dbSet(key, value) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => console.warn("Service worker registration failed", error));
  }
}

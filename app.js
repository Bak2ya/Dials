"use strict";

const APP_VERSION = "0.7.4";
const DIALS_SCHEMA_VERSION = "1.4";
const DIALS_PAYLOAD_FIELDS = Object.freeze(["schemaVersion", "dataVersion", "generatedAt", "period", "title", "categories"]);
const DIALS_CATEGORY_FIELDS = Object.freeze(["id", "label", "organizations"]);
const DIALS_ORGANIZATION_FIELDS = Object.freeze(["major", "minor", "people"]);
const DIALS_RECORD_FIELDS = Object.freeze(["personKey", "name", "title", "duty", "recordType", "extension", "mobile", "externalNumber"]);
const DB_NAME = "DialsLocalStore";
const DB_VERSION = 1;
const STORE_NAME = "app";
const DATA_RECORD_KEY = "encryptedData";
const SAFE_META_KEY = "safeMeta";
const PREFIX_STORAGE_KEY = "dialsContactPrefix";
const PREFIX_ENABLED_STORAGE_KEY = "dialsContactPrefixEnabled";
const SUFFIX_STORAGE_KEY = "dialsContactSuffix";
const SUFFIX_ENABLED_STORAGE_KEY = "dialsContactSuffixEnabled";
const THEME_STORAGE_KEY = "dialsThemePreference";
const HISTORY_STATE_KEY = "dialsRoute";
const AUTO_LOCK_MS = 10 * 60 * 1000;
const AUTO_LOCK_NOTICE_KEY = "dialsAutoLockNotice";
const UNLOCK_FAILURE_KEY_PREFIX = "unlockFailure:";
const UNLOCK_BACKOFF_SECONDS = new Map([[4, 10], [5, 30], [6, 60], [7, 300]]);
const UNLOCK_BACKOFF_MAX_SECONDS = 900;

const state = {
  encryptedText: "",
  encryptedPackage: null,
  safeMeta: null,
  payload: null,
  people: [],
  categories: [],
  currentView: { type: "home" },
  searchQuery: "",
  searchComposing: false,
  contactSearchComposing: false,
  globalSearchDebounceTimer: null,
  contactSearchDebounceTimer: null,
  selectedPeople: new Set(),
  representativeAffiliations: new Map(),
  contactFilter: "",
  contactView: { type: "home" },
  contactDepth: 0,
  contactExpanded: new Set(),
  contactAnimateKey: "",
  browseExpanded: new Set(),
  browseAnimateKey: "",
  deferredInstallPrompt: null,
  themePreference: "system",
  modalReturnFocus: null,
  scrollSaveTimer: null,
  unlockStartedAt: 0,
  autoLockTimer: null,
  connectionNeedsCommit: false,
  packageFingerprint: "",
  unlockFailureCount: 0,
  unlockDelayUntil: 0,
  unlockDelayTimer: null,
  unlockInProgress: false,
};

const el = {};

window.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  el.startVersion.textContent = `v${APP_VERSION}`;
  bindEvents();
  registerServiceWorker();
  initializeTheme();
  try { localStorage.removeItem("dialsLatestStatus"); } catch {}

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
      state.packageFingerprint = await fingerprintEncryptedPackage(state.encryptedPackage);
      await restoreUnlockFailureState();
      state.safeMeta = meta || null;
      state.connectionNeedsCommit = false;
      showStartState("locked");
      updateStartMeta();
      showAutoLockNoticeIfNeeded();
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
    "dataFileInput", "unlockForm", "passwordInput", "passwordVisibilityButton", "unlockButton", "unlockMessage",
    "connectedFileName", "connectedMetaText", "directoryTitle", "dataDateLabel",
    "menuButton", "overflowMenu", "homeBrandButton", "globalSearchInput",
    "clearSearchButton", "contentView", "contactBackButton", "contactSearchInput",
    "selectedPeopleCount", "contactBrowseView",
    "includeMobileOption", "includeExtensionOption", "includeOrganizationOption", "organizationOptionName",
    "noteDataDateOption", "noteAffiliationsOption", "noteTitleDutyOption",
    "prefixEnabledOption", "namePrefixInput", "suffixEnabledOption", "nameSuffixInput", "namePreview", "createVcardButton", "vcardMessage",
    "modalBackdrop", "modalPanel", "modalTitle", "modalBody", "modalActions", "modalCloseButton",
    "themeMenuButton", "themeColorMeta", "startVersion",
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
  window.addEventListener("popstate", handleHistoryNavigation);
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.addEventListener("scroll", scheduleHistoryScrollSave, { passive: true });
  window.addEventListener("focus", checkAutoLock);
  window.addEventListener("pageshow", checkAutoLock);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkAutoLock();
  });
  el.connectDataButton.addEventListener("click", openFilePicker);
  el.replaceDataStartButton.addEventListener("click", openFilePicker);
  el.dataFileInput.addEventListener("change", handleDataFileSelection);
  el.unlockForm.addEventListener("submit", handleUnlock);
  el.passwordVisibilityButton.addEventListener("click", togglePasswordVisibility);

  el.homeBrandButton.addEventListener("click", () => {
    navigateToView({ type: "home" });
  });

  el.globalSearchInput.addEventListener("focus", prepareGlobalSearchHistory);
  el.globalSearchInput.addEventListener("compositionstart", () => {
    state.searchComposing = true;
    cancelGlobalSearchCommit();
  });
  el.globalSearchInput.addEventListener("compositionend", () => {
    state.searchComposing = false;
    scheduleGlobalSearchCommit(120);
  });
  el.globalSearchInput.addEventListener("input", (event) => {
    if (state.searchComposing || event.isComposing || event.inputType === "insertCompositionText") return;
    scheduleGlobalSearchCommit();
  });
  el.globalSearchInput.addEventListener("blur", () => {
    window.setTimeout(syncGlobalSearchHistoryState, 0);
  });
  el.clearSearchButton.addEventListener("click", clearGlobalSearch);

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
  window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change", () => {
    if (state.themePreference === "system") updateThemeMetaColor();
  });

  el.contactBackButton.addEventListener("click", leaveContactExport);
  el.contactSearchInput.addEventListener("compositionstart", () => {
    state.contactSearchComposing = true;
    cancelContactSearchCommit();
  });
  el.contactSearchInput.addEventListener("compositionend", () => {
    state.contactSearchComposing = false;
    scheduleContactSearchCommit(120);
  });
  el.contactSearchInput.addEventListener("input", (event) => {
    if (state.contactSearchComposing || event.isComposing || event.inputType === "insertCompositionText") return;
    scheduleContactSearchCommit();
  });
  el.contactBrowseView.addEventListener("change", handleContactSelectionChange);
  el.contactBrowseView.addEventListener("click", handleContactBrowseClick);
  el.contentView.addEventListener("click", handleBrowseTreeClick);
  el.prefixEnabledOption.addEventListener("change", updateNameDecorationControls);
  el.namePrefixInput.addEventListener("input", updateNameDecorationControls);
  el.suffixEnabledOption.addEventListener("change", updateNameDecorationControls);
  el.nameSuffixInput.addEventListener("input", updateNameDecorationControls);
  el.createVcardButton.addEventListener("click", createVcardFile);

  el.modalCloseButton.addEventListener("click", closeModal);
  el.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === el.modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOverflowMenu();
      closeModal();
      return;
    }
    if (event.key === "Tab" && !el.modalBackdrop.classList.contains("hidden")) {
      trapModalFocus(event);
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
    setBadge("연결됨", "connected");
    el.passwordInput.value = "";
    setPasswordVisible(false);
    syncUnlockDelayUI();
    if (!isUnlockDelayed()) window.setTimeout(() => el.passwordInput.focus(), 20);
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
  const dataVersion = String(state.safeMeta?.dataVersion || "");
  el.connectedMetaText.textContent = dataVersion ? `${formatDate(dataVersion)} 기준` : "암호 입력 후 기준일을 확인할 수 있습니다.";
  el.connectedMetaText.classList.toggle("placeholder", !dataVersion);
}

function showAutoLockNoticeIfNeeded() {
  if (isUnlockDelayed()) return;
  try {
    if (sessionStorage.getItem(AUTO_LOCK_NOTICE_KEY) !== "1") return;
    sessionStorage.removeItem(AUTO_LOCK_NOTICE_KEY);
    setUnlockMessage("개인정보 보호를 위해 10분이 지나 자동으로 잠겼습니다.", false);
  } catch {}
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
    // 새 파일은 암호 확인이 끝날 때까지 메모리에만 보관합니다.
    // 기존에 저장된 암호화 파일은 새 파일이 정상적으로 열린 뒤에만 교체됩니다.
    state.encryptedText = text;
    state.encryptedPackage = packageData;
    state.packageFingerprint = await fingerprintEncryptedPackage(packageData);
    await restoreUnlockFailureState();
    state.safeMeta = { fileName: file.name, dataVersion: "", generatedAt: "", title: "" };
    state.connectionNeedsCommit = true;
    showStartState("locked");
    updateStartMeta();
    if (!isUnlockDelayed()) setUnlockMessage("데이터를 선택했습니다. 암호를 입력해 확인해 주세요.", false, true);
  } catch (error) {
    console.error(error);
    showModal({
      title: "데이터를 불러올 수 없습니다",
      body: `<p>${escapeHtml(error.message || "지원하지 않는 Dials 데이터 파일입니다.")}</p>`,
      actions: [{ label: "확인", primary: true, onClick: closeModal }],
    });
  }
}

function beginDataReplacement() {
  clearAutoLockTimer();
  cancelGlobalSearchCommit();
  cancelContactSearchCommit();
  closeOverflowMenu();
  closeModal();
  document.activeElement instanceof HTMLElement && document.activeElement.blur();
  state.payload = null;
  state.people = [];
  state.categories = [];
  state.selectedPeople.clear();
  state.representativeAffiliations.clear();
  state.searchQuery = "";
  state.contactFilter = "";
  state.currentView = { type: "home" };
  state.contactView = { type: "home" };
  state.contactDepth = 0;
  state.contactExpanded.clear();
  state.browseExpanded.clear();
  state.unlockStartedAt = 0;
  state.encryptedText = "";
  state.encryptedPackage = null;
  state.safeMeta = null;
  state.connectionNeedsCommit = false;
  state.packageFingerprint = "";
  state.unlockFailureCount = 0;
  state.unlockDelayUntil = 0;
  clearUnlockDelayTimer();
  state.unlockInProgress = false;
  el.passwordInput.value = "";
  setPasswordVisible(false);
  setUnlockMessage("", false);
  showStartState("empty");
  history.replaceState(null, "", window.location.href);
  window.scrollTo({ top: 0, behavior: "auto" });
}

async function settleAfterPasswordInput() {
  const viewport = window.visualViewport;
  const beforeHeight = viewport?.height || 0;
  const keyboardWasLikelyOpen = Boolean(viewport && window.innerHeight - beforeHeight > 80);
  el.passwordInput.blur();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  await nextAnimationFrame();
  await nextAnimationFrame();
  if (!keyboardWasLikelyOpen || !viewport) return;
  if (viewport.height >= window.innerHeight - 40) return;
  await new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      viewport.removeEventListener("resize", onResize);
      window.clearTimeout(timeout);
      resolve();
    };
    const onResize = () => {
      if (viewport.height >= beforeHeight + 40 || viewport.height >= window.innerHeight - 40) finish();
    };
    const timeout = window.setTimeout(finish, 360);
    viewport.addEventListener("resize", onResize, { passive: true });
  });
  await nextAnimationFrame();
}

function nextAnimationFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function setPasswordVisible(visible) {
  const shouldShow = Boolean(visible);
  el.passwordInput.type = shouldShow ? "text" : "password";
  el.passwordVisibilityButton.setAttribute("aria-pressed", String(shouldShow));
  el.passwordVisibilityButton.setAttribute("aria-label", shouldShow ? "암호 숨기기" : "암호 표시");
  el.passwordVisibilityButton.querySelector('[data-password-icon="show"]')?.classList.toggle("hidden", shouldShow);
  el.passwordVisibilityButton.querySelector('[data-password-icon="hide"]')?.classList.toggle("hidden", !shouldShow);
}

function togglePasswordVisibility() {
  if (el.passwordVisibilityButton.disabled) return;
  const start = el.passwordInput.selectionStart;
  const end = el.passwordInput.selectionEnd;
  const nextVisible = el.passwordInput.type === "password";
  setPasswordVisible(nextVisible);
  el.passwordInput.focus({ preventScroll: true });
  if (Number.isInteger(start) && Number.isInteger(end)) {
    try { el.passwordInput.setSelectionRange(start, end); } catch {}
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

async function fingerprintEncryptedPackage(packageData) {
  const canonical = JSON.stringify([
    String(packageData.format || ""),
    Number(packageData.formatVersion || 0),
    String(packageData.kdf?.name || ""),
    String(packageData.kdf?.salt || ""),
    Number(packageData.kdf?.iterations || 0),
    String(packageData.cipher?.name || ""),
    String(packageData.cipher?.nonce || ""),
    String(packageData.cipher?.ciphertext || ""),
  ]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unlockFailureStorageKey() {
  return state.packageFingerprint ? `${UNLOCK_FAILURE_KEY_PREFIX}${state.packageFingerprint}` : "";
}

async function restoreUnlockFailureState() {
  clearUnlockDelayTimer();
  state.unlockFailureCount = 0;
  state.unlockDelayUntil = 0;
  const key = unlockFailureStorageKey();
  if (!key) return;
  try {
    const saved = await dbGet(key);
    if (!saved || typeof saved !== "object") return;
    state.unlockFailureCount = Math.max(0, Number(saved.failures) || 0);
    state.unlockDelayUntil = Math.max(0, Number(saved.retryAt) || 0);
    if (state.unlockDelayUntil <= Date.now()) state.unlockDelayUntil = 0;
  } catch (error) {
    console.warn("Failed to restore unlock backoff state", error);
  }
}

function backoffSecondsForFailure(failureCount) {
  if (UNLOCK_BACKOFF_SECONDS.has(failureCount)) return UNLOCK_BACKOFF_SECONDS.get(failureCount);
  return failureCount >= 8 ? UNLOCK_BACKOFF_MAX_SECONDS : 0;
}

async function registerUnlockFailure() {
  state.unlockFailureCount += 1;
  const delaySeconds = backoffSecondsForFailure(state.unlockFailureCount);
  state.unlockDelayUntil = delaySeconds ? Date.now() + delaySeconds * 1000 : 0;
  const key = unlockFailureStorageKey();
  if (key) {
    try {
      await dbSet(key, {
        failures: state.unlockFailureCount,
        retryAt: state.unlockDelayUntil,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.warn("Failed to persist unlock backoff state", error);
    }
  }
  return delaySeconds;
}

async function clearUnlockFailureState() {
  const key = unlockFailureStorageKey();
  state.unlockFailureCount = 0;
  state.unlockDelayUntil = 0;
  clearUnlockDelayTimer();
  if (!key) return;
  try { await dbDelete(key); } catch (error) { console.warn("Failed to clear unlock backoff state", error); }
}

function isUnlockDelayed() {
  return state.unlockDelayUntil > Date.now();
}

function unlockDelaySecondsRemaining() {
  return Math.max(0, Math.ceil((state.unlockDelayUntil - Date.now()) / 1000));
}

function clearUnlockDelayTimer() {
  if (!state.unlockDelayTimer) return;
  window.clearTimeout(state.unlockDelayTimer);
  state.unlockDelayTimer = null;
}

function scheduleUnlockDelayTick() {
  clearUnlockDelayTimer();
  if (!isUnlockDelayed()) return;
  state.unlockDelayTimer = window.setTimeout(() => {
    if (isUnlockDelayed()) {
      syncUnlockDelayUI();
      scheduleUnlockDelayTick();
      return;
    }
    state.unlockDelayUntil = 0;
    syncUnlockDelayUI();
    setUnlockMessage("다시 암호를 입력할 수 있습니다.", false);
    if (!el.startView.classList.contains("hidden")) el.passwordInput.focus();
  }, 250);
}

function syncUnlockDelayUI() {
  const delayed = isUnlockDelayed();
  const disabled = delayed || state.unlockInProgress;
  el.passwordInput.disabled = disabled;
  el.passwordVisibilityButton.disabled = disabled;
  el.unlockButton.disabled = disabled;
  if (delayed) {
    const seconds = unlockDelaySecondsRemaining();
    setUnlockMessage(`암호 입력이 여러 번 실패했습니다. ${seconds}초 후 다시 시도할 수 있습니다.`, true);
    scheduleUnlockDelayTick();
    return;
  }
  clearUnlockDelayTimer();
  if (!state.unlockInProgress && el.startView && !el.startView.classList.contains("hidden") && state.encryptedPackage) {
    // Delay expiry only restores input availability. Existing non-delay guidance may be replaced by the next action.
  }
}

async function handleUnlock(event) {
  event.preventDefault();
  if (isUnlockDelayed()) {
    syncUnlockDelayUI();
    return;
  }
  const password = el.passwordInput.value;
  if (!password) {
    setUnlockMessage("데이터 암호를 입력해 주세요.", true);
    return;
  }

  state.unlockInProgress = true;
  syncUnlockDelayUI();
  setUnlockMessage("암호화 데이터를 여는 중입니다…", false);

  let payload;
  try {
    payload = await decryptDialsPackage(state.encryptedPackage, password);
  } catch (error) {
    console.warn("Dials package decryption failed", error);
    state.unlockInProgress = false;
    const delaySeconds = await registerUnlockFailure();
    if (delaySeconds > 0) {
      syncUnlockDelayUI();
    } else if (state.unlockFailureCount === 3) {
      setUnlockMessage("암호가 올바르지 않습니다. 다음 실패 시 10초 후 다시 시도할 수 있습니다.", true);
      syncUnlockDelayUI();
    } else {
      setUnlockMessage("암호가 올바르지 않습니다.", true);
      syncUnlockDelayUI();
    }
    return;
  }

  try {
    validatePayload(payload);
  } catch (error) {
    console.error(error);
    await clearUnlockFailureState();
    state.unlockInProgress = false;
    syncUnlockDelayUI();
    setUnlockMessage(error.message || "전화번호부 데이터 내용이 올바르지 않습니다.", true);
    return;
  }

  try {
    await clearUnlockFailureState();
    // 실제 모바일에서는 성공 판정 직후부터 소프트 키보드를 닫기 시작해
    // 메인 화면의 첫 터치가 키보드/visualViewport 정리에 소비되지 않게 합니다.
    await settleAfterPasswordInput();
    state.payload = payload;
    prepareDirectoryData(payload);
    state.safeMeta = {
      fileName: state.safeMeta?.fileName || "Dials 데이터",
      dataVersion: String(payload.dataVersion || ""),
      generatedAt: String(payload.generatedAt || ""),
      title: String(payload.title || "전화번호부"),
      schemaVersion: String(payload.schemaVersion || ""),
    };
    if (state.connectionNeedsCommit) {
      await dbSet(DATA_RECORD_KEY, { text: state.encryptedText });
      state.connectionNeedsCommit = false;
      requestPersistentStorage();
    }
    await dbSet(SAFE_META_KEY, state.safeMeta);
    el.passwordInput.value = "";
    setPasswordVisible(false);
    setUnlockMessage("", false);
    startAutoLockSession();
    enterMainView();
  } catch (error) {
    console.error(error);
    setUnlockMessage("전화번호부를 여는 중 오류가 발생했습니다.", true);
  } finally {
    state.unlockInProgress = false;
    syncUnlockDelayUI();
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, allowedKeys, path) {
  if (!isPlainObject(value)) throw new Error(`${path} 형식이 올바르지 않습니다.`);
  const allowed = new Set(allowedKeys);
  const actual = Object.keys(value);
  const missing = allowedKeys.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  const extra = actual.filter((key) => !allowed.has(key));
  if (missing.length || extra.length) {
    const details = [
      missing.length ? `누락: ${missing.join(", ")}` : "",
      extra.length ? `허용되지 않은 필드: ${extra.join(", ")}` : "",
    ].filter(Boolean).join(" / ");
    throw new Error(`${path} 필드 구성이 현재 스키마와 다릅니다.${details ? ` (${details})` : ""}`);
  }
}

function assertStringField(object, key, path, { nonEmpty = false } = {}) {
  if (typeof object[key] !== "string") throw new Error(`${path}.${key} 값은 문자열이어야 합니다.`);
  if (nonEmpty && !object[key].trim()) throw new Error(`${path}.${key} 값이 비어 있습니다.`);
}

function validatePayload(payload) {
  assertExactKeys(payload, DIALS_PAYLOAD_FIELDS, "payload");
  assertStringField(payload, "schemaVersion", "payload", { nonEmpty: true });
  if (payload.schemaVersion !== DIALS_SCHEMA_VERSION) {
    throw new Error(`지원하지 않는 데이터 스키마입니다: ${payload.schemaVersion || "알 수 없음"} (필요: ${DIALS_SCHEMA_VERSION})`);
  }
  assertStringField(payload, "dataVersion", "payload", { nonEmpty: true });
  assertStringField(payload, "generatedAt", "payload", { nonEmpty: true });
  assertStringField(payload, "period", "payload");
  assertStringField(payload, "title", "payload", { nonEmpty: true });
  if (!Array.isArray(payload.categories)) throw new Error("payload.categories 값은 배열이어야 합니다.");

  const identities = new Map();
  payload.categories.forEach((category, categoryIndex) => {
    const categoryPath = `payload.categories[${categoryIndex}]`;
    assertExactKeys(category, DIALS_CATEGORY_FIELDS, categoryPath);
    assertStringField(category, "id", categoryPath, { nonEmpty: true });
    assertStringField(category, "label", categoryPath, { nonEmpty: true });
    if (!Array.isArray(category.organizations)) throw new Error(`${categoryPath}.organizations 값은 배열이어야 합니다.`);

    category.organizations.forEach((organization, organizationIndex) => {
      const organizationPath = `${categoryPath}.organizations[${organizationIndex}]`;
      assertExactKeys(organization, DIALS_ORGANIZATION_FIELDS, organizationPath);
      assertStringField(organization, "major", organizationPath);
      assertStringField(organization, "minor", organizationPath);
      if (!Array.isArray(organization.people)) throw new Error(`${organizationPath}.people 값은 배열이어야 합니다.`);

      organization.people.forEach((record, recordIndex) => {
        const recordPath = `${organizationPath}.people[${recordIndex}]`;
        assertExactKeys(record, DIALS_RECORD_FIELDS, recordPath);
        ["personKey", "name", "title", "duty", "recordType", "extension", "mobile"].forEach((key) => {
          assertStringField(record, key, recordPath, { nonEmpty: key === "personKey" || key === "name" || key === "recordType" });
        });
        if (record.recordType !== "PERSON" && record.recordType !== "CONTACT") {
          throw new Error(`${recordPath}.recordType 값은 PERSON 또는 CONTACT여야 합니다.`);
        }
        if (typeof record.externalNumber !== "boolean") throw new Error(`${recordPath}.externalNumber 값은 true/false여야 합니다.`);
        if (!record.extension.trim() && !record.mobile.trim()) throw new Error(`${recordPath}에는 extension 또는 mobile 중 하나가 필요합니다.`);

        const identity = identities.get(record.personKey);
        if (identity && identity.recordType !== record.recordType) {
          throw new Error(`${recordPath}.personKey가 서로 다른 연락처 유형에 중복 사용되었습니다.`);
        }
        if (!identity) identities.set(record.personKey, { recordType: record.recordType });
      });
    });
  });
}

function prepareDirectoryData(payload) {
  state.categories = payload.categories.map((category) => ({
    id: category.id,
    label: category.label,
    organizations: category.organizations.map((org, orgIndex) => ({
      major: org.major,
      minor: org.minor,
      categoryId: category.id,
      categoryLabel: category.label,
      orgIndex,
      people: org.people.map((person, personIndex) => ({ ...person, _personIndex: personIndex })),
    })),
  }));

  for (const category of state.categories) {
    for (const org of category.organizations) {
      for (const record of org.people) {
        record._personKey = record.personKey;
        record._affiliationKey = makeAffiliationKey(record._personKey, org, record._personIndex);
        record._categoryId = org.categoryId;
        record._categoryLabel = org.categoryLabel;
        record._major = org.major;
        record._minor = org.minor;
      }
    }
  }
  state.people = buildUniquePeople(state.categories);
}

function buildUniquePeople(categories) {
  const peopleMap = new Map();
  let sourceIndex = 0;
  for (const category of categories) {
    for (const org of category.organizations) {
      for (const record of org.people) {
        const personKey = record._personKey;
        if (!peopleMap.has(personKey)) {
          peopleMap.set(personKey, {
            key: personKey,
            name: record.name,
            recordType: record.recordType,
            sourceIndex,
            affiliations: [],
          });
        }
        const person = peopleMap.get(personKey);
        person.affiliations.push({
          key: record._affiliationKey,
          categoryId: category.id,
          categoryLabel: category.label,
          major: org.major,
          minor: org.minor,
          title: record.title,
          duty: record.duty,
          recordType: record.recordType,
          extension: record.extension,
          mobile: record.mobile,
          externalNumber: record.externalNumber,
        });
        sourceIndex += 1;
      }
    }
  }
  return [...peopleMap.values()].sort((a, b) => a.sourceIndex - b.sourceIndex);
}

function makeAffiliationKey(personKey, org, personIndex) {
  return `${personKey}|${org.categoryId}|${Number(org.orgIndex) || 0}|${Number(personIndex) || 0}`;
}

function enterMainView() {
  el.startView.classList.add("hidden");
  el.contactExportView.classList.add("hidden");
  el.mainView.classList.remove("hidden");
  el.directoryTitle.textContent = String(state.payload?.title || "전화번호부");
  el.dataDateLabel.textContent = state.payload?.dataVersion ? `${formatDate(state.payload.dataVersion)} 기준` : "";
  state.currentView = { type: "home" };
  state.browseExpanded.clear();
  state.searchQuery = "";
  el.globalSearchInput.value = "";
  el.clearSearchButton.classList.add("hidden");
  renderContent();
  history.replaceState(makeHistoryState({ scrollY: 0 }), "", window.location.href);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function makeHistoryState({ screen = "main", view = state.currentView, contactView = state.contactView, contactDepth = state.contactDepth, searchQuery = state.searchQuery, scrollY = window.scrollY, searchSession = false } = {}) {
  return {
    [HISTORY_STATE_KEY]: {
      screen,
      view: { ...view },
      contactView: { ...contactView },
      contactDepth: Number.isFinite(Number(contactDepth)) ? Number(contactDepth) : 0,
      searchQuery: String(searchQuery || ""),
      scrollY: Number.isFinite(Number(scrollY)) ? Number(scrollY) : 0,
      searchSession: Boolean(searchSession),
    },
  };
}

function searchInputIsActive() {
  return document.activeElement === el.globalSearchInput || state.searchComposing;
}

function saveCurrentHistoryScroll(force = false) {
  const route = history.state?.[HISTORY_STATE_KEY];
  if (!route || !state.payload || (!force && searchInputIsActive())) return;
  history.replaceState(makeHistoryState({
    screen: route.screen || "main",
    view: route.view || state.currentView,
    contactView: route.contactView || state.contactView,
    contactDepth: route.contactDepth ?? state.contactDepth,
    searchQuery: route.searchQuery ?? state.searchQuery,
    scrollY: window.scrollY,
    searchSession: Boolean(route.searchSession),
  }), "", window.location.href);
}

function scheduleHistoryScrollSave() {
  if (!state.payload || !history.state?.[HISTORY_STATE_KEY] || searchInputIsActive()) return;
  if (state.scrollSaveTimer) window.clearTimeout(state.scrollSaveTimer);
  state.scrollSaveTimer = window.setTimeout(() => {
    state.scrollSaveTimer = null;
    saveCurrentHistoryScroll();
  }, 80);
}

function navigateToView(view) {
  if (!state.payload) return;
  saveCurrentHistoryScroll();
  state.currentView = { ...view };
  state.searchQuery = "";
  el.globalSearchInput.value = "";
  el.clearSearchButton.classList.add("hidden");
  el.contactExportView.classList.add("hidden");
  el.mainView.classList.remove("hidden");
  history.pushState(makeHistoryState({ screen: "main", view: state.currentView, searchQuery: "", scrollY: 0 }), "", window.location.href);
  renderContent();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function prepareGlobalSearchHistory() {
  if (!state.payload) return;
  const route = history.state?.[HISTORY_STATE_KEY];
  if (route?.screen !== "main" || route.searchSession) return;
  saveCurrentHistoryScroll(true);
  history.pushState(makeHistoryState({
    screen: "main",
    view: state.currentView,
    searchQuery: state.searchQuery,
    scrollY: window.scrollY,
    searchSession: true,
  }), "", window.location.href);
}

function cancelGlobalSearchCommit() {
  if (!state.globalSearchDebounceTimer) return;
  window.clearTimeout(state.globalSearchDebounceTimer);
  state.globalSearchDebounceTimer = null;
}

function scheduleGlobalSearchCommit(delay = 220) {
  cancelGlobalSearchCommit();
  state.globalSearchDebounceTimer = window.setTimeout(() => {
    state.globalSearchDebounceTimer = null;
    if (state.searchComposing) return;
    commitGlobalSearchInput();
  }, delay);
}

function commitGlobalSearchInput() {
  const previous = state.searchQuery;
  const next = el.globalSearchInput.value.trim();
  if (previous === next) {
    el.clearSearchButton.classList.toggle("hidden", !next);
    return;
  }
  state.searchQuery = next;
  el.clearSearchButton.classList.toggle("hidden", !next);
  renderContent();
}

function syncGlobalSearchHistoryState() {
  if (!state.payload || state.searchComposing) return;
  const route = history.state?.[HISTORY_STATE_KEY];
  if (route?.screen !== "main" || !route.searchSession) return;
  history.replaceState(makeHistoryState({
    screen: "main",
    view: state.currentView,
    searchQuery: state.searchQuery,
    scrollY: window.scrollY,
    searchSession: true,
  }), "", window.location.href);
}

function clearGlobalSearch() {
  cancelGlobalSearchCommit();
  if (!state.searchQuery && !el.globalSearchInput.value) return;
  el.globalSearchInput.value = "";
  const route = history.state?.[HISTORY_STATE_KEY];
  if (route?.searchSession) {
    history.back();
    return;
  }
  state.searchQuery = "";
  el.clearSearchButton.classList.add("hidden");
  renderContent();
  window.setTimeout(() => el.globalSearchInput.focus(), 0);
}

function handleHistoryNavigation(event) {
  const route = event.state?.[HISTORY_STATE_KEY];
  if (!route || !state.payload) return;
  closeOverflowMenu();
  closeModal();
  state.currentView = route.view && typeof route.view === "object" ? { ...route.view } : { type: "home" };
  state.searchQuery = String(route.searchQuery || "");
  el.globalSearchInput.value = state.searchQuery;
  el.clearSearchButton.classList.toggle("hidden", !state.searchQuery);
  if (route.screen === "contact-export") {
    el.startView.classList.add("hidden");
    state.contactView = route.contactView && typeof route.contactView === "object" ? { ...route.contactView } : { type: "home" };
    state.contactDepth = Number(route.contactDepth) || 0;
    state.contactFilter = "";
    el.contactSearchInput.value = "";
    showContactExportView();
  } else {
    el.contactExportView.classList.add("hidden");
    el.mainView.classList.remove("hidden");
    renderContent();
  }
  window.requestAnimationFrame(() => window.scrollTo({ top: Number(route.scrollY) || 0, behavior: "auto" }));
}

function renderContent() {
  if (!state.payload) return;
  if (state.searchQuery) renderSearchResults();
  else renderHome();
}

function renderHome() {
  const rows = state.categories.map((category) => browseCategoryNodeHtml(category)).join("");
  el.contentView.innerHTML = `
    <p class="lookup-intro">소속을 선택하거나 검색창에서 바로 찾아보세요.</p>
    <div class="browse-tree">${rows || renderEmptyHtml("표시할 소속이 없습니다.")}</div>`;
  state.browseAnimateKey = "";
}

function browseChildrenShellHtml(treeKey, childrenHtml) {
  const animate = state.browseAnimateKey === treeKey ? " is-expanding" : "";
  return `<div class="browse-tree-children-shell${animate}" data-tree-children-for="${escapeAttr(treeKey)}">
    <div class="browse-tree-children">${childrenHtml}</div>
  </div>`;
}

function browseCategoryNodeHtml(category) {
  const treeKey = categoryTreeKey(category.id);
  const expanded = state.browseExpanded.has(treeKey);
  const groups = contactMajorGroups(category);
  const children = expanded
    ? browseChildrenShellHtml(treeKey, groups.map((group) => browseMajorNodeHtml(category, group)).join("") || renderEmptyHtml("표시할 소속이 없습니다."))
    : "";
  return `<section class="browse-tree-node level-0${expanded ? " expanded" : ""}" data-browse-node-key="${escapeAttr(treeKey)}">
    ${browseDisclosureRowHtml({ treeKey, expanded, level: 0, label: category.label, detail: `${groups.length}개 소속` })}
    ${children}
  </section>`;
}

function browseMajorNodeHtml(category, group) {
  const treeKey = majorTreeKey(category.id, group.major);
  const expanded = state.browseExpanded.has(treeKey);
  const directItems = group.items.filter(({ org }) => isDirectMajorOrganization(group.major, org));
  const childItems = group.items.filter(({ org }) => !isDirectMajorOrganization(group.major, org));
  const directPeople = [];
  const directSeen = new Set();
  directItems.forEach(({ org }) => {
    uniqueOrgRecords(org).forEach((record) => {
      const key = String(record._personKey || "");
      if (!key || directSeen.has(key)) return;
      directSeen.add(key);
      directPeople.push(record);
    });
  });
  const keys = unique(group.items.flatMap(({ org }) => org.people.map((record) => record._personKey)).filter(Boolean));
  const childHtml = `${directPeople.map((record) => browseTreePersonRowHtml(record, 2, true)).join("")}
    ${childItems.map(({ org, orgIndex }) => browseOrganizationNodeHtml(category, org, orgIndex)).join("")}
    ${!directPeople.length && !childItems.length ? renderEmptyHtml("표시할 인물이 없습니다.") : ""}`;
  const children = expanded ? browseChildrenShellHtml(treeKey, childHtml) : "";
  return `<section class="browse-tree-node level-1${expanded ? " expanded" : ""}" data-browse-node-key="${escapeAttr(treeKey)}">
    ${browseDisclosureRowHtml({ treeKey, expanded, level: 1, label: group.major, detail: `${keys.length}명` })}
    ${children}
  </section>`;
}

function browseOrganizationNodeHtml(category, org, orgIndex) {
  const treeKey = orgTreeKey(category.id, orgIndex);
  const expanded = state.browseExpanded.has(treeKey);
  const label = org.minor || org.major || "소속 없음";
  const records = uniqueOrgRecords(org);
  const childHtml = records.map((record) => browseTreePersonRowHtml(record, 3, false)).join("") || renderEmptyHtml("표시할 인물이 없습니다.");
  const children = expanded ? browseChildrenShellHtml(treeKey, childHtml) : "";
  return `<section class="browse-tree-node level-2${expanded ? " expanded" : ""}" data-browse-node-key="${escapeAttr(treeKey)}">
    ${browseDisclosureRowHtml({ treeKey, expanded, level: 2, label, detail: `${records.length}명` })}
    ${children}
  </section>`;
}

function browseDisclosureRowHtml({ treeKey, expanded, level, label, detail = "" }) {
  return `<div class="browse-tree-row" data-tree-level="${Number(level) || 0}">
    <button class="browse-tree-toggle" type="button" data-browse-tree-toggle data-tree-key="${escapeAttr(treeKey)}" aria-expanded="${expanded ? "true" : "false"}">
      <span class="browse-tree-chevron${expanded ? " open" : ""}" aria-hidden="true">›</span>
      <span class="browse-tree-label"><strong>${escapeHtml(label || "소속 없음")}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</span>
    </button>
  </div>`;
}

function browseTreePersonRowHtml(record, level, directMajorPerson = false) {
  const name = String(record?.name || "").trim() || "이름 없음";
  const title = record?.title || "";
  const duty = record?.duty || "";
  const recordType = record?.recordType || "PERSON";
  const primary = directMajorPerson && title && recordType !== "CONTACT" ? `${title} ${name}` : name;
  const lines = [];
  if (record?.extension) lines.push(phoneLineHtml("내선번호", record.extension, record.externalNumber));
  if (record?.mobile) lines.push(phoneLineHtml(recordType === "CONTACT" ? "연락번호" : "개인번호", record.mobile));
  return `<article class="browse-tree-person" data-tree-level="${Number(level) || 0}">
    <div class="browse-tree-static">
      <span class="browse-tree-chevron-spacer" aria-hidden="true"></span>
      <div class="browse-tree-person-content">
        <div class="browse-tree-person-title"><strong>${escapeHtml(primary)}</strong>${!directMajorPerson && title ? `<span>${escapeHtml(title)}</span>` : ""}${recordType === "CONTACT" ? `<span class="record-type-label">시설·업체</span>` : ""}</div>
        ${duty ? `<div class="person-duty">담당 · ${escapeHtml(duty)}</div>` : ""}
        ${lines.length ? `<div class="browse-tree-phone-lines">${lines.join("")}</div>` : ""}
      </div>
    </div>
  </article>`;
}

function handleBrowseTreeClick(event) {
  const toggle = event.target.closest("[data-browse-tree-toggle]");
  if (!toggle || toggle.dataset.treeBusy === "true") return;
  const treeKey = toggle.dataset.treeKey;
  if (!treeKey) return;
  if (!state.browseExpanded.has(treeKey)) {
    state.browseExpanded.add(treeKey);
    state.browseAnimateKey = treeKey;
    renderHome();
    return;
  }

  const node = toggle.closest("[data-browse-node-key]");
  const shell = node?.querySelector(":scope > .browse-tree-children-shell");
  if (!shell || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    state.browseExpanded.delete(treeKey);
    renderHome();
    return;
  }
  toggle.dataset.treeBusy = "true";
  toggle.setAttribute("aria-expanded", "false");
  toggle.querySelector(".browse-tree-chevron")?.classList.remove("open");
  shell.classList.add("is-collapsing");
  window.setTimeout(() => {
    state.browseExpanded.delete(treeKey);
    renderHome();
  }, 180);
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
    <div class="page-heading"><h1>${escapeHtml(category.label)}</h1></div>
    ${groupsHtml || renderEmptyHtml("표시할 소속이 없습니다.")}`;

  el.contentView.querySelectorAll("[data-org-index]").forEach((button) => {
    button.addEventListener("click", () => {
      navigateToView({ type: "organization", categoryId, orgIndex: Number(button.dataset.orgIndex) });
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
  const title = person.title || "";
  const duty = person.duty || "";
  const recordType = person.recordType || "PERSON";
  const lines = [];
  if (person.extension) lines.push(phoneLineHtml("내선번호", person.extension, person.externalNumber));
  if (person.mobile) lines.push(phoneLineHtml(recordType === "CONTACT" ? "연락번호" : "개인번호", person.mobile));
  return `<article class="person-card">
    <div class="person-card-header"><span class="person-name">${escapeHtml(person.name || "이름 없음")}</span>${title ? `<span class="person-title">${escapeHtml(title)}</span>` : ""}${recordType === "CONTACT" ? `<span class="record-type-label">시설·업체</span>` : ""}</div>
    ${duty ? `<div class="person-duty card-duty">담당 · ${escapeHtml(duty)}</div>` : ""}
    <div class="phone-lines">${lines.join("")}</div>
  </article>`;
}

function phoneLineHtml(label, number, externalNumber = false) {
  const display = externalNumber ? `${number} (외부번호)` : number;
  return `<div class="phone-line"><span>${escapeHtml(label)}</span><a href="tel:${escapeAttr(telHref(number))}">${escapeHtml(display)}</a></div>`;
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
    if (a.extension) {
      const label = "내선";
      const display = a.externalNumber ? `${a.extension} (외부번호)` : a.extension;
      phones.push(`<a href="tel:${escapeAttr(telHref(a.extension))}">${label} ${escapeHtml(display)}</a>`);
    }
    if (a.mobile && a.mobile !== commonMobile) phones.push(`<a href="tel:${escapeAttr(telHref(a.mobile))}">개인 ${escapeHtml(a.mobile)}</a>`);
    return `<div class="affiliation-item">
      <div class="affiliation-title"><strong>${escapeHtml(orgPath || a.categoryLabel)}</strong>${a.title ? `<span>${escapeHtml(a.title)}</span>` : ""}${a.recordType === "CONTACT" ? `<span class="record-type-label">시설·업체</span>` : ""}</div>
      ${a.duty ? `<div class="person-duty">담당 · ${escapeHtml(a.duty)}</div>` : ""}
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
  person.affiliations.forEach((a) => textParts.push(
    a.categoryLabel, a.major, a.minor, a.title, a.duty, a.extension, a.mobile,
    a.recordType === "CONTACT" ? "시설 업체 연락처" : "인물",
    a.externalNumber ? "외부번호" : "",
  ));
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
      if (item.view === "category") navigateToView({ type: "category", categoryId: item.categoryId });
      else navigateToView({ type: "home" });
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
  else if (action === "replace-data") beginDataReplacement();
  else if (action === "contact-export") enterContactExport();
  else if (action === "install-app") handleInstallRequest();
  else if (action === "theme") showThemeChooser();
  else if (action === "about") showAboutInfo();
  else if (action === "lock") lockApp();
}


function initializeTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  state.themePreference = ["light", "dark", "black"].includes(saved) ? saved : "system";
  applyTheme(state.themePreference, false);
}

function applyTheme(mode, persist = true) {
  const normalized = ["light", "dark", "black"].includes(mode) ? mode : "system";
  state.themePreference = normalized;
  document.documentElement.dataset.theme = normalized;
  if (persist) localStorage.setItem(THEME_STORAGE_KEY, normalized);
  updateThemeMenuLabel();
  updateThemeMetaColor();
}

function updateThemeMenuLabel() {
  if (!el.themeMenuButton) return;
  const labels = { system: "시스템", light: "라이트", dark: "다크", black: "블랙" };
  el.themeMenuButton.textContent = `화면 모드 · ${labels[state.themePreference] || "시스템"}`;
}

function resolvedTheme() {
  if (["light", "dark", "black"].includes(state.themePreference)) return state.themePreference;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function updateThemeMetaColor() {
  if (!el.themeColorMeta) return;
  const colors = { light: "#F6F1E8", dark: "#0D1117", black: "#000000" };
  el.themeColorMeta.setAttribute("content", colors[resolvedTheme()] || colors.light);
}

function showThemeChooser() {
  const current = state.themePreference;
  const option = (value, title, description) => `
    <label class="theme-choice${current === value ? " selected" : ""}" data-theme-value="${value}">
      <input type="radio" name="dials-theme" value="${value}" ${current === value ? "checked" : ""}>
      <span><strong>${title}</strong><small>${description}</small></span>
    </label>`;
  showModal({
    title: "화면 모드",
    body: `<fieldset class="theme-choice-list">
      <legend class="visually-hidden">화면 모드 선택</legend>
      ${option("system", "시스템 설정", "기기의 라이트/다크 모드를 자동으로 따릅니다.")}
      ${option("light", "라이트", "따뜻한 뉴트럴 계열의 밝은 화면입니다.")}
      ${option("dark", "다크", "차분한 개발자 도구 계열의 어두운 화면입니다.")}
      ${option("black", "블랙 (OLED)", "넓은 배경을 순수 검정으로 표시해 OLED 발광 면적을 줄입니다.")}
    </fieldset>`,
    actions: [{ label: "닫기", onClick: closeModal }],
  });
  el.modalBody.querySelectorAll('input[name="dials-theme"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      applyTheme(radio.value);
      el.modalBody.querySelectorAll("[data-theme-value]").forEach((label) => {
        label.classList.toggle("selected", label.dataset.themeValue === radio.value);
      });
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

function showAboutInfo() {
  showModal({
    title: "정보",
    body: `<div class="about-info">
      <p><strong>Dials</strong><br>배포받은 전화번호부를 빠르게 찾아보고 필요한 연락처를 저장할 수 있습니다.</p>
      <section class="about-section" aria-labelledby="privacySecurityTitle">
        <h3 id="privacySecurityTitle">개인정보 보호</h3>
        <div class="privacy-feature-list">
          <div class="privacy-feature">${uiIcon("shield")}<span>연락처 데이터는 <strong>이 기기에만 보관되며 외부로 전송되지 않습니다.</strong></span></div>
          <div class="privacy-feature">${uiIcon("lock")}<span>입력한 암호는 저장하지 않습니다.</span></div>
          <div class="privacy-feature">${uiIcon("clock")}<span>개인정보 보호를 위해 <strong>10분이 지나면 자동으로 잠깁니다.</strong></span></div>
        </div>
        <p class="about-tech-note">자세한 기술 정보는 GitHub에서 확인할 수 있습니다.</p>
      </section>
      <div class="about-footer">
        <span>v${APP_VERSION}</span>
        <a class="github-link" href="https://github.com/Bak2ya/Dials" target="_blank" rel="noopener noreferrer">GitHub에서 보기</a>
      </div>
    </div>`,
    actions: [{ label: "닫기", onClick: closeModal }],
  });
}

function uiIcon(name) {
  const paths = {
    shield: '<path d="M12 3l7 3v5c0 4.6-2.8 8.2-7 10-4.2-1.8-7-5.4-7-10V6l7-3z"/><path d="M9.5 12.2l1.7 1.7 3.7-4"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  return `<svg class="ui-line-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || ""}</svg>`;
}

function closeOverflowMenu() {
  el.overflowMenu.classList.add("hidden");
  el.menuButton.setAttribute("aria-expanded", "false");
}

function startAutoLockSession() {
  state.unlockStartedAt = Date.now();
  scheduleAutoLock();
}

function clearAutoLockTimer() {
  if (!state.autoLockTimer) return;
  window.clearTimeout(state.autoLockTimer);
  state.autoLockTimer = null;
}

function scheduleAutoLock() {
  clearAutoLockTimer();
  if (!state.payload || !state.unlockStartedAt) return;
  const remaining = AUTO_LOCK_MS - (Date.now() - state.unlockStartedAt);
  if (remaining <= 0) {
    lockApp("auto");
    return;
  }
  state.autoLockTimer = window.setTimeout(() => checkAutoLock(), remaining + 25);
}

function checkAutoLock() {
  if (!state.payload || !state.unlockStartedAt) return;
  if (Date.now() - state.unlockStartedAt >= AUTO_LOCK_MS) {
    lockApp("auto");
    return;
  }
  scheduleAutoLock();
}

function lockApp(reason = "manual") {
  clearAutoLockTimer();
  cancelGlobalSearchCommit();
  cancelContactSearchCommit();
  state.payload = null;
  state.people = [];
  state.categories = [];
  state.selectedPeople.clear();
  state.searchQuery = "";
  state.contactFilter = "";
  state.contactExpanded.clear();
  state.browseExpanded.clear();
  state.unlockStartedAt = 0;
  if (reason === "auto") {
    try { sessionStorage.setItem(AUTO_LOCK_NOTICE_KEY, "1"); } catch {}
  }
  // 새로고침으로 페이지 메모리의 복호화 데이터와 파생 상태를 함께 내려놓습니다.
  window.location.reload();
}

function showDataInfo() {
  const current = formatDate(state.payload?.dataVersion) || "알 수 없음";
  showModal({
    title: "전화번호부 데이터",
    body: `<dl class="info-grid">
        <dt>기준일</dt><dd>${escapeHtml(current)}</dd>
        <dt>기준월</dt><dd>${escapeHtml(state.payload?.period || "-")}</dd>
        <dt>데이터 생성</dt><dd>${escapeHtml(formatDateTime(state.payload?.generatedAt) || "-")}</dd>
        <dt>연결 파일</dt><dd>${escapeHtml(state.safeMeta?.fileName || "Dials 데이터")}</dd>
        <dt>웹앱</dt><dd>Dials ${APP_VERSION}</dd>
      </dl>`,
    actions: [
      { label: "닫기", onClick: closeModal },
      { label: "새 데이터 불러오기", primary: true, onClick: () => { closeModal(); beginDataReplacement(); } },
    ],
  });
}

function enterContactExport() {
  saveCurrentHistoryScroll();
  state.selectedPeople.clear();
  state.representativeAffiliations.clear();
  state.contactFilter = "";
  state.contactView = { type: "home" };
  state.contactDepth = 0;
  state.contactExpanded.clear();
  el.contactSearchInput.value = "";
  showContactExportView();
  history.pushState(makeHistoryState({ screen: "contact-export", contactView: state.contactView, contactDepth: state.contactDepth, scrollY: 0 }), "", window.location.href);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showContactExportView() {
  el.mainView.classList.add("hidden");
  el.contactExportView.classList.remove("hidden");
  restoreNameDecorationSettings();
  updateOrganizationOptionLabel();
  renderContactBrowse();
  setVcardMessage("");
}

function leaveContactExport() {
  if (history.state?.[HISTORY_STATE_KEY]?.screen === "contact-export") {
    history.go(-(state.contactDepth + 1));
    return;
  }
  el.contactExportView.classList.add("hidden");
  el.mainView.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function cancelContactSearchCommit() {
  if (!state.contactSearchDebounceTimer) return;
  window.clearTimeout(state.contactSearchDebounceTimer);
  state.contactSearchDebounceTimer = null;
}

function scheduleContactSearchCommit(delay = 220) {
  cancelContactSearchCommit();
  state.contactSearchDebounceTimer = window.setTimeout(() => {
    state.contactSearchDebounceTimer = null;
    const next = el.contactSearchInput.value.trim();
    if (state.contactFilter === next) return;
    state.contactFilter = next;
    renderContactBrowse();
  }, delay);
}

function filteredContactPeople() {
  const tokens = tokenize(state.contactFilter);
  if (!tokens.length) return state.people;
  return state.people.filter((person) => personMatchesTokens(person, tokens));
}

function renderContactBrowse() {
  if (!el.contactBrowseView) return;
  const searching = Boolean(state.contactFilter);
  if (searching) renderContactSearchResults();
  else renderContactHome();
  syncContactSelectionUI();
  updateSelectedCount();
}

function renderContactHome() {
  const rows = state.categories.map((category) => contactCategoryNodeHtml(category)).join("");
  el.contactBrowseView.innerHTML = `<div class="contact-browse-heading"><strong>소속별 선택</strong><span>필요한 소속을 펼쳐 인물을 선택하세요.</span></div>
    <div class="contact-tree">${rows || renderEmptyHtml("표시할 소속이 없습니다.")}</div>`;
  state.contactAnimateKey = "";
}

function contactMajorGroups(category) {
  const groups = [];
  const map = new Map();
  category.organizations.forEach((org, orgIndex) => {
    const major = org.major || category.label;
    if (!map.has(major)) {
      const entry = { major, items: [] };
      map.set(major, entry);
      groups.push(entry);
    }
    map.get(major).items.push({ org, orgIndex });
  });
  return groups;
}

function isDirectMajorOrganization(groupMajor, org) {
  const major = String(groupMajor || "").trim();
  const minor = String(org?.minor || "").trim();
  return !minor || minor === major;
}

function categoryTreeKey(categoryId) {
  return `category:${categoryId}`;
}

function majorTreeKey(categoryId, major) {
  return `major:${categoryId}:${major}`;
}

function orgTreeKey(categoryId, orgIndex) {
  return `org:${categoryId}:${orgIndex}`;
}

function contactChildrenShellHtml(treeKey, childrenHtml) {
  const animate = state.contactAnimateKey === treeKey ? " is-expanding" : "";
  return `<div class="contact-tree-children-shell${animate}" data-contact-tree-children-for="${escapeAttr(treeKey)}">
    <div class="contact-tree-children">${childrenHtml}</div>
  </div>`;
}

function contactCategoryNodeHtml(category) {
  const treeKey = categoryTreeKey(category.id);
  const expanded = state.contactExpanded.has(treeKey);
  const groups = contactMajorGroups(category);
  const children = expanded
    ? contactChildrenShellHtml(treeKey, groups.map((group) => contactMajorNodeHtml(category, group)).join("") || renderEmptyHtml("표시할 소속이 없습니다."))
    : "";
  return `<section class="contact-tree-node level-0${expanded ? " expanded" : ""}" data-contact-node-key="${escapeAttr(treeKey)}">
    ${contactDisclosureRowHtml({ treeKey, expanded, level: 0, label: category.label, detail: `${groups.length}개 소속`, checkboxHtml: "" })}
    ${children}
  </section>`;
}

function contactMajorNodeHtml(category, group) {
  const treeKey = majorTreeKey(category.id, group.major);
  const expanded = state.contactExpanded.has(treeKey);
  const keys = majorPersonKeys(category.id, group.major);
  const selected = selectionStateForKeys(keys);
  const directItems = group.items.filter(({ org }) => isDirectMajorOrganization(group.major, org));
  const childItems = group.items.filter(({ org }) => !isDirectMajorOrganization(group.major, org));
  const directPeople = [];
  const directSeen = new Set();
  directItems.forEach(({ org }) => {
    uniqueOrgRecords(org).forEach((record) => {
      const key = String(record._personKey || "");
      if (!key || directSeen.has(key)) return;
      directSeen.add(key);
      directPeople.push(record);
    });
  });
  const childHtml = `${directPeople.map((record) => contactTreePersonRowHtml(record, 2, true)).join("")}
    ${childItems.map(({ org, orgIndex }) => contactOrganizationNodeHtml(category, org, orgIndex)).join("")}
    ${!directPeople.length && !childItems.length ? renderEmptyHtml("표시할 인물이 없습니다.") : ""}`;
  const children = expanded ? contactChildrenShellHtml(treeKey, childHtml) : "";
  const checkboxHtml = contactTreeCheckboxHtml({
    type: "major",
    categoryId: category.id,
    major: group.major,
    label: `${group.major} 전체 선택`,
    selected,
    disabled: !keys.length,
  });
  return `<section class="contact-tree-node level-1${expanded ? " expanded" : ""}" data-contact-node-key="${escapeAttr(treeKey)}">
    ${contactDisclosureRowHtml({ treeKey, expanded, level: 1, label: group.major, detail: `${keys.length}명`, checkboxHtml })}
    ${children}
  </section>`;
}

function contactOrganizationNodeHtml(category, org, orgIndex) {
  const treeKey = orgTreeKey(category.id, orgIndex);
  const expanded = state.contactExpanded.has(treeKey);
  const label = org.minor || org.major || "소속 없음";
  const records = uniqueOrgRecords(org);
  const keys = records.map((record) => record._personKey).filter(Boolean);
  const selected = selectionStateForKeys(keys);
  const checkboxHtml = contactTreeCheckboxHtml({
    type: "org",
    categoryId: category.id,
    orgIndex,
    label: `${label} 전체 선택`,
    selected,
    disabled: !keys.length,
  });
  const childHtml = records.map((record) => contactTreePersonRowHtml(record, 3, false)).join("") || renderEmptyHtml("표시할 인물이 없습니다.");
  const children = expanded ? contactChildrenShellHtml(treeKey, childHtml) : "";
  return `<section class="contact-tree-node level-2${expanded ? " expanded" : ""}" data-contact-node-key="${escapeAttr(treeKey)}">
    ${contactDisclosureRowHtml({ treeKey, expanded, level: 2, label, detail: `${keys.length}명`, checkboxHtml })}
    ${children}
  </section>`;
}

function contactDisclosureRowHtml({ treeKey, expanded, level, label, detail = "", checkboxHtml = "" }) {
  return `<div class="contact-tree-row${checkboxHtml ? "" : " no-select"}" data-tree-level="${Number(level) || 0}">
    <button class="contact-tree-toggle" type="button" data-contact-tree-toggle data-tree-key="${escapeAttr(treeKey)}" aria-expanded="${expanded ? "true" : "false"}">
      <span class="contact-tree-chevron${expanded ? " open" : ""}" aria-hidden="true">›</span>
      <span class="contact-tree-label"><strong>${escapeHtml(label || "소속 없음")}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</span>
    </button>
    ${checkboxHtml || `<span class="contact-tree-check-spacer" aria-hidden="true"></span>`}
  </div>`;
}

function contactTreeCheckboxHtml({ type, categoryId, major = "", orgIndex = -1, label, selected, disabled = false }) {
  const attrs = type === "major"
    ? `data-major-select data-category-id="${escapeAttr(categoryId)}" data-major="${escapeAttr(major)}"`
    : `data-org-select data-category-id="${escapeAttr(categoryId)}" data-org-index="${Number(orgIndex)}"`;
  return `<label class="contact-tree-check" title="${escapeAttr(label)}">
    <input type="checkbox" ${attrs} ${selected?.all ? "checked" : ""} ${disabled ? "disabled" : ""}>
    <span class="visually-hidden">${escapeHtml(label)}</span>
  </label>`;
}

function recordAffiliation(record) {
  return {
    key: String(record?._affiliationKey || ""),
    categoryId: String(record?._categoryId || ""),
    categoryLabel: String(record?._categoryLabel || ""),
    major: String(record?._major || ""),
    minor: String(record?._minor || ""),
    title: record?.title || "",
    duty: record?.duty || "",
    recordType: record?.recordType || "PERSON",
  };
}

function affiliationDepartmentName(affiliation) {
  return String(affiliation?.minor || affiliation?.major || "").trim();
}

function representativeSummary(affiliation) {
  const department = affiliationDepartmentName(affiliation);
  const title = String(affiliation?.title || "").trim();
  return [department, title].filter(Boolean).join(" · ") || "소속 정보";
}

function representativeButtonLabel(affiliation, siblings = []) {
  const department = affiliationDepartmentName(affiliation);
  const title = String(affiliation?.title || "").trim();
  if (!title) return department || "소속";
  const duplicateTitle = siblings.filter((item) => String(item?.title || "").trim() === title).length > 1;
  return duplicateTitle && department ? `${department} · ${title}` : title;
}

function contactRepresentativeButtonHtml(personKey, affiliation, siblings = []) {
  const affiliationKey = String(affiliation?.key || "");
  if (!personKey || !affiliationKey) return "";
  const active = state.representativeAffiliations.get(personKey) === affiliationKey;
  const label = representativeButtonLabel(affiliation, siblings);
  const summary = representativeSummary(affiliation);
  return `<button class="representative-toggle${active ? " active" : ""}" type="button"
    data-representative-affiliation="${escapeAttr(affiliationKey)}"
    data-representative-person="${escapeAttr(personKey)}"
    data-representative-summary="${escapeAttr(summary)}"
    aria-pressed="${active ? "true" : "false"}"
    aria-label="${escapeAttr(`${summary} 대표 정보 ${active ? "해제" : "선택"}`)}"
    title="${escapeAttr(`${summary} 대표 정보 ${active ? "해제" : "선택"}`)}">${escapeHtml(label)}</button>`;
}

function contactTreePersonRowHtml(record, level, directMajorPerson = false) {
  const personKey = String(record?._personKey || "");
  const selected = state.selectedPeople.has(personKey);
  const name = String(record?.name || "").trim() || "이름 없음";
  const affiliation = recordAffiliation(record);
  const person = state.people.find((item) => item.key === personKey);
  const representativeButton = contactRepresentativeButtonHtml(personKey, affiliation, person?.affiliations || [affiliation]);
  return `<div class="contact-tree-person" data-tree-level="${Number(level) || 0}">
    <div class="contact-tree-static contact-person-static">
      <span class="contact-tree-chevron-spacer" aria-hidden="true"></span>
      <span class="contact-tree-label"><strong>${escapeHtml(name)}</strong>${affiliation.recordType === "CONTACT" ? `<small>시설·업체${affiliation.duty ? ` · 담당 ${escapeHtml(affiliation.duty)}` : ""}</small>` : affiliation.duty ? `<small>담당 ${escapeHtml(affiliation.duty)}</small>` : ""}</span>
      ${representativeButton}
    </div>
    <label class="contact-tree-check" title="${escapeAttr(name)} 선택">
      <input type="checkbox" data-person-key="${escapeAttr(personKey)}" ${selected ? "checked" : ""}>
      <span class="visually-hidden">${escapeHtml(name)} 선택</span>
    </label>
  </div>`;
}

function renderContactSearchResults() {
  const people = filteredContactPeople();
  const rows = people.map((person) => contactPersonRowHtml(person)).join("");
  const selection = selectionStateForKeys(people.map((person) => person.key));
  const toggleLabel = selection.all ? "선택 해제" : "모두 선택";
  el.contactBrowseView.innerHTML = `<div class="contact-browse-heading search-results-heading">
      <strong>검색결과 ${people.length}명</strong>
      <button class="text-button search-selection-toggle" type="button" data-search-selection-toggle ${people.length ? "" : "disabled"}>${toggleLabel}</button>
    </div>
    <p class="contact-search-dedupe-note">같은 인물이 여러 소속에 있어도 하나의 연락처로 저장됩니다.</p>
    <div class="contact-person-list">${rows || renderEmptyHtml("검색 결과가 없습니다.")}</div>`;
}

function contactPersonRowHtml(person) {
  const personKey = String(person?.key || "");
  const name = String(person?.name || "").trim() || "이름 없음";
  const selected = state.selectedPeople.has(personKey);
  const detail = summarizeAffiliations(person);
  const representativeButtons = (person?.affiliations || []).map((affiliation) => contactRepresentativeButtonHtml(personKey, affiliation, person.affiliations)).join("");
  return `<div class="contact-person-row">
    <div class="contact-search-person-main">
      <strong>${escapeHtml(name)}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
      ${representativeButtons ? `<div class="representative-button-list">${representativeButtons}</div>` : ""}
    </div>
    <label class="contact-person-check" title="${escapeAttr(name)} 선택">
      <input type="checkbox" data-person-key="${escapeAttr(personKey)}" ${selected ? "checked" : ""}>
      <span class="visually-hidden">${escapeHtml(name)} 선택</span>
    </label>
  </div>`;
}

function findPersonAffiliation(personKey, affiliationKey) {
  return state.people.find((person) => person.key === personKey)?.affiliations?.find((affiliation) => affiliation.key === affiliationKey) || null;
}

function applyRepresentativeAffiliation(personKey, affiliationKey) {
  if (affiliationKey) state.representativeAffiliations.set(personKey, affiliationKey);
  else state.representativeAffiliations.delete(personKey);
  syncContactSelectionUI();
}

function handleRepresentativeButton(button) {
  const personKey = String(button.dataset.representativePerson || "");
  const affiliationKey = String(button.dataset.representativeAffiliation || "");
  if (!personKey || !affiliationKey) return;

  const currentKey = state.representativeAffiliations.get(personKey) || "";
  if (currentKey === affiliationKey) {
    applyRepresentativeAffiliation(personKey, "");
    return;
  }
  if (!currentKey) {
    applyRepresentativeAffiliation(personKey, affiliationKey);
    return;
  }

  const current = findPersonAffiliation(personKey, currentKey);
  const next = findPersonAffiliation(personKey, affiliationKey);
  const currentText = representativeSummary(current);
  const nextText = representativeSummary(next);
  showModal({
    title: "대표 부서/직함 변경",
    body: `<p>이미 대표 부서/직함이 설정되어 있습니다.</p><p class="representative-change-summary">현재: <strong>${escapeHtml(currentText)}</strong><br>변경: <strong>${escapeHtml(nextText)}</strong></p><p>이 부서/직함을 대표로 바꾸시겠습니까?</p>`,
    actions: [
      { label: "취소", onClick: closeModal },
      { label: "변경", primary: true, onClick: () => { applyRepresentativeAffiliation(personKey, affiliationKey); closeModal(); } },
    ],
  });
}

function handleContactBrowseClick(event) {
  const searchSelectionToggle = event.target.closest("[data-search-selection-toggle]");
  if (searchSelectionToggle) {
    toggleFilteredPeopleSelection();
    return;
  }

  const representativeButton = event.target.closest("[data-representative-affiliation]");
  if (representativeButton) {
    handleRepresentativeButton(representativeButton);
    return;
  }

  const toggle = event.target.closest("[data-contact-tree-toggle]");
  if (!toggle || toggle.dataset.treeBusy === "true") return;
  const treeKey = toggle.dataset.treeKey;
  if (!treeKey) return;
  if (!state.contactExpanded.has(treeKey)) {
    state.contactExpanded.add(treeKey);
    state.contactAnimateKey = treeKey;
    renderContactBrowse();
    return;
  }

  const node = toggle.closest("[data-contact-node-key]");
  const shell = node?.querySelector(":scope > .contact-tree-children-shell");
  if (!shell || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    state.contactExpanded.delete(treeKey);
    renderContactBrowse();
    return;
  }
  toggle.dataset.treeBusy = "true";
  toggle.setAttribute("aria-expanded", "false");
  toggle.querySelector(".contact-tree-chevron")?.classList.remove("open");
  shell.classList.add("is-collapsing");
  window.setTimeout(() => {
    state.contactExpanded.delete(treeKey);
    renderContactBrowse();
  }, 180);
}

function majorPersonKeys(categoryId, major) {
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) return [];
  const group = contactMajorGroups(category).find((item) => item.major === major);
  if (!group) return [];
  return unique(group.items.flatMap(({ org }) => org.people.map((record) => record._personKey)).filter(Boolean));
}

function handleContactSelectionChange(event) {
  const personCheckbox = event.target.closest('input[data-person-key]');
  if (personCheckbox) {
    const key = personCheckbox.dataset.personKey;
    if (personCheckbox.checked) state.selectedPeople.add(key);
    else {
      state.selectedPeople.delete(key);
      state.representativeAffiliations.delete(key);
    }
    syncContactSelectionUI();
    return;
  }
  const majorCheckbox = event.target.closest('input[data-major-select]');
  if (majorCheckbox) {
    const keys = majorPersonKeys(majorCheckbox.dataset.categoryId, majorCheckbox.dataset.major);
    keys.forEach((key) => {
      if (majorCheckbox.checked) state.selectedPeople.add(key);
      else {
        state.selectedPeople.delete(key);
        state.representativeAffiliations.delete(key);
      }
    });
    syncContactSelectionUI();
    return;
  }
  const orgCheckbox = event.target.closest('input[data-org-select]');
  if (orgCheckbox) {
    const keys = orgPersonKeys(orgCheckbox.dataset.categoryId, Number(orgCheckbox.dataset.orgIndex));
    keys.forEach((key) => {
      if (orgCheckbox.checked) state.selectedPeople.add(key);
      else {
        state.selectedPeople.delete(key);
        state.representativeAffiliations.delete(key);
      }
    });
    syncContactSelectionUI();
  }
}

function orgPersonKeys(categoryId, orgIndex) {
  const category = state.categories.find((item) => item.id === categoryId);
  const org = category?.organizations?.[orgIndex];
  if (!org) return [];
  return unique(org.people.map((record) => record._personKey).filter(Boolean));
}

function uniqueOrgRecords(org) {
  const map = new Map();
  for (const record of org.people || []) {
    const key = String(record._personKey || "");
    if (key && !map.has(key)) map.set(key, record);
  }
  return [...map.values()];
}

function selectionStateForKeys(keys) {
  const total = keys.length;
  const count = keys.reduce((sum, key) => sum + (state.selectedPeople.has(key) ? 1 : 0), 0);
  return { total, count, all: total > 0 && count === total, some: count > 0 && count < total };
}

function syncContactSelectionUI() {
  if (!el.contactBrowseView) return;
  el.contactBrowseView.querySelectorAll('input[data-person-key]').forEach((checkbox) => {
    checkbox.checked = state.selectedPeople.has(checkbox.dataset.personKey);
  });
  el.contactBrowseView.querySelectorAll('input[data-major-select]').forEach((checkbox) => {
    const current = selectionStateForKeys(majorPersonKeys(checkbox.dataset.categoryId, checkbox.dataset.major));
    checkbox.checked = current.all;
    checkbox.indeterminate = current.some;
    checkbox.setAttribute("aria-checked", current.some ? "mixed" : String(current.all));
  });
  el.contactBrowseView.querySelectorAll('input[data-org-select]').forEach((checkbox) => {
    const current = selectionStateForKeys(orgPersonKeys(checkbox.dataset.categoryId, Number(checkbox.dataset.orgIndex)));
    checkbox.checked = current.all;
    checkbox.indeterminate = current.some;
    checkbox.setAttribute("aria-checked", current.some ? "mixed" : String(current.all));
  });
  el.contactBrowseView.querySelectorAll('button[data-representative-affiliation]').forEach((button) => {
    const personKey = String(button.dataset.representativePerson || "");
    const affiliationKey = String(button.dataset.representativeAffiliation || "");
    const active = state.representativeAffiliations.get(personKey) === affiliationKey;
    const summary = button.dataset.representativeSummary || "소속 정보";
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `${summary} 대표 정보 ${active ? "해제" : "선택"}`);
    button.title = `${summary} 대표 정보 ${active ? "해제" : "선택"}`;
  });
  updateFilteredSelectionToggle();
  updateSelectedCount();
}

function updateFilteredSelectionToggle() {
  if (!state.contactFilter || !el.contactBrowseView) return;
  const button = el.contactBrowseView.querySelector('[data-search-selection-toggle]');
  if (!button) return;
  const people = filteredContactPeople();
  const selection = selectionStateForKeys(people.map((person) => person.key));
  button.textContent = selection.all ? "선택 해제" : "모두 선택";
  button.disabled = people.length === 0;
}

function toggleFilteredPeopleSelection() {
  const people = filteredContactPeople();
  if (!people.length) return;
  const keys = people.map((person) => person.key);
  const selection = selectionStateForKeys(keys);
  if (selection.all) {
    keys.forEach((key) => {
      state.selectedPeople.delete(key);
      state.representativeAffiliations.delete(key);
    });
  } else {
    keys.forEach((key) => state.selectedPeople.add(key));
  }
  syncContactSelectionUI();
}

function updateSelectedCount() {
  el.selectedPeopleCount.textContent = `${state.selectedPeople.size}개 선택`;
}

function summarizeAffiliations(person) {
  const paths = unique(person.affiliations.map(affiliationPath).filter(Boolean));
  if (paths.length <= 2) return paths.join(" · ");
  return `${paths[0]} · ${paths[1]} 외 ${paths.length - 2}개 소속`;
}

function restoreNameDecorationSettings() {
  const savedPrefix = localStorage.getItem(PREFIX_STORAGE_KEY) || "";
  const prefixEnabled = localStorage.getItem(PREFIX_ENABLED_STORAGE_KEY) === "true";
  const savedSuffix = localStorage.getItem(SUFFIX_STORAGE_KEY) || "";
  const suffixEnabled = localStorage.getItem(SUFFIX_ENABLED_STORAGE_KEY) === "true";
  el.namePrefixInput.value = savedPrefix;
  el.prefixEnabledOption.checked = prefixEnabled;
  el.nameSuffixInput.value = savedSuffix;
  el.suffixEnabledOption.checked = suffixEnabled;
  updateNameDecorationControls();
}

function updateNameDecorationControls() {
  const prefixEnabled = el.prefixEnabledOption.checked;
  const suffixEnabled = el.suffixEnabledOption.checked;
  el.namePrefixInput.disabled = !prefixEnabled;
  el.nameSuffixInput.disabled = !suffixEnabled;
  const prefix = el.namePrefixInput.value;
  const suffix = el.nameSuffixInput.value;
  el.namePreview.textContent = `미리보기: ${applyNameDecorations("박주성", prefixEnabled ? prefix : "", suffixEnabled ? suffix : "")}`;
  localStorage.setItem(PREFIX_STORAGE_KEY, prefix);
  localStorage.setItem(PREFIX_ENABLED_STORAGE_KEY, String(prefixEnabled));
  localStorage.setItem(SUFFIX_STORAGE_KEY, suffix);
  localStorage.setItem(SUFFIX_ENABLED_STORAGE_KEY, String(suffixEnabled));
}

function applyNameDecorations(name, prefix, suffix) {
  return `${String(prefix || "")}${name}${String(suffix || "")}`;
}

function updateOrganizationOptionLabel() {
  const organization = organizationName();
  el.organizationOptionName.textContent = organization || "기관명 없음";
  el.includeOrganizationOption.disabled = !organization;
  if (!organization) el.includeOrganizationOption.checked = false;
}

async function createVcardFile() {
  const selected = state.people.filter((person) => state.selectedPeople.has(person.key));
  if (!selected.length) {
    setVcardMessage("저장할 연락처를 한 개 이상 선택해 주세요.", true);
    return;
  }
  const options = {
    mobile: el.includeMobileOption.checked,
    extension: el.includeExtensionOption.checked,
    organization: el.includeOrganizationOption.checked,
    noteDataDate: el.noteDataDateOption.checked,
    noteAffiliations: el.noteAffiliationsOption.checked,
    noteTitleDuty: el.noteTitleDutyOption.checked,
    prefix: el.prefixEnabledOption.checked ? el.namePrefixInput.value : "",
    suffix: el.suffixEnabledOption.checked ? el.nameSuffixInput.value : "",
  };
  const cards = createVcardText(selected, options);
  const filename = `Dials_Contacts_${state.payload?.dataVersion || todayIso()}.vcf`;

  try {
    const delivery = await shareOrDownloadVcard(cards, filename);
    if (delivery === "shared") {
      setVcardMessage(`${selected.length}명의 연락처를 준비했습니다. iPhone에서는 메시지를 선택해 자신에게 보내 주세요.`, false, true);
    } else {
      setVcardMessage(`${selected.length}명의 연락처 파일을 만들었습니다. 내려받은 .vcf 파일을 열어 연락처에 추가해 주세요.`, false, true);
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      setVcardMessage("연락처 공유를 취소했습니다.", false, false);
      return;
    }
    console.error(error);
    setVcardMessage("연락처 파일을 전달하지 못했습니다. 다시 시도해 주세요.", true);
  }
}

function createVcardText(selected, options) {
  return selected.map((person) => makeVcard(person, options)).join("\r\n");
}

function representativeAffiliationForPerson(person) {
  const affiliationKey = state.representativeAffiliations.get(person?.key) || "";
  if (!affiliationKey) return null;
  return person?.affiliations?.find((affiliation) => affiliation.key === affiliationKey) || null;
}

function makeVcard(person, options) {
  const displayName = applyNameDecorations(person.name || "이름 없음", options.prefix, options.suffix);
  const contactRecord = person.recordType === "CONTACT";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "PRODID:-//Dials//Dials v0.7.4//KO",
    `FN:${vcardEscape(displayName)}`,
    // Keep a non-empty structured name for iOS Contacts. Dials stores one
    // display-name string rather than splitting Korean names into family/given
    // components, so the full visible name is placed in the family-name slot.
    `N:${vcardEscape(displayName)};;;;`,
  ];

  const mobiles = options.mobile ? unique(person.affiliations.map((a) => a.mobile).filter(Boolean)) : [];
  const extensions = options.extension ? unique(person.affiliations.map((a) => a.extension).filter(Boolean)) : [];
  extensions.forEach((number) => lines.push(`TEL;TYPE=WORK:${vcardEscape(number)}`));
  mobiles.forEach((number) => lines.push(`TEL;TYPE=${contactRecord ? "WORK" : "CELL"}:${vcardEscape(number)}`));

  const representative = representativeAffiliationForPerson(person);
  const organization = options.organization ? organizationName() : "";
  const department = representative ? affiliationDepartmentName(representative) : "";
  if (organization || department) {
    lines.push(`ORG:${vcardEscape(organization)}${department ? `;${vcardEscape(department)}` : ""}`);
  }
  if (!contactRecord && representative?.title) lines.push(`TITLE:${vcardEscape(representative.title)}`);

  const noteLines = [];
  if (options.noteDataDate || options.noteAffiliations || options.noteTitleDuty) noteLines.push("Dials");
  if (options.noteDataDate) noteLines.push(`데이터 기준일: ${state.payload?.dataVersion || "알 수 없음"}`);

  if (options.noteAffiliations) {
    noteLines.push("", "소속:");
    person.affiliations.forEach((affiliation) => {
      const path = affiliationPath(affiliation) || affiliation.categoryLabel || "소속 없음";
      const detail = options.noteTitleDuty ? affiliationTitleDutyNote(affiliation) : "";
      noteLines.push(`- ${path}${detail ? ` — ${detail}` : ""}`);
    });
  } else if (options.noteTitleDuty) {
    const titles = unique(person.affiliations.map((affiliation) => String(affiliation.title || "").trim()).filter(Boolean));
    const duties = unique(person.affiliations.map((affiliation) => String(affiliation.duty || "").trim()).filter(Boolean));
    if (titles.length) {
      noteLines.push("", "직함:");
      titles.forEach((title) => noteLines.push(`- ${title}`));
    }
    if (duties.length) {
      noteLines.push("", "담당:");
      duties.forEach((duty) => noteLines.push(`- ${duty}`));
    }
  }

  if (noteLines.length) lines.push(`NOTE:${vcardEscape(noteLines.join("\n"))}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function affiliationTitleDutyNote(affiliation) {
  const title = String(affiliation?.title || "").trim();
  const duty = String(affiliation?.duty || "").trim();
  if (title && duty) return `${title} · 담당: ${duty}`;
  if (title) return title;
  if (duty) return `담당: ${duty}`;
  return "";
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

function isIOSLikeBrowser() {
  const ua = navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadDesktopMode;
}

const VCARD_MIME_TYPE = "text/vcard";

async function shareOrDownloadVcard(cards, filename) {
  // Real iPhone testing confirmed that a multi-contact VCF imports correctly
  // when the real text/vcard File is sent through Messages. Web content cannot
  // reliably force the iOS Contacts importer directly, so iOS uses the system
  // share sheet and the always-visible UI explains the Messages handoff.
  if (isIOSLikeBrowser() && typeof File === "function" && typeof navigator.share === "function") {
    const file = new File([cards], filename, { type: VCARD_MIME_TYPE });
    const shareData = { files: [file], title: "Dials 연락처" };
    const canShareFiles = typeof navigator.canShare !== "function" || navigator.canShare(shareData);
    if (canShareFiles) {
      try {
        await navigator.share(shareData);
        return "shared";
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        console.warn("vCard file sharing failed; falling back to download.", error);
      }
    }
  }

  const blob = new Blob([cards], { type: VCARD_MIME_TYPE });
  downloadBlob(blob, filename);
  return "downloaded";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), isIOSLikeBrowser() ? 60000 : 1500);
}

function setVcardMessage(message, isError = false, isSuccess = false) {
  el.vcardMessage.textContent = message;
  el.vcardMessage.className = `form-message${isError ? " error" : ""}${isSuccess ? " success" : ""}`;
}

function showModal({ title, body, actions = [] }) {
  if (el.modalBackdrop.classList.contains("hidden")) {
    state.modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
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
  window.setTimeout(() => {
    const target = el.modalBody.querySelector('input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')
      || el.modalActions.querySelector('button:not([disabled])')
      || el.modalCloseButton;
    target?.focus();
  }, 10);
}

function closeModal() {
  if (el.modalBackdrop.classList.contains("hidden")) return;
  el.modalBackdrop.classList.add("hidden");
  el.modalBackdrop.setAttribute("aria-hidden", "true");
  const returnFocus = state.modalReturnFocus;
  state.modalReturnFocus = null;
  const visibleReturnFocus = returnFocus?.isConnected && returnFocus.offsetParent !== null ? returnFocus : null;
  const fallbackFocus = el.menuButton?.isConnected && el.menuButton.offsetParent !== null ? el.menuButton : null;
  const target = visibleReturnFocus || fallbackFocus;
  if (target) window.setTimeout(() => target.focus(), 0);
}

function trapModalFocus(event) {
  const focusable = [...el.modalPanel.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter((node) => node.offsetParent !== null);
  if (!focusable.length) {
    event.preventDefault();
    el.modalPanel.focus?.();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function setUnlockMessage(message, isError = false, isSuccess = false) {
  el.unlockMessage.textContent = message;
  el.unlockMessage.className = `form-message${isError ? " error" : ""}${isSuccess ? " success" : ""}`;
}

function affiliationPath(a) {
  return unique([String(a.major || "").trim(), String(a.minor || "").trim()].filter(Boolean)).join(" / ");
}

function tokenize(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean);
}

function normalizeText(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
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

async function dbDelete(key) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
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

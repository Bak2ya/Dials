"use strict";

(() => {
  try {
    const saved = localStorage.getItem("dialsThemePreference");
    document.documentElement.dataset.theme = ["light", "dark", "black"].includes(saved) ? saved : "system";
  } catch {
    document.documentElement.dataset.theme = "system";
  }
})();

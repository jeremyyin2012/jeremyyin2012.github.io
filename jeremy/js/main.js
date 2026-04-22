document.addEventListener("DOMContentLoaded", function () {
  setupSearchLayer();
  setupCodeBlocks();
  setupTables();
});

function setupSearchLayer() {
  const layer = document.getElementById("site-search");
  const panel = layer ? layer.querySelector("[data-search-panel]") : null;
  const openers = Array.from(document.querySelectorAll("[data-search-toggle]"));
  const closers = Array.from(document.querySelectorAll("[data-search-close]"));
  const inertTargets = Array.from(document.querySelectorAll("header, main, footer"));
  let triggerElement = null;

  if (!layer || !panel || openers.length === 0) {
    return;
  }

  const getFocusableElements = function () {
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled]):not([type='hidden'])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    return Array.from(layer.querySelectorAll(selector)).filter(function (element) {
      return !element.hasAttribute("hidden") && element.offsetParent !== null;
    });
  };

  const focusInput = function () {
    window.setTimeout(function () {
      const input = layer.querySelector(".search-input, .ais-search-box--input");
      if (input) {
        input.focus();
        return;
      }
      panel.focus();
    }, 60);
  };

  const restoreFocus = function () {
    if (triggerElement && typeof triggerElement.focus === "function") {
      triggerElement.focus();
    }
    triggerElement = null;
  };

  const resetSearchState = function () {
    const input = layer.querySelector(".search-input, .ais-search-box--input");
    const hits = layer.querySelector("#search-hits");
    const stats = layer.querySelector("#search-stats");
    const empty = layer.querySelector("#search-empty");

    layer.dispatchEvent(new Event("search:clear"));

    if (input) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (hits) {
      hits.innerHTML = "";
    }

    if (stats) {
      stats.textContent = "";
    }

    if (empty) {
      empty.hidden = false;
    }
  };

  const openWithTrigger = function (trigger) {
    if (trigger) {
      triggerElement = trigger;
    }
    setOpen(true);
  };

  const handleFocusTrap = function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      panel.focus();
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
  };

  const setOpen = function (open) {
    layer.hidden = !open;
    layer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("is-overlay-open", open);
    inertTargets.forEach(function (element) {
      if (open) {
        element.setAttribute("inert", "");
        element.setAttribute("aria-hidden", "true");
      } else {
        element.removeAttribute("inert");
        element.removeAttribute("aria-hidden");
      }
    });

    if (open) {
      layer.addEventListener("keydown", handleFocusTrap);
      focusInput();
      return;
    }
    layer.removeEventListener("keydown", handleFocusTrap);
    resetSearchState();
    restoreFocus();
  };

  openers.forEach(function (button) {
    button.addEventListener("click", function () {
      openWithTrigger(button);
    });
  });

  closers.forEach(function (button) {
    button.addEventListener("click", function () {
      setOpen(false);
    });
  });

  layer.addEventListener("click", function (event) {
    if (event.target.closest(".post-link")) {
      setOpen(false);
    }
  });

  const isTypingTarget = function (element) {
    if (!element) {
      return false;
    }

    const tagName = element.tagName;
    return tagName === "INPUT" || tagName === "TEXTAREA" || element.isContentEditable;
  };

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !layer.hidden) {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    const openByShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
    if (openByShortcut) {
      event.preventDefault();
      const firstToggle = openers.length > 0 ? openers[0] : null;
      openWithTrigger(firstToggle);
      return;
    }

    if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      const firstToggle = openers.length > 0 ? openers[0] : null;
      openWithTrigger(firstToggle);
    }
  });
}

function setupCodeBlocks() {
  const blocks = document.querySelectorAll(".article-body pre");

  blocks.forEach(function (pre) {
    let shell = pre.closest(".highlight");

    if (!shell) {
      shell = document.createElement("div");
      shell.className = "highlight highlight-plain";
      pre.parentNode.insertBefore(shell, pre);
      shell.appendChild(pre);
    }

    if (shell.querySelector(".code-block-head")) {
      return;
    }

    const code = pre.querySelector("code");
    const language = inferLanguage(code);
    const head = document.createElement("div");
    const label = document.createElement("span");
    const button = document.createElement("button");

    head.className = "code-block-head";
    label.className = "code-block-label";
    button.className = "code-block-copy";
    button.type = "button";
    button.textContent = "Copy";

    label.textContent = language;
    head.appendChild(label);
    head.appendChild(button);
    shell.insertBefore(head, shell.firstChild);
    shell.dataset.language = language.toLowerCase();

    button.addEventListener("click", function () {
      const text = code ? code.innerText : pre.innerText;

      if (!navigator.clipboard) {
        return;
      }

      navigator.clipboard.writeText(text).then(function () {
        button.textContent = "Copied";
        window.setTimeout(function () {
          button.textContent = "Copy";
        }, 1600);
      });
    });
  });
}

function inferLanguage(code) {
  if (!code) {
    return "Code";
  }

  const dataLang = code.dataset.lang;
  if (dataLang) {
    return normalizeLanguageLabel(dataLang);
  }

  const classMatch = Array.from(code.classList).find(function (className) {
    return className.indexOf("language-") === 0;
  });

  if (classMatch) {
    return normalizeLanguageLabel(classMatch.replace("language-", ""));
  }

  return "Code";
}

function normalizeLanguageLabel(language) {
  const normalized = language.toLowerCase();
  const labels = {
    py: "Python",
    python: "Python",
    rs: "Rust",
    rust: "Rust",
    shell: "Shell",
    sh: "Shell",
    bash: "Shell",
    zsh: "Shell",
    console: "Shell",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    toml: "TOML",
    sql: "SQL"
  };

  return labels[normalized] || language.toUpperCase();
}

function setupTables() {
  const tables = document.querySelectorAll(".article-body table");

  tables.forEach(function (table) {
    if (table.parentElement && table.parentElement.classList.contains("table-scroll")) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

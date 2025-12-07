/* main.js — TOSX SPA core
   Boot + Login + Terminal engine + Commands + Notes + Projects
   Put this file in the repo root as main.js
*/

(function () {
  "use strict";

  /* ======= Config ======= */
  const CONFIG = {
    validUsername: "andrfp.co",
    notesStorageKey: "tosx_notes",
    projectsUrl: "projects.json",
    initialNotesUrl: "notes.json",
    bootDelayMs: 80
  };

  /* ======= DOM Refs ======= */
  const $ = selector => document.querySelector(selector);
  const bootLogEl = $("#boot-log");
  const loginPanelEl = $("#login-panel");
  const loginInputEl = $("#login-input");
  const loginStatusEl = $("#login-status");
  const appRootEl = $("#app-root");
  const terminalHistoryEl = $("#terminal-history");
  const terminalInputEl = $("#terminal-input");
  const terminalPromptEl = $("#terminal-prompt");
  const terminalWindowEl = $("#terminal-window");

  /* ======= Small helpers ======= */
  const safe = s => String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  /* ======= Terminal history buffer & rendering ======= */
  let historyBuffer = [];
  function renderHistory() {
    // historyBuffer contains HTML strings already
    terminalHistoryEl.innerHTML = historyBuffer.join("<br>");
    terminalHistoryEl.scrollTop = terminalHistoryEl.scrollHeight;
  }

  function appendHistoryHtml(html) {
    if (!html) return;
    historyBuffer.push(html);
    renderHistory();
  }

  function appendHistoryText(text, cls = "") {
    const html = `<span class="terminal-line ${cls}">${safe(text)}</span>`;
    appendHistoryHtml(html);
  }

  function appendCommandEcho(cmdLine) {
    const html = `<span class="terminal-line echo"><span class="cmd-echo">${safe(cmdLine)}</span></span>`;
    appendHistoryHtml(html);
  }

  /* ======= Boot sequence & login ======= */
  const BOOT_LINES = [
    "POST: CPU.. OK",
    "POST: MEM.. OK",
    "POST: GPU.. OK",
    "Mounting virtual FS...",
    "Loading kernel modules: [init] [term] [ui] ...",
    "Network: offline (local-only SPA)",
    "Security: sandbox ok",
    () => `User agent: ${navigator.userAgent.split(" ")[0]}`,
    "Welcome to TOSX — terminal SPA by andrfp.co"
  ];

  async function playBootSequence() {
    if (!bootLogEl) return;
    bootLogEl.textContent = "Initializing TOSX — andrfp.co";
    for (let i = 0; i < BOOT_LINES.length; i++) {
      const line = BOOT_LINES[i];
      await sleep(CONFIG.bootDelayMs + Math.random() * (CONFIG.bootDelayMs));
      bootLogEl.textContent += "\n" + (typeof line === "function" ? line() : line);
      bootLogEl.parentElement && (bootLogEl.parentElement.scrollTop = bootLogEl.parentElement.scrollHeight);
    }
    // finalize boot
    bootLogEl.textContent += "\n\n-- login required --";
    bootLogEl.parentElement && (bootLogEl.parentElement.scrollTop = bootLogEl.parentElement.scrollHeight);
    // reveal login panel visually (CSS handles animation)
    if (loginPanelEl) {
      loginPanelEl.setAttribute("aria-hidden", "false");
      loginPanelEl.style.opacity = 0;
      // tiny tick before fade
      await sleep(60);
      loginPanelEl.style.transition = "opacity 0.45s ease";
      loginPanelEl.style.opacity = 1;
      loginInputEl && loginInputEl.focus();
    }
  }

  async function revealApp(username) {
    // hide boot root for cleaner show
    const bootRoot = document.getElementById("boot-root");
    try { if (bootRoot) bootRoot.style.display = "none"; } catch (e) { /* ignore */ }
    if (appRootEl) {
      appRootEl.hidden = false;
      appRootEl.removeAttribute("aria-hidden");
    }
    // welcome into terminal history
    appendHistoryText(`Welcome ${username}. Type 'help' to begin.`, "muted");
    // auto-focus terminal input
    setTimeout(() => terminalInputEl && terminalInputEl.focus(), 60);
  }

  function handleLoginAttempt(rawName) {
    const name = (rawName || "").trim();
    if (!name) {
      loginStatusEl && (loginStatusEl.textContent = "Please enter a username.");
      return;
    }
    if (name === CONFIG.validUsername) {
      loginStatusEl && (loginStatusEl.textContent = "Access granted. Booting terminal...");
      setTimeout(() => {
        revealApp(name);
        window.dispatchEvent(new CustomEvent("tosx:loginSuccess", { detail: { username: name } }));
      }, 700);
    } else {
      loginStatusEl && (loginStatusEl.textContent = "Access denied. Invalid username.");
      bootLogEl && (bootLogEl.textContent += `\n[auth] failed login attempt: ${name}`);
      // hint after 3 fails
      const failures = parseInt(sessionStorage.getItem("tosx_failures") || "0", 10) + 1;
      sessionStorage.setItem("tosx_failures", failures);
      if (failures >= 3) {
        bootLogEl && (bootLogEl.textContent += `\n[hint] username looks like a domain: try '${CONFIG.validUsername}'`);
        window.dispatchEvent(new CustomEvent("tosx:loginFailure", { detail: { attempt: failures, last: name } }));
      }
    }
  }

  /* ======= Notes storage loader (initial import) ======= */
  async function ensureNotesLoaded() {
    const stored = localStorage.getItem(CONFIG.notesStorageKey);
    if (stored) return; // already have notes persisted
    try {
      const res = await fetch(CONFIG.initialNotesUrl);
      if (!res.ok) return;
      const arr = await res.json();
      // normalize to strings or objects
      const notes = arr.map(n => (typeof n === "string" ? { title: n, content: "" } : n));
      localStorage.setItem(CONFIG.notesStorageKey, JSON.stringify(notes));
    } catch (e) {
      // ignore — notes optional
    }
  }

  function getNotes() {
    try {
      const raw = localStorage.getItem(CONFIG.notesStorageKey) || "[]";
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  function saveNotes(notes) {
    localStorage.setItem(CONFIG.notesStorageKey, JSON.stringify(notes));
  }

  /* ======= Projects loader ======= */
  async function loadProjects() {
    try {
      const res = await fetch(CONFIG.projectsUrl);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    } catch (e) {
      return [];
    }
  }

  /* ======= Terminal Command System ======= */
  const COMMANDS = {};

  // helper to register command quickly
  function registerCommand(name, desc, handler) {
    COMMANDS[name] = { desc: desc || "", action: handler };
  }

  // register built-ins
  registerCommand("help", "List available commands", async () => {
    return Object.keys(COMMANDS).map(k => `${k} - ${COMMANDS[k].desc}`).join("\n");
  });

  registerCommand("about", "Show info about this SPA", async (args) => {
    if (args && args[0] && args[0].toLowerCase() === "secret") {
      return "👾 You found the hidden TOSX easter egg! Keep exploring.";
    }
    return "TOSX Terminal SPA — clean professional + hacker hybrid. Built by andrfp.co";
  });

  registerCommand("clear", "Clear the terminal or use 'clear reset' to clear storage", async (args) => {
    if (args && args[0] && args[0].toLowerCase() === "reset") {
      historyBuffer.length = 0;
      renderHistory();
      localStorage.clear();
      return "[terminal] reset complete (localStorage cleared).";
    }
    historyBuffer.length = 0;
    renderHistory();
    return "";
  });

  registerCommand("docs", "Show docs / README link", async () => {
    return "Docs: https://github.com/andrfp-co/tosx/blob/main/README.md";
  });

  // projects command (list / open / random)
  registerCommand("projects", "List projects. Use 'projects open <n>' or 'projects random'", async (args) => {
    const projects = await loadProjects();
    if (!projects.length) return "[projects] no projects yet";
    if (!args || args.length === 0) {
      // list
      return projects.map((p, i) => `${i + 1}: ${p.name}`).join("\n") + "\nUse 'projects open <number>' to view details";
    }
    const sub = args[0].toLowerCase();
    if (sub === "open") {
      const idx = parseInt(args[1], 10);
      if (isNaN(idx) || idx < 1 || idx > projects.length) {
        return "[projects] invalid project number";
      }
      const p = projects[idx - 1];
      return `--- Project #${idx} ---\nName: ${p.name}\nDescription: ${p.description || "N/A"}\nLink: ${p.link || "N/A"}`;
    }
    if (sub === "random") {
      const rand = projects[Math.floor(Math.random() * projects.length)];
      return `Random Project → ${rand.name}: ${rand.description || "N/A"}`;
    }
    return "[projects] unknown subcommand. Use: open <n> | random";
  });

  // notes command: list, add, del, edit, clear, view
  registerCommand("notes", "Local notes (notes add|del|edit|view|clear)", async (args) => {
    await ensureNotesLoaded();
    const notes = getNotes();
    if (!args || args.length === 0) {
      if (!notes.length) return "[notes] no notes yet";
      return notes.map((n, i) => `${i + 1}: ${n.title || n}`).join("\n");
    }
    const sub = args[0].toLowerCase();
    if (sub === "add") {
      const rest = args.slice(1).join(" ").trim();
      if (!rest) return "[notes] usage: notes add <title>";
      notes.push({ title: rest, content: "" });
      saveNotes(notes);
      return `[notes] added note #${notes.length}: ${rest}`;
    }
    if (sub === "del" || sub === "delete") {
      const idx = parseInt(args[1], 10);
      if (isNaN(idx) || idx < 1 || idx > notes.length) return "[notes] invalid index";
      const removed = notes.splice(idx - 1, 1);
      saveNotes(notes);
      return `[notes] deleted note #${idx}: ${removed[0].title || removed[0]}`;
    }
    if (sub === "edit") {
      const idx = parseInt(args[1], 10);
      if (isNaN(idx) || idx < 1 || idx > notes.length) return "[notes] invalid index";
      const newText = args.slice(2).join(" ").trim();
      if (!newText) return "[notes] usage: notes edit <index> <new title>";
      notes[idx - 1].title = newText;
      saveNotes(notes);
      return `[notes] edited note #${idx}`;
    }
    if (sub === "view") {
      const idx = parseInt(args[1], 10);
      if (isNaN(idx) || idx < 1 || idx > notes.length) return "[notes] invalid index";
      const n = notes[idx - 1];
      const content = n.content || "(no content)";
      return `--- Note #${idx} ---\nTitle: ${n.title}\n\n${content}`;
    }
    if (sub === "clear") {
      saveNotes([]);
      return "[notes] all notes cleared";
    }
    return "[notes] unknown subcommand. Use add|del|edit|view|clear";
  });

  /* ======= Terminal input/execution === */
  let commandHistory = [];
  let historyIndex = -1;
  let lastTabMatches = [];
  let lastTabIndex = -1;

  async function executeCommandLine(raw) {
    if (!raw || !raw.trim()) return;
    const line = raw.trim();
    // echo
    appendCommandEcho(line);
    // parse
    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    // track history
    commandHistory.push(line);
    historyIndex = commandHistory.length;

    if (COMMANDS[cmd]) {
      try {
        const result = await COMMANDS[cmd].action(args);
        if (result) {
          // format output: preserve newlines
          // allow simple markup from command output (we do escape text)
          const safeHtml = safe(result).replace(/\n/g, "<br>");
          appendHistoryHtml(`<span class="terminal-line output">${safeHtml}</span>`);
        }
      } catch (e) {
        appendHistoryText(`[error] command ${cmd} failed: ${e.message}`, "error");
      }
    } else {
      appendHistoryText(`[error] command not found: ${cmd}`, "error");
    }
  }

  /* ======= Autocomplete & arrow history handlers ======= */
  function handleTabAutocomplete(e) {
    e.preventDefault();
    const cur = terminalInputEl.value.trim();
    if (!cur) {
      // list available commands
      appendHistoryHtml(`<span class="terminal-line help">${Object.keys(COMMANDS).join("    ")}</span>`);
      return;
    }
    const matches = Object.keys(COMMANDS).filter(c => c.startsWith(cur));
    if (matches.length === 0) return;
    if (matches.length === 1) {
      terminalInputEl.value = matches[0] + " ";
      return;
    }
    // multiple — cycle through lastTabMatches
    if (JSON.stringify(matches) !== JSON.stringify(lastTabMatches)) {
      lastTabMatches = matches;
      lastTabIndex = 0;
    } else {
      lastTabIndex = (lastTabIndex + 1) % matches.length;
    }
    terminalInputEl.value = lastTabMatches[lastTabIndex] + " ";
    appendHistoryHtml(`<span class="terminal-line help">${matches.join("    ")}</span>`);
  }

  function handleArrowKeys(e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      historyIndex = Math.max(0, historyIndex - 1);
      terminalInputEl.value = commandHistory[historyIndex] || "";
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      historyIndex = Math.min(commandHistory.length, historyIndex + 1);
      terminalInputEl.value = commandHistory[historyIndex] || "";
    }
  }

  /* ======= Bind terminal input events ======= */
  function wireTerminalInput() {
    if (!terminalInputEl) return;
    terminalInputEl.addEventListener("keydown", async (ev) => {
      if (ev.key === "Enter") {
        const val = terminalInputEl.value;
        terminalInputEl.value = "";
        lastTabMatches = [];
        lastTabIndex = -1;
        await executeCommandLine(val);
      } else if (ev.key === "Tab") {
        handleTabAutocomplete(ev);
      } else if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
        handleArrowKeys(ev);
      }
    });

    // focus/blur prompt class
    terminalInputEl.addEventListener("focus", () => {
      terminalPromptEl && terminalPromptEl.classList.add("prompt-active");
      terminalWindowEl && terminalWindowEl.setAttribute("data-hover", "true");
    });
    terminalInputEl.addEventListener("blur", () => {
      terminalPromptEl && terminalPromptEl.classList.remove("prompt-active");
      terminalWindowEl && terminalWindowEl.setAttribute("data-hover", "false");
    });
  }

  /* ======= Small UI controls ======= */
  function wireLoginInput() {
    if (!loginInputEl) return;
    loginInputEl.addEventListener("keydown", ev => {
      if (ev.key === "Enter") {
        handleLoginAttempt(loginInputEl.value);
        loginInputEl.value = "";
      }
    });
    loginInputEl.addEventListener("paste", ev => {
      setTimeout(() => {
        const val = loginInputEl.value.trim();
        if (val && val === CONFIG.validUsername) {
          handleLoginAttempt(val);
          loginInputEl.value = "";
        }
      }, 60);
    });
  }

  /* ======= Init sequence ======= */
  async function init() {
    // wire inputs
    wireLoginInput();
    wireTerminalInput();

    // prepare notes (load initial notes.json into localStorage if empty)
    await ensureNotesLoaded();

    // play boot
    await playBootSequence();

    // ensure terminal input focus when login success
    window.addEventListener("tosx:loginSuccess", () => {
      appendHistoryText("Type 'help' to see commands.", "muted");
    });

    // auto-focus terminal input on load
    window.addEventListener("load", () => {
      try { terminalInputEl && terminalInputEl.focus(); } catch (e) { /* ignore */ }
    });

    // small UX: click on terminal window focuses input
    if (terminalWindowEl) {
      terminalWindowEl.addEventListener("click", () => terminalInputEl && terminalInputEl.focus());
    }
  }

  /* ======= Start it up ======= */
  document.addEventListener("DOMContentLoaded", () => {
    // attach main init
    init().catch(err => {
      console.error("TOSX init failed:", err);
      appendHistoryText(`[error] initialization failed: ${err.message}`, "error");
    });
  });

  /* ======= Expose for debugging (dev only) ======= */
  window.TOSX = {
    executeCommandLine,
    appendHistoryText,
    appendHistoryHtml,
    getProjects: loadProjects,
    getNotes,
    saveNotes,
    config: CONFIG
  };

})();



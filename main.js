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
  const terminalBoxEl = $("#terminal-box");
  const notesContainerEl = $("#notes-container");
  const notesEditorEl = $("#notes-editor");
  const notesStatusEl = $("#notes-status");

<script>
// Boot + Login JS
(function(){
  const bootLog = document.getElementById('boot-log');
  const loginPanel = document.getElementById('login-panel');
  const loginInput = document.getElementById('login-input');
  const loginStatus = document.getElementById('login-status');
  const appRoot = document.getElementById('app-root');
  const bootScreen = document.getElementById('boot-screen');

  const BOOT_LINES = [
    "POST: CPU.. OK",
    "POST: MEM.. OK",
    "POST: GPU.. OK",
    "Mounting virtual FS...",
    "Loading kernel modules: [init] [term] [ui] ...",
    "Network: offline (local-only SPA)",
    "Security: sandbox ok",
    "User agent: " + navigator.userAgent.split(' ')[0],
    "Welcome to TOSX — terminal SPA by andrfp.co"
  ];

  function playBootSequence(lines, opts = {}) {
    const delay = opts.delay || 120;
    let i = 0;
    function next() {
      if(i >= lines.length){ finishBoot(); return; }
      bootLog.textContent += "\n" + lines[i++];
      if (bootLog.parentElement) bootLog.parentElement.scrollTop = bootLog.parentElement.scrollHeight;
      setTimeout(next, delay + Math.random()*delay);
    }
    setTimeout(next, 250);
  }

  function finishBoot(){
    bootScreen.setAttribute('data-state','login');
    loginPanel.setAttribute('aria-hidden','false');
    setTimeout(()=> loginInput.focus(), 50);
    bootLog.textContent += "\n\n-- login required --";
  }

  const VALID_USERNAME = "andrfp.co";
  let failureCount = 0;

  function handleLoginAttempt(rawName){
    const name = (rawName || '').trim();
    if(!name){ loginStatus.textContent="Please enter a username."; return; }
    if(name === VALID_USERNAME){
      loginStatus.textContent="Access granted. Booting terminal...";
      setTimeout(() => {
        revealApp(name);
        window.dispatchEvent(new CustomEvent('tosx:loginSuccess',{detail:{username:name}}));
      },700);
    } else {
      failureCount++;
      loginStatus.textContent="Access denied. Invalid username.";
      bootLog.textContent += "\n[auth] failed login attempt: " + name;
      if(failureCount >= 3){
        bootLog.textContent += "\n[hint] username looks like a domain: try 'andrfp.co'";
        window.dispatchEvent(new CustomEvent('tosx:loginFailure',{detail:{attempt:failureCount,last:name}}));
      }
    }
  }

  function revealApp(username){
    bootScreen.style.display = 'none';
    appRoot.hidden = false;
    appRoot.removeAttribute('aria-hidden');
    const th = document.getElementById('terminal-history');
    th.textContent = `Welcome ${username}. Type 'help' to begin.\n`;
    document.getElementById('terminal-input').focus();
  }

  loginInput.addEventListener('keydown', ev => {
    if(ev.key==='Enter'){
      handleLoginAttempt(loginInput.value);
      loginInput.value='';
    }
  });

  loginInput.addEventListener('paste', ev => {
    setTimeout(()=>{
      const val = loginInput.value.trim();
      if(val && val === VALID_USERNAME){
        handleLoginAttempt(val);
        loginInput.value='';
      }
    },80);
  });

  playBootSequence(BOOT_LINES,{delay:100});
})();
  // Terminal Engine
(function(){
  const input = document.getElementById('terminal-input');
  const history = document.getElementById('terminal-history');
  const PROMPT = "andrfp:~$";

  const COMMANDS = {
    help: {
      desc: "List available commands",
      action: () => {
        return Object.keys(COMMANDS)
          .map(c=>`${c} - ${COMMANDS[c].desc}`).join('\n');
      }
    },
    about: {
      desc: "About this SPA terminal",
      action: () => "TOSX Terminal SPA by andrfp.co — clean professional + hacker hybrid OS."
    },
    projects: {
      desc: "List your projects from JSON",
      action: async () => {
        try {
          const res = await fetch('data/projects.json');
          const projects = await res.json();
          if(!projects.length) return "[projects] no projects yet";
          return projects.map(p=>`- ${p.name}: ${p.description}`).join('\n');
        } catch(e){
          return "[projects] failed to load";
        }
      }
    },
    notes: {
      desc: "Local notes app (saved in localStorage)",
      action: () => {
        let notes = JSON.parse(localStorage.getItem('tosx_notes')||'[]');
        if(!notes.length) return "[notes] no notes yet";
        return notes.map((n,i)=>`${i+1}: ${n}`).join('\n');
      }
    },
    clear: {
      desc: "Clear terminal screen",
      action: () => {
        history.textContent='';
        return '';
      }
    },
    docs: {
      desc: "Open TOSX documentation (sample)",
      action: () => "Docs: https://github.com/andrfp-co/tosx/blob/main/README.md"
    }
  };

  const historyBuffer = [];

  function appendHistory(text){
    if(!text) return;
    historyBuffer.push(text);
    history.textContent = historyBuffer.join('\n');
    history.scrollTop = history.scrollHeight;
  }

  async function executeCommand(cmd){
    cmd = (cmd||'').trim();
    if(!cmd) return;
    appendHistory(PROMPT+" "+cmd);

    const [base, ...args] = cmd.split(' ');
    if(COMMANDS[base]){
      const result = await COMMANDS[base].action(args);
      if(result) appendHistory(result);
    } else {
      appendHistory(`[error] command not found: ${base}`);
    }
  }

  // Autocomplete: tab key
  input.addEventListener('keydown', e => {
    if(e.key === 'Enter'){
      executeCommand(input.value);
      input.value='';
    } else if(e.key === 'Tab'){
      e.preventDefault();
      const val = input.value.trim();
      const matches = Object.keys(COMMANDS).filter(c=>c.startsWith(val));
      if(matches.length===1){
        input.value = matches[0]+' ';
      } else if(matches.length>1){
        appendHistory(matches.join('    '));
      }
    }
  });

  // Initialize
  window.addEventListener('tosx:loginSuccess',()=> {
    appendHistory("Type 'help' to see commands.");
  });
})();
  // Notes App Integration
(function(){
  const LOCAL_STORAGE_KEY = 'tosx_notes';

  function getNotes(){
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  }

  function saveNotes(notes){
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
  }

  // Extend COMMANDS.notes to accept subcommands
  const NOTES_COMMAND = COMMANDS.notes;
  const originalAction = NOTES_COMMAND.action;

  NOTES_COMMAND.action = async (args=[]) => {
    const notes = getNotes();
    if(args.length===0){
      // no args, default list behavior
      return originalAction();
    }

    const subcmd = args[0].toLowerCase();
    switch(subcmd){
      case 'add':
        const note = args.slice(1).join(' ');
        if(!note) return "[notes] usage: notes add <text>";
        notes.push(note);
        saveNotes(notes);
        return `[notes] added note #${notes.length}`;
      case 'del':
      case 'delete':
        const index = parseInt(args[1]);
        if(isNaN(index) || index < 1 || index > notes.length)
          return "[notes] invalid index";
        const removed = notes.splice(index-1,1);
        saveNotes(notes);
        return `[notes] deleted note #${index}: ${removed}`;
      case 'edit':
        const idx = parseInt(args[1]);
        if(isNaN(idx) || idx < 1 || idx > notes.length) return "[notes] invalid index";
        const newText = args.slice(2).join(' ');
        if(!newText) return "[notes] usage: notes edit <index> <text>";
        notes[idx-1] = newText;
        saveNotes(notes);
        return `[notes] edited note #${idx}`;
      case 'clear':
        saveNotes([]);
        return "[notes] all notes cleared";
      default:
        return "[notes] unknown subcommand. Use: add|del|edit|clear";
    }
  };
})();
// Projects App Integration
(function(){
  const PROJECTS_COMMAND = COMMANDS.projects;
  const PROJECTS_URL = 'data/projects.json';

  // Extend the projects command to allow "projects open <index>"
  const originalProjectsAction = PROJECTS_COMMAND.action;

  PROJECTS_COMMAND.action = async (args=[]) => {
    let projects = [];
    try {
      const res = await fetch(PROJECTS_URL);
      projects = await res.json();
    } catch(e){
      return "[projects] failed to load projects.json";
    }

    if(args.length === 0){
      // default list view
      if(!projects.length) return "[projects] no projects yet";
      return projects.map((p,i)=>`${i+1}: ${p.name}`).join('\n') + "\nUse 'projects open <number>' to view details";
    }

    const subcmd = args[0].toLowerCase();
    if(subcmd === 'open'){
      const index = parseInt(args[1]);
      if(isNaN(index) || index < 1 || index > projects.length)
        return "[projects] invalid project number";
      const p = projects[index-1];
      return `--- Project #${index} ---\nName: ${p.name}\nDescription: ${p.description}\nLink: ${p.link||'N/A'}`;
    } else {
      return "[projects] unknown subcommand. Use: open <number>";
    }
  };
})();
// Terminal History & Enhanced Autocomplete
(function(){
  const input = document.getElementById('terminal-input');
  const historyBuffer = []; // already defined in PART 2, safe to reuse
  let commandHistory = [];
  let historyIndex = -1;

  // Listen to keydown for arrow navigation
  input.addEventListener('keydown', e => {
    if(e.key === 'ArrowUp'){
      e.preventDefault();
      if(commandHistory.length === 0) return;
      historyIndex = historyIndex <= 0 ? 0 : historyIndex-1;
      input.value = commandHistory[historyIndex];
    } else if(e.key === 'ArrowDown'){
      e.preventDefault();
      if(commandHistory.length === 0) return;
      historyIndex = historyIndex >= commandHistory.length-1 ? commandHistory.length-1 : historyIndex+1;
      input.value = commandHistory[historyIndex] || '';
    } else if(e.key === 'Tab'){
      e.preventDefault();
      const val = input.value.trim();
      const matches = Object.keys(COMMANDS).filter(c=>c.startsWith(val));
      if(matches.length === 1){
        input.value = matches[0]+' ';
      } else if(matches.length > 1){
        // Cycle through matches if multiple
        const current = input.dataset.tabMatch || '';
        let idx = matches.indexOf(current);
        idx = (idx + 1) % matches.length;
        input.value = matches[idx]+' ';
        input.dataset.tabMatch = matches[idx];
        appendHistory(matches.join('    '));
      }
    }
  });

  // Wrap original executeCommand to store in history
  const originalExecute = window.executeCommand;
  window.executeCommand = async function(cmd){
    if(cmd && cmd.trim()) commandHistory.push(cmd.trim());
    historyIndex = commandHistory.length;
    if(originalExecute) await originalExecute(cmd);
  };
})();

// Boot + Login Enhancements
(function(){
  const bootLog = document.getElementById('boot-log');
  const loginPanel = document.getElementById('login-panel');
  const loginInput = document.getElementById('login-input');

  // Blinking cursor
  const cursorChar = "_";
  let cursorVisible = true;
  setInterval(() => {
    if(document.hidden) return; // stop when tab inactive
    if(bootLog){
      if(cursorVisible){
        bootLog.textContent = bootLog.textContent.replace(cursorChar,'') + cursorChar;
      } else {
        bootLog.textContent = bootLog.textContent.replace(cursorChar,'');
      }
      cursorVisible = !cursorVisible;
    }
  }, 500);

  // Fade-in login panel smoothly after boot
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if(m.target.getAttribute('data-state') === 'login'){
        loginPanel.style.opacity = 0;
        loginPanel.style.transition = "opacity 0.6s ease-in-out";
        loginPanel.removeAttribute('aria-hidden');
        setTimeout(()=> loginPanel.style.opacity = 1, 50);
      }
    });
  });
  const bootScreen = document.getElementById('boot-screen');
  observer.observe(bootScreen, { attributes: true, attributeFilter: ['data-state'] });

  // Optional: subtle beep on login attempt
  loginInput.addEventListener('keydown', e => {
    if(e.key === 'Enter'){
      const audio = new Audio("https://freesound.org/data/previews/341/341695_62460-lq.mp3"); // tiny beep
      audio.volume = 0.1;
      audio.play().catch(()=>{});
    }
  });
// Terminal Output Enhancements
(function(){
  const historyEl = document.getElementById('terminal-history');

  // Wrap output lines in spans for styling later
  function formatOutput(text, type='normal'){
    const lines = text.split('\n');
    return lines.map(line => `<span class="terminal-line ${type}">${line}</span>`).join('\n');
  }

  // Override appendHistory to format
  const originalAppend = window.appendHistory;
  window.appendHistory = function(text, type='normal'){
    if(!text) return;
    const formatted = formatOutput(text, type);
    historyBuffer.push(formatted);
    historyEl.innerHTML = historyBuffer.join('<br>'); // use <br> to separate lines
    historyEl.scrollTop = historyEl.scrollHeight;
  };

  // Example: highlight project or note names
  const originalProjectsAction = COMMANDS.projects.action;
  COMMANDS.projects.action = async function(args=[]){
    let output = await originalProjectsAction(args);
    if(output && !output.startsWith('[projects]')){
      // Highlight project names
      output = output.replace(/^(\d+): (.+)$/gm, '<span class="project-index">$1</span>: <span class="project-name">$2</span>');
    }
    return output;
  };

  // Highlight notes numbers
  const originalNotesAction = COMMANDS.notes.action;
  COMMANDS.notes.action = async function(args=[]){
    let output = await originalNotesAction(args);
    if(output && !output.startsWith('[notes]')){
      output = output.replace(/^(\d+): (.+)$/gm, '<span class="note-index">$1</span>: <span class="note-text">$2</span>');
    }
    return output;
  };
})();
// Interactive Commands & Easter Eggs
(function(){
  // Extend 'about' command with hidden easter egg
  const aboutCmd = COMMANDS.about;
  const originalAbout = aboutCmd.action;

  aboutCmd.action = async function(args=[]){
    if(args[0] && args[0].toLowerCase() === 'secret'){
      return "👾 You found the hidden TOSX easter egg! Keep exploring and hacking.";
    }
    return await originalAbout(args);
  };

  // Extend 'projects' with 'random' subcommand
  const projectsCmd = COMMANDS.projects;
  const originalProjects = projectsCmd.action;

  projectsCmd.action = async function(args=[]){
    if(args[0] && args[0].toLowerCase() === 'random'){
      try {
        const res = await fetch('data/projects.json');
        const projects = await res.json();
        if(!projects.length) return "[projects] no projects yet";
        const rand = projects[Math.floor(Math.random()*projects.length)];
        return `Random Project → ${rand.name}: ${rand.description}`;
      } catch(e){
        return "[projects] failed to load";
      }
    }
    return await originalProjects(args);
  };

  // Extend 'clear' with optional reset
  const clearCmd = COMMANDS.clear;
  const originalClear = clearCmd.action;

  clearCmd.action = async function(args=[]){
    if(args[0] && args[0].toLowerCase() === 'reset'){
      historyBuffer.length = 0;
      localStorage.clear();
      return "[terminal] reset complete. Reloading SPA...";
    }
    return await originalClear(args);
  };

})();
// Final UX Enhancements
(function(){
  const input = document.getElementById('terminal-input');
  const historyEl = document.getElementById('terminal-history');

  // Auto-focus input on page load
  window.addEventListener('load', () => {
    input.focus();
  });

  // Smooth scroll terminal history
  const originalAppend = window.appendHistory;
  window.appendHistory = function(text, type='normal'){
    if(!text) return;
    if(originalAppend) originalAppend(text, type);
    historyEl.scrollTo({
      top: historyEl.scrollHeight,
      behavior: 'smooth'
    });
  };

  // Terminal prompt animations
  const prompt = document.getElementById('terminal-prompt');
  input.addEventListener('focus', () => {
    prompt.classList.add('prompt-active');
  });
  input.addEventListener('blur', () => {
    prompt.classList.remove('prompt-active');
  });

  // Optional: subtle hover effects on terminal window
  const termWindow = document.getElementById('terminal-window');
  termWindow.addEventListener('mouseenter', () => {
    termWindow.dataset.hover = "true";
  });
  termWindow.addEventListener('mouseleave', () => {
    termWindow.dataset.hover = "false";
  });

})();

</script>






// ===== main.js =====

// Command history buffer
let historyBuffer = [];

// Terminal elements
const terminalInput = document.getElementById('terminal-input');
const terminalHistory = document.getElementById('terminal-history');

// Commands definition
const COMMANDS = {
  help: {
    description: 'List available commands',
    action: async () => {
      return `Available commands:
help - show this
about - info about this SPA
projects - list projects
notes - list notes
clear - clear terminal`;
    }
  },
  about: {
    description: 'About this SPA',
    action: async () => {
      return "TOSX SPA by andrfp.co | Hacker Terminal + Retro OS Hybrid";
    }
  },
  clear: {
    description: 'Clear terminal history',
    action: async () => {
      historyBuffer.length = 0;
      terminalHistory.innerHTML = '';
      return '';
    }
  },
  notes: {
    description: 'Show notes',
    action: async () => {
      try {
        const res = await fetch('notes.json');
        const notes = await res.json();
        if(!notes.length) return "[notes] no notes found";
        return notes.map((n,i)=>`${i+1}: ${n.title}`).join('\n');
      } catch(e) {
        return "[notes] failed to load";
      }
    }
  },
  projects: {
    description: 'Show projects',
    action: async () => {
      try {
        const res = await fetch('projects.json');
        const projects = await res.json();
        if(!projects.length) return "[projects] no projects found";
        return projects.map((p,i)=>`${i+1}: ${p.name}`).join('\n');
      } catch(e) {
        return "[projects] failed to load";
      }
    }
  }
};

// Append text to terminal
function appendHistory(text){
  if(!text) return;
  historyBuffer.push(text);
  terminalHistory.innerHTML = historyBuffer.join('<br>');
  terminalHistory.scrollTop = terminalHistory.scrollHeight;
}

// Handle input
terminalInput.addEventListener('keydown', async (e)=>{
  if(e.key === 'Enter'){
    const cmd = terminalInput.value.trim().split(' ')[0];
    const args = terminalInput.value.trim().split(' ').slice(1);
    if(COMMANDS[cmd]){
      const output = await COMMANDS[cmd].action(args);
      appendHistory(`<span class="terminal-line"><span class="prompt">$ ${terminalInput.value}</span><br>${output}</span>`);
    } else {
      appendHistory(`<span class="terminal-line"><span class="prompt">$ ${terminalInput.value}</span><br>Command not found: ${cmd}</span>`);
    }
    terminalInput.value = '';
  }
});


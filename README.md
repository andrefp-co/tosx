# TOSX

A terminal-style operating system that runs in the browser: a boot sequence, a login screen and a desktop with a working shell. Plain HTML, CSS and JavaScript, no framework and no build step.

## Features

- **Boot and login.** A scripted boot log, then a login prompt. The username is `andrfp.co`.
- **Shell.** Command history with the arrow keys, autocomplete, and help text for every command.
- **Projects.** `projects` lists entries from `projects.json`; `projects open <n>` shows one.
- **Notes.** `notes add`, `notes edit`, `notes del` and `notes clear`, saved in the browser's local storage.

## Commands

| Command | What it does |
|---|---|
| `help` | Lists the commands |
| `about` | About TOSX |
| `projects` | Lists projects; `projects open <n>` for details |
| `notes` | Lists notes; `add <text>`, `edit <n> <text>`, `del <n>`, `clear` |

## Run it

Serve the folder with any static server and open it in a browser:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight from the file system works too, except for `projects`, which loads `projects.json` and needs a server.

## Files

| File | Purpose |
|---|---|
| `index.html` | Boot screen, login and desktop markup |
| `style.css` | Terminal and desktop styling |
| `main.js` | Boot sequence, login, shell, commands, history and autocomplete |
| `projects.json` | Data for the `projects` command |
| `notes.json` | Sample notes |

## Author

Andres Peña · [andres.swort.net](https://andres.swort.net)

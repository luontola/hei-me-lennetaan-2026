'use strict';

const NAME_STORAGE_KEY = 'heiMeLennetaan.playerName';

let playerName = loadPlayerName();
let leaderboards = null; // Map from form option to sorted entries; null until the first load
let pendingGame = null; // the game whose form opens after the name dialog
const expandedGames = new Set();
const gameCards = new Map();

// Player name

function cleanName(name) {
    return name.trim().replace(/\s+/g, ' ');
}

function nameKey(name) {
    return cleanName(name).toLocaleLowerCase('fi');
}

function loadPlayerName() {
    try {
        return cleanName(localStorage.getItem(NAME_STORAGE_KEY) || '');
    } catch {
        return '';
    }
}

function setPlayerName(name) {
    playerName = name;
    try {
        if (name) {
            localStorage.setItem(NAME_STORAGE_KEY, name);
        } else {
            localStorage.removeItem(NAME_STORAGE_KEY);
        }
    } catch {
        // The name then lasts only until the page is reloaded.
    }
    renderUserBar();
    renderLeaderboards();
}

// Sheet data

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (c === '"') {
                inQuotes = false;
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            row.push(field);
            field = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') {
                i++;
            }
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += c;
        }
    }
    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

function parseScore(value) {
    const s = value.replace(/\s/g, '').replace(',', '.');
    return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

function buildLeaderboards(rows) {
    const [header = [], ...data] = rows;
    const column = title => header.findIndex(h => h.trim() === title);
    const columns = CONFIG.sheet.columns;
    const nameIndex = column(columns.name);
    const gameIndex = column(columns.game);
    const scoreIndex = column(columns.score);
    const rejectedIndex = column(columns.rejected);
    if (nameIndex < 0 || gameIndex < 0 || scoreIndex < 0) {
        throw new Error(`Sheet is missing a column. Headers: ${header.join(', ')}`);
    }

    // Best score of each player in each game. Rows are in submission order.
    const players = new Map(CONFIG.games.map(game => [game.formOption, new Map()]));
    data.forEach((row, order) => {
        const gamePlayers = players.get((row[gameIndex] || '').trim());
        const name = cleanName(row[nameIndex] || '');
        const score = parseScore(row[scoreIndex] || '');
        const rejected = rejectedIndex >= 0 && (row[rejectedIndex] || '').trim() !== '';
        if (!gamePlayers || !name || !Number.isFinite(score) || rejected) {
            return;
        }
        const key = nameKey(name);
        const best = gamePlayers.get(key);
        if (!best || score > best.score) {
            gamePlayers.set(key, {key, name, score, order});
        } else {
            best.name = name; // show the latest spelling of the name
        }
    });

    const result = new Map();
    for (const [formOption, gamePlayers] of players) {
        // On equal scores, the player who got the score first is higher.
        const entries = [...gamePlayers.values()].sort((a, b) => b.score - a.score || a.order - b.order);
        entries.forEach((entry, i) => {
            const previous = entries[i - 1];
            entry.rank = previous && previous.score === entry.score ? previous.rank : i + 1;
        });
        result.set(formOption, entries);
    }
    return result;
}

let refreshing = false;

async function refresh() {
    if (refreshing) {
        return;
    }
    refreshing = true;
    try {
        const response = await fetch(CONFIG.sheet.csvUrl, {cache: 'no-store'});
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        leaderboards = buildLeaderboards(parseCsv(await response.text()));
        const time = new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute: '2-digit'});
        setStatus(`Tulokset päivitetty klo ${time}`, false);
    } catch (error) {
        console.error('Failed to load scores', error);
        setStatus('Tulosten päivitys epäonnistui. Yritetään pian uudelleen.', true);
    } finally {
        refreshing = false;
    }
    renderLeaderboards();
}

// Rendering

function setStatus(text, isError) {
    const status = document.getElementById('status');
    status.textContent = text;
    status.classList.toggle('is-error', isError);
}

function renderUserBar() {
    const nameElement = document.getElementById('user-name');
    nameElement.textContent = playerName ? `Hei, ${playerName}` : '';
    nameElement.hidden = !playerName;
    document.getElementById('logout-button').hidden = !playerName;
    document.getElementById('login-button').hidden = !!playerName;
}

function renderGames() {
    const container = document.getElementById('games');
    const template = document.getElementById('game-template');
    CONFIG.games.forEach((game, i) => {
        const card = template.content.firstElementChild.cloneNode(true);
        const number = String(i + 1).padStart(2, '0');
        card.querySelector('.game-label').textContent = `LÄHTÖ ${number} · GATE ${number}`;
        card.querySelector('.game-title').textContent = game.title;
        card.querySelector('.game-mode').textContent = game.mode;
        card.querySelector('.game-level').textContent = game.level;
        card.querySelector('.game-description').textContent = game.description || '';

        const imageBox = card.querySelector('.game-image');
        if (game.image) {
            const image = document.createElement('img');
            image.src = game.image;
            image.alt = `Kuvakaappaus pelistä ${game.title}`;
            image.loading = 'lazy';
            imageBox.append(image);
        } else {
            imageBox.classList.add('is-placeholder');
            imageBox.textContent = 'KUVA TULOSSA';
        }

        card.querySelector('.leaderboard-toggle').addEventListener('click', () => {
            if (!expandedGames.delete(game.formOption)) {
                expandedGames.add(game.formOption);
            }
            renderLeaderboards();
        });
        card.querySelector('.submit-button').addEventListener('click', () => submitScore(game));

        gameCards.set(game.formOption, card);
        container.append(card);
    });
}

function leaderboardRow(entry, isMe) {
    const row = document.createElement('li');
    row.className = 'leaderboard-row';
    row.classList.toggle('is-me', isMe);

    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = `${entry.rank}.`;

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = entry.name;
    if (isMe) {
        const tag = document.createElement('span');
        tag.className = 'me-tag';
        tag.textContent = 'SINÄ';
        name.append(tag);
    }

    const score = document.createElement('span');
    score.className = 'score';
    score.textContent = entry.score.toLocaleString('fi-FI');

    row.append(rank, name, score);
    return row;
}

function messageRow(className, text) {
    const row = document.createElement('li');
    row.className = className;
    row.textContent = text;
    return row;
}

function renderLeaderboards() {
    const myKey = playerName ? nameKey(playerName) : null;
    for (const game of CONFIG.games) {
        const card = gameCards.get(game.formOption);
        const list = card.querySelector('.leaderboard-list');
        const note = card.querySelector('.leaderboard-note');
        const toggle = card.querySelector('.leaderboard-toggle');

        if (!leaderboards) {
            list.replaceChildren(messageRow('leaderboard-empty', 'Ladataan…'));
            note.hidden = true;
            toggle.hidden = true;
            continue;
        }

        const entries = leaderboards.get(game.formOption);
        const expanded = expandedGames.has(game.formOption);
        const myIndex = entries.findIndex(entry => entry.key === myKey);
        const visible = expanded ? entries : entries.slice(0, CONFIG.topCount);

        const rows = visible.map((entry, i) => leaderboardRow(entry, i === myIndex));
        if (!expanded && myIndex >= CONFIG.topCount) {
            const gap = messageRow('leaderboard-gap', '⋯');
            gap.setAttribute('aria-hidden', 'true');
            rows.push(gap, leaderboardRow(entries[myIndex], true));
        }
        if (entries.length === 0) {
            rows.push(messageRow('leaderboard-empty', 'Ei vielä tuloksia – ole ensimmäinen!'));
        }
        list.replaceChildren(...rows);

        note.hidden = !(myKey && myIndex < 0 && entries.length > 0);
        note.textContent = 'Sinulla ei ole vielä tulosta tässä pelissä.';

        toggle.hidden = entries.length <= CONFIG.topCount;
        toggle.textContent = expanded ? 'Näytä vähemmän' : `Näytä kaikki (${entries.length})`;
    }
}

// Submitting a score

function openForm(game) {
    const url = new URL(CONFIG.form.url);
    url.searchParams.set('usp', 'pp_url');
    url.searchParams.set(CONFIG.form.nameField, playerName);
    url.searchParams.set(CONFIG.form.gameField, game.formOption);
    window.open(url, '_blank', 'noopener');
}

function submitScore(game) {
    if (playerName) {
        openForm(game);
    } else {
        openNameDialog(game);
    }
}

function openNameDialog(game) {
    pendingGame = game;
    const input = document.getElementById('name-input');
    input.value = playerName;
    document.getElementById('name-dialog').showModal();
    input.focus();
}

function initNameDialog() {
    const dialog = document.getElementById('name-dialog');
    const input = document.getElementById('name-input');

    document.getElementById('name-form').addEventListener('submit', event => {
        event.preventDefault();
        const name = cleanName(input.value);
        if (!name) {
            input.value = '';
            input.reportValidity();
            return;
        }
        const game = pendingGame;
        setPlayerName(name);
        dialog.close();
        // Open the form inside the submit event, or the browser can block the new tab.
        if (game) {
            openForm(game);
        }
    });
    document.getElementById('name-cancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        pendingGame = null;
    });
}

// Start

function init() {
    renderUserBar();
    renderGames();
    renderLeaderboards();
    initNameDialog();

    document.getElementById('login-button').addEventListener('click', () => openNameDialog(null));
    document.getElementById('logout-button').addEventListener('click', () => setPlayerName(''));

    // Keep other open tabs in sync with a login or logout.
    window.addEventListener('storage', event => {
        if (event.key === NAME_STORAGE_KEY) {
            playerName = cleanName(event.newValue || '');
            renderUserBar();
            renderLeaderboards();
        }
    });

    refresh();
    setInterval(() => {
        if (!document.hidden) {
            refresh();
        }
    }, CONFIG.refreshIntervalMs);
    // Players come back to this tab after they send the form.
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refresh();
        }
    });
}

init();

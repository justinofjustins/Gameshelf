//front endd
// Keep these choices the same as the lists in server.js.
const GENRES = [
  'Action', 'Platformer', 'RPG', 'Sandbox', 'Racing',
  'Sports', 'Puzzle', 'Shooter', 'Strategy', 'Horror'
];
const PLATFORMS = ['PC', 'PS5', 'Xbox', 'Switch', 'Mobile'];

//shortcut for finding element by its css selector
const $ = (selector) => document.querySelector(selector);
const list = $('#list');
const filter = $('#filters');
const addForm = $('#add');

//keep the maximum year current without having to edit the HTML each
addForm.elements.year.max = String(new Date().getFullYear() + 1);

//Fill the genre and platform dropdowns.
document.querySelectorAll('.genres').forEach((select) => {
  GENRES.forEach((genre) => select.add(new Option(genre, genre)));
});

document.querySelectorAll('.platforms').forEach((select) => {
    PLATFORMS.forEach((platform) => select.add(new Option(platform, platform)));
}); 

// Send a request to the server and turn its json reply into JavaScript data.
async function api(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'The request did not work.');
  }

  return data;
}

// Send a request to the server and turn its JSON reply into JavaScript data.
async function api(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'The request did not work.');
  }

  return data;
}

//add fav and delete buttons to one game card
function actionButtons(game) {
    const box = el('div', undefined, 'actions');
    const favoriteButton = el('button', game.favourite ? 'Unfavourite' : 'Favourite');
    const deleteButton = el('button', 'Delete');

    favouriteButton.type = 'button';
    deleteButton.type = 'button';

    favouriteButton.addEventListener('click', () => {
    change(`/api/games/${game.id}/favourite`, 'PUT');
  });

  deleteButton.addEventListener('click', () => {
    if (confirm(`Delete ${game.title}?`)) {
      change(`/api/games/${game.id}`, 'DELETE');
    }
  });

  box.append(favouriteButton, deleteButton);
  return box;
}

//reload the list after changing something in the database.
async function change(url, method) {
  try {
    await api(url, { method });
    await load();
  } catch (error) {
    alert(navigator.onLine ? error.message : 'You are offline. Reconnect to make changes.');
  }
}

function render(games) {
  list.replaceChildren();
  $('#count').textContent = `${games.length} game${games.length === 1 ? '' : 's'} shown`;

  if (games.length === 0) {
    list.append(el('p', 'No games match. Clear a filter or add a new game.', 'empty'));
    return;
  }

  for (const game of games) {
    const card = el('article', undefined, 'game');
    const meta = el('div', undefined, 'meta');
    const title = (game.favourite ? '★ ' : '') + game.title;

    meta.append(
      el('span', game.genre, 'tag'),
      el('span', game.platform, 'tag'),
      el('span', String(game.year), 'tag'),
      el('span', `${game.rating}/10`, 'score')
    );

    card.append(el('h3', title), meta);

    if (game.notes) {
      card.append(el('p', game.notes));
    }

    card.append(actionButtons(game));
    list.append(card);
  }
}
//read the filter form, ask the server for matching game and then display
async function load() {
  const params = new URLSearchParams();
  const formData = new FormData(filters);

  formData.forEach((value, key) => {
    if (value) {
      params.append(key, value);
    }
  });

  try {
    const query = params.toString();
    const games = await api(query ? `/api/games?${query}` : '/api/games');
    render(games);
  } catch (error) {
    list.replaceChildren(el('p', 'Could not load games. Check the server or reconnect to the internet.', 'empty'));
  }
}

//update the results as the user types or changes a filter
filters.addEventListener('input', load);
filters.addEventListener('change', load); 

//send the Add a Game form to the server.
addForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(addForm));

  try {
    await api('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    addForm.reset();
    $('#msg').textContent = '';
    await load();
  } catch (error) {
    $('#msg').textContent = navigator.onLine
      ? error.message
      : 'You are offline. Reconnect to add games.';
  }
});
//show an offline message when the connection changes.
function updateConnectionStatus() {
  const badge = $('#status');
  badge.textContent = navigator.onLine ? '' : 'Offline: showing saved data';
  badge.className = navigator.onLine ? '' : 'off';
}

addEventListener('online', () => {
  updateConnectionStatus();
  $('#msg').textContent = '';
  load();
}); 
addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();

// The browser only offers this event on browsers that support this install prompt.
let installPrompt = null;
addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  $('#install').hidden = false;
});

$('#install').addEventListener('click', async () => {
  if (!installPrompt) {
    return;
  }

  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('#install').hidden = true;
});

// Register the service worker, which saves the app files for offline use.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // The app still works online if service worker registration fails.
  });
}

// Show the starter games as soon as the page opens.
load();
const BASE = 'https://localhost:3000';
let passed = 0;
let failed = 0;

const expect = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const call = (url, options) => fetch(BASE + url, options);

const post = (body) => call('/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const goodGame = {
  title: 'Test Game',
  genre: 'Puzzle',
  platform: 'PC',
  year: 2020,
  rating: 7,
  notes: ''
};

async function check(name, testFunction) {
  try {
    await testFunction();
    passed++;
    console.log('PASS:', name);
  } catch (error) {
    failed++;
    console.log('FAIL:', name, '-', error.message);
  }
}

async function runTests() {
  let testGameId;

  await check('GET returns a list of games', async () => {
    const response = await call('/api/games');
    const games = await response.json();
    expect(response.status === 200, `status was ${response.status}`);
    expect(Array.isArray(games), 'the reply was not a list');
  });

  await check('search can find Minecraft', async () => {
    const response = await call('/api/games?q=minecraft');
    const games = await response.json();
    expect(games.length === 1 && games[0].title === 'Minecraft', 'Minecraft was not found exactly once');
  });

  await check('genre filter returns only RPG games', async () => {
    const response = await call('/api/games?genre=RPG');
    const games = await response.json();
    expect(games.length > 0 && games.every((game) => game.genre === 'RPG'), 'a non-RPG game was returned');
  });

  await check('minimum rating filter works', async () => {
    const response = await call('/api/games?minRating=9');
    const games = await response.json();
    expect(games.length > 0 && games.every((game) => game.rating >= 9), 'a game below 9 was returned');
  });

  await check('sort by rating puts the highest first', async () => {
    const response = await call('/api/games?sort=rating');
    const games = await response.json();
    const ratings = games.map((game) => game.rating);
    expect(ratings.every((rating, index) => index === 0 || ratings[index - 1] >= rating), 'ratings were not in descending order');
  });

  await check('an unknown sort value safely uses the default order', async () => {
    const response = await call('/api/games?sort=constructor');
    expect(response.status === 200, `status was ${response.status}`);
    expect(Array.isArray(await response.json()), 'the reply was not a list');
  });

  await check('a valid game can be created', async () => {
    const response = await post(goodGame);
    const game = await response.json();
    expect(response.status === 201, `status was ${response.status}`);
    expect(Number.isInteger(game.id), 'the new game did not have an ID');
    testGameId = game.id;
  });

  await check('a blank title is rejected', async () => {
    const response = await post({ ...goodGame, title: '   ' });
    expect(response.status === 400, `status was ${response.status}`);
  });

  await check('a rating of 15 is rejected', async () => {
    const response = await post({ ...goodGame, rating: 15 });
    expect(response.status === 400, `status was ${response.status}`);
  });

  await check('an unrealistic year is rejected', async () => {
    const response = await post({ ...goodGame, year: 1800 });
    expect(response.status === 400, `status was ${response.status}`);
  });

  await check('an invalid genre is rejected', async () => {
    const response = await post({ ...goodGame, genre: 'Nope' });
    expect(response.status === 400, `status was ${response.status}`);
  });

  await check('SQL-looking title text is stored as ordinary text', async () => {
    const response = await post({ ...goodGame, title: "x'); DROP TABLE games; --" });
    const game = await response.json();
    expect(response.status === 201, `status was ${response.status}`);
    expect(game.title === "x'); DROP TABLE games; --", 'title was not stored as normal text');

    const listResponse = await call('/api/games');
    expect(listResponse.status === 200, 'the games table could not be read afterwards');

    await call(`/api/games/${game.id}`, { method: 'DELETE' });
  });

  await check('Favourite can be switched on and then off', async () => {
    expect(Number.isInteger(testGameId), 'the earlier create test did not make a game');
    const firstResponse = await call(`/api/games/${testGameId}/favourite`, { method: 'PUT' });
    const first = await firstResponse.json();
    const secondResponse = await call(`/api/games/${testGameId}/favourite`, { method: 'PUT' });
    const second = await secondResponse.json();
    expect(first.favourite === 1 && second.favourite === 0, 'the favourite value did not switch');
  });

  await check('a game can be deleted', async () => {
    const response = await call(`/api/games/${testGameId}`, { method: 'DELETE' });
    expect(response.status === 204, `status was ${response.status}`);
  });

  await check('deleting a game that does not exist returns 404', async () => {
    const response = await call('/api/games/99999', { method: 'DELETE' });
    expect(response.status === 404, `status was ${response.status}`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

runTests().catch((error) => {
  console.error('Test runner stopped:', error);
  process.exitCode = 1;
});
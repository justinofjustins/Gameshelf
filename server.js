//receives requests from the browser and works with SQLite.
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const db = new Database(path.join(__dirname, 'games.db'));

//
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Create the games table the first time the app starts.
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    platform TEXT NOT NULL,
    year INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10),
    notes TEXT DEFAULT '',
    favourite INTEGER DEFAULT 0
  )
`);

// Add five starter games only when the table is empty.
const gameCount = db.prepare('SELECT COUNT(*) AS count FROM games').get().count;
if (gameCount === 0) {
  const addStarterGame = db.prepare(`
    INSERT INTO games (title, genre, platform, year, rating, notes, favourite)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

const starterGames = [
    ['Hollow Knight', 'Platformer', 'PC', 2017, 10, 'Tough but fair. Amazing atmosphere.', 1],
    ['Minecraft', 'Sandbox', 'PC', 2011, 9, 'Built a huge base with friends.', 0],
    ['Mario Kart 8 Deluxe', 'Racing', 'Switch', 2017, 8, 'Best with four players.', 0],
    ['The Witcher 3', 'RPG', 'PC', 2015, 10, 'Side quests are better than most main stories.', 1],
    ['FIFA 23', 'Sports', 'PS5', 2022, 6, 'Fun, but the same every year.', 0]
  ];

  for (const game of starterGames) {
    addStarterGame.run(...game);
  }
}

// These lists are the only genres and platforms users can choose.
const GENRES = [
  'Action', 'Platformer', 'RPG', 'Sandbox', 'Racing',
  'Sports', 'Puzzle', 'Shooter', 'Strategy', 'Horror'
];
const PLATFORMS = ['PC', 'PS5', 'Xbox', 'Switch', 'Mobile'];

// A sort whitelist makes sure user input is never added directly to SQL.
const SORTS = {
  title: 'title COLLATE NOCASE ASC',
  rating: 'rating DESC, title COLLATE NOCASE ASC',
  year: 'year DESC, title COLLATE NOCASE ASC',
  newest: 'id DESC'
};

//only accept normal text values from the URL.
function text(value) {
  return typeof value === 'string' ? value : '';
}

app.get ('/api/games', (req, res) => {
    const search = text(req.query.q);
    const genre = text(req.query.genre);
    const platform = text(req.query.platform);
    const sort = tex(req.query.sort);
    const favourite = text(req.query.favourite);
    const minRatingText = text(req.query.minRating);
    const minRating = Number(minRatingText) || 0;
    
    let sql = 'SELECT * FROM games WHERE (title LIKE ? OR notes LIKE ?)';
    const values = [`%${search}%`, `%${search}%`];

    if (genre) {
        sql += ' AND genre = ?';
        values.push(genre);
    }
    if (platform) {
        sql += ' AND platform = ?';
        values.push(platform);
    }
    if (Number.isInteger(minRating) && minRating >= 1 && minRating <= 10) {
    sql += ' AND rating >= ?';
    values.push(minRating);
    }
  if (favourite === '1') {
    sql += ' AND favourite = 1';
    }

    const safeSort = Object.prototype.hasOwnProperty.call(SORTS, sort)
    ? SORTS[sort]
    : SORTS.title;
  sql += ` ORDER BY ${safeSort}`;

  const games = db.prepare(sql).all(...values);
  res.json(games);
});

//check new game in the server 
function validateGame(game) {
    const title = typeof game.title === 'string' ? game.title.trim() : '';
    const notes = typeof game.notes === 'string' ? game.notes.trim() : '';
    const year = Number(game.year);
    const rating = Number(game.rating);

    if (!title || title.length > 80) {
    return 'Title is required and must be 80 characters or fewer.';
  }
  if (!GENRES.includes(game.genre)) {
    return 'Please choose a valid genre.';
  }
  if (!PLATFORMS.includes(game.platform)) {
    return 'Please choose a valid platform.';
  }
  if (!Number.isInteger(year) || year < 1970 || year > new Date().getFullYear() + 1) {
    return 'Enter a release year from 1970 to next year.';
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return 'Rating must be a whole number from 1 to 10.';
  }
  if (notes.length > 300) {
    return 'Notes must be 300 characters or fewer.';
  }

  return null;
}   

//add one new game 
app.post('/api/games', (req, res) => {
  const game = req.body && typeof req.body === 'object' ? req.body : {};
  const error = validateGame(game);

  if (error) {
    return res.status(400).json({ error });
  }

  const title = game.title.trim();
  const notes = typeof game.notes === 'string' ? game.notes.trim() : '';
  const result = db.prepare(`
    INSERT INTO games (title, genre, platform, year, rating, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, game.genre, game.platform, Number(game.year), Number(game.rating), notes);

  const newGame = db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newGame);
});

//switch a game favourite value between 0 and 1 
app.put('/api/games/:id/favourite', (req,res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ error: 'Game not found.' });
  }

  const result = db.prepare('UPDATE games SET favourite = 1 - favourite WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Game not found.' });
  }

  const updatedGame = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
  res.json(updatedGame);
}); 

//delete remove one game from database 
app.delete('/api/games/:id', (req, res) => {
  const id = Number(req.params.id); 
  
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ error: 'Game not found.' });
  }

  const result = db.prepare('DELETE FROM games WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Game not found.' });
  }

  res.status(204).end();
}); 

//start server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GameShelf is running at http://localhost:${PORT}`);
});
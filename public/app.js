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

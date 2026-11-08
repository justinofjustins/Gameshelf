//this is my server for gameshelf
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10kb' })); //read json sent by browser
app.use(express.static(path.join(__dirname, 'public'))); //serve the files in /public

app.listen(3000, () => console.log('GameShelf running at http://localhost:3000'));
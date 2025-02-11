require('dotenv').config();
const express = require('express');
const pool = require('./db-connection');

const app = express();
app.use(express.json());

app.get('/test', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server avviato su http://localhost:3000');
});

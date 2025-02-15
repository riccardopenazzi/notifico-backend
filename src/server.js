require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db-connection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/test-db-connection', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/execute-login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Email non valida', serverMessage: 'Email non valida' });
        }

        const user = users[0];

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Email o password non validi', serverMessage: 'Email e password non coincidono'});
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            'criptato', //da cambiare con una variabile d'ambiente
            { expiresIn: '1h' }
        );
        vars = {};
        vars.token = token;
        vars.success = true;
        res.json(vars);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/execute-signup', async (req, res) => {
    const { email, password, name, surname, avatar } = req.body;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(400).json({ error: 'Email già in uso', serverMessage: 'Questa email risulta già registrata' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query('INSERT INTO users (email, password, name, surname, avatar) VALUES (?, ?, ?, ?, ?)', [email, hashedPassword, name, surname, avatar]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
});

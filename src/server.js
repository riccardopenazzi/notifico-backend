require('dotenv').config();
const express = require('express');
const pool = require('./db-connection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');

const checkDeadlines = require('./send-deadlines-remainders');
const { sendEmail } = require('./utils/email-service');

const app = express();
const cookies = require('cookie-parser');
app.use(cookies());
app.use(cors({ origin: 'http://localhost:8081', credentials: true }));
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

app.get('/api/get-user-info', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Non autenticato', serverMessage: 'Non sei autenticato' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Utente non trovato', serverMessage: 'Utente non trovato' });
        }

        res.json({ success: true, serverResult: users[0] });
    } catch (err) {
        res.status(401).json({ error: 'Token non valido' });
    }
});

app.get('/api/get-user-categories', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Non autenticato', serverMessage: 'Non sei autenticato' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Utente non trovato', serverMessage: 'Utente non trovato' });
        }

        const [categories] = await pool.query(
            "SELECT c.* FROM categories c JOIN user_categories uc ON c.id = uc.categoryId WHERE uc.userId = ?",
            [decoded.id]
        );

        res.json({ success: true, serverResult: categories });
    } catch (err) {
        res.status(401).json({ error: 'Token non valido' });
    }
});

app.get('/api/get-user-deadlines', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Non autenticato', serverMessage: 'Non sei autenticato' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Utente non trovato', serverMessage: 'Utente non trovato' });
        }

        const [deadlines] = await pool.query(
            "SELECT d.* FROM deadlines d JOIN user_deadlines ud ON d.id = ud.deadlineId WHERE ud.userId = ?",
            [decoded.id]
        );

        res.json({ success: true, serverResult: deadlines });
    } catch (err) {
        res.status(401).json({ error: 'Token non valido' });
    }
});

//POST-----------------------------------------------------------------------------------------------------------------------------------------------

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
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const expires = new Date(Date.now() + 60 * 60 * 1000); //1h
        res.cookie('token', token, {
            httpOnly: true,
            // secure: false,
            // domain: 'localhost',
            // sameSite: 'none',
            // expires: expires,
            // path: '/',
            // maxAge: 3600000, //1h
        });

        res.json({
            success: true,
            serverResult: user,
        });
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

        const [result] = await pool.query('INSERT INTO users (email, password, name, surname, avatar) VALUES (?, ?, ?, ?, ?)', [email, hashedPassword, name, surname, avatar]);

        const token = jwt.sign(
            { id: result.insertId, email: email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const expires = new Date(Date.now() + 60 * 60 * 1000); //1h
        res.cookie('token', token, {
            httpOnly: true,
            // secure: false,
            // domain: 'localhost',
            // sameSite: 'none',
            // expires: expires,
            // path: '/',
            // maxAge: 3600000, //1h
        });

        res.json({ success: true, userId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/execute-logout', async (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.post('/api/create-user-category', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Non autenticato', serverMessage: 'Non sei autenticato' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Utente non trovato', serverMessage: 'Utente non trovato' });
        }

        const { userId, color, name } = req.body;
        
        const [result] = await pool.query('INSERT INTO categories (name, color) VALUES (?, ?)', [name, color]);
        const categoryId = result.insertId;
        await pool.query('INSERT INTO user_categories (userId, categoryId) VALUES (?, ?)', [userId, categoryId]);

        res.json({ success: true });
    } catch (err) {
        res.status(401).json({ error: 'Token non valido' });
    }
});

app.post('/api/create-user-deadline', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Non autenticato', serverMessage: 'Non sei autenticato' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Utente non trovato', serverMessage: 'Utente non trovato' });
        }

        const { userId, content } = req.body;
        const { title, description, categoryId, date } = content;
        const formattedDate = new Date(date);
        
        const [result] = await pool.query('INSERT INTO deadlines (title, description, categoryId, date) VALUES (?, ?, ?, ?)', [title, description, categoryId, formattedDate]);
        const deadlineId = result.insertId;
        await pool.query('INSERT INTO user_deadlines (userId, deadlineId) VALUES (?, ?)', [userId, deadlineId]);
        await pool.query('INSERT INTO scheduled_emails (userId, deadlineId, date) VALUES (?, ?, ?)', [userId, deadlineId, formattedDate]);

        res.json({ success: true, result: req.body });
    } catch (err) {
        res.status(401).json({ error: 'Token non valido' });
    }
});

async function sendPendingEmails() {
    const [emailsToSend] = await pool.query(`
        SELECT 
            se.id AS scheduledEmailId,
            se.date AS scheduledDate,
            u.email AS recipientEmail,
            d.title AS deadlineTitle,
            d.description AS deadlineDescription,
            c.name AS categoryName
        FROM scheduled_emails se
        JOIN users u ON se.userId = u.id
        JOIN deadlines d ON se.deadlineId = d.id
        JOIN categories c ON d.categoryId = c.id
        WHERE se.date >= CURDATE() 
        AND se.date < CURDATE() + INTERVAL 1 DAY 
        AND se.toSend = 1;
    `);

    if (emailsToSend.length > 0) {
        console.log('Ci sono ', emailsToSend.length, ' email da mandare');

        for (const entry of emailsToSend) {
            try {
                await sendEmail(entry.recipientEmail, entry.deadlineTitle, entry.scheduledDate, entry.deadlineDescription);
                await pool.query(`
                    UPDATE scheduled_emails
                    SET toSend = 0
                    WHERE id = ?;
                `, [entry.scheduledEmailId]);

                console.log(`Email inviata a: ${entry.recipientEmail} e aggiornata nel DB.`);
            } catch (error) {
                console.error(`Errore nell'invio dell'email a ${entry.recipientEmail}:`, error);
            }
        }
    } else {
        console.log('Nessuna email da mandare');
    }
}

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
    sendPendingEmails();
    setInterval(sendPendingEmails, 60 * 60 * 1000);
});

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, queryOne, run } = require('../database/db');

router.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.render('register', { error: 'Tous les champs sont obligatoires.' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existing) {
            return res.render('register', { error: "Nom d'utilisateur ou email déjà utilisé." });
        }
        run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hash]);
        res.redirect('/login');
    } catch (err) {
        res.render('register', { error: 'Erreur serveur.' });
    }
});

router.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = queryOne('SELECT id, password, username FROM users WHERE email = ?', [email]);
    if (!user) {
        return res.render('login', { error: 'Email ou mot de passe incorrect.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.render('login', { error: 'Email ou mot de passe incorrect.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    run('DELETE FROM sessions WHERE user_id = ?', [user.id]);
    run('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expires]);

    req.session.token = token;
    req.session.userId = user.id;
    req.session.username = user.username;

    res.redirect('/');
});

router.get('/logout', (req, res) => {
    if (req.session.token) {
        run('DELETE FROM sessions WHERE token = ?', [req.session.token]);
    }
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;

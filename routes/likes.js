const express = require('express');
const router = express.Router();
const { queryOne, run } = require('../database/db');

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.redirect('/login');
    next();
}

router.post('/like', requireAuth, (req, res) => {
    const val = parseInt(req.body.value);
    if (val !== 1 && val !== -1) return res.redirect('/');

    const { post_id, comment_id, redirect: redirectUrl } = req.body;
    const userId = req.session.userId;

    let existing;
    if (post_id) {
        existing = queryOne('SELECT id, value FROM likes WHERE user_id = ? AND post_id = ?', [userId, post_id]);
    } else {
        existing = queryOne('SELECT id, value FROM likes WHERE user_id = ? AND comment_id = ?', [userId, comment_id]);
    }

    if (existing) {
        if (existing.value === val) {
            run('DELETE FROM likes WHERE id = ?', [existing.id]);
        } else {
            run('UPDATE likes SET value = ? WHERE id = ?', [val, existing.id]);
        }
    } else {
        if (post_id) {
            run('INSERT INTO likes (user_id, post_id, value) VALUES (?, ?, ?)', [userId, post_id, val]);
        } else {
            run('INSERT INTO likes (user_id, comment_id, value) VALUES (?, ?, ?)', [userId, comment_id, val]);
        }
    }

    res.redirect(redirectUrl || '/');
});

module.exports = router;

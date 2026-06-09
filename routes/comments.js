const express = require('express');
const router = express.Router();
const { queryOne, run } = require('../database/db');

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.redirect('/login');
    next();
}

router.post('/comment/create', requireAuth, (req, res) => {
    const { post_id, content } = req.body;

    if (!post_id || !content) return res.redirect('/post/' + (post_id || ''));

    run('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
        [post_id, req.session.userId, content]);

    res.redirect('/post/' + post_id);
});

router.post('/comment/delete', requireAuth, (req, res) => {
    const { comment_id, post_id } = req.body;

    const owner = queryOne('SELECT user_id FROM comments WHERE id = ?', [comment_id]);
    if (!owner || owner.user_id !== req.session.userId) {
        return res.status(403).render('error', { code: 403, message: "Vous n'avez pas la permission d'effectuer cette action." });
    }

    run('DELETE FROM likes WHERE comment_id = ?', [comment_id]);
    run('DELETE FROM comments WHERE id = ?', [comment_id]);

    res.redirect('/post/' + post_id);
});

router.post('/comment/edit', requireAuth, (req, res) => {
    const { comment_id, post_id, content } = req.body;

    if (!content) return res.redirect('/post/' + post_id);

    const owner = queryOne('SELECT user_id FROM comments WHERE id = ?', [comment_id]);
    if (!owner || owner.user_id !== req.session.userId) {
        return res.status(403).render('error', { code: 403, message: "Vous n'avez pas la permission d'effectuer cette action." });
    }

    run('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, comment_id]);

    res.redirect('/post/' + post_id);
});

module.exports = router;

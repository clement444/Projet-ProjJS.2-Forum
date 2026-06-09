const express = require('express');
const session = require('express-session');
const path = require('path');
const { getDb } = require('./database/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'forum_secret_key_changeme',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use('/static', express.static(path.join(__dirname, 'static')));

const authRouter = require('./routes/auth');
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments');
const likesRouter = require('./routes/likes');

app.use('/', authRouter);
app.use('/', postsRouter);
app.use('/', commentsRouter);
app.use('/', likesRouter);

app.use((req, res) => {
    res.status(404).render('error', { code: 404, message: "La page que vous cherchez n'existe pas." });
});

getDb().then(() => {
    app.listen(8080, () => {
        console.log('Server started on http://localhost:8080');
    });
});

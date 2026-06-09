# Forum

Application de forum web développée en Node.js avec SQLite.

## Prérequis

- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/products/docker-desktop/)

## Lancement en local

```bash
npm install
node index.js
```

L'application est accessible sur [http://localhost:8080](http://localhost:8080).

La base de données forum.db est créée automatiquement au premier lancement.

## Lancement avec Docker

```bash
docker-compose up --build
```

L'application est accessible sur [http://localhost:8080](http://localhost:8080).

Les données et les images uploadées sont conservées entre les redémarrages grâce aux volumes Docker.

## Fonctionnalités

- Inscription, connexion et déconnexion (sessions avec cookie, expiration 24h)
- Mots de passe hashés avec bcrypt
- Création de posts avec catégories et image optionnelle
- Commentaires sur les posts
- Modification et suppression de ses propres posts et commentaires
- Like / dislike sur les posts et commentaires
- Filtrage des posts par catégorie, par utilisateur connecté, par posts likés
- Pages d'erreur HTML (404, 403)

## Structure du projet

```
forum/
├── index.js
├── package.json
├── database/
│   └── db.js
├── middleware/
│   └── upload.js
├── routes/
│   ├── auth.js
│   ├── comments.js
│   ├── likes.js
│   └── posts.js
├── static/
│   ├── css/
│   └── uploads/
├── views/
│   ├── index.ejs
│   ├── register.ejs
│   ├── login.ejs
│   ├── post.ejs
│   ├── create_post.ejs
│   ├── edit_post.ejs
│   └── error.ejs
├── Dockerfile
└── docker-compose.yml
```

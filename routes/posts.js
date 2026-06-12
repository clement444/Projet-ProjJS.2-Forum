const express = require("express");
const router = express.Router();
const path = require("path");
const { query, queryOne, run, saveDb } = require("../database/db");
const upload = require("../middleware/upload");

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

router.get("/", (req, res) => {
  const { filter } = req.query;
  const category_id = req.query.category_id
    ? parseInt(req.query.category_id)
    : null;
  const userId = req.session.userId;
  let posts = [];

  switch (filter) {
    case "category":
      if (!category_id) return;

      posts = query(
        `
            SELECT *
            FROM posts p
            JOIN post_categories pc ON p.id = pc.post_id
            WHERE pc.category_id = ?
            ORDER BY p.created_at DESC`,
        [category_id],
      );

      console.log(posts);
      break;
    case "mine":
      posts = query(
        `
            SELECT p.id, p.title, u.username, p.created_at
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC`,
        [userId],
      );
      break;
    case "liked":
      posts = query(
        `
            SELECT p.id, p.title, u.username, p.created_at
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN likes l ON p.id = l.post_id
            WHERE l.user_id = ? AND l.value = 1
            ORDER BY p.created_at DESC`,
        [userId],
      );
      break;
    default:
      posts = query(`
            SELECT p.id, p.title, u.username, p.created_at
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC`);
      break;
  }

  const categories = query("SELECT id, name FROM categories ORDER BY name");

  res.render("index", {
    posts,
    username: req.session.username || null,
    categories,
    filter: filter || "",
    categoryId: category_id || "",
  });
});

router.get("/post/create", requireAuth, (req, res) => {
  const categories = query("SELECT id, name FROM categories ORDER BY name");
  res.render("create_post", {
    username: req.session.username,
    categories,
    error: null,
  });
});

router.post("/post/create", requireAuth, upload.single("image"), (req, res) => {
  const { title, content } = req.body;
  let categoryIds = req.body.categories;
  if (!Array.isArray(categoryIds))
    categoryIds = categoryIds ? [categoryIds] : [];
  categoryIds = [...new Set(categoryIds.map((id) => parseInt(id)))];

  const categories = query("SELECT id, name FROM categories ORDER BY name");

  if (!title || !content || categoryIds.length === 0) {
    return res.render("create_post", {
      username: req.session.username,
      categories,
      error: "Titre, contenu et au moins une catégorie sont obligatoires.",
    });
  }

  let imagePath = null;
  if (req.file) {
    imagePath = "static/uploads/" + req.file.filename;
  }

  const post = run(
    "INSERT INTO posts (user_id, title, content, image_path) VALUES (?, ?, ?, ?)",
    [req.session.userId, title, content, imagePath],
  );

  for (const catId of categoryIds) {
    run(
      "INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)",
      [post.id, catId],
    );
  }

  res.redirect("/");
});

router.get("/post/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id <= 0)
    return res.status(404).render("error", {
      code: 404,
      message: "La page que vous cherchez n'existe pas.",
    });

  const post = queryOne(
    `
        SELECT p.id, p.title, p.content, u.username, u.id as user_id,
               COALESCE(p.image_path, '') as image_path, p.created_at
        FROM posts p JOIN users u ON p.user_id = u.id
        WHERE p.id = ?`,
    [id],
  );

  if (!post)
    return res.status(404).render("error", {
      code: 404,
      message: "La page que vous cherchez n'existe pas.",
    });

  const likesRow = queryOne(
    `
        SELECT
            SUM(CASE WHEN value=1 THEN 1 ELSE 0 END) as likes,
            SUM(CASE WHEN value=-1 THEN 1 ELSE 0 END) as dislikes
        FROM likes WHERE post_id = ?`,
    [id],
  );
  post.likes = likesRow ? likesRow.likes || 0 : 0;
  post.dislikes = likesRow ? likesRow.dislikes || 0 : 0;

  const postCategories = query(
    `
        SELECT c.name FROM categories c
        JOIN post_categories pc ON c.id = pc.category_id
        WHERE pc.post_id = ?`,
    [id],
  );
  post.categories = postCategories.map((c) => c.name);

  const comments = query(
    `
        SELECT c.id, c.content, u.username, u.id as user_id, c.created_at
        FROM comments c JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC`,
    [id],
  );

  for (const comment of comments) {
    const cl = queryOne(
      `
            SELECT
                SUM(CASE WHEN value=1 THEN 1 ELSE 0 END) as likes,
                SUM(CASE WHEN value=-1 THEN 1 ELSE 0 END) as dislikes
            FROM likes WHERE comment_id = ?`,
      [comment.id],
    );
    comment.likes = cl ? cl.likes || 0 : 0;
    comment.dislikes = cl ? cl.dislikes || 0 : 0;
  }

  res.render("post", {
    post,
    comments,
    username: req.session.username || null,
    userId: req.session.userId || 0,
  });
});

router.post("/post/delete", requireAuth, (req, res) => {
  const { post_id } = req.body;
  const owner = queryOne("SELECT user_id FROM posts WHERE id = ?", [post_id]);

  if (!owner || owner.user_id !== req.session.userId) {
    return res.status(403).render("error", {
      code: 403,
      message: "Vous n'avez pas la permission d'effectuer cette action.",
    });
  }

  run("DELETE FROM post_categories WHERE post_id = ?", [post_id]);
  run("DELETE FROM likes WHERE post_id = ?", [post_id]);
  run("DELETE FROM comments WHERE post_id = ?", [post_id]);
  run("DELETE FROM posts WHERE id = ?", [post_id]);

  res.redirect("/");
});

router.get("/post/edit", requireAuth, (req, res) => {
  const id = parseInt(req.query.id);
  if (!id || id <= 0)
    return res.status(404).render("error", {
      code: 404,
      message: "La page que vous cherchez n'existe pas.",
    });

  const post = queryOne(
    `
        SELECT p.id, p.title, p.content, u.username, u.id as user_id,
               COALESCE(p.image_path, '') as image_path, p.created_at
        FROM posts p JOIN users u ON p.user_id = u.id
        WHERE p.id = ?`,
    [id],
  );

  if (!post || post.user_id !== req.session.userId) {
    return res.status(403).render("error", {
      code: 403,
      message: "Vous n'avez pas la permission d'effectuer cette action.",
    });
  }

  const categories = query("SELECT id, name FROM categories ORDER BY name");
  const selectedRows = query(
    "SELECT category_id FROM post_categories WHERE post_id = ?",
    [id],
  );
  const selected = {};
  for (const row of selectedRows) selected[row.category_id] = true;

  res.render("edit_post", {
    post,
    categories,
    selected,
    username: req.session.username,
    error: null,
  });
});

router.post("/post/edit", requireAuth, (req, res) => {
  const { post_id, title, content } = req.body;
  let categoryIds = req.body.categories;
  if (!Array.isArray(categoryIds))
    categoryIds = categoryIds ? [categoryIds] : [];
  categoryIds = categoryIds.map((id) => parseInt(id));

  const owner = queryOne("SELECT user_id FROM posts WHERE id = ?", [post_id]);
  if (!owner || owner.user_id !== req.session.userId) {
    return res.status(403).render("error", {
      code: 403,
      message: "Vous n'avez pas la permission d'effectuer cette action.",
    });
  }

  if (!title || !content || categoryIds.length === 0) {
    return res.redirect("/post/edit?id=" + post_id);
  }

  run(
    "UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [title, content, post_id],
  );
  run("DELETE FROM post_categories WHERE post_id = ?", [post_id]);
  for (const catId of categoryIds) {
    run(
      "INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)",
      [post_id, catId],
    );
  }

  res.redirect("/post/" + post_id);
});

module.exports = router;

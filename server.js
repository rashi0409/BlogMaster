import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import env from "dotenv";
import pg from "pg";
import path from "path";
import bcrypt from "bcrypt"; // Import bcrypt for password hashing
import { fileURLToPath } from 'url';

env.config(); // Load environment variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static("public"));

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection setup using pg.Client
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// Routes
app.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM posts ORDER BY date DESC');
    res.render('index', { posts: result.rows });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Server Error');
  }
});

app.get('/new', (req, res) => {
  res.render('modify', { heading: 'New Post', submit: 'Create', post: null });
});

app.post('/api/posts', async (req, res) => {
  const { title, content, author, password } = req.body;

  if (!title || !content || !author || !password) {
    return res.status(400).send('All fields are required');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password
    await db.query(
      'INSERT INTO posts (title, content, author, password, date) VALUES ($1, $2, $3, $4, NOW())',
      [title, content, author, hashedPassword]
    );
    res.redirect('/');
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Server Error');
  }
});

app.get('/edit/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (rows.length) {
      res.render('modify', { heading: 'Edit Post', submit: 'Update', post: rows[0] });
    } else {
      res.status(404).send('Post not found');
    }
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).send('Server Error');
  }
});

app.post('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, author, password } = req.body;

  try {
    const result = await db.query('SELECT password FROM posts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const validPassword = await bcrypt.compare(password, result.rows[0].password); // Compare hashed passwords
    if (!validPassword) {
      return res.status(403).json({ message: 'Invalid password' });
    }

    await db.query(
      'UPDATE posts SET title = $1, content = $2, author = $3 WHERE id = $4',
      [title, content, author, id]
    );
    res.redirect('/');
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).send('Server Error');
  }
});

app.get('/api/posts/delete/:id', async (req, res) => {
  const { id } = req.params;
  const { password } = req.query;

  try {
    const result = await db.query('SELECT password FROM posts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const validPassword = await bcrypt.compare(password, result.rows[0].password);
    if (!validPassword) {
      return res.status(403).json({ message: 'Invalid password' });
    }

    await db.query('DELETE FROM posts WHERE id = $1', [id]);
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send('Server Error');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});

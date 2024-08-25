import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import env from "dotenv";
import pg from "pg";
import path from "path"; // Import the path module
import { fileURLToPath } from 'url';


env.config(); // Load environment variables from a .env file, if present

// Create __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables from a .env file, if present

const app = express();
app.use(express.static("public"));

// Middleware for parsing JSON and URL-encoded data

const db = new pg.Client({
  user: process.env.PG_USER, // Use environment variables or fallback values
  host: process.env.PG_HOST,
  database: process.env.PG_NAME , // Adjust database name as needed
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();


app.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM posts ORDER BY date DESC');
    res.render('index', { posts: result.rows });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Server Error');
  }
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Corrected path setting

// Route for creating a new post
app.get('/new', (req, res) => {
  res.render('modify', { heading: 'New Post', submit: 'Create', post: null });
});

// Route for handling form submission (creating or updating a post)
app.post('/api/posts', async (req, res) => {
  const { title, content, author } = req.body;
  try {
    await db.query(
      'INSERT INTO posts (title, content, author) VALUES ($1, $2, $3)',
      [title, content, author]
    );
    res.redirect('/');
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Server Error');
  }
});

// Route for editing a post
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

// Route for handling updates
app.post('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, author } = req.body;
  try {
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
app.get("/api/posts/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log("Attempting to delete post with ID:", id);
    const result = await db.query('DELETE FROM posts WHERE id = $1 RETURNING *', [id]);
    console.log("Delete result:", result);

    if (result.rowCount === 0) {
      console.log("Post not found");
      return res.status(404).json({ message: 'Post not found' });
    }
    res.redirect("/");
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: "Error deleting post" });
  }
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});

// db.end(); // Do not close the database connection immediately after starting the server

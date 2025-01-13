import pg from 'pg';
import env from 'dotenv';

env.config();

// Database connection setup using pg.Client
const db = new pg.Client({
  user: process.env.PG_USER, // Use environment variables or fallback values
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE , // Adjust database name as needed
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect(); // Connect to the database


// Helper function for error handling
const handleDatabaseError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ message });
};

// Function to get all posts
export const getAllPosts = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM posts ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    handleDatabaseError(res, error, 'Error fetching posts');
  }
};


// Function to get a specific post by id
export const getPostById = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  try {
    const result = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    handleDatabaseError(res, error, 'Error fetching post');
  }
};

// Function to create a new post
export const createPost = async (req, res) => {
  const { title, content, author } = req.body;
  if (!title || !content || !author) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      'INSERT INTO posts (title, content, author, date) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [title, content, author]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleDatabaseError(res, error, 'Error creating post');
  }
};

// Function to update a post
export const updatePost = async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, content, author } = req.body;
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  try {
    const setClause = [];
    const values = [];

    if (title) {
      setClause.push(`title = $${values.length + 1}`);
      values.push(title);
    }
    if (content) {
      setClause.push(`content = $${values.length + 1}`);
      values.push(content);
    }
    if (author) {
      setClause.push(`author = $${values.length + 1}`);
      values.push(author);
    }
    if (setClause.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE posts SET ${setClause.join(', ')} WHERE id = $${values.length} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ message: 'Post updated', post: result.rows[0] });
  } catch (error) {
    handleDatabaseError(res, error, 'Error updating post');
  }
};

// Function to delete a specific post

export const deletePost = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  try {
    const result = await db.query('DELETE FROM posts WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ message: 'Post deleted', post: result.rows[0] });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Error deleting post' });
  }
};

db.end();
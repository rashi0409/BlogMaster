import { MongoClient, ObjectId } from 'mongodb';
import env from 'dotenv';

env.config();

// Database connection setup using MongoDB
const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db(process.env.MONGO_DATABASE); // Specify the database name
const postsCollection = db.collection('posts');

// Helper function for error handling
const handleDatabaseError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ message });
};

// Function to get all posts
export const getAllPosts = async (req, res) => {
  try {
    const posts = await postsCollection.find().sort({ date: -1 }).toArray(); // Sort posts by date in descending order
    res.json(posts);
  } catch (error) {
    handleDatabaseError(res, error, 'Error fetching posts');
  }
};

// Function to get a specific post by id
export const getPostById = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await postsCollection.findOne({ _id: new ObjectId(id) });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
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
    const result = await postsCollection.insertOne({
      title,
      content,
      author,
      date: new Date(),
    });
    res.status(201).json(result.ops[0]);
  } catch (error) {
    handleDatabaseError(res, error, 'Error creating post');
  }
};

// Function to update a post
export const updatePost = async (req, res) => {
  const { id } = req.params;
  const { title, content, author } = req.body;

  try {
    const updateFields = {};
    if (title) updateFields.title = title;
    if (content) updateFields.content = content;
    if (author) updateFields.author = author;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const result = await postsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ message: 'Post updated', post: result.value });
  } catch (error) {
    handleDatabaseError(res, error, 'Error updating post');
  }
};

// Function to delete a specific post
export const deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await postsCollection.findOneAndDelete({ _id: new ObjectId(id) });

    if (!result.value) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ message: 'Post deleted', post: result.value });
  } catch (error) {
    handleDatabaseError(res, error, 'Error deleting post');
  }
};

await client.close();

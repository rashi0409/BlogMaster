import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import env from "dotenv";
import bcrypt from "bcrypt"; // Import bcrypt for password hashing
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { fileURLToPath } from "url";

env.config(); // Load environment variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static('public'));

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Database connection setup using MongoDB
const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db(process.env.MONGO_DATABASE); // Specify the database name
const postsCollection = db.collection("posts");

// Routes
app.get("/", async (req, res) => {
  try {
    const posts = await postsCollection.find().sort({ date: -1 }).toArray();
    res.render("index", { posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).send("Server Error");
  }
});

app.get("/new", (req, res) => {
  res.render("modify", { heading: "New Post", submit: "Create", post: null });
});

app.post("/api/posts", async (req, res) => {
  const { title, content, author, password } = req.body;

  if (!title || !content || !author || !password) {
    return res.status(400).send("All fields are required");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password
    await postsCollection.insertOne({
      title,
      content,
      author,
      password: hashedPassword,
      date: new Date(),
    });
    res.redirect("/");
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).send("Server Error");
  }
});

app.get('/edit/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const post = await postsCollection.findOne({ _id: new ObjectId(id) });
    if (post) {
      res.render("modify", { heading: "Edit Post", submit: "Update", post });
    } else {
      res.status(404).send("Post not found");
    }
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).send("Server Error");
  }
});

// PUT request to update a post by ID
app.post('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, author, password } = req.body;

  try {
    const post = await postsCollection.findOne({ _id: new ObjectId(id) });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const validPassword = await bcrypt.compare(password, post.password); // Compare hashed passwords
    if (!validPassword) {
      return res.status(403).json({ message: "Invalid password" });
    }

    await postsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { title, content, author } }
    );
    // res.json({ message: "Post updated successfully" });
    res.redirect('/');
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).send("Server Error");
  }
});

// DELETE request to delete a post by ID
app.post('/api/posts/delete/:id', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    const post = await postsCollection.findOne({ _id: new ObjectId(id) });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const validPassword = await bcrypt.compare(password, post.password);
    if (!validPassword) {
      return res.status(403).json({ message: "Invalid password" });
    }

    await postsCollection.deleteOne({ _id: new ObjectId(id) });
    res.redirect('/');
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).send("Server Error");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});

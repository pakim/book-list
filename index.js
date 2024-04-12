import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT)
});

db.connect();

// Global variables
const app = express();
const port = 3000;
const saltRounds = parseInt(process.env.SALT_ROUNDS);

// Book search global variables
const apiBookSearch = "https://openlibrary.org/search.json";
const apiCoverSearch = "https://covers.openlibrary.org/b/olid/";
let suggestions = [];
let currentPage = 1;
let maxPages = 1;
let formattedQuery = "";
let prevAllowed = false;
let nextAllowed = false;
let firstAllowed = false;
let lastAllowed = false;
let numFound = 0;

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

// Handle requests here
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/logout", (req, res) => {
  req.logout(function (err) {
    if(err) {
      return next(err);
    }
    else {
      res.redirect("/");
    }
  });
});

app.post("/register", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    // Check if email is already in the database
    const checkEmail = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    // If no users found, hash password
    if(checkEmail.rows.length === 0) {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if(err) {
          console.error("Error hashing password: ", err);
        }
        else {
          // Insert new user into table and login session
          const result = await db.query("INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *", [email, hash]);
          const user = result.rows[0];

          req.login(user, (err) => {
            if(err) {
              console.error("Error hashing password: ", err);
            }
            else {
              console.log("Success");
              res.redirect("/");
            }
          });
        }
      });
    }
    else {
      console.log("User already created");
    }
  }
  catch(err) {
    console.error("Error checking email", err);
  }
});

app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

// Local strategy for authenticating login. Note: verify must have username and password fields
passport.use("local",
  new Strategy(async function verify(username, password, cb) {
    try {
      // Check if user exists
      const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);

      if(result.rows.length > 0) {
        const user = result.rows[0];
        const savedPassword = user.password;

        // Compare entered password with user password
        bcrypt.compare(password, savedPassword, (err, valid) => {
          if(err) {
            console.error("Error comparing passwords: ", err);
            return cb(err);
          }
          else {
            if(valid) {
              console.log("Login success")
              cb(null, user);
            }
            else {
              console.log("Login failed");
              cb(null, false);
            }
          }
        });
      }
      else {
        return cb("User not found");
      }
    }
    catch(err) {
      console.error("Error checking database", err);
    }
  })
);

app.get("/", async (req, res) => {
  // Check if user is logged in
  if(req.isAuthenticated()) {
    const userID = req.user.id;
    let booklist = [];
    try {
      // Query all of the user's books and send to the ejs file
      const result = await db.query("SELECT * FROM books WHERE userid = $1", [userID]);
      booklist = result.rows;
    }
    catch(err) {
      console.error("An error occurred when querying the database", err);
    }

    res.render("index.ejs", { bookList: booklist });
  }
  else {
    res.redirect("/login");
  }
});

app.get("/search", (req, res) => {
  res.render("search.ejs");
});

app.post("/search", async (req, res) => {
  let query = "";

  // Checking if user clicked the button for a new query or a new page of the existing query
  // New queries need to be trimmed for white space and replace spaces with pluses
  switch(req.body.search) {
    case "find":
      query = req.body.searchQuery.trim();
      formattedQuery = query.replace(/\s+/g, '+');
      currentPage = 1;
      numFound = 0;
      maxPages = 1;
      break;
    case "prev":
      --currentPage;
      break;
    case "next":
      ++currentPage;
      break;
    case "first":
      currentPage = 1;
      break;
    case "last":
      currentPage = maxPages;
    default:
      break;
  }

  // Parameters for the get query to the api
  // query 1 page of 10 results
  const queryParams = {
    q: formattedQuery,
    limit: 10,
    page: currentPage
  };

  try {
    // Reset suggestions array and get request to the book search api
    suggestions = [];
    const result = await axios.get(apiBookSearch, { params: queryParams });
    numFound = result.data.numFound;
    const bookResults = result.data.docs

    // Check number of pages in search query
    maxPages = Math.floor(numFound / 10) + 1;

    // Check if search navigation buttons are enabled/disabled
    if(currentPage > 1) {
      firstAllowed = true;
      prevAllowed = true;
    }
    else {
      firstAllowed = false;
      prevAllowed = false;
    }
    if(currentPage < maxPages) {
      lastAllowed = true;
      nextAllowed = true;
    }
    else {
      lastAllowed = false;
      nextAllowed = false;
    }

    // Loop through at most 10 results and add book info to an object which is pushed to suggestions array
    for(let i = 0; i < bookResults.length; i++) {
      const book = bookResults[i];
      const cover = book.cover_edition_key || book.lending_edition_s;
      let author = "";
      if(book.author_name) author = book.author_name[0];
      const option = {
        title: book.title,
        subtitle: book.subtitle || "",
        author: author,
        cover: apiCoverSearch + cover + "-M.jpg"
      };

      suggestions.push(option);
    }
  }
  catch(err) {
    console.log("Error retrieving data");
  }

  res.render("search.ejs", { 
    searchResults: suggestions,
    numResults: suggestions.length,
    prev: prevAllowed,
    next: nextAllowed,
    first: firstAllowed,
    last: lastAllowed,
    total: numFound,
    currentPage: currentPage
  });
});

app.get("/new/:index", (req, res) => {
  const index = parseInt(req.params.index);

  // Book parameters for custom book entry. Default cover url is a blank image
  let book = {
    title: "",
    subtitle: "",
    author: "",
    cover: "https://covers.openlibrary.org/b/olid/OL41447235M-M.jpg",
    rating: 0
  };

  if(index !== 10) {
    book = suggestions[index];
  }

  res.render("book.ejs", { bookInfo: book });
});

app.post("/submit", async (req, res) => {
  const userID = req.user.id;
  let rating = 0;
  if(req.body.rating) {
    rating = parseInt(req.body.rating);
  }

  try {
    // Insert new book entry into the database and redirect to home page
    await db.query("INSERT INTO books (title, subtitle, author, cover, notes, rating, userID) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [req.body.title, req.body.subtitle, req.body.author, req.body.cover, req.body.notes, rating, userID]);
    res.redirect("/");
  }
  catch(err) {
    console.error("Error inputting data", err);
  }
});

app.get("/book/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  let book = {
    title: "",
    subtitle: "",
    author: "",
    cover: "",
    rating: 0
  };

  try {
    // Retrieve book info fom the database
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
    book = result.rows[0];
  }
  catch(err) {
    console.error("Error retrieving book info from database", err);
  }

  res.render("book.ejs", { 
    bookInfo: book,
    edit: true
  });
});

app.post("/update/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  let rating = 0;
  if(req.body.rating) {
    rating = parseInt(req.body.rating);
  }

  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
    const book = result.rows[0];

    if(req.body.title !== book.title) {
      await db.query("UPDATE books SET title = $1 WHERE id = $2", [req.body.title, id]);
    }
    if(req.body.subtitle !== book.subtitle) {
      await db.query("UPDATE books SET subtitle = $1 WHERE id = $2", [req.body.subtitle, id]);
    }
    if(req.body.author !== book.author) {
      await db.query("UPDATE books SET author = $1 WHERE id = $2", [req.body.author, id]);
    }
    if(req.body.cover !== book.cover) {
      await db.query("UPDATE books SET cover = $1 WHERE id = $2", [req.body.cover, id]);
    }
    if(rating !== book.rating) {
      await db.query("UPDATE books SET rating = $1 WHERE id = $2", [rating, id]);
    }
    if(req.body.notes !== book.notes) {
      await db.query("UPDATE books SET notes = $1 WHERE id = $2", [req.body.notes, id]);
    }
  }
  catch(err) {
    console.err("An error occurred while trying to update.", err);
  }

  res.redirect("/");
});

app.post("/delete/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.query("DELETE FROM books WHERE id = $1", [id]);
    res.redirect("/");
  }
  catch(err) {
    console.error("An error occurred while deleting.", err);
  }
});

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg"

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "booklist",
  password: "123456",
  port: 5432
});

db.connect();

// Global variables
const app = express();
const port = 3000;

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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Handle requests here
app.get("/", async (req, res) => {
  let booklist = [];
  try {
    const result = await db.query("SELECT * FROM books");
    booklist = result.rows;
  }
  catch(error) {
    console.log("An error occurred when querying the database");
  }

  res.render("index.ejs", { bookList: booklist });
});

app.get("/search", (req, res) => {
  res.render("search.ejs");
})

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
  let rating = 0;
  if(req.body.rating) {
    rating = parseInt(req.body.rating);
  }

  try {
    const result = await db.query("INSERT INTO books (title, subtitle, author, cover, notes, rating) VALUES ($1, $2, $3, $4, $5, $6)",
    [req.body.title, req.body.subtitle, req.body.author, req.body.cover, req.body.notes, rating]);
    res.redirect("/");
  }
  catch(error) {
    console.log("Error inputting data");
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
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
    book = result.rows[0];
  }
  catch(error) {
    console.log("Error retrieving book info from database");
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
  catch(error) {
    console.log("An error occurred while trying to update.");
    console.log(error);
  }

  res.redirect("/");
});

app.post("/delete/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.query("DELETE FROM books WHERE id = $1", [id]);
    res.redirect("/");
  }
  catch(error) {
    console.log("An error occurred while deleting.");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
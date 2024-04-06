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
app.get("/", (req, res) => {
  res.render("index.ejs", { temp: "something" });
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
    cover: "",
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

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
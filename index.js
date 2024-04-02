import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg"

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "",
  password: "123456",
  port: 5432
});

// Global variables
const app = express();
const port = 3000;

// Book search global variables
const apiBookSearch = "https://openlibrary.org/search.json";
const apiCoverSearch = "https://covers.openlibrary.org/b/olid/";
let suggestions = [];
let currentPage = 1;
let formattedQuery = "";
let prevAllowed = false;
let nextAllowed = false;
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
      prevAllowed = false;
      numFound = 0;
      break;
    case "prev":
      --currentPage;
      if(currentPage === 1) prevAllowed = false;
      nextAllowed = true;
      break;
    case "next":
      ++currentPage;
      if(currentPage * 10 >= numFound) nextAllowed = false;
      prevAllowed = true;
      break;
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

    // Check if there are enough total results to show a new page of results
    if(currentPage * 10 >= numFound) nextAllowed = false;
    else nextAllowed = true;

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
      }

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
    total: numFound
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
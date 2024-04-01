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

const app = express();
const port = 3000;
const apiBookSearch = "https://openlibrary.org/search.json";
const apiCoverSearch = "https://covers.openlibrary.org/b/isbn/";
let suggestions = [];
let currentSearchResults;

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
  const query = req.body.searchQuery.trim();
  const formattedQuery = query.replace(/\s+/g, '+');
  const queryParams = {
    q: formattedQuery
  };

  try {
    suggestions = [];
    const currentSearchResults = await axios.get(apiBookSearch, { params: queryParams });

    for(let i = 0; i < currentSearchResults.data.numFound; i++) {
      if(i >= 10) break;

      const book = currentSearchResults.data.docs[i];
      const cover = book.isbn[0];
      const option = {
        title: book.title,
        subtitle: book.subtitle || "",
        author: book.author_name[0],
        cover: apiCoverSearch + cover + "-M.jpg"
      }

      suggestions.push(option);
    }
  }
  catch(err) {
    console.log(err);
  }

  res.render("search.ejs", { searchResults: suggestions });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
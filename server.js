var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");
const exphbs = require("express-handlebars");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: false }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
var MONGODB_URI = process.env.MONGODB_URI|| "mongodb://heroku_pjn0clhv:ulvei5a0bhpc4h2k0tkcltqkf6@ds237717.mlab.com:37717/heroku_pjn0clhv";
mongoose.connect(MONGODB_URI);

// Routes

// A GET route for scraping the echojs website
app.get("/", function(req, res) {
    // console.log("route ping");
  // First, we grab the body of the html with request
  axios.get("https://www.nytimes.com/section/world").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
//      console.log (response)
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $(".story").each(function(i, element) {
//        console.log(response.data)
//        console.log(this.children)
        let myFirstPromise = new Promise((resolve,reject)=>{
                // Save an empty result objec
      var result = {};
//


      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .find(".story-body")
        .find(".headline")
        .find("a")
        .text();


      result.link = $(this)
        .find(".story-body")
        .find(".headline")
        .find("a")
        .attr("href");


      result.summary= $(this)
        .find(".story-body")
        .find(".summary")
        .text();
         console.log(result)
        resolve(result);
        });

        myFirstPromise.then((response)=>{
            if (response.title !== ""){
            db.Article.findOneAndUpdate(
            { title: response.title },
            response,
            { upsert: true })
            .then(update => {
              if(update) {
                console.log('article in db');
              } else {
                console.log('new article');
              };
            })
            console.log("-----------------")
            console.log(response);
            }
        });

    });
      res.render("index");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article
    .find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
//    .catch(function(err) {
//      // If an error occurred, send it to the client
//      res.json(err);
//    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article
    .findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
//    .catch(function(err) {
//      // If an error occurred, send it to the client
//      res.json(err);
//    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note
    .create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.delete("/delete",function (req,res){
    console.log(req.body.thisId)
   db.Note
    .findByIdAndRemove(req.body.thisId, (err,user) => {
  if (err) {
      throw err;
    }
    else {
      res.json(user);
    }
});
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});

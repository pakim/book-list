<h1>Project Summary</h1>
Project that uses node, express, and postgresql to create a simple book list.
The user can search for books from the <code>https://openlibrary.org/developers/api</code> or create a custom entry to rate and review the books they have read.

<h2>Setup</h2>
Have node and postgres installed. 
Clone the project and use <code>npm i</code> to install all dependencies.
The database query is used to create the table in pgadmin4.

<h3>Database Table Query</h3>
<pre>
  create table books (
  	id serial primary key,
  	title varchar(200) not null,
  	subtitle varchar(200),
  	author varchar(50),
  	cover varchar(200),
  	notes text,
  	rating int
  );
</pre>

In the index.js file, replace database user, database, password, and port to your own.
Then start project from the command line using <code>node index.js</code> or <code>nodemon index.js</code>.

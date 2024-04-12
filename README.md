<h1>Project Summary</h1>
Project that uses node, express, and postgresql to create a simple book list.
The user can search for books from the <code>https://openlibrary.org/developers/api</code> or create a custom entry to rate and review the books they have read.

<h2>Setup</h2>
Have node and postgres installed. <br>
Clone the project and use <code>npm install</code> to install all dependencies.<br>
The database query is used to create the table in pgadmin4.

<h3>Database Table Query</h3>
<pre>
  create table users (
    id serial primary key,
    email varchar(100) unique not null,
    password varchar(100) not null
  );
</pre>

<pre>
  create table books (
    id serial primary key,
    title varchar(200) not null,
    subtitle varchar(200),
    author varchar(50),
    cover varchar(200),
    notes text,
    rating int,
    userid int,
    foreign key (userid) references users(id)
  );
</pre>

Add a .env file to the project and add the environment variables:
<pre>
SESSION_SECRET="yoursecretword"
PG_USER="postgres"
PG_HOST="your host (eg localhost)"
PG_DATABASE="database name"
PG_PASSWORD="your password"
PG_PORT="5432"
SALT_ROUNDS="number of salt rounds"
</pre>
Replace the values in the .env with your own.<br>
Then start project from the command line using <code>node index.js</code> or <code>nodemon index.js</code>.

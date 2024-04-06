<h2>Database Table Query</h2>
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

var mysql = require('mysql')

var connection = mysql.createConnection({
  // host: process.env.DB_HOST,
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,
  // database: process.env.DB_NAME,
  // port: process.env.DB_PORT,
  //socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock'

  host: "127.0.0.1",
  user: "root",
  password: "root",
  socketPath: "/Applications/MAMP/tmp/mysql/mysql.sock",
  port: 8887,
  database : "InstaGraham"
})

connection.connect()

// connection.query('SELECT 1 + 1 AS solution', function(err,res,fields){
//   if(err) console.log(err);
//   console.log('solution: ', res[0].solution);
// });

module.exports = connection;
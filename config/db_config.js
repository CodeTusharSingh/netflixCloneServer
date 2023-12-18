var mysql = require('mysql');

// var con = mysql.createConnection({
//   host: "sql12.freesqldatabase.com",    
//   user: "sql12660134",
//   password: "L4IItXvJCt" ,
//   database : "sql12660134"
// });
var con = mysql.createConnection({
  host: "sql12.freesqldatabase.com",
  user: "sql12671206",
  password: "mV95dHidzf",
  database: "sql12671206"
});
// var con = mysql.createConnection({
//   connectionLimit: 10,
//   host: "localhost",
//   user: "root",
//   password: "root",
//   database : "mydb"  
// });
module.exports = con;
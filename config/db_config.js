var mysql = require('mysql');

// var con = mysql.createConnection({
//   host: "sql12.freesqldatabase.com",    
//   user: "sql12660134",
//   password: "L4IItXvJCt" ,
//   database : "sql12660134"
// });
var con = mysql.createPool({
  connectionLimit: 10,
  host: "sql6.freesqldatabase.com",
  user: "sql6690326",
  password: "uLQ1CfHiQI",
  database: "sql6690326"
});
// var con = mysql.createConnection({
//   connectionLimit: 10,
//   host: "localhost",
//   user: "root",
//   password: "root",
//   database : "mydb"  
// });
module.exports = con;

const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
var con = require("./config/db_config.js");
var Mainrouter = require('./router/auth.js');
const cors = require('cors')


const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: 'http://localhost:3000',
  methods: 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
  credentials: true,
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
   optionsSuccessStatus: 204,
}));




// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
//   res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
//   res.setHeader('Access-Control-Allow-Credentials', 'true');
//   next();
// });

// we link the router file to make our router easy
app.use(Mainrouter)


app.get('/step1', (req, res) => {
  const token = req.cookies.access_token;
  try {
    const decoded = jwt.verify(token, 'ram');
    res.status(200).json({ message: "User is valid" });
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

app.get('/step2of1', (req, res) => {
  const token = req.cookies.access_token;
  console.log('Token: ', token);
  try {
    const verified = jwt.verify(token, 'ram');
    if (verified) {
      console.log("Successfully Verified in step 2 of 1");
      const email = verified.user_id;
      res.status(200).json({ email });
    } else {
      console.log('Verification failed in step2of1');
      res.status(401).json({ error: "Unauthorized" }); // 401 for unauthorized
    }
  } catch (err) {
    console.error('An error occurred in step2of1:', err);
    res.status(500).json({ error: "Internal Server Error" }); // 500 for server error
  }
});




app.post('/step2of1', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(email);
    console.log('password is ' + password);
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Hash the password securely
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user data into the database
    const sql = 'INSERT INTO UserData (email, password) VALUES (?, ?)';
    const values = [email, passwordHash];

    con.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error inserting data:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const token = jwt.sign(
        { user_id: email }, 'ram');
      res.cookie("Finish_token", token, {
        httpOnly: false,
        secure: true,
        sameSite: 'None'
      });
      res.status(200).json({ msg: "data inserted successfully" });
      console.log('Data inserted successfully');
    });

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




app.post('/step2of2', (req, res) => {
  try {
    const token = req.cookies.access_token;
    const verified = jwt.verify(token, 'ram');

    if (!verified) {
      console.log('Token verification failed in /step2of2');
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const email = verified.user_id;
    const plan = req.body.plan;


    // con.connect(function (err) {
    // if (err) console.log(err);
    // console.log("connected");

    const sql = "UPDATE UserData SET plan = '" + plan + "' WHERE email = '" + email + "' ";
    console.log(plan);

    con.query(sql, (err, result) => {
      if (err) {
        console.error("Error updating plan:", err);
        res.status(500).json({ error: "Error updating plan" });
      } else {
        console.log("Plan updated successfully");
        res.sendStatus(200);
      }
    })
  }
  catch (err) {
    console.error('An error occurred in /step2of2:', err);
    res.status(500).json({ error: "Internal Server Error" });
  }
  // })
})


app.post('/signin', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const getUserQuery = 'SELECT email,password,plan,feedback,validity FROM UserData WHERE email = ?';
    con.query(getUserQuery, [email], async (err, result) => {
      if (err) {
        console.error(err);
        return res.sendStatus(500); // Internal Server Error
      }

      if (result.length === 0) {
        return res.sendStatus(404); // User not found
      }

      // Check password
      const user = result[0];
      const checkPlan = result[0].plan;
      const passwordMatch = await bcrypt.compare(password, user.password);


      if (!passwordMatch) {
        return res.sendStatus(401); // Unauthorized
      }

      if (checkPlan === null) {
        const token = jwt.sign(
          { user_id: email }, 'ram');
        res.cookie("Finish_token", token, {
          httpOnly: false,
          secure: true,
          sameSite: 'None'
        });
        const token1 = jwt.sign(
          { user_id: email }, 'ram');
        res.cookie("access_token", token1, {
          httpOnly: false,
          secure: true,
          sameSite: 'None'
        });
        return res.sendStatus(403);
      }
      // const token = jwt.sign(
      //   { user_id: email }, 'ram');
      // res.cookie("signed_token", token, {
      //   httpOnly: false
      // });

      // const token = jwt.sign(
      //     { user_id: email },
      //     'ram', // secret key
      //   );

      //   res.cookie("signed_token", token, {
      //     httpOnly: false,
      //   });
      //   // Authentication successful
      //   return res.sendStatus(200);
      // });

      const token = jwt.sign(
        { user_id: email },
        'ram', // secret key
      );

      // Set the expiration date to 7 days from now
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);

      res.cookie("signed_token", token, {
        httpOnly: false,
        secure: true,
        expires: expirationDate,
        sameSite: 'None'
      });
      return res.sendStatus(200);
    });

    // Authentication successful



  } catch (error) {
    console.error('An unexpected error occurred:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get("/api/getkey", (req, res) => {
  return res.status(200).json({ key: "rzp_test_7nN49of2SHO9r2" })
});


app.post("/checkout", async (req, res) => {
  const instance = new Razorpay({
    key_id: "rzp_test_7nN49of2SHO9r2",
    key_secret: "LNkKxU02JMXw1ffgtKAhWc6k",
  });
  const options = {
    amount: Number(req.body.amount * 100),
    currency: "INR",
  };
  const order = await instance.orders.create(options);

  return res.status(200).json({
    success: true,
    order,
  });
});

// Function to calculate validity date based on plan
function calculateValidityDate(plan) {
  const currentDate = new Date();
  let validityDays;

  switch (plan) {
    case 149:
      validityDays = 10;
      break;
    case 199:
      validityDays = 15;
      break;
    case 499:
      validityDays = 25;
      break;
    case 649:
      validityDays = 30;
      break;
    default:
      validityDays = 0;
  }

  const validityDate = new Date(currentDate);
  validityDate.setDate(currentDate.getDate() + validityDays);

  // Format the validity date to 'YYYY-MM-DD'
  return validityDate.toISOString().split('T')[0];
}


app.post('/paymentverification', async (req, res) => {
  try {
    const token = req.cookies.plan_token;
    const emailToken = req.cookies.access_token;
    const decoded = jwt.verify(token, 'ram');
    const decodeds = jwt.verify(emailToken, 'ram');

    const plan = decoded.plan;
    const email = decodeds.user_id;
    console.log(plan);
    console.log(email);

    console.log(req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secretKey = 'LNkKxU02JMXw1ffgtKAhWc6k';

    // Verify the signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      const sql = `UPDATE UserData SET plan = ?, validity = ? WHERE email = ?`;
      const values = [plan, calculateValidityDate(plan), email];

      con.query(sql, values, (err, result) => {
        if (err) {
          console.error('Error updating plan:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        console.log('Plan and validity updated successfully');
        const token = jwt.sign({ user_id: email }, 'ram'); // secret key

        // Set the expiration date to 7 days from now
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);

        res.cookie("signed_token", token, {
          httpOnly: false,
          secure: true,
          expires: expirationDate,
          sameSite: 'None'
        });
        return res.redirect('http://localhost:3000/home');
      });




    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }

})

// Middleware to check validity before accessing protected routes
// function checkValidity(req, res, next) {
//   const token = req.cookies.signed_token;
//   if (token) {
//     try {
//       const decoded = jwt.verify(token, 'ram');
//       const email = decoded.user_id;

//       // Query the database to get the user's validity date and plan
//       const sql = 'SELECT plan, validity FROM UserData WHERE email = ?';
//       con.query(sql, [email], (err, result) => {
//         if (err) {
//           console.error('Error checking validity:', err);
//           return res.status(500).json({ error: 'Internal Server Error' });
//         }

//         if (result.length > 0) {
//           const validityDate = new Date(result[0].validity);
//           const currentDate = new Date();

//           // If the validity date has passed, clear the signed_token cookie
//           if (validityDate < currentDate) {
//               res.clearCookie('access_token', { secure: true, sameSite: 'None' });
//   res.clearCookie('Finish_token', { secure: true, sameSite: 'None' });
//   res.clearCookie('plan_token', { secure: true, sameSite: 'None' });
//   res.clearCookie('signed_token', { secure: true, sameSite: 'None' });
//             console.log('Validity has passed');

//             // Update the plan column to null
//             const updateSql = 'UPDATE UserData SET plan = NULL WHERE email = ?';
//             con.query(updateSql, [email], (updateErr, updateResult) => {
//               if (updateErr) {
//                 console.error('Error updating plan to null:', updateErr);
//                 return res.status(500).json({ error: 'Internal Server Error' });
//               } else {
//                 console.log('Plan updated to null successfully');

//               }
//             })
//           }
//           return res.redirect('http://localhost:3000');
//         }
//         next(); // Proceed to the next middleware or route
//       });
//     } catch (error) {
//       console.error('Error decoding token:', error);
//       return res.status(401).json({ error: 'Unauthorized' });
//     }
//   } else {
//     next(); // Proceed to the next middleware or route
//   }
// }



// app.get('/protected-route', checkValidity, (req, res) => {
//   // Your protected route logic goes here
//   res.send('Protected Route');
// });



app.get("/main", (req, res) => {
  try {
    const token = req.cookies.Finish_token;
    const decoded = jwt.verify(token, 'ram');
    return res.status(201).json({ msg: "token is valid" });
  } catch (error) {
    console.error('Error while verifying JWT token:', error.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
});


app.post('/token', async (req, res) => {
  console.log('token');

  const plan = req.body.plan;
  const token = jwt.sign({ plan }, 'ram');
  res.cookie("plan_token", token, {
    httpOnly: false,
    secure: true,
    sameSite: 'None'
  });
  return res.status(201).json({ msg: "token success" });
})


app.get('/home', (req, res) => {
    const token = req.cookies.signed_token;
    try {
  const verified = jwt.verify(token, 'ram');
      if (verified) {
            const email = verified.user_id;
        const sql = `SELECT plan, validity FROM UserData WHERE email = ${verified.user_id}`;
        con.query(sql, [email], (err, result) => {

            if (err) {
                console.error('Error checking validity:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            if (result.length > 0) {
                const validityDate = new Date(result[0].validity);
                const currentDate = new Date();

                // If the validity date has passed, clear the signed_token cookie
                if (validityDate < currentDate) {
                    res.clearCookie('access_token', { secure: true, sameSite: 'None' });
                    res.clearCookie('Finish_token', { secure: true, sameSite: 'None' });
                    res.clearCookie('plan_token', { secure: true, sameSite: 'None' });
                    res.clearCookie('signed_token', { secure: true, sameSite: 'None' });
                    console.log('Validity has passed');

                    // Update the plan column to null
                    const updateSql = 'UPDATE UserData SET plan = NULL WHERE email = ?';
                    con.query(updateSql, [email], (updateErr, updateResult) => {
                        if (updateErr) {
                            console.error('Error updating plan to null:', updateErr);
                            return res.status(500).json({ error: 'Internal Server Error' });
                        } else {
                            console.log('Plan updated to null successfully');

                        }
                    })
                    return res.redirect('http://localhost:3000');
                }
            }

        })
            res.status(200).json({ email });
        } else {
            res.status(401).json({ error: "Unauthorized" }); // 401 for unauthorized
      }
        
    } catch (err) {
        console.error('An error occurreds:', err);
        res.status(500).json({ error: "Internal Server Error" }); // 500 for server error
    }
});


app.get('/homeaccount/:email', (req, res) => {
  const email = req.params.email;
  const query = `
    SELECT plan,validity
    FROM UserData
    WHERE email = ?;
  `;

  con.query(query, [email], (err, results) => {
    if (err) {
      console.error('Error retrieving user list:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(results);
  });
});


app.get('/userList/:email', (req, res) => {
  const email = req.params.email;
  const query = `
    SELECT c.contentImg, c.contentTitle, c.contentType, c.contentLink, c.contentLinkName
    FROM UserList ul
    JOIN Content c ON ul.contentLinkName = c.contentLinkName
    WHERE ul.email = ?;
  `;

  con.query(query, [email], (err, results) => {
    if (err) {
      console.error('Error retrieving user list:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(results);
  });
});

app.get('/userHistory/:email', (req, res) => {
  const email = req.params.email;
  const query = `
    SELECT c.contentImg, c.contentTitle, c.contentType, c.contentLink, c.contentLinkName
    FROM UserHistory uh
    JOIN Content c ON uh.contentLinkName = c.contentLinkName
    WHERE uh.email = ?;
  `;

  con.query(query, [email], (err, results) => {
    if (err) {
      console.error('Error retrieving user history:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(results);
  });
});

app.get('/user/feedback/check/:email', (req, res) => {
  const email = req.params.email;

  // Note: Use backticks for table and column names, and don't use quotes for placeholders
  const query = "SELECT feedback FROM UserData WHERE email = ?";

  con.query(query, [email], (err, result) => {
    if (err) {
      // Handle the error
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Check if feedback exists and is not empty
    if (result && result.length > 0 && result[0].feedback !== null) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: 'Feedback not found' });
    }
  });
});




app.post('/userList/add', (req, res) => {
  const { email, contentLinkName } = req.body;

  // Check if the user ID and content ID are provided
  if (!email || !contentLinkName) {
    return res.status(400).json({ error: 'Email and contentLinkName are required.' });
  }

  // Check if the user and content exist in the database
  const checkUserQuery = 'SELECT * FROM UserData WHERE email = ?';
  const checkContentQuery = 'SELECT * FROM Content WHERE contentLinkName = ?';

  con.query(checkUserQuery, [email], (errUser, userResults) => {
    if (errUser) {
      console.error('Error checking user:', errUser);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    con.query(checkContentQuery, [contentLinkName], (errContent, contentResults) => {
      if (errContent) {
        console.error('Error checking content:', errContent);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (contentResults.length === 0) {
        return res.status(404).json({ error: 'Content not found.' });
      }

      // Add content to user's list
      const addToUserListQuery = 'INSERT INTO UserList (email, contentLinkName) VALUES (?, ?)';

      con.query(addToUserListQuery, [email, contentLinkName], (errAdd) => {
        if (errAdd) {
          console.error('Error adding content to user list:', errAdd);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        return res.status(200).json({ message: 'Alright' });
      });

    });
  });
});



app.post('/userList/remove', (req, res) => {
  const { email, contentLinkName } = req.body;

  if (!email || !contentLinkName) {
    return res.status(400).json({ error: 'Email and contentLinkName are required.' });
  }

  const checkUserQuery = 'SELECT * FROM UserData WHERE email = ?';
  const checkContentQuery = 'SELECT * FROM Content WHERE contentLinkName = ?';

  con.query(checkUserQuery, [email], (errUser, userResults) => {
    if (errUser) {
      console.error('Error checking user:', errUser);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    con.query(checkContentQuery, [contentLinkName], (errContent, contentResults) => {
      if (errContent) {
        console.error('Error checking content:', errContent);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (contentResults.length === 0) {
        return res.status(404).json({ error: 'Content not found.' });
      }

      // Remove content from user's list
      const removeFromUserListQuery = 'DELETE FROM UserList WHERE email = ? AND contentLinkName = ?';

      con.query(removeFromUserListQuery, [email, contentLinkName], (errRemove) => {
        if (errRemove) {
          console.error('Error removing content from user list:', errRemove);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        return res.status(200).json({ message: 'Removed successfully' });
      });
    });
  });
});

app.post('/userList/check', (req, res) => {
  const { email, contentLinkName } = req.body;

  if (!email || !contentLinkName) {
    return res.status(400).json({ error: 'Email and contentLinkName are required.' });
  }

  const checkUserQuery = 'SELECT * FROM UserData WHERE email = ?';
  const checkContentQuery = 'SELECT * FROM Content WHERE contentLinkName = ?';
  const checkUserContentQuery = 'SELECT * FROM UserList WHERE email = ? AND contentLinkName = ?';

  con.query(checkUserQuery, [email], (errUser, userResults) => {
    if (errUser) {
      console.error('Error checking user:', errUser);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    con.query(checkContentQuery, [contentLinkName], (errContent, contentResults) => {
      if (errContent) {
        console.error('Error checking content:', errContent);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (contentResults.length === 0) {
        return res.status(404).json({ error: 'Content not found.' });
      }

      con.query(checkUserContentQuery, [email, contentLinkName], (errUserContent, userContentResults) => {
        if (errUserContent) {
          console.error('Error checking UserList:', errUserContent);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (userContentResults.length > 0) {
          return res.status(409).json({ error: 'Entry already exists in UserList.' });
        }
        return res.status(200).json({ message: 'checked successfully' });
      });
    });
  });
});




app.post('/userHistory/add', (req, res) => {
  const { email, contentLinkName } = req.body;

  // Check if the user ID and content ID are provided
  if (!email || !contentLinkName) {
    return res.status(400).json({ error: 'Email and contentLinkName are required.' });
  }

  // Check if the user and content exist in the database
  const checkUserQuery = 'SELECT * FROM UserData WHERE email = ?';
  const checkContentQuery = 'SELECT * FROM Content WHERE contentLinkName = ?';

  con.query(checkUserQuery, [email], (errUser, userResults) => {
    if (errUser) {
      console.error('Error checking user:', errUser);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    con.query(checkContentQuery, [contentLinkName], (errContent, contentResults) => {
      if (errContent) {
        console.error('Error checking content:', errContent);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (contentResults.length === 0) {
        return res.status(404).json({ error: 'Content not found.' });
      }

      // Add content to user's list
      const addToUserListQuery = 'INSERT INTO UserHistory (email, contentLinkName) VALUES (?, ?)';

      con.query(addToUserListQuery, [email, contentLinkName], (errAdd) => {
        if (errAdd) {
          console.error('Error adding content to user history:', errAdd);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        return res.status(200).json({ message: 'Alright' });
      });

    });
  });
});


app.post('/user/feedback', (req, res) => {
  const { email, feedback } = req.body;

  // Check if the user ID and content ID are provided
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Check if the user and content exist in the database
  const checkUserQuery = 'SELECT * FROM UserData WHERE email = ?';

  con.query(checkUserQuery, [email], (errUser, userResults) => {
    if (errUser) {
      console.error('Error checking user:', errUser);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }


    const addFeedbackQuery = "UPDATE UserData SET feedback = '" + feedback + "' WHERE email = '" + email + "' ";


    con.query(addFeedbackQuery, [email, feedback], (errAdd) => {
      if (errAdd) {
        console.error('Error adding content to user history:', errAdd);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      return res.status(200).json({ message: 'Alright' });
    });

  });
});

app.put('/user/feedback/delete', (req, res) => {
  const { email } = req.body;

  // Use backticks for table and column names, and don't use quotes for placeholders
  const query = "UPDATE UserData SET feedback = NULL WHERE email = ?";

  con.query(query, [email], (err, result) => {
    if (err) {
      // Handle the error
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Check if any rows were affected by the update
    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Feedback deleted successfully' });
    } else {
      res.status(404).json({ message: 'Feedback not found for the given email' });
    }
  });
});

app.post('/content/search', (req, res) => {
  try {
    const { searchTerm } = req.body;

    // Validate input
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    // Perform the search in the ContentTable
    const searchResultsQuery = 'SELECT * FROM Content WHERE REPLACE(contentLinkName, " ", "") LIKE ?';
    const searchPattern = `%${searchTerm.replace(/\s/g, '')}%`;

    con.query(searchResultsQuery, [searchPattern], (err, results) => {
      if (err) {
        console.error('Error performing search:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // Send the search results
      res.status(200).json({ results });
    });
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/removeToken', (req, res) => {
  // Clear the existing tokens by setting expired tokens in the cookies
  res.clearCookie('access_token', { secure: true, sameSite: 'None' });
  res.clearCookie('Finish_token', { secure: true, sameSite: 'None' });
  res.clearCookie('plan_token', { secure: true, sameSite: 'None' });
  res.clearCookie('signed_token', { secure: true, sameSite: 'None' });

  // Send a response indicating the token removal
  res.status(200).json({ msg: 'Cookies removed' });
});

// app.listen(3001, function (err) {
//   if (err) console.log("Error in server setup")
//   console.log("Server listening on Port", 3001);
// })

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => { console.log(`Server running on PORT ${PORT}`) })

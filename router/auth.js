const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");
var con = require('../config/db_config');

router.post("/generateToken", (req, res) => {
  const email = req.body.email;
  const token = jwt.sign({ user_id: email }, 'ram')
  console.log('Generated Token:', token);
  res.cookie("access_token", token, {
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
  });
  res.sendStatus(201);
});


router.post('/reg', (req, res) => {
  const email = req.body.email;
  const sql = "SELECT email,password,plan,feedback,validity FROM UserData WHERE email = ?";
  con.query(sql, [email], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (result.length == 1) {
      console.log('user exits')
      console.log(result[0].email);
      console.log(result[0].plan);
      const plan = result[0].plan;


      if (plan != null) {
        return res.status(408).json({ msg: 'user already playment' });
      }
      return res.status(409).json({ msg: " This email is already registered" });
    }
    else {
      return res.status(201).json({ msg: "user not exits " })
    }
  })
})

router.post('/Step4of1', (req, res) => {
  try {
    const { email, password } = req.body;
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    // Check if user exists
    const getUserQuery = 'SELECT * FROM UserData WHERE email = ?';
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
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.sendStatus(401); // Unauthorized
      }
      // Authentication successful
      const token = jwt.sign(
        { user_id: email }, 'ram');
      res.cookie("Finish_token", token, {
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      });
      return res.sendStatus(200);
    });
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





router.get('/getPlan', (req, res) => {
  try {
    const token = req.cookies.plan_token;
    const decoded = jwt.verify(token, 'ram');
    const plan = decoded.plan;
    console.log(plan);
    return res.status(200).json({ plan });
  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
})


router.get("/verifyAllToken", (req, res) => {
  try {
    const token = req.cookies.plan_token;
    const emailToken = req.cookies.access_token;
    const decoded = jwt.verify(token, 'ram');
    const decodeds = jwt.verify(emailToken, 'ram');
    return res.status(201).json({ msg: "token is valid" });
  } catch (error) {
    console.error('Error while verifying JWT token:', error.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

module.exports = router;

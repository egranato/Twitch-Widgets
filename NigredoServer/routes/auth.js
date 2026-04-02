// Express route for /api/authreturn
const express = require('express');
const router = express.Router();
const authService = require('../services/auth-service');

router.get('/authreturn', (req, res) => {
  const { code } = req.query;
  authService
    .getUserCreds(code)
    .then((_) => {
      res.send(`<h1>Good to go!</h1>`);
    })
    .catch((error) => {
      res.send(`
        <h1>Error!</h1>
        <p>code: ${error.code}</p>
        <p>status: ${error.status}</p>
        <p>message: ${error.message}</p>
      `);
    });
});

module.exports = router;

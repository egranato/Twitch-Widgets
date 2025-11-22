// Express route for /api/client-id
const express = require('express');
const router = express.Router();

router.get('/client-id', (req, res) => {
  res.send({ clientId: process.env.CLIENT_ID });
});

module.exports = router;

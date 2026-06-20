const express = require('express');
const { User } = require('../models/user');

const router = express.Router();

// Envuelve handlers async para centralizar el manejo de errores.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Login local validado contra MySQL. Único usuario válido: admin / 1234.
router.post(
  '/login',
  wrap(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
    }
    const user = await User.findOne({ where: { username } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }
    res.json({ ok: true, username: user.username });
  })
);

module.exports = router;

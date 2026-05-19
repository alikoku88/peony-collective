const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Seed admin on first run
const seedAdmin = async () => {
  try {
    const exists = await User.findOne({ email: 'info@peonycollective.com' });
    if (!exists) {
      await User.create({
        email: 'info@peonycollective.com',
        password: '123456',
        name: 'Peony Admin',
        role: 'admin'
      });
      console.log('✅ Admin kullanıcı oluşturuldu');
    }
  } catch (e) {
    console.error('Seed error:', e);
  }
};
setTimeout(seedAdmin, 3000);

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Email veya şifre hatalı' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Email veya şifre hatalı' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get all users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Create user
router.post('/users', authMiddleware, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const user = await User.create({ email, password, name, role });
    res.json({ id: user._id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Delete user
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;

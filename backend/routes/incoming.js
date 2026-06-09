const express = require('express');
const axios = require('axios');
const IncomingMessage = require('../models/IncomingMessage');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get all incoming messages
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, unread } = req.query;
    const query = {};
    if (unread === 'true') query.isRead = false;
    const total = await IncomingMessage.countDocuments(query);
    const messages = await IncomingMessage.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ messages, total });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Mark as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await IncomingMessage.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Mark all as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await IncomingMessage.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Reply to a message
router.post('/:id/reply', authMiddleware, async (req, res) => {
  try {
    const msg = await IncomingMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Mesaj bulunamadı' });
    const { message } = req.body;
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: msg.from,
        type: 'text',
        text: { body: message }
      },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.error?.message || 'Gönderilemedi' });
  }
});

// Unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await IncomingMessage.countDocuments({ isRead: false });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ count: 0 });
  }
});

// Delete message
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await IncomingMessage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;

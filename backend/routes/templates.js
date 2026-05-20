const express = require('express');
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Debug endpoint
router.get('/debug', authMiddleware, async (req, res) => {
  res.json({
    waba_id: process.env.WABA_ID,
    token_start: process.env.WHATSAPP_TOKEN?.substring(0, 10),
    phone_id: process.env.PHONE_NUMBER_ID
  });
});

// Get WhatsApp templates
router.get('/', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${process.env.WABA_ID}/message_templates`,
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    );
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: 'Template listesi alınamadı', detail: e.response?.data });
  }
});

module.exports = router;

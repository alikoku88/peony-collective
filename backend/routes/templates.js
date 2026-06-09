const express = require('express');
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

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

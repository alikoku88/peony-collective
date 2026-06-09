const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const IncomingMessage = require('../models/IncomingMessage');

// Verify webhook
router.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
});

// Receive messages
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      for (const entry of (body.entry || [])) {
        for (const change of (entry.changes || [])) {
          const value = change.value;
          const messages = value?.messages;
          const contacts = value?.contacts;

          if (messages) {
            for (const msg of messages) {
              const from = msg.from;
              const waMessageId = msg.id;
              const type = msg.type;

              // Get contact name
              let name = 'Bilinmeyen';
              if (contacts && contacts.length) {
                name = contacts[0]?.profile?.name || 'Bilinmeyen';
              }
              // Try to find in DB
              try {
                const dbContact = await Contact.findOne({ phone: from });
                if (dbContact) name = dbContact.name;
              } catch(e) {}

              // Get message text
              let messageText = '';
              if (type === 'text') messageText = msg.text?.body || '';
              else if (type === 'image') messageText = '📷 Fotoğraf';
              else if (type === 'video') messageText = '🎥 Video';
              else if (type === 'audio') messageText = '🎤 Ses mesajı';
              else if (type === 'document') messageText = '📄 Dosya';
              else if (type === 'location') messageText = '📍 Konum';
              else if (type === 'sticker') messageText = '🎨 Sticker';
              else messageText = `[${type}]`;

              // Save to DB (avoid duplicates)
              const existing = await IncomingMessage.findOne({ waMessageId });
              if (!existing) {
                await IncomingMessage.create({ from, name, message: messageText, type, waMessageId });
                console.log(`📩 New message from ${name} (${from}): ${messageText}`);
              }
            }
          }
        }
      }
    }
    res.status(200).send('OK');
  } catch(e) {
    console.error('Webhook error:', e);
    res.status(200).send('OK');
  }
});

module.exports = router;

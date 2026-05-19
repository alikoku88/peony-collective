const express = require('express');
const router = express.Router();

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
router.post('/', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        const messages = change.value?.messages;
        if (messages) {
          messages.forEach(msg => {
            console.log('📩 Incoming message:', msg.from, msg.text?.body);
          });
        }
      });
    });
  }
  res.status(200).send('OK');
});

module.exports = router;

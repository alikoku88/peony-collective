const express = require('express');
const axios = require('axios');
const Contact = require('../models/Contact');
const Group = require('../models/Group');
const MessageLog = require('../models/MessageLog');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
// Get message logs
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await MessageLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});
// Send bulk message with SSE progress
router.post('/bulk', authMiddleware, async (req, res) => {
  const { message, contactIds, groupIds, messageType, templateName, templateLanguage } = req.body;
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  try {
    // Collect contacts
    let contacts = [];
    if (contactIds && contactIds.length) {
      const found = await Contact.find({ _id: { $in: contactIds } });
      contacts.push(...found);
    }
    if (groupIds && groupIds.length) {
      const groups = await Group.find({ _id: { $in: groupIds } }).populate('contacts');
      for (const g of groups) contacts.push(...g.contacts);
    }
    // Deduplicate
    const seen = new Set();
    contacts = contacts.filter(c => {
      if (seen.has(c._id.toString())) return false;
      seen.add(c._id.toString());
      return true;
    });
    if (!contacts.length) {
      send({ type: 'error', message: 'Kişi bulunamadı' });
      return res.end();
    }
    // Create log
    const log = await MessageLog.create({
      type: messageType === 'template' ? 'template' : 'bulk',
      message, templateName,
      totalContacts: contacts.length,
      contacts: contacts.map(c => c._id),
      status: 'processing'
    });
    send({ type: 'start', total: contacts.length, logId: log._id });
    let sent = 0, failed = 0;
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      try {
        if (messageType === 'template') {
          await axios.post(
            `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: 'whatsapp',
              to: contact.phone,
              type: 'template',
              template: { name: templateName, language: { code: templateLanguage || 'tr' } }
            },
            { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
          );
        } else {
          await axios.post(
            `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: 'whatsapp',
              to: contact.phone,
              type: 'text',
              text: { body: message }
            },
            { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
          );
        }
        sent++;
        send({ type: 'progress', current: i + 1, total: contacts.length, sent, failed, contact: contact.name, status: 'success' });
      } catch (e) {
        failed++;
        console.error('Mesaj gönderim hatası:', JSON.stringify(e.response?.data));
        send({ type: 'progress', current: i + 1, total: contacts.length, sent, failed, contact: contact.name, status: 'failed', error: e.response?.data?.error?.message });
      }
      if (i < contacts.length - 1) {
        const delay = Math.floor(Math.random() * 10000) + 15000;
        send({ type: 'waiting', delay: Math.round(delay / 1000) });
        await new Promise(r => setTimeout(r, delay));
      }
    }
    log.status = 'completed';
    log.sentCount = sent;
    log.failedCount = failed;
    await log.save();
    send({ type: 'complete', sent, failed, total: contacts.length });
    res.end();
  } catch (e) {
    send({ type: 'error', message: e.message });
    res.end();
  }
});
module.exports = router;

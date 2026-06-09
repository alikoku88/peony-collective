const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const Contact = require('../models/Contact');
const Group = require('../models/Group');
const MessageLog = require('../models/MessageLog');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Normalize phone — remove + prefix
function normalizePhone(phone) {
  return phone ? phone.replace(/^\+/, '') : phone;
}

// Get message logs
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await MessageLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Upload media to WhatsApp
router.post('/upload-media', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadı' });

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    form.append('messaging_product', 'whatsapp');
    form.append('type', req.file.mimetype);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/media`,
      form,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          ...form.getHeaders()
        }
      }
    );

    console.log('✅ Media uploaded:', response.data);
    res.json(response.data);
  } catch (e) {
    console.error('Media upload error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.error?.message || 'Görsel yüklenemedi' });
  }
});

// Send bulk message with SSE progress
router.post('/bulk', authMiddleware, async (req, res) => {
  const { message, contactIds, groupIds, messageType, templateName, templateLanguage, mediaId } = req.body;

  console.log('📤 Bulk send request:', { messageType, templateName, mediaId, contactIds: contactIds?.length, groupIds: groupIds?.length });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch(e) {}
  };

  try {
    let contacts = [];
    if (contactIds && contactIds.length) {
      const found = await Contact.find({ _id: { $in: contactIds } });
      contacts.push(...found);
    }
    if (groupIds && groupIds.length) {
      const groups = await Group.find({ _id: { $in: groupIds } }).populate('contacts');
      for (const g of groups) contacts.push(...g.contacts);
    }

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
      const phone = normalizePhone(contact.phone);

      try {
        let payload;
        if (messageType === 'template') {
          payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
              name: templateName,
              language: { code: templateLanguage || 'tr' },
              ...(mediaId ? {
                components: [{
                  type: 'header',
                  parameters: [{ type: 'image', image: { id: mediaId } }]
                }]
              } : {})
            }
          };
        } else {
          payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message }
          };
        }

        console.log(`Sending to ${phone}:`, JSON.stringify(payload));

        const apiRes = await axios.post(
          `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
          payload,
          { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
        );

        console.log(`✅ Sent to ${phone}`);
        sent++;
        send({ type: 'progress', current: i + 1, total: contacts.length, sent, failed, contact: contact.name, status: 'success' });
      } catch (e) {
        const errMsg = e.response?.data?.error?.message || e.message;
        console.error(`❌ Failed to ${phone}:`, errMsg);
        failed++;
        send({ type: 'progress', current: i + 1, total: contacts.length, sent, failed, contact: contact.name, status: 'failed', error: errMsg });
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
    console.error('Bulk send error:', e);
    send({ type: 'error', message: e.message });
    res.end();
  }
});

module.exports = router;

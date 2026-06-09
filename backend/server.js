require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const groupRoutes = require('./routes/groups');
const messageRoutes = require('./routes/messages');
const templateRoutes = require('./routes/templates');
const webhookRoutes = require('./routes/webhook');
const scheduledRoutes = require('./routes/scheduled');
const incomingRoutes = require('./routes/incoming');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend/public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/scheduled', scheduledRoutes);
app.use('/api/incoming', incomingRoutes);
app.use('/webhook', webhookRoutes);

// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Cron: process scheduled messages every minute
cron.schedule('* * * * *', async () => {
  try {
    const ScheduledMessage = require('./models/ScheduledMessage');
    const now = new Date();
    const pending = await ScheduledMessage.find({
      status: 'pending',
      scheduledAt: { $lte: now }
    }).populate('contacts');

    for (const scheduled of pending) {
      scheduled.status = 'processing';
      await scheduled.save();

      const axios = require('axios');
      let sent = 0, failed = 0;

      for (let i = 0; i < scheduled.contacts.length; i++) {
        const contact = scheduled.contacts[i];
        try {
          if (scheduled.messageType === 'template') {
            await axios.post(
              `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
              {
                messaging_product: 'whatsapp',
                to: contact.phone,
                type: 'template',
                template: {
                  name: scheduled.templateName,
                  language: { code: scheduled.templateLanguage || 'tr' }
                }
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
                text: { body: scheduled.message }
              },
              { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
            );
          }
          sent++;
        } catch (e) {
          failed++;
        }

        if (i < scheduled.contacts.length - 1) {
          const delay = Math.floor(Math.random() * 10000) + 15000;
          await new Promise(r => setTimeout(r, delay));
        }
      }

      scheduled.status = 'completed';
      scheduled.sentCount = sent;
      scheduled.failedCount = failed;
      await scheduled.save();
    }
  } catch (err) {
    console.error('Cron error:', err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌸 Peony Collective server running on port ${PORT}`));

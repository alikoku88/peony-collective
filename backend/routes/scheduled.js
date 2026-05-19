const express = require('express');
const ScheduledMessage = require('../models/ScheduledMessage');
const Contact = require('../models/Contact');
const Group = require('../models/Group');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const scheduled = await ScheduledMessage.find().sort({ scheduledAt: 1 });
    res.json(scheduled);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, message, messageType, templateName, templateLanguage, groupIds, contactIds, scheduledAt } = req.body;

    let contacts = [];
    if (contactIds?.length) {
      contacts.push(...await Contact.find({ _id: { $in: contactIds } }));
    }
    if (groupIds?.length) {
      const groups = await Group.find({ _id: { $in: groupIds } }).populate('contacts');
      for (const g of groups) contacts.push(...g.contacts);
    }
    const seen = new Set();
    contacts = contacts.filter(c => {
      if (seen.has(c._id.toString())) return false;
      seen.add(c._id.toString()); return true;
    });

    const scheduled = await ScheduledMessage.create({
      name, message, messageType, templateName, templateLanguage,
      contacts: contacts.map(c => c._id),
      scheduledAt: new Date(scheduledAt)
    });

    res.json(scheduled);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await ScheduledMessage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;

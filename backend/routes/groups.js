const express = require('express');
const Group = require('../models/Group');
const Contact = require('../models/Contact');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find().populate('contacts', 'name phone');
    res.json(groups);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const group = await Group.create(req.body);
    res.json(group);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(group);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Add contacts to group
router.post('/:id/contacts', authMiddleware, async (req, res) => {
  try {
    const { contactIds } = req.body;
    const group = await Group.findById(req.params.id);
    group.contacts = [...new Set([...group.contacts.map(c => c.toString()), ...contactIds])];
    await group.save();
    // Update contacts' group references
    await Contact.updateMany({ _id: { $in: contactIds } }, { $addToSet: { groups: group._id } });
    res.json(group);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;

const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const Contact = require('../models/Contact');
const Group = require('../models/Group');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Get all contacts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, group, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
    if (group) query.groups = group;
    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .populate('groups', 'name color')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    res.json({ contacts, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Create contact
router.post('/', authMiddleware, async (req, res) => {
  try {
    const contact = await Contact.create(req.body);
    res.json(contact);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Bu telefon numarası zaten kayıtlı' });
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update contact
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(contact);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Delete contact
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// CSV Import
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    
    let imported = 0, skipped = 0, errors = [];

    for (const record of records) {
      try {
        const phone = (record.phone || record.Phone || record.telefon || record.Telefon || '').replace(/\s/g, '');
        const name = record.name || record.Name || record.isim || record.İsim || 'İsimsiz';
        if (!phone) { skipped++; continue; }
        
        await Contact.findOneAndUpdate(
          { phone },
          { name, phone, email: record.email || record.Email || '' },
          { upsert: true, new: true }
        );
        imported++;
      } catch (e) {
        skipped++;
        errors.push(e.message);
      }
    }

    res.json({ imported, skipped, total: records.length, errors: errors.slice(0, 5) });
  } catch (e) {
    res.status(500).json({ error: 'CSV işleme hatası: ' + e.message });
  }
});

module.exports = router;

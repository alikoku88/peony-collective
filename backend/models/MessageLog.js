const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema({
  type: { type: String, enum: ['bulk', 'template', 'scheduled', 'single'], default: 'bulk' },
  message: { type: String },
  templateName: { type: String },
  totalContacts: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MessageLog', messageLogSchema);

const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  message: { type: String },
  messageType: { type: String, enum: ['text', 'template'], default: 'text' },
  templateName: { type: String },
  templateLanguage: { type: String, default: 'tr' },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);

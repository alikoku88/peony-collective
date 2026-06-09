const mongoose = require('mongoose');

const incomingMessageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  name: { type: String, default: 'Bilinmeyen' },
  message: { type: String },
  type: { type: String, default: 'text' },
  waMessageId: { type: String },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IncomingMessage', incomingMessageSchema);

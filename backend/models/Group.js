const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
  color: { type: String, default: '#f9a8d4' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', groupSchema);

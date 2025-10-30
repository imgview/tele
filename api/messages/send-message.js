const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { LocalStorage } = require('node-localstorage');

const localStorage = new LocalStorage('./telegram-sessions');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, peerId, message } = req.body;

  if (!sessionId || !peerId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;

    const sessionString = localStorage.getItem(sessionId);
    if (!sessionString) {
      return res.status(401).json({ error: 'Session not found' });
    }

    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    const result = await client.sendMessage(peerId, { 
      message: message 
    });

    res.json({
      success: true,
      messageId: result.id,
      date: result.date
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send message' 
    });
  }
};

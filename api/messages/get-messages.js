const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { LocalStorage } = require('node-localstorage');

const localStorage = new LocalStorage('./telegram-sessions');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, peerId, limit = 50 } = req.body;

  if (!sessionId || !peerId) {
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

    const messages = await client.getMessages(peerId, { 
      limit: parseInt(limit) 
    });

    const messagesList = messages
      .filter(msg => msg.message)
      .map(msg => ({
        id: msg.id,
        text: msg.message,
        out: msg.out,
        date: msg.date,
        fromId: msg.fromId?.userId?.toString() || msg.fromId?.channelId?.toString() || ''
      }));

    res.json({
      success: true,
      messages: messagesList
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get messages' 
    });
  }
};

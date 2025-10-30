const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { LocalStorage } = require('node-localstorage');

// Storage untuk session
const localStorage = new LocalStorage('./telegram-sessions');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, sessionId } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;

    // Create session
    const sessionString = localStorage.getItem(sessionId) || '';
    const session = new StringSession(sessionString);

    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    const result = await client.sendCode({
      apiId: apiId,
      apiHash: apiHash
    }, phoneNumber);

    // Save session
    localStorage.setItem(sessionId, client.session.save());

    res.json({
      success: true,
      phoneCodeHash: result.phoneCodeHash,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send code' 
    });
  }
};

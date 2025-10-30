const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const sessions = require('../sessions');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phoneNumber, sessionId } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;
    if (!apiId || !apiHash) return res.status(500).json({ error: 'API credentials not set' });

    const sessionString = sessions.get(sessionId) || '';
    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });

    await client.connect();
    const result = await client.sendCode({ apiId, apiHash }, phoneNumber);

    sessions.set(sessionId, client.session.save());

    res.json({ success: true, phoneCodeHash: result.phoneCodeHash, sessionId });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ error: error.message, details: error.toString() });
  }
};

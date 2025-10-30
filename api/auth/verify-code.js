const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const sessions = require('../sessions');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phoneNumber, phoneCode, phoneCodeHash, sessionId } = req.body;
  if (!phoneNumber || !phoneCode || !phoneCodeHash || !sessionId)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;

    const sessionString = sessions.get(sessionId) || '';
    if (!sessionString) return res.status(401).json({ error: 'Session not found' });

    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
    await client.connect();

    try {
      await client.invoke(new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode }));
      sessions.set(sessionId, client.session.save());
      const me = await client.getMe();

      res.json({
        success: true,
        sessionId,
        user: { id: me.id.toString(), firstName: me.firstName, lastName: me.lastName, username: me.username }
      });
    } catch (error) {
      if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        res.json({ success: false, requires2FA: true, message: 'Two-factor authentication required' });
      } else throw error;
    }
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: error.message, details: error.toString() });
  }
};

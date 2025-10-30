const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const { LocalStorage } = require('node-localstorage');

const localStorage = new LocalStorage('./telegram-sessions');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, phoneCode, phoneCodeHash, sessionId } = req.body;

  if (!phoneNumber || !phoneCode || !phoneCodeHash || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;

    const sessionString = localStorage.getItem(sessionId) || '';
    const session = new StringSession(sessionString);

    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    try {
      await client.invoke(new Api.auth.SignIn({
        phoneNumber: phoneNumber,
        phoneCodeHash: phoneCodeHash,
        phoneCode: phoneCode
      }));

      // Save authenticated session
      localStorage.setItem(sessionId, client.session.save());

      // Get user info
      const me = await client.getMe();

      res.json({
        success: true,
        sessionId: sessionId,
        user: {
          id: me.id.toString(),
          firstName: me.firstName,
          lastName: me.lastName,
          username: me.username
        }
      });
    } catch (error) {
      if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        res.json({
          success: false,
          requires2FA: true,
          message: 'Two-factor authentication required'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to verify code' 
    });
  }
};

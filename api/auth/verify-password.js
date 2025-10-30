const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const { LocalStorage } = require('node-localstorage');

const localStorage = new LocalStorage('./telegram-sessions');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, sessionId } = req.body;

  if (!password || !sessionId) {
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

    const passwordHash = await client.getPassword();
    await client.invoke(new Api.auth.CheckPassword({
      password: await client.computeCheck(passwordHash, password)
    }));

    // Save authenticated session
    localStorage.setItem(sessionId, client.session.save());

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
    console.error('Verify password error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to verify password' 
    });
  }
};

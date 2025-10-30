const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phoneNumber, phoneCode, phoneCodeHash, sessionString } = req.body;
  if (!phoneNumber || !phoneCode || !phoneCodeHash || !sessionString) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;

    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });

    await client.connect();

    try {
      await client.invoke(new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode
      }));

      const me = await client.getMe();
      res.json({
        success: true,
        sessionString: client.session.save(),
        user: {
          id: me.id.toString(),
          firstName: me.firstName,
          lastName: me.lastName,
          username: me.username
        }
      });
    } catch (error) {
      if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        res.json({ success: false, requires2FA: true });
      } else throw error;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

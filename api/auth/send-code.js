const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phoneNumber, sessionString = '' } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;

    if (!apiId || !apiHash) {
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });

    await client.connect();

    const result = await client.sendCode({ apiId, apiHash }, phoneNumber);

    // Kembalikan sessionString baru ke frontend
    res.json({
      success: true,
      phoneCodeHash: result.phoneCodeHash,
      sessionString: client.session.save()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

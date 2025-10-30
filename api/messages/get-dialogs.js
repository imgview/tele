const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const sessions = require('../sessions');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;

    const sessionString = sessions.get(sessionId);
    if (!sessionString) return res.status(401).json({ error: 'Session not found' });

    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
    await client.connect();

    if (!await client.isUserAuthorized()) return res.status(401).json({ error: 'Not authorized' });

    const dialogs = await client.getDialogs({ limit: 50 });
    const dialogsList = dialogs.map(dialog => ({
      id: dialog.id?.toString() || '',
      name: dialog.name || dialog.title || 'Unknown',
      isUser: dialog.isUser,
      isGroup: dialog.isGroup,
      isChannel: dialog.isChannel,
      unreadCount: dialog.unreadCount || 0,
      lastMessage: dialog.message?.text || '',
      date: dialog.date || 0
    }));

    res.json({ success: true, dialogs: dialogsList });
  } catch (error) {
    console.error('Get dialogs error:', error);
    res.status(500).json({ error: error.message, details: error.toString() });
  }
};

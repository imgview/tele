const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { LocalStorage } = require('node-localstorage');

const localStorage = new LocalStorage('./telegram-sessions');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
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

    if (!await client.isUserAuthorized()) {
      return res.status(401).json({ error: 'Not authorized' });
    }

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

    res.json({
      success: true,
      dialogs: dialogsList
    });
  } catch (error) {
    console.error('Get dialogs error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get dialogs' 
    });
  }
};

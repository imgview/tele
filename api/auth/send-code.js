// ============================================
// api/auth/send-code.js
// ============================================
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

// In-memory session storage (gunakan database untuk production)
const sessions = new Map();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    
    console.log('API_ID:', apiId);
    console.log('API_HASH:', apiHash ? 'Set' : 'Not set');
    
    if (!apiId || !apiHash) {
      return res.status(500).json({ 
        error: 'API credentials not configured. Please set API_ID and API_HASH in Vercel environment variables.' 
      });
    }
    
    // Get or create session
    const sessionString = sessions.get(sessionId) || '';
    const session = new StringSession(sessionString);
    
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });
    
    await client.connect();
    console.log('Connected to Telegram');
    
    const result = await client.sendCode({
      apiId: apiId,
      apiHash: apiHash
    }, phoneNumber);
    
    console.log('Code sent successfully');
    
    // Save session
    sessions.set(sessionId, client.session.save());
    
    res.json({
      success: true,
      phoneCodeHash: result.phoneCodeHash,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send code',
      details: error.toString()
    });
  }
};

// ============================================
// api/auth/verify-code.js
// ============================================
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');

const sessions = new Map();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    
    const sessionString = sessions.get(sessionId) || '';
    if (!sessionString) {
      return res.status(401).json({ error: 'Session not found. Please request code again.' });
    }
    
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
      sessions.set(sessionId, client.session.save());
      
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
      error: error.message || 'Failed to verify code',
      details: error.toString()
    });
  }
};

// ============================================
// api/auth/verify-password.js
// ============================================
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');

const sessions = new Map();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    
    const sessionString = sessions.get(sessionId);
    if (!sessionString) {
      return res.status(401).json({ error: 'Session not found' });
    }
    
    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });
    
    await client.connect();
    
    const passwordSrpResult = await client.getPassword();
    await client.invoke(new Api.auth.CheckPassword({
      password: await client.computeCheck(passwordSrpResult, password)
    }));
    
    // Save authenticated session
    sessions.set(sessionId, client.session.save());
    
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
      error: error.message || 'Failed to verify password',
      details: error.toString()
    });
  }
};

// ============================================
// api/messages/get-dialogs.js
// ============================================
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const sessions = new Map();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;
    
    const sessionString = sessions.get(sessionId);
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
      error: error.message || 'Failed to get dialogs',
      details: error.toString()
    });
  }
};

// ============================================
// api/messages/get-messages.js
// ============================================
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const sessions = new Map();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    
    const sessionString = sessions.get(sessionId);
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
      error: error.message || 'Failed to get messages',
      details: error.toString()
    });
  }
};

// ============================================
// api/messages/send-message.js
// ============================================
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const sessions = new Map();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, peerId, message } = req.body;
  
  if (!sessionId || !peerId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;
    
    const sessionString = sessions.get(sessionId);
    if (!sessionString) {
      return res.status(401).json({ error: 'Session not found' });
    }
    
    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });
    
    await client.connect();
    
    const result = await client.sendMessage(peerId, { 
      message: message 
    });
    
    res.json({
      success: true,
      messageId: result.id,
      date: result.date
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send message',
      details: error.toString()
    });
  }
};

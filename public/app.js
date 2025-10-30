// Simple frontend placeholder to call /api/auth/send-code
document.getElementById('send-code-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = document.getElementById('phone').value.trim();
  const sessionId = 'session-' + Math.random().toString(36).slice(2,10);
  const out = document.getElementById('output');
  out.textContent = 'Mengirim...';
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone, sessionId })
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = 'Error: ' + err.message;
  }
});

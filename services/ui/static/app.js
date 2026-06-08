// AAH Sample UI — SSE chat
const msgs = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const newBtn = document.getElementById('new-session');

let sessionId = crypto.randomUUID();

function addMsg(role, text, opts = {}) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  if (opts.thinking) {
    el.innerHTML = `<span class="thinking"><span class="spinner"></span>${text}</span>`;
  } else {
    el.textContent = text;
  }
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return el;
}

async function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  sendBtn.disabled = true;

  addMsg('user', text);
  const assistantEl = addMsg('assistant', '응답 생성 중…', { thinking: true });

  try {
    const resp = await fetch('/api/chat-sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text, session_id: sessionId }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let fullText = '';
    let started = false;
    const tools = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      while (buf.includes('\n\n')) {
        const idx = buf.indexOf('\n\n');
        const blk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const lines = blk.split('\n');
        const ev = lines.find(l => l.startsWith('event:'))?.slice(6).trim() || 'message';
        const data = lines.filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('\n');
        let parsed = {};
        try { parsed = JSON.parse(data); } catch (e) {}

        if (ev === 'token') {
          if (!started) { assistantEl.textContent = ''; started = true; }
          fullText += parsed.text || '';
          assistantEl.textContent = fullText;
          msgs.scrollTop = msgs.scrollHeight;
        } else if (ev === 'tool_use_start') {
          const chip = document.createElement('div');
          chip.className = 'tool-call';
          chip.textContent = `🔧 ${parsed.name} 호출 중…`;
          assistantEl.appendChild(chip);
          tools.push(parsed.name);
        } else if (ev === 'tool_result') {
          // 마지막 tool-call chip 업데이트
          const chips = assistantEl.querySelectorAll('.tool-call');
          if (chips.length) {
            const last = chips[chips.length - 1];
            last.textContent = `🔧 ${parsed.name} ${parsed.ok ? '✓' : '✕'} (${parsed.count || 0} 결과)`;
          }
        } else if (ev === 'error') {
          assistantEl.innerHTML = `<span style="color:#ef4444">❌ ${parsed.error || 'error'}</span>`;
        }
      }
    }
    if (!started && !fullText) {
      assistantEl.textContent = '(빈 응답)';
    }
  } catch (e) {
    assistantEl.innerHTML = `<span style="color:#ef4444">❌ ${e.message}</span>`;
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

sendBtn.addEventListener('click', send);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    send();
  }
});
newBtn.addEventListener('click', () => {
  sessionId = crypto.randomUUID();
  msgs.innerHTML = '';
  addMsg('assistant', '새 대화를 시작합니다.');
});

// 초기 인사
addMsg('assistant', '안녕하세요! 무엇을 도와드릴까요?');

let chats = JSON.parse(localStorage.getItem('chats')) || [];
let currentChatId = null;

const chatListEl = document.getElementById('chat-list');
const chatWrapper = document.getElementById('chat-wrapper');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');

function save() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

// Función auxiliar para pintar un solo mensaje sin recargar todo el chat
function appendSingleMessage(role, content, id = null) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    if (id) div.id = id;
    div.textContent = content;
    chatWrapper.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function renderChatList() {
    chatListEl.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        div.onclick = () => switchChat(chat.id);
        div.innerHTML = `
            <span>${chat.title}</span>
            <button class="delete-chat" onclick="deleteChat(${chat.id}, event)">✕</button>
        `;
        chatListEl.appendChild(div);
    });
}

function renderMessages() {
    chatWrapper.innerHTML = '';
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;

    chat.messages.forEach(msg => {
        if (msg.role === 'system') return;
        appendSingleMessage(msg.role, msg.content);
    });
}

function switchChat(id) {
    currentChatId = id;
    const chat = chats.find(c => c.id === id);
    if (chat) {
        document.getElementById('current-chat-title').textContent = chat.title;
        renderChatList();
        renderMessages();
    }
}

function createNewChat() {
    const newChat = {
        id: Date.now(),
        title: 'Nueva charla',
        messages: [{ role: "system", content: "Asistente inteligente." }]
    };
    chats.unshift(newChat);
    save();
    switchChat(newChat.id);
}

window.deleteChat = (id, e) => {
    e.stopPropagation();
    chats = chats.filter(c => c.id !== id);
    save();
    if (chats.length > 0) switchChat(chats[0].id); else createNewChat();
};

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    if (!currentChatId) createNewChat();

    const chat = chats.find(c => c.id === currentChatId);
    
    // 1. Añadir y pintar mensaje del usuario inmediatamente
    chat.messages.push({ role: "user", content: text });
    appendSingleMessage('user', text);
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // 2. Burbuja de carga
    const loadingId = 'loading-' + Date.now();
    appendSingleMessage('assistant', '...', loadingId);

    try {
        // 3. Obtener respuesta de la IA
        const response = await window.electronAPI.chatWithAI(chat.messages);
        
        // 4. Quitar carga y pintar respuesta de la IA inmediatamente
        document.getElementById(loadingId).remove();
        chat.messages.push({ role: "assistant", content: response });
        appendSingleMessage('assistant', response);
        
        // 5. Gestión del título (en segundo plano)
        if (chat.title === 'Nueva charla') {
            const newTitle = await window.electronAPI.generateTitle(text);
            chat.title = newTitle;
            document.getElementById('current-chat-title').textContent = newTitle;
            renderChatList();
        }

        save();
    } catch (err) {
        document.getElementById(loadingId).textContent = "Error de conexión.";
    }
}

// Eventos
sendBtn.onclick = sendMessage;
newChatBtn.onclick = createNewChat;
messageInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

messageInput.oninput = function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
};

if (chats.length > 0) switchChat(chats[0].id); else createNewChat();
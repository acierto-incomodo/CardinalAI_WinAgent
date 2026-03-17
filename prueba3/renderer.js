let chats = JSON.parse(localStorage.getItem('chats')) || [];
let currentChatId = null;
let userSettings = JSON.parse(localStorage.getItem('userSettings')) || { name: '', context: 'Eres un asistente inteligente.' };
let pendingFiles = [];

const chatListEl = document.getElementById('chat-list');
const chatWrapper = document.getElementById('chat-wrapper');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const filePreview = document.getElementById('file-preview-container');
const fileInput = document.getElementById('file-input');

function save() {
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
}

// --- ADJUNTOS ---
document.getElementById('attach-btn').onclick = () => fileInput.click();
fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            pendingFiles.push({ type: 'image', data: reader.result, name: file.name });
            renderPreviews();
        };
    } else {
        const text = await file.text();
        pendingFiles.push({ type: 'text', data: text, name: file.name });
        renderPreviews();
    }
    fileInput.value = '';
};

function renderPreviews() {
    filePreview.innerHTML = '';
    pendingFiles.forEach((f, i) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = f.type === 'image' ? `<img src="${f.data}">` : `<div style="padding:10px; font-size:10px;">📄</div>`;
        div.innerHTML += `<button class="remove-file" onclick="removeFile(${i})">✕</button>`;
        filePreview.appendChild(div);
    });
}
window.removeFile = (i) => { pendingFiles.splice(i, 1); renderPreviews(); };

// --- CHAT ---
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && pendingFiles.length === 0) return;

    if (!currentChatId) createNewChat();
    const chat = chats.find(c => c.id === currentChatId);

    chat.messages[0].content = `Usuario: ${userSettings.name}. Instrucciones: ${userSettings.context}`;

    let content = [];
    if (text) content.push({ type: "text", text: text });
    pendingFiles.forEach(f => {
        if (f.type === 'image') content.push({ type: "image_url", image_url: { url: f.data } });
        else content.push({ type: "text", text: `\n[Archivo: ${f.name}]\n${f.data}` });
    });

    chat.messages.push({ role: "user", content: content });
    appendSingleMessage('user', text || "Adjunto enviado");
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    pendingFiles = [];
    renderPreviews();

    const loadingId = 'loading-' + Date.now();
    appendSingleMessage('assistant', '...', loadingId);

    try {
        const response = await window.electronAPI.chatWithAI(chat.messages);
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        
        chat.messages.push({ role: "assistant", content: response });
        appendSingleMessage('assistant', response);
        
        // CORRECCIÓN: Generación de título si es el primer mensaje real
        // Filtramos para contar solo mensajes que no sean 'system'
        const realMessages = chat.messages.filter(m => m.role !== 'system');
        if (realMessages.length <= 2 && chat.title === 'Nueva charla') {
            const newTitle = await window.electronAPI.generateTitle(text || "Imagen/Archivo");
            chat.title = newTitle;
            save();
            renderChatList(); // Forzar refresco de la lista lateral
        } else {
            save();
        }
    } catch (err) {
        if(document.getElementById(loadingId)) document.getElementById(loadingId).textContent = "Error.";
    }
}

function appendSingleMessage(role, content, id = null) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    if (id) div.id = id;
    div.textContent = typeof content === 'string' ? content : "Contenido multimedia";
    chatWrapper.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- GESTIÓN DE LISTA Y RENOMBRADO ---
function renderChatList() {
    chatListEl.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        
        const span = document.createElement('span');
        span.textContent = chat.title;
        
        // Doble clic para renombrar
        div.ondblclick = (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = chat.title;
            input.className = "rename-input";
            
            div.replaceChild(input, span);
            input.focus();
            input.select();
            
            const handleRename = () => {
                const newTitle = input.value.trim();
                if (newTitle) chat.title = newTitle;
                save();
                renderChatList();
            };

            input.onblur = handleRename;
            input.onkeydown = (ev) => {
                if (ev.key === 'Enter') handleRename();
                if (ev.key === 'Escape') renderChatList();
            };
        };

        div.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') switchChat(chat.id);
        };
        
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-chat';
        delBtn.textContent = '✕';
        delBtn.onclick = (e) => { e.stopPropagation(); deleteChat(chat.id); };

        div.appendChild(span);
        div.appendChild(delBtn);
        chatListEl.appendChild(div);
    });
}

function switchChat(id) { currentChatId = id; renderChatList(); renderMessages(); }
function renderMessages() {
    chatWrapper.innerHTML = '';
    const chat = chats.find(c => c.id === currentChatId);
    if(chat) chat.messages.forEach(m => { if(m.role !== 'system') appendSingleMessage(m.role, Array.isArray(m.content) ? "Mensaje con adjuntos" : m.content); });
}

function createNewChat() {
    const newId = Date.now();
    chats.unshift({ id: newId, title: 'Nueva charla', messages: [{ role: "system", content: userSettings.context }] });
    save();
    switchChat(newId);
}

function deleteChat(id) {
    chats = chats.filter(c => c.id !== id);
    save();
    if (chats.length > 0) switchChat(chats[0].id); else createNewChat();
}

// --- INICIALIZACIÓN ---
document.getElementById('send-btn').onclick = sendMessage;
document.getElementById('new-chat-btn').onclick = createNewChat;
document.getElementById('clear-all-btn').onclick = () => { if(confirm("¿Borrar todo?")) { chats = []; save(); createNewChat(); } };
document.getElementById('open-settings-btn').onclick = () => {
    document.getElementById('user-name-input').value = userSettings.name;
    document.getElementById('user-context-input').value = userSettings.context;
    document.getElementById('settings-modal').style.display = 'flex';
};
document.getElementById('save-settings-btn').onclick = () => {
    userSettings.name = document.getElementById('user-name-input').value;
    userSettings.context = document.getElementById('user-context-input').value;
    save();
    document.getElementById('settings-modal').style.display = 'none';
};
document.getElementById('close-settings-btn').onclick = () => document.getElementById('settings-modal').style.display = 'none';

messageInput.onkeydown = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }};

if (chats.length > 0) switchChat(chats[0].id); else createNewChat();
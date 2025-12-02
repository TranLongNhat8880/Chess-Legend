//Xử lý chat
import { State } from './gameState.js';

export function setupChat() {
    const input = document.getElementById('chat-input');
    const btn = document.querySelector('.btn-send');
    
    const send = () => {
        const text = input.value.trim();
        if (!text) return;
        
        const myName = document.getElementById('my-name').innerText;
        appendChatMessage("Tôi", text, 'me');
        
        if (!State.isPvE && State.socket) {
            State.socket.emit('send_chat', { 
                roomId: State.currentRoomId, 
                username: myName, 
                message: text 
            });
        }
        input.value = '';
    };

    btn.onclick = send;
    input.onkeypress = (e) => { if(e.key === 'Enter') send(); };
}

export function appendChatMessage(sender, text, type) {
    const box = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.innerText = `${sender}: ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}
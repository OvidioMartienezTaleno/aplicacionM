const wsUrl = 'ws://172.24.105.18:8080';
const socket = new WebSocket(wsUrl);
let currentUser = 0;



socket.onopen = () => {
    // Informar al servidor que el usuario está conectado
    requestFriendsList()
    socket.send(JSON.stringify({
        type: 'user_connected',
        data: {
            userId: currentUser
        }
    }));
};

socket.onmessage = (event) => { 
    const data = JSON.parse(event.data);
    console.log('Mensaje recibido:', data);

    switch(data.type) {
        case 'users_list':
            if (data.success) {
                updateUsersList(data.users.filter(user => user.id !== currentUser));      
            }
            break;
        case 'count_messages':
            if(data.success){
                updateStatistics(data.total, data.totalUsers, data.messagesFromDate)
            }
    }
};


socket.onerror = (error) => {
    console.error('Error en WebSocket:', error);
};

socket.onclose = () => {
    console.log('Conexión cerrada');
};

function requestFriendsList() {
    socket.send(JSON.stringify({
        type: 'get_users',
        data: {
            userId: currentUser
        }
    }));
}

function updateUsersList(users) {
    const chatList = document.querySelector('.chat-list');
    chatList.innerHTML = ''; // Limpia la lista de usuarios

    // Itera sobre la lista de usuarios y crea un elemento para cada uno
    users.forEach(user => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item'; // Asigna clase para el estilo
        chatItem.id = `user-${user.id}`; // Asigna un ID único
        chatItem.innerHTML = `
            <div class="chat-item-content">
                <strong>${user.full_name}</strong><br>
                <span class="username">@${user.user_name}</span>
            </div>
        `;
        
        // Agrega un evento de clic para seleccionar el usuario
        chatItem.addEventListener('click', () => selectUser(user));

        // Agregar el chat-item a la lista
        chatList.appendChild(chatItem);
    });
}

function mostrarEstadisticas() {
    // Ocultar otras secciones, si es necesario
    document.getElementById('output').style.display = 'none'; // Oculta el div de output
    
    const statsDiv = document.getElementById('statistics');
    statsDiv.classList.remove('hidden'); // Eliminar la clase 'hidden' para mostrarlo

    socket.send(JSON.stringify({
        type: 'count_messages_request'
    }));
    
}
setInterval(mostrarEstadisticas, 10000);

setTimeout(() => {
    clearInterval(intervalId);
}, 20000); // Detener después de 20 segundo

function updateStatistics(totalMessages, activeUsers, dailyMessages) {
    document.getElementById('total-messages').textContent = totalMessages;
    document.getElementById('active-users').textContent = activeUsers;
    document.getElementById('daily-messages-chart').textContent = dailyMessages
    
}


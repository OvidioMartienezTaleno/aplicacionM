const wsUrl = 'ws://172.24.105.18:8080';
const socket = new WebSocket(wsUrl);
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
console.log(currentUser)
let selectedUserId = null;

// Verificar si hay un usuario logueado
if (!currentUser) {
    window.location.href = 'index.html';
}

socket.onopen = () => {
    requestFriendsList();
    // Informar al servidor que el usuario está conectado
    socket.send(JSON.stringify({
        type: 'user_connected',
        data: {
            userId: currentUser.id
        }
    }));
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Mensaje recibido:', data);

    switch(data.type) {
        case 'friends_list':
            if (data.success) {
                updateUsersList(data.friends.filter(friend => friend.id !== currentUser.id));
                verify(data.friends.filter(friend => friend.id !== currentUser.id));     
            }
            break;
        case 'messages_history':
            if (data.success) {
                displayMessages(data.messages);
            }
            break;
        case 'message_sent':
            if (data.success) {
                appendMessage(data.message);
                // Actualizar la vista del chat si es necesario
                if (selectedUserId === data.message.receiver_id) {
                    requestMessages(selectedUserId);
                }
            }
            break;
        case 'new_message':
            // Si el mensaje es del usuario seleccionado actualmente, mostrarlo
            if (data.message.sender_id === selectedUserId || 
                data.message.receiver_id === selectedUserId) {
                appendMessage(data.message);
                // Actualizar la vista del chat
                requestMessages(selectedUserId);
            } else {
                // Notificar nuevo mensaje de otro usuario
                notifyNewMessage(data.sender);
            }
            break;
        case 'users_list':
            if (data.success) {     
                requestFriendsList()      
            }
            break;
        case 'success':
            if(data.success){  
                alert(data.message);        
            }
            break;
        case 'delete':
            if(data.success){
                alert(data.message);
            }
            break;
        case 'message_deleted':
            if (data.success) {
                // Refresh the messages to show the updated list
                requestMessages(selectedUserId);
            } else {
                alert('Error deleting message: ' + data.message);
            }
            break;
        case 'temporaryA':
            if (data.success) {
                alert("Mensajes temporales activado(duracion de 24 horas.")
            }else{
                alert("Mensajes temporales ya esta activo en este chat")
            }
            break;
        case 'confirmation':
            requestMessages(selectedUserId);
            break;
        case 'exito':
            if (data.success) {
                alert("Mensajes temporales desactivados.")
            }
            break;
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
        type: 'get_friends',
        data: {
            userId: currentUser.id 
        }
    }));
}

function newDate(){
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedDate = `${hours}:${minutes}:${seconds}`;
    return formattedDate;
}

function updateUsersList(users) {
    const chatList = document.querySelector('.chat-list');
    chatList.innerHTML = '';

    // Itera sobre la lista de amigos o usuarios y crea un elemento para cada uno
    users.forEach(user => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.id = `user-${user.id}`;
        chatItem.innerHTML = `
            <strong>${user.full_name}</strong><br>
            <span class="username">@${user.user_name}</span>
        `;
        chatItem.addEventListener('click', () => selectUser(user));
        chatList.appendChild(chatItem);
    });
}

function verify(users){
    if(users.length === 0){
        alert("Hola " + currentUser.fullname + ", puedes agregar el boot 'Chat' para traducir al inglés.")
    }else{
        // Verificar si hay un usuario con user_name 'Chat'
        const hasChatUser = users.some(user => user.user_name === "Chat");

        // Si no hay un usuario 'Chat', mostrar un mensaje
        if (!hasChatUser && users.length !== 0) {
            alert("Hola " + currentUser.fullname + ", puedes agregar el bot 'Chat' para traducir al inglés.");
        }
    }

}

function selectUser(user) {
    selectedUserId = user.id;
    document.querySelector('.chat-header div:first-child').textContent = user.full_name;
    
    // Remover notificación de nuevos mensajes
    document.getElementById(`user-${user.id}`).classList.remove('has-new-message');
    
    requestMessages(user.id);

    // Actualizar clase activa
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById(`user-${user.id}`).classList.add('active');
}

function requestMessages(userId) {
    socket.send(JSON.stringify({
        type: 'get_messages',
        data: {
            other_user_id: userId
        }
    }));
}

function displayMessages(messages) {
    const messagesContainer = document.querySelector('.messages');
    messagesContainer.innerHTML = '';

    // Ordenar mensajes por timestamp
    messages.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
    });

    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        const isSent = msg.sender_id === currentUser.id;
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        let messageContent = '';

        if (msg.file_type) {
            // Es un archivo
            const deleteButton = isSent ? `
                <button class="delete-file-btn" onclick="deleteMessage(${msg.id})">🗑️</button>
            ` : '';

            if (msg.file_type.startsWith('image/')) {
                messageContent = `
                    <div class="file-content">
                        <img src="${msg.content}" alt="Imagen" class="message-image">
                        <div class="file-info">
                            <span>${msg.file_name}</span>
                            <div class="file-actions">
                                <a href="${msg.content}" download="${msg.file_name}" class="download-button">⬇️</a>
                                ${deleteButton}
                            </div>
                        </div>
                    </div>
                `;
            } else if (msg.file_type.startsWith('video/')) {
                messageContent = `
                    <div class="file-content">
                        <video controls class="message-video">
                            <source src="${msg.content}" type="${msg.file_type}">
                        </video>
                        <div class="file-info">
                            <span>${msg.file_name}</span>
                            <div class="file-actions">
                                <a href="${msg.content}" download="${msg.file_name}" class="download-button">⬇️</a>
                                ${deleteButton}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                messageContent = `
                    <div class="file-content">
                        <div class="file-info">
                            <span>📄 ${msg.file_name}</span>
                            <div class="file-actions">
                                <a href="${msg.content}" download="${msg.file_name}" class="download-button">⬇️</a>
                                ${deleteButton}
                            </div>
                        </div>
                    </div>
                `;
            }
        } else {
            // Es un mensaje de texto normal
            const decryptedContent = decryptMessage(msg.content);
            messageContent = `<div class="message-content">${decryptedContent}</div>`;
        }

        // Si el mensaje fue enviado por el usuario actual, añadir botones de edición y eliminación
        if (isSent) {
            messageContent += `
                <button class="message-actions-btn">⋮</button>
                <div class="message-actions-dropdown">
                    <button class="edit-message-btn">Editar mensaje</button>
                    <button class="delete-message-btn">Borrar mensaje</button>
                </div>
            `;
        }

        // Incluir el contenido del mensaje y la hora de envío en el div del mensaje
        messageDiv.innerHTML = `
            ${messageContent}
            <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);

        // Añadir el evento de edición si es un mensaje enviado por el usuario
        if (isSent) {
            const editBtn = messageDiv.querySelector('.edit-message-btn');
            editBtn.addEventListener('click', () => {
                const messageContentDiv = messageDiv.querySelector('.message-content');
                const currentText = messageContentDiv.textContent;

                // Crear campo de entrada para editar el mensaje
                const inputField = document.createElement('input');
                inputField.type = 'text';
                inputField.value = currentText;
                inputField.className = 'edit-message-input';

                // Crear botón para guardar el mensaje editado
                const saveButton = document.createElement('button');
                saveButton.textContent = 'Guardar';
                saveButton.className = 'edit-save-btn';

                // Reemplazar el contenido actual con el campo de entrada y el botón de guardar
                messageContentDiv.innerHTML = '';
                messageContentDiv.appendChild(inputField);
                messageContentDiv.appendChild(saveButton);

                // Enfocar el campo de entrada
                inputField.focus();

                // Manejar el guardado del mensaje editado
                saveButton.addEventListener('click', () => {
                    const newContent = inputField.value.trim();
                    if (newContent && newContent !== currentText) {
                        socket.send(JSON.stringify({
                            type: 'edit_message',
                            data: {
                                message_id: msg.id,
                                content: encryptMessage(newContent, 3)
                            }
                        }));
                    }
                    messageContentDiv.textContent = newContent;
                });

                // Manejar el evento de tecla "Enter" para guardar
                inputField.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        saveButton.click();
                    }
                });
            });

            // Añadir el evento de eliminación
            const deleteBtn = messageDiv.querySelector('.delete-message-btn');
            deleteBtn.addEventListener('click', () => {
                socket.send(JSON.stringify({
                    type: 'delete_message',
                    data: {
                        message_id: msg.id
                    }
                }));
            });
        }
    });

    // Desplazarse automáticamente al final del contenedor de mensajes
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


//Agrega los mensajes en el chat seleccionado(en la porte del div)
function appendMessage(message) {
    const messagesContainer = document.querySelector('.messages');
    const messageDiv = document.createElement('div');
    const isSent = message.sender_id === currentUser.id;
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    let messageContent = '';
    
    if (message.file_type) {
        // Es un archivo
        const deleteButton = isSent ? `
            <button class="delete-file-btn" onclick="deleteMessage(${message.id})">🗑️</button>
        ` : '';

        if (message.file_type.startsWith('image/')) {
            messageContent = `
                <div class="file-content">
                    <img src="${message.content}" alt="Imagen" class="message-image">
                    <div class="file-info">
                        <span>${message.file_name}</span>
                        <div class="file-actions">
                            <a href="${message.content}" download="${message.file_name}" class="download-button">⬇️</a>
                            ${deleteButton}
                        </div>
                    </div>
                </div>
            `;
        } else if (message.file_type.startsWith('video/')) {
            messageContent = `
                <div class="file-content">
                    <video controls class="message-video">
                        <source src="${message.content}" type="${message.file_type}">
                    </video>
                    <div class="file-info">
                        <span>${message.file_name}</span>
                        <div class="file-actions">
                            <a href="${message.content}" download="${message.file_name}" class="download-button">⬇️</a>
                            ${deleteButton}
                        </div>
                    </div>
                </div>
            `;
        } else {
            messageContent = `
                <div class="file-content">
                    <div class="file-info">
                        <span>📄 ${message.file_name}</span>
                        <div class="file-actions">
                            <a href="${message.content}" download="${message.file_name}" class="download-button">⬇️</a>
                            ${deleteButton}
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        // Es un mensaje de texto
        const decryptedContent = decryptMessage(message.content);
        messageContent = `<div class="message-content">${decryptedContent}</div>`;
    }

    messageDiv.innerHTML = `
        ${messageContent}
        <div class="message-time">${message.timestamp}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function notifyNewMessage(sender) {
    // Verifica que 'sender' y 'sender.id' sean válidos
    if (!sender || !sender.id) {
        console.error('Sender is not valid:', sender);
        return;
    }

    // Encuentra el elemento del usuario correspondiente
    const userItem = document.getElementById(`user-${sender.id}`);
    if (userItem) {
        // Agrega la clase que indica que hay un nuevo mensaje
        userItem.classList.add('has-new-message');

        // Opcional: Remueve la clase después de un tiempo (por ejemplo, 5 segundos)
        setTimeout(() => {
            userItem.classList.remove('has-new-message');
        }, 5000);
    } else {
        console.warn(`User item with ID user-${sender.id} not found.`);
    }
}


// Configurar el header con la información del usuario
document.querySelector('.chat-header').innerHTML = `
    <div>Selecciona un usuario para chatear</div>
    <div class="user-info">
        <span>Usuario: ${currentUser.fullname}</span>
        <button id="logout" class="logout-btn">Cerrar Sesión</button>
    </div>
`;

// Manejar envío de mensajes
document.getElementById('sendMessage').addEventListener('click', () => {
    const inputMessage = document.getElementById('inputMessage').value.trim();
    
    if (inputMessage && selectedUserId) {
        socket.send(JSON.stringify({
            type: 'send_message',
            data: {
                receiver_id: selectedUserId,
                content: encryptMessage(inputMessage, 3)
            }
        }));
        document.getElementById('inputMessage').value = '';
    }
});

// Manejar envío con Enter
document.getElementById('inputMessage').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('sendMessage').click();
    }
});

// Manejar cierre de sesión
document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
    socket.send(JSON.stringify({
        type: 'log_out',
        data: {
            idUser: currentUser.id

        }
    }));

});

//Prompt para agregar amigos 
document.getElementById('addUserButton').addEventListener('click', () => {
    const userNameN = prompt('Ingrese el nombre del usuario:');
    if (userNameN) {
        
        // Informar al servidor del userName e id
        socket.send(JSON.stringify({
            type: 'add_friend',
            data: {
                userName: userNameN,
                userID: currentUser.id
            }
        }));
        location.reload();
    }
});

//Boton para eliminar amigos 
document.getElementById('deleteUserButton').addEventListener('click', () => {
    const userNameNe = prompt('Ingrese el nombre del usuario:');
    if (userNameNe) {
        
        // Informar al servidor del userName e id
        socket.send(JSON.stringify({
            type: 'delete_friend',
            data: {
                userName: userNameNe,
                userID: currentUser.id
            }
        }));
        location.reload();
    }
});


//funcion para activar los mensajes temporales.
document.getElementById('activarTemporal').addEventListener('click', () => {
    if(selectedUserId !== null){
        socket.send(JSON.stringify({
            type: 'temporaryM',
            data: {
                sender: currentUser.id,
                receiver: selectedUserId
            }
        }));
    }
});

//funcion para desactivar la eliminacion de los mensajes temporales:
document.getElementById('desactivarTemporal').addEventListener('click', () => {
    if(selectedUserId !== null){
        socket.send(JSON.stringify({
            type: 'deactivateT',
            data: {
                sender: currentUser.id,
                receiver: selectedUserId
            }
        }));
    }
});


document.getElementById('busqueda').addEventListener('click', () => {
    const message = prompt('Ingrese el mensaje a buscar:');
    if (message) {
        searchMessages(message);
    }
});

function searchMessages(query) {
    const messagesContainer = document.querySelector('.messages');
    const messages = messagesContainer.querySelectorAll('.message.sent'); // Selecciona todos los elementos con las clases 'message sent'

    // Limpiar los resultados anteriores
    messages.forEach(message => message.classList.remove('highlight'));

    // Buscar los mensajes que contienen el texto ingresado
    let foundMessage = null;  // Para almacenar el primer mensaje encontrado

    messages.forEach(message => {
        const messageText = message.textContent || message.innerText; // Obtener el texto del mensaje (para compatibilidad con diferentes navegadores)
        if (messageText.includes(query)) {
            message.classList.add('highlight'); // Resalta el mensaje si coincide
            message.closest('.message').classList.add('highlight'); // Resalta el div padre del mensaje

            if (!foundMessage) {
                foundMessage = message;  // Guarda el primer mensaje encontrado
            }
        }
    });

    if (foundMessage) {
        // Desplazar el contenedor hasta el mensaje encontrado
        foundMessage.scrollIntoView({
            behavior: 'smooth',  // Desplazamiento suave
            block: 'center'      // Centra el mensaje en la ventana visible
        });
        alert('Mensaje encontrado y desplazado!');
    } else {
        alert('No se encontraron mensajes.');
    }
}

//funcion para abrir el menu opciones
document.getElementById("opcionesButton").addEventListener("click", function() {
    const menu = document.querySelector(".dropdown-menu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
});

//funcion para ocultar el submenu opciones
document.addEventListener("click", function(event) {
    const menu = document.querySelector(".dropdown-menu");
    const opcionesButton = document.getElementById("opcionesButton");

    // Cierra el menú si se hace clic fuera del botón "Opciones" o del menú
    if (event.target !== opcionesButton && !menu.contains(event.target)) {
        menu.style.display = "none";
    }
});

// Función para desencriptar un mensaje cifrado con el cifrado César
function decryptMessage(encryptedMessage) {
    // Invertir el desplazamiento para desencriptar
    const decryptShift = (26 - (3 % 26)) % 26; //desplazamiento sea positivo y dentro del rango
    return encryptMessage(encryptedMessage, decryptShift);
  }
  
// Función de cifrado (reutilizada para desencriptar con un desplazamiento inverso)
function encryptMessage(message, shift) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const shiftAmount = shift % 26; //desplazamiento esté dentro del rango del alfabeto

    return message.split('').map(char => {
        const index = alphabet.indexOf(char);

        // Si el carácter no está en el alfabeto (espacios, puntuación, etc.), se deja igual
        if (index === -1) {
            return char;
        }

        // Cálculo del nuevo índice y ajuste en caso de que se pase del final del alfabeto
        const isUpperCase = char === char.toUpperCase();
        const baseIndex = isUpperCase ? 0 : 26; // Asegura que se mantenga la capitalización
        const newIndex = (index - baseIndex + shiftAmount) % 26 + baseIndex;

        return alphabet[newIndex];
    }).join('');
}

//Manda mensaje al desconectar
window.onbeforeunload = function() {
    socket.send(JSON.stringify({
        type: 'log_out',
        data: {
            idUser: currentUser.id
        }
    }));
    return null; 
};

//////////////////////////////////////////////////////


document.getElementById("mandarArchivo").addEventListener("click", function() {
    document.getElementById("fileInput").click();  // Activa el input de archivo cuando se presiona el botón
});

// Agregar después de la inicialización de WebSocket
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB límite de tamaño

// Agregar manejador para el botón de adjuntar
document.getElementById('attachButton').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

// Variables globales para manejar archivos
let filesToSend = new Map();

// Modificar el manejador de selección de archivos
document.getElementById('fileInput').addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    const previewArea = document.getElementById('previewArea');
    previewArea.classList.add('active');
    
    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
            alert(`El archivo ${file.name} es demasiado grande. Máximo 5MB.`);
            continue;
        }

        // Crear vista previa
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        // Generar ID único para el archivo
        const fileId = Date.now() + '-' + file.name;
        filesToSend.set(fileId, file);

        // Contenido de la vista previa según el tipo de archivo
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            previewItem.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            previewItem.appendChild(video);
        } else {
            const icon = document.createElement('div');
            icon.textContent = '📄';
            icon.style.fontSize = '2em';
            previewItem.appendChild(icon);
        }

        // Información del archivo
        const infoDiv = document.createElement('div');
        infoDiv.className = 'preview-info';
        infoDiv.innerHTML = `
            <div class="preview-name">${file.name}</div>
            <div class="preview-size">${formatFileSize(file.size)}</div>
        `;
        previewItem.appendChild(infoDiv);

        // Botón para remover
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-preview';
        removeButton.textContent = '×';
        removeButton.onclick = () => {
            previewItem.remove();
            filesToSend.delete(fileId);
            if (filesToSend.size === 0) {
                previewArea.classList.remove('active');
            }
        };
        previewItem.appendChild(removeButton);

        previewArea.appendChild(previewItem);
    }
    
    // Limpiar input
    e.target.value = '';
});

// Función auxiliar para formatear el tamaño del archivo
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// Modificar el manejador del botón de enviar
document.getElementById('sendMessage').addEventListener('click', async () => {
    const inputMessage = document.getElementById('inputMessage').value.trim();
    const previewArea = document.getElementById('previewArea');
    
    if (selectedUserId) {
        // Enviar archivos si hay alguno
        if (filesToSend.size > 0) {
            for (const [fileId, file] of filesToSend) {
                const base64 = await fileToBase64(file);
                socket.send(JSON.stringify({
                    type: 'send_file',
                    data: {
                        receiver_id: selectedUserId,
                        file_name: file.name,
                        file_type: file.type,
                        file_size: file.size,
                        content: base64
                    }
                }));
            }
            // Limpiar archivos y vista previa
            filesToSend.clear();
            previewArea.innerHTML = '';
            previewArea.classList.remove('active');
        }

        // Enviar mensaje de texto si hay alguno
        if (inputMessage) {
            socket.send(JSON.stringify({
                type: 'send_message',
                data: {
                    receiver_id: selectedUserId,
                    content: inputMessage
                }
            }));
            document.getElementById('inputMessage').value = '';
        }
    }
});

// Función auxiliar para convertir archivo a Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Agregar esta función para manejar la eliminación de mensajes
function deleteMessage(messageId) {
    if (confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
        socket.send(JSON.stringify({
            type: 'delete_message',
            data: {
                message_id: messageId
            }
        }));
    }
}
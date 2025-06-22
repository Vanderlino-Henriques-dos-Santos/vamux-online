// src/javascript/login.js

// Seletores de elementos:
const emailInput = document.getElementById('emailInput'); 
const passwordInput = document.getElementById('passwordInput'); 
const loginForm = document.getElementById('loginForm'); 
const messageElement = document.getElementById('message'); 
const radioPassenger = document.getElementById('radioPassenger'); 
const radioDriver = document.getElementById('radioDriver'); 

// Função para exibir mensagens na UI
function displayMessage(msg, isError = true) {
    messageElement.textContent = msg;
    messageElement.className = isError ? 'message error' : 'message success';
    messageElement.style.display = 'block'; 
}

// Funções de validação básica
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
    return password.length >= 6; 
}

// --- Funções de Login ---

// Carrega usuários do localStorage
function getRegisteredUsers() {
    return JSON.parse(localStorage.getItem('registeredUsers')) || [];
}

// Event Listener para o envio do formulário
loginForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Previne o recarregamento padrão da página

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    let type = '';
    const selectedUserType = document.querySelector('input[name="userType"]:checked');
    if (selectedUserType) {
        type = selectedUserType.value;
    } else {
        type = 'passenger'; 
    }

    if (!email || !password) {
        displayMessage('Por favor, preencha email e senha para login.', true);
        return;
    }

    if (!isValidEmail(email)) {
        displayMessage('Por favor, insira um email válido.', true);
        return;
    }
    if (password.length < 6) { 
        displayMessage('A senha deve ter no mínimo 6 caracteres.', true);
        return;
    }

    let users = getRegisteredUsers();
    const foundUser = users.find(user => user.email === email && user.password === password && user.type === type);

    if (foundUser) {
        // Salva o usuário logado no localStorage
        localStorage.setItem('currentUser', JSON.stringify(foundUser));
        displayMessage(`Login como ${type === 'passenger' ? 'Passageiro' : 'Motorista'} realizado com sucesso! Redirecionando...`, false);
        
        // Redireciona para a página apropriada após um pequeno delay
        setTimeout(() => {
            if (foundUser.type === 'passenger') {
                window.location.href = 'passageiro.html';
            } else { // type === 'driver'
                window.location.href = 'motorista.html';
            }
        }, 1000); 
        
    } else {
        displayMessage('Email, senha ou tipo de usuário incorretos. Verifique suas credenciais e o tipo de conta.', true);
    }
});

// REMOVA OU COMENTE ESTE BLOCO SE QUISER QUE O USUÁRIO SEMPRE VEJA A TELA DE LOGIN
/*
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        // Se já houver um usuário logado, redireciona-o automaticamente
        if (currentUser.type === 'passenger') {
            window.location.href = 'passageiro.html';
        } else if (currentUser.type === 'driver') {
            window.location.href = 'motorista.html';
        }
    }
});
*/
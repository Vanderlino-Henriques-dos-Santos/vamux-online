import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Importa a configuração do Firebase (o caminho "./firebase-config.js" está correto
// se firebase-config.js estiver na mesma pasta que cadastro.js, ou seja, em src/javascript/)
import { firebaseConfig } from "./firebase-config.js"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Adicionado para exibir mensagens na UI
const cadastroMessageElement = document.getElementById("cadastroMessage");

function displayCadastroMessage(msg, isError = true) {
    cadastroMessageElement.textContent = msg;
    cadastroMessageElement.className = isError ? 'message error' : 'message success'; // Usar classes para estilo
    cadastroMessageElement.style.display = 'block';
}

document.getElementById("cadastroForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    // CAPTURA O TIPO DE USUÁRIO DO BOTÃO CLICADO
    const tipoUsuario = e.submitter.dataset.tipo; // e.submitter refere-se ao botão que acionou o submit

    if (!nome || !email || !senha || !tipoUsuario) {
        displayCadastroMessage("Por favor, preencha todos os campos e selecione o tipo de cadastro.", true);
        return;
    }
    
    // Validação mínima de senha (conforme outras conversas, mínimo 6 caracteres)
    if (senha.length < 6) {
        displayCadastroMessage("A senha deve ter no mínimo 6 caracteres.", true);
        return;
    }

    displayCadastroMessage("Cadastrando, por favor aguarde...", false); // Mensagem de carregamento

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        // Salva o tipo de usuário e o nome no Realtime Database usando o UID do Firebase Auth
        await set(ref(database, "usuarios/" + user.uid), {
            nome: nome,
            email: email,
            tipo: tipoUsuario,
            uid: user.uid // É bom salvar o UID também aqui
        });

        // Salva as informações do usuário logado no localStorage
        localStorage.setItem("currentUser", JSON.stringify({
            uid: user.uid,
            name: nome,
            email: email,
            type: tipoUsuario
        }));

        displayCadastroMessage("Cadastro realizado com sucesso! Redirecionando...", false);

        // Redireciona para a tela correta após o cadastro bem-sucedido
        setTimeout(() => { // Adicionado um pequeno delay para a mensagem ser visível
            if (tipoUsuario === "passenger") {
                window.location.href = "passageiro.html";
            } else {
                window.location.href = "motorista.html";
            }
        }, 1500); // Redireciona após 1.5 segundos

    } catch (error) {
        console.error("Erro no cadastro:", error);
        let errorMessage = "Erro ao cadastrar. Tente novamente.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Este e-mail já está em uso. Tente fazer login ou use outro e-mail.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "O formato do e-mail é inválido.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "A senha é muito fraca. Escolha uma senha mais forte.";
        }
        displayCadastroMessage(errorMessage, true); // Exibe a mensagem de erro
    }
});
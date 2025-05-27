import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import app from "./firebase-config.js";

const auth = getAuth(app);
const database = getDatabase(app);

window.cadastrarUsuario = function () {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();
    const tipo = document.getElementById('tipo').value;
    const mensagem = document.getElementById('mensagemCadastro');

    if (!email || !senha) {
        mensagem.innerHTML = "⚠️ Preencha todos os campos!";
        mensagem.style.color = "orange";
        return;
    }

    createUserWithEmailAndPassword(auth, email, senha)
        .then((userCredential) => {
            // Usuário criado com sucesso no Firebase Authentication
            const user = userCredential.user;

            // Salva informações adicionais no Realtime Database
            set(ref(database, 'usuarios/' + user.uid), {
                email: email,
                tipo: tipo,
                createdAt: new Date().toISOString()
            })
                .then(() => {
                    mensagem.innerHTML = "✅ Cadastro realizado com sucesso!";
                    mensagem.style.color = "lime";
                    // Opcional: redirecionar para a página de login ou dashboard
                    setTimeout(() => {
                        window.location.href = "login.html?tipo=" + tipo;
                    }, 1500);
                })
                .catch((dbError) => {
                    console.error("Erro ao salvar dados no banco de dados:", dbError);
                    mensagem.innerHTML = "❌ Erro ao salvar dados do usuário: " + dbError.message;
                    mensagem.style.color = "red";
                });
        })
        .catch((error) => {
            console.error("Erro ao cadastrar:", error);
            mensagem.innerHTML = "❌ Erro ao cadastrar: " + error.message;
            mensagem.style.color = "red";
        });
};
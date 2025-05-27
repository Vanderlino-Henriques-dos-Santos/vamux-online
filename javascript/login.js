import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import app from "./firebase-config.js";

const auth = getAuth(app);

window.fazerLogin = function () {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();
    const mensagem = document.getElementById('mensagemLogin');

    if (!email || !senha) {
        mensagem.innerHTML = "⚠️ Preencha todos os campos!";
        mensagem.style.color = "orange";
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const tipo = params.get("tipo");

    if (!tipo || (tipo !== "passageiro" && tipo !== "motorista")) {
        mensagem.innerHTML = "⚠️ Tipo de usuário inválido. Acesse pela página inicial.";
        mensagem.style.color = "red";
        return;
    }

    signInWithEmailAndPassword(auth, email, senha)
        .then((userCredential) => {
            // Sucesso no login
            mensagem.innerHTML = "✅ Login realizado com sucesso!";
            mensagem.style.color = "lime";

            const user = userCredential.user;
            // Armazena o UID e o tipo de usuário no localStorage
            localStorage.setItem('currentUserUid', user.uid);
            localStorage.setItem('currentUserType', tipo);


            setTimeout(() => {
                if (tipo === "passageiro") {
                    window.location.href = "passageiro.html";
                } else if (tipo === "motorista") {
                    window.location.href = "motorista.html";
                }
            }, 1500);
        })
        .catch((error) => {
            console.error(error);
            mensagem.innerHTML = "❌ Erro ao fazer login: " + error.message;
            mensagem.style.color = "red";
        });
};
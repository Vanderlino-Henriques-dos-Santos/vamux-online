console.log("🔥 login.js carregado");

// Evento de login
document.getElementById("btnEntrar").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const mensagem = document.getElementById("mensagemLogin");

  const params = new URLSearchParams(window.location.search);
  const tipo = params.get("tipo");

  if (!email || !senha) {
    mensagem.textContent = "⚠️ Preencha todos os campos.";
    return;
  }

  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      mensagem.textContent = "✅ Login realizado com sucesso!";
      console.log("✅ Login OK");

      setTimeout(() => {
        if (tipo === "passageiro") {
          window.location.href = "passageiro.html";
        } else if (tipo === "motorista") {
          window.location.href = "motorista.html";
        } else {
          mensagem.textContent = "❌ Tipo de usuário não identificado.";
        }
      }, 1500);
    })
    .catch((error) => {
      console.error("❌ Erro no login:", error);
      mensagem.textContent = "❌ Erro: " + error.message;
    });
});

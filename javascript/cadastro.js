console.log("🔥 cadastro.js carregado");

// Seleciona tipo de usuário
function selecionarTipo(tipoSelecionado) {
  document.getElementById("tipo").value = tipoSelecionado;
  console.log(`✅ Tipo selecionado: ${tipoSelecionado}`);
}

// Evento de cadastro
document.getElementById("btnCadastrar").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const tipo = document.getElementById("tipo").value;
  const mensagem = document.getElementById("mensagemCadastro");

  if (!email || !senha || !tipo) {
    mensagem.textContent = "⚠️ Preencha todos os campos e selecione se você é Passageiro ou Motorista.";
    return;
  }

  auth.createUserWithEmailAndPassword(email, senha)
    .then(() => {
      mensagem.textContent = "✅ Cadastro efetuado com sucesso!";
      console.log("✅ Usuário cadastrado com sucesso!");

      setTimeout(() => {
        window.location.href = `login.html?tipo=${tipo}`;
      }, 1500);
    })
    .catch((error) => {
      console.error("❌ Erro no cadastro:", error);
      mensagem.textContent = "❌ Erro: " + error.message;
    });
});


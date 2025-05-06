function login() {
	const email = document.getElementById("email").value;
	const senha = document.getElementById("senha").value;
	const tipo = document.getElementById("tipoUsuario").value;
  
	firebase.auth().signInWithEmailAndPassword(email, senha)
	  .then(() => {
		if (tipo === "passageiro") {
		  window.location.href = "passageiro.html";
		} else {
		  window.location.href = "motorista.html";
		}
	  })
	  .catch((error) => {
		alert("Erro ao fazer login: " + error.message);
	  });
  }
  
  function cadastrar() {
	const email = document.getElementById("email").value;
	const senha = document.getElementById("senha").value;
  
	firebase.auth().createUserWithEmailAndPassword(email, senha)
	  .then(() => {
		alert("Cadastro feito com sucesso! Agora é só logar.");
	  })
	  .catch((error) => {
		alert("Erro no cadastro: " + error.message);
	  });
  }
  
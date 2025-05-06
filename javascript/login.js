function cadastrar() {
	const email = document.getElementById("email").value;
	const senha = document.getElementById("senha").value;
	const status = document.getElementById("loginStatus");
  
	firebase.auth().createUserWithEmailAndPassword(email, senha)
	  .then(() => {
		status.textContent = "Cadastro realizado com sucesso!";
		status.style.color = "lightgreen";
  
		// Pequeno atraso para mostrar a mensagem antes de redirecionar
		setTimeout(() => {
		  window.location.href = "passageiro.html";
		}, 1000);
	  })
	  .catch((error) => {
		status.textContent = "Erro ao cadastrar: " + error.message;
		status.style.color = "red";
	  });
  }
  function cadastrar() {
	const email = document.getElementById("email").value;
	const senha = document.getElementById("senha").value;
	const tipoUsuario = document.querySelector('input[name="tipoUsuario"]:checked').value;
	const status = document.getElementById("loginStatus");
  
	firebase.auth().createUserWithEmailAndPassword(email, senha)
	  .then(() => {
		status.textContent = "Cadastro realizado com sucesso!";
		status.style.color = "lightgreen";
  
		if (tipoUsuario === "passageiro") {
		  window.location.href = "passageiro.html";
		} else {
		  window.location.href = "motorista.html";
		}
	  })
	  .catch((error) => {
		status.textContent = "Erro ao cadastrar: " + error.message;
		status.style.color = "red";
	  });
  }
  
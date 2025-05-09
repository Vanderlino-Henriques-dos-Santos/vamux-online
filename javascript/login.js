// javascript/login.js

function login() {
	const email = document.getElementById("email").value;
	const senha = document.getElementById("senha").value;
	const status = document.getElementById("loginStatus");
  
	firebase.auth().signInWithEmailAndPassword(email, senha)
	  .then(() => {
		status.textContent = "Login realizado com sucesso!";
		status.style.color = "green";
		window.location.href = "passageiro.html";
	  })
	  .catch((error) => {
		status.textContent = "Erro ao fazer login: " + error.message;
		status.style.color = "red";
	  });
  }
  
  function cadastrar() {
	const email = document.getElementById("email").value;
	const senha = document.getElementById("senha").value;
	const status = document.getElementById("loginStatus");
  
	firebase.auth().createUserWithEmailAndPassword(email, senha)
	  .then(() => {
		status.textContent = "Cadastro realizado com sucesso!";
		status.style.color = "green";
		window.location.href = "passageiro.html";
	  })
	  .catch((error) => {
		status.textContent = "Erro ao cadastrar: " + error.message;
		status.style.color = "red";
	  });
  }
  
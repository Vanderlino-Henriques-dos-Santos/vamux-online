// login-motorista.js

function loginMotorista() {
	const email = document.getElementById('email').value;
	const senha = document.getElementById('senha').value;
	const status = document.getElementById('loginStatus');
  
	firebase.auth().signInWithEmailAndPassword(email, senha)
	  .then((userCredential) => {
		const user = userCredential.user;
		status.textContent = "Login realizado com sucesso!";
		status.style.color = "green";
		console.log("Motorista logado:", user.uid);
  
		// Redireciona para a tela principal do motorista
		window.location.href = "motorista.html";
	  })
	  .catch((error) => {
		status.textContent = "Erro ao fazer login: " + error.message;
		status.style.color = "red";
	  });
  }
  
  function cadastrarMotorista() {
	const email = document.getElementById('email').value;
	const senha = document.getElementById('senha').value;
	const status = document.getElementById('loginStatus');
  
	firebase.auth().createUserWithEmailAndPassword(email, senha)
	  .then((userCredential) => {
		const user = userCredential.user;
		status.textContent = "Cadastro realizado com sucesso!";
		status.style.color = "green";
		console.log("Motorista cadastrado:", user.uid);
  
		// Redireciona para a tela principal do motorista
		window.location.href = "motorista.html";
	  })
	  .catch((error) => {
		status.textContent = "Erro ao cadastrar: " + error.message;
		status.style.color = "red";
	  });
  }
  
  
  
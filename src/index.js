window.onload = () => {
  const btnPassageiro = document.getElementById("btn-passageiro");
  const btnMotorista = document.getElementById("btn-motorista");
  const loginPassageiro = document.getElementById("login-passageiro");
  const loginMotorista = document.getElementById("login-motorista");

  if (btnPassageiro)
    btnPassageiro.addEventListener("click", () => {
      window.location.href = "cadastro.html?tipo=passageiro";
    });

  if (btnMotorista)
    btnMotorista.addEventListener("click", () => {
      window.location.href = "cadastro.html?tipo=motorista";
    });

  if (loginPassageiro)
    loginPassageiro.addEventListener("click", () => {
      window.location.href = "login.html?tipo=passageiro";
    });

  if (loginMotorista)
    loginMotorista.addEventListener("click", () => {
      window.location.href = "login.html?tipo=motorista";
    });
};
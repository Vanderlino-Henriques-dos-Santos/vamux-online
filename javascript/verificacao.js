// javascript/verificacao.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";
import { getDatabase, ref as dbRef, set } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_BUCKET.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
  databaseURL: "https://SEU_PROJETO_ID-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const database = getDatabase(app);

const form = document.getElementById("verificacaoForm");
const mensagemStatus = document.getElementById("mensagemStatus");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      mensagemStatus.textContent = "Você precisa estar logado para enviar os documentos.";
      return;
    }

    const uid = user.uid;

    const arquivos = {
      cnh: document.getElementById("cnh").files[0],
      docVeiculo: document.getElementById("docVeiculo").files[0],
      comprovante: document.getElementById("comprovante").files[0]
    };

    try {
      const urls = {};

      for (const [chave, arquivo] of Object.entries(arquivos)) {
        const caminho = `verificacoes/${uid}/${chave}`;
        const arquivoRef = ref(storage, caminho);
        await uploadBytes(arquivoRef, arquivo);
        const url = await getDownloadURL(arquivoRef);
        urls[chave] = url;
      }

      await set(dbRef(database, `verificacoes/${uid}`), {
        documentos: urls,
        status: "pendente",
        enviadoEm: new Date().toISOString()
      });

      mensagemStatus.textContent = "✅ Documentos enviados com sucesso! Aguarde a aprovação.";
      mensagemStatus.style.color = "limegreen";
      form.reset();

    } catch (erro) {
      console.error(erro);
      mensagemStatus.textContent = "Erro ao enviar documentos. Tente novamente.";
      mensagemStatus.style.color = "red";
    }
  });
});

const firebaseConfig = {
	apiKey: "AIzaSyCahcPwctvMYNS0MVRzyvKMf5yS1JZdbAI",
	authDomain: "vamu-a70a7.firebaseapp.com",
	databaseURL: "https://vamu-a70a7-default-rtdb.firebaseio.com",
	projectId: "vamu-a70a7",
	storageBucket: "vamu-a70a7.appspot.com", // Corrigido o domínio aqui!
	messagingSenderId: "258150940550",
	appId: "1:258150940550:web:2ed32e0c9fb753c819f607"
  };
  
  if (!firebase.apps.length) {
	firebase.initializeApp(firebaseConfig);
  }
  
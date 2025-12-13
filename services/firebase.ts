import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2PE4WsbnTqxaQxaKu0bOAOlQ4khGnbAs",
  authDomain: "lecturer-85484.firebaseapp.com",
  projectId: "lecturer-85484",
  storageBucket: "lecturer-85484.firebasestorage.app",
  messagingSenderId: "98117044510",
  appId: "1:98117044510:web:fc697d1b937a695e5ea10f",
  measurementId: "G-Z9Q5HJK2CG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

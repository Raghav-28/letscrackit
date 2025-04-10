// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBfIdL_4myMsZ5PkAjEnDFhKA96oe3Kn0Q",
  authDomain: "lets-crack-it-805ae.firebaseapp.com",
  projectId: "lets-crack-it-805ae",
  storageBucket: "lets-crack-it-805ae.firebasestorage.app",
  messagingSenderId: "15047508502",
  appId: "1:15047508502:web:be4c9cdb9fa476aafe2b37",
  measurementId: "G-9XGT9L93VP"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApps();
export const auth = getAuth(app);
export const db = getFirestore(app);
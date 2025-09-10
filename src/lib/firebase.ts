import { initializeApp, getApps, getApp } from 'firebase/app';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4LO3Aq33hea0Mudj9Jmp1EFaQuds82u8",
  authDomain: "chartsageai.firebaseapp.com",
  projectId: "chartsageai",
  storageBucket: "chartsageai.firebasestorage.app",
  messagingSenderId: "380066925358",
  appId: "1:380066925358:web:c77d5a53af6bc1125288bf",
  measurementId: "G-SV5TDRX10V"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export { app };

// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: 'studio-9888219348-aa634',
  appId: '1:542755411446:web:78dc20f0bec9d98cb1e3d7',
  storageBucket: 'studio-9888219348-aa634.firebasestorage.app',
  apiKey: 'AIzaSyAMlcoeU0I-ox6KsTpVDMC1lzTUFrY9VGk',
  authDomain: 'studio-9888219348-aa634.firebaseapp.com',
  messagingSenderId: '542755411446',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

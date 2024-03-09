const { getFirestore } = require('firebase-admin/firestore');
var admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage"); // Cambiar "firebase/storage" a "firebase-admin/storage"


var serviceAccount = require("../firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ecommerce-wolf-default-rtdb.firebaseio.com",
  storageBucket: "gs://ecommerce-wolf.appspot.com" // Reemplaza "your-storage-bucket-name" con el nombre real de tu bucket de almacenamiento

});


const storage = admin.storage(); // No es necesario pasar admin como parámetro
// Obtener la instancia de Firestore
const db = getFirestore();

module.exports = {
  db,storage
};

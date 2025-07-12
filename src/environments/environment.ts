export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyDGgDfCnehlpMQUvWyGlx7g6ylbCKIbeXw",
    authDomain: "ecommerce-cf09f.firebaseapp.com",
    projectId: "ecommerce-cf09f",
    storageBucket: "ecommerce-cf09f.firebasestorage.app",
    messagingSenderId: "208251838230",
    appId: "1:208251838230:web:7fc52aed8e6cf76a8c3a37"
  },
  storeBaseUrl: 'http://localhost:4200/boutique',
  apiUrl: 'http://localhost:3000/api',
  stripe: {
    publicKey: 'pk_test_51RZvh4PMfqUqZ3cAVjE03VByo2Buraxy4DHEqds2WTJc1VUpHBqurLP56AFfO0co8VfzvOcVLdPV61JlLU9Rv6MC00RuKcY2JF'
  },
  payment: {
    amount: 12700,
    currency: 'FCFA',
    description: 'Paiement de Jokkofy'
  }
};
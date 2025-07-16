export const environment = {
  production: true,
  firebase: {
    apiKey: "AIzaSyDGgDfCnehlpMQUvWyGlx7g6ylbCKIbeXw",
    authDomain: "ecommerce-cf09f.firebaseapp.com",
    projectId: "ecommerce-cf09f",
    storageBucket: "ecommerce-cf09f.firebasestorage.app",
    messagingSenderId: "208251838230",
    appId: "1:208251838230:web:7fc52aed8e6cf76a8c3a37"
  },
  storeBaseUrl: 'https://ecommerce-cf09f.web.app/boutique',
  apiUrl: 'https://your-production-api-url.com/api', // À remplacer par votre URL API de production
  stripe: {
    publicKey: 'pk_test_51RZvh4PMfqUqZ3cAVjE03VByo2Buraxy4DHEqds2WTJc1VUpHBqurLP56AFfO0co8VfzvOcVLdPV61JlLU9Rv6MC00RuKcY2JF'
  },
  payment: {
    amount: 12700,
    currency: 'FCFA',
    description: 'Paiement de Jokkofy'
  }
}; 
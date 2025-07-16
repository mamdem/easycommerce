# Guide de Déploiement Firebase

## Prérequis

1. Firebase CLI installé : `npm install -g firebase-tools`
2. Connexion à Firebase : `firebase login`
3. Projet Firebase configuré : `ecommerce-cf09f`

## Configuration

### Environnements

- **Développement** : `src/environments/environment.ts`
- **Production** : `src/environments/environment.prod.ts`

### Variables d'environnement à configurer

Dans `src/environments/environment.prod.ts`, mettez à jour :
- `apiUrl` : URL de votre API de production
- `stripe.publicKey` : Clé publique Stripe de production (si nécessaire)

## Déploiement

### Déploiement complet
```bash
npm run deploy
```

### Déploiement uniquement de l'hébergement
```bash
npm run deploy:hosting
```

### Déploiement uniquement de Firestore
```bash
npm run deploy:firestore
```

### Build de production uniquement
```bash
npm run build:prod
```

## URLs de déploiement

- **Application** : https://ecommerce-cf09f.web.app
- **Console Firebase** : https://console.firebase.google.com/project/ecommerce-cf09f

## Configuration Firebase

Le projet est configuré avec :
- **Hosting** : Pour servir l'application Angular
- **Firestore** : Pour la base de données
- **Functions** : Pour les fonctions serverless (si nécessaire)

## Sécurité

⚠️ **Important** : Les règles Firestore actuelles permettent l'accès complet. 
Ajustez `firestore.rules` selon vos besoins de sécurité avant le déploiement en production. 
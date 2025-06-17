require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');

// Initialisation de Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Vérification des variables d'environnement requises
const requiredEnvVars = [
  'STRIPE_SECRET_KEY', 
  'STRIPE_PRICE_ID', 
  'FRONTEND_URL'
];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Variables d\'environnement manquantes:', missingEnvVars);
  process.exit(1);
}

const app = express();

// Configuration CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  credentials: true
};

// Appliquer CORS pour toutes les routes sauf /webhook
app.use('/webhook', express.raw({type: 'application/json'}));
app.use(cors(corsOptions));
app.use(express.json());

// Route pour créer une session de paiement
app.post('/api/payments/create-subscription-session', async (req, res) => {
  try {
    console.log('Création d\'une session de paiement avec les données:', {
      email: req.body.email,
      userId: req.body.userId,
      priceId: process.env.STRIPE_PRICE_ID
    });

    if (!req.body.email) {
      throw new Error('Email requis pour la création de la session');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 30,
      },
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard?canceled=true`,
      allow_promotion_codes: true,
      customer_email: req.body.email,
      metadata: {
        userId: req.body.userId,
        trialEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

    // Créer immédiatement l'abonnement dans Firebase
    const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Créer/Mettre à jour le document dans la collection subscriptions
    await admin.firestore().collection('subscriptions').doc(req.body.userId).set({
      userId: req.body.userId,
      email: req.body.email,
      subscriptionId: session.id,
      subscriptionStatus: 'trialing',
      trialEnd: trialEndDate,
      isInTrial: true,
      daysLeftInTrial: 30,
      currentPeriodEnd: trialEndDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Mettre à jour également le document utilisateur
    await admin.firestore().collection('users').doc(req.body.userId).set({
      hasSubscription: true,
      subscriptionStatus: 'trialing',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('Session de paiement créée avec succès:', session.id);
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    res.status(500).json({ 
      error: error.message,
      type: error.type,
      code: error.code 
    });
  }
});

// Middleware pour Stripe webhook
app.post('/webhook', async (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Erreur webhook:', err.message);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Gestion des événements
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Paiement réussi pour la session:', session.id);
        
        // Récupérer l'abonnement pour avoir plus de détails
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Calculer les jours restants dans l'essai
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
        const now = new Date();
        const daysLeftInTrial = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        // Mettre à jour la collection subscriptions
        await admin.firestore().collection('subscriptions').doc(session.metadata.userId).set({
          subscriptionId: session.subscription,
          stripeCustomerId: subscription.customer,
          subscriptionStatus: subscription.status,
          trialEnd: trialEnd,
          isInTrial: subscription.status === 'trialing',
          daysLeftInTrial: daysLeftInTrial,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Mettre à jour le document utilisateur
        await admin.firestore().collection('users').doc(session.metadata.userId).set({
          hasSubscription: true,
          subscriptionStatus: subscription.status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const updatedSubscription = event.data.object;
        const userId = updatedSubscription.metadata.userId;
        
        if (userId) {
          // Calculer les jours restants dans l'essai
          const updatedTrialEnd = updatedSubscription.trial_end ? new Date(updatedSubscription.trial_end * 1000) : null;
          const currentDate = new Date();
          const updatedDaysLeft = updatedTrialEnd ? 
            Math.ceil((updatedTrialEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          // Mettre à jour la collection subscriptions
          await admin.firestore().collection('subscriptions').doc(userId).set({
            subscriptionStatus: updatedSubscription.status,
            currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
            trialEnd: updatedTrialEnd,
            isInTrial: updatedSubscription.status === 'trialing',
            daysLeftInTrial: updatedDaysLeft,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          // Mettre à jour le document utilisateur
          await admin.firestore().collection('users').doc(userId).set({
            hasSubscription: updatedSubscription.status !== 'canceled',
            subscriptionStatus: updatedSubscription.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
        break;

      default:
        console.log(`Événement non géré: ${event.type}`);
    }
    response.json({received: true});
  } catch (err) {
    console.error('Erreur lors du traitement de l\'événement:', err);
    response.status(500).send(`Erreur lors du traitement: ${err.message}`);
  }
});

// Route pour vérifier le statut d'un abonnement
app.get('/api/payments/subscription-status/:sessionId', async (req, res) => {
  try {
    console.log('Vérification du statut pour la session:', req.params.sessionId);
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({
      status: session.status,
      customerEmail: session.customer_email,
      subscriptionId: session.subscription
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour annuler un abonnement
app.post('/api/payments/cancel-subscription', async (req, res) => {
  try {
    console.log('Annulation de l\'abonnement:', req.body.subscriptionId);
    const subscription = await stripe.subscriptions.del(req.body.subscriptionId);
    res.json({ status: subscription.status });
  } catch (error) {
    console.error('Erreur lors de l\'annulation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour vérifier le statut d'un abonnement et sa période d'essai
app.get('/api/payments/subscription-details/:subscriptionId', async (req, res) => {
  try {
    console.log('Vérification des détails de l\'abonnement:', req.params.subscriptionId);
    const subscription = await stripe.subscriptions.retrieve(req.params.subscriptionId);
    
    const response = {
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      isInTrial: subscription.status === 'trialing',
      daysLeftInTrial: subscription.trial_end ? 
        Math.ceil((subscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    };

    res.json(response);
  } catch (error) {
    console.error('Erreur lors de la vérification des détails de l\'abonnement:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log('Variables d\'environnement chargées:');
  console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('- STRIPE_PRICE_ID:', process.env.STRIPE_PRICE_ID);
  console.log('- STRIPE_SECRET_KEY:', 'présent');
}); 
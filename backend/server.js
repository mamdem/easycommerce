require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Vérification des variables d'environnement requises
const requiredEnvVars = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'FRONTEND_URL'];
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
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard?canceled=true`,
      allow_promotion_codes: true,
      customer_email: req.body.email,
      metadata: {
        userId: req.body.userId
      }
    });

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
        break;
      case 'customer.subscription.created':
        const subscription = event.data.object;
        console.log('Nouvel abonnement créé:', subscription.id);
        break;
      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object;
        console.log('Abonnement annulé:', canceledSubscription.id);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log('Variables d\'environnement chargées:');
  console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('- STRIPE_PRICE_ID:', process.env.STRIPE_PRICE_ID);
  console.log('- STRIPE_SECRET_KEY:', 'présent');
}); 
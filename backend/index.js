const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = ['https://chkfull-1.onrender.com'];
app.use(cors({ origin: allowedOrigins }));

app.use(bodyParser.json());

app.post('/criar-payment-intent', async (req, res) => {
  const { paymentMethod, amount } = req.body;

  console.log('Dados da requisição:', req.body);

  if (!paymentMethod || !amount) {
    return res.status(400).json({ success: false, message: 'PaymentMethod e amount são obrigatórios.' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'brl',
      payment_method: paymentMethod,
      confirmation_method: 'automatic',
      confirm: true,
      description: 'Pagamento via Stripe',
    });

    console.log('PaymentIntent criado:', paymentIntent);

    res.status(200).json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Erro ao criar PaymentIntent:', error);

    if (error.raw && error.raw.code === 'card_declined') {
      res.status(400).json({ success: false, message: 'Cartão recusado.', error: error.raw.code });
    } else {
      res.status(500).json({ success: false, message: 'Erro ao criar PaymentIntent.', error: error.message });
    }
  }
});

app.get('/teste', (req, res) => {
  res.status(200).json({ success: true, message: 'API está funcionando!' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

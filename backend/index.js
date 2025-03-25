const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Substitua pela sua chave secreta real

const app = express();
const port = process.env.PORT || 3000;

// Habilita CORS apenas para o seu domínio de produção
const allowedOrigins = ['https://chkfull-1.onrender.com']; // Substitua pelo seu domínio real
app.use(cors({ origin: allowedOrigins }));

app.use(bodyParser.json());

// Rota para criar um PaymentIntent com confirmação automática
app.post('/criar-payment-intent', async (req, res) => {
  const { paymentMethod, amount } = req.body;

  if (!paymentMethod || !amount) {
    return res.status(400).json({ success: false, message: 'PaymentMethod e amount são obrigatórios.' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'brl',
      payment_method: paymentMethod,
      confirmation_method: 'automatic',  // Confirma automaticamente no frontend
      confirm: true,  // Confirma automaticamente
      description: 'Pagamento via Stripe',
    });

    // Retorna o client_secret para o frontend
    res.status(200).json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Erro ao criar PaymentIntent:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao criar PaymentIntent.', error: error.message });
  }
});

// Rota de teste
app.get('/teste', (req, res) => {
  res.status(200).json({ success: true, message: 'API está funcionando!' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

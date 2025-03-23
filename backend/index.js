const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Chave secreta lida da variável de ambiente

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Rota para criar um PaymentIntent
app.post('/criar-payment-intent', async (req, res) => {
  const { paymentMethod, amount } = req.body;

  // Validação dos dados de entrada
  if (!paymentMethod || !amount) {
    return res.status(400).json({ success: false, message: 'PaymentMethod e amount são obrigatórios.' });
  }

  try {
    // Cria o PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Valor em centavos (ex: 1000 = R$ 10,00)
      currency: 'brl', // Moeda (BRL para reais)
      payment_method: paymentMethod, // ID do PaymentMethod
      confirmation_method: 'manual', // Exige confirmação manual no front-end
      confirm: true, // Confirma o pagamento automaticamente
      use_stripe_sdk: true, // Habilita o 3D Secure
      description: 'Pagamento de teste', // Descrição do pagamento
    });

    // Retorna o clientSecret para o front-end
    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Erro ao criar PaymentIntent:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao criar PaymentIntent.', error: error.message });
  }
});

// Rota de teste para verificar se a API está funcionando
app.get('/teste', (req, res) => {
  res.status(200).json({ success: true, message: 'API está funcionando!' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

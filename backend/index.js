const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Chave secreta de produção

const app = express();
const port = process.env.PORT || 3000;

// Habilita CORS para os domínios do frontend e backend
const allowedOrigins = ['https://chkfull-1.onrender.com', 'https://chkfull.onrender.com'];
app.use(cors({ origin: allowedOrigins }));
app.use(bodyParser.json());

// Rota para criar um PaymentIntent e testar cartões
app.post('/criar-payment-intent', async (req, res) => {
  try {
    const { paymentMethod, amount } = req.body;

    if (!paymentMethod || !paymentMethod.type || !paymentMethod.card) {
      return res.status(400).json({ success: false, message: 'Dados do cartão são obrigatórios.' });
    }

    // Criando um método de pagamento no Stripe
    const createdPaymentMethod = await stripe.paymentMethods.create(paymentMethod);

    // Criando um PaymentIntent com valor aleatório entre R$ 10,00 e R$ 20,00
    const finalAmount = amount || Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: 'brl',
      payment_method: createdPaymentMethod.id,
      confirmation_method: 'automatic',
      confirm: true,
      description: 'Teste de pagamento',
    });

    if (paymentIntent.status === 'succeeded') {
      return res.status(200).json({
        success: true,
        message: 'Pagamento aprovado',
        amount: finalAmount / 100, // Converte para reais
        status: paymentIntent.status,
      });
    } else {
      return res.status(402).json({
        success: false,
        message: 'Pagamento recusado',
        amount: finalAmount / 100,
        status: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error('Erro ao processar pagamento:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar pagamento',
      error: error.message,
    });
  }
});

// Rota de teste
app.get('/teste', (req, res) => {
  res.status(200).json({ success: true, message: 'API está funcionando!' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

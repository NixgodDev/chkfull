const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Chave secreta de produção

const app = express();
const port = process.env.PORT || 3000;

// Habilita CORS apenas para o domínio de produção
const allowedOrigins = ['https://chkfull-1.onrender.com']; // Substitua pelo domínio real
app.use(cors({ origin: allowedOrigins }));

app.use(bodyParser.json());

// Rota para criar um PaymentIntent e testar cartões
app.post('/criar-payment-intent', async (req, res) => {
  const { cardNumber, expMonth, expYear, cvc } = req.body;

  if (!cardNumber || !expMonth || !expYear || !cvc) {
    return res.status(400).json({ success: false, message: 'Dados do cartão são obrigatórios.' });
  }

  try {
    // Criando um método de pagamento com os dados do cartão
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber,
        exp_month: expMonth,
        exp_year: expYear,
        cvc: cvc,
      },
    });

    // Define um valor aleatório entre 500 e 1000 centavos (R$ 5,00 - R$ 10,00)
    const amount = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;

    // Criando o PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'brl',
      payment_method: paymentMethod.id,
      confirmation_method: 'automatic',
      confirm: true,
      description: 'Teste de pagamento',
    });

    // Se o pagamento for bem-sucedido
    if (paymentIntent.status === 'succeeded') {
      return res.status(200).json({
        success: true,
        message: 'Pagamento aprovado',
        amount: amount / 100, // Converte para reais
        card: cardNumber,
        status: paymentIntent.status,
      });
    } else {
      return res.status(402).json({
        success: false,
        message: 'Pagamento recusado',
        amount: amount / 100,
        card: cardNumber,
        status: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error('Erro ao processar pagamento:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar pagamento',
      error: error.message,
      card: cardNumber,
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

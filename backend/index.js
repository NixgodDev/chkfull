const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Chave secreta lida da variável de ambiente

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Rota para verificar 3D Secure
app.post('/verificar-3ds', async (req, res) => {
  console.log('Requisição recebida:', req.body); // Log da requisição recebida

  const { paymentMethod } = req.body; // Recebe o ID do PaymentMethod

  // Validação dos dados de entrada
  if (!paymentMethod) {
    console.error('PaymentMethod não fornecido.');
    return res.status(400).json({ success: false, message: 'PaymentMethod não fornecido.' });
  }

  try {
    // Recupera o PaymentMethod usando o ID
    const paymentMethodDetails = await stripe.paymentMethods.retrieve(paymentMethod);

    // Verifica se o cartão suporta 3D Secure
    if (paymentMethodDetails.card.three_d_secure_usage.supported) {
      res.status(200).json({ success: true, resultado: { paymentMethod, status: 'Cadastrado no 3D Secure' } });
    } else {
      res.status(200).json({ success: true, resultado: { paymentMethod, status: 'Não cadastrado no 3D Secure' } });
    }
  } catch (error) {
    console.error('Erro ao processar o PaymentMethod:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao processar o PaymentMethod.', error: error.message });
  }
});

// Rota de teste para verificar se a API está funcionando
app.get('/teste', (req, res) => {
  res.status(200).json({ success: true, message: 'API está funcionando!' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

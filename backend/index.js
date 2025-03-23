const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')('sua_chave_secreta_do_stripe');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Rota para verificar 3D Secure
app.post('/verificar-3ds', async (req, res) => {
  const { token } = req.body;

  try {
    // Cria um PaymentMethod usando o token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: token,
      },
    });

    // Verifica se o cartão suporta 3D Secure
    if (paymentMethod.card.three_d_secure_usage.supported) {
      res.status(200).json({ success: true, status: 'Cadastrado no 3D Secure' });
    } else {
      res.status(200).json({ success: true, status: 'Não cadastrado no 3D Secure' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao verificar:', error: error.message });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('API de verificação 3D Secure está funcionando!');
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

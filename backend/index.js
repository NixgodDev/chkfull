require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
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
  const { cartoes } = req.body;

  if (!cartoes) {
    return res.status(400).json({ success: false, message: 'Lista de cartões não fornecida.' });
  }

  try {
    const cartoesArray = cartoes.split('\n').filter((line) => line.trim() !== '');

    if (cartoesArray.length > 100) {
      return res.status(400).json({ success: false, message: 'O limite é de 100 cartões por requisição.' });
    }

    const resultados = [];

    // Processa cada cartão com um intervalo de 5 a 8 segundos
    for (let i = 0; i < cartoesArray.length; i++) {
      const cartao = cartoesArray[i];
      const [numeroCartao, mesValidade, anoValidade, cvc] = cartao.split('|');

      try {
        const paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: numeroCartao,
            exp_month: mesValidade,
            exp_year: anoValidade,
            cvc: cvc,
          },
        });

        if (paymentMethod.card.three_d_secure_usage.supported) {
          resultados.push({ cartao, status: 'Cadastrado no 3D Secure' });
        } else {
          resultados.push({ cartao, status: 'Não cadastrado no 3D Secure' });
        }
      } catch (error) {
        resultados.push({ cartao, status: `Erro ao verificar: ${error.message}` });
      }

      if (i < cartoesArray.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, getRandomInterval()));
      }
    }

    res.status(200).json({ success: true, resultados });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao processar os cartões.', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

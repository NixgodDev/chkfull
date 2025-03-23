const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Use variável de ambiente

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Função para gerar um intervalo aleatório entre 5 e 8 segundos
function getRandomInterval() {
  return Math.floor(Math.random() * (8000 - 5000 + 1)) + 5000;
}

// Função para verificar um cartão
async function verificarCartao(cartao) {
  const [numeroCartao, mesValidade, anoValidade, cvc] = cartao.split('|');

  try {
    // Cria um PaymentMethod no Stripe
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: numeroCartao,
        exp_month: mesValidade,
        exp_year: anoValidade,
        cvc: cvc,
      },
    });

    // Cria um PaymentIntent com 3D Secure
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // Valor simbólico (R$ 1,00)
      currency: 'brl',
      payment_method: paymentMethod.id,
      confirmation_method: 'manual',
      confirm: true,
      use_stripe_sdk: true, // Habilita 3D Secure
    });

    // Verifica se o cartão está cadastrado no 3D Secure
    if (paymentIntent.next_action && paymentIntent.next_action.type === 'use_stripe_sdk') {
      return { cartao, status: 'Cadastrado no 3D Secure' };
    } else {
      return { cartao, status: 'Não cadastrado no 3D Secure' };
    }
  } catch (error) {
    return { cartao, status: 'Erro ao verificar', error: error.message };
  }
}

// Rota para processar os cartões
app.post('/verificar-cartoes', async (req, res) => {
  const { cartoes } = req.body;

  if (!cartoes) {
    return res.status(400).json({ success: false, message: 'Lista de cartões não fornecida.' });
  }

  try {
    const cartoesArray = cartoes.split('\n').filter((line) => line.trim() !== '');

    if (cartoesArray.length > 100) {
      return res.status(400).json({ success: false, message: 'O limite é de 100 cartões por requisição.' });
    }

    const aprovados = [];
    const reprovados = [];

    // Processa cada cartão com um intervalo de 5 a 8 segundos
    for (let i = 0; i < cartoesArray.length; i++) {
      const cartao = cartoesArray[i];
      const resultado = await verificarCartao(cartao);

      if (resultado.status === 'Cadastrado no 3D Secure') {
        aprovados.push(`${cartao}|${resultado.status}`);
      } else {
        reprovados.push(`${cartao}|${resultado.status}`);
      }

      if (i < cartoesArray.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, getRandomInterval()));
      }
    }

    res.status(200).json({ success: true, aprovados, reprovados });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao processar os cartões.', error: error.message });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('API de verificação de cartões 3D Secure está funcionando!');
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Use variável de ambiente

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Função para verificar se o cartão está cadastrado no 3D Secure
async function verificar3DS(cartao) {
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

    // Verifica se o cartão exige autenticação 3D Secure
    if (paymentMethod.card.three_d_secure_usage.supported) {
      return { cartao, status: 'Cadastrado no 3D Secure' };
    } else {
      return { cartao, status: 'Não cadastrado no 3D Secure' };
    }
  } catch (error) {
    return { cartao, status: `Erro ao verificar: ${error.message}` };
  }
}

// Rota para verificar cartões
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

    // Processa cada cartão
    for (const cartao of cartoesArray) {
      const resultado = await verificar3DS(cartao);
      resultados.push(resultado);
    }

    res.status(200).json({ success: true, resultados });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao processar os cartões.', error: error.message });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('API de verificação 3D Secure está funcionando!');
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Chave secreta lida da variável de ambiente

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Função para gerar um intervalo aleatório entre 5 e 8 segundos
const getRandomInterval = () => Math.floor(Math.random() * (8000 - 5000 + 1)) + 5000;

// Rota para verificar 3D Secure
app.post('/verificar-3ds', async (req, res) => {
  const { cartoes } = req.body;

  // Validação dos dados de entrada
  if (!cartoes || typeof cartoes !== 'string') {
    return res.status(400).json({ success: false, message: 'Lista de cartões não fornecida ou em formato inválido.' });
  }

  try {
    const cartoesArray = cartoes.split('\n').filter((line) => line.trim() !== '');

    if (cartoesArray.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum cartão válido fornecido.' });
    }

    if (cartoesArray.length > 100) {
      return res.status(400).json({ success: false, message: 'O limite é de 100 cartões por requisição.' });
    }

    const resultados = [];

    // Processa cada cartão com um intervalo de 5 a 8 segundos
    for (let i = 0; i < cartoesArray.length; i++) {
      const cartao = cartoesArray[i];
      const [numeroCartao, mesValidade, anoValidade, cvc] = cartao.split('|');

      // Validação dos dados do cartão
      if (!numeroCartao || !mesValidade || !anoValidade || !cvc) {
        resultados.push({ cartao, status: 'Formato do cartão inválido. Use: número|mês|ano|cvc' });
        continue; // Pula para o próximo cartão
      }

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
        console.error(`Erro ao processar o cartão ${cartao}:`, error.message);
        resultados.push({ cartao, status: `Erro ao verificar: ${error.message}` });
      }

      // Aguarda um intervalo aleatório entre 5 e 8 segundos antes de processar o próximo cartão
      if (i < cartoesArray.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, getRandomInterval()));
      }
    }

    // Retorna os resultados
    res.status(200).json({ success: true, resultados });
  } catch (error) {
    console.error('Erro ao processar a requisição:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao processar os cartões.', error: error.message });
  }
});

// Rota de teste para verificar se a API está funcionando
app.get('/teste', (req, res) => {
  res.status(200).json({ success: true, message: 'API está funcionando!' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

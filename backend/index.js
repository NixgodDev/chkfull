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
  console.log('Requisição recebida:', req.body); // Log da requisição recebida

  const { paymentMethods } = req.body; // Recebe uma lista de IDs de PaymentMethods

  // Validação dos dados de entrada
  if (!paymentMethods || !Array.isArray(paymentMethods)) {
    console.error('Lista de PaymentMethods não fornecida ou em formato inválido.');
    return res.status(400).json({ success: false, message: 'Lista de PaymentMethods não fornecida ou em formato inválido.' });
  }

  if (paymentMethods.length === 0) {
    console.error('Nenhum PaymentMethod fornecido.');
    return res.status(400).json({ success: false, message: 'Nenhum PaymentMethod fornecido.' });
  }

  if (paymentMethods.length > 100) {
    console.error('Limite de PaymentMethods excedido.');
    return res.status(400).json({ success: false, message: 'O limite é de 100 PaymentMethods por requisição.' });
  }

  const resultados = [];

  try {
    // Processa cada PaymentMethod com um intervalo de 5 a 8 segundos
    for (let i = 0; i < paymentMethods.length; i++) {
      const paymentMethodId = paymentMethods[i];

      try {
        // Recupera o PaymentMethod usando o ID
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

        // Verifica se o cartão suporta 3D Secure
        if (paymentMethod.card.three_d_secure_usage.supported) {
          resultados.push({ paymentMethod: paymentMethodId, status: 'Cadastrado no 3D Secure' });
        } else {
          resultados.push({ paymentMethod: paymentMethodId, status: 'Não cadastrado no 3D Secure' });
        }
      } catch (error) {
        console.error(`Erro ao processar o PaymentMethod ${paymentMethodId}:`, error.message);
        resultados.push({ paymentMethod: paymentMethodId, status: `Erro ao verificar: ${error.message}` });
      }

      // Aguarda um intervalo aleatório entre 5 e 8 segundos antes de processar o próximo PaymentMethod
      if (i < paymentMethods.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, getRandomInterval()));
      }
    }

    // Retorna os resultados
    console.log('Resultados:', resultados); // Log dos resultados
    res.status(200).json({ success: true, resultados });
  } catch (error) {
    console.error('Erro ao processar a requisição:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao processar os PaymentMethods.', error: error.message });
  }
});

// Rota de teste para verificar se a API está funcionando
app.get('/teste', (req, res) => {
  res.status(200).json({ success: true, message: 'API está funcionando!' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

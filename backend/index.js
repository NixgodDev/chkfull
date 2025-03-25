const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = ['https://chkfull-1.onrender.com'];
app.use(cors({ origin: allowedOrigins }));
app.use(bodyParser.json());

app.post('/processar-pagamento', async (req, res) => {
  const { paymentMethod, amount } = req.body;
  if (!paymentMethod || !amount) { return res.status(400).json({ success: false, message: 'Dados inválidos.' }); }
  try {
    const paymentIntent = await stripe.paymentIntents.create({ amount: amount, currency: 'brl', payment_method: paymentMethod, confirmation_method: 'automatic', confirm: true });
    res.json({ success: paymentIntent.status === 'succeeded' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.listen(port, () => { console.log(`Servidor rodando na porta ${port}`); });

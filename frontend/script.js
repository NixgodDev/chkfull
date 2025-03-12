// Sua chave pública do Stripe
const stripe = Stripe('pk_live_51R1BLCFMTCrh72HkN23f1mf1kcFo1aQIydknl26DXCOsg888WkhcoDcxyKfElSucgvhMxkEdfDFqUdFCbsPi8Csn00CBeL4Vb7'); 
const elements = stripe.elements();

// Cria o elemento do cartão
const card = elements.create('card');
card.mount('#card-element');

// Manipulador do envio do formulário
document.getElementById('payment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // Criação de um payment method
  const {token, error} = await stripe.createPaymentMethod('card', card);

  if (error) {
    console.error('Erro ao criar Payment Method:', error);
    alert('Erro ao processar o cartão: ' + error.message);
    return;
  }

  // Enviar o payment_method_id para o backend
  const paymentMethodId = token.id;

  // Agora faça o fetch para o backend
  const API_URL = 'https://chkfull.onrender.com/pagar';  // URL do backend no Render
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payment_method_id: paymentMethodId,
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      alert('Cartão válido!');
    } else {
      alert('Falha ao validar cartão: ' + data.message);
    }
  })
  .catch(error => {
    alert('Erro na requisição: ' + error);
  });
});

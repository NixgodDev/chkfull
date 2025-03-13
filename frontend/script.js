// Sua chave pública do Stripe
const stripe = Stripe('pk_live_51R1BLCFMTCrh72HkN23f1mf1kcFo1aQIydknl26DXCOsg888WkhcoDcxyKfElSucgvhMxkEdfDFqUdFCbsPi8Csn00CBeL4Vb7'); 
const elements = stripe.elements();

// Cria o elemento do cartão
const card = elements.create('card');
card.mount('#card-element');

// Manipulador do envio do formulário
document.getElementById('payment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // Criar um PaymentMethod
  const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: 'card',
    card: card
  });

  if (error) {
    console.error('Erro ao criar Payment Method:', error);
    document.getElementById('message').innerText = 'Erro ao processar o cartão: ' + error.message;
    return;
  }

  const paymentMethodId = paymentMethod.id;

  // Chamada ao backend para verificar o cartão com ZeroAuth
  const API_URL = 'https://chkfull.onrender.com/verificar_cartao'; // Altere para o backend correto
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  })
  .then(response => response.json())
  .then(async (data) => {
    if (data.status === 'success') {
      document.getElementById('message').innerText = 'Cartão válido e pronto para uso!';
    } else if (data.status === 'action_required') {
      document.getElementById('message').innerText = 'Autenticação necessária. Redirecionando...';
      if (data.next_action && data.next_action.redirect_to_url) {
        window.location.href = data.next_action.redirect_to_url;
      }
    } else {
      document.getElementById('message').innerText = 'Falha ao validar cartão: ' + data.message;
    }
  })
  .catch(error => {
    document.getElementById('message').innerText = 'Erro na requisição: ' + error;
  });
});

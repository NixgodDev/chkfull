const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

app.use(bodyParser.json());

// Credenciais da Cielo
const MERCHANT_ID = '8f24ce0d-87f0-47e0-b551-d5254000beb6';
const MERCHANT_KEY = 'mtUAnJxzKZlPm7Ewvzz87Mo9RGUnIMzLDdtHceZf';

// Endpoint da API da Cielo
const CIELO_API_URL = 'https://api.cieloecommerce.cielo.com.br/1/sales';

// Função para criar um pagamento na Cielo
async function criarPagamentoCielo(cardData, valor) {
    const [numeroCartao, mesValidade, anoValidade, codigoSeguranca] = cardData.split('|');

    const paymentData = {
        MerchantOrderId: `ORDER_${Date.now()}`,
        Customer: {
            Name: "Cliente Teste"
        },
        Payment: {
            Type: "CreditCard",
            Amount: valor * 100, // Valor em centavos
            Installments: 1,
            Capture: true,
            CreditCard: {
                CardNumber: numeroCartao,
                Holder: "Cliente Teste",
                ExpirationDate: `${mesValidade}/${anoValidade}`,
                SecurityCode: codigoSeguranca,
                Brand: "Visa" // Pode ser dinâmico com base no BIN
            }
        }
    };

    try {
        const response = await axios.post(CIELO_API_URL, paymentData, {
            headers: {
                'Content-Type': 'application/json',
                'MerchantId': MERCHANT_ID,
                'MerchantKey': MERCHANT_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Erro na API da Cielo:', error.response ? error.response.data : error.message);
        return { status: 'Erro', mensagem: 'Falha na comunicação com a Cielo' };
    }
}

// Rota para processar pagamentos
app.post('/pagamento', async (req, res) => {
    const { cardData, valor } = req.body;

    // Validação do algoritmo de Luhn
    const cardNumber = cardData.split('|')[0];
    if (!luhnCheck(cardNumber)) {
        return res.status(400).json({ 
            status: 'Erro', 
            mensagem: 'Cartão inválido (Luhn)', 
            valor,
            codigoRetorno: '400',
            descricao: 'Cartão inválido (Luhn)'
        });
    }

    // Realizar pagamento na Cielo
    const resultado = await criarPagamentoCielo(cardData, valor);
    if (resultado.status === 'Erro') {
        return res.status(400).json({ 
            status: 'Erro', 
            mensagem: resultado.mensagem, 
            valor,
            codigoRetorno: '400',
            descricao: resultado.mensagem
        });
    }

    // Verificar status do pagamento
    if (resultado.Payment.Status === 1 || resultado.Payment.Status === 2) {
        res.status(200).json({ 
            status: 'Aprovado', 
            mensagem: 'Pagamento realizado com sucesso.', 
            valor,
            codigoRetorno: resultado.Payment.ReturnCode,
            descricao: resultado.Payment.ReturnMessage
        });
    } else {
        res.status(400).json({ 
            status: 'Reprovado', 
            mensagem: 'Pagamento não autorizado.', 
            valor,
            codigoRetorno: resultado.Payment.ReturnCode,
            descricao: resultado.Payment.ReturnMessage
        });
    }
});

// Função para validar o algoritmo de Luhn
function luhnCheck(cardNumber) {
    let sum = 0;
    for (let i = 0; i < cardNumber.length; i++) {
        let digit = parseInt(cardNumber[i]);
        if ((cardNumber.length - i) % 2 === 0) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    return sum % 10 === 0;
}

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API de pagamento rodando em http://localhost:${PORT}`);
});
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// Credenciais da Cielo
const MERCHANT_ID = '335a4825-1ff0-439c-a3ae-f4129b6a1508';
const MERCHANT_KEY = 'QIZNV3iPTTWccjhRStiPheeE0CaJhgwy5BqEbCRO';

// URL da API da Cielo (ambiente de produção)
const CIELO_API_URL = 'https://api.cieloecommerce.cielo.com.br/1/sales';

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

// Função para validar o cartão com ZeroAuth
async function validarCartaoZeroAuth(cardData) {
    const zeroAuthUrl = 'https://api.cieloecommerce.cielo.com.br/1/zeroauth';

    const data = {
        CardNumber: cardData.cardNumber,
        Holder: 'Teste',
        ExpirationDate: cardData.expirationDate,
        SecurityCode: cardData.securityCode,
        Brand: 'Visa' // Pode ser dinâmico com base no BIN
    };

    try {
        const response = await axios.post(zeroAuthUrl, data, {
            headers: {
                'Content-Type': 'application/json',
                'MerchantId': MERCHANT_ID,
                'MerchantKey': MERCHANT_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Erro no ZeroAuth:', error.response ? error.response.data : error.message);
        return { Valid: false };
    }
}

// Função para criar uma cobrança na Cielo
async function criarCobranca(cardData, valor) {
    const paymentData = {
        MerchantOrderId: `ORDER_${Date.now()}`,
        Customer: {
            Name: 'Cliente Teste'
        },
        Payment: {
            Type: 'CreditCard',
            Amount: valor * 100, // Valor em centavos
            Installments: 1,
            Capture: true,
            CreditCard: {
                CardNumber: cardData.cardNumber,
                Holder: 'Cliente Teste',
                ExpirationDate: cardData.expirationDate,
                SecurityCode: cardData.securityCode,
                Brand: 'Visa' // Pode ser dinâmico com base no BIN
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
        throw error;
    }
}

// Rota para processar pagamentos
app.post('/pagamento', async (req, res) => {
    const { cardData, valor } = req.body;

    // Validar o formato do cartão
    if (!cardData || !cardData.cardNumber || !cardData.expirationDate || !cardData.securityCode) {
        return res.status(400).json({
            status: 'Erro',
            mensagem: 'Formato do cartão inválido.',
            valor: 0,
            codigoRetorno: '400',
            descricao: 'Formato do cartão inválido'
        });
    }

    // Validar o algoritmo de Luhn
    if (!luhnCheck(cardData.cardNumber)) {
        return res.status(400).json({
            status: 'Erro',
            mensagem: 'Cartão inválido (Luhn).',
            valor: 0,
            codigoRetorno: '400',
            descricao: 'Cartão inválido (Luhn)'
        });
    }

    // Validar o cartão com ZeroAuth
    const zeroAuthResponse = await validarCartaoZeroAuth(cardData);
    if (!zeroAuthResponse.Valid) {
        return res.status(400).json({
            status: 'Erro',
            mensagem: 'Cartão inválido (ZeroAuth).',
            valor: 0,
            codigoRetorno: '400',
            descricao: 'Cartão inválido (ZeroAuth)'
        });
    }

    // Criar a cobrança
    try {
        const cobrancaResponse = await criarCobranca(cardData, valor);
        return res.json({
            status: cobrancaResponse.Payment.Status === 2 ? 'Aprovado' : 'Reprovado',
            mensagem: cobrancaResponse.Payment.ReturnMessage,
            valor: valor,
            codigoRetorno: cobrancaResponse.Payment.ReturnCode,
            descricao: cobrancaResponse.Payment.ReturnMessage
        });
    } catch (error) {
        return res.status(500).json({
            status: 'Erro',
            mensagem: 'Falha na comunicação com a Cielo.',
            valor: valor,
            codigoRetorno: '500',
            descricao: 'Falha na comunicação com a Cielo'
        });
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API de pagamento rodando na porta ${PORT}`);
});
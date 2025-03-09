<?php
header("Content-Type: application/json");

// Credenciais da Cielo
$merchantId = '335a4825-1ff0-439c-a3ae-f4129b6a1508';
$merchantKey = 'QIZNV3iPTTWccjhRStiPheeE0CaJhgwy5BqEbCRO';

// URL da API da Cielo (ambiente de produção)
$cieloApiUrl = 'https://api.cieloecommerce.cielo.com.br/1/sales';

// Função para validar o algoritmo de Luhn
function luhnCheck($cardNumber) {
    $sum = 0;
    $numDigits = strlen($cardNumber);
    for ($i = 0; $i < $numDigits; $i++) {
        $digit = intval($cardNumber[$i]);
        if (($numDigits - $i) % 2 === 0) {
            $digit *= 2;
            if ($digit > 9) {
                $digit -= 9;
            }
        }
        $sum += $digit;
    }
    return $sum % 10 === 0;
}

// Função para validar o cartão com ZeroAuth
function validarCartaoZeroAuth($cardData, $merchantId, $merchantKey) {
    $zeroAuthUrl = 'https://api.cieloecommerce.cielo.com.br/1/zeroauth';

    $cardNumber = $cardData['cardNumber'];
    $expirationDate = $cardData['expirationDate'];
    $securityCode = $cardData['securityCode'];

    $data = [
        'CardNumber' => $cardNumber,
        'Holder' => 'Teste',
        'ExpirationDate' => $expirationDate,
        'SecurityCode' => $securityCode,
        'Brand' => 'Visa' // Pode ser dinâmico com base no BIN
    ];

    $ch = curl_init($zeroAuthUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'MerchantId: ' . $merchantId,
        'MerchantKey: ' . $merchantKey
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}

// Função para criar uma cobrança na Cielo
function criarCobranca($cardData, $valor, $merchantId, $merchantKey) {
    global $cieloApiUrl;

    $paymentData = [
        'MerchantOrderId' => 'ORDER_' . time(),
        'Customer' => [
            'Name' => 'Cliente Teste'
        ],
        'Payment' => [
            'Type' => 'CreditCard',
            'Amount' => $valor * 100, // Valor em centavos
            'Installments' => 1,
            'Capture' => true,
            'CreditCard' => [
                'CardNumber' => $cardData['cardNumber'],
                'Holder' => 'Cliente Teste',
                'ExpirationDate' => $cardData['expirationDate'],
                'SecurityCode' => $cardData['securityCode'],
                'Brand' => 'Visa' // Pode ser dinâmico com base no BIN
            ]
        ]
    ];

    $ch = curl_init($cieloApiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'MerchantId: ' . $merchantId,
        'MerchantKey: ' . $merchantKey
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}

// Processar a requisição
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $cardData = $input['cardData'];
    $valor = $input['valor'];

    // Validar o formato do cartão
    if (!isset($cardData['cardNumber']) || !isset($cardData['expirationDate']) || !isset($cardData['securityCode'])) {
        http_response_code(400);
        echo json_encode([
            'status' => 'Erro',
            'mensagem' => 'Formato do cartão inválido.',
            'valor' => $valor,
            'codigoRetorno' => '400',
            'descricao' => 'Formato do cartão inválido'
        ]);
        exit;
    }

    // Validar o algoritmo de Luhn
    if (!luhnCheck($cardData['cardNumber'])) {
        http_response_code(400);
        echo json_encode([
            'status' => 'Erro',
            'mensagem' => 'Cartão inválido (Luhn).',
            'valor' => $valor,
            'codigoRetorno' => '400',
            'descricao' => 'Cartão inválido (Luhn)'
        ]);
        exit;
    }

    // Validar o cartão com ZeroAuth
    $zeroAuthResponse = validarCartaoZeroAuth($cardData, $merchantId, $merchantKey);
    if ($zeroAuthResponse['Valid'] !== true) {
        http_response_code(400);
        echo json_encode([
            'status' => 'Erro',
            'mensagem' => 'Cartão inválido (ZeroAuth).',
            'valor' => $valor,
            'codigoRetorno' => '400',
            'descricao' => 'Cartão inválido (ZeroAuth)'
        ]);
        exit;
    }

    // Criar a cobrança
    $cobrancaResponse = criarCobranca($cardData, $valor, $merchantId, $merchantKey);

    if (isset($cobrancaResponse['Payment']['ReturnCode'])) {
        echo json_encode([
            'status' => $cobrancaResponse['Payment']['Status'] === 2 ? 'Aprovado' : 'Reprovado',
            'mensagem' => $cobrancaResponse['Payment']['ReturnMessage'],
            'valor' => $valor,
            'codigoRetorno' => $cobrancaResponse['Payment']['ReturnCode'],
            'descricao' => $cobrancaResponse['Payment']['ReturnMessage']
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'status' => 'Erro',
            'mensagem' => 'Falha na comunicação com a Cielo.',
            'valor' => $valor,
            'codigoRetorno' => '500',
            'descricao' => 'Falha na comunicação com a Cielo'
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'status' => 'Erro',
        'mensagem' => 'Método não permitido.',
        'codigoRetorno' => '405',
        'descricao' => 'Método não permitido'
    ]);
}
?>
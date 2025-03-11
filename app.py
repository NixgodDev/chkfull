from flask import Flask, send_from_directory, request, jsonify
import stripe
import os

app = Flask(__name__)

# Configuração da Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

if not stripe.api_key:
    raise ValueError("Chave de API da Stripe não configurada. Defina a variável de ambiente STRIPE_SECRET_KEY.")

# Rota para servir o arquivo index.html
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# Rota para servir outros arquivos estáticos (CSS, JS, etc.)
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

# Rota para processar pagamentos
@app.route('/processar-pagamento', methods=['POST'])
def processar_pagamento():
    data = request.get_json()
    token = data.get('token')

    if not token:
        return jsonify({"erro": "Token não fornecido"}), 400

    try:
        # Crie uma cobrança usando o token
        cobranca = stripe.Charge.create(
            amount=1000,  # $10.00 em centavos
            currency="usd",
            source=token,
            description="Pagamento de teste"
        )
        return jsonify({"mensagem": "Pagamento processado com sucesso", "cobranca_id": cobranca.id}), 200
    except stripe.error.StripeError as e:
        return jsonify({"erro": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
import time
import stripe
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Permitir requisições do frontend

# Chave secreta do Stripe (modo produção)
STRIPE_SECRET_KEY = "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"
stripe.api_key = STRIPE_SECRET_KEY

@app.route("/pagar", methods=["POST"])
def pagar():
    try:
        data = request.json
        payment_method_id = data.get("payment_method_id")

        if not payment_method_id:
            return jsonify({"error": "Nenhum payment_method_id fornecido"}), 400

        # Criar um pagamento de teste ($1.00)
        payment_intent = stripe.PaymentIntent.create(
            amount=100,  # $1.00 em centavos
            currency="usd",
            payment_method=payment_method_id,
            confirm=True
        )

        # Aguardar 5 segundos antes do estorno
        time.sleep(5)

        # Estornar o pagamento
        stripe.Refund.create(payment_intent=payment_intent.id)

        return jsonify({"status": "success", "message": "Cartão aprovado!", "payment_intent": payment_intent.id})

    except stripe.error.CardError as e:
        return jsonify({"status": "error", "message": str(e.user_message)}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

import time
import stripe
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Permitir requisições do frontend

# Chave secreta do Stripe (definida no ambiente do Render)
import os
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
stripe.api_key = STRIPE_SECRET_KEY

@app.route("/pagar", methods=["POST"])
def pagar():
    try:
        data = request.json
        payment_method_id = data.get("payment_method_id")

        if not payment_method_id:
            return jsonify({"error": "Nenhum payment_method_id fornecido"}), 400

        # Criar pagamento de $1.00
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
  

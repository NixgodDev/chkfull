import stripe
from flask import Flask, request, jsonify
import os
import time

app = Flask(__name__)

# Definindo a chave secreta do Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Rota de verificação de saúde (status)
@app.route("/status", methods=["GET"])
def status():
    return jsonify({"message": "API está funcionando!"})

# Rota de pagamento
@app.route("/pagar", methods=["POST"])
def pagar():
    try:
        data = request.json
        payment_method_id = data.get("payment_method_id")

        if not payment_method_id:
            return jsonify({"error": "payment_method_id não fornecido"}), 400

        # Criar uma PaymentIntent para processar o pagamento
        payment_intent = stripe.PaymentIntent.create(
            amount=100,  # $1.00 em centavos
            currency="usd",
            payment_method=payment_method_id,
            confirm=True
        )

        # Verificar se o pagamento foi bem-sucedido
        if payment_intent.status == 'succeeded':
            # Aguardar um tempo antes de fazer o estorno (5 segundos)
            time.sleep(5)
            
            # Estorno do pagamento
            refund = stripe.Refund.create(payment_intent=payment_intent.id)
            
            return jsonify({
                "status": "success",
                "message": "Cartão válido! Pagamento processado e estornado.",
                "payment_intent": payment_intent.id,
                "refund": refund.id
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Pagamento não foi bem-sucedido.",
                "payment_intent": payment_intent.id
            }), 400

    except stripe.error.CardError as e:
        return jsonify({"status": "error", "message": str(e.user_message)}), 400
    except stripe.error.StripeError as e:
        return jsonify({"status": "error", "message": "Erro na Stripe: " + str(e)}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": "Erro interno: " + str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True)
    

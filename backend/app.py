import stripe
import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS  

app = Flask(__name__)
CORS(app, origins=["https://magnificent-granita-135e1a.netlify.app"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "API está funcionando corretamente."})

@app.route("/status", methods=["GET"])
def status():
    return jsonify({"message": "API está funcionando!"})

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route("/pagar", methods=["POST"])
def pagar():
    try:
        data = request.json
        payment_method_id = data.get("payment_method_id")

        if not payment_method_id:
            return jsonify({"error": "payment_method_id não fornecido"}), 400

        # Criar uma PaymentIntent com return_url
        payment_intent = stripe.PaymentIntent.create(
            amount=100,  # $1.00 em centavos
            currency="usd",
            payment_method=payment_method_id,
            confirm=True,
            return_url="https://magnificent-granita-135e1a.netlify.app/sucesso"  # Defina um return_url válido
        )

        if payment_intent.status == 'requires_action':
            return jsonify({
                "status": "action_required",
                "message": "Autenticação necessária. Redirecionando...",
                "next_action": payment_intent.next_action
            })

        elif payment_intent.status == 'succeeded':
            time.sleep(5)
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
    

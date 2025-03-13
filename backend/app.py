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

@app.route("/verificar_cartao", methods=["POST"])
def verificar_cartao():
    try:
        data = request.json
        payment_method_id = data.get("payment_method_id")

        if not payment_method_id:
            return jsonify({"error": "payment_method_id não fornecido"}), 400

        # Criar um SetupIntent para validar o cartão sem cobrar
        setup_intent = stripe.SetupIntent.create(
            payment_method=payment_method_id,
            confirm=True,
            usage="off_session",
            return_url="https://magnificent-granita-135e1a.netlify.app/sucesso"
        )

        # Verifica se precisa de autenticação
        if setup_intent.status == 'requires_action':
            return jsonify({
                "status": "action_required",
                "message": "Autenticação necessária. Redirecionando...",
                "next_action": setup_intent.next_action
            })

        elif setup_intent.status == 'succeeded':
            return jsonify({
                "status": "success",
                "message": "Cartão válido! Nenhuma cobrança foi feita.",
                "setup_intent": setup_intent.id
            })

        else:
            return jsonify({
                "status": "error",
                "message": "Não foi possível validar o cartão.",
                "setup_intent": setup_intent.id
            }), 400

    except stripe.error.CardError as e:
        return jsonify({"status": "error", "message": str(e.user_message)}), 400
    except stripe.error.StripeError as e:
        return jsonify({"status": "error", "message": "Erro na Stripe: " + str(e)}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": "Erro interno: " + str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True)
    

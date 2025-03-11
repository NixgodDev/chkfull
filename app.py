import os
from flask import Flask, render_template, request, jsonify
import stripe
from dotenv import load_dotenv

# Carregar variáveis do .env
load_dotenv()

# Configurar Stripe
stripe_secret_key = os.getenv("STRIPE_SECRET_KEY")
stripe_public_key = os.getenv("STRIPE_PUBLIC_KEY")

if not stripe_secret_key or not stripe_public_key:
    raise ValueError("ERRO: As chaves da Stripe não foram configuradas corretamente!")

stripe.api_key = stripe_secret_key

# Criar aplicação Flask
app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html", public_key=stripe_public_key)

@app.route("/validar_cartao", methods=["POST"])
def validar_cartao():
    try:
        data = request.get_json()
        payment_method_id = data.get("payment_method")

        if not payment_method_id:
            return jsonify({"erro": "PaymentMethod é obrigatório!"}), 400

        # Criar um SetupIntent para validar o cartão sem cobrar
        setup_intent = stripe.SetupIntent.create(
            payment_method=payment_method_id,
            confirm=True
        )

        return jsonify({"mensagem": "Cartão válido para transações!", "setup_intent": setup_intent.id})

    except stripe.error.CardError as e:
        return jsonify({"erro": "Erro no cartão: " + str(e.user_message)}), 400
    except stripe.error.InvalidRequestError as e:
        return jsonify({"erro": "Requisição inválida: " + str(e.user_message)}), 400
    except stripe.error.AuthenticationError:
        return jsonify({"erro": "Erro de autenticação. Verifique sua chave da Stripe."}), 403
    except stripe.error.APIConnectionError:
        return jsonify({"erro": "Erro de conexão com a API da Stripe."}), 500
    except stripe.error.StripeError:
        return jsonify({"erro": "Erro desconhecido da Stripe. Tente novamente mais tarde."}), 500
    except Exception as e:
        return jsonify({"erro": "Erro interno: " + str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
    

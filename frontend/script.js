document.addEventListener("DOMContentLoaded", function () {
    const stripe = Stripe("pk_live_51R1BLCFMTCrh72HkN23f1mf1kcFo1aQIydknl26DXCOsg888WkhcoDcxyKfElSucgvhMxkEdfDFqUdFCbsPi8Csn00CBeL4Vb7");  // Chave pública do Stripe
    const elements = stripe.elements();
    const card = elements.create("card");
    card.mount("#card-element");

    document.getElementById("payment-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const { paymentMethod, error } = await stripe.createPaymentMethod({
            type: "card",
            card: card
        });

        if (error) {
            document.getElementById("message").innerText = error.message;
        } else {
            validarCartao(paymentMethod.id);
        }
    });

    async function validarCartao(paymentMethodId) {
        try {
            const response = await fetch("https://chkfull.onrender.com", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payment_method_id: paymentMethodId })
            });
            const result = await response.json();
            document.getElementById("message").innerText = result.message;
        } catch (error) {
            document.getElementById("message").innerText = "Erro ao processar!";
        }
    }
});

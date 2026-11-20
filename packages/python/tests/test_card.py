import httpx
import json
import pytest
from launa_sdk import CardCheckout, LaunaClient


def test_disconnect_binds_displayed_connection():
    calls = []
    def handle(request):
        calls.append(request)
        assert request.method == "DELETE"
        assert request.headers["X-Launa-Environment"] == "development"
        assert json.loads(request.content) == {"connection_id": "connection_sandbox"}
        return httpx.Response(204)
    with httpx.Client(transport=httpx.MockTransport(handle)) as http:
        client = LaunaClient("https://control.example", environment="development", http_client=http)
        client.card_payments.disconnect("connection_sandbox")
    assert len(calls) == 1


def test_token_preserved_and_redirect_not_followed():
    calls = []
    def handle(request):
        calls.append(request)
        if request.headers['Launa-Payment'] == 'resume':
            return httpx.Response(302, headers={'Location': 'https://other.example'})
        return httpx.Response(202, json={'status': 'pending', 'checkout_url': 'https://checkout.stripe.com/test'})
    with httpx.Client(transport=httpx.MockTransport(handle), follow_redirects=True) as http:
        c = CardCheckout('https://gateway.example/data', client=http)
        c.start(); c.status()
        assert c.resume().status_code == 302
        assert [r.headers['Launa-Payment'] for r in calls] == ['checkout', 'status', 'resume']
        assert all(r.headers['Launa-Payment-Token'] == c.token for r in calls)


def test_invalid_checkout_url():
    with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(202, json={'status': 'pending', 'checkout_url': 'https://attacker.example'}))) as http:
        c = CardCheckout('https://gateway.example/data', client=http)
        with pytest.raises(ValueError): c.start()


def test_unsafe_url_and_mixed_payment():
    with pytest.raises(ValueError): CardCheckout('http://gateway.example')
    with pytest.raises(ValueError): CardCheckout('https://gateway.example', headers={'X-PAYMENT': 'x'})

@pytest.mark.parametrize("headers", [{"Authorization": "Payment fixture"}, {"Payment-Authorization": "Payment fixture"}])
def test_checkout_rejects_mpp_credentials(headers):
    with pytest.raises(ValueError, match="Choose one payment mechanism"):
        CardCheckout("https://gateway.example/data", headers=headers)

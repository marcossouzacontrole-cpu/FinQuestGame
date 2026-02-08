
import requests
import json

# URL do Webhook do n8n
url = "http://localhost:5678/webhook/classify-transfer"

# Payload simulando uma transação
payload = {
    "body": {
        "text": "COMPRA APROVADA 12.345.678/0001-99 RESTAURANTE TESTE SAO PAULO"
    }
}

try:
    print(f"Enviando teste para {url}...")
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        print("✅ Sucesso! Resposta do n8n:")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"❌ Erro {response.status_code}: {response.text}")
        print("\nDica: Verifique se o n8n está rodando e se o Workflow está ATIVO ou em modo de TESTE (Execute Workflow).")

except Exception as e:
    print(f"❌ Erro de conexão: {e}")

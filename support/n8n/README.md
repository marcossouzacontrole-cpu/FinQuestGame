# FinQuest n8n Automation

Este diretório contém a configuração para rodar o **n8n** localmente e um workflow modelo para **Classificação de Transferências Bancárias**.

## Como Rodar

1.  Abra o terminal neste diretório:
    ```bash
    cd support/n8n
    ```
2.  Suba o container:
    ```bash
    docker-compose up -d
    ```
3.  Acesse: [http://localhost:5678](http://localhost:5678)

## 🔑 Configurando as Credenciais (IMPORTANTE)

Você tem 2 tipos de credenciais para configurar no menu **Credentials** do n8n:

### 1. Para Leitura da Planilha (Palavras-Chave)
Use o **Client ID** e **Client Secret** que você forneceu.
*   **Tipo de Credencial**: `Google Sheets OAuth2 API`
*   **Client ID**: `SUA_CLIENT_ID_DO_GOOGLE.apps.googleusercontent.com`
*   **Client Secret**: `SUA_CLIENT_SECRET_DO_GOOGLE`
*   ⚠️ **Atenção**: Você precisará adicionar a "Redirect URL" mostrada no n8n lá no console do Google Cloud, ou usar o método de autenticação "Sign in with Google" se estiver rodando localmente.

### 2. Para Busca de CNPJ (Google Search)
Essa parte requer uma chave de **API de Servidor**, diferente do OAuth acima.
*   **Tipo de Credencial**: `Google Custom Search`
*   **API Key**: Começa com `AIza...` (Você precisa criar no [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials))
*   **CX (Search Engine ID)**: Identificador do motor de busca (Criar em [Programmable Search Engine](https://programmablesearchengine.google.com/))

## Configuração da Planilha

Crie uma planilha no Google Sheets com 2 colunas:
1.  **keyword**: (Ex: Uber, Ifood, Posto)
2.  **categoria**: (Ex: Transporte, Alimentação, Combustível)

Copie a **URL da planilha** e cole no nó "Ler Keywords (Sheets)" dentro do workflow.

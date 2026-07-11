import os
import requests
import json

EVO_URL = os.getenv("EVOLUTION_API_URL", "SUA_URL_AQUI")
EVO_KEY = os.getenv("EVOLUTION_API_KEY", "SUA_KEY_AQUI")

def test_groups(instance_name):
    print(f"\n--- Testando grupos para: {instance_name} ---")
    url = f"{EVO_URL}/group/fetchAllGroups/{instance_name}?getParticipants=false"
    headers = {"apikey": EVO_KEY}
    try:
        res = requests.get(url, headers=headers)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            groups = res.json()
            print(f"Total de grupos retornados pela API: {len(groups)}")
            for g in groups[:5]:
                print(f"- {g.get('subject') or g.get('name')} ({g.get('id')})")
        else:
            print(f"Erro: {res.text}")
    except Exception as e:
        print(f"Erro na requisição: {e}")

if __name__ == "__main__":
    print(f"URL: {EVO_URL}")
    # Aqui eu precisaria dos nomes das instâncias reais para testar, 
    # mas como não tenho, vou apenas validar a estrutura do código.
    print("Script pronto para diagnóstico interno.")

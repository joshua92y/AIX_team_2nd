#locaai/chatbot/utils/chach.py
from typing import List

_ADSTRD_NAME_CACHE = {}

def get_all_adstrd_names(client, collection_name: str) -> List[str]:
    seen = set()
    offset = None

    while True:
        response = client.scroll(
            collection_name=collection_name,
            with_payload=True,
            with_vectors=False,
            offset=offset,
            limit=100
        )

        points = response[0]
        offset = response[1]

        for point in points:
            payload = point.payload or {}
            name = payload.get("ADSTRD_NM")
            if name:
                seen.add(name)

        if offset is None:
            break

    return sorted(seen)



def initialize_adstrd_name_cache(client, collection_name: str):
    """
    Qdrant에서 ADSTRD_NM 전체 목록을 읽어와 캐시 저장 (사용자가 해당 컬렉션을 조회할 때 1회 호출)
    """
    print(f"initialize_adstrd_name_cache 호출: {collection_name}")
    if collection_name not in _ADSTRD_NAME_CACHE:
        names = get_all_adstrd_names(client, collection_name)
        _ADSTRD_NAME_CACHE[collection_name] = names

async def get_cached_adstrd_names(collection_name: str) -> List[str]:
    return _ADSTRD_NAME_CACHE.get(collection_name, [])
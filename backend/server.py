from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, Response
from starlette.middleware.cors import CORSMiddleware
import httpx
import os
import logging

app = FastAPI()

NEXTJS_URL = "http://127.0.0.1:3000"

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_to_nextjs(request: Request, path: str):
    target_url = f"{NEXTJS_URL}/api/{path}"
    
    query_string = str(request.url.query)
    if query_string:
        target_url += f"?{query_string}"
    
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)
    
    body = await request.body()
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body if body else None,
            )
            
            excluded_headers = {"transfer-encoding", "content-encoding", "content-length"}
            response_headers = {
                k: v for k, v in response.headers.items() 
                if k.lower() not in excluded_headers
            }
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=response_headers,
            )
        except Exception as e:
            logger.error(f"Proxy error: {e}")
            return Response(
                content=f'{{"error": "Proxy error: {str(e)}"}}',
                status_code=502,
                media_type="application/json",
            )

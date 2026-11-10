from functools import lru_cache
from pydantic_settings import BaseSettings,SettingsConfigDict

class Settings(BaseSettings):
    model_config=SettingsConfigDict(env_file='.env',extra='ignore')
    aws_region:str='eu-north-1'
    aws_access_key_id:str=''
    aws_secret_access_key:str=''
    s3_bucket:str=''
    database_url:str=''
    ollama_chat_model :str =  "qwen2.5:3b"
    ollama_embed_model :str =  "nomic-embed-text:latest"  
    embed_dim : int =  768
    max_upload_bytes:int=10485760
    pinecone_api_key:str=''
    pinecone_index_name:str= "nexora-ai-index"
    pinecone_cloud:str='aws'
    pinecone_region:str='us-east-1'
    pinecone_ready_timeout:int=180
    min_relevance:float=0.25
    hitl_enabled:bool=True
    groq_api_key:str=''
    cohere_api_key:str=''
    memory_turns:int=6

@lru_cache
def settings() -> Settings :
    return Settings()


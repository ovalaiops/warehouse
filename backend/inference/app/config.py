from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_2b_path: str = "nvidia/Cosmos-Reason2-2B"
    model_8b_path: str = "nvidia/Cosmos-Reason2-8B"
    vllm_max_model_len: int = 16384
    gpu_memory_utilization: float = 0.9
    redis_url: str = "redis://localhost:6379"
    default_temperature: float = 0.3
    default_top_p: float = 0.7

    class Config:
        env_prefix = ""


settings = Settings()

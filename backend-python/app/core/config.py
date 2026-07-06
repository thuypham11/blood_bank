from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongo_uri: str = ""
    database_name: str = "Blood-bank"
    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    port: int = 5000
    frontend_origin: str = "http://localhost:5173"

    blood_collection: str = "bloods"
    blood_request_collection: str = "bloodrequests"
    facility_collection: str = "facilities"
    donor_collection: str = "donors"
    admin_collection: str = "admins"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

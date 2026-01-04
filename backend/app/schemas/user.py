from pydantic import BaseModel

class LoginRequest(BaseModel):
    identifier: str 
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
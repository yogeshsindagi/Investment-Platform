from dotenv import load_dotenv
import os

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USERNAME = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")

SSL_CA_PATH = os.getenv("SSL_CA_PATH")
SSL_VERIFY_CERT = os.getenv("SSL_VERIFY_CERT")
SSL_VERIFY_IDENTITY = os.getenv("SSL_VERIFY_IDENTITY")
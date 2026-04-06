import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

def get_engine():
    server = os.getenv("SQL_SERVER", r"MSI\SQLEXPRESS")
    database = os.getenv("SQL_DATABASE", "mimii_anomaly")

    conn_str = (
        f"mssql+pyodbc://{server}/{database}"
        f"?driver=ODBC+Driver+17+for+SQL+Server"
        f"&trusted_connection=yes"
    )

    return create_engine(conn_str)
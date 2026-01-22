# src/models/student.py

from pydantic import BaseModel
from typing import List

class Student(BaseModel):
    name: str
    matricule: str
    embedding: List[float]
    photos: List[str]
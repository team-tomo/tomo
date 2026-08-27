from dataclasses import dataclass

from supabase import AsyncClient


@dataclass(frozen=True, slots=True)
class AuthContext:
    client: AsyncClient
    current_user_id: str
    token: str

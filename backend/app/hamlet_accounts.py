"""Temporary hamlet sign-ins.

Each hamlet has its own user id, so its dashboard starts empty. These passwords
are meant to be sent once and replaced. They are not a long-term secret store.
"""

from __future__ import annotations

import hashlib
import hmac
import os
from typing import Any

# 24 Nunavut hamlets. Iqaluit is a city and is not included.
HAMLETS: list[dict[str, str]] = [
    {"username": "arcticbay", "hamlet": "Arctic Bay", "also_known_as": "Ikpiarjuk", "region": "Qikiqtaaluk"},
    {"username": "arviat", "hamlet": "Arviat", "also_known_as": "", "region": "Kivalliq"},
    {"username": "bakerlake", "hamlet": "Baker Lake", "also_known_as": "Qamani'tuaq", "region": "Kivalliq"},
    {"username": "cambridgebay", "hamlet": "Cambridge Bay", "also_known_as": "Iqaluktuuttiaq", "region": "Kitikmeot"},
    {"username": "chesterfield", "hamlet": "Chesterfield Inlet", "also_known_as": "Igluligaarjuk", "region": "Kivalliq"},
    {"username": "clyderiver", "hamlet": "Clyde River", "also_known_as": "Kangiqtugaapik", "region": "Qikiqtaaluk"},
    {"username": "coralharbour", "hamlet": "Coral Harbour", "also_known_as": "Salliq", "region": "Kivalliq"},
    {"username": "gjoahaven", "hamlet": "Gjoa Haven", "also_known_as": "Uqsuqtuuq", "region": "Kitikmeot"},
    {"username": "grisefiord", "hamlet": "Grise Fiord", "also_known_as": "Aujuittuq", "region": "Qikiqtaaluk"},
    {"username": "igloolik", "hamlet": "Igloolik", "also_known_as": "Iglulik", "region": "Qikiqtaaluk"},
    {"username": "kimmirut", "hamlet": "Kimmirut", "also_known_as": "", "region": "Qikiqtaaluk"},
    {"username": "kinngait", "hamlet": "Kinngait", "also_known_as": "Cape Dorset", "region": "Qikiqtaaluk"},
    {"username": "kugaaruk", "hamlet": "Kugaaruk", "also_known_as": "", "region": "Kitikmeot"},
    {"username": "kugluktuk", "hamlet": "Kugluktuk", "also_known_as": "", "region": "Kitikmeot"},
    {"username": "naujaat", "hamlet": "Naujaat", "also_known_as": "Repulse Bay", "region": "Kivalliq"},
    {"username": "pangnirtung", "hamlet": "Pangnirtung", "also_known_as": "Panniqtuuq", "region": "Qikiqtaaluk"},
    {"username": "pondinlet", "hamlet": "Pond Inlet", "also_known_as": "Mittimatalik", "region": "Qikiqtaaluk"},
    {"username": "qikiqtarjuaq", "hamlet": "Qikiqtarjuaq", "also_known_as": "Broughton Island", "region": "Qikiqtaaluk"},
    {"username": "rankininlet", "hamlet": "Rankin Inlet", "also_known_as": "Kangiqliniq", "region": "Kivalliq"},
    {"username": "resolute", "hamlet": "Resolute Bay", "also_known_as": "Qausuittuq", "region": "Qikiqtaaluk"},
    {"username": "sanikiluaq", "hamlet": "Sanikiluaq", "also_known_as": "", "region": "Qikiqtaaluk"},
    {"username": "sanirajak", "hamlet": "Sanirajak", "also_known_as": "Hall Beach", "region": "Qikiqtaaluk"},
    {"username": "taloyoak", "hamlet": "Taloyoak", "also_known_as": "", "region": "Kitikmeot"},
    {"username": "whalecove", "hamlet": "Whale Cove", "also_known_as": "Tikirarjuaq", "region": "Kivalliq"},
]


def temporary_password(username: str) -> str:
    account = account_by_username(username)
    compact = account["hamlet"].replace(" ", "")
    return f"Neda-{compact}-2026"


def account_by_username(username: str) -> dict[str, str] | None:
    key = (username or "").strip().lower()
    for account in HAMLETS:
        if account["username"] == key:
            return account
    return None


def authenticate(username: str, password: str) -> dict[str, str] | None:
    account = account_by_username(username)
    if account is None:
        return None
    expected = temporary_password(account["username"])
    if not hmac.compare_digest(password, expected):
        return None
    return account


def public_user(account: dict[str, str]) -> dict[str, str]:
    username = account["username"]
    return {
        "id": f"hamlet-{username}",
        "username": username,
        "email": f"{username}@hamlets.neda",
        "name": account["hamlet"],
    }


def _secret() -> bytes:
    return os.getenv("HAMLET_LOGIN_SECRET", "neda-temporary-hamlet-login").encode()


def issue_token(username: str) -> str:
    account = account_by_username(username)
    if account is None:
        raise ValueError("Unknown hamlet account.")
    signature = hmac.new(_secret(), account["username"].encode(), hashlib.sha256).hexdigest()
    return f"hamlet.{account['username']}.{signature}"


def user_from_token(token: str) -> dict[str, Any] | None:
    parts = (token or "").split(".")
    if len(parts) != 3 or parts[0] != "hamlet":
        return None
    username, signature = parts[1], parts[2]
    account = account_by_username(username)
    if account is None:
        return None
    expected = hmac.new(_secret(), account["username"].encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    return public_user(account)

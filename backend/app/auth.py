from __future__ import annotations

import base64
import json
import os
from typing import Any


def get_auth_mode() -> str:
    return os.getenv("AUTH_MODE", "dev").strip().lower()


def dev_user() -> dict[str, Any]:
    return {
        "id": os.getenv("DEV_USER_ID", "dev-user"),
        "email": os.getenv("DEV_USER_EMAIL", "prave@example.com"),
        "name": os.getenv("DEV_USER_NAME", "Prave"),
    }


def user_from_authorization_header(authorization: str | None) -> dict[str, Any]:
    mode = get_auth_mode()
    if mode == "cognito":
        if not authorization or not authorization.lower().startswith("bearer "):
            raise ValueError("Missing bearer token.")
        return verify_cognito_token(authorization.split(" ", 1)[1].strip())

    if mode == "supabase":
        if not authorization or not authorization.lower().startswith("bearer "):
            raise ValueError("Missing bearer token.")
        return verify_supabase_token(authorization.split(" ", 1)[1].strip())

    if authorization and authorization.lower().startswith("bearer "):
        payload = _decode_jwt_payload_without_verification(authorization.split(" ", 1)[1].strip())
        if payload:
            return {
                "id": str(payload.get("sub") or payload.get("user_id") or dev_user()["id"]),
                "email": str(payload.get("email") or dev_user()["email"]),
                "name": str(payload.get("name") or payload.get("given_name") or dev_user()["name"]),
            }
    return dev_user()


def verify_supabase_token(token: str) -> dict[str, Any]:
    try:
        import jwt
    except ImportError as exc:
        raise RuntimeError("PyJWT is required when AUTH_MODE=supabase.") from exc

    header = jwt.get_unverified_header(token)
    algorithm = str(header.get("alg") or "")

    if algorithm.startswith("HS"):
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret:
            raise RuntimeError("SUPABASE_JWT_SECRET is required for HS256 Supabase tokens.")
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=[algorithm],
            audience="authenticated",
            options={"verify_exp": True},
        )
    else:
        payload = _verify_supabase_jwks_token(jwt, token, algorithm)

    user_meta = payload.get("user_metadata") or {}
    name = (
        user_meta.get("full_name")
        or user_meta.get("name")
        or payload.get("email")
        or "User"
    )
    return {
        "id": str(payload.get("sub")),
        "email": str(payload.get("email") or ""),
        "name": str(name),
    }


def _verify_supabase_jwks_token(jwt_module: Any, token: str, algorithm: str) -> dict[str, Any]:
    unverified_payload = _decode_jwt_payload_without_verification(token) or {}
    issuer = str(unverified_payload.get("iss") or "").strip().rstrip("/")
    supabase_url = (
        os.getenv("SUPABASE_URL")
        or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        or ""
    ).strip().rstrip("/")
    if supabase_url and not supabase_url.startswith(("http://", "https://")):
        supabase_url = f"https://{supabase_url}"
    explicit_jwks_url = os.getenv("SUPABASE_JWKS_URL", "").strip()
    if not explicit_jwks_url and not supabase_url and not issuer:
        raise RuntimeError("SUPABASE_URL, SUPABASE_JWKS_URL, or a JWT issuer is required for asymmetric Supabase tokens.")

    jwks_urls = []
    if explicit_jwks_url:
        jwks_urls.append(explicit_jwks_url)
    if issuer:
        jwks_urls.append(f"{issuer}/.well-known/jwks.json")
    if supabase_url:
        jwks_urls.append(f"{supabase_url}/auth/v1/.well-known/jwks.json")
    last_error: Exception | None = None
    for jwks_url in dict.fromkeys(jwks_urls):
        try:
            jwk_client = jwt_module.PyJWKClient(jwks_url)
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            return jwt_module.decode(
                token,
                signing_key.key,
                algorithms=[algorithm],
                audience="authenticated",
                options={"verify_exp": True},
            )
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"Could not verify Supabase JWT with JWKS: {last_error}") from last_error


def verify_cognito_token(token: str) -> dict[str, Any]:
    try:
        import jwt
    except ImportError as exc:
        raise RuntimeError("PyJWT is required when AUTH_MODE=cognito.") from exc

    region = os.getenv("AWS_REGION") or os.getenv("COGNITO_REGION")
    user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    app_client_id = os.getenv("COGNITO_APP_CLIENT_ID")
    if not region or not user_pool_id:
        raise RuntimeError("COGNITO_USER_POOL_ID and AWS_REGION are required when AUTH_MODE=cognito.")

    issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"
    jwks_url = f"{issuer}/.well-known/jwks.json"
    jwk_client = jwt.PyJWKClient(jwks_url)
    signing_key = jwk_client.get_signing_key_from_jwt(token)
    options = {"verify_aud": bool(app_client_id)}
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=app_client_id if app_client_id else None,
        issuer=issuer,
        options=options,
    )
    return {
        "id": str(payload.get("sub")),
        "email": str(payload.get("email") or ""),
        "name": str(payload.get("name") or payload.get("given_name") or payload.get("email") or "User"),
    }


def _decode_jwt_payload_without_verification(token: str) -> dict[str, Any] | None:
    parts = token.split(".")
    if len(parts) < 2:
        return None
    payload = parts[1] + "=" * (-len(parts[1]) % 4)
    try:
        decoded = base64.urlsafe_b64decode(payload.encode("utf-8"))
        return json.loads(decoded.decode("utf-8"))
    except Exception:
        return None

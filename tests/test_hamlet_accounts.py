from backend.app.hamlet_accounts import HAMLETS, authenticate, issue_token, public_user, temporary_password, user_from_token
from backend.app.auth import user_from_authorization_header


def test_every_hamlet_has_its_own_empty_account():
    ids = set()
    for account in HAMLETS:
        user = public_user(account)
        assert user["id"] not in ids
        ids.add(user["id"])
        assert user["id"] != "dev-user"
        assert authenticate(account["username"], temporary_password(account["username"])) == account
        assert authenticate(account["username"], "wrong-password") is None
        token = issue_token(account["username"])
        assert user_from_token(token)["id"] == user["id"]
        assert user_from_authorization_header(f"Bearer {token}")["id"] == user["id"]

    assert len(HAMLETS) == 24
    assert user_from_token("hamlet.arviat.not-a-real-signature") is None

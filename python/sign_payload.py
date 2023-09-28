from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

with open("private.pem", "rb") as f:
    private_key = serialization.load_pem_private_key(
        f.read(), password=None
    )

with open("encoded_payload.txt", "rb") as f:
    encoded_payload = f.read()

der_signature = private_key.sign(encoded_payload, ec.ECDSA(hashes.SHA256()))

r, s = decode_dss_signature(der_signature)
r_s_signature = r.to_bytes(32, "big") + s.to_bytes(32, "big")

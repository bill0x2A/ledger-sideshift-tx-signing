from flask import Flask, jsonify, request
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
import base64

app = Flask(__name__)

def sign_payload(encoded_payload):
    with open("private.pem", "rb") as f:
        private_key = serialization.load_pem_private_key(
            f.read(), password=None
        )

    der_signature = private_key.sign(encoded_payload, ec.ECDSA(hashes.SHA256()))

    r, s = decode_dss_signature(der_signature)
    r_s_signature = r.to_bytes(32, "big") + s.to_bytes(32, "big")

    return base64.b64encode(r_s_signature).decode('utf-8')

@app.route('/api/sign', methods=['POST'])
def get_signed_payload():
    payload = request.get_json()
    if 'data' not in payload:
        return jsonify({'error': 'data field missing'}), 400
    try:
        signature = sign_payload(payload['data'].encode('utf-8'))
        return jsonify({'signature': signature})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
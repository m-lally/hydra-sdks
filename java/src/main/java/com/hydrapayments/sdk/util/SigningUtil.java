package com.hydrapayments.sdk.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.util.Base64;

public final class SigningUtil {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private SigningUtil() {}

    public static String signMessage(String secret, String message) {
        if (secret == null || secret.isEmpty()) {
            return "";
        }
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes("UTF-8"), HMAC_ALGORITHM);
            mac.init(keySpec);
            byte[] rawHmac = mac.doFinal(message.getBytes("UTF-8"));
            return Base64.getEncoder().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Failed to sign message", e);
        }
    }

    public static boolean verifySignature(String secret, String payload, String signature) {
        if (secret == null || secret.isEmpty()) {
            return false;
        }
        String expected = signMessage(secret, payload);
        try {
            byte[] expectedBytes = Base64.getDecoder().decode(expected);
            byte[] givenBytes = Base64.getDecoder().decode(signature);
            if (expectedBytes.length != givenBytes.length) {
                return false;
            }
            return MessageDigest.isEqual(expectedBytes, givenBytes);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public static String buildSigningMessage(String method, String path, String timestamp, String body) {
        return method + ":" + path + ":" + timestamp + ":" + body;
    }
}

package com.hydrapayments.sdk

import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object SigningUtil {
    fun sign(secret: String, message: String): String {
        if (secret.isEmpty()) return ""
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return Base64.getEncoder().encodeToString(mac.doFinal(message.toByteArray(Charsets.UTF_8)))
    }

    fun verify(secret: String, message: String, signature: String): Boolean {
        if (secret.isEmpty() && signature.isEmpty()) return true
        return sign(secret, message) == signature
    }

    fun buildSigningMessage(method: String, path: String, timestamp: String, body: String): String {
        return "$method:$path:$timestamp:$body"
    }
}

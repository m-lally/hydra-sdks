package com.hydrapayments.sdk

import java.net.HttpURLConnection
import java.net.URL

interface HttpClient {
    data class Response(val statusCode: Int, val body: String)

    fun send(method: String, url: String, headers: Map<String, String>, body: String?): Response
}

class HttpURLConnectionClient : HttpClient {
    override fun send(method: String, url: String, headers: Map<String, String>, body: String?): HttpClient.Response {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 30_000
        connection.readTimeout = 30_000

        headers.forEach { (k, v) -> connection.setRequestProperty(k, v) }

        if (body != null) {
            connection.doOutput = true
            connection.outputStream.use { it.write(body.toByteArray()) }
        }

        val statusCode = connection.responseCode
        val responseBody = if (statusCode >= 400) {
            connection.errorStream?.bufferedReader()?.readText() ?: ""
        } else {
            connection.inputStream?.bufferedReader()?.readText() ?: ""
        }

        return HttpClient.Response(statusCode, responseBody)
    }
}

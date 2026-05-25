package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ApiResponse<T> {

    private boolean success;
    private T data;
    private String error;

    public ApiResponse() {}

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public T getData() { return data; }
    public void setData(T data) { this.data = data; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}

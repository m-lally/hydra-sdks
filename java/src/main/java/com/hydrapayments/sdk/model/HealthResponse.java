package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class HealthResponse {

    private String status;
    private String version;
    private String database;

    public HealthResponse() {}

    public HealthResponse(String status, String version, String database) {
        this.status = status;
        this.version = version;
        this.database = database;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getDatabase() { return database; }
    public void setDatabase(String database) { this.database = database; }

    public boolean isHealthy() {
        return "healthy".equals(status) && "connected".equals(database);
    }
}

package com.hydrapayments.sdk.model;

public class WebhookResponse {

    private boolean received;

    public WebhookResponse() {}

    public boolean isReceived() { return received; }
    public void setReceived(boolean received) { this.received = received; }
}

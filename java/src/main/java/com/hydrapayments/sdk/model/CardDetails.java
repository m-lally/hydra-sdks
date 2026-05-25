package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CardDetails {

    private String brand;
    private String last4;
    private int expMonth;
    private int expYear;

    public CardDetails() {}

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getLast4() { return last4; }
    public void setLast4(String last4) { this.last4 = last4; }

    @JsonProperty("exp_month")
    public int getExpMonth() { return expMonth; }
    @JsonProperty("exp_month")
    public void setExpMonth(int expMonth) { this.expMonth = expMonth; }

    @JsonProperty("exp_year")
    public int getExpYear() { return expYear; }
    @JsonProperty("exp_year")
    public void setExpYear(int expYear) { this.expYear = expYear; }
}

package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CardInput {

    private String number;
    private int expMonth;
    private int expYear;
    private String cvc;

    public CardInput() {}

    public CardInput(String number, int expMonth, int expYear, String cvc) {
        this.number = number;
        this.expMonth = expMonth;
        this.expYear = expYear;
        this.cvc = cvc;
    }

    public String getNumber() { return number; }
    public void setNumber(String number) { this.number = number; }

    @JsonProperty("exp_month")
    public int getExpMonth() { return expMonth; }
    @JsonProperty("exp_month")
    public void setExpMonth(int expMonth) { this.expMonth = expMonth; }

    @JsonProperty("exp_year")
    public int getExpYear() { return expYear; }
    @JsonProperty("exp_year")
    public void setExpYear(int expYear) { this.expYear = expYear; }

    public String getCvc() { return cvc; }
    public void setCvc(String cvc) { this.cvc = cvc; }
}

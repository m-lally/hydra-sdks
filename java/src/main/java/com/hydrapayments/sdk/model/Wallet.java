package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Wallet {

    private String id;
    private String ownerId;
    private String walletType;
    private String chain;
    private String address;
    private boolean isCustodial;
    private String encryptedPrivateKey;
    private String createdAt;
    private String updatedAt;

    public Wallet() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    @JsonProperty("owner_id")
    public String getOwnerId() { return ownerId; }
    @JsonProperty("owner_id")
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    @JsonProperty("wallet_type")
    public String getWalletType() { return walletType; }
    @JsonProperty("wallet_type")
    public void setWalletType(String walletType) { this.walletType = walletType; }

    public String getChain() { return chain; }
    public void setChain(String chain) { this.chain = chain; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    @JsonProperty("is_custodial")
    public boolean isCustodial() { return isCustodial; }
    @JsonProperty("is_custodial")
    public void setCustodial(boolean custodial) { isCustodial = custodial; }

    @JsonProperty("encrypted_private_key")
    public String getEncryptedPrivateKey() { return encryptedPrivateKey; }
    @JsonProperty("encrypted_private_key")
    public void setEncryptedPrivateKey(String encryptedPrivateKey) { this.encryptedPrivateKey = encryptedPrivateKey; }

    @JsonProperty("created_at")
    public String getCreatedAt() { return createdAt; }
    @JsonProperty("created_at")
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    @JsonProperty("updated_at")
    public String getUpdatedAt() { return updatedAt; }
    @JsonProperty("updated_at")
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}

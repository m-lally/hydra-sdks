/**
 * Hydra Payment Gateway Plugin Frontend JavaScript
 *
 * This file handles the client-side interaction with the Hydra Payment Gateway.
 * It works in conjunction with the Hydra Payment Form library (hydra-pay.min.js)
 * to securely collect payment information and process payments.
 *
 * @package Hydra_Payment_Gateway
 */

/**
 * Wait for the DOM to be fully loaded before initializing.
 */
jQuery(document).ready(function($) {
    'use strict';

    // Check if Hydra Payment Form library is loaded.
    if (typeof HydraPaymentForm === 'undefined') {
        console.error('Hydra Payment Form library not loaded. Please ensure hydra-pay.min.js is enqueued.');
        return;
    }

    // Get the payment form container.
    var $container = $('#hydra-payment-form-container');
    if ($container.length === 0) {
        return; // No payment form on this page.
    }

    // Get form data from container attributes.
    var amount   = $container.data('amount') || '';
    var currency = $container.data('currency') || 'USD';
    var description = $container.data('description') || '';

    // Initialize the Hydra Payment Form.
    var paymentForm = HydraPaymentForm.createForm({
        // Container to mount the form.
        container: '#hydra-payment-form',
        // Public key from WordPress settings.
        publicKey: hydraPaymentSettings.publicKey,
        // Amount to charge (in smallest currency unit, e.g., cents for USD).
        amount: amount ? parseFloat(amount) * 100 : 0,
        // Currency code.
        currency: currency,
        // Description of the payment.
        description: description,
        // Enable test mode if specified.
        testMode: hydraPaymentSettings.testMode,
        // Callback when the form is ready.
        onReady: function() {
            $('#hydra-payment-button').prop('disabled', false);
        },
        // Callback when a payment method is tokenized.
        onTokenize: function(token) {
            // Disable the button to prevent multiple submissions.
            $('#hydra-payment-button').prop('disabled', true).addClass('loading');

            // Send the token to our WordPress backend to create a payment intent.
            $.ajax({
                url: hydraPaymentSettings.restUrl + 'hydra-payment/v1/create-intent',
                method: 'POST',
                data: {
                    token: token,
                    amount: amount,
                    currency: currency,
                    description: description
                },
                success: function(response) {
                    if (response.success) {
                        // Payment intent created successfully, now confirm the payment.
                        return confirmPayment(response.intent_id);
                    } else {
                        showError(response.data.message || 'Unknown error');
                    }
                },
                error: function(xhr) {
                    var message = 'An error occurred while processing your payment.';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }
                    showError(message);
                }
            });
        },
        // Callback when there's an error with the form.
        onError: function(error) {
            showError(error.message || 'An unknown error occurred');
        }
    });

    /**
     * Confirm the payment with the intent ID.
     *
     * @param {string} intentId The payment intent ID from the backend.
     */
    function confirmPayment(intentId) {
        $.ajax({
            url: hydraPaymentSettings.restUrl + 'hydra-payment/v1/confirm-intent',
            method: 'POST',
            data: {
                intent_id: intentId
            },
            success: function(response) {
                if (response.success) {
                    showSuccess('Payment processed successfully!');
                    // Optionally, redirect to a thank you page or reset the form.
                    setTimeout(function() {
                        window.location.href = response.data.redirect_url || window.location.href;
                    }, 1500);
                } else {
                    showError(response.data.message || 'Unknown error');
                }
            },
            error: function(xhr) {
                var message = 'An error occurred while confirming your payment.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    message = xhr.responseJSON.message;
                }
                showError(message);
            }
        });
    }

    /**
     * Display an error message.
     *
     * @param {string} message The error message to display.
     */
    function showError(message) {
        var $error = $('#hydra-payment-error');
        $error.removeClass('success').addClass('error').text(message).show();
        $('#hydra-payment-button').prop('disabled', false).removeClass('loading');
    }

    /**
     * Display a success message.
     *
     * @param {string} message The success message to display.
     */
    function showSuccess(message) {
        var $error = $('#hydra-payment-error');
        $error.removeClass('error').addClass('success').text(message).show();
        $('#hydra-payment-button').prop('disabled', true);
    }

    // Handle button click to trigger the payment form.
    $('#hydra-payment-button').on('click', function() {
        // The form will handle the tokenization internally when the user submits.
        // We just need to ensure the form is ready.
        if (paymentForm && typeof paymentForm.requestPaymentMethod === 'function') {
            paymentForm.requestPaymentMethod();
        }
    });
});

// Expose the REST URL to the frontend.
// This is typically done in the PHP file when enqueuing the script.
// For now, we'll assume it's set via wp_localize_script.
// If not, we can define it here as a fallback.
// Note: In the actual plugin, this is set in the PHP file via:
// wp_localize_script( 'hydra-payment-script', 'hydraPaymentSettings', array( 'restUrl' => rest_url() ) );
if (typeof hydraPaymentSettings === 'undefined') {
    hydraPaymentSettings = {};
}
if (typeof hydraPaymentSettings.restUrl === 'undefined') {
    hydraPaymentSettings.restUrl = '/wp-json/';
}
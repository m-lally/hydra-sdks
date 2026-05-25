<?php
/**
 * Plugin Name: Hydra Payment Gateway
 * Description: Integrates Hydra Payment Gateway with WordPress for secure payment processing.
 * Version: 1.0.0
 * Author: Hydra Payments Team
 * License: MIT
 * Text Domain: hydra-payment
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Main Hydra Payment Gateway Plugin Class.
 */
class Hydra_Payment_Gateway {

	/**
	 * Plugin version.
	 *
	 * @var string
	 */
	const VERSION = '1.0.0';

	/**
	 * Plugin slug.
	 *
	 * @var string
	 */
	const SLUG = 'hydra-payment-gateway';

	/**
	 * Singleton instance.
	 *
	 * @var Hydra_Payment_Gateway|null
	 */
	private static $instance = null;

	/**
	 * Hydra API settings.
	 *
	 * @var array
	 */
	public $settings = array();

	/**
	 * Initialize the plugin.
	 */
	public static function instance() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new self();
			self::$instance->hooks();
		}

		return self::$instance;
	}

	/**
	 * Set up hooks.
	 */
	private function hooks() {
		add_action( 'init', array( $this, 'init' ) );
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( 'admin_init', array( $this, 'admin_init' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_shortcode( 'hydra_payment_form', array( $this, 'payment_form_shortcode' ) );
		add_action( 'rest_api_init', array( $this, 'register_webhook_route' ) );
	}

	/**
	 * Initialize plugin settings.
	 */
	public function init() {
		$this->settings = get_option( 'hydra_payment_settings', array(
			'api_url'          => '',
			'public_key'       => '',
			'secret_key'       => '',
			'webhook_secret'   => '',
			'currency'         => 'USD',
			'payment_method'   => 'card',
			'test_mode'        => 'yes',
		) );
	}

	/**
	 * Add admin menu page.
	 */
	public function admin_menu() {
		add_options_page(
			'Hydra Payment Gateway',
			'Hydra Payments',
			'manage_options',
			self::SLUG,
			array( $this, 'admin_page' )
		);
	}

	/**
	 * Register admin settings.
	 */
	public function admin_init() {
		register_setting(
			'hydra_payment_settings_group',
			'hydra_payment_settings',
			array( $this, 'sanitize_settings' )
		);

		add_settings_section(
			'hydra_payment_main',
			'Main Settings',
			array( $this, 'settings_section_callback' ),
			self::SLUG
		);

		add_settings_field(
			'api_url',
			'API URL',
			array( $this, 'api_url_callback' ),
			self::SLUG,
			'hydra_payment_main'
		);

		add_settings_field(
			'public_key',
			'Public Key',
			array( $this, 'public_key_callback' ),
			self::SLUG,
			'hydra_payment_main'
		);

		add_settings_field(
			'secret_key',
			'Secret Key',
			array( $this, 'secret_key_callback' ),
			self::SLUG,
			'hydra_payment_main'
		);

		add_settings_field(
			'webhook_secret',
			'Webhook Secret',
			array( $this, 'webhook_secret_callback' ),
			self::SLUG,
			'hydra_payment_main'
		);

		add_settings_field(
			'currency',
			'Currency',
			array( $this, 'currency_callback' ),
			self::SLUG,
			'hydra_payment_main'
		);

		add_settings_field(
			'payment_method',
			'Payment Method',
			array( $this, 'payment_method_callback' ),
			self::SLUG,
			'hydra_payment_main'
		);

		add_settings_field(
			'test_mode',
			'Test Mode',
			array( $this, 'test_mode_callback' ),
			self::SLUG,
			'hydra_payment_main'
		);
	}

	/**
	 * Sanitize settings.
	 *
	 * @param array $input Settings array.
	 * @return array
	 */
	public function sanitize_settings( $input ) {
		$sanitized = array();
		$sanitized['api_url']          = esc_url_raw( $input['api_url'] );
		$sanitized['public_key']       = sanitize_text_field( $input['public_key'] );
		$sanitized['secret_key']       = sanitize_text_field( $input['secret_key'] );
		$sanitized['webhook_secret']   = sanitize_text_field( $input['webhook_secret'] );
		$sanitized['currency']         = strtoupper( sanitize_text_field( $input['currency'] ) );
		$sanitized['payment_method']   = sanitize_text_field( $input['payment_method'] );
		$sanitized['test_mode']        = isset( $input['test_mode'] ) && 'yes' === $input['test_mode'] ? 'yes' : 'no';

		return $sanitized;
	}

	/**
	 * Settings section callback.
	 */
	public function settings_section_callback() {
		echo '<p>Configure your Hydra Payment Gateway settings.</p>';
	}

	/**
	 * API URL field callback.
	 */
	public function api_url_callback() {
		$value = isset( $this->settings['api_url'] ) ? $this->settings['api_url'] : '';
		echo '<input type="text" name="hydra_payment_settings[api_url]" value="' . esc_attr( $value ) . '" class="regular-text" placeholder="https://api.hydra.com">';
		echo '<p class="description">Enter your Hydra API URL (e.g., https://api.hydra.com).</p>';
	}

	/**
	 * Public Key field callback.
	 */
	public function public_key_callback() {
		$value = isset( $this->settings['public_key'] ) ? $this->settings['public_key'] : '';
		echo '<input type="text" name="hydra_payment_settings[public_key]" value="' . esc_attr( $value ) . '" class="regular-text">';
		echo '<p class="description">Your Hydra public key.</p>';
	}

	/**
	 * Secret Key field callback.
	 */
	public function secret_key_callback() {
		$value = isset( $this->settings['secret_key'] ) ? $this->settings['secret_key'] : '';
		echo '<input type="text" name="hydra_payment_settings[secret_key]" value="' . esc_attr( $value ) . '" class="regular-text">';
		echo '<p class="description">Your Hydra secret key.</p>';
	}

	/**
	 * Webhook Secret field callback.
	 */
	public function webhook_secret_callback() {
		$value = isset( $this->settings['webhook_secret'] ) ? $this->settings['webhook_secret'] : '';
		echo '<input type="text" name="hydra_payment_settings[webhook_secret]" value="' . esc_attr( $value ) . '" class="regular-text">';
		echo '<p class="description">Your Hydra webhook secret for verifying requests.</p>';
	}

	/**
	 * Currency field callback.
	 */
	public function currency_callback() {
		$value = isset( $this->settings['currency'] ) ? $this->settings['currency'] : 'USD';
		echo '<input type="text" name="hydra_payment_settings[currency]" value="' . esc_attr( $value ) . '" class="small-text" maxlength="3">';
		echo '<p class="description">Currency code (e.g., USD, EUR, GBP).</p>';
	}

	/**
	 * Payment method field callback.
	 */
	public function payment_method_callback() {
		$value = isset( $this->settings['payment_method'] ) ? $this->settings['payment_method'] : 'card';
		$methods = array(
			'card'   => 'Credit/Debit Card',
			'wallet' => 'Hydra Wallet',
			'bank'   => 'Bank Transfer',
		);
		echo '<select name="hydra_payment_settings[payment_method]">';
		foreach ( $methods as $key => $label ) {
			echo '<option value="' . esc_attr( $key ) . '" ' . selected( $value, $key, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
		echo '<p class="description">Default payment method.</p>';
	}

	/**
	 * Test mode field callback.
	 */
	public function test_mode_callback() {
		$value = isset( $this->settings['test_mode'] ) ? $this->settings['test_mode'] : 'yes';
		echo '<input type="checkbox" name="hydra_payment_settings[test_mode]" value="yes" ' . checked( $value, 'yes', false ) . '>';
		echo '<p class="description">Enable test mode (uses Hydra test environment).</p>';
	}

	/**
	 * Admin page display.
	 */
	public function admin_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		if ( isset( $_GET['settings-updated'] ) ) {
			add_settings_error( 'hydra_payment_messages', 'hydra_payment_message', __( 'Settings saved.', 'hydra-payment' ), 'updated' );
		}

		settings_errors( 'hydra_payment_messages' );
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form action="options.php" method="post">
				<?php
				settings_fields( 'hydra_payment_settings_group' );
				do_settings_sections( self::SLUG );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	/**
	 * Enqueue plugin assets.
	 */
	public function enqueue_assets() {
		// Only enqueue on pages with the payment form shortcode.
		if ( ! is_a( $GLOBALS['wp_query'], 'WP_Query' ) ) {
			return;
		}

		if ( ! has_shortcode( $GLOBALS['wp_query']->get( 'queried_object' )->post_content, 'hydra_payment_form' ) ) {
			// Also check in widgets and other places if needed.
			// For simplicity, we'll enqueue on every page. In production, you might want to be more selective.
		}

		// Enqueue our stylesheet.
		wp_enqueue_style(
			self::SLUG . '-style',
			plugins_url( 'assets/css/style.css', __FILE__ ),
			array(),
			self::VERSION
		);

		// Enqueue our frontend script.
		wp_enqueue_script(
			self::SLUG . '-script',
			plugins_url( 'assets/js/frontend.js', __FILE__ ),
			array( 'jquery' ),
			self::VERSION,
			true
		);

		// Pass settings to the script.
		wp_localize_script(
			self::SLUG . '-script',
			'hydraPaymentSettings',
			array(
				'publicKey' => isset( $this->settings['public_key'] ) ? $this->settings['public_key'] : '',
				'apiUrl'    => isset( $this->settings['api_url'] ) ? $this->settings['api_url'] : '',
				'currency'  => isset( $this->settings['currency'] ) ? $this->settings['currency'] : 'USD',
				'testMode'  => isset( $this->settings['test_mode'] ) && 'yes' === $this->settings['test_mode'],
				'restUrl'   => esc_url_raw( rest_url() ),
			)
		);
	}

	/**
	 * Payment form shortcode.
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string
	 */
	public function payment_form_shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'amount'   => '',
				'currency' => '',
				'description' => '',
			),
			$atts,
			'hydra_payment_form'
		);

		// Use shortcode attributes or fallback to settings.
		$amount   = ! empty( $atts['amount'] )   ? $atts['amount']   : '';
		$currency = ! empty( $atts['currency'] ) ? $atts['currency'] : ( ! empty( $this->settings['currency'] ) ? $this->settings['currency'] : 'USD' );
		$description = ! empty( $atts['description'] ) ? $atts['description'] : '';

		ob_start();
		?>
		<div id="hydra-payment-form-container" data-amount="<?php echo esc_attr( $amount ); ?>" data-currency="<?php echo esc_attr( $currency ); ?>" data-description="<?php echo esc_attr( $description ); ?>">
			<div id="hydra-payment-form"></div>
			<div id="hydra-payment-error" class="hydra-payment-error"></div>
			<button id="hydra-payment-button" type="button">Pay Now</button>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * Register webhook route.
	 */
	public function register_webhook_route() {
		register_rest_route(
			self::SLUG . '/v1',
			'/webhook',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'webhook_callback' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'data' => array(
						'required' => true,
					),
				),
			)
		);
		
		// Register payment intent endpoints.
		register_rest_route(
			self::SLUG . '/v1',
			'/create-intent',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'create_intent_callback' ),
				'permission_callback' => array( $this, 'rest_permission_check' ),
				'args'                => array(
					'token'       => array(
						'required' => true,
					),
					'amount'      => array(
						'required' => true,
						'sanitize_callback' => 'absint',
					),
					'currency'    => array(
						'required' => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'description' => array(
						'required' => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
		
		register_rest_route(
			self::SLUG . '/v1',
			'/confirm-intent',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'confirm_intent_callback' ),
				'permission_callback' => array( $this, 'rest_permission_check' ),
				'args'                => array(
					'intent_id' => array(
						'required' => true,
					),
				),
			)
		);
	}

	/**
	 * Webhook callback.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function webhook_callback( $request ) {
		// Verify webhook signature if secret is set.
		if ( ! empty( $this->settings['webhook_secret'] ) ) {
			$signature = $request->get_header( 'X-Hydra-Signature' );
			if ( empty( $signature ) ) {
				return new WP_Error( 'invalid_signature', 'Missing signature header', array( 'status' => 400 ) );
			}

			// In a real implementation, you would verify the signature here.
			// For now, we'll just log it.
			error_log( 'Hydra webhook received with signature: ' . $signature );
		}

		$data = $request->get_json_params();

		// Process the webhook data (e.g., update order status).
		// This is a placeholder - you would implement your logic here.
		error_log( 'Hydra webhook data: ' . print_r( $data, true ) );

		// Return success response.
		return new WP_REST_Response( array( 'status' => 'success' ), 200 );
	}

	/**
	 * Get Hydra API URL based on test mode.
	 *
	 * @return string
	 */
	public function get_api_url() {
		if ( ! empty( $this->settings['api_url'] ) ) {
			return $this->settings['api_url'];
		}

		// Default URLs.
		if ( ! empty( $this->settings['test_mode'] ) && 'yes' === $this->settings['test_mode'] ) {
			return 'https://api-test.hydra.com';
		}

		return 'https://api.hydra.com';
	}

	/**
	 * Check if the current user has permission to access the REST API endpoints.
	 *
	 * @return bool
	 */
	public function rest_permission_check() {
		// For simplicity, we're allowing anyone to access these endpoints.
		// In a production environment, you might want to check for specific capabilities
		// or implement additional security measures like nonces.
		return true;
	}

	/**
	 * Create a payment intent with Hydra via REST API.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_intent_callback( $request ) {
		$token   = $request->get_param( 'token' );
		$amount  = $request->get_param( 'amount' );
		$currency = $request->get_param( 'currency' ) ?: ( ! empty( $this->settings['currency'] ) ? $this->settings['currency'] : 'USD' );
		$description = $request->get_param( 'description' ) ?: '';

		if ( empty( $token ) ) {
			return new WP_Error( 'missing_token', 'Payment token is required', array( 'status' => 400 ) );
		}

		if ( empty( $amount ) || ! is_numeric( $amount ) || $amount <= 0 ) {
			return new WP_Error( 'invalid_amount', 'Valid amount is required', array( 'status' => 400 ) );
		}

		// Convert amount to cents (assuming amount is in dollars).
		$amount_in_cents = $amount * 100;

		$api_url = $this->get_api_url() . '/v1/payment_intents';

		$args = array(
			'body'     => wp_json_encode( array(
				'amount'       => $amount_in_cents,
				'currency'     => $currency,
				'description'  => $description,
				'payment_method' => $this->settings['payment_method'],
				'source'       => $token, // Assuming token is a payment source ID
			) ),
			'headers'  => array(
				'Content-Type'  => 'application/json',
				'Authorization' => 'Bearer ' . $this->settings['secret_key'],
			),
			'data_format' => 'body',
		);

		$response = wp_remote_post( $api_url, $args );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'api_error', 'Connection error: ' . $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $code && 201 !== $code ) {
			return new WP_Error( 'api_error', 'API error: ' . wp_remote_retrieve_response_message( $response ) );
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return new WP_Error( 'api_error', 'Invalid JSON response from API' );
		}

		return new WP_REST_Response( array(
			'success' => true,
			'data'    => array(
				'intent_id' => isset( $data['id'] ) ? $data['id'] : '',
			)
		), 200 );
	}

	/**
	 * Confirm a payment intent with Hydra via REST API.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function confirm_intent_callback( $request ) {
		$intent_id = $request->get_param( 'intent_id' );

		if ( empty( $intent_id ) ) {
			return new WP_Error( 'missing_intent_id', 'Payment intent ID is required', array( 'status' => 400 ) );
		}

		$api_url = $this->get_api_url() . '/v1/payment_intents/' . esc_attr( $intent_id ) . '/confirm';

		$args = array(
			'body'     => wp_json_encode( array() ),
			'headers'  => array(
				'Content-Type'  => 'application/json',
				'Authorization' => 'Bearer ' . $this->settings['secret_key'],
			),
			'data_format' => 'body',
		);

		$response = wp_remote_post( $api_url, $args );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'api_error', 'Connection error: ' . $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $code ) {
			return new WP_Error( 'api_error', 'API error: ' . wp_remote_retrieve_response_message( $response ) );
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return new WP_Error( 'api_error', 'Invalid JSON response from API' );
		}

		// Check if the payment was successful.
		if ( isset( $data['status'] ) && 'succeeded' === $data['status'] ) {
			// Payment successful, you might want to update order status, send email, etc.
			// For now, we'll just return success.
			
			return new WP_REST_Response( array(
				'success' => true,
				'data'    => array(
					'redirect_url' => isset( $data['redirect_url'] ) ? $data['redirect_url'] : home_url( '/thank-you/' ),
					'payment_id'   => isset( $data['id'] ) ? $data['id'] : '',
				)
			), 200 );
		} else {
			// Payment failed or requires action.
			return new WP_Error( 'payment_failed', 'Payment was not successful', array( 'status' => 402 ) );
		}
	}

	/**
	 * Create a payment intent with Hydra.
	 *
	 * @param float $amount Amount to charge.
	 * @param string $currency Currency code.
	 * @param string $description Payment description.
	 * @return array|WP_Error
	 */
	public function create_payment_intent( $amount, $currency, $description = '' ) {
		$api_url = $this->get_api_url() . '/v1/payment_intents';

		$args = array(
			'body'     => wp_json_encode( array(
				'amount'       => $amount,
				'currency'     => $currency,
				'description'  => $description,
				'payment_method' => $this->settings['payment_method'],
			) ),
			'headers'  => array(
				'Content-Type'  => 'application/json',
				'Authorization' => 'Bearer ' . $this->settings['secret_key'],
			),
			'data_format' => 'body',
		);

		$response = wp_remote_post( $api_url, $args );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'api_error', 'Connection error: ' . $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $code ) {
			return new WP_Error( 'api_error', 'API error: ' . wp_remote_retrieve_response_message( $response ) );
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return new WP_Error( 'api_error', 'Invalid JSON response from API' );
		}

		return $data;
	}
}

// Initialize the plugin.
function hydra_payment_gateway_init() {
	return Hydra_Payment_Gateway::instance();
}
hydra_payment_gateway_init();
<?php
/**
 * UTM Keeper plugin bootstrap.
 *
 * @package UTMKeeperFlow
 */

/**
 * Plugin Name: UTM Keeper
 * Description: Preserve campaign parameters and pass them to selected conversion links.
 * Version: 0.1.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: UTM Keeper
 * License: GPL-2.0-or-later
 * Text Domain: utmkeeperflow
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Plugin version used for the frontend asset. */
define( 'UTMKEEPERFLOW_VERSION', '0.1.0' );

/** Public configuration schema version, independent of the plugin version. */
define( 'UTMKEEPERFLOW_CONFIG_VERSION', 1 );

/** Name of the administrator settings option. */
define( 'UTMKEEPERFLOW_SETTINGS_OPTION', 'utmkeeperflow_settings' );

/**
 * Return settings used when the option has not been saved.
 *
 * @return array<string, mixed> Default settings.
 */
function utmkeeperflow_default_settings() {
	return array(
		'enabled'        => '0',
		'parameters'     => array( 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content' ),
		'domains'        => array(),
		'retention_days' => 30,
	);
}

/**
 * Return the fixed list of supported campaign keys.
 *
 * @return string[] Supported keys.
 */
function utmkeeperflow_supported_parameters() {
	return array( 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid' );
}

/**
 * Normalize a DNS hostname (not a URL, IP address, port, or wildcard).
 *
 * @param mixed $value Submitted hostname.
 * @return string Empty string for an invalid hostname.
 */
function utmkeeperflow_normalize_hostname( $value ) {
	if ( ! is_string( $value ) ) {
		return '';
	}

	$hostname = strtolower( trim( $value ) );
	if ( '.' === substr( $hostname, -1 ) ) {
		$hostname = substr( $hostname, 0, -1 );
	}
	if ( strlen( $hostname ) > 253 || ! preg_match( '/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/D', $hostname ) ) {
		return '';
	}

	$labels = explode( '.', $hostname );
	foreach ( $labels as $label ) {
		if ( strlen( $label ) > 63 || '-' === $label[0] || '-' === substr( $label, -1 ) ) {
			return '';
		}
	}

	// Numeric IP-like names are not destination DNS hostnames.
	if ( ctype_digit( end( $labels ) ) ) {
		return '';
	}

	return $hostname;
}

/**
 * Normalize both submitted and stored options. Unknown fields never become public.
 *
 * @param mixed $input         Option value.
 * @param bool  $report_errors Whether to show validation feedback on the settings page.
 * @return array<string, mixed> Canonical settings.
 */
function utmkeeperflow_normalize_settings( $input, $report_errors = false ) {
	$defaults = utmkeeperflow_default_settings();
	if ( ! is_array( $input ) ) {
		return $defaults;
	}

	$settings = array(
		'enabled'        => isset( $input['enabled'] ) && '1' === $input['enabled'] ? '1' : '0',
		'parameters'     => array(),
		'domains'        => array(),
		'retention_days' => $defaults['retention_days'],
	);

	$invalid_parameters = false;
	if ( isset( $input['parameters'] ) && ! is_array( $input['parameters'] ) ) {
		$invalid_parameters = true;
	} else {
		foreach ( $input['parameters'] ?? array() as $parameter ) {
			if ( ! is_string( $parameter ) || ! in_array( $parameter, utmkeeperflow_supported_parameters(), true ) ) {
				$invalid_parameters = true;
				continue;
			}
			$settings['parameters'][ $parameter ] = $parameter;
		}
		$settings['parameters'] = array_values( $settings['parameters'] );
	}

	if ( $report_errors && $invalid_parameters ) {
		add_settings_error( UTMKEEPERFLOW_SETTINGS_OPTION, 'invalid_parameters', __( 'Unsupported campaign parameters were ignored.', 'utmkeeperflow' ) );
	}

	$invalid_domains = false;
	$domains         = $input['domains'] ?? array();
	if ( is_string( $domains ) ) {
		$domains = preg_split( '/\r\n|\r|\n/', $domains );
	}
	if ( ! is_array( $domains ) ) {
		$invalid_domains = true;
		$domains         = array();
	}
	foreach ( $domains as $domain ) {
		if ( is_string( $domain ) && '' === trim( $domain ) ) {
			continue;
		}
		$hostname = utmkeeperflow_normalize_hostname( $domain );
		if ( '' === $hostname ) {
			$invalid_domains = true;
			continue;
		}
		$settings['domains'][ $hostname ] = $hostname;
	}
	$settings['domains'] = array_values( $settings['domains'] );

	if ( $report_errors && $invalid_domains ) {
		add_settings_error( UTMKEEPERFLOW_SETTINGS_OPTION, 'invalid_domains', __( 'Invalid destination hostnames were ignored. Enter one DNS hostname per line, without a scheme, path, port, or wildcard.', 'utmkeeperflow' ) );
	}

	$retention = $input['retention_days'] ?? null;
	if ( is_string( $retention ) || is_int( $retention ) ) {
		$retention = (string) $retention;
		if ( preg_match( '/^[0-9]+$/D', $retention ) ) {
			$settings['retention_days'] = max( 1, min( 90, (int) $retention ) );
		} elseif ( $report_errors ) {
			add_settings_error( UTMKEEPERFLOW_SETTINGS_OPTION, 'invalid_retention', __( 'Retention must be a whole number from 1 to 90 days; the default was used.', 'utmkeeperflow' ) );
		}
	} elseif ( $report_errors ) {
		add_settings_error( UTMKEEPERFLOW_SETTINGS_OPTION, 'invalid_retention', __( 'Retention must be a whole number from 1 to 90 days; the default was used.', 'utmkeeperflow' ) );
	}

	return $settings;
}

/**
 * Sanitize values submitted through the WordPress Settings API.
 *
 * @param mixed $input Submitted option.
 * @return array<string, mixed> Canonical settings.
 */
function utmkeeperflow_sanitize_settings( $input ) {
	return utmkeeperflow_normalize_settings( $input, true );
}

/**
 * Read canonical settings; an absent option is always disabled.
 *
 * @return array<string, mixed> Canonical settings.
 */
function utmkeeperflow_get_settings() {
	return utmkeeperflow_normalize_settings( get_option( UTMKEEPERFLOW_SETTINGS_OPTION, utmkeeperflow_default_settings() ) );
}

/**
 * Return only validated public settings, never the complete stored option.
 *
 * @param array<string, mixed>|null $settings Already normalized settings, if available.
 * @return array<string, int|array<string>> Frontend configuration.
 */
function utmkeeperflow_get_public_config( $settings = null ) {
	$settings = utmkeeperflow_normalize_settings( null === $settings ? utmkeeperflow_get_settings() : $settings );
	return array(
		'version'       => UTMKEEPERFLOW_CONFIG_VERSION,
		'parameters'    => $settings['parameters'],
		'domains'       => $settings['domains'],
		'retentionDays' => $settings['retention_days'],
	);
}

/**
 * Register settings and accessible controls with the WordPress Settings API.
 *
 * @return void
 */
function utmkeeperflow_register_settings() {
	register_setting(
		'utmkeeperflow',
		UTMKEEPERFLOW_SETTINGS_OPTION,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'utmkeeperflow_sanitize_settings',
			'default'           => utmkeeperflow_default_settings(),
		)
	);

	add_settings_section( 'utmkeeperflow_main', '', '__return_false', 'utmkeeperflow' );
	add_settings_field( 'utmkeeperflow_enabled', __( 'Enable UTM Keeper', 'utmkeeperflow' ), 'utmkeeperflow_field_enabled', 'utmkeeperflow', 'utmkeeperflow_main' );
	add_settings_field( 'utmkeeperflow_parameters', __( 'Campaign parameters', 'utmkeeperflow' ), 'utmkeeperflow_field_parameters', 'utmkeeperflow', 'utmkeeperflow_main' );
	add_settings_field( 'utmkeeperflow_domains', __( 'Destination hostnames', 'utmkeeperflow' ), 'utmkeeperflow_field_domains', 'utmkeeperflow', 'utmkeeperflow_main', array( 'label_for' => 'utmkeeperflow_domains' ) );
	add_settings_field( 'utmkeeperflow_retention', __( 'Retention (days)', 'utmkeeperflow' ), 'utmkeeperflow_field_retention', 'utmkeeperflow', 'utmkeeperflow_main', array( 'label_for' => 'utmkeeperflow_retention' ) );
}
add_action( 'admin_init', 'utmkeeperflow_register_settings' );

/**
 * Add the administrator-only settings page.
 *
 * @return void
 */
function utmkeeperflow_add_settings_page() {
	add_options_page( __( 'UTM Keeper', 'utmkeeperflow' ), __( 'UTM Keeper', 'utmkeeperflow' ), 'manage_options', 'utmkeeperflow', 'utmkeeperflow_render_settings_page' );
}
add_action( 'admin_menu', 'utmkeeperflow_add_settings_page' );

/**
 * Render the settings form. options.php validates the nonce and capability on save.
 *
 * @return void
 */
function utmkeeperflow_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'UTM Keeper', 'utmkeeperflow' ); ?></h1>
		<?php settings_errors(); ?>
		<form action="options.php" method="post">
			<?php
			settings_fields( 'utmkeeperflow' );
			do_settings_sections( 'utmkeeperflow' );
			submit_button();
			?>
		</form>
	</div>
	<?php
}

/**
 * Render the opt-in enable checkbox.
 *
 * @return void
 */
function utmkeeperflow_field_enabled() {
	$settings = utmkeeperflow_get_settings();
	?>
	<label for="utmkeeperflow_enabled">
		<input id="utmkeeperflow_enabled" type="checkbox" name="<?php echo esc_attr( UTMKEEPERFLOW_SETTINGS_OPTION ); ?>[enabled]" value="1" <?php checked( '1', $settings['enabled'] ); ?> />
		<?php esc_html_e( 'Capture configured campaign parameters in this browser. Link forwarding is not implemented yet.', 'utmkeeperflow' ); ?>
	</label>
	<?php
}

/**
 * Render the supported parameter checkboxes.
 *
 * @return void
 */
function utmkeeperflow_field_parameters() {
	$settings = utmkeeperflow_get_settings();
	foreach ( utmkeeperflow_supported_parameters() as $parameter ) {
		?>
		<label>
			<input type="checkbox" name="<?php echo esc_attr( UTMKEEPERFLOW_SETTINGS_OPTION ); ?>[parameters][]" value="<?php echo esc_attr( $parameter ); ?>" <?php checked( in_array( $parameter, $settings['parameters'], true ) ); ?> />
			<?php echo esc_html( $parameter ); ?>
		</label><br />
		<?php
	}
	?>
	<p class="description"><?php esc_html_e( 'Only these fixed keys are supported. Click IDs (gclid and fbclid) are opt-in.', 'utmkeeperflow' ); ?></p>
	<?php
}

/**
 * Render one exact DNS hostname per line.
 *
 * @return void
 */
function utmkeeperflow_field_domains() {
	$settings = utmkeeperflow_get_settings();
	?>
	<textarea id="utmkeeperflow_domains" name="<?php echo esc_attr( UTMKEEPERFLOW_SETTINGS_OPTION ); ?>[domains]" rows="5" cols="48" aria-describedby="utmkeeperflow_domains_help"><?php echo esc_textarea( implode( "\n", $settings['domains'] ) ); ?></textarea>
	<p class="description" id="utmkeeperflow_domains_help"><?php esc_html_e( 'One exact DNS hostname per line (for example, bookings.example.com). No URLs, ports, wildcards, IP addresses, or subdomain matching. Empty by default.', 'utmkeeperflow' ); ?></p>
	<?php
}

/**
 * Render the retention setting.
 *
 * @return void
 */
function utmkeeperflow_field_retention() {
	$settings = utmkeeperflow_get_settings();
	?>
	<input id="utmkeeperflow_retention" name="<?php echo esc_attr( UTMKEEPERFLOW_SETTINGS_OPTION ); ?>[retention_days]" type="number" min="1" max="90" step="1" value="<?php echo esc_attr( $settings['retention_days'] ); ?>" />
	<p class="description"><?php esc_html_e( 'From 1 to 90 days; default 30. Browser-local campaign data expires this many days after capture.', 'utmkeeperflow' ); ?></p>
	<?php
}

/**
 * Enqueue browser-local campaign capture only when explicitly enabled.
 *
 * @return void
 */
function utmkeeperflow_enqueue_frontend() {
	$settings = utmkeeperflow_get_settings();

	if ( '1' !== $settings['enabled'] ) {
		return;
	}

	$handle = 'utmkeeperflow';
	wp_register_script(
		$handle,
		plugins_url( 'assets/js/utm-keeper.js', __FILE__ ),
		array(),
		UTMKEEPERFLOW_VERSION,
		true
	);

	$config_json = wp_json_encode( utmkeeperflow_get_public_config( $settings ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT );
	if ( false === $config_json || ! wp_add_inline_script( $handle, 'window.utmKeeperFlowConfig = ' . $config_json . ';', 'before' ) ) {
		return;
	}

	wp_enqueue_script( $handle );
}
add_action( 'wp_enqueue_scripts', 'utmkeeperflow_enqueue_frontend' );

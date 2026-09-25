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

/** Option name reserved for the upcoming Settings API implementation. */
define( 'UTMKEEPERFLOW_SETTINGS_OPTION', 'utmkeeperflow_settings' );

/**
 * Return the public configuration defaults until validated settings are available.
 *
 * The Settings API implementation will replace these fixed values with sanitized
 * public settings; never expose the complete stored options array to visitors.
 *
 * @return array<string, int|array<string>> Frontend configuration.
 */
function utmkeeperflow_get_public_config() {
	return array(
		'version'       => UTMKEEPERFLOW_CONFIG_VERSION,
		'parameters'    => array( 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content' ),
		'domains'       => array(),
		'retentionDays' => 30,
	);
}

/**
 * Enqueue the inert frontend scaffold only when explicitly enabled.
 *
 * @return void
 */
function utmkeeperflow_enqueue_frontend() {
	$options = get_option( UTMKEEPERFLOW_SETTINGS_OPTION, array() );

	if ( ! is_array( $options ) || ! isset( $options['enabled'] ) || '1' !== $options['enabled'] ) {
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

	$config_json = wp_json_encode( utmkeeperflow_get_public_config(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT );
	if ( false === $config_json || ! wp_add_inline_script( $handle, 'window.utmKeeperFlowConfig = ' . $config_json . ';', 'before' ) ) {
		return;
	}

	wp_enqueue_script( $handle );
}
add_action( 'wp_enqueue_scripts', 'utmkeeperflow_enqueue_frontend' );

<?php
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

/**
 * Load the browser script only after an administrator has enabled the plugin.
 *
 * Settings, capture, and forwarding will be added in the linked MVP issues.
 */
function utmkeeperflow_enqueue_frontend() {
	$options = get_option( 'utmkeeperflow_settings', array() );

	if ( ! is_array( $options ) || empty( $options['enabled'] ) ) {
		return;
	}

	$handle = 'utmkeeperflow';
	wp_register_script(
		$handle,
		plugins_url( 'assets/js/utm-keeper.js', __FILE__ ),
		array(),
		'0.1.0',
		true
	);

	// Only fixed defaults are exposed until the settings validation is implemented.
	$config = array(
		'parameters'    => array( 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content' ),
		'domains'       => array(),
		'retentionDays' => 30,
	);

	wp_add_inline_script(
		$handle,
		'window.utmKeeperFlowConfig = ' . wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ) . ';',
		'before'
	);
	wp_enqueue_script( $handle );
}
add_action( 'wp_enqueue_scripts', 'utmkeeperflow_enqueue_frontend' );

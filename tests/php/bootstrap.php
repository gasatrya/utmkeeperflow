<?php
/**
 * Dependency-free bootstrap contract checks with minimal WordPress shims.
 *
 * Run with php tests/php/bootstrap.php; this is not a substitute for a WordPress smoke test.
 */

define( 'ABSPATH', __DIR__ . '/' );

$options = array();
$calls   = array();

function add_action( $hook, $callback ) {
	global $calls;
	$calls['hook'] = array( $hook, $callback );
}

function get_option( $name, $default ) {
	global $options;
	if ( 'utmkeeperflow_settings' !== $name ) {
		throw new RuntimeException( 'Unexpected option name' );
	}
	return $options ?? $default;
}

function plugins_url( $path, $file ) {
	return '/plugins/utmkeeperflow/' . $path;
}

function wp_register_script( ...$args ) {
	global $calls;
	$calls['register'] = $args;
}

function wp_json_encode( $value, $flags ) {
	return json_encode( $value, $flags );
}

function wp_add_inline_script( ...$args ) {
	global $calls;
	$calls['inline'] = $args;
	return true;
}

function wp_enqueue_script( $handle ) {
	global $calls;
	$calls['enqueue'] = $handle;
}

function check( $condition, $message ) {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

require dirname( __DIR__, 2 ) . '/utmkeeperflow.php';

check( array( 'wp_enqueue_scripts', 'utmkeeperflow_enqueue_frontend' ) === $calls['hook'], 'Frontend hook missing' );

foreach ( array( array(), 'invalid', array( 'enabled' => '0' ), array( 'enabled' => true ) ) as $options ) {
	$calls = array();
	utmkeeperflow_enqueue_frontend();
	check( array() === $calls, 'Disabled or malformed settings must not enqueue a script' );
}

$options = array(
	'enabled'   => '1',
	'private'   => '<not public>',
	'parameters' => array( 'unvalidated_key' ),
);
$calls   = array();
utmkeeperflow_enqueue_frontend();

check( 'utmkeeperflow' === $calls['enqueue'], 'Frontend script not enqueued' );
check( 'utmkeeperflow' === $calls['register'][0], 'Wrong script handle' );
check( '/plugins/utmkeeperflow/assets/js/utm-keeper.js' === $calls['register'][1], 'Wrong script URL' );
check( UTMKEEPERFLOW_VERSION === $calls['register'][3], 'Asset version mismatch' );
check( true === $calls['register'][4], 'Script should load in footer' );
check( 'before' === $calls['inline'][2], 'Configuration must precede the asset' );
check( 1 === preg_match( '/^window\.utmKeeperFlowConfig = (\{.*\});$/', $calls['inline'][1], $match ), 'Wrong config assignment' );

$config = json_decode( $match[1], true );
check( utmkeeperflow_get_public_config() === $config, 'Public configuration differs from defaults' );
check( UTMKEEPERFLOW_CONFIG_VERSION === $config['version'], 'Config schema version mismatch' );
check( array() === $config['domains'], 'No destination domains should be enabled by default' );
check( false === strpos( $calls['inline'][1], 'not public' ), 'Private options leaked' );
check( false === strpos( $calls['inline'][1], 'unvalidated_key' ), 'Unvalidated options leaked' );

echo "PHP bootstrap checks passed.\n";

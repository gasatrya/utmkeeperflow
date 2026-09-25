<?php
/**
 * Dependency-free settings/bootstrap contract checks with minimal WordPress shims.
 *
 * Run with php tests/php/bootstrap.php; this is not a substitute for a WordPress smoke test.
 */

define( 'ABSPATH', __DIR__ . '/' );

$options            = null;
$calls              = array();
$can_admin          = true;
$translated_texts   = array();
$inject_translation = false;

function add_action( $hook, $callback ) {
	global $calls;
	$calls['hooks'][ $hook ] = $callback;
}

function get_option( $name, $default ) {
	global $options;
	check( 'utmkeeperflow_settings' === $name, 'Unexpected option name' );
	return null === $options ? $default : $options;
}

function register_setting( ...$args ) {
	global $calls;
	$calls['setting'] = $args;
}

function add_settings_section( ...$args ) {
	global $calls;
	$calls['section'] = $args;
}

function add_settings_field( ...$args ) {
	global $calls;
	$calls['fields'][] = $args;
}

function add_options_page( ...$args ) {
	global $calls;
	$calls['page'] = $args;
}

function add_settings_error( ...$args ) {
	global $calls;
	$calls['errors'][] = $args;
}

function __( $text, $domain ) {
	global $translated_texts, $inject_translation;
	check( 'utmkeeperflow' === $domain, 'Wrong text domain' );
	$translated_texts[] = $text;
	if ( $inject_translation && 0 === strpos( $text, 'Campaign values may contain personal data' ) ) {
		return '<script>alert("translation")</script>';
	}
	if ( $inject_translation && 0 === strpos( $text, 'UTM Keeper attribution was cleared' ) ) {
		return '" onfocus="alert(1)';
	}
	return $text;
}

function esc_html__( $text, $domain ) {
	return esc_html( __( $text, $domain ) );
}

function esc_html_e( $text, $domain ) {
	echo esc_html__( $text, $domain );
}

function esc_html( $value ) {
	return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
}

function esc_attr( $value ) {
	return esc_html( $value );
}

function esc_textarea( $value ) {
	return esc_html( $value );
}

function checked( $expected, $actual = true ) {
	if ( $expected === $actual ) {
		echo 'checked="checked"';
	}
}

function current_user_can( $capability ) {
	global $can_admin;
	check( 'manage_options' === $capability, 'Wrong capability' );
	return $can_admin;
}

function settings_fields( $group ) {
	global $calls;
	$calls['nonce_group'] = $group;
	echo '<input type="hidden" name="_wpnonce" value="test-nonce" />';
}

function do_settings_sections( $page ) {
	global $calls;
	$calls['render_sections'] = $page;
}

function submit_button() {
	echo '<button type="submit">Save</button>';
}

function settings_errors() {
	global $calls;
	$calls['display_errors'] = true;
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

function wp_enqueue_script( $handle, ...$args ) {
	global $calls;
	$calls['enqueue']      = $handle;
	$calls['enqueue_args'] = $args;
}

function check( $condition, $message ) {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

require dirname( __DIR__, 2 ) . '/utmkeeperflow.php';

check( 'utmkeeperflow_enqueue_frontend' === $calls['hooks']['wp_enqueue_scripts'], 'Frontend hook missing' );
check( 'utmkeeperflow_register_settings' === $calls['hooks']['admin_init'], 'Settings hook missing' );
check( 'utmkeeperflow_add_settings_page' === $calls['hooks']['admin_menu'], 'Admin menu hook missing' );

utmkeeperflow_register_settings();
check( 'utmkeeperflow' === $calls['setting'][0], 'Wrong settings group' );
check( UTMKEEPERFLOW_SETTINGS_OPTION === $calls['setting'][1], 'Wrong registered option' );
check( 'utmkeeperflow_sanitize_settings' === $calls['setting'][2]['sanitize_callback'], 'Sanitizer not registered' );
check( utmkeeperflow_default_settings() === $calls['setting'][2]['default'], 'Wrong registered defaults' );
check( array( 'utmkeeperflow_enabled', 'utmkeeperflow_parameters', 'utmkeeperflow_domains', 'utmkeeperflow_retention' ) === array_column( $calls['fields'], 0 ), 'Missing settings controls' );
utmkeeperflow_add_settings_page();
check( 'manage_options' === $calls['page'][2], 'Settings page is not restricted' );
check( 'utmkeeperflow_render_settings_page' === $calls['page'][4], 'Wrong page renderer' );
check( 'utmkeeperflow_enqueue_admin_reset' === $calls['hooks']['admin_enqueue_scripts'], 'Admin reset hook missing' );
$calls['enqueue'] = null;
utmkeeperflow_enqueue_admin_reset( 'dashboard' );
check( null === $calls['enqueue'], 'Admin reset script must not load on unrelated pages' );
$can_admin = false;
utmkeeperflow_enqueue_admin_reset( 'settings_page_utmkeeperflow' );
check( null === $calls['enqueue'], 'Admin reset script must require manage_options' );
$can_admin = true;
utmkeeperflow_enqueue_admin_reset( 'settings_page_utmkeeperflow' );
check( 'utmkeeperflow-admin-reset' === $calls['enqueue'], 'Reset script must load on settings page even while disabled' );
check( array( '/plugins/utmkeeperflow/assets/js/admin-reset.js', array(), UTMKEEPERFLOW_VERSION, true ) === $calls['enqueue_args'], 'Reset script must be dependency-free and footer-loaded from the plugin' );

$defaults = utmkeeperflow_default_settings();
check( '0' === $defaults['enabled'], 'Plugin must default to disabled' );
check( array( 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content' ) === $defaults['parameters'], 'Wrong parameter defaults' );
check( array() === $defaults['domains'] && 30 === $defaults['retention_days'], 'Wrong destination/retention defaults' );
check( $defaults === utmkeeperflow_get_settings(), 'Unset option must use defaults' );
ob_start();
utmkeeperflow_field_parameters();
$default_controls = ob_get_clean();
check( 5 === substr_count( $default_controls, 'checked="checked"' ), 'Only the five UTM parameters should start selected' );

$input = array(
	'enabled'        => '1',
	'parameters'     => array( 'fbclid', 'utm_source', 'fbclid', 'arbitrary', '<script>', array( 'gclid' ) ),
	'domains'        => " Example.COM.\r\ncheckout.example.org\nexample.com\nhttps://bad.example\n*.example.org\nexample.org:443\nexample.org/path\nuser@example.org\n127.0.0.1\nexample..com\n-bad.example\na_.example\nexample.com..\n",
	'retention_days' => '91',
	'private'        => '<not public>',
);
$calls['errors'] = array();
$clean = utmkeeperflow_sanitize_settings( $input );
check( '1' === $clean['enabled'], 'Explicit opt-in must enable' );
check( array( 'fbclid', 'utm_source' ) === $clean['parameters'], 'Unsupported or duplicate keys not removed' );
check( array( 'example.com', 'checkout.example.org' ) === $clean['domains'], 'Invalid, duplicate, or noncanonical hostnames accepted' );
check( 90 === $clean['retention_days'], 'High retention must clamp to 90' );
check( 4 === count( $clean ), 'Unexpected option keys persisted' );
check( 2 === count( $calls['errors'] ), 'Invalid keys and hostnames should report validation errors' );
check( 1 === utmkeeperflow_sanitize_settings( array( 'retention_days' => '0' ) )['retention_days'], 'Low retention must clamp to 1' );
check( 30 === utmkeeperflow_sanitize_settings( array( 'retention_days' => '2.5' ) )['retention_days'], 'Fractional retention must be rejected' );
check( 30 === utmkeeperflow_sanitize_settings( array( 'retention_days' => array( 2 ) ) )['retention_days'], 'Array retention must be rejected' );
check( 1 === utmkeeperflow_sanitize_settings( array( 'retention_days' => '1' ) )['retention_days'], 'Minimum retention must be accepted' );
check( 90 === utmkeeperflow_sanitize_settings( array( 'retention_days' => '90' ) )['retention_days'], 'Maximum retention must be accepted' );
check( 30 === utmkeeperflow_normalize_settings( array( 'retention_days' => '<script>' ) )['retention_days'], 'Malformed saved retention must use a safe default' );
check( array() === utmkeeperflow_sanitize_settings( array( 'parameters' => 'utm_source', 'domains' => array( 'javascript:evil' ) ) )['domains'], 'Malformed domains must be discarded' );
check( array() === utmkeeperflow_sanitize_settings( array( 'parameters' => 'utm_source' ) )['parameters'], 'Malformed parameter list must be discarded' );
check( '0' === utmkeeperflow_sanitize_settings( array( 'enabled' => true ) )['enabled'], 'Only exact string 1 enables' );
check( array() === utmkeeperflow_sanitize_settings( array() )['parameters'], 'Unchecked parameter boxes must clear selection' );
check( '0' === utmkeeperflow_sanitize_settings( array() )['enabled'], 'Unchecked enable box must disable' );
check( $defaults === utmkeeperflow_normalize_settings( 'invalid' ), 'Malformed option must fail disabled' );

foreach ( array( null, array(), 'invalid', array( 'enabled' => '0' ), array( 'enabled' => true ), array( 'enabled' => 1 ) ) as $options ) {
	$calls['register'] = null;
	$calls['inline']   = null;
	$calls['enqueue']  = null;
	utmkeeperflow_enqueue_frontend();
	check( null === $calls['register'] && null === $calls['inline'] && null === $calls['enqueue'], 'Disabled or malformed settings must not register, configure, or enqueue capture' );
}

$options = $input;
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
check( array( 'version' => UTMKEEPERFLOW_CONFIG_VERSION, 'parameters' => $clean['parameters'], 'domains' => $clean['domains'], 'retentionDays' => 90 ) === $config, 'Public configuration must use canonical settings only' );
check( false === strpos( $calls['inline'][1], 'not public' ), 'Private options leaked' );
check( false === strpos( $calls['inline'][1], 'arbitrary' ), 'Unvalidated parameters leaked' );
check( false === strpos( $calls['inline'][1], 'bad.example' ), 'Unvalidated domains leaked' );

$options = array( 'enabled' => '1', 'parameters' => array( 'not_allowed' ), 'domains' => array( '<script>' ), 'retention_days' => -5 );
check( array( 'version' => 1, 'parameters' => array(), 'domains' => array(), 'retentionDays' => 30 ) === utmkeeperflow_get_public_config(), 'Poisoned saved option must fail closed' );

$options = array( 'enabled' => '0', 'domains' => array( 'example.com', 'evil" onfocus="alert(1)' ) );
ob_start();
utmkeeperflow_field_enabled();
utmkeeperflow_field_parameters();
utmkeeperflow_field_retention();
$controls = ob_get_clean();
check( false === strpos( $controls, 'checked="checked"' ), 'Unchecked saved controls should not render checked' );
check( false !== strpos( $controls, 'forward them on eligible link activation' ), 'Enable guidance must describe forwarding' );
check( false !== strpos( $controls, 'min="1" max="90"' ), 'Retention bounds missing from control' );
ob_start();
utmkeeperflow_field_domains();
$html = ob_get_clean();
check( false === strpos( $html, 'onfocus' ), 'Invalid stored hostname must not render' );
check( false !== strpos( $html, 'example.com' ), 'Valid hostname must render' );

$can_admin = false;
ob_start();
utmkeeperflow_render_settings_page();
$html = ob_get_clean();
check( '' === $html, 'Non-admin page rendering must be blocked' );
$can_admin = true;
ob_start();
utmkeeperflow_render_settings_page();
$html = ob_get_clean();
check( false !== strpos( $html, 'action="options.php"' ), 'Form must submit to WordPress options.php' );
check( false !== strpos( $html, 'Disabled by default.' ) && false !== strpos( $html, 'whole' ) && false !== strpos( $html, 'fixed expiry' ), 'Settings help must explain default and last-touch expiry' );
check( false !== strpos( $html, 'external HTTPS links' ) && false !== strpos( $html, 'utm-keeper class' ), 'Settings help must explain exact-host and class targeting' );
check( false !== strpos( $html, 'may contain personal data' ) && false !== strpos( $html, 'may log forwarded URLs' ) && false !== strpos( $html, 'privacy and consent requirements' ), 'Settings help must warn about privacy responsibilities' );
check( false !== strpos( $html, 'No external plugin service or account is required' ), 'Settings help must not suggest an external dependency' );
check( false !== strpos( $html, 'id="utmkeeperflow_reset"' ) && false !== strpos( $html, 'type="button"' ) && false !== strpos( $html, 'aria-describedby="utmkeeperflow_reset_help"' ), 'Reset must be a labeled, non-submit button with linked instructions' );
check( false !== strpos( $html, 'same protocol, hostname, and port' ) && false !== strpos( $html, "other visitors&#039; browsers" ) && false !== strpos( $html, 'does not change saved settings' ), 'Reset guidance must describe current-origin-only scope' );
check( false !== strpos( $html, 'role="status" aria-live="polite"' ) && false !== strpos( $html, 'data-success=' ) && false !== strpos( $html, 'data-error=' ), 'Reset must provide accessible, translatable feedback' );
foreach ( array( 'Disabled by default.', 'Campaign values may contain personal data', 'For testing or to start fresh', 'UTM Keeper attribution was cleared', 'Could not clear attribution', 'Clear attribution in this browser' ) as $help_start ) {
	check( 1 === count( array_filter( $translated_texts, static function ( $text ) use ( $help_start ) {
		return 0 === strpos( $text, $help_start );
	} ) ), 'Settings help must be translatable in the plugin text domain' );
}
$inject_translation = true;
ob_start();
utmkeeperflow_render_settings_page();
$translated_html = ob_get_clean();
check( false !== strpos( $translated_html, '&lt;script&gt;alert(&quot;translation&quot;)&lt;/script&gt;' ) && false === strpos( $translated_html, '<script>' ), 'Translated help must be escaped' );
check( false !== strpos( $translated_html, 'data-success="&quot; onfocus=&quot;alert(1)"' ) && false === strpos( $translated_html, 'onfocus="alert(1)"' ), 'Translated reset messages must be escaped as attributes' );
$inject_translation = false;
check( 'utmkeeperflow' === $calls['nonce_group'], 'Settings API nonce missing' );
check( 'utmkeeperflow' === $calls['render_sections'], 'Settings controls not rendered via Settings API' );
check( true === $calls['display_errors'], 'Validation feedback must be displayed' );

echo "PHP bootstrap checks passed.\n";

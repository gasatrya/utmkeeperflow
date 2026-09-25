/* Clear only this site's browser-local UTM Keeper record on administrator request. */
(function () {
	'use strict';

	var button = document.getElementById( 'utmkeeperflow_reset' );
	var status = document.getElementById( 'utmkeeperflow_reset_status' );
	if ( ! button || ! status ) {
		return;
	}

	button.addEventListener( 'click', function () {
		try {
			window.localStorage.removeItem( 'utmkeeperflow_attribution' );
			status.textContent = button.getAttribute( 'data-success' );
		} catch ( error ) {
			status.textContent = button.getAttribute( 'data-error' );
		}
	} );
}());

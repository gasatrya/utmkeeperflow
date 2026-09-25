/* Browser-only last-touch capture. Link forwarding belongs to a later issue. */
(function () {
	'use strict';

	var storageKey = 'utmkeeperflow_attribution';
	var recordVersion = 1;
	var dayInMilliseconds = 24 * 60 * 60 * 1000;
	var supportedKeys = [ 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid' ];
	var config;
	var validConfig = false;

	// PHP only enqueues this script when enabled. An absent or invalid public
	// configuration must not touch attribution storage either.
	try {
		config = window.utmKeeperFlowConfig;
		validConfig = !! config && config.version === 1 && Array.isArray( config.parameters ) &&
			Number.isInteger( config.retentionDays ) && config.retentionDays >= 1 && config.retentionDays <= 90 &&
			config.parameters.every( function ( key ) { return supportedKeys.includes( key ); } );
	} catch ( error ) {
		return;
	}
	if ( ! validConfig ) {
		return;
	}

	function validValue( value ) {
		return typeof value === 'string' && value.trim() !== '' && value.length <= 256;
	}

	function capture( search ) {
		var query = new URLSearchParams( search );
		var values = {};

		config.parameters.forEach( function ( key ) {
			// A repeated key may have an empty or oversized first occurrence.
			var matches = query.getAll( key );
			for ( var i = 0; i < matches.length; i++ ) {
				if ( validValue( matches[ i ] ) ) {
					values[ key ] = matches[ i ];
					break;
				}
			}
		} );

		return values;
	}

	function validRecord( record, now ) {
		if (
			! record || typeof record !== 'object' || Array.isArray( record ) ||
			Object.keys( record ).length !== 3 || record.version !== recordVersion ||
			typeof record.expiresAt !== 'number' || ! Number.isFinite( record.expiresAt ) ||
			record.expiresAt <= now || record.expiresAt > now + 90 * dayInMilliseconds ||
			! record.values || typeof record.values !== 'object' || Array.isArray( record.values )
		) {
			return false;
		}

		var keys = Object.keys( record.values );
		return keys.length > 0 && keys.every( function ( key ) {
			return config.parameters.includes( key ) && validValue( record.values[ key ] );
		} );
	}

	try {
		var values = capture( window.location.search );
		var storage = window.localStorage;
		var now = Date.now();
		var previous = storage.getItem( storageKey );

		if ( previous !== null ) {
			var record;
			try {
				record = JSON.parse( previous );
			} catch ( error ) {
				record = null;
			}

			// Clear obsolete/invalid data, and clear a valid old campaign before
			// writing a replacement so a failed write cannot revive stale values.
			if ( ! validRecord( record, now ) || Object.keys( values ).length > 0 ) {
				storage.removeItem( storageKey );
			}
		}

		if ( Object.keys( values ).length > 0 ) {
			storage.setItem( storageKey, JSON.stringify( {
				version: recordVersion,
				values: values,
				expiresAt: now + config.retentionDays * dayInMilliseconds,
			} ) );
		}
	} catch ( error ) {
		// Blocked storage (including the getter), quota failures, and malformed
		// browser state must never interrupt navigation or trigger a fallback.
	}
}());

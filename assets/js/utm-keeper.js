/* Browser-only last-touch capture and activation-only link forwarding. */
(function () {
	'use strict';

	var storageKey = 'utmkeeperflow_attribution';
	var recordVersion = 1;
	var dayInMilliseconds = 24 * 60 * 60 * 1000;
	var supportedKeys = [ 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid' ];
	var config;
	var validConfig = false;
	var storageHealthy = true;

	// PHP only enqueues this script when enabled. An absent or invalid public
	// configuration must not touch attribution storage either.
	try {
		config = window.utmKeeperFlowConfig;
		validConfig = !! config && config.version === 1 && Array.isArray( config.parameters ) &&
			Array.isArray( config.domains ) && Number.isInteger( config.retentionDays ) &&
			config.retentionDays >= 1 && config.retentionDays <= 90 &&
			config.parameters.every( function ( key ) { return supportedKeys.includes( key ); } ) &&
			config.domains.every( function ( host ) {
				return typeof host === 'string' && host.length <= 253 &&
				/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test( host ) &&
				! /^\d+$/.test( host.split( '.' ).pop() ) &&
				host.split( '.' ).every( function ( label ) {
					return label.length <= 63 && label[ 0 ] !== '-' && label[ label.length - 1 ] !== '-';
				} );
			} );
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
		// A failed removal may leave a stale record behind. Never forward it on
		// this page, even if storage becomes readable on a later click.
		storageHealthy = false;
	}

	function forward( event ) {
		// Do not cancel native navigation, including modified and middle clicks.
		if ( ! storageHealthy || ( event.type === 'click' && event.button !== 0 ) ||
			( event.type === 'auxclick' && event.button !== 1 ) ) {
			return;
		}

		try {
			var target = event.target;
			var element = target && ( target.closest ? target : target.parentElement );
			var link = element && element.closest( 'a[href]' );
			if ( ! link || link.hasAttribute( 'download' ) ) {
				return;
			}

			var href = link.getAttribute( 'href' );
			var destination = new URL( href, window.location.href );
			if ( destination.protocol !== 'https:' || destination.hostname === window.location.hostname ||
				destination.username || destination.password ||
				( ! config.domains.includes( destination.hostname ) && ! link.classList.contains( 'utm-keeper' ) ) ) {
				return;
			}

			var raw = window.localStorage.getItem( storageKey );
			if ( raw === null ) {
				return;
			}
			var record;
			try {
				record = JSON.parse( raw );
			} catch ( error ) {
				record = null;
			}
			if ( ! validRecord( record, Date.now() ) ) {
				window.localStorage.removeItem( storageKey );
				return;
			}

			var additions = new URLSearchParams();
			config.parameters.forEach( function ( key ) {
				if ( Object.prototype.hasOwnProperty.call( record.values, key ) && ! destination.searchParams.has( key ) ) {
					additions.append( key, record.values[ key ] );
				}
			} );
			if ( ! additions.toString() ) {
				return;
			}

			// Append to the original attribute rather than serializing URL: that
			// preserves existing query bytes, path spelling, and the fragment.
			var hash = href.indexOf( '#' );
			var before = hash === -1 ? href : href.slice( 0, hash );
			var fragment = hash === -1 ? '' : href.slice( hash );
			var separator = before.includes( '?' ) ? ( /[?&]$/.test( before ) ? '' : '&' ) : '?';
			var forwarded = before + separator + additions.toString() + fragment;
			link.setAttribute( 'href', forwarded );
			// Native navigation uses the activated URL; restore the DOM after the
			// event so future clicks cannot carry expired or replaced attribution.
			setTimeout( function () {
				if ( link.getAttribute( 'href' ) === forwarded ) {
					link.setAttribute( 'href', href );
				}
			}, 0 );
		} catch ( error ) {
			// Invalid links and blocked storage leave native navigation alone.
		}
	}

	// Delegation handles links added after this script runs. No page-load scan.
	try {
		document.addEventListener( 'click', forward );
		document.addEventListener( 'auxclick', forward );
	} catch ( error ) {
		// An unavailable document must not disrupt capture or navigation.
	}
}());

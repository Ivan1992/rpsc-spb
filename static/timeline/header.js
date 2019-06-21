(function() {
	var fullScreenApi = {
			supportsFullScreen: false,
			isFullScreen: function() { return false; },
			requestFullScreen: function() {},
			cancelFullScreen: function() {},
			fullScreenEventName: '',
			prefix: ''
		},
		browserPrefixes = 'webkit moz o ms khtml'.split(' ');
 
	// check for native support
	if (typeof document.cancelFullScreen != 'undefined') {
		fullScreenApi.supportsFullScreen = true;
	} else {
		// check for fullscreen support by vendor prefix
		for (var i = 0, il = browserPrefixes.length; i < il; i++ ) {
			fullScreenApi.prefix = browserPrefixes[i];
 
			if (typeof document[fullScreenApi.prefix + 'CancelFullScreen' ] != 'undefined' ) {
				fullScreenApi.supportsFullScreen = true;
 
				break;
			}
		}
	}
 
	// update methods to do something useful
	if (fullScreenApi.supportsFullScreen) {
		fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';
 
		fullScreenApi.isFullScreen = function() {
			switch (this.prefix) {
				case '':
					return document.fullScreen;
				case 'webkit':
					return document.webkitIsFullScreen;
				default:
					return document[this.prefix + 'FullScreen'];
			}
		};
		fullScreenApi.requestFullScreen = function(el) {
			return (this.prefix === '') ? el.requestFullScreen() : el[this.prefix + 'RequestFullScreen']();
		};
		fullScreenApi.cancelFullScreen = function(el) {
			return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + 'CancelFullScreen']();
		};
	}
 
	// jQuery plugin
	if (typeof jQuery != 'undefined') {
		jQuery.fn.requestFullScreen = function() {
			return this.each(function() {
				if (fullScreenApi.supportsFullScreen) {
					fullScreenApi.requestFullScreen(this);
				}
			});
		};
	}
 
	// export api
	window.fullScreenApi = fullScreenApi;
})();

$(function(){
	var timelineHeader = $('.timelineHeader');

	var legend = timelineHeader.find('.legend'),
		legendButton = legend.find('.button'),
		legendWrap = legend.find('.legend-wrap');
		legendClose = legend.find('.legend-close');
		legendList = legend.find('.list');

	var closeLegend = function(e){
		e.preventDefault();

		var isButton = Boolean($(e.target).closest(legendButton).length);

		if (!isButton) {
			legendButton.removeClass('active');
			$(document.body).off('click', closeLegend);
		}
	};

	legendClose.click(closeLegend);

	legendWrap.click(function(e){
		e.stopPropagation();
	});

	legendButton.click(function(e){
		e.preventDefault();
		//e.stopPropagation();

		legendButton.toggleClass('active');

		$(document.body).on('click', closeLegend);
	});


	var scaleButton = timelineHeader.find('.scale .list a');

	scaleButton.click(function(e){
		e.preventDefault();

		scaleButton.removeClass('active');

		$(this).addClass('active');
	});

	timelineHeader.find('.fullscreenButton').click(function(e){
		e.preventDefault();
		if (fullScreenApi.isFullScreen()) {
			$(this).removeClass('down');
			fullScreenApi.cancelFullScreen();
		} else {
			$(this).addClass('down');
			fullScreenApi.requestFullScreen(document.documentElement);
		}
	});
});
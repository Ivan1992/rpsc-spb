var Timeline = function(options){
	var timeline = this;

	$.extend(this, options);
	this.el = this.el instanceof jQuery ? this.el : $(this.el);
	this.thumbEl = this.thumbEl instanceof jQuery ? this.thumbEl : $(this.thumbEl);

	this.thumbFrame = $('<div>', {'class': 'timelineThumbFrame'}).appendTo(this.thumbEl);
	this.thumbFrameLeft = $('<div>', {'class': 'timelineThumbFrameLeft'}).appendTo(this.thumbEl);
	this.thumbFrameRight = $('<div>', {'class': 'timelineThumbFrameRight'}).appendTo(this.thumbEl);
	this.thumbElementsWrap = $('<div>', {'class': 'timelineThumbElements'}).appendTo(this.thumbEl);
	this.setZoom(this.zoom);

	this.thumbEl.click(function(e){
		e.preventDefault();

		var clickLeft = e.clientX-this.offsetLeft-timeline.thumbFrame.outerWidth()/2;
		timeline.scrollTimelineThumb(clickLeft);
	});

	var $document = $(document);
	var thumbFrameOffset = 0;
	var thumbFrameMove = function(e){
		var left = e.pageX-timeline.thumbEl[0].offsetLeft-thumbFrameOffset;
		timeline.scrollTimelineThumb(left);
	};

	this.thumbFrame.click(function(e){
		e.stopPropagation();
	}).mousedown(function(e){
		e.preventDefault();

		thumbFrameOffset = e.originalEvent.layerX;
		$document.on('mousemove', thumbFrameMove).one('mouseup', function(e){
			$document.off('mousemove', thumbFrameMove);
		});
	});

	$(window).resize($.proxy(this.updateHeight, this));
	this.el.on('scroll', $.proxy(this.updateThumbFrame, this));
};

Timeline.prototype = {
	// public options
	fastDraw: false,
	letterWidth: 6,
	data: [],
	showSections: [],
	showAll: true,
	zoom: 0,
	zoomYears: 1,
	yearWidth: 10,
	rowHeight: 36,
	paddingTop: 6,
	paddingBottom: 10,
	thumbHeight: 0,/* 64, */
	thumbRowHeight: 2,
	thumbPaddingTop: 2,
	onDataLoad: $.noop,
	// private
	startYear: null,
	endYear: null,
	sectionsRowsWidth: [],
	sectionsTopOffset: 0,
	thumbFrameWidth: 100
};

Timeline.prototype.updateRange = function() {
	var timeline = this;

	timeline.startYear = null;
	timeline.endYear = null;

	$.each(timeline.data, function(i, section){
		if (!timeline.showAll && !timeline.showSections[i])
			return;

		section.items.sort(timeline.sortCmpStart);
		$.each(section.items, function(i, item){
			if (item.zoom > timeline.zoom)
				return;

			if (timeline.startYear === null || timeline.startYear > item.start)
				timeline.startYear = item.start;

			if (timeline.endYear === null || timeline.endYear < item.end)
				timeline.endYear = item.end;

			//console.log(item.start, item.end);
		});
	});

	timeline.startYear = Math.floor((timeline.startYear-1)/timeline.zoomYears)*timeline.zoomYears;
	timeline.endYear = Math.ceil(timeline.endYear/timeline.zoomYears)*timeline.zoomYears;

	//console.log(timeline.startYear, timeline.endYear);
};

Timeline.prototype.setData = function(data) {
	this.data = data;
	this.updateRange();
};

Timeline.prototype.loadUrl = function(url) {
	var that = this;

	$.getJSON(url, function(data){
		that.setData(data);
		that.onDataLoad(data);
		that.draw();
	});
};

Timeline.prototype.setZoom = function(zoom) {
	this.zoom = zoom;

	switch (zoom) {
		case 1:
			this.yearWidth = 20;
			this.zoomYears = 5;
			break;
		case 2:
			this.yearWidth = 10;
			this.zoomYears = 10;
			break;
		case 3:
			this.yearWidth = 2;
			this.zoomYears = 50;
			break;
		default:
			this.yearWidth = 100;
			this.zoomYears = 1;
	}

	if (this.data.length !== 0) {
		this.updateRange();
		this.draw();
	}
};

Timeline.prototype.sortCmpStart = function(a, b){
	if (a.start === b.start) {
		if (a.end === b.end)
			return 0;
		else if (a.end < b.end)
			return -1;
		else
			return 1;
	} else if (a.start < b.start)
		return -1;
	else
		return 1;
};

Timeline.prototype.clear = function() {
	this.thumbEl.css({'height': ''});
	this.thumbElementsWrap.empty();

	this.el.empty().css({'height': ''});
	this.sectionsWrap = $('<div>', {'class': 'sectionsWrap grid-'+this.zoomYears}).appendTo(this.el);

	// create years line
	this.yearsList = $('<ul>', {'class': 'yearsList'}).prependTo(this.el);

	for (var year = this.startYear+this.zoomYears; year <= this.endYear; year += this.zoomYears) {
		$('<li>', {text: year}).appendTo(this.yearsList);
	}

	this.detailTooltip = $('<div>', {'class': 'detailTooltip grid-'+this.zoomYears}).appendTo(this.el);
};

Timeline.prototype.updateThumbFrame = function(){
	var left = this.el[0].scrollLeft/this.el[0].scrollWidth*100;
	this.thumbFrameWidth = this.el.width()/this.el[0].scrollWidth*100;
	var right = 100-left-this.thumbFrameWidth;

	if (right < 0.01)
		right = 0;

	// fixme
	if (this.thumbFrameWidth > 100)
		this.thumbFrameWidth = 100;

	this.thumbFrame.css({
		left: left + '%',
		width: this.thumbFrameWidth + '%'
	});
	this.thumbFrameLeft.css({
		width: left + '%'
	});
	this.thumbFrameRight.css({
		width: right + '%'
	});
};

Timeline.prototype.scrollTimelineThumb = function(clickLeft){
	var left = clickLeft/this.thumbEl[0].clientWidth*100;

	if (left < 0)
		left = 0;

	if (left > 100-this.thumbFrameWidth)
		left = 100-this.thumbFrameWidth;

	this.el[0].scrollLeft = this.el[0].scrollWidth*(left/100);
};

Timeline.prototype.updateHeight = function(){
	var heigth = window.innerHeight-this.el.offset().top-this.thumbEl.outerHeight();
	this.el.css({
		height: heigth
	});
	this.sectionsWrap.css({
		minHeight: heigth-this.yearsList.outerHeight()
	});
};

Timeline.prototype.drawSection = function(section, i) {
	var timeline = this;
	var topOffest = 0;
	var addedItems = 0;
	var rowsWidth = timeline.sectionsRowsWidth[i] || [];
	var sectionEl = $('<div>', {'class': 'section'});

	if (!timeline.fastDraw)
		sectionEl.appendTo(timeline.sectionsWrap);

	$('<div>', {'class': 'section-bg'}).css({
		backgroundColor: section.color
	}).appendTo(sectionEl);

	var sectionTitle = $('<div>', {'class': 'section-title'}).html(section.name).css({
		color: section.color
	}).appendTo(sectionEl);

	timeline.sectionTitles.push(sectionTitle[0]);

	$.each(section.items, function(i, item){
		if (item.zoom > timeline.zoom)
			return;

		item.cache = item.cache || {};
		item.cache[timeline.zoom] = item.cache[timeline.zoom] || {};

		var isDot = (item.start === item.end);
		var el = $('<div>', {'class': 'item'}),
			label = $('<span>', {'class': 'label'}).appendTo(el),
			line = $('<div>', {'class': 'line'+(isDot ? ' dot' : '')}).appendTo(el);

		if (item.detailed) {
			var plus = $('<a>', {'class': 'plus', href: item.detailed}).appendTo(el);
			plus.css({
				backgroundColor: section.color
			});
			plus.click(function(e){
				e.preventDefault();

				if (timeline.detailTooltip.is(':visible')) {
					timeline.detailTooltip.hide();
					return;
				}

				var link = $(this),
					elPos = el.position(),
					sectionPos = sectionEl.position();

				$.getJSON(this.href, function(data){
					var backgroundOffsetLeft = (item.start % timeline.zoomYears) * 100 / timeline.zoomYears - 20;

					timeline.detailTooltip.empty();

					$.each(data, function(){
						var maxYear = 0;

						$('<div>', {
							'class': 'small-section-title',
							text: this.name
						}).appendTo(timeline.detailTooltip);

						var smallSection = $('<div>', {
							'class': 'small-section',
							css: {
								backgroundPosition: -backgroundOffsetLeft+'px 0'
							}
						}).appendTo(timeline.detailTooltip);

						$('<div>', {
							'class': 'small-section-bg',
							css: {
								backgroundColor: section.color
							}
						}).appendTo(smallSection);

						$.each(this.items, function(i, smallItem){
							var isDot = (smallItem.start === smallItem.end || !smallItem.end);
							var left = (smallItem.start-item.start)*timeline.yearWidth+16;

							var smallItemEl = $('<div>', {
								'class': 'small-item',
								//'data-title': smallItem.label,
								css: {
									left: left,
									backgroundColor: section.color
								}
							}).appendTo(smallSection);

							var smallTooltip = $('<div>', {
								'class': 'small-tooltip',
								text: smallItem.start + (smallItem.end ? '-' + smallItem.end : '') +  '. ' + smallItem.label
							}).appendTo(smallItemEl);

							if (isDot) {
								smallItemEl.addClass('dot');
							} else {
								smallItemEl.css({
									width: (smallItem.end-smallItem.start)*timeline.yearWidth
								});
							}

							if (maxYear < smallItem.start)
								maxYear = smallItem.start;
							if (maxYear < smallItem.end)
								maxYear = smallItem.end;
						});

						smallSection.css({
							minWidth: (maxYear - item.start) * timeline.yearWidth + 39
						});
					});

					timeline.detailTooltip.show();
					timeline.tooltips.hide();

					var toTop = false;
					var height = timeline.detailTooltip.outerHeight() + 34;
					var top = sectionPos.top + elPos.top;

					if (timeline.el.height() < top + height && top > height)
						toTop = true;

					timeline.detailTooltip.toggleClass('toTop', toTop);

					if (toTop)
						top -= height;

					timeline.detailTooltip.css({
						top: timeline.el.scrollTop() + top,
						left: elPos.left
					});
				});
			});
		}

		if (item.tooltip) {
			var tooltip = $('<div>', {'class': 'tooltip'}).appendTo(el);

			$('<span>', {'class': 'close', text: 'x'}).click(function(e){
				e.preventDefault();
				tooltip.hide();
			}).appendTo(tooltip);

			//tooltip.html(item.tooltip);

			if (item.image) {
				$('<img>', {src: item.image}).appendTo(tooltip);
			}

			var tooltipContent = $('<div>', {'class': 'content'}).html(item.tooltip).appendTo(tooltip);
			$('<h1>', {text: item.label}).prependTo(tooltipContent);

			if (item.links && item.links.length !== 0) {
				var tooltipLinks = $('<ul>', {'class': 'links'});
				$.each(item.links, function(i, link){
					var anchor = $('<a>', {href: link.url, text: link.text, target: '_blank'});
					$('<li>').append(anchor).appendTo(tooltipLinks);
				});
				tooltipLinks.appendTo(tooltipContent);
			}

			timeline.tooltips.push(tooltip[0]);

			tooltip.click(function(e){
				e.stopPropagation();
			});

			el.css({
				cursor: 'pointer'
			}).click(function(e){
				e.preventDefault();

				var toTop = false;

				if (timeline.el[0].scrollLeft > el[0].offsetLeft-30) {
					tooltip.css({
						marginLeft: timeline.el[0].scrollLeft-el[0].offsetLeft+30
					}).show();
				} else {
					tooltip.css({
						marginLeft: 0
					}).toggle();
				}

				var height = tooltip.outerHeight() + 34;
				var top = sectionEl.position().top + el.position().top;

				if (timeline.el.height() < top + height && top > height)
					toTop = true;

				tooltip.toggleClass('toTop', toTop);
				timeline.tooltips.not(tooltip).hide();

				timeline.detailTooltip.hide();
			});
		}

		var left = (item.start-timeline.startYear)*timeline.yearWidth,
			lineWidth = (item.end-item.start)*timeline.yearWidth;

		for (var row = 0; row < rowsWidth.length; row++) {
			if (rowsWidth[row]+10 < left) {
				topOffest = row;
				break;
			}
		}

		if (row !== 0 && row === rowsWidth.length) {
			topOffest = rowsWidth.length;
		}

		el.css({
			top: topOffest*timeline.rowHeight+timeline.paddingTop,
			left: left
		});

		var labelText = item.start+(isDot ? '' : '-'+item.end)+'. '+item.label;

		label.html(labelText);

		line.css({
			width: lineWidth,
			backgroundColor: section.color
		});

		el.appendTo(sectionEl);

		if (!rowsWidth[topOffest])
			rowsWidth[topOffest] = 0;

		var width = timeline.fastDraw ? Math.max(labelText.length*timeline.letterWidth, lineWidth) : el[0].clientWidth;

		rowsWidth[topOffest] = left+width;

		item.cache[timeline.zoom] = {
			labelEl: label,
			labelWidth: labelText.length*timeline.letterWidth,
			topOffest: topOffest,
			left: left,
			width: width,
			lineWidth: lineWidth
		};
		item.cache.labelWidth = label[0].offsetWidth;

		topOffest++;
		addedItems++;
	});

	if (addedItems === 0) {
		sectionEl.remove();
	} else {
		sectionEl.css({
			height: rowsWidth.length*timeline.rowHeight+timeline.paddingBottom
		});

		timeline.sectionsTopOffset += rowsWidth.length;

		timeline.sectionsRowsWidth[i] = rowsWidth;

		if (timeline.fastDraw)
			sectionEl.appendTo(timeline.sectionsWrap);
	}
};

Timeline.prototype.updateLabelsPos = function() {
	var timeline = this;
	var scrollLeft = timeline.el[0].scrollLeft;
	$.each(timeline.data, function(i, section){
		if (!timeline.showAll && !timeline.showSections[i])
			return;

		$.each(section.items, function(i, item){
			if (item.zoom > timeline.zoom)
				return;

			var itemCache = item.cache[timeline.zoom];
			var maxLeft = itemCache.lineWidth-itemCache.labelWidth;

			if (maxLeft > 0) {
				if (scrollLeft > itemCache.left-8)
					itemCache.labelEl[0].style.marginLeft = (Math.min(maxLeft, scrollLeft-itemCache.left)+4)+'px';
				else
					itemCache.labelEl[0].style.marginLeft = '-4px';
			}
		});
	});
};

Timeline.prototype.drawThumb = function() {
	var timeline = this;
	var sectionsTopOffset = 0;
	$.each(timeline.data, function(i, section){
		if (!timeline.showAll && !timeline.showSections[i])
			return;

		$.each(section.items, function(i, item){
			if (item.zoom > timeline.zoom)
				return;

			var isDot = (item.start === item.end);
			$('<div>', {'class': 'line'+(isDot ? ' dot' : '')}).css({
				//top: (sectionsTopOffset+item.cache[timeline.zoom].topOffest)*timeline.thumbRowHeight+timeline.thumbPaddingTop,
				top: (sectionsTopOffset+item.cache[timeline.zoom].topOffest)/timeline.sectionsTopOffset*timeline.thumbHeight,
				left: (item.start-timeline.startYear)/(timeline.endYear-timeline.startYear)*100 + '%',
				width: (item.end-item.start)/(timeline.endYear-timeline.startYear)*100 + '%',
				backgroundColor: section.color
			}).appendTo(timeline.thumbElementsWrap);
		});
		if (timeline.sectionsRowsWidth[i])
			sectionsTopOffset += timeline.sectionsRowsWidth[i].length;
	});
};

Timeline.prototype.draw = function() {
	var t = [new Date().getTime()];
	var timeline = this;

	timeline.sectionsRowsWidth = [];
	timeline.sectionsTopOffset = 0;
	timeline.tooltips = $();
	timeline.sectionTitles = $();

	this.clear();
	t[1] = new Date().getTime();

	// draw by section
	$.each(timeline.data, function(i, section){
		if (!timeline.showAll && !timeline.showSections[i])
			return;

		timeline.drawSection(section, i);
	});
	t[2] = new Date().getTime();

	// fix dimension
	timeline.sectionsWrap.add(timeline.yearsList).css({
		width: timeline.el[0].scrollWidth
	});

	// generate thumb
	/*timeline.thumbEl.css({
		height: (timeline.sectionsTopOffset+1)*timeline.thumbRowHeight+timeline.thumbPaddingTop
	});*/
	timeline.thumbEl.css({
		height: timeline.thumbHeight
	});
	timeline.updateThumbFrame();
	t[3] = new Date().getTime();
	timeline.drawThumb();
	t[4] = new Date().getTime();

	// ajust for window size
	timeline.updateHeight();

	//console.log(t[1]-t[0], ':', t[2]-t[1], ':', t[3]-t[2], ':', t[4]-t[3]);
};
/* global _,d3,colours */
import colours from 'econ_colours';

// utility functions
export function getTransformString(x, y, css) {
  return 'translate('+(x || 0)+(css ? 'px' : '')+','+(y || 0)+(css ? 'px' : '')+')';
}

// https://github.com/jquery/jquery/blob/c869a1ef8a031342e817a2c063179a787ff57239/src/core.js#L214
export function isNumeric(n) {
  return !Array.isArray( n ) && (n - parseFloat( n ) + 1) >= 0;
}

export function parseNumerics(d) {
  var fn = d instanceof Array ? 'map' : 'mapValues';
  return _[fn](d, function(v) {
    return isNumeric(v) ? parseFloat(v) : v;
  });
}


export function bindValueToRange(value, min, max) {
  // array overload
  if(min.length === 2) { max = min[1]; min = min[0]; }
  if(min > max) { var memo = min; min = max; max = memo; }
  if(min === max) { return min; }
  return Math.max(min, Math.min(max, value));
}

export function appendElement(parent, type, classNames, attrs, styles) {
  var element = parent.append(type)
    .classed(classNames, true);

  for(var attrName in attrs) { if(attrs.hasOwnProperty(attrName)) {
    element.attr(attrName, attrs[attrName]);
  }}
  for(var styleName in styles) { if(styles.hasOwnProperty(styleName)) {
    element.style(styleName, styles[styleName]);
  }}

  return element;
}

// margin arrays are designed to be like CSS margin declarations, so:
// top right bottom left
export function parseMarginArray(marginArray) {
  if(!(marginArray instanceof Array)) {
    return marginArray;
  }
  var top, right, bottom, left;
  switch (marginArray.length) {
    case 1:
      top = right = bottom = left = marginArray[0];
      break;
    case 2:
      top = bottom = marginArray[0];
      right = left = marginArray[1];
      break;
    case 3:
      top = marginArray[0];
      bottom = marginArray[2];
      right = left = marginArray[1];
      break;
    default:
      top = marginArray[0];
      right = marginArray[1];
      bottom = marginArray[2];
      left = marginArray[3];
      break;
  }
  return { top : top, right : right, bottom: bottom, left : left };
}

export function Section(parent, options) {
  this.initialize.apply(this, arguments);
}
Section.prototype.initialize = function(parent, options) {
  this.options = _.defaults(options, this.options);

  if(this.options.render) {
    this.render = this.options.render;
  }

  this.parent = parent;
  // this chart always refers to the top of the hierarchy
  this.chart = this.parent.chart || this.parent;

  this.name = this.options.name || undefined;
  if(this.options.margin) {
    this.margin = parseMarginArray(this.options.margin);
  }

  this.wrapper = parent.container.append('g')
    .classed(this.options.classNames, true)
    .attr('transform', getTransformString(0, 0));

  this.container = this.wrapper.append('g')
    .classed('section-container', true)
    .attr('transform', getTransformString(this.margin.left, this.margin.top));

  if(this.name) {
    this.container.attr('id', this.name + 'Container');
  }

  this.width = this.parent.fullWidth - this.margin.left - this.margin.right;
  // height is a little trickier

  this.render();
};
Section.prototype.attr = function(attr, value) {
  return this.container.attr.apply(this.container, arguments);
};
Section.prototype.options = {
  fullWidth : true,
  classNames : [],
  margin : { top : 0, right : 0, bottom : 0, left : 0 }
};
Section.prototype.render = function() {
  // stub
};
Section.prototype.updatePositions = function() {
  // stub
};

// some passthroughs
Section.prototype.getHeight = function() {
  // this should be overwritten for fixed-height sections
  return this.options.height ||
    this.wrapper.node().getBoundingClientRect().height;
};
Section.prototype.getBoundingClientRect = function() {
  return this.wrapper.node().getBoundingClientRect();
};
Section.prototype.attr = function() {
  return this.wrapper.attr.apply(this.wrapper, arguments);
};
Section.prototype.append = function() {
  return this.container.append.apply(this.container, arguments);
};
Section.prototype.selectAll = function() {
  return this.container.selectAll.apply(this.container, arguments);
};
Section.prototype.node = function() {
  return this.wrapper.node();
};
Section.prototype.guarantee = function(identifier, type) {
  var rawIdentifier = identifier.substr(1);
  var idChar = identifier.substr(0,1);
  var idType;
  switch(idChar) {
    case '#':
      idType = 'id'; break;
    case '.':
      idType = 'class'; break;
    default:
      idType = 'class';
      rawIdentifier = identifier;
      identifier = '.' + identifier;
  }
  var sel = this.container.select(identifier);
  if(!sel.node()) {
    sel = this.container.append(type);
    switch(idType) {
      case 'class':
        sel.classed(rawIdentifier, true); break;
      case 'id':
        sel.attr('id', rawIdentifier); break;
    }
  }
  return sel;
};


// chart elements
export function Interactive(parentSelector, options) {
  options = options || {};
  this.options = _.defaults(options, this.options);
  this.selector = parentSelector;
  this.fullWidth = options.fullWidth || 595;
  this.fullHeight = options.fullHeight || 400;

  this.sections = [];

  var margin = this.margin = parseMarginArray(this.options.margin);

  // these may be redundant
  this.width = this.fullWidth - margin.left - margin.right;
  this.height = this.fullHeight - margin.top - margin.bottom;

  this.container = d3.select(this.selector).append('svg')
    .classed(this.options.classNames, true)
    .attr('width', this.fullWidth)
    .attr('height', this.fullHeight);

  this.tooltipContainer = this.container.append('svg:g')
    .classed('tooltip-container', true);
  this.tooltipBg = this.tooltipContainer.append('svg:rect')
    .classed('tooltip-bg', true);
}
Interactive.prototype.attr = function() {
  return this.container.attr.apply(this.container, arguments);
};
Interactive.prototype.options = {
  fullWidth : 595,
  fullHeight : 400,
  margin : {
    top: 130, right: 20, bottom: 130, left: 20
  },
  classNames : ['interactive-element']
};
Interactive.prototype.addSection = function(options, Constructor) {
  Constructor = Constructor || Section;
  var section = new Constructor(this, options);
  if(options.index) {
    this.sections.splice(options.index, 0, section);
  } else {
    this.sections.push(section);
  }
  return section;
};
Interactive.prototype.removeSection = function(section) {
  if(!_.isNumber(section)) {
    section = this.sections.indexOf(section);
  }
  // section is not a member
  if(section < 0) { return; }
  this.sections[section].wrapper.remove();
  return this.sections.splice(section, 1)[0];
};
Interactive.prototype.replaceSection = function(options, Constructor, target) {
  var section;
  if(options instanceof Section) {
    section = options;
    target = Constructor;
  } else {
    Constructor = Constructor || Section;
    section = new Constructor(this, options);
  }
  if(!_.isNumber(target)) {
    target = this.sections.indexOf(target);
  }
  if(target < 0) { return; }
  this.sections[target].wrapper.remove();
  this.sections.splice(target, 1, section);
  return section;
};
Interactive.prototype.recalculateSections = function() {
  var heightTally = 0;
  _.each(this.sections, function(section) {
    var sectionHeight = section.getHeight();
    section.attr('transform', getTransformString(0, heightTally));
    // we have to recalculate getBoundingClientRect now because we've
    // moved the rect
    heightTally = section.getBoundingClientRect().top + sectionHeight;
  });
  this.container.attr('height', Math.ceil(heightTally));
  _.each(this.sections, function(section) {
    section.updatePositions();
  });
};
Interactive.prototype.showTooltip = function(text, position, options) {
  options = _.extend({
    offset : 5,
    background : true
  }, options);
  if(!(text instanceof Array)) {
    text = [text];
  }
  var textJoin = this.tooltipContainer.selectAll('.tooltip-text')
    .data(text);
  textJoin.exit().remove();
  textJoin.enter().append('svg:text')
    .classed('tooltip-text', true);
  textJoin
    .text(function(d) { return d; })
    .attr({
      x : options.background ? 5 : 0,
      y : function(d,i) { return i * 15 + 15; }
    });
  if(options.textClasses) {
    textJoin.each(function(d,i) {
      d3.select(this).classed(options.textClasses[i], true);
    });
  }
  if(options.textAttributes) {
    textJoin.each(function(d, i) {
      d3.select(this).attr(options.textAttributes[i]);
    });
  }

  this.tooltipBg.attr({ height : 0, width : 0});
  var bounds = this.tooltipContainer.node().getBoundingClientRect();
  var height = bounds.height + 5;
  var width = bounds.width + (options.background ? 10 : 0);
  if(options.background) {
    this.tooltipBg.attr({ height : height, width : width });
  }
  
  var chartBounds = this.container.node().getBoundingClientRect();
  var x = position.x + options.offset;
  var y = options.centerY ? position.y - height/2 : position.y + options.offset;
  if(width + x > chartBounds.width) { x -= (width + options.offset * 2); }
  if(height + y > chartBounds.height) { y -= (height + options.offset * 2); }

  // make sure the tooltip is on top
  this.container.node().appendChild(this.tooltipContainer.node());
  this.tooltipContainer.attr('transform', getTransformString(x, y));
};
Interactive.prototype.hideTooltip = function() {
  this.tooltipContainer.selectAll('.tooltip-text').remove();
  this.tooltipBg.attr({ height : 0, width : 0});
};
Interactive.prototype.node = function() {
  return this.container.node();
};

/*
  headers options:
  title : the main title
  subtitle : the smaller subtitle

  toggles : an array of objects with
    - name : the label
    - state : not sure what this is for lol
    - click, touchstart : event handlers
*/
export function Header(parent, options) {
  this.initialize.apply(this, arguments);
}
Header.prototype = Object.create(Section.prototype);
Header.prototype.constructor = Header;
Header.prototype.options = _.defaults({
  title : 'Hello',
  subtitle : 'Nice to see you'
}, Section.prototype.options);
Header.prototype.render = function() {
  appendElement(this.container, 'svg:line', 'brand-line', {
    x1 : 0, y1: 1, x2 : this.chart.fullWidth, y2: 1,
    'shape-rendering' : 'crispEdges'
  }, {
    stroke : colours.brand, 'stroke-width' : '2px'
  });
  appendElement(this.container, 'svg:rect', ['corner-square'], {
    x : 0, y : 1, width: 10, height : 26
  }, {
    fill : colours.brand
  });
  this.titleElement = this.titleElement || appendElement(this.container,
    'svg:text', 'header-text header-title title', {
      x : 21, y: 29
    }
  );
  this.titleElement.text(this.options.title);
  this.subtitleElement = this.subtitleElement || appendElement(this.container,
    'svg:text', 'header-text header-subtitle subtitle', {
      x : 21, y : 45
    }
  );
  this.subtitleElement.text(this.options.subtitle);

  // note: the toggles have no wrapping, and can overrun the title of
  // the chart if used improperly. better functionality here would be
  // very nice. TODO: better functionality here
  if(this.options.toggles) {
    this.addToggles(this.options.toggles);
  }
};
Header.prototype.addToggles = function(toggles) {
  if(!toggles) {
    this.container.select('.toggle-container').remove();
    return;
  }

  var toggleContainer = this.container.select('.toggle-container');
  if(!toggleContainer.node()) {
    toggleContainer = this.container.append('svg:g')
      .classed('toggle-container', true);
  }

  this.options.toggles = toggles;

  var toggleJoin = toggleContainer.selectAll('.toggle')
    .data(toggles);
  toggleJoin.exit().remove();
  var toggleEnter = toggleJoin.enter().append('svg:g')
    .classed('toggle', true);
  toggleEnter.append('svg:rect')
    .classed('toggle-bg', true)
    .attr({ height : 23 });
  toggleEnter.append('svg:text')
    .classed('toggle-name', true)
    .attr({x : 5, y : 16});

  toggleJoin.each(function(d) {
    var g = d3.select(this);
    g.select('.toggle-name')
      .text(d.name);
    for(var k in d) { if(d.hasOwnProperty(k) && _.isString(d[k])) {
      this.setAttribute('data-'+k, d[k]);
    }}
  })
  .on('click', function(d) {
    return d.click && d.click.apply(this, arguments);
  })
  .on('touchstart', function(d) {
    return d.touchstart && d.touchstart.apply(this, arguments);
  });

  var toggleTitle = toggleContainer.select('.toggle-title');
  if(!toggleTitle.node()) {
    toggleTitle = toggleContainer.append('svg:text')
      .classed('toggle-title', true);
  }
  toggleTitle.text(this.options.toggleTitle)
    .attr({x : -5, y: 16})
    .attr('text-anchor', 'end');

  // we tie this to load so it re-updates once the fonts have loaded;
  // this gives a bit of a jump but it's better than it being weirdly
  // cut off
  this.updatePositions();
  window.addEventListener('load', _.bind(this.updatePositions, this));
};
Header.prototype.updatePositions = function() {
  var toggleContainer = this.container.select('.toggle-container');
  if(!toggleContainer.node()) { return; }
  var toggles = toggleContainer.selectAll('.toggle');

  var widthCursor = 0;
  toggles.each(function(){
    var toggle = d3.select(this);
    var name = toggle.select('.toggle-name');
    var bg = toggle.select('.toggle-bg');
    var textWidth = name.node().getBoundingClientRect().width;
    bg.attr('width', textWidth + 10);

    toggle.attr('transform', getTransformString(widthCursor, 0));

    widthCursor += textWidth + 10;
  });

  toggleContainer.attr('transform', getTransformString(
    this.parent.fullWidth - this.parent.margin.right - widthCursor, 20
    ));
  // // to measure width correctly, we have to set it back to maximum
  // toggleWrapper.attr('width', 595);
  // var dims = toggleWrapper.select('.toggle-container').node().getBoundingClientRect();
  // toggleWrapper.attr({
  //   width : Math.ceil(dims.width),
  //   height: Math.ceil(dims.height),
  //   transform: getTransformString(-Math.ceil(dims.width), 0)
  // });
};

export function LineLegend(parent, options) {
  this.lines = options.lines || [];
  this.initialize.apply(this, arguments);
}
LineLegend.prototype = Object.create(Section.prototype);
LineLegend.prototype.constructor = LineLegend;
LineLegend.prototype.updateLines = function(lines) {
  this.lines = lines;
  this.render();
};
LineLegend.prototype.render = function() {
  var lineJoin = this.selectAll('.legend-line').data(this.lines);
  var textJoin = this.selectAll('.legend-label').data(this.lines);
  textJoin.exit().remove();
  lineJoin.exit().remove();
  textJoin.enter().append('svg:text')
    .classed('legend-label', true)
    .text(function(d) {
      return d.title;
    })
    .attr('y', 20);
  lineJoin.enter().append('svg:line')
    .classed('legend-line', true)
    .attr('y1', 15)
    .attr('y2', 15)
    .attr('stroke', function(d) { return d.colour; })
    .attr('stroke-width', 3);
  var textWidths = [];
  textJoin.each(function(d, i) {
      textWidths[i] = this.getBoundingClientRect().width;
    })
    .attr('x', function(d, i) {
      return 45 + i * 50 + _.sum(textWidths.slice(0, i));
    });
  lineJoin.attr('x1', function(d, i) {
      return 10 + i * 50 + _.sum(textWidths.slice(0, i));
    })
    .attr('x2', function(d, i) {
      return 40 + i * 50 + _.sum(textWidths.slice(0, i));
    });
};

export function ColourLegend(parent, options) {
  this.options = _.extend(this.options, this.defaults, options);
  this.colours = options.colours;
  this.initialize.apply(this, arguments);
}
ColourLegend.prototype = Object.create(Section.prototype);
ColourLegend.prototype.constructor = ColourLegend;
ColourLegend.prototype.defaults = {
  indicator : 'rect'
};
ColourLegend.prototype.updateColours = function(colours) {
  this.colours = colours;
  this.render();
};
ColourLegend.prototype.render = function() {
  var blockJoin = this.selectAll('.legend-block').data(this.colours);
  var textJoin = this.selectAll('.legend-label').data(this.colours);

  var line = 0;

  textJoin.exit().remove();
  blockJoin.exit().remove();
  textJoin.enter().append('svg:text')
    .classed('legend-label', true)
    .text(function(d) {
      return d.title;
    })
    .attr('y', 18);
  blockJoin.enter().append('svg:'+ this.options.indicator)
    .classed('legend-block', true)
    // rect attributes
    .attr('y', 8)
    .attr('width', 10)
    .attr('height', 10)
    // circle attrs
    .attr('cy', 13)
    .attr('r', 5)
    .attr('fill', function(d) { return d.colour; });
  var textWidths = [];
  textJoin.each(function(d, i) {
      textWidths[i] = this.getBoundingClientRect().width;
    })
    .attr('x', function(d, i) {
      return 35 + i * 30 + _.sum(textWidths.slice(0, i));
    });
  blockJoin
    .attr('x', function(d, i) {
      return 20 + i * 30 + _.sum(textWidths.slice(0, i));
    })
    .attr('cx', function(d, i) {
      return 25 + i * 30 + _.sum(textWidths.slice(0, i));
    });
};

export function Slider(parent, options) {
  _.bindAll(this, 'drag', 'release');
  this.scale = options.scale;
  this.axisThickness = options.axisThickness || 1;
  if(options.axisFormat) { this.axisFormat = options.axisFormat; }
  if(options.dragCallback) { this.dragCallback = options.dragCallback; }
  if(options.releaseCallback) { this.releaseCallback = options.releaseCallback; }
  this.initialize.apply(this, arguments);
}
Slider.prototype = Object.create(Section.prototype);
Slider.prototype.constructor = Section;
Slider.prototype.axisFormat = d3.format();
Slider.prototype.options = _.extend(Section.prototype.options, {
  margin : parseMarginArray([0,10]),
  playButton : true
});
Slider.prototype.render = function() {
  var self = this;
  this.scale.range([
    this.parent.margin.left + this.margin.left,
    this.parent.width - this.margin.left
  ]);

  var drag = d3.behavior.drag()
    .on('drag', this.drag)
    .on('dragend', this.release);

  var axis = d3.svg.axis()
    .scale(this.scale)
    .outerTickSize(this.axisThickness)
    .orient('bottom')
    .tickFormat(this.axisFormat);

  this.backdrop = this.guarantee('slider-backdrop', 'svg:rect')
    .attr({x:0, y:0, width: this.parent.width, fill: 'transparent'});

  this.handle = this.guarantee('slider-handle', 'svg:path');
  this.handle.attr('d', 'M-10,0L-10,20Q-6,23,0,25Q6,23,10,20L10,0Z')
    .attr('transform', getTransformString(
      this.scale.range()[0], 0))
    .call(drag);
  this.guarantee('axis', 'svg:g')
    .classed('handle-axis', true)
    .call(axis)
    .attr('transform', getTransformString(0, 25))
    .selectAll('.tick')
    .on('click', function(d) {
      d3.event.stopPropagation();
      self.set(d);
    });

  this.backdrop.attr('height',
    this.container.node().getBoundingClientRect().height)
    .call(drag)
    .on('click', function() {
      self._setToPosition(d3.event.x);
    });

  this._drawPlay().on('click', function() {
    self._playToggle();
  });
};
Slider.prototype._playToggle = function() {
  if(this.playing) {
    this.stop();
  } else {
    this.play();
  }
};
Slider.prototype._drawPlay = function() {
  var play;
  if(this.options.playButton) {
    play = this.guarantee('slider-play-button', 'svg:g')
      .classed('clickable-area', true);
    var backdropJoin = play.selectAll('.button-bg').data([1]);
    backdropJoin.enter().append('svg:rect')
      .classed('button-bg', true);
    backdropJoin.attr({width : 30, height : 40});
    var iconJoin = play.selectAll('.slider-play-icon').data([1]);
    iconJoin.enter().append('svg:path')
      .classed('slider-play-icon', true);
    iconJoin.attr('d', 'M5,0L25,10L5,20z');
    var textJoin = play.selectAll('.play-label').data([1]);
    textJoin.enter().append('svg:text')
      .classed('play-label', true);
    textJoin.text('Play')
      .attr({x : 15, y : 35, 'text-anchor' : 'middle'});
  }
  return play;
};
Slider.prototype._drawStop = function() {
  var play;
  if(this.options.playButton) {
    play = this.guarantee('slider-play-button', 'svg:g')
      .classed('clickable-area', true);
    var backdropJoin = play.selectAll('.button-bg').data([1]);
    backdropJoin.enter().append('svg:rect')
      .classed('button-bg', true);
    backdropJoin.attr({width : 30, height : 40});
    var iconJoin = play.selectAll('.slider-play-icon').data([1]);
    iconJoin.enter().append('svg:path')
      .classed('slider-play-icon', true);
    iconJoin.attr('d', 'M5,0L25,0L25,20L5,20z');
    var textJoin = play.selectAll('.play-label').data([1]);
    textJoin.enter().append('svg:text')
      .classed('play-label', true);
    textJoin.text('Stop')
      .attr({x : 15, y : 35, 'text-anchor' : 'middle'});
  }
  return play;
};
Slider.prototype._setToPosition = function(xValue, noRefine) {
  var range = this.scale.range();
  var finalX = Math.max(Math.min(xValue, range[1]), range[0]);
  if(this.options.refineValue && !noRefine) {
    finalX = this.scale(
      this.options.refineValue(this.scale.invert(finalX))
    );
  }
  this.handle.attr('transform', getTransformString(finalX, 0));
  return this.scale.invert(finalX);
};
Slider.prototype.set = function(value) {
  var v = this._setToPosition(this.scale(value));
  if(this.releaseCallback) { this.releaseCallback(v); }
  return v;
};
Slider.prototype.drag = function() {
  this.lastDrag = d3.event.x;

  var range = this.scale.range();
  var x = Math.max(Math.min(d3.event.x, range[1]), range[0]);
  this.handle.attr('transform', getTransformString(x, 0));
  // drag function is called with the value from the scale
  return this.dragCallback && this.dragCallback(this.scale.invert(x));
};
Slider.prototype.release = function() {
  // we don't always have a last drag, in the event that all the user
  // did was click/tap
  var x = this.lastDrag ? this.lastDrag :
    d3.event.sourceEvent.pageX - this.container.node()
      .getBoundingClientRect().left;

  var value = this._setToPosition(x);
  if(this.releaseCallback) { this.releaseCallback(value); }
  return value;
};
Slider.prototype.duration = 1000;
Slider.prototype.play = function() {
  var self = this;
  var domain = this.scale.domain();
  var current = domain[0];
  var perSecond = (domain[1] - domain[0]) / this.duration;

  // start
  this.set(domain[0]);
  this._drawStop();
  this.playing = true;

  // run the animation
  d3.timer(function(elapsed) {
    if(self.playing === false) {
      self.stop();
      return true;
    }
    current = self.set(domain[0] + elapsed * perSecond);
    // since the return of set is capped at domain[1], it is safe for
    // us to use this return: it will always eventually exactly equal
    // domain[1] and end the loop
    if(domain[1] === current) {
      self.stop();
      return true;
    }
    self.playing = true;
  });
};
Slider.prototype.stopCallback = function() {
  // stub
};
Slider.prototype.stop = function() {
  this.playing = false;
  this.stopCallback();
  this._drawPlay();
};

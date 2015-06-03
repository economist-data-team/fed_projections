/* global _,d3,chroma */
import {
  getTransformString, parseMarginArray
} from 'framework';

var touchMode = 'ontouchstart' in window;

function polygon(d) {
  return 'M' + d.join('L') + 'Z';
}

export function TimeIndLineChart(chart, options) {
  _.bindAll(this, 'showHighlight', 'clearHighlight');

  this.chart = chart;

  this.options = _.extend(this.defaults, options);
  this.margin = parseMarginArray(this.options.margin);
  this.scales = options.scales;

  this.lineContainer = chart.append('svg:g')
    .classed('line-container', true);
  this.pointContainer = chart.append('svg:g')
    .classed('point-container', true);
  this.hoverContainer = chart.append('svg:g')
    .classed('hover-container', true)
    .on('mouseleave', this.clearHighlight);
  this.xAxis = chart.append('svg:g')
    .classed('axis x-axis', true);
  this.yAxis = chart.append('svg:g')
    .classed('axis y-axis', true);
}
TimeIndLineChart.prototype.defaults = {
  margin : [10],
  xAxisPosition : 'bottom',
  yAxisPosition : 'left'
};
TimeIndLineChart.prototype.loadData = function(data) {
  this.data = data;
  this._pointData = _.flatten(_.map(this.data, 'data'));
  this._segmentData = _.flatten(_.map(this.data, function(d) {
    return d3.pairs(d.data);
  }));
};
TimeIndLineChart.prototype.highlightLine = function(value, filter) {
  var fadeout = 0.15;
  this.lineContainer.selectAll('.line-segment')
    .attr('opacity', function(d) {
      return d[0][filter] === value ? 1 : fadeout;
    });
  this.pointContainer.selectAll('.data-point')
    .attr('opacity', function(d) {
      return d[filter] === value ? 1 : fadeout;
    });
};
TimeIndLineChart.prototype.showHighlight = function(point) {
  var self = this;
  this.highlighted = point;
  var join = this.pointContainer.selectAll('.data-salient-point')
    .data([point]);
  join.exit().remove();
  join.enter().append('svg:circle')
    .classed('data-salient-point data-point', true);
  join.attr({
    cx : function(d) { return self.xScale(d[self.options.xVar]); },
    cy : function(d) { return self.yScale(d[self.options.yVar]); },
    stroke : function(d) {
      return self.colourScale(d[self.options.colourVar]);
    },
    fill : function(d) {
      return chroma(self.colourScale(d[self.options.colourVar]))
        .alpha(0.5).css('rgba');
    },
    r : 6
  });

  this.highlightLine(
    point[self.options.identifyingVar],
    self.options.identifyingVar);

  var chartBounds = this.chart.container.node().getBoundingClientRect();
  this.chart.parent.showTooltip(point.country + ' ' + point.year, {
    x : this.xScale(point[this.options.xVar]) + chartBounds.left,
    y : this.yScale(point[this.options.yVar]) + chartBounds.top
  }, {
    offset : 10,
    centerY : true
  });
};
TimeIndLineChart.prototype.clearHighlight = function() {
  this.highlighted = null;
  this.lineContainer.selectAll('.line-segment')
    .attr('opacity', 1);
  this.pointContainer.selectAll('.data-salient-point').remove();
  this.pointContainer.selectAll('.data-point')
    .attr('opacity', 1);

  this.chart.parent.hideTooltip();
};
TimeIndLineChart.prototype.handleClick = function(d) {
  // stub
};
TimeIndLineChart.prototype.render = function(value, filter) {
  var self = this;

  var chartDims = {
    left : this.margin.left,
    right : this.chart.width - this.margin.right,
    top : this.margin.top,
    bottom: this.chart.chart.fullHeight - this.margin.bottom
  };

  this.clearHighlight();

  // we're already on this state
  if(this.filterValue && value === this.filterValue) { return; }
  this.filterValue = value;

  var segmentData = value ?
    _.filter(this._segmentData, function(d) { return d[1][filter] <= value; }) :
    this._segmentData;

  // TODO programmatically calculate the ranges
  this.xScale = this.scales[this.options.xVar].copy()
    .range([chartDims.left, chartDims.right]);
  this.yScale = this.scales[this.options.yVar].copy()
    .range([chartDims.bottom, chartDims.top]);
  this.colourScale = this.scales[this.options.colourVar];

  var lineJoin = this.lineContainer.selectAll('.line-segment')
    .data(segmentData);

  lineJoin.exit().remove();
  lineJoin.enter().append('svg:line')
    .classed('line-segment', true);

  lineJoin.attr({
    x1 : function(d) { return self.xScale(d[0][self.options.xVar]); },
    x2 : function(d) { return self.xScale(d[1][self.options.xVar]); },
    y1 : function(d) { return self.yScale(d[0][self.options.yVar]); },
    y2 : function(d) { return self.yScale(d[1][self.options.yVar]); },
    stroke : function(d) { return self.colourScale(d[1][self.options.colourVar]); }
  });

  var pointData = value ?
    _.filter(this._pointData, function(d) { return d[filter] <= value; }) :
    this._pointData;

  // TODO programmatically calculate the range
  var voronoiMap = d3.geom.voronoi()
    .x(function(d) { return self.xScale(d[self.options.xVar]); })
    .y(function(d) { return self.yScale(d[self.options.yVar]); })
    .clipExtent([[0,0], [570, 400]]);

  var voronoiJoin = this.hoverContainer.selectAll('.data-hover')
    .data(voronoiMap(pointData), polygon);

  voronoiJoin.exit().remove();
  voronoiJoin.enter().append('svg:path')
    .classed('data-hover', true);

  voronoiJoin.attr('d', polygon)
    .on('click', function(d) {
      // on touch, we handle clicks differently
      if(!touchMode) {
        self.handleClick(d.point);
      }
    })
    .on('mouseenter', function(d) { self.showHighlight(d.point); })
    .on('touchstart', function(d) {
      // for touch, a tap on an already selected point will behave as
      // a normal click
      if(self.highlighted === d.point) {
        return self.handleClick(d.point);
      } else {
        self.showHighlight(d.point);
      }
    });

  // this will always return a point, though not necessarily one that
  // corresponds to the value of the filter variable...
  var leadingPointData = _.map(this.data, function(d) {
    return _.sortBy(d.data, function(d) {
      return Math.abs(d[filter] - value);
    })[0];
  });

  var pointJoin = this.pointContainer.selectAll('.data-point')
    .data(leadingPointData);

  pointJoin.exit().remove();
  pointJoin.enter().append('svg:circle')
    .classed('data-point', true);

  pointJoin
    .classed('data-salient-point', false)
    .attr({
      cx : function(d) { return self.xScale(d[self.options.xVar]); },
      cy : function(d) { return self.yScale(d[self.options.yVar]); },
      fill : function(d) {
        var colour = self.colourScale(d[self.options.colourVar]);
        return d[filter] === value ? colour :
          chroma(colour).alpha(0.25).css('rgba');
      },
      stroke : function(d) {
        var colour = self.colourScale(d[self.options.colourVar]);
        return d[filter] === value ? 'none' : colour;
      },
      r : 3
    });

  // finally, draw our axes
  var xAxis = d3.svg.axis()
    .scale(this.xScale)
    .outerTickSize(1)
    .orient(this.options.xAxisPosition);
  var yAxis = d3.svg.axis()
    .scale(this.yScale)
    .outerTickSize(1)
    .orient(this.options.yAxisPosition);

  this.xAxis.call(xAxis)
    .attr('transform',
      getTransformString(0, this.yScale.range()[
        // this is a slightly sneaky way of getting the right number:
        // Number(true) => 1, Number(false) => 0
        Number(this.options.xAxisPosition === 'top')
      ]));
  this.yAxis.call(yAxis)
    .attr('transform',
      getTransformString(this.xScale.range()[
        Number(this.options.yAxisPosition === 'right')
      ], 0));
};

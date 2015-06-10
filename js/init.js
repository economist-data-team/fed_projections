/* global _,d3,machina,math */
import {
  isNumeric, parseNumerics, getTransformString,
  Interactive, Header, ToggleGroup
} from 'framework';
import colours from 'econ_colours';


var mainFSM = window.mainFSM = new machina.Fsm({
  initialize : function() {
    var self = this;

    this.interactive = new Interactive('#interactive');

    this.header = this.interactive.addSection({
      title : 'Declining optimism',
      subtitle : 'Subtitle'
    }, Header);

    this.toggle = this.interactive.addSection({
      name : 'toggles',
      toggles : [
        {
          name : 'Dot plot',
          state : 'standard-dot',
          click : function() { self.transition('standard-dot'); }
        }, {
          name : 'Combined plot',
          state : 'combined-dot',
          click : function() { self.transition('loaded'); }
        }
      ]
    }, ToggleGroup);

    this.chart = this.interactive.addSection({
      name : 'main-chart',
      margin : [20],
      height: 520
    });

    this._setupPlot();

    var values = [2012, 2013, 2014, 2015, 2016, 2017, "longer_run"];
    var sessions = this.sessions = [
      '2012-01-01', '2012-04-01', '2012-09-01', '2012-12-01',
      '2013-03-01', '2013-06-01', '2013-09-01', '2013-12-01',
      '2014-03-01', '2014-06-01', '2014-09-01', '2014-12-01',
      '2015-03-01'
    ];

    this._sessionScale = d3.scale.linear()
      .domain([0, sessions.length])
      .range([-45, 45]);

    this.sizeScale = d3.scale.linear()
      .domain([1,20])
      .range([2, 12]);

    this.sessionColours = _.zipObject(sessions, [
      colours.brown[0], colours.brown[1], colours.brown[2], colours.brown[3],
      colours.blue[0], colours.blue[1], colours.blue[2], colours.blue[3],
      colours.red[0], colours.red[1], colours.red[2], colours.blue[3],
      colours.green[0]
    ]);

    d3.csv('./data/dotplot/Sheet1-Reformatted.csv', function(error, data) {
      var parsed = _.map(data, parseNumerics);
      self.data = _.flattenDeep(_.map(parsed, function(d) {
        return _.map(values, function(v) {
          return {
            dateOfPrediction : d.dateOfPrediction,
            predictedRate : d.predictedRate,
            count : d[v],
            year : v
          };
        });
      }));
      self.transition('standard-dot');
    });
  },
  _setupPlot : function() {
    this._xScale = d3.scale.linear()
      .domain([2012, 2017])
      .range([40, 550]);
    this.yScale = d3.scale.linear()
      .domain([0,5])
      .range([470, 20]);

    this.longerRunPoint = 700;
  },
  xScale : function(v) {
    return v === 'longer_run' ? this.longerRunPoint : this._xScale(v);
  },
  sessionScale : function(v) {
    return this._sessionScale(this.sessions.indexOf(v));
  },
  renderStandardDot : function(dateOfPrediction) {
    var self = this;
    var mainDuration = 250;
    var years = d3.range(2012, 2020);

    var filtered = _.filter(this.data, function(d) {
      return d.dateOfPrediction === dateOfPrediction &&
        d.count > 0;
    });

    var separated = _.groupBy(_.flatten(_.map(filtered, function(d) {
      return _.times(d.count, function(i) {
        return _.extend(_.clone(d), {
          index : i
        });
      });
    })), 'year');

    var yearsRepresented = _.filter(parseNumerics(_.keys(separated, 'year')), function(n) {
      return isNumeric(n);
    });

    var xStretch = 0.25;
    this._xScale.domain([_.min(yearsRepresented) - xStretch - 0.25, _.max(yearsRepresented) + xStretch]);

    var r = 3.25;

    this.chart.selectAll('.point')
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();

    _.each(years, function(year) {
      var join = self.chart.selectAll('.singlepoint-' + year)
        .data(separated[year] || []);
      join.exit()
        .transition().duration(mainDuration)
        .attr('opacity', 0)
        .remove();
      join
        .attr('r', r - 1)
        .transition().duration(mainDuration)
        .attr('cx', function(d) {
          return self.xScale(d.year) +
            d.index * r * 2 - d.count * r;
        })
        .attr('cy', function(d) {
          return self.yScale(d.predictedRate);
        });
      join.enter().append('svg:circle')
        .classed('singlepoint singlepoint-'+year, true)
        .attr('opacity', 0)
        .attr('r', r - 1)
        .attr('cx', function(d) {
          return self.xScale(d.year) +
            d.index * r * 2 - d.count * r;
        })
        .attr('cy', function(d) {
          return self.yScale(d.predictedRate);
        })
        .transition().duration(mainDuration)
        .delay(function(d,i) {
          return i * 20;
        })
        .attr('opacity', 1);
    });

    var xAxis = d3.svg.axis()
      .outerTickSize(1)
      .tickFormat(d3.format('i'))
      .tickValues(yearsRepresented)
      .scale(this._xScale);
    this.chart.guarantee('.x-axis', 'svg:g')
      .classed('axis x-axis', true)
      .attr('transform', getTransformString(0, this.yScale.range()[0]))
      .transition().duration(mainDuration)
      .call(xAxis);

    var yAxis = d3.svg.axis()
      .outerTickSize(1)
      .orient('left')
      .scale(this.yScale);
    this.chart.guarantee('.y-axis', 'svg:g')
      .classed('axis y-axis', true)
      .attr('transform', getTransformString(this._xScale.range()[0], 0))
      .transition().duration(mainDuration)
      .call(yAxis);
  },
  renderMultiDot : function(sessions) {
    var self = this;
    var mainDuration = 250;

    sessions = sessions || this.sessions;

    var filtered = _.filter(this.data, function(d) {
      return sessions.indexOf(d.dateOfPrediction) > -1 && d.count > 0;
    });

    var yearsRepresented = _.filter(_.unique(_.pluck(filtered, 'year')), function(y) {
      return isNumeric(y);
    });

    var xStretch = 0.5;
    this._xScale.domain([_.min(yearsRepresented) - xStretch - 0.25, _.max(yearsRepresented) + xStretch]);

    this.chart.selectAll('.singlepoint')
      .transition().duration(mainDuration)
      .attr('cx', function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      })
      .remove();

    var join = this.chart.selectAll('.point')
      .data(filtered);
    join.enter().append('svg:circle')
      .classed('point', true);
    join
      .attr('r', function(d) {
        return self.sizeScale(d.count);
      })
      .attr('cx', function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      })
      .attr('cy', function(d) {
        return self.yScale(d.predictedRate);
      })
      .attr('fill', function(d) {
        return self.sessionColours[d.dateOfPrediction];
      });
    join.exit()
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();

    var xAxis = d3.svg.axis()
      .outerTickSize(1)
      .tickFormat(d3.format('i'))
      .tickValues(yearsRepresented)
      .scale(this._xScale);
    this.chart.guarantee('.x-axis', 'svg:g')
      .classed('axis x-axis', true)
      .attr('transform', getTransformString(0, this.yScale.range()[0]))
      .transition().duration(mainDuration)
      .call(xAxis);

    var yAxis = d3.svg.axis()
      .outerTickSize(1)
      .orient('left')
      .scale(this.yScale);
    this.chart.guarantee('.y-axis', 'svg:g')
      .classed('axis y-axis', true)
      .attr('transform', getTransformString(this._xScale.range()[0], 0))
      .transition().duration(mainDuration)
      .call(yAxis);
  },
  renderMedians : function(sessions, years) {
    var self = this;
    var mainDuration = 250;

    sessions = sessions || this.sessions;

    var filtered = _.filter(this.data, function(d) {
      if(years && years.indexOf(d.year) === -1) { return false; }
      return sessions.indexOf(d.dateOfPrediction) > -1 && d.count > 0;
    });

    var yearsRepresented = _.filter(_.unique(_.pluck(filtered, 'year')), function(y) {
      return isNumeric(y);
    });

    console.log(filtered);
    var medians = _.map(yearsRepresented, function(y) {

    });
    console.log(medians);

    var pointJoin = this.chart.selectAll('.point')
      .transition().duration(mainDuration);
  },
  initialState : 'uninitialized',
  states : {
    'uninitialized' : {
      _onExit : function() {
        this.interactive.recalculateSections();
      }
    },
    'loaded' : {
      _onEnter : function() {
        this.renderMultiDot();
      }
    },
    'standard-dot' : {
      _onEnter : function() {
        this.renderStandardDot('2012-01-01');
      }
    },
    'medians' : {
      _onEnter : function() {
        this.renderMedians();
      }
    }
  }
});

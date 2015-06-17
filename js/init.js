/* global _,d3,machina,math */
/* jshint multistr:true */
import {
  isNumeric, parseNumerics, getTransformString,
  Interactive, Header, ToggleGroup, TextSection, ColourLegend
} from 'framework';
import colours from 'econ_colours';


function dateToDecimalYear(date) {
  var year = date.getFullYear();
  var start = new Date(year, 0, 0);
  var end = new Date(year + 1, 0, 0);
  var span = end - start;
  var elapsed = date - start;
  return year + (elapsed / span);
}

var mainFSM = window.mainFSM = new machina.Fsm({
  texts : {
    'one'   : "Eight times a year, the Federal Reserve’s Open Market Committee \
               meets to consider its policy and amend the federal funds rate—the\
               interest rate at which the Federal Reserve lends money to other\
               banks. In December of 2008, they lowered the federal funds rate to\
               0.25%. They have not changed it since.",
    'two'   : "Since 2012, about four times a year the committee’s members make\
               predictions about where the federal funds rate will be at the end\
               of the next several years. These predictions are released in the form\
               of “dot plots” like the one above. Each dot represents one member's\
               prediction for the end of each year. This prediction was made in January 2012.",
    'three' : "The committee members are often quite bullish on the federal funds rate. \
               At the beginning of 2012, five (of 17) committee members expected the rate to be\
               two percent or more by the end of 2014; even as late as December 2012 (above),\
               one member still expected that. At the end of 2014, however, it remained\
               at 0.25%.",
    'four' :  "Let’s take a broader look at the Fed committee’s predictions. Instead\
               of showing a separate dot for each member of the committee, we’ll just\
               use larger dots for rates favoured by more members.",
    'five' :  "Here are all of the committee’s predictions for 2014. In 2012, most\
               members thought they would raise the rate by the end of 2014, but as\
               time wore on, their optimism faded. By September 2014, only one still\
               thought the rate would rise. (The slight drop in predictions in late 2014\
               is because the committee began allowing predictions in quarter point\
               intervals, rather than only half point.)",
    'six' :   "The story is pretty similar for 2015 and beyond: while the committee’s\
               predictions have always clustered towards the bottom of the chart, the high\
               end continues to fall.",
    'seven' : "Looking at the average of the committee’s predictions, we can see the trend\
               even more clearly."
  },
  predictionDateFormatter : function(date) {
    var inputDateFormat = d3.time.format('%Y-%m-%d');
    var outputDateFormat = d3.time.format('%B %Y');
    var parsedDate = inputDateFormat.parse(date);
    return outputDateFormat(parsedDate);
  },
  initialize : function() {
    var self = this;

    this.top = new Interactive('#header');
    this.interactive = new Interactive('#interactive');

    this.header = this.top.addSection({
      title : 'US Federal Reserve “Dot Plots”',
      subtitle : 'Federal Reserve Open Market Committee predictions'
    }, Header);

    this.mainToggles = this.top.addSection({
      name : 'main-selector',
      margin : [10, 20],
      height: 28,
      toggles : _.map(_.keys(this.texts), function(k,i) {
        return {
          name : 1 + i,
          state : k,
          click : function() { self.transition(k); }
        };
      }).concat([
        {
          name : 'Next',
          click : function() { self.handle('next'); }
        }
      ]),
    }, ToggleGroup);
    this.top.recalculateSections();

    this.colourLegendOptions = {
      name : 'colourLegend',
      grouped : true,
      margin: [10, 10, 0],
      title : 'Date of prediction:',
      indicator : 'circle',
      colours : [
        { title : '2012', colour : [colours.brown[0], colours.brown[1], colours.brown[2], colours.brown[3]] },
        { title : '2013', colour : [colours.blue[0], colours.blue[1], colours.blue[4], colours.blue[5]] },
        { title : '2014', colour : [colours.red[0], colours.red[1], colours.red[2], colours.red[3]] },
        { title : '2015', colour : [colours.green[0]] }
      ]
    };
    this.legend = this.interactive.addSection(this.colourLegendOptions, ColourLegend);

    this.chart = this.interactive.addSection({
      name : 'main-chart',
      margin : [0, 20],
      height: 500
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
      .range([2, 15]);

    this.sessionColours = _.zipObject(sessions, [
      colours.brown[0], colours.brown[1], colours.brown[2], colours.brown[3],
      colours.blue[0], colours.blue[1], colours.blue[4], colours.blue[5],
      colours.red[0], colours.red[1], colours.red[2], colours.red[3],
      colours.green[0]
    ]);

    var dotDataDfd = $.Deferred();
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
      // self.transition('one');
      dotDataDfd.resolve();
    });

    var rateDataDfd = $.Deferred();
    d3.csv('./data/fed-funds-rate.csv', function(error, data) {
      var dateFormat = d3.time.format('%Y-%m-%d');
      var parsed = _.map(data, function(d) {
        var ret = parseNumerics(d);
        var date = ret.date = dateFormat.parse(d.date);
        ret.year = dateToDecimalYear(date);
        return ret;
      });
      self.rateData = parsed;
      // console.log(parsed);
      rateDataDfd.resolve();
    });

    $.when(dotDataDfd, rateDataDfd).then(function() {
      self.transition('one');
    });
  },
  _setupPlot : function() {
    this._xScale = d3.scale.linear()
      .domain([2006, 2015])
      .range([40, 550]);
    this.yScale = d3.scale.linear()
      .domain([0,6])
      .range([470, 20]);

    this.longerRunPoint = 700;
  },
  xScale : function(v, xScale) {
    xScale = xScale || this._xScale;
    return v === 'longer_run' ? this.longerRunPoint : xScale(v);
  },
  sessionScale : function(v, sessionScale) {
    sessionScale = sessionScale || this._sessionScale;
    return sessionScale(this.sessions.indexOf(v));
  },
  renderRates : function(years) {
    var self = this;
    var mainDuration = 250;

    years = years || d3.range(2005, 2016);

    var line = d3.svg.line()
      .interpolate('step-after')
      .x(function(d) {
        // -0.5 so the axis marks are at the center of the year
        return self.xScale(d.year - 0.5);
      })
      .y(function(d) {
        return self.yScale(d.rate);
      });


    var join = this.chart.selectAll('.rate-line')
      .data([this.rateData]);
    join.enter().append('svg:path')
      .classed('rate-line', true)
      .attr('fill', 'none')
      .attr('stroke', colours.aquamarine[0])
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .attr('d', line);
    join.exit().remove();

    this._xScale.domain([d3.min(years), d3.max(years)]);

    join.transition().duration(mainDuration)
      .attr('opacity', 1)
      .attr('d', line);

    this.removeStandardDot(mainDuration);
    this.removeMultiDot(mainDuration);
    this.removeSummaryLines(mainDuration);
    this.renderAxes(years, mainDuration, {
      xAxisLabel : 'Year',
      yAxisLabel : 'Federal funds rate'
    });
    this.legend = this.interactive.replaceSection({
      text : 'Federal funds rate, 2005–present',
      margin : [10, 20]
    }, TextSection, this.legend);
    this.interactive.hideTooltip();
  },
  removeRates : function(mainDuration) {
    var self = this;

    var line = d3.svg.line()
      .interpolate('step-after')
      .x(function(d) {
        // -0.5 so the axis marks are at the center of the year
        return self.xScale(d.year - 0.5);
      })
      .y(function(d) {
        return self.yScale(d.rate);
      });

    var join = this.chart.selectAll('.rate-line')
      .data([this.rateData]);
    join.transition().duration(mainDuration)
      .attr('d', line)
      .attr('opacity', 0)
      .remove();
  },
  renderStandardDot : function(dateOfPrediction) {
    var self = this;
    var mainDuration = 250;
    var years = d3.range(2012, 2020).concat(['longer_run']);

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

    this.removeRates(mainDuration);
    this.removeMultiDot(mainDuration);
    this.removeSummaryLines(mainDuration);
    this.renderAxes(yearsRepresented, mainDuration, {
      xAxisLabel : 'Prediction target year',
      yAxisLabel : 'Predicted rate'
    });
    this.legend = this.interactive.replaceSection({
      text : 'Prediction of ' +
        this.predictionDateFormatter(dateOfPrediction),
      margin : [10, 20]
    }, TextSection, this.legend);
    this.interactive.hideTooltip();
  },
  removeStandardDot : function(mainDuration, options) {
    options = _.extend({}, options);

    var transition = this.chart.selectAll('.singlepoint')
      .transition().duration(mainDuration)
      .attr('opacity', 0);
    var endTransition = transition;

    if(options.cx) { transition.attr('cx', options.cx); }
    if(options.cy) { transition.attr('cy', options.cy); }

    if(options.finalCx) {
      var secondTransition = transition.transition().duration(mainDuration);
      endTransition = secondTransition;
      secondTransition.attr('cx', options.finalCx);
    }

    endTransition.remove();
  },
  renderMultiDot : function(sessions, years, initialAttrs) {
    var self = this;
    var mainDuration = 250;

    sessions = sessions || this.sessions;
    initialAttrs = _.extend({}, initialAttrs);

    var filtered = _.filter(this.data, function(d) {
      if(years && years.indexOf(d.year) === -1) { return false; }
      return sessions.indexOf(d.dateOfPrediction) > -1 && d.count > 0;
    });
    var yearsRepresented = _.filter(_.unique(_.pluck(filtered, 'year')), function(y) {
      return isNumeric(y);
    });

    var xStretch = 0.5;
    this._xScale.domain([_.min(yearsRepresented) - xStretch, _.max(yearsRepresented) + xStretch]);

    var sessionScaleSpread = 200 / yearsRepresented.length;
    this._sessionScale.range([-sessionScaleSpread, sessionScaleSpread]);

    // setup a circle scale
    var circScaleN = [20, 10, 1];
    var circScaleOffset = 60;
    var circScaleJoin = this.chart.selectAll('.circle-scale-mark')
      .data(circScaleN);
    circScaleJoin.enter().append('svg:circle')
      .attr('opacity', 0)
      .classed('circle-scale circle-scale-mark', true);
    circScaleJoin.exit().remove();
    circScaleJoin
      .attr('fill', 'none')
      .attr('stroke', colours.grey[6])
      .attr('r', function(d) { return self.sizeScale(d); })
      .attr('cx', 500)
      .attr('cy', function(d) { return circScaleOffset - self.sizeScale(d); })
      .transition().duration(mainDuration)
      .attr('opacity', 1);
    var circScaleTextJoin = this.chart.selectAll('.circle-scale-text')
      .data(circScaleN);
    circScaleTextJoin.enter().append('svg:text')
      .attr('opacity', 0)
      .classed('circle-scale circle-scale-text', true);
    circScaleTextJoin.exit().remove();
    circScaleTextJoin
      .text(function(d) { return d; })
      .attr({
        fill : colours.grey[4],
        'text-anchor' : 'middle',
        x : 500,
        y : function(d) { return circScaleOffset - self.sizeScale(d) * 2 - 1; },
        'font-size' : 11
      })
      .transition().duration(mainDuration)
      .attr('opacity', 1);
    this.chart.guarantee('.circle-scale-label', 'svg:text')
      .classed('circle-scale', true)
      .text('Members predicting')
      .attr({
        x : 480,
        y : circScaleOffset - circScaleN[0] + 9,
        fill : colours.grey[4],
        'font-style' : 'italic',
        'text-anchor' : 'end'
      });

    _.each(this.sessions, function(session) {
      var data = _.sortBy(
        _.filter(filtered, function(d) {
          return d.dateOfPrediction === session;
        }),
        function(d) {
          return d.predictedRate;
        }
      );
      var join = self.chart.selectAll('.point[data-session="'+session+'"]')
        .data(data);
      var joinEnter = join.enter().append('svg:circle')
        .classed('point', true)
        .attr('opacity', 0)
        .attr('data-session', session);
      _.each(initialAttrs, function(fn, attr) { joinEnter.attr(attr, fn); });

      join
        .on('mouseenter', function(d) {
          self.interactive.showTooltip([
              'Prediction of ' + self.predictionDateFormatter(d.dateOfPrediction),
              d.count + ' predictions'
            ], {
              x : self.xScale(d.year) + self.sessionScale(d.dateOfPrediction) + self.interactive.margin.left,
              y : self.yScale(d.predictedRate)
            }, {
              offset : 10
            });
        })
        .on('mouseleave', function(d) {
          self.interactive.hideTooltip();
        })
        .transition().duration(mainDuration)
        .delay(function(d, i) {
          return i * 15 + sessions.indexOf(session) * 60;
        })
        .attr('opacity', 1)
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
    });

    this.removeRates(mainDuration);
    this.removeSummaryLines(mainDuration);
    this.removeStandardDot(mainDuration, {
      cx : function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      }
    });
    this.renderAxes(yearsRepresented, mainDuration, {
      bracketAxis : true,
      xAxisLabel : 'Prediction target year',
      yAxisLabel : 'Predicted rate'
    });
    this.legend = this.interactive.replaceSection(this.colourLegendOptions, ColourLegend, this.legend);
    this.interactive.hideTooltip();
  },
  removeMultiDot : function(mainDuration, attrFns) {
    attrFns = _.extend({}, attrFns);

    var transition = this.chart.selectAll('.point')
      .transition().duration(mainDuration)
      .attr('opacity', 0);

    _.each(attrFns, function(fn, attr) {
      transition.attr(attr, fn);
    });

    transition.remove();

    this.chart.selectAll('.circle-scale')
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
  },
  getSummaries : function(summaryFunction) {
    var self = this;

    summaryFunction = summaryFunction || 'mean';

    var filtered = _.filter(this.data, function(d) {
      return self.sessions.indexOf(d.dateOfPrediction) > -1 && d.count > 0;
    });

    var yearGroups = _.groupBy(filtered, 'year');

    var indexedSummary = {};
    var summary = _.map(yearGroups, function(v, year) {
      var predictions = _.groupBy(v, 'dateOfPrediction');
      var valueArrays = _.mapValues(predictions, function(counts) {
        return _.flatten(_.map(counts, function(d) {
          return _.times(d.count, function() {
            return d.predictedRate;
          });
        }));
      });
      return _.map(valueArrays, function(d, k) {
        var ret = {
          year : year,
          dateOfPrediction : k,
          summaryValue : math[summaryFunction](d)
        };
        if(!indexedSummary[year]) { indexedSummary[year] = {}; }
        indexedSummary[year][k] = ret;
        return ret;
      });
    });

    return {
      yearGroups : yearGroups,
      summary : summary,
      indexedSummary : indexedSummary
    };
  },
  highlightToggle : function() {
    var state = this.state;
    this.mainToggles.selectAll('.toggle')
      .classed('toggle-highlight', function() {
        return this.getAttribute('data-state') === state;
      });
  },
  renderSummaryLines : function(sessions, years, summaryFunction) {
    var self = this;
    var mainDuration = 250;

    summaryFunction = summaryFunction || 'mean';

    sessions = sessions || this.sessions;

    var filtered = _.filter(this.data, function(d) {
      if(years && years.indexOf(d.year) === -1) { return false; }
      return sessions.indexOf(d.dateOfPrediction) > -1 && d.count > 0;
    });

    var yearGroups = _.groupBy(filtered, 'year');

    var yearsRepresented = _.filter(_.keys(yearGroups), isNumeric);

    var xStretch = 0.5;
    var initialXScale = this._xScale.copy();
    this._xScale.domain([_.min(yearsRepresented) - xStretch, +_.max(yearsRepresented) + xStretch]);

    var sessionScaleSpread = 200 / yearsRepresented.length;
    var initialSessionScale = this._sessionScale.copy();
    this._sessionScale.range([-sessionScaleSpread, sessionScaleSpread]);

    var indexedSummary = {};
    var summary = _.map(yearGroups, function(v, year) {
      var predictions = _.groupBy(v, 'dateOfPrediction');
      var valueArrays = _.mapValues(predictions, function(counts) {
        return _.flatten(_.map(counts, function(d) {
          return _.times(d.count, function() {
            return d.predictedRate;
          });
        }));
      });
      return _.map(valueArrays, function(d, k) {
        var ret = {
          year : year,
          dateOfPrediction : k,
          summaryValue : math[summaryFunction](d)
        };
        if(!indexedSummary[year]) { indexedSummary[year] = {}; }
        indexedSummary[year][k] = ret;
        return ret;
      });
    });

    var intermediateLine = d3.svg.line()
      .x(function(d) {
        return self.xScale(d.year, initialXScale) +
          self.sessionScale(d.dateOfPrediction, initialSessionScale);
      })
      .y(function(d) {
        return self.yScale(d.summaryValue);
      });
    var finalLine = d3.svg.line()
      .x(function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      })
      .y(function(d) {
        return self.yScale(d.summaryValue);
      });

    var summaryLineJoin = this.chart.selectAll('.summary-line')
      .data(summary);
    summaryLineJoin.exit()
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
    summaryLineJoin.enter().append('svg:path')
      .classed('summary-line', true)
      .attr('opacity', 0);
    summaryLineJoin
      .attr('stroke', 'black')
      .attr('fill', 'none')
      .transition().duration(mainDuration)
      .attr('d', intermediateLine)
      // .transition().duration(mainDuration)
      .attr('opacity', 1)
      .attr('d', finalLine);

    var summaryDotJoin = this.chart.selectAll('.summary-dot')
      .data(_.flatten(summary));
    summaryDotJoin.exit()
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
    summaryDotJoin.enter().append('svg:circle')
      .classed('summary-dot', true)
      .attr('opacity', 0);
    summaryDotJoin
      .attr('r', 3)
      .attr('fill', function(d) {
        return self.sessionColours[d.dateOfPrediction];
      })
      // calling .order() makes sure the dots render over the lines
      .order()
      .transition().duration(mainDuration)
      .attr('opacity', 1)
      // .attr('cx', function(d) {
      //   return self.xScale(d.year, initialXScale) +
      //     self.sessionScale(d.dateOfPrediction, initialSessionScale);
      // })
      .attr('cy', function(d) {
        return self.yScale(d.summaryValue);
      })
      // .transition().duration(mainDuration)
      .attr('cx', function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      });

    this.removeRates(mainDuration);
    this.removeStandardDot(mainDuration, {
      cx : function(d) {
        return self.xScale(d.year, initialXScale) +
          self.sessionScale(d.dateOfPrediction, initialSessionScale);
      },
      finalCx : function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      },
      cy : function(d) {
        return self.yScale(indexedSummary[d.year][d.dateOfPrediction].summaryValue);
      }
    });
    this.removeMultiDot(mainDuration, {
      cx : function(d) {
        return self.xScale(d.year, initialXScale) +
          self.sessionScale(d.dateOfPrediction, initialSessionScale);
      },
      finalCx : function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      },
      cy : function(d) {
        return self.yScale(indexedSummary[d.year][d.dateOfPrediction].summaryValue);
      }
    });
    this.renderAxes(yearsRepresented, mainDuration, {
      bracketAxis : true,
      xAxisLabel : 'Predicted year target',
      yAxisLabel : 'Predicted rate'
    });
    this.legend = this.interactive.replaceSection(this.colourLegendOptions, ColourLegend, this.legend);
    this.interactive.hideTooltip();
  },
  removeSummaryLines : function(mainDuration, options) {
    this.chart.selectAll('.summary-line')
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
    this.chart.selectAll('.summary-dot')
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
  },
  renderAxes : function(yearsRepresented, mainDuration, options) {
    var self = this;
    options = _.extend({}, options);

    // we may have a two-step transition
    var initialXAxis;
    if(options.initialXScale) {
      initialXAxis = d3.svg.axis()
        .outerTickSize(options.bracketAxis ? 0 : 1)
        .tickFormat(d3.format('i'))
        .tickValues(yearsRepresented)
        .scale(options.initialXScale);
    }
    var xAxis = d3.svg.axis()
      .outerTickSize(options.bracketAxis ? 0 : 1)
      .tickFormat(d3.format('i'))
      .tickValues(yearsRepresented)
      .scale(this._xScale);
    var xTransition = this.chart.guarantee('.x-axis', 'svg:g')
      .classed('axis x-axis', true)
      .attr('transform', getTransformString(0, this.yScale.range()[0]))
      .transition().duration(mainDuration);
    if(options.initialXScale) {
      xTransition.call(initialXAxis);
      xTransition = xTransition.transition().duration(mainDuration);
    }
    xTransition.call(xAxis);

    var bracketJoin = this.chart.selectAll('.bracket')
      .data(options.bracketAxis ? yearsRepresented : []);
    bracketJoin.enter().append('svg:path')
      .classed('bracket', true)
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('transform', function(d) {
        return getTransformString(self.xScale(d), self.yScale.range()[0]);
      })
      .attr('opacity', 0);
    bracketJoin.exit()
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
    bracketJoin
      .transition().duration(mainDuration)
      .attr('transform', function(d) {
        return getTransformString(self.xScale(d), self.yScale.range()[0]);
      })
      .attr('d', function(d) {
        var range = self._sessionScale.range();
        var domain = self._sessionScale.domain();
        // this is half the width of one session column
        var halfSpread = range[1] / (domain[1] - domain[0]);
        var left = range[0] - halfSpread, right = range[1] + halfSpread;
        return 'M ' + left + ' -4 L ' +
          left + ' 4 L ' + right + ' 4 L ' +
          right + ' -4';
      })
      .attr('opacity', 1);

    var yAxis = d3.svg.axis()
      .outerTickSize(1)
      .orient('left')
      .scale(this.yScale);
    this.chart.guarantee('.y-axis', 'svg:g')
      .classed('axis y-axis', true)
      .attr('transform', getTransformString(this._xScale.range()[0], 0))
      .transition().duration(mainDuration)
      .call(yAxis);

    function scaleMidPoint(scale) {
      var range = scale.range();
      return Math.abs(range[1] - range[0]) / 2 + d3.min(range);
    }
    this.chart.guarantee('.x-axis-label', 'svg:text')
      .classed('axis-label', true)
      .text(options.xAxisLabel)
      // .transition().duration(mainDuration)
      .attr('transform',
        getTransformString(scaleMidPoint(this._xScale), this.yScale.range()[0] + 38)
      );

    this.chart.guarantee('.y-axis-label', 'svg:text')
      .classed('axis-label', true)
      .text(options.yAxisLabel)
      // .attr('transform', 'rotate(-90)')
      // .transition().duration(mainDuration)
      .attr('transform',
        getTransformString(0, scaleMidPoint(this.yScale)) +
        'rotate(-90)');
    this.interactive.recalculateSections();
  },
  setText : function(key) {
    document.getElementById('frametext').innerHTML = this.texts[key];
  },
  initialState : 'uninitialized',
  states : {
    'uninitialized' : {
      _onExit : function() {
        this.interactive.recalculateSections();
      }
    },
    'multiDot' : {
      _onEnter : function() {
        this.renderMultiDot();
      }
    },
    'standard-dot' : {
      _onEnter : function() {
        this.renderStandardDot('2012-01-01');
      }
    },
    'means' : {
      _onEnter : function() {
        this.renderSummaryLines(undefined, undefined, 'mean');
      }
    },
    'one' : {
      _onEnter : function() {
        this.interactive.recalculateSections();
        this.highlightToggle();
        this.renderRates();
        this.setText('one');
      },
      next : function() {
        this.transition('two');
      }
    },
    'two' : {
      _onEnter : function() {
        this.highlightToggle();
        this.renderStandardDot('2012-01-01');
        this.setText('two');
      },
      next : function() {
        this.transition('three');
      }
    },
    'three' : {
      _onEnter : function() {
        this.highlightToggle();
        this.renderStandardDot('2012-12-01');
        this.setText('three');
      },
      next : function() {
        this.transition('four');
      }
    },
    'four' : {
      _onEnter : function() {
        this.highlightToggle();
        this.renderMultiDot(['2012-12-01']);
        this.legend = this.interactive.replaceSection({
          text : 'Prediction of ' + this.predictionDateFormatter('2012-12-01'),
          margin : [10, 20]
        }, TextSection, this.legend);
        this.setText('four');
      },
      next : function() {
        this.transition('five');
      }
    },
    'five' : {
      _onEnter : function() {
        this.highlightToggle();
        this.renderMultiDot(undefined, [2014]);
        this.setText('five');
      },
      next : function() {
        this.transition('six');
      }
    },
    'six' : {
      _onEnter : function() {
        this.highlightToggle();
        this.renderSummaryLines(undefined, [2014]);
        // this.renderMultiDot(undefined, [2015, 2016, 2017]);
        this.setText('six');
      },
      next : function() {
        this.transition('seven');
      }
    },
    'seven' : {
      _onEnter : function() {
        this.highlightToggle();
        this.renderSummaryLines();
        this.setText('seven');
      },
      next : function() {
        this.transition('eight');
      }
    },
  }
});

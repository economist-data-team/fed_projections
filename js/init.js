/* global _,d3,machina,math */
/* jshint multistr:true */
import {
  isNumeric, parseNumerics, getTransformString,
  Interactive, Header, ToggleGroup
} from 'framework';
import colours from 'econ_colours';


var mainFSM = window.mainFSM = new machina.Fsm({
  texts : {
    'one'   : "Eight times a year, the Federal Reserve’s Open Market Committee \
               meets to consider its policy and amend the federal funds rate—\
               the interest rate at which the Federal Reserve lends money to other\
               banks. In December of 2008, they lowered the federal funds rate to\
               0.25. They have not changed it since.",
    'two'   : "Since 2012, about four times a year the committee’s members make\
               predictions about where the federal funds rate will be at the end\
               of the next several years. These predictions are released in the form\
               of ‘dot plots’ like the one above. Each dot represents one member's\
               prediction for the end of each year. This prediction was made in January 2012.",
    'three' : "The committee members are often quite bullish on the federal funds rate. \
               At the beginning of 2012, five (of 17) committee members expected the rate to be\
               two percent or more by the end of 2014; even as late as December 2012 (above),\
               one member still expected that. At the end of 2014, however, it remained\
               at 0.25.",
    'four' :  "Let’s take a broader look at the Fed committee’s predictions. Instead\
               of showing a separate dot for each member of the committee, we’ll just\
               use larger dots for rates favoured by more members.",
    'five' :  "Here are all of the committee’s predictions for 2014. In 2012, most\
               members thought they would raise the rate by the end of 2014, but as\
               time wore on, their optimism faded. By September 2014, only one still\
               thought the rate would rise. (The slight drop in predictions in late 2014\
               is because the committee began allowing predictions in quarter point\
               intervals, rather than only half point.)",
    'six' :   "The story is pretty similar for 2015."
  },
  initialize : function() {
    var self = this;

    this.interactive = new Interactive('#interactive');

    this.header = this.interactive.addSection({
      title : 'Irrational exuberance',
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
          click : function() { self.transition('multiDot'); }
        }, {
          name : 'Means',
          state : 'means',
          click : function() { self.transition('means'); }
        }
      ]
    }, ToggleGroup);

    this.chart = this.interactive.addSection({
      name : 'main-chart',
      margin : [20],
      height: 520
    });

    this.mainDriver = this.interactive.addSection({
      name : 'main-selector',
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
      self.transition('one');
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

    this.chart.selectAll('.point')
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();

    this.chart.selectAll('.median-line')
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
    this.chart.selectAll('.median-dot')
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

    this.renderAxes(yearsRepresented, mainDuration);
  },
  renderMultiDot : function(sessions, years) {
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

    var xStretch = 0.5;
    this._xScale.domain([_.min(yearsRepresented) - xStretch, _.max(yearsRepresented) + xStretch]);

    var sessionScaleSpread = 200 / yearsRepresented.length;
    this._sessionScale.range([-sessionScaleSpread, sessionScaleSpread]);

    this.chart.selectAll('.singlepoint')
      .transition().duration(mainDuration)
      .attr('cx', function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      })
      .remove();

    var join = this.chart.selectAll('.point')
      .data(filtered);
    join.enter().append('svg:circle')
      .classed('point', true)
      .attr('opacity', 0);
    join
      .transition().duration(mainDuration)
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

    // remove median lines
    this.chart.selectAll('.median-line')
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
    this.chart.selectAll('.median-dot')
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();

    this.renderAxes(yearsRepresented, mainDuration);
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

    // var yearsRepresented = _.filter(_.unique(_.pluck(filtered, 'year')), function(y) {
    //   return isNumeric(y);
    // });

    var yearsRepresented = _.filter(_.keys(yearGroups), isNumeric);

    var xStretch = 0.5;
    this._xScale.domain([_.min(yearsRepresented) - xStretch - 0.25, _.max(yearsRepresented) + xStretch]);

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

    var line = d3.svg.line()
      .x(function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      })
      .y(function(d) {
        return self.yScale(d.summaryValue);
      });

    var summaryLineJoin = this.chart.selectAll('.median-line')
      .data(summary);
    summaryLineJoin.exit()
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
    summaryLineJoin.enter().append('svg:path')
      .classed('median-line', true)
      .attr('opacity', 0);
    summaryLineJoin
      .attr('stroke', 'black')
      .attr('fill', 'none')
      .transition().duration(mainDuration)
      .attr('opacity', 1)
      .attr('d', line);

    var summaryDotJoin = this.chart.selectAll('.median-dot')
      .data(_.flatten(summary));
    summaryDotJoin.exit()
      .transition().duration(mainDuration)
      .attr('opacity', 0)
      .remove();
    summaryDotJoin.enter().append('svg:circle')
      .classed('median-dot', true)
      .attr('opacity', 0);
    summaryDotJoin
      .attr('r', 2.5)
      .transition().duration(mainDuration)
      .attr('cx', function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      })
      .attr('cy', function(d) {
        return self.yScale(d.summaryValue);
      })
      .attr('opacity', 1);

    // collapse points to their position on median lines
    this.chart.selectAll('.point')
      .transition().duration(mainDuration)
      .attr('cy', function(d) {
        return self.yScale(indexedSummary[d.year][d.dateOfPrediction].summaryValue);
      })
      .attr('opacity', 0)
      .remove();

    // collapse a dot plot to its position on a median line
    this.chart.selectAll('.singlepoint')
      .transition().duration(mainDuration)
      .attr('cx', function(d) {
        return self.xScale(d.year) + self.sessionScale(d.dateOfPrediction);
      })
      .attr('cy', function(d) {
        return self.yScale(indexedSummary[d.year][d.dateOfPrediction].summaryValue);
      })
      .attr('opacity', 0)
      .remove();

    this.renderAxes(yearsRepresented, mainDuration);
  },
  renderAxes : function(yearsRepresented, mainDuration) {
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
        this.setText('one');
      },
      next : function() {
        this.transition('two');
      }
    },
    'two' : {
      _onEnter : function() {
        this.renderStandardDot('2012-01-01');
        this.setText('two');
      },
      next : function() {
        this.transition('three');
      }
    },
    'three' : {
      _onEnter : function() {
        this.renderStandardDot('2012-12-01');
        this.setText('three');
      },
      next : function() {
        this.transition('four');
      }
    },
    'four' : {
      _onEnter : function() {
        this.renderMultiDot(undefined, [2014]);
        this.setText('four');
      },
      next : function() {
        this.transition('five');
      }
    },
    'five' : {
      _onEnter : function() {
        this.setText('five');
      },
      next : function() {
        this.transition('six');
      }
    },
    'six' : {
      _onEnter : function() {
        this.setText('six');
      },
      next : function() {
        this.transition('seven');
      }
    },
  }
});

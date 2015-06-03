/* global _,d3,machina */
import {
  parseNumerics,
  Interactive, Header
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

    this.chart = this.interactive.addSection({
      name : 'main-chart',
      margin : [20],
      height: 560
    });

    this._setupPlot();

    var values = [2012, 2013, 2014, 2015, 2016, 2017, "longer_run"];
    var sessions = {
      '2012-01-01' : { colour : 'red' }
    };

    d3.csv('./data/dotplot/Sheet1-Reformatted.csv', function(error, data) {
      var parsed = _.map(data, parseNumerics);
      self.data = _.flattenDeep(_.map(parsed, function(d) {
        return _.map(values, function(v) {
          return _.times(d[v], function() {
            return {
              dateOfPrediction : d.dateOfPrediction,
              predictedRate : d.predictedRate,
              // count : d[v],
              year : v
            };
          });
        });
      }));
      console.log(self.data);
      self.transition('loaded');
    });
  },
  _setupPlot : function() {
    this.xScale = d3.scale.linear()
      .domain([2012, 2017])
      .range([80, 545]);
    this.yScale = d3.scale.linear()
      .domain([0,5])
      .range([500, 20]);
  },
  initialState : 'uninitialized',
  states : {
    'uninitialized' : {
      _onExit : function() {
      }
    },
    'loaded' : {
      _onEnter : function() {
        var self = this;

        console.log('filtered', _.filter(this.data, function(d) {
            return d.dateOfPrediction === '2012-01-01';
          }));

        var join = this.chart.selectAll('.point')
          .data(_.filter(this.data, function(d) {
            return d.dateOfPrediction === '2012-01-01';
          }));
        join.enter().append('svg:circle')
          .classed('point', true);
        join
          .attr('r', 3)
          .attr('cx', function(d) {
            return self.xScale(d.year);
          })
          .attr('cy', function(d) {
            return self.yScale(d.predictedRate);
          });
        this.interactive.recalculateSections();
      }
    }
  }
});

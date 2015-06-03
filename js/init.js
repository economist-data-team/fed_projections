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

    d3.csv('./data/dotplot/Sheet1-Reformatted.csv', function(error, data) {
      var parsed = _.map(data, parseNumerics);
      self.data = _.flatten(_.map(parsed, function(d) {
        return _.map(values, function(v) {
          return {
            dateOfPrediction : d.dateOfPrediction,
            predictedRate : d.predictedRate,
            year : v,
            count : d[v]
          };
        });
      }));
      console.log(self.data);
      self.transition('loaded');
    });
  },
  _setupPlot : function() {
    this.xScale = d3.scale.linear()
      .domain([2012, 2017])
      .range([0, 595]);
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

        var join = this.chart.selectAll('.point')
          .data(this.data);
        join.enter().append('svg:circle')
          .classed('point', true);
        join
          .attr('r', function(d) {
            return d.`count;
          })
          .attr('cx', function(d) {
            return self.xScale(d.year);
          })
          .attr('cy', function(d) {
            return self.yScale(d.predictedRate);
          });

      }
    }
  }
});

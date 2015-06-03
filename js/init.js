/* global _,d3,machina */
import {
  Interactive, Header
} from 'framework';
import { parties, partyOrder, ParliamentPlot } from 'parliament_plot';
import colours from 'econ_colours';


var mainFSM = window.mainFSM = new machina.Fsm({
  initialize : function() {
    var self = this;

    this.interactive = new Interactive('#interactive');

    this.header = this.interactive.addSection({
      title : 'Title',
      subtitle : 'Subtitle'
    }, Header);

    this.chart = this.interactive.addSection({
      name : 'main-chart',
      margin : [20],
      height: 560
    });

    this._setupPlot();
  },
  _setupPlot : function() {
  },
  initialState : 'uninitialized',
  states : {
    'uninitialized' : {
      _onExit : function() {
      }
    }
  }
});

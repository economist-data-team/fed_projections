// EEEEEEEEEEEEEEEEEEEEEERRRRRRRRRRRRRRRRR   IIIIIIIIII      CCCCCCCCCCCCC
// E::::::::::::::::::::ER::::::::::::::::R  I::::::::I   CCC::::::::::::C
// E::::::::::::::::::::ER::::::RRRRRR:::::R I::::::::I CC:::::::::::::::C
// EE::::::EEEEEEEEE::::ERR:::::R     R:::::RII::::::IIC:::::CCCCCCCC::::C
//   E:::::E       EEEEEE  R::::R     R:::::R  I::::I C:::::C       CCCCCC
//   E:::::E               R::::R     R:::::R  I::::IC:::::C              
//   E::::::EEEEEEEEEE     R::::RRRRRR:::::R   I::::IC:::::C              
//   E:::::::::::::::E     R:::::::::::::RR    I::::IC:::::C              
//   E:::::::::::::::E     R::::RRRRRR:::::R   I::::IC:::::C              
//   E::::::EEEEEEEEEE     R::::R     R:::::R  I::::IC:::::C              
//   E:::::E               R::::R     R:::::R  I::::IC:::::C              
//   E:::::E       EEEEEE  R::::R     R:::::R  I::::I C:::::C       CCCCCC
// EE::::::EEEEEEEE:::::ERR:::::R     R:::::RII::::::IIC:::::CCCCCCCC::::C
// E::::::::::::::::::::ER::::::R     R:::::RI::::::::I CC:::::::::::::::C
// E::::::::::::::::::::ER::::::R     R:::::RI::::::::I   CCC::::::::::::C
// EEEEEEEEEEEEEEEEEEEEEERRRRRRRR     RRRRRRRIIIIIIIIII      CCCCCCCCCCCCC

// the Economist's reusable infographics codebase

"use strict";
var eric = eric || {};

eric.help = function () {
  var log = 'The Economist\'s reusable infographics codebase\n' +
            'Eric methods:\n' +
            '\n' +
            'eric.E(selection);\n' +
            'Returns a selection based on a class or ID entered as the argument\n' +
            'Argument is a string that starts with . for class or # for ID\n' +
            'If there is more than one element in the selection, only the first element will be returned\n' +
            '\n' +
            'eric.touchDevice.ami();\n' +
            'Returns true if used on touch device\n' +
            '\n' +
            'eric.math.round(number, decimal);\n' +
            'Returns rounded number to amount of decimals\n' +
            '\n' +
            'eric.math.comma(number);\n' +
            'Returns number with commas\n' +
            '\n' +
            'eric.getMousePos();\n' +
            'Returns object containing .x and .y mouse positions\n' +
            '\n' +
            'eric.tooltip:\n' +
            '   eric.tooltip.spec\n' +
            '   Returns the tooltip api object\n'+
            '\n' +
            '   eric.tooltip.include(parent)\n' +
            '   Add a tooltip to an element\n' +
            '\n' +
            '   eric.tooltip.select(tooltip, parent)\n' +
            '   Select a tooltip to make changes to it. Parent node is needed if you have more than one tooltip\n' +
            '\n' +
            '   eric.tooltip.add(htmlAsString)\n' +
            '   Add html to tooltip\n' +
            '\n' +
            '   eric.tooltip.style(style)\n' +
            '   Add inline styles to tooltip. Argument is a string consisting of style:Value or an array of strings for multiple styles\n' +
            '\n' +
            '   eric.tooltip.show()\n' +
            '   Show a tooltip\n' +
            '\n' +
            '   eric.tooltip.hide()\n' +
            '   Hide a tooltip\n' +
            '\n' +
            '   eric.tooltip.update(update, show)\n' +
            '   Update is an array: [elm, update]. Use array of arrays for multiple updates. Show = True to show tooltip after update\n';
  console.log(log);
};

eric.touchDevice = (function(){
  var spec = {};
  spec.ami = function() {
    try {  
      document.createEvent("TouchEvent");  
      return true;  
    }
    catch (e) {  
      return false;  
    }
  }
  return spec;
}());

eric.math = (function(){
  var spec = {};
  spec.round = function(number ,decimals) {
    decimals = decimals || 0;
    return number.toFixed(decimals);
  }
  spec.comma = function(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return spec;
}());

// add mouse position event listener
eric.getMousePos = function(e) {
  var coords = {};
  if (!e) var e = window.event;
  if (e.pageX || e.pageY)   {
    coords.x = e.pageX;
    coords.y = e.pageY;
  }
  else if (e.clientX || e.clientY)  {
    coords.x = e.clientX + document.body.scrollLeft
      + document.documentElement.scrollLeft;
    coords.y = e.clientY + document.body.scrollTop
      + document.documentElement.scrollTop;
  }
  eric.mouseCoords.x = coords.x;
  eric.mouseCoords.y = coords.y;
  return coords;
}

eric.getElementPos = function(element) {
  var elmPos = {},
      body = document.body,
      win = document.defaultView,
      docElem = document.documentElement,
      box = document.createElement('div');
  box.style.paddingLeft = box.style.width = "1px";
  body.appendChild(box);
  var isBoxModel = box.offsetWidth == 2;
  body.removeChild(box);
  box = element.getBoundingClientRect();
  var clientTop  = docElem.clientTop  || body.clientTop  || 0,
      clientLeft = docElem.clientLeft || body.clientLeft || 0,
      scrollTop  = win.pageYOffset || isBoxModel && docElem.scrollTop  || body.scrollTop,
      scrollLeft = win.pageXOffset || isBoxModel && docElem.scrollLeft || body.scrollLeft;

  elmPos.top = box.top  + scrollTop  - clientTop;
  elmPos.left = box.left + scrollLeft - clientLeft
  return elmPos;
}

// mouse coordinates accessible to all eric methods
eric.mouseCoords = {
  x: 0,
  y: 0
}

eric.E = function (selection) {
  var selectionArr = selection.split(' '),
  returnObj;
  for (var i = 0; i < selectionArr.length; i++) {
    var type = selectionArr[i].substring(0, 1),
    selector = selectionArr[i].substring(1);
    if (type === '#') {
      returnObj = (returnObj === undefined) ? document.getElementById(selector) : returnObj.getElementById(selector);

    }
    else if (type === '.') {
      selector = (selector.indexOf('.') > -1) ? selector.replace(/\./g, " ") : selector;
      returnObj = (returnObj === undefined) ? document.getElementsByClassName(selector)[0] : returnObj.getElementsByClassName(selector)[0];
    }
    else {
      return false;
    }
  }
  return returnObj;
}

eric.tooltip = new function() {

  var addSheet = (function(){
    var styleString=".eric{ font-family:officina, arial; font-size:15px; } .ericTooltip{-webkit-border-radius:5px; -moz-border-radius:5px; border-radius:5px; visibility:hidden; width:auto; height:auto; position:absolute; top:0; left:0; padding:10px; /*display:none;*/ background-color: grey; color: white; z-index: 500; }",
        head = document.getElementsByTagName("head")[0],
        style = document.createElement("style");

    style.setAttribute("type","text/css");
    var styleNode = document.createTextNode(styleString);
    style.styleSheet ? style.styleSheet.cssText = styleString : style.appendChild(styleNode),
    head.appendChild(style);
  })();

  // api for tooltip
  this.spec = {
    id: 0,
    selection: ''
  }

  this.addToSpec = function(obj, val) {
    eric.tooltip.spec[obj] = val;
    return this;
  }

  this.select = function(selection, parent) {
    if(parent) { eric.tooltip.addToSpec('parent', parent); }
    eric.tooltip.addToSpec('selection', selection);
    return this;
  }

  this.include = function(obj) {
    obj = obj || document.body;
    eric.tooltip.addToSpec('parent', obj).addToSpec('parentWidth', obj.offsetWidth).addToSpec('parentHeight', obj.offsetHeight);
    obj.style.position = 'relative';
    eric.tooltip.spec.id++;
    if (eric.tooltip.spec.parent.getAttribute("onmousemove") !== "eric.getMousePos(event);") {
      eric.tooltip.spec.parent.setAttribute("onmousemove","eric.getMousePos(event);");
    }
    
    function create(htmlStr) {
      var frag = document.createDocumentFragment(),
          temp = document.createElement('div');
      temp.innerHTML = htmlStr;
      while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
      }
      return frag;
    }
    // add tooltip
    var fragment = create('<div class="eric ericTooltip ericTooltip' + eric.tooltip.spec.id + '"></div>');
    obj.appendChild(fragment);

    return this;
  }

  this.add = function(elm) {
    var html = eric.tooltip.spec.selection.innerHTML + elm;
    eric.tooltip.spec.selection.innerHTML = html;
    return this;
  }

  this.style = function(style) {
    if (style instanceof Array) {
      for (var i = 0; i < style.length; i++) {
        var twoStyle = style[i].split(":");
        eric.tooltip.spec.selection.style[twoStyle[0]] = twoStyle[1];
      }
    }
    else {
      var oneStyle = style.split(":");
      eric.tooltip.spec.selection.style[oneStyle[0]] = oneStyle[1];
    }
    return this;
  }

  this.show = function() {
    var exW = 5, exH = 5;
    var rect = eric.getElementPos(eric.tooltip.spec.parent);
    eric.tooltip.addToSpec('parentWidth', eric.tooltip.spec.parent.offsetWidth);
    eric.tooltip.addToSpec('parentHeight', eric.tooltip.spec.parent.offsetHeight);
    eric.tooltip.addToSpec('selectionWidth', eric.tooltip.spec.selection.offsetWidth);
    eric.tooltip.addToSpec('selectionHeight', eric.tooltip.spec.selection.offsetHeight);
    if (eric.mouseCoords.x > (eric.tooltip.spec.parentWidth / 2) + rect.left ) {
      exW = exW - eric.tooltip.spec.selectionWidth - 10;
    }
    if (eric.mouseCoords.y > (eric.tooltip.spec.parentHeight / 2) + rect.top ) {
      exH = exH - eric.tooltip.spec.selectionHeight - 10;
    }
    eric.tooltip.style(['left:' + ((eric.mouseCoords.x + exW) - rect.left)  + 'px', 'top:' + ((eric.mouseCoords.y + exH) - rect.top)  + 'px']);
    eric.tooltip.style('visibility:visible');
    return this;
  }

  this.hide = function() {
    eric.tooltip.style('visibility:hidden');
    return this;
  }

  this.update = function(update, show) {
    for (var i = 0; i < update.length; i++) {
      update[i][0].innerHTML = update[i][1];
    }
    if (show) {
      eric.tooltip.show();
    }
    return this;
  }
}
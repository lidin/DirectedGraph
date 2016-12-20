//----------------------------------------//
//-- Events
//----------------------------------------//

/*-- Event --*/

function Event(sender) {
  this._sender = sender;
  this._listeners = [];
}

Event.prototype.attach = function(listener) {
  this._listeners.push(listener);
};
Event.prototype.notify = function (args) {
  this._listeners.forEach(function (l) { l(this._sender, args); });
};

//----------------------------------------//
//-- Model
//----------------------------------------//

/*-- DirectedGraphModel --*/

function DirectedGraphModel() {
  this.nodes = [];
  this.edges = [];

  this.didAddNode = new Event(this);
  this.didAddEdge = new Event(this);
  this.didRemoveNode = new Event(this);
  this.didRemoveEdge = new Event(this);
};

DirectedGraphModel.prototype.pushUniqueNode = function(id) {
  const isContained = function(n) { return n == id; };
  if (this.nodes.filter(isContained).length == 0) {
    this.nodes.push(id);
    this.didAddNode.notify(id);
  }
};
DirectedGraphModel.prototype.addEdge = function(fromId, toId, propability) {
  const edgeExist = function(e) { return e.from == fromId && e.to == toId; };
  const nodesExist = function(n) { return n == fromId || n == toId; };
  if (this.nodes.filter(edgeExist).length != 0) return null;
  if (this.nodes.filter(nodesExist).length != 2) return null;

  const edge = {from: fromId, to: toId, probability: probability};
  this.edges.push(edge);
  this.didAddEdge.notify(edge);
  return edge;
};
DirectedGraphModel.prototype.popNode = function() {
  const node = this.nodes.pop();
  this.didRemoveNode.notify(node);
  this.size = this.nodes.length;
  return node;
};
DirectedGraphModel.prototype.removeEdge = function(fromId, toId) {
  for (var i = 0; i < this.edges.length; i++) {
    const edge = this.edges[i];
    if (edge.from == fromId && edge.to == toId) {
      this.edges.splice(i, 1);
      this.didRemoveEdge.notify(edge);
      return edge;
    }
  }
  return null;
};

//----------------------------------------//
//-- View
//----------------------------------------//

/*-- ChangeButtonView --*/

function ChangeButtonView(type, x, y, radius = 20) {
  this.pos = new p5.Vector(x, y);
  this.radius = radius;
  this.type = type;
  this.pressed = false;
}

const ChangeButtonType = {
  INCREASE: "increase",
  DECREASE: "decrease"
};
ChangeButtonView.prototype.render = function () {
  colorMode(HSB, 360, 100, 100, 100);
  const brightnessAmt = this.pressed ? 0.8 : 1;
  const strokeColor = color(0, 0, 40*brightnessAmt);
  const fillColor = this.type == ChangeButtonType.INCREASE ?
    color(180, 20, 90*brightnessAmt) :
    color(0, 20, 90*brightnessAmt);

  noStroke();
  fill(fillColor);
  ellipse(this.pos.x, this.pos.y, 2*this.radius);

  stroke(strokeColor);
  strokeWeight(1);
  line(
    this.pos.x-this.radius+10, this.pos.y,
    this.pos.x+this.radius-10, this.pos.y
  );
  if (this.type == ChangeButtonType.INCREASE) {
    line(
      this.pos.x, this.pos.y-this.radius+10,
      this.pos.x, this.pos.y+this.radius-10
    );
  }
};

/*-- NodeView --*/

function NodeView(id, x, y, radius = 25) {
  this.pos = new p5.Vector(x, y);
  this.id = id;
  this.radius = radius;
}

NodeView.prototype.render = function() {
  stroke(0);
  strokeWeight(2);
  fill(100);
  ellipse(this.pos.x, this.pos.y, 2*this.radius);

  fill(0);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(this.id, this.pos.x, this.pos.y);
};

/*-- EdgeView --*/

function EdgeView(startNodeView, endNodeView) {
  this.startNodeView = startNodeView;
  this.endNodeView = endNodeView;
  this.startPos = startNodeView.pos;
  this.endPos = endNodeView.pos;
  this.angle = PI/3;
  this.arrowHeadSize = 10;
}

EdgeView.prototype.render = function() {
  if (this.startPos != this.endPos) {
    // Edge arc
    const distanceVector = p5.Vector.sub(this.endPos, this.startPos);
    const distance = distanceVector.mag();
    const radius = distance/2/sin(this.angle/2);

    const a = 2*asin(this.startNodeView.radius/2/radius);
    const b = 2*asin(this.endNodeView.radius/2/radius);

    const radiusVector = distanceVector.copy();
    radiusVector.rotate(-(PI+this.angle)/2).setMag(radius);
    const origin = p5.Vector.sub(this.startPos, radiusVector);

    stroke(0);
    strokeWeight(2);
    noFill();
    arc(origin.x, origin.y, 2*radius, 2*radius, radiusVector.heading()+a,
      radiusVector.heading()+this.angle-b);

    // Edge arrow head
    const c = 2*asin(this.arrowHeadSize/2/radius);
    const newRadiusVector = radiusVector.copy();

    newRadiusVector.rotate(this.angle-b);
    const point1 = p5.Vector.add(origin, newRadiusVector);

    newRadiusVector.rotate(-c);
    newRadiusVector.setMag(newRadiusVector.mag()+this.arrowHeadSize/2);
    const point2 = p5.Vector.add(origin, newRadiusVector);

    newRadiusVector.setMag(newRadiusVector.mag()-this.arrowHeadSize);
    const point3 = p5.Vector.add(origin, newRadiusVector);

    fill(0);
    triangle(point1.x, point1.y, point2.x, point2.y, point3.x, point3.y);
  } else {
  }
};

/*-- DirectedGraphView --*/

function DirectedGraphView(graphModel) {
  this.setGraphModel(graphModel ? graphModel : new DirectedGraphModel());
  this.addButtonView = new ChangeButtonView(ChangeButtonType.INCREASE,
    width-30, 30);
  this.removeButtonView = new ChangeButtonView(ChangeButtonType.DECREASE,
    width-30, 100);
  this._inc = 25;
  this._radius = 25;
  this._width = (width-100);

  this.didAddNodeView = new Event(this);
  this.didAddEdgeView = new Event(this);
  this.didRemoveNodeView = new Event(this);
  this.didRemoveEdgeView = new Event(this);
}

DirectedGraphView.prototype.setGraphModel = function(graphModel) {
  if (!graphModel) return false;

  this.graphModel = graphModel;
  this.nodeViews = [];
  this.edgeViews = [];

  const _this = this;

  const addNodeView = function (node) {
    const nodeView = new NodeView(node,
      _this._inc%_this._width,
      _this._radius+2*_this._radius*floor(_this._inc/_this._width),
      _this._radius);
    _this.nodeViews.push(nodeView);
    _this._inc += 50;
    _this.didAddNodeView.notify(nodeView);
  };

  const addEdgeView = function (edge) {
    const findNodeView = function (id) {
      for (nodeView of _this.nodeViews) {
        if (nodeView.id == id) return nodeView;
      }
      return null;
    };

    var startNodeView, endNodeView;
    if (!(startNodeView = findNodeView(edge.from))) return false;
    if (!(endNodeView = findNodeView(edge.to))) return false;
    const edgeView = new EdgeView(startNodeView, endNodeView);
    _this.edgeViews.push(edgeView);
    _this.didAddEdgeView.notify(edgeView);
  };

  this.graphModel.nodes.forEach(function (n) { addNodeView(n); })
  this.graphModel.nodes.forEach(function (e) { addEdgeView(e); })

  this.graphModel.didAddNode.attach(function (_, n) { addNodeView(n); });
  this.graphModel.didAddEdge.attach(function (_, e) { addEdgeView(e); });
  this.graphModel.didRemoveNode.attach(function () {
    _this.didRemoveNodeView.notify(_this.nodeViews.pop());
    _this._inc -= 50;
  });
  this.graphModel.didRemoveEdge.attach(function () {
    _this.didRemoveEdgeView.notify(_this.edgeViews.pop());
  });

  return true;
}
DirectedGraphView.prototype.render = function() {
  this.addButtonView.render();
  if (this.graphModel.nodes.length > 0) {
    this.removeButtonView.render();
  }
  this.edgeViews.forEach(function (ev) { ev.render(); });
  this.nodeViews.forEach(function (nv) { nv.render(); });
};

//----------------------------------------//
//-- Controller
//----------------------------------------//

/*-- RoundButtonController --*/

function RoundButtonController(roundButtonView) {
  this.roundButtonView = roundButtonView;
  this.draggable = false;
  this.pressed = false;
  this._dragOffset = null;

  this.didPress = new Event(this);
}

RoundButtonController.prototype.cursorIsInside = function () {
  const distance = dist(mouseX, mouseY, this.roundButtonView.pos.x,
    this.roundButtonView.pos.y);
  return distance <= this.roundButtonView.radius;
};
RoundButtonController.prototype.press = function() {
  if (!this.pressed && this.cursorIsInside()) {
    this.roundButtonView.pressed = this.pressed = true;
    this._dragOffset = new p5.Vector(this.roundButtonView.x-mouseX,
      this.roundButtonView.y-mouseY);
  }
};
RoundButtonController.prototype.unpress = function () {
  if (this.pressed && this.cursorIsInside()) {
    this.didPress.notify();
  }
  this.roundButtonView.pressed = this.pressed = false;
  this._dragOffset = null;
};
RoundButtonController.prototype.drag = function () {
  if (this.draggable && this.pressed) {
    this.roundButtonView.pos.x = mouseX+this._dragOffset.x;
    this.roundButtonView.pos.y = mouseY+this._dragOffset.y;
  }
};

/*-- NodeController --*/

function NodeController(nodeView) {
  this.parent.constructor.call(this, nodeView);
  this.draggable = true;
}
NodeController.prototype = new RoundButtonController;
NodeController.prototype.constructor = NodeController;
NodeController.prototype.parent = RoundButtonController.prototype;

/*-- DirectedGraphController --*/

function DirectedGraphController(graphView) {
  this.setGraphView(graphView ? graphView : new DirectedGraphView());
  this.graphModel = this.graphView.graphModel;
  this._addButtonController = new RoundButtonController(
    this.graphView.addButtonView);
  this._removeButtonController = new RoundButtonController(
    this.graphView.removeButtonView);

  const _this = this;

  this._addButtonController.didPress.attach(function() {
    _this.graphModel.pushUniqueNode(_this._getNextId());
  });
  this._removeButtonController.didPress.attach(function () {
    _this.graphModel.popNode();
  });
}

DirectedGraphController.prototype._getNextId = function () {
  var i = this.graphModel.nodes.length;
  var id = "";
  while (i >= 0) {
    id = String.fromCharCode(65+i%26) + id;
    i = i/26-1;
  }
  return id;
};
DirectedGraphController.prototype.setGraphView = function(graphView) {
  if (!graphView) return false;

  this.graphView = graphView;
  this._nodeControllers = [];
  this._edgeControllers = [];
  this._pressedNodeController = null;

  const _this = this;

  const addNodeController = function (nodeView) {
    _this._nodeControllers.push(new NodeController(nodeView));
  };

  const addEdgeController = function (edgeView) {
    _this._edgeControllers.push(new EdgeController(edgeView));
  };

  this.graphView.nodeViews.forEach(function (nv) { addNodeController(nv); });
  this.graphView.nodeViews.forEach(function (nv) { addNodeController(nv); });

  this.graphView.didAddNodeView.attach(function (_, nv) {
    addNodeController(nv);
  });
  this.graphView.didAddEdgeView.attach(function (_, ev) {
    addEdgeController(ev);
  });
  this.graphView.didRemoveNodeView.attach(function () {
    _this._nodeControllers.pop();
  });
  this.graphView.didRemoveEdgeView.attach(function () {
    _this._edgeControllers.pop();
  });

  return true;
};
DirectedGraphController.prototype.press = function() {
  if (!this._addButtonController.press() &&
      !this._removeButtonController.press()) {
    if (!this._pressedNodeController) {
      for (nodeController of this._nodeControllers) {
        nodeController.press()
        if (nodeController.pressed) {
          this._pressedNodeController = nodeController;
          return;
        }
      }
    }
  }
};
DirectedGraphController.prototype.unpress = function() {
  this._addButtonController.unpress();
  this._removeButtonController.unpress();
  if (this._pressedNodeController) {
    this._pressedNodeController.unpress();
    this._pressedNodeController = null;
  }
};
DirectedGraphController.prototype.drag = function () {
  if (this._pressedNodeController) {
    this._pressedNodeController.drag();
  }
};

//----------------------------------------//
//-- Main program
//----------------------------------------//

var graphController;

function setup() {
  createCanvas(1200, 600);
  colorMode(HSB, 360, 100, 100, 100);

  graphController = new DirectedGraphController();
}

function mousePressed() {
  graphController.press();
}

function mouseReleased() {
  graphController.unpress();
}

function mouseDragged() {
  graphController.drag();
}


function draw() {
  background(100);
  graphController.graphView.render();
}

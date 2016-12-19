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
  this.size = 0;
  this.nodes = [];
  this.edges = [];

  this.didAddNode = new Event(this);
  this.didAddEdge = new Event(this);
  this.didRemoveNode = new Event(this);
  this.didRemoveEdge = new Event(this);
};

DirectedGraphModel.prototype.addNode = function(id) {
  const isContained = function(n) { return n == id; };
  if (this.nodes.filter(isContained).length != 0) return null;

  this.nodes.push(id);
  this.size++;
  this.didAddNode.notify(id);
  return id;
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
DirectedGraphModel.prototype.removeNode = function(id) {
  for (var i = 0; i < this.nodes.length; i++) {
    const node = this.nodes[i];
    if (node == id) {
      this.nodes.splice(i, 1);
      this.didRemoveNode.notify(node);
      this.size--;
      return node;
    }
  }
  return null;
};
DirectedGraphModel.prototype.removeConnection = function(fromId, toId) {
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

/*-- NodeView --*/

function NodeView(id, x, y, radius = 25) {
  this.pos = new p5.Vector(x, y);
  this.id = id;
  this.radius = radius;
  this.dragged = false;
  this._dragOffset = null;
}
NodeView._instances = [];

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

  this.didAddNodeView = new Event(this);
  this.didAddEdgeView = new Event(this);
  this.didRemoveNodeView = new Event(this);
  this.didRemoveEdgeView = new Event(this);

  this._inc = 25;
  this._radius = 25;
  this._width = (width-100);
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

  this.graphModel.nodes.forEach(function (n) { addNode(n); })
  this.graphModel.nodes.forEach(function (e) { addEdge(e); })

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
  this.edgeViews.forEach(function (ev) { ev.render(); });
  this.nodeViews.forEach(function (nv) { nv.render(); });
};

//----------------------------------------//
//-- Controller
//----------------------------------------//

/*-- Button --*/

function Button(x, y, color, radius) {
  this.pos = new p5.Vector(x, y);
  this.color = color;
  this.enabled = true;
  this.pressed = false;
  this.radius = radius;

  this._lerpBrightnessAmt = 1;
  this._lerpAlphaAmt = 0;
}

Button.prototype.render = function() {
  if (this.enabled && this.pressed && this._lerpBrightnessAmt > 0.8) {
    this._lerpBrightnessAmt = max(this._lerpBrightnessAmt-0.1, 0.8);
  } else if (!this.enabled || !this.pressed && this._lerpBrightnessAmt < 1) {
    this._lerpBrightnessAmt = min(this._lerpBrightnessAmt+0.1, 1);
  }

  if (this.enabled && this._lerpAlphaAmt < 1) {
    this._lerpAlphaAmt = min(this._lerpAlphaAmt+0.1, 1);
  } else if (!this.enabled && this._lerpAlphaAmt > 0) {
    this._lerpAlphaAmt = max(this._lerpAlphaAmt-0.1, 0);
  }

  noStroke();
  fill(color(
    hue(this.color),
    saturation(this.color),
    brightness(this.color)*this._lerpBrightnessAmt,
    alpha(this.color)*this._lerpAlphaAmt
  ));
  ellipse(this.pos.x, this.pos.y, 2*this.radius);
};

/*-- AddButton --*/

function AddButton(x, y, color, lineColor, radius = 20) {
  this.parent.constructor.call(this, x, y, color, radius);
  this.lineColor = lineColor;
}
AddButton.prototype = new Button;
AddButton.prototype.constructor = AddButton;
AddButton.prototype.parent = Button.prototype;

AddButton.prototype.render = function() {
  this.parent.render.call(this);

  stroke(color(
    hue(this.lineColor),
    saturation(this.lineColor),
    brightness(this.lineColor)*this._lerpBrightnessAmt,
    alpha(this.lineColor)*this._lerpAlphaAmt
  ));
  strokeWeight(1);
  line(
    this.pos.x-this.radius+10, this.pos.y,
    this.pos.x+this.radius-10, this.pos.y
  );
  line(
    this.pos.x, this.pos.y-this.radius+10,
    this.pos.x, this.pos.y+this.radius-10
  );
};

/*-- RemoveButton --*/

function RemoveButton(x, y, color, lineColor, radius = 20) {
  this.parent.constructor.call(this, x, y, color, radius);
  this.lineColor = lineColor;
}
RemoveButton.prototype = new Button;
RemoveButton.prototype.constructor = RemoveButton;
RemoveButton.prototype.parent = Button.prototype;

RemoveButton.prototype.render = function() {
  this.parent.render.call(this);

  noFill();
  stroke(color(hue(this.lineColor), saturation(this.lineColor),
    brightness(this.lineColor)*this._lerpBrightnessAmt,
    alpha(this.lineColor)*this._lerpAlphaAmt));
  strokeWeight(1);
  line(this.pos.x-this.radius+10, this.pos.y, this.pos.x+this.radius-10,
    this.pos.y);
};

/*-- NodeController --*/

function NodeController(nodeView) {
  this.nodeView = nodeView;
  this.pressed = false;

  this._initialDragPos = null;
  this._dragOffset = null;
}

NodeController.prototype.press = function() {
  if (!this.pressed) {
    const distance = dist(mouseX, mouseY,
      this.nodeView.pos.x, this.nodeView.pos.y);
    if (distance <= this.nodeView.radius) {
      this.pressed = true;
      if (!this._initialDragPos) {
        this._initialDragPos = new p5.Vector(mouseX, mouseY);
      }
      return this;
    }
  }
  return null;
};
NodeController.prototype.unpress = function() {
  if (!this.pressed) {
    this.pressed = false;
    this._initialDragPos = null;
    return this;
  }
  return null;
};
NodeController.prototype.drag = function() {
  if (this.pressed) {
    if (!this._dragOffset) {
      this._dragOffset = p5.Vector.sub(this.nodeView.pos, this._initialDragPos);
    }
    this.nodeView.pos.x = mouseX+this._dragOffset.x;
    this.nodeView.pos.y = mouseY+this._dragOffset.y;
  } else {
    this._dragOffset = null;
  }
};

/*-- DirectedGraphController --*/

function DirectedGraphController(graphModel, graphView) {
  this.graphModel = graphModel ? graphModel : new DirectedGraphModel();
  this.setGraphView(graphView ? graphView : new DirectedGraphView());

  this._draggedNode = null;
}

DirectedGraphController.prototype.setGraphView = function(graphView) {
  if (!graphView) return false;

  this.graphView = graphView;
  this._nodeControllers = [];
  this._edgeControllers = [];

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
  var pressedNode = null;
  for (nodeController of this._nodeControllers) {
    if (pressedNode = nodeController.press()) break;
  }
  return pressedNode;
};
DirectedGraphController.prototype.unpress = function() {
  this._draggedNode = null;
  var unpressedNode = null;
  for (nodeController of this._nodeControllers) {
    if (unpressedNode = nodeController.unpress()) break;
  }
  return unpressedNode;
};
DirectedGraphController.prototype.drag = function() {
  if (!this._draggedNode) {
    for (nodeController of this._nodeControllers) {
      if (draggedNode = nodeController.pressed ? nodeController : null) break;
    }
    if (!this._draggedNode) return;
  }

  this._draggedNode.drag();
};

//----------------------------------------//
//-- Main program
//----------------------------------------//

var graphModel;
var graphView;
var graphController;
var nodeViews;
var draggedView;
var initialDragPos;
var addButton, removeButton;
var inc = 25;

function setup() {
  createCanvas(1200, 600);
  colorMode(HSB, 360, 100, 100, 100);

  graphModel = new DirectedGraphModel();
  graphView = new DirectedGraphView(graphModel);
  graphController = new DirectedGraphController(graphModel, graphView);

  const lineColor = color(0, 0, 40);
  const buttonRadius = 20
  addButton = new AddButton(width-buttonRadius-10,
    buttonRadius+10,
    color(180, 20, 90),
    lineColor,
    buttonRadius);
  removeButton = new RemoveButton(width-buttonRadius-10,
    addButton.pos.y+2*buttonRadius+30,
    color(0, 20, 90),
    lineColor,
    buttonRadius);
  removeButton.enabled = false;
}

function getNextId() {
  var i = graphModel.size;
  var id = "";
  while (i >= 0) {
    id = String.fromCharCode(65+i%26) + id;
    i = i/26-1;
  }
  return id;
};

function mousePressed() {
  graphController.press();
  graphController.drag();

  addButton.pressed = dist(mouseX, mouseY,
    addButton.pos.x, addButton.pos.y) <= addButton.radius;
  removeButton.pressed = dist(mouseX, mouseY,
    removeButton.pos.x, removeButton.pos.y) <= removeButton.radius;
}

function mouseReleased() {
  graphController.unpress();

  if (addButton.pressed && dist(mouseX, mouseY,
      addButton.pos.x, addButton.pos.y) <= addButton.radius) {
    // Add button pressed
    graphModel.addNode(getNextId());
    removeButton.enabled = true;
  }

  else if (removeButton.pressed && dist(mouseX, mouseY,
      removeButton.pos.x, removeButton.pos.y) <= removeButton.radius) {
    // Remove button pressed
    graphModel.removeNode(graphModel.nodes[graphModel.size-1]);
    if (graphModel.size <= 0) {
      removeButton.enabled = false;
    }
  }

  addButton.pressed = removeButton.pressed = false;
}

function draw() {
  background(100);

  addButton.render();
  removeButton.render();

  graphView.render();
}

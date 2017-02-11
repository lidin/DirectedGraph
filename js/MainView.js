//----------------------------------------//
//-- Events
//----------------------------------------//

/*-- Event --*/

function Event(sender) {
  this._sender = sender;
  this._listeners = [];
}

Event.prototype.attach = function (listener) {
  this._listeners.push(listener);
};
Event.prototype.notify = function (args) {
  const _this = this;
  this._listeners.forEach(function (l) { l(_this._sender, args); });
};

//----------------------------------------//
//-- Model
//----------------------------------------//

/*-- DirectedGraphModel --*/

function DirectedGraphModel() {
  this.didAddNode = new Event(this);
  this.didAddEdge = new Event(this);
  this.didRemoveNode = new Event(this);
  this.didRemoveEdge = new Event(this);
  this.nodes = [];
  this.edges = [];
};

DirectedGraphModel.prototype.getNextId = function () {
  var i = this.nodes.length;
  var id = "";
  while (i >= 0) {
    id = String.fromCharCode(65+i%26) + id;
    i = i/26-1;
  }
  return id;
};
DirectedGraphModel.prototype.pushUniqueNode = function (id) {
  if (!id) id = this.getNextId();
  if (!this.nodes.includes(id)) {
    this.nodes.push(id);
    this.didAddNode.notify(id);
    return id;
  }
  return null;
};
DirectedGraphModel.prototype.addEdge = function (fromNode, toNode,
    probability) {
  const edgeExist = function (e) { return e.from == fromNode &&
    e.to == toNode; };
  const nodesExist = function (n) { return n == fromNode || n == toNode; };
  if (toNode) {
    if (this.nodes.find(edgeExist)) return null;
    if (this.nodes.filter(nodesExist).length != 2) return null;
  }

  const edge = {from: fromNode, to: toNode, probability: probability};
  this.edges.push(edge);
  this.didAddEdge.notify(edge);
  return edge;
};
DirectedGraphModel.prototype.popNode = function () {
  const node = this.nodes.pop();
  this.didRemoveNode.notify(node);
  this.size = this.nodes.length;
  return node;
};
DirectedGraphModel.prototype.removeEdge = function (fromNode, toNode) {
  if (!fromNode || !toNode) {
    const edge = this.edges.pop();
    this.didRemoveEdge.notify(edge);
    return edge;
  }
  for (var i = 0; i < this.edges.length; i++) {
    const edge = this.edges[i];
    if (edge.from == fromNode && edge.to == toNode) {
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
  this.pos = createVector(x, y);
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

function NodeView(node, x, y, radius = 25) {
  this.pos = createVector(x, y);
  this.node = node;
  this.radius = radius;
  this.pressed = false;
  this.hovered = false;
  this.edgeHandleRadius = 5;
  this.isFromNodeView = false;
}

NodeView.prototype.getEdgeHandlePos = function () {
  return createVector(this.pos.x+this.radius+this.edgeHandleRadius, this.pos.y);
};
NodeView.prototype.render = function () {
  stroke(0);
  strokeWeight(2);
  fill(100);
  ellipse(this.pos.x, this.pos.y, 2*this.radius);

  if ((!NodeController.addEdgeMode && this.hovered && !this.pressed) ||
      this.isFromNodeView) {
    const edgeHandlePos = this.getEdgeHandlePos();
    ellipse(edgeHandlePos.x, edgeHandlePos.y, 2*this.edgeHandleRadius);
  }

  fill(0);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(this.node, this.pos.x, this.pos.y);

  if (NodeController.addEdgeMode && this.hovered) {
    fill(240, 20, 90, 50);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 2*(this.radius-5));
  }
};

/*-- EdgeView --*/

function EdgeView(startNodeView, endNodeView, probability) {
  this.startNodeView = startNodeView;
  this.endNodeView = endNodeView;
  this.probability = probability;
  this.edge = {
    from: startNodeView.node,
    to: endNodeView ? endNodeView.node : undefined,
    probability: probability
  };
  this.startPos = startNodeView.pos;
  this.endPos = endNodeView ? endNodeView.pos : undefined;
  this.angle = PI/3;
  this.arrowHeadSize = 10;
}

EdgeView.prototype.render = function () {
  if (this.endNodeView) {
    const startPos = this.startNodeView.pos;
    const endPos = this.endNodeView.pos;
    if (startPos != endPos) {
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
  } else {
    const edgeHandlePos = this.startNodeView.getEdgeHandlePos();
    const edgeHandleRadius = this.startNodeView.edgeHandleRadius;
    fill(240, 20, 90);
    noStroke();
    ellipse(edgeHandlePos.x, edgeHandlePos.y, 2*(edgeHandleRadius-2));
    ellipse(mouseX, mouseY, 2*(edgeHandleRadius-2));
    stroke(240, 20, 90);
    strokeWeight(2);
    line(edgeHandlePos.x, edgeHandlePos.y, mouseX, mouseY);
  }
};

/*-- DirectedGraphView --*/

function DirectedGraphView(graphModel) {
  this.didAddNodeView = new Event(this);
  this.didAddEdgeView = new Event(this);
  this.didRemoveNodeView = new Event(this);
  this.didRemoveEdgeView = new Event(this);
  this.setGraphModel(graphModel ? graphModel : new DirectedGraphModel());
  this.addButtonView = new ChangeButtonView(ChangeButtonType.INCREASE,
    width-30, 30);
  this.removeButtonView = new ChangeButtonView(ChangeButtonType.DECREASE,
    width-30, 100);
}

DirectedGraphView.prototype.setGraphModel = function (graphModel) {
  if (!graphModel) return false;

  this.graphModel = graphModel;
  this.nodeViews = [];
  this.edgeViews = [];

  const _this = this;
  let inc = 25;

  const addNodeView = function (node) {
    const nodeView = new NodeView(node, inc%(width-100),
      25+50*floor(inc/(width-100)), 25);
    _this.nodeViews.push(nodeView);
    inc += 50;
    _this.didAddNodeView.notify(nodeView);
  };

  const addEdgeView = function (edge) {
    const findNodeView = function (node) {
      for (nodeView of _this.nodeViews) {
        if (nodeView.node == node) return nodeView;
      }
      return undefined;
    };

    let startNodeView, endNodeView;
    if (!(startNodeView = findNodeView(edge.from))) return false;
    endNodeView = findNodeView(edge.to)
    const edgeView = new EdgeView(startNodeView, endNodeView, edge.probability);
    _this.edgeViews.push(edgeView);
    _this.didAddEdgeView.notify(edgeView);
  };

  this.graphModel.nodes.forEach(function (n) { addNodeView(n); })
  this.graphModel.nodes.forEach(function (e) { addEdgeView(e); })

  this.graphModel.didAddNode.attach(function (_, n) { addNodeView(n); });
  this.graphModel.didAddEdge.attach(function (_, e) { addEdgeView(e); });
  this.graphModel.didRemoveNode.attach(function (_, n) {
    const index = _this.nodeViews.map(function (nv) {
      return nv.node;
    }).indexOf(n);
    if (index != -1) {
      const nodeView = _this.nodeViews[index];
      _this.nodeViews.splice(index, 1);
      _this.didRemoveNodeView.notify(nodeView);
      inc -= 50;
    }
  });
  this.graphModel.didRemoveEdge.attach(function (_, e) {
    let index = -1;
    for (; (index+1) < _this.edgeViews.length; index++) {
      const edgeView = _this.edgeViews[index+1];
      if (edgeView.edge.from == e.from && edgeView.edge.to == e.to) {
        index++;
        break;
      }
    }
    // const index = _this.edgeViews.map(function (ev) {
    //   return ev.edge;
    // }).indexOf(e);
    if (index != -1) {
      const edgeView = _this.edgeViews[index];
      _this.edgeViews.splice(index, 1);
      _this.didRemoveEdgeView.notify(edgeView);
    }
  });

  return true;
};
DirectedGraphView.prototype.render = function () {
  if (NodeController.addEdgeMode) {
    this.nodeViews.forEach(function (nv) { nv.render(); });
    this.edgeViews.forEach(function (ev) { ev.render(); });
  } else {
    this.edgeViews.forEach(function (ev) { ev.render(); });
    this.nodeViews.forEach(function (nv) { nv.render(); });
  }
  this.addButtonView.render();
  if (this.graphModel.nodes.length > 0) {
    this.removeButtonView.render();
  }
};

//----------------------------------------//
//-- Controller
//----------------------------------------//

/*-- RoundButtonController --*/

function RoundButtonController(roundButtonView) {
  this.didPress = new Event(this);
  this.buttonView = roundButtonView;
  this.pressed = false;
}

RoundButtonController.prototype.isCursorInside = function () {
  const distance = dist(mouseX, mouseY, this.buttonView.pos.x,
    this.buttonView.pos.y);
  return distance <= this.buttonView.radius;
};
RoundButtonController.prototype.mouseHover = function () {
  return this.buttonView.hovered = this.isCursorInside();
};
RoundButtonController.prototype.mousePress = function () {
  return this.pressed = this.buttonView.pressed = this.isCursorInside();
};
RoundButtonController.prototype.mouseRelease = function () {
  if (this.isCursorInside()) this.didPress.notify();
  this.buttonView.pressed = this.pressed = false;
};

/*-- NodeController --*/

function NodeController(nodeView) {
  this.didPressEdgeHandle = new Event(this);
  this.parent.constructor.call(this, nodeView);
  this.nodeView = this.buttonView;
  this.node = this.nodeView.node;
  this._isFromNodeController = false;
  this._dragOffset = null;
}
NodeController.prototype = new RoundButtonController;
NodeController.prototype.constructor = NodeController;
NodeController.prototype.parent = RoundButtonController.prototype;
NodeController.addEdgeMode = false;

NodeController.prototype.mouseHover = function () {
  this.parent.mouseHover.call(this);
  const edgeHandlePos = this.nodeView.getEdgeHandlePos();
  const distance = dist(mouseX, mouseY, edgeHandlePos.x, edgeHandlePos.y);
  return this.nodeView.hovered |= distance <= this.nodeView.edgeHandleRadius+5;
};
NodeController.prototype.mousePress = function () {
  if (this.parent.mousePress.call(this)) {
    this._dragOffset = createVector(this.nodeView.pos.x-mouseX,
      this.nodeView.pos.y-mouseY);
    return true;
  } else {
    const edgeHandlePos = this.nodeView.getEdgeHandlePos();
    const distance = dist(mouseX, mouseY, edgeHandlePos.x, edgeHandlePos.y);
    if (distance <= this.nodeView.edgeHandleRadius) {
      this.nodeView.hovered = false;
      this.didPressEdgeHandle.notify();
      NodeController.addEdgeMode = true;
      this.nodeView.isFromNodeView = true;
      return true;
    }
  }
  return false
};
NodeController.prototype.mouseRelease = function () {
  this.parent.mouseRelease.call(this);
  NodeController.addEdgeMode = false;
  this.nodeView.isFromNodeView = false;
  this._dragOffset = null;
};
NodeController.prototype.mouseDrag = function (otherNodeController) {
  if (this.pressed) {
    // const mousePosition = createVector(mouseX, mouseY);
    // const uncollidedPosition = p5.Vector.add(mousePosition, this._dragOffset);
    // if (otherNodeController) {
    //   const otherNodeView = otherNodeController.nodeView;
    //   const distance = uncollidedPosition.dist(otherNodeView.pos);
    //   const minimumDistance = this.nodeView.radius+otherNodeView.radius;
    //   const collisionOffsetDistance = max(minimumDistance-distance, 0);
    //   const collisionOffset = p5.Vector.sub(this.nodeView.pos,
    //     otherNodeView.pos).setMag(collisionOffsetDistance);
    //   const collidedPosition = p5.Vector.add(uncollidedPosition,
    //     collisionOffset);
    //
    //   this.nodeView.pos.x = collidedPosition.x;
    //   this.nodeView.pos.y = collidedPosition.y;
    // } else {
    //   this.nodeView.pos.x = uncollidedPosition.x;
    //   this.nodeView.pos.y = uncollidedPosition.y;
    // }
    this.nodeView.pos.x = mouseX+this._dragOffset.x;
    this.nodeView.pos.y = mouseY+this._dragOffset.y;
  }
};

/*-- DirectedGraphController --*/

function DirectedGraphController(graphView) {
  this.setGraphView(graphView ? graphView : new DirectedGraphView());
  this.graphModel = this.graphView.graphModel;
  this._addButtonController = new RoundButtonController(
    this.graphView.addButtonView);
  this._removeButtonController = new RoundButtonController(
    this.graphView.removeButtonView);

  const _this = this;

  this._addButtonController.didPress.attach(function () {
    _this.graphModel.pushUniqueNode();
  });
  this._removeButtonController.didPress.attach(function () {
    _this.graphModel.popNode();
  });
}

DirectedGraphController.prototype.bringToFront = function (nodeController) {
  if (this._nodeControllers[this._nodeControllers-1] == nodeController) {
    return;
  }

  const index = this._nodeControllers.indexOf(nodeController);
  if (index != -1) {
    this._nodeControllers.splice(index, 1);
    this._nodeControllers.push(nodeController);

    this.graphView.nodeViews.splice(index, 1);
    this.graphView.nodeViews.push(nodeController.nodeView);
  }
};
DirectedGraphController.prototype.setGraphView = function (graphView) {
  if (!graphView) return false;

  this.graphView = graphView;
  this._nodeControllers = [];
  this._edgeControllers = [];
  this._pressedNodeController = null;

  const _this = this;

  const addNodeController = function (nodeView) {
    const nodeController = new NodeController(nodeView);
    nodeController.didPressEdgeHandle.attach(function (sender) {
      _this.graphModel.addEdge(sender.nodeView.node);
    });
    _this._nodeControllers.push(nodeController);
  };

  const addEdgeController = function (edgeView) {
    //_this._edgeControllers.push(new EdgeController(edgeView));
  };

  this.graphView.nodeViews.forEach(function (nv) { addNodeController(nv); });
  this.graphView.edgeViews.forEach(function (ev) { addEdgeController(ev); });

  this.graphView.didAddNodeView.attach(function (_, nv) {
    addNodeController(nv);
  });
  this.graphView.didAddEdgeView.attach(function (_, ev) {
    addEdgeController(ev);
  });
  this.graphView.didRemoveNodeView.attach(function (_, nv) {
    const index = _this._nodeControllers.map(function (nc) {
      return nc.nodeView;
    }).indexOf(nv);
    if (index != -1) {
      const nodeController = _this._nodeControllers[index];
      const connectedEdges = [];
      for (edge of _this.graphModel.edges) {
        if (edge.to == nodeController.node ||
            edge.from == nodeController.node) {
          connectedEdges.push(edge);
        }
      }
      connectedEdges.forEach(function (e) { _this.graphModel.removeEdge(e); });
      _this._nodeControllers.splice(index, 1);
    }
  });
  this.graphView.didRemoveEdgeView.attach(function (_, edgeView) {
    //_this._edgeControllers.pop();
    if (!edgeView.endNodeView) {
      NodeController.addEdgeMode = false;
      edgeView.startNodeView.isFromNodeView = false;
    }
  });

  return true;
};
DirectedGraphController.prototype.mouseHover = function () {
  this._nodeControllers.forEach(function (nc) { nc.mouseHover(); });
};
DirectedGraphController.prototype.mousePress = function () {
  if ((!this._addButtonController.mousePress() &&
      !this._removeButtonController.mousePress()) ||
      NodeController.addEdgeMode) {
    if (!this._pressedNodeController) {
      for (nodeController of this._nodeControllers.slice().reverse()) {
        if (nodeController.mousePress()) {
          this.bringToFront(nodeController);
          this._pressedNodeController = nodeController;
          return;
        }
      }
    }
  }
};
DirectedGraphController.prototype.mouseRelease = function () {
  this._addButtonController.mouseRelease();
  this._removeButtonController.mouseRelease();
  if (this._pressedNodeController) {
    if (NodeController.addEdgeMode) {
      var endController = null;
      for (nodeController of this._nodeControllers) {
        if (nodeController.isCursorInside()) {
          endController = nodeController;
          break;
        }
      };
      if (endController) {
        const edge = this.graphModel.removeEdge();
        this.graphModel.addEdge(edge.from, endController.node);
      }
    }
    this._pressedNodeController.mouseRelease();
    this._pressedNodeController = null;
  }
};
DirectedGraphController.prototype.mouseDrag = function () {
  if (this._pressedNodeController) {
    this._pressedNodeController.mouseDrag();
    if (NodeController.addEdgeMode) { this.mouseHover(); }
    // if (this._nodeControllers.length == 1) {
    //   this._pressedNodeController.mouseDrag();
    // }
    // for (nodeController of this._nodeControllers) {
    //   if (nodeController == this._pressedNodeController) continue;
    //   this._pressedNodeController.mouseDrag(nodeController);
    // }
  }
};

//----------------------------------------//
//-- Main program
//----------------------------------------//

var graphController;

function setup() {
  createCanvas(1200, 600);
  colorMode(HSB, 360, 100, 100, 100);

  const graphModel = new DirectedGraphModel();
  for (var i = 0; i < 3; i++) {
    graphModel.pushUniqueNode();
  }
  graphController = new DirectedGraphController(new DirectedGraphView(graphModel));
}

function mouseMoved() {
  graphController.mouseHover();
}

function mousePressed() {
  graphController.mousePress();
}

function mouseReleased() {
  graphController.mouseRelease();
}

function mouseDragged() {
  graphController.mouseDrag();
}

function draw() {
  background(100);
  graphController.graphView.render();
}
